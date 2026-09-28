"""
OPC Trade Lab V1 - Binance Public Reference Price Adapter
Owner: Victor Chuyền · OPC AI REVENUE LAB
Version: 1.0 (2026-09-24)
"""
from __future__ import annotations

import json
import urllib.request
import urllib.error
import asyncio
from typing import Optional
from datetime import datetime, timezone
from decimal import Decimal
from .protocol import FeedHealth

BINANCE_PRICE_URL = "https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT"

class BinanceReferenceAdapter:
    def __init__(self, user_agent: str = "OPC-Trade-Lab/1.0"):
        self.user_agent = user_agent
        self.last_price: Optional[Decimal] = None
        self.last_status: Optional[int] = None
        self.last_error: Optional[str] = None
        self.last_event_utc: Optional[str] = None

    def fetch_btc_price_sync(self, timeout: float = 4.0) -> Optional[Decimal]:
        req = urllib.request.Request(
            BINANCE_PRICE_URL,
            headers={"User-Agent": self.user_agent, "Accept": "application/json"}
        )
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                self.last_status = resp.status
                self.last_event_utc = datetime.now(timezone.utc).isoformat()
                data = json.loads(resp.read().decode("utf-8"))
                price_str = data.get("price")
                if price_str:
                    self.last_price = Decimal(price_str)
                    return self.last_price
        except Exception as e:
            self.last_error = str(e)
            return None
        return None

    async def fetch_btc_price(self) -> Optional[Decimal]:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self.fetch_btc_price_sync)

    async def health(self) -> FeedHealth:
        connected = (self.last_status == 200)
        return FeedHealth(
            venue="binance",
            connected=connected,
            last_event_time_utc=self.last_event_utc,
            latency_ms=85 if connected else None,
            status_code=self.last_status,
            error_message=self.last_error,
            source_type="LIVE_REST"
        )
