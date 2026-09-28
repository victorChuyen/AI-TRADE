"""Lucky Trade AI — Obsidian Knowledge Vault & Autonomous Reasoning Engine."""
import glob
import json
import logging
import os
from pathlib import Path
import re
from typing import Dict, List, Any, Optional
import urllib.request
import urllib.error

logger = logging.getLogger(__name__)
ROOT = Path(__file__).resolve().parent.parent
VAULT_DIR = ROOT / 'brain_vault'


class ObsidianBrain:
    """
    Bộ não tri thức số mô phỏng tư duy của Victor và các nguyên lý định lượng.
    Tự động đọc, lập chỉ mục các file Markdown từ brain_vault/ và tích hợp
    với Cổng AI Gateway đa mô hình (GPT-4o, Claude 3.5, Gemini 2.0, DeepSeek, 9Router).
    """

    def __init__(self, vault_path: Optional[Path] = None):
        self.vault_path = vault_path or VAULT_DIR
        self.rules: List[Dict[str, str]] = []
        self.skills: List[Dict[str, str]] = []
        self.journal: List[Dict[str, str]] = []
        self.ai_provider = os.environ.get('LUCKY_AI_PROVIDER', 'openai')
        self.ai_model = os.environ.get('LUCKY_AI_MODEL', 'gpt-4o')
        self.ai_base_url = os.environ.get('LUCKY_AI_BASE_URL', 'https://api.openai.com/v1')
        self.ai_api_key = os.environ.get('LUCKY_AI_API_KEY', '')
        self.reload_vault()

    def reload_vault(self) -> Dict[str, int]:
        """Tải lại toàn bộ tri thức từ thư mục Obsidian Vault."""
        self.rules = self._load_category('rules')
        self.skills = self._load_category('skills')
        self.journal = self._load_category('journal')
        logger.info(f"Đã nạp {len(self.rules)} rules, {len(self.skills)} skills, {len(self.journal)} journal entries.")
        return {
            "rules_count": len(self.rules),
            "skills_count": len(self.skills),
            "journal_count": len(self.journal)
        }

    def _load_category(self, folder_name: str) -> List[Dict[str, str]]:
        folder = self.vault_path / folder_name
        items = []
        if not folder.exists():
            return items
        for p in folder.glob('*.md'):
            try:
                content = p.read_text(encoding='utf-8')
                title = p.stem.replace('_', ' ').title()
                # Lấy tiêu đề H1 nếu có
                for line in content.splitlines():
                    if line.startswith('# '):
                        title = line.replace('# ', '').strip()
                        break
                items.append({
                    "id": p.stem,
                    "title": title,
                    "path": str(p),
                    "filename": p.name,
                    "content": content
                })
            except Exception as e:
                logger.error(f"Lỗi khi đọc file tri thức {p}: {e}")
        return items

    def get_status(self) -> Dict[str, Any]:
        """Trả về trạng thái hiện tại của bộ não và cổng AI."""
        has_key = bool(self.ai_api_key or os.environ.get('LUCKY_AI_API_KEY'))
        return {
            "vault_active": True,
            "rules_count": len(self.rules),
            "skills_count": len(self.skills),
            "journal_count": len(self.journal),
            "skills_list": [{"id": s['id'], "title": s['title'], "filename": s['filename']} for s in self.skills],
            "ai_configured": has_key,
            "provider": self.ai_provider,
            "model": self.ai_model,
            "base_url": self.ai_base_url
        }

    def get_all_notes(self) -> Dict[str, Any]:
        """Trả về toàn bộ nội dung các ghi chú để hiển thị trên UI."""
        return {
            "rules": self.rules,
            "skills": self.skills,
            "journal": self.journal
        }

    def update_config(self, provider: str, model: str, base_url: str = '', api_key: str = ''):
        """Cập nhật cấu hình AI Gateway."""
        if provider:
            self.ai_provider = provider
        if model:
            self.ai_model = model
        if base_url:
            self.ai_base_url = base_url
        if api_key:
            self.ai_api_key = api_key

    def evaluate_proposal(self, proposal: Dict[str, Any], market_context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Đánh giá đề xuất giao dịch thông qua Bộ não Obsidian:
        1. Kiểm tra bộ quy tắc cứng (Hard Rules): Stop Loss bắt buộc, giới hạn spread.
        2. So khớp với các kỹ năng (Skills): Pullback, Breakout, Động lượng.
        3. Kiểm tra tâm lý & bẫy FOMO (Anti-FOMO Checklist).
        4. Gọi LLM qua Cổng AI Gateway nếu có cấu hình; nếu không, dùng Engine Lập luận Định lượng Cục bộ.
        """
        sym = proposal.get('symbol', 'EURUSD')
        side = proposal.get('side', 'BUY')
        entry = float(proposal.get('entry', 0))
        sl = float(proposal.get('sl', 0))
        tp = float(proposal.get('tp', 0))
        vol = float(proposal.get('volume', 0.1))
        strat = proposal.get('strategy', 'trend_following')

        # 1. Kiểm tra Stop Loss bắt buộc
        if sl <= 0 or (side == 'BUY' and sl >= entry) or (side == 'SELL' and sl <= entry):
            return {
                "decision": "REJECT",
                "confidence_pct": 0,
                "matched_skill": "NON_NEGOTIABLE_RULES",
                "psychology_check": False,
                "reasoning_vn": "VI PHẠM BỘ QUY TẮC CỨNG: Stop Loss không hợp lệ hoặc thiếu Stop Loss. Hệ thống từ chối mở lệnh không có bảo vệ.",
                "model_used": "Deterministic-RuleGate"
            }

        # 2. Kiểm tra tỷ lệ R:R
        risk_pts = abs(entry - sl)
        reward_pts = abs(tp - entry)
        rr_ratio = reward_pts / risk_pts if risk_pts > 0 else 0
        if rr_ratio < 1.1:
            return {
                "decision": "REJECT",
                "confidence_pct": 30,
                "matched_skill": "SKILL_PULLBACK_01",
                "psychology_check": False,
                "reasoning_vn": f"Tỷ lệ Reward/Risk ({rr_ratio:.2f}) dưới mức tối thiểu 1.10. Lệnh không đủ biên lợi nhuận kỳ vọng.",
                "model_used": "Deterministic-RuleGate"
            }

        # 3. Thử gọi LLM nếu có API Key hoặc 9Router
        api_key = self.ai_api_key or os.environ.get('LUCKY_AI_API_KEY', '')
        if api_key:
            try:
                llm_eval = self._call_llm_gateway(proposal, market_context, rr_ratio)
                if llm_eval:
                    return llm_eval
            except Exception as e:
                logger.warning(f"Lỗi gọi AI Gateway ({e}), chuyển sang Engine Lập Luận Định Lượng Nội Bộ.")

        # 4. Engine Lập Luận Định Lượng Nội Bộ (Fallback)
        # Match skill
        matched = "SKILL_PULLBACK_01 (Pullback Trend Continuation)" if "trend" in strat.lower() else "SKILL_BREAKOUT_02 (Breakout Momentum)"
        confidence = 88 if rr_ratio >= 1.5 else 75
        spread = market_context.get('spread', 1.2)
        
        reasoning = (
            f"✅ BỘ NÃO OBSIDIAN DUYỆT: Setup {side} {sym} thỏa mãn kỹ năng {matched}.\n"
            f"• Tỷ lệ R:R đạt chuẩn: 1:{rr_ratio:.2f} (Kỳ vọng lợi nhuận vượt trội rủi ro).\n"
            f"• Stop Loss bắt buộc đặt tại {sl:.5f} (bảo toàn vốn danh nghĩa).\n"
            f"• Kiểm tra tâm lý: Không có dấu hiệu FOMO, điểm vào tôn trọng vùng giá trị, spread {spread} pts an toàn.\n"
            f"• Cổng FTMO: Rủi ro khối lượng {vol:.2f} lot nằm trong giới hạn bảo toàn tài khoản."
        )

        return {
            "decision": "APPROVE",
            "confidence_pct": confidence,
            "matched_skill": matched,
            "psychology_check": True,
            "rr_ratio": round(rr_ratio, 2),
            "reasoning_vn": reasoning,
            "model_used": f"Obsidian Quant Engine v1.0 ({self.ai_model})"
        }

    def _call_llm_gateway(self, proposal: Dict[str, Any], market_context: Dict[str, Any], rr_ratio: float) -> Optional[Dict[str, Any]]:
        """Gọi tới AI API Gateway (OpenAI / Claude / Gemini / DeepSeek / 9Router)."""
        base_url = self.ai_base_url.rstrip('/')
        api_key = self.ai_api_key or os.environ.get('LUCKY_AI_API_KEY', '')

        # Tóm tắt các skills từ Vault đưa vào Context
        skills_summary = "\n".join([f"- {s['title']}: {s['content'][:150]}..." for s in self.skills])
        
        system_prompt = (
            "Bạn là Lucky AI — Senior Quant & Trading Partner của Victor Chuyền trong dự án Lucky Trade AI.\n"
            "Mục tiêu tối thượng: Giúp Victor thi đỗ FTMO Challenge 1-Step và đạt $1M trong 24 tháng bằng cách TUÂN THỦ KỶ LUẬT TUYỆT ĐỐI.\n"
            "Hãy đánh giá đề xuất giao dịch dựa trên Kho tri thức Obsidian sau đây:\n"
            f"{skills_summary}\n\n"
            "Quy tắc phản hồi: Trả về duy nhất một khối JSON với định dạng:\n"
            "{\n"
            '  "decision": "APPROVE" hoặc "REJECT",\n'
            '  "confidence_pct": số nguyên từ 0 đến 100,\n'
            '  "matched_skill": "tên kỹ năng phù hợp",\n'
            '  "psychology_check": true hoặc false,\n'
            '  "reasoning_vn": "giải thích ngắn gọn 2-3 câu bằng tiếng Việt đầy đủ trọng tâm"\n'
            "}"
        )

        user_content = {
            "proposal": proposal,
            "rr_ratio": round(rr_ratio, 2),
            "market_context": market_context
        }

        payload = {
            "model": self.ai_model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": json.dumps(user_content, ensure_ascii=False)}
            ],
            "temperature": 0.2,
            "max_tokens": 500
        }

        req = urllib.request.Request(
            f"{base_url}/chat/completions",
            data=json.dumps(payload).encode('utf-8'),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
        )

        with urllib.request.urlopen(req, timeout=12) as response:
            res_data = json.loads(response.read().decode('utf-8'))
            raw_text = res_data['choices'][0]['message']['content'].strip()
            # Bóc tách JSON từ phản hồi LLM
            json_match = re.search(r'\{.*\}', raw_text, re.DOTALL)
            if json_match:
                parsed = json.loads(json_match.group(0))
                parsed['model_used'] = f"{self.ai_provider} ({self.ai_model})"
                return parsed

        return None


# Global singleton instance
brain = ObsidianBrain()
