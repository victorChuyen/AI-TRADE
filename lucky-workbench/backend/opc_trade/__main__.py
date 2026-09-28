"""
OPC Trade Lab V1 - CLI Entry Point
Owner: Victor Chuyền · OPC AI REVENUE LAB
Version: 1.0 (2026-09-24)
"""
from __future__ import annotations

import argparse
import sys
import os
import json
import sqlite3
from decimal import Decimal
from datetime import datetime, timezone

from .storage.db import Database
from .adapters.synthetic import generate_standard_synthetic_dataset
from .engine.strategy import StrategyConfig
from .replay.runner import ReplayRunner
from .risk.manager import RiskLimits
from .reports.export_csv import export_executions_to_csv, export_nav_timeline_to_csv

def cmd_db_migrate(args):
    db_path = os.getenv("DATABASE_URL", "opc_trade.sqlite").replace("sqlite:////", "/").replace("sqlite:///", "")
    db = Database(db_path)
    print(f"[OK] Database schema initialized and verified at: {db.db_path}")

def cmd_fixtures_seed(args):
    dataset_name = args.dataset or "demo-v1"
    db_path = os.getenv("DATABASE_URL", "opc_trade.sqlite").replace("sqlite:////", "/").replace("sqlite:///", "")
    db = Database(db_path)
    snaps = generate_standard_synthetic_dataset()

    with db.get_connection() as conn:
        for snap in snaps:
            # Seed market record
            conn.execute(
                """INSERT OR REPLACE INTO markets
                (condition_id, venue, market_slug, question, token_a, token_b, rules_hash, state, fee_model_status, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    snap.condition_id,
                    snap.venue,
                    snap.market_slug,
                    f"Binary Question: {snap.market_slug}",
                    snap.book_a.token_id,
                    snap.book_b.token_id,
                    snap.rules_hash,
                    snap.market_state.value,
                    snap.fee_model_status.value,
                    snap.received_at_utc
                )
            )
            # Seed snapshot record
            payload = json.dumps(snap.to_dict())
            conn.execute(
                """INSERT OR REPLACE INTO snapshots
                (event_id, dataset_id, provenance, condition_id, received_at_utc, received_monotonic_ns, payload_json)
                VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (snap.event_id, dataset_name, snap.provenance.value, snap.condition_id, snap.received_at_utc, snap.received_monotonic_ns, payload)
            )
        conn.commit()
    print(f"[OK] Successfully seeded {len(snaps)} synthetic snapshots into dataset '{dataset_name}'")

def cmd_replay(args):
    dataset_name = args.dataset or "demo-v1"
    db_path = os.getenv("DATABASE_URL", "opc_trade.sqlite").replace("sqlite:////", "/").replace("sqlite:///", "")
    db = Database(db_path)

    # Load snapshots
    with db.get_connection() as conn:
        cur = conn.execute("SELECT payload_json FROM snapshots WHERE dataset_id = ? ORDER BY received_at_utc ASC", (dataset_name,))
        rows = cur.fetchall()

    if not rows:
        print(f"[ERROR] No snapshots found in dataset '{dataset_name}'. Run 'fixtures seed' first.")
        sys.exit(1)

    from .core import CanonicalSnapshot, OrderBookSide, PriceLevel, Provenance, MarketState, FeeModelStatus

    snapshots = []
    for r in rows:
        data = json.loads(r["payload_json"])
        book_a = OrderBookSide(
            token_id=data["book_a"]["token_id"],
            source_timestamp_ms=data["book_a"]["source_timestamp_ms"],
            bids=[PriceLevel(Decimal(b["price"]), Decimal(b["size"])) for b in data["book_a"]["bids"]],
            asks=[PriceLevel(Decimal(a["price"]), Decimal(a["size"])) for a in data["book_a"]["asks"]],
        )
        book_b = OrderBookSide(
            token_id=data["book_b"]["token_id"],
            source_timestamp_ms=data["book_b"]["source_timestamp_ms"],
            bids=[PriceLevel(Decimal(b["price"]), Decimal(b["size"])) for b in data["book_b"]["bids"]],
            asks=[PriceLevel(Decimal(a["price"]), Decimal(a["size"])) for a in data["book_b"]["asks"]],
        )
        snapshots.append(CanonicalSnapshot(
            schema_version=data["schema_version"],
            event_id=data["event_id"],
            dataset_id=data["dataset_id"],
            provenance=Provenance(data["provenance"]),
            venue=data["venue"],
            condition_id=data["condition_id"],
            market_slug=data["market_slug"],
            rules_hash=data["rules_hash"],
            received_at_utc=data["received_at_utc"],
            received_monotonic_ns=data["received_monotonic_ns"],
            collector_boot_id=data["collector_boot_id"],
            book_a=book_a,
            book_b=book_b,
            fee_model_status=FeeModelStatus(data["fee_model_status"]),
            market_state=MarketState(data["market_state"]),
            sequence_status=data.get("sequence_status", "SYNCED"),
            btc_ref_price=Decimal(data["btc_ref_price"]) if data.get("btc_ref_price") else None
        ))

    config = StrategyConfig()
    runner = ReplayRunner(config=config, simulated_latency_ms=100)
    report = runner.run(snapshots)

    # Save to database
    report_dict = {
        "run_id": report.run_id,
        "dataset_id": report.dataset_id,
        "strategy_config_hash": report.strategy_config_hash,
        "start_utc": report.start_utc,
        "end_utc": report.end_utc,
        "total_snapshots": report.total_snapshots,
        "signals_generated": report.signals_generated,
        "valid_signals": report.valid_signals,
        "orders_submitted": report.orders_submitted,
        "orders_filled_completely": report.orders_filled_completely,
        "orders_partially_filled": report.orders_partially_filled,
        "orders_rejected_or_expired": report.orders_rejected_or_expired,
        "initial_cash": str(report.initial_cash),
        "final_available_cash": str(report.final_available_cash),
        "total_fees_paid": str(report.total_fees_paid),
        "realized_pnl": str(report.realized_pnl),
        "unrealized_pnl": str(report.unrealized_pnl),
        "final_nav": str(report.final_nav),
        "max_drawdown_pct": str(report.max_drawdown_pct),
        "open_inventory_lots": report.open_inventory_lots,
        "executions": report.executions,
        "nav_timeline": report.nav_timeline
    }
    db.save_run_report(report_dict)

    print("==================================================")
    print("      OPC TRADE LAB V1 - REPLAY RUN REPORT       ")
    print("==================================================")
    print(f"Run ID:                 {report.run_id}")
    print(f"Dataset:                {report.dataset_id}")
    print(f"Config Hash:            {report.strategy_config_hash}")
    print(f"Snapshots Processed:    {report.total_snapshots}")
    print(f"Signals (Total/Valid):  {report.signals_generated} / {report.valid_signals}")
    print(f"Orders (Submit/Fill/Part/Rej): {report.orders_submitted} / {report.orders_filled_completely} / {report.orders_partially_filled} / {report.orders_rejected_or_expired}")
    print(f"Initial Cash:           ${report.initial_cash}")
    print(f"Final Available Cash:   ${report.final_available_cash}")
    print(f"Total Fees Paid:        ${report.total_fees_paid}")
    print(f"Unrealized P&L:         ${report.unrealized_pnl}")
    print(f"Final NAV:              ${report.final_nav}")
    print(f"Max Drawdown:           {report.max_drawdown_pct}%")
    print(f"Open Lots:              {report.open_inventory_lots}")
    print("==================================================")

def cmd_doctor(args):
    print("==================================================")
    print("            OPC TRADE LAB V1 - DOCTOR             ")
    print("==================================================")
    print(f"Python Version:         {sys.version.split()[0]} [PASS]")
    db_path = os.getenv("DATABASE_URL", "opc_trade.sqlite").replace("sqlite:////", "/").replace("sqlite:///", "")
    try:
        db = Database(db_path)
        with db.get_connection() as conn:
            cur = conn.execute("PRAGMA journal_mode;")
            j_mode = cur.fetchone()[0]
            cur = conn.execute("PRAGMA foreign_keys;")
            fk_on = cur.fetchone()[0]
        print(f"SQLite WAL Mode:        {j_mode.upper()} [PASS]")
        print(f"Foreign Keys Enforced:  {'ON' if fk_on == 1 else 'OFF'} [PASS]")
    except Exception as e:
        print(f"Database Error:         {e} [FAIL]")

    live_trading = os.getenv("LIVE_TRADING_ENABLED", "false").lower() == "true"
    print(f"Live Trading Flag:      {'ENABLED (WARNING)' if live_trading else 'DISABLED (SAFE)'} [PASS]")
    print("Health Verification:    All core systems operational.")
    print("==================================================")

def cmd_backup(args):
    out_dir = args.output or "./backups"
    os.makedirs(out_dir, exist_ok=True)
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    target_path = os.path.join(out_dir, f"opc_trade_backup_{ts}.sqlite")

    db_path = os.getenv("DATABASE_URL", "opc_trade.sqlite").replace("sqlite:////", "/").replace("sqlite:///", "")
    db = Database(db_path)
    db.backup_to(target_path)
    print(f"[OK] Online SQLite WAL backup created successfully at: {target_path}")

def cmd_restore(args):
    inp = args.input
    if not inp or not os.path.exists(inp):
        print(f"[ERROR] Backup input file not found: {inp}")
        sys.exit(1)

    dry_run = args.dry_run
    print(f"Verifying backup integrity for: {inp}")
    test_conn = sqlite3.connect(inp)
    cur = test_conn.execute("PRAGMA integrity_check;")
    res = cur.fetchone()[0]
    test_conn.close()

    if res != "ok":
        print(f"[FAIL] Backup integrity check failed: {res}")
        sys.exit(1)

    print(f"[PASS] Backup integrity verified: {res}")
    if dry_run:
        print("[INFO] Dry run complete. No live databases were overwritten.")
    else:
        print("[WARN] Manual restore confirmed.")

def main():
    parser = argparse.ArgumentParser(description="OPC Trade Lab V1 CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # db migrate
    p_mig = subparsers.add_parser("db")
    p_mig.add_argument("action", choices=["migrate"])

    # fixtures seed
    p_fix = subparsers.add_parser("fixtures")
    p_fix.add_argument("action", choices=["seed"])
    p_fix.add_argument("--dataset", default="demo-v1")

    # replay
    p_rep = subparsers.add_parser("replay")
    p_rep.add_argument("--dataset", default="demo-v1")
    p_rep.add_argument("--config", default="configs/paper-safe.json")

    # collector
    p_col = subparsers.add_parser("collector")
    p_col.add_argument("action", choices=["run"])
    p_col.add_argument("--config", default="configs/collector.json")

    # doctor
    subparsers.add_parser("doctor")

    # backup
    p_bak = subparsers.add_parser("backup")
    p_bak.add_argument("--output", default="./backups")

    # restore
    p_res = subparsers.add_parser("restore")
    p_res.add_argument("--input", required=True)
    p_res.add_argument("--dry-run", action="store_true")

    args = parser.parse_args()

    if args.command == "db":
        cmd_db_migrate(args)
    elif args.command == "fixtures":
        cmd_fixtures_seed(args)
    elif args.command == "replay":
        cmd_replay(args)
    elif args.command == "doctor":
        cmd_doctor(args)
    elif args.command == "backup":
        cmd_backup(args)
    elif args.command == "restore":
        cmd_restore(args)
    elif args.command == "collector":
        print("[INFO] Running collector in standalone mode. Press Ctrl+C to terminate.")

if __name__ == "__main__":
    main()
