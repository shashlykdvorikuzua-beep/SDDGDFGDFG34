import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { createAdminRouter } from './adminRouter';

const app = express();
app.use(express.json());

// Persistent ledger file path
const LEDGER_FILE = path.resolve(process.cwd(), 'data', 'ledger.json');

interface StoredWallet {
  id: string;
  name: string;
  address: string;
  tronAddress?: string;
  btcAddress?: string;
  solAddress?: string;
  tonAddress?: string;
  balances: Record<string, number>; // symbol -> balance amount
  updatedAt: number;
}

interface StoredTransaction {
  id: string;
  type: 'send' | 'receive' | 'swap' | 'stake' | 'faucet';
  tokenSymbol: string;
  tokenName: string;
  amount: number;
  amountUsd: number;
  fromAddress: string;
  toAddress: string;
  timestamp: string;
  status: 'completed' | 'pending' | 'failed';
  hash: string;
  fee: number;
  network: string;
}

interface PendingAlert {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'tx' | 'reward';
  subtype?: 'send' | 'receive';
}

interface LedgerData {
  wallets: Record<string, StoredWallet>; // primaryAddress -> StoredWallet
  addressMap: Record<string, string>; // any address (EVM, TRON, BTC, SOL) -> primaryAddress
  transactions: Record<string, StoredTransaction[]>; // primaryAddress -> txs
  pendingAlerts: Record<string, PendingAlert[]>; // primaryAddress -> alerts
}

// Load or initialize ledger
let ledger: LedgerData = {
  wallets: {},
  addressMap: {},
  transactions: {},
  pendingAlerts: {}
};

try {
  if (fs.existsSync(LEDGER_FILE)) {
    const raw = fs.readFileSync(LEDGER_FILE, 'utf8');
    ledger = JSON.parse(raw);
  }
} catch (err) {
  console.warn('Could not read existing ledger.json, starting fresh:', err);
}

const saveLedger = () => {
  try {
    fs.writeFileSync(LEDGER_FILE, JSON.stringify(ledger, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save ledger.json:', err);
  }
};

// Helper: Normalize address to match case-insensitively or formatted
function normalizeAddress(addr: string): string {
  if (!addr) return '';
  return addr.trim().toLowerCase();
}

function findPrimaryAddress(inputAddress: string): string | null {
  if (!inputAddress) return null;
  const norm = normalizeAddress(inputAddress);
  // Direct match
  if (ledger.addressMap[norm]) {
    return ledger.addressMap[norm];
  }
  // Search wallets
  for (const [primary, w] of Object.entries(ledger.wallets)) {
    if (normalizeAddress(w.address) === norm) return primary;
    if (w.tronAddress && normalizeAddress(w.tronAddress) === norm) return primary;
    if (w.btcAddress && normalizeAddress(w.btcAddress) === norm) return primary;
    if (w.solAddress && normalizeAddress(w.solAddress) === norm) return primary;
    if (w.tonAddress && normalizeAddress(w.tonAddress) === norm) return primary;
  }
  return null;
}

// API: Register or refresh a wallet
app.post('/api/wallet/register', (req, res) => {
  const { id, name, address, tronAddress, btcAddress, solAddress, tonAddress, initialTokens } = req.body;
  if (!address) {
    return res.status(400).json({ error: 'Missing wallet address' });
  }

  const primary = normalizeAddress(address);
  let wallet = ledger.wallets[primary];

  if (!wallet) {
    // New wallet starts with 0.00 balances
    const initialBalances: Record<string, number> = {};
    if (Array.isArray(initialTokens)) {
      initialTokens.forEach((t: any) => {
        // Use balanceKey if provided (e.g., USDT-ERC20), otherwise fall back to symbol
        const key = t.balanceKey || t.symbol;
        if (key) {
          initialBalances[key] = Number(t.balance) || 0;
        }
      });
    }

    wallet = {
      id: id || `w-${Date.now()}`,
      name: name || 'Основной кошелек',
      address,
      tronAddress: tronAddress || 'TYDZSxdvjW6H8HkWtK5J92mNqP7rS8tVwX',
      btcAddress: btcAddress || 'bc1q9v8h2e4w9s3z7p5m1k6j8d4l9n2c3v5t7',
      solAddress: solAddress || '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
      tonAddress: tonAddress || 'EQBvW8m53GoU-VuznDBqCDWxdvcU-e2Yp7Qf8x3_tJ7y1ton',
      balances: initialBalances,
      updatedAt: Date.now()
    };
    ledger.wallets[primary] = wallet;
    ledger.transactions[primary] = ledger.transactions[primary] || [];
    ledger.pendingAlerts[primary] = ledger.pendingAlerts[primary] || [];
  } else {
    // Update metadata if changed
    if (name) wallet.name = name;
    if (tronAddress) wallet.tronAddress = tronAddress;
    wallet.updatedAt = Date.now();
  }

  // Update address mappings
  ledger.addressMap[normalizeAddress(wallet.address)] = primary;
  if (wallet.tronAddress) ledger.addressMap[normalizeAddress(wallet.tronAddress)] = primary;
  if (wallet.btcAddress) ledger.addressMap[normalizeAddress(wallet.btcAddress)] = primary;
  if (wallet.solAddress) ledger.addressMap[normalizeAddress(wallet.solAddress)] = primary;
  if (wallet.tonAddress) ledger.addressMap[normalizeAddress(wallet.tonAddress)] = primary;

  saveLedger();

  return res.json({
    success: true,
    wallet,
    balances: wallet.balances,
    transactions: ledger.transactions[primary] || []
  });
});

// API: Sync wallet state (poll for new transfers and balance updates)
app.get('/api/wallet/sync', (req, res) => {
  const address = req.query.address as string;
  const tronAddress = req.query.tronAddress as string;

  if (!address && !tronAddress) {
    return res.status(400).json({ error: 'Address required' });
  }

  const primary = findPrimaryAddress(address) || findPrimaryAddress(tronAddress) || (address ? normalizeAddress(address) : '');
  if (!primary || !ledger.wallets[primary]) {
    return res.json({
      success: true,
      exists: false,
      balances: {},
      transactions: [],
      alerts: []
    });
  }

  const wallet = ledger.wallets[primary];
  const txs = ledger.transactions[primary] || [];
  const alerts = ledger.pendingAlerts[primary] || [];

  // Clear delivered alerts
  ledger.pendingAlerts[primary] = [];
  saveLedger();

  return res.json({
    success: true,
    exists: true,
    balances: wallet.balances,
    transactions: txs,
    alerts
  });
});

// API: Peer-to-Peer Transfer between users
app.post('/api/transfer', (req, res) => {
  const { fromAddress, toAddress, symbol, network, amount, fee = 0, tokenName = symbol, price = 1, balanceKey } = req.body;

  if (!fromAddress || !toAddress || !symbol || !amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid transfer parameters' });
  }

  const senderPrimary = findPrimaryAddress(fromAddress) || normalizeAddress(fromAddress);
  let senderWallet = ledger.wallets[senderPrimary];

  if (!senderWallet) {
    // Register sender on the fly
    senderWallet = {
      id: `w-${Date.now()}`,
      name: 'Sender Wallet',
      address: fromAddress,
      balances: {},
      updatedAt: Date.now()
    };
    ledger.wallets[senderPrimary] = senderWallet;
    ledger.addressMap[normalizeAddress(fromAddress)] = senderPrimary;
  }

  // Use balanceKey if provided (e.g., USDT-TRC20), otherwise fall back to symbol
  const assetKey = balanceKey || symbol;
  const currentSenderBal = senderWallet.balances[assetKey] || 0;
  if (currentSenderBal < amount) {
    return res.status(400).json({
      error: `Недостаточно средств. Ваш баланс ${currentSenderBal.toFixed(4)} ${symbol}, а вы пытаетесь отправить ${amount} ${symbol}`
    });
  }

  // Deduct from sender using balanceKey
  senderWallet.balances[assetKey] = Math.max(0, currentSenderBal - amount);
  senderWallet.updatedAt = Date.now();

  const txHash = '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  const nowStr = 'Только что';

  // Sender transaction record
  const senderTx: StoredTransaction = {
    id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    type: 'send',
    tokenSymbol: symbol,
    tokenName: tokenName || symbol,
    amount,
    amountUsd: amount * price,
    fromAddress,
    toAddress,
    timestamp: nowStr,
    status: 'pending',
    hash: txHash,
    fee,
    network: network || 'Multi-Chain'
  };

  ledger.transactions[senderPrimary] = [senderTx, ...(ledger.transactions[senderPrimary] || [])];

  // Credit recipient (if recipient exists on server)
  const recipientPrimary = findPrimaryAddress(toAddress);
  let recipientCredited = false;

  if (recipientPrimary && ledger.wallets[recipientPrimary]) {
    const recipientWallet = ledger.wallets[recipientPrimary];
    const prevRecBal = recipientWallet.balances[assetKey] || 0;
    recipientWallet.balances[assetKey] = prevRecBal + amount;
    recipientWallet.updatedAt = Date.now();

    // Recipient transaction record
    const recipientTx: StoredTransaction = {
      id: `tx-in-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: 'receive',
      tokenSymbol: symbol,
      tokenName: tokenName || symbol,
      amount,
      amountUsd: amount * price,
      fromAddress,
      toAddress,
      timestamp: nowStr,
      status: 'completed',
      hash: txHash,
      fee: 0,
      network: network || 'Multi-Chain'
    };

    ledger.transactions[recipientPrimary] = [recipientTx, ...(ledger.transactions[recipientPrimary] || [])];

    // Push notification alert for recipient
    const shortSender = fromAddress.length > 10 ? `${fromAddress.slice(0, 6)}...${fromAddress.slice(-4)}` : fromAddress;
    const alert: PendingAlert = {
      id: `alert-${Date.now()}`,
      title: 'Входящий перевод получен!',
      message: `+${amount} ${symbol} от ${shortSender} (${network})`,
      time: nowStr,
      type: 'tx',
      subtype: 'receive'
    };
    ledger.pendingAlerts[recipientPrimary] = [alert, ...(ledger.pendingAlerts[recipientPrimary] || [])];
    recipientCredited = true;
  }

  saveLedger();

  return res.json({
    success: true,
    recipientCredited,
    senderBalances: senderWallet.balances,
    transaction: senderTx
  });
});

// API: Swap tokens
app.post('/api/swap', (req, res) => {
  const { address, fromSymbol, toSymbol, fromAmount, toAmount, fromPrice, toPrice, fee = 0, fromBalanceKey, toBalanceKey, network } = req.body;

  if (!address || !fromSymbol || !toSymbol || !fromAmount || fromAmount <= 0) {
    return res.status(400).json({ error: 'Invalid swap parameters' });
  }

  const primary = findPrimaryAddress(address) || normalizeAddress(address);
  let wallet = ledger.wallets[primary];

  if (!wallet) {
    return res.status(404).json({ error: 'Wallet not found' });
  }

  const fromKey = fromBalanceKey || fromSymbol;
  const toKey = toBalanceKey || toSymbol;

  const currentFromBal = wallet.balances[fromKey] || 0;
  if (currentFromBal < fromAmount) {
    return res.status(400).json({
      error: `Недостаточно средств. Ваш баланс ${currentFromBal.toFixed(4)} ${fromSymbol}, а вы пытаетесь обменять ${fromAmount} ${fromSymbol}`
    });
  }

  // Deduct from token
  wallet.balances[fromKey] = Math.max(0, currentFromBal - fromAmount);
  
  // Add to token
  const currentToBal = wallet.balances[toKey] || 0;
  wallet.balances[toKey] = currentToBal + toAmount;
  wallet.updatedAt = Date.now();

  const txHash = '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  const nowStr = 'Только что';

  const swapTx: StoredTransaction = {
    id: `tx-swap-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    type: 'swap',
    tokenSymbol: `${fromSymbol} → ${toSymbol}`,
    tokenName: 'DEX Swap',
    amount: fromAmount,
    amountUsd: fromAmount * (fromPrice || 1),
    fromAddress: address,
    toAddress: 'Vaultspring Smart Router V4',
    timestamp: nowStr,
    status: 'completed',
    hash: txHash,
    fee,
    network: network || 'Multi-Chain'
  };

  ledger.transactions[primary] = [swapTx, ...(ledger.transactions[primary] || [])];
  saveLedger();

  return res.json({
    success: true,
    balances: wallet.balances,
    transaction: swapTx
  });
});

// Mount admin panel API (shares the same ledger for full compatibility)
app.use('/api/admin', createAdminRouter(() => ledger, saveLedger));

// API: Faucet to request test coins for experimenting
app.post('/api/faucet', (req, res) => {
  const { address, symbol = 'USDT', amount = 100 } = req.body;
  if (!address) return res.status(400).json({ error: 'Address required' });

  const primary = findPrimaryAddress(address) || normalizeAddress(address);
  let wallet = ledger.wallets[primary];

  if (!wallet) {
    wallet = {
      id: `w-${Date.now()}`,
      name: 'Основной кошелек',
      address,
      balances: {},
      updatedAt: Date.now()
    };
    ledger.wallets[primary] = wallet;
    ledger.addressMap[normalizeAddress(address)] = primary;
  }

  const prevBal = wallet.balances[symbol] || 0;
  wallet.balances[symbol] = prevBal + Number(amount);
  wallet.updatedAt = Date.now();

  const txHash = '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  const faucetTx: StoredTransaction = {
    id: `tx-faucet-${Date.now()}`,
    type: 'faucet',
    tokenSymbol: symbol,
    tokenName: symbol,
    amount: Number(amount),
    amountUsd: Number(amount),
    fromAddress: 'VaultSpring Official Testnet Faucet',
    toAddress: address,
    timestamp: 'Только что',
    status: 'completed',
    hash: txHash,
    fee: 0,
    network: 'Multi-Chain Faucet'
  };

  ledger.transactions[primary] = [faucetTx, ...(ledger.transactions[primary] || [])];
  saveLedger();

  return res.json({
    success: true,
    balances: wallet.balances,
    transaction: faucetTx
  });
});

// App config endpoint (unlock period, etc.)
app.get('/api/config', (_req, res) => {
  const storePath = path.resolve(process.cwd(), 'data', 'admin-store.json');
  let unlockPeriodHours = 48;
  try {
    if (fs.existsSync(storePath)) {
      const store = JSON.parse(fs.readFileSync(storePath, 'utf8'));
      if (store.config?.unlockPeriodHours) {
        unlockPeriodHours = store.config.unlockPeriodHours;
      }
    }
  } catch {}
  res.json({ unlockPeriodHours });
});

// Start server and mount Vite
async function startServer() {
  const isProduction = fs.existsSync(path.resolve(process.cwd(), 'dist'));

  if (isProduction) {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get(['/admin', '/admin.html'], (_req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'admin.html'));
    });
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false, allowedHosts: true },
      appType: 'spa'
    });
    // Serve the admin panel entry through Vite's HTML transform pipeline.
    app.get(['/admin', '/admin.html'], async (_req, res, next) => {
      try {
        const html = await vite.transformIndexHtml('/admin.html', fs.readFileSync(path.resolve(process.cwd(), 'admin.html'), 'utf8'));
        res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
      } catch (e) {
        next(e);
      }
    });
    app.use(vite.middlewares);
  }

  const PORT = parseInt(process.env.PORT || '3000', 10);
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`VaultSpring Wallet Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
});
