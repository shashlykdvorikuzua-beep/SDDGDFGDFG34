import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { TRADING_INSTRUMENTS } from './src/data/tradeCatalog';
import { fetchAllProviderQuotes } from './src/services/marketDataService';
import { getForexRate } from './src/services/forexService';
import type { TradingInstrument } from './src/types/stakingPro';

// ---------------------------------------------------------------------------
// VaultSpring Wallet — Admin Panel backend
// Fully compatible with the wallet ledger (data/ledger.json). All financial
// actions are traceable, balances are only mutated through journal entries,
// and the audit log is append-only.
// ---------------------------------------------------------------------------

export interface LedgerLike {
  wallets: Record<string, any>;
  addressMap: Record<string, string>;
  transactions: Record<string, any[]>;
  pendingAlerts: Record<string, any[]>;
}

type Role = 'super_admin' | 'finance_ops' | 'support' | 'risk_compliance' | 'auditor';

// Permission matrix (least privilege). super_admin has everything.
const PERMISSIONS: Record<string, Role[]> = {
  'users.read': ['super_admin', 'finance_ops', 'support', 'risk_compliance', 'auditor'],
  'users.write': ['super_admin', 'risk_compliance'],
  'credit.read': ['super_admin', 'finance_ops', 'risk_compliance', 'auditor'],
  'credit.write': ['super_admin', 'finance_ops'],
  'withdraw.read': ['super_admin', 'finance_ops', 'risk_compliance', 'auditor'],
  'withdraw.write': ['super_admin', 'finance_ops'],
  'pool.read': ['super_admin', 'finance_ops', 'risk_compliance', 'auditor'],
  'pool.write': ['super_admin', 'finance_ops'],
  'restrictions.read': ['super_admin', 'risk_compliance', 'auditor'],
  'restrictions.write': ['super_admin', 'risk_compliance'],
  'support.read': ['super_admin', 'support', 'risk_compliance', 'auditor'],
  'support.write': ['super_admin', 'support'],
  'tokens.read': ['super_admin', 'finance_ops', 'risk_compliance', 'auditor'],
  'tokens.write': ['super_admin', 'finance_ops'],
  'staking.read': ['super_admin', 'finance_ops', 'risk_compliance', 'auditor'],
  'staking.write': ['super_admin', 'finance_ops'],
  'reports.read': ['super_admin', 'finance_ops', 'risk_compliance', 'auditor'],
  'verification.read': ['super_admin', 'finance_ops', 'risk_compliance'],
  'verification.write': ['super_admin', 'finance_ops'],
  'settings.write': ['super_admin'],
};

const SECOND_APPROVAL_THRESHOLD_USD = 5000;
const DEFAULT_UNLOCK_PERIOD_HOURS = 48;

interface AdminStore {
  adminAccounts: any[];
  profiles: Record<string, any>;
  addressPool: any[];
  journal: any[];
  withdrawals: any[];
  restrictions: any[];
  supportChats: any[];
  internalTokens: any[];
  tokenPriceHistory: any[];
  auditLog: any[];
  notifications: any[];
  depositSettings: Record<string, DepositSetting>;
  stakingProAssets: StakingProAssetRow[];
  stakingProPositions: StakingProPositionRow[];
  config?: { unlockPeriodHours?: number; priceSync?: PriceSyncConfig };
}

// Master switch + cadence of the live provider feed. Manual instruments are
// never touched by it, so operator adjustments always stick.
export interface PriceSyncConfig {
  enabled: boolean;
  intervalMinutes: number;
  lastRunAt?: number;
  lastStatus?: string;
  lastError?: string;
}

export interface DepositSetting {
  id: string;              // unique per (coin + network) so a coin can have several wallets
  symbol: string;
  name?: string;
  network: string;
  address: string;
  memo?: string;           // destination tag / payment id / memo (XRP, TON, EOS, etc.)
  label?: string;
  minDeposit?: number;
  confirmations?: number;
  qrImage: string | null; // data URL of an uploaded QR, or null to auto-generate from address
  enabled: boolean;        // hidden from users when false
  updatedAt: number;
}

// Staking Pro tradable asset catalog — fully managed by the admin and consumed
// by the wallet app. `enabled` turns an asset on/off for every user.
export interface StakingProAssetRow {
  id: string;
  symbol: string;
  name: string;
  network: string;
  currentPrice: number;
  change24h: number;
  minPositionUsd: number;
  maxLeverage: number;
  fundingRate8h: number;
  fundingDirection: 'pay' | 'receive';
  spread: number;
  makerFeePercent: number;
  takerFeePercent: number;
  enabled: boolean;
  updatedAt: number;
  // Trade Pro market metadata. Legacy rows without a category are crypto.
  category?: TradingInstrument['category'];
  ticker?: string;
  pricePrecision?: number;
  productType?: string;
  tradingHours?: string;
  // Price control. 'auto' follows the provider feed (with the operator's bias
  // on top), 'manual' freezes the price at whatever the operator set.
  priceMode?: 'auto' | 'manual';
  biasPercent?: number;
  providerPrice?: number;
  providerChange?: number;
  providerAt?: number;
}

// A Staking Pro position belongs to a specific user (walletPrimary) and is
// created/managed either by the admin or by the client — always journal-backed.
export interface StakingProPositionRow {
  id: string;
  userId: string;
  walletPrimary: string;
  assetId: string;
  assetSymbol: string;
  assetName: string;
  category?: TradingInstrument['category'];
  ticker?: string;
  pricePrecision?: number;
  direction: 'long' | 'short';
  executionType: 'market' | 'limit';
  entryPrice: number;
  currentPrice: number;
  positionSizeUsd: number;
  collateralUsd: number;
  leverage: number;
  takeProfitPrice: number;
  stopLossPrice: number;
  liquidationPrice: number;
  openingFeeUsd: number;
  estClosingFeeUsd: number;
  spreadCostUsd: number;
  fundingRate8h: number;
  accruedFundingUsd: number;
  stakingYieldUsd: number;
  openedAt: number;
  closedAt?: number;
  closePrice?: number;
  realizedPnlUsd?: number;
  status: 'open' | 'closed' | 'liquidated' | 'pending_limit';
  source: 'admin' | 'client';
  openedBy: string;
  updatedAt: number;
}

function nowId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}

function normalize(addr: string) {
  return (addr || '').trim().toLowerCase();
}

export function createAdminRouter(getLedger: () => LedgerLike, saveLedger: () => void) {
  const router = express.Router();
  const ADMIN_FILE = path.resolve(process.cwd(), 'data', 'admin.json');

  let store: AdminStore = loadStore();

  function loadStore(): AdminStore {
    try {
      if (fs.existsSync(ADMIN_FILE)) {
        const parsed = JSON.parse(fs.readFileSync(ADMIN_FILE, 'utf8'));
        // Ensure newer keys exist on older stores.
        if (!parsed.depositSettings) parsed.depositSettings = {};
        parsed.depositSettings = migrateDepositSettings(parsed.depositSettings);
        if (!parsed.stakingProAssets) parsed.stakingProAssets = [];
        if (!parsed.stakingProPositions) parsed.stakingProPositions = [];
        if (parsed.stakingProAssets.length === 0) parsed.stakingProAssets = defaultStakingProAssets();
        else mergeCatalogAssets(parsed.stakingProAssets);
        return parsed;
      }
    } catch (err) {
      console.warn('Admin store read failed, starting fresh:', err);
    }
    return {
      adminAccounts: [], profiles: {}, addressPool: [], journal: [], withdrawals: [],
      restrictions: [], supportChats: [], internalTokens: [], tokenPriceHistory: [],
      auditLog: [], notifications: [], depositSettings: {},
      stakingProAssets: defaultStakingProAssets(), stakingProPositions: [],
    };
  }

  // Seed the Trade Pro catalog from the shared instrument catalog so every
  // market in the wallet has a matching, admin-manageable row (ids line up with
  // the client, which is what allows a position to be opened on any market).
  function defaultStakingProAssets(): StakingProAssetRow[] {
    const now = Date.now();
    const rows: StakingProAssetRow[] = TRADING_INSTRUMENTS.map((i) => catalogRowFromInstrument(i, now));
    // Native token stays tradable for existing installs that already seeded it.
    rows.push({
      id: 'vaultspring', symbol: 'VLT', name: 'VaultSpring Token', network: 'BNB Smart Chain',
      category: 'crypto', ticker: 'VLT/USDT', pricePrecision: 3, currentPrice: 5.5, change24h: 2.83,
      minPositionUsd: 5, maxLeverage: 5, fundingRate8h: 0.02, fundingDirection: 'pay', spread: 0.01,
      makerFeePercent: 0.01, takerFeePercent: 0.04, productType: 'USDT-маржинальный бессрочный контракт',
      tradingHours: '24/7', enabled: true, updatedAt: now,
    });
    return rows;
  }

  function catalogRowFromInstrument(i: TradingInstrument, now: number): StakingProAssetRow {
    return {
      id: i.id, symbol: i.symbol, name: i.name, network: i.network,
      category: i.category, ticker: i.ticker, pricePrecision: i.pricePrecision,
      productType: i.productType, tradingHours: i.tradingHours,
      currentPrice: i.currentPrice, change24h: i.change24h, minPositionUsd: i.minPositionUsd,
      maxLeverage: i.maxLeverage, fundingRate8h: i.fundingRate8h, fundingDirection: i.fundingDirection,
      spread: i.spread, makerFeePercent: i.makerFeePercent, takerFeePercent: i.takerFeePercent,
      enabled: true, updatedAt: now,
    };
  }

  // Idempotent upgrade for stores written before the multi-market catalog: adds
  // missing instruments and back-fills market metadata. Anything the operator
  // edited (price, leverage, enabled) is left untouched.
  function mergeCatalogAssets(rows: StakingProAssetRow[]): StakingProAssetRow[] {
    const now = Date.now();
    for (const inst of TRADING_INSTRUMENTS) {
      const existing = rows.find((a) => a.id === inst.id);
      if (!existing) {
        rows.push(catalogRowFromInstrument(inst, now));
        continue;
      }
      if (!existing.category) existing.category = inst.category;
      if (!existing.ticker) existing.ticker = inst.ticker;
      if (existing.pricePrecision === undefined) existing.pricePrecision = inst.pricePrecision;
      if (!existing.productType) existing.productType = inst.productType;
      if (!existing.tradingHours) existing.tradingHours = inst.tradingHours;
    }
    return rows;
  }

  function saveStore() {
    try {
      fs.writeFileSync(ADMIN_FILE, JSON.stringify(store, null, 2), 'utf8');
    } catch (err) {
      console.error('Failed to save admin.json:', err);
    }
  }

  // Normalize deposit wallets to be keyed by a stable id and carry the new
  // fields (memo / min / confirmations / enabled). Handles legacy symbol-keyed data.
  function migrateDepositSettings(raw: Record<string, any>): Record<string, DepositSetting> {
    const out: Record<string, DepositSetting> = {};
    for (const [k, v] of Object.entries(raw || {})) {
      if (!v) continue;
      const id = v.id || k;
      out[id] = {
        id,
        symbol: String(v.symbol || k).toUpperCase(),
        name: v.name || v.symbol || k,
        network: v.network || '',
        address: v.address || '',
        memo: v.memo || '',
        label: v.label ?? '',
        minDeposit: v.minDeposit,
        confirmations: v.confirmations,
        qrImage: v.qrImage ?? null,
        enabled: v.enabled !== false,
        updatedAt: v.updatedAt || Date.now(),
      };
    }
    return out;
  }

  // -- Auth / session ------------------------------------------------------
  // Demo credential model: password === role name (e.g. admin/admin).
  const sessions: Record<string, { userId: string; role: Role; expires: number }> = {};
  const SESSION_TTL_MS = 30 * 60 * 1000;

  function auth(req: Request): { userId: string; role: Role; name: string } | null {
    const token = req.header('x-admin-token');
    if (!token || !sessions[token]) return null;
    const s = sessions[token];
    if (s.expires < Date.now()) {
      delete sessions[token];
      return null;
    }
    s.expires = Date.now() + SESSION_TTL_MS; // sliding window
    const acct = store.adminAccounts.find((a) => a.id === s.userId);
    if (!acct) return null;
    return { userId: acct.id, role: s.role, name: acct.name };
  }

  function can(role: Role, perm: string): boolean {
    if (role === 'super_admin') return true;
    return (PERMISSIONS[perm] || []).includes(role);
  }

  function guard(perm: string) {
    return (req: Request, res: Response, next: any) => {
      const who = auth(req);
      if (!who) return res.status(401).json({ error: 'Не авторизован' });
      if (!can(who.role, perm)) return res.status(403).json({ error: 'Недостаточно прав' });
      (req as any).who = who;
      next();
    };
  }

  function audit(who: { userId: string; role: Role; name: string }, action: string, object: string, extra: Partial<any> = {}) {
    store.auditLog.unshift({
      id: nowId('audit'),
      actor: who.name,
      actorId: who.userId,
      role: who.role,
      action,
      object,
      reason: extra.reason || null,
      oldValue: extra.oldValue ?? null,
      newValue: extra.newValue ?? null,
      reference: extra.reference || null,
      createdAt: Date.now(),
    });
    saveStore();
  }

  function notifyAdmin(type: string, title: string, message: string, severity: 'info' | 'warning' | 'critical' = 'info', link?: string) {
    store.notifications.unshift({
      id: nowId('notif'), type, title, message, severity, link: link || null,
      createdAt: Date.now(), read: false, audience: 'admin',
    });
    saveStore();
  }

  // -- Wallet helpers (shared with the app ledger) -------------------------
  function findPrimary(address: string): string | null {
    const ledger = getLedger();
    const norm = normalize(address);
    if (ledger.addressMap[norm]) return ledger.addressMap[norm];
    for (const [primary, w] of Object.entries(ledger.wallets)) {
      if (normalize(w.address) === norm) return primary;
      for (const k of ['tronAddress', 'btcAddress', 'solAddress', 'tonAddress']) {
        if ((w as any)[k] && normalize((w as any)[k]) === norm) return primary;
      }
    }
    return null;
  }

  function ensureProfile(primary: string, wallet: any) {
    if (!store.profiles[primary]) {
      store.profiles[primary] = {
        id: nowId('usr'),
        walletPrimary: primary,
        email: `user${Object.keys(store.profiles).length + 1}@vaultspring.app`,
        phone: '',
        status: 'active',
        kycStatus: 'none',
        createdAt: wallet.updatedAt || Date.now(),
        lastActiveAt: wallet.updatedAt || Date.now(),
      };
    }
    return store.profiles[primary];
  }

  function computeBalanceUsd(primary: string): number {
    const ledger = getLedger();
    const w = ledger.wallets[primary];
    if (!w) return 0;
    let total = 0;
    for (const [sym, amt] of Object.entries(w.balances || {})) {
      total += Number(amt) * priceOf(sym);
    }
    return total;
  }

  function priceOf(symbol: string): number {
    const internal = store.internalTokens.find((t) => t.symbol === symbol);
    if (internal) return internal.price;
    // Static reference prices for demo reconciliation (external oracle stand-in).
    const REF: Record<string, number> = {
      BTC: 67000, ETH: 3500, BNB: 590, SOL: 165, USDT: 1, USDC: 1, TRX: 0.16,
      XRP: 0.62, DOGE: 0.14, ADA: 0.45, TON: 6.8, LINK: 17, DOT: 7.1, LTC: 84,
      NEAR: 5.6, PEPE: 0.0000112, SHIB: 0.0000185, SUI: 1.42, UNI: 9.8, POL: 0.55,
      ARB: 0.95, OP: 1.9, KAS: 0.13, BCH: 400, APT: 9.2, ATOM: 7.4, FIL: 4.6,
      RENDER: 7.2, FET: 1.6, FLOKI: 0.00018, BONK: 0.000024, WIF: 2.4, DAI: 1, SEI: 0.52,
    };
    return REF[symbol] || 0;
  }

  // =========================================================================
  // AUTH
  // =========================================================================
  router.post('/login', (req: Request, res: Response) => {
    const username = String(req.body.username || '').trim();
    const password = String(req.body.password || '').trim();
    const mfaCode = String(req.body.mfaCode || '').trim();
    const acct = store.adminAccounts.find((a) => a.username === username && a.active);
    // Demo auth: password may equal the role name OR the username (e.g. admin/admin).
    if (!acct || (password !== acct.role && password !== acct.username)) {
      return res.status(401).json({ error: 'Неверные учётные данные' });
    }
    if (acct.mfaEnabled && !mfaCode) {
      return res.status(401).json({ error: 'mfa_required', mfaRequired: true });
    }
    if (acct.mfaEnabled && mfaCode !== '123456') {
      return res.status(401).json({ error: 'Неверный MFA код', mfaRequired: true });
    }
    const token = nowId('sess');
    sessions[token] = { userId: acct.id, role: acct.role, expires: Date.now() + SESSION_TTL_MS };
    acct.lastLogin = Date.now();
    saveStore();
    audit({ userId: acct.id, role: acct.role, name: acct.name }, 'login', 'session');
    return res.json({ token, account: { id: acct.id, name: acct.name, username: acct.username, role: acct.role, mfaEnabled: acct.mfaEnabled } });
  });

  router.post('/logout', (req: Request, res: Response) => {
    const token = req.header('x-admin-token');
    if (token) delete sessions[token];
    res.json({ success: true });
  });

  router.get('/me', (req: Request, res: Response) => {
    const who = auth(req);
    if (!who) return res.status(401).json({ error: 'Не авторизован' });
    const acct = store.adminAccounts.find((a) => a.id === who.userId);
    res.json({ account: { id: acct.id, name: acct.name, username: acct.username, role: acct.role, mfaEnabled: acct.mfaEnabled }, permissions: PERMISSIONS });
  });

  // =========================================================================
  // DASHBOARD
  // =========================================================================
  router.get('/dashboard', guard('users.read'), (_req: Request, res: Response) => {
    const ledger = getLedger();
    const primaries = Object.keys(ledger.wallets);
    primaries.forEach((p) => ensureProfile(p, ledger.wallets[p]));
    const profiles = Object.values(store.profiles);
    const active = profiles.filter((p: any) => p.status === 'active').length;
    const restricted = profiles.filter((p: any) => p.status === 'restricted' || p.status === 'blocked').length;
    const newRegs = profiles.filter((p: any) => Date.now() - p.createdAt < 7 * 864e5).length;

    const pendingWithdrawals = store.withdrawals.filter((w: any) => ['new', 'review', 'awaiting_send'].includes(w.status)).length;
    const pendingDeposits = store.journal.filter((j: any) => j.type === 'deposit' && !j.approved).length;
    const openChats = store.supportChats.filter((c: any) => c.status === 'open').length;

    const totalUnderManagement = primaries.reduce((sum, p) => sum + computeBalanceUsd(p), 0);

    res.json({
      cards: { totalUsers: profiles.length, active, restricted, newRegs },
      queues: { pendingWithdrawals, pendingDeposits, openChats },
      summary: {
        totalUnderManagement,
        stakingPositions: ledger.wallets ? countStaking() : 0,
        openProPositions: store.stakingProPositions.filter((p) => p.status === 'open').length,
      },
      recentEvents: store.auditLog.slice(0, 8),
      integrationErrors: store.notifications.filter((n: any) => n.severity === 'critical').slice(0, 5),
    });
  });

  function countStaking() {
    // Staking positions are tracked client-side; admin reports journal-derived stakes.
    return store.journal.filter((j: any) => j.type === 'reward').length;
  }

  // =========================================================================
  // USERS
  // =========================================================================
  router.get('/users', guard('users.read'), (_req: Request, res: Response) => {
    const ledger = getLedger();
    const list = Object.keys(ledger.wallets).map((primary) => {
      const w = ledger.wallets[primary];
      const prof = ensureProfile(primary, w);
      const openWithdrawals = store.withdrawals.filter((x: any) => x.walletPrimary === primary && !['completed', 'rejected'].includes(x.status)).length;
      return {
        id: prof.id,
        walletPrimary: primary,
        email: prof.email,
        phone: prof.phone,
        address: w.address,
        status: prof.status,
        kycStatus: prof.kycStatus,
        createdAt: prof.createdAt,
        lastActiveAt: prof.lastActiveAt,
        balanceUsd: computeBalanceUsd(primary),
        assetCount: Object.values(w.balances || {}).filter((v: any) => Number(v) > 0).length,
        openWithdrawals,
      };
    });
    res.json({ users: list });
  });

  router.get('/users/:id', guard('users.read'), (req: Request, res: Response) => {
    const ledger = getLedger();
    const primary = Object.keys(store.profiles).find((p) => store.profiles[p].id === req.params.id);
    if (!primary || !ledger.wallets[primary]) return res.status(404).json({ error: 'Пользователь не найден' });
    const w = ledger.wallets[primary];
    const prof = store.profiles[primary];
    const assets = Object.entries(w.balances || {}).map(([sym, amt]) => ({
      symbol: sym, amount: Number(amt), price: priceOf(sym), valueUsd: Number(amt) * priceOf(sym),
    })).filter((a) => a.amount !== 0);
    const reservations = store.withdrawals
      .filter((x: any) => x.walletPrimary === primary && ['new', 'review', 'awaiting_send', 'sent', 'awaiting_confirm'].includes(x.status))
      .reduce((m: Record<string, number>, x: any) => { m[x.asset] = (m[x.asset] || 0) + x.amount; return m; }, {} as Record<string, number>);
    const journal = store.journal.filter((j: any) => j.walletPrimary === primary);
    const txs = ledger.transactions[primary] || [];
    const restrictions = store.restrictions.filter((r: any) => r.userId === prof.id && r.active);
    const chats = store.supportChats.filter((c: any) => c.userId === prof.id);
    const priceOverrides = prof.priceOverrides || {};
    const depositOverrides = prof.depositOverrides || {};
    // Enabled Trade Pro instruments feed the per-client market editor; the coins
    // the client holds (plus common ones) feed the balance/deposit pickers.
    const marketAssets = store.stakingProAssets.filter((a) => a.enabled).map((a) => ({
      id: a.id, name: a.name, symbol: a.symbol, network: a.network, category: a.category || 'crypto',
      currentPrice: a.currentPrice, change24h: a.change24h, pricePrecision: a.pricePrecision,
    }));
    const coinOptions = Array.from(new Set([
      ...Object.keys(w.balances || {}), ...assets.map((a) => a.symbol),
      ...Object.keys(store.depositSettings).map((k) => store.depositSettings[k].symbol),
    ])).sort();
    res.json({
      profile: prof,
      wallet: { address: w.address, tronAddress: w.tronAddress, btcAddress: w.btcAddress, solAddress: w.solAddress, tonAddress: w.tonAddress },
      assets: assets.map((a) => ({ ...a, reserved: reservations[a.symbol] || 0, available: a.amount - (reservations[a.symbol] || 0) })),
      balanceUsd: computeBalanceUsd(primary),
      reservedUsd: Object.entries(reservations).reduce((s, [sym, amt]) => s + Number(amt) * priceOf(sym), 0),
      journal, transactions: txs, restrictions, chats: chats.map((c) => ({ id: c.id, subject: c.subject, status: c.status })),
      priceOverrides, depositOverrides, marketAssets, coinOptions, operatorDeposits: Object.values(store.depositSettings).filter((d) => d.enabled && d.address),
      allowedAssetIds: prof.allowedAssetIds ?? null,
    });
  });

  router.patch('/users/:id', guard('users.write'), (req: Request, res: Response) => {
    const who = (req as any).who;
    const primary = Object.keys(store.profiles).find((p) => store.profiles[p].id === req.params.id);
    if (!primary) return res.status(404).json({ error: 'Пользователь не найден' });
    const prof = store.profiles[primary];
    const { email, phone, status, kycStatus } = req.body;
    const oldValue = JSON.stringify({ email: prof.email, phone: prof.phone, status: prof.status, kycStatus: prof.kycStatus });
    if (email !== undefined) prof.email = email;
    if (phone !== undefined) prof.phone = phone;
    if (status !== undefined) prof.status = status;
    if (kycStatus !== undefined) prof.kycStatus = kycStatus;
    saveStore();
    audit(who, 'user.update', prof.id, { oldValue, newValue: JSON.stringify({ email: prof.email, phone: prof.phone, status: prof.status, kycStatus: prof.kycStatus }), reason: req.body.reason });
    res.json({ success: true, profile: prof });
  });

  // ---- Per-client control: balance, personal market, deposit wallet + QR ----
  // Direct balance adjustment for a single client. Every change is journalled,
  // audited and reflected in the client's history/alerts so nothing is silent.
  router.post('/users/:id/balance', guard('credit.write'), (req: Request, res: Response) => {
    const who = (req as any).who;
    const primary = Object.keys(store.profiles).find((p) => store.profiles[p].id === req.params.id);
    if (!primary) return res.status(404).json({ error: 'Пользователь не найден' });
    const ledger = getLedger();
    const w = ledger.wallets[primary];
    if (!w) return res.status(404).json({ error: 'Кошелёк не найден' });
    const prof = store.profiles[primary];
    const asset = String(req.body.asset || '').trim().toUpperCase();
    const mode = String(req.body.mode || 'add');
    const amount = Number(req.body.amount);
    const reason = String(req.body.reason || '').trim();
    if (!asset) return res.status(400).json({ error: 'Укажите актив' });
    if (!Number.isFinite(amount) || amount < 0) return res.status(400).json({ error: 'Некорректная сумма' });
    const current = Number(w.balances[asset] || 0);
    let next = current;
    if (mode === 'set') next = amount;
    else if (mode === 'add') next = current + amount;
    else if (mode === 'sub') next = current - amount;
    else return res.status(400).json({ error: 'Режим: set | add | sub' });
    if (next < 0) return res.status(400).json({ error: 'Баланс не может быть отрицательным' });
    const delta = next - current;
    if (delta === 0) return res.json({ success: true, noChange: true, balance: next });
    w.balances[asset] = next;
    w.updatedAt = Date.now();
    const amountUsd = Math.abs(delta) * priceOf(asset);
    const entry = {
      id: nowId('jr'), userId: prof.id, walletPrimary: primary, asset, amount: delta, amountUsd,
      type: 'correction', reason: reason || `Ручная корректировка (${mode === 'set' ? 'установить' : mode === 'add' ? 'начислить' : 'списать'})`,
      reference: 'balance-adjust', txHash: null, source: 'manual', author: who.name, authorId: who.userId,
      createdAt: Date.now(), requiresSecondApproval: false, approved: true,
    };
    store.journal.unshift(entry);
    const tx = {
      id: `tx-admin-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: delta >= 0 ? 'receive' : 'send', tokenSymbol: asset, tokenName: asset, amount: Math.abs(delta),
      amountUsd, fromAddress: delta >= 0 ? 'Admin' : 'Wallet', toAddress: delta >= 0 ? 'Wallet' : 'Admin',
      timestamp: 'Только что', status: 'completed', hash: `admin-${entry.id}`, fee: 0, network: 'Manual',
    };
    ledger.transactions[primary] = [tx, ...(ledger.transactions[primary] || [])];
    const alert = {
      id: `alert-${Date.now()}`, title: delta >= 0 ? 'Начисление от администратора' : 'Списание администратором',
      message: `${delta >= 0 ? '+' : ''}${delta} ${asset}`, time: 'Только что', type: 'tx', subtype: delta >= 0 ? 'receive' : 'send',
    };
    ledger.pendingAlerts[primary] = [alert, ...(ledger.pendingAlerts[primary] || [])];
    saveLedger();
    saveStore();
    audit(who, 'user.balance_adjust', prof.id, { oldValue: `${current} ${asset}`, newValue: `${next} ${asset}`, reason });
    res.json({ success: true, balance: next, delta, entry });
  });

  // Personal market prices for one client. Overrides win over the global feed on
  // /staking-pro/public only for this wallet, so each client can see their own.
  router.patch('/users/:id/price-overrides', guard('staking.write'), (req: Request, res: Response) => {
    const who = (req as any).who;
    const primary = Object.keys(store.profiles).find((p) => store.profiles[p].id === req.params.id);
    if (!primary) return res.status(404).json({ error: 'Пользователь не найден' });
    const prof = store.profiles[primary];
    if (!prof.priceOverrides) prof.priceOverrides = {};
    if (req.body.clear === true) prof.priceOverrides = {};
    else if (req.body.clearAsset) delete prof.priceOverrides[String(req.body.clearAsset)];
    const map = req.body.overrides || {};
    for (const [assetId, val] of Object.entries(map as Record<string, any>)) {
      const v: any = val || {};
      const cur = v.currentPrice !== undefined && v.currentPrice !== null && v.currentPrice !== '' ? Number(v.currentPrice) : undefined;
      const chg = v.change24h !== undefined && v.change24h !== null && v.change24h !== '' ? Number(v.change24h) : undefined;
      const hasCur = cur !== undefined && Number.isFinite(cur);
      const hasChg = chg !== undefined && Number.isFinite(chg);
      if (!hasCur && !hasChg) { delete prof.priceOverrides[assetId]; continue; }
      prof.priceOverrides[assetId] = { ...(hasCur ? { currentPrice: cur } : {}), ...(hasChg ? { change24h: chg } : {}) };
    }
    saveStore();
    audit(who, 'user.price_override', prof.id, { newValue: JSON.stringify(prof.priceOverrides), reason: req.body.reason });
    res.json({ success: true, priceOverrides: prof.priceOverrides });
  });

  // Per-client market access: assign which Trade Pro assets this user can see.
  // null/undefined = all enabled assets; an array of IDs = only those assets.
  router.patch('/users/:id/allowed-assets', guard('staking.write'), (req: Request, res: Response) => {
    const who = (req as any).who;
    const primary = Object.keys(store.profiles).find((p) => store.profiles[p].id === req.params.id);
    if (!primary) return res.status(404).json({ error: 'Пользователь не найден' });
    const prof = store.profiles[primary];
    const b = req.body;
    const oldVal = prof.allowedAssetIds ?? null;
    if (b.mode === 'all' || b.assetIds === null || b.assetIds === undefined) {
      delete prof.allowedAssetIds;
    } else if (Array.isArray(b.assetIds)) {
      const validIds = new Set(store.stakingProAssets.map((a) => a.id));
      const cleaned = b.assetIds.filter((id: any) => validIds.has(String(id))).map(String);
      // An empty selection would lock the client out of Trade Pro entirely —
      // require at least one instrument, or reset to 'all' explicitly.
      if (cleaned.length === 0) return res.status(400).json({ error: 'Выберите хотя бы один инструмент или верните режим «все рынки»' });
      prof.allowedAssetIds = cleaned;
    } else {
      return res.status(400).json({ error: 'Некорректный формат: передайте mode="all" или assetIds=[...]' });
    }
    saveStore();
    audit(who, 'user.allowed_assets', prof.id, {
      oldValue: oldVal ? `${oldVal.length} assets` : 'all',
      newValue: prof.allowedAssetIds ? `${prof.allowedAssetIds.length} assets` : 'all',
      reason: b.reason || 'Изменение доступа к рынкам для клиента',
    });
    res.json({ success: true, allowedAssetIds: prof.allowedAssetIds ?? null });
  });

  // Personal deposit (top-up) wallet + QR for one client, per coin/network.
  router.patch('/users/:id/deposit-overrides', guard('pool.write'), (req: Request, res: Response) => {
    const who = (req as any).who;
    const primary = Object.keys(store.profiles).find((p) => store.profiles[p].id === req.params.id);
    if (!primary) return res.status(404).json({ error: 'Пользователь не найден' });
    const prof = store.profiles[primary];
    if (!prof.depositOverrides) prof.depositOverrides = {};
    const b = req.body;
    const symbol = String(b.symbol || '').trim().toUpperCase();
    const network = String(b.network || '').trim();
    const address = String(b.address || '').trim();
    if (!symbol) return res.status(400).json({ error: 'Укажите тикер монеты' });
    if (!address) return res.status(400).json({ error: 'Укажите адрес пополнения' });
    if (b.qrImage && typeof b.qrImage === 'string' && b.qrImage.length > 1_500_000) return res.status(400).json({ error: 'QR-изображение слишком большое (макс. ~1.1 МБ base64)' });
    const key = `${symbol}|${network.toLowerCase()}`;
    const prev = prof.depositOverrides[key];
    prof.depositOverrides[key] = {
      symbol, network, address,
      memo: (b.memo ?? prev?.memo ?? '').toString().trim(),
      label: b.label ?? prev?.label ?? '',
      qrImage: b.qrImage === undefined ? (prev?.qrImage ?? null) : (b.qrImage || null),
      updatedAt: Date.now(),
    };
    saveStore();
    audit(who, prev ? 'user.deposit_override_update' : 'user.deposit_override_create', prof.id, { newValue: `${symbol} (${network}) -> ${address}`, reason: b.label });
    res.json({ success: true, depositOverrides: prof.depositOverrides });
  });

  router.post('/users/:id/deposit-overrides/remove', guard('pool.write'), (req: Request, res: Response) => {
    const who = (req as any).who;
    const primary = Object.keys(store.profiles).find((p) => store.profiles[p].id === req.params.id);
    if (!primary) return res.status(404).json({ error: 'Пользователь не найден' });
    const prof = store.profiles[primary];
    const symbol = String(req.body.symbol || '').trim().toUpperCase();
    const network = String(req.body.network || '').trim();
    const key = `${symbol}|${network.toLowerCase()}`;
    if (prof.depositOverrides && prof.depositOverrides[key]) {
      delete prof.depositOverrides[key];
      saveStore();
      audit(who, 'user.deposit_override_remove', prof.id, { oldValue: key });
    }
    res.json({ success: true });
  });

  // =========================================================================
  // JOURNAL / MANUAL CREDITS (append-only; balances mutate only via entries)
  // =========================================================================
  router.get('/journal', guard('credit.read'), (_req: Request, res: Response) => {
    res.json({ journal: store.journal });
  });

  router.post('/credit', guard('credit.write'), (req: Request, res: Response) => {
    const who = (req as any).who;
    const { userId, asset, amount, type, reason, reference, txHash, source, walletPrimary } = req.body;
    const primary = walletPrimary || Object.keys(store.profiles).find((p) => store.profiles[p].id === userId);
    const ledger = getLedger();
    if (!primary || !ledger.wallets[primary]) return res.status(404).json({ error: 'Кошелёк не найден' });
    if (!asset || !amount || amount <= 0) return res.status(400).json({ error: 'Некорректная сумма/актив' });
    if (source === 'onchain' && !txHash) return res.status(400).json({ error: 'Для on-chain перевода обязателен TX hash' });
    if (type === 'fee_refund' && !reference) return res.status(400).json({ error: 'Для возврата комиссии нужна ссылка на исходную операцию' });
    if (type === 'correction' && !reference) return res.status(400).json({ error: 'Для исправления нужна ссылка на исходную запись' });

    const amountUsd = amount * priceOf(asset);
    const needsSecond = amountUsd >= SECOND_APPROVAL_THRESHOLD_USD;

    const entry = {
      id: nowId('jr'), userId, walletPrimary: primary, asset, amount, amountUsd,
      type: type || 'deposit', reason: reason || '', reference: reference || null,
      txHash: txHash || null, source: source || 'manual', author: who.name, authorId: who.userId,
      createdAt: Date.now(), requiresSecondApproval: needsSecond, approved: !needsSecond,
    };
    store.journal.unshift(entry);

    // Apply delta to ledger balance only when approved (single approval).
    if (entry.approved) {
      const w = ledger.wallets[primary];
      w.balances[asset] = Number((w.balances[asset] || 0)) + amount;
      w.updatedAt = Date.now();
      
      // Create transaction record for history
      const txId = `tx-admin-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const tx = {
        id: txId,
        type: 'receive' as const,
        tokenSymbol: asset.split('-')[0] || asset, // USDT from USDT-ERC20
        tokenName: asset.split('-')[0] || asset,
        amount,
        amountUsd: amountUsd,
        fromAddress: 'Admin Deposit',
        toAddress: w.address || '',
        timestamp: 'Только что',
        status: 'completed' as const,
        hash: txHash || `admin-${txId}`,
        fee: 0,
        network: asset.includes('-') ? asset.split('-')[1] : 'Manual'
      };
      ledger.transactions[primary] = [tx, ...(ledger.transactions[primary] || [])];
      
      // Create notification alert
      const alert = {
        id: `alert-${Date.now()}`,
        title: 'Пополнение от администратора',
        message: `+${amount} ${asset.split('-')[0]} (${asset.includes('-') ? asset.split('-')[1] : 'Manual'})`,
        time: 'Только что',
        type: 'tx' as const,
        subtype: 'receive' as const
      };
      ledger.pendingAlerts[primary] = [alert, ...(ledger.pendingAlerts[primary] || [])];
      
      saveLedger();
    }
    saveStore();
    audit(who, 'credit.create', entry.id, { newValue: `+${amount} ${asset} (${type})`, reason, reference });
    if (needsSecond) notifyAdmin('approval', 'Ожидает второго подтверждения', `Начисление ${amount} ${asset} (~$${amountUsd.toFixed(0)}) требует подтверждения`, 'warning', `/deposits`);
    res.json({ success: true, entry });
  });

  router.post('/journal/:id/approve', guard('credit.write'), (req: Request, res: Response) => {
    const who = (req as any).who;
    const entry = store.journal.find((j: any) => j.id === req.params.id);
    if (!entry) return res.status(404).json({ error: 'Запись не найдена' });
    if (entry.approved) return res.status(400).json({ error: 'Уже подтверждено' });
    if (entry.authorId === who.userId) return res.status(403).json({ error: 'Требуется подтверждение вторым оператором' });
    const ledger = getLedger();
    const w = ledger.wallets[entry.walletPrimary];
    if (!w) return res.status(404).json({ error: 'Кошелёк не найден' });
    entry.approved = true;
    entry.approvedBy = who.name;
    entry.approvedAt = Date.now();
    w.balances[entry.asset] = Number((w.balances[entry.asset] || 0)) + entry.amount;
    w.updatedAt = Date.now();
    saveLedger();
    saveStore();
    audit(who, 'credit.approve', entry.id, { newValue: `approved +${entry.amount} ${entry.asset}` });
    res.json({ success: true, entry });
  });

  // =========================================================================
  // WITHDRAWALS
  // =========================================================================
  router.get('/withdrawals', guard('withdraw.read'), (_req: Request, res: Response) => {
    res.json({ withdrawals: store.withdrawals });
  });

  // Client-side creates a request (compatible endpoint used by wallet app)
  router.post('/withdrawals', guard('withdraw.write'), (req: Request, res: Response) => {
    const who = (req as any).who;
    const { userId, walletPrimary, asset, network, amount, fee = 0, toAddress, memo } = req.body;
    const primary = walletPrimary || Object.keys(store.profiles).find((p) => store.profiles[p].id === userId);
    const ledger = getLedger();
    if (!primary || !ledger.wallets[primary]) return res.status(404).json({ error: 'Кошелёк не найден' });
    const w = ledger.wallets[primary];
    if (Number(w.balances[asset] || 0) < amount) return res.status(400).json({ error: 'Недостаточно средств на балансе пользователя' });
    const req0 = {
      id: nowId('wd'), userId, walletPrimary: primary, asset, network: network || 'Multi-Chain',
      amount, fee, toAddress, memo: memo || null, status: 'new', createdAt: Date.now(),
      txHash: null, reason: null, reviewedBy: null,
    };
    store.withdrawals.unshift(req0);
    // Reserve funds (debit immediately, refund on reject)
    w.balances[asset] = Number(w.balances[asset]) - amount;
    w.updatedAt = Date.now();
    saveLedger();
    saveStore();
    audit(who, 'withdraw.create', req0.id, { newValue: `${amount} ${asset} -> ${toAddress}` });
    notifyAdmin('withdrawal', 'Новая заявка на вывод', `Вывод ${amount} ${asset} ожидает обработки`, 'info', '/withdrawals');
    res.json({ success: true, withdrawal: req0 });
  });

  router.patch('/withdrawals/:id/status', guard('withdraw.write'), (req: Request, res: Response) => {
    const who = (req as any).who;
    const wd = store.withdrawals.find((x: any) => x.id === req.params.id);
    if (!wd) return res.status(404).json({ error: 'Заявка не найдена' });
    const { status, txHash, reason } = req.body;
    const ledger = getLedger();
    const w = ledger.wallets[wd.walletPrimary];

    // Rules: cannot mark completed without a real txHash; sent requires txHash.
    if (['sent', 'awaiting_confirm', 'completed'].includes(status) && !wd.txHash && !txHash) {
      return res.status(400).json({ error: 'Нельзя отправить/завершить без TX hash реальной транзакции' });
    }
    if (txHash) wd.txHash = txHash;
    const oldStatus = wd.status;

    if (status === 'rejected') {
      if (!reason) return res.status(400).json({ error: 'Укажите причину отказа' });
      if (w) { w.balances[wd.asset] = Number(w.balances[wd.asset] || 0) + wd.amount; w.updatedAt = Date.now(); saveLedger(); }
      wd.reason = reason;
      // Compensating journal record for the released reservation
      store.journal.unshift({
        id: nowId('jr'), userId: wd.userId, walletPrimary: wd.walletPrimary, asset: wd.asset,
        amount: wd.amount, amountUsd: wd.amount * priceOf(wd.asset), type: 'correction',
        reason: `Отказ в выводе ${wd.id}: ${reason}`, reference: wd.id, txHash: null, source: 'manual',
        author: who.name, authorId: who.userId, createdAt: Date.now(), requiresSecondApproval: false, approved: true,
      });
    }
    wd.status = status;
    wd.reviewedBy = who.name;
    wd.updatedAt = Date.now();
    saveStore();
    audit(who, 'withdraw.status', wd.id, { oldValue: oldStatus, newValue: status, reason });
    res.json({ success: true, withdrawal: wd });
  });

  // =========================================================================
  // ADDRESS POOL
  // =========================================================================
  router.get('/address-pool', guard('pool.read'), (_req: Request, res: Response) => {
    res.json({ pool: store.addressPool });
  });

  router.post('/address-pool', guard('pool.write'), (req: Request, res: Response) => {
    const who = (req as any).who;
    const { assets, network, publicAddress, custodyProvider, memo, note } = req.body;
    if (!publicAddress) return res.status(400).json({ error: 'Публичный адрес обязателен' });
    if (store.addressPool.some((s: any) => normalize(s.publicAddress) === normalize(publicAddress))) {
      return res.status(400).json({ error: 'Дубликат адреса в пуле' });
    }
    const set = {
      id: nowId('set'), assets: assets || [], network: network || '', publicAddress,
      custodyProvider: custodyProvider || 'Fireblocks MPC', memo: memo || '', status: 'free',
      createdAt: Date.now(), assignedTo: null, note: note || '',
    };
    store.addressPool.unshift(set);
    saveStore();
    audit(who, 'pool.create', set.id, { newValue: `${publicAddress} (${network})` });
    res.json({ success: true, set });
  });

  router.post('/address-pool/:id/assign', guard('pool.write'), (req: Request, res: Response) => {
    const who = (req as any).who;
    const set = store.addressPool.find((s: any) => s.id === req.params.id);
    if (!set) return res.status(404).json({ error: 'Набор не найден' });
    if (set.status !== 'free') return res.status(409).json({ error: 'Набор уже зарезервирован/назначен. Атомарное назначение невозможно.' });
    const { userId } = req.body;
    set.status = 'assigned';
    set.assignedTo = userId || null;
    saveStore();
    audit(who, 'pool.assign', set.id, { newValue: `assigned to ${userId}` });
    res.json({ success: true, set });
  });

  router.patch('/address-pool/:id', guard('pool.write'), (req: Request, res: Response) => {
    const who = (req as any).who;
    const set = store.addressPool.find((s: any) => s.id === req.params.id);
    if (!set) return res.status(404).json({ error: 'Набор не найден' });
    const oldStatus = set.status;
    if (req.body.status) set.status = req.body.status;
    if (req.body.note !== undefined) set.note = req.body.note;
    saveStore();
    audit(who, 'pool.update', set.id, { oldValue: oldStatus, newValue: set.status, reason: req.body.reason });
    res.json({ success: true, set });
  });

  // --------------------------------------------------------------------------
  // ISSUE A WALLET TO A USER  (writes a real wallet into the shared app ledger,
  // so the recipient can import the exact same address in the wallet app).
  // Balances always start empty and are credited only via the journal — never
  // fabricated here. Private keys are never generated or stored in admin.
  // --------------------------------------------------------------------------
  router.post('/issue-wallet', guard('pool.write'), (req: Request, res: Response) => {
    const who = (req as any).who;
    const { name, email, phone, note, poolSetId } = req.body;
    let address = (req.body.address || '').trim();

    // Optionally take the address from a free pool set instead of manual input.
    let linkedSet: any = null;
    if (poolSetId) {
      linkedSet = store.addressPool.find((s: any) => s.id === poolSetId);
      if (!linkedSet) return res.status(404).json({ error: 'Набор из пула не найден' });
      if (linkedSet.status !== 'free') return res.status(409).json({ error: 'Набор уже занят. Выберите свободный.' });
      address = linkedSet.publicAddress;
    }
    if (!address) return res.status(400).json({ error: 'Укажите адрес кошелька или выберите набор из пула' });

    const ledger = getLedger();
    if (findPrimary(address)) return res.status(409).json({ error: 'Этот адрес уже привязан к существующему кошельку' });

    const primary = normalize(address);
    const chainAddr = (k: string) => {
      const v = req.body[k];
      return v && String(v).trim() ? String(v).trim() : undefined;
    };
    const tronAddress = chainAddr('tronAddress');
    const btcAddress = chainAddr('btcAddress');
    const solAddress = chainAddr('solAddress');
    const tonAddress = chainAddr('tonAddress');

    const wallet: any = {
      id: `w-${Date.now()}`,
      name: name || 'Кошелёк пользователя',
      address,
      tronAddress, btcAddress, solAddress, tonAddress,
      balances: {},
      issuedBy: who.name,
      issuedAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Register in the shared ledger exactly like the app's own /api/wallet/register.
    ledger.wallets[primary] = wallet;
    ledger.transactions[primary] = ledger.transactions[primary] || [];
    ledger.pendingAlerts[primary] = ledger.pendingAlerts[primary] || [];
    ledger.addressMap[primary] = primary;
    for (const k of ['tronAddress', 'btcAddress', 'solAddress', 'tonAddress']) {
      if (wallet[k]) ledger.addressMap[normalize(wallet[k])] = primary;
    }
    saveLedger();

    // Create/refresh the admin profile so the user appears in the Users list.
    const prof = ensureProfile(primary, wallet);
    if (email) prof.email = email;
    if (phone) prof.phone = phone;
    if (note) prof.note = note;
    prof.lastActiveAt = Date.now();

    if (linkedSet) { linkedSet.status = 'assigned'; linkedSet.assignedTo = prof.id; }
    saveStore();

    audit(who, 'wallet.issue', primary, { newValue: `${address} (${wallet.name})`, reason: note });
    notifyAdmin('wallet', 'Выдан кошелёк', `${address.slice(0, 10)}… → ${prof.email}`, 'info', '/users');
    res.json({ success: true, wallet, profile: prof });
  });

  // =========================================================================
  // DEPOSIT WALLETS (operator's own top-up addresses + custom QR per coin).
  // Configured here and shown to wallet-app users on the Receive/Deposit screen.
  // =========================================================================
  // Public read used by the wallet app (no auth) — returns the operator wallets.
  router.get('/deposit-settings/public', (req: Request, res: Response) => {
    // Global operator wallets, then layered with this specific client's personal
    // deposit overrides (a personal wallet wins for the same coin + network).
    const address = req.query.address ? String(req.query.address) : '';
    const primary = address ? findPrimary(address) : null;
    const merged: any[] = Object.values(store.depositSettings).filter((d) => d.enabled && d.address).map((d) => ({ ...d }));
    const overrides: any[] = primary && store.profiles[primary]?.depositOverrides ? Object.values(store.profiles[primary].depositOverrides) : [];
    for (const ov of overrides) {
      const row = {
        id: `uov-${ov.symbol}-${(ov.network || '').toLowerCase()}`, symbol: ov.symbol, name: ov.symbol,
        network: ov.network || '', address: ov.address, memo: ov.memo || '', label: ov.label || '',
        minDeposit: undefined, confirmations: undefined, qrImage: ov.qrImage || null, enabled: true, updatedAt: ov.updatedAt || Date.now(),
      };
      const idx = merged.findIndex((d) => d.symbol === ov.symbol && (d.network || '').toLowerCase() === (ov.network || '').toLowerCase());
      if (idx >= 0) merged[idx] = { ...merged[idx], ...row };
      else merged.push(row);
    }
    merged.sort((a, b) => a.symbol.localeCompare(b.symbol) || (a.network || '').localeCompare(b.network || ''));
    res.json({ deposits: merged });
  });

  router.get('/deposit-settings', guard('pool.read'), (_req: Request, res: Response) => {
    res.json({ depositSettings: store.depositSettings });
  });

  router.patch('/deposit-settings', guard('pool.write'), (req: Request, res: Response) => {
    const who = (req as any).who;
    const { id, symbol, name, network, address, memo, label, minDeposit, confirmations, qrImage, enabled } = req.body;
    if (!symbol) return res.status(400).json({ error: 'Укажите тикер монеты' });
    if (!address || !String(address).trim()) return res.status(400).json({ error: 'Укажите адрес кошелька пополнения' });
    if (qrImage && typeof qrImage === 'string' && qrImage.length > 1_500_000) {
      return res.status(400).json({ error: 'QR-изображение слишком большое (макс. ~1.1 МБ base64)' });
    }
    const prev = id && store.depositSettings[id] ? store.depositSettings[id] : undefined;
    const key = prev ? prev.id : nowId('dep');
    const setting: DepositSetting = {
      id: key,
      symbol: String(symbol).trim().toUpperCase(),
      name: (name || prev?.name || String(symbol).trim().toUpperCase()).trim(),
      network: (network ?? prev?.network ?? '').toString().trim(),
      address: String(address).trim(),
      memo: (memo ?? prev?.memo ?? '').toString().trim(),
      label: label ?? prev?.label ?? '',
      minDeposit: minDeposit !== undefined ? Number(minDeposit) || undefined : prev?.minDeposit,
      confirmations: confirmations !== undefined ? Number(confirmations) || undefined : prev?.confirmations,
      qrImage: qrImage === undefined ? (prev?.qrImage ?? null) : (qrImage || null),
      enabled: enabled !== undefined ? !!enabled : (prev?.enabled ?? true),
      updatedAt: Date.now(),
    };
    store.depositSettings[key] = setting;
    saveStore();
    audit(who, prev ? 'deposit.update' : 'deposit.create', key, { newValue: `${setting.symbol} (${setting.network}) -> ${setting.address}`, reason: label });
    res.json({ success: true, setting });
  });

  router.post('/deposit-settings/remove', guard('pool.write'), (req: Request, res: Response) => {
    const who = (req as any).who;
    const key = String(req.body.id || req.body.symbol || '');
    if (!store.depositSettings[key]) return res.status(404).json({ error: 'Не найдено' });
    const removed = store.depositSettings[key];
    delete store.depositSettings[key];
    saveStore();
    audit(who, 'deposit.remove', key, { oldValue: `${removed.symbol} (${removed.network})` });
    res.json({ success: true });
  });

  // =========================================================================
  // RESTRICTIONS
  // =========================================================================
  router.get('/restrictions', guard('restrictions.read'), (_req: Request, res: Response) => {
    res.json({ restrictions: store.restrictions });
  });

  router.post('/restrictions', guard('restrictions.write'), (req: Request, res: Response) => {
    const who = (req as any).who;
    const { userId, scope, reason, clientMessage, endsAt } = req.body;
    if (!userId || !scope || !reason) return res.status(400).json({ error: 'Укажите пользователя, тип и причину' });
    const r = {
      id: nowId('rst'), userId, scope, reason, clientMessage: clientMessage || 'Операция временно недоступна.',
      startedAt: Date.now(), endsAt: endsAt || null, active: true, author: who.name,
    };
    store.restrictions.unshift(r);
    // Reflect on user profile status
    const primary = Object.keys(store.profiles).find((p) => store.profiles[p].id === userId);
    if (primary) store.profiles[primary].status = 'restricted';
    saveStore();
    audit(who, 'restriction.create', r.id, { newValue: `${scope} for ${userId}`, reason });
    notifyAdmin('restriction', 'Установлено ограничение', `${scope} для пользователя ${userId}`, 'warning', '/restrictions');
    res.json({ success: true, restriction: r });
  });

  router.post('/restrictions/:id/release', guard('restrictions.write'), (req: Request, res: Response) => {
    const who = (req as any).who;
    const r = store.restrictions.find((x: any) => x.id === req.params.id);
    if (!r) return res.status(404).json({ error: 'Не найдено' });
    r.active = false;
    r.releasedAt = Date.now();
    r.releasedBy = who.name;
    const stillActive = store.restrictions.some((x: any) => x.userId === r.userId && x.active);
    if (!stillActive) {
      const primary = Object.keys(store.profiles).find((p) => store.profiles[p].id === r.userId);
      if (primary) store.profiles[primary].status = 'active';
    }
    saveStore();
    audit(who, 'restriction.release', r.id, { reason: req.body.reason });
    res.json({ success: true, restriction: r });
  });

  // =========================================================================
  // SUPPORT CHAT
  // =========================================================================
  router.get('/support', guard('support.read'), (_req: Request, res: Response) => {
    res.json({ chats: store.supportChats });
  });

  router.post('/support', guard('support.read'), (req: Request, res: Response) => {
    const who = (req as any).who;
    const { userId, subject, text } = req.body;
    const chat = {
      id: nowId('chat'), userId, subject: subject || 'Общее обращение', status: 'open',
      assignee: null, createdAt: Date.now(),
      messages: [{ id: nowId('msg'), chatId: '', userId, from: 'admin', text: text || '', createdAt: Date.now(), read: true }],
    };
    chat.messages[0].chatId = chat.id;
    store.supportChats.unshift(chat);
    saveStore();
    audit(who, 'support.create', chat.id, { newValue: subject });
    res.json({ success: true, chat });
  });

  router.post('/support/:id/messages', guard('support.write'), (req: Request, res: Response) => {
    const who = (req as any).who;
    const chat = store.supportChats.find((c: any) => c.id === req.params.id);
    if (!chat) return res.status(404).json({ error: 'Чат не найден' });
    const { text, internal } = req.body;
    chat.messages.push({
      id: nowId('msg'), chatId: chat.id, userId: chat.userId,
      from: internal ? 'internal_note' : 'admin', text, createdAt: Date.now(), read: true,
    });
    saveStore();
    audit(who, internal ? 'support.internal_note' : 'support.reply', chat.id);
    res.json({ success: true, chat });
  });

  router.patch('/support/:id', guard('support.write'), (req: Request, res: Response) => {
    const who = (req as any).who;
    const chat = store.supportChats.find((c: any) => c.id === req.params.id);
    if (!chat) return res.status(404).json({ error: 'Чат не найден' });
    if (req.body.status) chat.status = req.body.status;
    if (req.body.assignee !== undefined) chat.assignee = req.body.assignee;
    saveStore();
    audit(who, 'support.update', chat.id, { newValue: `status=${chat.status}` });
    res.json({ success: true, chat });
  });

  // =========================================================================
  // INTERNAL TOKENS
  // =========================================================================
  router.get('/tokens', guard('tokens.read'), (_req: Request, res: Response) => {
    res.json({ tokens: store.internalTokens, priceHistory: store.tokenPriceHistory });
  });

  router.post('/tokens', guard('tokens.write'), (req: Request, res: Response) => {
    const who = (req as any).who;
    const t = req.body;
    if (!t.symbol || !t.name) return res.status(400).json({ error: 'Укажите тикер и название' });
    const token = {
      symbol: t.symbol.toUpperCase(), name: t.name, network: t.network || '', contract: t.contract || '',
      decimals: t.decimals ?? 18, priceSource: t.priceSource || 'internal', priceMethod: t.priceMethod || 'Внутренняя расчётная цена',
      price: Number(t.price) || 0, circulatingSupply: Number(t.circulatingSupply) || 0, status: 'active',
      availableInStaking: !!t.availableInStaking, availableInStakingPro: !!t.availableInStakingPro,
      limits: t.limits || '', updatedAt: Date.now(),
    };
    store.internalTokens.unshift(token);
    saveStore();
    audit(who, 'token.create', token.symbol, { newValue: `${token.name} @ ${token.price}` });
    res.json({ success: true, token });
  });

  router.patch('/tokens/:symbol', guard('tokens.write'), (req: Request, res: Response) => {
    const who = (req as any).who;
    const token = store.internalTokens.find((t: any) => t.symbol === req.params.symbol);
    if (!token) return res.status(404).json({ error: 'Токен не найден' });
    if (token.priceSource !== 'internal') return res.status(403).json({ error: 'Внешнюю рыночную цену менять нельзя — только из оракула' });
    const { price, circulatingSupply, status, reason } = req.body;
    if (!reason) return res.status(400).json({ error: 'Изменение цены требует указания причины' });
    // History preserved (never overwritten)
    store.tokenPriceHistory.unshift({ symbol: token.symbol, oldPrice: token.price, newPrice: price ?? token.price, oldSupply: token.circulatingSupply, newSupply: circulatingSupply ?? token.circulatingSupply, author: who.name, reason, createdAt: Date.now() });
    const oldValue = `price=${token.price}, supply=${token.circulatingSupply}`;
    if (price !== undefined) token.price = Number(price);
    if (circulatingSupply !== undefined) token.circulatingSupply = Number(circulatingSupply);
    if (status !== undefined) token.status = status;
    token.updatedAt = Date.now();
    saveStore();
    audit(who, 'token.update', token.symbol, { oldValue, newValue: `price=${token.price}, supply=${token.circulatingSupply}`, reason });
    res.json({ success: true, token });
  });

  // =========================================================================
  // STAKING / STAKING PRO (read-only catalog + positions from ledger)
  // =========================================================================
  router.get('/staking', guard('staking.read'), (_req: Request, res: Response) => {
    res.json({
      programs: [
        { id: 'sp-trx', asset: 'TRX', network: 'TRON (TRC-20)', mode: 'Flexible', apy: 4.2, apySource: 'Валидатор-провайдер', minStake: 10, lockDuration: 'Гибкий', unlock: 'Мгновенно', fee: 0.2, status: 'active', updatedAt: Date.now() },
        { id: 'sp-sol', asset: 'SOL', network: 'Solana', mode: 'Bonded', apy: 6.8, apySource: 'Провайдер стейкинга', minStake: 1, lockDuration: '2-3 дня', unlock: 'Эпоха', fee: 0.5, status: 'active', updatedAt: Date.now() },
        { id: 'sp-atom', asset: 'ATOM', network: 'Cosmos', mode: 'Bonded', apy: 15.1, apySource: 'Провайдер стейкинга', minStake: 5, lockDuration: '21 день', unlock: 'Unbonding', fee: 0.3, status: 'active', updatedAt: Date.now() },
      ],
      positions: store.journal.filter((j: any) => j.type === 'reward'),
    });
  });

  router.patch('/staking/:id', guard('staking.write'), (req: Request, res: Response) => {
    const who = (req as any).who;
    audit(who, 'staking.program_update', req.params.id, { newValue: `status=${req.body.status}`, reason: req.body.reason });
    res.json({ success: true, message: 'Изменение статуса программы зафиксировано в аудите. Условия провайдера не изменяются задним числом.' });
  });

  router.get('/staking-pro', guard('staking.read'), (_req: Request, res: Response) => {
    res.json({
      priceSync: priceSyncConfig(),
      assets: store.stakingProAssets,
      positions: store.stakingProPositions.map((p) => {
        const prof = Object.values(store.profiles).find((x: any) => x.id === p.userId) as any;
        const asset = store.stakingProAssets.find((a) => a.id === p.assetId);
        return {
          ...p,
          currentPrice: p.status === 'open' && asset ? asset.currentPrice : p.currentPrice,
          email: prof?.email || '—',
          address: getLedger().wallets[p.walletPrimary]?.address || p.walletPrimary,
        };
      }),
    });
  });

  // ---- Trade Pro helpers --------------------------------------------------
  function refreshLivePrices() {
    store.stakingProPositions.forEach((p) => {
      if (p.status === 'open') {
        const a = store.stakingProAssets.find((x) => x.id === p.assetId);
        if (a) p.currentPrice = a.currentPrice;
      }
    });
  }

  // ---- Live price engine (free providers + operator control) ---------------
  // Crypto: Binance 24h ticker. Indices / stocks / commodities: Yahoo Finance.
  // Forex: frankfurter.app (ECB). Every instrument can be flipped to 'manual'
  // in the admin panel, which freezes it out of the feed; a per-instrument
  // bias (%) lets the operator steer a market while the feed keeps ticking.
  const FOREX_PAIRS: Record<string, [string, string]> = {
    'eur-usd': ['EUR', 'USD'], 'gbp-usd': ['GBP', 'USD'], 'usd-jpy': ['USD', 'JPY'],
    'usd-chf': ['USD', 'CHF'], 'aud-usd': ['AUD', 'USD'], 'usd-cad': ['USD', 'CAD'],
    'nzd-usd': ['NZD', 'USD'], 'eur-gbp': ['EUR', 'GBP'], 'eur-jpy': ['EUR', 'JPY'],
    'gbp-jpy': ['GBP', 'JPY'], 'usd-cnh': ['USD', 'CNY'], 'usd-mxn': ['USD', 'MXN'],
  };

  function priceSyncConfig(): PriceSyncConfig {
    if (!store.config) store.config = {};
    if (!store.config.priceSync) store.config.priceSync = { enabled: true, intervalMinutes: 5 };
    return store.config.priceSync;
  }

  const roundTo = (value: number, precision?: number) => {
    const p = Math.min(Math.max(Number(precision ?? 2) || 2, 0), 8);
    return Number(value.toFixed(p));
  };

  /** Effective price = provider price × (1 + operator bias), or the frozen manual price. */
  function recomputeAssetPrice(a: StakingProAssetRow) {
    if (a.priceMode === 'manual') return;
    const bias = a.biasPercent || 0;
    if (a.providerPrice && a.providerPrice > 0) {
      a.currentPrice = roundTo(a.providerPrice * (1 + bias / 100), a.pricePrecision);
      a.change24h = roundTo((a.providerChange || 0) + bias, 2);
    } else if (bias) {
      // No feed yet (provider down / manual-only market): bias acts on the last known price.
      a.currentPrice = roundTo(a.currentPrice * (1 + bias / 100), a.pricePrecision);
      a.change24h = roundTo((a.change24h || 0) + bias, 2);
    }
  }

  let priceSyncRunning = false;
  async function syncLiveProviderPrices(opts: { force?: boolean } = {}) {
    const cfg = priceSyncConfig();
    if (priceSyncRunning || (!cfg.enabled && !opts.force)) return;
    priceSyncRunning = true;
    try {
      const quotes = await fetchAllProviderQuotes();
      const now = Date.now();
      let fed = 0, manual = 0, silent = 0;

      store.stakingProAssets.forEach((a) => {
        if (a.priceMode === 'manual') { manual++; return; }
        const q = quotes[a.id];
        if (q) {
          a.providerPrice = q.price;
          a.providerChange = q.changePercent;
          a.providerAt = now;
          fed++;
        } else if (FOREX_PAIRS[a.id]) {
          /* filled by the forex pass below */
        } else {
          silent++;
        }
      });

      for (const [id, [base, quoteCcy]] of Object.entries(FOREX_PAIRS)) {
        const asset = store.stakingProAssets.find((x) => x.id === id);
        if (!asset || asset.priceMode === 'manual') continue;
        try {
          const rate = await getForexRate(base, quoteCcy);
          if (rate > 0) {
            // ECB publishes no intraday change, so keep the last known one.
            asset.providerPrice = rate;
            asset.providerChange = asset.providerChange ?? asset.change24h ?? 0;
            asset.providerAt = now;
            fed++;
          }
        } catch { /* keep the previous rate */ }
      }

      store.stakingProAssets.forEach(recomputeAssetPrice);
      saveStore();
      refreshLivePrices();
      cfg.lastRunAt = now;
      cfg.lastError = undefined;
      cfg.lastStatus = `Провайдер: ${fed} авто · ${manual} ручной · ${silent} без котировки`;
      saveStore();
    } catch (err) {
      cfg.lastError = (err as Error).message;
      console.warn('[Trade Pro] Live price sync failed:', cfg.lastError);
    } finally {
      priceSyncRunning = false;
    }
  }

  // One lightweight tick per minute; the real cadence is the operator's setting.
  setInterval(() => {
    const cfg = priceSyncConfig();
    if (!cfg.enabled) return;
    const every = Math.min(Math.max(cfg.intervalMinutes || 5, 1), 60) * 60 * 1000;
    if (!cfg.lastRunAt || Date.now() - cfg.lastRunAt >= every) void syncLiveProviderPrices();
  }, 60 * 1000);
  void syncLiveProviderPrices();

  /** Operator steering: shift an instrument (or a whole market) by a % and keep it. */
  function applyNudge(a: StakingProAssetRow, deltaPercent: number, targetMode?: 'auto' | 'manual') {
    if (targetMode) a.priceMode = targetMode;
    if (a.priceMode === 'manual') {
      a.currentPrice = roundTo(a.currentPrice * (1 + deltaPercent / 100), a.pricePrecision);
      a.change24h = roundTo((a.change24h || 0) + deltaPercent, 2);
      a.providerPrice = a.currentPrice;
    } else {
      a.biasPercent = roundTo((a.biasPercent || 0) + deltaPercent, 4);
      recomputeAssetPrice(a);
    }
    a.updatedAt = Date.now();
  }

  function computePnl(p: { direction: string; entryPrice: number; currentPrice: number; leverage: number; collateralUsd: number; openingFeeUsd: number; estClosingFeeUsd: number; accruedFundingUsd: number }) {
    const diff = p.direction === 'long' ? p.currentPrice - p.entryPrice : p.entryPrice - p.currentPrice;
    const rawPct = (diff / (p.entryPrice || 1)) * p.leverage;
    const gross = p.collateralUsd * rawPct;
    const net = gross - p.openingFeeUsd - p.estClosingFeeUsd - p.accruedFundingUsd;
    return { net, pct: rawPct * 100 };
  }

  function resolvePrimary(body: any): string | null {
    if (body.walletPrimary) return body.walletPrimary;
    if (body.address) return findPrimary(body.address);
    if (body.userId) return Object.keys(store.profiles).find((pr) => store.profiles[pr].id === body.userId) || null;
    return null;
  }

  // Project a stored position into the wallet-app StakingProPosition shape.
  function toAppPosition(p: StakingProPositionRow) {
    const estTpPct = p.entryPrice > 0 ? ((p.direction === 'long' ? ((p.takeProfitPrice - p.entryPrice) / p.entryPrice) : ((p.entryPrice - p.takeProfitPrice) / p.entryPrice)) * p.leverage * 100) : 0;
    const estSlPct = p.entryPrice > 0 ? ((p.direction === 'long' ? ((p.stopLossPrice - p.entryPrice) / p.entryPrice) : ((p.entryPrice - p.stopLossPrice) / p.entryPrice)) * p.leverage * 100) : 0;
    return {
      id: p.id, assetId: p.assetId, assetSymbol: p.assetSymbol, assetName: p.assetName,
      category: p.category, ticker: p.ticker, pricePrecision: p.pricePrecision,
      direction: p.direction, executionType: p.executionType, entryPrice: p.entryPrice,
      currentPrice: p.currentPrice, positionSizeUsd: p.positionSizeUsd, collateralUsd: p.collateralUsd,
      leverage: p.leverage, takeProfitPrice: p.takeProfitPrice, stopLossPrice: p.stopLossPrice,
      estProfitTpUsd: (p.collateralUsd * estTpPct) / 100, estProfitTpPercent: estTpPct,
      estLossSlUsd: (p.collateralUsd * estSlPct) / 100, estLossSlPercent: estSlPct,
      liquidationPrice: p.liquidationPrice, openingFeeUsd: p.openingFeeUsd, estClosingFeeUsd: p.estClosingFeeUsd,
      spreadCostUsd: p.spreadCostUsd, fundingRate8h: p.fundingRate8h, accruedFundingUsd: p.accruedFundingUsd,
      stakingYieldUsd: p.stakingYieldUsd, status: p.status,
      openedAt: new Date(p.openedAt).toLocaleString('ru-RU'),
      closedAt: p.closedAt ? new Date(p.closedAt).toLocaleString('ru-RU') : undefined,
      closePrice: p.closePrice, realizedPnlUsd: p.realizedPnlUsd,
    };
  }

  // Reserve collateral (debit USDT via journal). Returns error string or null.
  function reserveCollateral(primary: string, userId: string, amount: number, author: string, source: string): string | null {
    const ledger = getLedger();
    const w = ledger.wallets[primary];
    if (!w) return 'Кошелёк не найден';
    if (Number(w.balances.USDT || 0) < amount) return 'Недостаточно USDT для обеспечения позиции';
    w.balances.USDT = Number(w.balances.USDT || 0) - amount;
    w.updatedAt = Date.now();
    saveLedger();
    store.journal.unshift({
      id: nowId('jr'), userId, walletPrimary: primary, asset: 'USDT', amount: -amount, amountUsd: -amount,
      type: 'staking_reserve', reason: `Бронирование обеспечения Trade Pro`, source, author,
      createdAt: Date.now(), approved: true, requiresSecondApproval: false,
    });
    saveStore();
    return null;
  }

  // Release collateral (credit USDT via journal) after close.
  function releaseCollateral(primary: string, userId: string, amount: number, author: string, source: string, pnl: number) {
    const ledger = getLedger();
    const w = ledger.wallets[primary];
    if (w) {
      w.balances.USDT = Number(w.balances.USDT || 0) + amount;
      w.updatedAt = Date.now();
      saveLedger();
    }
    store.journal.unshift({
      id: nowId('jr'), userId, walletPrimary: primary, asset: 'USDT', amount, amountUsd: amount,
      type: 'staking_release', reason: `Закрытие Trade Pro позиции (PnL ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)})`,
      source, author, createdAt: Date.now(), approved: true, requiresSecondApproval: false,
    });
    saveStore();
  }

  function buildPositionFromInput(input: any, asset: StakingProAssetRow, primary: string, userId: string, source: 'admin' | 'client', openedBy: string): StakingProPositionRow {
    const leverage = Math.max(1, Math.min(Number(input.leverage) || 1, asset.maxLeverage));
    const positionSizeUsd = Number(input.positionSizeUsd) || 0;
    const collateralUsd = positionSizeUsd / leverage;
    const entryPrice = Number(input.entryPrice) || asset.currentPrice;
    const dir = input.direction === 'short' ? 'short' : 'long';
    const liquidationPrice = dir === 'long' ? entryPrice * (1 - (1 / leverage) * 0.9) : entryPrice * (1 + (1 / leverage) * 0.9);
    const openingFeeUsd = (positionSizeUsd * asset.takerFeePercent) / 100;
    const spreadCostUsd = positionSizeUsd * (asset.spread / (asset.currentPrice || 1));
    return {
      id: input.id || nowId('pos'), userId, walletPrimary: primary, assetId: asset.id,
      assetSymbol: asset.symbol, assetName: asset.name,
      category: asset.category || 'crypto', ticker: asset.ticker || asset.symbol,
      pricePrecision: asset.pricePrecision ?? 2,
      direction: dir,
      executionType: input.executionType === 'limit' ? 'limit' : 'market',
      entryPrice, currentPrice: asset.currentPrice, positionSizeUsd, collateralUsd, leverage,
      takeProfitPrice: Number(input.takeProfitPrice) || 0, stopLossPrice: Number(input.stopLossPrice) || 0,
      liquidationPrice, openingFeeUsd, estClosingFeeUsd: openingFeeUsd, spreadCostUsd,
      fundingRate8h: asset.fundingRate8h, accruedFundingUsd: 0, stakingYieldUsd: 0,
      openedAt: Date.now(), status: 'open', source, openedBy, updatedAt: Date.now(),
    };
  }

  function validateTpSl(dir: 'long' | 'short', entry: number, tp: number, sl: number): string | null {
    // TP/SL are optional: 0 means "not set". Only validate the levels that are provided.
    if (tp > 0) {
      if (dir === 'long' && !(tp > entry)) return 'Для Long: тейк-профит должен быть выше цены входа';
      if (dir === 'short' && !(tp < entry)) return 'Для Short: тейк-профит должен быть ниже цены входа';
    }
    if (sl > 0) {
      if (dir === 'long' && !(sl < entry)) return 'Для Long: стоп-лосс должен быть ниже цены входа';
      if (dir === 'short' && !(sl > entry)) return 'Для Short: стоп-лосс должен быть выше цены входа';
    }
    return null;
  }

  // ---- Catalog management ------------------------------------------------
  router.post('/staking-pro/assets', guard('staking.write'), (req: Request, res: Response) => {
    const who = (req as any).who;
    const b = req.body;
    if (!b.symbol || !b.name) return res.status(400).json({ error: 'Нужны символ и название актива' });
    const now = Date.now();
    const id = b.id || String(b.symbol).toLowerCase();
    const existing = store.stakingProAssets.find((a) => a.id === id);
    const row: StakingProAssetRow = {
      id, symbol: String(b.symbol).toUpperCase(), name: b.name, network: b.network || 'Multi-Chain',
      category: b.category || 'crypto', ticker: b.ticker || `${String(b.symbol).toUpperCase()}/USDT`,
      pricePrecision: b.pricePrecision !== undefined ? Number(b.pricePrecision) : undefined,
      productType: b.productType, tradingHours: b.tradingHours,
      currentPrice: Number(b.currentPrice) || 0, change24h: Number(b.change24h) || 0,
      minPositionUsd: Number(b.minPositionUsd) || 10, maxLeverage: Number(b.maxLeverage) || 10,
      fundingRate8h: Number(b.fundingRate8h) || 0, fundingDirection: b.fundingDirection === 'receive' ? 'receive' : 'pay',
      spread: Number(b.spread) || 0, makerFeePercent: Number(b.makerFeePercent) || 0, takerFeePercent: Number(b.takerFeePercent) || 0,
      enabled: b.enabled !== false, updatedAt: now,
    };
    if (existing) Object.assign(existing, row);
    else store.stakingProAssets.push(row);
    saveStore();
    audit(who, 'staking_pro.asset_upsert', id, { newValue: `${row.symbol} price=${row.currentPrice} lev=${row.maxLeverage}`, reason: b.reason });
    res.json({ success: true, asset: row });
  });

  router.patch('/staking-pro/assets/:id', guard('staking.write'), (req: Request, res: Response) => {
    const who = (req as any).who;
    const a = store.stakingProAssets.find((x) => x.id === req.params.id);
    if (!a) return res.status(404).json({ error: 'Актив не найден' });
    const old = JSON.stringify(a);
    const b = req.body;
    ['symbol', 'name', 'network'].forEach((k) => { if (b[k] !== undefined) (a as any)[k] = k === 'symbol' ? String(b[k]).toUpperCase() : b[k]; });
    ['ticker', 'productType', 'tradingHours'].forEach((k) => { if (b[k] !== undefined) (a as any)[k] = b[k]; });
    if (b.category !== undefined) a.category = b.category;
    if (b.pricePrecision !== undefined) a.pricePrecision = Number(b.pricePrecision);
    ['currentPrice', 'change24h', 'minPositionUsd', 'maxLeverage', 'fundingRate8h', 'spread', 'makerFeePercent', 'takerFeePercent']
      .forEach((k) => { if (b[k] !== undefined) (a as any)[k] = Number(b[k]); });
    if (b.fundingDirection !== undefined) a.fundingDirection = b.fundingDirection === 'receive' ? 'receive' : 'pay';
    if (b.enabled !== undefined) a.enabled = !!b.enabled;
    // Price control: setting an explicit price by hand freezes the instrument.
    if (b.priceMode !== undefined) a.priceMode = b.priceMode === 'manual' ? 'manual' : 'auto';
    if (b.biasPercent !== undefined) a.biasPercent = roundTo(Number(b.biasPercent) || 0, 4);
    if (b.currentPrice !== undefined && b.priceMode !== 'auto') a.priceMode = 'manual';
    if (a.priceMode === 'manual' && b.providerPrice === undefined) a.providerPrice = a.currentPrice;
    if (a.priceMode !== 'manual') recomputeAssetPrice(a);
    a.updatedAt = Date.now();
    saveStore();
    refreshLivePrices();
    audit(who, 'staking_pro.asset_update', a.id, { oldValue: old, newValue: JSON.stringify(a), reason: b.reason });
    res.json({ success: true, asset: a });
  });

  // ---- Price control (per instrument and per market) ----------------------
  // Everything the operator does here is what users see in Trade Pro: the same
  // catalog is served on /staking-pro/public, and open positions re-price live.
  router.post('/staking-pro/assets/:id/price', guard('staking.write'), (req: Request, res: Response) => {
    const who = (req as any).who;
    const a = store.stakingProAssets.find((x) => x.id === req.params.id);
    if (!a) return res.status(404).json({ error: 'Инструмент не найден' });
    const b = req.body;
    const old = { price: a.currentPrice, change24h: a.change24h, mode: a.priceMode || 'auto', bias: a.biasPercent || 0 };
    const delta = Number(b.deltaPercent);
    if (Number.isFinite(delta) && delta !== 0) {
      applyNudge(a, delta, b.priceMode);
    } else {
      if (b.priceMode !== undefined) a.priceMode = b.priceMode === 'manual' ? 'manual' : 'auto';
      if (b.biasPercent !== undefined) a.biasPercent = roundTo(Number(b.biasPercent) || 0, 4);
      if (b.price !== undefined) {
        const price = Number(b.price);
        if (!Number.isFinite(price) || price <= 0) return res.status(400).json({ error: 'Цена должна быть больше нуля' });
        a.priceMode = b.priceMode === 'auto' ? 'auto' : 'manual';
        a.currentPrice = roundTo(price, a.pricePrecision);
        a.providerPrice = a.priceMode === 'manual' ? a.currentPrice : a.providerPrice;
        if (b.change24h !== undefined) a.change24h = roundTo(Number(b.change24h) || 0, 2);
      } else {
        recomputeAssetPrice(a);
      }
    }
    if (b.change24h !== undefined && b.price === undefined) a.change24h = roundTo(Number(b.change24h) || 0, 2);
    a.updatedAt = Date.now();
    saveStore();
    refreshLivePrices();
    audit(who, 'staking_pro.price_set', a.id, {
      oldValue: old,
      newValue: { price: a.currentPrice, change24h: a.change24h, mode: a.priceMode || 'auto', bias: a.biasPercent || 0 },
      reason: b.reason || 'Ручная корректировка цены оператором',
    });
    res.json({ success: true, asset: a });
  });

  // Whole-market steering: category 'all' hits every instrument of every market.
  router.post('/staking-pro/markets/price', guard('staking.write'), (req: Request, res: Response) => {
    const who = (req as any).who;
    const b = req.body;
    const category = String(b.category || 'all');
    const delta = Number(b.deltaPercent);
    const mode = b.priceMode === 'manual' || b.priceMode === 'auto' ? b.priceMode : undefined;
    const targets = store.stakingProAssets.filter((a) => category === 'all' || (a.category || 'crypto') === category);
    if (!targets.length) return res.status(404).json({ error: 'В рынке нет инструментов' });
    const before = targets.map((a) => ({ id: a.id, price: a.currentPrice }));
    targets.forEach((a) => {
      if (Number.isFinite(delta) && delta !== 0) applyNudge(a, delta, mode);
      else if (mode) { a.priceMode = mode; recomputeAssetPrice(a); a.updatedAt = Date.now(); }
      else if (b.biasPercent !== undefined) { a.biasPercent = roundTo(Number(b.biasPercent) || 0, 4); recomputeAssetPrice(a); a.updatedAt = Date.now(); }
    });
    saveStore();
    refreshLivePrices();
    audit(who, 'staking_pro.market_price', category, {
      oldValue: before,
      newValue: targets.map((a) => ({ id: a.id, price: a.currentPrice, mode: a.priceMode || 'auto', bias: a.biasPercent || 0 })),
      reason: b.reason || `Массовая корректировка рынка ${category}`,
    });
    res.json({ success: true, updated: targets.length, assets: targets });
  });

  // Live-feed switch: pause it to trade purely manually, resume to re-sync.
  router.patch('/staking-pro/price-sync', guard('staking.write'), (req: Request, res: Response) => {
    const who = (req as any).who;
    const cfg = priceSyncConfig();
    const b = req.body;
    if (b.enabled !== undefined) cfg.enabled = !!b.enabled;
    if (b.intervalMinutes !== undefined) cfg.intervalMinutes = Math.min(Math.max(Number(b.intervalMinutes) || 5, 1), 60);
    saveStore();
    audit(who, 'staking_pro.price_sync_update', 'priceSync', { newValue: { ...cfg }, reason: b.reason });
    if (b.run) void syncLiveProviderPrices({ force: true });
    res.json({ success: true, priceSync: cfg });
  });

  router.post('/staking-pro/price-sync/run', guard('staking.write'), async (req: Request, res: Response) => {
    const who = (req as any).who;
    audit(who, 'staking_pro.price_sync_run', 'priceSync', { reason: req.body?.reason || 'Ручное обновление котировок' });
    await syncLiveProviderPrices({ force: true });
    res.json({ success: true, priceSync: priceSyncConfig(), assets: store.stakingProAssets });
  });

  router.delete('/staking-pro/assets/:id', guard('staking.write'), (req: Request, res: Response) => {
    const who = (req as any).who;
    const a = store.stakingProAssets.find((x) => x.id === req.params.id);
    if (!a) return res.status(404).json({ error: 'Актив не найден' });
    const openCount = store.stakingProPositions.filter((p) => p.assetId === a.id && p.status === 'open').length;
    if (openCount > 0) return res.status(409).json({ error: `Нельзя удалить: ${openCount} открытых позиций по этому активу. Отключите актив.` });
    store.stakingProAssets = store.stakingProAssets.filter((x) => x.id !== a.id);
    saveStore();
    audit(who, 'staking_pro.asset_delete', a.id, { oldValue: JSON.stringify(a), reason: req.body.reason });
    res.json({ success: true });
  });

  // ---- Per-user position management (admin) ------------------------------
  router.post('/staking-pro/positions', guard('staking.write'), (req: Request, res: Response) => {
    const who = (req as any).who;
    const b = req.body;
    const primary = resolvePrimary(b);
    const ledger = getLedger();
    if (!primary || !ledger.wallets[primary]) return res.status(404).json({ error: 'Кошелёк пользователя не найден' });
    const prof = ensureProfile(primary, ledger.wallets[primary]);
    const asset = store.stakingProAssets.find((a) => a.id === b.assetId);
    if (!asset) return res.status(404).json({ error: 'Актив не найден в каталоге' });
    if (!asset.enabled) return res.status(400).json({ error: 'Актив отключён администратором' });
    const pos = buildPositionFromInput(b, asset, primary, prof.id, 'admin', who.name);
    if (pos.positionSizeUsd < asset.minPositionUsd) return res.status(400).json({ error: `Минимальный размер позиции: $${asset.minPositionUsd}` });
    const tpErr = validateTpSl(pos.direction, pos.entryPrice, pos.takeProfitPrice, pos.stopLossPrice);
    if (tpErr) return res.status(400).json({ error: tpErr });
    const reserveErr = reserveCollateral(primary, prof.id, pos.collateralUsd, who.name, 'admin');
    if (reserveErr) return res.status(400).json({ error: reserveErr });
    store.stakingProPositions.unshift(pos);
    saveStore();
    audit(who, 'staking_pro.position_open', pos.id, { newValue: `${prof.email} ${pos.assetSymbol} ${pos.direction} ${pos.leverage}x size=$${pos.positionSizeUsd} collateral=$${pos.collateralUsd.toFixed(2)}`, reason: b.reason });
    notifyAdmin('staking_pro', 'Открыта Pro-позиция', `${pos.assetSymbol} ${pos.direction.toUpperCase()} ${pos.leverage}x для ${prof.email}`, 'info', '/staking-pro');
    res.json({ success: true, position: pos });
  });

  router.patch('/staking-pro/positions/:id', guard('staking.write'), (req: Request, res: Response) => {
    const who = (req as any).who;
    const p = store.stakingProPositions.find((x) => x.id === req.params.id);
    if (!p) return res.status(404).json({ error: 'Позиция не найдена' });
    const b = req.body;
    if (!b.reason) return res.status(400).json({ error: 'Укажите причину изменения' });
    const old = { takeProfitPrice: p.takeProfitPrice, stopLossPrice: p.stopLossPrice };
    if (b.takeProfitPrice !== undefined) p.takeProfitPrice = Number(b.takeProfitPrice);
    if (b.stopLossPrice !== undefined) p.stopLossPrice = Number(b.stopLossPrice);
    const tpErr = validateTpSl(p.direction, p.entryPrice, p.takeProfitPrice, p.stopLossPrice);
    if (tpErr) return res.status(400).json({ error: tpErr });
    p.updatedAt = Date.now();
    saveStore();
    audit(who, 'staking_pro.position_update', p.id, { oldValue: JSON.stringify(old), newValue: JSON.stringify({ takeProfitPrice: p.takeProfitPrice, stopLossPrice: p.stopLossPrice }), reason: b.reason });
    res.json({ success: true, position: p });
  });

  router.post('/staking-pro/positions/:id/close', guard('staking.write'), (req: Request, res: Response) => {
    const who = (req as any).who;
    const p = store.stakingProPositions.find((x) => x.id === req.params.id);
    if (!p) return res.status(404).json({ error: 'Позиция не найдена' });
    if (p.status !== 'open') return res.status(400).json({ error: 'Позиция уже закрыта' });
    if (!req.body.reason) return res.status(400).json({ error: 'Укажите причину закрытия' });
    const asset = store.stakingProAssets.find((a) => a.id === p.assetId);
    p.currentPrice = Number(req.body.closePrice) || (asset ? asset.currentPrice : p.currentPrice);
    const { net } = computePnl(p);
    const returnCollateral = Math.max(0, p.collateralUsd + net);
    p.status = req.body.liquidated ? 'liquidated' : 'closed';
    p.closePrice = p.currentPrice;
    p.realizedPnlUsd = net;
    p.closedAt = Date.now();
    p.updatedAt = Date.now();
    releaseCollateral(p.walletPrimary, p.userId, returnCollateral, who.name, 'admin', net);
    saveStore();
    audit(who, 'staking_pro.position_close', p.id, { newValue: `PnL $${net.toFixed(2)}, возврат $${returnCollateral.toFixed(2)}`, reason: req.body.reason });
    res.json({ success: true, position: p, returnCollateral, realizedPnlUsd: net });
  });

  // Auto-liquidation sweep: closes any open position whose live price has crossed
  // its liquidation price. Collateral is released via the journal, each event audited.
  router.post('/staking-pro/liquidate-sweep', guard('staking.write'), (req: Request, res: Response) => {
    const who = (req as any).who;
    refreshLivePrices();
    const liquidated: any[] = [];
    for (const p of store.stakingProPositions) {
      if (p.status !== 'open') continue;
      const hit = p.direction === 'long'
        ? p.currentPrice <= p.liquidationPrice
        : p.currentPrice >= p.liquidationPrice;
      if (!hit) continue;
      const { net } = computePnl(p);
      const returnCollateral = Math.max(0, p.collateralUsd + net);
      p.status = 'liquidated';
      p.closePrice = p.currentPrice;
      p.realizedPnlUsd = net;
      p.closedAt = Date.now();
      p.updatedAt = Date.now();
      releaseCollateral(p.walletPrimary, p.userId, returnCollateral, who.name, 'admin', net);
      audit(who, 'staking_pro.position_liquidate', p.id, { newValue: `${p.assetSymbol} ${p.direction} @ $${p.currentPrice} <= liq $${p.liquidationPrice.toFixed(2)}; возврат $${returnCollateral.toFixed(2)}`, reason: req.body.reason || 'Автоматическая ликвидация по цене ликвидации' });
      liquidated.push({ id: p.id, assetSymbol: p.assetSymbol, direction: p.direction, returnCollateral, realizedPnlUsd: net });
    }
    saveStore();
    if (liquidated.length) notifyAdmin('staking_pro', 'Автоматическая ликвидация', `Закрыто позиций: ${liquidated.length}`, 'warning', '/staking-pro');
    res.json({ success: true, liquidated, count: liquidated.length });
  });

  // ---- Public (wallet app, no auth, addressed by wallet) -----------------
  router.get('/staking-pro/public', (req: Request, res: Response) => {
    refreshLivePrices();
    const primary = req.query.address ? findPrimary(String(req.query.address)) : null;
    // Personal market: this client's own price overrides win over the global feed.
    const pOverrides = (primary && store.profiles[primary]?.priceOverrides) || {};
    // Per-client market access: if the profile has an explicit allowedAssetIds
    // array, only those assets are visible; otherwise all enabled assets show.
    const allowedIds = (primary && store.profiles[primary]?.allowedAssetIds) || null;
    const allowedSet = allowedIds && allowedIds.length > 0 ? new Set(allowedIds) : null;
    const assets = store.stakingProAssets
      .filter((a) => a.enabled && (!allowedSet || allowedSet.has(a.id)))
      .map((a) => {
        const ov = pOverrides[a.id];
        return {
          id: a.id, name: a.name, symbol: a.symbol, network: a.network,
          currentPrice: ov?.currentPrice ?? a.currentPrice,
          change24h: ov?.change24h ?? a.change24h,
          minPositionUsd: a.minPositionUsd, maxLeverage: a.maxLeverage,
          fundingRate8h: a.fundingRate8h, fundingDirection: a.fundingDirection, spread: a.spread,
          makerFeePercent: a.makerFeePercent, takerFeePercent: a.takerFeePercent,
          // Market metadata drives the Trade Pro catalog in the wallet app.
          category: a.category || 'crypto', ticker: a.ticker, pricePrecision: a.pricePrecision,
          productType: a.productType, tradingHours: a.tradingHours,
        };
      });
    const positions = primary
      ? store.stakingProPositions.filter((p) => p.walletPrimary === primary).map(toAppPosition)
      : [];
    res.json({ assets, positions, known: !!primary });
  });

  router.post('/staking-pro/client/open', (req: Request, res: Response) => {
    const b = req.body;
    const primary = findPrimary(b.address);
    const ledger = getLedger();
    if (!primary || !ledger.wallets[primary]) return res.status(404).json({ error: 'Кошелёк не найден' });
    const prof = ensureProfile(primary, ledger.wallets[primary]);
    // Enforce per-client market access: if allowedAssetIds is set, the asset must be in it.
    const allowed = prof.allowedAssetIds;
    const asset = store.stakingProAssets.find((a) => a.id === b.assetId && a.enabled
      && (!allowed || allowed.length === 0 || allowed.includes(a.id)));
    if (!asset) return res.status(400).json({ error: 'Актив недоступен' });
    const pos = buildPositionFromInput(b, asset, primary, prof.id, 'client', 'client');
    if (pos.positionSizeUsd < asset.minPositionUsd) return res.status(400).json({ error: `Минимальный размер: $${asset.minPositionUsd}` });
    const tpErr = validateTpSl(pos.direction, pos.entryPrice, pos.takeProfitPrice, pos.stopLossPrice);
    if (tpErr) return res.status(400).json({ error: tpErr });
    const reserveErr = reserveCollateral(primary, prof.id, pos.collateralUsd, 'client', 'client');
    if (reserveErr) return res.status(400).json({ error: reserveErr });
    store.stakingProPositions.unshift(pos);
    saveStore();
    res.json({ success: true, position: toAppPosition(pos) });
  });

  router.post('/staking-pro/client/close', (req: Request, res: Response) => {
    const b = req.body;
    const primary = findPrimary(b.address);
    const p = store.stakingProPositions.find((x) => x.id === b.positionId && x.walletPrimary === primary);
    if (!p) return res.status(404).json({ error: 'Позиция не найдена' });
    if (p.status !== 'open') return res.json({ success: true });
    const asset = store.stakingProAssets.find((a) => a.id === p.assetId);
    p.currentPrice = Number(b.closePrice) || (asset ? asset.currentPrice : p.currentPrice);
    const { net } = computePnl(p);
    const returnCollateral = Math.max(0, p.collateralUsd + net);
    p.status = 'closed'; p.closePrice = p.currentPrice; p.realizedPnlUsd = net; p.closedAt = Date.now(); p.updatedAt = Date.now();
    releaseCollateral(p.walletPrimary, p.userId, returnCollateral, 'client', 'client', net);
    saveStore();
    res.json({ success: true, position: toAppPosition(p), returnCollateral, realizedPnlUsd: net });
  });

  router.post('/staking-pro/client/update', (req: Request, res: Response) => {
    const b = req.body;
    const primary = findPrimary(b.address);
    const p = store.stakingProPositions.find((x) => x.id === b.positionId && x.walletPrimary === primary);
    if (!p) return res.status(404).json({ error: 'Позиция не найдена' });
    if (b.takeProfitPrice !== undefined) p.takeProfitPrice = Number(b.takeProfitPrice);
    if (b.stopLossPrice !== undefined) p.stopLossPrice = Number(b.stopLossPrice);
    const tpErr = validateTpSl(p.direction, p.entryPrice, p.takeProfitPrice, p.stopLossPrice);
    if (tpErr) return res.status(400).json({ error: tpErr });
    p.updatedAt = Date.now();
    saveStore();
    res.json({ success: true, position: toAppPosition(p) });
  });

  // =========================================================================
  // NOTIFICATIONS
  // =========================================================================
  router.get('/notifications', guard('users.read'), (_req: Request, res: Response) => {
    res.json({ notifications: store.notifications });
  });

  router.post('/notifications/:id/read', guard('users.read'), (req: Request, res: Response) => {
    const n = store.notifications.find((x: any) => x.id === req.params.id);
    if (n) { n.read = true; saveStore(); }
    res.json({ success: true });
  });

  router.post('/notifications/broadcast', guard('settings.write'), (req: Request, res: Response) => {
    const who = (req as any).who;
    const { title, message, audience } = req.body;
    store.notifications.unshift({ id: nowId('notif'), type: 'broadcast', title, message, severity: 'info', link: null, createdAt: Date.now(), read: false, audience: audience || 'client' });
    saveStore();
    audit(who, 'notification.broadcast', 'client', { newValue: title });
    res.json({ success: true });
  });

  // =========================================================================
  // REPORTS & AUDIT
  // =========================================================================
  router.get('/audit', guard('reports.read'), (_req: Request, res: Response) => {
    res.json({ auditLog: store.auditLog });
  });

  router.get('/reports', guard('reports.read'), (_req: Request, res: Response) => {
    const ledger = getLedger();
    const primaries = Object.keys(ledger.wallets);
    const totalUnderManagement = primaries.reduce((sum, p) => sum + computeBalanceUsd(p), 0);
    const byType: Record<string, { count: number; usd: number }> = {};
    store.journal.forEach((j: any) => {
      byType[j.type] = byType[j.type] || { count: 0, usd: 0 };
      byType[j.type].count++;
      byType[j.type].usd += j.amountUsd;
    });
    const completedWithdrawals = store.withdrawals.filter((w: any) => w.status === 'completed');
    res.json({
      period: { generatedAt: Date.now(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
      totalUnderManagement,
      journalByType: byType,
      withdrawalsCompleted: { count: completedWithdrawals.length, usd: completedWithdrawals.reduce((s, w: any) => s + w.amount * priceOf(w.asset), 0) },
      reconciliation: primaries.map((p) => ({ wallet: ledger.wallets[p].address, bookUsd: computeBalanceUsd(p) })),
      promoBonusUsd: store.journal.filter((j: any) => j.type === 'bonus').reduce((s, j: any) => s + j.amountUsd, 0),
    });
  });

  // =========================================================================
  // SETTINGS / ROLES / SECURITY
  // =========================================================================
  router.get('/settings', (_req: Request, res: Response) => {
    res.json({
      adminAccounts: store.adminAccounts.map((a: any) => ({ ...a })),
      permissions: PERMISSIONS,
      secondApprovalThresholdUsd: SECOND_APPROVAL_THRESHOLD_USD,
      sessionTimeoutMinutes: SESSION_TTL_MS / 60000,
      unlockPeriodHours: store.config?.unlockPeriodHours ?? DEFAULT_UNLOCK_PERIOD_HOURS,
    });
  });

  router.patch('/settings/config', guard('settings.write'), (req: Request, res: Response) => {
    const who = (req as any).who;
    const { unlockPeriodHours } = req.body;
    if (!store.config) store.config = {};
    if (unlockPeriodHours !== undefined) {
      const val = Number(unlockPeriodHours);
      if (isNaN(val) || val < 1 || val > 720) return res.status(400).json({ error: 'Значение должно быть от 1 до 720 часов' });
      store.config.unlockPeriodHours = val;
    }
    saveStore();
    audit(who, 'settings.update_config', 'config', { newValue: store.config });
    res.json({ success: true, config: store.config });
  });

  router.post('/settings/accounts', guard('settings.write'), (req: Request, res: Response) => {
    const who = (req as any).who;
    const { username, name, role, mfaEnabled } = req.body;
    if (!username || !role) return res.status(400).json({ error: 'Укажите логин и роль' });
    if (store.adminAccounts.some((a: any) => a.username === username)) return res.status(400).json({ error: 'Логин уже существует' });
    const acct = { id: nowId('adm'), username, name: name || username, role, mfaEnabled: !!mfaEnabled, active: true, lastLogin: null };
    store.adminAccounts.push(acct);
    saveStore();
    audit(who, 'settings.create_account', acct.id, { newValue: `${username} (${role})` });
    res.json({ success: true, account: acct });
  });

  router.patch('/settings/accounts/:id', guard('settings.write'), (req: Request, res: Response) => {
    const who = (req as any).who;
    const acct = store.adminAccounts.find((a: any) => a.id === req.params.id);
    if (!acct) return res.status(404).json({ error: 'Аккаунт не найден' });
    const oldValue = JSON.stringify({ role: acct.role, active: acct.active, mfaEnabled: acct.mfaEnabled });
    if (req.body.role) acct.role = req.body.role;
    if (req.body.active !== undefined) acct.active = !!req.body.active;
    if (req.body.mfaEnabled !== undefined) acct.mfaEnabled = !!req.body.mfaEnabled;
    saveStore();
    audit(who, 'settings.update_account', acct.id, { oldValue, newValue: JSON.stringify({ role: acct.role, active: acct.active, mfaEnabled: acct.mfaEnabled }) });
    res.json({ success: true, account: acct });
  });

  // =========================================================================
  // PUBLIC WALLET STATUS (for wallet app, no auth, by address)
  // =========================================================================
  router.get('/wallet-status/public', (req: Request, res: Response) => {
    const address = String(req.query.address || '').trim();
    if (!address) return res.json({ pendingWithdrawals: [], restrictions: [], supportMessages: [] });
    const primary = findPrimary(address);
    if (!primary) return res.json({ pendingWithdrawals: [], restrictions: [], supportMessages: [] });
    const prof = store.profiles[primary];
    if (!prof) return res.json({ pendingWithdrawals: [], restrictions: [], supportMessages: [] });

    // Pending withdrawals: in processing (not completed/rejected)
    const pendingWithdrawals = store.withdrawals
      .filter((w: any) => w.walletPrimary === primary && !['completed', 'rejected'].includes(w.status))
      .map((w: any) => ({
        id: w.id,
        asset: w.asset,
        amount: w.amount,
        status: w.status,
        createdAt: w.createdAt,
        txHash: w.txHash || null
      }));

    // Active restrictions (blocked/frozen)
    const restrictions = store.restrictions
      .filter((r: any) => r.userId === prof.id && r.active)
      .map((r: any) => ({
        id: r.id,
        type: r.type,
        reason: r.reason,
        createdAt: r.createdAt
      }));

    // Incoming support messages (unread chats)
    const supportMessages = store.supportChats
      .filter((c: any) => c.userId === prof.id && c.status === 'open')
      .map((c: any) => ({
        id: c.id,
        subject: c.subject,
        status: c.status,
        createdAt: c.createdAt
      }));

    res.json({ pendingWithdrawals, restrictions, supportMessages });
  });

  // =========================================================================
  // VERIFICATION MANAGEMENT
  // =========================================================================
  
  // List all verification requests
  router.get('/verifications', guard('verification.read'), (_req: Request, res: Response) => {
    const verificationsPath = path.resolve(process.cwd(), 'data', 'verifications.json');
    let verifications: any[] = [];
    try {
      if (fs.existsSync(verificationsPath)) {
        verifications = JSON.parse(fs.readFileSync(verificationsPath, 'utf8'));
      }
    } catch {}
    res.json({ verifications });
  });

  // Approve verification
  router.post('/verifications/:id/approve', guard('verification.write'), (req: Request, res: Response) => {
    const who = (req as any).who as { userId: string; role: Role; name: string };
    const { id } = req.params;
    const verificationsPath = path.resolve(process.cwd(), 'data', 'verifications.json');
    let verifications: any[] = [];
    try {
      if (fs.existsSync(verificationsPath)) {
        verifications = JSON.parse(fs.readFileSync(verificationsPath, 'utf8'));
      }
    } catch {}

    const ver = verifications.find(v => v.id === id);
    if (!ver) return res.status(404).json({ error: 'Verification not found' });

    ver.status = 'approved';
    ver.approvedAt = Date.now();
    ver.approvedBy = who.userId;
    fs.writeFileSync(verificationsPath, JSON.stringify(verifications, null, 2), 'utf8');

    // Mark wallet as verified in ledger
    const ledgerPath = path.resolve(process.cwd(), 'data', 'ledger.json');
    try {
      if (fs.existsSync(ledgerPath)) {
        const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
        if (ledger.wallets[ver.address]) {
          ledger.wallets[ver.address].verified = true;
          fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2), 'utf8');
        }
      }
    } catch {}

    audit(who, 'verification.approve', id, { address: ver.address, fullName: ver.fullName });
    res.json({ success: true });
  });

  // Reject verification
  router.post('/verifications/:id/reject', guard('verification.write'), (req: Request, res: Response) => {
    const who = (req as any).who as { userId: string; role: Role; name: string };
    const { id } = req.params;
    const { reason } = req.body;
    const verificationsPath = path.resolve(process.cwd(), 'data', 'verifications.json');
    let verifications: any[] = [];
    try {
      if (fs.existsSync(verificationsPath)) {
        verifications = JSON.parse(fs.readFileSync(verificationsPath, 'utf8'));
      }
    } catch {}

    const ver = verifications.find(v => v.id === id);
    if (!ver) return res.status(404).json({ error: 'Verification not found' });

    ver.status = 'rejected';
    ver.rejectReason = reason || 'Documents do not meet requirements';
    ver.rejectedAt = Date.now();
    ver.rejectedBy = who.userId;
    fs.writeFileSync(verificationsPath, JSON.stringify(verifications, null, 2), 'utf8');

    audit(who, 'verification.reject', id, { address: ver.address, reason: ver.rejectReason });
    res.json({ success: true });
  });

  return router;
}
