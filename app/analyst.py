"""Optional OpenAI-compatible chat completion. No tool access or order execution."""
import json
import os
import urllib.error
import urllib.request
from .engine import Rejected


def configured():
    return bool(os.environ.get('LUCKY_AI_API_KEY') and os.environ.get('LUCKY_AI_MODEL'))


def review(plan):
    if not configured():
        raise Rejected('Chưa cấu hình AI cloud. Phân tích quy tắc SMA/ATR vẫn hoạt động.')
    base = os.environ.get('LUCKY_AI_BASE_URL', 'https://api.openai.com/v1').rstrip('/')
    if not base.startswith('https://'):
        raise Rejected('Địa chỉ AI cloud phải sử dụng HTTPS.')
    payload = {"model": os.environ['LUCKY_AI_MODEL'], "messages": [
        {"role": "system", "content": "Bạn là Lucky, trợ lý phân tích mô phỏng giao dịch. Trả lời tiếng Việt, tối đa 180 từ. Chỉ phân tích dữ liệu tổng hợp được cung cấp, chỉ rõ đây là mô phỏng. Nêu xu hướng, giới hạn của SMA/ATR và lý do có thể bỏ qua tín hiệu. Không tạo giá mới, không hứa hẹn lợi nhuận, không đánh giá xác suất thành công khi không có kiểm định, không đặt lệnh. Không có dữ liệu tin tức hay tài khoản thật."},
        {"role": "user", "content": json.dumps(plan, ensure_ascii=False)}], "max_tokens": 600}
    req = urllib.request.Request(base + '/chat/completions', data=json.dumps(payload).encode(), headers={"Authorization": 'Bearer ' + os.environ['LUCKY_AI_API_KEY'], "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=25) as response:
            raw = response.read(100001)
            if len(raw) > 100000:
                raise Rejected('Phản hồi AI vượt giới hạn dung lượng.')
            data = json.loads(raw)
        answer = data['choices'][0]['message']['content']
        if not isinstance(answer, str) or not answer.strip():
            raise ValueError('empty response')
        return {"provider": "cloud", "model": os.environ['LUCKY_AI_MODEL'], "summary": answer[:6000], "step": plan['step'], "symbol": plan['symbol']}
    except urllib.error.HTTPError as exc:
        raise Rejected(f'Dịch vụ AI trả HTTP {exc.code}. Kiểm tra model, API key và hạn mức trên máy chủ.') from None
    except (urllib.error.URLError, TimeoutError, ValueError, KeyError, IndexError):
        raise Rejected('Chưa nhận được phản hồi AI hợp lệ. Anh có thể thử lại hoặc dùng phân tích quy tắc.') from None
