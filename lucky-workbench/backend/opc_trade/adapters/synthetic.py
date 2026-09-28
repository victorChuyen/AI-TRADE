"""
OPC Trade Lab V1 - Synthetic Adapter & Scenario Fixtures
Owner: Victor Chuyền · OPC AI REVENUE LAB
Version: 1.0 (2026-09-24)
"""
from __future__ import annotations

import uuid
from decimal import Decimal
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone, timedelta
from ..core import (
    CanonicalSnapshot,
    Provenance,
    MarketState,
    FeeModelStatus,
    OrderBookSide,
    PriceLevel,
)

def create_synthetic_snapshot(
    scenario_id: str,
    condition_id: str = "0xcond_syn_btc_100k",
    market_slug: str = "btc-above-100k-end-of-month",
    rules_hash: str = "sha256_fixture_rules_v1",
    timestamp_utc: Optional[str] = None,
    ask_a_price: str = "0.4600",
    ask_a_size: str = "20.0",
    bid_a_price: str = "0.4400",
    bid_a_size: str = "20.0",
    ask_b_price: str = "0.4900",
    ask_b_size: str = "20.0",
    bid_b_price: str = "0.4700",
    bid_b_size: str = "20.0",
    market_state: MarketState = MarketState.OPEN,
    fee_model_status: FeeModelStatus = FeeModelStatus.ASSUMED,
    age_ms: int = 100,
    is_crossed: bool = False,
    btc_price: str = "64250.00"
) -> CanonicalSnapshot:
    now = datetime.now(timezone.utc)
    if timestamp_utc is None:
        timestamp_utc = now.isoformat()

    now_ms = int(now.timestamp() * 1000)
    source_ms = now_ms - age_ms

    book_a = OrderBookSide(
        token_id="tok_yes_1",
        source_timestamp_ms=source_ms,
        bids=[PriceLevel(Decimal(bid_a_price), Decimal(bid_a_size))],
        asks=[PriceLevel(Decimal(ask_a_price), Decimal(ask_a_size))]
    )
    book_b = OrderBookSide(
        token_id="tok_no_1",
        source_timestamp_ms=source_ms,
        bids=[PriceLevel(Decimal(bid_b_price), Decimal(bid_b_size))],
        asks=[PriceLevel(Decimal(ask_b_price), Decimal(ask_b_size))]
    )

    if is_crossed:
        # Cross the book intentionally (bid >= ask)
        book_a.bids = [PriceLevel(Decimal("0.5500"), Decimal("10.0"))]
        book_a.asks = [PriceLevel(Decimal("0.5000"), Decimal("10.0"))]

    book_a.validate_and_sort()
    book_b.validate_and_sort()

    return CanonicalSnapshot(
        schema_version=1,
        event_id=f"evt_{scenario_id}_{uuid.uuid4().hex[:6]}",
        dataset_id="demo-v1",
        provenance=Provenance.SYNTHETIC,
        venue="polymarket",
        condition_id=condition_id,
        market_slug=market_slug,
        rules_hash=rules_hash,
        received_at_utc=timestamp_utc,
        received_monotonic_ns=1000000000,
        collector_boot_id="boot_synth_01",
        book_a=book_a,
        book_b=book_b,
        fee_model_status=fee_model_status,
        market_state=market_state,
        sequence_status="SYNCED",
        btc_ref_price=Decimal(btc_price)
    )

def generate_standard_synthetic_dataset() -> List[CanonicalSnapshot]:
    """
    Generates a 5-step synthetic dataset with comprehensive behaviors:
    1. Clean complete set opportunity (gross cost 0.95 -> net positive)
    2. Next tick: order fill execution snapshot
    3. Fee hurdle rejection: prices 0.495 + 0.495 -> edge too thin
    4. Partial fill scenario: Leg A has 5 shares, Leg B has 20 shares
    5. Stale book scenario: age_ms = 8000ms -> STALE_DATA rejection
    """
    base_time = datetime(2026, 9, 24, 12, 0, 0, tzinfo=timezone.utc)
    snaps: List[CanonicalSnapshot] = []

    # Step 1: Clean arb opportunity (Signal detected)
    t1 = base_time.isoformat()
    snaps.append(create_synthetic_snapshot(
        scenario_id="clean_gain_signal",
        timestamp_utc=t1,
        ask_a_price="0.4600",
        ask_a_size="15.0",
        ask_b_price="0.4900",
        ask_b_size="15.0",
        age_ms=80
    ))

    # Step 2: Next tick (Execution simulated against this book)
    t2 = (base_time + timedelta(milliseconds=200)).isoformat()
    snaps.append(create_synthetic_snapshot(
        scenario_id="clean_gain_fill",
        timestamp_utc=t2,
        ask_a_price="0.4620",
        ask_a_size="15.0",
        ask_b_price="0.4910",
        ask_b_size="15.0",
        age_ms=90
    ))

    # Step 3: Fee hurdle rejection
    t3 = (base_time + timedelta(seconds=2)).isoformat()
    snaps.append(create_synthetic_snapshot(
        scenario_id="fee_hurdle_rejected",
        timestamp_utc=t3,
        ask_a_price="0.4950",
        ask_a_size="25.0",
        ask_b_price="0.4950",
        ask_b_size="25.0",
        age_ms=100
    ))

    # Step 4: Opportunity with good signal depth
    t4 = (base_time + timedelta(seconds=4)).isoformat()
    snaps.append(create_synthetic_snapshot(
        scenario_id="partial_fill_signal",
        condition_id="0xcond_eth_etf",
        market_slug="eth-etf-approved",
        timestamp_utc=t4,
        ask_a_price="0.4500",
        ask_a_size="15.0", # Sufficient at signal time
        bid_a_price="0.4300",
        bid_a_size="15.0",
        ask_b_price="0.4800",
        ask_b_size="15.0",
        bid_b_price="0.4600",
        bid_b_size="15.0",
        age_ms=80
    ))

    # Step 5: At fill time (t + 250ms), another market participant took 10 shares, leaving only 5 shares for Leg A!
    t5 = (base_time + timedelta(seconds=4, milliseconds=250)).isoformat()
    snaps.append(create_synthetic_snapshot(
        scenario_id="partial_fill_execution",
        condition_id="0xcond_eth_etf",
        market_slug="eth-etf-approved",
        timestamp_utc=t5,
        ask_a_price="0.4500",
        ask_a_size="5.0", # Liquidity evaporated to 5 shares!
        bid_a_price="0.4300",
        bid_a_size="15.0",
        ask_b_price="0.4800",
        ask_b_size="15.0",
        bid_b_price="0.4600",
        bid_b_size="15.0",
        age_ms=90
    ))

    # Step 6: Stale data rejection
    t6 = (base_time + timedelta(seconds=10)).isoformat()
    snaps.append(create_synthetic_snapshot(
        scenario_id="stale_data_rejection",
        timestamp_utc=t6,
        ask_a_price="0.4400",
        ask_a_size="20.0",
        ask_b_price="0.4700",
        ask_b_size="20.0",
        age_ms=9500 # 9.5s stale!
    ))

    return snaps
