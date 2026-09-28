# KỸ NĂNG: KIỂM SOÁT TÂM LÝ & CHỐNG FOMO (ANTI-FOMO & PSYCHOLOGY DISCIPLINE)

> **Mã kỹ năng:** `SKILL_PSYCHOLOGY_04`  
> **Nguyên tắc:** Kỷ luật thép — Trực giác giao dịch của Victor kết hợp sự lạnh lùng của Thuật toán  

## 1. Các Bẫy Tâm Lý Khiến Trader Thất Bại (Bài Học Của Victor)
1. **Lòng tham & Muốn làm giàu quá nhanh:**
   - Dấu hiệu: Tăng khối lượng lot đột ngột sau khi thắng vài lệnh liên tiếp; cố gắng ăn 10% trong 1-2 ngày.
   - Hậu quả: Dính 1 cú giật ngược là cháy tài khoản hoặc vi phạm quy tắc Best Day của FTMO.
   - **Cách bot xử lý:** Cố định khối lượng theo % rủi ro (0.35% - 0.50%). Bot từ chối bất kỳ lệnh nào vượt quá kích thước lot an toàn.

2. **Tiếc nuối & Sợ mất cơ hội (FOMO - Fear Of Missing Out):**
   - Dấu hiệu: Thấy một cây nến xanh dựng đứng vội vàng nhảy vào mua đuổi ở đỉnh (Chasing the price).
   - Hậu quả: Mua đúng đỉnh, giá quay đầu hồi phục hit ngay SL.
   - **Cách bot xử lý:** Quy tắc bắt buộc chỉ vào lệnh khi có hồi về Value Zone (Pullback) hoặc phá vỡ có xác nhận đóng nến.

3. **Cay cú trả thù thị trường (Revenge Trading):**
   - Dấu hiệu: Vừa bị cắn Stop Loss, lập tức mở thêm lệnh ngược chiều hoặc lệnh gấp đôi để "gỡ gạc".
   - Hậu quả: Mất bình tĩnh, vào lệnh bừa bãi và chạm sàn lỗ ngày.
   - **Cách bot xử lý:** Quy tắc chuỗi thua (3 lệnh thua liên tiếp = Khóa máy 24 giờ). Không có bất kỳ lệnh nào được gửi trong thời gian cooldown.

4. **Ảo tưởng hy vọng (Hopium - Tháo/Dời Stop Loss):**
   - Dấu hiệu: Giá sắp chạm SL, trader kéo SL ra xa hơn với suy nghĩ "chắc nó sẽ quay đầu thôi".
   - Hậu quả: Khoản lỗ nhỏ biến thành khoản lỗ khổng lồ, vi phạm Daily Max Loss.
   - **Cách bot xử lý:** Stop Loss được mã hóa cứng, không có API cho phép dời SL ra xa.
