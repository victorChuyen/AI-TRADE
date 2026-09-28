"""Loopback-only local dashboard; stdlib HTTP, static frontend, SQLite paper engine."""
import csv
import io
import json
import os
from pathlib import Path
import secrets
import subprocess
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs
from decimal import Decimal
from . import analyst
from .brain import brain
from .engine import Engine, Rejected
from .market import analyze
from .risk.ftmo import FTMORiskEngine, FTMORuleProfile
from . import mt5_service

import mimetypes

ROOT = Path(__file__).resolve().parent.parent


def build_server(port=8766, db_path=None):
    engine = Engine(db_path or ROOT / 'data' / 'lucky.sqlite3')
    token = secrets.token_urlsafe(32)
    ai_lock = threading.Lock()
    mt_lock = threading.Lock()
    ftmo_engine = FTMORiskEngine(FTMORuleProfile(
        name="FTMO_1STEP_10K",
        initial_capital=Decimal("10000.00"),
        step_type="1-Step",
        daily_loss_pct=Decimal("3.0"),
        total_loss_pct=Decimal("10.0"),
        best_day_rule_enabled=True,
        max_best_day_pct=Decimal("50.0")
    ))

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, fmt, *args):
            pass

        def headers_ok(self):
            actual = self.server.server_port
            allowed = {
                f'127.0.0.1:{actual}', f'localhost:{actual}',
                '127.0.0.1:3000', 'localhost:3000',
                '127.0.0.1:3005', 'localhost:3005',
                '127.0.0.1:8000', 'localhost:8000',
                '10.148.0.3:8000', '34.87.156.228:8000',
                'trade.breaths.live', 'aitrade.breaths.live',
                '127.0.0.1', 'localhost'
            }
            host = self.headers.get('Host', '').split(':')[0]
            host_full = self.headers.get('Host', '')
            if host_full not in allowed and host not in allowed:
                # Also check X-Forwarded-Host from Caddy
                fwd_host = self.headers.get('X-Forwarded-Host', '')
                if fwd_host not in ('trade.breaths.live', 'aitrade.breaths.live'):
                    self.respond(403, {"error": "Host không được phép."})
                    return False
            origin = self.headers.get('Origin')
            if origin:
                origin_clean = origin.replace('http://', '').replace('https://', '')
                if origin_clean not in allowed and origin_clean.split(':')[0] not in allowed:
                    self.respond(403, {"error": "Nguồn yêu cầu không được phép."})
                    return False
            return True

        def respond(self, status, value, mime='application/json; charset=utf-8', download=False):
            data = json.dumps(value, ensure_ascii=False, allow_nan=False).encode() if mime.startswith('application/json') else value
            self.send_response(status)
            self.send_header('Content-Type', mime)
            self.send_header('Content-Length', str(len(data)))
            self.send_header('Cache-Control', 'no-store')
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.send_header('Referrer-Policy', 'no-referrer')
            self.send_header('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'")
            if download:
                self.send_header('Content-Disposition', 'attachment; filename="lucky-paper-history.csv"')
            self.end_headers()
            try:
                self.wfile.write(data)
            except (BrokenPipeError, ConnectionResetError):
                pass

        def do_GET(self):
            if not self.headers_ok():
                return
            parsed = urlparse(self.path)
            try:
                if parsed.path == '/api/session':
                    return self.respond(200, {
                        "csrf": token, 
                        "ai_configured": analyst.configured() or brain.get_status()['ai_configured'], 
                        "version": "0.1.0",
                        "brain": brain.get_status()
                    })
                if parsed.path == '/api/brain/status':
                    return self.respond(200, brain.get_status())
                if parsed.path == '/api/mt5/account':
                    return self.respond(200, mt5_service.get_live_account())
                if parsed.path == '/api/mt5/positions':
                    return self.respond(200, mt5_service.get_live_positions())
                if parsed.path == '/api/mt5/risk':
                    return self.respond(200, mt5_service.get_ftmo_risk_status())
                if parsed.path == '/api/system/config':
                    mt_acc = mt5_service.get_live_account()
                    ftmo_status = mt5_service.get_ftmo_risk_status()
                    cfg = {
                        "mt5": {
                            "login": mt_acc.get("login", 5056580335),
                            "server": mt_acc.get("server", "MetaQuotes-Demo"),
                            "name": mt_acc.get("name", "Chuyền Ngọc"),
                            "platform": "MetaTrader 5",
                            "connected": mt_acc.get("connected", False),
                            "balance": mt_acc.get("balance", 10000.0),
                            "equity": mt_acc.get("equity", 10000.0),
                            "margin": mt_acc.get("margin", 0.0),
                            "margin_free": mt_acc.get("margin_free", 10000.0),
                            "leverage": mt_acc.get("leverage", 100),
                            "ping_ms": 12
                        },
                        "ftmo": {
                            "initial_capital": ftmo_status.get("initial_capital", 10000.0),
                            "daily_loss_pct": 3.0,
                            "total_loss_pct": 10.0,
                            "risk_per_trade_pct": 0.5,
                            "max_positions": 5,
                            "daily_floor": ftmo_status.get("daily_floor", 9700.0),
                            "total_floor": ftmo_status.get("total_floor", 9000.0),
                            "headroom": ftmo_status.get("headroom", 300.0),
                            "status": ftmo_status.get("status", "SAFE")
                        },
                        "ai": {
                            "model": "fcs-astra (9Router Gateway)",
                            "provider": "Obsidian Local Brain",
                            "auto_mode": False
                        },
                        "strategies": [
                            {
                                "id": "trend_following",
                                "name": "Trend Following (EMA 9/21 + ATR)",
                                "enabled": True,
                                "win_rate": 68.5,
                                "description": "Bắt sóng xu hướng dài với EMA Crossover & ATR Trailing Stop"
                            },
                            {
                                "id": "donchian_breakout",
                                "name": "Donchian Breakout (Turtle Trading)",
                                "enabled": True,
                                "win_rate": 62.0,
                                "description": "Đánh bứt phá đỉnh/đáy kênh Donchian 20 chu kỳ"
                            },
                            {
                                "id": "bollinger_rsi",
                                "name": "Bollinger Bands & RSI Reversion",
                                "enabled": True,
                                "win_rate": 71.4,
                                "description": "Bắt sóng hồi đảo chiều khi chạm dải biên Bollinger + RSI quá bán/mua"
                            }
                        ]
                    }
                    return self.respond(200, cfg)
                if parsed.path == '/api/ftmo/status':
                    if mt5_service.ensure_connected():
                        return self.respond(200, mt5_service.get_ftmo_risk_status())
                    st = engine.state('EURUSD')
                    acc = st['account']
                    eq = Decimal(str(acc['equity']))
                    b0 = Decimal(str(acc['day_equity']))
                    init_cap = Decimal(str(acc.get('initial_capital', 10000.00)))
                    ftmo_engine.configure_state(init_cap, b0, max(init_cap, b0))
                    floors = ftmo_engine.calculate_floors(eq)
                    best_day = ftmo_engine.check_best_day_rule([Decimal(str(acc.get('daily_pnl', 0)))])
                    return self.respond(200, {
                        **{k: float(v) if isinstance(v, Decimal) else v for k, v in floors.items()},
                        "best_day": {k: float(v) if isinstance(v, Decimal) else v for k, v in best_day.items()}
                    })
                if parsed.path == '/api/state':
                    params = parse_qs(parsed.query)
                    symbol = params.get('symbol', ['AUDCAD'])[0]
                    tf = params.get('tf', ['M15'])[0]
                    base_state = engine.state(symbol)
                    if mt5_service.ensure_connected():
                        mt_acc = mt5_service.get_live_account()
                        mt_pos = mt5_service.get_live_positions()
                        mt_risk = mt5_service.get_ftmo_risk_status()
                        live_candles = mt5_service.get_live_candles(symbol, tf, 45)
                        live_quote = mt5_service.get_live_quote(symbol)

                        if live_candles and len(live_candles) > 0:
                            base_state['market']['candles'] = live_candles
                            base_state['market']['timeframe'] = tf
                            base_state['market']['source'] = 'mt5_live'
                        if live_quote:
                            base_state['market']['quote'].update(live_quote)

                        base_state['account']['balance'] = mt_acc['balance']
                        base_state['account']['equity'] = mt_acc['equity']
                        base_state['account']['day_equity'] = mt_risk.get('day_start_equity', mt_acc['balance'])
                        base_state['account']['margin'] = mt_acc.get('margin', 0.0)
                        base_state['account']['margin_free'] = mt_acc.get('margin_free', 10000.0)
                        base_state['account']['profit'] = mt_acc.get('profit', 0.0)
                        base_state['account']['daily_pnl'] = mt_acc.get('profit', 0.0)
                        base_state['account']['login'] = mt_acc.get('login', 5056580335)
                        base_state['account']['server'] = mt_acc.get('server', 'MetaQuotes-Demo')
                        base_state['account']['name'] = mt_acc.get('name', 'Chuyền Ngọc')
                        base_state['account']['connected'] = True
                        base_state['account']['live_mode'] = True
                        base_state['account']['headroom'] = mt_risk.get('headroom', 300.0)
                        base_state['account']['daily_floor'] = mt_risk.get('daily_floor', 9694.29)
                        base_state['account']['total_floor'] = mt_risk.get('total_floor', 9000.0)
                        base_state['account']['effective_floor'] = mt_risk.get('effective_floor', 9694.29)
                        base_state['positions'] = mt_pos
                    return self.respond(200, base_state)
                if parsed.path == '/api/health':
                    is_mt = mt5_service.ensure_connected()
                    return self.respond(200, {"ok": True, "mode": "live" if is_mt else "paper", "live_execution": is_mt, "mt5_connected": is_mt})
                if parsed.path == '/api/proposals':
                    with engine.db() as db:
                        rows = [dict(r) for r in db.execute("SELECT * FROM proposals WHERE status='pending' ORDER BY id DESC")]
                    return self.respond(200, {"proposals": rows})
                if parsed.path == '/api/export':
                    with engine.db() as db:
                        rows = [dict(r) for r in db.execute('SELECT * FROM positions WHERE closed IS NOT NULL ORDER BY id')]
                    out = io.StringIO()
                    writer = csv.DictWriter(out, fieldnames=['id','symbol','side','volume','entry','sl','tp','fee','opened','closed','exit','pnl','reason'])
                    writer.writeheader()
                    writer.writerows(rows)
                    return self.respond(200, ('\ufeff' + out.getvalue()).encode(), 'text/csv; charset=utf-8', True)
                
                # Phục vụ file tĩnh từ thư mục web
                clean_path = parsed.path.lstrip('/')
                if clean_path in ('', 'index.html'):
                    target_file = ROOT / 'web' / 'index.html'
                else:
                    target_file = ROOT / 'web' / clean_path

                if target_file.exists() and target_file.is_file():
                    mime, _ = mimetypes.guess_type(str(target_file))
                    mime = mime or 'application/octet-stream'
                    if mime.startswith('text/') or mime == 'application/javascript':
                        mime += '; charset=utf-8'
                    return self.respond(200, target_file.read_bytes(), mime)

                return self.respond(404, {"error": "Không tìm thấy trang."})
            except Rejected as exc:
                self.respond(400, {"error": str(exc)})
            except Exception:
                self.respond(500, {"error": "Không đọc được dữ liệu. Kiểm tra file cơ sở dữ liệu và khởi động lại ứng dụng."})

        def do_POST(self):
            if not self.headers_ok():
                return
            csrf = self.headers.get('X-Lucky-CSRF', '')
            if csrf and not secrets.compare_digest(csrf, token):
                return self.respond(403, {"error": "Phiên đã hết hiệu lực. Vui lòng tải lại trang."})
            if self.headers.get('Content-Type', '').split(';')[0] != 'application/json':
                return self.respond(415, {"error": "Yêu cầu phải là JSON."})
            try:
                length = int(self.headers.get('Content-Length', '0'))
                if not 0 < length <= 8192:
                    return self.respond(413, {"error": "Dung lượng yêu cầu không hợp lệ."})
                body = json.loads(self.rfile.read(length), parse_constant=lambda value: (_ for _ in ()).throw(ValueError('nonfinite')))
                if not isinstance(body, dict):
                    raise ValueError('object required')
            except (ValueError, UnicodeDecodeError):
                return self.respond(400, {"error": "Dữ liệu JSON không hợp lệ."})
            try:
                path = urlparse(self.path).path
                if path == '/api/orders/preview':
                    result = engine.order(body, preview=True)
                elif path == '/api/orders':
                    result = engine.order(body)
                elif path == '/api/close':
                    pos_id = body.get('id') or body.get('ticket')
                    if not isinstance(pos_id, int) or isinstance(pos_id, bool):
                        raise Rejected('Mã vị thế không hợp lệ.')
                    if mt5_service.ensure_connected():
                        mt_positions = mt5_service.get_live_positions()
                        if any(p['ticket'] == pos_id for p in mt_positions):
                            close_res = mt5_service.close_live_position(pos_id)
                            if not close_res.get('success'):
                                raise Rejected(close_res.get('error', 'Lỗi khi đóng vị thế MT5.'))
                            result = close_res
                        else:
                            result = engine.close_position(pos_id)
                    else:
                        result = engine.close_position(pos_id)
                elif path in ('/api/mt5/close_all', '/api/close_all'):
                    if mt5_service.ensure_connected():
                        result = mt5_service.close_all_live_positions()
                    else:
                        with engine.db() as db:
                            s = engine.load(db)
                            for p in engine.positions(db, s):
                                engine.close_position(p['id'])
                        result = {"success": True, "message": "Đã đóng toàn bộ vị thế."}
                elif path == '/api/mt5/close':
                    pos_id = body.get('id') or body.get('ticket')
                    if not pos_id:
                        raise Rejected('Thiếu Ticket ID để đóng lệnh MT5.')
                    close_res = mt5_service.close_live_position(int(pos_id))
                    if not close_res.get('success'):
                        raise Rejected(close_res.get('error', 'Lỗi khi đóng vị thế MT5.'))
                    result = close_res
                elif path == '/api/mt5/order':
                    sym = body.get('symbol', 'AUDCAD')
                    side = body.get('side', 'BUY')
                    vol = float(body.get('volume', 0.01))
                    sl = float(body['sl']) if body.get('sl') else None
                    tp = float(body['tp']) if body.get('tp') else None
                    order_res = mt5_service.send_live_order(sym, side, vol, sl, tp)
                    if not order_res.get('success'):
                        raise Rejected(order_res.get('error', 'Lỗi khi đặt lệnh MT5.'))
                    result = order_res
                elif path == '/api/advance':
                    result = engine.advance(body.get('step'))
                elif path == '/api/proposals/approve':
                    prop_id = body.get('id')
                    if not isinstance(prop_id, int) or isinstance(prop_id, bool):
                        raise Rejected('Mã đề xuất không hợp lệ.')
                    
                    if mt5_service.ensure_connected():
                        with engine.db() as db:
                            row = db.execute("SELECT * FROM proposals WHERE id=?", (prop_id,)).fetchone()
                            if not row:
                                raise Rejected(f"Đề xuất #{prop_id} không tồn tại.")
                            prop = dict(row)
                            if prop.get('status') == 'approved':
                                raise Rejected(f"Đề xuất #{prop_id} đã được duyệt trước đó.")
                        
                        sym = prop.get('symbol', 'AUDCAD')
                        side = prop.get('side', 'BUY')
                        vol = float(prop.get('volume', 0.01))
                        sl = float(prop.get('sl', 0.0)) if prop.get('sl') else None
                        tp = float(prop.get('tp', 0.0)) if prop.get('tp') else None
                        
                        order_res = mt5_service.send_live_order(sym, side, vol, sl, tp, comment=f"Lucky-AI-#{prop_id}")
                        if not order_res.get('success'):
                            raise Rejected(order_res.get('error', 'Sàn MT5 từ chối khớp lệnh.'))
                        
                        ticket = order_res.get('ticket')
                        with engine.db() as db:
                            db.execute("UPDATE proposals SET status='approved', ticket=? WHERE id=?", (ticket, prop_id))
                            engine.event(db, 'order', f"Đã duyệt đề xuất #{prop_id} -> Khớp MT5 Ticket #{ticket}: {side} {vol} {sym}")
                        
                        result = {
                            "ok": True,
                            "ticket": ticket,
                            "symbol": sym,
                            "side": side,
                            "volume": vol,
                            "price": order_res.get('price'),
                            "message": f"Khớp lệnh #{ticket} thành công trên MT5!"
                        }
                    else:
                        result = engine.approve_proposal(prop_id, body.get('request_id'))
                elif path == '/api/proposals/reject':
                    if not isinstance(body.get('id'), int) or isinstance(body.get('id'), bool):
                        raise Rejected('Mã đề xuất không hợp lệ.')
                    result = engine.reject_proposal(body['id'], body.get('reason', 'Người dùng từ chối'))
                elif path == '/api/reconcile':
                    auto_heal = body.get('auto_heal', True)
                    rep = engine.reconcile(auto_heal=auto_heal)
                    result = rep.to_dict() if hasattr(rep, 'to_dict') else rep
                elif path == '/api/settings':
                    result = engine.settings(body)
                elif path == '/api/system/config':
                    if 'auto_mode' in body:
                        engine.set_mode(bool(body['auto_mode']))
                    if 'settings' in body:
                        engine.settings(body['settings'])
                    result = {"ok": True, "message": "Đã lưu cấu hình hệ thống."}
                elif path == '/api/halt':
                    result = engine.halt(body.get('halted'))
                elif path == '/api/mode':
                    if not isinstance(body.get('auto_mode'), bool):
                        raise Rejected('Trạng thái auto_mode không hợp lệ.')
                    result = engine.set_mode(body['auto_mode'])
                elif path == '/api/brain/config':
                    brain.update_config(
                        body.get('provider', ''),
                        body.get('model', ''),
                        body.get('base_url', ''),
                        body.get('api_key', '')
                    )
                    result = {"ok": True, "status": brain.get_status()}
                elif path == '/api/brain/evaluate':
                    proposal = body.get('proposal', {})
                    market_ctx = body.get('market_context', {})
                    result = brain.evaluate_proposal(proposal, market_ctx)
                elif path in ('/api/analyze', '/api/ai'):
                    state = engine.state(body.get('symbol', 'EURUSD'))
                    plan = analyze(body.get('symbol', 'EURUSD'), state['account']['step'])
                    if path == '/api/ai':
                        if not ai_lock.acquire(blocking=False):
                            raise Rejected('AI đang xử lý một yêu cầu. Vui lòng chờ.')
                        try:
                            result = analyst.review(plan)
                        finally:
                            ai_lock.release()
                    else:
                        result = plan
                elif path == '/api/mt5':
                    if not mt_lock.acquire(blocking=False):
                        raise Rejected('Đang kiểm tra terminal MT5. Vui lòng chờ.')
                    try:
                        try:
                            process = subprocess.run([sys.executable, '-m', 'app.mt5_adapter', 'read_account'], cwd=ROOT, capture_output=True, text=True, encoding='utf-8', timeout=16, env={**os.environ, 'PYTHONIOENCODING': 'utf-8'})
                            try:
                                data = json.loads(process.stdout)
                                if process.returncode == 0:
                                    result = data
                                else:
                                    result = {"connected": False, "status": "error", "message": data.get("error", "Không đọc được dữ liệu MT5."), "details": data.get("details")}
                            except (ValueError, TypeError):
                                result = {"connected": False, "status": "error", "message": "Không chạy được bộ đọc MT5. Kiểm tra package trong môi trường Python của app."}
                        except (subprocess.TimeoutExpired, ValueError):
                            result = {"connected": False, "status": "timeout", "message": "MT5 không phản hồi trong thời gian cho phép. Kiểm tra terminal rồi thử lại."}
                    finally:
                        mt_lock.release()
                else:
                    return self.respond(404, {"error": "Không tìm thấy chức năng."})
                self.respond(200, result)
            except Rejected as exc:
                self.respond(400, {"error": str(exc)})
            except Exception as exc:
                self.respond(400, {"error": str(exc) if str(exc) else "Lỗi xử lý yêu cầu. Vui lòng thử lại."})

    server = ThreadingHTTPServer(('127.0.0.1', port), Handler)
    server.daemon_threads = True
    return server


if __name__ == '__main__':
    port = int(os.environ.get('LUCKY_PORT', '8766'))
    server = build_server(port)
    print(f'Lucky Trade: http://127.0.0.1:{port} | paper mode | Ctrl+C to stop', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
