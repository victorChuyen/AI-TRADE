/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * OPC Trade Lab V1 — Top Left Panel: Account / Capital / Engine Status
 * High-density quant metrics: Equity, Starting Capital, Available Cash,
 * Reserved Cash, Realized/Unrealized P&L, Exposure, Drawdown, and Demo reset controls.
 */

import React, { useState } from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Shield,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  PlusCircle,
  Lock,
  Layers,
  Activity,
  Zap,
  SlidersHorizontal
} from 'lucide-react';
import { AccountTradingMode } from '../../types/commandCenter.ts';

interface AccountAiEnginePanelProps {
  tradingMode: AccountTradingMode;
  accountName: string;
  connectedVenue: string;
  strategyName: string;
  equity: number;
  startingCapital: number;
  availableCash: number;
  reservedCash: number;
  realizedPnl: number;
  unrealizedPnl: number;
  openExposure: number;
  drawdownPct: number;
  tradesToday: number;
  winRatePct: number;
  onResetDemoCapital: (amount: number) => void;
  liveAccountMaskedKey?: string;
  liveCanTrade?: boolean;
  liveCanWithdraw?: boolean;
}

export const AccountAiEnginePanel: React.FC<AccountAiEnginePanelProps> = ({
  tradingMode,
  accountName,
  connectedVenue,
  strategyName,
  equity,
  startingCapital,
  availableCash,
  reservedCash,
  realizedPnl,
  unrealizedPnl,
  openExposure,
  drawdownPct,
  tradesToday,
  winRatePct,
  onResetDemoCapital,
  liveAccountMaskedKey = 'binance_***9a4',
  liveCanTrade = true,
  liveCanWithdraw = false
}) => {
  const [showDemoModal, setShowDemoModal] = useState<boolean>(false);
  const [customInput, setCustomInput] = useState<string>('5000');

  const presetAmounts = [100, 500, 1000, 5000, 10000];

  const totalPnl = realizedPnl + unrealizedPnl;
  const totalPnlPct = startingCapital > 0 ? (totalPnl / startingCapital) * 100 : 0;

  return (
    <div className="bg-[#0b0e14] border border-[#1b2230] rounded-none p-3 flex flex-col justify-between h-full relative overflow-hidden">
      {/* Corner Technical Indicator */}
      <div className="absolute top-0 right-0 w-8 h-8 pointer-events-none overflow-hidden">
        <div
          className={`absolute transform rotate-45 text-[8px] font-mono font-bold py-0.5 right-[-24px] top-[4px] w-20 text-center ${
            tradingMode === 'LIVE' ? 'bg-rose-500/30 text-rose-300' : 'bg-cyan-500/20 text-cyan-300'
          }`}
        >
          {tradingMode}
        </div>
      </div>

      {/* Header Info */}
      <div className="border-b border-[#1b2230] pb-2 mb-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-mono text-[11px] font-bold text-zinc-200 uppercase tracking-wider">
              {accountName}
            </span>
          </div>
          <span className="font-mono text-[10px] text-zinc-500 uppercase">
            {connectedVenue}
          </span>
        </div>

        <div className="flex items-center justify-between mt-1 text-[10px] font-mono text-zinc-400">
          <span>STRATEGY: <span className="text-cyan-400 font-semibold">{strategyName}</span></span>
          <span className="text-zinc-500">{tradingMode === 'LIVE' ? 'AUTH LIVE' : 'SIM LEDGER'}</span>
        </div>
      </div>

      {/* Large Primary Metric: ACCOUNT EQUITY */}
      <div className="bg-[#080a0f] border border-[#181f2c] p-2.5 mb-2.5">
        <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
          <span className="uppercase tracking-wider">ACCOUNT EQUITY</span>
          <div className="flex items-center gap-1">
            <span
              className={`font-semibold tabular-nums text-[10px] ${
                totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {totalPnl >= 0 ? `+${totalPnlPct.toFixed(2)}%` : `${totalPnlPct.toFixed(2)}%`}
            </span>
            <span className="text-zinc-600">vs start</span>
          </div>
        </div>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="font-mono text-2xl font-bold tracking-tight text-zinc-100 tabular-nums">
            ${equity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="font-mono text-xs text-zinc-500 uppercase">USD</span>
        </div>
      </div>

      {/* High-Density Secondary Metrics Grid */}
      <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono mb-2.5">
        <div className="bg-[#0d121c] p-1.5 border border-[#1b2332]">
          <div className="text-[9px] text-zinc-500 uppercase">Starting Capital</div>
          <div className="text-zinc-300 font-semibold tabular-nums">
            ${startingCapital.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="bg-[#0d121c] p-1.5 border border-[#1b2332]">
          <div className="text-[9px] text-zinc-500 uppercase">Available Cash</div>
          <div className="text-emerald-400 font-semibold tabular-nums">
            ${availableCash.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="bg-[#0d121c] p-1.5 border border-[#1b2332]">
          <div className="text-[9px] text-zinc-500 uppercase">Reserved Cash</div>
          <div className="text-amber-400 font-semibold tabular-nums">
            ${reservedCash.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="bg-[#0d121c] p-1.5 border border-[#1b2332]">
          <div className="text-[9px] text-zinc-500 uppercase">Open Exposure</div>
          <div className="text-cyan-400 font-semibold tabular-nums">
            ${openExposure.toFixed(2)}{' '}
            <span className="text-[9px] text-zinc-500">
              ({startingCapital > 0 ? ((openExposure / startingCapital) * 100).toFixed(1) : 0}%)
            </span>
          </div>
        </div>

        <div className="bg-[#0d121c] p-1.5 border border-[#1b2332]">
          <div className="text-[9px] text-zinc-500 uppercase">Realized P&amp;L</div>
          <div
            className={`font-semibold tabular-nums ${
              realizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {realizedPnl >= 0 ? `+$${realizedPnl.toFixed(2)}` : `-$${Math.abs(realizedPnl).toFixed(2)}`}
          </div>
        </div>

        <div className="bg-[#0d121c] p-1.5 border border-[#1b2332]">
          <div className="text-[9px] text-zinc-500 uppercase">Unrealized P&amp;L</div>
          <div
            className={`font-semibold tabular-nums ${
              unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {unrealizedPnl >= 0 ? `+$${unrealizedPnl.toFixed(2)}` : `-$${Math.abs(unrealizedPnl).toFixed(2)}`}
          </div>
        </div>

        <div className="bg-[#0d121c] p-1.5 border border-[#1b2332]">
          <div className="text-[9px] text-zinc-500 uppercase">Max Drawdown</div>
          <div className="text-zinc-300 font-semibold tabular-nums">
            {drawdownPct > 0 ? `-${drawdownPct.toFixed(2)}%` : '0.00%'}
          </div>
        </div>

        <div className="bg-[#0d121c] p-1.5 border border-[#1b2332]">
          <div className="text-[9px] text-zinc-500 uppercase">Trades Today</div>
          <div className="text-cyan-300 font-semibold tabular-nums">
            {tradesToday} <span className="text-[9px] text-zinc-500">({winRatePct}% Win)</span>
          </div>
        </div>
      </div>

      {/* Mode Specific Controls & Security Status */}
      {tradingMode === 'DEMO' ? (
        <div className="bg-[#080c14] border border-[#1a2334] p-2 mt-auto">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-mono text-cyan-400 font-semibold uppercase">
              CREATE DEMO ACCOUNT
            </span>
            <span className="text-[9px] font-mono text-amber-400/90 font-bold bg-amber-950/40 px-1 py-0.5 border border-amber-500/30">
              SIMULATED CAPITAL · NO REAL FUNDS
            </span>
          </div>

          <div className="flex items-center gap-1">
            {presetAmounts.map((amt) => (
              <button
                key={amt}
                onClick={() => onResetDemoCapital(amt)}
                className={`flex-1 py-1 text-[10px] font-mono border transition-all ${
                  startingCapital === amt
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold'
                    : 'bg-[#0f1420] border-[#222a3d] text-zinc-400 hover:text-zinc-200 hover:border-zinc-500'
                }`}
              >
                ${amt >= 1000 ? `${amt / 1000}k` : amt}
              </button>
            ))}
            <button
              onClick={() => setShowDemoModal(!showDemoModal)}
              className="px-2 py-1 text-[10px] font-mono bg-[#141b2b] border border-[#232d43] text-zinc-300 hover:text-cyan-300"
              title="Custom capital"
            >
              Custom
            </button>
          </div>

          {showDemoModal && (
            <div className="mt-2 flex items-center gap-1.5 pt-1.5 border-t border-[#1b2332]">
              <span className="text-[10px] font-mono text-zinc-400">$</span>
              <input
                type="number"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                className="bg-[#090d15] border border-[#263148] text-zinc-200 font-mono text-xs px-2 py-0.5 rounded w-24 focus:outline-none focus:border-cyan-400"
                placeholder="Amount"
              />
              <button
                onClick={() => {
                  const val = parseFloat(customInput);
                  if (val > 0) {
                    onResetDemoCapital(val);
                    setShowDemoModal(false);
                  }
                }}
                className="bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-[10px] px-2.5 py-0.5 font-bold"
              >
                APPLY
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-[#120a10] border border-[#2f1722] p-2 mt-auto">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono text-rose-400 font-bold uppercase flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-rose-400" />
              AUTHENTICATED LIVE STATUS
            </span>
            <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/40 px-1 py-0.5 border border-emerald-500/30">
              SECURE SESSION
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1 text-[10px] font-mono text-zinc-400">
            <div>KEY: <span className="text-zinc-200">{liveAccountMaskedKey}</span></div>
            <div>TRADE PERM: <span className="text-emerald-400 font-bold">{liveCanTrade ? 'ENABLED' : 'DISABLED'}</span></div>
            <div>WITHDRAWALS: <span className="text-emerald-400 font-bold">{liveCanWithdraw ? 'ENABLED' : 'DISABLED (SAFE)'}</span></div>
            <div>GATEWAY: <span className="text-cyan-400">ENCRYPTED PROXY</span></div>
          </div>
        </div>
      )}
    </div>
  );
};
