"""Backtest engine for Lucky Trade strategies.

Key principles:
- Decimal math for ALL financial calculations
- No look-ahead bias: strategies only see data up to current bar
- Configurable costs: spread, commission, swap
- Walk-forward support: split data into in-sample / out-of-sample
- Detailed trade journal for audit
"""
from decimal import Decimal, ROUND_HALF_UP, getcontext
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import List, Optional, Dict, Callable, Any
import json
from pathlib import Path

# Set decimal precision for financial calculations
getcontext().prec = 28


@dataclass
class Signal:
    """Trading signal from a strategy.
    Tín hiệu giao dịch từ chiến lược."""
    symbol: str
    side: str           # 'BUY' or 'SELL'
    entry: Decimal      # Entry price
    sl: Decimal         # Stop loss
    tp: Decimal         # Take profit
    volume: Decimal     # Lot size
    reason: str         # Human-readable explanation
    strategy: str       # Strategy name
    strategy_version: str
    bar_time: int       # Timestamp of the bar that generated this signal
    metadata: Dict = field(default_factory=dict)  # Extra data (indicators etc.)


@dataclass 
class Trade:
    """Completed trade result.
    Kết quả giao dịch đã đóng."""
    id: int
    symbol: str
    side: str
    volume: Decimal
    entry_price: Decimal
    entry_time: int
    exit_price: Decimal
    exit_time: int
    sl: Decimal
    tp: Decimal
    gross_pnl: Decimal      # Before costs
    commission: Decimal
    swap: Decimal
    net_pnl: Decimal        # After all costs
    exit_reason: str        # 'sl', 'tp', 'signal_exit', 'end_of_data'
    strategy: str
    bars_held: int          # Number of bars position was open
    max_favorable: Decimal  # Max favorable excursion
    max_adverse: Decimal    # Max adverse excursion


@dataclass
class BacktestConfig:
    """Configuration for a backtest run.
    Cấu hình cho một lần chạy backtest."""
    initial_balance: Decimal = Decimal('10000')
    commission_per_lot: Decimal = Decimal('7.0')  # Round-trip
    swap_per_lot_per_day: Decimal = Decimal('0')  # Daily swap cost
    max_positions: int = 5
    max_risk_per_trade_pct: Decimal = Decimal('1.0')
    max_daily_loss_pct: Decimal = Decimal('3.0')
    slippage_points: int = 2  # Simulated slippage
    # Contract specifications (populated from mt5_discovery)
    contract_specs: Dict = field(default_factory=dict)


@dataclass
class BacktestResult:
    """Summary of a completed backtest.
    Tổng hợp kết quả backtest."""
    config: BacktestConfig
    trades: List[Trade]
    equity_curve: List[Dict]  # [{time, equity, balance, drawdown}]
    # Performance metrics
    total_trades: int
    winning_trades: int
    losing_trades: int
    win_rate: Decimal
    gross_profit: Decimal
    gross_loss: Decimal
    net_profit: Decimal
    profit_factor: Decimal    # gross_profit / abs(gross_loss)
    max_drawdown: Decimal     # Maximum peak-to-trough drawdown
    max_drawdown_pct: Decimal
    sharpe_ratio: Optional[Decimal]  # Annualized if enough data
    avg_trade: Decimal
    avg_winner: Decimal
    avg_loser: Decimal
    avg_bars_held: Decimal
    start_time: int
    end_time: int
    strategy: str
    symbols: List[str]


class BacktestEngine:
    """Event-driven backtester processing bars sequentially.
    Trình mô phỏng theo sự kiện xử lý tuần tự từng nến."""
    
    def __init__(self, config: BacktestConfig):
        self.config = config
        self.balance = config.initial_balance
        self.equity = config.initial_balance
        self.peak_equity = config.initial_balance
        self.positions: List[Dict] = []  # Open positions
        self.trades: List[Trade] = []    # Closed trades
        self.equity_curve: List[Dict] = []
        self.trade_counter = 0
        self.daily_pnl = Decimal('0')
        self.current_day = None
        self.halted = False
    
    def run(self, bars: List, strategy_fn: Callable, symbol: str, 
            contract_size: Decimal = Decimal('100000'),
            digits: int = 5,
            tick_value: Decimal = Decimal('1'),
            strategy_name: Optional[str] = None) -> BacktestResult:
        """Run backtest over bars using strategy_fn.
        Chạy backtest trên dữ liệu nến bằng hàm strategy_fn.
        
        strategy_fn(bars_so_far: List) -> Optional[Signal]
        Called for each new bar with all bars up to that point (no look-ahead).
        """
        strat_title = strategy_name or getattr(strategy_fn, 'name', getattr(strategy_fn, '__name__', 'Unknown'))
        # For each bar:
        # 1. Check SL/TP on open positions using OHLC (conservative: if both hit, SL first)
        # 2. Update equity curve
        # 3. Check daily loss limit
        # 4. Call strategy_fn with bars[:i+1]
        # 5. If signal, validate and open position
        # 6. At end, close all remaining positions at last close
        
        if not bars:
            return self._compute_metrics("Unknown", [symbol])

        for i, bar in enumerate(bars):
            if self.halted:
                break
                
            bar_time = bar['time']
            dt = datetime.fromtimestamp(bar_time, tz=timezone.utc)
            day_str = dt.strftime('%Y-%m-%d')
            
            if self.current_day != day_str:
                self.current_day = day_str
                self.daily_pnl = Decimal('0')
                
            # 1. Check SL/TP
            # Iterate backwards to allow safe removal
            for pos in reversed(self.positions):
                self._update_mae_mfe(pos, bar)
                exit_price, exit_reason = self._check_sl_tp(pos, bar, contract_size, digits, tick_value)
                if exit_price is not None:
                    self._close_position(pos, exit_price, bar_time, exit_reason, contract_size, tick_value)
            
            # 2. Update equity curve
            self.equity = self.balance
            for pos in self.positions:
                side = pos['side']
                entry = pos['entry']
                volume = pos['volume']
                current_price = Decimal(str(bar['close']))
                pnl = self._calculate_pnl(side, entry, current_price, volume, contract_size, tick_value, pos.get('symbol', ''))
                self.equity += pnl - pos['commission'] - pos['swap']
                
            if self.equity > self.peak_equity:
                self.peak_equity = self.equity
                
            drawdown = self.peak_equity - self.equity
            
            self.equity_curve.append({
                'time': bar_time,
                'equity': self.equity,
                'balance': self.balance,
                'drawdown': drawdown
            })
            
            # 3. Check daily loss limit
            daily_loss_limit = self.balance * self.config.max_daily_loss_pct / Decimal('100')
            if self.daily_pnl <= -daily_loss_limit:
                self.halted = True
                # Print logic could be omitted or logged properly
                continue
                
            # 4 & 5. Strategy and Signal
            bars_so_far = bars[:i+1]
            signal = strategy_fn(bars_so_far)
            
            if signal and len(self.positions) < self.config.max_positions:
                self._open_position(signal, bar, contract_size, digits, tick_value)
                
            # Update hold times
            for pos in self.positions:
                pos['bars_held'] += 1

        # 6. At end, close all remaining positions at last close
        if bars:
            last_bar = bars[-1]
            last_time = last_bar['time']
            last_close = Decimal(str(last_bar['close']))
            
            for pos in reversed(self.positions):
                self._close_position(pos, last_close, last_time, 'end_of_data', contract_size, tick_value)
                
        strategy_name = self.trades[0].strategy if self.trades else strat_title
        return self._compute_metrics(strategy_name, [symbol])
        
    def _update_mae_mfe(self, pos, bar):
        """Cập nhật MAE và MFE (Max Favorable/Adverse Excursion)."""
        high = Decimal(str(bar['high']))
        low = Decimal(str(bar['low']))
        entry = pos['entry']
        
        if pos['side'] == 'BUY':
            favorable = high - entry
            adverse = entry - low
        else:
            favorable = entry - low
            adverse = high - entry
            
        pos['max_favorable'] = max(pos['max_favorable'], favorable)
        pos['max_adverse'] = max(pos['max_adverse'], adverse)

    def _open_position(self, signal: Signal, bar, contract_size, digits, tick_value):
        """Open a new position from signal.
        Mở vị thế mới từ tín hiệu."""
        # Calculate slippage
        point = Decimal('10') ** -digits
        slippage = Decimal(str(self.config.slippage_points)) * point
        
        if signal.side == 'BUY':
            entry = signal.entry + slippage
        else:
            entry = signal.entry - slippage
            
        self.trade_counter += 1
        pos = {
            'id': self.trade_counter,
            'symbol': signal.symbol,
            'side': signal.side,
            'volume': signal.volume,
            'entry': entry,
            'entry_time': bar['time'],
            'sl': signal.sl,
            'tp': signal.tp,
            'commission': signal.volume * self.config.commission_per_lot,
            'swap': Decimal('0'),
            'strategy': signal.strategy,
            'bars_held': 0,
            'max_favorable': Decimal('0'),
            'max_adverse': Decimal('0')
        }
        self.positions.append(pos)

    def _check_sl_tp(self, pos, bar, contract_size, digits, tick_value):
        """Check if SL or TP is hit by this bar's OHLC.
        Kiểm tra xem SL hoặc TP có bị chạm không (chạm cả hai thì tính SL trước).
        Xử lý Gap: nếu mở cửa nhảy gap qua SL/TP, khớp lệnh ở giá mở cửa."""
        open_p = Decimal(str(bar['open']))
        high_p = Decimal(str(bar['high']))
        low_p  = Decimal(str(bar['low']))
        
        sl = pos['sl']
        tp = pos['tp']
        
        exit_price = None
        exit_reason = None
        
        if pos['side'] == 'BUY':
            # Check gap SL
            if open_p <= sl:
                return open_p, 'sl'
            # Check gap TP
            if open_p >= tp:
                return open_p, 'tp'
                
            # Both SL and TP within bar? Conservative: hit SL
            if low_p <= sl:
                exit_price = sl
                exit_reason = 'sl'
            elif high_p >= tp:
                exit_price = tp
                exit_reason = 'tp'
                
        elif pos['side'] == 'SELL':
            # Check gap SL
            if open_p >= sl:
                return open_p, 'sl'
            # Check gap TP
            if open_p <= tp:
                return open_p, 'tp'
                
            # Both SL and TP within bar? Conservative: hit SL
            if high_p >= sl:
                exit_price = sl
                exit_reason = 'sl'
            elif low_p <= tp:
                exit_price = tp
                exit_reason = 'tp'
                
        return exit_price, exit_reason

    def _close_position(self, pos, exit_price, exit_time, reason, contract_size, tick_value):
        """Close position and record trade.
        Đóng vị thế và lưu lịch sử giao dịch."""
        gross_pnl = self._calculate_pnl(pos['side'], pos['entry'], exit_price, pos['volume'], contract_size, tick_value, pos.get('symbol', ''))
        net_pnl = gross_pnl - pos['commission'] - pos['swap']
        
        trade = Trade(
            id=pos['id'],
            symbol=pos['symbol'],
            side=pos['side'],
            volume=pos['volume'],
            entry_price=pos['entry'],
            entry_time=pos['entry_time'],
            exit_price=exit_price,
            exit_time=exit_time,
            sl=pos['sl'],
            tp=pos['tp'],
            gross_pnl=gross_pnl,
            commission=pos['commission'],
            swap=pos['swap'],
            net_pnl=net_pnl,
            exit_reason=reason,
            strategy=pos['strategy'],
            bars_held=pos['bars_held'],
            max_favorable=pos['max_favorable'],
            max_adverse=pos['max_adverse']
        )
        self.trades.append(trade)
        self.positions.remove(pos)
        
        self.balance += net_pnl
        self.daily_pnl += net_pnl

    def _calculate_pnl(self, side, entry, exit_price, volume, contract_size, tick_value, symbol: str = ""):
        """Calculate P/L in account currency.
        Tính toán lợi nhuận/thua lỗ theo tiền tệ của tài khoản."""
        if side == 'BUY':
            diff = exit_price - entry
        else:
            diff = entry - exit_price
            
        raw = diff * contract_size * volume
        if symbol == 'USDJPY' and exit_price > Decimal('0'):
            return raw / exit_price
        return raw

    def _compute_metrics(self, strategy: str, symbols: List[str]) -> BacktestResult:
        """Compute all performance metrics from trade list.
        Tính toán tất cả các số liệu hiệu suất từ danh sách giao dịch."""
        total_trades = len(self.trades)
        winning_trades = sum(1 for t in self.trades if t.net_pnl > Decimal('0'))
        losing_trades = total_trades - winning_trades
        
        win_rate = Decimal('0')
        if total_trades > 0:
            win_rate = (Decimal(str(winning_trades)) / Decimal(str(total_trades))) * Decimal('100')
            
        gross_profit = sum((t.net_pnl for t in self.trades if t.net_pnl > Decimal('0')), Decimal('0'))
        gross_loss = sum((t.net_pnl for t in self.trades if t.net_pnl <= Decimal('0')), Decimal('0'))
        net_profit = gross_profit + gross_loss
        
        profit_factor = Decimal('0')
        if gross_loss != Decimal('0'):
            profit_factor = gross_profit / abs(gross_loss)
        elif gross_profit > Decimal('0'):
            profit_factor = Decimal('9999.99')
            
        max_drawdown = Decimal('0')
        max_drawdown_pct = Decimal('0')
        if self.equity_curve:
            max_drawdown = max(entry['drawdown'] for entry in self.equity_curve)
            if self.config.initial_balance > Decimal('0'):
                max_drawdown_pct = (max_drawdown / self.config.initial_balance) * Decimal('100')
                
        avg_trade = net_profit / Decimal(str(total_trades)) if total_trades > 0 else Decimal('0')
        avg_winner = gross_profit / Decimal(str(winning_trades)) if winning_trades > 0 else Decimal('0')
        avg_loser = gross_loss / Decimal(str(losing_trades)) if losing_trades > 0 else Decimal('0')
        avg_bars_held = Decimal(sum(t.bars_held for t in self.trades)) / Decimal(str(total_trades)) if total_trades > 0 else Decimal('0')
        
        start_time = self.equity_curve[0]['time'] if self.equity_curve else 0
        end_time = self.equity_curve[-1]['time'] if self.equity_curve else 0

        return BacktestResult(
            config=self.config,
            trades=self.trades,
            equity_curve=self.equity_curve,
            total_trades=total_trades,
            winning_trades=winning_trades,
            losing_trades=losing_trades,
            win_rate=win_rate,
            gross_profit=gross_profit,
            gross_loss=gross_loss,
            net_profit=net_profit,
            profit_factor=profit_factor,
            max_drawdown=max_drawdown,
            max_drawdown_pct=max_drawdown_pct,
            sharpe_ratio=None,
            avg_trade=avg_trade,
            avg_winner=avg_winner,
            avg_loser=avg_loser,
            avg_bars_held=avg_bars_held,
            start_time=start_time,
            end_time=end_time,
            strategy=strategy,
            symbols=symbols
        )
