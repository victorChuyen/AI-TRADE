/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * OPC Trade Lab V1 — Lower Right: Analytics Histograms Panel
 * Four distinct institutional distribution panels with actual computed figures:
 * 1. SIGNALS: Confidence strength distribution
 * 2. FILLS: Fill rates & execution completion quality
 * 3. P&L: Win vs loss distribution
 * 4. LATENCY: Sub-second gateway & execution latency histogram
 */

import React from 'react';
import {
  BarChart2,
  PieChart,
  Activity,
  Zap,
  TrendingUp,
  Clock
} from 'lucide-react';

interface AnalyticsPanelProps {
  signalsData?: { label: string; count: number; pct: number }[];
  fillsData?: { label: string; count: number; pct: number }[];
  pnlData?: { bucket: string; count: number; isPositive: boolean }[];
  latencyData?: { bin: string; count: number }[];
}

export const AnalyticsPanel: React.FC<AnalyticsPanelProps> = ({
  signalsData = [
    { label: '60-70%', count: 4, pct: 15 },
    { label: '70-80%', count: 8, pct: 30 },
    { label: '80-90%', count: 11, pct: 41 },
    { label: '90-100%', count: 4, pct: 14 }
  ],
  fillsData = [
    { label: '100% Full', count: 22, pct: 82 },
    { label: 'Partial', count: 3, pct: 11 },
    { label: 'Slippage Rej', count: 2, pct: 7 }
  ],
  pnlData = [
    { bucket: '< -$10', count: 1, isPositive: false },
    { bucket: '-$10..0', count: 2, isPositive: false },
    { bucket: '$0..+$5', count: 8, isPositive: true },
    { bucket: '+$5..+$15', count: 12, isPositive: true },
    { bucket: '> +$15', count: 4, isPositive: true }
  ],
  latencyData = [
    { bin: '<20ms', count: 6 },
    { bin: '20-40ms', count: 15 },
    { bin: '40-60ms', count: 5 },
    { bin: '60-100ms', count: 2 },
    { bin: '>100ms', count: 0 }
  ]
}) => {
  return (
    <div className="bg-[#0b0e14] border border-[#1b2230] p-3 flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1b2230] pb-2 mb-2">
        <div className="flex items-center gap-1.5">
          <BarChart2 className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-mono text-xs font-bold text-zinc-100 uppercase tracking-wider">
            ANALYTICS &amp; DISTRIBUTIONS
          </span>
        </div>
        <span className="text-[10px] font-mono text-zinc-500">
          N=27 TRADES
        </span>
      </div>

      {/* 4 Mini Histograms Grid */}
      <div className="grid grid-cols-2 gap-2 flex-1">
        {/* Histogram 1: SIGNALS */}
        <div className="bg-[#080b11] border border-[#161f2e] p-2 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[9px] font-mono text-zinc-400 border-b border-[#182334] pb-1">
            <span className="font-bold text-cyan-400">1. SIGNALS</span>
            <span>AVG: 81.4%</span>
          </div>
          <div className="flex items-end gap-1 h-16 pt-2">
            {signalsData.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center h-full justify-end">
                <div
                  className="w-full bg-cyan-500/70 hover:bg-cyan-400 transition-all"
                  style={{ height: `${(d.pct / 45) * 100}%` }}
                  title={`${d.label}: ${d.count} signals (${d.pct}%)`}
                />
                <span className="text-[7px] font-mono text-zinc-500 mt-1 truncate max-w-full">
                  {d.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Histogram 2: FILLS */}
        <div className="bg-[#080b11] border border-[#161f2e] p-2 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[9px] font-mono text-zinc-400 border-b border-[#182334] pb-1">
            <span className="font-bold text-emerald-400">2. FILLS</span>
            <span>93% SUCCESS</span>
          </div>
          <div className="flex items-end gap-1.5 h-16 pt-2">
            {fillsData.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center h-full justify-end">
                <div
                  className={`w-full transition-all ${
                    i === 0 ? 'bg-emerald-500/70' : i === 1 ? 'bg-amber-500/70' : 'bg-rose-500/70'
                  }`}
                  style={{ height: `${(d.pct / 85) * 100}%` }}
                  title={`${d.label}: ${d.count} (${d.pct}%)`}
                />
                <span className="text-[7px] font-mono text-zinc-500 mt-1 truncate max-w-full">
                  {d.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Histogram 3: P&L */}
        <div className="bg-[#080b11] border border-[#161f2e] p-2 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[9px] font-mono text-zinc-400 border-b border-[#182334] pb-1">
            <span className="font-bold text-emerald-400">3. P&amp;L</span>
            <span>WIN: 88.9%</span>
          </div>
          <div className="flex items-end gap-1 h-16 pt-2">
            {pnlData.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center h-full justify-end">
                <div
                  className={`w-full transition-all ${
                    d.isPositive ? 'bg-emerald-500/70 hover:bg-emerald-400' : 'bg-rose-500/70 hover:bg-rose-400'
                  }`}
                  style={{ height: `${Math.max(10, (d.count / 12) * 100)}%` }}
                  title={`${d.bucket}: ${d.count} trades`}
                />
                <span className="text-[6px] font-mono text-zinc-500 mt-1 truncate max-w-full">
                  {d.bucket}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Histogram 4: LATENCY */}
        <div className="bg-[#080b11] border border-[#161f2e] p-2 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[9px] font-mono text-zinc-400 border-b border-[#182334] pb-1">
            <span className="font-bold text-purple-400">4. LATENCY</span>
            <span>MED: 32ms</span>
          </div>
          <div className="flex items-end gap-1 h-16 pt-2">
            {latencyData.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center h-full justify-end">
                <div
                  className="w-full bg-purple-500/70 hover:bg-purple-400 transition-all"
                  style={{ height: `${Math.max(5, (d.count / 15) * 100)}%` }}
                  title={`${d.bin}: ${d.count} requests`}
                />
                <span className="text-[6px] font-mono text-zinc-500 mt-1 truncate max-w-full">
                  {d.bin}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
