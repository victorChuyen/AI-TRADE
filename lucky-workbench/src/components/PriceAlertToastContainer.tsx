/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * OPC Trade Lab V1 — Price Alert Toast Notification System
 * Listens to WebSocket events for significant price volatility spikes.
 * Mobile & Desktop UX/UI optimized with accessible touch targets (>=44px).
 * Owner: Victor Chuyền · OPC AI REVENUE LAB
 */

import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  X,
  ExternalLink,
  Clock,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Zap
} from 'lucide-react';

export interface VolatilityAlert {
  id: string;
  symbol: string;
  direction: 'UP' | 'DOWN';
  currentPrice: string;
  baselinePrice: string;
  changePct: number;
  thresholdPct: number;
  severity: 'MEDIUM' | 'HIGH' | 'CRITICAL';
  volume?: string;
  isTest?: boolean;
  timestamp: string;
}

interface PriceAlertToastContainerProps {
  alerts: VolatilityAlert[];
  onDismiss: (id: string) => void;
  onInspectSymbol?: (symbol: string) => void;
  onQuickOrder?: (alert: VolatilityAlert, side: 'BUY' | 'SELL') => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export function PriceAlertToastContainer({
  alerts,
  onDismiss,
  onInspectSymbol,
  onQuickOrder
}: PriceAlertToastContainerProps) {
  if (alerts.length === 0) return null;

  return (
    <aside
      aria-label="Cảnh báo biến động giá thời gian thực"
      className="fixed top-3 left-3 right-3 md:left-auto md:right-4 md:top-14 z-50 flex flex-col gap-2.5 max-w-none md:max-w-md w-auto md:w-full pointer-events-none"
    >
      {/* Toast Floating List */}
      {alerts.map((alert, idx) => (
        <ToastItem
          key={`toast_${alert.id}_${idx}_${alert.timestamp}`}
          alert={alert}
          onDismiss={() => onDismiss(alert.id)}
          onInspect={() => onInspectSymbol?.(alert.symbol)}
          onQuickOrder={onQuickOrder}
        />
      ))}
    </aside>
  );
}

function ToastItem({
  alert,
  onDismiss,
  onInspect,
  onQuickOrder
}: {
  alert: VolatilityAlert;
  onDismiss: () => void;
  onInspect: () => void;
  onQuickOrder?: (alert: VolatilityAlert, side: 'BUY' | 'SELL') => void;
}) {
  const [progress, setProgress] = useState(100);
  const DURATION_MS = 6000;

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remainingPct = Math.max(0, 100 - (elapsed / DURATION_MS) * 100);
      setProgress(remainingPct);

      if (remainingPct <= 0) {
        clearInterval(interval);
        onDismiss();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [onDismiss]);

  const isUp = alert.direction === 'UP';
  const isCritical = alert.severity === 'CRITICAL';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-auto rounded-xl border p-3.5 sm:p-4 shadow-2xl backdrop-blur-xl transition-all duration-200 transform translate-y-0 opacity-100 ${
        isCritical
          ? 'bg-rose-950/95 border-rose-500/80 shadow-rose-950/60'
          : isUp
          ? 'bg-slate-900/95 border-emerald-500/60 shadow-emerald-950/40'
          : 'bg-slate-900/95 border-rose-500/60 shadow-rose-950/40'
      }`}
    >
      <div className="flex items-start justify-between gap-2.5">
        {/* Direction Icon & Symbol Header */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center font-bold shrink-0 ${
              isUp
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
            }`}
          >
            {isUp ? (
              <TrendingUp className="w-5 h-5 animate-pulse" />
            ) : (
              <TrendingDown className="w-5 h-5 animate-pulse" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-mono font-bold text-sm sm:text-base text-white tracking-tight">
                {alert.symbol.replace('USDT', '')}/USDT
              </span>
              <span
                className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded ${
                  isUp
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : 'bg-rose-950 text-rose-400 border border-rose-800'
                }`}
              >
                {isUp ? '+' : ''}{alert.changePct}%
              </span>
              {alert.isTest && (
                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800">
                  TEST
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-300 mt-0.5 truncate">
              Vượt biến động {alert.thresholdPct}% trong 20s
            </div>
          </div>
        </div>

        {/* Close Button with >= 44px tap hitbox */}
        <button
          onClick={onDismiss}
          aria-label="Đóng cảnh báo"
          className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 active:scale-95 transition cursor-pointer shrink-0 -mr-2 -mt-2"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Metrics Row */}
      <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
        <div className="text-slate-300">
          Hiện tại: <strong className="text-white font-bold">${alert.currentPrice}</strong>
        </div>
        <div className="text-slate-400 text-[11px]">
          Gốc: ${alert.baselinePrice}
        </div>
      </div>

      {/* Action Footer: Touch CTA buttons & Suggested Order (MUA / BÁN) */}
      <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex flex-col gap-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-400 font-mono flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-500" />
            {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          <span className="text-[10px] font-mono flex items-center gap-1">
            <span className="text-slate-400">Gợi ý:</span>
            <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
              isUp 
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' 
                : 'bg-rose-950 text-rose-300 border border-rose-800'
            }`}>
              {isUp ? 'ĐÀ TĂNG ↗ ƯU TIÊN MUA' : 'ĐÀ GIẢM ↘ ƯU TIÊN BÁN'}
            </span>
          </span>
        </div>

        {/* Buttons Row: Xem Sổ Lệnh + Nút gợi ý đặt lệnh MUA hoặc BÁN */}
        <div className="flex items-center justify-between gap-1.5 flex-wrap sm:flex-nowrap">
          {/* Nút Xem Sổ Lệnh */}
          <button
            onClick={onInspect}
            className="min-h-[36px] px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-slate-200 hover:text-white font-medium flex items-center gap-1 cursor-pointer active:scale-95 transition text-[11px] shrink-0"
            title="Xem chi tiết sổ lệnh DOM và độ sâu thị trường"
          >
            <span>Xem Sổ Lệnh</span>
            <ArrowRight className="w-3 h-3 text-slate-400" />
          </button>

          {/* Gợi ý đặt lệnh MUA HOẶC BÁN */}
          <div className="flex items-center gap-1.5 grow justify-end">
            {/* Nút MUA */}
            <button
              onClick={() => onQuickOrder?.(alert, 'BUY')}
              className={`min-h-[36px] px-2.5 sm:px-3 py-1 rounded-lg font-mono font-bold flex items-center justify-center gap-1 text-[11px] cursor-pointer active:scale-95 transition ${
                isUp
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold shadow-[0_0_14px_rgba(16,185,129,0.4)] ring-1 ring-emerald-300'
                  : 'bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/80 hover:border-emerald-500'
              }`}
              title={`Đặt lệnh MUA ${alert.symbol} @ $${alert.currentPrice} (${isUp ? 'Gợi ý theo đà tăng' : 'Bắt đáy'})`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>{isUp ? 'GỢI Ý MUA' : 'MUA'}</span>
            </button>

            {/* Nút BÁN */}
            <button
              onClick={() => onQuickOrder?.(alert, 'SELL')}
              className={`min-h-[36px] px-2.5 sm:px-3 py-1 rounded-lg font-mono font-bold flex items-center justify-center gap-1 text-[11px] cursor-pointer active:scale-95 transition ${
                !isUp
                  ? 'bg-rose-500 hover:bg-rose-400 text-white font-extrabold shadow-[0_0_14px_rgba(244,63,94,0.4)] ring-1 ring-rose-300'
                  : 'bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-700/80 hover:border-rose-500'
              }`}
              title={`Đặt lệnh BÁN ${alert.symbol} @ $${alert.currentPrice} (${!isUp ? 'Gợi ý theo đà giảm' : 'Bắt đỉnh'})`}
            >
              <ArrowDownRight className="w-3.5 h-3.5" />
              <span>{!isUp ? 'GỢI Ý BÁN' : 'BÁN'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Auto-Dismiss Progress Bar */}
      <div className="w-full bg-slate-800/60 h-1 rounded-full overflow-hidden mt-2">
        <div
          style={{ width: `${progress}%` }}
          className={`h-full transition-all duration-75 ${
            isCritical ? 'bg-rose-400' : isUp ? 'bg-emerald-400' : 'bg-rose-400'
          }`}
        />
      </div>
    </div>
  );
}

// Synthesize alert sound using browser Web Audio API
export function playAlertBeep(direction: 'UP' | 'DOWN') {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const startFreq = direction === 'UP' ? 880 : 587.33;
    const endFreq = direction === 'UP' ? 1174.66 : 440;

    osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + 0.18);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch {
    // Autoplay policy: will activate on next user tap
  }
}
