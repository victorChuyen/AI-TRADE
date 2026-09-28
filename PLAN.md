# Lucky — plan giai đoạn 1

Ngày cập nhật: 2026-09-27. Chủ sản phẩm: Victor. Phụ trách nghiên cứu/triển khai: Lucky.

Trạng thái: Victor đã duyệt plan ngày 2026-09-27; đang thực hiện thẩm định mã nguồn và bằng chứng giao dịch. Đã chấp nhận đường kết nối qua terminal MT4/MT5 và sáu sản phẩm. Shortlist broker và ba nhóm chiến lược bên dưới là phạm vi nghiên cứu, chưa là kết luận về hiệu quả hoặc khả năng kết nối đã kiểm thử. Việc duyệt plan không tự xác lập các giới hạn rủi ro, cấu hình chiến lược hay cho phép chạy lệnh live chưa được thống nhất.

## 1. Yêu cầu đã xác nhận

- Dùng cho giao dịch cá nhân trong giai đoạn 1.
- Phải có kết nối thực tế tới tài khoản demo và tài khoản thật.
- Cần hỗ trợ MT4 và MT5; nghiên cứu ba broker phổ biến phù hợp.
- Victor xác nhận chấp nhận kết nối qua terminal MT5 chính thức và EA trên MT4; không bắt buộc API trực tiếp không cần terminal.
- Có hai cơ chế: tự động và bán tự động.
- Ưu tiên BTC, vàng, dầu và các cặp tiền phổ biến.
- Danh sách đã chốt: BTCUSD CFD, XAUUSD, dầu WTI dạng spot CFD, EURUSD, GBPUSD và USDJPY. Victor đã thay giới hạn ban đầu năm sản phẩm bằng sáu sản phẩm.
- Cần ba chiến lược dựa trên phương pháp phổ biến, có AI hỗ trợ.
- Tiêu chí kết quả: lịch sử giao dịch được xác thực. Stars, video, backtest và lời quảng cáo không thay cho bằng chứng tài khoản thật.
- Làm theo outline; phát biểu có nguồn; điểm chưa rõ phải hỏi và thống nhất trước khi triển khai.
- Tham khảo giao diện video đã cung cấp. Phân tích tại [reference/VIDEO-ANALYSIS.md](reference/VIDEO-ANALYSIS.md).

## 2. Những điểm đang chờ xác nhận

1. Broker/pháp nhân thực tế và quyền truy cập của tài khoản Victor chưa biết. Chưa xác minh đủ điều kiện mở tài khoản theo nơi cư trú.
2. Khung thời gian, thời gian giữ lệnh, vốn và giới hạn lỗ chưa thống nhất. Không coi số mặc định trong prototype cũ là cấu hình được duyệt.
3. Chưa xác nhận nguồn code + phiên bản + bộ tham số gắn với lịch sử tài khoản thật đáp ứng tiêu chí của Victor. Ba nhóm phương pháp chưa phải chiến lược cuối cùng được duyệt.

Đã giải quyết: chấp nhận qua terminal MT5 và EA trên MT4; tăng số sản phẩm từ năm lên sáu. Broker API riêng không bắt buộc trong giai đoạn 1. Sáu sản phẩm không đồng nghĩa được mở sáu lệnh cùng lúc; giới hạn lệnh/tài khoản còn phải định nghĩa.

## 3. Kết quả khảo sát broker

Đây là shortlist kỹ thuật, không phải bảng xếp hạng top ba thế giới hoặc xếp hạng lợi nhuận. Việc khách hàng có lãi không chứng minh broker hay code tạo ra lợi thế giao dịch.

| Ứng viên | MT4/MT5, demo/live theo tài liệu | API riêng của broker | Hướng có thể đánh giá cho Lucky |
| --- | --- | --- | --- |
| IC Markets / IC | Có tài liệu nền tảng và demo/live | FAQ nói không cung cấp FIX vào MT4/MT5; FIX thuộc cTrader | MT5 Python chính thức / EA MQL4, chờ chấp thuận kiến trúc và kiểm thử tài khoản |
| Pepperstone | Có MT4/MT5 và demo trên các nền tảng dùng cho live | Standard API phải được cấp quyền; FIX có điều kiện khối lượng €160 triệu/tháng để yêu cầu môi trường demo, không được áp điều kiện này cho Standard API | Terminal route có thể đánh giá; API trực tiếp cần xác minh có truy cập đúng tài khoản MT hay không |
| Exness | Tài liệu Standard nêu MT4/MT5 demo/live | API REST/WebSocket riêng hiện công bố chỉ có tại Việt Nam; chỉ dành tài khoản Exness, tài khoản MetaTrader tiêu chuẩn không kết nối được | Phải tách adapter API riêng và adapter terminal; không quảng cáo API riêng như API chung cho MT4/MT5 |

Nguồn chính chủ: [IC FAQ](https://www.ic.com/en/help-resources/help-centre), [Pepperstone API](https://pepperstone.com/en/platforms/tools/api-trading), [Pepperstone demo](https://pepperstone.com/en/trading/demo-account), [Exness API](https://get.exness.help/hc/en-us/articles/27866287512476-Exness-API), [Exness Standard](https://get.exness.help/hc/en-us/articles/17537782738460-Standard-account).

Đã xác nhận tài liệu, chưa kết nối hoặc đặt lệnh trên bất kỳ broker nào. Không thể xác nhận ba broker đều có API trực tiếp phục vụ chung tài khoản MT4/MT5.

## 4. Sáu sản phẩm giai đoạn 1 — Victor đã xác nhận

| Sản phẩm trong Lucky | Loại hợp đồng đề xuất | Cần kiểm tra tại tài khoản broker |
| --- | --- | --- |
| Bitcoin / USD | CFD BTCUSD; không phải mua BTC spot về ví | Mã, contract size, volume step, phiên giao dịch, spread, swap |
| Vàng / USD | Spot gold CFD XAUUSD | Mã và hậu tố, tick value, lot, stop level |
| Dầu WTI / USD | Spot oil CFD | Không tự động thay bằng Brent hoặc CFD kỳ hạn; đọc thông số rollover/funding |
| EUR / USD | Forex EURUSD | Mã, số chữ số, tick size, phí, giờ giao dịch |
| GBP / USD | Forex GBPUSD | Mã, phí, thông số tick/lot và giờ giao dịch |
| USD / JPY | Forex USDJPY | P/L phải quy đổi JPY sang tiền tài khoản; không áp công thức USD-quoted cho cặp này |

Ví dụ có nguồn: IC niêm yết XTIUSD là WTI spot, WTI là crude oil futures, XBRUSD là Brent spot; do đó không ánh xạ chỉ bằng tên có chứa “oil”. [IC commodities](https://www.ic.com/en/trading-markets/commodities).

Availability thay đổi theo pháp nhân, tài khoản và platform. Phải discovery từ server thực tế trước khi đánh dấu sản phẩm “có thể giao dịch”.

## 5. Hai chế độ thực thi — đặc tả đề xuất

- Bán tự động: chiến lược/AI tạo đề xuất có entry, SL/TP, thời hạn, khối lượng và lý do; Victor duyệt; hệ thống kiểm tra lại giá, tài khoản và giới hạn trước khi gửi. SL/TP đã duyệt được quản lý theo quy tắc. Chi tiết trailing hoặc thoát sớm cần chốt.
- Tự động: Victor chọn chiến lược, sản phẩm, tài khoản và giới hạn; engine thực thi bộ quy tắc đã phiên bản hóa. Có trạng thái không giao dịch. AI không tự đổi lot, giới hạn hay chiến lược ngoài cấu hình đã thống nhất.
- Chế độ tài khoản demo/live tách biệt với chế độ tự động/bán tự động. Mô phỏng giá tổng hợp cũng là một môi trường riêng, không phải demo broker.
- Mỗi quyết định lưu nguồn dữ liệu, thời gian, model/strategy version, tham số, risk result, ticket và trạng thái đối soát. Ngắt mạng sau khi gửi phải tra cứu lại trước khi retry để tránh trùng lệnh.

## 6. Ba nhóm chiến lược đề xuất để thẩm định

Chưa nhóm nào được gọi là “top lợi nhuận đã xác thực” cho Lucky. Chỉ là phương pháp có nguồn để xây hồ sơ kiểm chứng. Tham số và thị trường áp dụng chưa chốt.

| Nhóm | Phương pháp nền | AI có thể bổ sung sau khi kiểm định | Ranh giới bằng chứng |
| --- | --- | --- | --- |
| Theo xu hướng | Time-series momentum / quy tắc xu hướng và quản lý biến động; có thể khảo sát MA/ATR | Nhận diện trạng thái thị trường; giải thích tín hiệu và điều kiện bỏ qua | AQR có nghiên cứu lịch sử dài hạn. Không suy ra EMA intraday hoặc bot Lucky đã có lợi nhuận thật |
| Phá vỡ vùng giá | Donchian channel breakout; nến đóng vượt vùng giá được xác định từ quá khứ | Đánh giá chất lượng breakout bằng dữ liệu đã có, so sánh với baseline không AI | Có mô tả phương pháp; chưa có track record xác thực gắn với code Lucky |
| Hồi về trung bình | Bollinger Bands kết hợp xác nhận và bộ lọc trạng thái đi ngang | Phát hiện điều kiện không phù hợp và giải thích lý do từ chối | Tác giả Bollinger nói chạm band không tự nó là tín hiệu đảo chiều; chưa có kết quả thật được xác minh cho cấu hình đề xuất |

Nguồn: [AQR trend research](https://www.aqr.com/Insights/Research/Journal-Article/A-Century-of-Evidence-on-Trend-Following-Investing), [Donchian guide](https://www.ig.com/au/trading-strategies/a-trader-s-guide-to-donchian-channels-200218), [John Bollinger rules](https://www.bollingerbands.com/bollinger-band-rules).

Xu hướng và breakout có thể cùng đặt cược vào momentum; không coi hai tín hiệu đồng ý là hai bằng chứng độc lập. Đo trùng lệnh, tương quan và rủi ro tổng khi thiết kế danh mục. Không ép ba chiến lược luôn phát BUY/SELL và không tự phát minh confidence score.

## 7. Học hỏi mã nguồn và bằng chứng kết quả

- [EA31337](https://github.com/EA31337/EA31337): mã nguồn framework/EA cho MT4/MT5; README đề nghị test riêng mỗi broker/symbol và cho biết tham số mặc định tối ưu EURUSD. Repo hiển thị GPL-3.0. Cần audit license từng phần, hành vi giao dịch và tests trước khi dùng lại. Chưa chứng minh được code/commit cụ thể tạo ra track record thật đủ tiêu chí.
- [EA31337 strategies](https://github.com/EA31337/EA31337-strategies): có các module MA, ATR_MA_Trend, MA_Breakout, Bands, RSI và nhiều module khác. Đây là thư viện tham khảo, chưa audit từng chiến lược; có cả module martingale nên không nhập cả bộ mặc định.
- [metatrader-mcp-server](https://github.com/ariadng/metatrader-mcp-server): ứng viên adapter nghiên cứu từ lượt trước, không phải chiến lược sinh lời. Chưa chốt làm nền trước audit source/tests.
- [Microsoft Qlib](https://github.com/microsoft/qlib): tham khảo quy trình nghiên cứu ML; chưa đánh giá việc thích nghi dữ liệu CFD hoặc executor MT. Không coi là connector sẵn cho Lucky.

Đã kiểm tra danh sách [Myfxbook most popular](https://www.myfxbook.com/most-popular-forex-systems): đây là xếp hạng lượt theo dõi, không phải xếp hạng chất lượng theo rủi ro. Không dùng nhãn “most popular” để suy ra “tốt nhất”.

Đã đọc trang [Beetle EA](https://www.myfxbook.com/members/LinoCapital/beetle-ea/10823450): trang hiển thị Real/MT4, một số thống kê và nạp/rút, nhưng open trades để riêng tư; bản trích xuất chưa xác minh rõ cả hai badge và chưa có liên kết code/commit chứng minh phương pháp. Trang Seagull trả nội dung loading; trang FXStabilizer bị HTTP 403. Những ứng viên này chưa đạt bằng chứng để lựa chọn hoặc khuyến nghị sao chép. Không lấy các tỷ lệ lợi nhuận trên trang làm mục tiêu của Lucky.

Theo [Myfxbook verification](https://www.myfxbook.com/help/knowledge-base/verification/), Track Record đối chiếu lịch sử với broker; Trading Privileges xác nhận quyền kiểm soát giao dịch. Hai trạng thái này không tự chứng minh lịch sử đến từ code công khai nào.

Hồ sơ cần có trước khi kết luận đã kiểm chứng: link tài khoản thật, xác minh history/control, dữ liệu nạp/rút và equity/drawdown, thời gian quan sát, vị thế mở, broker/server, chi phí, chiến lược/phiên bản/tham số và bằng chứng nối account với code. Mốc số tháng, số lệnh, max drawdown và các ngưỡng nghiệm thu còn phải thống nhất theo chiến lược.

## 8. Outline triển khai sau khi thống nhất

1. Chốt lựa chọn đang mở ở mục 2. Lập hồ sơ broker và ma trận tài khoản.
2. Nghiên cứu/audit mã nguồn ứng viên, chốt giấy phép, commit, phần dùng lại và phần tự viết; lập hồ sơ bằng chứng giao dịch.
3. Viết đặc tả chiến lược chính xác: dữ liệu đầu vào, chỉ báo, entry/exit, không giao dịch, sizing, phiên giao dịch và xử lý tin tức nếu có nguồn.
4. Tạo connector đọc dữ liệu thật: nhận dạng broker/server/account mode, giá, instrument specs, lịch sử. Kiểm tra trên từng tài khoản.
5. Kiểm thử giao dịch demo thực tế: gửi, sửa SL/TP, đóng, lệnh từ chối, mất mạng/reconnect, đối soát và chống lặp.
6. Backtest theo dữ liệu broker có chi phí, test ngoài mẫu/walk-forward và forward demo. So sánh chiến lược nền với phiên bản thêm AI.
7. Dựng UI theo video và các trạng thái thật. Cho xem bằng chứng nguồn dữ liệu, giới hạn, đề xuất/lệnh và log.
8. Kiểm tra kết nối tài khoản thật; việc chạy chiến lược tiền thật cần cấu hình account và giới hạn do Victor thống nhất trước. Báo cáo riêng chức năng kết nối, thực thi, hiệu quả chiến lược.

Ma trận phạm vi đã chốt: 3 broker × 2 platform × 2 môi trường × 6 sản phẩm = 72 tổ hợp cần xem xét. Đây là phạm vi khảo sát, chưa phải khả năng đã kiểm thử. Broker có thể không cung cấp một số tổ hợp; đánh dấu không hỗ trợ thay vì giả lập như đã kết nối.

## 9. Trạng thái workspace

Các file Python trong app/ là prototype viết trước khi chốt yêu cầu. Chưa kiểm thử, chưa có frontend, chưa kết nối broker. Số dư, phí, giá và giới hạn mặc định ở đó là mô phỏng, không đại diện thông số sàn hoặc quyết định đã được Victor duyệt. Không sử dụng prototype này như bằng chứng MVP hoạt động.
