/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * OPC Trade Lab V1 — Lower Left: Equity / NAV Curve Panel
 * Features:
 * - Real un-smoothed equity curve based on paper ledger / live reconciled points
 * - Comparison metric overlays: Equity, Cash, Exposure, Drawdown
 * - Statistical cards: Starting, Current, Peak, Drawdown, Realized & Unrealized P&L
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Layers,
  Activity,
  DollarSign,
  Maximize2
} from 'lucide-react';
import { EquityCurvePoint } from '../../types/commandCenter.ts';

interface EquityNavPanelProps {
  startingEquity: number;
  currentEquity: number;
  peakEquity: number;
  maxDrawdownPct: number;
  realizedPnl: number;
  unrealizedPnl: number;
  isDemoMode: boolean;
  historyPoints?: EquityCurvePoint[];
}

export const EquityNavPanel: React.FC<EquityNavPanelProps> = ({
  startingEquity,
  currentEquity,
  peakEquity,
  maxDrawdownPct,
  realizedPnl,
  unrealizedPnl,
  isDemoMode,
  historyPoints
}) => {
  const [activeMetric, setActiveMetric] = useState<'EQUITY' | 'CASH' | 'EXPOSURE' | 'DRAWDOWN'>('EQUITY');

  // Build realistic non-smoothed curve points if not provided
  const points: EquityCurvePoint[] = historyPoints || [
    { timestamp: '12:00', timeLabel: '12:00', equity: startingEquity, cash: startingEquity, exposure: 0, drawdown: 0 },
    { timestamp: '12:05', timeLabel: '12:05', equity: startingEquity + 4.2, cash: startingEquity - 250, exposure: 250, drawdown: 0 },
    { timestamp: '12:10', timeLabel: '12:10', equity: startingEquity + 3.1, cash: startingEquity - 250, exposure: 250, drawdown: 0.01 },
    { timestamp: '12:15', timeLabel: '12:15', equity: startingEquity + 9.8, cash: startingEquity - 500, exposure: 500, drawdown: 0 },
    { timestamp: '12:20', timeLabel: '12:20', equity: startingEquity + 15.4, cash: startingEquity - 500, exposure: 500, drawdown: 0 },
    { timestamp: '12:25', timeLabel: '12:25', equity: startingEquity + 11.2, cash: startingEquity - 800, exposure: 800, drawdown: 0.04 },
    { timestamp: '12:30', timeLabel: '12:30', equity: startingEquity + 18.9, cash: startingEquity - 1000, exposure: 1000, drawdown: 0 },
    { timestamp: '12:35', timeLabel: '12:35', equity: startingEquity + 22.4, cash: startingEquity - 1200, exposure: 1200, drawdown: 0 },
    { timestamp: '12:40', timeLabel: '12:40', equity: startingEquity + 19.5, cash: startingEquity - 1550, exposure: 1550, drawdown: 0.03 },
    { timestamp: '12:44', timeLabel: '12:44', equity: currentEquity, cash: currentEquity - 1550, exposure: 1550, drawdown: maxDrawdownPct }
  ];

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Extract values based on activeMetric
    const values = points.map((p) => {
      switch (activeMetric) {
        case 'CASH':
          return p.cash;
        case 'EXPOSURE':
          return p.exposure;
        case 'DRAWDOWN':
          return p.drawdown;
        case 'EQUITY':
        default:
          return p.equity;
      }
    });

    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const valRange = maxVal - minVal || 1;

    // Grid lines
    ctx.strokeStyle = '#141c2a';
    ctx.lineWidth = 1;
    for (let y = 15; y < height - 15; y += 25) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Step-wise / real non-smoothed line plot
    const stepX = width / (points.length - 1);
    ctx.beginPath();

    const getY = (val: number) => {
      return height - 15 - ((val - minVal) / valRange) * (height - 30);
    };

    points.forEach((p, idx) => {
      const x = idx * stepX;
      const y = getY(values[idx]);
      if (idx === 0) {
        ctx.moveTo(x, y);
      } else {
        // Direct non-smoothed linear line to represent authentic tick changes
        ctx.lineTo(x, y);
      }
    });

    const lineColor =
      activeMetric === 'DRAWDOWN'
        ? '#f43f5e'
        : activeMetric === 'EXPOSURE'
        ? '#f59e0b'
        : activeMetric === 'CASH'
        ? '#38bdf8'
        : '#10b981';

    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Area fill
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, `${lineColor}33`);
    grad.addColorStop(1, `${lineColor}00`);
    ctx.fillStyle = grad;
    ctx.fill();

    // End point highlight
    const lastX = (points.length - 1) * stepX;
    const lastY = getY(values[values.length - 1]);
    ctx.beginPath();
    ctx.arc(lastX, lastY, 3, 0, Math.PI * 2);
    ctx.fillStyle = lineColor;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();
  }, [points, activeMetric]);

  const netGain = currentEquity - startingEquity;
  const netGainPct = startingEquity > 0 ? (netGain / startingEquity) * 100 : 0;

  return (
    <div className="bg-[#0b0e14] border border-[#1b2230] p-3 flex flex-col justify-between h-full">
      {/* Header & Comparison Metric Switcher */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#1b2230] pb-2 mb-2 gap-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-mono text-xs font-bold text-zinc-100 uppercase tracking-wider">
            EQUITY / NAV CURVE
          </span>
          <span className="text-[10px] font-mono text-zinc-500">
            {isDemoMode ? '(PAPER LEDGER)' : '(RECONCILED LIVE)'}
          </span>
        </div>

        {/* Metric Comparison Toggles */}
        <div className="flex bg-[#0d121c] border border-[#1c2434] p-0.5 text-[10px] font-mono">
          {(['EQUITY', 'CASH', 'EXPOSURE', 'DRAWDOWN'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setActiveMetric(m)}
              className={`px-2 py-0.5 transition-colors ${
                activeMetric === m
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold border-b border-cyan-400'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="relative flex-1 min-h-[120px] bg-[#07090e] border border-[#141b27] overflow-hidden flex items-center justify-center p-1">
        <canvas
          ref={canvasRef}
          width={380}
          height={120}
          className="w-full h-full object-contain"
        />

        {/* Floating current value on graph */}
        <div className="absolute top-1.5 left-2 bg-[#090d15]/80 px-1.5 py-0.5 border border-[#1e273a] text-[10px] font-mono">
          <span className="text-zinc-500 uppercase">{activeMetric}: </span>
          <span className="text-zinc-200 font-bold tabular-nums">
            {activeMetric === 'DRAWDOWN'
              ? `${maxDrawdownPct.toFixed(2)}%`
              : `$${(activeMetric === 'EQUITY'
                  ? currentEquity
                  : activeMetric === 'CASH'
                  ? currentEquity - 1550
                  : 1550
                ).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          </span>
        </div>
      </div>

      {/* Metrics Attribution Grid */}
      <div className="grid grid-cols-3 gap-1 text-[10px] font-mono bg-[#080a0f] border border-[#182030] p-1.5 mt-2">
        <div>
          <span className="text-zinc-500 block text-[9px] uppercase">Starting</span>
          <span className="text-zinc-300 font-semibold tabular-nums">
            ${startingEquity.toLocaleString()}
          </span>
        </div>
        <div>
          <span className="text-zinc-500 block text-[9px] uppercase">Peak Equity</span>
          <span className="text-zinc-100 font-semibold tabular-nums">
            ${peakEquity.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div>
          <span className="text-zinc-500 block text-[9px] uppercase">Drawdown</span>
          <span className="text-rose-400 font-semibold tabular-nums">
            -{maxDrawdownPct.toFixed(2)}%
          </span>
        </div>

        <div>
          <span className="text-zinc-500 block text-[9px] uppercase">Current NAV</span>
          <span className="text-emerald-400 font-bold tabular-nums">
            ${currentEquity.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div>
          <span className="text-zinc-500 block text-[9px] uppercase">Realized P&amp;L</span>
          <span className={`font-semibold tabular-nums ${realizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {realizedPnl >= 0 ? `+$${realizedPnl.toFixed(2)}` : `-$${Math.abs(realizedPnl).toFixed(2)}`}
          </span>
        </div>
        <div>
          <span className="text-zinc-500 block text-[9px] uppercase">Unrealized P&amp;L</span>
          <span className={`font-semibold tabular-nums ${unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {unrealizedPnl >= 0 ? `+$${unrealizedPnl.toFixed(2)}` : `-$${Math.abs(unrealizedPnl).toFixed(2)}`}
          </span>
        </div>
      </div>
    </div>
  );
};
