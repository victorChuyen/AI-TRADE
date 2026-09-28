# BỘ QUY TẮC BẤT KHẢ XÂM PHẠM (NON-NEGOTIABLE HARD RULES)

> **Mục tiêu:** Bảo vệ tài khoản tuyệt đối. Không vi phạm bất kỳ quy định nào của FTMO. Xây dựng tư duy nhà đầu tư dài hạn.

## 1. DỪNG LỖ BẮT BUỘC (IMMUTABLE STOP LOSS)
* **Quy tắc 1:** 100% lệnh giao dịch PHẢI có Stop Loss ngay thời điểm mở lệnh.
* **Quy tắc 2:** TUYỆT ĐỐI KHÔNG dời Stop Loss ra xa điểm entry khi giá đi ngược chiều.
* **Quy tắc 3:** TUYỆT ĐỐI KHÔNG tháo Stop Loss với bất kỳ lý do nào ("hy vọng giá quay đầu", "tin tức nhiễu"). Nếu chạm SL = Chấp nhận thua trong kiểm soát.

## 2. GIỚI HẠN RỦI RO TIỀN MẶT
* **Rủi ro mỗi lệnh:** Tối đa 0.35% - 0.50% vốn khởi tạo ($35 - $50 trên tài khoản $10,000).
* **Khóa ngày nội bộ (Internal Daily Hard Stop):** Nếu sụt giảm trong ngày chạm **1.2%** ($120), hệ thống TỰ ĐỘNG KHÓA MỞ LỆNH đến 00:00 giờ Prague ngày hôm sau. Không chạm tới giới hạn 3.0% của FTMO.
* **Sàn Trailing Drawdown:** Luôn giữ Headroom > $150. Nếu khoảng cách tới sàn $\le $150, giảm 50% khối lượng lệnh tiếp theo. Nếu Headroom $\le $50, dừng toàn bộ lệnh mới.

## 3. TRIỆT TIÊU TÂM LÝ & REVENGE TRADING
* **Giới hạn số lệnh:** Tối đa 5 lệnh mới trong một ngày giao dịch.
* **Chuỗi thua (Consecutive Losses):** Nếu thua 3 lệnh liên tiếp trong ngày $\to$ DỪNG GIAO DỊCH NGAY LẬP TỨC. Tắt máy, không nhìn biểu đồ.
* **Quy tắc Best Day:** Lợi nhuận của một ngày tốt nhất không được vượt quá 50% tổng lợi nhuận mục tiêu. Không bao giờ all-in để ăn đậm 1 ngày.
