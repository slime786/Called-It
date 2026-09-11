# Called it. — Phase 3

Called it. is a prediction-driven community for markets, tech, crypto, world affairs and gadgets. Members put claims on record with confidence, a resolution date and an exact settlement condition; public profiles then accumulate permanent results.

## Phase 3 includes

- Persistent Supabase accounts, calls, threads and positions from Phase 2
- Clickable call records with shareable `#call-ID` URLs
- Discussion/comments under every call
- Clickable public profiles with overall and category accuracy
- Difficulty-adjusted score alongside raw accuracy
- Leaderboard based on resolved-call score
- 24-hour wording challenge that automatically becomes open
- Ambiguity flags during challenge
- Resolution metadata: machine, named source or jury
- Admin-only permanent YES / NO / VOID settlement
- Resolution note and source URL on the permanent call record
- Mobile-responsive single-hub layout

## Scoring in this build

For an author's resolved call:
- Correct: `+(100 - confidence)`
- Wrong: `-confidence`
- Void: `0`

This makes an obvious 99% call worth almost nothing when correct, while a wrong 99% call is heavily punished. Accuracy remains separately visible.

## Setup

Read `SETUP-PHASE3.md`. Existing Phase 2 data is preserved.

## Important

This is still a development MVP. "Machine" resolution is represented in the data model and UI, but an external price/data provider and scheduled server-side resolver are not included yet. Until that is connected, an admin settles calls using the resolution controls.
