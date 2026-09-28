"""
OPC Trade Lab V1 - Core Domain Types and Decimal Utilities
Owner: Victor Chuyền · OPC AI REVENUE LAB
Version: 1.0 (2026-09-24)
"""
from __future__ import annotations

import decimal
from decimal import Decimal, ROUND_HALF_UP, ROUND_DOWN
import enum
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone

# Enforce strict decimal context
PRECISION = 8
decimal.getcontext().prec = 28

def to_d(val: Any) -> Decimal:
    """Safely convert any numeric/string to Decimal."""
    if isinstance(val, Decimal):
        return val
    if val is None or val == "":
        return Decimal("0")
    return Decimal(str(val))

def quantize_price(d: Decimal) -> Decimal:
    """Format price to 4 decimal places."""
    return d.quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)

def quantize_shares(d: Decimal) -> Decimal:
    """Format shares to 2 decimal places."""
    return d.quantize(Decimal("0.01"), rounding=ROUND_DOWN)

def quantize_money(d: Decimal) -> Decimal:
    """Format money (USD/Collateral) to 4 decimal places."""
    return d.quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)

def d_str(d: Decimal) -> str:
    """Serialize decimal to string without scientific notation."""
    return format(d, "f")

class Provenance(str, enum.Enum):
    SYNTHETIC = "SYNTHETIC"
    RECORDED_LIVE = "RECORDED_LIVE"
    LIVE_READONLY = "LIVE_READONLY"

class MarketState(str, enum.Enum):
    OPEN = "OPEN"
    PAUSED = "PAUSED"
    CLOSED = "CLOSED"
    RESOLVED = "RESOLVED"

class FeeModelStatus(str, enum.Enum):
    VERIFIED_ZERO = "VERIFIED_ZERO"
    ASSUMED = "ASSUMED"
    TAKER_TIER = "TAKER_TIER"
    UNKNOWN = "UNKNOWN"

class OrderState(str, enum.Enum):
    CREATED = "CREATED"
    VALIDATED = "VALIDATED"
    QUEUED = "QUEUED"
    SUBMITTED_SIM = "SUBMITTED_SIM"
    PARTIALLY_FILLED = "PARTIALLY_FILLED"
    FILLED = "FILLED"
    REJECTED = "REJECTED"
    EXPIRED = "EXPIRED"
    CANCELLED = "CANCELLED"

class Side(str, enum.Enum):
    BUY = "BUY"
    SELL = "SELL"

@dataclass
class PriceLevel:
    price: Decimal
    size: Decimal

    def to_dict(self) -> Dict[str, str]:
        return {"price": d_str(self.price), "size": d_str(self.size)}

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> PriceLevel:
        return cls(price=to_d(data["price"]), size=to_d(data["size"]))

@dataclass
class OrderBookSide:
    token_id: str
    source_timestamp_ms: int
    bids: List[PriceLevel] = field(default_factory=list) # sorted desc
    asks: List[PriceLevel] = field(default_factory=list) # sorted asc

    def best_bid(self) -> Optional[PriceLevel]:
        return self.bids[0] if self.bids else None

    def best_ask(self) -> Optional[PriceLevel]:
        return self.asks[0] if self.asks else None

    def validate_and_sort(self) -> None:
        """Filter out zero/negative values and enforce order: bids desc, asks asc."""
        self.bids = [p for p in self.bids if p.price > 0 and p.size > 0]
        self.asks = [p for p in self.asks if p.price > 0 and p.size > 0]
        self.bids.sort(key=lambda x: x.price, reverse=True)
        self.asks.sort(key=lambda x: x.price, reverse=False)

    def is_crossed(self) -> bool:
        if self.bids and self.asks:
            return self.bids[0].price >= self.asks[0].price
        return False

@dataclass
class CanonicalSnapshot:
    schema_version: int
    event_id: str
    dataset_id: str
    provenance: Provenance
    venue: str
    condition_id: str
    market_slug: str
    rules_hash: str
    received_at_utc: str
    received_monotonic_ns: int
    collector_boot_id: str
    book_a: OrderBookSide
    book_b: OrderBookSide
    fee_model_status: FeeModelStatus
    market_state: MarketState
    sequence_status: str = "SYNCED"
    btc_ref_price: Optional[Decimal] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "schema_version": self.schema_version,
            "event_id": self.event_id,
            "dataset_id": self.dataset_id,
            "provenance": self.provenance.value,
            "venue": self.venue,
            "condition_id": self.condition_id,
            "market_slug": self.market_slug,
            "rules_hash": self.rules_hash,
            "received_at_utc": self.received_at_utc,
            "received_monotonic_ns": self.received_monotonic_ns,
            "collector_boot_id": self.collector_boot_id,
            "book_a": {
                "token_id": self.book_a.token_id,
                "source_timestamp_ms": self.book_a.source_timestamp_ms,
                "bids": [l.to_dict() for l in self.book_a.bids],
                "asks": [l.to_dict() for l in self.book_a.asks],
            },
            "book_b": {
                "token_id": self.book_b.token_id,
                "source_timestamp_ms": self.book_b.source_timestamp_ms,
                "bids": [l.to_dict() for l in self.book_b.bids],
                "asks": [l.to_dict() for l in self.book_b.asks],
            },
            "fee_model_status": self.fee_model_status.value,
            "market_state": self.market_state.value,
            "sequence_status": self.sequence_status,
            "btc_ref_price": d_str(self.btc_ref_price) if self.btc_ref_price is not None else None,
        }
