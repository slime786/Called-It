# Called it. — Phase 2 setup (manual GitHub Pages route)

This version has real accounts, a real cloud database, persistent calls, persistent threads and persistent YES/NO play-point positions. There is no build step.

## 1. Create a free Supabase project

Go to https://supabase.com, create an account, then create a new project. Choose any project name and set a strong database password.

## 2. Create the database

In the Supabase dashboard open **SQL Editor** → **New query**. Open `supabase-schema.sql` from this repository, copy the whole file into the editor, and click **Run**.

You should then see these tables in **Table Editor**: `profiles`, `calls`, `positions`, `threads`, `call_flags`.

## 3. Copy the two browser-safe project values

In Supabase open **Project Settings / API** (in newer layouts this may be **Connect** or **API Keys**).

Copy:

- **Project URL**
- the **anon / publishable public key**

Do NOT use the service-role / secret key in this website.

## 4. Put the values into `config.js`

Open `config.js` and change:

```js
export const SUPABASE_URL = '';
export const SUPABASE_ANON_KEY = '';
```

to your values, for example:

```js
export const SUPABASE_URL = 'https://YOURPROJECT.supabase.co';
export const SUPABASE_ANON_KEY = 'YOUR_PUBLIC_ANON_KEY';
```

The public key is intended for browser apps. Security comes from the Row Level Security rules installed by `supabase-schema.sql`.

## 5. Decide whether signups require email confirmation

In Supabase open **Authentication** → **Providers** → **Email**.

For the easiest first test, you can temporarily disable **Confirm email**. If you leave it enabled, new users must click the confirmation email before they can sign in.

## 6. Replace the files in your GitHub repo

In your existing `Called-It` GitHub repository, upload these files and replace the old versions:

- `index.html`
- `styles.css`
- `app.js`
- `config.js`
- `supabase-schema.sql`
- `README.md`
- `SETUP.md`

Commit the changes to `main`. GitHub Pages should redeploy automatically within a minute or two.

Your existing site URL stays the same: `https://slime786.github.io/Called-It/`

## 7. Test the full flow

1. Open the live site in a private/incognito window.
2. Click **Sign in** → **Create account**.
3. Create a username, email and password.
4. Sign in (or confirm email first if confirmation is enabled).
5. Click **Make a call** and publish one.
6. Refresh the browser. The call should still be there — this proves the database is live.
7. Open a second account or browser and take a YES/NO side with play points. Refresh again; the position should remain.
8. Post an ordinary thread. Refresh; it should remain.

## What this phase deliberately does not automate yet

The database includes resolution fields, but ordinary browser users cannot mark calls resolved. That is intentional. Machine settlement, source checks, jury settlement, difficulty-weighted scoring, moderation tooling and quarterly season resets should be the next build, because resolution must be trustworthy before it affects reputation.

## Troubleshooting

**The site says “Setup mode”** — `config.js` still has blank values or was not uploaded.

**Signup works but I cannot sign in** — email confirmation is probably enabled. Check the inbox used to sign up.

**“new row violates row-level security policy”** — make sure you ran the entire `supabase-schema.sql` file and are signed in.

**The old website still shows** — wait 1–2 minutes, hard refresh, or check GitHub → Settings → Pages to ensure it still deploys `main` from `/ (root)`.

**Never paste a Supabase service-role key into `config.js`.** If you accidentally do, rotate that key immediately in Supabase.
