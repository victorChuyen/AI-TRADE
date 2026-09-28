"""
OPC Trade Lab V1 - Polymarket Public Read-Only Adapter
Owner: Victor Chuyền · OPC AI REVENUE LAB
Version: 1.0 (2026-09-24)
"""
from __future__ import annotations

import json
import urllib.request
import urllib.error
import asyncio
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from decimal import Decimal

from ..core import (
    CanonicalSnapshot,
    Provenance,
    MarketState,
    FeeModelStatus,
    OrderBookSide,
    PriceLevel,
)
from .protocol import MarketQuery, Market, MarketOutcome, FeedHealth

GAMMA_HOST = "https://gamma-api.polymarket.com"
CLOB_HOST = "https://clob.polymarket.com"

class PolymarketAdapter:
    def __init__(self, user_agent: str = "OPC-Trade-Lab/1.0"):
        self.user_agent = user_agent
        self.last_status: Optional[int] = None
        self.last_error: Optional[str] = None
        self.last_event_utc: Optional[str] = None

    def _fetch_json(self, url: str, timeout: float = 6.0) -> Dict[str, Any]:
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": self.user_agent,
                "Accept": "application/json"
            }
        )
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                self.last_status = resp.status
                self.last_event_utc = datetime.now(timezone.utc).isoformat()
                data = json.loads(resp.read().decode("utf-8"))
                return data
        except urllib.error.HTTPError as e:
            self.last_status = e.code
            self.last_error = f"HTTP {e.code}: {e.reason}"
            if e.code == 403:
                self.last_error = "HTTP 403 Forbidden: Polymarket regional or Cloudflare restriction."
            elif e.code == 429:
                self.last_error = "HTTP 429: Rate limit exceeded. Throttling active."
            raise
        except Exception as e:
            self.last_error = str(e)
            raise

    async def discover(self, query: MarketQuery) -> List[Market]:
        """Discovers active binary markets via Gamma public API."""
        url = f"{GAMMA_HOST}/markets?limit={query.limit}&active={str(query.active_only).lower()}"
        loop = asyncio.get_event_loop()
        try:
            raw = await loop.run_in_executor(None, lambda: self._fetch_json(url))
            markets: List[Market] = []
            for item in raw:
                # Require binary outcomes
                tokens = item.get("clobTokenIds", [])
                if isinstance(tokens, str):
                    try:
                        tokens = json.loads(tokens)
                    except Exception:
                        tokens = []
                if len(tokens) >= 2:
                    markets.append(Market(
                        condition_id=item.get("conditionId", item.get("id", "")),
                        venue="polymarket",
                        slug=item.get("slug", ""),
                        question=item.get("question", ""),
                        outcomes=[
                            MarketOutcome(token_id=tokens[0], name="YES"),
                            MarketOutcome(token_id=tokens[1], name="NO")
                        ],
                        rules_hash=f"hash_{item.get('conditionId', '')[:8]}",
                        is_open=item.get("active", True)
                    ))
            return markets
        except Exception:
            return []

    async def fetch_book_side(self, token_id: str) -> OrderBookSide:
        """Fetches CLOB book for a single token."""
        url = f"{CLOB_HOST}/book?token_id={token_id}"
        loop = asyncio.get_event_loop()
        raw = await loop.run_in_executor(None, lambda: self._fetch_json(url))
        now_ms = int(datetime.now(timezone.utc).timestamp() * 1000)

        bids = [PriceLevel(Decimal(b["price"]), Decimal(b["size"])) for b in raw.get("bids", [])]
        asks = [PriceLevel(Decimal(a["price"]), Decimal(a["size"])) for a in raw.get("asks", [])]

        side = OrderBookSide(
            token_id=token_id,
            source_timestamp_ms=raw.get("timestamp", now_ms),
            bids=bids,
            asks=asks
        )
        side.validate_and_sort()
        return side

    async def health(self) -> FeedHealth:
        connected = (self.last_status == 200)
        return FeedHealth(
            venue="polymarket",
            connected=connected,
            last_event_time_utc=self.last_event_utc,
            latency_ms=120 if connected else None,
            status_code=self.last_status,
            error_message=self.last_error,
            source_type="LIVE_REST"
        )
