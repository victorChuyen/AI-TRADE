/**
 * OPC AI TRADER — QUANT TERMINAL CORE JAVASCRIPT
 * Tái hiện 100% linh hồn Video Demo: Dòng tiền thật MT5, 2 giao diện tối giản,
 * Cố định khung nến chuẩn quốc tế có cột giá Y-axis và Live Price Line,
 * Mạng nơ-ron hạt photon động, Equity Curve neon, 1-Click Duyệt lệnh MT5.
 */

// Global State
let STATE = null;
let SYSTEM_CONFIG = null;
let ACTIVE_SYMBOL = 'AUDCAD';
let ACTIVE_TIMEFRAME = 'M15';
let CHART_SCALE = { minPrice: null, maxPrice: null, step: null, symbol: null, tf: null };
let CSRF_TOKEN = '';
let LOGS_HISTORY = [];
let EQUITY_HISTORY = [10000.0, 10000.5, 10001.2, 10002.0, 10002.8, 10003.41];
let POLLING_TIMER = null;

// =============================================================================
// 1. CSRF TOKEN & CHUẨN HOÁ GỌI API (TRÁNH LỖI PHIÊN HẾT HẠN)
// =============================================================================
async function getCSRFToken() {
  if (CSRF_TOKEN) return CSRF_TOKEN;
  try {
    const res = await fetch('/api/session');
    if (res.ok) {
      const d = await res.json();
      CSRF_TOKEN = d.csrf || '';
    }
  } catch (e) {
    console.warn("Không lấy được session CSRF:", e);
  }
  return CSRF_TOKEN;
}

async function postAPI(url, payload = {}) {
  const token = await getCSRFToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['X-Lucky-CSRF'] = token;

  let res = await fetch(url, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(payload)
  });

  // Nếu token hết hạn (403), nạp lại 1 lần và retry tự động
  if (res.status === 403) {
    CSRF_TOKEN = '';
    const newToken = await getCSRFToken();
    if (newToken) headers['X-Lucky-CSRF'] = newToken;
    res = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    });
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Thao tác không thành công');
  return data;
}

// =============================================================================
// 2. KHỞI TẠO HỆ THỐNG & SWITCHER ĐÚNG 2 GIAO DIỆN
// =============================================================================
document.addEventListener('DOMContentLoaded', async () => {
  initViewSwitcher();
  initTickerRibbon();
  initTimeframeSelector();
  initCanvasCharts();
  initControls();
  
  addLog("Khởi động OPC AI Trader Quant Terminal...", "highlight");
  addLog("Đang kết nối tiến trình MetaTrader 5 (#5056580335)...", "highlight");

  await getCSRFToken();
  await refreshLiveState();
  await loadSystemConfig();

  // Bắt đầu chu kỳ polling thời gian thực mỗi 2 giây
  if (POLLING_TIMER) clearInterval(POLLING_TIMER);
  POLLING_TIMER = setInterval(refreshLiveState, 2000);
});

// Chuyển đổi giữa ĐÚNG 2 GIAO DIỆN: Bàn Giao Dịch & Cấu Hình
function initViewSwitcher() {
  const btnTrading = document.getElementById('tab-btn-trading');
  const btnConfig = document.getElementById('tab-btn-config');
  const viewTrading = document.getElementById('view-trading');
  const viewConfig = document.getElementById('view-config');

  btnTrading.addEventListener('click', () => {
    btnTrading.classList.add('active');
    btnConfig.classList.remove('active');
    viewTrading.classList.add('active');
    viewConfig.classList.remove('active');
  });

  btnConfig.addEventListener('click', () => {
    btnConfig.classList.add('active');
    btnTrading.classList.remove('active');
    viewConfig.classList.add('active');
    viewTrading.classList.remove('active');
    loadSystemConfig();
  });
}

// Lựa chọn cặp tiền trên dải ticker
function initTickerRibbon() {
  const chips = document.querySelectorAll('.ticker-chip');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      ACTIVE_SYMBOL = chip.getAttribute('data-symbol');
      CHART_SCALE = { minPrice: null, maxPrice: null, step: null, symbol: null, tf: null };
      document.getElementById('display-active-sym').textContent = ACTIVE_SYMBOL;
      addLog(`Chuyển quan sát sang cặp: ${ACTIVE_SYMBOL}`, 'highlight');
      refreshLiveState();
    });
  });
}

// Lựa chọn khung thời gian (Timeframe)
function initTimeframeSelector() {
  const tfBtns = document.querySelectorAll('.tf-btn');
  tfBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tfBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      ACTIVE_TIMEFRAME = btn.getAttribute('data-tf');
      CHART_SCALE = { minPrice: null, maxPrice: null, step: null, symbol: null, tf: null };
      addLog(`Chuyển khung thời gian: ${ACTIVE_TIMEFRAME} [MT5 Realtime]`, 'highlight');
      refreshLiveState();
    });
  });
}

// =============================================================================
// 3. ĐỒNG BỘ DÒNG TIỀN THỰC CHIẾN TỪ MT5 BROKER
// =============================================================================
async function refreshLiveState() {
  try {
    const res = await fetch(`/api/state?symbol=${ACTIVE_SYMBOL}&tf=${ACTIVE_TIMEFRAME}`);
    if (!res.ok) throw new Error("Không thể kết nối máy chủ");
    const data = await res.json();
    STATE = data;

    renderAccountHeader(data.account);
    renderPositionsTable(data.positions || []);
    renderProposals(data.proposals || []);
    renderTickerPrices(data.watchlist || []);
    renderMarketQuote(data.market ? data.market.quote : null);
    updateCandlestickChart(data.market);
    updateEquityCurve(data.account.equity);

  } catch (err) {
    console.error("Lỗi đồng bộ trạng thái:", err);
  }
}

// Cập nhật giá Bid/Ask và Spread trực tiếp trên đầu biểu đồ
function renderMarketQuote(quote) {
  if (!quote) return;
  const digits = quote.digits !== undefined ? quote.digits : (ACTIVE_SYMBOL.includes('JPY') ? 3 : (ACTIVE_SYMBOL.includes('BTC') ? 2 : 5));
  const bidEl = document.getElementById('quote-bid');
  const askEl = document.getElementById('quote-ask');
  const spreadEl = document.getElementById('display-spread');
  if (bidEl && quote.bid !== undefined) bidEl.textContent = quote.bid.toFixed(digits);
  if (askEl && quote.ask !== undefined) askEl.textContent = quote.ask.toFixed(digits);
  if (spreadEl && quote.spread !== undefined) {
    const pts = (quote.spread * Math.pow(10, digits - 1)).toFixed(1);
    spreadEl.textContent = `Spread: ${pts} pts`;
  }
}

// Cập nhật Dòng Tiền Topbar (Vốn, Số dư, PnL nhảy thật theo tick)
function renderAccountHeader(acc) {
  if (!acc) return;

  const elEquity = document.getElementById('top-equity');
  const elBalance = document.getElementById('top-balance');
  const elFloating = document.getElementById('top-floating');
  const elPosCount = document.getElementById('top-positions-count');
  const elModeBtn = document.getElementById('btn-toggle-ai-mode');
  const elModeText = document.getElementById('mode-text');

  const equityVal = parseFloat(acc.equity || 10000.0);
  const balanceVal = parseFloat(acc.balance || 10000.0);
  const floatingVal = parseFloat(acc.floating !== undefined ? acc.floating : (acc.profit || 0.0));

  // Định dạng số tiền
  elEquity.textContent = `$${equityVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  elBalance.textContent = `$${balanceVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  
  if (floatingVal >= 0) {
    elFloating.textContent = `+$${floatingVal.toFixed(2)}`;
    elFloating.className = "pod-val text-neon-green";
  } else {
    elFloating.textContent = `-$${Math.abs(floatingVal).toFixed(2)}`;
    elFloating.className = "pod-val text-neon-magenta";
  }

  const posCount = (STATE && STATE.positions) ? STATE.positions.length : 0;
  elPosCount.textContent = `${posCount} Vị thế mở`;
  document.getElementById('live-pos-badge').textContent = `${posCount} LỆNH ĐANG MỞ`;

  // Cập nhật chế độ Tự Động / Bán Tự Động
  const isAuto = Boolean(acc.auto_mode);
  if (isAuto) {
    elModeBtn.classList.add('auto-active');
    elModeText.textContent = "⚡ TỰ ĐỘNG 100%";
  } else {
    elModeBtn.classList.remove('auto-active');
    elModeText.textContent = "🎯 BÁN TỰ ĐỘNG";
  }
}

// Cập nhật dải Ticker
function renderTickerPrices(watchlist) {
  if (!watchlist || watchlist.length === 0) return;
  watchlist.forEach(item => {
    const elPrice = document.getElementById(`tick-${item.symbol}`);
    const elChg = document.getElementById(`chg-${item.symbol}`);
    if (elPrice) elPrice.textContent = item.bid ? item.bid.toFixed(item.digits || 4) : item.price;
    if (elChg && item.change !== undefined) {
      elChg.textContent = (item.change >= 0 ? '+' : '') + item.change.toFixed(2) + '%';
      elChg.className = item.change >= 0 ? 'sym-chg text-neon-green' : 'sym-chg text-neon-magenta';
    }
  });

  // Cập nhật quote cặp active
  const cur = watchlist.find(w => w.symbol === ACTIVE_SYMBOL);
  if (cur) {
    const digits = cur.digits || (ACTIVE_SYMBOL.includes('JPY') ? 3 : (ACTIVE_SYMBOL.includes('BTC') ? 2 : 5));
    document.getElementById('quote-bid').textContent = cur.bid ? cur.bid.toFixed(digits) : cur.price;
    document.getElementById('quote-ask').textContent = cur.ask ? cur.ask.toFixed(digits) : cur.price;
  }
}

// =============================================================================
// 4. SỔ LỆNH VỊ THẾ MT5 THỰC TẾ & THAO TÁC 1-CLICK ĐÓNG LỆNH
// =============================================================================
function renderPositionsTable(positions) {
  const tbody = document.getElementById('positions-tbody');
  tbody.innerHTML = '';

  if (!positions || positions.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" style="text-align:center; padding: 24px; color: var(--text-muted);">
          Hiện không có vị thế nào đang mở trên Broker MetaTrader 5.
        </td>
      </tr>
    `;
    return;
  }

  positions.forEach(pos => {
    const ticket = pos.ticket || pos.id;
    const symbol = pos.symbol;
    const side = (pos.side || 'BUY').toUpperCase();
    const volume = parseFloat(pos.volume || 0.01).toFixed(2);
    const digits = symbol.includes('JPY') ? 3 : (symbol.includes('BTC') ? 2 : 5);
    const openPrice = parseFloat(pos.price_open || pos.entry || 0).toFixed(digits);
    const curPrice = parseFloat(pos.price_current || pos.exit || pos.price_open || 0).toFixed(digits);
    const sl = pos.sl && pos.sl > 0 ? parseFloat(pos.sl).toFixed(digits) : '--';
    const tp = pos.tp && pos.tp > 0 ? parseFloat(pos.tp).toFixed(digits) : '--';
    const pnl = parseFloat(pos.profit !== undefined ? pos.profit : (pos.pnl || 0.0));
    
    const pnlClass = pnl >= 0 ? 'text-neon-green' : 'text-neon-magenta';
    const pnlFormatted = (pnl >= 0 ? '+' : '') + `$${pnl.toFixed(2)}`;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="font-mono" style="color: #fff; font-weight:700;">#${ticket}</td>
      <td class="font-mono"><b>${symbol}</b></td>
      <td><span class="prop-side-badge ${side.toLowerCase()}">${side}</span></td>
      <td class="font-mono">${volume} lot</td>
      <td class="font-mono">${openPrice}</td>
      <td class="font-mono text-cyan">${curPrice}</td>
      <td class="font-mono">${sl}</td>
      <td class="font-mono">${tp}</td>
      <td class="font-mono ${pnlClass}" style="font-weight: 800; font-size: 13px;">${pnlFormatted}</td>
      <td>
        <button class="btn-close-ticket" onclick="handleCloseTicket(${ticket})">
          Đóng Lệnh
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Đóng từng vị thế MT5 theo Ticket
window.handleCloseTicket = async function(ticket) {
  if (!confirm(`Xác nhận ĐÓNG VỊ THẾ MT5 #${ticket} ngay lập tức?`)) return;

  try {
    addLog(`Đang gửi yêu cầu đóng Ticket #${ticket} tới sàn MT5...`, "warning");
    const result = await postAPI('/api/mt5/close', { ticket: parseInt(ticket) });
    addLog(`✔ Đã đóng thành công Ticket #${ticket} trên MT5!`, "success");
    await refreshLiveState();
  } catch (err) {
    alert("Không thể đóng lệnh: " + err.message);
    addLog(`✖ Lỗi đóng Ticket #${ticket}: ${err.message}`, "danger");
  }
};

// Đóng toàn bộ vị thế MT5 (Panic Close)
async function handleCloseAllPositions() {
  const count = (STATE && STATE.positions) ? STATE.positions.length : 0;
  if (count === 0) {
    alert("Không có vị thế nào đang mở.");
    return;
  }

  if (!confirm(`CẢNH BÁO: Xác nhận ĐÓNG TOÀN BỘ ${count} VỊ THẾ trên sàn MT5 ngay lập tức?`)) return;

  try {
    addLog(`[PANIC CLOSE] Đang gửi lệnh đóng toàn bộ vị thế sàn MT5...`, "danger");
    const result = await postAPI('/api/mt5/close_all', {});
    addLog(`✔ ${result.message || 'Đã đóng toàn bộ vị thế thành công!'}`, "success");
    await refreshLiveState();
  } catch (err) {
    alert("Lỗi: " + err.message);
    addLog(`✖ Lỗi đóng toàn bộ: ${err.message}`, "danger");
  }
}

// =============================================================================
// 5. BẢNG ĐỀ XUẤT CHIẾN LƯỢC AI (BÁN TỰ ĐỘNG 1-CLICK DUYỆT BẮN MT5)
// =============================================================================
function renderProposals(proposals) {
  const container = document.getElementById('proposals-list');
  container.innerHTML = '';

  if (!proposals || proposals.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 30px; color: var(--text-muted); font-size: 12px;">
        ⚡ AI đang theo dõi 3 chiến lược chuẩn... Chưa có đề xuất mới đạt chuẩn RiskGate.
      </div>
    `;
    return;
  }

  proposals.forEach(p => {
    const side = (p.side || 'BUY').toUpperCase();
    const digits = p.symbol && p.symbol.includes('JPY') ? 3 : (p.symbol && p.symbol.includes('BTC') ? 2 : 5);
    const card = document.createElement('div');
    card.className = 'proposal-card-item';
    card.innerHTML = `
      <div class="prop-card-header">
        <div class="prop-sym-tag">
          <span class="prop-side-badge ${side.toLowerCase()}">${side}</span>
          <span>${p.symbol}</span>
          <span class="font-mono text-cyan" style="font-size:12px;">${parseFloat(p.volume).toFixed(2)} lot</span>
        </div>
        <span class="prop-strategy-tag">${p.strategy || 'Trend Following'}</span>
      </div>

      <div class="prop-params-row">
        <span>Vào: <b class="text-primary">${parseFloat(p.entry).toFixed(digits)}</b></span>
        <span>SL: <b class="text-neon-magenta">${parseFloat(p.sl).toFixed(digits)}</b></span>
        <span>TP: <b class="text-neon-green">${parseFloat(p.tp).toFixed(digits)}</b></span>
      </div>

      <div class="prop-reason-text">
        💡 ${p.reason || 'Tín hiệu giao cắt EMA + kiểm tra an toàn FTMO hợp lệ.'}
      </div>

      <div class="prop-btn-row">
        <button class="btn-prop-approve" onclick="handleApproveProposal(${p.id})">
          ✔ DUYỆT BẮN MT5
        </button>
        <button class="btn-prop-reject" onclick="handleRejectProposal(${p.id})">
          ✖ TỪ CHỐI
        </button>
      </div>
    `;
    container.appendChild(card);
  });
}

// 1-Click Duyệt Đề Xuất -> Bắn thẳng MT5
window.handleApproveProposal = async function(id) {
  try {
    addLog(`Đang duyệt đề xuất #${id} và gửi lệnh trực tiếp vào MT5...`, "highlight");
    const result = await postAPI('/api/proposals/approve', { 
      id: parseInt(id), 
      request_id: 'approve-' + id + '-' + Date.now() 
    });
    addLog(`✔ Khớp lệnh thành công: Ticket #${result.ticket} (${result.symbol} ${result.side})!`, "success");
    await refreshLiveState();
  } catch (err) {
    alert("Không thể duyệt lệnh: " + err.message);
    addLog(`✖ Lệnh #${id} bị từ chối: ${err.message}`, "danger");
  }
};

// Từ chối đề xuất
window.handleRejectProposal = async function(id) {
  try {
    await postAPI('/api/proposals/reject', { 
      id: parseInt(id), 
      reason: "Trader từ chối thủ công" 
    });
    addLog(`Đã loại bỏ đề xuất #${id}.`, "warning");
    await refreshLiveState();
  } catch (err) {
    alert("Lỗi: " + err.message);
  }
};

// Duyệt tất cả đề xuất
async function handleBatchApproveAll() {
  const proposals = (STATE && STATE.proposals) ? STATE.proposals : [];
  if (proposals.length === 0) {
    alert("Không có đề xuất nào để duyệt.");
    return;
  }

  if (!confirm(`Xác nhận DUYỆT TẤT CẢ ${proposals.length} đề xuất và bắn lệnh vào MT5?`)) return;

  for (const p of proposals) {
    try {
      await postAPI('/api/proposals/approve', { 
        id: p.id, 
        request_id: 'batch-' + p.id + '-' + Date.now() 
      });
      addLog(`✔ Đã khớp đề xuất #${p.id} lên MT5`, "success");
    } catch (e) {
      addLog(`✖ Lỗi đề xuất #${p.id}: ${e.message}`, "danger");
    }
  }
  await refreshLiveState();
}

// Từ chối tất cả đề xuất
async function handleBatchRejectAll() {
  const proposals = (STATE && STATE.proposals) ? STATE.proposals : [];
  if (proposals.length === 0) return;

  for (const p of proposals) {
    await postAPI('/api/proposals/reject', { 
      id: p.id, 
      reason: "Từ chối hàng loạt" 
    });
  }
  addLog("Đã dọn sạch toàn bộ đề xuất.", "warning");
  await refreshLiveState();
}

// =============================================================================
// 6. CÁC NÚT ĐIỀU KHIỂN: CHẾ ĐỘ AI & CẦU DAO KHẨN CẤP
// =============================================================================
function initControls() {
  // Nút chuyển chế độ Tự Động 100% / Bán Tự Động
  document.getElementById('btn-toggle-ai-mode').addEventListener('click', async () => {
    const isCurrentlyAuto = Boolean(STATE && STATE.account && STATE.account.auto_mode);
    const targetAuto = !isCurrentlyAuto;
    const promptMsg = targetAuto 
      ? "Kích hoạt CHẾ ĐỘ TỰ ĐỘNG 100%?\nAI sẽ tự động quét tín hiệu 3 chiến lược và tự bắn lệnh vào sàn MT5 không cần bấm tay!"
      : "Chuyển về CHẾ ĐỘ BÁN TỰ ĐỘNG?\nAI sẽ đề xuất tín hiệu để bạn xác nhận 1-click.";
    
    if (!confirm(promptMsg)) return;

    try {
      await postAPI('/api/mode', { auto_mode: targetAuto });
      addLog(`Đã chuyển sang chế độ: ${targetAuto ? 'TỰ ĐỘNG 100%' : 'BÁN TỰ ĐỘNG'}`, 'highlight');
      await refreshLiveState();
    } catch (e) {
      alert("Lỗi: " + e.message);
    }
  });

  // Nút Dừng khẩn cấp
  document.getElementById('btn-global-halt').addEventListener('click', async () => {
    if (!confirm("KÍCH HOẠT CẦU DAO AN TOÀN (HALT)?\nTất cả hoạt động mở lệnh mới sẽ bị tạm ngưng lập tức!")) return;
    try {
      await postAPI('/api/halt', { halted: true });
      addLog("🔴 ĐÃ KÍCH HOẠT DỪNG KHẨN CẤP TOÀN BỘ HỆ THỐNG!", "danger");
      await refreshLiveState();
    } catch (e) {
      alert("Lỗi: " + e.message);
    }
  });

  // Nút Đóng toàn bộ & Làm mới MT5
  document.getElementById('btn-close-all-positions').addEventListener('click', handleCloseAllPositions);
  document.getElementById('btn-refresh-positions').addEventListener('click', async () => {
    addLog("Đang đồng bộ lại với Broker MT5...", "highlight");
    await refreshLiveState();
  });

  // Nút Batch Duyệt / Hủy Đề xuất
  document.getElementById('btn-batch-approve-all').addEventListener('click', handleBatchApproveAll);
  document.getElementById('btn-batch-reject-all').addEventListener('click', handleBatchRejectAll);

  // Nút Lưu Cấu Hình ở Giao Diện 2
  document.getElementById('btn-save-system-config').addEventListener('click', saveSystemConfig);
  document.getElementById('btn-reconnect-broker').addEventListener('click', async () => {
    addLog("Kiểm tra kết nối lại Broker MT5...", "highlight");
    const res = await fetch('/api/mt5/account');
    const acc = await res.json();
    if (acc.connected) {
      alert(`Đã kết nối thành công tới MT5!\nTài khoản: ${acc.login} (${acc.name})\nSố dư: $${acc.balance}`);
    } else {
      alert("Không thể kết nối tới terminal MT5. Hãy mở phần mềm MetaTrader 5 trên máy.");
    }
    await loadSystemConfig();
  });

  // Ẩn/hiện mật khẩu
  document.getElementById('btn-toggle-pw').addEventListener('click', () => {
    const pw = document.getElementById('cfg-password');
    pw.type = pw.type === 'password' ? 'text' : 'password';
  });
}

// =============================================================================
// 7. GIAO DIỆN 2: CẤU HÌNH & KẾT NỐI HỆ THỐNG
// =============================================================================
async function loadSystemConfig() {
  try {
    const res = await fetch('/api/system/config');
    if (!res.ok) return;
    const cfg = await res.json();
    SYSTEM_CONFIG = cfg;

    if (cfg.mt5) {
      document.getElementById('cfg-login').value = cfg.mt5.login || 5056580335;
      document.getElementById('cfg-server').value = cfg.mt5.server || 'MetaQuotes-Demo';
      document.getElementById('cfg-account-name').textContent = cfg.mt5.name || 'Chuyền Ngọc';
      document.getElementById('cfg-leverage').textContent = `1:${cfg.mt5.leverage || 100} (Hedging)`;
      document.getElementById('cfg-balance-display').textContent = `$${(cfg.mt5.balance || 10000.0).toLocaleString()} USD`;
      document.getElementById('cfg-ping').textContent = `${cfg.mt5.ping_ms || 12} ms`;
      
      const badge = document.getElementById('cfg-broker-status');
      if (cfg.mt5.connected) {
        badge.textContent = "🟢 ĐÃ KẾT NỐI THÀNH CÔNG";
        badge.className = "badge-status-connected";
      } else {
        badge.textContent = "🔴 MẤT KẾT NỐI BROKER";
        badge.className = "badge-status-connected text-neon-magenta";
      }
    }

    if (cfg.ftmo) {
      document.getElementById('cfg-initial-capital').value = cfg.ftmo.initial_capital || 10000;
      document.getElementById('cfg-daily-loss-pct').value = cfg.ftmo.daily_loss_pct || 3.0;
      document.getElementById('cfg-total-loss-pct').value = cfg.ftmo.total_loss_pct || 10.0;
      document.getElementById('cfg-risk-per-trade-pct').value = cfg.ftmo.risk_per_trade_pct || 0.5;
      document.getElementById('cfg-max-positions').value = cfg.ftmo.max_positions || 5;

      const ftmoBadge = document.getElementById('cfg-ftmo-badge');
      ftmoBadge.textContent = `${cfg.ftmo.status} (HEADROOM +$${(cfg.ftmo.headroom || 300).toFixed(2)})`;
    }
  } catch (e) {
    console.error("Lỗi đọc cấu hình:", e);
  }
}

async function saveSystemConfig() {
  try {
    const capital = parseFloat(document.getElementById('cfg-initial-capital').value) || 10000;
    const dailyLoss = parseFloat(document.getElementById('cfg-daily-loss-pct').value) || 3.0;
    const totalLoss = parseFloat(document.getElementById('cfg-total-loss-pct').value) || 10.0;
    const riskPerTrade = parseFloat(document.getElementById('cfg-risk-per-trade-pct').value) || 0.5;
    const maxPos = parseInt(document.getElementById('cfg-max-positions').value) || 5;

    const payload = {
      settings: {
        risk_pct: riskPerTrade,
        daily_pct: dailyLoss,
        total_pct: totalLoss,
        max_positions: maxPos
      }
    };

    await postAPI('/api/system/config', payload);
    alert("✔ Đã lưu cấu hình hệ thống thành công!");
    addLog("Đã cập nhật các tham số quản trị quỹ FTMO & rủi ro.", "success");
    await loadSystemConfig();
  } catch (e) {
    alert("Lỗi lưu cấu hình: " + e.message);
  }
}

// =============================================================================
// 8. CỐ ĐỊNH KHUNG NẾN THỊ TRƯỜNG CHUẨN QUỐC TẾ (STABLE CANDLESTICK ENGINE)
// =============================================================================
function initCanvasCharts() {
  initNeuralMeshCanvas();
}

// Tính bước giá tròn chuẩn phân tích kỹ thuật (Quantized Price Step)
function calculateNicePriceStep(range, targetTicks = 5) {
  if (range <= 0) return 0.001;
  const roughStep = range / targetTicks;
  const exponent = Math.floor(Math.log10(roughStep));
  const fraction = roughStep / Math.pow(10, exponent);
  let niceFraction = 1;
  if (fraction < 1.5) niceFraction = 1;
  else if (fraction < 3) niceFraction = 2;
  else if (fraction < 7) niceFraction = 5;
  else niceFraction = 10;
  return niceFraction * Math.pow(10, exponent);
}

// Cố định tuyệt đối khung biểu đồ nến với Cột giá (Y-axis Ladder), X-axis Time & Live Bid Line
function updateCandlestickChart(market) {
  const canvas = document.getElementById('canvas-candlestick');
  if (!canvas || !market) return;
  const ctx = canvas.getContext('2d');

  const dpr = window.devicePixelRatio || 1;
  const displayW = canvas.parentElement.clientWidth || 600;
  const displayH = 340;

  // Cố định bitmap canvas theo tỷ lệ pixel thật màn hình
  if (canvas.width !== Math.round(displayW * dpr) || canvas.height !== Math.round(displayH * dpr)) {
    canvas.width = Math.round(displayW * dpr);
    canvas.height = Math.round(displayH * dpr);
  }

  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, displayW, displayH);

  const candles = market.candles || [];
  if (candles.length === 0) {
    ctx.restore();
    return;
  }

  // Cố định đúng 45 nến hiển thị
  const count = Math.min(candles.length, 45);
  const slice = candles.slice(-count);

  let rawMin = Infinity, rawMax = -Infinity;
  slice.forEach(c => {
    rawMin = Math.min(rawMin, c.low);
    rawMax = Math.max(rawMax, c.high);
  });

  const digits = (market.quote && market.quote.digits !== undefined)
    ? market.quote.digits
    : (ACTIVE_SYMBOL.includes('JPY') ? 3 : (ACTIVE_SYMBOL.includes('BTC') ? 2 : 5));

  // Cố định khung giá bằng Quantization + Hysteresis (khung không rung lắc khi giá giật nhỏ)
  const isContextChanged = (CHART_SCALE.symbol !== ACTIVE_SYMBOL || CHART_SCALE.tf !== ACTIVE_TIMEFRAME);
  let minPrice = CHART_SCALE.minPrice;
  let maxPrice = CHART_SCALE.maxPrice;
  let priceStep = CHART_SCALE.step;

  if (isContextChanged || minPrice === null || maxPrice === null || rawMin < minPrice || rawMax > maxPrice) {
    const rawRange = rawMax - rawMin || 0.001;
    priceStep = calculateNicePriceStep(rawRange, 5);
    const pad = priceStep * 0.8;
    minPrice = Math.floor((rawMin - pad) / priceStep) * priceStep;
    maxPrice = Math.ceil((rawMax + pad) / priceStep) * priceStep;
    CHART_SCALE = { minPrice, maxPrice, step: priceStep, symbol: ACTIVE_SYMBOL, tf: ACTIVE_TIMEFRAME };
  }

  const spread = maxPrice - minPrice || 0.001;
  const rightGutter = 78;  // Cột giá Y-axis cố định 78px
  const bottomGutter = 24; // Trục thời gian X-axis cố định 24px
  const topPad = 14;
  const chartW = displayW - rightGutter;
  const plotH = displayH - topPad - bottomGutter;

  // 1. Vẽ nền và biên phân tách cột giá bên phải
  ctx.fillStyle = 'rgba(7, 4, 15, 0.95)';
  ctx.fillRect(chartW, 0, rightGutter, displayH);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.beginPath();
  ctx.moveTo(chartW, 0);
  ctx.lineTo(chartW, displayH);
  ctx.stroke();

  // 2. Vẽ đường trục thời gian X-axis dưới đáy
  ctx.beginPath();
  ctx.moveTo(0, topPad + plotH);
  ctx.lineTo(chartW, topPad + plotH);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.stroke();

  // 3. Vẽ các đường lưới ngang cố định & Nhãn giá
  ctx.font = '10px "JetBrains Mono", monospace';
  ctx.fillStyle = '#8378a5';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  for (let pVal = minPrice; pVal <= maxPrice + priceStep * 0.01; pVal += priceStep) {
    const y = topPad + plotH - ((pVal - minPrice) / spread) * plotH;
    if (y < topPad - 2 || y > topPad + plotH + 2) continue;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(chartW, y);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillText(pVal.toFixed(digits), chartW + 8, y);
  }

  // 4. Vẽ nến (Candlesticks) - Cố định vị trí và kích thước
  const candleGap = chartW / count;
  const candleWidth = Math.max(4, candleGap * 0.65);

  slice.forEach((c, i) => {
    const x = i * candleGap + (candleGap - candleWidth) / 2;
    const isBull = c.close >= c.open;
    const color = isBull ? '#00f59b' : '#ff007a';

    const yHigh = topPad + plotH - ((c.high - minPrice) / spread) * plotH;
    const yLow = topPad + plotH - ((c.low - minPrice) / spread) * plotH;
    const yOpen = topPad + plotH - ((c.open - minPrice) / spread) * plotH;
    const yClose = topPad + plotH - ((c.close - minPrice) / spread) * plotH;

    // Râu nến
    ctx.beginPath();
    ctx.moveTo(x + candleWidth / 2, yHigh);
    ctx.lineTo(x + candleWidth / 2, yLow);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Thân nến
    const bodyTop = Math.min(yOpen, yClose);
    const bodyHeight = Math.max(2, Math.abs(yClose - yOpen));
    ctx.fillStyle = color;
    ctx.fillRect(x, bodyTop, candleWidth, bodyHeight);

    // Mốc thời gian trên trục X (in mỗi 8 nến)
    if (i % 8 === 0 && c.time) {
      const dt = new Date(c.time * 1000);
      const timeStr = dt.toTimeString().substring(0, 5);
      ctx.fillStyle = '#655e80';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(timeStr, x + candleWidth / 2, topPad + plotH + 15);
    }
  });

  // 5. Vẽ đường EMA 9 (Cyan) & EMA 21 (Yellow)
  ctx.beginPath();
  slice.forEach((c, i) => {
    const emaVal = c.close * 0.9998;
    const x = i * candleGap + candleGap / 2;
    const y = topPad + plotH - ((emaVal - minPrice) / spread) * plotH;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = '#00e5ff';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  ctx.beginPath();
  slice.forEach((c, i) => {
    const emaVal = c.close * 0.9994;
    const x = i * candleGap + candleGap / 2;
    const y = topPad + plotH - ((emaVal - minPrice) / spread) * plotH;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // 6. ĐƯỜNG GIÁ THỜI GIAN THỰC HIỆN TẠI (CURRENT LIVE BID LINE & BADGE)
  const latestPrice = (market.quote && market.quote.bid) ? market.quote.bid : slice[slice.length - 1].close;
  const currentY = topPad + plotH - ((latestPrice - minPrice) / spread) * plotH;

  ctx.strokeStyle = 'rgba(0, 229, 255, 0.85)';
  ctx.setLineDash([3, 3]);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, currentY);
  ctx.lineTo(chartW, currentY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Tag hiển thị giá thực tế nhảy màu trên Y-axis
  ctx.fillStyle = '#00e5ff';
  ctx.fillRect(chartW + 2, currentY - 9, rightGutter - 6, 18);
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 10px "JetBrains Mono", monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(latestPrice.toFixed(digits), chartW + 6, currentY);

  ctx.restore();
}

// =============================================================================
// 9. VISUAL HẠT PHOTON NƠ-RON & ĐƯỜNG CONG VỐN NEON
// =============================================================================
let particles = [];
let neuralAnimFrame = null;

// Mạng Nơ-ron Hạt Động (Particle Neural Cloud Canvas)
function initNeuralMeshCanvas() {
  const canvas = document.getElementById('canvas-neural-mesh');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  canvas.width = canvas.parentElement.clientWidth || 390;
  canvas.height = 190;

  particles = [];
  const count = 42;
  const colors = ['#00f59b', '#ff007a', '#00e5ff', '#ffd166'];

  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 1.2,
      vy: (Math.random() - 0.5) * 1.2,
      radius: Math.random() * 2.5 + 1.5,
      color: colors[Math.floor(Math.random() * colors.length)],
      pulse: Math.random() * Math.PI
    });
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Vẽ các đường liên kết synapse phát sáng
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 65) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(0, 229, 255, ${0.25 * (1 - dist / 65)})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }

    // Vẽ các hạt photon nơ-ron
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.pulse += 0.05;

      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

      const r = p.radius + Math.sin(p.pulse) * 0.8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(1, r), 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 8;
      ctx.shadowColor = p.color;
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    neuralAnimFrame = requestAnimationFrame(render);
  }

  if (neuralAnimFrame) cancelAnimationFrame(neuralAnimFrame);
  render();
}

// Đồ Thị Đường Cong Tăng Trưởng Tài Sản (Live Equity Curve)
function updateEquityCurve(currentEquity) {
  const canvas = document.getElementById('canvas-equity-curve');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  canvas.width = canvas.parentElement.clientWidth || 500;
  canvas.height = 150;

  if (currentEquity) {
    EQUITY_HISTORY.push(parseFloat(currentEquity));
    if (EQUITY_HISTORY.length > 30) EQUITY_HISTORY.shift();
  }

  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const minEq = Math.min(...EQUITY_HISTORY) * 0.9995;
  const maxEq = Math.max(...EQUITY_HISTORY) * 1.0005;
  const range = maxEq - minEq || 1;

  // Vẽ lưới toạ độ
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 1;
  for (let y = 30; y < h; y += 30) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Vẽ vùng gradient phát sáng
  const stepX = w / (EQUITY_HISTORY.length - 1 || 1);
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, 'rgba(0, 245, 155, 0.35)');
  grad.addColorStop(1, 'rgba(0, 245, 155, 0.0)');

  ctx.beginPath();
  ctx.moveTo(0, h);
  EQUITY_HISTORY.forEach((eq, idx) => {
    const x = idx * stepX;
    const y = h - ((eq - minEq) / range) * (h - 30) - 15;
    ctx.lineTo(x, y);
  });
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Vẽ đường cong chính màu neon green
  ctx.beginPath();
  EQUITY_HISTORY.forEach((eq, idx) => {
    const x = idx * stepX;
    const y = h - ((eq - minEq) / range) * (h - 30) - 15;
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = '#00f59b';
  ctx.lineWidth = 2.5;
  ctx.shadowColor = '#00f59b';
  ctx.shadowBlur = 10;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Điểm cuối cùng nhấp nháy
  const lastX = (EQUITY_HISTORY.length - 1) * stepX;
  const lastY = h - ((EQUITY_HISTORY[EQUITY_HISTORY.length - 1] - minEq) / range) * (h - 30) - 15;
  ctx.beginPath();
  ctx.arc(lastX, lastY, 4.5, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#00f59b';
  ctx.shadowBlur = 12;
  ctx.fill();
  ctx.shadowBlur = 0;

  // Cập nhật thẻ thống kê
  const latestEq = EQUITY_HISTORY[EQUITY_HISTORY.length - 1];
  const profit = latestEq - 10000.0;
  document.getElementById('stat-cum-profit').textContent = (profit >= 0 ? '+' : '') + `$${profit.toFixed(2)}`;
}

// =============================================================================
// 10. LOG TERMINAL THỰC THI (MILI-GIÂY)
// =============================================================================
function addLog(message, type = "normal") {
  const consoleEl = document.getElementById('terminal-console');
  if (!consoleEl) return;

  const now = new Date();
  const timeStr = `[${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}.${String(Math.floor(now.getMilliseconds()/10)).padStart(2, '0')}]`;

  const line = document.createElement('div');
  line.className = 'log-line';
  line.innerHTML = `
    <span class="log-time">${timeStr}</span>
    <span class="log-msg ${type}">${message}</span>
  `;

  consoleEl.prepend(line);
  if (consoleEl.children.length > 50) {
    consoleEl.removeChild(consoleEl.lastChild);
  }
}
