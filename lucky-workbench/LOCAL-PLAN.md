# Lucky local: mốc chạy được và kiểm tra trên trình duyệt

Phạm vi 2026-09-27: giữ React/Vite, thư viện chart/icon, phong cách và cấu trúc dashboard OPC. Tách entry Lucky khỏi App.tsx cũ vì nhiều component tự sinh trạng thái tài khoản giả; giữ source gốc để tham khảo, không load trong bản chạy mới.

1. API local an toàn, sáu mã chuẩn chưa ánh xạ symbol broker; không gọi sàn khi khởi động.
2. Dashboard dữ liệu synthetic có provenance rõ; không hiện tiền, lệnh hay thắng thua giả. Ba phương pháp chỉ phân tích tín hiệu của fixture, không phải backtest hiệu quả.
3. Kiểm tra terminal MT5 chỉ đọc, lỗi/missing SDK hiển thị đúng; MT4 báo adapter chưa triển khai. Không nhận mật khẩu hoặc API key trên browser.
4. Nhật ký local, xuất báo cáo nghiên cứu; khóa mọi broker execution. Hai chế độ giao dịch là phạm vi tương lai, chưa cho mở khóa.
5. Test unit/API, build, browser desktop/mobile, lưu bằng chứng. Dừng ở blocker thật của terminal thay vì tạo kết nối giả.
6. Tài liệu GitHub là nguồn chuẩn, AI Studio sandbox, Cloudflare frontend; chưa công bố lên domain chưa được xác định.

Thiết kế: kế thừa nền navy #090d16, panel #101927, viền #26354b, cyan #22d3ee, amber #fbbf24, chữ #e6edf7. Segoe UI cho nhãn Việt; Cascadia Mono cho số. Watchlist bên trái, chart/nghiên cứu ở giữa, chốt an toàn bên phải, journal bên dưới; thu một cột trên mobile. Không dùng hero marketing hoặc số lợi nhuận trang trí. Tăng cỡ chữ, cho zoom, tách nhãn nguồn của từng panel.
