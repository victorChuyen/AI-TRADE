import sqlite3
import os
import json
from pathlib import Path

db_path = Path(r"D:\TRADE-AI\data\lucky.sqlite3")
if db_path.exists():
    conn = sqlite3.connect(str(db_path))
    cur = conn.cursor()
    cur.execute("DELETE FROM positions;")
    cur.execute("DELETE FROM proposals;")
    cur.execute("DELETE FROM events;")
    cur.execute("DELETE FROM requests;")
    cur.execute("DELETE FROM state;")

    clean_state = {
        "balance": 10000.0,
        "initial": 10000.0,
        "step": 0,
        "halted": False,
        "risk_pct": 0.35,
        "daily_pct": 1.2,
        "total_pct": 2.0,
        "max_positions": 5,
        "day_equity": 10000.0,
        "daily_halted": False,
        "auto_mode": True
    }
    cur.execute("INSERT INTO state (id, payload) VALUES (1, ?)", (json.dumps(clean_state),))
    cur.execute(
        "INSERT INTO events (time, kind, message) VALUES (datetime('now'), 'system', 'Hệ thống thực chiến Lucky Trade AI khởi tạo. Kết nối tài khoản Chuyền Ngọc #5056580335 MetaQuotes-Demo.')"
    )
    conn.commit()
    conn.close()
    print("Database cleaned successfully: 0 mock positions, initial $10,000!")
else:
    print("Database does not exist yet.")
