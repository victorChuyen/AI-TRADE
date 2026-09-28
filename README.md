# Lucky Trade — giai đoạn nghiên cứu và đặc tả

Ứng dụng AI hỗ trợ giao dịch cá nhân cho Victor, dự kiến kết nối broker qua terminal MT4/MT5, có demo/live và tự động/bán tự động.

**Chưa có ứng dụng hoàn chỉnh để sử dụng.** Các file `app/` là khung thử nghiệm viết trước khi thống nhất yêu cầu, chưa kiểm thử, chưa có frontend, chưa kết nối tài khoản broker. Không chạy hoặc coi `start.ps1` là bản bàn giao hoạt động.

## Tài liệu hiện hành

- [Bản làm việc Lucky từ ZIP và kết quả kiểm thử](lucky-workbench/MIGRATION.md). Giữ nguyên ZIP và thư mục OPC gốc; chưa dùng để giao dịch.
- [Đánh giá app OPC Trade Lab V1 trên AI Studio](research/OPC-APP-REVIEW.md): hướng giữ UI, thay lõi giao dịch và bằng chứng code.
- Plan đã được Victor duyệt ngày 2026-09-27; hiện đang ở bước thẩm định, chưa mở giao dịch.
- [Audit mã nguồn vòng 1](research/AUDIT-REPORT.md): commit cố định, lỗi tái hiện offline và giới hạn bằng chứng.
- [Plan và bằng chứng nghiên cứu](PLAN.md): yêu cầu đã chốt, câu hỏi còn mở, broker, chiến lược, roadmap và ranh giới bằng chứng.
- [Phân tích video giao diện](reference/VIDEO-ANALYSIS.md): quan sát mẫu và đề xuất bố cục.
- [Khung hình video tham khảo](reference/contact-sheet.jpg).

## Quy tắc dự án theo Victor

1. Lập plan/outline trước khi triển khai.
2. Kiểm chứng từ nguồn chính chủ, mã nguồn và hồ sơ giao dịch; không suy diễn thông tin còn thiếu.
3. Những điểm chưa rõ phải được xác nhận và thống nhất trước khi thực hiện phần phụ thuộc.
4. Học hỏi hệ thống có kết quả xác thực; tách việc code tồn tại, kiểm thử kỹ thuật, demo broker và lợi nhuận tài khoản thật.
5. Không gọi một hệ thống là top theo hiệu quả nếu chỉ có lượt theo dõi, stars, lời quảng cáo hoặc backtest.

Raw web research được lưu cục bộ trong `.firecrawl/` và không đưa vào Git. `.env.example` chỉ là mẫu cho prototype cũ; không chứa khóa thật.
