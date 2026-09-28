"""FTMO 1-Step & 2-Step Risk Engine — Formal Mathematical Contract.

Triển khai đầy đủ các công thức toán học và kiểm thử từ OPC_FTMO_BOT_DESIGN_QA_V1.md.
Bao gồm: Trailing Drawdown ratchet, Daily Floor, Headroom, Best Day rule, và Rollover Risk.
"""
from decimal import Decimal, ROUND_DOWN
from typing import Dict, List, Optional, Any, Tuple
import logging

logger = logging.getLogger(__name__)


class FTMORuleProfile:
    """Hồ sơ quy tắc FTMO (1-Step hoặc 2-Step)."""
    def __init__(
        self,
        name: str = "FTMO_1STEP_10K",
        initial_capital: Decimal = Decimal("10000.00"),
        step_type: str = "1-Step",          # "1-Step" or "2-Step"
        profit_target_pct: Decimal = Decimal("10.0"),  # 10%
        daily_loss_pct: Decimal = Decimal("3.0"),      # 3% for 1-Step, 5% for 2-Step
        total_loss_pct: Decimal = Decimal("10.0"),     # 10%
        best_day_rule_enabled: bool = True,            # Required for 1-Step
        max_best_day_pct: Decimal = Decimal("50.0"),   # Max single day profit <= 50%
        safety_buffer_pct: Decimal = Decimal("0.5"),   # Internal safety buffer before floor
    ):
        self.name = name
        self.initial_capital = initial_capital
        self.step_type = step_type
        self.profit_target_pct = profit_target_pct
        self.daily_loss_pct = daily_loss_pct
        self.total_loss_pct = total_loss_pct
        self.best_day_rule_enabled = best_day_rule_enabled
        self.max_best_day_pct = max_best_day_pct
        self.safety_buffer_pct = safety_buffer_pct


class FTMORiskEngine:
    """
    Động cơ tính toán rủi ro FTMO độc lập.
    Quản lý:
    - B0: Balance tại ranh giới 00:00 Europe/Prague
    - H: Đỉnh số dư cao nhất đã chốt tại ranh giới ngày (H >= I)
    - E: Equity hiện tại (bao gồm floating P/L)
    - Trailing Drawdown Ratchet
    - Best Day Ratio
    - Rollover Risk Guard
    """

    def __init__(self, profile: Optional[FTMORuleProfile] = None):
        self.profile = profile or FTMORuleProfile()
        self.I = self.profile.initial_capital
        self.B0 = self.I
        self.H = self.I
        self.daily_settled_profits: List[Decimal] = []

    def configure_state(self, initial_capital: Decimal, b0: Decimal, peak_h: Decimal):
        """Khởi tạo trạng thái ranh giới."""
        self.I = Decimal(str(initial_capital))
        self.B0 = Decimal(str(b0))
        self.H = max(self.I, Decimal(str(peak_h)))

    def calculate_floors(self, equity: Decimal) -> Dict[str, Decimal]:
        """
        Tính toán các ngưỡng sàn và khoảng đệm an toàn (Headroom).
        
        daily_floor = B0 - daily_rate * I
        total_floor_2step = 0.90 * I
        total_floor_1step = H - 0.10 * I
        effective_floor = max(daily_floor, total_floor)
        headroom = E - effective_floor
        """
        eq = Decimal(str(equity))
        
        # 1. Daily Floor
        daily_rate = self.profile.daily_loss_pct / Decimal("100.0")
        daily_floor = self.B0 - (daily_rate * self.I)

        # 2. Total Floor
        if self.profile.step_type == "1-Step":
            # 1-Step: Trailing Drawdown bám theo đỉnh H
            total_floor = self.H - ((self.profile.total_loss_pct / Decimal("100.0")) * self.I)
        else:
            # 2-Step: Sàn tổng cố định 90% vốn
            total_floor = self.I * (Decimal("1.0") - (self.profile.total_loss_pct / Decimal("100.0")))

        # 3. Effective Floor & Headroom
        effective_floor = max(daily_floor, total_floor)
        headroom = eq - effective_floor

        # 4. Safety Buffer Floor (Ngưỡng dừng nội bộ trước khi chạm sàn FTMO)
        safety_margin = self.I * (self.profile.safety_buffer_pct / Decimal("100.0"))
        safety_floor = effective_floor + safety_margin

        return {
            "initial_capital": self.I,
            "boundary_balance_b0": self.B0,
            "peak_high_watermark_h": self.H,
            "daily_floor": daily_floor,
            "total_floor": total_floor,
            "effective_floor": effective_floor,
            "headroom": headroom,
            "safety_floor": safety_floor,
            "breached": eq <= effective_floor,
            "safety_warning": eq <= safety_floor
        }

    def check_rollover_risk(self, current_balance: Decimal, floating_pnl: Decimal) -> Dict[str, Any]:
        """
        QA R03: Phát hiện nguy cơ vi phạm sàn ngày sau khi reset lúc 00:00 Europe/Prague.
        Nếu balance tăng cao nhưng floating âm nặng, sau nửa đêm B0 mới sẽ là current_balance,
        khiến daily_floor mới có thể cao hơn Equity hiện tại -> VI PHẠM TỨC THÌ.
        """
        curr_bal = Decimal(str(current_balance))
        float_pnl = Decimal(str(floating_pnl))
        current_equity = curr_bal + float_pnl

        # Dự kiến B0 mới = curr_bal sau reset
        next_b0 = curr_bal
        daily_rate = self.profile.daily_loss_pct / Decimal("100.0")
        projected_daily_floor = next_b0 - (daily_rate * self.I)

        will_breach_after_reset = current_equity <= projected_daily_floor
        projected_headroom = current_equity - projected_daily_floor

        return {
            "risk_detected": will_breach_after_reset,
            "current_equity": current_equity,
            "next_b0": next_b0,
            "projected_daily_floor": projected_daily_floor,
            "projected_headroom": projected_headroom
        }

    def check_best_day_rule(self, daily_profits: List[Decimal]) -> Dict[str, Any]:
        """
        QA R09: Quy tắc Best Day FTMO 1-Step.
        Lợi nhuận ngày lớn nhất <= 50% tổng lợi nhuận của các ngày có lãi.
        Nếu vượt 50%: Chưa eligible hoàn thành challenge (cần giao dịch thêm ngày khác),
        KHÔNG ĐƯỢC coi là hard breach vi phạm dừng cuộc chơi.
        """
        if not self.profile.best_day_rule_enabled or not daily_profits:
            return {"eligible": True, "best_day_pct": Decimal("0.0"), "reason": "Rule not active or no profits"}

        positive_days = [Decimal(str(p)) for p in daily_profits if Decimal(str(p)) > Decimal("0")]
        if not positive_days:
            return {"eligible": True, "best_day_pct": Decimal("0.0"), "reason": "No positive days yet"}

        best_day = max(positive_days)
        total_positive_profit = sum(positive_days)

        best_day_ratio = (best_day / total_positive_profit) * Decimal("100.0")
        is_eligible = best_day_ratio <= self.profile.max_best_day_pct

        return {
            "eligible": is_eligible,
            "best_day_profit": best_day,
            "total_positive_profit": total_positive_profit,
            "best_day_pct": round(best_day_ratio, 2),
            "max_allowed_pct": self.profile.max_best_day_pct,
            "status": "ELIGIBLE_FOR_REVIEW" if is_eligible else "IN_PROGRESS_NEED_MORE_DAYS"
        }

    def on_day_boundary_reset(self, closed_day_balance: Decimal, day_profit: Decimal):
        """
        Thực hiện reset tại ranh giới 00:00 Europe/Prague.
        Cập nhật B0 mới, cập nhật đỉnh H (chỉ tăng, không giảm), lưu lại lợi nhuận ngày.
        """
        bal = Decimal(str(closed_day_balance))
        pnl = Decimal(str(day_profit))
        self.B0 = bal
        if bal > self.H:
            self.H = bal
        self.daily_settled_profits.append(pnl)
        logger.info(f"FTMO Day Reset: B0={self.B0}, H={self.H}, DayPnL={pnl}")
