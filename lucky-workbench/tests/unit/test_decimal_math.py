"""
OPC Trade Lab V1 - Unit Tests: Decimal Mathematics & Precision
"""
import unittest
from decimal import Decimal
from backend.opc_trade.core import to_d, quantize_money, quantize_price, quantize_shares, d_str

class TestDecimalMath(unittest.TestCase):
    def test_to_d_conversions(self):
        self.assertEqual(to_d("0.4500"), Decimal("0.4500"))
        self.assertEqual(to_d(0.5), Decimal("0.5"))
        self.assertEqual(to_d(None), Decimal("0"))
        self.assertEqual(to_d(""), Decimal("0"))

    def test_quantize_rules(self):
        p = quantize_price(Decimal("0.45678"))
        self.assertEqual(p, Decimal("0.4568"))

        m = quantize_money(Decimal("100.123456"))
        self.assertEqual(m, Decimal("100.1235"))

        s = quantize_shares(Decimal("10.999"))
        self.assertEqual(s, Decimal("10.99"))

    def test_no_float_imprecision_leak(self):
        # 0.1 + 0.2 in float is 0.30000000000000004
        d1 = to_d("0.1000")
        d2 = to_d("0.2000")
        self.assertEqual(d1 + d2, Decimal("0.3000"))

    def test_d_str_formatting(self):
        val = Decimal("0.00001234")
        self.assertEqual(d_str(val), "0.00001234")
        self.assertNotIn("e", d_str(val).lower())

if __name__ == "__main__":
    unittest.main()
