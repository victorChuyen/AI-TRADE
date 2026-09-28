"""
OPC Trade Lab V1 - Unit Tests: Strict Decimal Ledger & Inventory Accounting
"""
import unittest
from decimal import Decimal
from backend.opc_trade.accounting.decimal_ledger import AccountingState

class TestLedgerAccounting(unittest.TestCase):
    def setUp(self):
        self.acc = AccountingState.initialize("run_acc_test", "owner_1", Decimal("1000.0000"))

    def test_initial_state(self):
        self.assertEqual(self.acc.available_cash, Decimal("1000.0000"))
        self.assertEqual(self.acc.reserved_cash, Decimal("0.0000"))
        self.assertEqual(len(self.acc.ledger_entries), 1)
        self.assertEqual(self.acc.ledger_entries[0].cause, "DEPOSIT_INITIAL")

    def test_reserve_and_release(self):
        ok = self.acc.reserve_cash("ord_1", Decimal("150.0000"))
        self.assertTrue(ok)
        self.assertEqual(self.acc.available_cash, Decimal("850.0000"))
        self.assertEqual(self.acc.reserved_cash, Decimal("150.0000"))

        # Cannot reserve more than available
        ok_fail = self.acc.reserve_cash("ord_2", Decimal("900.0000"))
        self.assertFalse(ok_fail)

        # Release partial reservation
        self.acc.release_reservation("ord_1", Decimal("50.0000"))
        self.assertEqual(self.acc.available_cash, Decimal("900.0000"))
        self.assertEqual(self.acc.reserved_cash, Decimal("100.0000"))

    def test_fill_records_and_deducts_properly(self):
        self.acc.reserve_cash("ord_1", Decimal("100.0000"))
        ok = self.acc.record_fill(
            order_id="ord_1",
            fill_id="fl_01",
            idempotency_key="fill_ord_1_legA",
            condition_id="cond_btc",
            token_id="tok_yes",
            outcome_name="YES",
            shares=Decimal("10.00"),
            cost=Decimal("4.6000"),
            fee=Decimal("0.0100"),
            timestamp_utc="2026-09-24T12:00:00Z"
        )
        self.assertTrue(ok)
        self.assertEqual(len(self.acc.inventory_lots), 1)
        lot = self.acc.inventory_lots[0]
        self.assertEqual(lot.size, Decimal("10.00"))
        self.assertEqual(lot.cost_basis, Decimal("4.6100")) # cost + fee

        # Total deduction 4.61 deducted from reserved (was 100) -> 95.39 left in reserved
        self.assertEqual(self.acc.reserved_cash, Decimal("95.3900"))
        self.assertEqual(self.acc.total_fees_paid, Decimal("0.0100"))

    def test_idempotency_prevents_duplicate_deduction(self):
        self.acc.reserve_cash("ord_1", Decimal("50.0000"))
        self.acc.record_fill("ord_1", "fl_1", "idem_key_1", "c1", "t1", "YES", Decimal("5"), Decimal("2.0"), Decimal("0.01"), "ts1")
        lots_count = len(self.acc.inventory_lots)
        reserved_before = self.acc.reserved_cash

        # Duplicate call with exact same idempotency_key
        dup_ok = self.acc.record_fill("ord_1", "fl_1", "idem_key_1", "c1", "t1", "YES", Decimal("5"), Decimal("2.0"), Decimal("0.01"), "ts1")
        self.assertTrue(dup_ok)
        self.assertEqual(len(self.acc.inventory_lots), lots_count) # Not duplicated
        self.assertEqual(self.acc.reserved_cash, reserved_before)   # No double deduction

    def test_mark_to_bid_valuation(self):
        self.acc.record_fill("ord_1", "fl_1", "key_a", "c1", "tok_yes", "YES", Decimal("10.00"), Decimal("4.5000"), Decimal("0.0100"), "ts")
        # Bid price is 0.48 -> Market value = 10 * 0.48 = 4.80. Cost basis = 4.51 -> Unrealized = +0.29
        marks = self.acc.calculate_mark_to_bid({"tok_yes": Decimal("0.4800")})
        self.assertEqual(marks["unrealized_pnl"], "0.2900")
        self.assertEqual(marks["open_lots_count"], 1)

if __name__ == "__main__":
    unittest.main()
