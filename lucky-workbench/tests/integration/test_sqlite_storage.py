"""
OPC Trade Lab V1 - Integration Tests: SQLite Storage, WAL & Backup API
"""
import unittest
import os
import tempfile
import sqlite3
from decimal import Decimal
from backend.opc_trade.storage.db import Database

class TestSqliteStorage(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = os.path.join(self.temp_dir.name, "test_opc.sqlite")
        self.db = Database(self.db_path)

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_wal_and_foreign_keys_active(self):
        with self.db.get_connection() as conn:
            cur = conn.execute("PRAGMA journal_mode;")
            mode = cur.fetchone()[0]
            self.assertEqual(mode.lower(), "wal")

            cur = conn.execute("PRAGMA foreign_keys;")
            fk = cur.fetchone()[0]
            self.assertEqual(fk, 1)

    def test_connection_closed_after_context(self):
        with self.db.get_connection() as conn:
            conn.execute("SELECT 1")
        with self.assertRaises(sqlite3.ProgrammingError):
            conn.execute("SELECT 1")

    def test_rollback_and_close_after_failure(self):
        with self.assertRaisesRegex(RuntimeError, "test rollback"):
            with self.db.get_connection() as conn:
                conn.execute("INSERT INTO tenants VALUES (?, ?, ?)", ("rollback-test", "test", "now"))
                raise RuntimeError("test rollback")
        with self.assertRaises(sqlite3.ProgrammingError):
            conn.execute("SELECT 1")
        with self.db.get_connection() as fresh:
            count = fresh.execute("SELECT COUNT(*) FROM tenants WHERE tenant_id = ?", ("rollback-test",)).fetchone()[0]
        self.assertEqual(count, 0)

    def test_save_and_retrieve_run_report(self):
        mock_report = {
            "run_id": "run_test_storage_1",
            "dataset_id": "demo-v1",
            "strategy_config_hash": "cfg_hash_123",
            "initial_cash": "1000.0000",
            "final_nav": "1001.2500",
            "total_fees_paid": "0.0400",
            "max_drawdown_pct": "0.1500",
            "executions": [{"order_id": "ord_1", "state": "FILLED"}]
        }
        self.db.save_run_report(mock_report, tenant_id="pilot-owner")
        retrieved = self.db.get_run_report("run_test_storage_1", tenant_id="pilot-owner")
        self.assertIsNotNone(retrieved)
        self.assertEqual(retrieved["run_id"], "run_test_storage_1")
        self.assertEqual(retrieved["final_nav"], "1001.2500")

    def test_safe_online_backup_and_integrity(self):
        backup_path = os.path.join(self.temp_dir.name, "backup_test.sqlite")
        self.db.backup_to(backup_path)
        self.assertTrue(os.path.exists(backup_path))

        # Check integrity
        b_conn = sqlite3.connect(backup_path)
        cur = b_conn.execute("PRAGMA integrity_check;")
        res = cur.fetchone()[0]
        b_conn.close()
        self.assertEqual(res, "ok")

if __name__ == "__main__":
    unittest.main()
