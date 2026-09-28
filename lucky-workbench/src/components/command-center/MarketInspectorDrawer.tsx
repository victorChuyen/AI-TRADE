/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * OPC Trade Lab V1 — Market Inspector Drawer
 * Opens when a user clicks any node in the Market Intelligence Map.
 * Displays:
 * - Market, Venue, Timestamp, Price, Liquidity
 * - Signal, Strategy, TradeIntent
 * - Risk Decision & Execution Fills
 * - Quantitative P&L Attribution
 */

import React from 'react';
import {
  X,
  Compass,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Layers,
  Activity,
  DollarSign,
  Clock,
  Hash,
  Info
} from 'lucide-react';
import { MapNode } from '../../types/commandCenter.ts';

interface MarketInspectorDrawerProps {
  node: MapNode | null;
  onClose: () => void;
}

export const MarketInspectorDrawer: React.FC<MarketInspectorDrawerProps> = ({
  node,
  onClose
}) => {
  if (!node) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] bg-[#090c13] border-l border-cyan-500/40 p-4 font-mono text-xs shadow-2xl flex flex-col justify-between overflow-y-auto">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1b2537] pb-3 mb-3">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-zinc-100 uppercase tracking-wider">
              MARKET INSPECTOR
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Node Entity Summary */}
        <div className="bg-[#0e1422] border border-[#202c44] p-3 mb-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-cyan-300">{node.label}</span>
            <span className="text-[10px] px-2 py-0.5 bg-cyan-950 text-cyan-400 border border-cyan-500/40 font-semibold uppercase">
              {node.type}
            </span>
          </div>
          <div className="text-[10px] text-zinc-400 mt-1.5 flex justify-between">
            <span>VENUE: <strong className="text-zinc-200">{node.venue}</strong></span>
            <span>PROVENANCE: <strong className="text-emerald-400">{node.provenance}</strong></span>
          </div>
          <div className="text-[10px] text-zinc-500 mt-0.5">
            NODE_ID: {node.id} · TIMESTAMP: {node.timestamp}
          </div>
        </div>

        {/* Financial & Quantitative Metrics */}
        <div className="space-y-2 mb-3">
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
            OBSERVED MARKET STATE
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] bg-[#07090e] border border-[#161f2f] p-2.5">
            <div>
              <span className="text-zinc-500 text-[10px] block">PRICE</span>
              <span className="text-zinc-100 font-bold tabular-nums">
                {node.price ? (node.venue === 'POLYMARKET' ? `$${node.price.toFixed(3)}` : `$${node.price.toLocaleString()}`) : 'N/A'}
              </span>
            </div>

            <div>
              <span className="text-zinc-500 text-[10px] block">SIGNAL STRENGTH</span>
              <span className="text-cyan-400 font-bold tabular-nums">
                {node.signalStrength ? `${(node.signalStrength * 100).toFixed(1)}%` : 'N/A'}
              </span>
            </div>

            <div>
              <span className="text-zinc-500 text-[10px] block">ESTIMATED EDGE</span>
              <span className="text-emerald-400 font-bold tabular-nums">
                {node.edge ? `+${node.edge.toFixed(2)}%` : 'N/A'}
              </span>
            </div>

            <div>
              <span className="text-zinc-500 text-[10px] block">LIQUIDITY</span>
              <span className="text-zinc-300 font-semibold tabular-nums">
                {node.liquidity ? `$${node.liquidity.toLocaleString()}` : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* TradeIntent & Risk Decision Attribution */}
        {node.details && (
          <div className="space-y-2 mb-3">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
              QUANTITATIVE PIPELINE ATTRIBUTION
            </div>

            <div className="bg-[#07090e] border border-[#161f2f] p-2.5 space-y-1.5 text-[10px]">
              {node.details.strategyId && (
                <div className="flex justify-between">
                  <span className="text-zinc-500">STRATEGY:</span>
                  <span className="text-zinc-200 font-bold">{node.details.strategyId}</span>
                </div>
              )}

              {node.details.tradeIntentId && (
                <div className="flex justify-between">
                  <span className="text-zinc-500">TRADE INTENT ID:</span>
                  <span className="text-cyan-400">{node.details.tradeIntentId}</span>
                </div>
              )}

              {node.details.riskDecision && (
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">RISK GATEWAY:</span>
                  <span
                    className={`font-bold px-1.5 py-0.2 border text-[9px] ${
                      node.details.riskDecision === 'APPROVED'
                        ? 'text-emerald-400 bg-emerald-950/40 border-emerald-500/40'
                        : 'text-rose-400 bg-rose-950/40 border-rose-500/40'
                    }`}
                  >
                    {node.details.riskDecision}
                  </span>
                </div>
              )}

              {node.details.orderId && (
                <div className="flex justify-between">
                  <span className="text-zinc-500">ORDER REF:</span>
                  <span className="text-zinc-300">{node.details.orderId}</span>
                </div>
              )}

              {node.details.fillPrice !== undefined && (
                <div className="flex justify-between">
                  <span className="text-zinc-500">FILL PRICE / QTY:</span>
                  <span className="text-emerald-300 font-bold">
                    ${node.details.fillPrice} ({node.details.fillQty} units)
                  </span>
                </div>
              )}

              {node.details.pnlAttribution !== undefined && (
                <div className="flex justify-between">
                  <span className="text-zinc-500">P&amp;L ATTRIBUTION:</span>
                  <span className={`font-bold ${node.details.pnlAttribution >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {node.details.pnlAttribution >= 0 ? `+$${node.details.pnlAttribution.toFixed(2)}` : `-$${Math.abs(node.details.pnlAttribution).toFixed(2)}`}
                  </span>
                </div>
              )}

              {node.details.rejectionReason && (
                <div className="text-rose-400 bg-rose-950/30 p-1.5 border border-rose-500/30 mt-1">
                  REJECTION REASON: {node.details.rejectionReason}
                </div>
              )}

              {node.details.description && (
                <div className="text-zinc-400 italic pt-1 border-t border-[#1a2336]">
                  {node.details.description}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-[#1b2537] flex justify-end">
        <button
          onClick={onClose}
          className="px-4 py-1.5 bg-[#141d2c] border border-[#232f48] text-zinc-300 hover:text-white"
        >
          CLOSE
        </button>
      </div>
    </div>
  );
};
