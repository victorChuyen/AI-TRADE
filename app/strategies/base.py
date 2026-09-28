import abc
from decimal import Decimal, getcontext
from typing import List, Optional, Dict, Any, Tuple
from dataclasses import dataclass

# Thiết lập độ chính xác cho tính toán Decimal
getcontext().prec = 28

# Import hoặc định nghĩa fallback cho Signal nếu module chưa tồn tại
try:
    from app.backtest.engine import Signal
except ImportError:
    @dataclass
    class Signal:
        """
        Lớp cấu trúc cho Tín hiệu giao dịch (Signal fallback).
        Sử dụng Decimal cho tất cả các giá trị tiền/giá.
        """
        symbol: str
        action: str  # 'BUY', 'SELL', etc.
        price: Decimal
        stop_loss: Optional[Decimal] = None
        take_profit: Optional[Decimal] = None
        volume: Optional[Decimal] = None
        comment: str = ""

class IndicatorHelper:
    """
    Lớp hỗ trợ tính toán các chỉ báo kỹ thuật cơ bản bằng Decimal.
    Đảm bảo tính chính xác cho các phép tính toán tài chính (không dùng float).
    """

    @staticmethod
    def sma(data: List[Decimal], period: int) -> List[Optional[Decimal]]:
        """
        Simple Moving Average (Trung bình giá đơn giản).
        
        Args:
            data (List[Decimal]): Danh sách dữ liệu giá.
            period (int): Chu kỳ tính toán.
            
        Returns:
            List[Optional[Decimal]]: Danh sách giá trị SMA tương ứng với mỗi điểm dữ liệu.
        """
        if period <= 0:
            raise ValueError("Chu kỳ (period) phải lớn hơn 0")
        
        result: List[Optional[Decimal]] = []
        for i in range(len(data)):
            if i < period - 1:
                result.append(None)
            else:
                window = data[i - period + 1 : i + 1]
                sma_val = sum(window) / Decimal(period)
                result.append(sma_val)
        return result

    @staticmethod
    def ema(data: List[Decimal], period: int) -> List[Optional[Decimal]]:
        """
        Exponential Moving Average (Trung bình giá mũ).
        
        Args:
            data (List[Decimal]): Danh sách dữ liệu giá.
            period (int): Chu kỳ tính toán.
            
        Returns:
            List[Optional[Decimal]]: Danh sách giá trị EMA.
        """
        if period <= 0:
            raise ValueError("Chu kỳ (period) phải lớn hơn 0")
            
        result: List[Optional[Decimal]] = []
        multiplier = Decimal('2') / Decimal(period + 1)
        
        for i in range(len(data)):
            if i < period - 1:
                result.append(None)
            elif i == period - 1:
                # Giá trị EMA đầu tiên bằng SMA
                window = data[0 : period]
                sma_val = sum(window) / Decimal(period)
                result.append(sma_val)
            else:
                prev_ema = result[-1]
                if prev_ema is not None:
                    ema_val = (data[i] - prev_ema) * multiplier + prev_ema
                    result.append(ema_val)
                else:
                    result.append(None)
        return result

    @staticmethod
    def _true_range(highs: List[Decimal], lows: List[Decimal], closes: List[Decimal]) -> List[Optional[Decimal]]:
        """
        Hàm phụ trợ tính True Range.
        """
        result: List[Optional[Decimal]] = []
        for i in range(len(highs)):
            if i == 0:
                result.append(highs[i] - lows[i])
            else:
                tr1 = highs[i] - lows[i]
                tr2 = abs(highs[i] - closes[i-1])
                tr3 = abs(lows[i] - closes[i-1])
                result.append(max(tr1, tr2, tr3))
        return result

    @staticmethod
    def atr(highs: List[Decimal], lows: List[Decimal], closes: List[Decimal], period: int) -> List[Optional[Decimal]]:
        """
        Average True Range (Khoảng dao động thực tế trung bình - Wilder's smoothed).
        
        Args:
            highs (List[Decimal]): Danh sách giá cao nhất.
            lows (List[Decimal]): Danh sách giá thấp nhất.
            closes (List[Decimal]): Danh sách giá đóng cửa.
            period (int): Chu kỳ tính toán.
            
        Returns:
            List[Optional[Decimal]]: Danh sách giá trị ATR.
        """
        if period <= 0:
            raise ValueError("Chu kỳ (period) phải lớn hơn 0")
            
        tr = IndicatorHelper._true_range(highs, lows, closes)
        result: List[Optional[Decimal]] = []
        
        for i in range(len(tr)):
            if i < period - 1:
                result.append(None)
            elif i == period - 1:
                window = [x for x in tr[0:period] if x is not None]
                first_atr = sum(window) / Decimal(period)
                result.append(first_atr)
            else:
                prev_atr = result[-1]
                if prev_atr is not None and tr[i] is not None:
                    # Công thức làm mượt của Wilder
                    atr_val = (prev_atr * Decimal(period - 1) + tr[i]) / Decimal(period)
                    result.append(atr_val)
                else:
                    result.append(None)
        return result

    @staticmethod
    def bollinger_bands(data: List[Decimal], period: int, std_dev_mult: Decimal = Decimal('2.0')) -> Tuple[List[Optional[Decimal]], List[Optional[Decimal]], List[Optional[Decimal]], List[Optional[Decimal]]]:
        """
        Bollinger Bands sử dụng toán học Decimal.
        
        Args:
            data (List[Decimal]): Danh sách dữ liệu giá.
            period (int): Chu kỳ tính toán.
            std_dev_mult (Decimal): Hệ số nhân độ lệch chuẩn (thường là 2.0).
            
        Returns:
            Tuple: Bao gồm 4 danh sách (SMA, Upper Band, Lower Band, Bandwidth).
        """
        if period <= 0:
            raise ValueError("Chu kỳ (period) phải lớn hơn 0")
            
        sma_list = IndicatorHelper.sma(data, period)
        upper: List[Optional[Decimal]] = []
        lower: List[Optional[Decimal]] = []
        bandwidth: List[Optional[Decimal]] = []
        
        for i in range(len(data)):
            if i < period - 1:
                upper.append(None)
                lower.append(None)
                bandwidth.append(None)
            else:
                window = data[i - period + 1 : i + 1]
                mean = sma_list[i]
                if mean is not None:
                    # Tính phương sai và độ lệch chuẩn bằng Decimal
                    variance = sum((x - mean) ** 2 for x in window) / Decimal(period)
                    std_dev = variance.sqrt()
                    
                    upper_band = mean + (std_dev_mult * std_dev)
                    lower_band = mean - (std_dev_mult * std_dev)
                    bw = (upper_band - lower_band) / mean if mean != Decimal('0') else Decimal('0')
                    
                    upper.append(upper_band)
                    lower.append(lower_band)
                    bandwidth.append(bw)
                else:
                    upper.append(None)
                    lower.append(None)
                    bandwidth.append(None)
                    
        return sma_list, upper, lower, bandwidth

    @staticmethod
    def donchian_channels(highs: List[Decimal], lows: List[Decimal], period: int) -> Tuple[List[Optional[Decimal]], List[Optional[Decimal]], List[Optional[Decimal]]]:
        """
        Donchian Channels.
        
        Args:
            highs (List[Decimal]): Danh sách giá cao.
            lows (List[Decimal]): Danh sách giá thấp.
            period (int): Chu kỳ.
            
        Returns:
            Tuple: Bao gồm 3 danh sách (Highest High, Lowest Low, Midpoint).
        """
        if period <= 0:
            raise ValueError("Chu kỳ (period) phải lớn hơn 0")
            
        upper: List[Optional[Decimal]] = []
        lower: List[Optional[Decimal]] = []
        mid: List[Optional[Decimal]] = []
        
        for i in range(len(highs)):
            if i < period - 1:
                upper.append(None)
                lower.append(None)
                mid.append(None)
            else:
                hh = max(highs[i - period + 1 : i + 1])
                ll = min(lows[i - period + 1 : i + 1])
                upper.append(hh)
                lower.append(ll)
                mid.append((hh + ll) / Decimal('2.0'))
                
        return upper, lower, mid

    @staticmethod
    def rsi(data: List[Decimal], period: int) -> List[Optional[Decimal]]:
        """
        Relative Strength Index (Chỉ báo sức mạnh tương đối).
        
        Args:
            data (List[Decimal]): Danh sách dữ liệu giá.
            period (int): Chu kỳ tính toán.
            
        Returns:
            List[Optional[Decimal]]: Danh sách giá trị RSI.
        """
        if period <= 0:
            raise ValueError("Chu kỳ (period) phải lớn hơn 0")
            
        result: List[Optional[Decimal]] = []
        if not data:
            return result
            
        gains: List[Decimal] = [Decimal('0')]
        losses: List[Decimal] = [Decimal('0')]
        
        for i in range(1, len(data)):
            diff = data[i] - data[i-1]
            if diff >= Decimal('0'):
                gains.append(diff)
                losses.append(Decimal('0'))
            else:
                gains.append(Decimal('0'))
                losses.append(abs(diff))
        
        avg_gain: Optional[Decimal] = None
        avg_loss: Optional[Decimal] = None
        
        for i in range(len(data)):
            if i < period:
                result.append(None)
                if i == period - 1:
                    # RSI chu kỳ đầu tiên
                    avg_gain = sum(gains[1 : period + 1]) / Decimal(period)
                    avg_loss = sum(losses[1 : period + 1]) / Decimal(period)
                    
                    if avg_loss == Decimal('0'):
                        result[-1] = Decimal('100')
                    else:
                        rs = avg_gain / avg_loss
                        result[-1] = Decimal('100') - (Decimal('100') / (Decimal('1') + rs))
            else:
                if avg_gain is not None and avg_loss is not None:
                    # Smoothed moving average for RSI
                    avg_gain = (avg_gain * Decimal(period - 1) + gains[i]) / Decimal(period)
                    avg_loss = (avg_loss * Decimal(period - 1) + losses[i]) / Decimal(period)
                    
                    if avg_loss == Decimal('0'):
                        result.append(Decimal('100'))
                    else:
                        rs = avg_gain / avg_loss
                        result.append(Decimal('100') - (Decimal('100') / (Decimal('1') + rs)))
                else:
                    result.append(None)
                    
        return result


class BaseStrategy(abc.ABC):
    """
    Lớp cơ sở trừu tượng (Abstract Base Class) cho tất cả các chiến lược giao dịch.
    Đảm bảo tính nhất quán trong cấu trúc và triển khai chiến lược.
    """
    
    def __init__(self, name: str, version: str = "1.0", symbol: str = "", timeframe: str = "", params: Optional[Dict[str, Any]] = None):
        """
        Khởi tạo chiến lược giao dịch cơ sở.
        
        Args:
            name (str): Tên của chiến lược.
            version (str): Phiên bản của chiến lược.
            symbol (str): Cặp giao dịch (Ví dụ: 'EURUSD').
            timeframe (str): Khung thời gian (Ví dụ: 'M15', 'H1').
            params (Optional[Dict[str, Any]]): Danh sách các tham số tùy biến.
        """
        self.name = name
        self.version = version
        self.symbol = symbol
        self.timeframe = timeframe
        self.params = params or {}

    def __call__(self, bars: List[Any]) -> Optional[Signal]:
        """Cho phép truyền đối tượng chiến lược trực tiếp vào BacktestEngine."""
        return self.generate_signal(bars)
        
    def validate_bars(self, bars: List[Any], min_bars: int) -> bool:
        """
        Kiểm tra số lượng và tính hợp lệ của dữ liệu nến.
        
        Args:
            bars (List[Any]): Danh sách các nến đầu vào.
            min_bars (int): Số lượng nến tối thiểu yêu cầu.
            
        Returns:
            bool: True nếu dữ liệu hợp lệ và đủ để tính toán chiến lược.
        """
        if not bars:
            return False
        if len(bars) < min_bars:
            return False
        return True
        
    @abc.abstractmethod
    def generate_signal(self, bars: List[Any]) -> Optional[Signal]:
        """
        Phương thức trừu tượng sinh ra tín hiệu giao dịch. 
        Mọi chiến lược cụ thể đều phải ghi đè (override) hàm này.
        
        Args:
            bars (List[Any]): Danh sách các nến (cung cấp giá OHLC).
            
        Returns:
            Optional[Signal]: Trả về đối tượng Signal nếu có tín hiệu, ngược lại trả về None.
        """
        pass
