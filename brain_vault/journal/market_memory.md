# NHẬT KÝ THỊ TRƯỜNG & KINH NGHIỆM TIẾN HÓA (MARKET MEMORY & EVOLVING JOURNAL)

> **Mục đích:** Bộ nhớ sống của Lucky Trade AI. Ghi nhận các bài học thực chiến, điều chỉnh thích nghi với hành vi thị trường mới nhất.

## Nhật Ký Ngày 27/09/2026
* **Bối cảnh:** Vàng (XAUUSD) biến động mạnh quanh vùng 2650, spread trên Exness có thời điểm giãn từ 1.2 pts lên 3.5 pts vào đầu phiên Mỹ.
* **Bài học rút ra:**
  - Với XAUUSD, tuyệt đối không mở lệnh nếu spread > 2.5 pts.
  - Sau cây nến M15 tăng dài đột biến, luôn có xác suất 65% xuất hiện 1-2 nến hồi về test lại đỉnh cũ. Chờ đợi nhịp hồi này giúp giảm rủi ro SL xuống 40%.
* **Điều chỉnh kỹ năng:** Bổ sung tham số lọc `max_spread` nghiêm ngặt hơn cho XAUUSD trong giờ giao phiên.

## Nhật Ký Ngày 28/09/2026
* **Bối cảnh:** Khởi chạy cấu hình FTMO 1-Step trên MT5 Real.
* **Mục tiêu:** Tập trung vào chất lượng lệnh, chỉ nhận các setup đạt điểm tin cậy $\ge 75\%$ từ Bộ Não Obsidian.
