/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * OPC Trade Lab V1 — Session Auto-Close Settings Component
 * Calculates time until market session close and schedules automatic trade closure.
 */

import React, { useState, useEffect } from 'react';
import {
  Clock,
  ShieldCheck,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  Zap,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  TrendingUp,
  Activity,
  Timer
} from 'lucide-react';
import { PositionRecord } from '../../App.tsx';

export type MarketSession = 'NEW_YORK' | 'LONDON' | 'TOKYO' | 'CRYPTO_DAILY' | 'CUSTOM';

interface SessionAutoCloseSettingsProps {
  autoCloseEnabled: boolean;
  onToggleAutoClose: (enabled: boolean) => void;
  selectedSession: MarketSession;
  onSelectSession: (session: MarketSession) => void;
  bufferMinutes: number;
  onBufferMinutesChange: (mins: number) => void;
  customTime: string; // HH:mm
  onCustomTimeChange: (time: string) => void;
  closeActionType: 'MARKET_ALL' | 'PROFIT_FIRST';
  onCloseActionTypeChange: (action: 'MARKET_ALL' | 'PROFIT_FIRST') => void;
  activePositions: PositionRecord[];
  onExecuteCloseAll: (reason: string) => void;
  lastClosedAt: string | null;
  timeRemainingSeconds: number;
  targetCloseTimeFormatted: string;
  onTriggerTestCountdown: (seconds: number) => void;
  testCountdownActive: number | null;
}

export const SessionAutoCloseSettings: React.FC<SessionAutoCloseSettingsProps> = ({
  autoCloseEnabled,
  onToggleAutoClose,
  selectedSession,
  onSelectSession,
  bufferMinutes,
  onBufferMinutesChange,
  customTime,
  onCustomTimeChange,
  closeActionType,
  onCloseActionTypeChange,
  activePositions,
  onExecuteCloseAll,
  lastClosedAt,
  timeRemainingSeconds,
  targetCloseTimeFormatted,
  onTriggerTestCountdown,
  testCountdownActive
}) => {
  // Format remaining seconds into HH:MM:SS
  const formatTimeRemaining = (totalSeconds: number) => {
    if (totalSeconds <= 0) return '00:00:00';
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Session metadata
  const sessionInfo = {
    NEW_YORK: {
      name: 'Phiên New York (Forex & Vàng Spot)',
      standardClose: '17:00 EDT (21:00 UTC)',
      vietnamTime: '04:00 Sáng VN',
      tag: 'Phổ biến nhất cho XAU/USD & Forex',
      reason: 'Tránh phí Swap qua đêm (Overnight Rollover) và giãn spread 22:00 - 23:00 GMT.'
    },
    LONDON: {
      name: 'Phiên London (Châu Âu)',
      standardClose: '16:30 BST (15:30 UTC)',
      vietnamTime: '22:30 Đêm VN',
      tag: 'Chốt lời sóng biến động Âu',
      reason: 'Khóa lợi nhuận trước khi thanh khoản các cặp tiền EUR/GBP giảm dần.'
    },
    TOKYO: {
      name: 'Phiên Tokyo / Châu Á',
      standardClose: '15:00 JST (06:00 UTC)',
      vietnamTime: '13:00 Trưa VN',
      tag: 'Chốt phiên Á / JPY',
      reason: 'Phù hợp các cặp tiền tệ Châu Á trước khi phiên London mở cửa.'
    },
    CRYPTO_DAILY: {
      name: 'Phiên Chốt Nến Ngày Crypto (Binance UTC Reset)',
      standardClose: '00:00 UTC',
      vietnamTime: '07:00 Sáng VN',
      tag: 'Crypto & Funding Interval',
      reason: 'Tránh chu kỳ Funding Fee 8 tiếng và biến động giật nến mở ngày mới.'
    },
    CUSTOM: {
      name: 'Giờ Tự Cấu Hình (Custom Local Time)',
      standardClose: customTime || '23:55',
      vietnamTime: `${customTime || '23:55'} Giờ Cục Bộ`,
      tag: 'Linh hoạt theo giờ cá nhân',
      reason: 'Tự động chốt toàn bộ vị thế trước khi bạn đi ngủ hoặc bận việc cá nhân.'
    }
  };

  const currentInfo = sessionInfo[selectedSession];

  return (
    <div className="space-y-6 text-slate-100 font-sans">
      {/* --- HERO BANNER & PRIMARY TOGGLE --- */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0c1829] via-[#09152b] to-[#0c1c38] border border-teal-500/40 p-5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-extrabold bg-teal-500/20 text-teal-300 border border-teal-500/40 flex items-center gap-1.5">
                <Timer className="w-3.5 h-3.5 text-teal-400" />
                AUTOMATED RISK DISCIPLINE
              </span>
              <span className="text-xs font-mono text-zinc-400">
                Chống Rủi Ro Qua Đêm (No Overnight Exposure)
              </span>
            </div>

            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Tự Động Đóng Vị Thế Khi Kết Thúc Phiên Giao Dịch
            </h2>
            <p className="text-xs text-zinc-300 leading-relaxed font-sans">
              Thuật toán tự động tính toán thời gian đóng cửa của phiên thị trường (New York, London, Tokyo, hoặc Binance Daily Reset) và lên lịch <strong>tất toán toàn bộ vị thế đang mở</strong> để loại bỏ hoàn toàn rủi ro giật gap giá, trượt giá phiên đêm và phí Swap.
            </p>
          </div>

          {/* Master Toggle Switch */}
          <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
            <div className="flex items-center gap-3 bg-slate-950/80 p-2 rounded-2xl border border-slate-800">
              <span className="text-xs font-mono font-bold text-zinc-300">
                {autoCloseEnabled ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    ĐANG BẬT
                  </span>
                ) : (
                  <span className="text-zinc-500">ĐÃ TẮT</span>
                )}
              </span>

              {/* Accessible Tactile Toggle Button */}
              <button
                type="button"
                role="switch"
                aria-checked={autoCloseEnabled}
                onClick={() => onToggleAutoClose(!autoCloseEnabled)}
                className={`relative inline-flex h-8 w-16 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-teal-400 ${
                  autoCloseEnabled ? 'bg-teal-500' : 'bg-slate-800'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-slate-950 shadow-lg ring-0 transition duration-200 ease-in-out ${
                    autoCloseEnabled ? 'translate-x-8' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="text-[11px] font-mono text-zinc-400">
              {activePositions.length > 0
                ? `Đang bảo vệ: ${activePositions.length} vị thế mở`
                : 'Hiện tại: 0 vị thế đang mở'}
            </div>
          </div>
        </div>

        {/* --- LIVE COUNTDOWN TIMER DISPLAY --- */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Timer Card */}
          <div className="sm:col-span-2 rounded-xl bg-slate-950/80 border border-slate-800 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono">
            <div>
              <div className="text-[11px] text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                Thời Gian Còn Lại Cho Đến Khi Tự Động Đóng Lệnh:
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1 flex items-baseline gap-2">
                <span className={autoCloseEnabled ? 'text-teal-300' : 'text-zinc-500'}>
                  {testCountdownActive !== null
                    ? `00:00:${testCountdownActive.toString().padStart(2, '0')} (TEST)`
                    : formatTimeRemaining(timeRemainingSeconds)}
                </span>
                <span className="text-xs text-zinc-400 font-sans font-normal">
                  {autoCloseEnabled ? '(Đang đếm ngược thực tế)' : '(Kích hoạt nút bật ở trên để chạy)'}
                </span>
              </div>
            </div>

            <div className="text-right sm:text-right border-t sm:border-t-0 sm:border-l border-slate-800 pt-2 sm:pt-0 sm:pl-3">
              <div className="text-[10px] text-zinc-400 uppercase">Thời Điểm Mục Tiêu (Target Close)</div>
              <div className="text-xs font-bold text-white mt-0.5">
                {targetCloseTimeFormatted || '21:00 UTC (04:00 VN)'}
              </div>
              <div className="text-[10px] text-amber-400 mt-0.5">
                (Đã trừ đệm bảo vệ {bufferMinutes} phút)
              </div>
            </div>
          </div>

          {/* Quick Simulation Trigger */}
          <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-3.5 flex flex-col justify-between font-mono">
            <div className="text-[10px] text-zinc-400 uppercase">Kiểm Thử Trực Quan (Quick Test)</div>
            <p className="text-[11px] text-zinc-300 font-sans leading-tight mt-1">
              Test nhanh tính năng tự động đóng lệnh sau 10 giây mà không cần chờ hết phiên thật.
            </p>

            <button
              onClick={() => onTriggerTestCountdown(10)}
              disabled={testCountdownActive !== null}
              className="mt-2 min-h-[32px] px-3 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 rounded-lg text-xs font-bold transition active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>
                {testCountdownActive !== null ? `Đang Test: ${testCountdownActive}s` : 'Thử Nghiệm Đếm Ngược 10 Giây'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* --- SECTION 1: MARKET SESSION SELECTION --- */}
      <div className="rounded-2xl bg-[#090d16] border border-slate-800 p-5 space-y-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-teal-400" />
              <span>Chọn Phiên Thị Trường Cần Theo Dõi (Market Session)</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Hệ thống tự động canh chuẩn theo đồng hồ múi giờ quốc tế UTC và giờ chuyển giao phiên giao dịch.
            </p>
          </div>

          <span className="text-xs font-mono px-2 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-800">
            Đang Chọn: {currentInfo.name}
          </span>
        </div>

        {/* Sessions Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(Object.keys(sessionInfo) as MarketSession[]).map((sessionKey) => {
            const sess = sessionInfo[sessionKey];
            const isSelected = selectedSession === sessionKey;

            return (
              <div
                key={sessionKey}
                onClick={() => onSelectSession(sessionKey)}
                className={`p-3.5 rounded-xl border transition cursor-pointer flex flex-col justify-between space-y-2.5 ${
                  isSelected
                    ? 'bg-teal-950/40 border-teal-500 text-white shadow-lg'
                    : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-zinc-400 hover:text-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono text-white flex items-center gap-1.5">
                      {isSelected ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                      ) : (
                        <span className="w-3.5 h-3.5 rounded-full border border-slate-700" />
                      )}
                      {sess.name}
                    </span>
                  </div>

                  <div className="mt-2 text-xs font-mono space-y-0.5">
                    <div className="text-teal-300 font-bold">
                      Giờ đóng: {sess.standardClose}
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      Giờ VN: {sess.vietnamTime}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 text-[11px] text-zinc-400 font-sans leading-normal">
                  {sess.reason}
                </div>
              </div>
            );
          })}
        </div>

        {/* Custom Time Input if CUSTOM is selected */}
        {selectedSession === 'CUSTOM' && (
          <div className="rounded-xl bg-slate-950 border border-cyan-500/50 p-4 space-y-2 font-mono text-xs animate-fade-in">
            <label className="text-white font-bold block">
              Nhập giờ đóng phiên mong muốn (Giờ địa phương máy tính):
            </label>
            <div className="flex items-center gap-2 max-w-xs">
              <input
                type="time"
                value={customTime}
                onChange={(e) => onCustomTimeChange(e.target.value)}
                className="bg-slate-900 border border-slate-700 px-3 py-2 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-cyan-400"
              />
              <span className="text-zinc-400 text-xs">(Định dạng HH:mm)</span>
            </div>
            <p className="text-[11px] text-zinc-400 font-sans">
              Khi đến giờ này hàng ngày (trừ đi thời gian đệm an toàn), toàn bộ lệnh đang mở sẽ được tự động đóng gọn gàng.
            </p>
          </div>
        )}
      </div>

      {/* --- SECTION 2: BUFFER TIME & EXECUTION BEHAVIOR --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Buffer Time (Grace Period) */}
        <div className="rounded-2xl bg-[#090d16] border border-slate-800 p-5 space-y-3 shadow-xl">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Thời Gian Đệm An Toàn (Pre-Close Buffer)</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Đóng lệnh trước khi sàn kết thúc chính thức để tránh giãn spread và trượt giá cao.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 font-mono text-xs">
            {[5, 15, 30].map((mins) => (
              <button
                key={mins}
                onClick={() => onBufferMinutesChange(mins)}
                className={`min-h-[44px] rounded-xl border font-bold transition cursor-pointer flex flex-col items-center justify-center ${
                  bufferMinutes === mins
                    ? 'bg-emerald-600 text-slate-950 border-emerald-500 shadow-md'
                    : 'bg-slate-950 border-slate-800 text-zinc-300 hover:bg-slate-900'
                }`}
              >
                <span>{mins} Phút Trước</span>
                <span className="text-[9px] font-normal opacity-80">
                  {mins === 15 ? 'Khuyên Dùng' : mins === 5 ? 'Sát Giờ' : 'Rất An Toàn'}
                </span>
              </button>
            ))}
          </div>

          <div className="text-[11px] text-zinc-400 font-sans leading-relaxed bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
            💡 <strong>Khuyên dùng 15 phút:</strong> Tại các thời điểm chuyển giao phiên 21:50 - 22:05 UTC (New York Close), thanh khoản mỏng thường làm spread vàng XAU/USD và Forex giãn gấp 3-5 lần. Đóng lệnh trước 15 phút giúp bạn giữ trọn vẹn lợi nhuận.
          </div>
        </div>

        {/* Execution Type on Close */}
        <div className="rounded-2xl bg-[#090d16] border border-slate-800 p-5 space-y-3 shadow-xl">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Hành Động Khi Đến Hạn (Execution Action)</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Cách thức xử lý danh mục vị thế khi đồng hồ đếm ngược chạm mốc.
            </p>
          </div>

          <div className="space-y-2 font-mono text-xs">
            <button
              onClick={() => onCloseActionTypeChange('MARKET_ALL')}
              className={`w-full p-3 rounded-xl border text-left transition cursor-pointer ${
                closeActionType === 'MARKET_ALL'
                  ? 'bg-cyan-950/50 border-cyan-500 text-white shadow-md'
                  : 'bg-slate-950 border-slate-800 text-zinc-400 hover:text-white'
              }`}
            >
              <div className="font-bold text-white flex items-center justify-between">
                <span>1. Tất Toán Toàn Bộ Vị Thế (Market Close All)</span>
                {closeActionType === 'MARKET_ALL' && <CheckCircle2 className="w-4 h-4 text-cyan-400" />}
              </div>
              <p className="text-[11px] text-zinc-400 font-sans mt-1">
                Đóng 100% tất cả các lệnh mở (cả lệnh xanh và lệnh đỏ) theo giá thị trường hiện tại. Tài khoản trở về trạng thái 100% Tiền Mặt.
              </p>
            </button>

            <button
              onClick={() => onCloseActionTypeChange('PROFIT_FIRST')}
              className={`w-full p-3 rounded-xl border text-left transition cursor-pointer ${
                closeActionType === 'PROFIT_FIRST'
                  ? 'bg-cyan-950/50 border-cyan-500 text-white shadow-md'
                  : 'bg-slate-950 border-slate-800 text-zinc-400 hover:text-white'
              }`}
            >
              <div className="font-bold text-white flex items-center justify-between">
                <span>2. Khóa Lợi Nhuận + Dời SL Về Hòa Vốn (Lock Profits)</span>
                {closeActionType === 'PROFIT_FIRST' && <CheckCircle2 className="w-4 h-4 text-cyan-400" />}
              </div>
              <p className="text-[11px] text-zinc-400 font-sans mt-1">
                Chốt lời ngay toàn bộ lệnh dương, các lệnh đang chạy dời Stop Loss về giá hòa vốn (Breakeven) để không bị lỗ thêm.
              </p>
            </button>
          </div>
        </div>
      </div>

      {/* --- SECTION 3: CURRENT ACTIVE AUDIT & MANUAL OVERRIDE --- */}
      <div className="rounded-2xl bg-[#090d16] border border-slate-800 p-5 space-y-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-400" />
              <span>Tình Trạng Vị Thế Đang Được Bảo Vệ ({activePositions.length})</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              {lastClosedAt
                ? `Lần tự động đóng phiên gần nhất: ${lastClosedAt}`
                : 'Chưa có lịch đóng lệnh nào được kích hoạt trong phiên hôm nay.'}
            </p>
          </div>

          {activePositions.length > 0 && (
            <button
              onClick={() => onExecuteCloseAll('Đóng khẩn cấp thủ công bởi người dùng tại trang Cài Đặt')}
              className="min-h-[36px] px-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold transition active:scale-95 cursor-pointer shadow-md flex items-center gap-1.5"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Tất Toán Toàn Bộ Ngay Lập Tức</span>
            </button>
          )}
        </div>

        {activePositions.length === 0 ? (
          <div className="rounded-xl bg-slate-950 p-4 border border-slate-800 text-center font-mono text-xs text-zinc-400 space-y-1">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto" />
            <div className="text-white font-bold">Không Có Vị Thế Nào Đang Mở</div>
            <div>Toàn bộ tài sản đang an toàn trong ví tiền mặt. Khi có lệnh mới được mở, lịch đóng phiên sẽ tự động bảo vệ.</div>
          </div>
        ) : (
          <div className="space-y-2">
            {activePositions.map((pos) => (
              <div
                key={pos.id}
                className="bg-slate-950 rounded-xl p-3 border border-slate-800 flex items-center justify-between gap-3 text-xs font-mono"
              >
                <div>
                  <div className="font-bold text-white">{pos.asset}</div>
                  <div className="text-[11px] text-zinc-400">
                    Size: {pos.size} · Giá vào: {pos.entryPrice} · TP: {pos.tpPrice} · SL: {pos.slPrice}
                  </div>
                </div>

                <div className="text-right">
                  <div
                    className={`font-bold ${
                      pos.unrealizedPnl.includes('+') ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {pos.unrealizedPnl} ({pos.pnlPercent})
                  </div>
                  <div className="text-[10px] text-teal-400">
                    Sẽ tự đóng khi hết phiên
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
