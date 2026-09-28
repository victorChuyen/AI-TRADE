"""
OPC Trade Lab V1 - Order Book Depth Sweep Calculation
Owner: Victor Chuyền · OPC AI REVENUE LAB
Version: 1.0 (2026-09-24)
"""
from __future__ import annotations

from decimal import Decimal
from typing import List, Optional
from dataclasses import dataclass
from ..core import PriceLevel, to_d, quantize_money, quantize_price

@dataclass
class SweepResult:
    requested_size: Decimal
    filled_size: Decimal
    total_cost: Decimal
    average_price: Decimal
    marginal_price: Decimal
    is_complete: bool
    remaining_size: Decimal

def sweep_book(levels: List[PriceLevel], requested_size: Decimal, max_price_limit: Optional[Decimal] = None) -> SweepResult:
    """
    Sweeps through an order book side (asks for buys, bids for sells).
    Calculates total cost, executed volume, and average price strictly with Decimal.
    """
    q_needed = to_d(requested_size)
    if q_needed <= Decimal("0"):
        return SweepResult(
            requested_size=Decimal("0"),
            filled_size=Decimal("0"),
            total_cost=Decimal("0"),
            average_price=Decimal("0"),
            marginal_price=Decimal("0"),
            is_complete=True,
            remaining_size=Decimal("0")
        )

    filled = Decimal("0")
    total_cost = Decimal("0")
    last_price = Decimal("0")

    for lvl in levels:
        price = lvl.price
        size = lvl.size

        # If a max price limit is given, do not consume beyond limit
        if max_price_limit is not None and price > max_price_limit:
            break

        take = min(size, q_needed - filled)
        if take <= Decimal("0"):
            break

        filled += take
        total_cost += (take * price)
        last_price = price

        if filled >= q_needed:
            break

    rem = q_needed - filled
    avg_price = (total_cost / filled) if filled > Decimal("0") else Decimal("0")

    return SweepResult(
        requested_size=q_needed,
        filled_size=filled,
        total_cost=quantize_money(total_cost),
        average_price=quantize_price(avg_price),
        marginal_price=quantize_price(last_price),
        is_complete=(rem == Decimal("0")),
        remaining_size=rem
    )
