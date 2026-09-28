# OPC TRADE LAB V1 — SOURCE CODE AUDIT & UPSTREAM REPOSITORIES

**Date:** 2026-09-24  
**Auditor:** Victor Chuyền Systems Engineering

| Upstream Repo | URL / Commit | License | Concepts Studied & Adapted | Exclusions & Mitigations |
|---|---|---|---|---|
| Polymarket `py-sdk` | https://github.com/Polymarket/py-sdk | MIT | Read-only market structure, CLOB token IDs, book schema. | Live trading / wallet execution completely excluded in V1. Read-only only. |
| Binance REST API | https://api.binance.com | Terms of Service | BTC reference price polling for context. | Directional arbitrage or BTC-triggered prediction logic excluded from V1. |
| Hummingbot | https://github.com/hummingbot/hummingbot | Apache 2.0 | Order lifecycle state machine, non-atomic fill simulation. | Complex microservices & connector bloat avoided; pure clean Python engine. |
| OpenMarket | https://github.com/gregyoung14/openmarket | MIT (Archival) | Replay provenance discipline, monotonic timestamps, anti-lookahead. | Archival/frozen code rewritten natively with clean typing & SQLite WAL. |
| Prediction Market Arbitrage Bot | https://github.com/realfishsam/prediction-market-arbitrage-bot | Public | Scan and pair matching concepts. | All-in / YOLO sizing and unhedged fee omission strictly rejected. |

**License Notice:** All code in this repository was written natively adhering strictly to the OPC Trade Lab V1 specifications under Apache 2.0. No unauthorized submodules or unlicensed code were imported.
