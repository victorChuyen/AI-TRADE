"""Lucky Trade Strategies module."""
from .base import BaseStrategy, IndicatorHelper, Signal
from .trend_following import TrendFollowingStrategy
from .breakout import DonchianBreakoutStrategy
from .mean_reversion import BollingerMeanReversionStrategy, BollingerMeanReversion

__all__ = [
    "BaseStrategy",
    "IndicatorHelper",
    "Signal",
    "TrendFollowingStrategy",
    "DonchianBreakoutStrategy",
    "BollingerMeanReversionStrategy",
    "BollingerMeanReversion"
]
