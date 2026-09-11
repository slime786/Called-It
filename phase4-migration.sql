-- Called it. Phase 4 migration
-- Run ONCE in Supabase > SQL Editor after Phase 3 is working.
-- Adds real play-point balances, transactional staking/payouts,
-- a 3-flag wording challenge threshold, draft/revision workflow,
-- and safer admin settlement.

-- 1) Every member gets a play-point wallet.
alter table public.profiles add column if not exists play_points integer not null default 1000;
do $$ begin
  alter table public.profiles add constraint profiles_play_points_check check (play_points >= 0);
exception when duplicate_object then null; end $$;

-- 2) Add a draft status for calls returned after a failed wording challenge.
alter table public.calls drop constraint if exists calls_status_check;
alter table public.calls add constraint calls_status_check
  check (status in ('draft','challenge','open','resolved','void'));

-- 3) Process expired wording challenges.
-- 3 or more unique flags returns the call to draft; otherwise it opens.
create or replace function public.process_due_challenges()
returns table(opened integer, returned_to_draft integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  n_open integer := 0;
  n_draft integer := 0;
begin
  update public.calls c
     set status = 'draft'
   where c.status = 'challenge'
     and c.challenge_ends_at <= now()
     and (select count(*) from public.call_flags f where f.call_id = c.id) >= 3;
  get diagnostics n_draft = row_count;

  update public.calls c
     set status = 'open'
   where c.status = 'challenge'
     and c.challenge_ends_at <= now()
     and (select count(*) from public.call_flags f where f.call_id = c.id) < 3;
  get diagnostics n_open = row_count;

  return query select n_open, n_draft;
end;
$$;
grant execute on function public.process_due_challenges() to anon, authenticated;

-- Keep Phase 3's function name working too.
create or replace function public.open_due_calls()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare r record;
begin
  select * into r from public.process_due_challenges();
  return coalesce(r.opened,0);
end;
$$;
grant execute on function public.open_due_calls() to anon, authenticated;

-- 4) Author revision after a failed wording challenge.
create or replace function public.revise_call(
  p_call_id bigint,
  p_claim text,
  p_settlement_condition text,
  p_resolution_date date,
  p_resolution_method text,
  p_source_name text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if char_length(trim(coalesce(p_claim,''))) not between 10 and 180 then
    raise exception 'claim must be 10-180 characters';
  end if;
  if char_length(trim(coalesce(p_settlement_condition,''))) not between 15 and 260 then
    raise exception 'settlement condition must be 15-260 characters';
  end if;
  if p_resolution_date < current_date then raise exception 'resolution date must be in the future'; end if;
  if p_resolution_method not in ('machine','source','jury') then raise exception 'invalid resolution method'; end if;

  update public.calls
     set claim = trim(p_claim),
         settlement_condition = trim(p_settlement_condition),
         resolution_date = p_resolution_date,
         resolution_method = p_resolution_method,
         source_name = nullif(trim(coalesce(p_source_name,'')),''),
         status = 'challenge',
         challenge_ends_at = now() + interval '24 hours'
   where id = p_call_id
     and author_id = auth.uid()
     and status = 'draft';

  if not found then raise exception 'only your draft calls can be revised'; end if;
  delete from public.call_flags where call_id = p_call_id;
end;
$$;
grant execute on function public.revise_call(bigint,text,text,date,text,text) to authenticated;

-- 5) Positions must go through one transactional function.
-- It refunds an old stake before applying the new stake, then locks the new amount.
revoke insert, update on public.positions from authenticated;

create or replace function public.place_position(
  p_call_id bigint,
  p_side text,
  p_points integer
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_old_points integer := 0;
  v_balance integer;
begin
  if auth.uid() is null then raise exception 'sign in required'; end if;
  if p_side not in ('YES','NO') then raise exception 'invalid side'; end if;
  if p_points not between 1 and 100 then raise exception 'stake must be 1-100 points'; end if;

  select status into v_status from public.calls where id = p_call_id for update;
  if v_status <> 'open' then raise exception 'call is not open for positions'; end if;

  select play_points into v_balance from public.profiles where id = auth.uid() for update;
  if v_balance is null then raise exception 'profile not found'; end if;

  select points into v_old_points from public.positions
   where call_id = p_call_id and user_id = auth.uid() for update;
  v_old_points := coalesce(v_old_points,0);

  if v_balance + v_old_points < p_points then raise exception 'not enough play points'; end if;

  update public.profiles
     set play_points = play_points + v_old_points - p_points
   where id = auth.uid();

  insert into public.positions(call_id,user_id,side,points)
  values(p_call_id,auth.uid(),p_side,p_points)
  on conflict(call_id,user_id)
  do update set side=excluded.side, points=excluded.points, updated_at=now();

  select play_points into v_balance from public.profiles where id = auth.uid();
  return v_balance;
end;
$$;
grant execute on function public.place_position(bigint,text,integer) to authenticated;

-- 6) Safer settlement + play-point payouts.
-- Winning positions split the whole pot in proportion to their stake.
-- VOID refunds everyone. Author scoring remains a separate reputation score in the UI.
create or replace function public.resolve_call(
  p_call_id bigint,
  p_outcome text,
  p_note text,
  p_source_url text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_resolution_date date;
  v_total bigint := 0;
  v_winners bigint := 0;
  r record;
begin
  if not exists(select 1 from public.admin_users where user_id = auth.uid()) then
    raise exception 'admin only';
  end if;
  if p_outcome not in ('YES','NO','VOID') then raise exception 'invalid outcome'; end if;
  if char_length(coalesce(trim(p_note),'')) < 3 then raise exception 'resolution note required'; end if;

  select status,resolution_date into v_status,v_resolution_date
    from public.calls where id=p_call_id for update;
  if v_status not in ('open','challenge') then raise exception 'call is not resolvable'; end if;
  if p_outcome <> 'VOID' and v_resolution_date > current_date then
    raise exception 'resolution date has not arrived';
  end if;

  if p_outcome='VOID' then
    update public.calls set status='void', result=null, resolved_at=now(),
      resolution_note=trim(p_note), resolution_source_url=nullif(trim(coalesce(p_source_url,'')),'')
      where id=p_call_id;
    for r in select user_id,points from public.positions where call_id=p_call_id loop
      update public.profiles set play_points=play_points+r.points where id=r.user_id;
    end loop;
  else
    update public.calls set status='resolved', result=(p_outcome='YES'), resolved_at=now(),
      resolution_note=trim(p_note), resolution_source_url=nullif(trim(coalesce(p_source_url,'')),'')
      where id=p_call_id;

    select coalesce(sum(points),0) into v_total from public.positions where call_id=p_call_id;
    select coalesce(sum(points),0) into v_winners from public.positions where call_id=p_call_id and side=p_outcome;

    if v_winners > 0 and v_total > 0 then
      for r in select user_id,points from public.positions where call_id=p_call_id and side=p_outcome loop
        update public.profiles
           set play_points = play_points + floor((v_total::numeric * r.points::numeric) / v_winners::numeric)::integer
         where id=r.user_id;
      end loop;
    end if;
  end if;
end;
$$;
grant execute on function public.resolve_call(bigint,text,text,text) to authenticated;

-- 7) A compact public call-state helper for UI details.
create or replace function public.call_state(p_call_id bigint)
returns table(flag_count integer, yes_points bigint, no_points bigint, participant_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*)::integer from public.call_flags f where f.call_id=p_call_id),
    coalesce((select sum(points) from public.positions p where p.call_id=p_call_id and p.side='YES'),0)::bigint,
    coalesce((select sum(points) from public.positions p where p.call_id=p_call_id and p.side='NO'),0)::bigint,
    (select count(*) from public.positions p where p.call_id=p_call_id)::bigint;
$$;
grant execute on function public.call_state(bigint) to anon, authenticated;
