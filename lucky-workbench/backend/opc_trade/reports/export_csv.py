"""
OPC Trade Lab V1 - CSV Export with Formula Injection Neutralization
Owner: Victor Chuyền · OPC AI REVENUE LAB
Version: 1.0 (2026-09-24)
"""
from __future__ import annotations

import csv
import io
from typing import List, Dict, Any

INJECTION_CHARS = ("=", "+", "-", "@", "\t", "\r")

def sanitize_csv_cell(val: Any) -> str:
    """
    Prevents CSV / Spreadsheet Formula Injection (CSV Injection / CWE-1236).
    If a string starts with =, +, -, @, tab, or carriage return, escape with a prepended single quote.
    """
    if val is None:
        return ""
    s = str(val)
    if s.startswith(INJECTION_CHARS):
        return "'" + s
    return s

def export_executions_to_csv(executions: List[Dict[str, Any]]) -> str:
    output = io.StringIO()
    writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)
    headers = [
        "order_id",
        "signal_id",
        "condition_id",
        "market_slug",
        "submission_time_utc",
        "execution_time_utc",
        "state",
        "requested_pairs",
        "paired_shares",
        "unpaired_residual",
        "total_cost",
        "total_fees",
        "reason",
        "leg_a_token",
        "leg_a_filled",
        "leg_a_cost",
        "leg_a_avg_price",
        "leg_b_token",
        "leg_b_filled",
        "leg_b_cost",
        "leg_b_avg_price",
    ]
    writer.writerow(headers)

    for ex in executions:
        row = [
            sanitize_csv_cell(ex.get("order_id")),
            sanitize_csv_cell(ex.get("signal_id")),
            sanitize_csv_cell(ex.get("condition_id")),
            sanitize_csv_cell(ex.get("market_slug")),
            sanitize_csv_cell(ex.get("submission_time_utc")),
            sanitize_csv_cell(ex.get("execution_time_utc")),
            sanitize_csv_cell(ex.get("state")),
            sanitize_csv_cell(ex.get("requested_pairs")),
            sanitize_csv_cell(ex.get("paired_shares")),
            sanitize_csv_cell(ex.get("unpaired_residual")),
            sanitize_csv_cell(ex.get("total_cost")),
            sanitize_csv_cell(ex.get("total_fees")),
            sanitize_csv_cell(ex.get("reason")),
            sanitize_csv_cell(ex.get("leg_a", {}).get("token")),
            sanitize_csv_cell(ex.get("leg_a", {}).get("filled")),
            sanitize_csv_cell(ex.get("leg_a", {}).get("cost")),
            sanitize_csv_cell(ex.get("leg_a", {}).get("avg_price")),
            sanitize_csv_cell(ex.get("leg_b", {}).get("token")),
            sanitize_csv_cell(ex.get("leg_b", {}).get("filled")),
            sanitize_csv_cell(ex.get("leg_b", {}).get("cost")),
            sanitize_csv_cell(ex.get("leg_b", {}).get("avg_price")),
        ]
        writer.writerow(row)

    return output.getvalue()

def export_nav_timeline_to_csv(timeline: List[Dict[str, str]]) -> str:
    output = io.StringIO()
    writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)
    headers = ["timestamp_utc", "nav", "available_cash", "unrealized_pnl", "total_fees", "event_id"]
    writer.writerow(headers)
    for pt in timeline:
        writer.writerow([
            sanitize_csv_cell(pt.get("timestamp_utc")),
            sanitize_csv_cell(pt.get("nav")),
            sanitize_csv_cell(pt.get("available_cash")),
            sanitize_csv_cell(pt.get("unrealized_pnl")),
            sanitize_csv_cell(pt.get("total_fees")),
            sanitize_csv_cell(pt.get("event_id")),
        ])
    return output.getvalue()
