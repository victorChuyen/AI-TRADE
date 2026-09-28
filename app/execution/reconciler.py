"""Lucky Trade AI — Position Reconciler.

Động cơ đối soát vị thế tự động giữa Database nội bộ và Broker MT5:
1. Phát hiện Ghost Position (vị thế trên hệ thống còn mở nhưng sàn đã đóng do SL/TP hoặc đóng tay).
2. Phát hiện Orphan Position (vị thế trên sàn MT5 nhưng chưa có trong DB Lucky).
3. Phát hiện Volume Mismatch (lệch khối lượng do khớp một phần).
4. Phát hiện SL/TP Desync (mức dừng lỗ/chốt lời trên sàn bị lệch so với hệ thống).
5. Cơ chế Auto-Heal: Tự động cập nhật đóng lệnh và tính toán PnL thực tế vào DB.
"""
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
import json
import logging
from typing import Optional, Dict, Any, List, Callable

from app.market import SYMBOLS, quote

logger = logging.getLogger('lucky.reconciler')


@dataclass
class Discrepancy:
    kind: str  # 'GHOST_POSITION', 'ORPHAN_POSITION', 'VOLUME_MISMATCH', 'SL_TP_DESYNC'
    ticket: Any
    symbol: str
    message: str
    db_state: Optional[Dict[str, Any]] = None
    mt5_state: Optional[Dict[str, Any]] = None
    action_taken: str = "NONE"


@dataclass
class ReconciliationReport:
    timestamp: str
    in_sync: bool
    db_count: int
    mt5_count: int
    discrepancies: List[Dict[str, Any]] = field(default_factory=list)
    healed_count: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "timestamp": self.timestamp,
            "in_sync": self.in_sync,
            "db_count": self.db_count,
            "mt5_count": self.mt5_count,
            "discrepancies": self.discrepancies,
            "healed_count": self.healed_count
        }


class PositionReconciler:
    """Bộ đối soát vị thế thời gian thực giữa Database và MT5 Terminal."""

    def __init__(self, engine, mt5_reader: Optional[Callable[[], List[Dict[str, Any]]]] = None):
        self.engine = engine
        self.mt5_reader = mt5_reader

    def fetch_db_positions(self) -> List[Dict[str, Any]]:
        """Lấy tất cả các vị thế đang mở trong Database nội bộ."""
        with self.engine.db() as db:
            s = self.engine.load(db)
            return self.engine.positions(db, s)

    def fetch_mt5_positions(self) -> List[Dict[str, Any]]:
        """Lấy danh sách vị thế đang mở từ MT5 Adapter."""
        if self.mt5_reader:
            return self.mt5_reader()
        
        # Dự phòng: đọc từ subprocess mt5_adapter nếu được cấu hình
        try:
            from app.mt5_adapter import read_positions
            return read_positions()
        except Exception as e:
            logger.warning(f"Không thể kết nối MT5 Adapter để đọc positions: {e}")
            return []

    def reconcile(
        self,
        mt5_positions_override: Optional[List[Dict[str, Any]]] = None,
        auto_heal: bool = True
    ) -> ReconciliationReport:
        """
        Thực hiện chu trình đối soát toàn diện.
        
        Args:
            mt5_positions_override: Danh sách vị thế MT5 tiêm vào (tiện lợi cho kiểm thử)
            auto_heal: Tự động khắc phục các sai lệch có thể sửa an toàn (đóng Ghost position)
        """
        now_iso = datetime.now(timezone.utc).isoformat()
        db_positions = self.fetch_db_positions()
        mt5_positions = mt5_positions_override if mt5_positions_override is not None else self.fetch_mt5_positions()

        # Ánh xạ theo ticket ID (hoặc id của vị thế DB)
        # DB: trường 'id' hoặc 'ticket' nếu có
        db_map = {}
        for p in db_positions:
            key = p.get('ticket') or p.get('id')
            db_map[key] = p

        mt5_map = {}
        for p in mt5_positions:
            key = p.get('ticket') or p.get('id')
            mt5_map[key] = p

        discrepancies: List[Discrepancy] = []
        healed_count = 0

        # 1. Quét tìm GHOST POSITIONS (Có trong DB nhưng thiếu trên MT5)
        for key, db_pos in db_map.items():
            if key not in mt5_map:
                sym = db_pos.get('symbol', 'UNKNOWN')
                action = "NONE"
                
                if auto_heal:
                    # Tự động đóng vị thế trong DB
                    try:
                        with self.engine.db() as db:
                            s = self.engine.load(db)
                            q = quote(sym, s['step'])
                            exit_price = q['bid'] if db_pos['side'] == 'BUY' else q['ask']
                            # Nếu giá tiệm cận SL hoặc TP, lấy giá đó làm giá exit
                            if db_pos.get('sl') and abs(exit_price - db_pos['sl']) < abs(exit_price - db_pos['entry']):
                                exit_price = db_pos['sl']
                            elif db_pos.get('tp') and abs(exit_price - db_pos['tp']) < abs(exit_price - db_pos['entry']):
                                exit_price = db_pos['tp']

                            pnl = self.engine.profit(db_pos, exit_price)
                            db.execute('''
                                UPDATE positions 
                                SET closed = ?, exit = ?, pnl = ?, reason = ?
                                WHERE id = ?
                            ''', (s['step'], exit_price, pnl, 'RECONCILE_AUTO_HEAL_CLOSED', db_pos['id']))
                            
                            s['balance'] = round(s['balance'] + pnl - db_pos.get('fee', 0.0), 2)
                            self.engine.save(db, s)
                            self.engine.event(
                                db,
                                'reconciliation_heal',
                                f"Đối soát tự động: Đã đồng bộ đóng vị thế #{db_pos['id']} ({sym}), PnL: ${pnl:.2f}."
                            )
                        action = "CLOSED_IN_DB"
                        healed_count += 1
                    except Exception as e:
                        logger.error(f"Lỗi khi auto-heal vị thế #{key}: {e}")
                        action = f"HEAL_FAILED: {e}"

                discrepancies.append(Discrepancy(
                    kind="GHOST_POSITION",
                    ticket=key,
                    symbol=sym,
                    message=f"Vị thế #{key} tồn tại trong DB nhưng đã đóng trên sàn MT5.",
                    db_state=db_pos,
                    mt5_state=None,
                    action_taken=action
                ))

        # 2. Quét tìm ORPHAN POSITIONS (Có trên MT5 nhưng thiếu trong DB)
        for key, mt5_pos in mt5_map.items():
            if key not in db_map:
                sym = mt5_pos.get('symbol', 'UNKNOWN')
                action = "LOGGED_WARNING"
                with self.engine.db() as db:
                    self.engine.event(
                        db,
                        'reconciliation_warning',
                        f"Cảnh báo đối soát: Phát hiện vị thế lạ #{key} ({sym} {mt5_pos.get('volume')} lot) trên MT5 chưa được quản lý bởi Lucky."
                    )

                discrepancies.append(Discrepancy(
                    kind="ORPHAN_POSITION",
                    ticket=key,
                    symbol=sym,
                    message=f"Vị thế #{key} mở trực tiếp trên MT5 mà không thông qua Lucky Trade.",
                    db_state=None,
                    mt5_state=mt5_pos,
                    action_taken=action
                ))

        # 3. So sánh các vị thế khớp ticket (Volume & SL/TP)
        for key in db_map.keys() & mt5_map.keys():
            db_pos = db_map[key]
            mt5_pos = mt5_map[key]
            sym = db_pos.get('symbol', 'UNKNOWN')

            # Kiểm tra lệch volume (khớp từng phần)
            db_vol = float(db_pos.get('volume', 0.0))
            mt5_vol = float(mt5_pos.get('volume', 0.0))
            if abs(db_vol - mt5_vol) > 1e-4:
                action = "NONE"
                if auto_heal:
                    with self.engine.db() as db:
                        db.execute("UPDATE positions SET volume = ? WHERE id = ?", (mt5_vol, db_pos['id']))
                        self.engine.event(
                            db,
                            'reconciliation_heal',
                            f"Đối soát: Điều chỉnh khối lượng vị thế #{key} từ {db_vol} sang {mt5_vol} lot."
                        )
                    action = "VOLUME_ADJUSTED_TO_MT5"
                    healed_count += 1

                discrepancies.append(Discrepancy(
                    kind="VOLUME_MISMATCH",
                    ticket=key,
                    symbol=sym,
                    message=f"Lệch khối lượng vị thế #{key}: DB={db_vol} lot, MT5={mt5_vol} lot.",
                    db_state={"volume": db_vol},
                    mt5_state={"volume": mt5_vol},
                    action_taken=action
                ))

            # Kiểm tra lệch SL / TP
            db_sl = float(db_pos.get('sl', 0.0) or 0.0)
            mt5_sl = float(mt5_pos.get('sl', 0.0) or 0.0)
            db_tp = float(db_pos.get('tp', 0.0) or 0.0)
            mt5_tp = float(mt5_pos.get('tp', 0.0) or 0.0)

            if abs(db_sl - mt5_sl) > 1e-4 or abs(db_tp - mt5_tp) > 1e-4:
                discrepancies.append(Discrepancy(
                    kind="SL_TP_DESYNC",
                    ticket=key,
                    symbol=sym,
                    message=f"Lệch SL/TP vị thế #{key}: DB SL={db_sl}/TP={db_tp}, MT5 SL={mt5_sl}/TP={mt5_tp}.",
                    db_state={"sl": db_sl, "tp": db_tp},
                    mt5_state={"sl": mt5_sl, "tp": mt5_tp},
                    action_taken="FLAGGED_FOR_REVIEW"
                ))

        in_sync = len(discrepancies) == 0
        report = ReconciliationReport(
            timestamp=now_iso,
            in_sync=in_sync,
            db_count=len(db_positions),
            mt5_count=len(mt5_positions),
            discrepancies=[asdict(d) for d in discrepancies],
            healed_count=healed_count
        )
        logger.info(f"Hoàn thành đối soát: in_sync={in_sync}, sai lệch={len(discrepancies)}, đã xử lý={healed_count}")
        return report
