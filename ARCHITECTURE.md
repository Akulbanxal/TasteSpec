# TASTESPEC Architecture Note

## 1. Structure Overview
TASTESPEC uses a unified repository layout designed for simplicity and operational security:
- **`client/`**: React 18 + TypeScript + Vite. Consumes `/api/*` endpoints. It compiles into static assets (`client/dist`).
- **`server/`**: Node.js + Express + TypeScript. Manages environment configurations, secures external API keys (Qloo), runs deterministic evaluation logic, and serves the compiled client in production mode.
- **`shared/`**: Common TypeScript contracts, interfaces, and schemas shared between frontend and backend.

## 2. Security Boundaries
- **Zero Client Key Exposure:** The Qloo API credential is held solely within the server environment (`process.env.QLOO_API_KEY`). The client never receives or stores third-party credentials.
- **Proxy Model:** In local development, Vite proxies `/api` requests to `http://localhost:3001`. In production, Express hosts both the `/api` routes and the static client bundle from a single Node process.

## 3. Shared Evaluation Data Model & Epistemic Rules
- **Epistemic Honesty:** All findings explicitly distinguish between:
  - `VERIFIED_SUPPORTED`: Verified against positive empirical affinity returned by Qloo.
  - `NOT_PRESENT_IN_RETRIEVED_SET`: Item was resolved in the taste graph but was not returned within the top-K affinity results (never conflated with universal falsehood).
  - `KNOWN_LOW_AFFINITY`: Empirical affinity score is below scenario threshold $\theta$.
  - `CONTRADICTS_CONSTRAINT`: Contradicts persona exclusion filters or geographical constraints.
  - `UNRESOLVED_ENTITY`: Entity not indexed in Qloo (flagged for review, not counted as negative affinity).
  - `UNSUPPORTED_COMBINATION_OR_MISSING_EVIDENCE`: Unverified parameter combinations or network unavailability.
- **Metric Provenance:** Numerical scores are recorded alongside their documented origin (e.g. `sourceFormulaOrOrigin: "Qloo response payload: affinity"`). No scores are fabricated.
- **Lifecycle State Machine:** Transitions strictly through `CONFIGURED` $\rightarrow$ `RESOLVING_ENTITIES` $\rightarrow$ `FETCHING_QLOO_EVIDENCE` $\rightarrow$ `EVALUATING_RULES` $\rightarrow$ `COMPLETED` (or `FAILED`).

## 4. Command Conventions
- `npm run dev`: Starts development server and Vite frontend concurrently.
- `npm run dev:server`: Starts Express server with `tsx watch`.
- `npm run dev:client`: Starts Vite dev server with proxy.
- `npm run type-check`: Validates TypeScript across client, server, and shared code.
- `npm run build`: Builds the client with Vite and compiles the server with TypeScript.
- `npm start`: Launches the compiled production Node service.
- `npm test`: Runs Node's test runner (`tsx --test`).
- `npm run test:smoke`: Runs the sanitized Qloo API smoke test.
