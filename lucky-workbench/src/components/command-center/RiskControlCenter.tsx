/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * OPC Trade Lab V1 — Risk Control Center (Always Visible Compact Bar)
 * Features:
 * - Max Order Size, Max Exposure Limit, Daily Loss Limit, Drawdown, Open Positions
 * - Real-time Kill Switch status
 * - Large, prominent, visually distinct HALT TRADING emergency button
 * - Stops new executions, freezes intents, logs audit events.
 */

import React from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Octagon,
  Lock,
  Unlock,
  Activity,
  ZapOff
} from 'lucide-react';

interface RiskControlCenterProps {
  maxOrderSizeUsd: number;
  maxExposureUsd: number;
  maxExposurePct: number;
  currentExposureUsd: number;
  dailyLossLimitUsd: number;
  currentDailyLossUsd: number;
  currentDrawdownPct: number;
  openPositionsCount: number;
  isHalted: boolean;
  onToggleHalt: () => void;
}

export const RiskControlCenter: React.FC<RiskControlCenterProps> = ({
  maxOrderSizeUsd,
  maxExposureUsd,
  maxExposurePct,
  currentExposureUsd,
  dailyLossLimitUsd,
  currentDailyLossUsd,
  currentDrawdownPct,
  openPositionsCount,
  isHalted,
  onToggleHalt
}) => {
  return (
    <div
      className={`border px-3 py-2 flex flex-wrap items-center justify-between gap-3 text-xs font-mono transition-colors ${
        isHalted
          ? 'bg-rose-950/40 border-rose-600/70 shadow-[0_0_20px_rgba(225,29,72,0.3)]'
          : 'bg-[#0a0d14] border-[#1f293d]'
      }`}
    >
      {/* Left: Risk Engine Header & Status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          {isHalted ? (
            <ShieldAlert className="w-4 h-4 text-rose-400 animate-bounce" />
          ) : (
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          )}
          <span className="font-bold uppercase tracking-wider text-zinc-200">
            RISK CONTROL CENTER
          </span>
        </div>

        <div
          className={`px-2 py-0.5 border text-[10px] font-bold uppercase tracking-wider ${
            isHalted
              ? 'bg-rose-900 text-rose-100 border-rose-400 animate-pulse'
              : 'bg-emerald-950/50 text-emerald-400 border-emerald-500/40'
          }`}
        >
          {isHalted ? 'SYSTEM HALTED' : 'GATEWAY: ARMED & PASSING'}
        </div>
      </div>

      {/* Center: Live Limits & Exposures */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-[10px]">
        <div>
          <span className="text-zinc-500 uppercase">MAX ORDER: </span>
          <span className="text-zinc-200 font-semibold tabular-nums">
            ${maxOrderSizeUsd.toLocaleString()}
          </span>
        </div>

        <div>
          <span className="text-zinc-500 uppercase">EXPOSURE: </span>
          <span
            className={`font-semibold tabular-nums ${
              currentExposureUsd >= maxExposureUsd * 0.8 ? 'text-amber-400' : 'text-zinc-200'
            }`}
          >
            ${currentExposureUsd.toFixed(0)} / ${maxExposureUsd.toLocaleString()} ({maxExposurePct}%)
          </span>
        </div>

        <div>
          <span className="text-zinc-500 uppercase">DAILY LOSS: </span>
          <span className="text-zinc-200 font-semibold tabular-nums">
            ${currentDailyLossUsd.toFixed(0)} / ${dailyLossLimitUsd.toLocaleString()}
          </span>
        </div>

        <div>
          <span className="text-zinc-500 uppercase">DRAWDOWN: </span>
          <span className="text-zinc-200 font-semibold tabular-nums">
            -{currentDrawdownPct.toFixed(2)}%
          </span>
        </div>

        <div>
          <span className="text-zinc-500 uppercase">POSITIONS: </span>
          <span className="text-cyan-400 font-semibold tabular-nums">
            {openPositionsCount} ACTIVE
          </span>
        </div>
      </div>

      {/* Right: Emergency HALT Button */}
      <div>
        <button
          onClick={onToggleHalt}
          className={`flex items-center gap-1.5 px-3 py-1.5 font-bold uppercase tracking-wider text-[11px] border transition-all ${
            isHalted
              ? 'bg-emerald-600 hover:bg-emerald-500 text-black border-emerald-400 shadow-[0_0_12px_#10b981]'
              : 'bg-rose-600 hover:bg-rose-500 text-white border-rose-400 shadow-[0_0_12px_#f43f5e]'
          }`}
          title={isHalted ? 'Resume and unfreeze risk gateway' : 'Emergency Stop: freezes new executions and cancels pending orders'}
        >
          {isHalted ? (
            <>
              <Unlock className="w-3.5 h-3.5" />
              <span>RESUME SYSTEM</span>
            </>
          ) : (
            <>
              <Octagon className="w-3.5 h-3.5" />
              <span>HALT TRADING</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
