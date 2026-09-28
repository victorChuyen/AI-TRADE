# OPC TRADE LAB V1 — OPERATIONAL RUNBOOK

**Target Audience:** Victor Chuyền (Owner / Lead Quant Engineer)  
**Environment:** Local Workstation / Linux VPS (Docker Compose)

---

## 1. Quick Start (Local Development)

### Prerequisites
- Python 3.10+ (Standard library + sqlite3)
- Node.js 18+ (for React Frontend)

### Run Health Check & Setup
```bash
# 1. Run Doctor Check
python3 -m backend.opc_trade doctor

# 2. Seed Synthetic Benchmark Fixtures
python3 -m backend.opc_trade fixtures seed --dataset demo-v1

# 3. Execute Deterministic Replay
python3 -m backend.opc_trade replay --dataset demo-v1

# 4. Run Automated Test Suite
python3 -m unittest discover -s tests
```

---

## 2. Docker VPS Deployment

### Architecture
- `api`: FastAPI Python service (port 8000)
- `worker`: Collector & Replay job process
- `caddy`: Reverse proxy, TLS certificates, static asset server (ports 80 & 443)
- Persistent Volume: `opc_data` mounted at `/data/opc_trade.sqlite`

### Deployment Steps
```bash
# 1. Configure Environment
cp .env.example .env
nano .env # Set APP_DOMAIN to your domain (e.g., lab.yourdomain.com)

# 2. Build Frontend Assets
npm install
npm run build

# 3. Start Docker Containers
docker compose up -d --build

# 4. Verify Health
curl http://localhost:8000/healthz
docker compose logs -f api
```

---

## 3. Database Backup & Disaster Recovery

### Safe Online Backup (Zero Downtime)
SQLite WAL mode allows zero-downtime hot backups via the online backup API:
```bash
python3 -m backend.opc_trade backup --output /data/backups
```
This generates a timestamped file: `/data/backups/opc_trade_backup_YYYYMMDD_HHMMSS.sqlite`.

### Backup Integrity Verification (Dry-Run)
```bash
python3 -m backend.opc_trade restore --input /data/backups/opc_trade_backup_20260924_120000.sqlite --dry-run
```
Outputs `PRAGMA integrity_check` verification.

### Disaster Recovery
To restore in production:
1. Stop running worker and api containers: `docker compose down`
2. Replace `/data/opc_trade.sqlite` with the verified backup file.
3. Start containers: `docker compose up -d`
4. Run `python3 -m backend.opc_trade doctor` to verify WAL mode and tables.

---

## 4. Emergency Kill Switch Engagement

If market conditions become unstable or drawdown limits are approached:
1. Via UI: Navigate to **Settings & Risk** -> Toggle **Emergency Kill Switch** -> Enter Reason -> Confirm.
2. Via CLI / Code: Set `kill_switch_active = True`.
- **Result:** Halts all order creation and reservation immediately before execution.
