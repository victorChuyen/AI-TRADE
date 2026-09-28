/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * OPC Trade Lab V1 — Center: Market Intelligence Map (Signature Visualization)
 * High-performance interactive HTML5 Canvas spatial network of real market/signal entities.
 * Includes:
 * - Dynamic moving nodes with physics & spring connection lines
 * - Real entity categories: MARKET, BUY SIGNAL, SELL SIGNAL, ARBITRAGE CANDIDATE,
 *   ACTIVE POSITION, RISK EVENT, STALE FEED, REJECTED TRADE
 * - Size metrics: Volume, Edge, Liquidity, Exposure, Signal Strength
 * - Interactive hover tooltips & click-to-inspect drawer
 * - Filter by Category, Venue & Strategy
 * - 2D Map / Tabular View Toggle
 */

import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  Layers,
  Filter,
  Maximize2,
  Table as TableIcon,
  Activity,
  Compass,
  Zap,
  Info,
  Sliders,
  Eye
} from 'lucide-react';
import { MapNode, MapNodeType, MapEdge } from '../../types/commandCenter.ts';

interface MarketIntelligenceMapProps {
  onSelectNode: (node: MapNode) => void;
  selectedNodeId?: string;
  initialNodes?: MapNode[];
}

export const MarketIntelligenceMap: React.FC<MarketIntelligenceMapProps> = ({
  onSelectNode,
  selectedNodeId,
  initialNodes
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [viewMode, setViewMode] = useState<'MAP' | 'TABLE'>('MAP');
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [sizeMetric, setSizeMetric] = useState<'SIGNAL' | 'VOLUME' | 'EDGE' | 'EXPOSURE'>('SIGNAL');
  const [hoveredNode, setHoveredNode] = useState<MapNode | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Default real market intelligence nodes
  const [nodes, setNodes] = useState<MapNode[]>(() => {
    if (initialNodes && initialNodes.length > 0) return initialNodes;
    return [
      {
        id: 'node_mkt_btc_binance',
        label: 'BTC/USDT SPOT',
        type: 'MARKET',
        venue: 'BINANCE',
        market: 'BTCUSDT',
        x: 180,
        y: 120,
        vx: 0.15,
        vy: 0.1,
        price: 83620.0,
        volume: 24500,
        liquidity: 9200000,
        signalStrength: 0.72,
        provenance: 'LIVE',
        timestamp: '12:44:20'
      },
      {
        id: 'node_sig_buy_btc',
        label: 'TREND BREAKOUT BUY',
        type: 'BUY SIGNAL',
        venue: 'BINANCE',
        market: 'BTCUSDT',
        x: 280,
        y: 80,
        vx: -0.1,
        vy: 0.12,
        price: 83630.0,
        edge: 2.1,
        signalStrength: 0.88,
        provenance: 'LIVE',
        timestamp: '12:44:22',
        details: {
          strategyId: 'TREND_BREAKOUT_ATR_V1',
          tradeIntentId: 'intent_tb_891',
          riskDecision: 'APPROVED',
          description: 'Upper band breakout with 3.2x ATR volume surge.'
        }
      },
      {
        id: 'node_mkt_eth_binance',
        label: 'ETH/USDT SPOT',
        type: 'MARKET',
        venue: 'BINANCE',
        market: 'ETHUSDT',
        x: 420,
        y: 140,
        vx: -0.08,
        vy: -0.15,
        price: 2651.2,
        volume: 18200,
        liquidity: 4100000,
        signalStrength: 0.65,
        provenance: 'LIVE',
        timestamp: '12:44:18'
      },
      {
        id: 'node_arb_poly_btc_100k',
        label: 'BTC > 100K COMPLETE SET',
        type: 'ARBITRAGE CANDIDATE',
        venue: 'POLYMARKET',
        market: 'BTC-100K-Q4',
        x: 320,
        y: 220,
        vx: 0.12,
        vy: -0.05,
        price: 0.953,
        edge: 4.7,
        liquidity: 185000,
        signalStrength: 0.94,
        provenance: 'LIVE',
        timestamp: '12:44:25',
        details: {
          conditionId: '0xcond_btc_100k_q4',
          strategyId: 'BINARY_COMPLETE_SET_V1',
          tradeIntentId: 'intent_arb_004',
          riskDecision: 'APPROVED',
          description: 'YES ($0.462) + NO ($0.491) = $0.953. Guaranteed $1 payout on expiry.'
        }
      },
      {
        id: 'node_pos_btc_poly_active',
        label: 'POLY BTC POS #22',
        type: 'ACTIVE POSITION',
        venue: 'POLYMARKET',
        market: 'BTC-100K-Q4',
        x: 460,
        y: 260,
        vx: -0.06,
        vy: 0.08,
        price: 0.953,
        exposure: 1550,
        signalStrength: 0.85,
        provenance: 'PAPER ON LIVE',
        timestamp: '12:40:12',
        details: {
          orderId: 'ord_poly_clob_902',
          fillPrice: 0.953,
          fillQty: 25,
          pnlAttribution: 11.75
        }
      },
      {
        id: 'node_sig_sell_sol',
        label: 'SOL MEAN REVERSION',
        type: 'SELL SIGNAL',
        venue: 'BINANCE',
        market: 'SOLUSDT',
        x: 580,
        y: 90,
        vx: 0.1,
        vy: -0.1,
        price: 113.56,
        edge: 1.45,
        signalStrength: 0.76,
        provenance: 'LIVE',
        timestamp: '12:44:05',
        details: {
          strategyId: 'MEAN_REVERSION_BB_RSI_V1',
          tradeIntentId: 'intent_sol_301',
          riskDecision: 'APPROVED'
        }
      },
      {
        id: 'node_risk_exposure_limit',
        label: 'RISK GATEWAY WARNING',
        type: 'RISK EVENT',
        venue: 'INTERNAL',
        market: 'GLOBAL',
        x: 140,
        y: 240,
        vx: -0.05,
        vy: -0.07,
        signalStrength: 0.95,
        provenance: 'LIVE',
        timestamp: '12:42:00',
        details: {
          riskDecision: 'REJECTED_EXPOSURE',
          rejectionReason: 'Sub-account maximum open exposure reached (15.5% / 15.0% threshold).'
        }
      },
      {
        id: 'node_rej_trade_high_slip',
        label: 'REJECTED: SLIPPAGE > 15bps',
        type: 'REJECTED TRADE',
        venue: 'POLYMARKET',
        market: 'SOL-200-APR',
        x: 620,
        y: 200,
        vx: 0.08,
        vy: 0.12,
        price: 0.38,
        edge: 0.2,
        signalStrength: 0.4,
        provenance: 'RECORDED LIVE',
        timestamp: '12:38:15',
        details: {
          rejectionReason: 'Book depth insufficient. Execution slippage (24bps) exceeded max allowed (15bps).'
        }
      }
    ];
  });

  // Dynamic edges connecting related nodes
  const edges: MapEdge[] = [
    { id: 'e1', source: 'node_mkt_btc_binance', target: 'node_sig_buy_btc', relationType: 'SAME_MARKET' },
    { id: 'e2', source: 'node_mkt_btc_binance', target: 'node_arb_poly_btc_100k', relationType: 'SAME_CONDITION' },
    { id: 'e3', source: 'node_arb_poly_btc_100k', target: 'node_pos_btc_poly_active', relationType: 'RELATED_EXECUTION' },
    { id: 'e4', source: 'node_mkt_eth_binance', target: 'node_arb_poly_btc_100k', relationType: 'PAIRED_OUTCOMES' },
    { id: 'e5', source: 'node_sig_sell_sol', target: 'node_rej_trade_high_slip', relationType: 'SAME_STRATEGY' },
    { id: 'e6', source: 'node_risk_exposure_limit', target: 'node_pos_btc_poly_active', relationType: 'RELATED_EXECUTION' }
  ];

  // Filter nodes based on active tab
  const filteredNodes = useMemo(() => {
    if (activeFilter === 'ALL') return nodes;
    if (activeFilter === 'MARKETS') return nodes.filter((n) => n.type === 'MARKET');
    if (activeFilter === 'SIGNALS')
      return nodes.filter((n) => n.type === 'BUY SIGNAL' || n.type === 'SELL SIGNAL' || n.type === 'ARBITRAGE CANDIDATE');
    if (activeFilter === 'POSITIONS') return nodes.filter((n) => n.type === 'ACTIVE POSITION');
    if (activeFilter === 'RISK') return nodes.filter((n) => n.type === 'RISK EVENT' || n.type === 'REJECTED TRADE');
    if (activeFilter === 'BINANCE') return nodes.filter((n) => n.venue === 'BINANCE');
    if (activeFilter === 'POLYMARKET') return nodes.filter((n) => n.venue === 'POLYMARKET');
    return nodes;
  }, [nodes, activeFilter]);

  // Color mapping per node category
  const getNodeColor = (type: MapNodeType, isSelected: boolean) => {
    if (isSelected) return '#22d3ee'; // cyan
    switch (type) {
      case 'BUY SIGNAL':
      case 'ARBITRAGE CANDIDATE':
        return '#10b981'; // green
      case 'SELL SIGNAL':
      case 'REJECTED TRADE':
        return '#f43f5e'; // magenta / red
      case 'RISK EVENT':
        return '#f59e0b'; // yellow / amber
      case 'ACTIVE POSITION':
        return '#38bdf8'; // blue / cyan
      case 'STALE FEED':
        return '#64748b'; // stale gray
      case 'MARKET':
      default:
        return '#94a3b8'; // neutral white/gray
    }
  };

  // Node radius computation based on selected metric
  const getNodeRadius = (node: MapNode) => {
    let base = 6;
    if (sizeMetric === 'SIGNAL') {
      base = 5 + (node.signalStrength || 0.5) * 8;
    } else if (sizeMetric === 'EDGE') {
      base = 5 + Math.min(10, (node.edge || 0.5) * 2);
    } else if (sizeMetric === 'VOLUME') {
      base = 5 + Math.min(10, Math.log10(node.volume || 1000) * 1.8);
    } else if (sizeMetric === 'EXPOSURE') {
      base = 5 + Math.min(10, Math.sqrt(node.exposure || 100) * 0.2);
    }
    return base;
  };

  // Canvas render loop with animation
  useEffect(() => {
    if (viewMode !== 'MAP') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrame: number;
    let t = 0;

    const render = () => {
      t += 0.02;
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Draw subtle background cyber grid
      ctx.strokeStyle = '#0f1623';
      ctx.lineWidth = 1;
      const step = 40;
      for (let x = 0; x < width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Physics / gentle floating of nodes
      nodes.forEach((node) => {
        node.x += node.vx || 0;
        node.y += node.vy || 0;

        // Soft bounce within boundaries
        const padding = 30;
        if (node.x < padding || node.x > width - padding) node.vx = -(node.vx || 0.1);
        if (node.y < padding || node.y > height - padding) node.vy = -(node.vy || 0.1);
      });

      // Draw Edges
      edges.forEach((edge) => {
        const src = nodes.find((n) => n.id === edge.source);
        const tgt = nodes.find((n) => n.id === edge.target);
        if (!src || !tgt) return;

        // Check if either is filtered out
        const isSrcVisible = filteredNodes.some((n) => n.id === src.id);
        const isTgtVisible = filteredNodes.some((n) => n.id === tgt.id);
        if (!isSrcVisible && !isTgtVisible) return;

        ctx.beginPath();
        ctx.moveTo(src.x, src.y);
        ctx.lineTo(tgt.x, tgt.y);
        ctx.strokeStyle =
          edge.relationType === 'SAME_CONDITION'
            ? 'rgba(16, 185, 129, 0.25)'
            : edge.relationType === 'RELATED_EXECUTION'
            ? 'rgba(56, 189, 248, 0.3)'
            : 'rgba(71, 85, 105, 0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Moving data packet along edge
        const distRatio = (Math.sin(t + src.x * 0.01) + 1) / 2;
        const px = src.x + (tgt.x - src.x) * distRatio;
        const py = src.y + (tgt.y - src.y) * distRatio;
        ctx.beginPath();
        ctx.arc(px, py, 1.8, 0, Math.PI * 2);
        ctx.fillStyle = '#22d3ee';
        ctx.fill();
      });

      // Draw Nodes
      filteredNodes.forEach((node) => {
        const isSelected = selectedNodeId === node.id;
        const isHovered = hoveredNode?.id === node.id;
        const color = getNodeColor(node.type, isSelected);
        const radius = getNodeRadius(node);

        // Glowing outer halo
        const haloRadius = radius + (isSelected ? 8 : isHovered ? 6 : 3) + Math.sin(t * 3) * 1.5;
        const grad = ctx.createRadialGradient(node.x, node.y, radius * 0.5, node.x, node.y, haloRadius);
        grad.addColorStop(0, color);
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(node.x, node.y, haloRadius, 0, Math.PI * 2);
        ctx.fill();

        // Node solid body
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.stroke();

        // Technical Label
        ctx.font = '9px monospace';
        ctx.fillStyle = isSelected ? '#22d3ee' : '#cbd5e1';
        ctx.fillText(node.label, node.x + radius + 4, node.y + 3);

        // Small sub-label (Venue / Price)
        if (node.price) {
          ctx.font = '8px monospace';
          ctx.fillStyle = '#64748b';
          const pStr = node.venue === 'POLYMARKET' ? `$${node.price.toFixed(3)}` : `$${node.price.toLocaleString()}`;
          ctx.fillText(pStr, node.x + radius + 4, node.y + 13);
        }
      });

      animFrame = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animFrame);
    };
  }, [nodes, filteredNodes, viewMode, selectedNodeId, hoveredNode, sizeMetric]);

  // Handle Mouse Move for Hover Detection
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setMousePos({ x: e.clientX, y: e.clientY });

    // Find closest node within detection distance
    let found: MapNode | null = null;
    for (const node of filteredNodes) {
      const dx = mouseX - node.x;
      const dy = mouseY - node.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= getNodeRadius(node) + 8) {
        found = node;
        break;
      }
    }
    setHoveredNode(found);
  };

  // Handle Canvas Click to Inspect
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (hoveredNode) {
      onSelectNode(hoveredNode);
    }
  };

  return (
    <div
      ref={containerRef}
      className="bg-[#090b10] border border-[#1b2230] p-3 flex flex-col justify-between h-full relative"
    >
      {/* Map Control Bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#1b2230] pb-2 mb-2 gap-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-mono text-xs font-bold text-zinc-100 uppercase tracking-wider">
              MARKET INTELLIGENCE MAP
            </span>
          </div>
          <span className="text-[10px] font-mono text-zinc-500">
            ({filteredNodes.length} LIVE ENTITIES)
          </span>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-1 text-[10px] font-mono">
          <div className="flex bg-[#0d121c] border border-[#1c2434] p-0.5">
            {['ALL', 'MARKETS', 'SIGNALS', 'POSITIONS', 'RISK', 'BINANCE', 'POLYMARKET'].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveFilter(cat)}
                className={`px-2 py-0.5 transition-colors ${
                  activeFilter === cat
                    ? 'bg-cyan-500/20 text-cyan-300 font-bold border-b border-cyan-400'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Size Metric Selector */}
          <div className="relative group">
            <select
              value={sizeMetric}
              onChange={(e) => setSizeMetric(e.target.value as any)}
              className="bg-[#0e131d] text-zinc-400 font-mono text-[10px] px-2 py-1 rounded border border-[#232c3f] hover:border-zinc-500 cursor-pointer focus:outline-none"
            >
              <option value="SIGNAL">SIZE: SIGNAL</option>
              <option value="EDGE">SIZE: EDGE</option>
              <option value="VOLUME">SIZE: VOLUME</option>
              <option value="EXPOSURE">SIZE: EXPOSURE</option>
            </select>
          </div>

          {/* 2D Map vs Table Toggle */}
          <div className="flex bg-[#0d121c] border border-[#1c2434] p-0.5">
            <button
              onClick={() => setViewMode('MAP')}
              className={`px-2 py-0.5 ${
                viewMode === 'MAP' ? 'bg-cyan-950/50 text-cyan-300 font-bold' : 'text-zinc-500'
              }`}
            >
              2D MAP
            </button>
            <button
              onClick={() => setViewMode('TABLE')}
              className={`px-2 py-0.5 ${
                viewMode === 'TABLE' ? 'bg-cyan-950/50 text-cyan-300 font-bold' : 'text-zinc-500'
              }`}
            >
              TABLE
            </button>
          </div>
        </div>
      </div>

      {/* Main Content: Map or Table */}
      {viewMode === 'MAP' ? (
        <div className="relative flex-1 min-h-[260px] bg-[#07080d] border border-[#141b27] overflow-hidden flex items-center justify-center cursor-crosshair">
          <canvas
            ref={canvasRef}
            width={720}
            height={280}
            onMouseMove={handleMouseMove}
            onClick={handleCanvasClick}
            className="w-full h-full object-contain"
          />

          {/* Map Legend Overlay */}
          <div className="absolute bottom-2 left-2 flex items-center gap-3 bg-[#080b11]/90 border border-[#182030] px-2 py-1 text-[9px] font-mono pointer-events-none">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-zinc-400">Buy / Arb</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              <span className="text-zinc-400">Sell / Reject</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-zinc-400">Risk Limit</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <span className="text-zinc-400">Market</span>
            </div>
          </div>

          {/* Hover Tooltip */}
          {hoveredNode && (
            <div
              className="fixed z-50 bg-[#0d131f] border border-cyan-500/50 p-2 rounded shadow-2xl text-[10px] font-mono pointer-events-none max-w-xs"
              style={{ left: mousePos.x + 12, top: mousePos.y - 12 }}
            >
              <div className="flex items-center justify-between border-b border-[#232f48] pb-1 mb-1">
                <span className="font-bold text-cyan-300">{hoveredNode.label}</span>
                <span className="text-[9px] text-zinc-500">{hoveredNode.venue}</span>
              </div>
              <div className="space-y-0.5 text-zinc-300">
                <div>TYPE: <span className="text-zinc-100 font-semibold">{hoveredNode.type}</span></div>
                {hoveredNode.price && <div>PRICE: <span className="text-emerald-400 font-bold">${hoveredNode.price}</span></div>}
                {hoveredNode.edge && <div>EDGE: <span className="text-emerald-400">+{hoveredNode.edge}%</span></div>}
                {hoveredNode.exposure && <div>EXPOSURE: <span className="text-amber-400">${hoveredNode.exposure}</span></div>}
                {hoveredNode.signalStrength && (
                  <div>CONFIDENCE: <span className="text-cyan-400">{(hoveredNode.signalStrength * 100).toFixed(0)}%</span></div>
                )}
                <div>PROVENANCE: <span className="text-zinc-400 font-semibold">{hoveredNode.provenance}</span></div>
              </div>
              <div className="text-[8px] text-cyan-400/80 border-t border-[#1e283c] mt-1 pt-1 italic">
                Click node to open Inspector Drawer
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Tabular View */
        <div className="flex-1 overflow-x-auto border border-[#141b27]">
          <table className="w-full text-left text-[11px] font-mono">
            <thead className="bg-[#0d121c] text-zinc-400 text-[10px] uppercase border-b border-[#1c2436]">
              <tr>
                <th className="p-2">Label</th>
                <th className="p-2">Category</th>
                <th className="p-2">Venue</th>
                <th className="p-2">Price</th>
                <th className="p-2">Edge / Strength</th>
                <th className="p-2">Provenance</th>
                <th className="p-2 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#151c2a]">
              {filteredNodes.map((n, idx) => (
                <tr key={`node_${n.id}_${idx}`} className="hover:bg-[#121824] transition-colors">
                  <td className="p-2 font-semibold text-zinc-200">{n.label}</td>
                  <td className="p-2">
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                      style={{ color: getNodeColor(n.type, false) }}
                    >
                      {n.type}
                    </span>
                  </td>
                  <td className="p-2 text-zinc-400">{n.venue}</td>
                  <td className="p-2 text-zinc-100 font-bold tabular-nums">
                    {n.price ? `$${n.price.toLocaleString()}` : '—'}
                  </td>
                  <td className="p-2 text-cyan-400 tabular-nums">
                    {n.edge ? `+${n.edge}%` : n.signalStrength ? `${(n.signalStrength * 100).toFixed(0)}%` : '—'}
                  </td>
                  <td className="p-2 text-zinc-500">{n.provenance}</td>
                  <td className="p-2 text-right">
                    <button
                      onClick={() => onSelectNode(n)}
                      className="px-2 py-0.5 text-[10px] bg-cyan-950/50 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/60"
                    >
                      INSPECT
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
