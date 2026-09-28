"""
OPC Trade Lab V1 - Deterministic Replay & Paper Execution Engine
Owner: Victor Chuyền · OPC AI REVENUE LAB
Version: 1.0 (2026-09-24)
"""
from __future__ import annotations

from decimal import Decimal
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
import uuid
from datetime import datetime, timezone

from ..core import (
    CanonicalSnapshot,
    OrderState,
    Side,
    to_d,
    quantize_money,
    quantize_shares,
    d_str,
)
from ..engine.strategy import StrategyConfig, evaluate_complete_set, StrategySignal
from ..engine.depth_sweep import sweep_book
from ..accounting.decimal_ledger import AccountingState
from ..risk.manager import RiskManager, RiskLimits

@dataclass
class PaperLegExecution:
    token_id: str
    outcome_name: str
    target_shares: Decimal
    filled_shares: Decimal
    cost: Decimal
    fee: Decimal
    average_price: Decimal
    status: OrderState

@dataclass
class PaperTradeExecution:
    order_id: str
    signal_id: str
    condition_id: str
    market_slug: str
    submission_time_utc: str
    execution_time_utc: str
    requested_pairs: Decimal
    state: OrderState
    leg_a: PaperLegExecution
    leg_b: PaperLegExecution
    total_cost: Decimal
    total_fees: Decimal
    rejection_or_cancellation_reason: Optional[str] = None
    paired_shares: Decimal = Decimal("0.00")
    unpaired_residual_shares: Decimal = Decimal("0.00")

@dataclass
class ReplayReport:
    run_id: str
    dataset_id: str
    strategy_config_hash: str
    start_utc: str
    end_utc: str
    total_snapshots: int
    signals_generated: int
    valid_signals: int
    orders_submitted: int
    orders_filled_completely: int
    orders_partially_filled: int
    orders_rejected_or_expired: int
    initial_cash: Decimal
    final_available_cash: Decimal
    total_fees_paid: Decimal
    realized_pnl: Decimal
    unrealized_pnl: Decimal
    final_nav: Decimal
    max_drawdown_pct: Decimal
    open_inventory_lots: int
    executions: List[Dict[str, Any]]
    nav_timeline: List[Dict[str, str]]

class ReplayRunner:
    def __init__(
        self,
        config: StrategyConfig,
        risk_limits: Optional[RiskLimits] = None,
        starting_cash: Decimal = Decimal("1000.0000"),
        simulated_latency_ms: int = 150,
        run_id: Optional[str] = None,
        tenant_id: str = "pilot-owner"
    ):
        self.config = config
        self.run_id = run_id or f"run_{uuid.uuid4().hex[:10]}"
        self.tenant_id = tenant_id
        self.accounting = AccountingState.initialize(self.run_id, self.tenant_id, starting_cash)
        self.risk = RiskManager(risk_limits)
        self.simulated_latency_ms = simulated_latency_ms
        self.executions: List[PaperTradeExecution] = []
        self.nav_timeline: List[Dict[str, str]] = []

    def run(self, snapshots: List[CanonicalSnapshot]) -> ReplayReport:
        if not snapshots:
            raise ValueError("ReplayRunner requires at least one CanonicalSnapshot.")

        # Provenance check: must be single provenance across run
        prov_set = {s.provenance for s in snapshots}
        if len(prov_set) > 1:
            raise ValueError(f"Mixed provenance rejected in single replay run: {prov_set}")

        total_snaps = len(snapshots)
        signals_gen = 0
        valid_signals = 0
        orders_submitted = 0
        completely_filled = 0
        partially_filled = 0
        rejected_or_expired = 0

        # Peak NAV for drawdown calculation
        peak_nav = self.accounting.initial_cash
        max_drawdown = Decimal("0.0000")

        for idx, snap in enumerate(snapshots):
            # 1. Evaluate strategy at current snapshot t
            sig = evaluate_complete_set(snap, self.config)
            signals_gen += 1

            # Current bid marks for mark-to-market
            current_bids = {}
            if snap.book_a.bids:
                current_bids[snap.book_a.token_id] = snap.book_a.bids[0].price
            if snap.book_b.bids:
                current_bids[snap.book_b.token_id] = snap.book_b.bids[0].price

            mark_data = self.accounting.calculate_mark_to_bid(current_bids)
            current_nav = to_d(mark_data["total_nav"])

            # Track peak and drawdown
            if current_nav > peak_nav:
                peak_nav = current_nav
            if peak_nav > Decimal("0"):
                dd = (peak_nav - current_nav) / peak_nav
                if dd > max_drawdown:
                    max_drawdown = dd

            # Record NAV timeline point
            self.nav_timeline.append({
                "timestamp_utc": snap.received_at_utc,
                "nav": d_str(current_nav),
                "available_cash": d_str(self.accounting.available_cash),
                "unrealized_pnl": mark_data["unrealized_pnl"],
                "total_fees": d_str(self.accounting.total_fees_paid),
                "event_id": snap.event_id
            })

            if not sig.is_valid:
                continue

            valid_signals += 1

            # 2. Risk check before creating/reserving order
            risk_res = self.risk.validate_new_order(
                condition_id=snap.condition_id,
                cost_estimate=sig.gross_pair_cost + sig.estimated_fees,
                accounting=self.accounting,
                current_nav=current_nav
            )

            order_id = f"ord_{uuid.uuid4().hex[:8]}"

            if not risk_res.allowed:
                rejected_or_expired += 1
                self.executions.append(PaperTradeExecution(
                    order_id=order_id,
                    signal_id=sig.signal_id,
                    condition_id=snap.condition_id,
                    market_slug=snap.market_slug,
                    submission_time_utc=snap.received_at_utc,
                    execution_time_utc=snap.received_at_utc,
                    requested_pairs=sig.requested_pairs,
                    state=OrderState.REJECTED,
                    leg_a=PaperLegExecution(snap.book_a.token_id, "YES", sig.requested_pairs, Decimal("0"), Decimal("0"), Decimal("0"), Decimal("0"), OrderState.REJECTED),
                    leg_b=PaperLegExecution(snap.book_b.token_id, "NO", sig.requested_pairs, Decimal("0"), Decimal("0"), Decimal("0"), Decimal("0"), OrderState.REJECTED),
                    total_cost=Decimal("0.0000"),
                    total_fees=Decimal("0.0000"),
                    rejection_or_cancellation_reason=risk_res.detail or risk_res.rejection_code
                ))
                continue

            # 3. Reserve cash
            total_reserve = sig.gross_pair_cost + sig.estimated_fees
            reserved = self.accounting.reserve_cash(order_id, total_reserve)
            if not reserved:
                rejected_or_expired += 1
                continue

            orders_submitted += 1

            # 4. Simulated delayed execution:
            # Look ahead strictly according to latency window: find first future snapshot >= t + simulated_latency
            fill_snap = None
            if self.simulated_latency_ms == 0:
                fill_snap = snap
            else:
                for future_idx in range(idx + 1, total_snaps):
                    candidate = snapshots[future_idx]
                    # Compare timestamp if monotonic or parse ISO
                    fill_snap = candidate
                    break

            if fill_snap is None:
                # No future tick available before end of dataset -> order EXPIRED, release cash reservation
                self.accounting.release_reservation(order_id, total_reserve)
                rejected_or_expired += 1
                self.executions.append(PaperTradeExecution(
                    order_id=order_id,
                    signal_id=sig.signal_id,
                    condition_id=snap.condition_id,
                    market_slug=snap.market_slug,
                    submission_time_utc=snap.received_at_utc,
                    execution_time_utc=snap.received_at_utc,
                    requested_pairs=sig.requested_pairs,
                    state=OrderState.EXPIRED,
                    leg_a=PaperLegExecution(snap.book_a.token_id, "YES", sig.requested_pairs, Decimal("0"), Decimal("0"), Decimal("0"), Decimal("0"), OrderState.EXPIRED),
                    leg_b=PaperLegExecution(snap.book_b.token_id, "NO", sig.requested_pairs, Decimal("0"), Decimal("0"), Decimal("0"), Decimal("0"), OrderState.EXPIRED),
                    total_cost=Decimal("0.0000"),
                    total_fees=Decimal("0.0000"),
                    rejection_or_cancellation_reason="NO_FUTURE_TICK_AFTER_LATENCY"
                ))
                continue

            # Check if fill book is crossed or closed
            if fill_snap.market_state != snap.market_state or fill_snap.book_a.is_crossed() or fill_snap.book_b.is_crossed():
                self.accounting.release_reservation(order_id, total_reserve)
                rejected_or_expired += 1
                self.executions.append(PaperTradeExecution(
                    order_id=order_id,
                    signal_id=sig.signal_id,
                    condition_id=snap.condition_id,
                    market_slug=snap.market_slug,
                    submission_time_utc=snap.received_at_utc,
                    execution_time_utc=fill_snap.received_at_utc,
                    requested_pairs=sig.requested_pairs,
                    state=OrderState.CANCELLED,
                    leg_a=PaperLegExecution(snap.book_a.token_id, "YES", sig.requested_pairs, Decimal("0"), Decimal("0"), Decimal("0"), Decimal("0"), OrderState.CANCELLED),
                    leg_b=PaperLegExecution(snap.book_b.token_id, "NO", sig.requested_pairs, Decimal("0"), Decimal("0"), Decimal("0"), Decimal("0"), OrderState.CANCELLED),
                    total_cost=Decimal("0.0000"),
                    total_fees=Decimal("0.0000"),
                    rejection_or_cancellation_reason="BOOK_INVALID_AT_EXECUTION_TIME"
                ))
                continue

            # 5. Non-atomic Execution on each leg
            # Sweep Leg A
            sweep_a = sweep_book(fill_snap.book_a.asks, sig.requested_pairs, self.config.max_price_a)
            # Sweep Leg B
            sweep_b = sweep_book(fill_snap.book_b.asks, sig.requested_pairs, self.config.max_price_b)

            fee_a = quantize_money(sweep_a.total_cost * self.config.taker_fee_rate)
            fee_b = quantize_money(sweep_b.total_cost * self.config.taker_fee_rate)

            # Record fills in ledger
            if sweep_a.filled_size > Decimal("0"):
                self.accounting.record_fill(
                    order_id=order_id,
                    fill_id=f"fl_{uuid.uuid4().hex[:6]}",
                    idempotency_key=f"fill_{order_id}_legA",
                    condition_id=snap.condition_id,
                    token_id=snap.book_a.token_id,
                    outcome_name="YES",
                    shares=sweep_a.filled_size,
                    cost=sweep_a.total_cost,
                    fee=fee_a,
                    timestamp_utc=fill_snap.received_at_utc
                )

            if sweep_b.filled_size > Decimal("0"):
                self.accounting.record_fill(
                    order_id=order_id,
                    fill_id=f"fl_{uuid.uuid4().hex[:6]}",
                    idempotency_key=f"fill_{order_id}_legB",
                    condition_id=snap.condition_id,
                    token_id=snap.book_b.token_id,
                    outcome_name="NO",
                    shares=sweep_b.filled_size,
                    cost=sweep_b.total_cost,
                    fee=fee_b,
                    timestamp_utc=fill_snap.received_at_utc
                )

            # Release any leftover reserved cash
            actual_used = sweep_a.total_cost + fee_a + sweep_b.total_cost + fee_b
            if total_reserve > actual_used:
                self.accounting.release_reservation(order_id, total_reserve - actual_used)

            # Determine order final state
            paired = min(sweep_a.filled_size, sweep_b.filled_size)
            residual = abs(sweep_a.filled_size - sweep_b.filled_size)

            final_state = OrderState.FILLED
            if sweep_a.filled_size == Decimal("0") and sweep_b.filled_size == Decimal("0"):
                final_state = OrderState.CANCELLED
                rejected_or_expired += 1
            elif not sweep_a.is_complete or not sweep_b.is_complete or residual > Decimal("0"):
                final_state = OrderState.PARTIALLY_FILLED
                partially_filled += 1
            else:
                completely_filled += 1

            leg_a_state = OrderState.FILLED if sweep_a.is_complete else (OrderState.PARTIALLY_FILLED if sweep_a.filled_size > 0 else OrderState.CANCELLED)
            leg_b_state = OrderState.FILLED if sweep_b.is_complete else (OrderState.PARTIALLY_FILLED if sweep_b.filled_size > 0 else OrderState.CANCELLED)

            self.executions.append(PaperTradeExecution(
                order_id=order_id,
                signal_id=sig.signal_id,
                condition_id=snap.condition_id,
                market_slug=snap.market_slug,
                submission_time_utc=snap.received_at_utc,
                execution_time_utc=fill_snap.received_at_utc,
                requested_pairs=sig.requested_pairs,
                state=final_state,
                leg_a=PaperLegExecution(
                    token_id=snap.book_a.token_id,
                    outcome_name="YES",
                    target_shares=sig.requested_pairs,
                    filled_shares=sweep_a.filled_size,
                    cost=sweep_a.total_cost,
                    fee=fee_a,
                    average_price=sweep_a.average_price,
                    status=leg_a_state
                ),
                leg_b=PaperLegExecution(
                    token_id=snap.book_b.token_id,
                    outcome_name="NO",
                    target_shares=sig.requested_pairs,
                    filled_shares=sweep_b.filled_size,
                    cost=sweep_b.total_cost,
                    fee=fee_b,
                    average_price=sweep_b.average_price,
                    status=leg_b_state
                ),
                total_cost=sweep_a.total_cost + sweep_b.total_cost,
                total_fees=fee_a + fee_b,
                paired_shares=paired,
                unpaired_residual_shares=residual,
                rejection_or_cancellation_reason="PARTIAL_FILL_LEGS_UNBALANCED" if residual > Decimal("0") else None
            ))

        # Final mark-to-bid
        final_bids = {}
        if snapshots[-1].book_a.bids:
            final_bids[snapshots[-1].book_a.token_id] = snapshots[-1].book_a.bids[0].price
        if snapshots[-1].book_b.bids:
            final_bids[snapshots[-1].book_b.token_id] = snapshots[-1].book_b.bids[0].price

        final_marks = self.accounting.calculate_mark_to_bid(final_bids)

        return ReplayReport(
            run_id=self.run_id,
            dataset_id=snapshots[0].dataset_id,
            strategy_config_hash=self.config.config_hash(),
            start_utc=snapshots[0].received_at_utc,
            end_utc=snapshots[-1].received_at_utc,
            total_snapshots=total_snaps,
            signals_generated=signals_gen,
            valid_signals=valid_signals,
            orders_submitted=orders_submitted,
            orders_filled_completely=completely_filled,
            orders_partially_filled=partially_filled,
            orders_rejected_or_expired=rejected_or_expired,
            initial_cash=self.accounting.initial_cash,
            final_available_cash=self.accounting.available_cash,
            total_fees_paid=self.accounting.total_fees_paid,
            realized_pnl=self.accounting.realized_pnl,
            unrealized_pnl=to_d(final_marks["unrealized_pnl"]),
            final_nav=to_d(final_marks["total_nav"]),
            max_drawdown_pct=quantize_money(max_drawdown * Decimal("100.0")),
            open_inventory_lots=final_marks["open_lots_count"],
            executions=[
                {
                    "order_id": e.order_id,
                    "signal_id": e.signal_id,
                    "condition_id": e.condition_id,
                    "market_slug": e.market_slug,
                    "submission_time_utc": e.submission_time_utc,
                    "execution_time_utc": e.execution_time_utc,
                    "requested_pairs": d_str(e.requested_pairs),
                    "state": e.state.value,
                    "paired_shares": d_str(e.paired_shares),
                    "unpaired_residual": d_str(e.unpaired_residual_shares),
                    "total_cost": d_str(e.total_cost),
                    "total_fees": d_str(e.total_fees),
                    "reason": e.rejection_or_cancellation_reason,
                    "leg_a": {
                        "token": e.leg_a.token_id,
                        "outcome": e.leg_a.outcome_name,
                        "filled": d_str(e.leg_a.filled_shares),
                        "cost": d_str(e.leg_a.cost),
                        "fee": d_str(e.leg_a.fee),
                        "avg_price": d_str(e.leg_a.average_price),
                    },
                    "leg_b": {
                        "token": e.leg_b.token_id,
                        "outcome": e.leg_b.outcome_name,
                        "filled": d_str(e.leg_b.filled_shares),
                        "cost": d_str(e.leg_b.cost),
                        "fee": d_str(e.leg_b.fee),
                        "avg_price": d_str(e.leg_b.average_price),
                    }
                }
                for e in self.executions
            ],
            nav_timeline=self.nav_timeline
        )
