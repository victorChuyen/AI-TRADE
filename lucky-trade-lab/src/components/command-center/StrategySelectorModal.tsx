/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * OPC Trade Lab V1 — Strategy Selector Modal / Drawer
 * Supports 3 initial strategy slots:
 * 1. BINARY_COMPLETE_SET_V1 (Paper Validated)
 * 2. TREND_BREAKOUT_ATR_V1 (Live Approved)
 * 3. MEAN_REVERSION_BB_RSI_V1 (Backtested)
 * Displays version, config hash, validation status, venue, timeframe, and risk limits.
 */

import React from 'react';
import {
  X,
  Cpu,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  Clock,
  Layers,
  BarChart,
  Lock
} from 'lucide-react';
import { StrategyDefinition, StrategyValidationStatus } from '../../types/commandCenter.ts';

interface StrategySelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  strategies: StrategyDefinition[];
  selectedStrategyId: string;
  onSelectStrategy: (strat: StrategyDefinition) => void;
  isLiveMode: boolean;
}

export const StrategySelectorModal: React.FC<StrategySelectorModalProps> = ({
  isOpen,
  onClose,
  strategies,
  selectedStrategyId,
  onSelectStrategy,
  isLiveMode
}) => {
  if (!isOpen) return null;

  const getValidationBadge = (status: StrategyValidationStatus) => {
    switch (status) {
      case 'LIVE APPROVED':
        return 'text-emerald-400 bg-emerald-950/60 border-emerald-500/50';
      case 'PAPER VALIDATED':
        return 'text-cyan-400 bg-cyan-950/60 border-cyan-500/50';
      case 'BACKTESTED':
        return 'text-amber-400 bg-amber-950/60 border-amber-500/50';
      case 'RESEARCH':
      default:
        return 'text-zinc-400 bg-zinc-900 border-zinc-700';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 select-none">
      <div className="bg-[#0b0e14] border border-cyan-500/40 w-full max-w-2xl max-h-[90vh] overflow-y-auto font-mono text-xs shadow-[0_0_40px_rgba(34,211,238,0.15)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1b2230] p-3 bg-[#080a0f]">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-zinc-100 uppercase tracking-wider text-sm">
              STRATEGY SELECTOR &amp; RISK LIMITS
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-200 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Notice for Live Mode */}
        {isLiveMode && (
          <div className="bg-rose-950/40 border-b border-rose-500/30 p-2.5 text-[11px] text-rose-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>
              LIVE MODE ENGAGED: Only strategies with <strong>LIVE APPROVED</strong> status can receive execution allocations.
            </span>
          </div>
        )}

        {/* Strategy List */}
        <div className="p-3 space-y-3 flex-1">
          {strategies.map((strat) => {
            const isSelected = selectedStrategyId === strat.id;
            const canRunInLive = !isLiveMode || strat.validationStatus === 'LIVE APPROVED';

            return (
              <div
                key={strat.id}
                onClick={() => {
                  if (canRunInLive) {
                    onSelectStrategy(strat);
                    onClose();
                  }
                }}
                className={`border p-3 transition-all cursor-pointer relative ${
                  isSelected
                    ? 'bg-[#0f1624] border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]'
                    : canRunInLive
                    ? 'bg-[#080b11] border-[#1c2638] hover:border-zinc-500'
                    : 'bg-[#08090d] border-[#151c27] opacity-60 cursor-not-allowed'
                }`}
              >
                {/* Header row */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-zinc-100 text-sm">{strat.name}</span>
                    <span className="text-[10px] text-zinc-500">{strat.version}</span>
                  </div>

                  <span
                    className={`text-[10px] px-2 py-0.5 border font-bold uppercase tracking-wider ${getValidationBadge(
                      strat.validationStatus
                    )}`}
                  >
                    {strat.validationStatus}
                  </span>
                </div>

                <p className="text-zinc-400 text-[11px] mb-2 leading-relaxed">
                  {strat.description}
                </p>

                {/* Specs Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] bg-[#07090e] border border-[#161e2b] p-2">
                  <div>
                    <span className="text-zinc-500 block text-[9px]">VENUE</span>
                    <span className="text-zinc-200 font-semibold">{strat.supportedVenue}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[9px]">TIMEFRAME</span>
                    <span className="text-cyan-400 font-semibold">{strat.timeframe}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[9px]">MAX ORDER</span>
                    <span className="text-zinc-200 font-semibold">${strat.maxOrderSize.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[9px]">DAILY LOSS LIMIT</span>
                    <span className="text-rose-400 font-semibold">${strat.dailyLossLimit.toLocaleString()}</span>
                  </div>
                </div>

                {/* Bottom line: Config Hash */}
                <div className="mt-2 flex items-center justify-between text-[9px] text-zinc-500 border-t border-[#161e2b] pt-1.5">
                  <span>CONFIG HASH: <span className="text-zinc-400">{strat.configHash}</span></span>
                  {isSelected && (
                    <span className="text-cyan-400 font-bold flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> ACTIVE SLOT
                    </span>
                  )}
                  {!canRunInLive && (
                    <span className="text-rose-400 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> BLOCKED IN LIVE (NOT APPROVED)
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="border-t border-[#1b2230] p-3 bg-[#080a0f] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#141c2c] border border-[#232f48] text-zinc-300 hover:text-white"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
