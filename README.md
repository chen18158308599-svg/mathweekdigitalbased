# Math Week digital games

React + Vite. Players play first, then scan a per-result QR with their phone and sign in on the Math Week leaderboard to claim their final score.

## Run and verify

```
npm ci
npm run dev
npm run build
npm run test:scoring
npm run test:leaderboard
```

The new production scoring path does not use Google Sheets, typed names/student IDs, or `/api/mathverse`. The old proxy and `test:integration` remain for legacy compatibility only.

## Paired deployment

Deploy this repo and the updated `Math-Week-Leaderboard` repo together. Apply the leaderboard migration `0010_digital_result_claims.sql` first, then configure `digital_key` for each of the seven digital game rows in `/admin/games`. Verify enabled flags and date windows against the current event schedule; old seed dates are outdated.

Games must be opened inside the leaderboard `/games` iframe to claim. Opening this game site by itself supports gameplay but cannot issue claim tokens. The host owns its display authorization cookie and calls its own same-origin API; no Supabase token or service credential enters this game.

Default parent origin: `https://math-week-leaderboard.vercel.app`. For local development set `VITE_LEADERBOARD_ORIGIN=http://localhost:3000` before starting Vite. Also set the leaderboard `NEXT_PUBLIC_DIGITAL_GAME_URL` to the local Vite origin. Production defaults still point to the existing Render game deployment.

Each final result sends its stable attempt ID, game key, player slot, exact integer final score, outcome and finalization time. The host returns a generated QR, expiry and claim status. Conway and Planarity have independent p1/p2 claims. Normal games scale the raw final score to 0-19 claim points using per-game targets on the leaderboard server and in the database, including partial-progress/loss scores, exactly once per school account per game (existing leaderboard policy). The original scoring formulas are preserved.

Average sends the chosen integer 0-100, associates it with the claiming account, and stores a zero-point pending result. It does not interpret the choice as points. Final competition settlement remains an organizer action; no new winning/settlement rule is invented here.

QR codes last 60 seconds. A retry reuses the same unclaimed result; an expired QR cannot be renewed or claimed. The game returns home at expiry. Claimed results cannot be reissued. Unclaimed results are retained in this browser tab (up to 30 recent attempts), without storing student identities. There is no resume-results prompt.

The kiosk integration validates message origin and iframe source, display authorization, game registration, event window, result shape and duplicate identity. Scores are still produced by client gameplay, not a server replay engine; this change does not add authoritative anti-cheat validation.

Legacy per-game PINs remain in `src/config/gameAccess.js`. They are a frontend convenience, not secure authentication.

Apply leaderboard migration 0012_digital_points_scaling.sql after 0010 and 0011. The result panel distinguishes GAME SCORE from CLAIM POINTS (MAX 19). Existing awarded submissions are preserved.
