/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * OPC Trade Lab V1 — Bottom: Terminal Execution Log (Live)
 * Spans full width of the screen.
 * Displays real timestamp, module, correlation ID, message, and severity.
 * Supports filters: ALL, MARKET, SIGNAL, RISK, ORDER, FILL, SYSTEM,
 * with search, pause, autoscroll, and export options.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Terminal,
  Pause,
  Play,
  Search,
  Trash2,
  ArrowDownCircle,
  Copy,
  Check
} from 'lucide-react';
import { ExecutionLogEntry } from '../../types/commandCenter.ts';

interface LiveExecutionLogPanelProps {
  logs: ExecutionLogEntry[];
  onClearLogs?: () => void;
}

export const LiveExecutionLogPanel: React.FC<LiveExecutionLogPanelProps> = ({
  logs,
  onClearLogs
}) => {
  const [filterModule, setFilterModule] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  const filteredLogs = logs.filter((log) => {
    if (filterModule !== 'ALL' && log.module !== filterModule) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        log.message.toLowerCase().includes(q) ||
        log.correlationId.toLowerCase().includes(q) ||
        log.module.toLowerCase().includes(q)
      );
    }
    return true;
  });

  useEffect(() => {
    if (autoScroll && !isPaused && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredLogs, autoScroll, isPaused]);

  const copyCorrelationId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const getModuleBadge = (mod: string) => {
    switch (mod) {
      case 'MARKET':
        return 'text-slate-400 border-slate-700 bg-slate-900/40';
      case 'SIGNAL':
        return 'text-cyan-400 border-cyan-700 bg-cyan-950/40';
      case 'RISK':
        return 'text-amber-400 border-amber-700 bg-amber-950/40';
      case 'ORDER':
        return 'text-purple-400 border-purple-700 bg-purple-950/40';
      case 'FILL':
        return 'text-emerald-400 border-emerald-700 bg-emerald-950/40';
      case 'LEDGER':
        return 'text-blue-400 border-blue-700 bg-blue-950/40';
      case 'SYSTEM':
      default:
        return 'text-zinc-500 border-zinc-700 bg-zinc-900';
    }
  };

  return (
    <div className="bg-[#080a0f] border border-[#1b2230] p-2.5 flex flex-col justify-between text-xs font-mono select-text">
      {/* Header & Controls Bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#1b2230] pb-2 mb-1.5 gap-2">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-bold text-zinc-200 uppercase tracking-wider text-[11px]">
            EXECUTION LOG — LIVE
          </span>
          <span className="text-[10px] text-zinc-500">
            ({filteredLogs.length} events {isPaused ? '[PAUSED]' : ''})
          </span>
        </div>

        {/* Filter buttons */}
        <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
          <div className="flex bg-[#0c111b] border border-[#1b2537] p-0.5">
            {['ALL', 'MARKET', 'SIGNAL', 'RISK', 'ORDER', 'FILL', 'LEDGER', 'SYSTEM'].map((mod) => (
              <button
                key={mod}
                onClick={() => setFilterModule(mod)}
                className={`px-2 py-0.5 transition-colors ${
                  filterModule === mod
                    ? 'bg-cyan-500/20 text-cyan-300 font-bold border-b border-cyan-400'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {mod}
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search logs/cid..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#0b1019] border border-[#1c273b] text-zinc-300 text-[10px] px-2 py-0.5 w-28 sm:w-36 focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* Action buttons */}
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`px-2 py-0.5 border flex items-center gap-1 text-[10px] ${
              isPaused
                ? 'bg-amber-950/60 border-amber-500 text-amber-300'
                : 'bg-[#101726] border-[#222e44] text-zinc-400 hover:text-zinc-200'
            }`}
            title="Pause/Resume live feed"
          >
            {isPaused ? <Play className="w-2.5 h-2.5" /> : <Pause className="w-2.5 h-2.5" />}
            <span>{isPaused ? 'RESUME' : 'PAUSE'}</span>
          </button>

          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`px-2 py-0.5 border text-[10px] ${
              autoScroll
                ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300'
                : 'bg-[#101726] border-[#222e44] text-zinc-500'
            }`}
          >
            AUTOSCROLL
          </button>

          {onClearLogs && (
            <button
              onClick={onClearLogs}
              className="px-1.5 py-0.5 bg-[#101726] border border-[#222e44] text-zinc-500 hover:text-rose-400"
              title="Clear visible logs"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Terminal Lines Container */}
      <div
        ref={scrollRef}
        className="h-28 overflow-y-auto overflow-x-hidden space-y-1 text-[11px] bg-[#05070a] border border-[#131924] p-2 leading-relaxed"
      >
        {filteredLogs.length === 0 ? (
          <div className="text-zinc-600 text-center py-6">No matching execution events.</div>
        ) : (
          filteredLogs.map((log, idx) => (
            <div
              key={`log_${log.id}_${idx}`}
              className="flex items-start gap-2 hover:bg-[#0c121d] px-1 py-0.5 rounded transition-colors group"
            >
              {/* Timestamp */}
              <span className="text-zinc-500 text-[10px] shrink-0 tabular-nums">
                {log.timestamp}
              </span>

              {/* Module Badge */}
              <span
                className={`text-[9px] px-1.5 py-0.2 border uppercase tracking-wider font-semibold shrink-0 ${getModuleBadge(
                  log.module
                )}`}
              >
                {log.module}
              </span>

              {/* Correlation ID */}
              <button
                onClick={() => copyCorrelationId(log.correlationId)}
                className="text-zinc-600 group-hover:text-cyan-400/80 text-[10px] shrink-0 font-mono flex items-center gap-0.5 hover:underline"
                title="Click to copy correlation ID"
              >
                <span>{log.correlationId}</span>
                {copiedId === log.correlationId ? (
                  <Check className="w-2.5 h-2.5 text-emerald-400" />
                ) : (
                  <Copy className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </button>

              {/* Message */}
              <span
                className={`flex-1 break-all ${
                  log.severity === 'ERROR'
                    ? 'text-rose-400 font-semibold'
                    : log.severity === 'WARN'
                    ? 'text-amber-400 font-medium'
                    : log.severity === 'SUCCESS'
                    ? 'text-emerald-300'
                    : 'text-zinc-300'
                }`}
              >
                {log.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
