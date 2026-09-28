"""
OPC Trade Lab V1 - Integration Tests: Deterministic Replay Runner
"""
import unittest
from decimal import Decimal
from backend.opc_trade.adapters.synthetic import generate_standard_synthetic_dataset
from backend.opc_trade.engine.strategy import StrategyConfig
from backend.opc_trade.replay.runner import ReplayRunner

class TestReplayRunnerIntegration(unittest.TestCase):
    def test_deterministic_multi_scenario_replay(self):
        dataset = generate_standard_synthetic_dataset()
        config = StrategyConfig(target_pair_size=Decimal("10.0"), min_edge_threshold_usd=Decimal("0.0150"))

        runner_1 = ReplayRunner(config=config, simulated_latency_ms=100, run_id="run_det_01")
        report_1 = runner_1.run(dataset)

        runner_2 = ReplayRunner(config=config, simulated_latency_ms=100, run_id="run_det_02")
        report_2 = runner_2.run(dataset)

        # Economic outcomes must be perfectly identical
        self.assertEqual(report_1.signals_generated, report_2.signals_generated)
        self.assertEqual(report_1.valid_signals, report_2.valid_signals)
        self.assertEqual(report_1.orders_submitted, report_2.orders_submitted)
        self.assertEqual(report_1.orders_filled_completely, report_2.orders_filled_completely)
        self.assertEqual(report_1.orders_partially_filled, report_2.orders_partially_filled)
        self.assertEqual(report_1.orders_rejected_or_expired, report_2.orders_rejected_or_expired)
        self.assertEqual(report_1.final_nav, report_2.final_nav)
        self.assertEqual(report_1.total_fees_paid, report_2.total_fees_paid)

    def test_partial_fill_and_residuals(self):
        dataset = generate_standard_synthetic_dataset()
        config = StrategyConfig(target_pair_size=Decimal("10.0"))
        runner = ReplayRunner(config=config, simulated_latency_ms=100, run_id="run_partial_check")
        report = runner.run(dataset)

        # Check that we had at least 1 partial fill in the 5-step scenario
        self.assertGreater(report.orders_partially_filled, 0)
        # Check executions for residual shares
        partials = [e for e in report.executions if e["state"] == "PARTIALLY_FILLED"]
        self.assertTrue(len(partials) > 0)
        self.assertGreater(Decimal(partials[0]["unpaired_residual"]), Decimal("0"))

if __name__ == "__main__":
    unittest.main()
