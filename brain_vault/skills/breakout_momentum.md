# KỸ NĂNG: BẮT PHÁ VỠ HỘP TÍCH LŨY KÈM ĐỘNG LƯỢNG (BREAKOUT MOMENTUM)

> **Mã kỹ năng:** `SKILL_BREAKOUT_02`  
> **Khung thời gian:** M15  
> **Sản phẩm ưu tiên:** XAUUSD, BTCUSD, WTI  

## 1. Bản Chất Chiến Lược
Khi thị trường tích lũy nén chặt trong một biên độ (Donchian / Bollinger Squeeze), năng lượng tích tụ sẽ bung ra theo một hướng với xung lực rất mạnh. Vào lệnh khi cây nến phá vỡ đóng cửa dứt khoát ngoài vùng tích lũy.

## 2. Điều Kiện Kích Hoạt Lệnh MUA (BUY)
1. **Vùng tích lũy:** Giá dao động tối thiểu 10-20 nến trước đó trong biên độ hẹp (ATR giảm dần).
2. **Nến Breakout:** Một cây nến xanh thân dài, đóng cửa vượt hoàn toàn đỉnh cao nhất của 20 nến trước đó (High 20).
3. **Khối lượng / Động lượng:** Thân nến chiếm ít nhất 70% toàn bộ chiều dài nến (không có bóng nến trên dài).
4. **Cắt lỗ (SL):** Đặt ngay dưới đường trung tâm của vùng tích lũy hoặc dưới đáy cây nến breakout.
5. **Chốt lời (TP):** Theo tỷ lệ R:R = 1:2.0 hoặc trailing stop theo đáy nến trước.

## 3. Điều Kiện Kích Hoạt Lệnh BÁN (SELL)
1. **Nến Breakout:** Nến đỏ thân dài đóng cửa dưới hoàn toàn đáy thấp nhất 20 nến trước (Low 20).
2. **Cắt lỗ (SL):** Đặt trên đỉnh nến breakout hoặc trên đường giữa vùng tích lũy.
3. **Chốt lời (TP):** R:R $\ge$ 1:2.0.

## 4. Trường Hợp BỎ QUA (SKIP)
* Cây nến phá vỡ quá dài bất thường (> 3 x ATR): Dễ bị kiệt sức (Climax run) và hồi ngược lại.
* Nến đóng cửa tạo râu dài (False Breakout / Fakeout).
