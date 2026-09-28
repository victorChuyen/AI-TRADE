"""
OPC Trade Lab V1 - Market Data Adapter Protocol
Owner: Victor Chuyền · OPC AI REVENUE LAB
Version: 1.0 (2026-09-24)
"""
from __future__ import annotations

from typing import Protocol, List, Optional, Dict, Any, AsyncIterator
from dataclasses import dataclass
from decimal import Decimal
from ..core import CanonicalSnapshot

@dataclass
class MarketQuery:
    query: str
    limit: int = 10
    active_only: bool = True

@dataclass
class MarketOutcome:
    token_id: str
    name: str

@dataclass
class Market:
    condition_id: str
    venue: str
    slug: str
    question: str
    outcomes: List[MarketOutcome]
    rules_hash: str
    is_open: bool

@dataclass
class FeedHealth:
    venue: str
    connected: bool
    last_event_time_utc: Optional[str]
    latency_ms: Optional[int]
    status_code: Optional[int]
    error_message: Optional[str]
    source_type: str # "LIVE_REST", "LIVE_WS", "SYNTHETIC"

@dataclass
class RawEvent:
    event_id: str
    venue: str
    received_at_utc: str
    payload: Dict[str, Any]

class MarketDataAdapter(Protocol):
    async def discover(self, query: MarketQuery) -> List[Market]:
        ...

    async def snapshot(self, market: Market) -> CanonicalSnapshot:
        ...

    async def stream(self, markets: List[Market]) -> AsyncIterator[RawEvent]:
        ...

    async def health(self) -> FeedHealth:
        ...
