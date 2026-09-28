"""Lucky Trade AI — Walk-Forward Analysis Framework.

Thực hiện phân tích Walk-Forward (In-Sample vs Out-of-Sample) theo chuẩn Robert Pardo:
1. Chia chuỗi dữ liệu nến thành các cửa sổ cuốn chiếu (Rolling/Anchored Windows).
2. Tối ưu hóa tham số chiến lược trên tập In-Sample (IS).
3. Kiểm định mù bộ tham số tối ưu đó trên tập Out-of-Sample (OOS) kế tiếp chưa từng thấy.
4. Đo lường Walk-Forward Efficiency Ratio (WFE):
   WFE = (OOS Annualized PnL / IS Annualized PnL) * 100% hoặc OOS Profit Factor / IS Profit Factor.
   - WFE >= 50%: Robust (Bền vững, ít bị overfit)
   - 30% <= WFE < 50%: Moderate (Trung bình, cần thận trọng)
   - WFE < 30%: Overfitted (Quá khớp dữ liệu, nguy cơ cao khi trade thật)
"""
from datetime import datetime, timezone
from dataclasses import dataclass, field
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
from typing import List, Dict, Any, Optional, Callable, Tuple
import logging

from app.backtest.engine import BacktestEngine, BacktestConfig, BacktestResult
from app.backtest.report import format_money, format_percent, format_number

logger = logging.getLogger('lucky.walk_forward')


@dataclass
class WalkForwardWindow:
    window_id: int
    is_bars_count: int
    oos_bars_count: int
    best_params: Dict[str, Any]
    is_result: BacktestResult
    oos_result: BacktestResult
    wfe: Decimal  # Walk-Forward Efficiency (%)


@dataclass
class WalkForwardResult:
    strategy_name: str
    symbol: str
    windows: List[WalkForwardWindow]
    overall_wfe: Decimal
    is_total_pnl: Decimal
    oos_total_pnl: Decimal
    oos_total_trades: int
    oos_win_rate: Decimal
    oos_profit_factor: Decimal
    oos_max_drawdown: Decimal
    oos_max_drawdown_pct: Decimal
    verdict: str  # 'ROBUST', 'MODERATE', 'OVERFITTED'

    def to_dict(self) -> Dict[str, Any]:
        return {
            "strategy_name": self.strategy_name,
            "symbol": self.symbol,
            "overall_wfe": str(self.overall_wfe),
            "is_total_pnl": str(self.is_total_pnl),
            "oos_total_pnl": str(self.oos_total_pnl),
            "oos_total_trades": self.oos_total_trades,
            "oos_win_rate": str(self.oos_win_rate),
            "oos_profit_factor": str(self.oos_profit_factor),
            "oos_max_drawdown": str(self.oos_max_drawdown),
            "oos_max_drawdown_pct": str(self.oos_max_drawdown_pct),
            "verdict": self.verdict,
            "windows_count": len(self.windows)
        }


class WalkForwardOptimizer:
    """Khung tối ưu và kiểm định Walk-Forward."""

    def __init__(
        self,
        config: Optional[BacktestConfig] = None,
        n_windows: int = 3,
        in_sample_ratio: float = 0.7,
        opt_metric: str = 'profit_factor',  # 'profit_factor', 'net_profit', 'win_rate'
        anchored: bool = False
    ):
        self.config = config or BacktestConfig()
        self.n_windows = max(2, n_windows)
        self.in_sample_ratio = in_sample_ratio
        self.opt_metric = opt_metric
        self.anchored = anchored

    def split_windows(self, bars: List[Any]) -> List[Tuple[List[Any], List[Any]]]:
        """
        Chia chuỗi nến thành N cửa sổ (IS và OOS).
        """
        total_bars = len(bars)
        if total_bars < 50:
            raise ValueError(f"Số lượng nến ({total_bars}) quá ít để chia {self.n_windows} cửa sổ Walk-Forward.")

        # Kích thước mỗi block
        # Ví dụ total 100 nến, 3 windows:
        # Window i: IS chiếm in_sample_ratio, OOS phần tiếp theo
        window_size = total_bars // (self.n_windows + 1)
        is_len = int(window_size * 2 * self.in_sample_ratio)
        oos_len = max(10, window_size)

        windows = []
        for i in range(self.n_windows):
            if self.anchored:
                # Anchored: Điểm bắt đầu IS luôn là 0
                is_start = 0
                is_end = is_len + i * oos_len
            else:
                # Rolling: Cửa sổ trượt về phía trước
                is_start = i * oos_len
                is_end = is_start + is_len

            oos_start = is_end
            oos_end = min(total_bars, oos_start + oos_len)

            if oos_start >= total_bars or is_end > total_bars:
                break

            is_chunk = bars[is_start:is_end]
            oos_chunk = bars[oos_start:oos_end]
            if len(is_chunk) >= 15 and len(oos_chunk) >= 5:
                windows.append((is_chunk, oos_chunk))

        if not windows:
            # Fallback đơn giản: 70% IS, 30% OOS
            split_idx = int(total_bars * self.in_sample_ratio)
            windows.append((bars[:split_idx], bars[split_idx:]))

        return windows

    def _score_result(self, res: BacktestResult) -> Decimal:
        """Chấm điểm kết quả backtest theo tiêu chí tối ưu đã chọn."""
        if self.opt_metric == 'profit_factor':
            return res.profit_factor
        elif self.opt_metric == 'net_profit':
            return res.net_profit
        elif self.opt_metric == 'win_rate':
            return res.win_rate
        return res.net_profit

    def run(
        self,
        bars: List[Any],
        strategy_factory: Callable[[Dict[str, Any]], Any],
        param_grid: List[Dict[str, Any]],
        symbol: str = 'EURUSD',
        contract_size: Decimal = Decimal('100000'),
        digits: int = 5,
        tick_value: Decimal = Decimal('1'),
        strategy_name: Optional[str] = None
    ) -> WalkForwardResult:
        """
        Chạy quy trình Walk-Forward đầy đủ:
        1. Phân chia cửa sổ.
        2. Tối ưu tham số trên In-Sample.
        3. Kiểm định tham số đã chọn trên Out-of-Sample.
        4. Tổng hợp số liệu và đánh giá độ bền vững (Robustness).
        """
        strat_title = strategy_name or "Strategy"
        splits = self.split_windows(bars)
        wf_windows: List[WalkForwardWindow] = []

        is_profits: List[Decimal] = []
        oos_profits: List[Decimal] = []
        all_oos_trades = []
        all_oos_drawdowns = []

        for idx, (is_bars, oos_bars) in enumerate(splits, 1):
            # 1. Tìm bộ tham số tốt nhất trên In-Sample
            best_score = Decimal('-999999999')
            best_params = param_grid[0] if param_grid else {}
            best_is_result = None

            for params in param_grid:
                strat = strategy_factory(params)
                engine = BacktestEngine(self.config)
                is_res = engine.run(
                    bars=is_bars,
                    strategy_fn=strat,
                    symbol=symbol,
                    contract_size=contract_size,
                    digits=digits,
                    tick_value=tick_value,
                    strategy_name=strat_title
                )
                score = self._score_result(is_res)
                if score > best_score:
                    best_score = score
                    best_params = params
                    best_is_result = is_res

            # 2. Chạy Out-of-Sample với bộ tham số tốt nhất đó
            best_strat = strategy_factory(best_params)
            oos_engine = BacktestEngine(self.config)
            oos_res = oos_engine.run(
                bars=oos_bars,
                strategy_fn=best_strat,
                symbol=symbol,
                contract_size=contract_size,
                digits=digits,
                tick_value=tick_value,
                strategy_name=strat_title
            )

            # 3. Tính Walk-Forward Efficiency (WFE) cho cửa sổ này
            # WFE tính bằng tỷ số lợi nhuận chuẩn hóa hoặc Profit Factor
            is_bar_cnt = Decimal(str(len(is_bars)))
            oos_bar_cnt = Decimal(str(len(oos_bars)))
            
            # Tỷ suất lợi nhuận trên mỗi nến
            is_rate = (best_is_result.net_profit / is_bar_cnt) if is_bar_cnt > 0 else Decimal('0')
            oos_rate = (oos_res.net_profit / oos_bar_cnt) if oos_bar_cnt > 0 else Decimal('0')

            wfe = Decimal('0')
            if is_rate > Decimal('0'):
                wfe = (oos_rate / is_rate) * Decimal('100')
            elif is_rate == Decimal('0') and oos_rate >= Decimal('0'):
                wfe = Decimal('100')
            else:
                # IS lỗ
                wfe = Decimal('0')

            wfe = max(Decimal('0'), min(Decimal('200.0'), wfe))

            wf_windows.append(WalkForwardWindow(
                window_id=idx,
                is_bars_count=len(is_bars),
                oos_bars_count=len(oos_bars),
                best_params=best_params,
                is_result=best_is_result,
                oos_result=oos_res,
                wfe=round(wfe, 2)
            ))

            is_profits.append(best_is_result.net_profit)
            oos_profits.append(oos_res.net_profit)
            all_oos_trades.extend(oos_res.trades)
            all_oos_drawdowns.append(oos_res.max_drawdown)

        # 4. Tổng hợp toàn bộ giai đoạn OOS
        total_is_pnl = sum(is_profits, Decimal('0'))
        total_oos_pnl = sum(oos_profits, Decimal('0'))
        total_oos_trades_count = len(all_oos_trades)
        
        oos_winning_trades = sum(1 for t in all_oos_trades if t.net_pnl > Decimal('0'))
        oos_win_rate = (Decimal(str(oos_winning_trades)) / Decimal(str(total_oos_trades_count)) * Decimal('100')) if total_oos_trades_count > 0 else Decimal('0')

        oos_gross_profit = sum((t.net_pnl for t in all_oos_trades if t.net_pnl > Decimal('0')), Decimal('0'))
        oos_gross_loss = sum((t.net_pnl for t in all_oos_trades if t.net_pnl <= Decimal('0')), Decimal('0'))
        if oos_gross_loss != Decimal('0'):
            oos_pf = oos_gross_profit / abs(oos_gross_loss)
        elif oos_gross_profit > Decimal('0'):
            oos_pf = Decimal('99.99')
        else:
            oos_pf = Decimal('0')

        overall_wfe = sum((w.wfe for w in wf_windows), Decimal('0')) / Decimal(str(len(wf_windows))) if wf_windows else Decimal('0')
        max_oos_dd = max(all_oos_drawdowns) if all_oos_drawdowns else Decimal('0')
        max_oos_dd_pct = (max_oos_dd / self.config.initial_balance * Decimal('100')) if self.config.initial_balance > 0 else Decimal('0')

        # Đánh giá Verdict
        if overall_wfe >= Decimal('50.0') and total_oos_pnl > Decimal('0'):
            verdict = "ROBUST"
        elif overall_wfe >= Decimal('30.0') and total_oos_pnl >= Decimal('0'):
            verdict = "MODERATE"
        else:
            verdict = "OVERFITTED"

        return WalkForwardResult(
            strategy_name=strat_title,
            symbol=symbol,
            windows=wf_windows,
            overall_wfe=round(overall_wfe, 2),
            is_total_pnl=round(total_is_pnl, 2),
            oos_total_pnl=round(total_oos_pnl, 2),
            oos_total_trades=total_oos_trades_count,
            oos_win_rate=round(oos_win_rate, 2),
            oos_profit_factor=round(oos_pf, 2),
            oos_max_drawdown=round(max_oos_dd, 2),
            oos_max_drawdown_pct=round(max_oos_dd_pct, 2),
            verdict=verdict
        )


def generate_walk_forward_report(results: List[WalkForwardResult], output_path: Optional[Path] = None) -> str:
    """Tạo báo cáo chi tiết Markdown tổng hợp kết quả Walk-Forward gửi Victor."""
    lines = [
        "# BÁO CÁO PHÂN TÍCH WALK-FORWARD & ĐỘ BỀN VỮNG CHIẾN LƯỢC",
        "",
        "> [!IMPORTANT]",
        "> **Nguyên tắc thẩm định Lucky Trade AI (PLAN.md):**",
        "> Kết quả backtest và mô phỏng quá khứ **KHÔNG** đại diện hoặc đảm bảo cho lợi nhuận thực tế.",
        "> Mục đích của Walk-Forward Analysis là phát hiện nguy cơ **Quá khớp (Overfitting)** và đo lường độ suy giảm hiệu suất khi chuyển từ dữ liệu huấn luyện (In-Sample) sang dữ liệu thị trường chưa từng thấy (Out-of-Sample).",
        "",
        "## 1. Bảng Tổng Hợp Độ Bền Vững (Summary Matrix)",
        "",
        "| Chiến lược | Sản phẩm | WFE (%) | Đánh giá | Lợi nhuận OOS | Win Rate OOS | Profit Factor OOS | Max DD OOS |",
        "|---|---|---|---|---|---|---|---|"
    ]

    for r in results:
        verdict_badge = {
            "ROBUST": "🟢 **Bền vững (Robust)**",
            "MODERATE": "🟡 **Trung bình (Moderate)**",
            "OVERFITTED": "🔴 **Quá khớp (Overfitted)**"
        }.get(r.verdict, r.verdict)

        lines.append(
            f"| {r.strategy_name} | {r.symbol} | **{r.overall_wfe}%** | {verdict_badge} | "
            f"{format_money(r.oos_total_pnl)} | {r.oos_win_rate}% | {r.oos_profit_factor} | {format_money(r.oos_max_drawdown)} ({r.oos_max_drawdown_pct}%) |"
        )

    lines.extend([
        "",
        "---",
        "",
        "## 2. Chi Tiết Từng Cửa Sổ (Window-by-Window Breakdown)",
        ""
    ])

    for r in results:
        lines.append(f"### Chiến lược: `{r.strategy_name}` — Cặp: `{r.symbol}`")
        lines.append(f"- **Hiệu suất tổng thể WFE:** `{r.overall_wfe}%` | **Phán quyết:** `{r.verdict}`")
        lines.append(f"- **Tổng PnL In-Sample:** `{format_money(r.is_total_pnl)}` | **Tổng PnL Out-of-Sample:** `{format_money(r.oos_total_pnl)}`")
        lines.append("")
        lines.append("| Cửa sổ | Số nến IS / OOS | Tham số tối ưu | PnL In-Sample | PnL Out-of-Sample | WFE (%) | Lệnh OOS |")
        lines.append("|---|---|---|---|---|---|---|")

        for w in r.windows:
            param_str = ", ".join(f"{k}={v}" for k, v in w.best_params.items())
            lines.append(
                f"| #{w.window_id} | {w.is_bars_count} / {w.oos_bars_count} | `{param_str}` | "
                f"{format_money(w.is_result.net_profit)} | {format_money(w.oos_result.net_profit)} | **{w.wfe}%** | {w.oos_result.total_trades} |"
            )
        lines.append("")

    lines.extend([
        "---",
        "",
        "## 3. Khuyến Nghị Vận Hành Cho Victor (Lucky CEO)",
        "",
        "1. **Chiến lược đạt chuẩn ROBUST (WFE >= 50%)**: Đủ điều kiện đưa vào danh sách chạy thử nghiệm trên tài khoản Demo Exness qua cơ chế Bán tự động (Semi-Auto).",
        "2. **Chiến lược MODERATE (30% <= WFE < 50%)**: Cần theo dõi thêm biên độ biến động và kết hợp với bộ lọc ATR / Market State Classifier trước khi kích hoạt.",
        "3. **Chiến lược OVERFITTED (WFE < 30%)**: Tuyệt đối **KHÔNG** giao dịch bằng tiền thật; cần tái cơ cấu quy tắc vào lệnh hoặc mở rộng khung thời gian nến (từ M15 lên H1/H4).",
        "",
        f"_Báo cáo được khởi tạo tự động bởi Lucky Trade Walk-Forward Engine vào lúc {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')} (UTC)._"
    ])

    content = "\n".join(lines)
    if output_path:
        p = Path(output_path)
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(content, encoding='utf-8')

    return content
