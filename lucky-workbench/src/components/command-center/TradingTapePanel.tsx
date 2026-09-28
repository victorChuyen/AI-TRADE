/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * OPC Trade Lab V1 — Lower Center: Trading Tape Panel
 * Dense execution table with high-speed rows.
 * Clicking any execution opens the mandatory institutional provenance chain:
 * SIGNAL -> TRADE INTENT -> RISK CHECK -> ORDER -> FILL -> LEDGER
 */

import React, { useState } from 'react';
import {
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
  Search,
  Filter
} from 'lucide-react';
import { ExecutionTapeItem } from '../../types/commandCenter.ts';

interface TradingTapePanelProps {
  executions: ExecutionTapeItem[];
  onSelectExecution: (item: ExecutionTapeItem) => void;
  selectedExecutionId?: string;
}

export const TradingTapePanel: React.FC<TradingTapePanelProps> = ({
  executions,
  onSelectExecution,
  selectedExecutionId
}) => {
  const [filterSide, setFilterSide] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const filtered = executions.filter((item) => {
    if (filterSide !== 'ALL' && item.side !== filterSide) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        item.market.toLowerCase().includes(q) ||
        item.strategy.toLowerCase().includes(q) ||
        item.venue.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="bg-[#0b0e14] border border-[#1b2230] p-3 flex flex-col justify-between h-full">
      {/* Header & Filter Controls */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#1b2230] pb-2 mb-2 gap-2">
        <div className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-mono text-xs font-bold text-zinc-100 uppercase tracking-wider">
            TRADING TAPE
          </span>
          <span className="text-[10px] font-mono text-zinc-500">
            ({filtered.length} EXECUTIONS)
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[10px] font-mono">
          {/* Quick Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search tape..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#080d16] border border-[#1c2638] text-zinc-300 text-[10px] px-2 py-0.5 w-24 sm:w-32 focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* Side Filter */}
          <div className="flex bg-[#0d121c] border border-[#1c2434] p-0.5">
            {(['ALL', 'BUY', 'SELL'] as const).map((side) => (
              <button
                key={side}
                onClick={() => setFilterSide(side)}
                className={`px-2 py-0.5 ${
                  filterSide === side
                    ? 'bg-cyan-500/20 text-cyan-300 font-bold border-b border-cyan-400'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {side}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Dense Execution Table */}
      <div className="flex-1 overflow-x-auto overflow-y-auto max-h-[170px] border border-[#141b27]">
        <table className="w-full text-left text-[10px] font-mono select-none">
          <thead className="bg-[#080d16] text-zinc-500 uppercase sticky top-0 z-10 border-b border-[#1b2436]">
            <tr>
              <th className="p-1.5">Time</th>
              <th className="p-1.5">Venue</th>
              <th className="p-1.5">Market</th>
              <th className="p-1.5">Strategy</th>
              <th className="p-1.5">Side</th>
              <th className="p-1.5 text-right">Qty</th>
              <th className="p-1.5 text-right">Price</th>
              <th className="p-1.5 text-right">Fee</th>
              <th className="p-1.5 text-right">Slip</th>
              <th className="p-1.5 text-center">Status</th>
              <th className="p-1.5 text-right">P&amp;L</th>
              <th className="p-1.5 text-center">Trace</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#131924]">
            {filtered.map((item, idx) => {
              const isSelected = selectedExecutionId === item.id;
              return (
                <tr
                  key={`tape_${item.id}_${idx}`}
                  onClick={() => onSelectExecution(item)}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-cyan-950/40 text-cyan-200'
                      : 'hover:bg-[#101622] text-zinc-300'
                  }`}
                >
                  <td className="p-1.5 text-zinc-500 whitespace-nowrap">{item.time}</td>
                  <td className="p-1.5 text-zinc-400 font-semibold">{item.venue}</td>
                  <td className="p-1.5 font-bold text-zinc-200">{item.market}</td>
                  <td className="p-1.5 text-zinc-400 truncate max-w-[90px]" title={item.strategy}>
                    {item.strategy}
                  </td>
                  <td className="p-1.5 font-bold">
                    <span
                      className={`px-1 py-0.5 rounded text-[9px] ${
                        item.side === 'BUY'
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-950/60 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {item.side}
                    </span>
                  </td>
                  <td className="p-1.5 text-right tabular-nums text-zinc-200 font-medium">
                    {item.qty}
                  </td>
                  <td className="p-1.5 text-right tabular-nums text-zinc-100 font-semibold">
                    ${item.price}
                  </td>
                  <td className="p-1.5 text-right tabular-nums text-zinc-500">{item.fee}</td>
                  <td className="p-1.5 text-right tabular-nums text-zinc-400">{item.slippage}</td>
                  <td className="p-1.5 text-center">
                    <span
                      className={`text-[9px] px-1 py-0.5 font-semibold ${
                        item.status === 'FILLED'
                          ? 'text-emerald-400 bg-emerald-950/30'
                          : item.status === 'PARTIAL'
                          ? 'text-amber-400 bg-amber-950/30'
                          : 'text-rose-400 bg-rose-950/30'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td
                    className={`p-1.5 text-right tabular-nums font-bold ${
                      item.isPositivePnl ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {item.pnl}
                  </td>
                  <td className="p-1.5 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectExecution(item);
                      }}
                      className="px-1.5 py-0.5 bg-[#151e2e] hover:bg-cyan-900/50 text-cyan-300 text-[9px] border border-[#23304a]"
                      title="Inspect full institutional provenance"
                    >
                      CHAIN →
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-1 text-[9px] font-mono text-zinc-500 flex justify-between">
        <span>Click any row to trace: SIGNAL → INTENT → RISK → ORDER → FILL → LEDGER</span>
        <span>Virtual feed: 100% Deterministic Replay</span>
      </div>
    </div>
  );
};
