import os
import sys
import json
import argparse
import time
import datetime
from typing import Dict, Any, List, Optional

def import_mt5():
    try:
        import MetaTrader5 as mt5
        return mt5
    except ImportError:
        return None

try:
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    if hasattr(sys.stderr, 'reconfigure'):
        sys.stderr.reconfigure(encoding='utf-8')
except Exception:
    pass

def serialize_datetime(obj):
    if isinstance(obj, datetime.datetime):
        return obj.isoformat()
    raise TypeError(f"Type {type(obj)} not serializable")

def output_json(data: Dict[str, Any]):
    print(json.dumps(data, ensure_ascii=False, default=serialize_datetime))

def output_error(message: str, details: Optional[Any] = None):
    data = {"success": False, "error": message}
    if details:
        data["details"] = details
    output_json(data)
    sys.exit(1)

def find_standard_mt5_path() -> Optional[str]:
    """Tự động tìm kiếm đường dẫn terminal64.exe của MetaTrader 5."""
    candidates = [
        r"C:\Program Files\MetaTrader 5\terminal64.exe",
        r"C:\Program Files\FTMO MetaTrader 5\terminal64.exe",
        r"C:\Program Files\FTMO Global Markets MetaTrader 5\terminal64.exe",
        r"C:\Program Files\Exness MetaTrader 5\terminal64.exe",
        r"C:\Program Files (x86)\MetaTrader 5\terminal64.exe",
        r"C:\Program Files (x86)\FTMO MetaTrader 5\terminal64.exe",
        r"C:\Program Files (x86)\Exness MetaTrader 5\terminal64.exe",
        os.path.expanduser(r"~\AppData\Local\Programs\MetaTrader 5\terminal64.exe")
    ]
    for p in candidates:
        if os.path.exists(p):
            return p
    return None

def initialize_mt5(mt5) -> bool:
    mt5_path = os.environ.get("LUCKY_MT5_PATH") or find_standard_mt5_path()
    server = os.environ.get("LUCKY_MT5_SERVER")
    login = os.environ.get("LUCKY_MT5_LOGIN")
    password = os.environ.get("LUCKY_MT5_PASSWORD")

    # Đọc fallback từ config/lucky.json nếu có
    try:
        from pathlib import Path
        cfg_file = Path(__file__).resolve().parent.parent / 'config' / 'lucky.json'
        if cfg_file.exists():
            with open(cfg_file, 'r', encoding='utf-8') as f:
                cdata = json.load(f)
                b = cdata.get('broker', {})
                if not server and b.get('server'):
                    server = b['server']
                if not login and b.get('login'):
                    login = str(b['login'])
                if not password and b.get('password'):
                    password = b['password']
                if not mt5_path and b.get('mt5_path'):
                    mt5_path = b['mt5_path']
    except Exception:
        pass
    
    init_kwargs = {"timeout": 15000}
    if mt5_path:
        init_kwargs["path"] = mt5_path
    if server:
        init_kwargs["server"] = server
    if login:
        try:
            init_kwargs["login"] = int(login)
        except ValueError:
            pass
    if password:
        init_kwargs["password"] = password
        
    try:
        if not mt5.initialize(**init_kwargs):
            return False
        return True
    except Exception:
        return False

def command_read_account(mt5):
    account_info = mt5.account_info()
    terminal_info = mt5.terminal_info()
    
    if account_info is None or terminal_info is None:
        error_code = mt5.last_error()
        output_error("Không thể lấy thông tin tài khoản", {"error_code": error_code})
        return
        
    data = {
        "success": True,
        "connected": True,
        "status": "Kết nối thành công",
        "read_only": True,
        "account": {
            "login": account_info.login,
            "server": account_info.server,
            "name": getattr(account_info, 'name', ''),
            "mode": account_info.trade_mode,
            "currency": account_info.currency,
            "balance": account_info.balance,
            "equity": account_info.equity,
            "margin": account_info.margin,
            "margin_free": account_info.margin_free,
            "margin_level": getattr(account_info, 'margin_level', 0.0),
            "leverage": getattr(account_info, 'leverage', 100),
            "profit": account_info.profit,
            "position_count": mt5.positions_total()
        },
        "terminal": {
            "connected": terminal_info.connected,
            "company": terminal_info.company,
            "name": terminal_info.name,
            "path": terminal_info.path
        }
    }
    output_json(data)

def command_read_symbols(mt5, symbols_requested: List[str]):
    mapping = {}
    symbols_data = []
    
    all_symbols = mt5.symbols_get()
    if all_symbols is None:
        output_error("Không thể lấy danh sách symbol", {"error_code": mt5.last_error()})
        return
        
    all_names = [s.name for s in all_symbols]
    
    for req_sym in symbols_requested:
        target = req_sym.upper()
        found_name = None
        
        if target in all_names:
            found_name = target
        else:
            # Try to find with suffix/prefix
            for name in all_names:
                if target in name.upper():
                    found_name = name
                    break
                    
        if found_name:
            mapping[target] = found_name
            info = mt5.symbol_info(found_name)
            if info:
                symbols_data.append({
                    "name": info.name,
                    "description": info.description,
                    "digits": info.digits,
                    "spread": info.spread,
                    "trade_contract_size": info.trade_contract_size,
                    "volume_min": info.volume_min,
                    "volume_max": info.volume_max,
                    "volume_step": info.volume_step,
                    "trade_tick_size": info.trade_tick_size,
                    "trade_tick_value": info.trade_tick_value,
                    "currency_profit": info.currency_profit,
                    "trade_mode": info.trade_mode,
                    "trade_stops_level": info.trade_stops_level
                })
                
    output_json({
        "success": True,
        "mapping": mapping,
        "symbols": symbols_data
    })

def command_read_positions(mt5):
    positions = mt5.positions_get()
    if positions is None:
        error_code = mt5.last_error()
        if error_code[0] == 1: # MT5_RES_OK but no positions
            positions = ()
        else:
            output_error("Không thể lấy danh sách vị thế", {"error_code": error_code})
            return
            
    pos_data = []
    for p in positions:
        pos_data.append({
            "ticket": p.ticket,
            "symbol": p.symbol,
            "type": "buy" if p.type == mt5.POSITION_TYPE_BUY else ("sell" if p.type == mt5.POSITION_TYPE_SELL else str(p.type)),
            "volume": p.volume,
            "price_open": p.price_open,
            "sl": p.sl,
            "tp": p.tp,
            "price_current": p.price_current,
            "profit": p.profit,
            "swap": p.swap,
            "commission": getattr(p, 'commission', 0.0),
            "time": p.time,
            "magic": p.magic,
            "comment": p.comment
        })
        
    output_json({
        "success": True,
        "positions": pos_data
    })

def command_read_history(mt5, days: int):
    now = datetime.datetime.now()
    delta = datetime.timedelta(days=days)
    date_from = now - delta
    
    deals = mt5.history_deals_get(date_from, now)
    if deals is None:
        error_code = mt5.last_error()
        if error_code[0] == 1:
            deals = ()
        else:
            output_error("Không thể lấy lịch sử giao dịch", {"error_code": error_code})
            return
            
    deals_data = []
    for d in deals:
        deals_data.append({
            "ticket": d.ticket,
            "order": d.order,
            "symbol": d.symbol,
            "type": "buy" if d.type == mt5.DEAL_TYPE_BUY else ("sell" if d.type == mt5.DEAL_TYPE_SELL else str(d.type)),
            "volume": d.volume,
            "price": d.price,
            "profit": d.profit,
            "swap": d.swap,
            "commission": d.commission,
            "fee": d.fee,
            "time": d.time,
            "comment": d.comment
        })
        
    output_json({
        "success": True,
        "history": deals_data
    })

def command_read_ohlc(mt5, symbol: str, timeframe_str: str, count: int):
    tf_map = {
        "M1": mt5.TIMEFRAME_M1,
        "M5": mt5.TIMEFRAME_M5,
        "M15": mt5.TIMEFRAME_M15,
        "M30": mt5.TIMEFRAME_M30,
        "H1": mt5.TIMEFRAME_H1,
        "H4": mt5.TIMEFRAME_H4,
        "D1": mt5.TIMEFRAME_D1,
        "W1": mt5.TIMEFRAME_W1,
        "MN1": mt5.TIMEFRAME_MN1
    }
    
    if timeframe_str not in tf_map:
        output_error(f"Timeframe không hợp lệ: {timeframe_str}")
        return
        
    tf = tf_map[timeframe_str]
    rates = mt5.copy_rates_from_pos(symbol, tf, 0, count)
    
    if rates is None:
        output_error("Không thể lấy dữ liệu nến", {"error_code": mt5.last_error()})
        return
        
    rates_data = []
    for r in rates:
        rates_data.append({
            "time": int(r['time']),
            "open": float(r['open']),
            "high": float(r['high']),
            "low": float(r['low']),
            "close": float(r['close']),
            "tick_volume": int(r['tick_volume']),
            "spread": int(r['spread']),
            "real_volume": int(r['real_volume'])
        })
        
    output_json({
        "success": True,
        "rates": rates_data
    })

def command_read_ticks(mt5, symbol: str, count: int):
    ticks = mt5.copy_ticks_from_pos(symbol, 0, count, mt5.COPY_TICKS_ALL)
    
    if ticks is None:
        output_error("Không thể lấy dữ liệu tick", {"error_code": mt5.last_error()})
        return
        
    ticks_data = []
    for t in ticks:
        ticks_data.append({
            "time": int(t['time']),
            "bid": float(t['bid']),
            "ask": float(t['ask']),
            "last": float(t['last']),
            "volume": int(t['volume']),
            "flags": int(t['flags'])
        })
        
    output_json({
        "success": True,
        "ticks": ticks_data
    })

def command_close_position(mt5, ticket: int):
    positions = mt5.positions_get(ticket=ticket)
    if not positions or len(positions) == 0:
        output_error(f"Vị thế #{ticket} không tồn tại hoặc đã đóng.")
        return
    pos = positions[0]
    symbol = pos.symbol
    volume = pos.volume
    pos_type = pos.type
    close_type = mt5.ORDER_TYPE_SELL if pos_type == mt5.ORDER_TYPE_BUY else mt5.ORDER_TYPE_BUY
    
    mt5.symbol_select(symbol, True)
    tick = mt5.symbol_info_tick(symbol)
    if not tick:
        output_error(f"Không thể lấy giá hiện tại cho {symbol}")
        return
        
    price = tick.bid if close_type == mt5.ORDER_TYPE_SELL else tick.ask
    magic = getattr(pos, 'magic', 202688) or 202688
    
    request = {
        "action": mt5.TRADE_ACTION_DEAL,
        "position": int(ticket),
        "symbol": symbol,
        "volume": float(volume),
        "type": close_type,
        "price": price,
        "deviation": 20,
        "magic": magic,
        "comment": "Lucky-AI-Close",
        "type_time": mt5.ORDER_TIME_GTC,
        "type_filling": mt5.ORDER_FILLING_IOC,
    }
    
    result = mt5.order_send(request)
    if result is None or result.retcode != mt5.TRADE_RETCODE_DONE:
        err_msg = getattr(result, "comment", None) or f"Retcode: {getattr(result, 'retcode', mt5.last_error())}"
        output_error(f"Đóng lệnh thất bại: {err_msg}", {"retcode": getattr(result, 'retcode', None)})
        return
        
    output_json({
        "success": True,
        "ticket": ticket,
        "symbol": symbol,
        "volume": volume,
        "closed_price": result.price,
        "message": f"Đã đóng vị thế #{ticket} thành công tại giá {result.price}"
    })

def command_order_send(mt5, symbol: str, side: str, volume: float, sl: Optional[float] = None, tp: Optional[float] = None, comment: str = "Lucky-AI"):
    symbol = symbol.upper()
    mt5.symbol_select(symbol, True)
    info = mt5.symbol_info(symbol)
    if not info:
        output_error(f"Không tìm thấy mã {symbol} trên sàn.")
        return
    tick = mt5.symbol_info_tick(symbol)
    if not tick:
        output_error(f"Không có tick giá cho mã {symbol}")
        return
        
    is_buy = side.upper() in ("BUY", "LONG")
    price = tick.ask if is_buy else tick.bid
    order_type = mt5.ORDER_TYPE_BUY if is_buy else mt5.ORDER_TYPE_SELL
    
    request = {
        "action": mt5.TRADE_ACTION_DEAL,
        "symbol": symbol,
        "volume": float(volume),
        "type": order_type,
        "price": price,
        "deviation": 20,
        "magic": 202688,
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
        err_msg = getattr(result, "comment", None) or f"Retcode: {getattr(result, 'retcode', mt5.last_error())}"
        output_error(f"Đặt lệnh thất bại: {err_msg}", {"retcode": getattr(result, 'retcode', None)})
        return
        
    output_json({
        "success": True,
        "ticket": result.order,
        "symbol": symbol,
        "volume": result.volume,
        "price": result.price,
        "comment": result.comment,
        "message": f"Đặt lệnh thành công #{result.order} {side} {volume} {symbol} tại giá {result.price}"
    })

def main():
    parser = argparse.ArgumentParser(description="LUCKY_TRADE_AI MT5 Adapter")
    parser.add_argument("command", choices=[
        "read_account", 
        "read_symbols", 
        "read_positions", 
        "read_history", 
        "read_ohlc", 
        "read_ticks",
        "close_position",
        "order_send"
    ], help="Lệnh cần thực thi")
    
    parser.add_argument("--symbols", nargs="+", help="Danh sách symbols cho lệnh read_symbols")
    parser.add_argument("--days", type=int, default=30, help="Số ngày cho lệnh read_history")
    parser.add_argument("--symbol", type=str, help="Symbol cho lệnh read_ohlc, read_ticks, order_send")
    parser.add_argument("--side", type=str, default="BUY", help="BUY hoặc SELL cho order_send")
    parser.add_argument("--volume", type=float, default=0.01, help="Khối lượng lot cho order_send")
    parser.add_argument("--sl", type=float, default=None, help="Stop loss price cho order_send")
    parser.add_argument("--tp", type=float, default=None, help="Take profit price cho order_send")
    parser.add_argument("--ticket", type=int, default=None, help="Ticket ID cho lệnh close_position")
    parser.add_argument("--timeframe", type=str, default="H1", help="Timeframe cho lệnh read_ohlc")
    parser.add_argument("--count", type=int, default=100, help="Số lượng nến/tick cho lệnh read_ohlc và read_ticks")
    
    args = parser.parse_args()
    
    mt5 = import_mt5()
    if mt5 is None:
        output_error("Thư viện MetaTrader5 không khả dụng. Vui lòng cài đặt: pip install MetaTrader5")
        return

    if not initialize_mt5(mt5):
        error_code = mt5.last_error()
        msg = "Không thể khởi tạo MetaTrader 5."
        if isinstance(error_code, (tuple, list)) and len(error_code) > 0 and error_code[0] == -10003:
            msg = "Chưa phát hiện phần mềm MetaTrader 5 cài trên máy. Anh vui lòng tải và cài đặt MT5 (từ nút 'Mở' trong trang FTMO Free Trial), sau đó đăng nhập tài khoản 1514763831 trên máy chủ FTMO-Demo."
        output_error(msg, {"error_code": error_code})
        return
        
    try:
        if args.command == "read_account":
            command_read_account(mt5)
        elif args.command == "read_symbols":
            if not args.symbols:
                output_error("Lệnh read_symbols yêu cầu tham số --symbols")
                return
            command_read_symbols(mt5, args.symbols)
        elif args.command == "read_positions":
            command_read_positions(mt5)
        elif args.command == "read_history":
            command_read_history(mt5, args.days)
        elif args.command == "read_ohlc":
            if not args.symbol:
                output_error("Lệnh read_ohlc yêu cầu tham số --symbol")
                return
            command_read_ohlc(mt5, args.symbol, args.timeframe, args.count)
        elif args.command == "read_ticks":
            if not args.symbol:
                output_error("Lệnh read_ticks yêu cầu tham số --symbol")
                return
            command_read_ticks(mt5, args.symbol, args.count)
        elif args.command == "close_position":
            if not args.ticket:
                output_error("Lệnh close_position yêu cầu tham số --ticket")
                return
            command_close_position(mt5, args.ticket)
        elif args.command == "order_send":
            if not args.symbol:
                output_error("Lệnh order_send yêu cầu tham số --symbol")
                return
            command_order_send(mt5, args.symbol, args.side, args.volume, args.sl, args.tp)
    finally:
        mt5.shutdown()

if __name__ == "__main__":
    main()


def read_positions(mt5_path: Optional[str] = None) -> List[Dict[str, Any]]:
    """Helper gọi subprocess read_positions an toàn."""
    import subprocess
    from pathlib import Path
    cmd = [sys.executable, str(Path(__file__).resolve()), 'read_positions']
    env = os.environ.copy()
    if mt5_path:
        env['LUCKY_MT5_PATH'] = mt5_path
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=10, env=env)
        if proc.returncode == 0:
            data = json.loads(proc.stdout)
            return data.get('positions', [])
    except Exception:
        pass
    return []
