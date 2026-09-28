/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * OPC Trade Lab V1 — LocalStorage Auto-Save & User Settings Engine
 * Guarantees zero data loss across page refreshes for sound toggles,
 * volatility alert thresholds, risk limits, MT4/MT5 gateways, and trading parameters.
 */

export interface Mt5ConnectionSettings {
  brokerServer: string;
  loginAccount: string;
  password?: string;
  investorPassword?: string;
  useInvestorMode?: boolean;
  connectionMode?: 'PYTHON_IPC' | 'MT5_WEBAPI' | 'MQL5_WEBSOCKET' | 'MCP_SERVER';
  accountType?: 'HEDGING' | 'NETTING';
  fillPolicy?: 'ORDER_FILLING_IOC' | 'ORDER_FILLING_FOK' | 'ORDER_FILLING_RETURN';
  terminalPath?: string;
  magicNumber?: string;
  maxDeviation?: string;
}

export interface Mt4ConnectionSettings {
  brokerServer: string;
  loginAccount: string;
  connectionMode?: 'DIRECT_SOCKET' | 'WEBREQUEST_REST' | 'NAMED_PIPE' | 'ZERO_MQ';
  magicNumber?: string;
  maxSlippagePips?: string;
}

export interface UserSettings {
  // Sound & Audio Alerts
  soundEnabled: boolean;

  // Thresholds
  volatilityThresholdPct: number; // e.g. 0.10, 0.15, 0.25

  // Navigation & Screen View
  currentScreen: 'command_center' | 'ai_auto' | 'overview' | 'inspector' | 'alerts_history' | 'strategy' | 'settings' | 'mt4_bridge' | 'mt5_bridge' | 'emergency_dashboard';

  // Strategy & Execution
  selectedStrategy: 'STRAT_COMPLETE_SET' | 'STRAT_MOMENTUM_LAG' | 'STRAT_MARKET_MAKING';
  aiExecutionIntervalSec: number;

  // Account Mode & Capital
  accountMode: 'DEMO' | 'REAL';
  demoCapitalPreset: number;
  customCapitalInput: string;

  // Session Auto-Close & Risk Management
  autoCloseEnabled: boolean;
  selectedSession: 'NEW_YORK' | 'LONDON' | 'TOKYO' | 'CRYPTO_DAILY' | 'CUSTOM';
  bufferMinutes: number;
  customTime: string;
  closeActionType: 'MARKET_ALL' | 'PROFIT_FIRST';

  // Gateways Display & Active Selection
  activeTradingGateway: 'MT5' | 'MT4';
  showGatewaysToolbar: boolean;
  showSidebarGateways: boolean;

  // Gateways Connection Settings
  mt5Settings: Mt5ConnectionSettings;
  mt4Settings: Mt4ConnectionSettings;

  // Storage Meta
  lastSavedTimestamp: number;
}

export const STORAGE_KEY = 'opc_user_settings_v1';

export const DEFAULT_USER_SETTINGS: UserSettings = {
  soundEnabled: true,
  volatilityThresholdPct: 0.15,
  currentScreen: 'mt5_bridge',
  selectedStrategy: 'STRAT_COMPLETE_SET',
  aiExecutionIntervalSec: 4.5,
  accountMode: 'DEMO',
  demoCapitalPreset: 10000,
  customCapitalInput: '10000',
  autoCloseEnabled: true,
  selectedSession: 'NEW_YORK',
  bufferMinutes: 15,
  customTime: '23:55',
  closeActionType: 'MARKET_ALL',
  activeTradingGateway: 'MT5',
  showGatewaysToolbar: false,
  showSidebarGateways: false,
  mt5Settings: {
    brokerServer: 'MetaQuotes-Demo',
    loginAccount: '5056580335',
    password: '_iDgN8Bs',
    investorPassword: '_p0pRsTo',
    useInvestorMode: false,
    connectionMode: 'PYTHON_IPC',
    accountType: 'HEDGING',
    fillPolicy: 'ORDER_FILLING_IOC',
    terminalPath: 'C:\\Program Files\\MetaTrader 5\\terminal64.exe',
    magicNumber: '999555',
    maxDeviation: '10'
  },
  mt4Settings: {
    brokerServer: 'ICMarketsSC-Demo01',
    loginAccount: '88291034',
    connectionMode: 'DIRECT_SOCKET',
    magicNumber: '888444',
    maxSlippagePips: '3'
  },
  lastSavedTimestamp: Date.now()
};

/**
 * Load user settings from localStorage safely with full fallback to defaults
 */
export function loadUserSettings(): UserSettings {
  if (typeof window === 'undefined' || !window.localStorage) {
    return DEFAULT_USER_SETTINGS;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_USER_SETTINGS;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return DEFAULT_USER_SETTINGS;
    }

    // Merge nested objects carefully
    return {
      ...DEFAULT_USER_SETTINGS,
      ...parsed,
      mt5Settings: {
        ...DEFAULT_USER_SETTINGS.mt5Settings,
        ...(parsed.mt5Settings || {})
      },
      mt4Settings: {
        ...DEFAULT_USER_SETTINGS.mt4Settings,
        ...(parsed.mt4Settings || {})
      },
      lastSavedTimestamp: parsed.lastSavedTimestamp || Date.now()
    };
  } catch (err) {
    console.warn('[OPC Settings] Error parsing saved settings from localStorage, using defaults:', err);
    return DEFAULT_USER_SETTINGS;
  }
}

/**
 * Save partial or complete user settings to localStorage
 */
export function saveUserSettings(partial: Partial<UserSettings>): UserSettings {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { ...DEFAULT_USER_SETTINGS, ...partial };
  }

  try {
    const current = loadUserSettings();
    const updated: UserSettings = {
      ...current,
      ...partial,
      mt5Settings: {
        ...current.mt5Settings,
        ...(partial.mt5Settings || {})
      },
      mt4Settings: {
        ...current.mt4Settings,
        ...(partial.mt4Settings || {})
      },
      lastSavedTimestamp: Date.now()
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    // Dispatch custom browser event so any active listeners update in real-time
    window.dispatchEvent(
      new CustomEvent('opc-settings-auto-saved', {
        detail: { settings: updated, timestamp: updated.lastSavedTimestamp }
      })
    );

    return updated;
  } catch (err) {
    console.error('[OPC Settings] Failed to save settings to localStorage:', err);
    return { ...DEFAULT_USER_SETTINGS, ...partial };
  }
}

/**
 * Reset all user settings back to initial factory defaults
 */
export function resetUserSettings(): UserSettings {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('opc_ai_interval_sec');
    } catch (e) {
      console.warn('[OPC Settings] Error clearing localStorage:', e);
    }
  }

  const defaults = { ...DEFAULT_USER_SETTINGS, lastSavedTimestamp: Date.now() };
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
    } catch {}
  }
  return defaults;
}
