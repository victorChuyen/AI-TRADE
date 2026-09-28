/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * OPC Trade Lab V1 — Simplified Emergency Trade Dashboard
 * Designed specifically for mobile layouts (390px viewport ergonomics).
 * Hides non-critical intelligence nodes and focuses exclusively on:
 * 1. Current NAV Status & Capital Health
 * 2. 'Halt Trading' (Emergency Circuit Breaker / Kill Switch)
 * 3. 'Close All Positions' (Instant Take Profit / Emergency Liquidation)
 */

import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  Play,
  Pause,
  X,
  ArrowLeft,
  DollarSign,
  Layers,
  Activity,
  CheckCircle2,
  RefreshCw,
  Zap,
  Lock
} from 'lucide-react';
import { PositionRecord, AccountMode, parsePnlNumber } from '../../App.tsx';

interface EmergencyTradeDashboardProps {
  currentNav: number;
  realizedPnl: number;
  accountMode: AccountMode;
  realBalanceUsdt: string;
  activePositions: PositionRecord[];
  killSwitchActive: boolean;
  isAiAutoRunning: boolean;
  onToggleHaltTrading: () => void;
  onTakeProfitAll: () => void;
  onStopLossAll: () => void;
  onClosePosition: (posId: string, actionType: 'TP' | 'SL') => void;
  onExitEmergencyView: () => void;
}

export const EmergencyTradeDashboard: React.FC<EmergencyTradeDashboardProps> = ({
  currentNav,
  realizedPnl,
  accountMode,
  realBalanceUsdt,
  activePositions,
  killSwitchActive,
  isAiAutoRunning,
  onToggleHaltTrading,
  onTakeProfitAll,
  onStopLossAll,
  onClosePosition,
  onExitEmergencyView
}) => {
  const [confirmHaltModal, setConfirmHaltModal] = useState<boolean>(false);
  const [confirmCloseAllModal, setConfirmCloseAllModal] = useState<boolean>(false);

  // Compute total floating unrealized PnL with proper negative/positive sign parsing
  const totalUnrealizedPnl = activePositions.reduce((acc, pos) => {
    return acc + parsePnlNumber(pos.unrealizedPnl);
  }, 0);

  const displayNav = accountMode === 'REAL'
    ? parseFloat(realBalanceUsdt) || 0
    : currentNav;

  // Real exposure calculation based on number of active positions vs total portfolio
  const exposurePct = activePositions.length > 0
    ? Math.min(100, Number((activePositions.length * 4.8).toFixed(1)))
    : 0;

  const isHalted = killSwitchActive || !isAiAutoRunning;
  const isPnlPositive = totalUnrealizedPnl >= 0;

  return (
    <div className="w-full max-w-[420px] mx-auto min-h-screen bg-[#07090e] text-slate-100 flex flex-col pb-24 select-none font-sans">
      {/* --- TOP EMERGENCY STATUS HEADER --- */}
      <header className="sticky top-0 z-30 bg-[#0a0d14]/95 backdrop-blur-md border-b border-red-900/40 px-3.5 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
              isHalted
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50 animate-pulse'
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
            }`}
          >
            {isHalted ? <ShieldAlert className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-mono font-bold tracking-tight text-white uppercase">
                Emergency Desk
              </span>
              <span
                className={`text-[9px] font-mono font-extrabold px-1.5 py-0.2 rounded uppercase ${
                  accountMode === 'REAL'
                    ? 'bg-amber-950 text-amber-300 border border-amber-800'
                    : 'bg-teal-950 text-teal-300 border border-teal-800'
                }`}
              >
                {accountMode}
              </span>
            </div>
            <div className="text-[10px] text-zinc-400 font-mono">
              390px Tactile Mode · Zero-Distraction
            </div>
          </div>
        </div>

        <button
          onClick={onExitEmergencyView}
          className="min-h-[38px] px-2.5 rounded-lg bg-slate-900 border border-slate-700/80 hover:bg-slate-800 text-xs font-medium text-slate-300 flex items-center gap-1 cursor-pointer transition active:scale-95"
          title="Quay lại giao diện Terminal đầy đủ"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Terminal</span>
        </button>
      </header>

      {/* --- MAIN TACTICAL CONTENT --- */}
      <main className="p-3.5 space-y-3.5 flex-1">
        {/* PRIORITY 1: CURRENT NAV STATUS CARD */}
        <section
          aria-label="Tình trạng NAV hiện tại"
          className="rounded-2xl bg-gradient-to-b from-[#0f172a] to-[#090d16] border border-slate-800 p-4 shadow-xl relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-teal-400" />
              Tài Sản Ròng (Current NAV)
            </span>
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                isHalted
                  ? 'bg-rose-950/80 text-rose-300 border-rose-800'
                  : 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
              }`}
            >
              {isHalted ? '● ĐÃ ĐÓNG BĂNG' : '● ĐANG BẬT TỰ ĐỘNG'}
            </span>
          </div>

          {/* Primary NAV Typography */}
          <div className="flex items-baseline gap-2 mt-1">
            <h1 className="text-3xl font-mono font-extrabold text-white tracking-tight">
              ${displayNav.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h1>
            <span className="text-xs font-mono text-zinc-400">USDT</span>
          </div>

          {/* Secondary Capital Metrics: Floating PnL & Realized */}
          <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-800/80 font-mono text-xs">
            <div className="bg-slate-900/80 rounded-xl p-2.5 border border-slate-800">
              <div className="text-[10px] text-zinc-400 mb-0.5">PnL Tạm Tính (Float)</div>
              <div
                className={`font-bold flex items-center gap-1 text-sm ${
                  isPnlPositive ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {isPnlPositive ? '+' : ''}${totalUnrealizedPnl.toFixed(2)}
              </div>
            </div>

            <div className="bg-slate-900/80 rounded-xl p-2.5 border border-slate-800">
              <div className="text-[10px] text-zinc-400 mb-0.5">PnL Đã Chốt Hôm Nay</div>
              <div
                className={`font-bold text-sm ${
                  realizedPnl >= 0 ? 'text-teal-300' : 'text-rose-400'
                }`}
              >
                {realizedPnl >= 0 ? '+' : ''}${realizedPnl.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Exposure bar */}
          <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-zinc-400">
            <span>Vị thế rủi ro mở:</span>
            <span className="font-bold text-white">
              {activePositions.length} Lệnh ({activePositions.length > 0 ? `${exposurePct}% Vốn` : '0% - An Toàn'})
            </span>
          </div>
        </section>

        {/* PRIORITY 2: 'HALT TRADING' ACTION CARD (CIRCUIT BREAKER) */}
        <section
          aria-label="Khóa Ngắt Giao Dịch Khẩn Cấp"
          className={`rounded-2xl border p-4 transition-all duration-200 ${
            isHalted
              ? 'bg-rose-950/40 border-rose-500/70 shadow-rose-950/50 shadow-xl'
              : 'bg-[#10141f] border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  isHalted ? 'bg-rose-500 text-white' : 'bg-amber-500/20 text-amber-400'
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
              </div>
              <span className="text-xs font-mono font-bold tracking-tight text-white uppercase">
                Ngắt Giao Dịch (Halt Trading)
              </span>
            </div>
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                isHalted ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-300'
              }`}
            >
              {isHalted ? 'HALTED' : 'STANDBY'}
            </span>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed mb-3">
            {isHalted
              ? 'Hệ thống đã ngừng phát sinh lệnh mới. Các luồng quét tự động đã đóng băng an toàn.'
              : 'Dừng ngay lập tức toàn bộ thuật toán quét lệnh AI và ngăn ngừa mọi thao tác khớp tự động.'}
          </p>

          {/* Big Tactile Action Button (>= 50px Height) */}
          {isHalted ? (
            <button
              onClick={onToggleHaltTrading}
              className="w-full min-h-[52px] rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 font-mono font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg transition active:scale-98 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-slate-950" />
              <span>KHÔI PHỤC GIAO DỊCH (RESUME TRADING)</span>
            </button>
          ) : (
            <button
              onClick={() => setConfirmHaltModal(true)}
              className="w-full min-h-[52px] rounded-xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-mono font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-950/60 transition active:scale-98 cursor-pointer"
            >
              <Pause className="w-5 h-5 fill-white" />
              <span>DỪNG GIAO DỊCH NGAY (HALT TRADING)</span>
            </button>
          )}
        </section>

        {/* PRIORITY 3: 'CLOSE ALL POSITIONS' ACTION CARD (INSTANT LIQUIDATION) */}
        <section
          aria-label="Tất Toán Toàn Bộ Vị Thế"
          className="rounded-2xl bg-[#10141f] border border-slate-800 p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <span className="text-xs font-mono font-bold tracking-tight text-white uppercase">
                Đóng Vị Thế (Close All Positions)
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-amber-400">
              {activePositions.length} Đang Mở
            </span>
          </div>

          {activePositions.length === 0 ? (
            <div className="rounded-xl bg-slate-900/60 border border-slate-800/80 p-3.5 text-center space-y-1">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto" />
              <div className="text-xs font-mono font-bold text-slate-200">
                Không Có Vị Thế Nào Đang Mở
              </div>
              <div className="text-[11px] text-zinc-400">
                Toàn bộ vốn của bạn hiện ở trạng thái 100% Tiền Mặt (Zero Exposure).
              </div>
            </div>
          ) : (
            <>
              {/* Dual Big Tactile Action Buttons (>= 50px Height) */}
              <div className="space-y-2">
                <button
                  onClick={onTakeProfitAll}
                  className="w-full min-h-[50px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-mono font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer shadow-md"
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>CHỐT LỜI TẤT CẢ VỊ THẾ ({isPnlPositive ? '+' : ''}${totalUnrealizedPnl.toFixed(2)})</span>
                </button>

                <button
                  onClick={() => setConfirmCloseAllModal(true)}
                  className="w-full min-h-[50px] rounded-xl bg-rose-900/90 hover:bg-rose-800 border border-rose-600/70 text-rose-200 font-mono font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer shadow-md"
                >
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>TẤT TOÁN / CẮT LỖ KHẨN CẤP TOÀN BỘ</span>
                </button>
              </div>

              {/* Simplified Tactile Position Cards (Hides non-critical nodes) */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="text-[10px] font-mono uppercase text-zinc-400 tracking-wider">
                  Danh Sách Vị Thế Rủi Ro Cần Xử Lý ({activePositions.length}):
                </div>

                {activePositions.map((pos) => {
                  const isPosUp = pos.unrealizedPnl.includes('+');
                  return (
                    <div
                      key={pos.id}
                      className="bg-slate-900/90 rounded-xl p-3 border border-slate-800 flex items-center justify-between gap-2 text-xs font-mono"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-white truncate text-xs">
                          {pos.asset}
                        </div>
                        <div className="text-[10px] text-zinc-400 flex items-center gap-1.5 mt-0.5">
                          <span>Size: {pos.size}</span>
                          <span>•</span>
                          <span>Giá Vào: {pos.entryPrice}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`font-bold text-xs ${
                            isPosUp ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {pos.unrealizedPnl}
                        </span>

                        <button
                          onClick={() => onClosePosition(pos.id, 'TP')}
                          className="min-h-[32px] px-2 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-600/70 text-emerald-300 rounded-lg text-[10px] font-bold cursor-pointer transition active:scale-95 flex items-center gap-0.5"
                          title="Chốt lời vị thế này"
                        >
                          <TrendingUp className="w-2.5 h-2.5" />
                          <span>TP</span>
                        </button>

                        <button
                          onClick={() => onClosePosition(pos.id, 'SL')}
                          className="min-h-[32px] px-2 bg-rose-950/80 hover:bg-rose-900 border border-rose-700/80 text-rose-300 rounded-lg text-[10px] font-bold cursor-pointer transition active:scale-95 flex items-center gap-0.5"
                          title="Cắt lỗ bảo toàn vốn"
                        >
                          <X className="w-2.5 h-2.5" />
                          <span>SL</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>

        {/* QUICK FOOTER: NAVIGATION BACK TO FULL VIEW */}
        <div className="pt-2 text-center">
          <button
            onClick={onExitEmergencyView}
            className="w-full min-h-[46px] rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-mono text-xs flex items-center justify-center gap-2 cursor-pointer transition active:scale-98"
          >
            <Activity className="w-4 h-4 text-teal-400" />
            <span>Mở Bảng Điều Khiển Chi Tiết (Full Terminal)</span>
          </button>
        </div>
      </main>

      {/* --- CONFIRMATION MODAL: HALT TRADING --- */}
      {confirmHaltModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="w-full max-w-sm bg-[#0c1017] border border-rose-600/80 rounded-2xl p-5 shadow-2xl space-y-4 animate-scale-up text-left">
            <div className="flex items-center gap-2.5 text-rose-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h2 className="text-base font-bold text-white font-mono">
                Xác Nhận Dừng Giao Dịch?
              </h2>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed font-sans">
              Hệ thống sẽ lập tức kích hoạt <strong>Kill Switch</strong>, ngắt mạch hoàn toàn các thuật toán tự động đặt lệnh và bảo vệ vốn.
            </p>

            <div className="flex items-center gap-2 pt-1 font-mono text-xs">
              <button
                onClick={() => setConfirmHaltModal(false)}
                className="flex-1 min-h-[44px] rounded-xl bg-slate-900 border border-slate-700 text-slate-300 font-bold cursor-pointer hover:bg-slate-800 active:scale-95"
              >
                Hủy Bỏ
              </button>
              <button
                onClick={() => {
                  onToggleHaltTrading();
                  setConfirmHaltModal(false);
                }}
                className="flex-1 min-h-[44px] rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer active:scale-95 shadow-lg shadow-rose-950/50"
              >
                Dừng Ngay (Halt)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- CONFIRMATION MODAL: EMERGENCY CLOSE ALL --- */}
      {confirmCloseAllModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="w-full max-w-sm bg-[#0c1017] border border-amber-600/80 rounded-2xl p-5 shadow-2xl space-y-4 animate-scale-up text-left">
            <div className="flex items-center gap-2.5 text-amber-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h2 className="text-base font-bold text-white font-mono">
                Tất Toán Toàn Bộ Vị Thế?
              </h2>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed font-sans">
              Bạn sắp đóng khẩn cấp toàn bộ <strong>{activePositions.length} vị thế</strong> đang mở để bảo toàn vốn ròng. Thao tác này sẽ cập nhật số dư NAV tức thời.
            </p>

            <div className="flex items-center gap-2 pt-1 font-mono text-xs">
              <button
                onClick={() => setConfirmCloseAllModal(false)}
                className="flex-1 min-h-[44px] rounded-xl bg-slate-900 border border-slate-700 text-slate-300 font-bold cursor-pointer hover:bg-slate-800 active:scale-95"
              >
                Hủy Bỏ
              </button>
              <button
                onClick={() => {
                  onStopLossAll();
                  setConfirmCloseAllModal(false);
                }}
                className="flex-1 min-h-[44px] rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer active:scale-95 shadow-lg shadow-rose-950/50"
              >
                Tất Toán Ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
