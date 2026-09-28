# Lucky — thẩm định mã nguồn, vòng 1

Ngày: 2026-09-27. Plan đã được Victor duyệt. Phạm vi: đọc mã, tài liệu chính chủ và kiểm thử cô lập; KHÔNG kết nối terminal, không gửi lệnh demo/live, không chạy installer/prompt của repo tham khảo.

## Kết luận điều hành

Không chọn nguyên trạng cặp `metatrader-mcp-server + claude-mt5-trader` làm lõi thực thi tiền thật. Đã tái hiện bốn nhóm lỗi ở repo thứ nhất bằng bảy tình huống offline; repo thứ hai còn khoảng trống kết nối, quản trị rủi ro và backtest. EA31337 có thể nghiên cứu cách tổ chức EA/strategy, chưa đủ bằng chứng để chọn cấu hình có lợi nhuận cho sáu sản phẩm của Lucky.

Chưa ứng viên nào trong phạm vi kiểm tra có chuỗi bằng chứng hoàn chỉnh: mã nguồn tại commit cụ thể → tham số triển khai → tài khoản thật được xác thực → lịch sử giao dịch đối soát được. Đây là kết quả của vòng khảo sát này, không phải khẳng định không có hệ thống như vậy trên thị trường.

## 1. Phiên bản đã kiểm tra

| Repo | Commit cố định | Giấy phép / phạm vi | Quyết định vòng 1 |
| --- | --- | --- | --- |
| [ariadng/metatrader-mcp-server](https://github.com/ariadng/metatrader-mcp-server) | `bd2ff591e32cb492fafefe74221d502dd78b71ef` | LICENSE MIT; đã đọc đường gửi lệnh và phân loại tài khoản | Không đưa nguyên trạng vào execution; có thể học cách phân lớp dữ liệu/MCP |
| [DonCoyoteS/claude-mt5-trader](https://github.com/DonCoyoteS/claude-mt5-trader) | `ac22e3325603409208a8f539ef49e682a7aa9a1c` | Không thấy LICENSE trong checkout; chưa xác lập quyền tái sử dụng code | Chỉ tham khảo ý tưởng; không sao chép code khi chưa rõ giấy phép |
| [EA31337/EA31337](https://github.com/EA31337/EA31337) | `9b9bd38c4e49dd6916f4fe3936e50e97fca7a692` | GPL-3.0; kiểm tra repo chính, chưa tải/kiểm thử các submodule | Tham khảo framework, chưa chọn chiến lược hoặc tích hợp |

Các clone nằm ở `research/vendor/`, được loại khỏi Git dự án. Không cài dependency hoặc chạy bộ test upstream vì một số test có thể dùng credential và đặt lệnh thật. Các repo công khai không đồng nghĩa đều được cấp phép tái sử dụng.

## 2. metatrader-mcp-server: lỗi đã tái hiện

Harness: [reproduce_metatrader.py](audit/reproduce_metatrader.py). Kết quả máy đọc: [results.json](audit/results.json). Chạy lại: `python research/audit/reproduce_metatrader.py`.

Harness kiểm tra commit và trạng thái file, trích AST của các định nghĩa đã đọc; dùng enum upstream nhưng thay hoàn toàn MetaTrader5 bằng fake SDK. Không import package upstream hay SDK. Exit code 0 nghĩa là tái hiện được lỗi dự kiến, KHÔNG nghĩa là ứng dụng đạt nghiệm thu.

| Phát hiện | Bằng chứng offline | Tác động thiết kế Lucky |
| --- | --- | --- |
| Sai loại tài khoản | Mode 0 trả real, 1 trả demo, 2 trả contest; kỳ vọng lần lượt demo, contest, real | Không dùng nhãn này để quyết định cho phép live; đối chiếu hằng số SDK và account identity |
| Nhận broker từ chối thành thành công | Fake `order_send` trả retcode 10019, `last_error=(1, Success)`; hàm vẫn trả success=true | Phải kiểm tra response, retcode theo operation, rồi đối soát order/deal/position; gửi request không đồng nghĩa khớp lệnh |
| SL/TP của market order bị so với giá 0 | BUY/SELL có SL/TP đúng phía so với tick mẫu bị từ chối trước khi gọi SDK | Lấy tick và execution mode trước kiểm tra khoảng cách/SLTP; không khắc phục bằng bỏ SL |
| Filling mask 0 gây exception | `selected_filling` chưa được gán → UnboundLocalError | Chọn filling theo execution mode và chính sách broker, fail-closed khi chưa xác định |

Nguồn mã cố định: [account type](https://github.com/ariadng/metatrader-mcp-server/blob/bd2ff591e32cb492fafefe74221d502dd78b71ef/src/metatrader_client/account/get_account_type.py), [send_order](https://github.com/ariadng/metatrader-mcp-server/blob/bd2ff591e32cb492fafefe74221d502dd78b71ef/src/metatrader_client/order/send_order.py). Lỗi account type cũng đã có [issue #24](https://github.com/ariadng/metatrader-mcp-server/issues/24); không coi bình luận có fork sửa lỗi là bản đã được tích hợp.

Đối chiếu chính chủ: [account properties](https://www.mql5.com/en/docs/constants/environment_state/accountinformation), [order_send và kiểm tra retcode](https://www.mql5.com/en/docs/python_metatrader5/mt5ordersend_py), [trade server return codes](https://www.mql5.com/en/docs/constants/errorswarnings/enum_trade_return_codes).

Kiểm đếm AST tại `src/metatrader_mcp/server.py`: **25 hàm đăng ký `@mcp.tool()`**. Chưa chứng minh tuyên bố 80+ tools. Đây là số đăng ký trong file server đang xét, không phải số hàm Python của toàn repo. MCP là lớp gọi công cụ, không tự tạo chiến lược có lợi thế hoặc đảm bảo mọi AI client kết nối được không cần cấu hình.

Các hạn chế thêm từ đọc mã, chưa tái hiện riêng: `magic` không được đưa vào request DEAL; `deviation` DEAL bị cố định 20; validation volume chưa đối chiếu volume_min/max/step. Không xem đây là audit bảo mật toàn diện.

## 3. claude-mt5-trader: phát hiện từ đọc mã

Đây là repo tìm được khớp tên được đề cập; người dùng chưa cung cấp owner nên không khẳng định đó là repo duy nhất có thể được ngụ ý.

1. **Đường truyền tín hiệu không khớp trong bản checkout:** Python `mt5_server.py:31` ghi `signals/pending_signal.json`; EA `ClaudeSignalEA.mq5:37,77,80` đọc `claude_pending_signal.json` trong FILE_COMMON. Chưa thấy cơ chế đồng bộ trong hai file này. Không thể gọi đây là cắm vào là chạy.
2. **Backtest chưa chứa chiến lược:** `backtest.py:64–90`, `detect_signal` chỉ trả None, yêu cầu agent viết lại. Chưa có backtest cụ thể để xác thực hiệu quả; chia 70/30 tự nó không chứng minh lợi thế thật.
3. **Kiểm tra rủi ro có nhánh bỏ qua:** EA chỉ tính risk khi `sl > 0 && tick_val > 0 && tick_size > 0`; ngoài điều kiện đó vẫn đi đến OrderSend. Lucky phải từ chối dữ liệu thiếu và yêu cầu protective stop theo chính sách đã duyệt.
4. **Giới hạn được gọi là daily nhưng baseline chỉ gán ở OnInit:** không có reset theo ngày trong file EA; restart thay baseline. Chưa phù hợp làm chốt giới hạn lỗ ngày bền vững.
5. **Chưa có bằng chứng exactly-once:** EA gửi rồi mới cập nhật file trạng thái; chưa thấy order intent ID bền vững, account binding hay xử lý crash giữa gửi và ghi trạng thái. Đây là rủi ro suy ra từ thứ tự mã, chưa tái hiện trên terminal.
6. **Interface Python là JSON `tool/args` trên stdin:** chưa thấy xử lý initialize/tools/list/tools/call theo MCP chuẩn trong file server được kiểm tra; chưa test với MCP client. Cần adapter hoặc triển khai chuẩn trước khi quảng cáo tương thích MCP.

Điểm đáng học: ALLOW_LIVE mặc định false; EA kiểm tra cả boolean OrderSend và TRADE_RETCODE_DONE. Tuy nhiên chưa xử lý đầy đủ các trạng thái partial/placed và đối soát sau mất kết nối.

Nguồn cố định: [Python bridge](https://github.com/DonCoyoteS/claude-mt5-trader/blob/ac22e3325603409208a8f539ef49e682a7aa9a1c/mt5-bridge/mt5_server.py), [EA](https://github.com/DonCoyoteS/claude-mt5-trader/blob/ac22e3325603409208a8f539ef49e682a7aa9a1c/mt5-bridge/ClaudeSignalEA.mq5), [backtest](https://github.com/DonCoyoteS/claude-mt5-trader/blob/ac22e3325603409208a8f539ef49e682a7aa9a1c/mt5-bridge/backtest.py).

## 4. EA31337: chỉ đạt mức tham khảo framework

README lưu ý tham số mặc định tối ưu EURUSD, thay broker/symbol phải kiểm thử lại. Không ngoại suy sang BTC, vàng, dầu và ba cặp tiền. Preset Rider tại `src/include/common/rider/inputs.mqh:38` tham chiếu STRAT_META_MARTINGALE trên M30; không sao chép preset này vào Lucky. Không kết luận mọi biến thể EA31337 đều chạy martingale.

Các strategy nằm trong submodule; chưa audit thuật toán con hoặc compile EA. Không dùng độ lớn cộng đồng làm bằng chứng lợi nhuận. Nguồn: [README tại commit](https://github.com/EA31337/EA31337/blob/9b9bd38c4e49dd6916f4fe3936e50e97fca7a692/README.md), [preset Rider](https://github.com/EA31337/EA31337/blob/9b9bd38c4e49dd6916f4fe3936e50e97fca7a692/src/include/common/rider/inputs.mqh).

## 5. Bằng chứng kết quả giao dịch

- [Myfxbook verification](https://www.myfxbook.com/help/knowledge-base/verification/): track record và trading privileges trả lời các câu hỏi khác nhau; không tự chứng minh tài khoản chạy đúng commit repo.
- [Beetle EA](https://www.myfxbook.com/members/LinoCapital/beetle-ea/10823450): nội dung lấy được có nhãn tài khoản Real, MT4 và AUDCAD; chưa xác minh đủ badge/lịch sử/code linkage. AUDCAD không thuộc sáu sản phẩm đã chốt. Không dùng làm bằng chứng cho hai repo MCP.
- Seagull chỉ tải được trạng thái Loading; FXStabilizer bị chặn khi đọc. Ghi là chưa kiểm chứng, không suy ra đạt hoặc không đạt.
- [Danh sách popular](https://www.myfxbook.com/most-popular-forex-systems) không phải xếp hạng lợi nhuận đã điều chỉnh rủi ro. Không tuyên bố đã tìm được “top 1”.

Ba nhóm phương pháp trong PLAN vẫn là ứng viên nghiên cứu. Chưa có chiến lược nào được xác nhận đủ điều kiện chạy tiền thật. Cần hồ sơ bao gồm account demo/real, ngày bắt đầu/kết thúc, equity DD, nạp/rút, chi phí, lịch sử lệnh và liên kết phiên bản/params; kết quả quá khứ không đảm bảo kết quả tương lai.

## 6. Hướng triển khai sau audit

Giữ kiến trúc terminal đã chốt nhưng tự xây gateway kiểm soát thực thi: AI chỉ đề xuất → bộ quy tắc rủi ro độc lập → duyệt người dùng nếu semi-auto → adapter MT → đối soát broker. Không để câu trả lời LLM trực tiếp vượt giới hạn tài khoản.

Ưu tiên tiếp theo là adapter **chỉ đọc**, schema chung sáu sản phẩm và journal chứng cứ; không phụ thuộc việc chọn chiến lược cuối cùng. Tiếp đó mới demo execution sau khi thống nhất chính sách rủi ro. Mọi test fake phải dán nhãn riêng với demo broker và live.

Thông tin cần Victor xác nhận trước phần phụ thuộc:

- Broker/pháp nhân và tài khoản demo đầu tiên; terminal MT4 hay MT5 đang sẵn sàng. Không gửi mật khẩu/API key trong chat.
- Vốn dự kiến, giới hạn rủi ro mỗi lệnh, lỗ ngày/tổng drawdown và số lệnh đồng thời.
- Khung thời gian/giữ lệnh mong muốn; chưa tự chọn thông số từ prototype cũ.

Nếu chưa tìm được nguồn code gắn với track record thật đáp ứng yêu cầu, phải báo khoảng trống và thống nhất lại lộ trình kiểm chứng, không tự thay tiêu chí bằng backtest.
