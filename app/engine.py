"""Persistent paper broker; all mutations are serialized and transactional."""
import json
import math
import sqlite3
import threading
from contextlib import contextmanager
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from pathlib import Path
import time
from .market import SYMBOLS, COMMISSION_PER_LOT, START, candle, quote, snapshot
from .strategies import TrendFollowingStrategy, DonchianBreakoutStrategy, BollingerMeanReversionStrategy
from .execution.semi_auto import SemiAutoExecutor
from .execution.reconciler import PositionReconciler


class Rejected(ValueError):
    pass


def number(value, name, low, high):
    if isinstance(value, bool):
        raise Rejected(f"{name} phải là số hợp lệ.")
    try:
        value = float(value)
    except (ValueError, TypeError):
        raise Rejected(f"{name} phải là số hợp lệ.")
    if not math.isfinite(value) or not low <= value <= high:
        raise Rejected(f"{name} phải nằm trong khoảng {low}–{high}.")
    return value


class Engine:
    def __init__(self, path):
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        self.path = str(path)
        self.lock = threading.RLock()
        with self.db() as db:
            db.executescript('''
                CREATE TABLE IF NOT EXISTS state (id INTEGER PRIMARY KEY, payload TEXT NOT NULL);
                CREATE TABLE IF NOT EXISTS positions (id INTEGER PRIMARY KEY AUTOINCREMENT, symbol TEXT, side TEXT, volume REAL, entry REAL, sl REAL, tp REAL, fee REAL, opened INTEGER, closed INTEGER, exit REAL, pnl REAL, reason TEXT, ticket INTEGER);
                CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, time TEXT, kind TEXT, message TEXT);
                CREATE TABLE IF NOT EXISTS requests (id TEXT PRIMARY KEY, payload TEXT, result TEXT);
                CREATE TABLE IF NOT EXISTS proposals (id INTEGER PRIMARY KEY AUTOINCREMENT, step INTEGER, time TEXT, symbol TEXT, strategy TEXT, side TEXT, entry REAL, sl REAL, tp REAL, volume REAL, reason TEXT, status TEXT DEFAULT 'pending', expires_at TEXT, ticket INTEGER, result_json TEXT);
            ''')
            # Column migration if upgrading existing db
            prop_cols = [r['name'] for r in db.execute("PRAGMA table_info(proposals)").fetchall()]
            if 'expires_at' not in prop_cols:
                db.execute("ALTER TABLE proposals ADD COLUMN expires_at TEXT")
            if 'ticket' not in prop_cols:
                db.execute("ALTER TABLE proposals ADD COLUMN ticket INTEGER")
            if 'result_json' not in prop_cols:
                db.execute("ALTER TABLE proposals ADD COLUMN result_json TEXT")

            pos_cols = [r['name'] for r in db.execute("PRAGMA table_info(positions)").fetchall()]
            if 'ticket' not in pos_cols:
                db.execute("ALTER TABLE positions ADD COLUMN ticket INTEGER")

            self.strategies = [
                TrendFollowingStrategy(fast_period=5, slow_period=15, atr_period=10, min_atr_threshold=Decimal('0.00001'), max_atr_threshold=Decimal('500.0')),
                DonchianBreakoutStrategy(period=10, atr_period=10),
                BollingerMeanReversionStrategy(bb_period=10, rsi_period=10, rsi_oversold=Decimal('40'), rsi_overbought=Decimal('60'))
            ]
            self.executor = SemiAutoExecutor(mode='paper')
            self.reconciler = PositionReconciler(self)
            if not db.execute('SELECT 1 FROM state').fetchone():
                self.save(db, {"balance": 50000.0, "initial": 50000.0, "step": 120, "halted": False, "risk_pct": .5, "daily_pct": 2.0, "total_pct": 2.0, "max_positions": 5, "day_equity": 50000.0, "daily_halted": False})
                self.event(db, "system", "Khởi tạo tài khoản giấy $50,000. Dữ liệu giá tổng hợp 6 sản phẩm, không kết nối broker.")
                s = self.load(db)
                self.generate_proposals(db, s)

    @contextmanager
    def db(self):
        with self.lock:
            conn = sqlite3.connect(self.path, timeout=10)
            conn.row_factory = sqlite3.Row
            try:
                conn.execute('BEGIN IMMEDIATE')
                yield conn
                conn.commit()
            except Exception:
                conn.rollback()
                raise
            finally:
                conn.close()

    def load(self, db):
        state = json.loads(db.execute('SELECT payload FROM state WHERE id=1').fetchone()[0])
        if 'auto_mode' not in state:
            state['auto_mode'] = False
        return state

    def save(self, db, state):
        db.execute('INSERT OR REPLACE INTO state VALUES (1,?)', (json.dumps(state, allow_nan=False),))

    def event(self, db, kind, message):
        db.execute('INSERT INTO events(time,kind,message) VALUES(?,?,?)', (datetime.now(timezone.utc).isoformat(), kind, message))

    def positions(self, db, state):
        rows = [dict(p) for p in db.execute('SELECT * FROM positions WHERE closed IS NULL ORDER BY id DESC')]
        for p in rows:
            q = quote(p['symbol'], state['step'])
            p['mark'] = q['bid'] if p['side'] == 'BUY' else q['ask']
            p['floating'] = round(self.profit(p, p['mark']), 2)
            p['risk'] = round(max(0, -self.profit(p, p['sl'])) + p['fee'], 2)
        return rows

    def profit(self, p, price):
        raw = (price - p['entry']) * (1 if p['side'] == 'BUY' else -1) * p['volume'] * SYMBOLS[p['symbol']]['contract']
        if p['symbol'] == 'USDJPY' and price > 0:
            return raw / price
        return raw

    def equity(self, db, s):
        return s['balance'] + sum(p['floating'] for p in self.positions(db, s))

    def generate_proposals(self, db, s):
        """Tự động phân tích và sinh đề xuất giao dịch từ 3 chiến lược cốt lõi."""
        if s.get('halted') or s.get('daily_halted'):
            return
            
        active_count = len(self.positions(db, s))
        if active_count >= s.get('max_positions', 5):
            return
            
        equity = self.equity(db, s)
        for sym, spec in SYMBOLS.items():
            bars = snapshot(sym, s['step'])['candles']
            for strat in self.strategies:
                existing = db.execute(
                    "SELECT 1 FROM proposals WHERE symbol=? AND strategy=? AND status='pending'", 
                    (sym, strat.name)
                ).fetchone()
                if existing:
                    continue
                    
                sig = strat.generate_signal(bars)
                if sig:
                    pts = abs(sig.entry - sig.sl)
                    if pts <= Decimal('0'):
                        continue
                        
                    risk_amount = equity * (s['risk_pct'] / 100.0)
                    contract_factor = spec['contract'] / (float(sig.entry) if sym == 'USDJPY' and sig.entry > 0 else 1.0)
                    denom = float(pts) * contract_factor + COMMISSION_PER_LOT
                    vol = math.floor(risk_amount / denom * 100) / 100.0 if denom > 0 else 0.01
                    vol = max(0.01, min(vol, 5.0))
                    
                    now_dt = datetime.now(timezone.utc)
                    now_iso = now_dt.isoformat()
                    exp_iso = (now_dt + timedelta(seconds=900)).isoformat()

                    db.execute('''
                        INSERT INTO proposals (step, time, symbol, strategy, side, entry, sl, tp, volume, reason, status, expires_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
                    ''', (s['step'], now_iso, sym, strat.name, sig.side,
                          float(sig.entry), float(sig.sl), float(sig.tp), vol, sig.reason, exp_iso))
                    self.event(db, 'proposal', f"Đề xuất {sig.side} {vol:.2f} {sym} từ {strat.name}.")

    def approve_proposal(self, proposal_id, request_id=None):
        """Phê duyệt đề xuất và mở lệnh thị trường (Bán tự động)."""
        req_id = request_id or f"prop-{proposal_id}-{int(time.time()*1000)}"
        return self.executor.approve_proposal(self, proposal_id, request_id=req_id)

    def reject_proposal(self, proposal_id, reason="Người dùng từ chối"):
        """Từ chối đề xuất giao dịch."""
        with self.db() as db:
            return self.executor.reject_proposal(db, proposal_id, reason=reason)

    def reconcile(self, mt5_positions_override=None, auto_heal=True):
        """Thực hiện đối soát vị thế giữa Database và MT5 Terminal."""
        return self.reconciler.reconcile(mt5_positions_override=mt5_positions_override, auto_heal=auto_heal)

    def state(self, symbol='EURUSD'):
        if symbol not in SYMBOLS:
            raise Rejected('Mã giao dịch không được hỗ trợ.')
        with self.db() as db:
            s = self.load(db)
            self.executor.clean_expired_proposals(db)
            # Tự sinh đề xuất nếu danh sách rỗng
            pending_count = db.execute("SELECT COUNT(*) FROM proposals WHERE status='pending'").fetchone()[0]
            if pending_count == 0:
                self.generate_proposals(db, s)
                
            positions = self.positions(db, s)
            history = [dict(p) for p in db.execute('SELECT * FROM positions WHERE closed IS NOT NULL ORDER BY id DESC LIMIT 200')]
            proposals = [dict(p) for p in db.execute("SELECT * FROM proposals WHERE status='pending' ORDER BY id DESC LIMIT 50")]
            equity = self.equity(db, s)
            return {
                "account": {
                    **s, 
                    "equity": round(equity, 2), 
                    "floating": round(equity - s['balance'], 2), 
                    "daily_pnl": round(equity - s['day_equity'], 2), 
                    "open_risk": round(sum(p['risk'] for p in positions), 2), 
                    "currency": "USD", 
                    "mode": "paper", 
                    "virtual_time": START + s['step'] * 900
                }, 
                "market": snapshot(symbol, s['step']), 
                "watchlist": [quote(x, s['step']) for x in SYMBOLS], 
                "positions": positions, 
                "history": history, 
                "proposals": proposals,
                "strategies": [{"name": st.name, "version": st.version} for st in self.strategies],
                "events": [dict(e) for e in db.execute('SELECT * FROM events ORDER BY id DESC LIMIT 100')]
            }

    def validate_order(self, db, s, body):
        symbol, side = body.get('symbol'), body.get('side')
        if symbol not in SYMBOLS or side not in ('BUY', 'SELL'):
            raise Rejected('Mã giao dịch hoặc chiều lệnh không hợp lệ.')
        if s['halted'] or s['daily_halted']:
            raise Rejected('Đang tạm dừng mở lệnh mới. Anh vẫn có thể đóng vị thế.')
        if body.get('step') != s['step']:
            raise Rejected('Giá đã thay đổi. Cập nhật phiếu lệnh rồi thử lại.')
        volume = number(body.get('volume'), 'Khối lượng', .01, 100)
        if abs(volume * 100 - round(volume * 100)) > 1e-7:
            raise Rejected('Khối lượng phải là bội số của 0.01 lot.')
        sl = number(body.get('sl'), 'Dừng lỗ', .00001, 1000000)
        tp = number(body.get('tp'), 'Chốt lời', .00001, 1000000)
        q = quote(symbol, s['step'])
        entry = q['ask'] if side == 'BUY' else q['bid']
        if side == 'BUY' and not sl < q['bid'] < entry < tp:
            raise Rejected('Lệnh mua cần SL dưới giá Bid và TP trên giá Ask.')
        if side == 'SELL' and not tp < entry < q['ask'] < sl:
            raise Rejected('Lệnh bán cần TP dưới giá Bid và SL trên giá Ask.')
        equity = self.equity(db, s)
        if equity <= 0 or s['day_equity'] - equity >= s['day_equity'] * s['daily_pct'] / 100:
            raise Rejected('Đã chạm giới hạn lỗ ngày mô phỏng.')
        fee = round(volume * COMMISSION_PER_LOT, 2)
        raw_risk = abs(entry - sl) * volume * SYMBOLS[symbol]['contract']
        if symbol == 'USDJPY' and entry > 0:
            raw_risk = raw_risk / entry
        risk = raw_risk + fee

        positions = self.positions(db, s)
        if len(positions) >= s['max_positions']:
            raise Rejected('Đã đạt số vị thế tối đa.')
        if risk > equity * s['risk_pct'] / 100 + 1e-7:
            raise Rejected(f"Rủi ro ${risk:.2f} vượt giới hạn ${equity * s['risk_pct'] / 100:.2f}/lệnh.")
        if risk + sum(p['risk'] for p in positions) > equity * s['total_pct'] / 100 + 1e-7:
            raise Rejected('Tổng rủi ro các vị thế vượt giới hạn.')

        # Paper margin model: fixed 1:30
        margin = entry * volume * SYMBOLS[symbol]['contract'] / 30
        if symbol == 'USDJPY' and entry > 0:
            margin = margin / entry

        used = 0.0
        for p in positions:
            m = p['entry'] * p['volume'] * SYMBOLS[p['symbol']]['contract'] / 30
            if p['symbol'] == 'USDJPY' and p['entry'] > 0:
                m = m / p['entry']
            used += m

        if used + margin + fee > equity:
            raise Rejected('Không đủ ký quỹ mô phỏng (đòn bẩy 1:30).')
        return {"symbol": symbol, "side": side, "volume": volume, "entry": entry, "sl": sl, "tp": tp, "fee": fee, "risk": round(risk, 2), "margin": round(margin, 2)}

    def order(self, body, preview=False):
        error = None
        with self.db() as db:
            s = self.load(db)
            key = body.get('request_id')
            payload = json.dumps({k: v for k, v in body.items() if k != 'request_id'}, sort_keys=True, allow_nan=False)
            if not preview:
                if not isinstance(key, str) or not 8 <= len(key) <= 100:
                    raise Rejected('Thiếu mã yêu cầu chống lặp lệnh.')
                old = db.execute('SELECT payload,result FROM requests WHERE id=?', (key,)).fetchone()
                if old:
                    if old['payload'] != payload:
                        raise Rejected('Mã yêu cầu đã được dùng cho phiếu lệnh khác.')
                    return json.loads(old['result'])
            try:
                order = self.validate_order(db, s, body)
            except Rejected as exc:
                error = exc
                if not preview:
                    self.event(db, 'blocked', str(exc))
            if not error and not preview:
                cursor = db.execute('INSERT INTO positions(symbol,side,volume,entry,sl,tp,fee,opened) VALUES(?,?,?,?,?,?,?,?)', tuple(order[k] for k in ('symbol','side','volume','entry','sl','tp','fee')) + (s['step'],))
                order['id'] = cursor.lastrowid
                s['balance'] = round(s['balance'] - order['fee'], 2)
                self.save(db, s)
                self.event(db, 'order', f"Mở lệnh giấy #{order['id']}: {order['side']} {order['volume']:.2f} {order['symbol']}, rủi ro ${order['risk']:.2f}.")
                db.execute('INSERT INTO requests VALUES(?,?,?)', (key, payload, json.dumps(order)))
        if error:
            raise error
        return order

    def close_one(self, db, s, p, price, reason):
        gross = round(self.profit(p, price), 2)
        s['balance'] = round(s['balance'] + gross, 2)
        db.execute('UPDATE positions SET closed=?,exit=?,pnl=?,reason=? WHERE id=?', (s['step'], price, round(gross - p['fee'], 2), reason, p['id']))
        self.event(db, 'close', f"Đóng lệnh giấy #{p['id']} · {reason} · P/L sau phí ${gross - p['fee']:.2f}.")

    def check_daily(self, db, s):
        if not s['daily_halted'] and s['day_equity'] - self.equity(db, s) >= s['day_equity'] * s['daily_pct'] / 100:
            s['daily_halted'] = True
            self.event(db, 'blocked', 'Chạm giới hạn lỗ ngày: khóa mở lệnh tới ngày mô phỏng kế tiếp.')

    def close_position(self, position_id):
        with self.db() as db:
            s = self.load(db)
            p = db.execute('SELECT * FROM positions WHERE id=? AND closed IS NULL', (position_id,)).fetchone()
            if not p:
                raise Rejected('Vị thế không tồn tại hoặc đã đóng.')
            q = quote(p['symbol'], s['step'])
            self.close_one(db, s, p, q['bid'] if p['side'] == 'BUY' else q['ask'], 'Đóng thủ công')
            self.check_daily(db, s)
            self.save(db, s)
        return {"ok": True}

    def advance(self, expected_step):
        with self.db() as db:
            s = self.load(db)
            if expected_step != s['step']:
                raise Rejected('Một cửa sổ khác đã chuyển nến. Đang đồng bộ lại.')
            if (s['step'] + 1) // 96 != s['step'] // 96:
                s['day_equity'] = self.equity(db, s)
                s['daily_halted'] = False
            s['step'] += 1
            for p in self.positions(db, s):
                b = candle(p['symbol'], s['step'])
                offset = 0 if p['side'] == 'BUY' else SYMBOLS[p['symbol']]['spread']
                high, low, opening = b['high'] + offset, b['low'] + offset, b['open'] + offset
                stop_hit = low <= p['sl'] if p['side'] == 'BUY' else high >= p['sl']
                take_hit = high >= p['tp'] if p['side'] == 'BUY' else low <= p['tp']
                # Conservative OHLC fill: if both touched, stop first; adverse gaps fill at open.
                if stop_hit:
                    fill = min(opening, p['sl']) if p['side'] == 'BUY' else max(opening, p['sl'])
                    self.close_one(db, s, p, fill, 'Stop loss')
                elif take_hit:
                    self.close_one(db, s, p, p['tp'], 'Take profit')
            self.check_daily(db, s)
            # Dọn dẹp các đề xuất cũ quá 4 bước nến
            db.execute("UPDATE proposals SET status='expired' WHERE status='pending' AND step < ?", (s['step'] - 4,))
            # Tự động sinh đề xuất cho bước nến mới
            self.generate_proposals(db, s)
            self.save(db, s)
            auto_mode = s.get('auto_mode', False)
            pending_ids = [row['id'] for row in db.execute("SELECT id FROM proposals WHERE status='pending'").fetchall()] if auto_mode else []

        # Tự động khớp lệnh các đề xuất đạt chuẩn RiskGate khi ở chế độ TỰ ĐỘNG
        if auto_mode and pending_ids:
            for pid in pending_ids:
                try:
                    self.approve_proposal(pid)
                except Exception:
                    pass

        return {"ok": True}

    def set_mode(self, auto_mode):
        if not isinstance(auto_mode, bool):
            raise Rejected('Chế độ phải là true (Tự động) hoặc false (Bán tự động).')
        with self.db() as db:
            s = self.load(db)
            s['auto_mode'] = auto_mode
            self.save(db, s)
            label = "TỰ ĐỘNG HOÀN TOÀN" if auto_mode else "BÁN TỰ ĐỘNG"
            self.event(db, 'system', f"Chuyển chế độ vận hành: {label}.")
            pending_ids = [row['id'] for row in db.execute("SELECT id FROM proposals WHERE status='pending'").fetchall()] if auto_mode else []

        # Khi chuyển sang TỰ ĐỘNG, lập tức duyệt các đề xuất đang chờ nếu thỏa mãn RiskGate
        if auto_mode and pending_ids:
            for pid in pending_ids:
                try:
                    self.approve_proposal(pid)
                except Exception:
                    pass

        return {"ok": True, "auto_mode": auto_mode}

    def settings(self, body):
        with self.db() as db:
            s = self.load(db)
            for key, low, high in [('risk_pct', .1, 2), ('daily_pct', .5, 10), ('total_pct', .1, 10), ('max_positions', 1, 20)]:
                if key in body:
                    value = number(body[key], key, low, high)
                    if key == 'max_positions' and value != int(value):
                        raise Rejected('Số vị thế phải là số nguyên.')
                    s[key] = value
            if s['total_pct'] < s['risk_pct']:
                raise Rejected('Tổng rủi ro phải lớn hơn hoặc bằng rủi ro mỗi lệnh.')
            self.check_daily(db, s)
            self.save(db, s)
            self.event(db, 'settings', 'Đã cập nhật giới hạn rủi ro tài khoản giấy.')
        return {"ok": True}

    def halt(self, halted):
        if not isinstance(halted, bool):
            raise Rejected('Trạng thái tạm dừng phải là true hoặc false.')
        with self.db() as db:
            s = self.load(db)
            s['halted'] = halted
            self.save(db, s)
            self.event(db, 'system', 'Tạm dừng mở lệnh mới.' if halted else 'Cho phép mở lệnh giấy trở lại.')
        return {"ok": True}
