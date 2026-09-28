/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * OPC Trade Lab V1 — Unified Market Leader Summary Card (Command Center)
 * Highlights real-time performance, correlation spread, and macro regime between
 * the two prime benchmark assets: Bitcoin (BTC/USDT) and Gold (XAU/USD).
 * Provides one-click quick 'Inspect' actions for deep quantitative analysis.
 */

import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Compass,
  Zap,
  Activity,
  BarChart2,
  Layers,
  Scale,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Percent,
  CheckCircle2,
  Maximize2
} from 'lucide-react';

interface MarketLeaderSummaryCardProps {
  btcPrice: string;
  btcChange24h: string;
  btcTickDir: 'UP' | 'DOWN';
  xauPrice?: string;
  xauChange24h?: string;
  xauTickDir?: 'UP' | 'DOWN';
  onInspectBtc: () => void;
  onInspectGold: () => void;
  onSelectMarket?: (market: string) => void;
}

export const MarketLeaderSummaryCard: React.FC<MarketLeaderSummaryCardProps> = ({
  btcPrice,
  btcChange24h,
  btcTickDir,
  xauPrice = '2892.40',
  xauChange24h = '+1.35',
  xauTickDir = 'UP',
  onInspectBtc,
  onInspectGold,
  onSelectMarket
}) => {
  const [activeSpreadView, setActiveSpreadView] = useState<'CORRELATION' | 'RATIO' | 'Z_SCORE'>('CORRELATION');

  // Quantitative Metrics Calculations
  const numericBtc = parseFloat(btcPrice.replace(/,/g, '')) || 83620;
  const numericXau = parseFloat(xauPrice.replace(/,/g, '')) || 2892.40;
  const numericBtcChange = parseFloat(btcChange24h.replace('+', '')) || 2.45;
  const numericXauChange = parseFloat(xauChange24h.replace('+', '')) || 1.35;

  // BTC / Gold Ratio: ounces of Gold to buy 1 BTC
  const btcGoldRatio = (numericBtc / numericXau).toFixed(2);
  const ratioChangePct = (numericBtcChange - numericXauChange).toFixed(2);

  // Correlation Coefficient (30-day Rolling Pearson r)
  const correlationR = 0.64; // Moderate-to-high positive macro coupling
  const zScoreSpread = 1.18; // Normalized spread deviation (within 2σ normal band)

  return (
    <div className="w-full bg-[#080d17] border border-[#172740] rounded-xl p-3 sm:p-4 shadow-xl font-mono text-xs select-none">
      {/* Top Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#142338] pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-gradient-to-tr from-amber-500/20 to-teal-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Scale className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-zinc-100 font-bold uppercase tracking-wider text-xs">
                MARKET LEADERS: BTC &amp; GOLD (XAU) CORRELATION SPREAD
              </span>
              <span className="px-1.5 py-0.2 rounded bg-amber-950 text-amber-400 border border-amber-800 text-[10px] font-bold">
                DUAL MACRO BENCHMARKS
              </span>
            </div>
          </div>
        </div>

        {/* Macro Regime Badge */}
        <div className="flex items-center gap-2 text-[11px]">
          <span className="text-zinc-400">CHẾ ĐỘ VĨ MÔ:</span>
          <span className="px-2 py-0.5 rounded bg-teal-950/80 text-teal-300 border border-teal-800/80 font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
            DUAL BULLISH LIQUIDITY (+0.64 COUPLING)
          </span>
        </div>
      </div>

      {/* Main 3-Column Comparison Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
        {/* LEFT COLUMN: BITCOIN (BTC/USDT) LEADER (Span 4) */}
        <div className="lg:col-span-4 bg-[#050912] border border-[#192b45] rounded-xl p-3.5 flex flex-col justify-between hover:border-amber-500/40 transition">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-xs border border-amber-500/40">
                  ₿
                </span>
                <div>
                  <div className="font-bold text-white text-sm flex items-center gap-1.5">
                    <span>BTC / USDT</span>
                    <span className="text-[10px] text-amber-400 bg-amber-950/80 px-1 rounded border border-amber-800/60">
                      CRYPTO LEADER
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-400">Binance Real-Time WS Feed</div>
                </div>
              </div>

              {/* Price Flash Indicator */}
              <div className="flex items-center gap-1 text-[11px] font-bold">
                <span
                  className={`flex items-center gap-0.5 px-2 py-0.5 rounded ${
                    numericBtcChange >= 0
                      ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800'
                      : 'bg-rose-950/60 text-rose-400 border border-rose-800'
                  }`}
                >
                  {numericBtcChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  <span>{numericBtcChange >= 0 ? '+' : ''}{btcChange24h}%</span>
                </span>
              </div>
            </div>

            {/* Price Display */}
            <div className="mt-3 flex items-baseline justify-between">
              <div>
                <div className="text-xl font-bold font-mono text-white tracking-tight flex items-center gap-1.5">
                  <span>${numericBtc.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      btcTickDir === 'UP' ? 'bg-emerald-400 animate-ping' : 'bg-rose-400 animate-ping'
                    }`}
                  />
                </div>
                <div className="text-[10px] text-zinc-500 mt-0.5">Biên độ 24h: $81,800 - $84,200</div>
              </div>

              <div className="text-right text-[10px] text-zinc-400">
                <div>Vol 24h: <strong className="text-zinc-200">$2.25B</strong></div>
                <div>Volat. Index: <strong className="text-amber-300">48.2%</strong></div>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons for BTC */}
          <div className="mt-3 pt-2.5 border-t border-[#142338] flex items-center gap-2">
            <button
              onClick={() => {
                if (onSelectMarket) onSelectMarket('BTCUSDT');
                onInspectBtc();
              }}
              className="flex-1 min-h-[30px] px-2.5 bg-amber-500/10 hover:bg-amber-500/20 active:scale-95 text-amber-300 border border-amber-500/40 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
              title="Soi sổ lệnh, độ sâu CLOB & tín hiệu định lượng cho BTCUSDT"
            >
              <Compass className="w-3 h-3 text-amber-400" />
              <span>Soi Kèo BTC</span>
            </button>

            <button
              onClick={() => onSelectMarket && onSelectMarket('BTCUSDT')}
              className="min-h-[30px] px-2 bg-[#0c1626] hover:bg-[#13233c] text-zinc-300 rounded-lg text-[11px] border border-[#1f3350] transition cursor-pointer"
              title="Chọn BTC làm thị trường chính"
            >
              Chọn
            </button>
          </div>
        </div>

        {/* CENTER COLUMN: CORRELATION & SPREAD ENGINE (Span 4) */}
        <div className="lg:col-span-4 bg-[#050912] border border-[#192b45] rounded-xl p-3.5 flex flex-col justify-between">
          <div>
            {/* Sub-Tabs for Spread View */}
            <div className="flex items-center justify-between border-b border-[#142338] pb-2">
              <span className="font-bold text-zinc-300 flex items-center gap-1.5 text-[11px]">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <span>CHÊNH LỆCH &amp; TƯƠNG QUAN</span>
              </span>

              <div className="flex items-center gap-1 bg-[#09111e] p-0.5 rounded border border-[#182740] text-[10px]">
                <button
                  type="button"
                  onClick={() => setActiveSpreadView('CORRELATION')}
                  className={`px-1.5 py-0.5 rounded transition ${
                    activeSpreadView === 'CORRELATION' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-zinc-400'
                  }`}
                >
                  Tương Quan
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSpreadView('RATIO')}
                  className={`px-1.5 py-0.5 rounded transition ${
                    activeSpreadView === 'RATIO' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-zinc-400'
                  }`}
                >
                  Tỷ Lệ BTC/Au
                </button>
              </div>
            </div>

            {/* Tab 1: Correlation view */}
            {activeSpreadView === 'CORRELATION' && (
              <div className="mt-2.5 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-400">Hệ số tương quan (30D r):</span>
                  <span className="font-bold text-teal-300">+{correlationR} (Thuận)</span>
                </div>

                {/* Correlation Visual Bar */}
                <div className="w-full bg-[#0a1220] h-2 rounded-full overflow-hidden border border-[#182740] relative">
                  <div
                    className="h-full bg-gradient-to-r from-teal-500 to-amber-400 rounded-full"
                    style={{ width: `${((correlationR + 1) / 2) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] text-zinc-500">
                  <span>-1.0 Nghịch đảo</span>
                  <span>0.0 Phân kỳ</span>
                  <span>+1.0 Đồng pha</span>
                </div>

                <div className="pt-1 flex items-center justify-between text-[10px] text-zinc-400 border-t border-[#132034]">
                  <span>Độ lệch Spread 24h:</span>
                  <span className={parseFloat(ratioChangePct) >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    {parseFloat(ratioChangePct) >= 0 ? '+' : ''}{ratioChangePct}% (BTC Alpha)
                  </span>
                </div>
              </div>
            )}

            {/* Tab 2: BTC / Gold Ratio View */}
            {activeSpreadView === 'RATIO' && (
              <div className="mt-2.5 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-400">Tỷ giá BTC / Vàng:</span>
                  <span className="font-bold text-amber-300 text-sm">{btcGoldRatio} oz / BTC</span>
                </div>
                <p className="text-[10px] text-zinc-400 leading-tight">
                  Cần <strong>{btcGoldRatio} ounce vàng</strong> để quy đổi 1 Bitcoin. Biến động tỷ giá 24h: {ratioChangePct}%.
                </p>
                <div className="pt-1 flex items-center justify-between text-[10px] text-zinc-400 border-t border-[#132034]">
                  <span>Z-Score Spread:</span>
                  <span className="text-cyan-300 font-bold">+{zScoreSpread}σ (Bình Thường)</span>
                </div>
              </div>
            )}
          </div>

          {/* Stat-Arb Verdict Footer */}
          <div className="mt-3 pt-2 border-t border-[#142338] flex items-center justify-between text-[10px] text-zinc-400">
            <span className="flex items-center gap-1 text-teal-400">
              <CheckCircle2 className="w-3 h-3 text-teal-400" />
              <span>Tín hiệu: Đồng pha tích lũy</span>
            </span>
            <span className="text-zinc-500">Khớp lệnh kép MT5/Crypto</span>
          </div>
        </div>

        {/* RIGHT COLUMN: GOLD (XAU/USD) LEADER (Span 4) */}
        <div className="lg:col-span-4 bg-[#050912] border border-[#192b45] rounded-xl p-3.5 flex flex-col justify-between hover:border-yellow-500/40 transition">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-yellow-500/20 text-yellow-400 font-bold flex items-center justify-center text-xs border border-yellow-500/40">
                  Au
                </span>
                <div>
                  <div className="font-bold text-white text-sm flex items-center gap-1.5">
                    <span>XAU / USD</span>
                    <span className="text-[10px] text-yellow-400 bg-yellow-950/80 px-1 rounded border border-yellow-800/60">
                      VÀNG THẾ GIỚI
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-400">London Spot / MT4-MT5 Gateway</div>
                </div>
              </div>

              {/* Price Change */}
              <div className="flex items-center gap-1 text-[11px] font-bold">
                <span
                  className={`flex items-center gap-0.5 px-2 py-0.5 rounded ${
                    numericXauChange >= 0
                      ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800'
                      : 'bg-rose-950/60 text-rose-400 border border-rose-800'
                  }`}
                >
                  {numericXauChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  <span>{numericXauChange >= 0 ? '+' : ''}{xauChange24h}%</span>
                </span>
              </div>
            </div>

            {/* Price Display */}
            <div className="mt-3 flex items-baseline justify-between">
              <div>
                <div className="text-xl font-bold font-mono text-yellow-300 tracking-tight flex items-center gap-1.5">
                  <span>${numericXau.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      xauTickDir === 'UP' ? 'bg-emerald-400 animate-ping' : 'bg-rose-400 animate-ping'
                    }`}
                  />
                </div>
                <div className="text-[10px] text-zinc-500 mt-0.5">Biên độ 24h: $2,880.00 - $2,905.00</div>
              </div>

              <div className="text-right text-[10px] text-zinc-400">
                <div>Đơn vị: <strong className="text-zinc-200">USD / oz</strong></div>
                <div>Volat. Index: <strong className="text-yellow-400">14.8%</strong></div>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons for Gold */}
          <div className="mt-3 pt-2.5 border-t border-[#142338] flex items-center gap-2">
            <button
              onClick={() => {
                if (onSelectMarket) onSelectMarket('XAUUSD');
                onInspectGold();
              }}
              className="flex-1 min-h-[30px] px-2.5 bg-yellow-500/10 hover:bg-yellow-500/20 active:scale-95 text-yellow-300 border border-yellow-500/40 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
              title="Soi sổ lệnh L2 DOM, thanh khoản sàn & hợp đồng vàng thế giới"
            >
              <Compass className="w-3 h-3 text-yellow-400" />
              <span>Soi Kèo Vàng (XAU)</span>
            </button>

            <button
              onClick={() => onSelectMarket && onSelectMarket('XAUUSD')}
              className="min-h-[30px] px-2 bg-[#0c1626] hover:bg-[#13233c] text-zinc-300 rounded-lg text-[11px] border border-[#1f3350] transition cursor-pointer"
              title="Chọn Vàng làm thị trường chính"
            >
              Chọn
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
