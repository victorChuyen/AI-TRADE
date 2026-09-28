"""Lucky Trade configuration — centralized settings management."""
from dataclasses import dataclass, field, asdict
from decimal import Decimal
from pathlib import Path
from typing import Optional, Any
import json
import os


ROOT = Path(__file__).resolve().parent.parent
DEFAULT_CONFIG_PATH = ROOT / 'config' / 'lucky.json'
DEFAULT_CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)


class DecimalEncoder(json.JSONEncoder):
    def default(self, obj: Any) -> Any:
        if isinstance(obj, Decimal):
            return str(obj)
        return super().default(obj)


# Ghi chú Exness API: Exness REST/WebSocket API (Personal Area API) chỉ hỗ trợ tại khu vực Vietnam 
# và KHÔNG hỗ trợ giao dịch cho các tài khoản MT standard/pro (chỉ để quản lý tài khoản). 
# Để giao dịch, hệ thống vẫn phải sử dụng MT5 Terminal qua thư viện MetaTrader5.

# Exness-specific known symbol mappings:
# - BTCUSD có thể là BTCUSDm trên tài khoản Exness Standard
# - XAUUSD có thể là XAUUSDm 
# - WTI có thể là USOILCash hoặc OILCash
# - Các cặp Forex có thể có hậu tố 'm' trên tài khoản Standard hoặc 'c' trên tài khoản Cent
EXNESS_SYMBOL_MAPPINGS = {
    'BTCUSD': ['BTCUSDm'],
    'XAUUSD': ['XAUUSDm'],
    'WTI': ['USOILCash', 'OILCash']
}

@dataclass
class BrokerProfile:
    """Cấu hình kết nối broker."""
    name: str = 'Exness'                # e.g. 'IC Markets', 'Pepperstone'
    mt5_path: Optional[str] = None      # Path to terminal64.exe
    server: Optional[str] = None        # e.g. 'ICMarketsSC-Demo'
    login: Optional[int] = None         # Account number
    # DO NOT store password - use MT5 saved credentials
    account_mode: str = 'demo'          # 'demo' or 'live'
    verified: bool = False              # True after successful connection test


@dataclass  
class RiskLimits:
    """Giới hạn rủi ro — phải được Victor xác nhận."""
    max_risk_per_trade_pct: Decimal = Decimal('0.5')   # % equity
    max_daily_loss_pct: Decimal = Decimal('2.0')        # % equity
    max_total_risk_pct: Decimal = Decimal('2.0')        # % equity
    max_positions: int = 5
    max_positions_per_symbol: int = 2
    min_sl_distance_pips: Decimal = Decimal('10')       # Minimum SL distance
    max_spread_pips: Decimal = Decimal('5')             # Max spread to allow entry
    confirmed_by_victor: bool = False                    # MUST be True for live

    def __post_init__(self):
        # Convert strings/floats to Decimal if initialized from dict/json
        for field_name in ['max_risk_per_trade_pct', 'max_daily_loss_pct', 
                           'max_total_risk_pct', 'min_sl_distance_pips', 'max_spread_pips']:
            val = getattr(self, field_name)
            if not isinstance(val, Decimal):
                setattr(self, field_name, Decimal(str(val)))


@dataclass
class StrategyConfig:
    """Cấu hình chiến lược."""
    name: str                           # e.g. 'trend_following'
    enabled: bool = False
    symbols: list = field(default_factory=list)  # Which symbols to trade
    timeframe: str = 'H1'              # Primary timeframe
    version: str = '0.1.0'             # Strategy version for audit trail
    params: dict = field(default_factory=dict)  # Strategy-specific parameters


@dataclass
class LuckyConfig:
    """Master configuration for Lucky Trade."""
    # Environment
    mode: str = 'paper'                 # 'paper', 'demo', 'live'
    execution: str = 'semi_auto'        # 'semi_auto' or 'auto'
    
    # Server
    port: int = 8766
    db_path: str = ''
    
    # Broker
    broker: BrokerProfile = field(default_factory=BrokerProfile)
    
    # Risk
    risk: RiskLimits = field(default_factory=RiskLimits)
    
    # Strategies
    strategies: list = field(default_factory=list)
    
    # AI
    ai_api_key: str = ''                # Empty = AI disabled
    ai_model: str = ''
    ai_base_url: str = 'https://api.openai.com/v1'
    
    # Audit
    audit_log_path: str = ''
    
    # Magic number range for Lucky orders
    magic_start: int = 202600
    magic_end: int = 202699

    def __post_init__(self):
        if isinstance(self.broker, dict):
            self.broker = BrokerProfile(**self.broker)
        if isinstance(self.risk, dict):
            self.risk = RiskLimits(**self.risk)
            
        parsed_strats = []
        for s in self.strategies:
            if isinstance(s, dict):
                parsed_strats.append(StrategyConfig(**s))
            else:
                parsed_strats.append(s)
        self.strategies = parsed_strats
        
        if not self.db_path:
            self.db_path = str(ROOT / 'data' / 'lucky_trade.db')
        if not self.audit_log_path:
            self.audit_log_path = str(ROOT / 'logs' / 'audit.log')


def load_config(path: Optional[Path] = None) -> LuckyConfig:
    """Load config from JSON file, env vars, and defaults."""
    # Priority: env vars > config file > defaults
    # IMPORTANT: Never store passwords or sensitive keys in config file
    config_path = path or DEFAULT_CONFIG_PATH
    config_dict = {}

    # Load from file
    if config_path.exists():
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                config_dict = json.load(f)
        except Exception as e:
            print(f"Lỗi khi đọc file cấu hình {config_path}: {e}")

    # Initialize config
    # Use only known fields to avoid errors from outdated config files
    import inspect
    valid_keys = {k for k in inspect.signature(LuckyConfig).parameters}
    filtered_dict = {k: v for k, v in config_dict.items() if k in valid_keys}
    
    config = LuckyConfig(**filtered_dict)

    # Env vars override
    if 'LUCKY_MODE' in os.environ:
        config.mode = os.environ['LUCKY_MODE']
    if 'LUCKY_EXECUTION' in os.environ:
        config.execution = os.environ['LUCKY_EXECUTION']
    if 'LUCKY_PORT' in os.environ:
        try:
            config.port = int(os.environ['LUCKY_PORT'])
        except ValueError:
            pass
    if 'LUCKY_DB_PATH' in os.environ:
        config.db_path = os.environ['LUCKY_DB_PATH']
    if 'LUCKY_MT5_PATH' in os.environ:
        config.broker.mt5_path = os.environ['LUCKY_MT5_PATH']
    if 'LUCKY_AI_API_KEY' in os.environ:
        config.ai_api_key = os.environ['LUCKY_AI_API_KEY']
        
    return config

def save_config(config: LuckyConfig, path: Optional[Path] = None) -> None:
    """Save config to JSON file (excluding sensitive fields)."""
    config_path = path or DEFAULT_CONFIG_PATH
    config_path.parent.mkdir(parents=True, exist_ok=True)
    
    config_dict = asdict(config)
    
    # Bảo mật: Không lưu API keys
    if 'ai_api_key' in config_dict:
        config_dict['ai_api_key'] = ''
        
    with open(config_path, 'w', encoding='utf-8') as f:
        json.dump(config_dict, f, cls=DecimalEncoder, indent=4, ensure_ascii=False)

def validate_config(config: LuckyConfig) -> list[str]:
    """Validate config and return list of issues."""
    issues = []
    
    # Check: live mode requires confirmed risk limits
    if config.mode == 'live':
        if not config.risk.confirmed_by_victor:
            issues.append("Lỗi nghiêm trọng: Chế độ LIVE yêu cầu risk.confirmed_by_victor = True.")
        if config.broker.account_mode != 'live':
            issues.append("Cảnh báo: Chế độ LIVE nhưng account_mode của broker không phải là 'live'.")
            
    # Check: auto mode requires confirmed strategy params  
    if config.execution == 'auto' and config.mode == 'live':
        active_strats = [s for s in config.strategies if getattr(s, 'enabled', False)]
        if not active_strats:
            issues.append("Cảnh báo: Chế độ AUTO không có chiến lược nào được bật.")
            
    # Check: broker path exists if specified
    if config.broker.mt5_path:
        if not Path(config.broker.mt5_path).exists():
            issues.append(f"Lỗi: Đường dẫn MT5 không tồn tại: {config.broker.mt5_path}")
            
    # Check: risk limits are reasonable
    if config.risk.max_risk_per_trade_pct > Decimal('5.0'):
        issues.append(f"Cảnh báo: Rủi ro trên mỗi lệnh quá cao ({config.risk.max_risk_per_trade_pct}%).")
    if config.risk.max_daily_loss_pct > Decimal('10.0'):
        issues.append(f"Cảnh báo: Rủi ro thua lỗ tối đa trong ngày quá cao ({config.risk.max_daily_loss_pct}%).")
        
    return issues

def exness_defaults() -> LuckyConfig:
    """Tạo cấu hình mặc định cho Exness demo (paper trading)."""
    cfg = LuckyConfig()
    cfg.mode = 'demo'
    cfg.execution = 'paper'
    cfg.broker.name = 'Exness'
    cfg.broker.account_mode = 'demo'
    # Các giới hạn rủi ro tiêu chuẩn
    cfg.risk.max_risk_per_trade_pct = Decimal('0.5')
    cfg.risk.max_daily_loss_pct = Decimal('2.0')
    cfg.risk.max_total_risk_pct = Decimal('2.0')
    cfg.risk.max_positions = 5
    cfg.risk.max_positions_per_symbol = 2
    return cfg


if __name__ == '__main__':
    # Cấu hình thử nghiệm
    cfg = load_config()
    issues = validate_config(cfg)
    
    print("=== LUCKY TRADE CONFIGURATION ===")
    print(json.dumps(asdict(cfg), cls=DecimalEncoder, indent=2, ensure_ascii=False))
    
    if issues:
        print("\n=== VALIDATION ISSUES ===")
        for issue in issues:
            print(f"- {issue}")
    else:
        print("\nCấu hình hợp lệ.")
