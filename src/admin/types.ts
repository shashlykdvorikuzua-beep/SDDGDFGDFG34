// Shared types for the VaultSpring Wallet admin panel.

export type Role = 'super_admin' | 'finance_ops' | 'support' | 'risk_compliance' | 'auditor';

export interface AdminAccount {
  id: string;
  username: string;
  name: string;
  role: Role;
  mfaEnabled: boolean;
  active: boolean;
  lastLogin: number | null;
}

export interface UserProfile {
  id: string;
  walletPrimary: string;
  email: string;
  phone: string;
  address: string;
  status: 'active' | 'restricted' | 'pending' | 'blocked';
  kycStatus: 'none' | 'pending' | 'verified' | 'rejected';
  createdAt: number;
  lastActiveAt: number;
  balanceUsd: number;
  assetCount: number;
  openWithdrawals: number;
}

export interface UserDetail {
  profile: any;
  wallet: { address: string; tronAddress?: string; btcAddress?: string; solAddress?: string; tonAddress?: string };
  assets: { symbol: string; amount: number; price: number; valueUsd: number; reserved: number; available: number }[];
  balanceUsd: number;
  reservedUsd: number;
  journal: JournalEntry[];
  transactions: any[];
  restrictions: Restriction[];
  chats: { id: string; subject: string; status: string }[];
  // Per-client control (set from the admin panel for this wallet only).
  priceOverrides: Record<string, { currentPrice?: number; change24h?: number }>;
  depositOverrides: Record<string, ClientDepositOverride>;
  marketAssets: { id: string; name: string; symbol: string; network: string; category: string; currentPrice: number; change24h: number; pricePrecision?: number }[];
  coinOptions: string[];
  operatorDeposits: { symbol: string; network: string; address: string; memo?: string; label?: string; qrImage: string | null }[];
  // Per-client market access: null/undefined = all enabled assets, array = only these asset IDs.
  allowedAssetIds?: string[] | null;
}

export interface ClientDepositOverride {
  symbol: string;
  network: string;
  address: string;
  memo?: string;
  label?: string;
  qrImage: string | null;
  updatedAt: number;
}

export interface JournalEntry {
  id: string;
  userId: string;
  walletPrimary: string;
  asset: string;
  amount: number;
  amountUsd: number;
  type: 'deposit' | 'bonus' | 'reward' | 'fee_refund' | 'compensation' | 'correction' | 'withdrawal' | 'other';
  reason: string;
  reference: string | null;
  txHash: string | null;
  source: 'onchain' | 'manual';
  author: string;
  createdAt: number;
  requiresSecondApproval: boolean;
  approved: boolean;
  approvedBy?: string;
}

export type WithdrawalStatus =
  | 'new' | 'review' | 'awaiting_send' | 'sent' | 'awaiting_confirm' | 'completed' | 'rejected' | 'error';

export interface Withdrawal {
  id: string;
  userId: string;
  walletPrimary: string;
  asset: string;
  network: string;
  amount: number;
  fee: number;
  toAddress: string;
  memo: string | null;
  status: WithdrawalStatus;
  createdAt: number;
  txHash: string | null;
  reason: string | null;
  reviewedBy: string | null;
}

export interface AddressPoolSet {
  id: string;
  assets: string[];
  network: string;
  publicAddress: string;
  custodyProvider: string;
  memo: string;
  status: 'free' | 'reserved' | 'assigned' | 'disabled' | 'needs_review';
  createdAt: number;
  assignedTo: string | null;
  note: string;
}

export interface Restriction {
  id: string;
  userId: string;
  scope: 'deposit' | 'withdrawal' | 'staking' | 'staking_pro' | 'swap' | 'login' | 'review';
  reason: string;
  clientMessage: string;
  startedAt: number;
  endsAt: number | null;
  active: boolean;
  author: string;
}

export interface SupportMessage {
  id: string;
  chatId: string;
  userId: string;
  from: 'client' | 'admin' | 'internal_note';
  text: string;
  createdAt: number;
  read: boolean;
}

export interface SupportChat {
  id: string;
  userId: string;
  subject: string;
  status: 'open' | 'pending' | 'closed';
  assignee: string | null;
  createdAt: number;
  messages: SupportMessage[];
}

export interface InternalToken {
  symbol: string;
  name: string;
  network: string;
  contract: string;
  decimals: number;
  priceSource: 'internal' | 'oracle';
  priceMethod: string;
  price: number;
  circulatingSupply: number;
  status: 'active' | 'paused';
  availableInStaking: boolean;
  availableInStakingPro: boolean;
  limits: string;
  updatedAt: number;
}

export interface AuditEntry {
  id: string;
  actor: string;
  role: Role;
  action: string;
  object: string;
  reason: string | null;
  oldValue: string | null;
  newValue: string | null;
  reference: string | null;
  createdAt: number;
}

export interface AdminNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  link: string | null;
  createdAt: number;
  read: boolean;
  audience: string;
}

export interface DashboardData {
  cards: { totalUsers: number; active: number; restricted: number; newRegs: number };
  queues: { pendingWithdrawals: number; pendingDeposits: number; openChats: number };
  summary: { totalUnderManagement: number; stakingPositions: number; openProPositions: number };
  recentEvents: AuditEntry[];
  integrationErrors: AdminNotification[];
}

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'Super Admin',
  finance_ops: 'Finance / Operations',
  support: 'Support',
  risk_compliance: 'Risk / Compliance',
  auditor: 'Read-only Auditor',
};
