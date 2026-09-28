"""
OPC Trade Lab V1 - SQLite WAL Database Storage & Schema
Owner: Victor Chuyền · OPC AI REVENUE LAB
Version: 1.0 (2026-09-24)
"""
from __future__ import annotations

import sqlite3
import os
import json
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

SCHEMA_SQL = """
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA busy_timeout = 5000;

CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tenants (
    tenant_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'OWNER',
    created_at TEXT NOT NULL,
    FOREIGN KEY(tenant_id) REFERENCES tenants(tenant_id)
);

CREATE TABLE IF NOT EXISTS markets (
    condition_id TEXT PRIMARY KEY,
    venue TEXT NOT NULL,
    market_slug TEXT NOT NULL,
    question TEXT NOT NULL,
    token_a TEXT NOT NULL,
    token_b TEXT NOT NULL,
    rules_hash TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'OPEN',
    fee_model_status TEXT NOT NULL DEFAULT 'ASSUMED',
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS snapshots (
    event_id TEXT PRIMARY KEY,
    dataset_id TEXT NOT NULL,
    provenance TEXT NOT NULL,
    condition_id TEXT NOT NULL,
    received_at_utc TEXT NOT NULL,
    received_monotonic_ns INTEGER NOT NULL,
    payload_json TEXT NOT NULL,
    FOREIGN KEY(condition_id) REFERENCES markets(condition_id)
);

CREATE TABLE IF NOT EXISTS runs (
    run_id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    dataset_id TEXT NOT NULL,
    strategy_config_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'COMPLETED',
    initial_cash TEXT NOT NULL,
    final_nav TEXT NOT NULL,
    total_fees TEXT NOT NULL,
    max_drawdown_pct TEXT NOT NULL,
    orders_count INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    report_json TEXT NOT NULL,
    FOREIGN KEY(tenant_id) REFERENCES tenants(tenant_id)
);

CREATE TABLE IF NOT EXISTS cash_ledger (
    entry_id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    order_id TEXT,
    fill_id TEXT,
    idempotency_key TEXT UNIQUE NOT NULL,
    amount TEXT NOT NULL,
    fee TEXT NOT NULL,
    balance_after TEXT NOT NULL,
    cause TEXT NOT NULL,
    timestamp_utc TEXT NOT NULL,
    FOREIGN KEY(run_id) REFERENCES runs(run_id),
    FOREIGN KEY(tenant_id) REFERENCES tenants(tenant_id)
);

CREATE TABLE IF NOT EXISTS inventory_lots (
    lot_id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL,
    condition_id TEXT NOT NULL,
    token_id TEXT NOT NULL,
    outcome_name TEXT NOT NULL,
    size TEXT NOT NULL,
    cost_basis TEXT NOT NULL,
    unit_price TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'OPEN',
    acquired_at_utc TEXT NOT NULL,
    settled_at_utc TEXT,
    realized_pnl TEXT,
    FOREIGN KEY(run_id) REFERENCES runs(run_id)
);

CREATE TABLE IF NOT EXISTS risk_events (
    event_id TEXT PRIMARY KEY,
    run_id TEXT,
    action TEXT NOT NULL,
    detail TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_snapshots_dataset ON snapshots(dataset_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_cond ON snapshots(condition_id);
CREATE INDEX IF NOT EXISTS idx_ledger_run ON cash_ledger(run_id);
CREATE INDEX IF NOT EXISTS idx_lots_run ON inventory_lots(run_id);
"""

class Database:
    def __init__(self, db_path: str = "/data/opc_trade.sqlite"):
        self.db_path = db_path
        # If /data does not exist or isn't writable, fallback to local path
        if not os.path.exists(os.path.dirname(os.path.abspath(db_path))):
            os.makedirs(os.path.dirname(os.path.abspath(db_path)), exist_ok=True)
        self._ensure_initialized()

    def get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, timeout=5.0)
        conn.execute("PRAGMA foreign_keys = ON;")
        conn.execute("PRAGMA journal_mode = WAL;")
        conn.execute("PRAGMA busy_timeout = 5000;")
        conn.row_factory = sqlite3.Row
        return conn

    def _ensure_initialized(self) -> None:
        with self.get_connection() as conn:
            conn.executescript(SCHEMA_SQL)
            # Default tenant
            conn.execute(
                "INSERT OR IGNORE INTO tenants (tenant_id, name, created_at) VALUES (?, ?, ?)",
                ("pilot-owner", "Victor Chuyen Lab", datetime.now(timezone.utc).isoformat())
            )
            # Default user
            conn.execute(
                "INSERT OR IGNORE INTO users (user_id, tenant_id, email, role, created_at) VALUES (?, ?, ?, ?, ?)",
                ("usr-owner", "pilot-owner", "sieuthibaohiemonline.com@gmail.com", "OWNER", datetime.now(timezone.utc).isoformat())
            )
            conn.commit()

    def backup_to(self, target_path: str) -> None:
        """Safe SQLite online backup API."""
        os.makedirs(os.path.dirname(os.path.abspath(target_path)), exist_ok=True)
        src = self.get_connection()
        dst = sqlite3.connect(target_path)
        try:
            with dst:
                src.backup(dst, pages=100)
        finally:
            src.close()
            dst.close()

    def save_run_report(self, report_dict: Dict[str, Any], tenant_id: str = "pilot-owner") -> None:
        with self.get_connection() as conn:
            conn.execute(
                """INSERT OR REPLACE INTO runs
                (run_id, tenant_id, dataset_id, strategy_config_hash, status, initial_cash, final_nav, total_fees, max_drawdown_pct, orders_count, created_at, report_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    report_dict["run_id"],
                    tenant_id,
                    report_dict["dataset_id"],
                    report_dict["strategy_config_hash"],
                    "COMPLETED",
                    str(report_dict["initial_cash"]),
                    str(report_dict["final_nav"]),
                    str(report_dict["total_fees_paid"]),
                    str(report_dict["max_drawdown_pct"]),
                    len(report_dict.get("executions", [])),
                    datetime.now(timezone.utc).isoformat(),
                    json.dumps(report_dict)
                )
            )
            conn.commit()

    def get_run_report(self, run_id: str, tenant_id: str = "pilot-owner") -> Optional[Dict[str, Any]]:
        with self.get_connection() as conn:
            cur = conn.execute("SELECT report_json FROM runs WHERE run_id = ? AND tenant_id = ?", (run_id, tenant_id))
            row = cur.fetchone()
            if row:
                return json.loads(row["report_json"])
        return None

    def list_runs(self, tenant_id: str = "pilot-owner") -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            cur = conn.execute("SELECT run_id, dataset_id, strategy_config_hash, initial_cash, final_nav, total_fees, max_drawdown_pct, orders_count, created_at FROM runs WHERE tenant_id = ? ORDER BY created_at DESC", (tenant_id,))
            return [dict(r) for r in cur.fetchall()]
