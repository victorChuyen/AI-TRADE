from decimal import Decimal
from typing import Dict, Any, List, Optional

from app.strategies.base import BaseStrategy, Signal


class DonchianBreakoutStrategy(BaseStrategy):
    """
    Chiến lược giao dịch phá vỡ kênh Donchian (Donchian Channel Breakout).
    Dựa trên quy tắc:
    - 20-period Donchian Channel (Highest High và Lowest Low của 20 nến trước đó, bỏ qua nến hiện tại).
    - Tín hiệu MUA khi giá đóng cửa vượt lên trên biên trên.
    - Tín hiệu BÁN khi giá đóng cửa phá xuống dưới biên dưới.
    """

    def __init__(self, period: int = 20, atr_period: int = 14, symbol: str = "", timeframe: str = ""):
        super().__init__(name="Donchian_Breakout", version="1.0", symbol=symbol, timeframe=timeframe)
        self.period = period
        self.atr_period = atr_period
        self.atr_sl_multiplier = Decimal('2.0')
        self.atr_tp_multiplier = Decimal('3.0')

    def generate_signal(self, bars: List[Any]) -> Optional[Signal]:
        """
        Phương thức chuẩn cho hệ thống Backtest và Live Execution.
        """
        analysis = self.analyze(self.symbol, self.timeframe, bars)
        sig = analysis.get("signal")
        if sig in ("BUY", "SELL"):
            curr = bars[-1]
            return Signal(
                symbol=curr.get("symbol", self.symbol or "UNKNOWN"),
                side=sig,
                entry=analysis["entry_price"],
                sl=analysis["stop_loss"],
                tp=analysis["take_profit"],
                volume=Decimal("0.1"),
                reason=analysis["reason"],
                strategy=self.name,
                strategy_version=self.version,
                bar_time=curr["time"],
                metadata={
                    "upper_band": float(analysis.get("upper_band", 0)),
                    "lower_band": float(analysis.get("lower_band", 0)),
                    "mid_point": float(analysis.get("mid_point", 0)),
                    "atr": float(analysis.get("atr", 0)),
                    "bandwidth": float(analysis.get("bandwidth", 0))
                }
            )
        return None

    def calculate_atr(self, candles: List[Dict[str, Any]]) -> Decimal:
        """
        Tính toán ATR (Average True Range) bằng Decimal.
        """
        if len(candles) < 2:
            return Decimal('0')
            
        tr_list = []
        for i in range(1, len(candles)):
            high = Decimal(str(candles[i]['high']))
            low = Decimal(str(candles[i]['low']))
            prev_close = Decimal(str(candles[i-1]['close']))
            
            tr = max(high - low, abs(high - prev_close), abs(low - prev_close))
            tr_list.append(tr)
            
        # Sử dụng SMA cho TR để tính ATR đơn giản
        n = min(self.atr_period, len(tr_list))
        recent_trs = tr_list[-n:]
        
        return sum(recent_trs) / Decimal(str(n))

    def analyze(self, symbol: str, timeframe: str, candles: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Phân tích dữ liệu nến và trả về tín hiệu giao dịch.
        Cấu trúc trả về:
        {
            "signal": "BUY" | "SELL" | "NEUTRAL",
            "entry_price": Decimal,
            "stop_loss": Decimal,
            "take_profit": Decimal,
            "reason": str
        }
        """
        # Cần ít nhất (period + 1) nến để tính toán (1 nến hiện tại + period nến quá khứ)
        if len(candles) <= self.period:
            return {
                "signal": "NEUTRAL", 
                "reason": f"Không đủ dữ liệu nến ({len(candles)} <= {self.period})."
            }

        # Lấy `period` nến trước đó (bỏ qua nến cuối cùng là nến hiện tại/vừa đóng)
        historical_candles = candles[-(self.period + 1):-1]
        
        highs = [Decimal(str(c['high'])) for c in historical_candles]
        lows = [Decimal(str(c['low'])) for c in historical_candles]
        
        upper_band = max(highs)
        lower_band = min(lows)
        mid_point = (upper_band + lower_band) / Decimal('2.0')
        
        bandwidth = upper_band - lower_band
        
        # Phân tích nến hiện tại (hoặc nến vừa đóng hoàn toàn)
        current_candle = candles[-1]
        current_close = Decimal(str(current_candle['close']))
        
        atr = self.calculate_atr(candles)
        if atr == Decimal('0'):
            return {"signal": "NEUTRAL", "reason": "Không thể tính toán ATR."}
            
        # Bộ lọc Bandwidth: Tránh tín hiệu khi kênh quá hẹp
        if bandwidth < (atr * Decimal('0.5')):
            return {
                "signal": "NEUTRAL", 
                "reason": f"Kênh giá quá hẹp, Bandwidth ({bandwidth:.5f}) < 0.5 ATR ({atr * Decimal('0.5'):.5f})."
            }

        signal = "NEUTRAL"
        reason = "Giá vẫn đang dao động trong kênh Donchian."
        entry_price = current_close
        sl = Decimal('0')
        tp = Decimal('0')
        
        if current_close > upper_band:
            signal = "BUY"
            # SL = 2x ATR hoặc Channel Midpoint (lấy mức cao hơn/gần hơn nếu BUY)
            sl_atr = entry_price - (atr * self.atr_sl_multiplier)
            sl = max(mid_point, sl_atr)
            
            # TP = 3x ATR
            tp = entry_price + (atr * self.atr_tp_multiplier)
            
            reason = (f"Tín hiệu MUA: Giá đóng cửa ({entry_price}) phá vỡ lên trên biên trên kênh Donchian ({upper_band}). "
                      f"Dừng lỗ (SL) đặt tại {sl:.5f} (dựa trên Max(Midpoint {mid_point:.5f}, 2xATR)). "
                      f"Chốt lời (TP) tại {tp:.5f} (3xATR).")
                      
        elif current_close < lower_band:
            signal = "SELL"
            # SL = 2x ATR hoặc Channel Midpoint (lấy mức thấp hơn/gần hơn nếu SELL)
            sl_atr = entry_price + (atr * self.atr_sl_multiplier)
            sl = min(mid_point, sl_atr)
            
            # TP = 3x ATR
            tp = entry_price - (atr * self.atr_tp_multiplier)
            
            reason = (f"Tín hiệu BÁN: Giá đóng cửa ({entry_price}) phá vỡ xuống dưới biên dưới kênh Donchian ({lower_band}). "
                      f"Dừng lỗ (SL) đặt tại {sl:.5f} (dựa trên Min(Midpoint {mid_point:.5f}, 2xATR)). "
                      f"Chốt lời (TP) tại {tp:.5f} (3xATR).")
                      
        return {
            "signal": signal,
            "entry_price": entry_price,
            "stop_loss": sl,
            "take_profit": tp,
            "reason": reason,
            "upper_band": upper_band,
            "lower_band": lower_band,
            "mid_point": mid_point,
            "atr": atr,
            "bandwidth": bandwidth
        }
