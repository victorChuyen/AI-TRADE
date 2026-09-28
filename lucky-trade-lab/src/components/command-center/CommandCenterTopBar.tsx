/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * OPC Trade Lab V1 — Top Global Status Bar (Height 40-48px)
 * Displays: OPC TRADE LAB, venue, market, connection status, DEMO/LIVE badge,
 * data provenance badge, BTC reference price, cash, equity, open exposure,
 * trades count, latency, and UTC/local clock.
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Radio,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  Layers,
  Zap,
  Activity
} from 'lucide-react';
import { AccountTradingMode, DataProvenance } from '../../types/commandCenter.ts';

interface TopBarProps {
  tradingMode: AccountTradingMode;
  onOpenModeSwitchModal: () => void;
  selectedVenue: string;
  onSelectVenue: (venue: string) => void;
  selectedMarket: string;
  onSelectMarket: (market: string) => void;
  provenance: DataProvenance;
  connectionStatus: 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED';
  latencyMs: number;
  btcPrice: string;
  btcChange24h: string;
  btcTickDir?: 'UP' | 'DOWN';
  cash: number;
  equity: number;
  openExposure: number;
  tradesTodayCount: number;
}

export const CommandCenterTopBar: React.FC<TopBarProps> = ({
  tradingMode,
  onOpenModeSwitchModal,
  selectedVenue,
  onSelectVenue,
  selectedMarket,
  onSelectMarket,
  provenance,
  connectionStatus,
  latencyMs,
  btcPrice,
  btcChange24h,
  btcTickDir,
  cash,
  equity,
  openExposure,
  tradesTodayCount,
}) => {
  const [utcTime, setUtcTime] = useState<string>('');
  const [localTime, setLocalTime] = useState<string>('');

  useEffect(() => {
    const updateClocks = () => {
      const now = new Date();
      setUtcTime(
        now.toTimeString().split(' ')[0] + ' UTC'
      );
      setLocalTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
      );
    };
    updateClocks();
    const interval = setInterval(updateClocks, 1000);
    return () => clearInterval(interval);
  }, []);

  const getProvenanceBadgeStyle = (prov: DataProvenance) => {
    switch (prov) {
      case 'LIVE':
        return 'text-emerald-400 bg-emerald-950/40 border-emerald-500/40';
      case 'PAPER ON LIVE':
        return 'text-cyan-400 bg-cyan-950/40 border-cyan-500/40';
      case 'LIVE READ-ONLY':
        return 'text-blue-400 bg-blue-950/40 border-blue-500/40';
      case 'RECORDED LIVE':
        return 'text-purple-400 bg-purple-950/40 border-purple-500/40';
      case 'SYNTHETIC':
        return 'text-amber-400 bg-amber-950/40 border-amber-500/40';
      case 'STALE':
        return 'text-red-400 bg-red-950/40 border-red-500/40';
      case 'DISCONNECTED':
      default:
        return 'text-zinc-500 bg-zinc-900 border-zinc-700';
    }
  };

  return (
    <header className="h-11 sm:h-12 w-full bg-[#08090d] border-b border-[#1b2230] px-3 sm:px-4 flex items-center justify-between text-xs select-none sticky top-0 z-30">
      {/* Brand & Market Selectors */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <div className="flex items-center gap-1.5 font-bold tracking-wider text-slate-100 uppercase text-[11px] sm:text-xs">
          <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] animate-pulse" />
          <span className="text-cyan-400 font-mono">OPC</span>
          <span className="text-zinc-400">TRADE LAB</span>
          <span className="text-[10px] text-zinc-600 font-mono hidden md:inline">V1.0</span>
        </div>

        <span className="text-zinc-700 hidden sm:inline">|</span>

        {/* Venue Selector */}
        <div className="relative group">
          <select
            value={selectedVenue}
            onChange={(e) => onSelectVenue(e.target.value)}
            className="bg-[#0e131d] text-zinc-300 font-mono text-[11px] px-2 py-1 rounded border border-[#232c3f] hover:border-cyan-500/50 focus:border-cyan-400 focus:outline-none cursor-pointer appearance-none pr-5 transition-colors"
          >
            <option value="BINANCE">BINANCE (SPOT)</option>
            <option value="POLYMARKET">POLYMARKET (CLOB)</option>
            <option value="METATRADER4">METATRADER 4 (MT4)</option>
            <option value="METATRADER5">METATRADER 5 (MT5)</option>
            <option value="PAPER_CLOB">PAPER CLOB (SIM)</option>
          </select>
          <ChevronDown className="w-3 h-3 text-zinc-500 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Market Selector */}
        <div className="relative group">
          <select
            value={selectedMarket}
            onChange={(e) => onSelectMarket(e.target.value)}
            className="bg-[#0e131d] text-cyan-300 font-mono text-[11px] font-semibold px-2 py-1 rounded border border-[#232c3f] hover:border-cyan-500/50 focus:border-cyan-400 focus:outline-none cursor-pointer appearance-none pr-5 transition-colors"
          >
            {selectedVenue === 'POLYMARKET' ? (
              <>
                <option value="BTC-100K-Q4">BTC &gt; $100K IN 2026</option>
                <option value="ETH-3K-MAR">ETH &gt; $3K MARCH</option>
                <option value="SOL-200-APR">SOL &gt; $200 APRIL</option>
              </>
            ) : selectedVenue === 'METATRADER4' || selectedVenue === 'METATRADER5' ? (
              <>
                <option value="XAUUSD">★ XAU/USD (VÀNG THẾ GIỚI)</option>
                <option value="BTCUSD">★ BTC/USD (BITCOIN)</option>
                <option value="EURUSD">EUR/USD</option>
                <option value="GBPUSD">GBP/USD</option>
              </>
            ) : (
              <>
                <option value="BTCUSDT">★ BTC/USDT (ƯU TIÊN 1)</option>
                <option value="XAUUSD">★ XAU/USD VÀNG (ƯU TIÊN 2)</option>
                <option value="ETHUSDT">ETH/USDT</option>
                <option value="SOLUSDT">SOL/USDT</option>
              </>
            )}
          </select>
          <ChevronDown className="w-3 h-3 text-cyan-500/70 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Feed & Provenance Badges */}
        <div className="hidden lg:flex items-center gap-1.5">
          <span
            className={`font-mono text-[10px] px-2 py-0.5 rounded border uppercase tracking-wider font-semibold ${getProvenanceBadgeStyle(
              provenance
            )}`}
          >
            {provenance}
          </span>

          {/* Latency & WS indicator */}
          <div className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono text-zinc-400 bg-[#0d121c] border border-[#202737] rounded">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                connectionStatus === 'CONNECTED'
                  ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]'
                  : connectionStatus === 'CONNECTING'
                  ? 'bg-amber-400 animate-ping'
                  : 'bg-red-500'
              }`}
            />
            <span>{connectionStatus === 'CONNECTED' ? `${latencyMs}ms` : connectionStatus}</span>
          </div>
        </div>
      </div>

      {/* Middle: Live Market Ticker */}
      <div className="hidden xl:flex items-center gap-3 px-3 py-1 bg-[#0b0e14] border border-[#1b2332] rounded">
        <span className="text-[10px] font-mono text-zinc-500 uppercase">BTC REF</span>
        <div className="flex items-center gap-1.5 font-mono">
          <span
            className={`text-xs font-bold transition-colors ${
              btcTickDir === 'UP'
                ? 'text-emerald-400'
                : btcTickDir === 'DOWN'
                ? 'text-rose-400'
                : 'text-zinc-200'
            }`}
          >
            ${btcPrice}
          </span>
          <span
            className={`text-[10px] px-1 rounded ${
              parseFloat(btcChange24h) >= 0
                ? 'text-emerald-400 bg-emerald-950/30'
                : 'text-rose-400 bg-rose-950/30'
            }`}
          >
            {parseFloat(btcChange24h) >= 0 ? `+${btcChange24h}%` : `${btcChange24h}%`}
          </span>
        </div>
      </div>

      {/* Right Side: Account Metrics, Mode Switch & Clock */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Quick Numbers: Cash / Equity / Exposure */}
        <div className="hidden md:flex items-center gap-3 text-[11px] font-mono">
          <div className="flex flex-col items-end leading-tight">
            <span className="text-[9px] text-zinc-500 uppercase tracking-tight">EQUITY</span>
            <span className="text-zinc-200 font-semibold tabular-nums">
              ${equity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex flex-col items-end leading-tight">
            <span className="text-[9px] text-zinc-500 uppercase tracking-tight">CASH</span>
            <span className="text-zinc-400 tabular-nums">
              ${cash.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex flex-col items-end leading-tight">
            <span className="text-[9px] text-zinc-500 uppercase tracking-tight">EXPOSURE</span>
            <span className={`tabular-nums ${openExposure > 0 ? 'text-amber-400 font-medium' : 'text-zinc-500'}`}>
              ${openExposure.toFixed(2)}
            </span>
          </div>
          <div className="flex flex-col items-end leading-tight">
            <span className="text-[9px] text-zinc-500 uppercase tracking-tight">TRADES</span>
            <span className="text-cyan-400 font-medium tabular-nums">{tradesTodayCount}</span>
          </div>
        </div>

        {/* Mode Toggle Button */}
        <button
          onClick={onOpenModeSwitchModal}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-bold tracking-wider transition-all border ${
            tradingMode === 'LIVE'
              ? 'bg-rose-950/70 border-rose-500 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.3)] animate-pulse'
              : 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300 hover:bg-cyan-900/50'
          }`}
          title="Click to switch trading mode (Requires strict validation)"
        >
          {tradingMode === 'LIVE' ? (
            <>
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span>LIVE ACTIVE</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>DEMO MODE</span>
            </>
          )}
        </button>

        {/* Real-time Clock */}
        <div className="hidden 2xl:flex items-center gap-1 text-[10px] font-mono text-zinc-400 bg-[#0d121c] border border-[#202737] px-2 py-1 rounded">
          <Clock className="w-3 h-3 text-zinc-500" />
          <span>{utcTime}</span>
          <span className="text-zinc-600">·</span>
          <span className="text-zinc-500">{localTime}</span>
        </div>
      </div>
    </header>
  );
};
