"""Unit and Integration Tests for Phase 1E: Semi-Auto Execution & Reconciliation."""
import unittest
from datetime import datetime, timezone, timedelta
from decimal import Decimal
import json
from pathlib import Path
import tempfile
import time
import urllib.request

from app.engine import Engine, Rejected
from app.execution.semi_auto import SemiAutoExecutor, ExecutionError
from app.execution.reconciler import PositionReconciler, ReconciliationReport
from app.risk.manager import RiskGate
from app.server import build_server
from app.market import SYMBOLS


class TestExecutionAndReconciliation(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = Path(self.temp_dir.name) / "test_exec.db"
        self.engine = Engine(self.db_path)

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_proposal_creation_and_expiration(self):
        """Kiểm tra tạo đề xuất và tự động hết hạn (TTL)."""
        executor = SemiAutoExecutor(mode='paper', default_ttl_seconds=1)
        with self.engine.db() as db:
            s = self.engine.load(db)
            prop_id = executor.create_proposal(
                db=db,
                step=s['step'],
                symbol='EURUSD',
                strategy='TrendFollowing',
                side='BUY',
                entry=1.0850,
                sl=1.0800,
                tp=1.0950,
                volume=0.1,
                reason='Test breakout signal',
                ttl_seconds=1
            )
            self.assertGreater(prop_id, 0)

            # Ngay sau khi tạo: status vẫn là pending
            row = db.execute("SELECT * FROM proposals WHERE id=?", (prop_id,)).fetchone()
            self.assertEqual(row['status'], 'pending')
            
            # Chưa hết hạn, quét không đổi
            expired = executor.clean_expired_proposals(db)
            self.assertEqual(expired, 0)

        # Chờ quá 1s TTL
        time.sleep(1.2)

        with self.engine.db() as db:
            expired = executor.clean_expired_proposals(db)
            self.assertEqual(expired, 1)

            row = db.execute("SELECT * FROM proposals WHERE id=?", (prop_id,)).fetchone()
            self.assertEqual(row['status'], 'expired')

        # Thử duyệt đề xuất đã hết hạn -> phải bắn lỗi ExecutionError
        with self.assertRaises(ExecutionError) as ctx:
            executor.approve_proposal(self.engine, prop_id, request_id="test-req-expired-123")
        self.assertIn("đã hết hạn", str(ctx.exception))

    def test_proposal_rejection(self):
        """Kiểm tra từ chối đề xuất giao dịch và ghi nhận log."""
        executor = SemiAutoExecutor(mode='paper')
        with self.engine.db() as db:
            s = self.engine.load(db)
            prop_id = executor.create_proposal(
                db=db,
                step=s['step'],
                symbol='GBPUSD',
                strategy='DonchianBreakout',
                side='SELL',
                entry=1.2850,
                sl=1.2900,
                tp=1.2750,
                volume=0.2,
                reason='Donchian channel lower breakout',
                ttl_seconds=300
            )

        # Từ chối
        res = self.engine.reject_proposal(prop_id, reason="Victor từ chối vì tin tức NFP sắp ra")
        self.assertTrue(res['ok'])
        self.assertEqual(res['status'], 'rejected')

        with self.engine.db() as db:
            row = db.execute("SELECT * FROM proposals WHERE id=?", (prop_id,)).fetchone()
            self.assertEqual(row['status'], 'rejected')
            self.assertIn("NFP", row['reason'])

        # Đã rejected thì không thể duyệt
        with self.assertRaises(ExecutionError):
            executor.approve_proposal(self.engine, prop_id, request_id="req-rejected-1234")

    def test_idempotency_protection(self):
        """Kiểm tra cơ chế chống lặp lệnh (Idempotency Guard)."""
        current_q = self.engine.state('EURUSD')['market']['quote']
        entry = current_q['ask']
        with self.engine.db() as db:
            s = self.engine.load(db)
            prop_id = self.engine.executor.create_proposal(
                db=db,
                step=s['step'],
                symbol='EURUSD',
                strategy='TrendFollowing',
                side='BUY',
                entry=entry,
                sl=round(entry - 0.0050, 5),
                tp=round(entry + 0.0100, 5),
                volume=0.05,
                reason='Test idempotency',
                ttl_seconds=300
            )

        req_id = "req-idempotency-unique-key-12345"
        # Duyệt lần 1
        res1 = self.engine.approve_proposal(prop_id, request_id=req_id)
        self.assertTrue(res1.get('ok'))
        pos_id1 = res1.get('id')

        # Gửi lại đúng req_id lần 2
        res2 = self.engine.approve_proposal(prop_id, request_id=req_id)
        self.assertEqual(res1, res2)

        # Đảm bảo trong database chỉ có duy nhất 1 position được mở
        with self.engine.db() as db:
            positions = db.execute("SELECT * FROM positions WHERE closed IS NULL").fetchall()
            self.assertEqual(len(positions), 1)
            self.assertEqual(positions[0]['id'], pos_id1)

    def test_price_drift_rejection(self):
        """Kiểm tra từ chối lệnh khi giá thị trường bị trượt quá ngưỡng cho phép."""
        executor = SemiAutoExecutor(mode='paper', max_drift_pips=10.0)
        with self.engine.db() as db:
            s = self.engine.load(db)
            prop_id = executor.create_proposal(
                db=db,
                step=s['step'],
                symbol='EURUSD',
                strategy='TrendFollowing',
                side='BUY',
                entry=1.0800,  # Giá đề xuất
                sl=1.0750,
                tp=1.0900,
                volume=0.1,
                reason='Test drift',
                ttl_seconds=300
            )

        # Giá thị trường nhảy lên 1.0830 (trượt 30 pips > 10 pips max drift)
        with self.assertRaises(ExecutionError) as ctx:
            executor.approve_proposal(
                self.engine,
                prop_id,
                request_id="drift-req-123456",
                current_market_price=1.0830
            )
        self.assertIn("trượt giá", str(ctx.exception))

    def test_risk_gate_integration_rejection(self):
        """Kiểm tra Cổng kiểm soát rủi ro (RiskGate) chặn lệnh khi vượt giới hạn."""
        # Cấu hình RiskGate cực kỳ khắt khe: chỉ cho phép tối đa 0 vị thế
        strict_gate = RiskGate(
            max_daily_drawdown_pct=Decimal('2.0'),
            max_open_positions=0,  # Không cho phép mở bất kỳ vị thế nào
            max_spread=Decimal('10.0')
        )
        executor = SemiAutoExecutor(mode='paper', risk_gate=strict_gate)
        self.engine.executor = executor

        current_q = self.engine.state('EURUSD')['market']['quote']
        entry = current_q['ask']
        with self.engine.db() as db:
            s = self.engine.load(db)
            prop_id = executor.create_proposal(
                db=db,
                step=s['step'],
                symbol='EURUSD',
                strategy='TrendFollowing',
                side='BUY',
                entry=entry,
                sl=round(entry - 0.0050, 5),
                tp=round(entry + 0.0100, 5),
                volume=0.05,
                reason='Test risk gate rejection',
                ttl_seconds=300
            )

        with self.assertRaises(ExecutionError) as ctx:
            self.engine.approve_proposal(prop_id, request_id="risk-gate-req-12345")
        self.assertIn("RiskGate", str(ctx.exception))

    def test_reconciler_perfect_sync(self):
        """Kiểm tra đối soát khi Database và MT5 hoàn toàn khớp nhau."""
        # Mở 1 vị thế hợp lệ trong DB
        with self.engine.db() as db:
            s = self.engine.load(db)
            db.execute('''
                INSERT INTO positions (symbol, side, volume, entry, sl, tp, fee, opened, closed, exit, pnl, reason, ticket)
                VALUES ('EURUSD', 'BUY', 0.1, 1.0850, 1.0800, 1.0950, 0.7, 120, NULL, NULL, NULL, 'test', 1001)
            ''')

        # Giả lập MT5 trả về đúng vị thế này
        mock_mt5_positions = [
            {"ticket": 1001, "symbol": "EURUSD", "volume": 0.1, "sl": 1.0800, "tp": 1.0950}
        ]

        report = self.engine.reconcile(mt5_positions_override=mock_mt5_positions, auto_heal=True)
        self.assertTrue(report.in_sync)
        self.assertEqual(len(report.discrepancies), 0)
        self.assertEqual(report.db_count, 1)
        self.assertEqual(report.mt5_count, 1)

    def test_reconciler_ghost_position_auto_heal(self):
        """Kiểm tra tự động phát hiện và đóng Ghost Position (sàn đã đóng nhưng DB còn mở)."""
        # DB có vị thế mở #2002
        with self.engine.db() as db:
            s = self.engine.load(db)
            db.execute('''
                INSERT INTO positions (id, symbol, side, volume, entry, sl, tp, fee, opened, closed, exit, pnl, reason, ticket)
                VALUES (2002, 'XAUUSD', 'BUY', 0.05, 2650.0, 2640.0, 2670.0, 0.35, 120, NULL, NULL, NULL, 'manual', 2002)
            ''')

        # MT5 trả về rỗng (vị thế đã bị SL hoặc đóng trên MT5)
        mock_mt5_positions = []

        report = self.engine.reconcile(mt5_positions_override=mock_mt5_positions, auto_heal=True)
        self.assertFalse(report.in_sync)
        self.assertEqual(len(report.discrepancies), 1)
        self.assertEqual(report.discrepancies[0]['kind'], 'GHOST_POSITION')
        self.assertEqual(report.discrepancies[0]['action_taken'], 'CLOSED_IN_DB')
        self.assertEqual(report.healed_count, 1)

        # Kiểm tra DB: vị thế 2002 đã được đánh dấu closed
        with self.engine.db() as db:
            pos = db.execute("SELECT * FROM positions WHERE id=2002").fetchone()
            self.assertIsNotNone(pos['closed'])
            self.assertEqual(pos['reason'], 'RECONCILE_AUTO_HEAL_CLOSED')

    def test_reconciler_orphan_and_volume_mismatch(self):
        """Kiểm tra phát hiện Orphan Position và tự điều chỉnh Volume Mismatch."""
        # DB có vị thế #3003 với 0.10 lot
        with self.engine.db() as db:
            db.execute('''
                INSERT INTO positions (id, symbol, side, volume, entry, sl, tp, fee, opened, closed, exit, pnl, reason, ticket)
                VALUES (3003, 'BTCUSD', 'BUY', 0.10, 65000.0, 64000.0, 67000.0, 0.7, 120, NULL, NULL, NULL, 'strat', 3003)
            ''')

        # MT5: vị thế #3003 chỉ còn 0.05 lot (khớp 1 phần), và có thêm vị thế lạ #9999
        mock_mt5_positions = [
            {"ticket": 3003, "symbol": "BTCUSD", "volume": 0.05, "sl": 64000.0, "tp": 67000.0},
            {"ticket": 9999, "symbol": "USDJPY", "volume": 0.50, "sl": 147.0, "tp": 150.0}
        ]

        report = self.engine.reconcile(mt5_positions_override=mock_mt5_positions, auto_heal=True)
        self.assertFalse(report.in_sync)
        kinds = [d['kind'] for d in report.discrepancies]
        self.assertIn('VOLUME_MISMATCH', kinds)
        self.assertIn('ORPHAN_POSITION', kinds)
        self.assertEqual(report.healed_count, 1)  # Đã heal volume mismatch

        # Kiểm tra DB vị thế #3003 volume đã sửa về 0.05
        with self.engine.db() as db:
            pos = db.execute("SELECT * FROM positions WHERE id=3003").fetchone()
            self.assertAlmostEqual(pos['volume'], 0.05, places=4)


class TestReconcileApiIntegration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp_dir = tempfile.TemporaryDirectory()
        cls.db_path = Path(cls.temp_dir.name) / "test_api_reconcile.db"
        cls.port = 8801
        cls.server = build_server(port=cls.port, db_path=cls.db_path)
        import threading
        cls.server_thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.server_thread.start()
        time.sleep(0.5)

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.temp_dir.cleanup()

    def test_reconcile_api_endpoint(self):
        # 1. Lấy CSRF token
        req = urllib.request.Request(f"http://127.0.0.1:{self.port}/api/session")
        with urllib.request.urlopen(req) as resp:
            csrf = json.loads(resp.read().decode("utf-8"))["csrf"]

        # 2. Gọi POST /api/reconcile
        post_data = json.dumps({"auto_heal": True}).encode("utf-8")
        req_post = urllib.request.Request(
            f"http://127.0.0.1:{self.port}/api/reconcile",
            data=post_data,
            headers={
                "Content-Type": "application/json",
                "X-Lucky-CSRF": csrf,
                "Origin": f"http://127.0.0.1:{self.port}"
            }
        )
        with urllib.request.urlopen(req_post) as resp:
            self.assertEqual(resp.status, 200)
            data = json.loads(resp.read().decode("utf-8"))
            self.assertIn("timestamp", data)
            self.assertIn("in_sync", data)
            self.assertIn("discrepancies", data)


if __name__ == "__main__":
    unittest.main()
