/**
 * Shared utilities for VaultSpring Wallet.
 *
 * Centralises formatting, hash generation, clipboard helpers,
 * and domain constants that were previously copy-pasted across
 * the client and the server.
 */

// ---------------------------------------------------------------------------
// Domain constants
// ---------------------------------------------------------------------------

export const UNLOCK_PERIOD_MS = 48 * 60 * 60 * 1000;
export const UNLOCK_PERIOD_HOURS = 48;

export const PRICE_POLL_INTERVAL_MS = 20_000;
export const WALLET_SYNC_INTERVAL_MS = 3_000;
export const VERIFICATION_POLL_INTERVAL_MS = 60_000;

export const DEFAULT_PIN = '123456';

export const FALLBACK_ADDRESSES = {
  tron: 'TYDZSxdvjW6H8HkWtK5J92mNqP7rS8tVwX',
  btc: 'bc1q9v8h2e4w9s3z7p5m1k6j8d4l9n2c3v5t7',
  sol: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
  ton: 'EQBvW8m53GoU-VuznDBqCDWxdvcU-e2Yp7Qf8x3_tJ7y1ton',
} as const;

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

export function formatUsd(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '$0.00';
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  return value.toFixed(2);
}

export function shortAddress(addr: string, head = 6, tail = 4): string {
  if (!addr) return '';
  if (addr.length <= head + tail + 3) return addr;
  return `${addr.slice(0, head)}...${addr.slice(-tail)}`;
}

export function relativeTime(input: Date | number | string): string {
  if (typeof input === 'string') return input;
  const ts = typeof input === 'number' ? input : input.getTime();
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'Только что';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} мин назад`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} ч назад`;
  return new Date(ts).toLocaleDateString('ru-RU');
}

// ---------------------------------------------------------------------------
// Hash / ID generation
// ---------------------------------------------------------------------------

export function generateTxHash(): string {
  const chars = '0123456789abcdef';
  let hash = '0x';
  for (let i = 0; i < 40; i++) {
    hash += chars[Math.floor(Math.random() * 16)];
  }
  return hash;
}

export function generateId(prefix = 'id'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
}

// ---------------------------------------------------------------------------
// Clipboard
// ---------------------------------------------------------------------------

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Address helpers
// ---------------------------------------------------------------------------

export function normalizeAddress(addr: string | undefined | null): string {
  return (addr ?? '').trim().toLowerCase();
}

export function detectNetwork(address: string): string {
  const a = address.trim();
  if (a.startsWith('0x')) return 'EVM';
  if (a.startsWith('T') && a.length === 34) return 'TRON';
  if (a.startsWith('bc1') || a.startsWith('1') || a.startsWith('3')) return 'Bitcoin';
  if (a.length === 43 || a.length === 44) return 'Solana';
  if (a.startsWith('EQ') || a.startsWith('UQ')) return 'TON';
  return 'Unknown';
}

// ---------------------------------------------------------------------------
// Misc
// ---------------------------------------------------------------------------

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}