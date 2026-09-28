import os
import sys
import json
import argparse
import logging

# Setup stderr logging for safety
logger = logging.getLogger('mt5_writer')
logger.setLevel(logging.INFO)
ch = logging.StreamHandler(sys.stderr)
ch.setFormatter(logging.Formatter('{"time": "%(asctime)s", "level": "%(levelname)s", "message": "%(message)s"}'))
logger.addHandler(ch)

mt5 = None


def import_mt5():
    """Import MetaTrader5 dynamically — graceful fallback nếu chưa cài."""
    global mt5
    try:
        import MetaTrader5 as _mt5
        mt5 = _mt5
        return True
    except ImportError:
        return False


def get_filling_mode(symbol: str) -> int:
    """Lấy chế độ khớp lệnh (filling mode) được hỗ trợ bởi symbol."""
    symbol_info = mt5.symbol_info(symbol)
    if symbol_info is None:
        raise ValueError(f"Không tìm thấy thông tin cho {symbol}")
    
    modes = symbol_info.filling_mode
    if modes & mt5.SYMBOL_FILLING_FOK:
        return mt5.ORDER_FILLING_FOK
    elif modes & mt5.SYMBOL_FILLING_IOC:
        return mt5.ORDER_FILLING_IOC
    elif modes & mt5.SYMBOL_FILLING_RETURN:
        return mt5.ORDER_FILLING_RETURN
    else:
        # Dự phòng nếu không xác định được
        return mt5.ORDER_FILLING_FOK


def check_demo_only():
    """Kiểm tra và từ chối nếu đang ở tài khoản thật (Real) khi bật --demo-only."""
    account_info = mt5.account_info()
    if account_info is None:
        raise RuntimeError("Không lấy được thông tin tài khoản MT5.")
    
    # Trade mode: 0 (Demo), 1 (Contest), 2 (Real)
    if account_info.trade_mode == mt5.ACCOUNT_TRADE_MODE_REAL:
        raise RuntimeError("LỖI CẤM: Đang dùng tài khoản thật (Real). Bị từ chối bởi cờ --demo-only.")


def handle_send_order(data: dict, dry_run: bool):
    """
    Gửi lệnh mới.
    Input: {"symbol": "EURUSD", "side": "BUY", "volume": 0.01, "sl": 1.0800, "tp": 1.0900, "magic": 202601, "comment": "Lucky #123", "deviation": 20}
    """
    symbol = data.get('symbol')
    side = data.get('side', '').upper()
    volume = data.get('volume')
    sl = data.get('sl')
    tp = data.get('tp')
    magic = data.get('magic', 0)
    comment = data.get('comment', '')
    deviation = data.get('deviation', 20)

    if not all([symbol, side, volume, sl, tp]):
        raise ValueError("Thiếu tham số bắt buộc cho lệnh gửi (symbol, side, volume, sl, tp). KHÔNG BAO GIỜ đặt lệnh thị trường thiếu SL/TP.")
    
    volume = float(volume)
    sl = float(sl)
    tp = float(tp)

    if side == "BUY":
        order_type = mt5.ORDER_TYPE_BUY
        price = mt5.symbol_info_tick(symbol).ask
    elif side == "SELL":
        order_type = mt5.ORDER_TYPE_SELL
        price = mt5.symbol_info_tick(symbol).bid
    else:
        raise ValueError(f"Hướng giao dịch không hợp lệ: {side}")

    filling = get_filling_mode(symbol)

    request = {
        "action": mt5.TRADE_ACTION_DEAL,
        "symbol": symbol,
        "volume": volume,
        "type": order_type,
        "price": price,
        "sl": sl,
        "tp": tp,
        "deviation": deviation,
        "magic": magic,
        "comment": comment,
        "type_time": mt5.ORDER_TIME_GTC,
        "type_filling": filling,
    }

    logger.info(f"Yêu cầu gửi lệnh: {json.dumps(request)}")

    if dry_run:
        return {"success": True, "ticket": 0, "retcode": 10009, "retcode_desc": "DRY_RUN", "message": "Chạy thử (Dry-run) - Không gửi lệnh."}

    result = mt5.order_send(request)
    
    if result is None:
        raise RuntimeError(f"Gửi lệnh thất bại: mã lỗi nội bộ MT5 = {mt5.last_error()}")

    # 10009: TRADE_RETCODE_DONE, 10008: TRADE_RETCODE_PLACED
    success = result.retcode in (10009, 10008)
    
    return {
        "success": success,
        "ticket": result.order if hasattr(result, 'order') else getattr(result, 'deal', 0),
        "retcode": result.retcode,
        "retcode_desc": result.comment,
        "price": result.price if hasattr(result, 'price') else 0.0,
        "volume": result.volume if hasattr(result, 'volume') else volume,
        "comment": comment,
        "request_id": result.request_id if hasattr(result, 'request_id') else 0,
        "message": "Gửi lệnh thành công" if success else f"Gửi lệnh thất bại: {result.comment}"
    }


def handle_modify_order(data: dict, dry_run: bool):
    """
    Sửa lệnh (SL/TP).
    Input: {"ticket": 12345, "sl": 1.0790, "tp": 1.0920}
    """
    ticket = data.get('ticket')
    sl = data.get('sl')
    tp = data.get('tp')

    if not ticket or sl is None or tp is None:
        raise ValueError("Thiếu tham số (ticket, sl, tp).")

    ticket = int(ticket)
    sl = float(sl)
    tp = float(tp)

    positions = mt5.positions_get(ticket=ticket)
    if not positions:
        raise ValueError(f"Không tìm thấy vị thế với ticket: {ticket}")
    
    pos = positions[0]

    request = {
        "action": mt5.TRADE_ACTION_SLTP,
        "position": ticket,
        "symbol": pos.symbol,
        "sl": sl,
        "tp": tp,
    }

    logger.info(f"Yêu cầu sửa lệnh: {json.dumps(request)}")

    if dry_run:
        return {"success": True, "ticket": ticket, "retcode": 10009, "retcode_desc": "DRY_RUN", "message": "Chạy thử - Sửa lệnh."}

    result = mt5.order_send(request)
    
    if result is None:
        raise RuntimeError(f"Sửa lệnh thất bại: {mt5.last_error()}")

    success = result.retcode in (10009, 10008)
    
    return {
        "success": success,
        "ticket": ticket,
        "retcode": result.retcode,
        "retcode_desc": result.comment,
        "message": "Sửa lệnh thành công" if success else f"Sửa lệnh thất bại: {result.comment}"
    }


def handle_close_position(data: dict, dry_run: bool):
    """
    Đóng lệnh (toàn phần hoặc một phần).
    Input: {"ticket": 12345, "volume": 0.01}
    """
    ticket = data.get('ticket')
    if not ticket:
        raise ValueError("Thiếu tham số ticket để đóng vị thế.")
    
    ticket = int(ticket)
    
    positions = mt5.positions_get(ticket=ticket)
    if not positions:
        raise ValueError(f"Không tìm thấy vị thế với ticket: {ticket}")
    
    pos = positions[0]
    
    close_vol = data.get('volume')
    if close_vol:
        close_vol = float(close_vol)
    else:
        close_vol = pos.volume
        
    symbol = pos.symbol
    filling = get_filling_mode(symbol)
    
    # Auto-detect opposite side
    if pos.type == mt5.POSITION_TYPE_BUY:
        order_type = mt5.ORDER_TYPE_SELL
        price = mt5.symbol_info_tick(symbol).bid
    elif pos.type == mt5.POSITION_TYPE_SELL:
        order_type = mt5.ORDER_TYPE_BUY
        price = mt5.symbol_info_tick(symbol).ask
    else:
        raise ValueError(f"Loại vị thế không hợp lệ: {pos.type}")

    request = {
        "action": mt5.TRADE_ACTION_DEAL,
        "position": ticket,
        "symbol": symbol,
        "volume": close_vol,
        "type": order_type,
        "price": price,
        "deviation": 20,
        "type_time": mt5.ORDER_TIME_GTC,
        "type_filling": filling,
    }

    logger.info(f"Yêu cầu đóng lệnh: {json.dumps(request)}")

    if dry_run:
        return {"success": True, "ticket": ticket, "retcode": 10009, "retcode_desc": "DRY_RUN", "message": "Chạy thử - Đóng lệnh."}

    result = mt5.order_send(request)
    
    if result is None:
        raise RuntimeError(f"Đóng lệnh thất bại: {mt5.last_error()}")

    success = result.retcode in (10009, 10008)
    
    return {
        "success": success,
        "ticket": ticket,
        "retcode": result.retcode,
        "retcode_desc": result.comment,
        "message": "Đóng lệnh thành công" if success else f"Đóng lệnh thất bại: {result.comment}"
    }


def main():
    parser = argparse.ArgumentParser(description="MT5 Writer Subprocess Worker")
    parser.add_argument("command", choices=["send_order", "modify_order", "close_position"], help="Lệnh thực thi")
    parser.add_argument("--dry-run", action="store_true", help="Chạy thử, không gửi lệnh thực sự")
    parser.add_argument("--demo-only", action="store_true", help="Chỉ cho phép chạy trên tài khoản Demo")
    
    args = parser.parse_args()

    # Read payload from stdin
    input_data = sys.stdin.read().strip()
    if not input_data:
        logger.error("Không có dữ liệu đầu vào (stdin).")
        sys.exit(1)

    try:
        payload = json.loads(input_data)
    except json.JSONDecodeError as e:
        logger.error(f"Lỗi cú pháp JSON từ stdin: {e}")
        sys.exit(1)

    # Dynamic import
    if not import_mt5():
        error_result = {"success": False, "error": "Thư viện MetaTrader5 không khả dụng. Cài đặt: pip install MetaTrader5", "retcode": -1}
        print(json.dumps(error_result))
        sys.exit(1)

    try:
        # Initialize MT5 with optional path
        mt5_path = os.environ.get("LUCKY_MT5_PATH")
        init_kwargs = {"timeout": 10000}
        if mt5_path:
            init_kwargs["path"] = mt5_path
        if not mt5.initialize(**init_kwargs):
            raise RuntimeError(f"Khởi tạo MT5 thất bại, mã lỗi = {mt5.last_error()}")
        
        if args.demo_only:
            check_demo_only()

        if args.command == "send_order":
            result = handle_send_order(payload, args.dry_run)
        elif args.command == "modify_order":
            result = handle_modify_order(payload, args.dry_run)
        elif args.command == "close_position":
            result = handle_close_position(payload, args.dry_run)
        else:
            raise ValueError(f"Lệnh không được hỗ trợ: {args.command}")
        
        # Output JSON result to stdout
        print(json.dumps(result))
        
    except Exception as e:
        logger.error(f"Lỗi thực thi: {str(e)}")
        error_result = {
            "success": False,
            "error": str(e),
            "retcode": -1,
            "message": "Đã xảy ra lỗi nghiêm trọng"
        }
        print(json.dumps(error_result))
        sys.exit(1)
        
    finally:
        mt5.shutdown()


if __name__ == "__main__":
    main()
