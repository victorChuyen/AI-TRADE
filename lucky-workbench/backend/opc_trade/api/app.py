"""
OPC Trade Lab V1 - REST API Application
Owner: Victor Chuyền · OPC AI REVENUE LAB
Version: 1.0 (2026-09-24)
"""
from __future__ import annotations

import os
import json
from decimal import Decimal
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from ..storage.db import Database
from ..engine.strategy import StrategyConfig, evaluate_complete_set
from ..replay.runner import ReplayRunner
from ..risk.manager import RiskLimits
from ..adapters.synthetic import generate_standard_synthetic_dataset
from ..adapters.polymarket import PolymarketAdapter
from ..adapters.binance import BinanceReferenceAdapter
from ..reports.export_csv import export_executions_to_csv, export_nav_timeline_to_csv

class ApiHandler:
    """
    Standard library & framework agnostic API router.
    Works natively with standard Python HTTP server and can be mounted inside FastAPI / Express gateway.
    """
    def __init__(self, db_path: Optional[str] = None):
        path = db_path or os.getenv("DATABASE_URL", "opc_trade.sqlite").replace("sqlite:////", "/").replace("sqlite:///", "")
        self.db = Database(path)
        self.poly_adapter = PolymarketAdapter()
        self.binance_adapter = BinanceReferenceAdapter()

    def get_healthz(self) -> Dict[str, Any]:
        return {
            "status": "healthy",
            "service": "opc-trade-lab",
            "version": "1.0.0",
            "timestamp_utc": datetime.now(timezone.utc).isoformat()
        }

    def get_readyz(self) -> Dict[str, Any]:
        try:
            with self.db.get_connection() as conn:
                conn.execute("SELECT 1;").fetchone()
            return {"ready": True, "db_status": "connected"}
        except Exception as e:
            return {"ready": False, "db_status": "disconnected", "error": str(e)}

    def get_me(self) -> Dict[str, Any]:
        return {
            "user_id": "usr-victor-chuyen",
            "email": "sieuthibaohiemonline.com@gmail.com",
            "tenant_id": "pilot-owner",
            "role": "OWNER",
            "entitlements": ["LAB_VIEW", "RUN_REPLAY", "COLLECTOR_CONTROL", "RISK_ADMIN", "EXPORT_EVIDENCE"],
            "live_execution_unlocked": False # Safety gate strictly false in V1
        }

    async def get_feeds_health(self) -> Dict[str, Any]:
        poly_h = await self.poly_adapter.health()
        binance_h = await self.binance_adapter.health()
        return {
            "timestamp_utc": datetime.now(timezone.utc).isoformat(),
            "polymarket": {
                "venue": poly_h.venue,
                "connected": poly_h.connected,
                "latency_ms": poly_h.latency_ms,
                "status_code": poly_h.status_code,
                "error": poly_h.error_message,
                "source_type": poly_h.source_type
            },
            "binance": {
                "venue": binance_h.venue,
                "connected": binance_h.connected,
                "latency_ms": binance_h.latency_ms,
                "status_code": binance_h.status_code,
                "error": binance_h.error_message,
                "source_type": binance_h.source_type
            }
        }

    def list_datasets(self) -> List[Dict[str, Any]]:
        return [
            {
                "dataset_id": "demo-v1",
                "name": "Synthetic Multi-Scenario Benchmark (Gain / Loss / Partials / Stale)",
                "provenance": "SYNTHETIC",
                "snapshots_count": 6,
                "description": "Standard 5-step test fixture covering clean complete-set arbitrage, fee hurdle rejection, partial fill residual, and stale book rejection."
            },
            {
                "dataset_id": "live_session_01",
                "name": "Live Collector Recorded Session",
                "provenance": "RECORDED_LIVE",
                "snapshots_count": 0,
                "description": "Snapshots recorded by the continuous background collector."
            }
        ]

    def run_replay(self, dataset_id: str = "demo-v1", config_override: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        cfg = StrategyConfig()
        if config_override:
            if "target_pair_size" in config_override:
                cfg.target_pair_size = Decimal(str(config_override["target_pair_size"]))
            if "min_edge_threshold_usd" in config_override:
                cfg.min_edge_threshold_usd = Decimal(str(config_override["min_edge_threshold_usd"]))
            if "taker_fee_rate" in config_override:
                cfg.taker_fee_rate = Decimal(str(config_override["taker_fee_rate"]))
            if "cost_buffer_per_pair" in config_override:
                cfg.cost_buffer_per_pair = Decimal(str(config_override["cost_buffer_per_pair"]))

        snaps = generate_standard_synthetic_dataset()
        runner = ReplayRunner(config=cfg, simulated_latency_ms=100)
        report = runner.run(snaps)

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
        self.db.save_run_report(report_dict)
        return report_dict
