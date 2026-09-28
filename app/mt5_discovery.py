"""
Module phát hiện và ánh xạ mã giao dịch (Symbol discovery) cho 6 sản phẩm mục tiêu của Lucky.
"""
from decimal import Decimal
from dataclasses import dataclass, field
from typing import Optional, Dict, List, Any
import json
import subprocess
import sys
import os
from pathlib import Path

# Các mã mục tiêu mà Lucky cần giao dịch
TARGET_SYMBOLS = {
    'BTCUSD': {'keywords': ['BTC', 'BITCOIN'], 'type': 'crypto_cfd', 'label': 'Bitcoin / US Dollar'},
    'XAUUSD': {'keywords': ['XAU', 'GOLD'], 'type': 'commodity_cfd', 'label': 'Vàng / US Dollar'},
    'WTI':    {'keywords': ['WTI', 'XTIUSD', 'USOIL', 'OIL', 'CL'], 'type': 'commodity_cfd', 'label': 'Dầu WTI / US Dollar'},
    'EURUSD': {'keywords': ['EURUSD'], 'type': 'forex', 'label': 'Euro / US Dollar'},
    'GBPUSD': {'keywords': ['GBPUSD'], 'type': 'forex', 'label': 'British Pound / US Dollar'},
    'USDJPY': {'keywords': ['USDJPY'], 'type': 'forex', 'label': 'US Dollar / Japanese Yen'},
}

@dataclass
class SymbolSpec:
    """Thông số kỹ thuật hợp đồng cho một mã giao dịch của broker (Contract specification)."""
    target: str           # Tên mục tiêu của Lucky (ví dụ: 'XAUUSD')
    broker_symbol: str    # Tên mã thực tế trên broker (ví dụ: 'XAUUSDm')
    description: str
    digits: int
    spread: int           # Spread hiện tại (tính bằng points)
    contract_size: Decimal
    volume_min: Decimal
    volume_max: Decimal  
    volume_step: Decimal
    tick_size: Decimal
    tick_value: Decimal   # Giá trị của một tick trên 1 lot (theo đồng tiền của tài khoản)
    currency_profit: str  # Đồng tiền để tính lãi/lỗ (P/L)
    trade_mode: int       # Chế độ giao dịch (0=disabled, các giá trị khác tùy MT5 enums)
    stops_level: int      # Khoảng cách SL/TP tối thiểu (tính bằng points)
    available: bool = True
    warnings: List[str] = field(default_factory=list)


def discover(adapter_output: Dict[str, Any]) -> Dict[str, SymbolSpec]:
    """
    Xử lý đầu ra từ lệnh read_symbols của mt5_adapter và tạo ra ánh xạ SymbolSpec.
    
    Args:
        adapter_output: Dictionary chứa thông tin các symbols từ mt5_adapter.
        
    Returns:
        Dict[str, SymbolSpec]: Mapping từ tên mục tiêu (target) sang SymbolSpec.
    """
    if not adapter_output.get("success", False):
        raise ValueError(f"Dữ liệu từ adapter không hợp lệ hoặc lỗi: {adapter_output.get('error', 'Unknown')}")
    
    # mt5_adapter trả symbols dưới dạng list, chuyển sang dict theo name
    symbols_list = adapter_output.get("symbols", [])
    symbols_data: Dict[str, Dict] = {}
    for sym in symbols_list:
        name = sym.get("name", "")
        if name:
            symbols_data[name] = sym
    
    mapping = adapter_output.get("mapping", {})
    mapped_specs: Dict[str, SymbolSpec] = {}
    
    # Duyệt qua từng sản phẩm mục tiêu của Lucky
    for target, config in TARGET_SYMBOLS.items():
        keywords = [kw.upper() for kw in config["keywords"]]
        best_match = None
        best_symbol_name = ""
        
        # Ưu tiên kiểm tra mapping từ adapter trước
        if target in mapping:
            mapped_name = mapping[target]
            if mapped_name in symbols_data:
                best_match = symbols_data[mapped_name]
                best_symbol_name = mapped_name
        
        # Nếu chưa tìm được, tìm theo keywords
        if best_match is None:
            for sym_name, sym_info in symbols_data.items():
                sym_name_upper = sym_name.upper()
                for kw in keywords:
                    if kw in sym_name_upper:
                        if best_match is None or len(sym_name) < len(best_symbol_name):
                            best_match = sym_info
                            best_symbol_name = sym_name
                        break
                    
        if best_match:
            warnings = []
            trade_mode = best_match.get("trade_mode", 0)
            if trade_mode in (0, 1):
                warnings.append(f"Chế độ giao dịch bị hạn chế (trade_mode={trade_mode}). Có thể không thể vào lệnh.")
                
            spec = SymbolSpec(
                target=target,
                broker_symbol=best_symbol_name,
                description=best_match.get("description", ""),
                digits=best_match.get("digits", 0),
                spread=best_match.get("spread", 0),
                contract_size=Decimal(str(best_match.get("trade_contract_size", best_match.get("contract_size", 0.0)))),
                volume_min=Decimal(str(best_match.get("volume_min", 0.0))),
                volume_max=Decimal(str(best_match.get("volume_max", 0.0))),
                volume_step=Decimal(str(best_match.get("volume_step", 0.0))),
                tick_size=Decimal(str(best_match.get("trade_tick_size", best_match.get("tick_size", 0.0)))),
                tick_value=Decimal(str(best_match.get("trade_tick_value", best_match.get("tick_value", 0.0)))),
                currency_profit=best_match.get("currency_profit", ""),
                trade_mode=trade_mode,
                stops_level=best_match.get("trade_stops_level", best_match.get("stops_level", 0)),
                available=True,
                warnings=warnings
            )
            mapped_specs[target] = spec
        else:
            mapped_specs[target] = SymbolSpec(
                target=target,
                broker_symbol="",
                description="Không tìm thấy mã trên broker",
                digits=0,
                spread=0,
                contract_size=Decimal("0"),
                volume_min=Decimal("0"),
                volume_max=Decimal("0"),
                volume_step=Decimal("0"),
                tick_size=Decimal("0"),
                tick_value=Decimal("0"),
                currency_profit="",
                trade_mode=0,
                stops_level=0,
                available=False,
                warnings=["Symbol không có sẵn trên broker."]
            )
            
    return mapped_specs

def validate_specs(specs: Dict[str, SymbolSpec]) -> List[str]:
    """
    Kiểm tra tính hợp lệ của tất cả các thông số kỹ thuật (specs) và trả về danh sách các vấn đề (issues).
    
    Args:
        specs: Dictionary ánh xạ target sang SymbolSpec.
        
    Returns:
        List[str]: Danh sách các cảnh báo và lỗi.
    """
    issues = []
    
    for target, spec in specs.items():
        if not spec.available:
            issues.append(f"[{target}] Không khả dụng: {spec.warnings[0]}")
            continue
            
        # Kiểm tra USDJPY currency_profit
        if target == 'USDJPY' and spec.currency_profit != 'USD':
            issues.append(f"[{target}] Cảnh báo: Lợi nhuận được tính bằng {spec.currency_profit}, cần chuyển đổi sang USD.")
            spec.warnings.append("Lợi nhuận không phải USD, cần chuyển đổi.")
            
        # Kiểm tra WTI
        if target == 'WTI':
            issues.append(f"[{target}] Cảnh báo: Cần chú ý vấn đề đáo hạn (rollover) đối với hợp đồng Dầu CFD.")
            spec.warnings.append("Lưu ý hợp đồng đáo hạn / phí qua đêm.")
            
        # Kiểm tra contract_size
        if spec.contract_size <= 0:
            issues.append(f"[{target}] Lỗi: Kích thước hợp đồng (contract_size) không hợp lệ ({spec.contract_size}).")
            spec.available = False
            
        # Kiểm tra volume_step
        if spec.volume_step <= 0:
            issues.append(f"[{target}] Lỗi: Bước nhảy khối lượng (volume_step) không hợp lệ ({spec.volume_step}).")
            spec.available = False
            
        # Kiểm tra stops_level
        if spec.stops_level > 500: # Ví dụ lớn hơn 500 points thì cảnh báo
            issues.append(f"[{target}] Cảnh báo: Mức dừng lỗ/chốt lời tối thiểu (stops_level) khá lớn: {spec.stops_level} points.")
            spec.warnings.append("stops_level lớn, có thể gây khó khăn khi đặt SL/TP ngắn.")

    return issues

def run_discovery() -> Dict[str, SymbolSpec]:
    """
    Chạy quá trình tìm kiếm và khám phá toàn bộ: gọi mt5_adapter, xử lý và trả về kết quả.
    
    Returns:
        Dict[str, SymbolSpec]: Kết quả ánh xạ thông số kỹ thuật của 6 mã mục tiêu.
    """
    adapter_path = Path(__file__).parent / "mt5_adapter.py"
    # Giả sử mt5_adapter.py nằm cùng thư mục hoặc chỉnh sửa đường dẫn cho phù hợp.
    
    print("Đang gọi mt5_adapter.py để lấy danh sách symbols...")
    try:
        # Danh sách symbols cần tìm trên broker
        search_symbols = []
        for target, config in TARGET_SYMBOLS.items():
            search_symbols.extend(config['keywords'])
        # Loại bỏ trùng lặp, giữ thứ tự
        seen = set()
        unique_symbols = []
        for s in search_symbols:
            if s not in seen:
                seen.add(s)
                unique_symbols.append(s)
        
        # Chạy mt5_adapter như một tiến trình con
        result = subprocess.run(
            [sys.executable, str(adapter_path), "read_symbols", "--symbols"] + unique_symbols,
            capture_output=True,
            text=True,
            timeout=20
        )
        
        # Output có thể chứa log, ta cần tìm dòng JSON hợp lệ
        output_lines = result.stdout.strip().split('\n')
        json_output = None
        for line in reversed(output_lines):
            try:
                json_output = json.loads(line.strip())
                break
            except json.JSONDecodeError:
                continue
                
        if json_output is None:
            raise ValueError("Không tìm thấy kết quả JSON hợp lệ từ mt5_adapter.")
            
        print("Đã lấy được dữ liệu symbols. Đang xử lý và ánh xạ...")
        specs = discover(json_output)
        
        print("Đang kiểm tra tính hợp lệ (validate_specs)...")
        issues = validate_specs(specs)
        for issue in issues:
            print(f" - {issue}")
            
        return specs
        
    except subprocess.CalledProcessError as e:
        print(f"Lỗi khi chạy mt5_adapter: {e.stderr}", file=sys.stderr)
        raise RuntimeError(f"Giao tiếp với MT5 adapter thất bại: {e}")
    except Exception as e:
        print(f"Lỗi không xác định: {e}", file=sys.stderr)
        raise

if __name__ == "__main__":
    try:
        results = run_discovery()
        print("\n" + "="*50)
        print("KẾT QUẢ KHÁM PHÁ SYMBOLS MỤC TIÊU")
        print("="*50)
        for target, spec in results.items():
            print(f"\nMục tiêu: {target} ({TARGET_SYMBOLS[target]['label']})")
            if not spec.available:
                print("  => KHÔNG KHẢ DỤNG TRÊN BROKER!")
                for w in spec.warnings:
                    print(f"     * {w}")
            else:
                print(f"  Mã Broker: {spec.broker_symbol}")
                print(f"  Mô tả: {spec.description}")
                print(f"  Contract Size: {spec.contract_size}")
                print(f"  Lot Step: {spec.volume_step} | Min Lot: {spec.volume_min}")
                print(f"  Tick Size: {spec.tick_size} | Tick Value: {spec.tick_value} {spec.currency_profit}")
                print(f"  Spread: {spec.spread} points | Stops Level: {spec.stops_level} points")
                if spec.warnings:
                    print("  Cảnh báo:")
                    for w in spec.warnings:
                        print(f"     * {w}")
        print("\n" + "="*50)
    except Exception as e:
        print(f"Khám phá thất bại: {e}")
        sys.exit(1)
