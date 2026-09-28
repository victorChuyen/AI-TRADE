# OPC TRADE LAB — SAAS MONETIZATION & ROADMAP (POST-V1 GATE)

**Status:** ROADMAP / PLANNING ONLY — Gated behind technical and owner validation.  
**Rule:** Zero live billing or checkout is enabled in V1.

---

## 1. Three Strict Revenue Stream Separations

To maintain mathematical and financial honesty, three separate ledgers must be maintained:

1. **Membership SaaS Revenue:**
   - Recurring software subscription fees paid directly by quantitative traders for dashboard access, historical datasets, replay compute, and report exports.
2. **Exchange Referral Revenue:**
   - Brokerage/platform commissions credited by exchanges if official attribution terms are verified. (Conservative assumption: $0 until verified).
3. **SaaS Affiliate Payouts:**
   - Commissions paid to partners who refer paying SaaS members. **This is an expense (cost of acquisition), NEVER added into top-line revenue.**

---

## 2. Experimental SaaS Tier Structure

- **Research Tier ($19 / month):**
  - Live read-only books for up to 5 binary markets
  - Synthetic scenario sandbox
  - Up to 20 daily replay runs
  - Standard CSV exports

- **Pro Quant Tier ($49 / month):**
  - Unlimited daily replay runs
  - Up to 15 concurrent watchlist markets
  - Continuous recorded datasets access
  - Advanced parameter stress testing (slippage, fees, latency)
  - Raw event audit logs

- **Team / Fund Tier ($99 / month):**
  - Multi-seat tenant isolation (PostgreSQL migration prerequisite)
  - Webhook alerts for spread opportunities
  - Custom dataset upload & private fixtures

---

## 3. SaaS Beta Readiness Prerequisites (Gate SaaS)
Before accepting any paying customer:
- [ ] Migrate single-tenant SQLite to PostgreSQL with strict row-level security (RLS).
- [ ] Implement server-side checkout session & idempotent webhook handlers.
- [ ] Implement automated refund & chargeback ledger reconciliation.
- [ ] Verify legal compliance, data distribution rights, and terms of service.
