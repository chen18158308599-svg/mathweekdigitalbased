# React + Vite

## Game PIN prototype

The seven game PINs are configured as strings in `src/config/gameAccess.js`.
This frontend-only gate is a prototype, not secure authentication: the PINs
are included in the JavaScript bundle and can be inspected or bypassed by users.
A production access-control system must verify PINs on a trusted server.

Players enter a game after PIN verification and its introduction; registration is not
required before gameplay. When a result is finalized, the shared post-game form collects
the player's username and Student ID. Pending results and entered identities are retained
in browser storage for safe retries. On submission, the client calls `register` and then
`score` through the same-origin `/api/mathverse` route, validates each response's `ok`,
`status`, and `row`, and confirms both responses refer to the same sheet row before
showing success. Conway and Planarity use separate sessions and rows for their two players.
Failed submissions remain available for retry; completed records are cleared when returning
home.

Average Game sends the player's selected integer (0–100) through the same post-game form
and stores that number in the Average sheet's `score` column. It does not submit the
eventual competition score through this flow; that result remains pending.

## Server-only Google Apps Script proxy

Copy `.env.example` to `.env.local` for local development and set:

```text
MATHVERSE_API_KEY=the_server_side_key
```

Never use a `VITE_` prefix. Vite exposes `VITE_` values to browser bundles. The local Vite
server handles `/api/mathverse` without exposing the key. For production, deploy the full
repository to Vercel (not only `dist/`) and add `MATHVERSE_API_KEY` to the project environment;
`api/mathverse.js` is the matching serverless function. A static-only host cannot keep this
key secret and therefore is not compatible without an equivalent server-side route.

The proxy follows Google Apps Script redirects, validates allowed actions/game IDs, requires
`ok`, `status`, and `row` in successful responses, and never sends the API key to the browser.
Client-generated scores remain non-authoritative and can still be tampered with by a user.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
