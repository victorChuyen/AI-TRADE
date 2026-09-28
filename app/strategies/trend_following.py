from decimal import Decimal
from typing import List, Optional, Dict, Any
from app.strategies.base import BaseStrategy
from app.backtest.engine import Signal

def calculate_sma(prices: List[Decimal], period: int) -> Optional[Decimal]:
    """
    Tính Simple Moving Average (SMA).
    """
    if len(prices) < period:
        return None
    return sum(prices[-period:]) / Decimal(str(period))

def calculate_atr(bars: List[Dict[str, Any]], period: int) -> Optional[Decimal]:
    """
    Tính Average True Range (ATR) dựa trên Simple Moving Average của True Range.
    """
    if len(bars) < period + 1:
        return None
    
    trs = []
    # Cần period giá trị TR, nên lặp từ len(bars) - period đến len(bars)
    for i in range(len(bars) - period, len(bars)):
        curr_h = Decimal(str(bars[i]['high']))
        curr_l = Decimal(str(bars[i]['low']))
        prev_c = Decimal(str(bars[i-1]['close']))
        
        tr = max(
            curr_h - curr_l,
            abs(curr_h - prev_c),
            abs(curr_l - prev_c)
        )
        trs.append(tr)
        
    return sum(trs) / Decimal(str(period))

class TrendFollowingStrategy(BaseStrategy):
    """
    Chiến lược theo xu hướng (Trend Following).
    Dựa trên nền tảng nghiên cứu của AQR:
    - Bộ lọc xu hướng: Fast SMA cắt Slow SMA
    - Quản lý rủi ro & chốt lời: Dựa trên ATR(14) (SL: 1.5x ATR, TP: 3.0x ATR)
    - Bộ lọc biến động: Loại bỏ tín hiệu nếu thị trường quá trầm lắng hoặc có biến động bất thường.
    """
    
    def __init__(self, 
                 fast_period: int = 20, 
                 slow_period: int = 50, 
                 atr_period: int = 14,
                 sl_atr_multiplier: Decimal = Decimal('1.5'),
                 tp_atr_multiplier: Decimal = Decimal('3.0'),
                 min_atr_threshold: Decimal = Decimal('0.00010'),
                 max_atr_threshold: Decimal = Decimal('0.00500')):
        """
        Khởi tạo chiến lược Trend Following.
        """
        super().__init__(name='Trend_Following', version='1.0')
        self.fast_period = fast_period
        self.slow_period = slow_period
        self.atr_period = atr_period
        self.sl_atr_multiplier = sl_atr_multiplier
        self.tp_atr_multiplier = tp_atr_multiplier
        self.min_atr_threshold = min_atr_threshold
        self.max_atr_threshold = max_atr_threshold
        
    def generate_signal(self, bars: List[Dict[str, Any]]) -> Optional[Signal]:
        """
        Phân tích dữ liệu nến và tạo tín hiệu giao dịch.
        """
        if len(bars) < self.slow_period + 2:
            return None
            
        # Lấy giá đóng cửa
        closes = [Decimal(str(b['close'])) for b in bars]
        
        # Tính toán MA hiện tại và phiên trước
        fast_ma_curr = calculate_sma(closes, self.fast_period)
        slow_ma_curr = calculate_sma(closes, self.slow_period)
        
        fast_ma_prev = calculate_sma(closes[:-1], self.fast_period)
        slow_ma_prev = calculate_sma(closes[:-1], self.slow_period)
        
        atr = calculate_atr(bars, self.atr_period)
        
        if fast_ma_curr is None or slow_ma_curr is None or fast_ma_prev is None or slow_ma_prev is None or atr is None:
            return None
            
        # Bộ lọc biến động (Volatility filter)
        if atr < self.min_atr_threshold or atr > self.max_atr_threshold:
            return None
            
        current_bar = bars[-1]
        symbol = current_bar.get('symbol', 'UNKNOWN')
        close_price = Decimal(str(current_bar['close']))
        bar_time = current_bar['time']
        
        side = None
        # Kiểm tra giao cắt (Crossover)
        if fast_ma_prev <= slow_ma_prev and fast_ma_curr > slow_ma_curr:
            side = 'BUY'
        elif fast_ma_prev >= slow_ma_prev and fast_ma_curr < slow_ma_curr:
            side = 'SELL'
            
        if not side:
            return None
            
        # Tính SL và TP dựa trên ATR
        atr_sl_dist = atr * self.sl_atr_multiplier
        atr_tp_dist = atr * self.tp_atr_multiplier
        
        if side == 'BUY':
            sl = close_price - atr_sl_dist
            tp = close_price + atr_tp_dist
        else:
            sl = close_price + atr_sl_dist
            tp = close_price - atr_tp_dist
            
        # Định dạng lý do bằng tiếng Việt
        reason = (f"Giao cắt SMA: SMA({self.fast_period}) = {fast_ma_curr:.5f} "
                  f"cắt SMA({self.slow_period}) = {slow_ma_curr:.5f}. "
                  f"ATR({self.atr_period}) = {atr:.5f} nằm trong ngưỡng cho phép.")
                  
        metadata = {
            'fast_ma': float(fast_ma_curr),
            'slow_ma': float(slow_ma_curr),
            'atr': float(atr),
            'trend_strength': float(abs(fast_ma_curr - slow_ma_curr))
        }
        
        return Signal(
            symbol=symbol,
            side=side,
            entry=close_price,
            sl=sl,
            tp=tp,
            volume=Decimal('0.1'),
            reason=reason,
            strategy=self.name,
            strategy_version=self.version,
            bar_time=bar_time,
            metadata=metadata
        )
