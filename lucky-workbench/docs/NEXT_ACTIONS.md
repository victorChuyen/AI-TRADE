# OPC TRADE LAB V1 — NEXT ACTIONS FOR OWNER (VICTOR CHUYỀN)

Maximum 5 clear, prioritized action items requiring owner decision or infrastructure access:

1. **Review Replay & Accounting Math:**
   - Execute `python3 -m backend.opc_trade replay --dataset demo-v1` locally or view in the interactive UI to verify the partial-fill residual lot tracking and mark-to-bid valuations.

2. **Supply VPS & Domain for G4 Private Pilot (When Ready):**
   - Provide domain DNS (A record) and VPS access to deploy `docker-compose.yml` with Caddy automatic TLS.

3. **Verify Upstream Polymarket Public Feed Access:**
   - On your target server/workstation, verify if Polymarket CLOB/Gamma REST responds 200 or 403 (due to geographic IP policies). If restricted, keep collector in recorded/synthetic mode or route via authorized jurisdiction.

4. **Review Strategy Risk Caps in `configs/`:**
   - Verify defaults: starting paper cash ($1,000), 20% portfolio exposure cap, 8% max peak drawdown, and 0.20% taker fee hurdle.

5. **Decision on SaaS Monetization Gate:**
   - Do NOT enable billing or checkout until G4 (24h collector soak) and G5 (out-of-sample data validation) are completed.
