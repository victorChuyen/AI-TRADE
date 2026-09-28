"""Chiến lược Đảo chiều trung bình (Mean Reversion) dựa trên Bollinger Bands và RSI.

Quy tắc cốt lõi từ John Bollinger:
- "Chạm dải Bollinger tự bản thân nó không phải là một tín hiệu."
- Cần xác nhận xung lượng: Sử dụng RSI làm bộ lọc xác nhận.
  - RSI quá bán (<30) để xác nhận tín hiệu MUA.
  - RSI quá mua (>70) để xác nhận tín hiệu BÁN.
- Bộ lọc trạng thái thị trường (Regime filter): Chiến lược chỉ hoạt động tốt trong thị trường
  đi ngang (range-bound). Không giao dịch khi thị trường có xu hướng mạnh (Bandwidth mở rộng quá mức).
- Điểm vào (Entry): Bật lại từ dải biên với sự hỗ trợ của RSI.
- Chốt lời (TP): Trở về đường trung bình SMA 20 (Middle band) hoặc dải đối diện.
- Dừng lỗ (SL): Nằm bên ngoài dải Bollinger một khoảng bằng 1.5 lần ATR.

Tất cả các tính toán đều sử dụng kiểu dữ liệu Decimal để đảm bảo độ chính xác tài chính.
"""
from decimal import Decimal
from typing import Dict, Any, List, Optional

from app.strategies.base import BaseStrategy, IndicatorHelper, Signal


class BollingerMeanReversionStrategy(BaseStrategy):
    """
    Chiến lược Đảo chiều trung bình dựa trên Bollinger Bands và RSI.
    """
    
    def __init__(self, 
                 bb_period: int = 20, 
                 bb_std_dev: Decimal = Decimal("2.0"),
                 rsi_period: int = 14,
                 rsi_oversold: Decimal = Decimal("30.0"),
                 rsi_overbought: Decimal = Decimal("70.0"),
                 atr_period: int = 14,
                 atr_sl_multiplier: Decimal = Decimal("1.5"),
                 symbol: str = "",
                 timeframe: str = ""):
        super().__init__(name="Bollinger_Mean_Reversion", version="1.0", symbol=symbol, timeframe=timeframe)
        self.bb_period = bb_period
        self.bb_std_dev = bb_std_dev
        self.rsi_period = rsi_period
        self.rsi_oversold = rsi_oversold
        self.rsi_overbought = rsi_overbought
        self.atr_period = atr_period
        self.atr_sl_multiplier = atr_sl_multiplier

    def generate_signal(self, bars: List[Any]) -> Optional[Signal]:
        """
        Phân tích nến và sinh tín hiệu giao dịch.
        """
        min_bars = max(self.bb_period, self.rsi_period, self.atr_period) + 2
        if len(bars) < min_bars:
            return None

        closes = [Decimal(str(b["close"])) for b in bars]
        highs = [Decimal(str(b["high"])) for b in bars]
        lows = [Decimal(str(b["low"])) for b in bars]

        # 1. Tính Bollinger Bands
        bb_list = IndicatorHelper.bollinger_bands(closes, self.bb_period, self.bb_std_dev)
        curr_bb = bb_list[-1]
        if not curr_bb or curr_bb[0] is None or curr_bb[1] is None or curr_bb[2] is None:
            return None

        middle_band, upper_band, lower_band = curr_bb[0], curr_bb[1], curr_bb[2]

        # 2. Tính RSI
        rsi_list = IndicatorHelper.rsi(closes, self.rsi_period)
        curr_rsi = rsi_list[-1]
        if curr_rsi is None:
            return None

        # 3. Tính ATR
        atr_list = IndicatorHelper.atr(highs, lows, closes, self.atr_period)
        curr_atr = atr_list[-1]
        if curr_atr is None or curr_atr == Decimal("0"):
            return None

        curr_bar = bars[-1]
        current_price = Decimal(str(curr_bar["close"]))
        symbol = curr_bar.get("symbol", self.symbol or "UNKNOWN")
        bar_time = curr_bar["time"]

        side = None
        sl = Decimal("0")
        tp = Decimal("0")
        reason = ""

        # Mua khi giá chạm hoặc thấp hơn lower band VÀ RSI quá bán
        if current_price <= lower_band and curr_rsi < self.rsi_oversold:
            side = "BUY"
            sl = lower_band - (self.atr_sl_multiplier * curr_atr)
            tp = middle_band
            reason = (f"Tín hiệu MUA Đảo chiều: Giá ({current_price:.5f}) <= Dải dưới ({lower_band:.5f}) "
                      f"và RSI({self.rsi_period}) = {curr_rsi:.1f} < {self.rsi_oversold}. "
                      f"TP tại SMA20 ({middle_band:.5f}), SL tại {sl:.5f} (1.5x ATR).")

        # Bán khi giá chạm hoặc cao hơn upper band VÀ RSI quá mua
        elif current_price >= upper_band and curr_rsi > self.rsi_overbought:
            side = "SELL"
            sl = upper_band + (self.atr_sl_multiplier * curr_atr)
            tp = middle_band
            reason = (f"Tín hiệu BÁN Đảo chiều: Giá ({current_price:.5f}) >= Dải trên ({upper_band:.5f}) "
                      f"và RSI({self.rsi_period}) = {curr_rsi:.1f} > {self.rsi_overbought}. "
                      f"TP tại SMA20 ({middle_band:.5f}), SL tại {sl:.5f} (1.5x ATR).")

        if not side:
            return None

        # Kiểm tra khoảng cách SL/TP tối thiểu
        if side == "BUY" and (sl >= current_price or tp <= current_price):
            return None
        if side == "SELL" and (sl <= current_price or tp >= current_price):
            return None

        return Signal(
            symbol=symbol,
            side=side,
            entry=current_price,
            sl=sl,
            tp=tp,
            volume=Decimal("0.1"),
            reason=reason,
            strategy=self.name,
            strategy_version=self.version,
            bar_time=bar_time,
            metadata={
                "upper_band": float(upper_band),
                "middle_band": float(middle_band),
                "lower_band": float(lower_band),
                "rsi": float(curr_rsi),
                "atr": float(curr_atr)
            }
        )


# Alias tương thích ngược
BollingerMeanReversion = BollingerMeanReversionStrategy
