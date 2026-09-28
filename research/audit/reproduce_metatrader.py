"""Offline audit: extract reviewed AST definitions, never import SDK or connect.

Exit 0 means the documented upstream defects were reproduced, NOT app approval.
Run from any directory using Python 3.10+; no third-party dependencies.
"""
from __future__ import annotations

import ast
import hashlib
import json
import subprocess
from enum import Enum
from pathlib import Path
from types import SimpleNamespace

ROOT = Path(__file__).resolve().parents[2]
REPO = ROOT / "research/vendor/metatrader-mcp-server"
PIN = "bd2ff591e32cb492fafefe74221d502dd78b71ef"
FILES = {}


def extract(relative, name, namespace):
    path = REPO / relative
    raw = path.read_bytes()
    FILES[relative] = hashlib.sha256(raw).hexdigest()
    tree = ast.parse(raw, filename=str(path))
    definition = next(n for n in tree.body if isinstance(n, (ast.FunctionDef, ast.ClassDef)) and n.name == name)
    module = ast.Module(body=[ast.ImportFrom(module="__future__", names=[ast.alias(name="annotations")], level=0), definition], type_ignores=[])
    exec(compile(ast.fix_missing_locations(module), str(path), "exec"), namespace)
    return namespace[name]


class FakeMT5:
    ORDER_FILLING_FOK, ORDER_FILLING_IOC, ORDER_FILLING_RETURN = 0, 1, 2

    def __init__(self):
        self.calls = []
        self.filling_mode = 1

    def symbol_select(self, *args):
        return True

    def symbol_info(self, symbol):
        return SimpleNamespace(filling_mode=self.filling_mode, digits=5)

    def symbol_info_tick(self, symbol):
        return SimpleNamespace(ask=1.10012, bid=1.10000)

    def order_send(self, request):
        self.calls.append(request)
        return SimpleNamespace(retcode=10019, comment="No money")

    def last_error(self):
        return (1, "Success")


def main():
    actual = subprocess.check_output(["git", "-C", str(REPO), "rev-parse", "HEAD"], text=True).strip()
    assert actual == PIN, (actual, PIN)
    assert not subprocess.check_output(["git", "-C", str(REPO), "status", "--porcelain", "--untracked-files=no"], text=True).strip(), "Tracked upstream files modified"
    sdk = FakeMT5()
    ns = {"Enum": Enum, "mt5": sdk, "MT5Market": lambda connection: SimpleNamespace(get_symbols=lambda symbol: [symbol])}
    extract("src/metatrader_client/types/order_type.py", "OrderType", ns)
    extract("src/metatrader_client/types/trade_request_actions.py", "TradeRequestActions", ns)
    send = extract("src/metatrader_client/order/send_order.py", "send_order", ns)
    account = extract("src/metatrader_client/account/get_account_type.py", "get_account_type", ns)
    results = []
    for mode, expected in [(0, "demo"), (1, "contest"), (2, "real")]:
        ns["get_account_info"] = lambda connection, mode=mode: {"trade_mode": mode}
        observed = account(None)
        results.append({"case": f"account_mode_{mode}", "expected": expected, "observed": observed, "defect_reproduced": observed != expected})
    for side, sl, tp in [("BUY", 1.09, 1.12), ("SELL", 1.12, 1.09)]:
        sdk.calls.clear()
        result = send(None, action="DEAL", symbol="EURUSD", volume=0.01, order_type=side, stop_loss=sl, take_profit=tp)
        results.append({"case": f"protected_market_{side}", "expected": "SL/TP validation uses current price, not default zero", "observed": result, "fake_sdk_calls": len(sdk.calls), "defect_reproduced": result["success"] is False and not sdk.calls})
    sdk.calls.clear()
    result = send(None, action="DEAL", symbol="EURUSD", volume=0.01, order_type="BUY")
    results.append({"case": "broker_rejection_10019", "expected_success": False, "observed_success": result["success"], "stub_retcode": result["data"].retcode, "fake_sdk_calls": len(sdk.calls), "defect_reproduced": result["success"] is True and len(sdk.calls) == 1})
    sdk.calls.clear()
    sdk.filling_mode = 0
    exception = None
    try:
        send(None, action="DEAL", symbol="EURUSD", volume=0.01, order_type="BUY")
    except UnboundLocalError as exc:
        exception = str(exc)
    results.append({"case": "filling_mask_zero", "observed_exception": exception, "defect_reproduced": exception is not None})
    server = ast.parse((REPO / "src/metatrader_mcp/server.py").read_text(encoding="utf-8"))
    exposed = [node.name for node in ast.walk(server) if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and any(isinstance(d, ast.Call) and isinstance(d.func, ast.Attribute) and isinstance(d.func.value, ast.Name) and d.func.value.id == "mcp" and d.func.attr == "tool" for d in node.decorator_list)]
    report = {"commit": PIN, "mode": "OFFLINE_FAKE_SDK_NO_TERMINAL_NO_NETWORK", "meaning": "Reproduced defects, not passing application acceptance tests", "file_sha256": FILES, "mcp_tool_decorator_count": len(exposed), "mcp_tools": exposed, "cases": results}
    output = ROOT / "research/audit/results.json"
    output.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2, ensure_ascii=False))
    assert all(case["defect_reproduced"] for case in results), "An expected reproduction changed"


if __name__ == "__main__":
    main()
