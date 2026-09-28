"""Backtest report generation for Lucky Trade.

Generates:
- Console summary (Vietnamese)
- JSON export for UI consumption
- CSV trade journal
"""
from decimal import Decimal
from dataclasses import asdict, is_dataclass
from pathlib import Path
from typing import List, Dict, Optional, Any
import csv
import io
import json
from datetime import datetime


class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return str(obj)
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)


def format_money(value: Any) -> str:
    """Format money value with $ and commas."""
    if value is None:
        return "$0.00"
    try:
        val = float(value)
        if val < 0:
            return f"-${abs(val):,.2f}"
        return f"${val:,.2f}"
    except (ValueError, TypeError):
        return "$0.00"


def format_percent(value: Any) -> str:
    if value is None:
        return "0.0%"
    try:
        return f"{float(value):.2f}%"
    except (ValueError, TypeError):
        return "0.0%"


def format_number(value: Any, decimals: int = 2) -> str:
    if value is None:
        return "0.00"
    try:
        return f"{float(value):.{decimals}f}"
    except (ValueError, TypeError):
        return "0.00"


def console_summary(result: Any) -> str:
    """Generate Vietnamese console summary of backtest result."""
    
    # Extract fields safely (works with BacktestResult dataclass, dict, or arbitrary objects)
    def get_val(obj, key, default=None):
        if isinstance(obj, dict):
            return obj.get(key, default)
        return getattr(obj, key, default)

    strategy = get_val(result, 'strategy', get_val(result, 'strategy_name', 'Unknown'))
    symbols = get_val(result, 'symbols', [])
    symbol = symbols[0] if (symbols and isinstance(symbols, list)) else get_val(result, 'symbol', 'Unknown')
    
    start_time = get_val(result, 'start_time')
    end_time = get_val(result, 'end_time')
    if isinstance(start_time, (int, float)) and start_time > 0:
        start_time = datetime.fromtimestamp(start_time).strftime('%Y-%m-%d %H:%M')
    elif isinstance(start_time, datetime):
        start_time = start_time.strftime('%Y-%m-%d %H:%M')
    else:
        start_time = "N/A"

    if isinstance(end_time, (int, float)) and end_time > 0:
        end_time = datetime.fromtimestamp(end_time).strftime('%Y-%m-%d %H:%M')
    elif isinstance(end_time, datetime):
        end_time = end_time.strftime('%Y-%m-%d %H:%M')
    else:
        end_time = "N/A"

    # Support flat BacktestResult attributes as well as nested metrics dict
    metrics = get_val(result, 'metrics', {})
    
    total_trades = get_val(result, 'total_trades', get_val(metrics, 'total_trades', 0))
    win_count = get_val(result, 'winning_trades', get_val(metrics, 'win_count', 0))
    loss_count = get_val(result, 'losing_trades', get_val(metrics, 'loss_count', 0))
    win_rate = get_val(result, 'win_rate', get_val(metrics, 'win_rate', 0.0))
    
    net_profit = get_val(result, 'net_profit', get_val(metrics, 'net_profit', Decimal('0')))
    profit_factor = get_val(result, 'profit_factor', get_val(metrics, 'profit_factor', 0.0))
    
    max_dd_amt = get_val(result, 'max_drawdown', get_val(metrics, 'max_drawdown_amount', Decimal('0')))
    max_dd_pct = get_val(result, 'max_drawdown_pct', get_val(metrics, 'max_drawdown_percent', 0.0))
    
    sharpe = get_val(result, 'sharpe_ratio', get_val(metrics, 'sharpe_ratio', None))
    sharpe_str = format_number(sharpe) if sharpe is not None else "N/A"
    
    avg_trade = get_val(result, 'avg_trade', get_val(metrics, 'avg_trade_net', Decimal('0')))
    avg_win = get_val(result, 'avg_winner', get_val(metrics, 'avg_win_net', Decimal('0')))
    avg_loss = get_val(result, 'avg_loser', get_val(metrics, 'avg_loss_net', Decimal('0')))
    
    avg_bars = get_val(result, 'avg_bars_held', get_val(metrics, 'avg_bars_held', 0.0))

    lines = [
        "══════════════════════════════════════════",
        f"BÁO CÁO BACKTEST — [{strategy}] — [{symbol}]",
        "══════════════════════════════════════════",
        f"Thời gian: {start_time} → {end_time}",
        f"Số lệnh: {total_trades} (Thắng: {win_count} | Thua: {loss_count})",
        f"Tỷ lệ thắng: {format_percent(win_rate)}",
        f"Lợi nhuận ròng: {format_money(net_profit)}",
        f"Profit Factor: {format_number(profit_factor)}",
        f"Max Drawdown: {format_money(max_dd_amt)} ({format_percent(max_dd_pct)})",
        f"Sharpe Ratio: {sharpe_str}",
        f"Trung bình/lệnh: {format_money(avg_trade)}",
        f"Trung bình thắng: {format_money(avg_win)} | Trung bình thua: {format_money(avg_loss)}",
        f"TB số nến giữ lệnh: {format_number(avg_bars, 1)}",
        "──────────────────────────────────────────",
        "⚠️ Kết quả backtest KHÔNG đại diện lợi nhuận thật.",
        "   Chưa bao gồm: slippage thật, tin tức, thanh khoản.",
        "══════════════════════════════════════════"
    ]
    return "\n".join(lines)


def _sanitize_csv(value: Any) -> Any:
    """Prepend ' to text fields (CWE-1236 CSV injection prevention)."""
    if isinstance(value, str) and value.startswith(('=', '+', '-', '@', '\t', '\r')):
        return f"'{value}"
    return value


def trade_journal_csv(result: Any, filepath: Optional[Path] = None) -> str:
    """Export trade journal as CSV."""
    def get_val(obj, key, default=None):
        if isinstance(obj, dict):
            return obj.get(key, default)
        return getattr(obj, key, default)

    trades = get_val(result, 'trades', [])
    
    columns = [
        'id', 'symbol', 'side', 'volume', 'entry_price', 'entry_time',
        'exit_price', 'exit_time', 'sl', 'tp', 'gross_pnl', 'commission',
        'swap', 'net_pnl', 'exit_reason', 'strategy', 'bars_held',
        'max_favorable', 'max_adverse'
    ]

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(columns)

    for trade in trades:
        row = []
        for col in columns:
            val = get_val(trade, col)
            if isinstance(val, datetime):
                val = val.isoformat()
            elif isinstance(val, Decimal):
                val = str(val)
            row.append(_sanitize_csv(val))
        writer.writerow(row)

    csv_content = output.getvalue()
    
    if filepath:
        filepath = Path(filepath)
        filepath.parent.mkdir(parents=True, exist_ok=True)
        filepath.write_text(csv_content, encoding='utf-8')
        
    return csv_content


def to_json(result: Any, filepath: Optional[Path] = None) -> str:
    """Export full result as JSON for UI."""
    if is_dataclass(result):
        data = asdict(result)
    elif isinstance(result, dict):
        data = result
    else:
        # fallback for arbitrary objects
        data = getattr(result, '__dict__', {})

    json_content = json.dumps(data, cls=DecimalEncoder, indent=2, ensure_ascii=False)
    
    if filepath:
        filepath = Path(filepath)
        filepath.parent.mkdir(parents=True, exist_ok=True)
        filepath.write_text(json_content, encoding='utf-8')
        
    return json_content


def compare_strategies(results: List[Any], output_path: Optional[Path] = None) -> str:
    """Compare multiple backtest results side-by-side."""
    if not results:
        return "No results to compare."

    def get_val(obj, key, default=None):
        if isinstance(obj, dict):
            return obj.get(key, default)
        return getattr(obj, key, default)

    lines = [
        "════════════════════════════════════════════════════════════════════════════",
        "SO SÁNH CHIẾN LƯỢC BACKTEST",
        "════════════════════════════════════════════════════════════════════════════"
    ]
    
    headers = [
        "Strategy", "Symbol", "Trades", "Win%", "Net Profit", 
        "PF", "Max DD", "Sharpe", "Avg/Trade"
    ]
    
    header_format = "{:<20} | {:<8} | {:<6} | {:<6} | {:<12} | {:<5} | {:<12} | {:<6} | {:<10}"
    lines.append(header_format.format(*headers))
    lines.append("-" * 76)

    for res in results:
        strat = get_val(res, 'strategy', get_val(res, 'strategy_name', 'Unknown'))[:20]
        symbols = get_val(res, 'symbols', [])
        sym = symbols[0] if (symbols and isinstance(symbols, list)) else get_val(res, 'symbol', 'Unknown')[:8]
        metrics = get_val(res, 'metrics', {})
        
        trades = get_val(res, 'total_trades', get_val(metrics, 'total_trades', 0))
        win_rate = get_val(res, 'win_rate', get_val(metrics, 'win_rate', 0.0))
        net_profit = get_val(res, 'net_profit', get_val(metrics, 'net_profit', Decimal('0')))
        pf = get_val(res, 'profit_factor', get_val(metrics, 'profit_factor', 0.0))
        max_dd = get_val(res, 'max_drawdown', get_val(metrics, 'max_drawdown_amount', Decimal('0')))
        sharpe = get_val(res, 'sharpe_ratio', get_val(metrics, 'sharpe_ratio', None))
        sharpe_str = format_number(sharpe, 2) if sharpe is not None else "N/A"
        avg_trade = get_val(res, 'avg_trade', get_val(metrics, 'avg_trade_net', Decimal('0')))

        row = header_format.format(
            strat,
            sym,
            trades,
            format_percent(win_rate),
            format_money(net_profit),
            format_number(pf, 2),
            format_money(max_dd),
            sharpe_str,
            format_money(avg_trade)
        )
        lines.append(row)

    lines.append("────────────────────────────────────────────────────────────────────────────")
    lines.append("⚠️ Kết quả backtest KHÔNG đại diện lợi nhuận thật.")
    lines.append("════════════════════════════════════════════════════════════════════════════")
    
    content = "\n".join(lines)
    
    if output_path:
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(content, encoding='utf-8')
        
    return content


def equity_curve_csv(result: Any, filepath: Optional[Path] = None) -> str:
    """Export equity curve as CSV for charting."""
    def get_val(obj, key, default=None):
        if isinstance(obj, dict):
            return obj.get(key, default)
        return getattr(obj, key, default)

    equity_curve = get_val(result, 'equity_curve', [])
    
    # Assuming equity_curve is a list of dicts with 'time' and 'equity'
    columns = ['time', 'equity']
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(columns)
    
    for point in equity_curve:
        t = get_val(point, 'time')
        eq = get_val(point, 'equity')
        
        if isinstance(t, datetime):
            t = t.isoformat()
        if isinstance(eq, Decimal):
            eq = str(eq)
            
        writer.writerow([_sanitize_csv(t), _sanitize_csv(eq)])

    csv_content = output.getvalue()
    
    if filepath:
        filepath = Path(filepath)
        filepath.parent.mkdir(parents=True, exist_ok=True)
        filepath.write_text(csv_content, encoding='utf-8')
        
    return csv_content
