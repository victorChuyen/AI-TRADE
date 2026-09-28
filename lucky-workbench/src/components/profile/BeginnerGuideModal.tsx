/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * OPC Trade Lab V1 — Beginner Onboarding & International Risk Disclosure Modal
 * Designed specifically from the perspective of a newcomer entering the app for the first time.
 */

import React, { useState } from 'react';
import {
  BookOpen,
  X,
  Compass,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Play,
  Server,
  Zap,
  DollarSign,
  Clock,
  Layers,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Cpu,
  HelpCircle,
  Lock,
  ChevronRight,
  BellRing,
  TrendingDown
} from 'lucide-react';
import { AccountMode } from '../../App.tsx';

interface BeginnerGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  onNavigateToScreen: (screen: 'command_center' | 'ai_auto' | 'overview' | 'inspector' | 'strategy' | 'settings' | 'mt4_bridge' | 'mt5_bridge' | 'emergency_dashboard') => void;
  accountMode: AccountMode;
  onSelectAccountMode: (mode: AccountMode) => void;
  onResetDemoCapital: (amount: number) => void;
}

export const BeginnerGuideModal: React.FC<BeginnerGuideModalProps> = ({
  isOpen,
  onClose,
  onOpenSettings,
  onNavigateToScreen,
  accountMode,
  onSelectAccountMode,
  onResetDemoCapital
}) => {
  const [activeStep, setActiveStep] = useState<number>(0);
  const [hasAcknowledgedRisk, setHasAcknowledgedRisk] = useState<boolean>(false);

  if (!isOpen) return null;

  // 4 Essential Steps for New Traders
  const guideSteps = [
    {
      stepNumber: '01',
      title: 'Hiểu Rõ Khái Niệm & Chế Độ Giao Dịch',
      subTitle: 'Trader mới cần gì đầu tiên? Sự an toàn tuyệt đối với vốn.',
      badge: 'BẮT BUỘC ĐẦU TIÊN',
      badgeColor: 'bg-emerald-950 text-emerald-300 border-emerald-500/50',
      icon: <DollarSign className="w-5 h-5 text-emerald-400" />,
      content: (
        <div className="space-y-3">
          <p className="text-xs text-zinc-300 leading-relaxed font-sans">
            Khi mới bước vào nền tảng, điều trader mong muốn nhất là <strong>thử nghiệm không mất tiền thật</strong> trước khi mạo hiểm tài sản cá nhân.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
            <div className={`p-3.5 rounded-xl border transition ${
              accountMode === 'DEMO'
                ? 'bg-teal-950/60 border-teal-400 text-white shadow-md'
                : 'bg-slate-950 border-slate-800 text-zinc-400'
            }`}>
              <div className="flex items-center justify-between font-bold">
                <span className="text-teal-300">1. Chế Độ DEMO (Paper Trading)</span>
                {accountMode === 'DEMO' && <CheckCircle2 className="w-4 h-4 text-teal-400" />}
              </div>
              <p className="text-[11px] text-zinc-300 font-sans mt-1 leading-normal">
                Vốn ảo mặc định <strong>$10,000 USDT</strong> (chuẩn cấp vốn quỹ Prop Firm). Thoải mái test bot AI, đặt lệnh nến, đo trượt giá mà <strong>không có rủi ro tài chính</strong>.
              </p>
              <div className="mt-2.5 flex items-center gap-1.5">
                <button
                  onClick={() => {
                    onSelectAccountMode('DEMO');
                    onResetDemoCapital(10000);
                  }}
                  className="px-2.5 py-1 bg-teal-500 text-slate-950 font-bold rounded text-[10px] cursor-pointer hover:bg-teal-400 transition"
                >
                  Cấp $10,000 Thử Ngay
                </button>
              </div>
            </div>

            <div className={`p-3.5 rounded-xl border transition ${
              accountMode === 'REAL'
                ? 'bg-amber-950/60 border-amber-400 text-white shadow-md'
                : 'bg-slate-950 border-slate-800 text-zinc-400'
            }`}>
              <div className="flex items-center justify-between font-bold">
                <span className="text-amber-300">2. Chế Độ REAL (Sàn Thật)</span>
                {accountMode === 'REAL' && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
              </div>
              <p className="text-[11px] text-zinc-300 font-sans mt-1 leading-normal">
                Kết nối khóa API Binance, Bybit, OKX hoặc tài khoản MT4/MT5. <strong>Chỉ dùng khi bạn đã thuần thục kiểm soát rủi ro ở Demo</strong>.
              </p>
              <div className="mt-2.5 text-[10px] text-amber-400 flex items-center gap-1 font-mono">
                <ShieldCheck className="w-3 h-3 text-amber-400" />
                <span>Không bao giờ cấp quyền Rút Tiền (Zero Withdrawal)</span>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      stepNumber: '02',
      title: 'Làm Chủ 3 Màn Hình Giao Dịch Chính',
      subTitle: 'Nên xem màn hình nào trước để không bị ngợp thông tin?',
      badge: 'ĐIỀU HƯỚNG TRỌNG TÂM',
      badgeColor: 'bg-cyan-950 text-cyan-300 border-cyan-500/50',
      icon: <Layers className="w-5 h-5 text-cyan-400" />,
      content: (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 font-mono text-xs">
            <div
              onClick={() => {
                onNavigateToScreen('command_center');
                onClose();
              }}
              className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500 transition cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="font-bold text-white group-hover:text-cyan-300 flex items-center gap-1">
                  <span>1. Command Center</span>
                  <ArrowRight className="w-3 h-3 text-cyan-400 group-hover:translate-x-1 transition-transform" />
                </div>
                <div className="text-[10px] text-cyan-400 font-bold mt-0.5">Khuyên dùng cho người mới 🥇</div>
                <p className="text-[11px] text-zinc-400 font-sans mt-1">
                  Biểu đồ giá thời gian thực, tape giao dịch và nút Buy/Sell 1-click có sẵn Stop Loss tự động.
                </p>
              </div>
              <span className="text-[9px] text-teal-400 mt-2 block border-t border-slate-800 pt-1.5">
                Nhấn vào để mở ngay →
              </span>
            </div>

            <div
              onClick={() => {
                onNavigateToScreen('ai_auto');
                onClose();
              }}
              className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-teal-500 transition cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="font-bold text-white group-hover:text-teal-300 flex items-center gap-1">
                  <span>2. AI Auto Assistant</span>
                  <ArrowRight className="w-3 h-3 text-teal-400 group-hover:translate-x-1 transition-transform" />
                </div>
                <div className="text-[10px] text-teal-400 font-bold mt-0.5">Trợ lý định lượng 5 bước</div>
                <p className="text-[11px] text-zinc-400 font-sans mt-1">
                  AI quét nến, phân tích Order Flow, kiểm toán ký quỹ và gửi tín hiệu vào lệnh kỷ luật.
                </p>
              </div>
              <span className="text-[9px] text-teal-400 mt-2 block border-t border-slate-800 pt-1.5">
                Nhấn vào để mở ngay →
              </span>
            </div>

            <div
              onClick={() => {
                onNavigateToScreen('emergency_dashboard');
                onClose();
              }}
              className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-rose-500 transition cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="font-bold text-white group-hover:text-rose-300 flex items-center gap-1">
                  <span>3. Emergency 390px</span>
                  <ArrowRight className="w-3 h-3 text-rose-400 group-hover:translate-x-1 transition-transform" />
                </div>
                <div className="text-[10px] text-rose-400 font-bold mt-0.5">Bàn cấp cứu lệnh</div>
                <p className="text-[11px] text-zinc-400 font-sans mt-1">
                  Giao diện siêu nhẹ tối ưu di động. Nút đóng khẩn cấp, cắt lỗ toàn bộ khi thị trường giật bão tin.
                </p>
              </div>
              <span className="text-[9px] text-rose-400 mt-2 block border-t border-slate-800 pt-1.5">
                Nhấn vào để mở ngay →
              </span>
            </div>
          </div>
        </div>
      )
    },
    {
      stepNumber: '03',
      title: 'Tự Động Đóng Lệnh Khi Hết Phiên (Auto-Close)',
      subTitle: 'Quy tắc sống còn: Không giữ vị thế qua đêm (No Overnight Risk).',
      badge: 'KỶ LUẬT THUẦN QUỸ',
      badgeColor: 'bg-teal-950 text-teal-300 border-teal-500/50',
      icon: <Clock className="w-5 h-5 text-teal-400" />,
      content: (
        <div className="space-y-2.5">
          <p className="text-xs text-zinc-300 leading-relaxed font-sans">
            Người mới hay thua lỗ nặng nề nhất vì <strong>giữ lệnh qua đêm</strong>, bị dính phí Swap cao, trượt giá khi phiên đóng cửa hoặc tin tức giật gap lúc ngủ.
          </p>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-teal-500/40 space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between text-teal-300 font-bold">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-teal-400" />
                Tính Năng Tự Động Chốt Phiên Có Sẵn
              </span>
              <span className="text-[10px] px-2 py-0.5 bg-teal-950 rounded border border-teal-700">ĐÃ ĐƯỢC TÍCH HỢP</span>
            </div>
            <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
              Bạn có thể chọn đóng trước giờ sàn New York (Vàng XAU/USD), London, Tokyo hay nến ngày Crypto (Binance UTC Reset). Đồng hồ tự đếm ngược và thanh lý sạch lệnh để bạn an tâm nghỉ ngơi 100% tiền mặt.
            </p>
            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => {
                  onOpenSettings();
                  onClose();
                }}
                className="text-teal-400 hover:text-teal-300 font-bold text-xs flex items-center gap-1 cursor-pointer"
              >
                <span>Xem Cấu Hình Chốt Phiên Trong Menu Cài Đặt →</span>
              </button>
            </div>
          </div>
        </div>
      )
    },
    {
      stepNumber: '04',
      title: 'Nút Kill Switch & Menu Cài Đặt Tinh Gọn',
      subTitle: 'Nút bấm khẩn cấp và cách ẩn bớt các nút kết nối không cần thiết.',
      badge: 'TIỆN ÍCH QUAN TRỌNG',
      badgeColor: 'bg-purple-950 text-purple-300 border-purple-500/50',
      icon: <ShieldAlert className="w-5 h-5 text-rose-400" />,
      content: (
        <div className="space-y-3 font-mono text-xs">
          <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 space-y-1.5">
            <div className="font-bold text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>Nút Cầu Dao Khẩn Cấp (Kill Switch - Màu Đỏ Trên Header)</span>
            </div>
            <p className="text-[11px] text-zinc-300 font-sans leading-relaxed">
              Khi thị trường biến động bất thường hoặc thuật toán gặp sự cố, bạn chỉ cần bấm nút <strong>Kill Switch</strong>. Toàn bộ tiến trình tự động sẽ ngắt ngay tức khắc, đóng lệnh và khóa tài khoản về trạng thái an toàn.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <div className="font-bold text-cyan-300 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-cyan-400" />
              <span>Menu Cài Đặt &amp; Tùy Biến Tốc Độ AI (1.0s &ndash; 60.0s)</span>
            </div>
            <p className="text-[11px] text-zinc-400 font-sans">
              Các nút kết nối MT4, MT5 (80+ MCP Tools), cấu hình API sàn, cấp vốn và <strong>Tần suất thực thi AI (tùy chỉnh chu kỳ lặp từ 1.0s đến 60.0s)</strong> đã được tích hợp trong nút <strong>[Cài Đặt &amp; Cổng MT]</strong>.
            </p>
          </div>
        </div>
      )
    },
    {
      stepNumber: '05',
      title: 'Thông Báo Biến Động & Khớp Mua / Bán Ngay',
      subTitle: 'Ý nghĩa của Pop-up cảnh báo và thời điểm nên bấm Khớp Mua Ngay hoặc Khớp Bán Ngay.',
      badge: 'THỰC CHIẾN TỨC THÌ',
      badgeColor: 'bg-amber-950 text-amber-300 border-amber-500/50',
      icon: <BellRing className="w-5 h-5 text-amber-400" />,
      content: (
        <div className="space-y-3 font-mono text-xs">
          {/* Notification explanation */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-amber-500/40 space-y-2">
            <div className="flex items-center justify-between text-amber-300 font-bold">
              <span className="flex items-center gap-1.5">
                <BellRing className="w-4 h-4 text-amber-400" />
                <span>1. Ý Nghĩa Của Thông Báo (Pop-up Notification)</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                REAL-TIME WEBSOCKET
              </span>
            </div>
            <p className="text-[11px] text-zinc-300 font-sans leading-relaxed">
              Thông báo pop-up góc trên tự động nảy ra kèm tiếng chuông khi giá thị trường (Binance Stream) <strong>biến động đột biến vượt ngưỡng &ge; 0.15% chỉ trong 20 giây</strong>.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
              <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300">
                <div className="font-bold flex items-center gap-1 mb-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Pop-up XANH (Spike +)</span>
                </div>
                <p className="text-zinc-300 font-sans text-[10px]">
                  Phe Mua ồ ạt đổ tiền đẩy giá bứt phá nhanh. Báo hiệu sóng tăng ngắn hạn hoặc phá vỡ cản.
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-300">
                <div className="font-bold flex items-center gap-1 mb-1">
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>Pop-up ĐỎ (Drop -)</span>
                </div>
                <p className="text-zinc-300 font-sans text-[10px]">
                  Phe Bán xả hàng đột ngột làm giá tụt dốc. Báo hiệu áp lực bán tháo hoặc rò rỉ tin tiêu cực.
                </p>
              </div>
            </div>
          </div>

          {/* When to Click Buy / Sell Now */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="text-white font-bold flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-teal-400" />
              <span>2. Khi Nào Nên Bấm Khớp Mua Ngay &amp; Khớp Bán Ngay?</span>
            </div>
            <p className="text-[11px] text-zinc-300 font-sans leading-relaxed">
              Hai nút này ở màn hình <strong>Sổ Lệnh (Order Book Inspector)</strong> cho phép bạn vào lệnh chủ động theo đúng dòng tiền thời gian thực:
            </p>
            <div className="space-y-1.5 text-[11px]">
              <div className="p-2 rounded-lg bg-emerald-950/30 border border-emerald-700/50 text-emerald-300 font-sans">
                <strong>🟢 Bấm "Khớp Mua Ngay":</strong> Khi thấy Pop-up xanh nổ sóng tăng + hàng chờ Mua (Bids) dày đặc trên sổ lệnh + tín hiệu AI hội tụ biên an toàn &gt; 1.50%.
              </div>
              <div className="p-2 rounded-lg bg-rose-950/30 border border-rose-700/50 text-rose-300 font-sans">
                <strong>🔴 Bấm "Khớp Bán Ngay":</strong> Khi thấy Pop-up đỏ báo sóng giảm gấp + hàng chờ Bán (Asks) áp đảo đè giá + cần mở vị thế Short đón đầu đà giảm hoặc thoát hàng phòng vệ.
              </div>
            </div>
            <div className="pt-1 flex justify-end">
              <button
                onClick={() => {
                  onNavigateToScreen('inspector');
                  onClose();
                }}
                className="text-teal-400 hover:text-teal-300 font-bold text-xs flex items-center gap-1 cursor-pointer"
              >
                <span>Mở Màn Hình Sổ Lệnh Xem Thử →</span>
              </button>
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="guide-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in"
    >
      <div className="relative w-full max-w-3xl bg-[#090e17] border border-teal-500/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header Banner */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-[#060a12]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-950/80 border border-teal-500/60 flex items-center justify-center text-teal-400">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 id="guide-title" className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <span>Hướng Dẫn Nhanh Dành Cho Trader Mới</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-950 text-teal-300 border border-teal-700/60 font-semibold">
                  Newbie Onboarding
                </span>
              </h2>
              <p className="text-[11px] text-zinc-400 font-sans">
                Trải nghiệm từng bước để làm chủ nền tảng và kiểm soát rủi ro như trader quỹ chuyên nghiệp
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 flex items-center justify-center text-zinc-400 hover:text-white transition cursor-pointer"
            title="Đóng hướng dẫn"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Indicator Navigation */}
        <div className="grid grid-cols-5 bg-[#05080f] border-b border-slate-800 text-xs font-mono">
          {guideSteps.map((step, idx) => (
            <button
              key={step.stepNumber}
              onClick={() => setActiveStep(idx)}
              className={`p-2 sm:p-2.5 text-left border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                activeStep === idx
                  ? 'border-teal-400 bg-teal-950/40 text-teal-300 font-bold'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                activeStep === idx ? 'bg-teal-400 text-slate-950' : 'bg-slate-800 text-zinc-400'
              }`}>
                {idx + 1}
              </span>
              <span className="truncate hidden md:inline">{step.title}</span>
              <span className="truncate md:hidden">B{idx + 1}</span>
            </button>
          ))}
        </div>

        {/* Step Active Content Area */}
        <div className="p-5 overflow-y-auto space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold border ${guideSteps[activeStep].badgeColor}`}>
                {guideSteps[activeStep].badge}
              </span>
              <h3 className="text-sm font-bold text-white">
                {guideSteps[activeStep].title}
              </h3>
            </div>
            <span className="text-[11px] font-mono text-zinc-400">
              Bước {activeStep + 1} / {guideSteps.length}
            </span>
          </div>

          <div className="text-xs text-zinc-400 font-sans">
            {guideSteps[activeStep].subTitle}
          </div>

          {/* Render Active Step Body */}
          <div className="pt-1">
            {guideSteps[activeStep].content}
          </div>

          {/* --- INTERNATIONAL STANDARD RISK DISCLOSURE NOTE --- */}
          <div className="mt-4 p-4 rounded-xl bg-[#12080a] border border-rose-500/50 space-y-2">
            <div className="flex items-center gap-2 text-rose-400 font-bold font-mono text-xs">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500" />
              <span>CẢNH BÁO RỦI RO ĐẦU TƯ CHUẨN QUỐC TẾ (CFTC / FCA / ESMA STANDARD RISK DISCLOSURE)</span>
            </div>

            <div className="text-[11px] text-zinc-300 font-sans leading-relaxed space-y-1.5">
              <p>
                ⚠️ <strong>Cảnh Báo Về Đòn Bẩy &amp; Phái Sinh (High Risk Warning):</strong> Giao dịch ngoại hối (Forex), Hợp đồng chênh lệch (CFDs), Tiền mã hóa (Cryptocurrency) và Vàng giao ngay (Spot Gold) sử dụng đòn bẩy tài chính tiềm ẩn mức độ rủi ro rất cao và <strong>có thể không phù hợp với tất cả các nhà đầu tư</strong>.
              </p>
              <p>
                Mức đòn bẩy cao có thể hoạt động chống lại bạn cũng như ủng hộ bạn. Trước khi quyết định tham gia giao dịch, bạn nên cân nhắc kỹ lưỡng mục tiêu đầu tư, mức độ kinh nghiệm và khẩu vị chịu đựng rủi ro. <strong>Bạn có thể mất một phần hoặc toàn bộ số vốn đầu tư ban đầu</strong>.
              </p>
              <p>
                🤖 <strong>Tuyên Bố Về Tín Hiệu AI &amp; Khuyến Cáo Đầu Tư:</strong> Mọi phân tích, tín hiệu tự động từ mô hình trí tuệ nhân tạo (AI/Algorithmic Models), dữ liệu sổ lệnh hay backtest trên nền tảng chỉ mang tính chất <strong>công cụ hỗ trợ nghiên cứu kỹ thuật và mô phỏng giáo dục</strong>, không cấu thành bất kỳ lời khuyên tài chính, đầu tư hay khuyến nghị mua bán cụ thể nào. Quản trị rủi ro và bảo vệ vốn là trách nhiệm duy nhất của nhà đầu tư.
              </p>
            </div>

            <div className="pt-2 border-t border-rose-900/60 flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-mono text-zinc-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hasAcknowledgedRisk}
                  onChange={(e) => setHasAcknowledgedRisk(e.target.checked)}
                  className="w-4 h-4 rounded border-rose-500 text-rose-600 focus:ring-rose-500 bg-slate-900 cursor-pointer"
                />
                <span className="text-[11px]">Tôi đã đọc, hiểu rõ cảnh báo rủi ro quốc tế và cam kết giao dịch có kỷ luật.</span>
              </label>

              <span className="text-[10px] font-mono text-zinc-500 hidden sm:inline">ISO/IEC Financial Risk Standards</span>
            </div>
          </div>
        </div>

        {/* Footer Navigation Bar */}
        <div className="px-5 py-3.5 border-t border-slate-800 bg-[#060a12] flex items-center justify-between text-xs font-mono">
          <button
            onClick={() => setActiveStep((prev) => Math.max(0, prev - 1))}
            disabled={activeStep === 0}
            className="min-h-[34px] px-3.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-zinc-300 rounded-lg text-xs font-bold transition disabled:opacity-40 cursor-pointer"
          >
            ← Bước Trước
          </button>

          <div className="flex items-center gap-2">
            {activeStep < guideSteps.length - 1 ? (
              <button
                onClick={() => setActiveStep((prev) => Math.min(guideSteps.length - 1, prev + 1))}
                className="min-h-[34px] px-4 bg-teal-600 hover:bg-teal-500 text-slate-950 font-bold rounded-lg text-xs transition active:scale-95 cursor-pointer shadow-md flex items-center gap-1"
              >
                <span>Bước Kế Tiếp →</span>
              </button>
            ) : (
              <button
                onClick={onClose}
                className="min-h-[34px] px-4 bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 font-bold rounded-lg text-xs transition active:scale-95 cursor-pointer shadow-lg flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4 text-slate-950" />
                <span>Hoàn Tất &amp; Bắt Đầu Trải Nghiệm</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
