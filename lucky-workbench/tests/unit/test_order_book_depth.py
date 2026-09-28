"""
OPC Trade Lab V1 - Unit Tests: Order Book Depth Sweep & Sorting
"""
import unittest
from decimal import Decimal
from backend.opc_trade.core import OrderBookSide, PriceLevel
from backend.opc_trade.engine.depth_sweep import sweep_book

class TestOrderBookDepth(unittest.TestCase):
    def test_sort_and_filter(self):
        side = OrderBookSide(
            token_id="tok_1",
            source_timestamp_ms=1000,
            bids=[PriceLevel(Decimal("0.40"), Decimal("10")), PriceLevel(Decimal("0.45"), Decimal("5"))],
            asks=[PriceLevel(Decimal("0.55"), Decimal("10")), PriceLevel(Decimal("0.50"), Decimal("5"))]
        )
        side.validate_and_sort()
        # Bids must be descending
        self.assertEqual(side.bids[0].price, Decimal("0.45"))
        self.assertEqual(side.bids[1].price, Decimal("0.40"))
        # Asks must be ascending
        self.assertEqual(side.asks[0].price, Decimal("0.50"))
        self.assertEqual(side.asks[1].price, Decimal("0.55"))

    def test_crossed_detection(self):
        side = OrderBookSide(
            token_id="tok_1",
            source_timestamp_ms=1000,
            bids=[PriceLevel(Decimal("0.52"), Decimal("10"))],
            asks=[PriceLevel(Decimal("0.50"), Decimal("10"))]
        )
        self.assertTrue(side.is_crossed())

    def test_depth_sweep_multi_level(self):
        asks = [
            PriceLevel(Decimal("0.4000"), Decimal("5.0")),
            PriceLevel(Decimal("0.4200"), Decimal("10.0")),
            PriceLevel(Decimal("0.4500"), Decimal("10.0")),
        ]
        # Request 12 shares: 5 @ 0.40 = 2.00, 7 @ 0.42 = 2.94 -> total = 4.94
        res = sweep_book(asks, Decimal("12.0"))
        self.assertTrue(res.is_complete)
        self.assertEqual(res.filled_size, Decimal("12.0"))
        self.assertEqual(res.total_cost, Decimal("4.9400"))
        self.assertEqual(res.marginal_price, Decimal("0.4200"))
        # Average price = 4.94 / 12 = 0.411666... quantized to 0.4117
        self.assertEqual(res.average_price, Decimal("0.4117"))

    def test_depth_sweep_insufficient(self):
        asks = [PriceLevel(Decimal("0.4000"), Decimal("5.0"))]
        res = sweep_book(asks, Decimal("10.0"))
        self.assertFalse(res.is_complete)
        self.assertEqual(res.filled_size, Decimal("5.0"))
        self.assertEqual(res.remaining_size, Decimal("5.0"))
        self.assertEqual(res.total_cost, Decimal("2.0000"))

    def test_depth_sweep_with_limit(self):
        asks = [
            PriceLevel(Decimal("0.4000"), Decimal("5.0")),
            PriceLevel(Decimal("0.4500"), Decimal("5.0")),
        ]
        # Max limit is 0.4200, so only first level fills
        res = sweep_book(asks, Decimal("10.0"), max_price_limit=Decimal("0.4200"))
        self.assertFalse(res.is_complete)
        self.assertEqual(res.filled_size, Decimal("5.0"))

if __name__ == "__main__":
    unittest.main()
