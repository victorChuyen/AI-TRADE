"""Deterministic, synthetic 15-minute replay. Never represents broker prices."""
import hashlib
import math
from datetime import datetime, timezone

SYMBOLS = {
    "BTCUSD": {"base": 65000.0, "amp": 1200.0, "digits": 2, "spread": 15.0, "contract": 1, "step": .01, "label": "Bitcoin / US Dollar"},
    "XAUUSD": {"base": 2650.0, "amp": 13.0, "digits": 2, "spread": 0.35, "contract": 100, "step": .01, "label": "Vàng / US Dollar"},
    "WTI":    {"base": 72.50, "amp": 1.2, "digits": 2, "spread": 0.04, "contract": 1000, "step": .01, "label": "Dầu WTI / US Dollar"},
    "EURUSD": {"base": 1.0842, "amp": .002, "digits": 5, "spread": .00012, "contract": 100000, "step": .01, "label": "Euro / US Dollar"},
    "GBPUSD": {"base": 1.2738, "amp": .003, "digits": 5, "spread": .00018, "contract": 100000, "step": .01, "label": "British Pound / US Dollar"},
    "USDJPY": {"base": 148.50, "amp": .8, "digits": 3, "spread": .015, "contract": 100000, "step": .01, "label": "US Dollar / Japanese Yen"},
}
START = int(datetime(2026, 1, 5, tzinfo=timezone.utc).timestamp())
COMMISSION_PER_LOT = 7.0  # Full round-trip charge booked on entry, paper only.


def noise(symbol, i):
    digest = hashlib.sha256(f"{symbol}:{i}".encode()).digest()
    return int.from_bytes(digest[:4], "big") / 4294967295 - .5


def close(symbol, i):
    s = SYMBOLS[symbol]
    return round(s["base"] + s["amp"] * (math.sin(i / 15) + .4 * math.sin(i / 4.1) + noise(symbol, i) * .18), s["digits"])


def candle(symbol, i):
    s = SYMBOLS[symbol]
    o, c = close(symbol, i - 1), close(symbol, i)
    wick = s["amp"] * (.04 + abs(noise(symbol, i + 900)) * .12)
    return {"time": START + i * 900, "open": o, "high": round(max(o, c) + wick, s["digits"]), "low": round(min(o, c) - wick, s["digits"]), "close": c}


def quote(symbol, step):
    s = SYMBOLS[symbol]
    bid = close(symbol, step)
    return {"symbol": symbol, "label": s["label"], "bid": bid, "ask": round(bid + s["spread"], s["digits"]), "spread": s["spread"], "digits": s["digits"], "change": round((bid / close(symbol, step - 96) - 1) * 100, 3)}


def snapshot(symbol, step):
    return {"source": "synthetic", "timeframe": "M15", "quote": quote(symbol, step), "candles": [candle(symbol, i) for i in range(step - 95, step + 1)]}


def analyze(symbol, step):
    s = SYMBOLS[symbol]
    bars = snapshot(symbol, step)["candles"]
    values = [b["close"] for b in bars]
    fast, slow = sum(values[-9:]) / 9, sum(values[-21:]) / 21
    atr = sum(max(b["high"] - b["low"], abs(b["high"] - bars[j - 1]["close"]), abs(b["low"] - bars[j - 1]["close"])) for j, b in enumerate(bars) if j >= len(bars) - 14) / 14
    side = "BUY" if fast > slow else "SELL"
    q = quote(symbol, step)
    entry = q["ask"] if side == "BUY" else q["bid"]
    distance = max(atr * 2, s["spread"] * 4)
    sign = 1 if side == "BUY" else -1
    return {"provider": "rules", "symbol": symbol, "side": side, "entry": entry, "sl": round(entry - sign * distance, s["digits"]), "tp": round(entry + sign * distance * 2, s["digits"]), "sma9": round(fast, s["digits"]), "sma21": round(slow, s["digits"]), "atr14": round(atr, s["digits"]), "step": step, "summary": f"SMA 9 {'trên' if side == 'BUY' else 'dưới'} SMA 21. Khoảng dừng lỗ là 2 × ATR(14), mục tiêu 2R trước chi phí. Đây là quy tắc minh họa trên dữ liệu tổng hợp; chưa được kiểm chứng lợi thế giao dịch."}
