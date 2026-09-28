/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * OPC Trade Lab V1 — Top Right: AI Strategy Engine
 * Displays:
 * - Strategy Name, Version, Config Hash
 * - Status (OBSERVING, SIGNAL, VALIDATING, RISK CHECK, QUEUED, EXECUTING, PARTIAL, FILLED, REJECTED, HALTED)
 * - Live miniature signal / edge visualization
 * - Current Decision (BUY, SELL, NO TRADE, PAIR OPPORTUNITY, REJECTED)
 * - Edge, Fees, Slippage, Net Edge, Risk Allocation, Expiry
 * - Mandatory Institutional Pipeline with Risk Engine Gateway:
 *   MARKET DATA -> STRATEGY ENGINE -> TRADE INTENT -> [RISK ENGINE GATEWAY] -> EXECUTION ROUTER -> EXCHANGE
 */

import React from 'react';
import {
  Cpu,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  AlertOctagon,
  Clock,
  Zap,
  CheckCircle2,
  XCircle,
  PauseCircle
} from 'lucide-react';
import { ExecutionEngineStatus, StrategyDecision } from '../../types/commandCenter.ts';

interface AiStrategyEnginePanelProps {
  strategyName: string;
  version: string;
  configHash: string;
  status: ExecutionEngineStatus;
  decision: StrategyDecision;
  confidencePct: number;
  grossEdgePct: number;
  estimatedFeePct: number;
  estimatedSlippagePct: number;
  expectedNetEdgePct: number;
  riskAllocationUsd: number;
  riskAllocationPct: number;
  expirySeconds: number;
  isRiskEnginePassing: boolean;
  onToggleHalt?: () => void;
}

export const AiStrategyEnginePanel: React.FC<AiStrategyEnginePanelProps> = ({
  strategyName,
  version,
  configHash,
  status,
  decision,
  confidencePct,
  grossEdgePct,
  estimatedFeePct,
  estimatedSlippagePct,
  expectedNetEdgePct,
  riskAllocationUsd,
  riskAllocationPct,
  expirySeconds,
  isRiskEnginePassing,
  onToggleHalt
}) => {
  const getStatusBadge = (st: ExecutionEngineStatus) => {
    switch (st) {
      case 'OBSERVING':
        return 'text-blue-400 bg-blue-950/40 border-blue-500/40';
      case 'SIGNAL':
      case 'VALIDATING':
        return 'text-cyan-400 bg-cyan-950/40 border-cyan-500/40 animate-pulse';
      case 'RISK CHECK':
        return 'text-amber-400 bg-amber-950/40 border-amber-500/40 font-bold';
      case 'QUEUED':
      case 'EXECUTING':
        return 'text-purple-400 bg-purple-950/40 border-purple-500/40';
      case 'FILLED':
      case 'PARTIAL':
        return 'text-emerald-400 bg-emerald-950/40 border-emerald-500/40';
      case 'REJECTED':
      case 'HALTED':
      default:
        return 'text-rose-400 bg-rose-950/40 border-rose-500/40';
    }
  };

  const getDecisionBadge = (dec: StrategyDecision) => {
    switch (dec) {
      case 'PAIR OPPORTUNITY':
      case 'BUY':
        return 'bg-emerald-950/50 border-emerald-500 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.25)]';
      case 'SELL':
        return 'bg-rose-950/50 border-rose-500 text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.25)]';
      case 'REJECTED':
        return 'bg-amber-950/50 border-amber-500 text-amber-400';
      case 'NO TRADE':
      default:
        return 'bg-[#0f1422] border-[#222c42] text-zinc-400';
    }
  };

  // Pipeline step status helpers
  const isMarketDataActive = true;
  const isStrategyActive = status !== 'HALTED';
  const isTradeIntentActive = ['SIGNAL', 'VALIDATING', 'RISK CHECK', 'QUEUED', 'EXECUTING', 'FILLED'].includes(status);
  const isRiskApproved = isRiskEnginePassing && status !== 'REJECTED' && status !== 'HALTED';
  const isExecutionActive = ['EXECUTING', 'PARTIAL', 'FILLED'].includes(status);

  return (
    <div className="bg-[#0b0e14] border border-[#1b2230] p-3 flex flex-col justify-between h-full relative">
      {/* Header */}
      <div className="border-b border-[#1b2230] pb-2 mb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-mono text-xs font-bold text-zinc-200 tracking-wider">
              AI STRATEGY ENGINE
            </span>
          </div>
          <span
            className={`font-mono text-[9px] px-1.5 py-0.5 border font-semibold uppercase ${getStatusBadge(
              status
            )}`}
          >
            {status}
          </span>
        </div>

        <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 mt-1">
          <span>{strategyName} · {version}</span>
          <span className="text-zinc-600 truncate max-w-[90px]">{configHash}</span>
        </div>
      </div>

      {/* Decision & Confidence Box */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div className={`p-2 border flex flex-col justify-between ${getDecisionBadge(decision)}`}>
          <div className="text-[9px] font-mono uppercase tracking-wider text-zinc-400">
            CURRENT DECISION
          </div>
          <div className="text-sm font-mono font-black tracking-wide my-1">
            {decision}
          </div>
          <div className="text-[9px] font-mono text-zinc-400">
            EXPIRY: <span className="font-semibold text-zinc-200">{expirySeconds}s</span>
          </div>
        </div>

        <div className="bg-[#080d17] border border-[#182338] p-2 flex flex-col justify-between">
          <div className="text-[9px] font-mono uppercase tracking-wider text-zinc-500">
            CONFIDENCE &amp; EDGE
          </div>
          <div className="flex items-baseline justify-between my-1">
            <span className="font-mono text-lg font-bold text-cyan-400 tabular-nums">
              {confidencePct.toFixed(1)}%
            </span>
            <span className="font-mono text-xs text-emerald-400 font-bold tabular-nums">
              +{expectedNetEdgePct.toFixed(2)}% NET
            </span>
          </div>
          {/* Mini Signal Sparkline Bar */}
          <div className="w-full bg-[#141d2e] h-1.5 rounded-none overflow-hidden flex">
            <div
              className="bg-cyan-400 h-full transition-all duration-300"
              style={{ width: `${Math.min(100, confidencePct)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Quantitative Edge & Risk Calculations */}
      <div className="grid grid-cols-3 gap-1 text-[10px] font-mono bg-[#080a0f] border border-[#161f2f] p-1.5 mb-2">
        <div>
          <span className="text-zinc-500 block text-[9px]">GROSS EDGE</span>
          <span className="text-emerald-400 font-bold tabular-nums">+{grossEdgePct.toFixed(2)}%</span>
        </div>
        <div>
          <span className="text-zinc-500 block text-[9px]">FEES / SLIPPAGE</span>
          <span className="text-zinc-300 font-semibold tabular-nums">
            -{estimatedFeePct.toFixed(2)}% / {estimatedSlippagePct.toFixed(2)}%
          </span>
        </div>
        <div>
          <span className="text-zinc-500 block text-[9px]">RISK ALLOC</span>
          <span className="text-amber-400 font-bold tabular-nums">
            ${riskAllocationUsd} ({riskAllocationPct}%)
          </span>
        </div>
      </div>

      {/* MANDATORY INSTITUTIONAL EXECUTION PIPELINE */}
      <div className="bg-[#07090e] border border-[#171f2d] p-2">
        <div className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 flex items-center justify-between mb-1.5">
          <span>PIPELINE ROUTING</span>
          <span className="text-zinc-600">ZERO DIRECT AI ORDERS</span>
        </div>

        {/* Pipeline Diagram */}
        <div className="grid grid-cols-6 gap-0.5 text-[8px] font-mono text-center">
          {/* Step 1 */}
          <div className="bg-[#0c121e] border border-cyan-500/40 p-1 flex flex-col items-center">
            <span className="text-cyan-400 font-bold">FEED</span>
            <span className="text-[7px] text-zinc-500">MKT DATA</span>
          </div>

          {/* Step 2 */}
          <div className="bg-[#0c121e] border border-cyan-500/40 p-1 flex flex-col items-center">
            <span className="text-cyan-400 font-bold">STRAT</span>
            <span className="text-[7px] text-zinc-500">QUANT AI</span>
          </div>

          {/* Step 3 */}
          <div
            className={`border p-1 flex flex-col items-center ${
              isTradeIntentActive
                ? 'bg-purple-950/40 border-purple-500 text-purple-300 font-bold'
                : 'bg-[#090d16] border-[#1b2336] text-zinc-600'
            }`}
          >
            <span>INTENT</span>
            <span className="text-[7px] text-zinc-500">ORDER REQ</span>
          </div>

          {/* Step 4: RISK ENGINE GATEWAY (Highlighted as MANDATORY GATEWAY) */}
          <div
            className={`border-2 p-1 flex flex-col items-center relative ${
              isRiskApproved
                ? 'bg-emerald-950/50 border-emerald-500 text-emerald-300 font-bold shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                : 'bg-rose-950/50 border-rose-500 text-rose-300 font-bold'
            }`}
          >
            <div className="text-[7px] text-amber-400 font-black">GATEWAY</div>
            <span className="text-[8px]">RISK</span>
          </div>

          {/* Step 5 */}
          <div
            className={`border p-1 flex flex-col items-center ${
              isExecutionActive
                ? 'bg-cyan-950/40 border-cyan-500 text-cyan-300 font-bold'
                : 'bg-[#090d16] border-[#1b2336] text-zinc-600'
            }`}
          >
            <span>ROUTER</span>
            <span className="text-[7px] text-zinc-500">EXEC</span>
          </div>

          {/* Step 6 */}
          <div
            className={`border p-1 flex flex-col items-center ${
              status === 'FILLED'
                ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300 font-bold'
                : 'bg-[#090d16] border-[#1b2336] text-zinc-600'
            }`}
          >
            <span>EXCHANGE</span>
            <span className="text-[7px] text-zinc-500">CLOB</span>
          </div>
        </div>

        <div className="mt-1.5 flex items-center justify-between text-[9px] font-mono text-zinc-500">
          <div className="flex items-center gap-1">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isRiskApproved ? 'bg-emerald-400' : 'bg-rose-500'
              }`}
            />
            <span>
              Risk Engine Check:{' '}
              <strong className={isRiskApproved ? 'text-emerald-400' : 'text-rose-400'}>
                {isRiskApproved ? 'PERMITTED (0.42ms)' : 'REJECTED (Limits Exceeded)'}
              </strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
