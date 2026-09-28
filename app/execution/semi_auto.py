"""Lucky Trade AI — Semi-Auto Execution Engine.

Quản lý vòng đời đề xuất giao dịch (Trade Proposals):
1. Chiến lược sinh đề xuất -> Trạng thái 'pending' kèm thời gian hết hạn (TTL).
2. Tự động chuyển 'expired' nếu quá hạn mà chưa duyệt.
3. Người dùng duyệt (Approve) hoặc từ chối (Reject).
4. Khi duyệt:
   - Kiểm tra chống lặp lệnh (Idempotency) bằng request_id.
   - Kiểm tra độ trượt giá (Price drift) so với thị trường hiện tại.
   - Kiểm tra an toàn qua RiskGate (Sụt giảm ngày, Margin, Spread, Tương quan).
   - Điều phối thực thi: MT5 Writer (subprocess với --demo-only) hoặc Paper Engine.
"""
from dataclasses import dataclass, asdict
from datetime import datetime, timezone, timedelta
from decimal import Decimal
import json
import logging
import math
from pathlib import Path
import subprocess
import sys
from typing import Optional, Dict, Any, List

from app.market import SYMBOLS, quote
from app.risk.manager import RiskGate, PositionSizer

logger = logging.getLogger('lucky.semi_auto')


class ExecutionError(ValueError):
    """Lỗi thực thi lệnh hoặc vi phạm kiểm duyệt rủi ro."""
    pass

Rejected = ExecutionError


@dataclass
class Proposal:
    id: Optional[int]
    step: int
    time: str
    symbol: str
    strategy: str
    side: str
    entry: float
    sl: float
    tp: float
    volume: float
    reason: str
    status: str  # 'pending', 'approved', 'rejected', 'expired'
    expires_at: str
    ticket: Optional[int] = None
    result_json: Optional[str] = None


class SemiAutoExecutor:
    """Bộ điều phối thực thi bán tự động cho Lucky Trade."""

    def __init__(
        self,
        mode: str = 'paper',
        default_ttl_seconds: int = 900,
        max_drift_pips: float = 15.0,
        risk_gate: Optional[RiskGate] = None,
        mt5_writer_path: Optional[str] = None,
        python_executable: Optional[str] = None,
    ):
        self.mode = mode
        self.default_ttl_seconds = default_ttl_seconds
        self.max_drift_pips = max_drift_pips
        self.risk_gate = risk_gate
        self.python_executable = python_executable or sys.executable
        
        if mt5_writer_path:
            self.mt5_writer_path = mt5_writer_path
        else:
            root = Path(__file__).resolve().parent.parent
            self.mt5_writer_path = str(root / 'mt5_writer.py')

    def create_proposal(
        self,
        db,
        step: int,
        symbol: str,
        strategy: str,
        side: str,
        entry: float,
        sl: float,
        tp: float,
        volume: float,
        reason: str,
        ttl_seconds: Optional[int] = None
    ) -> int:
        """Tạo đề xuất lệnh mới kèm thời gian hết hạn (TTL)."""
        ttl = ttl_seconds if ttl_seconds is not None else self.default_ttl_seconds
        now_dt = datetime.now(timezone.utc)
        now_iso = now_dt.isoformat()
        exp_iso = (now_dt + timedelta(seconds=ttl)).isoformat()

        cursor = db.execute('''
            INSERT INTO proposals (
                step, time, symbol, strategy, side, entry, sl, tp, volume, reason, status, expires_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
        ''', (step, now_iso, symbol, strategy, side, float(entry), float(sl), float(tp), float(volume), reason, exp_iso))
        
        prop_id = cursor.lastrowid
        logger.info(f"Đã tạo đề xuất #{prop_id}: {side} {volume} {symbol} ({strategy}), hết hạn lúc {exp_iso}")
        return prop_id

    def clean_expired_proposals(self, db) -> int:
        """Quét và đánh dấu 'expired' cho các đề xuất quá hạn."""
        now_iso = datetime.now(timezone.utc).isoformat()
        cursor = db.execute('''
            UPDATE proposals 
            SET status = 'expired' 
            WHERE status = 'pending' AND expires_at IS NOT NULL AND expires_at <= ?
        ''', (now_iso,))
        expired_count = cursor.rowcount
        if expired_count > 0:
            logger.info(f"Đã tự động hủy {expired_count} đề xuất quá hạn.")
        return expired_count

    def reject_proposal(self, db, proposal_id: int, reason: str = "Người dùng từ chối") -> Dict[str, Any]:
        """Từ chối đề xuất giao dịch."""
        row = db.execute("SELECT * FROM proposals WHERE id=?", (proposal_id,)).fetchone()
        if not row:
            raise ExecutionError("Đề xuất không tồn tại.")
        
        prop = dict(row)
        if prop['status'] != 'pending':
            raise ExecutionError(f"Đề xuất #{proposal_id} không ở trạng thái chờ duyệt (hiện tại: {prop['status']}).")

        db.execute("UPDATE proposals SET status = 'rejected', reason = reason || ' | Lý do từ chối: ' || ? WHERE id = ?", (reason, proposal_id))
        logger.info(f"Đã từ chối đề xuất #{proposal_id}: {reason}")
        return {"ok": True, "id": proposal_id, "status": "rejected", "reason": reason}

    def execute_mt5_writer(self, payload: Dict[str, Any], dry_run: bool = False, demo_only: bool = True) -> Dict[str, Any]:
        """Chạy subprocess mt5_writer.py để gửi lệnh với bảo vệ an toàn."""
        cmd = [self.python_executable, self.mt5_writer_path, "send_order"]
        if dry_run:
            cmd.append("--dry-run")
        if demo_only:
            cmd.append("--demo-only")

        stdin_data = json.dumps(payload)
        logger.info(f"Gọi MT5 Writer: {' '.join(cmd)} | Payload: {stdin_data}")

        try:
            proc = subprocess.run(
                cmd,
                input=stdin_data,
                text=True,
                capture_output=True,
                timeout=15,
                check=False
            )
        except subprocess.TimeoutExpired:
            logger.error("MT5 Writer bị timeout sau 15 giây.")
            raise ExecutionError("Hết thời gian chờ phản hồi từ MT5 Terminal.")
        except Exception as e:
            logger.error(f"Lỗi khi khởi chạy MT5 Writer: {e}")
            raise ExecutionError(f"Không thể khởi chạy tiến trình MT5: {e}")

        if proc.returncode != 0:
            err_msg = proc.stderr.strip() or proc.stdout.strip() or f"Mã thoát {proc.returncode}"
            logger.error(f"MT5 Writer trả về lỗi: {err_msg}")
            raise ExecutionError(f"Lỗi MT5 Terminal: {err_msg}")

        try:
            result = json.loads(proc.stdout.strip())
        except json.JSONDecodeError:
            logger.error(f"Không giải mã được JSON từ MT5 Writer: {proc.stdout}")
            raise ExecutionError("MT5 trả về kết quả không hợp lệ.")

        if not result.get("success", False):
            raise ExecutionError(result.get("message") or result.get("error") or "Gửi lệnh MT5 thất bại.")

        return result

    def approve_proposal(
        self,
        engine,
        proposal_id: int,
        request_id: str,
        dry_run: bool = False,
        current_market_price: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Phê duyệt đề xuất và thực thi lệnh với đầy đủ các chốt an toàn.
        
        Args:
            engine: Engine paper trading hoặc DB context
            proposal_id: ID đề xuất trong bảng proposals
            request_id: Khóa chống lặp lệnh (Idempotency Key)
            dry_run: Chạy thử không gửi lệnh thực
            current_market_price: Giá thị trường thực tế để kiểm tra trượt giá
        """
        if not isinstance(request_id, str) or len(request_id) < 8:
            raise ExecutionError("Yêu cầu mã request_id hợp lệ (tối thiểu 8 ký tự) để chống lặp lệnh.")

        # Bước 1: Kiểm tra Idempotency
        with engine.db() as db:
            # Tự động dọn dẹp các đề xuất quá hạn trước
            self.clean_expired_proposals(db)

            cached = db.execute("SELECT payload, result FROM requests WHERE id=?", (request_id,)).fetchone()
            if cached:
                logger.info(f"Yêu cầu {request_id} đã được thực thi trước đó. Trả về kết quả lưu trữ.")
                return json.loads(cached['result'])

            row = db.execute("SELECT * FROM proposals WHERE id=?", (proposal_id,)).fetchone()
            if not row:
                raise ExecutionError("Đề xuất không tồn tại.")
            prop = dict(row)

            if prop['status'] == 'expired':
                raise ExecutionError(f"Đề xuất #{proposal_id} đã hết hạn vào {prop.get('expires_at')}.")
            if prop['status'] != 'pending':
                raise ExecutionError(f"Đề xuất #{proposal_id} không ở trạng thái chờ duyệt (hiện tại: {prop['status']}).")

            s = engine.load(db)
            current_step = s['step']
            equity = engine.equity(db, s)

        # Bước 2: Kiểm tra độ trượt giá (Price drift)
        sym = prop['symbol']
        spec = SYMBOLS.get(sym, {"digits": 5, "contract": 100000, "pip": 0.0001})
        q = quote(sym, current_step)
        live_entry = current_market_price if current_market_price is not None else (q['ask'] if prop['side'] == 'BUY' else q['bid'])
        
        pip_size = spec.get('pip', 0.0001)
        drift_pips = abs(live_entry - prop['entry']) / pip_size
        if drift_pips > self.max_drift_pips:
            raise ExecutionError(
                f"Độ trượt giá {drift_pips:.1f} pips vượt ngưỡng cho phép ({self.max_drift_pips:.1f} pips). "
                f"Giá đề xuất: {prop['entry']}, Giá hiện tại: {live_entry}."
            )

        # Bước 3: Điều chỉnh SL/TP neo theo giá vào lệnh thực tế
        sl_dist = abs(prop['entry'] - prop['sl'])
        tp_dist = abs(prop['entry'] - prop['tp'])
        if prop['side'] == 'BUY':
            actual_sl = round(live_entry - sl_dist, spec['digits'])
            actual_tp = round(live_entry + tp_dist, spec['digits'])
        else:
            actual_sl = round(live_entry + sl_dist, spec['digits'])
            actual_tp = round(live_entry - tp_dist, spec['digits'])

        # Bước 4: Tái tính toán khối lượng an toàn (luôn làm tròn xuống)
        pts = abs(live_entry - actual_sl)
        max_risk = equity * (s['risk_pct'] / 100.0)
        contract_factor = spec['contract'] / (live_entry if sym == 'USDJPY' and live_entry > 0 else 1.0)
        denom = pts * contract_factor + 7.0  # Phí hoa hồng $7/lot
        vol = prop['volume']
        if denom > 0:
            calc_vol = math.floor(max_risk / denom * 100) / 100.0
            vol = max(0.01, min(vol, calc_vol, 5.0))

        # Bước 5: Kiểm duyệt qua RiskGate nếu có
        if self.risk_gate:
            with engine.db() as db:
                open_positions = engine.positions(db, s)
                daily_dd = Decimal(str(round(max(0.0, (s['day_equity'] - equity) / s['day_equity'] * 100), 2)))
                spread_val = Decimal(str(round(q['ask'] - q['bid'], spec['digits'])))
                margin_req = Decimal(str(round(live_entry * vol * spec['contract'] / 30, 2)))
                if sym == 'USDJPY' and live_entry > 0:
                    margin_req = margin_req / Decimal(str(live_entry))
                free_margin = Decimal(str(round(equity - sum(p.get('margin', 0) for p in open_positions), 2)))
                
                passed = self.risk_gate.validate_order(
                    symbol=sym,
                    direction=prop['side'],
                    spread=spread_val,
                    daily_drawdown_pct=daily_dd,
                    current_open_positions=len(open_positions),
                    margin_requirement=margin_req,
                    free_margin=free_margin,
                    strategy_name=prop['strategy'],
                    active_trades=[{"symbol": p['symbol'], "direction": p['side']} for p in open_positions]
                )
                if not passed:
                    raise ExecutionError("Lệnh bị từ chối bởi Cổng kiểm soát rủi ro (RiskGate).")

        # Bước 6: Điều phối thực thi
        execution_result = {}
        ticket = None

        if self.mode == 'demo':
            # Thực thi qua MT5 Writer
            mt5_payload = {
                "symbol": sym,
                "side": prop['side'],
                "volume": vol,
                "sl": actual_sl,
                "tp": actual_tp,
                "magic": 202601,
                "comment": f"Lucky #{proposal_id}",
                "deviation": 20
            }
            res = self.execute_mt5_writer(mt5_payload, dry_run=dry_run, demo_only=True)
            ticket = res.get('ticket', 0)
            execution_result = {
                "ok": True,
                "id": ticket,
                "ticket": ticket,
                "mt5_response": res,
                "symbol": sym,
                "side": prop['side'],
                "volume": vol,
                "entry": live_entry,
                "sl": actual_sl,
                "tp": actual_tp
            }
        else:
            # Thực thi qua Paper Trading Engine
            order_body = {
                'symbol': sym,
                'side': prop['side'],
                'volume': vol,
                'sl': actual_sl,
                'tp': actual_tp,
                'step': current_step,
                'request_id': request_id
            }
            order_res = engine.order(order_body, preview=False)
            ticket = order_res.get('id')
            execution_result = {
                "ok": True,
                "id": ticket,
                "ticket": ticket,
                "position": order_res,
                "symbol": sym,
                "side": prop['side'],
                "volume": vol,
                "entry": live_entry,
                "sl": actual_sl,
                "tp": actual_tp
            }

        # Bước 7: Cập nhật DB lưu vết đề xuất đã duyệt và Idempotency
        with engine.db() as db:
            result_json = json.dumps(execution_result, ensure_ascii=False)
            db.execute('''
                UPDATE proposals 
                SET status = 'approved', ticket = ?, result_json = ?
                WHERE id = ?
            ''', (ticket, result_json, proposal_id))
            
            # Ghi nhận idempotency request nếu chưa có
            db.execute('''
                INSERT OR REPLACE INTO requests (id, payload, result)
                VALUES (?, ?, ?)
            ''', (request_id, json.dumps({"proposal_id": proposal_id}), result_json))

            engine.event(db, 'proposal_approved', f"Đã phê duyệt đề xuất #{proposal_id} ({sym} {prop['side']} {vol:.2f} lot) -> Ticket #{ticket}")

        return execution_result
