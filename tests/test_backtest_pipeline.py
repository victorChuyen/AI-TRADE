"""Unit & Integration tests for Lucky Trade Phase 1B Data & Backtest Pipeline."""
import unittest
from decimal import Decimal
from pathlib import Path
import tempfile
import time

from app.data.historical import Bar, HistoricalStore, load_synthetic, load_from_csv
from app.backtest.engine import BacktestEngine, BacktestConfig, Signal
from app.backtest.report import console_summary, trade_journal_csv, to_json, compare_strategies


class TestHistoricalData(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = Path(self.temp_dir.name) / "test_market.db"
        self.store = HistoricalStore(self.db_path)

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_bar_subscripting(self):
        bar = Bar(
            symbol="EURUSD",
            timeframe="H1",
            time=1700000000,
            open=Decimal("1.0850"),
            high=Decimal("1.0890"),
            low=Decimal("1.0820"),
            close=Decimal("1.0870"),
            tick_volume=150
        )
        self.assertEqual(bar["open"], Decimal("1.0850"))
        self.assertEqual(bar["close"], Decimal("1.0870"))
        self.assertEqual(bar.open, Decimal("1.0850"))
        self.assertEqual(bar.get("tick_volume"), 150)

    def test_store_insert_and_retrieve(self):
        bars = load_synthetic("EURUSD", "M15", count=100)
        self.assertEqual(len(bars), 100)
        
        inserted = self.store.insert_bars(bars)
        self.assertEqual(inserted, 100)
        
        retrieved = self.store.get_bars("EURUSD", "M15", limit=50)
        self.assertEqual(len(retrieved), 50)
        self.assertIsInstance(retrieved[0].open, Decimal)
        
        # Test duplicate ignore
        reinserted = self.store.insert_bars(bars)
        self.assertEqual(reinserted, 0)
        
        # Test validation
        val = self.store.validate("EURUSD", "M15")
        self.assertEqual(val["total_bars"], 100)
        self.assertEqual(len(val["anomalies"]), 0)


class TestBacktestEngine(unittest.TestCase):
    def test_simple_backtest_run(self):
        bars = load_synthetic("EURUSD", "H1", count=200)
        config = BacktestConfig(
            initial_balance=Decimal("10000"),
            commission_per_lot=Decimal("7.0"),
            max_positions=2
        )
        engine = BacktestEngine(config)
        
        # Simple test strategy: Buy on bar 10, sell on bar 50
        def dummy_strategy(bars_so_far):
            idx = len(bars_so_far) - 1
            current = bars_so_far[-1]
            if idx == 10:
                return Signal(
                    symbol="EURUSD",
                    side="BUY",
                    entry=current["close"],
                    sl=current["close"] - Decimal("0.0050"),
                    tp=current["close"] + Decimal("0.0100"),
                    volume=Decimal("0.1"),
                    reason="Test Buy Entry",
                    strategy="TestStrategy",
                    strategy_version="1.0",
                    bar_time=current["time"]
                )
            return None

        result = engine.run(bars, dummy_strategy, symbol="EURUSD")
        
        self.assertGreater(len(result.trades), 0)
        self.assertGreater(len(result.equity_curve), 0)
        self.assertIsInstance(result.net_profit, Decimal)
        self.assertIsInstance(result.win_rate, Decimal)
        
        # Test reporting
        summary = console_summary(result)
        self.assertIn("BÁO CÁO BACKTEST", summary)
        self.assertIn("TestStrategy", summary)
        
        csv_str = trade_journal_csv(result)
        self.assertIn("gross_pnl", csv_str)
        self.assertIn("TestStrategy", csv_str)
        
        json_str = to_json(result)
        self.assertIn("net_profit", json_str)


if __name__ == "__main__":
    unittest.main()
