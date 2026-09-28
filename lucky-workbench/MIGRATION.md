# Lucky — bản làm việc riêng từ OPC Trade Lab V1

Nguồn: `../opc-trade-lab-v1.zip`, SHA256 `602803E0229CB831E8E9375605F40A3C79897357702E9957DA65E80A638FCE84`.
Ngày tiếp nhận: 2026-09-27. Không sửa ZIP, thư mục gốc `opc-trade-lab-v1` hoặc app AI Studio.

## Outline triển khai

1. Baseline: đọc mã, chạy test offline và build/typecheck; sửa lỗi nền tảng có bằng chứng.
2. Chặn endpoint xác thực/kết nối giả và mọi execution trước khi có adapter thật.
3. Giữ component UI phù hợp; tách synthetic/paper, broker demo và broker live; danh mục sáu sản phẩm theo PLAN ở thư mục cha.
4. Adapter terminal chỉ đọc; sau đó đặc tả/risk gate và demo order theo cấu hình được Victor xác nhận.
5. Đối soát broker; live là nghiệm thu riêng, không suy từ build/test thành công.

## Baseline ban đầu

- Python 3.11: 31 tests, 28 đạt và 3 lỗi cleanup SQLite trên Windows (WinError 32).
- Nguyên nhân: `with sqlite3.Connection` commit/rollback nhưng không đóng handle. Đã thay `get_connection` bằng context manager đóng chắc chắn và sửa caller backup; thêm test close/rollback.
- Backend Python là research/replay nhị phân và SQLite, không phải adapter MT4/MT5. Các test hiện có không chứng minh chiến lược CFD hoặc hiệu quả thực tế.
- Frontend TypeScript có PnL ngẫu nhiên, verify MT giả và dữ liệu mẫu. Chưa được dùng giao dịch.
- ZIP có sẵn SQLite và bytecode. Giữ nguyên làm nguồn tham chiếu; không dùng SQLite đó như dữ liệu tài khoản đã xác minh hoặc chia sẻ công khai.

Chưa có credential broker/AI; không nhập hoặc bật live trong giai đoạn baseline.

## Kết quả sau sửa baseline

- Python: 33/33 test đạt (31 test gốc + 2 test regression lifecycle SQLite).
- `npm install --ignore-scripts --no-audit --no-fund`: thành công sau khi đổi esbuild từ ^0.25.0 sang 0.28.2, khớp peer dependency Vite 8.3.1 đã kiểm tra trực tiếp bằng npm view. `package-lock.json` dùng cho npm; bun.lock là lock nguồn chưa đồng bộ, không dùng bun install cho bản migration.
- `npm run lint`: TypeScript đạt; không bỏ typecheck.
- `npm run test:safety`: 10/10 đạt, gồm test HTTP loopback chứng minh handler verify giả không được chạy sau gate.
- `npm run build`: thành công; cảnh báo bundle JS sau minify khoảng 1.06 MB (gzip ~280 KB) và Vite cảnh báo sử dụng __dirname trong config. Chưa tối ưu bundle, chưa chạy browser E2E bản local.
- Thêm migration gate chặn mọi phương thức ghi `/api`, trả 503/MIGRATION_READ_ONLY; `/api/v1/me` không cấp identity/live permission. Bind server về 127.0.0.1. Không có env flag mở khóa.
- Gate chỉ là lớp cách ly tạm thời, KHÔNG là auth/risk engine hoàn chỉnh. GET legacy vẫn có dữ liệu mẫu; UI cũ vẫn có vòng mô phỏng và nhãn sai chưa sửa. Không bàn giao bản này như app trading sử dụng được.
