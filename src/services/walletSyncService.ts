import { Token, Transaction, WalletAccount, AppNotification } from '../types/wallet';

export interface TransferRequest {
  fromAddress: string;
  toAddress: string;
  symbol: string;
  network: string;
  amount: number;
  fee?: number;
  tokenName?: string;
  price?: number;
  balanceKey?: string;
}

export interface SyncResponse {
  success: boolean;
  exists: boolean;
  balances: Record<string, number>;
  transactions: Transaction[];
  alerts: AppNotification[];
}

// Play authentic subtle incoming transfer sound via Web Audio API
export function playChimeSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'triangle';

    osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5

    osc2.frequency.setValueAtTime(880, ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.18); // D6

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start();
    osc2.start();
    osc1.stop(ctx.currentTime + 0.35);
    osc2.stop(ctx.currentTime + 0.35);
  } catch {
    // Audio context may not be allowed before user interaction
  }
}

// Register wallet with server ledger
export async function registerWalletWithServer(
  wallet: WalletAccount,
  tokens: Token[]
): Promise<Record<string, number> | null> {
  try {
    const res = await fetch('/api/wallet/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: wallet.id,
        name: wallet.name,
        address: wallet.address,
        tronAddress: wallet.tronAddress,
        initialTokens: tokens.map((t) => ({ 
          symbol: t.symbol, 
          balance: t.balance,
          balanceKey: t.balanceKey || t.symbol
        }))
      })
    });
    if (res.ok) {
      const data = await res.json();
      return data.balances || null;
    }
  } catch (err) {
    console.warn('Backend wallet register error:', err);
  }
  return null;
}

// Poll server for transfers and new balances
export async function syncWalletWithServer(
  wallet: WalletAccount
): Promise<SyncResponse | null> {
  try {
    const params = new URLSearchParams({
      address: wallet.address || '',
      tronAddress: wallet.tronAddress || ''
    });
    const res = await fetch(`/api/wallet/sync?${params.toString()}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    // Backend may be booting
  }
  return null;
}

// Send real peer-to-peer transfer to another user
export async function executePeerTransfer(
  transfer: TransferRequest
): Promise<{ success: boolean; error?: string; transaction?: Transaction; senderBalances?: Record<string, number> }> {
  try {
    const res = await fetch('/api/transfer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transfer)
    });
    const data = await res.json();
    if (res.ok && data.success) {
      return {
        success: true,
        transaction: data.transaction,
        senderBalances: data.senderBalances
      };
    }
    return {
      success: false,
      error: data.error || 'Ошибка при выполнении перевода'
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Ошибка подключения к серверу'
    };
  }
}

// Request test funds (faucet) for testing peer transfers
export async function requestTestFaucetFunds(
  address: string,
  symbol: string = 'USDT',
  amount: number = 250
): Promise<{ success: boolean; balances?: Record<string, number>; transaction?: Transaction }> {
  try {
    const res = await fetch('/api/faucet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, symbol, amount })
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Faucet request failed:', err);
  }
  return { success: false };
}
