/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * OPC Trade Lab V1 — Master Command Center Interface
 * The unified institutional quant trading command-center conforming to all 14 design tenets.
 */

import React, { useState, useEffect, useRef } from 'react';
import { CommandCenterTopBar } from './CommandCenterTopBar.tsx';
import { AccountAiEnginePanel } from './AccountAiEnginePanel.tsx';
import { MarketMonitorPanel } from './MarketMonitorPanel.tsx';
import { AiStrategyEnginePanel } from './AiStrategyEnginePanel.tsx';
import { MarketIntelligenceMap } from './MarketIntelligenceMap.tsx';
import { EquityNavPanel } from './EquityNavPanel.tsx';
import { TradingTapePanel } from './TradingTapePanel.tsx';
import { AnalyticsPanel } from './AnalyticsPanel.tsx';
import { RiskControlCenter } from './RiskControlCenter.tsx';
import { LiveExecutionLogPanel } from './LiveExecutionLogPanel.tsx';
import { StrategySelectorModal } from './StrategySelectorModal.tsx';
import { ModeSwitchConfirmationModal } from './ModeSwitchConfirmationModal.tsx';
import { MarketInspectorDrawer } from './MarketInspectorDrawer.tsx';
import { TradeProvenanceDrawer } from './TradeProvenanceDrawer.tsx';
import { MarketLeaderSummaryCard } from './MarketLeaderSummaryCard.tsx';
import {
  AccountTradingMode,
  DataProvenance,
  ExecutionEngineStatus,
  StrategyDecision,
  StrategyDefinition,
  MapNode,
  ExecutionTapeItem,
  ExecutionLogEntry,
  PolymarketInstrument
} from '../../types/commandCenter.ts';

export const CommandCenterView: React.FC = () => {
  // Global Mode & Provenance
  const [tradingMode, setTradingMode] = useState<AccountTradingMode>('DEMO');
  const [selectedVenue, setSelectedVenue] = useState<string>('BINANCE');
  const [selectedMarket, setSelectedMarket] = useState<string>('BTCUSDT');
  const [provenance, setProvenance] = useState<DataProvenance>('LIVE');
  const [wsStatus, setWsStatus] = useState<'CONNECTED' | 'CONNECTING' | 'DISCONNECTED'>('CONNECTING');
  const [latencyMs, setLatencyMs] = useState<number>(38);

  // Live Benchmark Market Leaders Price Feeds
  const [btcPrice, setBtcPrice] = useState<string>('83620.00');
  const [btcChange24h, setBtcChange24h] = useState<string>('2.45');
  const [btcTickDir, setBtcTickDir] = useState<'UP' | 'DOWN'>('UP');

  const [xauPrice, setXauPrice] = useState<string>('2892.40');
  const [xauChange24h, setXauChange24h] = useState<string>('1.35');
  const [xauTickDir, setXauTickDir] = useState<'UP' | 'DOWN'>('UP');

  // Account & Capital State
  const [startingCapital, setStartingCapital] = useState<number>(10000);
  const [equity, setEquity] = useState<number>(10024.50);
  const [availableCash, setAvailableCash] = useState<number>(8474.50);
  const [reservedCash, setReservedCash] = useState<number>(1550.00);
  const [realizedPnl, setRealizedPnl] = useState<number>(24.50);
  const [unrealizedPnl, setUnrealizedPnl] = useState<number>(11.75);
  const [openExposure, setOpenExposure] = useState<number>(1550.00);
  const [drawdownPct, setDrawdownPct] = useState<number>(0.45);
  const [tradesToday, setTradesToday] = useState<number>(18);
  const [winRatePct, setWinRatePct] = useState<number>(72.2);

  // 3 Verified Strategies Slots
  const initialStrategies: StrategyDefinition[] = [
    {
      id: 'strat_binary_arb',
      name: 'BINARY_COMPLETE_SET_V1',
      version: 'v1.4.2-prod',
      configHash: '0x7fa2...9e41',
      validationStatus: 'PAPER VALIDATED',
      supportedVenue: 'POLYMARKET',
      timeframe: 'TICK_LEVEL',
      maxOrderSize: 1000,
      maxExposure: 2500,
      dailyLossLimit: 250,
      description: 'Zero directional risk complete-set parity arbitrage. Simultaneously buys YES + NO contracts whenever sum < $0.985.'
    },
    {
      id: 'strat_trend_breakout',
      name: 'TREND_BREAKOUT_ATR_V1',
      version: 'v2.1.0-live',
      configHash: '0x3bc9...1f80',
      validationStatus: 'LIVE APPROVED',
      supportedVenue: 'BINANCE',
      timeframe: '5m',
      maxOrderSize: 2000,
      maxExposure: 5000,
      dailyLossLimit: 500,
      description: 'Quant breakout momentum exploiting volatility expansions verified by ATR multiplier and order book imbalance.'
    },
    {
      id: 'strat_mean_reversion',
      name: 'MEAN_REVERSION_BB_RSI_V1',
      version: 'v1.0.8-backtest',
      configHash: '0xaa14...4d29',
      validationStatus: 'BACKTESTED',
      supportedVenue: 'BINANCE',
      timeframe: '15m',
      maxOrderSize: 800,
      maxExposure: 2000,
      dailyLossLimit: 300,
      description: 'Statistical mean reversion with Bollinger Bands and multi-horizon RSI oscillation counters.'
    }
  ];

  const [strategies, setStrategies] = useState<StrategyDefinition[]>(initialStrategies);
  const [activeStrategy, setActiveStrategy] = useState<StrategyDefinition>(initialStrategies[0]);

  // AI Strategy Engine Status & Signal
  const [engineStatus, setEngineStatus] = useState<ExecutionEngineStatus>('OBSERVING');
  const [decision, setDecision] = useState<StrategyDecision>('PAIR OPPORTUNITY');
  const [confidencePct, setConfidencePct] = useState<number>(87.4);
  const [grossEdgePct, setGrossEdgePct] = useState<number>(1.85);
  const [estimatedFeePct, setEstimatedFeePct] = useState<number>(0.02);
  const [estimatedSlippagePct, setEstimatedSlippagePct] = useState<number>(0.05);
  const [expectedNetEdgePct, setExpectedNetEdgePct] = useState<number>(1.78);
  const [riskAllocationUsd, setRiskAllocationUsd] = useState<number>(500);
  const [riskAllocationPct, setRiskAllocationPct] = useState<number>(5.0);
  const [expirySeconds, setExpirySeconds] = useState<number>(14);

  // Risk Engine State & Kill Switch
  const [isHalted, setIsHalted] = useState<boolean>(false);
  const [isRiskEnginePassing, setIsRiskEnginePassing] = useState<boolean>(true);

  // Inspector & Modals State
  const [selectedNode, setSelectedNode] = useState<MapNode | null>(null);
  const [selectedExecution, setSelectedExecution] = useState<ExecutionTapeItem | null>(null);
  const [isStrategyModalOpen, setIsStrategyModalOpen] = useState<boolean>(false);
  const [isModeModalOpen, setIsModeModalOpen] = useState<boolean>(false);

  // Polymarket Active Data
  const polymarketInstrument: PolymarketInstrument = {
    conditionId: '0xcond_btc_100k_q4',
    question: 'Will Bitcoin hit $100,000 before end of 2026?',
    yesPrice: 0.462,
    noPrice: 0.491,
    bestBid: 0.458,
    bestAsk: 0.462,
    depthYes: 18450,
    depthNo: 15200,
    expiry: '2026-12-31T23:59:59Z',
    feeStatus: 'ZERO MAKER / 0.02% TAKER',
    marketStatus: 'OPEN'
  };

  // Trading Tape Executions with Full Provenance Chains
  const [executions, setExecutions] = useState<ExecutionTapeItem[]>([
    {
      id: 'exec_poly_arb_001',
      time: '12:44:06',
      venue: 'POLYMARKET',
      market: 'BTC-100K-Q4',
      strategy: 'BINARY_COMPLETE_SET_V1',
      side: 'BUY',
      qty: '25 Cặp',
      price: '0.9530',
      fee: '$0.05',
      slippage: '1.2 bps',
      status: 'FILLED',
      pnl: '+$11.75',
      isPositivePnl: true,
      provenanceChain: {
        correlationId: 'cid_arb_78201a',
        timestamp: '12:44:06.120Z',
        market: 'BTC-100K-Q4',
        venue: 'POLYMARKET',
        strategy: 'BINARY_COMPLETE_SET_V1',
        signal: {
          id: 'sig_arb_092',
          timestamp: '12:44:05.940Z',
          direction: 'ARBITRAGE',
          confidence: 94.2,
          edge: 4.70,
          metricSummary: 'YES ($0.462) + NO ($0.491) = $0.9530 vs $1.000 payout. Net Edge +4.70%.'
        },
        tradeIntent: {
          id: 'intent_arb_004',
          timestamp: '12:44:05.980Z',
          targetPrice: 0.9530,
          size: 25,
          notional: 23.82,
          expectedNetEdge: 4.65,
          slippageTolerance: 5
        },
        riskCheck: {
          decision: 'APPROVED',
          timestamp: '12:44:06.012Z',
          currentExposurePct: 15.5,
          maxExposurePct: 25.0,
          dailyDrawdownPct: 0.45,
          ruleEvaluated: 'MAX_EXPOSURE_AND_DAILY_LOSS_PASS',
          latencyMs: 0.38
        },
        order: {
          id: 'ord_poly_clob_902',
          timestamp: '12:44:06.050Z',
          type: 'IOC',
          side: 'BUY',
          price: 0.9530,
          qty: 25,
          status: 'FILLED'
        },
        fill: {
          id: 'fill_poly_902_a',
          timestamp: '12:44:06.095Z',
          executedPrice: 0.9530,
          executedQty: 25,
          feePaid: 0.05,
          feeAsset: 'USDT',
          slippageBps: 1.2
        },
        ledger: {
          entryTimestamp: '12:44:06.120Z',
          preCash: 8498.32,
          postCash: 8474.50,
          realizedPnl: 11.75,
          currency: 'USDT',
          journalRef: 'JRN_20260924_0891'
        }
      }
    },
    {
      id: 'exec_binance_tb_002',
      time: '12:42:18',
      venue: 'BINANCE',
      market: 'BTCUSDT',
      strategy: 'TREND_BREAKOUT_ATR_V1',
      side: 'BUY',
      qty: '0.012 BTC',
      price: '83610.00',
      fee: '$0.75',
      slippage: '2.5 bps',
      status: 'FILLED',
      pnl: '+$8.40',
      isPositivePnl: true,
      provenanceChain: {
        correlationId: 'cid_binance_tb_4418',
        timestamp: '12:42:18.410Z',
        market: 'BTCUSDT',
        venue: 'BINANCE',
        strategy: 'TREND_BREAKOUT_ATR_V1',
        signal: {
          id: 'sig_tb_512',
          timestamp: '12:42:18.250Z',
          direction: 'BUY',
          confidence: 88.5,
          edge: 2.10,
          metricSummary: 'ATR Volatility expansion above upper Bollinger band with 2.8x volume.'
        },
        tradeIntent: {
          id: 'intent_tb_512',
          timestamp: '12:42:18.280Z',
          targetPrice: 83610.00,
          size: 0.012,
          notional: 1003.32,
          expectedNetEdge: 2.02,
          slippageTolerance: 10
        },
        riskCheck: {
          decision: 'APPROVED',
          timestamp: '12:42:18.305Z',
          currentExposurePct: 10.0,
          maxExposurePct: 25.0,
          dailyDrawdownPct: 0.35,
          ruleEvaluated: 'SINGLE_ORDER_NOTIONAL_LIMIT_PASS',
          latencyMs: 0.42
        },
        order: {
          id: 'ord_binance_spot_771',
          timestamp: '12:42:18.330Z',
          type: 'LIMIT',
          side: 'BUY',
          price: 83610.00,
          qty: 0.012,
          status: 'FILLED'
        },
        fill: {
          id: 'fill_binance_771',
          timestamp: '12:42:18.380Z',
          executedPrice: 83610.00,
          executedQty: 0.012,
          feePaid: 0.75,
          feeAsset: 'USDT',
          slippageBps: 2.5
        },
        ledger: {
          entryTimestamp: '12:42:18.410Z',
          preCash: 9501.72,
          postCash: 8498.32,
          realizedPnl: 8.40,
          currency: 'USDT',
          journalRef: 'JRN_20260924_0890'
        }
      }
    },
    {
      id: 'exec_binance_mr_003',
      time: '12:35:50',
      venue: 'BINANCE',
      market: 'ETHUSDT',
      strategy: 'MEAN_REVERSION_BB_RSI_V1',
      side: 'BUY',
      qty: '0.25 ETH',
      price: '2648.50',
      fee: '$0.49',
      slippage: '0.8 bps',
      status: 'FILLED',
      pnl: '+$4.35',
      isPositivePnl: true,
      provenanceChain: {
        correlationId: 'cid_binance_mr_9921',
        timestamp: '12:35:50.150Z',
        market: 'ETHUSDT',
        venue: 'BINANCE',
        strategy: 'MEAN_REVERSION_BB_RSI_V1',
        signal: {
          id: 'sig_mr_109',
          timestamp: '12:35:50.010Z',
          direction: 'BUY',
          confidence: 76.2,
          edge: 1.45,
          metricSummary: 'RSI(14)=28.4 over-sold reversal cross.'
        },
        tradeIntent: {
          id: 'intent_mr_109',
          timestamp: '12:35:50.040Z',
          targetPrice: 2648.50,
          size: 0.25,
          notional: 662.12,
          expectedNetEdge: 1.38,
          slippageTolerance: 8
        },
        riskCheck: {
          decision: 'APPROVED',
          timestamp: '12:35:50.065Z',
          currentExposurePct: 6.6,
          maxExposurePct: 25.0,
          dailyDrawdownPct: 0.20,
          ruleEvaluated: 'CORRELATION_CONCENTRATION_PASS',
          latencyMs: 0.35
        },
        order: {
          id: 'ord_binance_eth_441',
          timestamp: '12:35:50.090Z',
          type: 'LIMIT',
          side: 'BUY',
          price: 2648.50,
          qty: 0.25,
          status: 'FILLED'
        },
        fill: {
          id: 'fill_binance_eth_441',
          timestamp: '12:35:50.120Z',
          executedPrice: 2648.50,
          executedQty: 0.25,
          feePaid: 0.49,
          feeAsset: 'USDT',
          slippageBps: 0.8
        },
        ledger: {
          entryTimestamp: '12:35:50.150Z',
          preCash: 10163.84,
          postCash: 9501.72,
          realizedPnl: 4.35,
          currency: 'USDT',
          journalRef: 'JRN_20260924_0889'
        }
      }
    },
    {
      id: 'exec_binance_sl_004',
      time: '12:28:10',
      venue: 'BINANCE',
      market: 'SOLUSDT',
      strategy: 'TREND_BREAKOUT_ATR_V1',
      side: 'SELL',
      qty: '8.5 SOL',
      price: '113.80',
      fee: '$0.35',
      slippage: '1.8 bps',
      status: 'FILLED',
      pnl: '-$4.80',
      isPositivePnl: false,
      provenanceChain: {
        correlationId: 'cid_binance_sl_1042',
        timestamp: '12:28:10.220Z',
        market: 'SOLUSDT',
        venue: 'BINANCE',
        strategy: 'TREND_BREAKOUT_ATR_V1',
        signal: {
          id: 'sig_sl_802',
          timestamp: '12:28:10.050Z',
          direction: 'SELL',
          confidence: 64.0,
          edge: -1.10,
          metricSummary: 'Stop-loss hit: Sudden sell wall formed, automated defensive exit triggered.'
        },
        tradeIntent: {
          id: 'intent_sl_802',
          timestamp: '12:28:10.080Z',
          targetPrice: 113.80,
          size: 8.5,
          notional: 967.30,
          expectedNetEdge: -1.15,
          slippageTolerance: 5
        },
        riskCheck: {
          decision: 'APPROVED',
          timestamp: '12:28:10.110Z',
          currentExposurePct: 9.6,
          maxExposurePct: 25.0,
          dailyDrawdownPct: 0.45,
          ruleEvaluated: 'MANDATORY_STOP_LOSS_PASS',
          latencyMs: 0.28
        },
        order: {
          id: 'ord_binance_sol_309',
          timestamp: '12:28:10.140Z',
          type: 'IOC',
          side: 'SELL',
          price: 113.80,
          qty: 8.5,
          status: 'FILLED'
        },
        fill: {
          id: 'fill_binance_sol_309',
          timestamp: '12:28:10.180Z',
          executedPrice: 113.80,
          executedQty: 8.5,
          feePaid: 0.35,
          feeAsset: 'USDT',
          slippageBps: 1.8
        },
        ledger: {
          entryTimestamp: '12:28:10.220Z',
          preCash: 9506.52,
          postCash: 9501.72,
          realizedPnl: -4.80,
          currency: 'USDT',
          journalRef: 'JRN_20260924_0888'
        }
      }
    }
  ]);

  // Terminal Live Execution Logs
  const [logs, setLogs] = useState<ExecutionLogEntry[]>([
    { id: 'log_01', timestamp: '12:44:20', module: 'MARKET', correlationId: 'cid_mkt_9918', message: 'BTCUSDT real tick snapshot received (83620.00 USDT, vol: 24.5k)', severity: 'INFO' },
    { id: 'log_02', timestamp: '12:44:22', module: 'SIGNAL', correlationId: 'cid_sig_0921', message: 'BINARY_COMPLETE_SET candidate generated: Parity edge +4.70%', severity: 'INFO' },
    { id: 'log_03', timestamp: '12:44:24', module: 'RISK', correlationId: 'cid_arb_78201a', message: 'Risk Engine check: PASSED (latency 0.38ms, exposure 15.5% / 25.0%)', severity: 'SUCCESS' },
    { id: 'log_04', timestamp: '12:44:25', module: 'ORDER', correlationId: 'cid_arb_78201a', message: 'IOC complete-set order submitted to CLOB gateway (25 pairs)', severity: 'INFO' },
    { id: 'log_05', timestamp: '12:44:26', module: 'FILL', correlationId: 'cid_arb_78201a', message: 'FILL 100% matched: YES @ 0.462 + NO @ 0.491. Fee: $0.05, Slippage: 1.2bps', severity: 'SUCCESS' },
    { id: 'log_06', timestamp: '12:44:27', module: 'LEDGER', correlationId: 'cid_arb_78201a', message: 'Ledger cash reconciled: $8,474.50 (+ $11.75 unrealized gain booked)', severity: 'SUCCESS' }
  ]);

  // Connect Real-Time WebSocket for Live Price Ticks
  useEffect(() => {
    let reconnectTimeout: any;
    let isCleanedUp = false;
    let wsInstance: WebSocket | null = null;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/price-alerts`;

    const connect = () => {
      if (isCleanedUp) return;
      setWsStatus('CONNECTING');
      const ws = new WebSocket(wsUrl);
      wsInstance = ws;

      ws.onopen = () => {
        if (isCleanedUp) {
          ws.close();
          return;
        }
        setWsStatus('CONNECTED');
        setLatencyMs(Math.floor(Math.random() * 15 + 28));
      };

      ws.onmessage = (event) => {
        if (isCleanedUp) return;
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'PRICE_TICK') {
            if (data.symbol === 'BTCUSDT') {
              const oldP = parseFloat(btcPrice);
              const newP = parseFloat(data.price);
              setBtcPrice(data.price);
              setBtcTickDir(newP >= oldP ? 'UP' : 'DOWN');
              if (data.change24h) setBtcChange24h(data.change24h.toString());
            } else if (data.symbol === 'XAUUSD') {
              const oldP = parseFloat(xauPrice);
              const newP = parseFloat(data.price);
              setXauPrice(data.price);
              setXauTickDir(newP >= oldP ? 'UP' : 'DOWN');
              if (data.change24h) setXauChange24h(data.change24h.toString());
            }
          }
        } catch {
          // ignore
        }
      };

      ws.onclose = () => {
        if (isCleanedUp) return;
        setWsStatus('DISCONNECTED');
        reconnectTimeout = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    // Simulated micro-ticks for XAUUSD Gold Spot
    const goldInterval = setInterval(() => {
      setXauPrice((prev) => {
        const current = parseFloat(prev.replace(/,/g, '')) || 2892.40;
        const delta = (Math.random() - 0.48) * 0.35;
        const next = Number((current + delta).toFixed(2));
        setXauTickDir(delta >= 0 ? 'UP' : 'DOWN');
        return next.toFixed(2);
      });
    }, 2800);

    return () => {
      isCleanedUp = true;
      clearTimeout(reconnectTimeout);
      clearInterval(goldInterval);
      if (wsInstance) {
        wsInstance.onclose = null;
        wsInstance.onerror = null;
        wsInstance.close();
        wsInstance = null;
      }
    };
  }, []);

  // Quick Inspect Market Leader Handlers
  const handleInspectBtc = () => {
    setSelectedMarket('BTCUSDT');
    setSelectedVenue('BINANCE');
    const node: MapNode = {
      id: 'node_btc_leader',
      label: 'BTC/USDT Benchmark Leader',
      type: 'MARKET',
      venue: 'BINANCE SPOT',
      market: 'BTCUSDT',
      x: 48,
      y: 45,
      price: parseFloat(btcPrice),
      volume: 24560,
      liquidity: 185000000,
      edge: parseFloat(btcChange24h),
      signalStrength: 0.94,
      provenance: provenance,
      timestamp: new Date().toLocaleTimeString([], { hour12: false }),
      details: {
        description: 'Bitcoin Spot Macro Benchmark. Digital gold driving cross-market liquidity, sentiment, and crypto market capitalization.',
        strategyId: 'TREND_BREAKOUT_ATR_V1',
        riskDecision: 'APPROVED',
        pnlAttribution: 18.40
      }
    };
    setSelectedNode(node);
  };

  const handleInspectGold = () => {
    setSelectedMarket('XAUUSD');
    setSelectedVenue('METATRADER5');
    const node: MapNode = {
      id: 'node_xau_leader',
      label: 'XAU/USD Gold Benchmark Leader',
      type: 'MARKET',
      venue: 'LONDON SPOT / MT5',
      market: 'XAUUSD',
      x: 68,
      y: 42,
      price: parseFloat(xauPrice),
      volume: 48920,
      liquidity: 420000000,
      edge: parseFloat(xauChange24h),
      signalStrength: 0.88,
      provenance: provenance,
      timestamp: new Date().toLocaleTimeString([], { hour12: false }),
      details: {
        description: 'Physical Gold Spot Macro Anchor. Sovereign reserve benchmark and traditional safe-haven hedge against currency debasement.',
        strategyId: 'MOMENTUM_LAG_MT5',
        riskDecision: 'APPROVED',
        pnlAttribution: 23.50
      }
    };
    setSelectedNode(node);
  };

  // Demo Capital Preset Handler
  const handleResetDemoCapital = (amt: number) => {
    setStartingCapital(amt);
    setEquity(amt);
    setAvailableCash(amt);
    setReservedCash(0);
    setOpenExposure(0);
    setRealizedPnl(0);
    setUnrealizedPnl(0);

    const auditEntry: ExecutionLogEntry = {
      id: `log_demo_${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour12: false }),
      module: 'LEDGER',
      correlationId: `demo_reset_${amt}`,
      message: `SIMULATOR CAPITAL RESET: Initialized $${amt.toLocaleString()} simulated balance.`,
      severity: 'INFO'
    };
    setLogs((prev) => [auditEntry, ...prev.slice(0, 49)]);
  };

  // Halt Trading Handler
  const handleToggleHalt = () => {
    const nextHalted = !isHalted;
    setIsHalted(nextHalted);
    setEngineStatus(nextHalted ? 'HALTED' : 'OBSERVING');
    setIsRiskEnginePassing(!nextHalted);

    const haltLog: ExecutionLogEntry = {
      id: `log_halt_${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour12: false }),
      module: 'RISK',
      correlationId: `cid_halt_${Date.now()}`,
      message: nextHalted
        ? 'EMERGENCY HALT TRIGGERED: All new executions stopped. Pending orders canceled.'
        : 'SYSTEM RESUMED: Risk Engine gateway re-armed and passing checks.',
      severity: nextHalted ? 'ERROR' : 'SUCCESS'
    };
    setLogs((prev) => [haltLog, ...prev.slice(0, 49)]);
  };

  // Mode Switch Confirm
  const handleConfirmModeSwitch = (newMode: AccountTradingMode) => {
    setTradingMode(newMode);
    setProvenance(newMode === 'LIVE' ? 'LIVE' : 'PAPER ON LIVE');

    const modeLog: ExecutionLogEntry = {
      id: `log_mode_${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour12: false }),
      module: 'SYSTEM',
      correlationId: `cid_mode_${Date.now()}`,
      message: `TRADING MODE SWITCHED: Active mode is now [${newMode}]. Verified by Risk Engine.`,
      severity: newMode === 'LIVE' ? 'WARN' : 'INFO'
    };
    setLogs((prev) => [modeLog, ...prev.slice(0, 49)]);
  };

  return (
    <div className="min-h-screen bg-[#06080c] text-zinc-200 font-mono flex flex-col select-none antialiased">
      {/* 1. TOP GLOBAL STATUS BAR (40-48px) */}
      <CommandCenterTopBar
        tradingMode={tradingMode}
        onOpenModeSwitchModal={() => setIsModeModalOpen(true)}
        selectedVenue={selectedVenue}
        onSelectVenue={(v) => {
          setSelectedVenue(v);
          if (v === 'POLYMARKET') setSelectedMarket('BTC-100K-Q4');
          else if (selectedMarket.startsWith('BTC-100K')) setSelectedMarket('BTCUSDT');
        }}
        selectedMarket={selectedMarket}
        onSelectMarket={setSelectedMarket}
        provenance={provenance}
        connectionStatus={wsStatus}
        latencyMs={latencyMs}
        btcPrice={btcPrice}
        btcChange24h={btcChange24h}
        btcTickDir={btcTickDir}
        cash={availableCash}
        equity={equity}
        openExposure={openExposure}
        tradesTodayCount={tradesToday}
      />

      {/* MAIN COMMAND CENTER BODY */}
      <main className="flex-1 p-2 sm:p-3 space-y-2.5 max-w-[1920px] mx-auto w-full">
        {/* UNIFIED MARKET LEADER SUMMARY CARD (BTC & GOLD SPREAD BENCHMARK) */}
        <MarketLeaderSummaryCard
          btcPrice={btcPrice}
          btcChange24h={btcChange24h}
          btcTickDir={btcTickDir}
          xauPrice={xauPrice}
          xauChange24h={xauChange24h}
          xauTickDir={xauTickDir}
          onInspectBtc={handleInspectBtc}
          onInspectGold={handleInspectGold}
          onSelectMarket={(market) => {
            setSelectedMarket(market);
            if (market === 'XAUUSD') setSelectedVenue('METATRADER5');
            else if (market === 'BTCUSDT') setSelectedVenue('BINANCE');
          }}
        />

        {/* TOP ROW: 3 KEY PANELS (Account, Market Monitor, AI Engine) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5">
          {/* Top Left: Account / Capital Panel (Span 3) */}
          <div className="lg:col-span-3 min-h-[300px]">
            <AccountAiEnginePanel
              tradingMode={tradingMode}
              accountName={tradingMode === 'LIVE' ? 'BINANCE-SPOT-MAIN' : 'PILOT-OWNER-DEMO-01'}
              connectedVenue={selectedVenue}
              strategyName={activeStrategy.name}
              equity={equity}
              startingCapital={startingCapital}
              availableCash={availableCash}
              reservedCash={reservedCash}
              realizedPnl={realizedPnl}
              unrealizedPnl={unrealizedPnl}
              openExposure={openExposure}
              drawdownPct={drawdownPct}
              tradesToday={tradesToday}
              winRatePct={winRatePct}
              onResetDemoCapital={handleResetDemoCapital}
            />
          </div>

          {/* Top Center: Market Monitor (Span 6) */}
          <div className="lg:col-span-6 min-h-[300px]">
            <MarketMonitorPanel
              venue={selectedVenue}
              marketSymbol={selectedMarket}
              currentPrice={btcPrice}
              priceChangePercent={btcChange24h}
              volume24h="24,560 BTC"
              high24h="84,200.00"
              low24h="81,800.00"
              latencyMs={latencyMs}
              polymarketData={polymarketInstrument}
            />
          </div>

          {/* Top Right: AI Strategy Engine (Span 3) */}
          <div className="lg:col-span-3 min-h-[300px]">
            <AiStrategyEnginePanel
              strategyName={activeStrategy.name}
              version={activeStrategy.version}
              configHash={activeStrategy.configHash}
              status={engineStatus}
              decision={decision}
              confidencePct={confidencePct}
              grossEdgePct={grossEdgePct}
              estimatedFeePct={estimatedFeePct}
              estimatedSlippagePct={estimatedSlippagePct}
              expectedNetEdgePct={expectedNetEdgePct}
              riskAllocationUsd={riskAllocationUsd}
              riskAllocationPct={riskAllocationPct}
              expirySeconds={expirySeconds}
              isRiskEnginePassing={isRiskEnginePassing}
              onToggleHalt={handleToggleHalt}
            />
          </div>
        </div>

        {/* CENTER ROW: MARKET INTELLIGENCE MAP (SIGNATURE SPATIAL VISUALIZATION) */}
        <div className="w-full min-h-[320px]">
          <MarketIntelligenceMap
            onSelectNode={(node) => setSelectedNode(node)}
            selectedNodeId={selectedNode?.id}
          />
        </div>

        {/* LOWER ROW: 3 ANALYTICAL/EXECUTION PANELS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5">
          {/* Lower Left: Equity / NAV Curve (Span 4) */}
          <div className="lg:col-span-4 min-h-[220px]">
            <EquityNavPanel
              startingEquity={startingCapital}
              currentEquity={equity}
              peakEquity={startingCapital + 34.20}
              maxDrawdownPct={drawdownPct}
              realizedPnl={realizedPnl}
              unrealizedPnl={unrealizedPnl}
              isDemoMode={tradingMode === 'DEMO'}
            />
          </div>

          {/* Lower Center: Dense Trading Tape (Span 5) */}
          <div className="lg:col-span-5 min-h-[220px]">
            <TradingTapePanel
              executions={executions}
              onSelectExecution={(item) => setSelectedExecution(item)}
              selectedExecutionId={selectedExecution?.id}
            />
          </div>

          {/* Lower Right: 4 Analytics Histograms (Span 3) */}
          <div className="lg:col-span-3 min-h-[220px]">
            <AnalyticsPanel />
          </div>
        </div>

        {/* RISK CONTROL CENTER BAR (ALWAYS VISIBLE GATEWAY) */}
        <RiskControlCenter
          maxOrderSizeUsd={activeStrategy.maxOrderSize}
          maxExposureUsd={activeStrategy.maxExposure}
          maxExposurePct={25}
          currentExposureUsd={openExposure}
          dailyLossLimitUsd={activeStrategy.dailyLossLimit}
          currentDailyLossUsd={0}
          currentDrawdownPct={drawdownPct}
          openPositionsCount={2}
          isHalted={isHalted}
          onToggleHalt={handleToggleHalt}
        />

        {/* TERMINAL-STYLE LIVE EXECUTION LOG SPANNING THE SCREEN */}
        <LiveExecutionLogPanel
          logs={logs}
          onClearLogs={() => setLogs([])}
        />
      </main>

      {/* MODALS & DRAWERS */}
      <StrategySelectorModal
        isOpen={isStrategyModalOpen}
        onClose={() => setIsStrategyModalOpen(false)}
        strategies={strategies}
        selectedStrategyId={activeStrategy.id}
        onSelectStrategy={(s) => setActiveStrategy(s)}
        isLiveMode={tradingMode === 'LIVE'}
      />

      <ModeSwitchConfirmationModal
        isOpen={isModeModalOpen}
        onClose={() => setIsModeModalOpen(false)}
        currentMode={tradingMode}
        onConfirmSwitch={handleConfirmModeSwitch}
        venue={selectedVenue}
        accountName={tradingMode === 'LIVE' ? 'BINANCE-SPOT-MAIN' : 'PILOT-OWNER-DEMO-01'}
        strategy={activeStrategy}
        killSwitchState={isHalted ? 'HALTED' : 'ARMED & PASSING'}
      />

      {/* Market Inspector Drawer */}
      <MarketInspectorDrawer
        node={selectedNode}
        onClose={() => setSelectedNode(null)}
      />

      {/* Trade Provenance Chain Drawer */}
      <TradeProvenanceDrawer
        execution={selectedExecution}
        onClose={() => setSelectedExecution(null)}
      />
    </div>
  );
};
