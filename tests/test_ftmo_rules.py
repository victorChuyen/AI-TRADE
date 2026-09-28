"""Unit & Integration Tests for FTMO Risk Engine Fixtures R01-R10.

Tuân thủ nghiêm ngặt bảng kiểm thử QA trong OPC_FTMO_BOT_DESIGN_QA_V1.md.
"""
from decimal import Decimal
import unittest
from app.risk.ftmo import FTMORiskEngine, FTMORuleProfile


class TestFTMORiskEngine(unittest.TestCase):

    def test_r01_two_step_floors_and_headroom(self):
        """
        R01: 2-Step I=100.000, B0=102.000, E=98.000
        Kỳ vọng: daily floor 97.000; tổng 90.000; headroom 1.000
        """
        profile = FTMORuleProfile(
            name="FTMO_2STEP_100K",
            initial_capital=Decimal("100000.00"),
            step_type="2-Step",
            daily_loss_pct=Decimal("5.0"),
            total_loss_pct=Decimal("10.0")
        )
        engine = FTMORiskEngine(profile)
        engine.configure_state(initial_capital=Decimal("100000.00"), b0=Decimal("102000.00"), peak_h=Decimal("102000.00"))

        res = engine.calculate_floors(equity=Decimal("98000.00"))
        
        self.assertEqual(res["daily_floor"], Decimal("97000.00"))
        self.assertEqual(res["total_floor"], Decimal("90000.00"))
        self.assertEqual(res["effective_floor"], Decimal("97000.00"))
        self.assertEqual(res["headroom"], Decimal("1000.00"))
        self.assertFalse(res["breached"])

    def test_r02_one_step_trailing_drawdown_ratchet(self):
        """
        R02: 1-Step I=100.000, H=104.000, B0=103.000
        Kỳ vọng: daily 100.000; tổng 94.000; không hạ H khi balance giảm.
        """
        profile = FTMORuleProfile(
            name="FTMO_1STEP_100K",
            initial_capital=Decimal("100000.00"),
            step_type="1-Step",
            daily_loss_pct=Decimal("3.0"),
            total_loss_pct=Decimal("10.0")
        )
        engine = FTMORiskEngine(profile)
        engine.configure_state(initial_capital=Decimal("100000.00"), b0=Decimal("103000.00"), peak_h=Decimal("104000.00"))

        res = engine.calculate_floors(equity=Decimal("103000.00"))
        
        self.assertEqual(res["daily_floor"], Decimal("100000.00"))
        # total_floor = H (104.000) - 10% I (10.000) = 94.000
        self.assertEqual(res["total_floor"], Decimal("94000.00"))
        self.assertEqual(res["effective_floor"], Decimal("100000.00"))
        self.assertEqual(res["headroom"], Decimal("3000.00"))

        # Kiểm tra ratchet: balance giảm xuống 101.000 ở ngày tiếp theo, H vẫn giữ 104.000
        engine.on_day_boundary_reset(closed_day_balance=Decimal("101000.00"), day_profit=Decimal("-2000.00"))
        self.assertEqual(engine.H, Decimal("104000.00"), "H không được phép hạ xuống khi số dư giảm!")
        self.assertEqual(engine.B0, Decimal("101000.00"))

    def test_r03_detect_rollover_risk_before_reset(self):
        """
        R03: 2-Step trước reset B0=100.000, balance=103.000, floating=-7.000, E=96.000
        Sau reset B0=103.000, daily floor=98.000. Vì E=96.000 < 98.000 nên sẽ vi phạm ngay!
        Kỳ vọng: Phát hiện nguy cơ trước reset.
        """
        profile = FTMORuleProfile(
            name="FTMO_2STEP_100K",
            initial_capital=Decimal("100000.00"),
            step_type="2-Step",
            daily_loss_pct=Decimal("5.0"),
            total_loss_pct=Decimal("10.0")
        )
        engine = FTMORiskEngine(profile)
        engine.configure_state(initial_capital=Decimal("100000.00"), b0=Decimal("100000.00"), peak_h=Decimal("100000.00"))

        # Balance hiện tại 103.000, floating -7.000 -> Equity 96.000
        rollover = engine.check_rollover_risk(current_balance=Decimal("103000.00"), floating_pnl=Decimal("-7000.00"))
        
        self.assertTrue(rollover["risk_detected"])
        self.assertEqual(rollover["current_equity"], Decimal("96000.00"))
        self.assertEqual(rollover["projected_daily_floor"], Decimal("98000.00"))
        self.assertEqual(rollover["projected_headroom"], Decimal("-2000.00"))

    def test_r04_equity_breach_with_positive_balance(self):
        """
        R04: Balance dương nhưng equity xuyên sàn do floating loss.
        Kỳ vọng: Cảnh báo/khóa theo equity, không theo realized riêng.
        """
        profile = FTMORuleProfile(initial_capital=Decimal("10000.00"), step_type="1-Step", daily_loss_pct=Decimal("3.0"))
        engine = FTMORiskEngine(profile)
        engine.configure_state(initial_capital=Decimal("10000.00"), b0=Decimal("10000.00"), peak_h=Decimal("10000.00"))

        # Balance là 10.000 nhưng floating là -350 -> Equity là 9.650 (dưới sàn 9.700)
        res = engine.calculate_floors(equity=Decimal("9650.00"))
        self.assertTrue(res["breached"])
        self.assertLess(res["headroom"], Decimal("0.00"))

    def test_r05_safety_margin_prevents_edge_breach(self):
        """
        R05: Equity gần sát sàn -> Safety margin phát tín hiệu cảnh báo trước khi chạm sàn thật.
        """
        profile = FTMORuleProfile(
            initial_capital=Decimal("10000.00"), 
            step_type="1-Step", 
            daily_loss_pct=Decimal("3.0"),
            safety_buffer_pct=Decimal("0.5") # Buffer 0.5% = $50
        )
        engine = FTMORiskEngine(profile)
        engine.configure_state(initial_capital=Decimal("10000.00"), b0=Decimal("10000.00"), peak_h=Decimal("10000.00"))

        # Daily floor = 9700. Safety floor = 9750.
        # Equity = 9740 (chưa chạm 9700 nhưng đã dưới safety floor 9750)
        res = engine.calculate_floors(equity=Decimal("9740.00"))
        self.assertFalse(res["breached"], "Chưa vi phạm sàn FTMO thật")
        self.assertTrue(res["safety_warning"], "Phải kích hoạt cảnh báo an toàn nội bộ!")

    def test_r09_best_day_rule_50_percent(self):
        """
        R09: Best Day Rule FTMO 1-Step:
        Lợi nhuận ngày lớn nhất <= 50% tổng lợi nhuận dương.
        Nếu vượt 50%: Chưa eligible hoàn thành challenge, nhưng không phải vi phạm dừng bot.
        """
        profile = FTMORuleProfile(step_type="1-Step", best_day_rule_enabled=True, max_best_day_pct=Decimal("50.0"))
        engine = FTMORiskEngine(profile)

        # Kịch bản 1: Ngày 1 ăn 700$, Ngày 2 ăn 100$, Ngày 3 ăn 100$ -> Tổng 900$.
        # Best day = 700 / 900 = 77.78% > 50% -> Chưa đủ điều kiện hoàn thành (Chưa eligible)
        res1 = engine.check_best_day_rule([Decimal("700.00"), Decimal("100.00"), Decimal("100.00")])
        self.assertFalse(res1["eligible"])
        self.assertEqual(res1["status"], "IN_PROGRESS_NEED_MORE_DAYS")
        self.assertGreater(res1["best_day_pct"], Decimal("50.0"))

        # Kịch bản 2: Giao dịch thêm Ngày 4 ăn 300$, Ngày 5 ăn 400$ -> Tổng 1600$.
        # Best day = 700 / 1600 = 43.75% <= 50% -> Đạt chuẩn eligible!
        res2 = engine.check_best_day_rule([Decimal("700.00"), Decimal("100.00"), Decimal("100.00"), Decimal("300.00"), Decimal("400.00")])
        self.assertTrue(res2["eligible"])
        self.assertEqual(res2["status"], "ELIGIBLE_FOR_REVIEW")
        self.assertLessEqual(res2["best_day_pct"], Decimal("50.0"))


if __name__ == "__main__":
    unittest.main()
