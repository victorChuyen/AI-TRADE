# OPC TRADE LAB V1 — IMPLEMENTATION STATUS MATRIX

**Updated:** 2026-09-24  
**Owner:** Victor Chuyền · OPC AI REVENUE LAB  
**Branch:** main (Baseline Monorepo Initialized)

| Capability / Module | Status | Evidence / Test | Notes |
|---|---|---|---|
| Monorepo Architecture | IMPLEMENTED | Directory tree, Docker, Caddy, requirements | Monorepo created with `BASELINE_SOURCE_NOT_PROVIDED` notice. |
| Strict Decimal Math | TESTED | `tests/unit/test_decimal_math.py` | Zero float leakage. Strict decimal quantization for prices, shares, money. |
| Order Book Depth Sweep | TESTED | `tests/unit/test_order_book_depth.py` | Multi-level sweeps, limit enforcement, crossed-book detection. |
| BINARY_COMPLETE_SET_OBSERVER_V1 | TESTED | `tests/unit/test_complete_set_strategy.py` | Rejections for stale data, thin edge, crossed book, closed market. |
| Risk Manager & Kill Switch | TESTED | `tests/unit/test_risk_manager.py` | Exposure limits, cash buffer, drawdown kill switch trips before next order. |
| Strict Decimal Ledger | TESTED | `tests/unit/test_ledger_accounting.py` | Available vs reserved cash, lot inventory, mark-to-bid, idempotency keys. |
| CSV Injection Neutralization | TESTED | `tests/unit/test_csv_injection.py` | CWE-1236 mitigation prepends `'` to `=`, `+`, `-`, `@`, `\t`, `\r`. |
| Replay Engine (Deterministic) | TESTED | `tests/integration/test_replay_runner.py` | Delayed fills, partial fills, residual inventory, identical hash results. |
| SQLite WAL Storage & Backup | TESTED | `tests/integration/test_sqlite_storage.py` | WAL mode, foreign keys, report storage, safe online backup & integrity test. |
| CLI Toolkit | TESTED | `python -m backend.opc_trade doctor/fixtures/replay` | Complete CLI for migration, seeding, replay, doctor, backup, restore. |
| Synthetic Benchmark Fixtures | IMPLEMENTED | `fixtures/synthetic/demo_v1.json` | 5 scenarios: gain, execution, fee rejection, partial imbalance, stale book. |
| Polymarket Public Adapter | IMPLEMENTED | `backend/opc_trade/adapters/polymarket.py` | REST discovery + CLOB book. Explicit 403 handling. Rate limit backoff. |
| Binance Reference Feed | IMPLEMENTED | `backend/opc_trade/adapters/binance.py` | Public BTC reference price for context. |
| Collector Background Service | IMPLEMENTED | `backend/opc_trade/collector/runner.py` | Watchlist (1-5 markets), 5s cadence, WAL storage. |
| React Research UI (7 Screens) | IMPLEMENTED | `src/App.tsx` | Overview, Inspector, Collector, Strategy Lab, Replays, Audit, Settings. |
| Live Money Execution | BLOCKED / PROHIBITED | Gated in V1 | Prohibited by V1 Master Prompt. No wallet / private keys. |
| Real Billing / Stripe | PLANNED | Gated for SaaS Phase | Separate membership SaaS, referral attribution, affiliate costs. |
| Multi-tenant Production DB | PLANNED | Gated for SaaS Phase | Single tenant `pilot-owner` in V1; migration to Postgres in SaaS beta. |
