/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * OPC Trade Lab V1 — Unified Settings & Gateways Hub
 * Consolidates MT4/MT5 connection gateways, real exchange API credentials,
 * demo capital presets, and session risk configurations into a clean, unified menu.
 */

import React, { useState } from 'react';
import {
  X,
  Settings,
  Server,
  Key,
  DollarSign,
  Clock,
  ShieldCheck,
  Check,
  RefreshCw,
  ExternalLink,
  Cpu,
  Layers,
  Sparkles,
  Eye,
  EyeOff,
  AlertTriangle,
  Zap,
  Sliders,
  BookOpen,
  ShieldAlert,
  BellRing,
  TrendingUp,
  TrendingDown,
  Volume2,
  VolumeX,
  Database,
  Save,
  RotateCcw
} from 'lucide-react';
import { AccountMode, RealAccountConfig } from '../../App.tsx';
import { MarketSession } from './SessionAutoCloseSettings.tsx';

interface SettingsGatewayModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'gateways' | 'api_exchange' | 'capital' | 'session_close' | 'ai_speed' | 'guide' | 'appearance';
  // Navigation
  onNavigateToScreen: (screen: 'command_center' | 'ai_auto' | 'overview' | 'inspector' | 'alerts_history' | 'strategy' | 'settings' | 'mt4_bridge' | 'mt5_bridge' | 'emergency_dashboard') => void;
  currentScreen?: string;
  // Single Active Gateway (MT5 or MT4)
  activeTradingGateway?: 'MT5' | 'MT4';
  onSelectActiveGateway?: (gateway: 'MT5' | 'MT4') => void;
  // Toolbar Visibility Toggle
  showGatewaysToolbar: boolean;
  onToggleGatewaysToolbar: () => void;
  // Sound & Threshold Settings (Auto-saved to localStorage)
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  volatilityThresholdPct?: number;
  onSelectVolatilityThreshold?: (val: number) => void;
  onResetAllSettings?: () => void;
  // Account & Capital
  accountMode: AccountMode;
  onToggleAccountMode: (mode: AccountMode) => void;
  demoCapitalPreset: number;
  onResetDemoCapital: (amount: number) => void;
  demoNav: number;
  // Real API Config
  realConfig: RealAccountConfig;
  onUpdateRealConfig: (config: any) => void;
  onVerifyRealKeys: () => void;
  isVerifyingKey: boolean;
  verifyMessage: string | null;
  // Session Auto-Close
  autoCloseEnabled: boolean;
  onToggleAutoClose: (enabled: boolean) => void;
  selectedSession: MarketSession;
  onSelectSession: (session: MarketSession) => void;
  sessionTimeRemaining: number;
  // AI Execution Frequency (Interval)
  aiIntervalSec?: number;
  onUpdateAiInterval?: (seconds: number) => void;
  onOpenBeginnerGuide?: () => void;
  onOpenProfile?: () => void;
}

export const SettingsGatewayModal: React.FC<SettingsGatewayModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'gateways',
  onNavigateToScreen,
  currentScreen,
  activeTradingGateway = 'MT5',
  onSelectActiveGateway,
  showGatewaysToolbar,
  onToggleGatewaysToolbar,
  soundEnabled = true,
  onToggleSound,
  volatilityThresholdPct = 0.15,
  onSelectVolatilityThreshold,
  onResetAllSettings,
  accountMode,
  onToggleAccountMode,
  demoCapitalPreset,
  onResetDemoCapital,
  demoNav,
  realConfig,
  onUpdateRealConfig,
  onVerifyRealKeys,
  isVerifyingKey,
  verifyMessage,
  autoCloseEnabled,
  onToggleAutoClose,
  selectedSession,
  onSelectSession,
  sessionTimeRemaining,
  aiIntervalSec = 4.5,
  onUpdateAiInterval,
  onOpenBeginnerGuide,
  onOpenProfile
}) => {
  const [activeTab, setActiveTab] = useState<'gateways' | 'api_exchange' | 'capital' | 'session_close' | 'ai_speed' | 'guide' | 'appearance'>(initialTab);
  const [customCapitalInput, setCustomCapitalInput] = useState<string>('');
  const [customIntervalInput, setCustomIntervalInput] = useState<string>(aiIntervalSec.toString());

  // Sync initialTab when modal reopens
  React.useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const formatRemainingShort = (totalSeconds: number) => {
    if (totalSeconds <= 0) return '00:00:00';
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-hub-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in"
    >
      <div className="relative w-full max-w-3xl bg-[#090e17] border-t sm:border border-cyan-500/40 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[92vh]">
        {/* Header - Optimized for touch target >=44px */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-slate-800 bg-[#070b12]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-950/80 border border-cyan-500/50 flex items-center justify-center text-cyan-400 shrink-0">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 id="settings-hub-title" className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5 flex-wrap">
                <span>Trung Tâm Cài Đặt &amp; Cổng</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700/60 font-semibold">
                  Unified Gateway Hub
                </span>
              </h2>
              <p className="text-[10px] sm:text-[11px] text-zinc-400 line-clamp-1">
                Gom gọn MT4, MT5, API sàn, vốn demo và chốt phiên cho Mobile &amp; PC
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenProfile && (
              <button
                onClick={() => {
                  onClose();
                  onOpenProfile();
                }}
                className="min-h-[36px] px-2.5 bg-[#0d1726] hover:bg-[#14233a] border border-[#213554] text-teal-300 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer active:scale-95 shrink-0"
                title="Mở hồ sơ cá nhân và quản lý lịch sử lệnh thật (Trades History)"
              >
                <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-teal-500 to-amber-500 flex items-center justify-center text-slate-950 font-bold text-[9px]">
                  VC
                </div>
                <span className="hidden sm:inline">Hồ Sơ &amp; Lịch Sử</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="min-w-[40px] min-h-[40px] rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 flex items-center justify-center text-zinc-400 hover:text-white transition cursor-pointer active:scale-95 shrink-0"
              title="Đóng cửa sổ"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Selector Bar - Horizontal scrolling on Mobile with touch snap & no scrollbar slop */}
        <div className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-[#060a10] border-b border-slate-800 overflow-x-auto no-scrollbar font-mono text-xs">
          <button
            onClick={() => setActiveTab('gateways')}
            className={`min-h-[40px] sm:min-h-[34px] px-3 rounded-lg font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0 ${
              activeTab === 'gateways'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Cổng MT4 / MT5</span>
          </button>

          <button
            onClick={() => setActiveTab('api_exchange')}
            className={`min-h-[40px] sm:min-h-[34px] px-3 rounded-lg font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0 ${
              activeTab === 'api_exchange'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Khóa API Sàn</span>
            {realConfig.isConnected && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('capital')}
            className={`min-h-[40px] sm:min-h-[34px] px-3 rounded-lg font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0 ${
              activeTab === 'capital'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Cấp Vốn Demo</span>
          </button>

          <button
            onClick={() => setActiveTab('session_close')}
            className={`min-h-[40px] sm:min-h-[34px] px-3 rounded-lg font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0 ${
              activeTab === 'session_close'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Chốt Phiên</span>
            {autoCloseEnabled && (
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab('ai_speed');
              setCustomIntervalInput(aiIntervalSec.toString());
            }}
            className={`min-h-[40px] sm:min-h-[34px] px-3 rounded-lg font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0 ${
              activeTab === 'ai_speed'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Tần Suất AI ({aiIntervalSec}s)</span>
          </button>

          <button
            onClick={() => setActiveTab('appearance')}
            className={`min-h-[40px] sm:min-h-[34px] px-3 rounded-lg font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0 ${
              activeTab === 'appearance'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            <span>Tùy Chọn &amp; Tự Động Lưu</span>
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`min-h-[40px] sm:min-h-[34px] px-3 rounded-lg font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0 ${
              activeTab === 'guide'
                ? 'bg-gradient-to-r from-teal-500 to-emerald-400 text-slate-950 shadow-sm'
                : 'text-teal-400 hover:text-teal-300 hover:bg-slate-900 border border-teal-500/30'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Hướng Dẫn 🔰</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 font-sans text-xs">
          {/* TAB 1: CỔNG KẾT NỐI METATRADER 4 & 5 */}
          {activeTab === 'gateways' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Server className="w-4 h-4 text-cyan-400" />
                    <span>Cổng Kết Nối Chuẩn MetaTrader (MT4 / MT5 Gateways)</span>
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Truy cập hoặc cấu hình trực tiếp các cầu nối tài khoản giao dịch Forex, Vàng Spot &amp; Crypto.
                  </p>
                </div>

                {/* Show/Hide Quick Toolbar toggle */}
                <button
                  onClick={onToggleGatewaysToolbar}
                  className={`min-h-[32px] px-3 rounded-lg font-mono text-[11px] font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer ${
                    showGatewaysToolbar
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-600'
                      : 'bg-slate-900 text-zinc-400 border border-slate-700 hover:text-white'
                  }`}
                  title="Bật/Tắt thanh phím tắt Cổng MT4/5 trên giao diện chính"
                >
                  {showGatewaysToolbar ? (
                    <>
                      <Eye className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Đang Hiện Phím Tắt Trên Giao Diện</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Đang Ẩn Phím Tắt (Màn Hình Tối Ưu)</span>
                    </>
                  )}
                </button>
              </div>

              {/* Single Active Gateway Selector Panel */}
              <div className="p-3.5 rounded-xl border border-cyan-500/30 bg-[#08101d] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                      Cổng Giao Dịch Đang Dùng (Single Active Gateway)
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/60 font-bold">
                    {activeTradingGateway === 'MT5' ? 'ĐANG CHỌN MT5 (ĐÃ ẨN MT4)' : 'ĐANG CHỌN MT4 (ĐÃ ẨN MT5)'}
                  </span>
                </div>

                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  Để màn hình giao dịch luôn gọn gàng, ứng dụng chỉ hiển thị <strong>duy nhất 1 cổng giao dịch đang chọn</strong> trên thanh điều hướng và menu. Khi bạn chọn <strong>MT5</strong>, cổng MT4 sẽ được ẩn hoàn toàn để không rối mắt.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (onSelectActiveGateway) onSelectActiveGateway('MT5');
                    }}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer active:scale-95 flex items-center justify-between ${
                      activeTradingGateway === 'MT5'
                        ? 'bg-teal-950/70 border-teal-500 shadow-md ring-1 ring-teal-500/50 text-white'
                        : 'bg-slate-900/60 border-slate-800 text-zinc-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded bg-teal-500/20 text-teal-400 flex items-center justify-center font-mono font-bold text-xs border border-teal-500/40">
                        5
                      </span>
                      <div>
                        <div className="font-bold text-xs text-teal-300">Cổng MT5 (Khuyên dùng)</div>
                        <div className="text-[10px] text-zinc-400 font-mono">FTMO #1514763831 · Exness</div>
                      </div>
                    </div>
                    {activeTradingGateway === 'MT5' ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-teal-500 text-slate-950 rounded font-mono">
                        ĐANG HIỆN
                      </span>
                    ) : (
                      <span className="text-[10px] text-zinc-500 hover:text-teal-400 font-mono">
                        Bấm để hiện
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (onSelectActiveGateway) onSelectActiveGateway('MT4');
                    }}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer active:scale-95 flex items-center justify-between ${
                      activeTradingGateway === 'MT4'
                        ? 'bg-blue-950/70 border-blue-500 shadow-md ring-1 ring-blue-500/50 text-white'
                        : 'bg-slate-900/60 border-slate-800 text-zinc-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded bg-blue-500/20 text-blue-400 flex items-center justify-center font-mono font-bold text-xs border border-blue-500/40">
                        4
                      </span>
                      <div>
                        <div className="font-bold text-xs text-blue-300">Cổng MT4 (Legacy)</div>
                        <div className="text-[10px] text-zinc-400 font-mono">MQL4 Socket · WebRequest</div>
                      </div>
                    </div>
                    {activeTradingGateway === 'MT4' ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-500 text-white rounded font-mono">
                        ĐANG HIỆN
                      </span>
                    ) : (
                      <span className="text-[10px] text-zinc-500 hover:text-blue-400 font-mono">
                        Bấm để hiện
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Gateway Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* MT5 Card */}
                <div className="p-4 rounded-xl border border-teal-500/50 bg-gradient-to-b from-[#091524] to-[#070d18] flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded bg-teal-500/20 text-teal-400 flex items-center justify-center font-mono font-bold text-xs border border-teal-500/40">
                          5
                        </span>
                        <span className="font-bold text-white text-sm">Cổng MT5 API Gateway</span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700/60 font-bold flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
                        80+ MCP Tools
                      </span>
                    </div>

                    <p className="text-[11px] text-zinc-300 leading-relaxed font-sans">
                      Kiến trúc 64-bit mới nhất với bộ nhớ chia sẻ (<strong className="text-teal-300">&lt;2ms</strong>) và giao thức <strong>Model Context Protocol (MCP)</strong> cắm thẳng Claude / GPT-4.
                    </p>

                    <div className="font-mono text-[10px] text-zinc-400 space-y-0.5 pt-1 border-t border-slate-800">
                      <div>Protocol: <span className="text-teal-400 font-bold">Python IPC + JSON-RPC stdio</span></div>
                      <div>Hỗ trợ: Hedging, Netting, Atomic SL/TP, Sổ lệnh L2 DOM</div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      onNavigateToScreen('mt5_bridge');
                      onClose();
                    }}
                    className="w-full min-h-[38px] px-3 bg-teal-600 hover:bg-teal-500 text-slate-950 font-bold font-mono text-xs rounded-xl flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer shadow-md"
                  >
                    <span>Mở Bảng Điều Khiển Cổng MT5</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* MT4 Card */}
                <div className="p-4 rounded-xl border border-blue-500/40 bg-gradient-to-b from-[#0a1224] to-[#070d18] flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded bg-blue-500/20 text-blue-400 flex items-center justify-center font-mono font-bold text-xs border border-blue-500/40">
                          4
                        </span>
                        <span className="font-bold text-white text-sm">Cổng MT4 API Gateway</span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-700/60 font-bold">
                        MQL4 Bridge
                      </span>
                    </div>

                    <p className="text-[11px] text-zinc-300 leading-relaxed font-sans">
                      Cầu nối kết nối các broker Forex truyền thống sử dụng giao thức ZeroMQ / REST Local Loopback Server.
                    </p>

                    <div className="font-mono text-[10px] text-zinc-400 space-y-0.5 pt-1 border-t border-slate-800">
                      <div>Độ trễ trung bình: <span className="text-blue-400 font-bold">~12ms</span></div>
                      <div>Hỗ trợ: XAUUSD, EURUSD, GBPUSD, Crypto CFDs</div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      onNavigateToScreen('mt4_bridge');
                      onClose();
                    }}
                    className="w-full min-h-[38px] px-3 bg-blue-600 hover:bg-blue-500 text-white font-bold font-mono text-xs rounded-xl flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer shadow-md"
                  >
                    <span>Mở Bảng Điều Khiển Cổng MT4</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Quick Summary Note */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-zinc-400 leading-relaxed">
                💡 <strong>Giao diện chính tinh gọn:</strong> Nếu bạn chỉ tập trung vào phân tích biểu đồ và theo dõi luồng lệnh thực tế, bạn có thể <strong>ẨN</strong> thanh phím tắt cổng kết nối. Cả MT4 và MT5 sẽ vẫn chạy ngầm và bạn có thể mở lại menu này bất cứ lúc nào qua nút <strong>Cài Đặt</strong> trên Header.
              </div>
            </div>
          )}

          {/* TAB 2: KHÓA API SÀN THẬT */}
          {activeTab === 'api_exchange' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Key className="w-4 h-4 text-amber-400" />
                    <span>Cấu Hình Khóa API Sàn Giao Dịch Thật (Real Exchange Keys)</span>
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Hỗ trợ xác thực HMAC-SHA256 trên Binance, Polymarket, Bybit và OKX.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-zinc-400">Chế độ tài khoản:</span>
                  <div className="flex rounded-lg bg-slate-900 p-0.5 border border-slate-700 font-mono text-[10px]">
                    <button
                      onClick={() => onToggleAccountMode('DEMO')}
                      className={`px-2 py-1 rounded font-bold transition cursor-pointer ${
                        accountMode === 'DEMO' ? 'bg-teal-500 text-slate-950' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      DEMO
                    </button>
                    <button
                      onClick={() => onToggleAccountMode('REAL')}
                      className={`px-2 py-1 rounded font-bold transition cursor-pointer ${
                        accountMode === 'REAL' ? 'bg-amber-500 text-slate-950' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      REAL
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 font-mono">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Chọn Sàn Giao Dịch</label>
                    <select
                      value={realConfig.exchange}
                      onChange={(e) => onUpdateRealConfig({ ...realConfig, exchange: e.target.value as any })}
                      className="w-full bg-slate-900 border border-slate-700 px-3 py-2 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-amber-400 min-h-[38px]"
                    >
                      <option value="binance">Binance (CEX Số 1)</option>
                      <option value="polymarket">Polymarket (CLOB)</option>
                      <option value="bybit">Bybit</option>
                      <option value="okx">OKX</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">API Key</label>
                    <input
                      type="password"
                      placeholder="Nhập API Key sàn"
                      value={realConfig.apiKey}
                      onChange={(e) => onUpdateRealConfig({ ...realConfig, apiKey: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 px-3 py-2 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-amber-400 min-h-[38px]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">API Secret</label>
                    <input
                      type="password"
                      placeholder="Nhập API Secret"
                      value={realConfig.apiSecret}
                      onChange={(e) => onUpdateRealConfig({ ...realConfig, apiSecret: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 px-3 py-2 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-amber-400 min-h-[38px]"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
                  <div className="flex items-center gap-2 text-[11px]">
                    {realConfig.isConnected ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5" />
                        ĐÃ KẾT NỐI SÀN THẬT (Số dư khả dụng: ${realConfig.realBalanceUsdt} USDT)
                      </span>
                    ) : (
                      <span className="text-zinc-400 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                        Chỉ bật quyền <strong>Trade</strong>. Tuyệt đối <strong>KHÔNG</strong> bật quyền rút tiền.
                      </span>
                    )}
                  </div>

                  <button
                    onClick={onVerifyRealKeys}
                    disabled={isVerifyingKey}
                    className="min-h-[36px] px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs font-mono transition active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-md"
                  >
                    {isVerifyingKey ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5" />}
                    <span>{realConfig.isConnected ? 'Kiểm Tra Lại Kết Nối' : 'Xác Thực &amp; Kết Nối Sàn'}</span>
                  </button>
                </div>

                {verifyMessage && (
                  <div className="p-2.5 rounded-lg bg-amber-950/80 border border-amber-700 text-amber-200 text-xs">
                    {verifyMessage}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: QUẢN TRỊ VỐN DEMO */}
          {activeTab === 'capital' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-teal-400" />
                  <span>Quản Trị Vốn Demo &amp; Đặt Lại Số Dư NAV (Paper Trading Capital)</span>
                </h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Số dư hiện tại: <strong className="text-teal-300 font-mono">${demoNav.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT</strong>
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 font-mono">
                <label className="text-[10px] text-zinc-400 uppercase tracking-wider block">
                  Chọn Mức Vốn Cấp Sẵn (Presets):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[1000, 5000, 10000, 50000].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => onResetDemoCapital(amt)}
                      className={`min-h-[44px] rounded-xl font-mono text-xs font-bold transition cursor-pointer flex flex-col items-center justify-center ${
                        demoCapitalPreset === amt
                          ? 'bg-teal-500 text-slate-950 shadow-md'
                          : 'bg-slate-900 border border-slate-700 text-zinc-300 hover:bg-slate-800'
                      }`}
                    >
                      <span>${amt.toLocaleString()}</span>
                      <span className="text-[9px] font-normal opacity-80">
                        {amt === 10000 ? 'Chuẩn Quỹ' : amt === 50000 ? 'Pro Trader' : 'Khởi Nghiệp'}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Nhập số vốn tự chọn (USDT)"
                    value={customCapitalInput}
                    onChange={(e) => setCustomCapitalInput(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700 px-3 py-2 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-teal-400 min-h-[38px]"
                  />
                  <button
                    onClick={() => {
                      const val = parseFloat(customCapitalInput);
                      if (val > 0) {
                        onResetDemoCapital(val);
                        setCustomCapitalInput('');
                      }
                    }}
                    className="min-h-[38px] px-4 bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 rounded-lg text-xs font-bold font-mono transition cursor-pointer active:scale-95"
                  >
                    Áp Dụng Vốn Mới
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: TỰ ĐỘNG ĐÓNG PHIÊN (SESSION RISK) */}
          {activeTab === 'session_close' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-teal-400" />
                    <span>Lên Lịch Tự Động Đóng Vị Thế Khi Hết Phiên (Session Auto-Close)</span>
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Thời gian còn lại: <strong className="text-teal-300 font-mono">{formatRemainingShort(sessionTimeRemaining)}</strong>
                  </p>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={autoCloseEnabled}
                  onClick={() => onToggleAutoClose(!autoCloseEnabled)}
                  className={`min-h-[32px] px-3 rounded-lg font-mono text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer ${
                    autoCloseEnabled
                      ? 'bg-teal-950 text-teal-300 border border-teal-600'
                      : 'bg-slate-900 text-zinc-400 border border-slate-700 hover:text-white'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{autoCloseEnabled ? 'ĐANG BẬT TỰ ĐỘNG' : 'ĐÃ TẮT'}</span>
                </button>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 font-mono">
                <label className="text-[10px] text-zinc-400 uppercase tracking-wider block">
                  Chọn Phiên Thị Trường:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {[
                    { id: 'NEW_YORK', name: 'New York', time: '17:00 EDT (04:00 VN)' },
                    { id: 'LONDON', name: 'London', time: '16:30 BST (22:30 VN)' },
                    { id: 'TOKYO', name: 'Tokyo', time: '15:00 JST (13:00 VN)' },
                    { id: 'CRYPTO_DAILY', name: 'Binance UTC', time: '00:00 UTC (07:00 VN)' }
                  ].map((sess) => (
                    <button
                      key={sess.id}
                      onClick={() => onSelectSession(sess.id as MarketSession)}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                        selectedSession === sess.id
                          ? 'bg-teal-950/60 border-teal-500 text-white shadow-sm'
                          : 'bg-slate-900 border-slate-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <div className="font-bold flex items-center justify-between">
                        <span>{sess.name}</span>
                        {selectedSession === sess.id && <Check className="w-3 h-3 text-teal-400" />}
                      </div>
                      <span className="text-[10px] text-zinc-400 mt-1">{sess.time}</span>
                    </button>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-zinc-400 font-sans">
                  <span>Xem cài đặt đệm an toàn và nhật ký chi tiết:</span>
                  <button
                    onClick={() => {
                      onNavigateToScreen('settings');
                      onClose();
                    }}
                    className="text-teal-400 hover:text-teal-300 font-mono font-bold flex items-center gap-1"
                  >
                    <span>Mở Toàn Bộ Trang Cài Đặt</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: TẦN SUẤT & TỐC ĐỘ THỰC THI AI (AI EXECUTION INTERVAL) */}
          {activeTab === 'ai_speed' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  <span>Tùy Chỉnh Tần Suất &amp; Tốc Độ Thực Thi AI (Execution Loop Interval)</span>
                </h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Điều chỉnh chu kỳ thời gian giữa các bước lặp AI Auto (Quét sổ lệnh $\rightarrow$ Định lượng $\rightarrow$ Kiểm soát rủi ro $\rightarrow$ Khớp lệnh $\rightarrow$ Khóa lợi nhuận).
                </p>
              </div>

              {/* Current Speed Indicator Card */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono">
                <div>
                  <div className="text-[10px] text-zinc-400 uppercase tracking-wider">Tần Suất Hiện Tại:</div>
                  <div className="text-xl font-bold text-cyan-300 flex items-center gap-2 mt-0.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping shrink-0" />
                    <span>{aiIntervalSec} Giây / Bước Lặp</span>
                  </div>
                  <div className="text-[11px] text-zinc-500 font-sans mt-0.5">
                    {aiIntervalSec <= 2.5
                      ? '⚡ Tốc độ cao (High Frequency): Thích hợp lướt sóng biến động giật nhanh'
                      : aiIntervalSec <= 6.0
                      ? '⚖️ Cân bằng tiêu chuẩn (Standard): Tối ưu độ trễ và phân tích sổ lệnh'
                      : '🛡️ Thận trọng (Conservative): Giảm tần suất giao dịch, bảo toàn vốn'}
                  </div>
                </div>

                <div className="text-right sm:text-right text-[11px] text-zinc-400">
                  <span className="px-2.5 py-1 rounded-lg bg-cyan-950/80 border border-cyan-700/60 text-cyan-300 font-bold">
                    {(60 / aiIntervalSec).toFixed(1)} chu kỳ / phút
                  </span>
                </div>
              </div>

              {/* Preset Speed Buttons */}
              <div className="space-y-2">
                <label className="text-[11px] font-mono text-zinc-300 block">
                  Chọn Tần Suất Gợi Ý Sẵn (Presets):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
                  {[
                    { sec: 1.5, label: 'Siêu Nhanh', desc: '1.5s (Scalping)' },
                    { sec: 3.0, label: 'Nhanh', desc: '3.0s (Momentum)' },
                    { sec: 4.5, label: 'Tiêu Chuẩn', desc: '4.5s (Mặc định)' },
                    { sec: 8.0, label: 'Thận Trọng', desc: '8.0s (Swing)' },
                    { sec: 12.0, label: 'Chậm An Toàn', desc: '12.0s' },
                    { sec: 20.0, label: 'Phiên Dài', desc: '20.0s' }
                  ].map((preset) => {
                    const isSelected = aiIntervalSec === preset.sec;
                    return (
                      <button
                        key={preset.sec}
                        onClick={() => {
                          onUpdateAiInterval?.(preset.sec);
                          setCustomIntervalInput(preset.sec.toString());
                        }}
                        className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between active:scale-95 ${
                          isSelected
                            ? 'bg-cyan-950/70 border-cyan-400 text-white shadow-md ring-1 ring-cyan-400/50'
                            : 'bg-slate-950 border-slate-800 text-zinc-400 hover:text-white hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-sm">{preset.sec}s</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                        </div>
                        <div className="text-[10px] text-zinc-400 mt-1 font-sans">{preset.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Interval Input (1.0s - 60.0s) */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 font-mono">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-white font-bold flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Nhập Tần Suất Tùy Chọn Của Riêng Bạn:</span>
                  </label>
                  <span className="text-[10px] text-zinc-400">Giới hạn: 1.0s &ndash; 60.0s</span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min={1}
                      max={60}
                      step={0.5}
                      value={customIntervalInput}
                      onChange={(e) => setCustomIntervalInput(e.target.value)}
                      placeholder="VD: 5.0"
                      className="w-full bg-[#080d16] border border-slate-700 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-white font-mono text-sm focus:outline-none min-h-[44px]"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 font-bold">
                      giây (sec)
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      const val = parseFloat(customIntervalInput);
                      if (!isNaN(val) && val >= 1.0 && val <= 60.0) {
                        onUpdateAiInterval?.(val);
                      }
                    }}
                    className="min-h-[44px] px-5 bg-cyan-500 hover:bg-cyan-400 active:scale-95 text-slate-950 font-bold text-xs rounded-xl transition cursor-pointer shrink-0 shadow-md flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Lưu Tần Suất</span>
                  </button>
                </div>

                {/* Slider bar for quick ergonomic adjustment */}
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-[10px] text-zinc-500">
                    <span>1.0s (Nhanh nhất)</span>
                    <span className="text-cyan-400 font-bold">{aiIntervalSec}s</span>
                    <span>60.0s (Chậm nhất)</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={30}
                    step={0.5}
                    value={aiIntervalSec}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      onUpdateAiInterval?.(val);
                      setCustomIntervalInput(val.toString());
                    }}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>
              </div>

              {/* Direct link to AI Auto screen */}
              <div className="flex items-center justify-between pt-1 text-[11px] font-mono text-zinc-400">
                <span>Quan sát tiến trình 5 bước thực thi tại:</span>
                <button
                  onClick={() => {
                    onNavigateToScreen('ai_auto');
                    onClose();
                  }}
                  className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span>Mở Màn Hình AI Auto Trading →</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: TÙY CHỌN HIỂN THỊ (GOM GỌN / ẨN HIỆN NÚT) */}
          {activeTab === 'appearance' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Save className="w-4 h-4 text-cyan-400" />
                  <span>Tùy Chọn Cá Nhân &amp; Tự Động Lưu (LocalStorage Engine)</span>
                </h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Tự động lưu tức thì mọi cài đặt vào bộ nhớ trình duyệt (localStorage), không lo mất cấu hình khi F5 tải lại trang.
                </p>
              </div>

              <div className="space-y-3 font-mono text-xs">
                {/* 1. Sound Toggle Control */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="font-bold text-white flex items-center gap-2">
                      {soundEnabled ? (
                        <Volume2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <VolumeX className="w-4 h-4 text-zinc-500" />
                      )}
                      <span>Âm Thanh Cảnh Báo &amp; Khớp Lệnh (Synthesizer Audio)</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 font-sans">
                      Phát tín hiệu âm thanh tần số chuẩn Web Audio API khi giá phá ngưỡng biến động hoặc khi AI kích hoạt chốt lời/cắt lỗ.
                    </p>
                  </div>

                  {onToggleSound && (
                    <button
                      onClick={onToggleSound}
                      className={`min-h-[36px] px-3.5 rounded-xl font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shrink-0 ${
                        soundEnabled
                          ? 'bg-emerald-500 text-slate-950 shadow-sm'
                          : 'bg-slate-900 border border-slate-700 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {soundEnabled ? (
                        <>
                          <Volume2 className="w-4 h-4" />
                          <span>ĐANG BẬT</span>
                        </>
                      ) : (
                        <>
                          <VolumeX className="w-4 h-4" />
                          <span>ĐÃ TẮT</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* 2. Volatility Threshold Presets */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-white flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                      <span>Ngưỡng Kích Hoạt Cảnh Báo Biến Động (Volatility Threshold)</span>
                    </div>
                    <span className="text-[11px] font-bold text-amber-400 bg-amber-950/60 border border-amber-800/80 px-2 py-0.5 rounded">
                      Hiện tại: {volatilityThresholdPct}% / 20s
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 font-sans">
                    Hệ thống sẽ kích hoạt Toast và âm báo khi giá BTCUSDT hoặc tài sản theo dõi biến động vượt ngưỡng phần trăm này trong vòng 20 giây:
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    {[0.10, 0.15, 0.25, 0.50].map((thr) => (
                      <button
                        key={thr}
                        onClick={() => onSelectVolatilityThreshold && onSelectVolatilityThreshold(thr)}
                        className={`min-h-[36px] px-3 rounded-lg font-bold flex items-center justify-center gap-1 transition cursor-pointer active:scale-95 ${
                          volatilityThresholdPct === thr
                            ? 'bg-amber-500 text-slate-950 shadow-sm ring-2 ring-amber-400/50'
                            : 'bg-slate-900 border border-slate-800 text-zinc-300 hover:border-slate-700'
                        }`}
                      >
                        <span>{thr.toFixed(2)}%</span>
                        {volatilityThresholdPct === thr && <Check className="w-3.5 h-3.5 ml-1" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. LocalStorage Persistence Status & Reset */}
                <div className="p-4 rounded-xl bg-[#08121f] border border-cyan-800/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-cyan-400" />
                      <span className="font-bold text-cyan-300">Bộ Nhớ Cục Bộ (LocalStorage Engine)</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-700/60 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      TỰ ĐỘNG LƯU: ĐANG BẬT
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-300 font-sans leading-relaxed">
                    Hệ thống tự động đồng bộ liên tục vào khóa <code className="text-cyan-300 bg-slate-900 px-1 py-0.5 rounded">opc_user_settings_v1</code>:
                    âm thanh, ngưỡng biến động, máy chủ &amp; tài khoản MT5 (FTMO/Exness), MT4, thời gian chốt phiên và tốc độ AI.
                  </p>

                  {onResetAllSettings && (
                    <div className="pt-1 flex items-center justify-end">
                      <button
                        onClick={() => {
                          if (window.confirm('Anh có chắc muốn khôi phục toàn bộ cài đặt (âm thanh, ngưỡng biến động, cổng MT4/MT5) về mặc định ban đầu không?')) {
                            onResetAllSettings();
                          }
                        }}
                        className="min-h-[34px] px-3 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-800/80 text-rose-300 font-bold text-[11px] flex items-center gap-1.5 transition cursor-pointer active:scale-95"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Khôi Phục Cài Đặt Gốc (Reset All)</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* 4. Gateways Floating Toolbar Toggle */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="font-bold text-white flex items-center gap-2">
                      <span>Thanh Phím Tắt Cổng MT4 / MT5 Trên Màn Hình Chính</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 font-sans">
                      Khi tắt, thanh phím tắt floating ở góc dưới sẽ ẩn đi hoàn toàn, nhường trọn không gian cho dữ liệu thị trường và khớp lệnh.
                    </p>
                  </div>

                  <button
                    onClick={onToggleGatewaysToolbar}
                    className={`min-h-[36px] px-3.5 rounded-xl font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shrink-0 ${
                      showGatewaysToolbar
                        ? 'bg-emerald-600 text-slate-950'
                        : 'bg-slate-900 border border-slate-700 text-zinc-300 hover:bg-slate-800'
                    }`}
                  >
                    {showGatewaysToolbar ? (
                      <>
                        <Eye className="w-4 h-4" />
                        <span>ĐANG HIỆN</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-4 h-4 text-zinc-500" />
                        <span>ĐÃ ẨN</span>
                      </>
                    )}
                  </button>
                </div>

                {/* 5. Direct quick action: Go to clean Command Center */}
                <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/30 flex items-center justify-between gap-4">
                  <div>
                    <div className="font-bold text-cyan-300">Chuyển Sang Command Center Chuẩn Quỹ</div>
                    <p className="text-[11px] text-zinc-300 font-sans mt-0.5">
                      Giao diện phân tích đa khung thời gian với biểu đồ sâu, tape giao dịch và sổ lệnh trực quan.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      onNavigateToScreen('command_center');
                      onClose();
                    }}
                    className="min-h-[36px] px-3.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded-xl flex items-center gap-1.5 transition active:scale-95 cursor-pointer shrink-0"
                  >
                    <span>Vào Terminal</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: MENU HƯỚNG DẪN NHANH TRADER MỚI & CẢNH BÁO RỦI RO */}
          {activeTab === 'guide' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-teal-400" />
                    <span>Lộ Trình Nhập Môn Dành Cho Trader Mới</span>
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Tập trung vào 4 điều trader mới mong muốn nhất: An toàn vốn, hiểu giao diện, tự động chốt phiên và quản trị rủi ro.
                  </p>
                </div>

                {onOpenBeginnerGuide && (
                  <button
                    onClick={() => {
                      onOpenBeginnerGuide();
                      onClose();
                    }}
                    className="min-h-[32px] px-3 bg-teal-600 hover:bg-teal-500 text-slate-950 font-mono text-[11px] font-bold rounded-lg flex items-center gap-1.5 cursor-pointer transition active:scale-95 shadow-md"
                  >
                    <span>Mở Tour Tương Tác 4 Bước</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* 4 Cards Quick Menu */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
                {/* 1. Paper Trading */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-teal-500/40 space-y-2">
                  <div className="flex items-center justify-between text-teal-300 font-bold">
                    <span>1. Thử Nghiệm Vốn Ảo (Paper Trading)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-800">
                      KHÔNG RỦI RO
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-300 font-sans leading-relaxed">
                    Được cấp sẵn $10,000 USDT ảo. Hãy luyện tập đặt lệnh, theo dõi biến động nến và thử nghiệm bot AI trước khi nghĩ đến việc nạp tiền thật.
                  </p>
                  <button
                    onClick={() => {
                      onResetDemoCapital(10000);
                      onToggleAccountMode('DEMO');
                    }}
                    className="text-teal-400 hover:text-teal-300 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <span>Đặt Lại Vốn Demo $10,000 →</span>
                  </button>
                </div>

                {/* 2. Main Interface */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-cyan-500/40 space-y-2">
                  <div className="flex items-center justify-between text-cyan-300 font-bold">
                    <span>2. Màn Hình Ưu Tiên Cho Người Mới</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                      KHUYÊN DÙNG
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-300 font-sans leading-relaxed">
                    Hãy bắt đầu tại <strong>Command Center</strong> để xem biểu đồ nến, hoặc mở <strong>Desk Cấp Cứu 390px</strong> trên điện thoại để quan sát cách vào lệnh đơn giản nhất.
                  </p>
                  <button
                    onClick={() => {
                      onNavigateToScreen('command_center');
                      onClose();
                    }}
                    className="text-cyan-400 hover:text-cyan-300 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <span>Vào Command Center Ngay →</span>
                  </button>
                </div>

                {/* 3. Auto Close */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-emerald-500/40 space-y-2">
                  <div className="flex items-center justify-between text-emerald-300 font-bold">
                    <span>3. Không Bao Giờ Ôm Lệnh Qua Đêm</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                      KỶ LUẬT THUẦN QUỸ
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-300 font-sans leading-relaxed">
                    Bật tính năng <strong>Tự động đóng vị thế khi hết phiên</strong> (New York Close / London / Tokyo) để tránh phí qua đêm (Swap) và bão tin giật giá lúc bạn đang ngủ.
                  </p>
                  <button
                    onClick={() => setActiveTab('session_close')}
                    className="text-emerald-400 hover:text-emerald-300 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <span>Xem Cài Đặt Chốt Phiên →</span>
                  </button>
                </div>

                {/* 4. Kill Switch & API Safe */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-rose-500/40 space-y-2">
                  <div className="flex items-center justify-between text-rose-300 font-bold">
                    <span>4. Cầu Dao Khẩn Cấp &amp; Khóa An Toàn</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
                      BẢO MẬT TỐI THƯỢNG
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-300 font-sans leading-relaxed">
                    Nút <strong>Kill Switch</strong> màu đỏ trên thanh menu sẽ lập tức ngắt toàn bộ bot AI và khóa tài khoản khi có biến. Khóa API sàn tuyệt đối <strong>KHÔNG</strong> bật quyền rút tiền.
                  </p>
                  <button
                    onClick={() => setActiveTab('api_exchange')}
                    className="text-rose-400 hover:text-rose-300 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <span>Cấu Hình API An Toàn →</span>
                  </button>
                </div>

                {/* 5. Pop-up Notifications & Quick Buy/Sell */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-amber-500/40 space-y-2 sm:col-span-2">
                  <div className="flex items-center justify-between text-amber-300 font-bold">
                    <span className="flex items-center gap-1.5">
                      <BellRing className="w-4 h-4 text-amber-400" />
                      <span>5. Pop-up Báo Biến Động &amp; Khi Nào Bấm Khớp Mua / Bán Ngay</span>
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                      THỰC CHIẾN TỨC THÌ
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-sans text-zinc-300">
                    <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-700/50">
                      <strong className="text-emerald-400 block mb-0.5">🟢 Khớp Mua Ngay (BUY):</strong>
                      Bấm khi Pop-up xanh nổ sóng tăng + sổ lệnh Bids dày đặc hỗ trợ bên dưới + AI phát tín hiệu Breakout an toàn.
                    </div>
                    <div className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-700/50">
                      <strong className="text-rose-400 block mb-0.5">🔴 Khớp Bán Ngay (SELL):</strong>
                      Bấm khi Pop-up đỏ báo xả mạnh + sổ lệnh Asks đè nặng + cần mở vị thế Short đón đầu đà giảm hoặc thoát hàng phòng vệ.
                    </div>
                  </div>
                  <div className="pt-1 flex items-center justify-between text-[11px]">
                    <span className="text-zinc-400 font-sans">
                      Pop-up tự kích hoạt khi nến biến động &ge; 0.15% trong 20 giây.
                    </span>
                    <button
                      onClick={() => {
                        onNavigateToScreen('inspector');
                        onClose();
                      }}
                      className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer font-mono"
                    >
                      <span>Vào Xem Sổ Lệnh &amp; Nút Mua/Bán →</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* International Standard Risk Disclosure Box */}
              <div className="p-4 rounded-xl bg-[#12080a] border border-rose-500/50 space-y-2">
                <div className="flex items-center gap-2 text-rose-400 font-bold font-mono text-xs">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>CẢNH BÁO RỦI RO ĐẦU TƯ TÀI CHÍNH QUỐC TẾ (CFTC / FCA / ESMA STANDARD)</span>
                </div>
                <div className="text-[11px] text-zinc-300 font-sans leading-relaxed space-y-1.5">
                  <p>
                    ⚠️ <strong>Cảnh Báo Về Đòn Bẩy (Leverage &amp; Margin Risk):</strong> Giao dịch Forex, Phái sinh, Tiền mã hóa và Hợp đồng chênh lệch (CFDs) sử dụng đòn bẩy có mức độ rủi ro vốn cao và có thể dẫn đến việc mất toàn bộ số tiền đầu tư. Đòn bẩy có thể khuếch đại cả lợi nhuận lẫn thua lỗ.
                  </p>
                  <p>
                    🤖 <strong>Tuyên Bố Miễn Trừ Trách Nhiệm Về AI:</strong> Mọi tín hiệu kỹ thuật, phân tích từ mô hình AI hay dữ liệu sổ lệnh trong OPC Trade Lab chỉ nhằm mục đích nghiên cứu công nghệ và giả lập giáo dục, không cấu thành lời khuyên đầu tư tài chính. Bạn tự chịu trách nhiệm hoàn toàn đối với các quyết định giao dịch của mình.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-[#070b12] flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2 text-zinc-400 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>OPC Trade Lab V1 · Zero Distraction Architecture</span>
          </div>

          <button
            onClick={onClose}
            className="min-h-[32px] px-4 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white rounded-lg text-xs font-bold transition active:scale-95 cursor-pointer"
          >
            Đóng Menu
          </button>
        </div>
      </div>
    </div>
  );
};
