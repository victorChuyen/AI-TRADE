# THIRD-PARTY SOFTWARE NOTICES AND INFORMATION

This project incorporates architectural ideas, protocol specifications, and design patterns referenced from the following open-source projects. No external proprietary code is distributed directly without verification.

## 1. Polymarket Public APIs & SDK Concepts
- **Reference**: https://github.com/Polymarket/py-sdk & CLOB documentation
- **License**: MIT
- **Usage**: Read-only market structure, token ID pairing, CLOB REST book schema, order level sorting.
- **Audit Findings**:
  - Direct trade execution is strictly disabled in V1.
  - Public read endpoints are queried in read-only mode.
  - HTTP 403 (regional/Cloudflare) is surfaced explicitly without bypass.

## 2. Binance Public REST Market Data
- **Reference**: https://api.binance.com
- **License**: Public API terms of service
- **Usage**: Read-only reference BTC/USDT price ticker for market context.

## 3. Hummingbot Microstructure Principles
- **Reference**: https://github.com/hummingbot/hummingbot
- **License**: Apache 2.0
- **Usage**: State machine lifecycle (`CREATED` -> `VALIDATED` -> `QUEUED` -> `SUBMITTED_SIM` -> `FILLED`/`PARTIALLY_FILLED`/`CANCELLED`), latency simulation, separation of signal detection from execution clock.

## 4. OpenMarket Research Discipline
- **Reference**: https://github.com/gregyoung14/openmarket & arXiv:2607.26245
- **License**: MIT (Archival research repository)
- **Usage**: Ingest timestamps vs exchange timestamps, monotonic timestamps across boots, strict provenance tracking (`SYNTHETIC`, `RECORDED_LIVE`, `LIVE_READONLY`), no lookahead bias.

## 5. Lucide Icons
- **Reference**: https://github.com/lucide-icons/lucide
- **License**: ISC License
- **Usage**: UI terminal iconography.
