"""
Lucky Trade AI — Live MT5 Direct Service
Kết nối trực tiếp terminal MetaTrader 5 (64-bit), quản lý vị thế thực chiến,
thực thi lệnh và tính toán rủi ro FTMO Challenge theo thời gian thực.
"""

import os
import sys
import json
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from decimal import Decimal

logger = logging.getLogger("mt5_service")

try:
    import MetaTrader5 as mt5
except ImportError:
    mt5 = None

from .risk.ftmo import FTMORiskEngine, FTMORuleProfile

# Cấu hình tài khoản mặc định
DEFAULT_LOGIN = 5056580335
DEFAULT_PASSWORD = "_iDgN8Bs"
DEFAULT_INVESTOR = "_p0pRsTo"
DEFAULT_SERVER = "MetaQuotes-Demo"
DEFAULT_MAGIC = 202688
DEFAULT_PATH = r"C:\Program Files\MetaTrader 5\terminal64.exe"

_day_start_equity: Optional[float] = None
_day_start_date: Optional[str] = None
_initial_capital: float = 10000.0

def ensure_connected() -> bool:
    """Đảm bảo kết nối tới terminal MetaTrader 5 còn sống."""
    if mt5 is None:
        return False
    try:
        acc = mt5.account_info()
        if acc is not None and getattr(acc, "login", 0) > 0:
            return True
        # Thử khởi tạo lại
        init_res = mt5.initialize(path=DEFAULT_PATH, login=DEFAULT_LOGIN, password=DEFAULT_PASSWORD, server=DEFAULT_SERVER, timeout=10000)
        return bool(init_res)
    except Exception as exc:
        logger.warning("Error in ensure_connected: %s", exc)
        return False

def get_live_account() -> Dict[str, Any]:
    """Lấy số liệu tài khoản thực tế từ MT5."""
    global _day_start_equity, _day_start_date, _initial_capital

    if not ensure_connected():
        return {
            "connected": False,
            "login": DEFAULT_LOGIN,
            "server": DEFAULT_SERVER,
            "balance": 10000.0,
            "equity": 10000.0,
            "margin": 0.0,
            "margin_free": 10000.0,
            "profit": 0.0,
            "currency": "USD",
            "leverage": 100,
            "position_count": 0
        }

    acc = mt5.account_info()
    if not acc:
        return {"connected": False, "error": "Cannot fetch account_info"}

    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if _day_start_date != today_str:
        _day_start_date = today_str
        _day_start_equity = acc.equity

    return {
        "connected": True,
        "login": acc.login,
        "server": acc.server,
        "name": getattr(acc, "name", "Chuyền Ngọc"),
        "trade_mode": "Demo" if acc.trade_mode == 0 else "Live",
        "currency": acc.currency,
        "balance": acc.balance,
        "equity": acc.equity,
        "margin": acc.margin,
        "margin_free": acc.margin_free,
        "margin_level": getattr(acc, "margin_level", 0.0),
        "leverage": getattr(acc, "leverage", 100),
        "profit": acc.profit,
        "position_count": mt5.positions_total(),
        "time": datetime.now(timezone.utc).isoformat()
    }

def get_live_positions() -> List[Dict[str, Any]]:
    """Lấy danh sách các vị thế thực tế đang mở trên MT5."""
    if not ensure_connected():
        return []

    positions = mt5.positions_get()
    if not positions:
        return []

    res = []
    for p in positions:
        d = p._asdict()
        side = "BUY" if d.get("type") == 0 else "SELL"
        res.append({
            "ticket": d.get("ticket"),
            "id": d.get("ticket"),
            "symbol": d.get("symbol"),
            "side": side,
            "volume": d.get("volume"),
            "price_open": d.get("price_open"),
            "entry": d.get("price_open"),
            "price_current": d.get("price_current"),
            "sl": d.get("sl"),
            "tp": d.get("tp"),
            "profit": d.get("profit"),
            "pnl": d.get("profit"),
            "swap": d.get("swap", 0.0),
            "fee": 0.0,
            "time": d.get("time"),
            "magic": d.get("magic"),
            "comment": d.get("comment", "")
        })
    return res

def close_live_position(ticket: int) -> Dict[str, Any]:
    """Đóng tức thì một vị thế trên MT5 theo Ticket ID."""
    if not ensure_connected():
        return {"success": False, "error": "MT5 chưa kết nối"}

    positions = mt5.positions_get(ticket=int(ticket))
    if not positions or len(positions) == 0:
        return {"success": False, "error": f"Không tìm thấy vị thế #{ticket}"}

    pos = positions[0]
    symbol = pos.symbol
    volume = pos.volume
    pos_type = pos.type
    close_type = mt5.ORDER_TYPE_SELL if pos_type == mt5.ORDER_TYPE_BUY else mt5.ORDER_TYPE_BUY

    mt5.symbol_select(symbol, True)
    tick = mt5.symbol_info_tick(symbol)
    if not tick:
        return {"success": False, "error": f"Không thể lấy tick giá của {symbol}"}

    price = tick.bid if close_type == mt5.ORDER_TYPE_SELL else tick.ask

    request = {
        "action": mt5.TRADE_ACTION_DEAL,
        "position": int(ticket),
        "symbol": symbol,
        "volume": float(volume),
        "type": close_type,
        "price": price,
        "deviation": 25,
        "magic": DEFAULT_MAGIC,
        "comment": "Lucky-AI-Close",
        "type_time": mt5.ORDER_TIME_GTC,
        "type_filling": mt5.ORDER_FILLING_IOC,
    }

    result = mt5.order_send(request)
    if result is None or result.retcode != mt5.TRADE_RETCODE_DONE:
        err_comment = getattr(result, "comment", None) or f"Retcode: {getattr(result, 'retcode', mt5.last_error())}"
        return {"success": False, "error": f"Đóng lệnh thất bại: {err_comment}"}

    return {
        "success": True,
        "ticket": ticket,
        "symbol": symbol,
        "closed_price": result.price,
        "message": f"Đã đóng vị thế #{ticket} thành công tại giá {result.price}"
    }

def send_live_order(symbol: str, side: str, volume: float, sl: Optional[float] = None, tp: Optional[float] = None, comment: str = "Lucky-AI") -> Dict[str, Any]:
    """Mở vị thế mới trên MT5 với SL/TP và kiểm soát FTMO Gate."""
    if not ensure_connected():
        return {"success": False, "error": "MT5 chưa kết nối"}

    symbol = symbol.upper()
    mt5.symbol_select(symbol, True)
    info = mt5.symbol_info(symbol)
    if not info:
        return {"success": False, "error": f"Mã {symbol} không có trên sàn"}

    tick = mt5.symbol_info_tick(symbol)
    if not tick:
        return {"success": False, "error": f"Không có giá tick cho {symbol}"}

    is_buy = side.upper() in ("BUY", "LONG")
    price = tick.ask if is_buy else tick.bid
    order_type = mt5.ORDER_TYPE_BUY if is_buy else mt5.ORDER_TYPE_SELL

    request = {
        "action": mt5.TRADE_ACTION_DEAL,
        "symbol": symbol,
        "volume": float(volume),
        "type": order_type,
        "price": price,
        "deviation": 25,
        "magic": DEFAULT_MAGIC,
        "comment": comment,
        "type_time": mt5.ORDER_TIME_GTC,
        "type_filling": mt5.ORDER_FILLING_IOC,
    }
    if sl is not None and sl > 0:
        request["sl"] = float(sl)
    if tp is not None and tp > 0:
        request["tp"] = float(tp)

    result = mt5.order_send(request)
    if result is None or result.retcode != mt5.TRADE_RETCODE_DONE:
        err_comment = getattr(result, "comment", None) or f"Retcode: {getattr(result, 'retcode', mt5.last_error())}"
        return {"success": False, "error": f"Đặt lệnh thất bại: {err_comment}"}

    return {
        "success": True,
        "ticket": result.order,
        "symbol": symbol,
        "volume": result.volume,
        "price": result.price,
        "message": f"Đặt lệnh #{result.order} thành công tại giá {result.price}"
    }

def get_ftmo_risk_status() -> Dict[str, Any]:
    """Kiểm tra rủi ro tài khoản theo chuẩn FTMO 1-Step."""
    acc = get_live_account()
    eq = Decimal(str(acc.get("equity", 10000.0)))
    b0 = Decimal(str(_day_start_equity or acc.get("balance", 10000.0)))
    init_cap = Decimal(str(_initial_capital))

    profile = FTMORuleProfile(
        name="FTMO_1STEP_10K",
        initial_capital=init_cap,
        step_type="1-Step",
        profit_target_pct=Decimal("10.0"),
        daily_loss_pct=Decimal("3.0"),
        total_loss_pct=Decimal("10.0"),
        best_day_rule_enabled=True,
        max_best_day_pct=Decimal("50.0")
    )
    engine = FTMORiskEngine(profile)
    engine.configure_state(init_cap, b0, max(init_cap, eq))
    floors = engine.calculate_floors(eq)

    daily_loss_amount = float(max(Decimal("0.0"), b0 - eq))
    daily_loss_pct = float(round((Decimal(str(daily_loss_amount)) / b0 * Decimal("100.0")), 2)) if b0 > 0 else 0.0

    status = "SAFE"
    if floors["headroom"] <= 0:
        status = "BREACHED"
    elif floors["headroom"] < Decimal("100.0"):
        status = "DANGER"
    elif daily_loss_pct >= 1.2:
        status = "WARNING"

    return {
        "status": status,
        "initial_capital": float(init_cap),
        "day_start_equity": float(b0),
        "current_equity": float(eq),
        "current_balance": float(acc.get("balance", 10000.0)),
        "daily_floor": float(floors["daily_floor"]),
        "total_floor": float(floors["total_floor"]),
        "effective_floor": float(floors["effective_floor"]),
        "headroom": float(floors["headroom"]),
        "daily_loss_amount": daily_loss_amount,
        "daily_loss_pct": daily_loss_pct,
        "can_trade": status not in ("BREACHED", "DANGER"),
        "login": acc.get("login", DEFAULT_LOGIN),
        "server": acc.get("server", DEFAULT_SERVER)
    }
