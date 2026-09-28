# OPC TRADE LAB V1 — STRATEGY SPECIFICATION: BINARY_COMPLETE_SET_OBSERVER_V1

**Version:** 1.0.0  
**Strategy ID:** `BINARY_COMPLETE_SET_OBSERVER_V1`  
**Owner:** Victor Chuyền · OPC AI REVENUE LAB

---

## 1. Strategy Mathematical Foundation

In prediction markets with complementary binary outcomes (e.g. YES and NO for the exact same condition), holding 1 share of YES and 1 share of NO guarantees an exact settlement payout of $1.00 of collateral (assuming standard binary market rules and solvent settlement).

### Theoretical Opportunity
If the cost of purchasing $q$ shares of YES plus $q$ shares of NO from the order book asks is less than $\$1.00 \times q$, a theoretical spread exists:

$$\text{gross\_pair\_cost} = \sum \text{Sweep}(\text{asks}_A, q) + \sum \text{Sweep}(\text{asks}_B, q)$$

$$\text{total\_fees} = (\text{sweep}_A \times \text{fee\_rate}) + (\text{sweep}_B \times \text{fee\_rate})$$

$$\text{cost\_buffer} = q \times \text{buffer\_per\_pair}$$

$$\text{estimated\_net\_profit} = (q \times \$1.00) - \text{gross\_pair\_cost} - \text{total\_fees} - \text{cost\_buffer}$$

$$\text{edge\_per\_pair} = \frac{\text{estimated\_net\_profit}}{q}$$

---

## 2. Hard Rejection Gates (No-Trade Checklist)

Before any trade intent or paper order is allowed, all of the following conditions MUST pass:

1. **Market State Gate**: `market_state == MarketState.OPEN`. Paused, closed, or resolved markets are rejected immediately (`MARKET_NOT_OPEN`).
2. **Fee Model Verification**: `fee_model_status != UNKNOWN`. If fee status is unverified, live trades are rejected. In synthetic mode, `ASSUMED` is permitted with explicit watermarking (`FEE_MODEL_UNKNOWN`).
3. **Crossed Book Sanity**: Best Bid must be strictly less than Best Ask on both legs ($p_{\text{bid}} < p_{\text{ask}}$). If $p_{\text{bid}} \ge p_{\text{ask}}$, book is invalid/crossed (`BOOK_CROSSED`).
4. **Depth Sweep Completeness**: Both books must have sufficient ask liquidity at prices below `max_price_limit` for the full $q$ shares (`INSUFFICIENT_DEPTH`).
5. **Minimum Edge Hurdle**: $\text{edge\_per\_pair} \ge \text{min\_edge\_threshold}$ (Default: $\$0.0150$ per pair) (`EDGE_BELOW_THRESHOLD`).
6. **Data Freshness / Anti-Staleness**: Ingestion age must not exceed `max_staleness_ms` (Default: 5000 ms) (`STALE_DATA`).
7. **Sequence Continuity**: Book state must be `SYNCED`. Reconnecting feeds are flagged (`SEQUENCE_DESYNC`).

---

## 3. Strict Non-Atomic Execution & Residual Handling

In real-world prediction markets, **legs A and B cannot be executed atomically in a single transaction**.
- An order for Leg A may fill 10 shares, while Leg B fills only 5 shares due to sudden book changes.
- **The engine NEVER assumes complete pairs on partial execution.**
- Residual shares ($\|q_A - q_B\|$) are explicitly tracked as **directional open inventory**.
- Payout is NEVER credited upfront in cash. Payout only occurs upon verified settlement.
- Mark-to-market valuation strictly values open lots at **best executable bid** (conservative mark).
