"""
OPC Trade Lab V1 - Strategy: BINARY_COMPLETE_SET_OBSERVER_V1
Owner: Victor Chuyền · OPC AI REVENUE LAB
Version: 1.0 (2026-09-24)
"""
from __future__ import annotations

import hashlib
import json
from decimal import Decimal
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from ..core import (
    CanonicalSnapshot,
    FeeModelStatus,
    MarketState,
    to_d,
    quantize_money,
    quantize_price,
    d_str,
)
from .depth_sweep import sweep_book, SweepResult

class RejectionReason(str):
    FEE_MODEL_UNKNOWN = "FEE_MODEL_UNKNOWN"
    MARKET_NOT_OPEN = "MARKET_NOT_OPEN"
    BOOK_CROSSED = "BOOK_CROSSED"
    INSUFFICIENT_DEPTH = "INSUFFICIENT_DEPTH"
    LIMIT_EXCEEDED = "LIMIT_EXCEEDED"
    EDGE_BELOW_THRESHOLD = "EDGE_BELOW_THRESHOLD"
    STALE_DATA = "STALE_DATA"
    SEQUENCE_DESYNC = "SEQUENCE_DESYNC"

@dataclass
class StrategyConfig:
    strategy_id: str = "BINARY_COMPLETE_SET_OBSERVER_V1"
    version: str = "1.0.0"
    target_pair_size: Decimal = Decimal("10.0")
    min_edge_threshold_usd: Decimal = Decimal("0.0150") # minimum $0.015 per pair
    taker_fee_rate: Decimal = Decimal("0.0020")         # 0.20% assumed taker fee
    cost_buffer_per_pair: Decimal = Decimal("0.0020")   # $0.002 slippage/gas cushion
    max_price_a: Decimal = Decimal("0.8500")
    max_price_b: Decimal = Decimal("0.8500")
    max_staleness_ms: int = 5000                        # 5 seconds max lag
    allow_assumed_fees: bool = True                     # Allowed in synthetic / research mode

    def config_hash(self) -> str:
        payload = {
            "strategy_id": self.strategy_id,
            "version": self.version,
            "target_pair_size": d_str(self.target_pair_size),
            "min_edge_threshold_usd": d_str(self.min_edge_threshold_usd),
            "taker_fee_rate": d_str(self.taker_fee_rate),
            "cost_buffer_per_pair": d_str(self.cost_buffer_per_pair),
            "max_price_a": d_str(self.max_price_a),
            "max_price_b": d_str(self.max_price_b),
            "max_staleness_ms": self.max_staleness_ms,
            "allow_assumed_fees": self.allow_assumed_fees,
        }
        raw = json.dumps(payload, sort_keys=True)
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]

@dataclass
class StrategySignal:
    signal_id: str
    condition_id: str
    market_slug: str
    event_id: str
    config_hash: str
    rules_hash: str
    timestamp_utc: str
    provenance: str
    is_valid: bool
    rejection_reasons: List[str]
    requested_pairs: Decimal
    gross_pair_cost: Decimal
    sweep_a: SweepResult
    sweep_b: SweepResult
    estimated_fees: Decimal
    cost_buffer_total: Decimal
    estimated_net_profit: Decimal
    edge_per_pair: Decimal
    payout_per_pair: Decimal = Decimal("1.0000")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "signal_id": self.signal_id,
            "condition_id": self.condition_id,
            "market_slug": self.market_slug,
            "event_id": self.event_id,
            "config_hash": self.config_hash,
            "rules_hash": self.rules_hash,
            "timestamp_utc": self.timestamp_utc,
            "provenance": self.provenance,
            "is_valid": self.is_valid,
            "rejection_reasons": self.rejection_reasons,
            "requested_pairs": d_str(self.requested_pairs),
            "gross_pair_cost": d_str(self.gross_pair_cost),
            "sweep_a": {
                "filled": d_str(self.sweep_a.filled_size),
                "cost": d_str(self.sweep_a.total_cost),
                "avg_price": d_str(self.sweep_a.average_price),
                "marginal_price": d_str(self.sweep_a.marginal_price),
            },
            "sweep_b": {
                "filled": d_str(self.sweep_b.filled_size),
                "cost": d_str(self.sweep_b.total_cost),
                "avg_price": d_str(self.sweep_b.average_price),
                "marginal_price": d_str(self.sweep_b.marginal_price),
            },
            "estimated_fees": d_str(self.estimated_fees),
            "cost_buffer_total": d_str(self.cost_buffer_total),
            "estimated_net_profit": d_str(self.estimated_net_profit),
            "edge_per_pair": d_str(self.edge_per_pair),
            "payout_per_pair": d_str(self.payout_per_pair),
        }

def evaluate_complete_set(
    snapshot: CanonicalSnapshot,
    config: StrategyConfig,
    now_ms: Optional[int] = None
) -> StrategySignal:
    """
    Evaluates BINARY_COMPLETE_SET_OBSERVER_V1.
    Strictly checks:
    - Same condition, open market
    - Non-crossed books
    - Depth for target_pair_size on asks_A and asks_B
    - Fee verification
    - Threshold edge
    """
    rejections: List[str] = []
    q = config.target_pair_size

    # Check market state
    if snapshot.market_state != MarketState.OPEN:
        rejections.append(RejectionReason.MARKET_NOT_OPEN)

    # Check fee status
    if snapshot.fee_model_status == FeeModelStatus.UNKNOWN and not config.allow_assumed_fees:
        rejections.append(RejectionReason.FEE_MODEL_UNKNOWN)

    # Check book sanity (crossed books)
    if snapshot.book_a.is_crossed() or snapshot.book_b.is_crossed():
        rejections.append(RejectionReason.BOOK_CROSSED)

    # Check sequence status
    if snapshot.sequence_status != "SYNCED":
        rejections.append(RejectionReason.SEQUENCE_DESYNC)

    # Check staleness if now_ms provided
    if now_ms is not None:
        age_a = now_ms - snapshot.book_a.source_timestamp_ms
        age_b = now_ms - snapshot.book_b.source_timestamp_ms
        if age_a > config.max_staleness_ms or age_b > config.max_staleness_ms:
            rejections.append(RejectionReason.STALE_DATA)

    # Perform depth sweeps
    sweep_a = sweep_book(snapshot.book_a.asks, q, config.max_price_a)
    sweep_b = sweep_book(snapshot.book_b.asks, q, config.max_price_b)

    if not sweep_a.is_complete or not sweep_b.is_complete:
        rejections.append(RejectionReason.INSUFFICIENT_DEPTH)

    gross_pair_cost = quantize_money(sweep_a.total_cost + sweep_b.total_cost)

    # Calculate fees and buffer
    fee_rate = config.taker_fee_rate
    fee_a = quantize_money(sweep_a.total_cost * fee_rate)
    fee_b = quantize_money(sweep_b.total_cost * fee_rate)
    total_fees = fee_a + fee_b

    cost_buffer = quantize_money(q * config.cost_buffer_per_pair)

    # Payout is 1.00 USD per complete set pair (YES + NO = 1.00 collateral payout)
    payout = quantize_money(q * Decimal("1.0000"))
    net_profit = quantize_money(payout - gross_pair_cost - total_fees - cost_buffer)
    edge_per_pair = quantize_money(net_profit / q) if q > Decimal("0") else Decimal("0")

    if edge_per_pair < config.min_edge_threshold_usd:
        rejections.append(RejectionReason.EDGE_BELOW_THRESHOLD)

    signal_id = f"sig_{snapshot.event_id}_{config.config_hash()}"

    return StrategySignal(
        signal_id=signal_id,
        condition_id=snapshot.condition_id,
        market_slug=snapshot.market_slug,
        event_id=snapshot.event_id,
        config_hash=config.config_hash(),
        rules_hash=snapshot.rules_hash,
        timestamp_utc=snapshot.received_at_utc,
        provenance=snapshot.provenance.value,
        is_valid=(len(rejections) == 0),
        rejection_reasons=rejections,
        requested_pairs=q,
        gross_pair_cost=gross_pair_cost,
        sweep_a=sweep_a,
        sweep_b=sweep_b,
        estimated_fees=total_fees,
        cost_buffer_total=cost_buffer,
        estimated_net_profit=net_profit,
        edge_per_pair=edge_per_pair,
        payout_per_pair=Decimal("1.0000"),
    )
