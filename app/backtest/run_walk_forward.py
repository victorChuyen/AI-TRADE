import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
from decimal import Decimal
from pathlib import Path
import json

from app.backtest.engine import BacktestConfig
from app.backtest.walk_forward import WalkForwardOptimizer, generate_walk_forward_report
from app.data.historical import HistoricalStore
from app.market import SYMBOLS
from app.strategies import (
    TrendFollowingStrategy,
    DonchianBreakoutStrategy,
    BollingerMeanReversionStrategy
)


def run_comprehensive_walk_forward(output_path: str = "reports/walk_forward_report.md"):
    """Thực thi phân tích Walk-Forward toàn diện trên các cặp mục tiêu."""
    reports_dir = Path(output_path).parent
    reports_dir.mkdir(parents=True, exist_ok=True)

    db_path = Path("data/walk_forward_test.db")
    store = HistoricalStore(db_path)

    # 1. Cấu hình kiểm thử chuẩn Exness Demo
    config = BacktestConfig(
        initial_balance=Decimal('50000.0'),
        commission_per_lot=Decimal('7.0'),  # $7/lot phí Exness
        max_positions=5,
        max_risk_per_trade_pct=Decimal('0.5'),
        max_daily_loss_pct=Decimal('2.0')
    )

    optimizer = WalkForwardOptimizer(
        config=config,
        n_windows=3,
        in_sample_ratio=0.7,
        opt_metric='profit_factor'
    )

    results = []

    # 2. Định nghĩa các cặp và tham số cho 3 chiến lược
    strategy_tests = [
        {
            "name": "TrendFollowing (AQR Momentum)",
            "symbol": "EURUSD",
            "factory": lambda p: TrendFollowingStrategy(
                fast_period=p['fast'],
                slow_period=p['slow'],
                atr_period=p.get('atr', 10),
                min_atr_threshold=Decimal('0.00001'),
                max_atr_threshold=Decimal('500.0')
            ),
            "grid": [
                {"fast": 5, "slow": 15, "atr": 10},
                {"fast": 9, "slow": 21, "atr": 14},
                {"fast": 7, "slow": 25, "atr": 12}
            ]
        },
        {
            "name": "DonchianBreakout",
            "symbol": "BTCUSD",
            "factory": lambda p: DonchianBreakoutStrategy(
                period=p['period'],
                atr_period=p.get('atr', 10)
            ),
            "grid": [
                {"period": 10, "atr": 10},
                {"period": 15, "atr": 14},
                {"period": 20, "atr": 14}
            ]
        },
        {
            "name": "BollingerMeanReversion (John Bollinger Rules)",
            "symbol": "XAUUSD",
            "factory": lambda p: BollingerMeanReversionStrategy(
                bb_period=p['bb_period'],
                rsi_period=p['rsi_period'],
                rsi_oversold=Decimal('35'),
                rsi_overbought=Decimal('65')
            ),
            "grid": [
                {"bb_period": 10, "rsi_period": 10},
                {"bb_period": 14, "rsi_period": 14},
                {"bb_period": 20, "rsi_period": 14}
            ]
        },
        {
            "name": "TrendFollowing (USDJPY Currency Adjusted)",
            "symbol": "USDJPY",
            "factory": lambda p: TrendFollowingStrategy(
                fast_period=p['fast'],
                slow_period=p['slow'],
                atr_period=p.get('atr', 10),
                min_atr_threshold=Decimal('0.00001'),
                max_atr_threshold=Decimal('500.0')
            ),
            "grid": [
                {"fast": 5, "slow": 15, "atr": 10},
                {"fast": 9, "slow": 21, "atr": 14}
            ]
        }
    ]

    for item in strategy_tests:
        sym = item['symbol']
        spec = SYMBOLS.get(sym, {"contract": 100000, "digits": 5, "pip": 0.0001})

        # Nạp dữ liệu nến (tổng hợp 300 nến đủ cho 3 cửa sổ trượt)
        bars = store.load_synthetic_bars(sym, count=300, timeframe='M15')

        res = optimizer.run(
            bars=bars,
            strategy_factory=item['factory'],
            param_grid=item['grid'],
            symbol=sym,
            contract_size=Decimal(str(spec['contract'])),
            digits=spec['digits'],
            tick_value=Decimal('1.0'),
            strategy_name=item['name']
        )
        results.append(res)
        print(f"Hoàn tất Walk-Forward: {item['name']} trên {sym} -> WFE = {res.overall_wfe}%, Verdict = {res.verdict}")

    # 3. Xuất báo cáo Markdown
    report_content = generate_walk_forward_report(results, output_path=Path(output_path))
    print(f"\nĐã xuất báo cáo Walk-Forward ra: {output_path}")

    # Dọn dẹp DB tạm
    if db_path.exists():
        try:
            db_path.unlink()
        except Exception:
            pass

    return results, report_content


if __name__ == "__main__":
    run_comprehensive_walk_forward()
