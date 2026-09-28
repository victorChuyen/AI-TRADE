"""
OPC Trade Lab V1 - Unit Tests: Risk Manager & Kill Switch
"""
import unittest
from decimal import Decimal
from backend.opc_trade.accounting.decimal_ledger import AccountingState
from backend.opc_trade.risk.manager import RiskManager, RiskLimits

class TestRiskManager(unittest.TestCase):
    def setUp(self):
        self.accounting = AccountingState.initialize("run_test_risk", "tenant_test", Decimal("1000.0000"))
        self.risk = RiskManager(RiskLimits(
            max_portfolio_exposure_pct=Decimal("0.20"), # max $200
            max_market_exposure_usd=Decimal("150.0000"),
            max_drawdown_pct=Decimal("0.10"),
            min_available_cash_buffer=Decimal("50.0000")
        ))

    def test_order_within_limits_passes(self):
        res = self.risk.validate_new_order(
            condition_id="cond_1",
            cost_estimate=Decimal("50.0000"),
            accounting=self.accounting,
            current_nav=Decimal("1000.0000")
        )
        self.assertTrue(res.allowed)

    def test_portfolio_exposure_limit(self):
        # Limit is 20% of 1000 = 200. Request 250 -> must reject
        res = self.risk.validate_new_order(
            condition_id="cond_1",
            cost_estimate=Decimal("250.0000"),
            accounting=self.accounting,
            current_nav=Decimal("1000.0000")
        )
        self.assertFalse(res.allowed)
        self.assertEqual(res.rejection_code, "MAX_PORTFOLIO_EXPOSURE_EXCEEDED")

    def test_kill_switch_blocks_immediately(self):
        self.risk.set_kill_switch(True, "Manual emergency halt")
        res = self.risk.validate_new_order(
            condition_id="cond_1",
            cost_estimate=Decimal("10.0000"),
            accounting=self.accounting,
            current_nav=Decimal("1000.0000")
        )
        self.assertFalse(res.allowed)
        self.assertEqual(res.rejection_code, "KILL_SWITCH_ACTIVE")

    def test_max_drawdown_auto_trips_kill_switch(self):
        # NAV drops from 1000 to 880 (12% drawdown > 10% limit)
        res = self.risk.validate_new_order(
            condition_id="cond_1",
            cost_estimate=Decimal("10.0000"),
            accounting=self.accounting,
            current_nav=Decimal("880.0000")
        )
        self.assertFalse(res.allowed)
        self.assertEqual(res.rejection_code, "DRAWDOWN_LIMIT_BREACHED")
        self.assertTrue(self.risk.limits.kill_switch_active)

if __name__ == "__main__":
    unittest.main()
