from decimal import Decimal, ROUND_DOWN
from typing import Dict, List, Optional, Any
import logging

logger = logging.getLogger(__name__)

class PositionSizer:
    """
    Trình quản lý quy mô vị thế cho hệ thống Lucky Trade.
    Tính toán chính xác khối lượng giao dịch (lot size) dựa trên mức rủi ro, 
    quy mô tài khoản và các thông số hợp đồng.
    """

    def calculate_lot_size(
        self,
        equity: Decimal,
        risk_pct: Decimal,
        entry: Decimal,
        sl: Decimal,
        tick_value: Decimal,
        tick_size: Decimal,
        contract_size: Decimal,
        min_lot: Decimal,
        max_lot: Decimal,
        lot_step: Decimal
    ) -> Decimal:
        """
        Tính toán kích thước lot an toàn dựa trên công thức rủi ro điểm chuẩn.
        
        Args:
            equity: Vốn chủ sở hữu hiện tại (Balance hoặc Equity)
            risk_pct: Phần trăm rủi ro trên mỗi lệnh (ví dụ 1.0 cho 1%)
            entry: Giá vào lệnh dự kiến
            sl: Giá dừng lỗ (Stop Loss)
            tick_value: Giá trị của một tick (tick value trong tiền tệ tài khoản)
            tick_size: Kích thước của một tick (ví dụ 0.00001)
            contract_size: Kích thước hợp đồng (Contract size)
            min_lot: Khối lượng tối thiểu cho phép
            max_lot: Khối lượng tối đa cho phép
            lot_step: Bước nhảy khối lượng
            
        Returns:
            Decimal: Kích thước lot đã được làm tròn và điều chỉnh
        """
        if entry == sl:
            logger.warning("Giá entry bằng sl, không thể tính toán khối lượng.")
            return Decimal("0")
            
        if tick_size <= Decimal("0") or tick_value <= Decimal("0"):
            logger.warning("tick_size hoặc tick_value không hợp lệ.")
            return Decimal("0")

        # Rủi ro tính bằng tiền: risk_amount = equity * (risk_pct / 100)
        risk_amount = equity * (risk_pct / Decimal("100"))
        
        # Số point chịu rủi ro: points_at_risk = abs(entry - sl) / tick_size
        points_at_risk = abs(entry - sl) / tick_size
        
        if points_at_risk == Decimal("0"):
            return Decimal("0")
            
        # lot_size = risk_amount / (points_at_risk * tick_value)
        raw_lot_size = risk_amount / (points_at_risk * tick_value)
        
        # Làm tròn xuống theo lot_step để không vượt quá mức rủi ro cho phép
        lot_steps = raw_lot_size / lot_step
        rounded_lot = lot_steps.quantize(Decimal("1"), rounding=ROUND_DOWN) * lot_step
        
        # Kiểm tra ngưỡng giới hạn
        if rounded_lot < min_lot:
            logger.info(f"Khối lượng tính toán ({rounded_lot}) nhỏ hơn min_lot ({min_lot}). Bỏ qua lệnh.")
            return Decimal("0")
            
        if rounded_lot > max_lot:
            logger.info(f"Khối lượng tính toán vượt quá max_lot. Giới hạn lại ở mức {max_lot}.")
            rounded_lot = max_lot
            
        return rounded_lot


class RiskGate:
    """
    Cổng kiểm soát rủi ro, xác thực tất cả các lệnh giao dịch được đề xuất
    trước khi chúng thực sự được gửi vào thị trường.
    """
    
    def __init__(
        self,
        max_daily_drawdown_pct: Decimal,
        max_open_positions: int,
        max_spread: Decimal,
        max_correlation_positions: int = 1
    ):
        """
        Khởi tạo cổng kiểm soát rủi ro.
        
        Args:
            max_daily_drawdown_pct: Mức sụt giảm tối đa cho phép trong ngày (%)
            max_open_positions: Số lượng vị thế mở tối đa cùng một thời điểm
            max_spread: Khoảng cách giá Mua/Bán tối đa để cho phép vào lệnh
            max_correlation_positions: Giới hạn số lượng lệnh cùng chiều trên cùng một cặp giao dịch
        """
        self.max_daily_drawdown_pct = max_daily_drawdown_pct
        self.max_open_positions = max_open_positions
        self.max_spread = max_spread
        self.max_correlation_positions = max_correlation_positions
        
    def validate_order(
        self,
        symbol: str,
        direction: str,
        spread: Decimal,
        daily_drawdown_pct: Decimal,
        current_open_positions: int,
        margin_requirement: Decimal,
        free_margin: Decimal,
        strategy_name: str,
        active_trades: List[Dict[str, Any]]
    ) -> bool:
        """
        Kiểm tra tính hợp lệ của lệnh giao dịch dựa trên các bộ quy tắc.
        
        Args:
            symbol: Tên cặp giao dịch (VD: EURUSD)
            direction: Hướng giao dịch ('BUY' hoặc 'SELL')
            spread: Mức spread hiện tại
            daily_drawdown_pct: Mức sụt giảm trong ngày hiện tại (%)
            current_open_positions: Số lượng lệnh đang mở
            margin_requirement: Tiền ký quỹ yêu cầu cho lệnh này
            free_margin: Số dư ký quỹ khả dụng
            strategy_name: Tên của chiến lược yêu cầu lệnh
            active_trades: Danh sách chi tiết các lệnh đang mở trên thị trường
            
        Returns:
            bool: True nếu lệnh vượt qua mọi bộ lọc rủi ro, False nếu vi phạm.
        """
        # Kiểm tra sụt giảm trong ngày
        if daily_drawdown_pct >= self.max_daily_drawdown_pct:
            logger.warning(f"Từ chối lệnh: Sụt giảm trong ngày {daily_drawdown_pct}% đã chạm hoặc vượt giới hạn {self.max_daily_drawdown_pct}%")
            return False
            
        # Kiểm tra số lượng vị thế tối đa
        if current_open_positions >= self.max_open_positions:
            logger.warning(f"Từ chối lệnh: Số lệnh mở {current_open_positions} đã đạt giới hạn {self.max_open_positions}")
            return False
            
        # Kiểm tra chênh lệch Spread
        if spread > self.max_spread:
            logger.warning(f"Từ chối lệnh: Spread {spread} lớn hơn mức cho phép {self.max_spread}")
            return False
            
        # Kiểm tra mức ký quỹ (Margin)
        if margin_requirement > free_margin:
            logger.warning(f"Từ chối lệnh: Tiền ký quỹ yêu cầu ({margin_requirement}) lớn hơn Free Margin hiện có ({free_margin})")
            return False
            
        # Kiểm tra tương quan và chống trùng lặp vị thế (ví dụ nhiều chiến lược cùng đánh 1 cặp)
        correlated_count = 0
        for trade in active_trades:
            if trade.get("symbol") == symbol and trade.get("direction") == direction:
                correlated_count += 1
                
        if correlated_count >= self.max_correlation_positions:
            logger.warning(f"Từ chối lệnh: Quá nhiều vị thế cùng hướng trên cặp {symbol} ({correlated_count} lệnh)")
            return False
            
        logger.info(f"Lệnh cho {symbol} từ {strategy_name} đã vượt qua hệ thống kiểm duyệt rủi ro.")
        return True
