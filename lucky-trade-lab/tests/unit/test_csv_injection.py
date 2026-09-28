"""
OPC Trade Lab V1 - Unit Tests: CSV Injection Neutralization (CWE-1236)
"""
import unittest
from backend.opc_trade.reports.export_csv import sanitize_csv_cell, export_executions_to_csv

class TestCsvInjection(unittest.TestCase):
    def test_sanitize_formula_triggers(self):
        # Formula characters: =, +, -, @, tab, carriage return
        self.assertEqual(sanitize_csv_cell("=cmd|' /C calc'!A0"), "'=cmd|' /C calc'!A0")
        self.assertEqual(sanitize_csv_cell("+12345"), "'+12345")
        self.assertEqual(sanitize_csv_cell("-sum(A1:A10)"), "'-sum(A1:A10)")
        self.assertEqual(sanitize_csv_cell("@SUM(1,2)"), "'@SUM(1,2)")
        self.assertEqual(sanitize_csv_cell("\tTABBED"), "'\tTABBED")

    def test_safe_cell_not_modified(self):
        self.assertEqual(sanitize_csv_cell("ORD_12345"), "ORD_12345")
        self.assertEqual(sanitize_csv_cell("0.4500"), "0.4500")
        self.assertEqual(sanitize_csv_cell(""), "")
        self.assertEqual(sanitize_csv_cell(None), "")

    def test_csv_export_neutralizes_malicious_market_slug(self):
        malicious_execution = {
            "order_id": "=cmd|' /C calc'!A0",
            "market_slug": "@malicious_formula()",
            "requested_pairs": "+100",
            "reason": "-overflow"
        }
        csv_str = export_executions_to_csv([malicious_execution])
        self.assertIn("'=cmd|' /C calc'!A0", csv_str)
        self.assertNotIn("\n=cmd", csv_str)

if __name__ == "__main__":
    unittest.main()
