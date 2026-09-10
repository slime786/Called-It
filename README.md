# Called it.

A polished front-end MVP for **Called it.** — a network where opinions can be put on record, resolved against reality, and scored.

## What is included

- Responsive one-page hub for Markets, Tech, Crypto, World and Gadgets
- Record-first dashboard with accuracy, rank, best category and open calls
- Open calls with confidence, settlement conditions, resolution dates and play-point voting
- 24-hour wording-challenge state
- Channel filtering and call sorting
- Season leaderboard and resolving-soon panel
- Ordinary discussion threads alongside predictions
- Working “Make a call” and “Start thread” forms (front-end only)
- Mobile-first responsive layout
- Zero dependencies: plain HTML, CSS and JavaScript

## Run locally

Open `index.html` directly, or serve the folder with any static server:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Deploy

This repository can be deployed directly to GitHub Pages, Netlify, Cloudflare Pages or Vercel as a static site. No build command is required.

For GitHub Pages: **Settings → Pages → Deploy from a branch → `main` / root**.

## MVP boundaries

This version intentionally keeps data in the browser. The next production phase should add:

- authentication and persistent profiles
- database-backed calls, threads, votes and records
- machine resolution via market/data APIs
- challenge flags and moderation workflow
- season scoring based on difficulty rather than raw hit rate
- position disclosures and micro-cap restrictions
- audit trail for settlement source and result
- notifications and draft squads

## Product principles carried into the UI

1. **Record first** — personal accuracy is visible before content.
2. **Talk stays talk** — ordinary threads have equal billing with calls.
3. **One page** — channels filter the hub instead of sending users through a forum tree.
4. **Credibility over casino energy** — sober surfaces, hairline borders, generous whitespace and restrained semantic color.
5. **Precise claims** — every call asks for a resolution date and exact settlement condition.
