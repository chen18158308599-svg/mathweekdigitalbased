MATHVERSE — Google Sheets 7-game registration repair
=======================================================

What was found in the uploaded source:
* App.jsx bypassed /api/mathverse registration for Average.
* AverageGame.jsx still posts the numerical choice to a DIFFERENT/OLDER
  Google Apps Script endpoint via no-cors; opaque responses cannot confirm saving.
* After clicking NEW PLAYER within Average, there was no call to the new
  Google Sheets API at all.
* Conway.css contained the invalid CSS value '*background*'.
* The other six games have backend registration wiring and formal end-result
  events; their live end-to-end behavior has NOT been independently verified
  in your computer environment.

What this patch changes:
* All 7 games register username+studentid to their mapped NEW Sheets.
* Average's shared registration creates its initial row immediately. Each
  NEW PLAYER submission creates an additional row with a new session_id.
  The Average score remains blank until genuine event-wide settlement.
* Other six games keep their existing register -> score -> status flow.
* Fixes the Conway CSS typo, without modifying game mechanics.
* Adds mocked regression tests for all 7 API game mappings and score flows.

IMPORTANT LIMITATION — Average:
* The Average choice (0–100) STILL goes to the OLD answer collector.
* The NEW owner-controlled Apps Script backend only supports register,
  score, status; it cannot store 0–100 choice or calculate a final score.
* The legacy collector uses no-cors and thus cannot confirm successful save.
* To store choices only in your own Sheets and calculate actual scores at
  the event deadline, you must upgrade/deploy the Apps Script backend.
* Do not mistake Average selection as the final competition score.

Validation completed in analysis container:
- node scripts/verify-integration.mjs: PASS (mocked, all seven mappings)
- node scripts/verify-scoring.mjs: PASS
- 21 JavaScript/JSX/MJS syntax checks: PASS
- 12 CSS syntax checks: PASS
- npm run build: NOT RUN; npm dependencies are absent in this environment,
  and npm registry packages could not be downloaded. Run it on your PC.
- Live Sheets register/score: NOT performed for these changes because your
  secret .env.local was correctly excluded from the ZIP. Previous Codex
  reported a real Symmetry test; this is not new evidence for the other games.

EASY APPLY (PowerShell in VS Code, with the existing project backed up):
1) Keep your current .env.local; do NOT send it or delete it.
2) Expand the PATCH ZIP onto D:\Downloads\mathweekdigitalbased:
   Expand-Archive -Path "D:\Downloads\MATHVERSE_7_Game_Database_Fix.zip" -DestinationPath "D:\Downloads\mathweekdigitalbased" -Force
3) Run in the project folder:
   npm run test:integration
   npm run test:scoring
   npm run build
4) Stop previous Vite processes (Ctrl+C). Run: npm run dev
5) Open the exact Local URL printed in terminal. Do not use a stale tab.
6) Register a TEST player in each game; check username/studentid in the
   matching NEW Google Sheet. Finish each real-time game to verify score.
   For Average, score should stay blank until event-wide settlement.

Do not move .env.local into src/, upload it, or commit it to Git.
