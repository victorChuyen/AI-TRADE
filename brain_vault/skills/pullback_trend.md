# KỸ NĂNG: BẮT ĐIỂM HỒI THEO XU HƯỚNG (PULLBACK TREND CONTINUATION)

> **Mã kỹ năng:** `SKILL_PULLBACK_01`  
> **Khung thời gian:** M15 (Primary), H1 (Trend Anchor)  
> **Sản phẩm ưu tiên:** XAUUSD, EURUSD, GBPUSD, USDJPY, BTCUSD  

## 1. Bản Chất Chiến Lược
Giao dịch theo xu hướng chủ đạo là cách an toàn nhất để tích lũy lợi nhuận bền vững. Không mua ở đỉnh, không bán ở đáy. Chờ đợi giá hồi về vùng giá trị hợp lý (Value Zone) rồi mới kích hoạt lệnh theo chiều xu hướng.

## 2. Điều Kiện Kích Hoạt Lệnh MUA (BUY)
1. **Xu hướng lớn:** Đường SMA 9 nằm trên đường SMA 21, cả 2 đường cùng dốc lên.
2. **Điểm hồi:** Giá nến hồi về chạm hoặc tiếp cận đường SMA 21 mà không đâm thủng sâu.
3. **Nến tín hiệu xác nhận:** Xuất hiện nến rút chân tăng (Pinbar tăng hoặc nến xanh có đuôi dưới dài), giá đóng cửa nằm trên SMA 9.
4. **Biên độ ATR:** ATR(14) đang ở mức trung bình hoặc co cụm (không biến động cực đoan trước tin).
5. **Cắt lỗ (SL):** Đặt dưới đáy nến hồi gần nhất ít nhất 1.5 x ATR hoặc tối thiểu 10 - 15 pips.
6. **Chốt lời (TP):** Tối thiểu tỷ lệ R:R = 1:1.5 hoặc 1:2.0 so với SL.

## 3. Điều Kiện Kích Hoạt Lệnh BÁN (SELL)
1. **Xu hướng lớn:** SMA 9 nằm dưới SMA 21, cả 2 cùng dốc xuống.
2. **Điểm hồi:** Giá bật ngược lên chạm vùng kháng cự SMA 21.
3. **Nến tín hiệu xác nhận:** Nến từ chối giảm (Pinbar giảm hoặc nến đỏ nhấn chìm).
4. **Cắt lỗ (SL):** Đặt trên đỉnh nến hồi gần nhất 1.5 x ATR.
5. **Chốt lời (TP):** Tỷ lệ R:R tối thiểu 1:1.5.

## 4. Trường Hợp BỎ QUA (SKIP)
* Spread đang giãn lớn hơn 2.5 pips.
* Có tin tức đỏ (High Impact) trong vòng 15 phút tới.
* Thị trường đi ngang biên độ hẹp (Choppy / Ranging Market), SMA 9 và SMA 21 quấn chặt lấy nhau.
