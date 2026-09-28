# KỸ NĂNG: BẢO VỆ TÀI KHOẢN THI QUỸ FTMO (FTMO SAFEGUARDS)

> **Mã kỹ năng:** `SKILL_FTMO_GUARD_03`  
> **Áp dụng:** Toàn bộ tài khoản FTMO Challenge (1-Step / 2-Step)  

## 1. Công Thức Sàn Rủi Ro (Floor Contracts)
* **Sàn ngày FTMO (Daily Floor):**
  $$\text{daily\_floor} = B_0 - 0.03 \times I \quad (\text{1-Step}) \quad \text{hoặc} \quad B_0 - 0.05 \times I \quad (\text{2-Step})$$
  Trong đó $B_0$ là số dư chốt lúc 00:00 giờ Prague (CE(S)T).
* **Sàn Trailing Drawdown (1-Step):**
  $$\text{total\_floor\_1step} = H - 0.10 \times I$$
  Trong đó $H$ là đỉnh số dư đầu ngày cao nhất từ trước đến nay ($\max(I, B_0)$). Khi tài khoản có lãi, sàn này kéo lên theo; khi tài khoản lỗ, sàn này KHÔNG BAO GIỜ hạ xuống.
* **Khoảng đệm an toàn (Headroom):**
  $$\text{headroom} = E - \max(\text{daily\_floor}, \text{total\_floor})$$
  Bất kỳ lệnh nào được mở phải đảm bảo: $\text{Rủi ro lệnh mới} + \text{Rủi ro các lệnh đang mở} < \text{headroom}$.

## 2. Quy Tắc Ngày Thắng Lớn Nhất (Best Day Rule $\le 50\%$)
* FTMO 1-Step yêu cầu: Lợi nhuận của ngày có lãi lớn nhất KHÔNG ĐƯỢC vượt quá 50% tổng lợi nhuận dương.
* **Hành động của Bot:**
  - Nếu trong 1 ngày, lợi nhuận đã đạt **2.5% - 3.0% vốn**, bot TỰ ĐỘNG KHÓA MỞ LỆNH MỚI trong ngày đó, chốt lời và bảo toàn thành quả.
  - Phân bổ mục tiêu 10% ra tối thiểu 3 - 5 ngày giao dịch có lãi đều đặn.

## 3. Khung Giờ Tin Tức & Nghỉ Cuối Tuần
* **Tin tức đỏ (CPI, NFP, FOMC, Rate Decision):** Ngừng mở lệnh trước 15 phút, đóng vị thế trước 5 phút, chờ 5 phút sau tin mới mở lại.
* **Nghỉ cuối tuần:** Đóng toàn bộ lệnh trước 21:00 UTC ngày thứ Sáu để tránh rủi ro Weekend Gap.
