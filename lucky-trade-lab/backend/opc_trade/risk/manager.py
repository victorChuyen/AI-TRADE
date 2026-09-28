"""
OPC Trade Lab V1 - Risk Management & Kill Switch
Owner: Victor Chuyền · OPC AI REVENUE LAB
Version: 1.0 (2026-09-24)
"""
from __future__ import annotations

from decimal import Decimal
from typing import Dict, Any, Optional, Tuple, List
from dataclasses import dataclass, field
from ..core import to_d, quantize_money, d_str
from ..accounting.decimal_ledger import AccountingState

@dataclass
class RiskLimits:
    max_portfolio_exposure_pct: Decimal = Decimal("0.20")  # 20% max open exposure
    max_market_exposure_usd: Decimal = Decimal("200.0000") # $200 per condition
    max_drawdown_pct: Decimal = Decimal("0.08")            # 8% max peak-to-trough drawdown
    min_available_cash_buffer: Decimal = Decimal("50.0000")# Must keep $50 unencumbered
    kill_switch_active: bool = False
    kill_switch_reason: Optional[str] = None

@dataclass
class RiskCheckResult:
    allowed: bool
    rejection_code: Optional[str] = None
    detail: Optional[str] = None

class RiskManager:
    def __init__(self, limits: Optional[RiskLimits] = None):
        self.limits = limits or RiskLimits()
        self.peak_nav: Decimal = Decimal("1000.0000")
        self.audit_events: List[Dict[str, Any]] = []

    def set_kill_switch(self, active: bool, reason: str) -> None:
        self.limits.kill_switch_active = active
        self.limits.kill_switch_reason = reason if active else None
        self.audit_events.append({
            "action": "KILL_SWITCH_UPDATED",
            "active": active,
            "reason": reason
        })

    def validate_new_order(
        self,
        condition_id: str,
        cost_estimate: Decimal,
        accounting: AccountingState,
        current_nav: Decimal
    ) -> RiskCheckResult:
        """
        Validates risk before an order can be queued or simulated.
        Runs BEFORE reservation and submission.
        """
        if self.limits.kill_switch_active:
            return RiskCheckResult(
                allowed=False,
                rejection_code="KILL_SWITCH_ACTIVE",
                detail=f"Execution halted: {self.limits.kill_switch_reason or 'Manual kill switch engaged'}"
            )

        # Update peak NAV
        if current_nav > self.peak_nav:
            self.peak_nav = current_nav

        # Drawdown check
        if self.peak_nav > Decimal("0"):
            drawdown = (self.peak_nav - current_nav) / self.peak_nav
            if drawdown >= self.limits.max_drawdown_pct:
                self.set_kill_switch(
                    True,
                    f"Max drawdown breached: {d_str(quantize_money(drawdown * 100))}% >= {d_str(quantize_money(self.limits.max_drawdown_pct * 100))}%"
                )
                return RiskCheckResult(
                    allowed=False,
                    rejection_code="DRAWDOWN_LIMIT_BREACHED",
                    detail=f"Drawdown {d_str(quantize_money(drawdown*100))}% breached limit"
                )

        # Cash buffer check
        required_after = accounting.available_cash - cost_estimate
        if required_after < self.limits.min_available_cash_buffer:
            return RiskCheckResult(
                allowed=False,
                rejection_code="INSUFFICIENT_CASH_BUFFER",
                detail=f"Remaining cash ${d_str(required_after)} falls below safety buffer ${d_str(self.limits.min_available_cash_buffer)}"
            )

        # Total exposure check: (reserved + open inventory + new order) / NAV <= max_pct
        current_exposure = accounting.reserved_cash
        for lot in accounting.inventory_lots:
            if lot.status == "OPEN":
                current_exposure += lot.cost_basis

        projected_exposure = current_exposure + cost_estimate
        max_allowed_exposure = current_nav * self.limits.max_portfolio_exposure_pct

        if projected_exposure > max_allowed_exposure:
            return RiskCheckResult(
                allowed=False,
                rejection_code="MAX_PORTFOLIO_EXPOSURE_EXCEEDED",
                detail=f"Projected exposure ${d_str(projected_exposure)} exceeds limit ${d_str(max_allowed_exposure)}"
            )

        # Per-market exposure check
        market_exposure = Decimal("0.0000")
        for lot in accounting.inventory_lots:
            if lot.status == "OPEN" and lot.condition_id == condition_id:
                market_exposure += lot.cost_basis

        if (market_exposure + cost_estimate) > self.limits.max_market_exposure_usd:
            return RiskCheckResult(
                allowed=False,
                rejection_code="MAX_MARKET_EXPOSURE_EXCEEDED",
                detail=f"Condition {condition_id} exposure would exceed ${d_str(self.limits.max_market_exposure_usd)}"
            )

        return RiskCheckResult(allowed=True)
