/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * OPC Trade Lab V1 — Mode Switch Confirmation Modal
 * Strict safety gateway before switching from DEMO simulator to LIVE trading.
 * Displays venue, account, strategy, max order size, max exposure, daily loss limit,
 * kill switch state, and explicit user confirmation checkbox.
 */

import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  X,
  Lock,
  CheckSquare,
  Square,
  ArrowRight
} from 'lucide-react';
import { AccountTradingMode, StrategyDefinition } from '../../types/commandCenter.ts';

interface ModeSwitchConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMode: AccountTradingMode;
  onConfirmSwitch: (newMode: AccountTradingMode) => void;
  venue: string;
  accountName: string;
  strategy: StrategyDefinition;
  killSwitchState: string;
}

export const ModeSwitchConfirmationModal: React.FC<ModeSwitchConfirmationModalProps> = ({
  isOpen,
  onClose,
  currentMode,
  onConfirmSwitch,
  venue,
  accountName,
  strategy,
  killSwitchState
}) => {
  const [understoodRisks, setUnderstoodRisks] = useState<boolean>(false);
  const [confirmedCapitalRisk, setConfirmedCapitalRisk] = useState<boolean>(false);

  if (!isOpen) return null;

  const targetMode: AccountTradingMode = currentMode === 'DEMO' ? 'LIVE' : 'DEMO';
  const isSwitchingToLive = targetMode === 'LIVE';

  const canExecuteLive =
    !isSwitchingToLive ||
    (strategy.validationStatus === 'LIVE APPROVED' &&
      understoodRisks &&
      confirmedCapitalRisk);

  const handleConfirm = () => {
    if (canExecuteLive) {
      onConfirmSwitch(targetMode);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 select-none">
      <div className="bg-[#0b0e14] border-2 border-rose-500/80 w-full max-w-lg font-mono text-xs shadow-[0_0_50px_rgba(244,63,94,0.3)] flex flex-col">
        {/* Header */}
        <div className="p-3 bg-rose-950/60 border-b border-rose-500/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            <h3 className="font-bold text-rose-200 uppercase tracking-wider text-sm">
              {isSwitchingToLive ? 'AUTHORIZATION: ENGAGE LIVE TRADING' : 'SWITCH TO SIMULATED DEMO'}
            </h3>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3.5">
          {isSwitchingToLive ? (
            <>
              <div className="bg-rose-900/20 border border-rose-500/30 p-2.5 text-[11px] text-rose-300 leading-relaxed">
                <strong>CRITICAL WARNING:</strong> You are about to enable real financial execution.
                All orders routed through the Risk Engine will be submitted directly to the exchange
                with real capital.
              </div>

              {/* Pre-flight Audit Summary */}
              <div className="border border-[#20293d] bg-[#07090e] p-3 space-y-2">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold border-b border-[#1b2336] pb-1">
                  PRE-FLIGHT RISK ENGINE AUDIT
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-zinc-500 text-[10px] block">VENUE:</span>
                    <span className="text-zinc-100 font-bold">{venue}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-[10px] block">ACCOUNT:</span>
                    <span className="text-zinc-100 font-bold">{accountName}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-[10px] block">STRATEGY:</span>
                    <span className="text-cyan-400 font-bold">{strategy.name}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-[10px] block">VALIDATION STATUS:</span>
                    <span
                      className={`font-bold ${
                        strategy.validationStatus === 'LIVE APPROVED'
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {strategy.validationStatus}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-[10px] block">MAX ORDER SIZE:</span>
                    <span className="text-zinc-200 font-semibold">${strategy.maxOrderSize.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-[10px] block">MAX EXPOSURE:</span>
                    <span className="text-zinc-200 font-semibold">${strategy.maxExposure.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-[10px] block">DAILY LOSS LIMIT:</span>
                    <span className="text-rose-400 font-semibold">${strategy.dailyLossLimit.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-[10px] block">KILL SWITCH STATE:</span>
                    <span className="text-emerald-400 font-semibold">{killSwitchState}</span>
                  </div>
                </div>
              </div>

              {strategy.validationStatus !== 'LIVE APPROVED' && (
                <div className="text-rose-400 bg-rose-950/50 p-2 border border-rose-500 text-[11px] font-bold">
                  CANNOT ENGAGE: Selected strategy is not marked &apos;LIVE APPROVED&apos; by the quant risk team.
                </div>
              )}

              {/* Explicit Confirmation Checkboxes */}
              <div className="space-y-2 pt-1">
                <label className="flex items-start gap-2 cursor-pointer text-zinc-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={understoodRisks}
                    onChange={(e) => setUnderstoodRisks(e.target.checked)}
                    className="mt-0.5 accent-rose-500 cursor-pointer"
                  />
                  <span>
                    I confirm that API keys possess trade rights and that withdrawals remain disabled.
                  </span>
                </label>

                <label className="flex items-start gap-2 cursor-pointer text-zinc-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={confirmedCapitalRisk}
                    onChange={(e) => setConfirmedCapitalRisk(e.target.checked)}
                    className="mt-0.5 accent-rose-500 cursor-pointer"
                  />
                  <span>
                    I authorize the Risk Engine to enforce automated slippage stops and exposure caps.
                  </span>
                </label>
              </div>
            </>
          ) : (
            <div className="text-zinc-300 leading-relaxed text-[11px]">
              Switch back to <strong>DEMO SIMULATOR</strong> mode. Real exchange routing will be immediately disengaged and replaced with the Paper Execution Engine. No real capital will be at risk.
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3 bg-[#080a0f] border-t border-[#1b2230] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-[#141b29] border border-[#222d42] text-zinc-400 hover:text-zinc-100"
          >
            ABORT
          </button>

          <button
            onClick={handleConfirm}
            disabled={!canExecuteLive}
            className={`px-4 py-1.5 font-bold uppercase tracking-wider transition-all border ${
              isSwitchingToLive
                ? canExecuteLive
                  ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-400 shadow-[0_0_15px_#f43f5e]'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-500 cursor-not-allowed'
                : 'bg-cyan-600 hover:bg-cyan-500 text-white border-cyan-400'
            }`}
          >
            {isSwitchingToLive ? 'CONFIRM & ENGAGE LIVE' : 'CONFIRM SWITCH TO DEMO'}
          </button>
        </div>
      </div>
    </div>
  );
};
