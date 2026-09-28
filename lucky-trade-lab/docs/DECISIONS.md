# OPC TRADE LAB V1 — ARCHITECTURAL DECISION RECORDS (ADR)

## ADR 001: Strict Decimal Arithmetic Standard
- **Context:** Binary prediction markets operate with fractional shares and cents. Floating point binary representation leaks inaccuracies (e.g. `0.1 + 0.2 = 0.30000000000000004`).
- **Decision:** All prices, quantities, fees, cash values, and NAV must use Python `decimal.Decimal` (or string representation in JSON). Zero `float()` conversions in the core accounting path.

## ADR 002: Non-Atomic Execution and Residual Lot Tracking
- **Context:** A complete set consists of two legs (YES + NO). In reality, orders execute on order books sequentially or independently. Leg A can fill while Leg B fails or only fills partially.
- **Decision:** The replay engine tracks each leg independently. On unbalanced fills, the engine NEVER assumes complete set settlement upfront. Residual shares are held as directional inventory and marked strictly to best executable bid.

## ADR 003: SQLite WAL Mode for V1 Single-Owner Research
- **Context:** V1 is an owner-only quantitative research lab requiring minimal operational overhead.
- **Decision:** Use SQLite with Write-Ahead Logging (`WAL`), `foreign_keys = ON`, and `busy_timeout = 5000`. Provide safe online backup via `sqlite3.Connection.backup`. Multi-tenant PostgreSQL migration is deferred to the SaaS Phase.

## ADR 004: Preview Gateway & Synthetic Preview Fallback
- **Context:** In AI Studio preview, ephemeral cloud containers cannot guarantee persistent background Python processes.
- **Decision:** The React frontend runs in browser with full interactive capabilities, loaded with rich synthetic fixtures and deterministic simulation math, while providing seamless connectivity to the local/VPS FastAPI backend via `BACKEND_BASE_URL`. Clear status badges always indicate whether data is `SYNTHETIC`, `RECORDED_LIVE`, or `LIVE_READONLY`.

## ADR 005: Neutralizing CSV Formula Injection (CWE-1236)
- **Context:** Exporting order IDs or market slugs containing characters like `=`, `+`, `-`, `@` can trigger remote formula execution in Excel/Google Sheets.
- **Decision:** Prepend a single quote `'` to any cell starting with `=`, `+`, `-`, `@`, `\t`, or `\r`.
