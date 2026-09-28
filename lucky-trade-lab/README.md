# OPC TRADE LAB V1

**Private binary market observation, historical collector, deterministic replay & paper trading accounting laboratory.**

**Owner:** Victor Chuyền · OPC AI REVENUE LAB  
**Version:** 1.0 (2026-09-24)  
**Notice:** `BASELINE_SOURCE_NOT_PROVIDED` — Monorepo initialized natively according to master specification.

---

## Key Features

1. **Strict Decimal Accounting Ledger:**
   - Available cash vs reserved cash separation.
   - Dual-leg non-atomic fill handling with directional residual lot tracking.
   - Conservative mark-to-bid portfolio valuation. Zero upfront phantom settlement.
2. **Strategy Engine (`BINARY_COMPLETE_SET_OBSERVER_V1`):**
   - Condition ID verification, depth sweeps, fee hurdles, crossed-book detection, anti-staleness gate.
3. **Deterministic Replay Worker:**
   - Lookahead-free execution against simulated future book latency.
   - Idempotent fill recording with deduplicated mutation keys.
4. **Research UI (7 Screens):**
   - Overview, Market Inspector, Collector, Strategy Lab, Replays, Audit & Export, Settings.
   - Terminal navy/teal research theme with clear provenance badges (`SYNTHETIC`, `RECORDED_LIVE`, `LIVE_READONLY`).
5. **Security & Data Safety:**
   - CWE-1236 CSV injection neutralization.
   - Zero live wallet / private key handling in V1.
   - Online hot WAL SQLite backups.

---

## Quick Start (Local)

```bash
# 1. Run Doctor Check
python3 -m backend.opc_trade doctor

# 2. Seed Synthetic Fixtures
python3 -m backend.opc_trade fixtures seed --dataset demo-v1

# 3. Execute Replay
python3 -m backend.opc_trade replay --dataset demo-v1

# 4. Run Test Suite
python3 -m unittest discover -s tests

# 5. Start Web UI
npm run dev
```

---

## Docker Deployment (VPS)

```bash
docker compose up -d --build
```
Access at `http://localhost:8000` or configured domain via Caddy.
