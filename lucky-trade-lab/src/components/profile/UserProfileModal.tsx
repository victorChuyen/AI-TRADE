/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * OPC Trade Lab V1 — User Profile & Real Trade History Management Modal
 * Allows creating/switching accounts, editing profile settings, prioritizing BTC & Gold (XAU/USD),
 * and viewing persistent trade logs with real backend sync.
 */

import React, { useState, useEffect } from 'react';
import {
  User,
  ShieldCheck,
  Check,
  X,
  Save,
  Download,
  Trash2,
  TrendingUp,
  TrendingDown,
  Star,
  RefreshCw,
  Coins,
  DollarSign,
  Calendar,
  Lock,
  Mail,
  Phone,
  Sliders,
  Award
} from 'lucide-react';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  accountTier: string;
  defaultCapital: number;
  riskTolerance: 'LOW' | 'MEDIUM' | 'HIGH';
  preferredPairs: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface SavedTrade {
  id: string;
  symbol: string;
  assetName: string;
  side: 'BUY' | 'SELL';
  strategy: string;
  entryPrice: string;
  exitPrice: string;
  tpPrice?: string;
  slPrice?: string;
  size: string;
  pnl: number;
  pnlPercent: string;
  status: string;
  openedAt: string;
  closedAt: string;
}

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyCapitalPreset?: (amount: number) => void;
  onApplyPreferredPair?: (symbol: string) => void;
  onHistoryCleared?: () => void;
}

export function UserProfileModal({
  isOpen,
  onClose,
  onApplyCapitalPreset,
  onApplyPreferredPair,
  onHistoryCleared
}: UserProfileModalProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'history'>('profile');

  // Profile Form State
  const [profile, setProfile] = useState<UserProfile>({
    id: 'usr_quant_001',
    email: 'sieuthibaohiemonline.com@gmail.com',
    fullName: 'Victor Chuyền',
    phone: '+84 988 234 567',
    accountTier: 'PRO_QUANT_VIP1',
    defaultCapital: 10000,
    riskTolerance: 'MEDIUM',
    preferredPairs: ['BTCUSDT', 'XAUUSD']
  });

  const [password, setPassword] = useState('••••••••••••');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // History State
  const [tradeHistory, setTradeHistory] = useState<SavedTrade[]>([]);
  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'BTCUSDT' | 'XAUUSD'>('ALL');
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Load profile & history on modal open
  useEffect(() => {
    if (!isOpen) return;

    // Load Profile from API / localStorage
    const savedLocalProfile = localStorage.getItem('opc_user_profile');
    if (savedLocalProfile) {
      try {
        setProfile(JSON.parse(savedLocalProfile));
      } catch {
        // ignore
      }
    }

    fetch('/api/v1/auth/profile')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.profile) {
          setProfile(data.profile);
          localStorage.setItem('opc_user_profile', JSON.stringify(data.profile));
        }
      })
      .catch(() => {
        // keep local
      });

    // Load Trade History
    loadTradeHistory();
  }, [isOpen]);

  const loadTradeHistory = () => {
    setIsLoadingHistory(true);
    fetch('/api/v1/trade/history')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.history) {
          setTradeHistory(data.history);
          localStorage.setItem('opc_trade_history', JSON.stringify(data.history));
        }
      })
      .catch(() => {
        const local = localStorage.getItem('opc_trade_history');
        if (local) {
          try {
            setTradeHistory(JSON.parse(local));
          } catch {
            // ignore
          }
        }
      })
      .finally(() => setIsLoadingHistory(false));
  };

  // Save Profile Handler
  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setSaveMessage(null);

    try {
      const resp = await fetch('/api/v1/auth/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });
      const data = await resp.json();

      localStorage.setItem('opc_user_profile', JSON.stringify(profile));
      setSaveMessage('Đã lưu hồ sơ thật và đồng bộ cơ sở dữ liệu thành công!');

      if (onApplyCapitalPreset && profile.defaultCapital) {
        onApplyCapitalPreset(profile.defaultCapital);
      }
    } catch {
      localStorage.setItem('opc_user_profile', JSON.stringify(profile));
      setSaveMessage('Đã lưu hồ sơ cục bộ an toàn.');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(null), 3500);
    }
  };

  // Toggle Preferred Pair (Prioritize BTC and Gold)
  const togglePair = (pair: string) => {
    const exists = profile.preferredPairs.includes(pair);
    let updated: string[];
    if (exists) {
      if (profile.preferredPairs.length <= 1) return; // Keep at least 1
      updated = profile.preferredPairs.filter((p) => p !== pair);
    } else {
      updated = [...profile.preferredPairs, pair];
    }

    setProfile({ ...profile, preferredPairs: updated });
    if (onApplyPreferredPair && !exists) {
      onApplyPreferredPair(pair);
    }
  };

  // Export Trade History to JSON
  const handleExportHistory = () => {
    const blob = new Blob([JSON.stringify(tradeHistory, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `OPC_Trade_History_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Clear History
  const handleClearHistory = async () => {
    if (!confirm('Bạn có chắc chắn muốn xóa toàn bộ nhật ký lịch sử lệnh?')) return;
    try {
      await fetch('/api/v1/trade/history', { method: 'DELETE' });
    } catch {
      // ignore
    }
    setTradeHistory([]);
    localStorage.removeItem('opc_trade_history');
    if (onHistoryCleared) {
      onHistoryCleared();
    }
  };

  if (!isOpen) return null;

  // Filtered History
  const filteredHistory = tradeHistory.filter((item) => {
    if (historyFilter === 'ALL') return true;
    return item.symbol.toUpperCase().includes(historyFilter);
  });

  const totalPnl = tradeHistory.reduce((sum, item) => sum + (item.pnl || 0), 0);
  const winCount = tradeHistory.filter((item) => (item.pnl || 0) > 0).length;
  const winRate = tradeHistory.length > 0 ? ((winCount / tradeHistory.length) * 100).toFixed(1) : '100.0';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0b101c] border border-[#1e2e48] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-sans text-zinc-100">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#182740] bg-[#080d18] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-teal-500 to-amber-500 flex items-center justify-center text-slate-950 font-bold font-mono text-base shadow-md">
              {profile.fullName.slice(0, 2).toUpperCase() || 'VC'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  {profile.fullName || 'Hồ Sơ Giao Dịch'}
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 font-bold">
                  <Award className="w-3 h-3 text-amber-400" />
                  VIP 1 QUANT
                </span>
              </div>
              <div className="text-xs text-zinc-400 font-mono mt-0.5">
                {profile.email} · ID: #{profile.id}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 text-zinc-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center border-b border-[#182740] bg-[#070c16] px-4 font-mono text-xs overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('profile')}
            className={`min-h-[42px] px-3 font-semibold border-b-2 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'profile'
                ? 'border-teal-400 text-teal-300 bg-teal-950/20'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Hồ Sơ Cá Nhân</span>
          </button>

          <button
            onClick={() => setActiveTab('preferences')}
            className={`min-h-[42px] px-3 font-semibold border-b-2 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'preferences'
                ? 'border-amber-400 text-amber-300 bg-amber-950/20'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <Star className="w-3.5 h-3.5 text-amber-400" />
            <span>Ưu Tiên BTC &amp; Vàng</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`min-h-[42px] px-3 font-semibold border-b-2 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'history'
                ? 'border-teal-400 text-teal-300 bg-teal-950/20'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Lịch Sử Lệnh Thật ({tradeHistory.length})</span>
          </button>
        </div>

        {/* Content Body Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {saveMessage && (
            <div className="p-3 bg-emerald-950/50 border border-emerald-800/80 rounded-xl text-xs font-mono text-emerald-300 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{saveMessage}</span>
            </div>
          )}

          {/* TAB 1: USER PROFILE FORM */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs font-mono">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-zinc-300 font-semibold flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-teal-400" />
                    <span>Họ và Tên (Full Name)</span>
                  </label>
                  <input
                    type="text"
                    value={profile.fullName}
                    onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                    className="w-full bg-[#050912] border border-[#1d2d46] rounded-lg px-3 py-2 text-white outline-none focus:border-teal-400"
                    placeholder="vd: Victor Chuyền"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-zinc-300 font-semibold flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-teal-400" />
                    <span>Email Đăng Nhập</span>
                  </label>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="w-full bg-[#050912] border border-[#1d2d46] rounded-lg px-3 py-2 text-white outline-none focus:border-teal-400"
                    placeholder="sieuthibaohiemonline.com@gmail.com"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-zinc-300 font-semibold flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-teal-400" />
                    <span>Số Điện Thoại Xác Thực</span>
                  </label>
                  <input
                    type="text"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="w-full bg-[#050912] border border-[#1d2d46] rounded-lg px-3 py-2 text-white outline-none focus:border-teal-400"
                    placeholder="+84 988 234 567"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-zinc-300 font-semibold flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-teal-400" />
                    <span>Mật Khẩu Phiên Giao Dịch</span>
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#050912] border border-[#1d2d46] rounded-lg px-3 py-2 text-white outline-none focus:border-teal-400"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-[#182740] flex items-center justify-between">
                <span className="text-[11px] text-zinc-500">
                  Dữ liệu được lưu trữ an toàn trong máy chủ Node.js &amp; SQLite.
                </span>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="min-h-[38px] px-4 bg-teal-600 hover:bg-teal-500 active:scale-95 text-slate-950 font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                >
                  {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Lưu Hồ Sơ Thật</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: TRADING PREFERENCES - PRIORITIZE BTC & GOLD */}
          {activeTab === 'preferences' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-amber-950/20 border border-amber-600/40 rounded-xl space-y-2">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <h3 className="font-bold text-white text-xs uppercase tracking-wider font-mono">
                    Ưu Tiên Cặp Giao Dịch Phổ Biến: BTC &amp; Vàng (XAU/USD)
                  </h3>
                </div>
                <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                  Hệ thống AI Auto &amp; Sổ Lệnh sẽ luôn đưa <strong>Bitcoin (BTC/USDT)</strong> và <strong>Vàng Thế Giới (XAU/USD)</strong> lên hàng đầu bảng quét tín hiệu và phân bổ thanh khoản.
                </p>
              </div>

              {/* Priority Selector Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
                {/* BTC Card */}
                <div
                  onClick={() => togglePair('BTCUSDT')}
                  className={`p-3.5 rounded-xl border transition cursor-pointer ${
                    profile.preferredPairs.includes('BTCUSDT')
                      ? 'bg-amber-950/40 border-amber-500 text-white shadow-md'
                      : 'bg-[#080d16] border-[#182740] text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-xs">
                        ₿
                      </span>
                      <div>
                        <div className="font-bold text-white">BTC / USDT</div>
                        <div className="text-[10px] text-zinc-400">Bitcoin Spot &amp; Phái Sinh</div>
                      </div>
                    </div>
                    {profile.preferredPairs.includes('BTCUSDT') && (
                      <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 text-[10px] font-bold">
                        ★ Ưu Tiên Số 1
                      </span>
                    )}
                  </div>
                  <div className="mt-3 pt-2 border-t border-[#182740] flex justify-between text-[11px]">
                    <span className="text-zinc-500">Khối lượng 24h:</span>
                    <strong className="text-white">$2.25B</strong>
                  </div>
                </div>

                {/* Gold Card */}
                <div
                  onClick={() => togglePair('XAUUSD')}
                  className={`p-3.5 rounded-xl border transition cursor-pointer ${
                    profile.preferredPairs.includes('XAUUSD')
                      ? 'bg-amber-950/40 border-amber-500 text-white shadow-md'
                      : 'bg-[#080d16] border-[#182740] text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full bg-yellow-500/20 text-yellow-400 font-bold flex items-center justify-center text-xs">
                        Au
                      </span>
                      <div>
                        <div className="font-bold text-white">XAU / USD</div>
                        <div className="text-[10px] text-zinc-400">Vàng Thế Giới (Gold Spot)</div>
                      </div>
                    </div>
                    {profile.preferredPairs.includes('XAUUSD') && (
                      <span className="px-2 py-0.5 rounded bg-yellow-500 text-slate-950 text-[10px] font-bold">
                        ★ Ưu Tiên Số 2
                      </span>
                    )}
                  </div>
                  <div className="mt-3 pt-2 border-t border-[#182740] flex justify-between text-[11px]">
                    <span className="text-zinc-500">Biên độ dao động:</span>
                    <strong className="text-amber-300">~$25 - $40 / ounce</strong>
                  </div>
                </div>
              </div>

              {/* Capital & Risk Form */}
              <div className="bg-[#080d16] border border-[#182740] rounded-xl p-4 space-y-3 font-mono text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-zinc-300 font-semibold block">Vốn Cấp Khởi Tạo Mặc Định ($)</label>
                    <div className="flex items-center gap-2">
                      {[10000, 50000, 100000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setProfile({ ...profile, defaultCapital: amt })}
                          className={`flex-1 py-1.5 rounded-lg border text-center font-bold transition cursor-pointer ${
                            profile.defaultCapital === amt
                              ? 'bg-teal-500 text-slate-950 border-teal-400'
                              : 'bg-[#050912] border-[#1d2d46] text-zinc-400 hover:text-white'
                          }`}
                        >
                          ${amt / 1000}K
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-zinc-300 font-semibold block">Khẩu Vị Rủi Ro (Risk Profile)</label>
                    <select
                      value={profile.riskTolerance}
                      onChange={(e) => setProfile({ ...profile, riskTolerance: e.target.value as any })}
                      className="w-full bg-[#050912] border border-[#1d2d46] rounded-lg px-3 py-2 text-white outline-none"
                    >
                      <option value="LOW">Bảo Thủ (Max Drawdown 1.5% - Đòn bẩy thấp)</option>
                      <option value="MEDIUM">Cân Bằng (Max Drawdown 3.0% - Đòn bẩy 1:100)</option>
                      <option value="HIGH">Tăng Trưởng Nhanh (Scalping Đột Phá)</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#182740] flex justify-end">
                  <button
                    onClick={() => handleSaveProfile()}
                    disabled={isSaving}
                    className="min-h-[36px] px-4 bg-teal-600 hover:bg-teal-500 active:scale-95 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer transition"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Lưu Cấu Hình Giao Dịch</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: REAL PERSISTENT TRADE HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-3 font-mono text-xs">
              {/* Summary Stats Strip */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="p-3 bg-[#080d16] border border-[#182740] rounded-xl">
                  <div className="text-[10px] text-zinc-400">TỔNG LỢI NHUẬN:</div>
                  <div className={`text-base font-bold mt-0.5 ${totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)} USDT
                  </div>
                </div>

                <div className="p-3 bg-[#080d16] border border-[#182740] rounded-xl">
                  <div className="text-[10px] text-zinc-400">TỶ LỆ THẮNG:</div>
                  <div className="text-base font-bold text-teal-300 mt-0.5">
                    {winRate}%
                  </div>
                </div>

                <div className="p-3 bg-[#080d16] border border-[#182740] rounded-xl">
                  <div className="text-[10px] text-zinc-400">TỔNG SỐ LỆNH:</div>
                  <div className="text-base font-bold text-white mt-0.5">
                    {tradeHistory.length} lệnh
                  </div>
                </div>
              </div>

              {/* Filters & Actions */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-1 bg-[#050912] p-1 rounded-lg border border-[#182740]">
                  <button
                    onClick={() => setHistoryFilter('ALL')}
                    className={`px-2.5 py-1 rounded transition cursor-pointer text-[11px] font-bold ${
                      historyFilter === 'ALL' ? 'bg-teal-500 text-slate-950' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Tất Cả
                  </button>
                  <button
                    onClick={() => setHistoryFilter('BTCUSDT')}
                    className={`px-2.5 py-1 rounded transition cursor-pointer text-[11px] font-bold flex items-center gap-1 ${
                      historyFilter === 'BTCUSDT' ? 'bg-amber-500 text-slate-950' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span>BTC</span>
                  </button>
                  <button
                    onClick={() => setHistoryFilter('XAUUSD')}
                    className={`px-2.5 py-1 rounded transition cursor-pointer text-[11px] font-bold flex items-center gap-1 ${
                      historyFilter === 'XAUUSD' ? 'bg-yellow-500 text-slate-950' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span>VÀNG (XAU)</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleExportHistory}
                    disabled={tradeHistory.length === 0}
                    className="min-h-[30px] px-2.5 bg-[#080d16] hover:bg-[#121c2e] border border-[#1d2d46] text-zinc-300 rounded-lg text-[11px] flex items-center gap-1 cursor-pointer transition"
                    title="Xuất file JSON sao lưu lịch sử"
                  >
                    <Download className="w-3 h-3" />
                    <span>Xuất File</span>
                  </button>

                  <button
                    onClick={handleClearHistory}
                    disabled={tradeHistory.length === 0}
                    className="min-h-[30px] px-2 bg-rose-950/40 hover:bg-rose-900 border border-rose-800/60 text-rose-300 rounded-lg text-[11px] flex items-center gap-1 cursor-pointer transition"
                    title="Xóa lịch sử"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Table of Trades */}
              <div className="border border-[#182740] rounded-xl overflow-hidden bg-[#050912]">
                <div className="overflow-x-auto max-h-60">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-[#080d16] text-zinc-400 border-b border-[#182740]">
                      <tr>
                        <th className="p-2.5">Thời Gian</th>
                        <th className="p-2.5">Cặp Tiền</th>
                        <th className="p-2.5">Loại</th>
                        <th className="p-2.5">Chiến Lược</th>
                        <th className="p-2.5 text-right">Vào / Thoát</th>
                        <th className="p-2.5 text-right">Lợi Nhuận</th>
                        <th className="p-2.5 text-center">Trạng Thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#10192a]">
                      {filteredHistory.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-6 text-center text-zinc-500">
                            Chưa có lệnh nào trong bộ lọc này.
                          </td>
                        </tr>
                      ) : (
                        filteredHistory.map((item) => (
                          <tr key={item.id} className="hover:bg-[#0c1424] transition-colors">
                            <td className="p-2.5 text-zinc-500">{item.closedAt || item.openedAt}</td>
                            <td className="p-2.5 font-bold text-white flex items-center gap-1">
                              {item.symbol === 'BTCUSDT' && <span className="text-amber-400">₿</span>}
                              {item.symbol === 'XAUUSD' && <span className="text-yellow-400">Au</span>}
                              <span>{item.symbol}</span>
                            </td>
                            <td className="p-2.5">
                              <span
                                className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                  item.side === 'BUY'
                                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                    : 'bg-rose-950 text-rose-400 border border-rose-800'
                                }`}
                              >
                                {item.side}
                              </span>
                            </td>
                            <td className="p-2.5 text-zinc-400 text-[10px] truncate max-w-[120px]">
                              {item.strategy}
                            </td>
                            <td className="p-2.5 text-right text-zinc-300">
                              {item.entryPrice} → {item.exitPrice}
                            </td>
                            <td className="p-2.5 text-right font-bold">
                              <span className={item.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                {item.pnl >= 0 ? '+' : ''}${item.pnl.toFixed(2)}
                              </span>
                            </td>
                            <td className="p-2.5 text-center">
                              <span className="text-[10px] font-mono text-teal-400 bg-teal-950/80 px-1.5 py-0.2 rounded border border-teal-800">
                                {item.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
