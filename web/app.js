/**
 * Lucky Trade AI — Frontend Controller & Chart Engine
 */

let CSRF_TOKEN = '';
let ACTIVE_SYMBOL = 'EURUSD';
let ACTIVE_SIDE = 'BUY';
let STATE = null;
let POLL_TIMER = null;
let SELECTED_PROPOSALS = new Set();

// Initialize App
async function init() {
  try {
    const sessionRes = await fetch('/api/session');
    const sessionData = await sessionRes.json();
    CSRF_TOKEN = sessionData.csrf;
    console.log("Lucky Session Initialized:", sessionData.version);

    setupEventListeners();
    await refreshState();

    // Start auto polling every 3s
    POLL_TIMER = setInterval(refreshState, 3000);
  } catch (err) {
    console.error("Failed to initialize session:", err);
  }
}

// Setup User Interactions
function setupEventListeners() {
  // Side Selector
  document.getElementById('side-buy').addEventListener('click', () => setOrderSide('BUY'));
  document.getElementById('side-sell').addEventListener('click', () => setOrderSide('SELL'));

  // Order Symbol Change
  document.getElementById('order-symbol').addEventListener('change', (e) => {
    setActiveSymbol(e.target.value);
  });

  // Advance Candle
  document.getElementById('btn-advance').addEventListener('click', handleAdvance);

  // Reconcile Positions
  const btnReconcile = document.getElementById('btn-reconcile');
  if (btnReconcile) btnReconcile.addEventListener('click', handleReconcile);

  // Toggle Halt Kill-switch
  document.getElementById('btn-halt').addEventListener('click', handleToggleHalt);

  // Toggle Auto/Semi-Auto Mode
  const btnMode = document.getElementById('btn-mode');
  if (btnMode) btnMode.addEventListener('click', handleToggleMode);

  // Preview & Submit Order
  document.getElementById('btn-preview-order').addEventListener('click', () => handleOrder(true));
  document.getElementById('btn-submit-order').addEventListener('click', () => handleOrder(false));

  // AI Analyst Review
  document.getElementById('btn-ai-review').addEventListener('click', handleAiReview);

  // Refresh Proposals
  document.getElementById('btn-refresh-proposals').addEventListener('click', refreshState);

  // Batch Proposals Actions
  const chkSelectAll = document.getElementById('chk-select-all-proposals');
  if (chkSelectAll) chkSelectAll.addEventListener('change', handleSelectAllProposals);

  const btnBatchApprove = document.getElementById('btn-batch-approve');
  if (btnBatchApprove) btnBatchApprove.addEventListener('click', handleBatchApprove);

  const btnBatchReject = document.getElementById('btn-batch-reject');
  if (btnBatchReject) btnBatchReject.addEventListener('click', handleBatchReject);

  // Modals & Neural Actions
  const btnBrain = document.getElementById('btn-open-brain-modal');
  if (btnBrain) btnBrain.addEventListener('click', openBrainModal);
  const btnCloseBrain = document.getElementById('btn-close-brain-modal');
  if (btnCloseBrain) btnCloseBrain.addEventListener('click', closeBrainModal);

  const btnFtmo = document.getElementById('btn-open-ftmo-modal');
  if (btnFtmo) btnFtmo.addEventListener('click', openFtmoModal);
  const btnCloseFtmo = document.getElementById('btn-close-ftmo-modal');
  if (btnCloseFtmo) btnCloseFtmo.addEventListener('click', closeFtmoModal);

  // MT5 Modal & Sync
  const cardMt5 = document.getElementById('card-mt5');
  if (cardMt5) cardMt5.addEventListener('click', openMt5Modal);
  const btnCloseMt5 = document.getElementById('btn-close-mt5-modal');
  if (btnCloseMt5) btnCloseMt5.addEventListener('click', closeMt5Modal);
  const btnSyncMt5 = document.getElementById('btn-sync-mt5');
  if (btnSyncMt5) btnSyncMt5.addEventListener('click', () => syncMt5Status(true));

  // Beginner Guide Modal
  const btnGuide = document.getElementById('btn-open-guide-modal');
  if (btnGuide) btnGuide.addEventListener('click', openGuideModal);
  const btnCloseGuide = document.getElementById('btn-close-guide-modal');
  if (btnCloseGuide) btnCloseGuide.addEventListener('click', closeGuideModal);

  const btnSaveAi = document.getElementById('btn-save-ai-cfg');
  if (btnSaveAi) btnSaveAi.addEventListener('click', handleSaveAiConfig);

  // Mobile Sidebar Drawer Controls
  const btnToggleSidebar = document.getElementById('btn-menu-toggle');
  const btnCloseSidebar = document.getElementById('btn-close-sidebar');
  const sidebar = document.getElementById('app-sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');

  const closeSidebar = () => {
    if (sidebar) sidebar.classList.remove('open');
    if (backdrop) backdrop.classList.remove('active');
  };

  if (btnToggleSidebar && sidebar && backdrop) {
    btnToggleSidebar.addEventListener('click', () => {
      sidebar.classList.add('open');
      backdrop.classList.add('active');
    });
  }
  if (btnCloseSidebar) btnCloseSidebar.addEventListener('click', closeSidebar);
  if (backdrop) backdrop.addEventListener('click', closeSidebar);

  // Sidebar Nav Items Click (Smooth Scroll)
  document.querySelectorAll('.sidebar-nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      document.querySelectorAll('.sidebar-nav-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      const targetId = item.getAttribute('data-target');
      if (targetId) {
        const el = document.getElementById(targetId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
      if (window.innerWidth <= 1024) closeSidebar();
    });
  });

  // Quick Lot Chips in Order Form
  document.querySelectorAll('.btn-lot-chip').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.btn-lot-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const lot = btn.getAttribute('data-lot');
      const volInput = document.getElementById('order-volume');
      if (volInput && lot) {
        volInput.value = lot;
        updateOrderPreviewCalculations();
      }
    });
  });

  // Mobile Tabs Bar & Bottom Dock Navigation
  const handleTabSwitch = (tabKey) => {
    document.querySelectorAll('.mobile-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabKey);
    });
    document.querySelectorAll('.dock-item[data-tab]').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabKey);
    });

    const mapping = {
      'tab-chart': 'card-chart',
      'tab-positions': 'card-positions',
      'tab-proposals': 'card-proposals',
      'tab-risk': 'card-risk'
    };
    const targetId = mapping[tabKey];
    if (targetId) {
      const el = document.getElementById(targetId);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  document.querySelectorAll('.mobile-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => handleTabSwitch(btn.getAttribute('data-tab')));
  });
  document.querySelectorAll('.dock-item[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => handleTabSwitch(btn.getAttribute('data-tab')));
  });

  const btnDockGuide = document.getElementById('btn-dock-guide');
  if (btnDockGuide) btnDockGuide.addEventListener('click', openGuideModal);
  const btnSidebarGuide = document.getElementById('sidebar-btn-guide');
  if (btnSidebarGuide) btnSidebarGuide.addEventListener('click', openGuideModal);
  const btnDockMt5 = document.getElementById('btn-dock-mt5');
  if (btnDockMt5) btnDockMt5.addEventListener('click', openMt5Modal);

  // Responsive Chart & Neural Auto-Resize
  window.addEventListener('resize', () => {
    if (STATE) renderChart();
    resizeNeuralCanvas();
  });

  // Auto-fill SL/TP based on entry when volume changes or on input
  document.getElementById('order-volume').addEventListener('input', updateOrderPreviewCalculations);
  document.getElementById('order-sl').addEventListener('input', updateOrderPreviewCalculations);

  initNeuralMesh();
  syncMt5Status(false);
}

function setOrderSide(side) {
  ACTIVE_SIDE = side;
  document.getElementById('side-buy').classList.toggle('active', side === 'BUY');
  document.getElementById('side-sell').classList.toggle('active', side === 'SELL');
  updateDefaultSlTp();
  updateOrderPreviewCalculations();
}

function setActiveSymbol(symbol) {
  ACTIVE_SYMBOL = symbol;
  document.getElementById('order-symbol').value = symbol;
  document.getElementById('chart-symbol').textContent = symbol;
  refreshState();
}

// Fetch Full Engine State
async function refreshState() {
  try {
    const res = await fetch(`/api/state?symbol=${ACTIVE_SYMBOL}`);
    if (!res.ok) return;
    STATE = await res.json();
    renderAll();
  } catch (err) {
    console.error("Error refreshing state:", err);
  }
}

// Render Components
function renderAll() {
  if (!STATE) return;

  renderTopMetrics();
  renderWatchlist();
  renderChart();
  renderPositions();
  renderProposals();
  renderRiskDesk();
  renderLogs();
}

// 1. Top Metrics
function renderTopMetrics() {
  const acc = STATE.account;
  document.getElementById('metric-equity').textContent = formatMoney(acc.equity);
  document.getElementById('metric-balance').textContent = formatMoney(acc.balance);
  
  const dailyEl = document.getElementById('metric-daily-pnl');
  dailyEl.textContent = formatMoney(acc.daily_pnl);
  dailyEl.className = 'metric-val ' + (acc.daily_pnl >= 0 ? 'text-green' : 'text-red');

  document.getElementById('metric-open-risk').textContent = formatMoney(acc.open_risk);
  document.getElementById('badge-step').textContent = '#' + acc.step;
  document.getElementById('order-step-tag').textContent = 'Step #' + acc.step;

  // Halt Button State
  const haltBtn = document.getElementById('btn-halt');
  if (acc.halted) {
    haltBtn.textContent = '🟢 MỞ KHÓA (RESUME)';
    haltBtn.className = 'btn btn-halt active';
  } else {
    haltBtn.textContent = '🔴 TẠM DỪNG';
    haltBtn.className = 'btn btn-halt';
  }

  // Auto / Semi-Auto Mode Button State
  const isAuto = !!acc.auto_mode;
  const btnMode = document.getElementById('btn-mode');
  const modeText = document.getElementById('mode-text');
  if (btnMode && modeText) {
    if (isAuto) {
      btnMode.className = 'btn btn-mode mode-auto';
      modeText.textContent = '⚡ TỰ ĐỘNG (AI AUTO ON)';
    } else {
      btnMode.className = 'btn btn-mode';
      modeText.textContent = 'BÁN TỰ ĐỘNG';
    }
  }
}

// 2. Watchlist Bar
function renderWatchlist() {
  const container = document.getElementById('watchlist-bar');
  if (!STATE.watchlist) return;

  container.innerHTML = STATE.watchlist.map(item => {
    const isAct = item.symbol === ACTIVE_SYMBOL;
    const chgClass = item.change >= 0 ? 'text-green' : 'text-red';
    const chgSign = item.change >= 0 ? '+' : '';
    return `
      <div class="ticker-item ${isAct ? 'active' : ''}" onclick="setActiveSymbol('${item.symbol}')">
        <div class="ticker-top">
          <span>${item.symbol}</span>
          <span class="ticker-chg ${chgClass}">${chgSign}${item.change.toFixed(2)}%</span>
        </div>
        <div class="ticker-prices">
          <span>${item.bid.toFixed(item.digits)}</span>
          <span>${item.ask.toFixed(item.digits)}</span>
        </div>
      </div>
    `;
  }).join('');
}

// 3. Chart Rendering (Canvas)
function renderChart() {
  const market = STATE.market;
  if (!market || !market.candles) return;

  const quote = market.quote;
  document.getElementById('chart-bid').textContent = quote.bid.toFixed(quote.digits);
  document.getElementById('chart-ask').textContent = quote.ask.toFixed(quote.digits);
  document.getElementById('chart-spread').textContent = `Spread: ${quote.spread.toFixed(quote.digits)} pts`;

  const canvas = document.getElementById('price-chart');
  const ctx = canvas.getContext('2d');
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;

  const candles = market.candles.slice(-45);
  if (candles.length === 0) return;

  // Calculate indicators (SMA9, SMA21, ATR)
  const closes = candles.map(c => c.close);
  const sma9Val = calculateSMA(closes, 9);
  const sma21Val = calculateSMA(closes, 21);
  const atrVal = calculateATR(candles, 14);

  document.getElementById('val-sma9').textContent = sma9Val ? sma9Val.toFixed(quote.digits) : '---';
  document.getElementById('val-sma21').textContent = sma21Val ? sma21Val.toFixed(quote.digits) : '---';
  document.getElementById('val-atr14').textContent = atrVal ? atrVal.toFixed(quote.digits) : '---';

  // Find min/max for scale
  let minPrice = Infinity;
  let maxPrice = -Infinity;
  candles.forEach(c => {
    if (c.low < minPrice) minPrice = c.low;
    if (c.high > maxPrice) maxPrice = c.high;
  });

  const padding = (maxPrice - minPrice) * 0.1 || 0.001;
  minPrice -= padding;
  maxPrice += padding;

  const w = canvas.width;
  const h = canvas.height;
  const candleW = Math.max(3, (w - 60) / candles.length - 2);

  ctx.clearRect(0, 0, w, h);

  // Draw grid lines
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;
  for (let i = 1; i <= 4; i++) {
    const y = (h / 5) * i;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();

    const p = maxPrice - (i / 5) * (maxPrice - minPrice);
    ctx.fillStyle = '#64748b';
    ctx.font = '10px JetBrains Mono';
    ctx.fillText(p.toFixed(quote.digits), w - 55, y - 4);
  }

  // Draw Candlesticks
  candles.forEach((c, i) => {
    const x = i * (candleW + 2) + 10;
    const isUp = c.close >= c.open;
    const color = isUp ? '#10b981' : '#ef4444';

    const yHigh = h - ((c.high - minPrice) / (maxPrice - minPrice)) * h;
    const yLow = h - ((c.low - minPrice) / (maxPrice - minPrice)) * h;
    const yOpen = h - ((c.open - minPrice) / (maxPrice - minPrice)) * h;
    const yClose = h - ((c.close - minPrice) / (maxPrice - minPrice)) * h;

    // Wick
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x + candleW / 2, yHigh);
    ctx.lineTo(x + candleW / 2, yLow);
    ctx.stroke();

    // Body
    ctx.fillStyle = color;
    const bodyTop = Math.min(yOpen, yClose);
    const bodyHeight = Math.max(2, Math.abs(yClose - yOpen));
    ctx.fillRect(x, bodyTop, candleW, bodyHeight);
  });

  // Current price line
  const currentPriceY = h - ((quote.bid - minPrice) / (maxPrice - minPrice)) * h;
  ctx.strokeStyle = '#06b6d4';
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(0, currentPriceY);
  ctx.lineTo(w, currentPriceY);
  ctx.stroke();
  ctx.setLineDash([]);
}

// 4. Active Positions Table
function renderPositions() {
  const tbody = document.getElementById('positions-body');
  const countEl = document.getElementById('open-positions-count');
  const pnlBadge = document.getElementById('open-pnl-badge');

  const positions = STATE.positions || [];
  if (countEl) countEl.textContent = positions.length;

  const sidePosCount = document.getElementById('sidebar-positions-count');
  if (sidePosCount) sidePosCount.textContent = positions.length;
  const mobPosBadge = document.getElementById('mobile-pos-badge');
  if (mobPosBadge) mobPosBadge.textContent = positions.length;
  const dockPosCount = document.getElementById('dock-pos-count');
  if (dockPosCount) dockPosCount.textContent = positions.length;

  let totalFloating = 0;
  positions.forEach(p => {
    const val = (p.floating !== undefined) ? p.floating : (p.profit !== undefined ? p.profit : (p.pnl || 0));
    totalFloating += val;
  });
  pnlBadge.textContent = `P/L: ${formatMoney(totalFloating)}`;
  pnlBadge.className = 'badge ' + (totalFloating >= 0 ? 'badge-green' : 'badge-red');

  if (positions.length === 0) {
    tbody.innerHTML = '<tr><td colspan="11" class="text-center text-muted">Chưa có vị thế mở.</td></tr>';
    return;
  }

  tbody.innerHTML = positions.map(p => {
    const pId = p.ticket || p.id;
    const profit = (p.floating !== undefined) ? p.floating : (p.profit !== undefined ? p.profit : (p.pnl || 0));
    const entryVal = (p.entry !== undefined) ? p.entry : (p.price_open || 0);
    const markVal = (p.mark !== undefined) ? p.mark : (p.price_current || entryVal);
    const riskVal = (p.risk !== undefined) ? formatMoney(p.risk) : '--';
    const slVal = p.sl ? Number(p.sl).toFixed(5) : '0.00000';
    const tpVal = p.tp ? Number(p.tp).toFixed(5) : '0.00000';

    return `
    <tr>
      <td><b>#${pId}</b></td>
      <td><b>${p.symbol}</b></td>
      <td><span class="${p.side === 'BUY' ? 'text-green' : 'text-red'} font-bold">${p.side}</span></td>
      <td>${Number(p.volume).toFixed(2)}</td>
      <td>${Number(entryVal).toFixed(5)}</td>
      <td>${Number(markVal).toFixed(5)}</td>
      <td class="${profit >= 0 ? 'text-green' : 'text-red'} font-bold">${formatMoney(profit)}</td>
      <td>${slVal}</td>
      <td>${tpVal}</td>
      <td class="text-amber">${riskVal}</td>
      <td>
        <button class="btn btn-sm btn-reject" onclick="handleClosePosition(${pId})">Đóng</button>
      </td>
    </tr>
  `}).join('');
}

// 5. Trade Proposals Desk
function renderProposals() {
  const container = document.getElementById('proposals-list');
  const countEl = document.getElementById('proposals-count');
  const batchBar = document.getElementById('proposals-batch-bar');
  const proposals = STATE.proposals || [];

  if (countEl) countEl.textContent = proposals.length;
  const sidePropCount = document.getElementById('sidebar-proposals-count');
  if (sidePropCount) sidePropCount.textContent = proposals.length;
  const mobPropBadge = document.getElementById('mobile-prop-badge');
  if (mobPropBadge) mobPropBadge.textContent = proposals.length;
  const dockPropCount = document.getElementById('dock-prop-count');
  if (dockPropCount) dockPropCount.textContent = proposals.length;

  if (proposals.length === 0) {
    SELECTED_PROPOSALS.clear();
    if (batchBar) batchBar.style.display = 'none';
    container.innerHTML = '<div class="empty-state">Không có đề xuất mới. Bấm "⏩ NẾN TIẾP" để các chiến lược tự động phân tích bước nến mới.</div>';
    return;
  }

  if (batchBar) batchBar.style.display = 'flex';

  // Prune expired or removed proposals
  const currentIds = new Set(proposals.map(p => p.id));
  for (const id of SELECTED_PROPOSALS) {
    if (!currentIds.has(id)) SELECTED_PROPOSALS.delete(id);
  }

  updateBatchBarUI(proposals.length);

  container.innerHTML = proposals.map(prop => {
    const expText = prop.expires_at ? new Date(prop.expires_at).toLocaleTimeString() : '';
    const isChecked = SELECTED_PROPOSALS.has(prop.id);
    return `
    <div class="proposal-item ${isChecked ? 'selected' : ''}" id="prop-item-${prop.id}">
      <div class="proposal-header">
        <div class="d-flex align-center gap-2">
          <input type="checkbox" class="custom-chk proposal-chk" data-id="${prop.id}" ${isChecked ? 'checked' : ''} onchange="handleToggleProposalCheck(${prop.id}, event)">
          <span class="proposal-strat">📈 ${prop.strategy}</span>
        </div>
        <span class="badge ${prop.side === 'BUY' ? 'badge-green' : 'badge-red'}">${prop.side} ${prop.symbol}</span>
      </div>
      <div class="proposal-details">
        <span>Vào: <b>${prop.entry}</b></span>
        <span>SL: <b class="text-red">${prop.sl}</b></span>
        <span>TP: <b class="text-green">${prop.tp}</b></span>
        <span>Lot: <b>${prop.volume}</b></span>
      </div>
      <div class="proposal-reason">${prop.reason} ${expText ? `<br><small class="text-muted">Hết hạn: ${expText}</small>` : ''}</div>
      <div class="proposal-actions">
        <button class="btn btn-sm btn-approve" onclick="handleApproveProposal(${prop.id})">✔ DUYỆT LỆNH</button>
        <button class="btn btn-sm btn-reject" onclick="handleRejectProposal(${prop.id})">✖ TỪ CHỐI</button>
      </div>
    </div>
  `;
  }).join('');
}

// 6. Risk Desk
function renderRiskDesk() {
  const acc = STATE.account;
  const positions = STATE.positions || [];

  // Drawdown
  const ddPct = acc.day_equity > 0 ? Math.max(0, ((acc.day_equity - acc.equity) / acc.day_equity) * 100) : 0;
  const ddFill = document.getElementById('risk-drawdown-bar');
  ddFill.style.width = Math.min(100, (ddPct / 2.0) * 100) + '%';
  ddFill.style.backgroundColor = ddPct >= 1.5 ? '#ef4444' : '#10b981';
  document.getElementById('risk-drawdown-val').textContent = `${ddPct.toFixed(2)}% / 2.00%`;

  // Risk per trade
  const riskAmount = (acc.equity * (acc.risk_pct / 100.0)).toFixed(2);
  document.getElementById('risk-per-trade-val').textContent = `$${riskAmount} (${acc.risk_pct}%)`;

  // Open Positions
  document.getElementById('risk-positions-stat').textContent = `${positions.length} / ${acc.max_positions} vị thế`;
}

// 7. Event Logs
function renderLogs() {
  const container = document.getElementById('terminal-log');
  const events = STATE.events || [];

  container.innerHTML = events.slice(0, 50).map(e => `
    <div class="log-entry">
      <span class="log-time">${new Date(e.time).toLocaleTimeString()}</span>
      <span class="log-kind text-${getLogColor(e.kind)}">[${e.kind.toUpperCase()}]</span>
      <span class="log-msg">${e.message}</span>
    </div>
  `).join('');
}

function getLogColor(kind) {
  if (kind === 'order' || kind === 'proposal_approved') return 'green';
  if (kind === 'close') return 'cyan';
  if (kind === 'blocked' || kind === 'proposal_rejected') return 'red';
  if (kind === 'proposal') return 'amber';
  return 'dim';
}

// --- Action Handlers ---

// Advance Step
async function handleAdvance() {
  if (!STATE) return;
  try {
    const res = await postAPI('/api/advance', { step: STATE.account.step });
    if (res.ok) await refreshState();
  } catch (err) {
    alert("Lỗi chuyển nến: " + err.message);
  }
}

// Toggle Halt
async function handleToggleHalt() {
  if (!STATE) return;
  try {
    const nextHalt = !STATE.account.halted;
    await postAPI('/api/halt', { halted: nextHalt });
    await refreshState();
  } catch (err) {
    alert("Lỗi tạm dừng: " + err.message);
  }
}

// Toggle Auto / Semi-Auto Mode
async function handleToggleMode() {
  if (!STATE) return;
  const currentAuto = !!STATE.account.auto_mode;
  const targetAuto = !currentAuto;
  const promptMsg = targetAuto 
    ? "KÍCH HOẠT CHẾ ĐỘ TỰ ĐỘNG HOÀN TOÀN?\n\nMọi cơ hội giao dịch sinh ra từ 3 chiến lược vượt qua RiskGate sẽ được hệ thống TỰ ĐỘNG KHỚP LỆNH NGAY LẬP TỨC mà không cần bấm duyệt."
    : "CHUYỂN VỀ CHẾ ĐỘ BÁN TỰ ĐỘNG?\n\nHệ thống sẽ hiển thị đề xuất tại Bàn Duyệt Lệnh để bạn kiểm tra trước khi gửi tới sàn.";

  if (!confirm(promptMsg)) return;

  try {
    await postAPI('/api/mode', { auto_mode: targetAuto });
    await refreshState();
  } catch (err) {
    alert("Lỗi chuyển đổi chế độ: " + err.message);
  }
}

// Approve Proposal
async function handleApproveProposal(id) {
  try {
    const res = await postAPI('/api/proposals/approve', { 
      id: id, 
      request_id: 'approve-' + id + '-' + Date.now() 
    });
    await refreshState();
  } catch (err) {
    alert("Lỗi duyệt đề xuất: " + err.message);
  }
}

// Reject Proposal
async function handleRejectProposal(id) {
  try {
    await postAPI('/api/proposals/reject', { id: id, reason: "Từ chối trực tiếp trên Dashboard" });
    await refreshState();
  } catch (err) {
    alert("Lỗi từ chối đề xuất: " + err.message);
  }
}

// Batch Proposal Handlers
function updateBatchBarUI(totalCount) {
  const chkAll = document.getElementById('chk-select-all-proposals');
  const badgeCount = document.getElementById('batch-selected-count');
  const btnApprove = document.getElementById('btn-batch-approve');
  const btnReject = document.getElementById('btn-batch-reject');
  const selCount = SELECTED_PROPOSALS.size;

  if (badgeCount) badgeCount.textContent = `${selCount}/${totalCount}`;

  if (chkAll) {
    chkAll.checked = selCount > 0 && selCount === totalCount;
    chkAll.indeterminate = selCount > 0 && selCount < totalCount;
  }

  if (btnApprove) {
    if (selCount > 0) {
      btnApprove.textContent = `✔ DUYỆT ĐÃ CHỌN (${selCount})`;
    } else {
      btnApprove.textContent = `✔ DUYỆT TẤT CẢ (${totalCount})`;
    }
  }

  if (btnReject) {
    if (selCount > 0) {
      btnReject.textContent = `✖ HỦY ĐÃ CHỌN (${selCount})`;
    } else {
      btnReject.textContent = `✖ HỦY TẤT CẢ (${totalCount})`;
    }
  }
}

function handleToggleProposalCheck(id, ev) {
  if (ev.target.checked) {
    SELECTED_PROPOSALS.add(id);
    document.getElementById(`prop-item-${id}`)?.classList.add('selected');
  } else {
    SELECTED_PROPOSALS.delete(id);
    document.getElementById(`prop-item-${id}`)?.classList.remove('selected');
  }
  const total = (STATE && STATE.proposals) ? STATE.proposals.length : 0;
  updateBatchBarUI(total);
}

function handleSelectAllProposals(ev) {
  const proposals = (STATE && STATE.proposals) ? STATE.proposals : [];
  if (ev.target.checked) {
    proposals.forEach(p => SELECTED_PROPOSALS.add(p.id));
  } else {
    SELECTED_PROPOSALS.clear();
  }
  renderProposals();
}

async function handleBatchApprove() {
  const proposals = (STATE && STATE.proposals) ? STATE.proposals : [];
  if (proposals.length === 0) {
    alert("Không có đề xuất nào để duyệt.");
    return;
  }

  const targetIds = SELECTED_PROPOSALS.size > 0 
    ? Array.from(SELECTED_PROPOSALS) 
    : proposals.map(p => p.id);

  const confirmMsg = `Xác nhận DUYỆT ${targetIds.length} đề xuất giao dịch qua cổng RiskGate?`;
  if (!confirm(confirmMsg)) return;

  let successCount = 0;
  let failedCount = 0;
  const failedReasons = [];

  for (const id of targetIds) {
    try {
      await postAPI('/api/proposals/approve', {
        id: id,
        request_id: 'batch-' + id + '-' + Date.now()
      });
      successCount++;
      SELECTED_PROPOSALS.delete(id);
    } catch (err) {
      failedCount++;
      failedReasons.push(`#${id}: ${err.message}`);
    }
  }

  await refreshState();

  let msg = `✔ Đã duyệt và mở thành công ${successCount}/${targetIds.length} vị thế!`;
  if (failedCount > 0) {
    msg += `\n\n⚠️ ${failedCount} đề xuất bị từ chối:\n` + failedReasons.slice(0, 3).join('\n');
  }
  alert(msg);
}

async function handleBatchReject() {
  const proposals = (STATE && STATE.proposals) ? STATE.proposals : [];
  if (proposals.length === 0) {
    alert("Không có đề xuất nào để hủy.");
    return;
  }

  const targetIds = SELECTED_PROPOSALS.size > 0 
    ? Array.from(SELECTED_PROPOSALS) 
    : proposals.map(p => p.id);

  const confirmMsg = `Xác nhận HỦY BỎ ${targetIds.length} đề xuất giao dịch?`;
  if (!confirm(confirmMsg)) return;

  let count = 0;
  for (const id of targetIds) {
    try {
      await postAPI('/api/proposals/reject', {
        id: id,
        reason: "Hủy hàng loạt bởi người dùng"
      });
      count++;
      SELECTED_PROPOSALS.delete(id);
    } catch (err) {
      console.warn("Lỗi hủy đề xuất:", err);
    }
  }

  await refreshState();
  alert(`Đã hủy ${count} đề xuất thành công.`);
}

// Reconcile Positions
async function handleReconcile() {
  try {
    const res = await postAPI('/api/reconcile', { auto_heal: true });
    if (res.in_sync) {
      alert(`✅ Đối soát hoàn tất: Hệ thống hoàn toàn đồng bộ (${res.db_count} vị thế).`);
    } else {
      const msgs = (res.discrepancies || []).map(d => `• [${d.kind}] ${d.message} -> Xử lý: ${d.action_taken}`).join('\n');
      alert(`⚠️ Phát hiện ${(res.discrepancies || []).length} điểm sai lệch (Đã tự động xử lý ${res.healed_count}):\n\n${msgs}`);
    }
    await refreshState();
  } catch (err) {
    alert("Lỗi đối soát: " + err.message);
  }
}

// Close Position
async function handleClosePosition(id) {
  if (!confirm(`Xác nhận đóng vị thế #${id}?`)) return;
  try {
    await postAPI('/api/close', { id: id });
    await refreshState();
  } catch (err) {
    alert("Lỗi đóng vị thế: " + err.message);
  }
}

// Manual Order / Preview
async function handleOrder(isPreview) {
  if (!STATE) return;
  const symbol = document.getElementById('order-symbol').value;
  const volume = parseFloat(document.getElementById('order-volume').value);
  const sl = parseFloat(document.getElementById('order-sl').value);
  const tp = parseFloat(document.getElementById('order-tp').value);

  if (!sl || !tp) {
    alert("Vui lòng nhập đầy đủ Stop Loss (SL) và Take Profit (TP) bắt buộc!");
    return;
  }

  const endpoint = isPreview ? '/api/orders/preview' : '/api/orders';
  const payload = {
    symbol,
    side: ACTIVE_SIDE,
    volume,
    sl,
    tp,
    step: STATE.account.step,
    request_id: 'ord-' + Date.now()
  };

  try {
    const result = await postAPI(endpoint, payload);
    if (isPreview) {
      document.getElementById('prev-risk').textContent = formatMoney(result.risk);
      document.getElementById('prev-margin').textContent = formatMoney(result.margin);
      document.getElementById('prev-fee').textContent = formatMoney(result.fee);
      alert(`Xem trước hợp lệ! Rủi ro dự kiến: $${result.risk.toFixed(2)}, Ký quỹ: $${result.margin.toFixed(2)}`);
    } else {
      await refreshState();
      alert(`Đã mở lệnh #${result.id} thành công!`);
    }
  } catch (err) {
    alert("Lỗi phiếu lệnh: " + err.message);
  }
}

// AI Review
async function handleAiReview() {
  const box = document.getElementById('ai-response-box');
  box.textContent = "Đang gửi dữ liệu thị trường và phân tích tín hiệu AI...";
  try {
    const res = await postAPI('/api/ai', { symbol: ACTIVE_SYMBOL });
    box.innerHTML = `
      <b>Đánh giá cho ${ACTIVE_SYMBOL}:</b><br>
      ${res.summary || res.review || JSON.stringify(res)}
    `;
  } catch (err) {
    box.textContent = "Phân tích thất bại: " + err.message;
  }
}

function updateDefaultSlTp() {
  if (!STATE || !STATE.market) return;
  const quote = STATE.market.quote;
  const entry = ACTIVE_SIDE === 'BUY' ? quote.ask : quote.bid;
  const distance = quote.spread * 15 || 0.0015;

  const sl = ACTIVE_SIDE === 'BUY' ? entry - distance : entry + distance;
  const tp = ACTIVE_SIDE === 'BUY' ? entry + distance * 2 : entry - distance * 2;

  document.getElementById('order-sl').value = sl.toFixed(quote.digits);
  document.getElementById('order-tp').value = tp.toFixed(quote.digits);
}

function updateOrderPreviewCalculations() {
  if (!STATE || !STATE.market) return;
  const quote = STATE.market.quote;
  const vol = parseFloat(document.getElementById('order-volume').value) || 0.1;
  const sl = parseFloat(document.getElementById('order-sl').value) || 0;
  const entry = ACTIVE_SIDE === 'BUY' ? quote.ask : quote.bid;

  if (sl > 0) {
    const pts = Math.abs(entry - sl);
    // Rough estimate
    const fee = vol * 7.0;
    document.getElementById('prev-fee').textContent = formatMoney(fee);
  }
}

// Helpers
async function postAPI(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Lucky-CSRF': CSRF_TOKEN
    },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

function formatMoney(num) {
  if (num === undefined || num === null) return '$0.00';
  const val = Number(num);
  const sign = val < 0 ? '-$' : '$';
  return sign + Math.abs(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function calculateSMA(data, period) {
  if (data.length < period) return null;
  const slice = data.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function calculateATR(candles, period) {
  if (candles.length < period + 1) return null;
  const trs = [];
  for (let i = candles.length - period; i < candles.length; i++) {
    const h = candles[i].high;
    const l = candles[i].low;
    const pc = candles[i - 1].close;
    trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  return trs.reduce((a, b) => a + b, 0) / period;
}

// ==========================================================================
// AI ANALYST & OBSIDIAN BRAIN REASONING ENGINE
// ==========================================================================

async function handleAiReview() {
  const box = document.getElementById('ai-response-box');
  if (!STATE || !STATE.market) {
    box.textContent = "Chưa tải được dữ liệu thị trường.";
    return;
  }

  box.innerHTML = `<span class="pulse-dot pulse-cyan"></span> Đang nạp tri thức Obsidian & gửi yêu cầu tới AI Gateway...`;

  const quote = STATE.market.quote;
  const entry = ACTIVE_SIDE === 'BUY' ? quote.ask : quote.bid;
  const vol = parseFloat(document.getElementById('order-volume').value) || 0.1;
  const sl = parseFloat(document.getElementById('order-sl').value) || 0;
  const tp = parseFloat(document.getElementById('order-tp').value) || 0;

  const proposal = {
    symbol: ACTIVE_SYMBOL,
    side: ACTIVE_SIDE,
    entry: entry,
    sl: sl,
    tp: tp,
    volume: vol,
    strategy: "trend_following"
  };

  const marketCtx = {
    spread: quote.spread,
    bid: quote.bid,
    ask: quote.ask,
    step: STATE.account.step
  };

  try {
    const res = await postAPI('/api/brain/evaluate', {
      proposal: proposal,
      market_context: marketCtx
    });

    const isApprove = res.decision === 'APPROVE';
    const badgeClass = isApprove ? 'badge-green' : 'badge-danger';
    const badgeText = isApprove ? `✔ PHÊ DUYỆT (${res.confidence_pct}% TIN CẬY)` : `✖ TỪ CHỐI (${res.confidence_pct}%)`;

    box.innerHTML = `
      <div style="margin-bottom: 8px;">
        <span class="badge ${badgeClass}">${badgeText}</span>
        <span class="badge" style="background: rgba(6,182,212,0.2); color: var(--accent-cyan); margin-left: 6px;">${res.matched_skill || 'QUY TẮC CỨNG'}</span>
        <span class="badge" style="background: rgba(245,158,11,0.2); color: var(--accent-amber); margin-left: 6px;">TÂM LÝ: ${res.psychology_check ? 'ỔN ĐỊNH (PASS)' : 'CẢNH BÁO'}</span>
      </div>
      <div style="white-space: pre-wrap; line-height: 1.5; color: #cbd5e1; font-size: 12px;">
        ${res.reasoning_vn || res.summary}
      </div>
      <div class="text-muted text-xs mt-2" style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 4px;">
        Mô hình thẩm định: <b>${res.model_used || 'Obsidian Engine'}</b>
      </div>
    `;

    // Trigger visual pulse on Neural Mesh
    pulseNeuralMesh(isApprove ? 'cyan' : 'magenta');
  } catch (err) {
    box.innerHTML = `<span class="text-danger">Lỗi khi gọi AI: ${err.message}</span>`;
  }
}

// ==========================================================================
// MODALS CONTROLLER (OBSIDIAN BRAIN & FTMO COCKPIT)
// ==========================================================================

async function openBrainModal() {
  const modal = document.getElementById('modal-obsidian');
  modal.classList.add('active');

  try {
    const [notesRes, statusRes] = await Promise.all([
      fetch('/api/brain/notes'),
      fetch('/api/brain/status')
    ]);
    const notesData = await notesRes.json();
    const statusData = await statusRes.json();

    // Populate status badge
    document.getElementById('brain-vault-badge').textContent = `VAULT: ${statusData.skills_count} SKILLS, ${statusData.rules_count} RULES`;
    document.getElementById('cfg-ai-provider').value = statusData.provider || 'openai';
    document.getElementById('cfg-ai-model').value = statusData.model || 'gpt-4o';
    document.getElementById('cfg-ai-base-url').value = statusData.base_url || 'https://api.openai.com/v1';

    // Populate notes list
    const listEl = document.getElementById('modal-vault-list');
    listEl.innerHTML = '';

    const allNotes = [
      ...(notesData.rules || []).map(n => ({ ...n, cat: 'Quy tắc cứng' })),
      ...(notesData.skills || []).map(n => ({ ...n, cat: 'Kỹ năng giao dịch' })),
      ...(notesData.journal || []).map(n => ({ ...n, cat: 'Nhật ký tự học' }))
    ];

    allNotes.forEach((n, idx) => {
      const item = document.createElement('div');
      item.className = `vault-item ${idx === 0 ? 'active' : ''}`;
      item.innerHTML = `
        <span class="font-bold">${n.title}</span>
        <span class="badge" style="font-size: 10px;">${n.cat}</span>
      `;
      item.addEventListener('click', () => {
        document.querySelectorAll('.vault-item').forEach(el => el.classList.remove('active'));
        item.classList.add('active');
        document.getElementById('modal-vault-preview').textContent = n.content;
      });
      listEl.appendChild(item);
    });

    if (allNotes.length > 0) {
      document.getElementById('modal-vault-preview').textContent = allNotes[0].content;
    }
  } catch (err) {
    console.error("Lỗi khi tải kho tri thức Obsidian:", err);
  }
}

function closeBrainModal() {
  document.getElementById('modal-obsidian').classList.remove('active');
}

async function handleSaveAiConfig() {
  const provider = document.getElementById('cfg-ai-provider').value;
  const model = document.getElementById('cfg-ai-model').value;
  const baseUrl = document.getElementById('cfg-ai-base-url').value;
  const apiKey = document.getElementById('cfg-ai-api-key').value;

  try {
    const res = await postAPI('/api/brain/config', {
      provider: provider,
      model: model,
      base_url: baseUrl,
      api_key: apiKey
    });
    alert(`Đã lưu cấu hình AI thành công: ${model} (${provider})`);
    document.getElementById('neural-active-model').innerHTML = `Mô hình AI: <b class="text-amber">Obsidian + ${model}</b>`;
    closeBrainModal();
  } catch (err) {
    alert("Lỗi khi lưu cấu hình AI: " + err.message);
  }
}

async function openFtmoModal() {
  const modal = document.getElementById('modal-ftmo');
  modal.classList.add('active');

  try {
    const res = await fetch('/api/ftmo/status');
    const data = await res.json();

    document.getElementById('ftmo-val-i').textContent = formatMoney(data.initial_capital);
    document.getElementById('ftmo-val-b0').textContent = formatMoney(data.boundary_balance_b0);
    document.getElementById('ftmo-val-h').textContent = formatMoney(data.peak_high_watermark_h);
    document.getElementById('ftmo-val-daily-floor').textContent = formatMoney(data.daily_floor);
    document.getElementById('ftmo-val-total-floor').textContent = formatMoney(data.total_floor);

    const headroomEl = document.getElementById('ftmo-val-headroom');
    headroomEl.textContent = (data.headroom >= 0 ? '+' : '') + formatMoney(data.headroom);
    headroomEl.className = 'ftmo-stat-val ' + (data.headroom >= 0 ? 'text-green' : 'text-danger');

    // Best Day Tracker
    if (data.best_day) {
      const pct = data.best_day.best_day_pct || 0;
      const bar = document.getElementById('ftmo-best-day-bar');
      bar.style.width = Math.min(100, (pct / 50) * 100) + '%';
      bar.style.backgroundColor = pct <= 50 ? 'var(--accent-cyan)' : 'var(--accent-danger)';

      const badge = document.getElementById('ftmo-best-day-badge');
      badge.textContent = `${pct}% / 50% (${data.best_day.eligible ? 'ĐẠT CHUẨN' : 'CẦN GIAO DỊCH THÊM'})`;
      badge.className = 'badge ' + (data.best_day.eligible ? 'badge-green' : 'badge-danger');
    }
  } catch (err) {
    console.error("Lỗi khi tải bảng FTMO:", err);
  }
}

function closeFtmoModal() {
  document.getElementById('modal-ftmo').classList.remove('active');
}

// ==========================================================================
// METATRADER 5 LIVE MODAL & REAL ACCOUNT SYNC
// ==========================================================================

async function syncMt5Status(showNotice = false) {
  try {
    const res = await postAPI('/api/mt5', {});
    if (res.success && res.connected) {
      const acc = res.account || {};
      const statusEl = document.getElementById('metric-mt5-status');
      if (statusEl) {
        statusEl.innerHTML = `<span class="pulse-dot"></span> LIVE (#${acc.login || '5056580335'})`;
        statusEl.className = 'metric-val text-green';
      }
      
      // Update topbar balances
      if (acc.balance !== undefined) {
        document.getElementById('metric-balance').textContent = formatMoney(acc.balance);
      }
      if (acc.equity !== undefined) {
        document.getElementById('metric-equity').textContent = formatMoney(acc.equity);
      }

      // Fill modal fields
      const loginEl = document.getElementById('mt5-modal-login');
      if (loginEl) loginEl.textContent = acc.login || '5056580335';
      const nameEl = document.getElementById('mt5-modal-name');
      if (nameEl) nameEl.textContent = 'Chủ TK: ' + (acc.name || 'Chuyền Ngọc');
      const srvEl = document.getElementById('mt5-modal-server');
      if (srvEl) srvEl.textContent = acc.server || 'MetaQuotes-Demo';
      const balEl = document.getElementById('mt5-modal-balance');
      if (balEl) balEl.textContent = formatMoney(acc.balance || 10000);
      const eqEl = document.getElementById('mt5-modal-equity');
      if (eqEl) eqEl.textContent = formatMoney(acc.equity || 9998.68);
      const fmEl = document.getElementById('mt5-modal-free-margin');
      if (fmEl) fmEl.textContent = formatMoney(acc.margin_free || 9928.49);
      const posEl = document.getElementById('mt5-modal-pos-count');
      if (posEl) posEl.textContent = `${acc.position_count || 0} Vị Thế`;

      const logEl = document.getElementById('mt5-sync-log');
      if (logEl) {
        logEl.innerHTML = `✅ <b class="text-green">Đồng bộ thành công lúc ${new Date().toLocaleTimeString()}</b>: Số dư ${formatMoney(acc.balance)}, Vốn ròng ${formatMoney(acc.equity)}, ${acc.position_count} lệnh mở.`;
      }
      if (showNotice) {
        alert(`✅ Đã đồng bộ thành công tài khoản MT5 #${acc.login} (${acc.name})!\nSố dư: $${acc.balance} | Vốn ròng: $${acc.equity}`);
      }
    }
  } catch (err) {
    console.warn("Không đồng bộ được MT5:", err);
    const logEl = document.getElementById('mt5-sync-log');
    if (logEl) logEl.textContent = 'Lỗi kết nối MT5: ' + err.message;
  }
}

function openMt5Modal() {
  document.getElementById('modal-mt5').classList.add('active');
  syncMt5Status(false);
}

function closeMt5Modal() {
  document.getElementById('modal-mt5').classList.remove('active');
}

function openGuideModal() {
  document.getElementById('modal-guide').classList.add('active');
}

function closeGuideModal() {
  document.getElementById('modal-guide').classList.remove('active');
}

// ==========================================================================
// CYBERPUNK NEURAL DECISION MESH CANVAS (VIDEO DEMO ADAPTATION)
// ==========================================================================

let NEURAL_CANVAS = null;
let NEURAL_CTX = null;
let NEURAL_PULSES = [];
let NEURAL_ANIM_ID = null;

const NEURAL_NODES = [
  { id: 'data', label: 'NẾN M15', sub: 'OHLCV Feed', xPct: 0.10, yPct: 0.50, color: '#06b6d4' },
  { id: 'trend', label: 'SMA/ATR', sub: 'Momentum', xPct: 0.30, yPct: 0.50, color: '#38bdf8' },
  { id: 'brain', label: 'OBSIDIAN', sub: 'Tri Thức AI', xPct: 0.50, yPct: 0.50, color: '#a855f7', clickable: true },
  { id: 'ftmo', label: 'CỔNG FTMO', sub: 'Headroom Safe', xPct: 0.70, yPct: 0.50, color: '#10b981', clickable: true },
  { id: 'exec', label: 'THỰC THI', sub: 'MT5 Auto/Semi', xPct: 0.90, yPct: 0.50, color: '#f59e0b' }
];

function initNeuralMesh() {
  NEURAL_CANVAS = document.getElementById('neural-canvas');
  if (!NEURAL_CANVAS) return;
  NEURAL_CTX = NEURAL_CANVAS.getContext('2d');

  resizeNeuralCanvas();

  // Click on nodes
  NEURAL_CANVAS.addEventListener('click', handleNeuralCanvasClick);

  // Spawn periodic pulse
  setInterval(() => {
    spawnPulse(0, 1);
  }, 2200);

  renderNeuralMesh();
}

function resizeNeuralCanvas() {
  if (!NEURAL_CANVAS) return;
  const rect = NEURAL_CANVAS.parentElement.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  NEURAL_CANVAS.width = rect.width * dpr;
  NEURAL_CANVAS.height = 135 * dpr;
  NEURAL_CANVAS.style.width = rect.width + 'px';
  NEURAL_CANVAS.style.height = '135px';
}

function spawnPulse(fromIdx, toIdx, color = '#06b6d4') {
  NEURAL_PULSES.push({
    from: fromIdx,
    to: toIdx,
    progress: 0,
    speed: 0.025,
    color: color
  });
}

function pulseNeuralMesh(color = 'cyan') {
  const pulseColor = color === 'cyan' ? '#06b6d4' : '#ec4899';
  spawnPulse(0, 1, pulseColor);
  setTimeout(() => spawnPulse(1, 2, pulseColor), 300);
  setTimeout(() => spawnPulse(2, 3, pulseColor), 600);
  setTimeout(() => spawnPulse(3, 4, pulseColor), 900);
}

function handleNeuralCanvasClick(e) {
  const rect = NEURAL_CANVAS.getBoundingClientRect();
  const clickX = (e.clientX - rect.left) / rect.width;
  const clickY = (e.clientY - rect.top) / rect.height;

  NEURAL_NODES.forEach((node, idx) => {
    const dist = Math.hypot(clickX - node.xPct, clickY - node.yPct);
    if (dist < 0.10) {
      if (node.id === 'brain') openBrainModal();
      if (node.id === 'ftmo') openFtmoModal();
    }
  });
}

function renderNeuralMesh() {
  if (!NEURAL_CTX || !NEURAL_CANVAS) return;

  const dpr = window.devicePixelRatio || 1;
  const w = NEURAL_CANVAS.width;
  const h = NEURAL_CANVAS.height;

  NEURAL_CTX.clearRect(0, 0, w, h);

  // Draw Connections (Edges)
  for (let i = 0; i < NEURAL_NODES.length - 1; i++) {
    const n1 = NEURAL_NODES[i];
    const n2 = NEURAL_NODES[i + 1];

    const x1 = n1.xPct * w;
    const y1 = n1.yPct * h;
    const x2 = n2.xPct * w;
    const y2 = n2.yPct * h;

    // Glowing connection line
    NEURAL_CTX.beginPath();
    NEURAL_CTX.moveTo(x1, y1);
    NEURAL_CTX.lineTo(x2, y2);
    NEURAL_CTX.strokeStyle = 'rgba(6, 182, 212, 0.25)';
    NEURAL_CTX.lineWidth = 2 * dpr;
    NEURAL_CTX.stroke();

    // Subtle background mesh web
    if (i + 2 < NEURAL_NODES.length) {
      const n3 = NEURAL_NODES[i + 2];
      NEURAL_CTX.beginPath();
      NEURAL_CTX.moveTo(x1, y1);
      NEURAL_CTX.lineTo(n3.xPct * w, n3.yPct * h);
      NEURAL_CTX.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      NEURAL_CTX.lineWidth = 1 * dpr;
      NEURAL_CTX.stroke();
    }
  }

  // Update & Draw Pulses
  for (let i = NEURAL_PULSES.length - 1; i >= 0; i--) {
    const p = NEURAL_PULSES[i];
    p.progress += p.speed;

    const n1 = NEURAL_NODES[p.from];
    const n2 = NEURAL_NODES[p.to];

    const curX = (n1.xPct + (n2.xPct - n1.xPct) * p.progress) * w;
    const curY = (n1.yPct + (n2.yPct - n1.yPct) * p.progress) * h;

    NEURAL_CTX.beginPath();
    NEURAL_CTX.arc(curX, curY, 4 * dpr, 0, Math.PI * 2);
    NEURAL_CTX.fillStyle = p.color;
    NEURAL_CTX.shadowColor = p.color;
    NEURAL_CTX.shadowBlur = 10 * dpr;
    NEURAL_CTX.fill();
    NEURAL_CTX.shadowBlur = 0;

    if (p.progress >= 1.0) {
      // Chain to next node
      if (p.to < NEURAL_NODES.length - 1) {
        NEURAL_PULSES.push({
          from: p.to,
          to: p.to + 1,
          progress: 0,
          speed: 0.025,
          color: p.color
        });
      }
      NEURAL_PULSES.splice(i, 1);
    }
  }

  // Draw Nodes
  const now = Date.now() / 1000;
  NEURAL_NODES.forEach((node, idx) => {
    const x = node.xPct * w;
    const y = node.yPct * h;
    const r = (node.clickable ? 22 : 18) * dpr;

    // Pulsating outer ring
    const pulseOffset = Math.sin(now * 3 + idx) * 3 * dpr;
    NEURAL_CTX.beginPath();
    NEURAL_CTX.arc(x, y, r + 4 * dpr + pulseOffset, 0, Math.PI * 2);
    NEURAL_CTX.strokeStyle = node.color + '44';
    NEURAL_CTX.lineWidth = 1.5 * dpr;
    NEURAL_CTX.stroke();

    // Node Body
    NEURAL_CTX.beginPath();
    NEURAL_CTX.arc(x, y, r, 0, Math.PI * 2);
    NEURAL_CTX.fillStyle = '#0b111a';
    NEURAL_CTX.fill();
    NEURAL_CTX.strokeStyle = node.color;
    NEURAL_CTX.lineWidth = 2 * dpr;
    NEURAL_CTX.shadowColor = node.color;
    NEURAL_CTX.shadowBlur = 8 * dpr;
    NEURAL_CTX.stroke();
    NEURAL_CTX.shadowBlur = 0;

    // Node Label
    NEURAL_CTX.fillStyle = '#ffffff';
    NEURAL_CTX.font = `bold ${10 * dpr}px 'JetBrains Mono', monospace`;
    NEURAL_CTX.textAlign = 'center';
    NEURAL_CTX.textBaseline = 'middle';
    NEURAL_CTX.fillText(node.label, x, y - 2 * dpr);

    // Subtitle below node
    NEURAL_CTX.fillStyle = '#94a3b8';
    NEURAL_CTX.font = `${8.5 * dpr}px 'Plus Jakarta Sans', sans-serif`;
    NEURAL_CTX.fillText(node.sub, x, y + r + 12 * dpr);
  });

  NEURAL_ANIM_ID = requestAnimationFrame(renderNeuralMesh);
}

window.addEventListener('DOMContentLoaded', init);

