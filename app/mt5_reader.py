"""Read-only MT5 worker in a separate process so terminal IPC can time out."""
import json
import os


def read():
    try:
        import MetaTrader5 as mt5
    except ImportError:
        return {"connected": False, "status": "missing_package", "message": "Chưa cài MetaTrader5 trong môi trường chạy app. Xem hướng dẫn kết nối trong README."}
    try:
        path = os.environ.get('LUCKY_MT5_PATH')
        initialized = mt5.initialize(path, timeout=10000) if path else mt5.initialize(timeout=10000)
        if not initialized:
            return {"connected": False, "status": "disconnected", "message": "Chưa kết nối được terminal. Mở MT5, đăng nhập tài khoản và kiểm tra đường dẫn LUCKY_MT5_PATH."}
        account = mt5.account_info()
        terminal = mt5.terminal_info()
        if account is None or terminal is None:
            return {"connected": False, "status": "disconnected", "message": "Terminal chưa cung cấp thông tin tài khoản."}
        modes = {mt5.ACCOUNT_TRADE_MODE_DEMO: 'demo', mt5.ACCOUNT_TRADE_MODE_CONTEST: 'contest', mt5.ACCOUNT_TRADE_MODE_REAL: 'real'}
        positions = mt5.positions_get()
        return {"connected": bool(terminal.connected), "status": "connected" if terminal.connected else "disconnected", "read_only": True, "source": "MT5 terminal", "account": {"mode": modes.get(account.trade_mode, 'unknown'), "currency": account.currency, "balance": account.balance, "equity": account.equity, "margin": account.margin, "position_count": len(positions) if positions is not None else None}, "message": "Chỉ đọc thông tin từ phiên MT5 hiện tại. Không gửi hoặc sửa lệnh broker."}
    except Exception:
        return {"connected": False, "status": "error", "message": "Không đọc được terminal MT5. Kiểm tra phiên đăng nhập và phiên bản package."}
    finally:
        mt5.shutdown()


if __name__ == '__main__':
    print(json.dumps(read(), ensure_ascii=False, allow_nan=False))
