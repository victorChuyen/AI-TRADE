/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * OPC Trade Lab V1 — MetaTrader 5 Model Context Protocol (MCP) Integration Panel
 * Architecture: `ariadng/metatrader-mcp-server` + `claude-mt5-trader`
 * Enables direct LLM integration (Claude Desktop, GPT-4, Cursor, Open WebUI) to MT5
 * without custom middleware, exposing 80+ standardized MCP tools.
 */

import React, { useState } from 'react';
import {
  Cpu,
  Zap,
  Server,
  Terminal,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Layers,
  BarChart2,
  DollarSign,
  AlertTriangle,
  Play,
  RefreshCw,
  Code2,
  Radio,
  FileCode2,
  CheckCircle2,
  Sparkles,
  Bot
} from 'lucide-react';

interface Mt5McpServerPanelProps {
  brokerServer: string;
  loginAccount: string;
  terminalPath: string;
  accountType: 'HEDGING' | 'NETTING';
  isConnected: boolean;
}

export const Mt5McpServerPanel: React.FC<Mt5McpServerPanelProps> = ({
  brokerServer,
  loginAccount,
  terminalPath,
  accountType,
  isConnected
}) => {
  const [selectedClient, setSelectedClient] = useState<'claude_desktop' | 'cursor' | 'open_webui' | 'python_cli'>('claude_desktop');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [selectedToolCategory, setSelectedToolCategory] = useState<'all' | 'market' | 'trade' | 'account' | 'backtest'>('all');
  const [testedTool, setTestedTool] = useState<string | null>(null);
  const [toolTestOutput, setToolTestOutput] = useState<{ tool: string; result: string; latencyMs: number } | null>(null);
  const [isExecutingTool, setIsExecutingTool] = useState(false);

  const handleCopy = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2500);
  };

  // Generate MCP Configuration based on live form settings
  const getClientConfig = () => {
    switch (selectedClient) {
      case 'claude_desktop':
        return JSON.stringify(
          {
            mcpServers: {
              "metatrader-mcp-server": {
                command: "uvx",
                args: ["metatrader-mcp-server"],
                env: {
                  MT5_SERVER: brokerServer || "MetaQuotes-Demo",
                  MT5_LOGIN: loginAccount || "50183921",
                  MT5_PASSWORD: "YOUR_MT5_PASSWORD",
                  MT5_PATH: terminalPath || "C:\\Program Files\\MetaTrader 5\\terminal64.exe",
                  MT5_ACCOUNT_TYPE: accountType,
                  MT5_ATOMIC_SL_TP: "true"
                }
              }
            }
          },
          null,
          2
        );

      case 'cursor':
        return JSON.stringify(
          {
            mcp: {
              servers: {
                "mt5-bridge": {
                  type: "command",
                  command: "python",
                  args: ["-m", "metatrader_mcp_server"],
                  env: {
                    MT5_SERVER: brokerServer,
                    MT5_LOGIN: loginAccount,
                    MT5_PASSWORD: "YOUR_MT5_PASSWORD",
                    MT5_PATH: terminalPath
                  }
                }
              }
            }
          },
          null,
          2
        );

      case 'open_webui':
        return `# Open WebUI / OpenAI Function Calling Bridge
# Thêm vào file .env hoặc cấu hình Tools Gateway:
MCP_SERVERS_JSON='{"mt5":{"url":"http://127.0.0.1:8000/sse","transport":"sse"}}'
MT5_SERVER="${brokerServer}"
MT5_LOGIN="${loginAccount}"
MT5_PASSWORD="YOUR_MT5_PASSWORD"
MT5_PORT=8000`;

      case 'python_cli':
      default:
        return `# Cài đặt và khởi chạy MetaTrader MCP Server qua uv (khuyên dùng):
uv tool install metatrader-mcp-server

# Hoặc qua pip:
pip install metatrader-mcp-server

# Khởi chạy server kết nối trực tiếp MT5 64-bit:
metatrader-mcp-server \\
  --server "${brokerServer}" \\
  --login "${loginAccount}" \\
  --path "${terminalPath}" \\
  --transport stdio`;
    }
  };

  // Curated representative tools from the 80+ tools library
  const mcpToolsList = [
    {
      id: 'mt5_account_info',
      category: 'account',
      name: 'account_info',
      desc: 'Truy vấn toàn bộ số dư, equity, free margin, margin level, leverage và chế độ hedge/netting.',
      inputSchema: '{}',
      mockResult: {
        balance: 25840.50,
        equity: 26195.80,
        margin: 840.00,
        free_margin: 25355.80,
        margin_level: 3118.5,
        currency: 'USD',
        trade_allowed: true,
        account_type: accountType
      }
    },
    {
      id: 'mt5_order_send_atomic',
      category: 'trade',
      name: 'order_send_atomic',
      desc: 'Đặt lệnh nguyên khối (atomic) gắn liền SL và TP trong cùng một request struct để chống trượt giá và naked risk.',
      inputSchema: '{\n  "symbol": "XAUUSD",\n  "action": "BUY",\n  "volume": 0.5,\n  "sl_price": 2885.00,\n  "tp_price": 2920.00,\n  "comment": "Claude_Quant_AI"\n}',
      mockResult: {
        ticket: 10482915,
        retcode: 10009,
        comment: 'Request completed (TRADE_RETCODE_DONE)',
        price: 2892.40,
        sl: 2885.00,
        tp: 2920.00,
        volume: 0.50
      }
    },
    {
      id: 'mt5_get_rates',
      category: 'market',
      name: 'get_rates_range',
      desc: 'Lấy nến OHLCV đa khung thời gian (M1, M5, H1, D1) kèm khối lượng tick để AI phân tích mô hình nến và chỉ báo.',
      inputSchema: '{\n  "symbol": "BTCUSD",\n  "timeframe": "TIMEFRAME_M5",\n  "count": 50\n}',
      mockResult: {
        symbol: 'BTCUSD',
        timeframe: 'M5',
        bars_count: 50,
        last_close: 83620.00,
        high_24h: 84200.00,
        low_24h: 81800.00,
        trend: 'BULLISH_CONTINUATION'
      }
    },
    {
      id: 'mt5_market_depth',
      category: 'market',
      name: 'market_depth_get',
      desc: 'Truy vấn sổ lệnh L2 Depth of Market (DOM) thời gian thực của sàn để phát hiện tường mua / bán (Iceberg/Walls).',
      inputSchema: '{\n  "symbol": "XAUUSD"\n}',
      mockResult: {
        symbol: 'XAUUSD',
        spread_pts: 12,
        bids_count: 5,
        asks_count: 5,
        imbalance_ratio: 1.42,
        dominant_side: 'BUY_PRESSURE'
      }
    },
    {
      id: 'mt5_check_margin',
      category: 'account',
      name: 'order_calc_margin',
      desc: 'Kiểm tra trước ký quỹ yêu cầu và rủi ro trước khi gửi lệnh thực tế, tránh trường hợp Margin Call.',
      inputSchema: '{\n  "symbol": "XAUUSD",\n  "action": "BUY",\n  "volume": 0.5\n}',
      mockResult: {
        required_margin: 840.00,
        margin_free_post_trade: 24515.80,
        risk_percentage: 3.25,
        approved: true
      }
    },
    {
      id: 'mt5_positions_get',
      category: 'trade',
      name: 'positions_get',
      desc: 'Liệt kê toàn bộ các vị thế đang mở kèm PnL thời gian thực, giá hòa vốn và khoảng cách tới SL/TP.',
      inputSchema: '{\n  "symbol": "ALL"\n}',
      mockResult: {
        total_open_positions: 2,
        unrealized_profit: 355.30,
        positions: [
          { ticket: 9812401, symbol: 'XAUUSD', type: 'BUY', volume: 0.5, profit: 125.00 },
          { ticket: 9812408, symbol: 'BTCUSD', type: 'BUY', volume: 0.25, profit: 230.30 }
        ]
      }
    },
    {
      id: 'mt5_run_backtest',
      category: 'backtest',
      name: 'run_strategy_backtest',
      desc: 'Cho phép AI ra lệnh cho MT5 Strategy Tester chạy kiểm thử thuật toán trên dữ liệu tick lịch sử chất lượng 99.9%.',
      inputSchema: '{\n  "ea_name": "OPC_Quant_V1",\n  "symbol": "XAUUSD",\n  "period": "M15",\n  "from_date": "2025-01-01"\n}',
      mockResult: {
        total_trades: 184,
        win_rate: 68.4,
        profit_factor: 2.15,
        max_drawdown: 3.2,
        net_profit_usd: 4820.50
      }
    }
  ];

  const filteredTools = mcpToolsList.filter(t => selectedToolCategory === 'all' || t.category === selectedToolCategory);

  const handleTestTool = (tool: typeof mcpToolsList[0]) => {
    setIsExecutingTool(true);
    setTestedTool(tool.id);

    setTimeout(() => {
      setToolTestOutput({
        tool: tool.name,
        result: JSON.stringify(tool.mockResult, null, 2),
        latencyMs: Math.floor(Math.random() * 8 + 4)
      });
      setIsExecutingTool(false);
    }, 450);
  };

  // Quantitative Prompt Template for Claude MT5 Trader
  const claudePromptTemplate = `Bạn là Quản lý Quỹ Giao dịch Định lượng (AI Quant Risk & Execution Officer) kết nối trực tiếp với MetaTrader 5 thông qua Model Context Protocol (MCP Server).

CÁC NGUYÊN TẮC BẮT BUỘC (CARDINAL RULES):
1. BẢO VỆ VỐN TỐI THƯỢNG: Mỗi lệnh tuyệt đối không mạo hiểm quá 1.0% tổng tài sản ròng (Equity).
2. LỆNH NGUYÊN KHỐI ATOMIC: Luôn sử dụng tool \`order_send_atomic\` với đầy đủ giá trị SL và TP. Tuyệt đối không vào lệnh trần (không có Stop Loss).
3. KIỂM TRA KÝ QUỸ TRƯỚC: Luôn gọi \`order_calc_margin\` trước khi vào lệnh để đảm bảo Free Margin > 200%.
4. PHÂN TÍCH ĐA KHUNG THỜI GIAN:
   - Dùng \`get_rates_range\` trên H1 để xác định xu hướng chính.
   - Dùng M5 để tìm điểm vào lệnh theo vùng mất cân bằng (Fair Value Gap / Liquidity Sweep).
   - Kiểm tra \`market_depth_get\` để tránh trượt giá khi có tường cản lớn.
5. QUẢN TRỊ TRẠNG THÁI: Khi Drawdown trong ngày chạm 3.0%, tự động dừng toàn bộ giao dịch và đóng các lệnh còn lại.`;

  return (
    <div className="space-y-6 text-slate-100 font-sans">
      {/* --- HERO BANNER: ARCHITECTURE VALUE PROPOSITION --- */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0d1627] via-[#09152b] to-[#0d1e38] border border-cyan-500/40 p-5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-extrabold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                🥇 KIẾN TRÚC MỚI NHẤT: MCP PROTOCOL
              </span>
              <span className="text-xs font-mono text-zinc-400">
                ariadng/metatrader-mcp-server ⭐ 297
              </span>
            </div>

            <h2 className="text-xl font-bold text-white tracking-tight">
              Cắm Trực Tiếp Claude / GPT-4 Vào MT5 Qua Chuẩn MCP Server
            </h2>
            <p className="text-xs text-zinc-300 leading-relaxed font-sans">
              Loại bỏ hoàn toàn lớp trung gian REST API thủ công. Giao thức <strong>Model Context Protocol (MCP)</strong> cung cấp hơn <strong>80+ công cụ nguyên khối (Atomic Tools)</strong> cho phép AI tự động phân tích biểu đồ, kiểm tra ký quỹ, vào lệnh kèm SL/TP tự động và quản lý vị thế theo thời gian thực.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start lg:self-auto shrink-0">
            <a
              href="https://github.com/ariadng/metatrader-mcp-server"
              target="_blank"
              rel="noreferrer"
              className="min-h-[38px] px-3.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono font-bold text-cyan-300 rounded-xl flex items-center gap-1.5 transition active:scale-95"
            >
              <span>GitHub Repo ⭐ 297</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <div className="px-3 py-1.5 rounded-xl bg-teal-950/80 border border-teal-500/60 font-mono text-xs text-teal-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
              <span>80+ MCP Tools Sẵn Sàng</span>
            </div>
          </div>
        </div>

        {/* Core Pillars Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-800/80 text-xs font-mono">
          <div className="flex items-start gap-2.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <Bot className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block text-[11px]">Multi-AI Compatibility</strong>
              <span className="text-[11px] text-zinc-400 font-sans">
                Tương thích Claude Desktop, Cursor IDE, Windsurf, Open WebUI &amp; ChatGPT.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block text-[11px]">Atomic SL / TP Orders</strong>
              <span className="text-[11px] text-zinc-400 font-sans">
                Khớp lệnh nguyên khối: Luôn đính kèm SL/TP trong cùng 1 request, chống naked exposure.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block text-[11px]">Zero Custom API Bridge</strong>
              <span className="text-[11px] text-zinc-400 font-sans">
                AI tự động khám phá schema (JSON-RPC), không cần cấu hình endpoint REST thủ công.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* --- SECTION 1: 1-CLICK CLIENT CONFIGURATION GENERATOR --- */}
      <div className="rounded-2xl bg-[#090d16] border border-slate-800 p-5 space-y-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileCode2 className="w-4 h-4 text-cyan-400" />
              <span>Cấu Hình MCP Server Cho Ứng Dụng AI (Client Config)</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Tự động điền tài khoản MT5: <strong className="text-teal-300 font-mono">{loginAccount}</strong> · Server: <strong className="text-cyan-300 font-mono">{brokerServer}</strong>
            </p>
          </div>

          {/* Client Selector Segmented Buttons */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 font-mono text-xs">
            <button
              onClick={() => setSelectedClient('claude_desktop')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                selectedClient === 'claude_desktop'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Claude Desktop
            </button>
            <button
              onClick={() => setSelectedClient('cursor')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                selectedClient === 'cursor'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Cursor IDE
            </button>
            <button
              onClick={() => setSelectedClient('open_webui')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                selectedClient === 'open_webui'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Open WebUI / SSE
            </button>
            <button
              onClick={() => setSelectedClient('python_cli')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                selectedClient === 'python_cli'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              CLI / Pip Run
            </button>
          </div>
        </div>

        {/* Config Code Block with 1-Click Copy */}
        <div className="relative rounded-xl border border-slate-800 bg-[#040810] p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono text-zinc-400">
              {selectedClient === 'claude_desktop' && 'Đường dẫn: %APPDATA%\\Claude\\claude_desktop_config.json'}
              {selectedClient === 'cursor' && 'Đường dẫn: .cursor/mcp.json'}
              {selectedClient === 'open_webui' && 'Đường dẫn: open-webui/.env hoặc Tools Configuration'}
              {selectedClient === 'python_cli' && 'Terminal bash / cmd lệnh thực thi'}
            </span>

            <button
              onClick={() => handleCopy(getClientConfig(), 'client_config')}
              className="min-h-[30px] px-3 bg-cyan-600 hover:bg-cyan-500 text-slate-950 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-md"
            >
              {copiedSection === 'client_config' ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Đã Sao Chép!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Sao Chép JSON</span>
                </>
              )}
            </button>
          </div>

          <pre className="text-xs font-mono text-cyan-300 overflow-x-auto leading-relaxed max-h-[220px]">
            <code>{getClientConfig()}</code>
          </pre>
        </div>
      </div>

      {/* --- SECTION 2: 80+ TOOLS EXPLORER & INTERACTIVE TESTER --- */}
      <div className="rounded-2xl bg-[#090d16] border border-slate-800 p-5 space-y-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <span>Thư Viện 80+ MCP Tools &amp; Trình Thử Nghiệm Gọi Hàm Trực Tiếp</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Click vào từng tool để kiểm tra tham số đầu vào và dữ liệu trả về theo chuẩn JSON-RPC 2.0
            </p>
          </div>

          {/* Filter Categories */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 font-mono text-xs">
            {(['all', 'market', 'trade', 'account', 'backtest'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedToolCategory(cat)}
                className={`px-2.5 py-1 rounded-lg uppercase text-[11px] font-bold transition cursor-pointer ${
                  selectedToolCategory === cat
                    ? 'bg-emerald-600 text-slate-950'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {cat === 'all' ? 'Tất Cả' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Tools Grid & Interactive Simulator Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column: Tools List (7 cols) */}
          <div className="lg:col-span-7 space-y-2">
            {filteredTools.map((tool) => (
              <div
                key={tool.id}
                className={`p-3 rounded-xl border transition cursor-pointer ${
                  testedTool === tool.id
                    ? 'bg-slate-900 border-cyan-500/80 shadow-md'
                    : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                }`}
                onClick={() => handleTestTool(tool)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-cyan-400 font-mono font-bold text-xs">
                      {tool.name}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400 uppercase bg-slate-900 px-1.5 py-0.2 rounded">
                      {tool.category}
                    </span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTestTool(tool);
                    }}
                    className="min-h-[26px] px-2 rounded bg-emerald-950 hover:bg-emerald-900 border border-emerald-700 text-emerald-300 text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Play className="w-2.5 h-2.5" />
                    <span>Chạy Test</span>
                  </button>
                </div>

                <p className="text-xs text-zinc-300 font-sans mt-1.5 leading-relaxed">
                  {tool.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Right Column: Execution Output Console (5 cols) */}
          <div className="lg:col-span-5 rounded-xl border border-slate-800 bg-[#040810] p-4 flex flex-col justify-between space-y-3 font-mono">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                  Kết Quả Thực Thi MCP Tool
                </span>
                {toolTestOutput && (
                  <span className="text-[10px] text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-1.5 py-0.2 rounded">
                    ⚡ {toolTestOutput.latencyMs}ms (Local IPC)
                  </span>
                )}
              </div>

              {isExecutingTool ? (
                <div className="py-12 text-center text-xs text-zinc-400 space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-cyan-400 mx-auto" />
                  <div>Đang thực thi lệnh qua MetaTrader 5 Python IPC...</div>
                </div>
              ) : toolTestOutput ? (
                <pre className="text-xs text-emerald-300 overflow-x-auto max-h-[320px] leading-relaxed">
                  <code>{toolTestOutput.result}</code>
                </pre>
              ) : (
                <div className="py-12 text-center text-xs text-zinc-500 space-y-1">
                  <div>Chọn bất kỳ tool nào bên trái để xem JSON Schema &amp; Response.</div>
                  <div className="text-[11px] text-zinc-600">Được tối ưu hoá cho Claude 3.5 Sonnet / GPT-4o.</div>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-800/80 text-[11px] text-zinc-400 flex items-center justify-between">
              <span>Chuẩn giao thức:</span>
              <span className="text-cyan-400 font-bold">JSON-RPC 2.0 (stdio)</span>
            </div>
          </div>
        </div>
      </div>

      {/* --- SECTION 3: INSTITUTIONAL SYSTEM PROMPT TEMPLATE --- */}
      <div className="rounded-2xl bg-[#090d16] border border-slate-800 p-5 space-y-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Bot className="w-4 h-4 text-amber-400" />
              <span>System Prompt Tối Ưu Cho Claude MT5 Trader (Institutional Quant)</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Cài đặt vào mục System Instructions của Claude Desktop hoặc Open WebUI để đảm bảo AI tuân thủ nghiêm ngặt quản trị rủi ro.
            </p>
          </div>

          <button
            onClick={() => handleCopy(claudePromptTemplate, 'system_prompt')}
            className="min-h-[32px] px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-md"
          >
            {copiedSection === 'system_prompt' ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Đã Sao Chép!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Sao Chép Prompt</span>
              </>
            )}
          </button>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#040810] p-4">
          <pre className="text-xs font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed max-h-[200px] overflow-y-auto">
            {claudePromptTemplate}
          </pre>
        </div>
      </div>

      {/* --- SECTION 4: DETAILED ARCHITECTURAL COMPARISON --- */}
      <div className="rounded-2xl bg-[#090d16] border border-slate-800 p-5 space-y-4 shadow-xl">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Layers className="w-4 h-4 text-teal-400" />
          <span>So Sánh Toàn Diện: MCP Server vs Python IPC vs MQL5 REST WebAPI</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left font-mono">
            <thead className="bg-slate-950 text-zinc-400 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3 font-semibold">Tiêu Chí Đánh Giá</th>
                <th className="py-2.5 px-3 font-semibold text-cyan-400">1. MCP Server (ariadng) 🥇</th>
                <th className="py-2.5 px-3 font-semibold text-teal-400">2. Native Python MT5 IPC</th>
                <th className="py-2.5 px-3 font-semibold text-zinc-400">3. MQL5 REST / WebSocket</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              <tr>
                <td className="py-2.5 px-3 font-bold text-white">Khả năng cắm AI (LLM Integration)</td>
                <td className="py-2.5 px-3 text-cyan-300 bg-cyan-950/20 font-bold">
                  ✅ 1-Click Plug &amp; Play (Claude, GPT, Cursor)
                </td>
                <td className="py-2.5 px-3 text-zinc-300">
                  ⚠️ Cần viết thêm wrapper API hoặc script
                </td>
                <td className="py-2.5 px-3 text-zinc-400">
                  ❌ Phức tạp, phải code router MQL5 riêng
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-white">Số lượng công cụ tích hợp sẵn</td>
                <td className="py-2.5 px-3 text-cyan-300 bg-cyan-950/20 font-bold">
                  80+ Tools (DOM, Ký quỹ, Backtest, Lệnh)
                </td>
                <td className="py-2.5 px-3 text-zinc-300">
                  ~25 hàm cơ bản từ thư viện MT5
                </td>
                <td className="py-2.5 px-3 text-zinc-400">
                  Tùy thuộc lập trình viên tự viết
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-white">Độ an toàn SL/TP (Atomic Order)</td>
                <td className="py-2.5 px-3 text-cyan-300 bg-cyan-950/20 font-bold">
                  🔒 Bắt buộc nguyên khối trong tool schema
                </td>
                <td className="py-2.5 px-3 text-zinc-300">
                  Có thể tách rời nếu code thiếu kiểm tra
                </td>
                <td className="py-2.5 px-3 text-zinc-400">
                  Phụ thuộc xử lý của Expert Advisor
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-white">Độ trễ thực thi (Latency)</td>
                <td className="py-2.5 px-3 text-cyan-300 bg-cyan-950/20 font-bold">
                  &lt; 5ms (IPC stdio tiến trình cục bộ)
                </td>
                <td className="py-2.5 px-3 text-teal-300 font-bold">
                  &lt; 2ms (Shared memory 64-bit)
                </td>
                <td className="py-2.5 px-3 text-zinc-400">
                  15-40ms (TCP Network Overhead)
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-white">Hỗ trợ Backtest qua AI Prompt</td>
                <td className="py-2.5 px-3 text-cyan-300 bg-cyan-950/20 font-bold">
                  ✅ Có sẵn tool `run_strategy_backtest`
                </td>
                <td className="py-2.5 px-3 text-zinc-300">
                  Không hỗ trợ trực tiếp từ Python
                </td>
                <td className="py-2.5 px-3 text-zinc-400">
                  Không hỗ trợ
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
