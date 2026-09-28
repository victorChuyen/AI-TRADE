"""
OPC Trade Lab V1 - Strict Decimal Ledger & Inventory Accounting
Owner: Victor Chuyền · OPC AI REVENUE LAB
Version: 1.0 (2026-09-24)
"""
from __future__ import annotations

from decimal import Decimal
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
import uuid
from datetime import datetime, timezone
from ..core import to_d, quantize_money, quantize_shares, d_str

@dataclass
class CashLedgerEntry:
    entry_id: str
    run_id: str
    tenant_id: str
    order_id: Optional[str]
    fill_id: Optional[str]
    idempotency_key: str
    amount: Decimal       # Positive for credit, negative for debit
    fee: Decimal          # Non-negative fee charged
    balance_after: Decimal
    cause: str            # DEPOSIT, ORDER_RESERVATION, FILL_PURCHASE, FEE, SETTLEMENT, REFUND
    timestamp_utc: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "entry_id": self.entry_id,
            "run_id": self.run_id,
            "tenant_id": self.tenant_id,
            "order_id": self.order_id,
            "fill_id": self.fill_id,
            "idempotency_key": self.idempotency_key,
            "amount": d_str(self.amount),
            "fee": d_str(self.fee),
            "balance_after": d_str(self.balance_after),
            "cause": self.cause,
            "timestamp_utc": self.timestamp_utc,
        }

@dataclass
class InventoryLot:
    lot_id: str
    run_id: str
    condition_id: str
    token_id: str
    outcome_name: str     # "YES" or "NO"
    size: Decimal
    cost_basis: Decimal   # Total cost paid including fees
    unit_price: Decimal
    acquired_at_utc: str
    settled_at_utc: Optional[str] = None
    realized_pnl: Optional[Decimal] = None
    status: str = "OPEN"  # "OPEN", "SETTLED", "LIQUIDATED"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "lot_id": self.lot_id,
            "run_id": self.run_id,
            "condition_id": self.condition_id,
            "token_id": self.token_id,
            "outcome_name": self.outcome_name,
            "size": d_str(self.size),
            "cost_basis": d_str(self.cost_basis),
            "unit_price": d_str(self.unit_price),
            "acquired_at_utc": self.acquired_at_utc,
            "settled_at_utc": self.settled_at_utc,
            "realized_pnl": d_str(self.realized_pnl) if self.realized_pnl is not None else None,
            "status": self.status,
        }

@dataclass
class AccountingState:
    run_id: str
    tenant_id: str
    initial_cash: Decimal
    available_cash: Decimal
    reserved_cash: Decimal
    total_fees_paid: Decimal
    realized_pnl: Decimal
    ledger_entries: List[CashLedgerEntry] = field(default_factory=list)
    inventory_lots: List[InventoryLot] = field(default_factory=list)
    seen_idempotency_keys: set[str] = field(default_factory=set)

    @classmethod
    def initialize(cls, run_id: str, tenant_id: str = "pilot-owner", starting_cash: Decimal = Decimal("1000.0000")) -> AccountingState:
        starting = quantize_money(starting_cash)
        state = cls(
            run_id=run_id,
            tenant_id=tenant_id,
            initial_cash=starting,
            available_cash=starting,
            reserved_cash=Decimal("0.0000"),
            total_fees_paid=Decimal("0.0000"),
            realized_pnl=Decimal("0.0000"),
        )
        now_str = datetime.now(timezone.utc).isoformat()
        state.ledger_entries.append(
            CashLedgerEntry(
                entry_id=f"ent_init_{uuid.uuid4().hex[:8]}",
                run_id=run_id,
                tenant_id=tenant_id,
                order_id=None,
                fill_id=None,
                idempotency_key=f"init_{run_id}",
                amount=starting,
                fee=Decimal("0.0000"),
                balance_after=starting,
                cause="DEPOSIT_INITIAL",
                timestamp_utc=now_str
            )
        )
        state.seen_idempotency_keys.add(f"init_{run_id}")
        return state

    def reserve_cash(self, order_id: str, amount_needed: Decimal) -> bool:
        """Reserve cash for pending order. Returns False if insufficient cash."""
        amt = quantize_money(amount_needed)
        if amt <= Decimal("0"):
            return False
        if self.available_cash < amt:
            return False

        self.available_cash -= amt
        self.reserved_cash += amt
        return True

    def release_reservation(self, order_id: str, amount_to_release: Decimal) -> None:
        """Release unused reserved cash back to available."""
        amt = quantize_money(amount_to_release)
        releasable = min(amt, self.reserved_cash)
        self.reserved_cash -= releasable
        self.available_cash += releasable

    def record_fill(
        self,
        order_id: str,
        fill_id: str,
        idempotency_key: str,
        condition_id: str,
        token_id: str,
        outcome_name: str,
        shares: Decimal,
        cost: Decimal,
        fee: Decimal,
        timestamp_utc: str
    ) -> bool:
        """
        Idempotent fill recording:
        - Deducts cost & fee from reserved/available cash.
        - Appends lot to inventory.
        - Appends cash ledger entry.
        """
        if idempotency_key in self.seen_idempotency_keys:
            return True # Already processed

        q_shares = quantize_shares(shares)
        total_cost = quantize_money(cost)
        fee_cost = quantize_money(fee)
        gross_deduction = total_cost + fee_cost

        # First deduct from reserved cash
        if self.reserved_cash >= gross_deduction:
            self.reserved_cash -= gross_deduction
        else:
            remainder = gross_deduction - self.reserved_cash
            self.reserved_cash = Decimal("0.0000")
            if self.available_cash < remainder:
                # Critical cash shortfall
                return False
            self.available_cash -= remainder

        self.total_fees_paid += fee_cost
        unit_price = quantize_money(total_cost / q_shares) if q_shares > Decimal("0") else Decimal("0")

        # Create Inventory Lot
        lot = InventoryLot(
            lot_id=f"lot_{fill_id}",
            run_id=self.run_id,
            condition_id=condition_id,
            token_id=token_id,
            outcome_name=outcome_name,
            size=q_shares,
            cost_basis=gross_deduction,
            unit_price=unit_price,
            acquired_at_utc=timestamp_utc
        )
        self.inventory_lots.append(lot)

        # Cash Ledger entry
        entry = CashLedgerEntry(
            entry_id=f"ent_{uuid.uuid4().hex[:8]}",
            run_id=self.run_id,
            tenant_id=self.tenant_id,
            order_id=order_id,
            fill_id=fill_id,
            idempotency_key=idempotency_key,
            amount=-total_cost,
            fee=fee_cost,
            balance_after=self.available_cash + self.reserved_cash,
            cause="FILL_PURCHASE",
            timestamp_utc=timestamp_utc
        )
        self.ledger_entries.append(entry)
        self.seen_idempotency_keys.add(idempotency_key)
        return True

    def calculate_mark_to_bid(self, current_bids: Dict[str, Decimal]) -> Dict[str, Any]:
        """
        Calculates unrealized P&L strictly mark-to-bid.
        If a token has no bid in current_bids, its bid is marked conservatively as 0.00.
        """
        unrealized = Decimal("0.0000")
        total_lot_cost = Decimal("0.0000")
        lots_marked = []

        for lot in self.inventory_lots:
            if lot.status == "OPEN":
                bid_price = current_bids.get(lot.token_id, Decimal("0.0000"))
                market_val = quantize_money(lot.size * bid_price)
                lot_unrealized = market_val - lot.cost_basis
                unrealized += lot_unrealized
                total_lot_cost += lot.cost_basis
                lots_marked.append({
                    "lot_id": lot.lot_id,
                    "token_id": lot.token_id,
                    "outcome": lot.outcome_name,
                    "size": d_str(lot.size),
                    "cost_basis": d_str(lot.cost_basis),
                    "bid_price": d_str(bid_price),
                    "market_value": d_str(market_val),
                    "unrealized_pnl": d_str(lot_unrealized)
                })

        total_nav = quantize_money(self.available_cash + self.reserved_cash + total_lot_cost + unrealized)

        return {
            "unrealized_pnl": d_str(quantize_money(unrealized)),
            "total_inventory_cost": d_str(quantize_money(total_lot_cost)),
            "total_nav": d_str(total_nav),
            "open_lots_count": len(lots_marked),
            "lots": lots_marked
        }
