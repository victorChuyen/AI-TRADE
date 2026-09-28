"""Unit tests for Walk-Forward Analysis Framework."""
import unittest
from decimal import Decimal
from pathlib import Path
import tempfile

from app.backtest.engine import BacktestConfig
from app.backtest.walk_forward import (
    WalkForwardOptimizer,
    WalkForwardResult,
    WalkForwardWindow,
    generate_walk_forward_report
)
from app.data.historical import HistoricalStore, Bar
from app.strategies import TrendFollowingStrategy


class TestWalkForward(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = Path(self.temp_dir.name) / "test_wf.db"
        self.store = HistoricalStore(self.db_path)
        self.bars = self.store.load_synthetic_bars("EURUSD", count=200, timeframe="M15")

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_split_windows_counts(self):
        """Kiểm tra logic chia cửa sổ In-Sample và Out-of-Sample."""
        optimizer = WalkForwardOptimizer(n_windows=3, in_sample_ratio=0.7)
        splits = optimizer.split_windows(self.bars)
        
        self.assertGreaterEqual(len(splits), 2)
        for is_bars, oos_bars in splits:
            self.assertGreater(len(is_bars), 10)
            self.assertGreater(len(oos_bars), 5)
            # IS và OOS không được rỗng
            self.assertIsInstance(is_bars[0], Bar)
            self.assertIsInstance(oos_bars[0], Bar)

    def test_walk_forward_optimizer_execution(self):
        """Kiểm tra chạy quy trình tối ưu và kiểm định Walk-Forward."""
        config = BacktestConfig(
            initial_balance=Decimal('10000'),
            commission_per_lot=Decimal('7.0'),
            max_positions=3
        )
        optimizer = WalkForwardOptimizer(config=config, n_windows=2, in_sample_ratio=0.7)
        
        param_grid = [
            {"fast": 5, "slow": 15, "atr": 10},
            {"fast": 9, "slow": 21, "atr": 14}
        ]
        
        factory = lambda p: TrendFollowingStrategy(
            fast_period=p['fast'],
            slow_period=p['slow'],
            atr_period=p['atr'],
            min_atr_threshold=Decimal('0.00001'),
            max_atr_threshold=Decimal('500.0')
        )

        res = optimizer.run(
            bars=self.bars,
            strategy_factory=factory,
            param_grid=param_grid,
            symbol="EURUSD",
            contract_size=Decimal('100000'),
            digits=5,
            tick_value=Decimal('1'),
            strategy_name="TrendFollowingTest"
        )

        self.assertIsInstance(res, WalkForwardResult)
        self.assertEqual(res.strategy_name, "TrendFollowingTest")
        self.assertEqual(res.symbol, "EURUSD")
        self.assertIn(res.verdict, ["ROBUST", "MODERATE", "OVERFITTED"])
        self.assertGreaterEqual(len(res.windows), 1)

        # Kiểm tra chi tiết cửa sổ
        w1 = res.windows[0]
        self.assertIsInstance(w1, WalkForwardWindow)
        self.assertIn(w1.best_params, param_grid)
        self.assertIsNotNone(w1.is_result)
        self.assertIsNotNone(w1.oos_result)

    def test_generate_walk_forward_report(self):
        """Kiểm tra tạo báo cáo Markdown định dạng chuẩn."""
        config = BacktestConfig()
        optimizer = WalkForwardOptimizer(config=config, n_windows=2)
        
        param_grid = [{"fast": 5, "slow": 15, "atr": 10}]
        factory = lambda p: TrendFollowingStrategy(5, 15, 10, Decimal('0.00001'), Decimal('500.0'))

        res = optimizer.run(
            bars=self.bars,
            strategy_factory=factory,
            param_grid=param_grid,
            symbol="EURUSD",
            contract_size=Decimal('100000'),
            digits=5,
            tick_value=Decimal('1')
        )

        report = generate_walk_forward_report([res])
        self.assertIn("BÁO CÁO PHÂN TÍCH WALK-FORWARD", report)
        self.assertIn("Bảng Tổng Hợp Độ Bền Vững", report)
        self.assertIn("Chi Tiết Từng Cửa Sổ", report)
        self.assertIn("Khuyến Nghị Vận Hành Cho Victor", report)
        self.assertIn("WFE", report)


if __name__ == "__main__":
    unittest.main()
