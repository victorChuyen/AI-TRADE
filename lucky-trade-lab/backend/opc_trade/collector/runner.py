"""
OPC Trade Lab V1 - Collector Runner
Owner: Victor Chuyền · OPC AI REVENUE LAB
Version: 1.0 (2026-09-24)
"""
from __future__ import annotations

import asyncio
import uuid
import json
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from decimal import Decimal

from ..core import CanonicalSnapshot, Provenance, MarketState, FeeModelStatus
from ..adapters.polymarket import PolymarketAdapter
from ..adapters.binance import BinanceReferenceAdapter
from ..storage.db import Database

logger = logging.getLogger("opc_trade.collector")

class CollectorService:
    def __init__(
        self,
        db: Database,
        max_markets: int = 5,
        poll_interval_seconds: float = 5.0,
        dataset_id: str = "live_session_01"
    ):
        self.db = db
        self.max_markets = max_markets
        self.poll_interval = poll_interval_seconds
        self.dataset_id = dataset_id
        self.watchlist: List[Dict[str, Any]] = []
        self.is_running = False
        self._task: Optional[asyncio.Task] = None
        self.poly_adapter = PolymarketAdapter()
        self.binance_adapter = BinanceReferenceAdapter()
        self.boot_id = f"boot_{uuid.uuid4().hex[:8]}"
        self.total_collected_events = 0
        self.last_poll_utc: Optional[str] = None
        self.last_error: Optional[str] = None

    def add_to_watchlist(self, condition_id: str, slug: str, question: str, token_a: str, token_b: str) -> bool:
        if len(self.watchlist) >= self.max_markets:
            return False
        # Avoid duplicate
        for m in self.watchlist:
            if m["condition_id"] == condition_id:
                return True
        self.watchlist.append({
            "condition_id": condition_id,
            "slug": slug,
            "question": question,
            "token_a": token_a,
            "token_b": token_b
        })
        return True

    def remove_from_watchlist(self, condition_id: str) -> None:
        self.watchlist = [m for m in self.watchlist if m["condition_id"] != condition_id]

    async def start(self) -> None:
        if self.is_running:
            return
        self.is_running = True
        self._task = asyncio.create_task(self._run_loop())
        logger.info("Collector service started with boot_id: %s", self.boot_id)

    async def stop(self) -> None:
        self.is_running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("Collector service stopped.")

    async def _poll_once(self) -> None:
        btc_price = await self.binance_adapter.fetch_btc_price()
        now_utc = datetime.now(timezone.utc).isoformat()
        self.last_poll_utc = now_utc

        for item in list(self.watchlist):
            cond_id = item["condition_id"]
            try:
                book_a = await self.poly_adapter.fetch_book_side(item["token_a"])
                book_b = await self.poly_adapter.fetch_book_side(item["token_b"])

                snap = CanonicalSnapshot(
                    schema_version=1,
                    event_id=f"evt_{uuid.uuid4().hex[:10]}",
                    dataset_id=self.dataset_id,
                    provenance=Provenance.LIVE_READONLY,
                    venue="polymarket",
                    condition_id=cond_id,
                    market_slug=item["slug"],
                    rules_hash=f"hash_{cond_id[:8]}",
                    received_at_utc=now_utc,
                    received_monotonic_ns=0,
                    collector_boot_id=self.boot_id,
                    book_a=book_a,
                    book_b=book_b,
                    fee_model_status=FeeModelStatus.UNKNOWN, # Live feed: fees unknown unless verified
                    market_state=MarketState.OPEN,
                    sequence_status="SYNCED",
                    btc_ref_price=btc_price
                )

                # Persist to database
                payload = json.dumps(snap.to_dict())
                with self.db.get_connection() as conn:
                    conn.execute(
                        """INSERT OR IGNORE INTO snapshots
                        (event_id, dataset_id, provenance, condition_id, received_at_utc, received_monotonic_ns, payload_json)
                        VALUES (?, ?, ?, ?, ?, ?, ?)""",
                        (snap.event_id, snap.dataset_id, snap.provenance.value, snap.condition_id, snap.received_at_utc, snap.received_monotonic_ns, payload)
                    )
                    conn.commit()

                self.total_collected_events += 1
            except Exception as e:
                self.last_error = f"Poll error for {cond_id}: {str(e)}"
                logger.warning(self.last_error)

    async def _run_loop(self) -> None:
        while self.is_running:
            await self._poll_once()
            await asyncio.sleep(self.poll_interval)
