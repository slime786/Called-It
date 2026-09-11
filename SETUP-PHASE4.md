# Called it. — Phase 4 setup

Phase 4 upgrades the already-working Phase 3 database. It preserves existing users, calls, threads, comments and positions.

## 1. Run the migration
In Supabase open **SQL Editor → New query**, paste the entire contents of `phase4-migration.sql`, and press **Run**. A successful run normally says `Success. No rows returned`.

Do not rerun the Phase 2 or Phase 3 schema files if your existing site is already working.

## 2. Keep your admin account
Phase 4 keeps the `admin_users` table from Phase 3. If you never added yourself, run this separately with your real login email:

```sql
insert into public.admin_users(user_id)
select id from auth.users where email='YOUR_EMAIL_HERE'
on conflict do nothing;
```

## 3. Upload the website files
Upload `index.html`, `styles.css`, `app.js`, `config.js`, `README.md`, and `phase4-migration.sql` to the root of the same GitHub repository. Replace matching files and commit to `main`.

## 4. Test
After GitHub Pages redeploys, hard refresh the site. Test: wallet shows 1000 points for an existing account; challenge calls open after 24 hours unless they reach 3 flags; open calls accept YES/NO stakes; staking lowers the wallet; updating a stake refunds the old amount before applying the new one; resolving a call pays the winning pool; VOID refunds all stakes; a call with 3 flags returns to Draft and its author can revise/resubmit it.

## Notes
Play points are status/game points only. No real money is involved. Automatic market-data settlement is still not included; machine calls remain ready for a later server-side resolver.
