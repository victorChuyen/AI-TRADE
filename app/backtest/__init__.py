"""Backtest engine package for Lucky Trade."""
from .engine import BacktestEngine, BacktestConfig, BacktestResult, Signal, Trade
from .report import console_summary, trade_journal_csv, compare_strategies, equity_curve_csv
from .walk_forward import WalkForwardOptimizer, WalkForwardResult, WalkForwardWindow, generate_walk_forward_report

__all__ = [
    'BacktestEngine',
    'BacktestConfig',
    'BacktestResult',
    'Signal',
    'Trade',
    'console_summary',
    'trade_journal_csv',
    'compare_strategies',
    'equity_curve_csv',
    'WalkForwardOptimizer',
    'WalkForwardResult',
    'WalkForwardWindow',
    'generate_walk_forward_report'
]
