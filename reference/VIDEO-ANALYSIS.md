# Phân tích mẫu giao diện cho Lucky

Nguồn: `D:\TRADE-AI\Video-Demo-AI Trade.mp4`. Video dài 58.37 giây, 720 × 744, 30 fps. Đã xem contact sheet và khung hình tại giây 30, 55. Đây là phân tích hình ảnh, chưa phiên âm hoặc đánh giá nội dung âm thanh.

## Những gì quan sát được

- Thanh trạng thái trên cùng: tên Gravia, BTC, POLYMARKET, LIVE, giá, số giao dịch, win rate và đồng hồ.
- Hàng trên: thẻ tài khoản bên trái; biểu đồ nến và bảng giá dạng order book giữa; thẻ trader/streak bên phải.
- Vùng giữa chiếm diện tích lớn: mạng nút và liên kết chuyển động; nhãn như BULL, BEAR, RESIST, ETF, LONG, CPI. Màu xanh/magenta thể hiện hai nhóm; các nút phát sáng.
- Hàng dưới: đường P/L, giao dịch gần đây, biểu đồ nhỏ theo nhóm.
- Đáy màn hình: execution log có thời gian và sự kiện.
- Chất liệu thị giác: nền đen pha tím, đường viền magenta, chữ monospace nhỏ, mật độ thông tin cao, màu teal cho số dương, màu hồng cho phía bán.
- Khung hình 30 và 55 giây có chữ SIMULATED trong vùng biểu đồ. Có các chỉ số 100% win rate và số dư tăng rất mạnh. Không có bằng chứng đối soát broker, backtest độc lập hay lịch sử tài khoản xác thực trong các khung hình đã xem.

## Điểm dùng được cho sản phẩm

1. Một màn hình tập hợp giá, trạng thái chiến lược và thực thi giúp người dùng hiểu hệ thống đang làm gì.
2. Nhật ký luôn nhìn thấy giúp điều tra một lệnh đã được mở/đóng hoặc bị chặn vì sao.
3. Mạng tín hiệu là điểm nhận diện tốt nếu mỗi nút có ý nghĩa cụ thể, trạng thái và dữ liệu có thể mở xem.
4. Dùng magenta/teal nhất quán cho sell/buy; phân biệt mô phỏng với broker bằng nhãn văn bản cố định.

## Những điều cần thay đổi cho Lucky MT4/MT5

- Mẫu thể hiện BTC/Polymarket; không thể suy ra đây là MT4/MT5 hoặc thuật toán áp dụng được cho Forex/CFD.
- Không tái tạo các số dư/win rate/streak trong video. Tài khoản Lucky bắt đầu không có lệnh; chỉ số được tính từ giao dịch giấy của người dùng.
- Tăng cỡ chữ và khoảng cách; chỉ giữ 6 nút tín hiệu có chức năng: dữ liệu, xu hướng, biến động, kế hoạch, rủi ro và thực thi. Không vẽ hàng trăm nút giả như thể là phân tích AI thật.
- Phiếu lệnh cần hiện entry, stop loss, take profit, lot, phí và rủi ro theo tiền trước khi đặt lệnh giấy.
- Thay thứ hạng trader bằng Risk Desk và Lucky Analyst. Nút tạm dừng và trạng thái nguồn dữ liệu phải dễ thấy.
- Kết nối MT5 thật xuất hiện ở màn riêng chỉ đọc. Giá MT5 không trộn với mô phỏng. MT4 hiển thị chưa tích hợp cho tới khi có bridge thực sự.

## Quyết định thiết kế

Palette: nền #100d16, panel #191420, viền #34263e, magenta #e559bf, teal #53d9b3, chữ #f1eaf3. Typography: Segoe UI cho giao diện tiếng Việt, Cascadia Code/Consolas cho giá và log. Bố cục: sidebar gọn, trạng thái toàn chiều ngang, biểu đồ lớn + phiếu lệnh, mạng quyết định nằm dưới biểu đồ, vị thế/nhật ký ở hàng dưới. Mobile xếp một cột, table cuộn ngang. Chuyển động chỉ phục vụ thay đổi dữ liệu hoặc phản hồi thao tác; tôn trọng reduced-motion.

Review: giữ chất terminal của mẫu, bỏ leaderboard, thanh ticker dày và chữ li ti để ưu tiên thao tác. Mạng tín hiệu phải có drilldown thay vì trang trí. Các nút Buy/Sell và giá không dùng màu đơn độc để diễn đạt ý nghĩa.

## Phạm vi bản đầu

Paper broker lưu SQLite; replay M15 bằng nến tổng hợp; rule analyst SMA/ATR có nhãn rõ; AI cloud tùy chọn cấu hình server; MT5 chỉ đọc, cần package và terminal thật; chưa có MT4 bridge, backtest, hoặc giao dịch tiền thật.
