/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * OPC Trade Lab V1 — Types & Interfaces for Command Center
 * Covers: Account, Venue, Market, Strategies, Intelligence Map Nodes,
 * Provenance Chains, Risk Controls, and Execution Logging.
 */

export type AccountTradingMode = 'DEMO' | 'LIVE';

export type DataProvenance = 
  | 'LIVE'
  | 'PAPER ON LIVE'
  | 'LIVE READ-ONLY'
  | 'RECORDED LIVE'
  | 'SYNTHETIC'
  | 'STALE'
  | 'DISCONNECTED';

export type ExecutionEngineStatus =
  | 'OBSERVING'
  | 'SIGNAL'
  | 'VALIDATING'
  | 'RISK CHECK'
  | 'QUEUED'
  | 'EXECUTING'
  | 'PARTIAL'
  | 'FILLED'
  | 'REJECTED'
  | 'HALTED';

export type StrategyDecision = 
  | 'BUY'
  | 'SELL'
  | 'NO TRADE'
  | 'PAIR OPPORTUNITY'
  | 'REJECTED';

export type StrategyValidationStatus = 
  | 'RESEARCH'
  | 'BACKTESTED'
  | 'PAPER VALIDATED'
  | 'LIVE APPROVED';

export interface StrategyDefinition {
  id: string;
  name: string;
  version: string;
  configHash: string;
  validationStatus: StrategyValidationStatus;
  supportedVenue: 'BINANCE' | 'POLYMARKET' | 'HYBRID_CLOB';
  timeframe: string;
  maxOrderSize: number;
  maxExposure: number;
  dailyLossLimit: number;
  description: string;
}

export type MapNodeType = 
  | 'MARKET'
  | 'BUY SIGNAL'
  | 'SELL SIGNAL'
  | 'ARBITRAGE CANDIDATE'
  | 'ACTIVE POSITION'
  | 'RISK EVENT'
  | 'STALE FEED'
  | 'REJECTED TRADE';

export interface MapNode {
  id: string;
  label: string;
  type: MapNodeType;
  venue: string;
  market: string;
  x: number; // canvas coordinate or percentage
  y: number;
  vx?: number;
  vy?: number;
  price?: number;
  volume?: number;
  edge?: number;
  liquidity?: number;
  exposure?: number;
  signalStrength?: number; // 0 to 1
  provenance: DataProvenance;
  timestamp: string;
  details?: {
    conditionId?: string;
    strategyId?: string;
    tradeIntentId?: string;
    riskDecision?: 'APPROVED' | 'REJECTED_EXPOSURE' | 'REJECTED_DRAWDOWN' | 'PENDING';
    orderId?: string;
    fillPrice?: number;
    fillQty?: number;
    pnlAttribution?: number;
    rejectionReason?: string;
    description?: string;
  };
}

export interface MapEdge {
  id: string;
  source: string;
  target: string;
  relationType: 'SAME_MARKET' | 'SAME_CONDITION' | 'SAME_STRATEGY' | 'RELATED_EXECUTION' | 'PAIRED_OUTCOMES';
}

export interface ProvenanceChain {
  correlationId: string;
  timestamp: string;
  market: string;
  venue: string;
  strategy: string;
  signal: {
    id: string;
    timestamp: string;
    direction: 'BUY' | 'SELL' | 'ARBITRAGE';
    confidence: number;
    edge: number;
    metricSummary: string;
  };
  tradeIntent: {
    id: string;
    timestamp: string;
    targetPrice: number;
    size: number;
    notional: number;
    expectedNetEdge: number;
    slippageTolerance: number;
  };
  riskCheck: {
    decision: 'APPROVED' | 'REJECTED';
    timestamp: string;
    currentExposurePct: number;
    maxExposurePct: number;
    dailyDrawdownPct: number;
    ruleEvaluated: string;
    latencyMs: number;
  };
  order: {
    id: string;
    timestamp: string;
    type: 'LIMIT' | 'IOC' | 'FOK';
    side: 'BUY' | 'SELL';
    price: number;
    qty: number;
    status: 'FILLED' | 'PARTIAL' | 'REJECTED' | 'CANCELLED';
  };
  fill: {
    id: string;
    timestamp: string;
    executedPrice: number;
    executedQty: number;
    feePaid: number;
    feeAsset: string;
    slippageBps: number;
  };
  ledger: {
    entryTimestamp: string;
    preCash: number;
    postCash: number;
    realizedPnl: number;
    currency: string;
    journalRef: string;
  };
}

export interface ExecutionTapeItem {
  id: string;
  time: string;
  venue: string;
  market: string;
  strategy: string;
  side: 'BUY' | 'SELL';
  qty: string;
  price: string;
  fee: string;
  slippage: string;
  status: 'FILLED' | 'PARTIAL' | 'REJECTED';
  pnl: string;
  isPositivePnl: boolean;
  provenanceChain: ProvenanceChain;
}

export interface ExecutionLogEntry {
  id: string;
  timestamp: string;
  module: 'MARKET' | 'SIGNAL' | 'RISK' | 'ORDER' | 'FILL' | 'SYSTEM' | 'LEDGER';
  correlationId: string;
  message: string;
  severity: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
}

export interface EquityCurvePoint {
  timestamp: string;
  timeLabel: string;
  equity: number;
  cash: number;
  exposure: number;
  drawdown: number;
}

export interface PolymarketInstrument {
  conditionId: string;
  question: string;
  yesPrice: number;
  noPrice: number;
  bestBid: number;
  bestAsk: number;
  depthYes: number;
  depthNo: number;
  expiry: string;
  feeStatus: string;
  marketStatus: 'OPEN' | 'RESOLVING' | 'CLOSED';
}
