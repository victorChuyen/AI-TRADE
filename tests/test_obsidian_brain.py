"""Unit tests for Obsidian Brain Knowledge Vault and Reasoning Engine."""
import unittest
from app.brain import ObsidianBrain


class TestObsidianBrain(unittest.TestCase):

    def setUp(self):
        self.brain = ObsidianBrain()

    def test_vault_loading(self):
        """Kiểm tra việc nạp các file Markdown từ brain_vault/."""
        status = self.brain.get_status()
        self.assertTrue(status["vault_active"])
        self.assertGreaterEqual(status["rules_count"], 1)
        self.assertGreaterEqual(status["skills_count"], 3)
        self.assertGreaterEqual(status["journal_count"], 1)

    def test_evaluate_rejects_missing_sl(self):
        """Kiểm tra từ chối lệnh khi thiếu Stop Loss hoặc Stop Loss không hợp lệ."""
        proposal = {
            "symbol": "EURUSD",
            "side": "BUY",
            "entry": 1.08500,
            "sl": 0, # Thiếu SL
            "tp": 1.09000,
            "volume": 0.10,
            "strategy": "trend_following"
        }
        res = self.brain.evaluate_proposal(proposal, {"spread": 1.2})
        self.assertEqual(res["decision"], "REJECT")
        self.assertIn("VI PHẠM BỘ QUY TẮC CỨNG", res["reasoning_vn"])
        self.assertFalse(res["psychology_check"])

    def test_evaluate_rejects_poor_rr_ratio(self):
        """Kiểm tra từ chối lệnh khi tỷ lệ R:R quá thấp (< 1.1)."""
        proposal = {
            "symbol": "EURUSD",
            "side": "BUY",
            "entry": 1.08500,
            "sl": 1.08000, # Risk = 500 pts
            "tp": 1.08520, # Reward = 20 pts -> R:R = 0.04
            "volume": 0.10,
            "strategy": "trend_following"
        }
        res = self.brain.evaluate_proposal(proposal, {"spread": 1.2})
        self.assertEqual(res["decision"], "REJECT")
        self.assertIn("Reward/Risk", res["reasoning_vn"])

    def test_evaluate_approves_valid_setup(self):
        """Kiểm tra phê duyệt lệnh thỏa mãn các quy tắc và kỹ năng Obsidian."""
        proposal = {
            "symbol": "EURUSD",
            "side": "BUY",
            "entry": 1.08500,
            "sl": 1.08300, # Risk = 200 pts
            "tp": 1.08900, # Reward = 400 pts -> R:R = 2.0
            "volume": 0.10,
            "strategy": "trend_following"
        }
        res = self.brain.evaluate_proposal(proposal, {"spread": 1.2})
        self.assertEqual(res["decision"], "APPROVE")
        self.assertGreaterEqual(res["confidence_pct"], 75)
        self.assertTrue(res["psychology_check"])
        self.assertIn("BỘ NÃO OBSIDIAN DUYỆT", res["reasoning_vn"])


if __name__ == "__main__":
    unittest.main()
