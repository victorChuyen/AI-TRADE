"""
OPC Trade Lab V1 - Unit Tests: Complete Set Observer Strategy
"""
import unittest
from decimal import Decimal
from backend.opc_trade.core import MarketState, FeeModelStatus
from backend.opc_trade.engine.strategy import StrategyConfig, evaluate_complete_set, RejectionReason
from backend.opc_trade.adapters.synthetic import create_synthetic_snapshot

class TestCompleteSetStrategy(unittest.TestCase):
    def test_valid_opportunity(self):
        snap = create_synthetic_snapshot(
            scenario_id="arb_1",
            ask_a_price="0.4500",
            ask_a_size="15.0",
            ask_b_price="0.4800",
            ask_b_size="15.0"
        )
        config = StrategyConfig(target_pair_size=Decimal("10.0"), min_edge_threshold_usd=Decimal("0.0200"))
        sig = evaluate_complete_set(snap, config)
        self.assertTrue(sig.is_valid)
        self.assertEqual(len(sig.rejection_reasons), 0)
        # Gross cost = 10 * 0.45 + 10 * 0.48 = 9.30
        self.assertEqual(sig.gross_pair_cost, Decimal("9.3000"))
        # Net profit = 10.00 - 9.30 - fees - buffer > 0
        self.assertGreater(sig.estimated_net_profit, Decimal("0.5000"))
        self.assertGreater(sig.edge_per_pair, Decimal("0.0500"))

    def test_fee_hurdle_rejected(self):
        # 0.495 + 0.495 = 0.99 gross cost. With 0.2% fee + buffer, edge is too small
        snap = create_synthetic_snapshot(
            scenario_id="thin_1",
            ask_a_price="0.4950",
            ask_a_size="15.0",
            ask_b_price="0.4950",
            ask_b_size="15.0"
        )
        config = StrategyConfig(target_pair_size=Decimal("10.0"), min_edge_threshold_usd=Decimal("0.0150"))
        sig = evaluate_complete_set(snap, config)
        self.assertFalse(sig.is_valid)
        self.assertIn(RejectionReason.EDGE_BELOW_THRESHOLD, sig.rejection_reasons)

    def test_stale_data_rejection(self):
        snap = create_synthetic_snapshot(
            scenario_id="stale_1",
            ask_a_price="0.4000",
            ask_b_price="0.4000",
            age_ms=8000 # 8 seconds old
        )
        config = StrategyConfig(max_staleness_ms=5000)
        now_ms = snap.book_a.source_timestamp_ms + 8000
        sig = evaluate_complete_set(snap, config, now_ms=now_ms)
        self.assertFalse(sig.is_valid)
        self.assertIn(RejectionReason.STALE_DATA, sig.rejection_reasons)

    def test_crossed_book_rejection(self):
        snap = create_synthetic_snapshot(
            scenario_id="crossed_1",
            is_crossed=True
        )
        config = StrategyConfig()
        sig = evaluate_complete_set(snap, config)
        self.assertFalse(sig.is_valid)
        self.assertIn(RejectionReason.BOOK_CROSSED, sig.rejection_reasons)

    def test_closed_market_rejection(self):
        snap = create_synthetic_snapshot(
            scenario_id="closed_1",
            market_state=MarketState.CLOSED
        )
        config = StrategyConfig()
        sig = evaluate_complete_set(snap, config)
        self.assertFalse(sig.is_valid)
        self.assertIn(RejectionReason.MARKET_NOT_OPEN, sig.rejection_reasons)

if __name__ == "__main__":
    unittest.main()
