# Called it. Phase 3 — upgrade instructions

You already have Phase 2 live. This upgrade preserves your existing account, Nvidia test call and ordinary thread.

## Step 1 — run the Phase 3 migration

1. Open your Supabase project.
2. Go to **SQL Editor → New query**.
3. Open `phase3-migration.sql` from this folder.
4. Copy the entire file into the SQL Editor.
5. Click **Run**.
6. You should see **Success. No rows returned** (or a successful completion message).

Do NOT rerun the old Phase 2 schema instead of this migration.

## Step 2 — make your account an admin (recommended for testing resolution)

In Supabase SQL Editor create a new query and run this, replacing the email with the email of your Called it. account:

```sql
insert into public.admin_users(user_id)
select id from auth.users where email='YOUR_EMAIL_HERE'
on conflict do nothing;
```

This lets only that Supabase user see the **Resolve / void call** button in the browser. The actual database function also checks admin membership server-side.

## Step 3 — upload the Phase 3 files to GitHub

Upload these files to the root of your existing `Called-It` repository and replace files with the same names:

- `index.html`
- `styles.css`
- `app.js`
- `config.js`
- `README.md`
- `SETUP-PHASE3.md`
- `phase3-migration.sql`

Commit to `main`. GitHub Pages should redeploy automatically.

## Step 4 — test

Hard-refresh the live site with **Ctrl + Shift + R**.

1. Sign in with your existing account.
2. Click your existing call. A detailed call record should open.
3. Add a comment and refresh. It should remain.
4. Create a fresh test call. It should start in **Wording challenge**.
5. After 24 hours, loading the site will promote due challenge calls to **Open**.
6. On an open call, take YES or NO and stake play points.
7. If you made yourself an admin, open a call and use **Resolve / void call** to record a result.
8. After resolution, check the author's profile and leaderboard. Accuracy and score should update.

## About the 24-hour challenge

Phase 3 uses a safe database RPC called `open_due_calls`. It can only change calls from `challenge` to `open` after `challenge_ends_at` has passed. It runs when the site loads.

## About automatic market resolution

The database now records a call's resolution method and source. The next production step is a server-side scheduled resolver (for example a Supabase Edge Function) connected to a market-data provider. Do not put a paid market-data secret key in `config.js` or any GitHub Pages frontend file.
