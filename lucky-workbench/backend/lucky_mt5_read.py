"""Read-only probe. No login/password handling or trade operations."""
import json
import os


def read():
    try:
        import MetaTrader5 as mt5
    except ImportError:
        return {"connected": False, "status": "SDK_MISSING", "message": "Chưa cài SDK MetaTrader5 trong Python đang chạy. Không có dữ liệu broker."}
    try:
        path = os.environ.get("LUCKY_MT5_PATH")
        ok = mt5.initialize(path, timeout=10000) if path else mt5.initialize(timeout=10000)
        if not ok:
            return {"connected": False, "status": "TERMINAL_UNAVAILABLE", "message": "Chưa kết nối được terminal MT5 đang đăng nhập."}
        account, terminal = mt5.account_info(), mt5.terminal_info()
        if account is None or terminal is None or not terminal.connected:
            return {"connected": False, "status": "DISCONNECTED", "message": "Terminal không có phiên broker hợp lệ."}
        mode = {mt5.ACCOUNT_TRADE_MODE_DEMO: "DEMO", mt5.ACCOUNT_TRADE_MODE_REAL: "LIVE", mt5.ACCOUNT_TRADE_MODE_CONTEST: "CONTEST"}.get(account.trade_mode, "UNKNOWN")
        return {"connected": True, "status": "READ_ONLY", "readOnly": True,
                "account": {"mode": mode, "currency": account.currency, "balance": account.balance, "equity": account.equity},
                "message": "Đọc trực tiếp phiên terminal. Không gửi, sửa hoặc đóng lệnh; chart nghiên cứu vẫn là synthetic."}
    except Exception:
        return {"connected": False, "status": "PROBE_ERROR", "message": "Không đọc được terminal; kiểm tra phiên và đường dẫn local."}
    finally:
        mt5.shutdown()


if __name__ == "__main__":
    print(json.dumps(read(), ensure_ascii=True, allow_nan=False))
