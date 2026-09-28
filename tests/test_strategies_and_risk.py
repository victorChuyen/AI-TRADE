"""Unit tests for Lucky Trade Phase 1C Strategies & Risk Manager."""
import unittest
from decimal import Decimal

from app.data.historical import load_synthetic, Bar
from app.backtest.engine import BacktestEngine, BacktestConfig
from app.strategies import (
    BaseStrategy,
    IndicatorHelper,
    TrendFollowingStrategy,
    DonchianBreakoutStrategy,
    BollingerMeanReversionStrategy
)
from app.risk import PositionSizer, RiskGate


class TestIndicators(unittest.TestCase):
    def test_sma_and_ema(self):
        prices = [Decimal(str(x)) for x in range(1, 11)]
        sma5 = IndicatorHelper.sma(prices, 5)
        self.assertIsNone(sma5[0])
        self.assertIsNone(sma5[3])
        self.assertEqual(sma5[4], Decimal("3")) # (1+2+3+4+5)/5 = 3
        self.assertEqual(sma5[-1], Decimal("8")) # (6+7+8+9+10)/5 = 8

        ema5 = IndicatorHelper.ema(prices, 5)
        self.assertIsNone(ema5[0])
        self.assertEqual(ema5[4], Decimal("3"))
        self.assertIsNotNone(ema5[-1])

    def test_donchian_and_bollinger(self):
        highs = [Decimal("10"), Decimal("12"), Decimal("15"), Decimal("14"), Decimal("13")]
        lows = [Decimal("8"), Decimal("9"), Decimal("10"), Decimal("11"), Decimal("9")]
        
        upper, lower, mid = IndicatorHelper.donchian_channels(highs, lows, 3)
        self.assertEqual(upper[-1], Decimal("15"))
        self.assertEqual(lower[-1], Decimal("9"))
        self.assertEqual(mid[-1], Decimal("12"))

        closes = [Decimal("100"), Decimal("102"), Decimal("98"), Decimal("105"), Decimal("95")]
        sma, upper_bb, lower_bb, bw = IndicatorHelper.bollinger_bands(closes, 3, Decimal("2"))
        self.assertIsNotNone(sma[-1])
        self.assertIsNotNone(upper_bb[-1])
        self.assertIsNotNone(lower_bb[-1])


class TestStrategiesWithBacktest(unittest.TestCase):
    def setUp(self):
        self.bars = load_synthetic("EURUSD", "H1", count=300)
        self.config = BacktestConfig(
            initial_balance=Decimal("10000"),
            commission_per_lot=Decimal("7.0"),
            max_positions=3
        )

    def test_trend_following_backtest(self):
        strategy = TrendFollowingStrategy(
            fast_period=5,
            slow_period=15,
            atr_period=10,
            min_atr_threshold=Decimal("0.00001"),
            max_atr_threshold=Decimal("1.00000")
        )
        engine = BacktestEngine(self.config)
        result = engine.run(self.bars, strategy, symbol="EURUSD")
        self.assertIsInstance(result.net_profit, Decimal)
        self.assertEqual(result.strategy, "Trend_Following")

    def test_donchian_breakout_backtest(self):
        strategy = DonchianBreakoutStrategy(period=10, atr_period=10)
        engine = BacktestEngine(self.config)
        result = engine.run(self.bars, strategy, symbol="EURUSD")
        self.assertIsInstance(result.net_profit, Decimal)
        self.assertEqual(result.strategy, "Donchian_Breakout")

    def test_bollinger_mean_reversion_backtest(self):
        strategy = BollingerMeanReversionStrategy(
            bb_period=10,
            rsi_period=10,
            rsi_oversold=Decimal("40"),
            rsi_overbought=Decimal("60")
        )
        engine = BacktestEngine(self.config)
        result = engine.run(self.bars, strategy, symbol="EURUSD")
        self.assertIsInstance(result.net_profit, Decimal)
        self.assertEqual(result.strategy, "Bollinger_Mean_Reversion")


class TestRiskManager(unittest.TestCase):
    def test_position_sizer(self):
        sizer = PositionSizer()
        lot = sizer.calculate_lot_size(
            equity=Decimal("10000"),
            risk_pct=Decimal("1.0"),         # $100 risk
            entry=Decimal("1.0850"),
            sl=Decimal("1.0800"),            # 50 pips (500 points)
            tick_value=Decimal("1.0"),
            tick_size=Decimal("0.00001"),
            contract_size=Decimal("100000"),
            min_lot=Decimal("0.01"),
            max_lot=Decimal("10.0"),
            lot_step=Decimal("0.01")
        )
        # points = 0.0050 / 0.00001 = 500 points
        # risk_amount = 100
        # raw_lot = 100 / (500 * 1.0) = 0.20 lots
        self.assertEqual(lot, Decimal("0.20"))

    def test_risk_gate(self):
        gate = RiskGate(
            max_daily_drawdown_pct=Decimal("3.0"),
            max_open_positions=3,
            max_spread=Decimal("0.00050"),
            max_correlation_positions=1
        )
        
        # Valid order
        valid = gate.validate_order(
            symbol="EURUSD",
            direction="BUY",
            spread=Decimal("0.00015"),
            daily_drawdown_pct=Decimal("1.0"),
            current_open_positions=1,
            margin_requirement=Decimal("300"),
            free_margin=Decimal("8000"),
            strategy_name="Trend",
            active_trades=[]
        )
        self.assertTrue(valid)

        # Drawdown exceeded
        blocked_dd = gate.validate_order(
            symbol="EURUSD",
            direction="BUY",
            spread=Decimal("0.00015"),
            daily_drawdown_pct=Decimal("3.5"),
            current_open_positions=1,
            margin_requirement=Decimal("300"),
            free_margin=Decimal("8000"),
            strategy_name="Trend",
            active_trades=[]
        )
        self.assertFalse(blocked_dd)

        # Correlation blocked (already have a BUY on EURUSD)
        blocked_corr = gate.validate_order(
            symbol="EURUSD",
            direction="BUY",
            spread=Decimal("0.00015"),
            daily_drawdown_pct=Decimal("1.0"),
            current_open_positions=1,
            margin_requirement=Decimal("300"),
            free_margin=Decimal("8000"),
            strategy_name="Breakout",
            active_trades=[{"symbol": "EURUSD", "direction": "BUY"}]
        )
        self.assertFalse(blocked_corr)


if __name__ == "__main__":
    unittest.main()
