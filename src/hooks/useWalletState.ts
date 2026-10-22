/**
 * useWalletState — custom hook that owns ALL wallet business logic.
 *
 * Extracted from App.tsx to keep the root component a thin view layer.
 * Handles: registration, PIN lock, token/tx persistence, live price polling,
 * peer-to-peer sync, staking, Trade Pro, verification, notifications.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  INITIAL_WALLETS,
  INITIAL_TOKENS,
  INITIAL_TRANSACTIONS,
  INITIAL_STAKING_POOLS,
  INITIAL_NOTIFICATIONS,
} from '../data/mockWalletData';
import { TRADING_INSTRUMENTS } from '../data/stakingProData';
import { fetchLiveCryptoPrices } from '../services/priceService';
import { registerWalletWithServer, syncWalletWithServer, playChimeSound } from '../services/walletSyncService';
import {
  Token, Transaction, StakingPool, AppNotification, WalletAccount,
} from '../types/wallet';
import { StakingProAsset, StakingProPosition, StakingActiveDeposit } from '../types/stakingPro';
import { VerificationData } from '../components/modals/SellModal';
import {
  UNLOCK_PERIOD_MS, UNLOCK_PERIOD_HOURS,
  PRICE_POLL_INTERVAL_MS, WALLET_SYNC_INTERVAL_MS, VERIFICATION_POLL_INTERVAL_MS,
  DEFAULT_PIN, FALLBACK_ADDRESSES,
} from '../utils';

export interface WalletStatus {
  pendingWithdrawals: { id: string; asset: string; amount: number; status: string; createdAt: number; txHash: string | null }[];
  restrictions: { id: string; type: string; reason: string; createdAt: number }[];
  supportMessages: { id: string; subject: string; status: string; createdAt: number }[];
}

export interface ActivityItem {
  id: string;
  type: 'withdrawal' | 'verification' | 'support';
  status: 'completed' | 'rejected' | 'processing' | 'needs_support';
  title: string;
  message: string;
  time: string;
  read: boolean;
}

export function useWalletState() {
  // ----- Registration / PIN / Lock -----
  const [isRegistered, setIsRegistered] = useState<boolean>(() =>
    localStorage.getItem('vaultspring_is_registered') === 'true'
  );
  const [pinCode, setPinCode] = useState<string>(() =>
    localStorage.getItem('vaultspring_pin') || DEFAULT_PIN
  );
  const [isLocked, setIsLocked] = useState<boolean>(() =>
    localStorage.getItem('vaultspring_is_registered') === 'true'
  );

  // ----- Wallet -----
  const [currentWallet, setCurrentWallet] = useState<WalletAccount>(() => {
    const saved = localStorage.getItem('vaultspring_wallet');
    if (saved) {
      try {
        const parsed: WalletAccount = JSON.parse(saved);
        return { ...parsed, tronAddress: parsed.tronAddress || FALLBACK_ADDRESSES.tron };
      } catch {
        return INITIAL_WALLETS[0];
      }
    }
    return INITIAL_WALLETS[0];
  });

  // ----- Tokens -----
  const [tokens, setTokens] = useState<Token[]>(() => {
    const saved = localStorage.getItem('vaultspring_tokens');
    if (saved) {
      try {
        const parsed: Token[] = JSON.parse(saved);
        const existingIds = new Set(parsed.map((t) => t.id));
        const missing = INITIAL_TOKENS.filter((t) => !existingIds.has(t.id));
        if (missing.length > 0) {
          const merged = [...parsed, ...missing];
          localStorage.setItem('vaultspring_tokens', JSON.stringify(merged));
          return merged;
        }
        return parsed;
      } catch {
        return INITIAL_TOKENS;
      }
    }
    return INITIAL_TOKENS;
  });

  // ----- Transactions -----
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('vaultspring_txs');
    return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
  });

  // ----- Staking -----
  const [stakingPools, setStakingPools] = useState<StakingPool[]>(() => {
    const saved = localStorage.getItem('vaultspring_staking');
    return saved ? JSON.parse(saved) : INITIAL_STAKING_POOLS;
  });
  const [activeDeposits, setActiveDeposits] = useState<StakingActiveDeposit[]>(() => {
    const saved = localStorage.getItem('vaultspring_active_deposits');
    return saved ? JSON.parse(saved) : [];
  });
  const [proPositions, setProPositions] = useState<StakingProPosition[]>(() => {
    const saved = localStorage.getItem('vaultspring_pro_positions');
    return saved ? JSON.parse(saved) : [];
  });
  const [proAssets, setProAssets] = useState<StakingProAsset[]>(TRADING_INSTRUMENTS);
  const [unlockPeriodHours, setUnlockPeriodHours] = useState(UNLOCK_PERIOD_HOURS);

  // ----- Notifications -----
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const saved = localStorage.getItem('vaultspring_notifications');
    return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
  });

  // ----- Verification -----
  const [isVerified, setIsVerified] = useState<boolean>(() =>
    localStorage.getItem('vaultspring_verified') === 'true'
  );
  const [verificationData, setVerificationData] = useState<VerificationData | null>(() => {
    const saved = localStorage.getItem('vaultspring_verification');
    return saved ? JSON.parse(saved) : null;
  });
  const [verificationStatus, setVerificationStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none');

  // ----- Wallet status (from admin backend) -----
  const [walletStatus, setWalletStatus] = useState<WalletStatus>({
    pendingWithdrawals: [], restrictions: [], supportMessages: [],
  });

  // ----- Derived: activity items -----
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([]);

  // ----- Navigation / modals -----
  const [activeTab, setActiveTab] = useState<'home' | 'swap' | 'earn' | 'settings'>('home');
  const [currentNetwork, setCurrentNetwork] = useState<string>('All Networks');
  const [selectedTokenDetail, setSelectedTokenDetail] = useState<Token | null>(null);
  const [isUpdatingPrices, setIsUpdatingPrices] = useState(false);
  const [lastPriceUpdate, setLastPriceUpdate] = useState<Date | null>(null);
  const [modalSend, setModalSend] = useState<{ open: boolean; initialToken?: Token }>({ open: false });
  const [modalReceive, setModalReceive] = useState<{ open: boolean; initialToken?: Token }>({ open: false });
  const [modalSell, setModalSell] = useState(false);
  const [modalWalletSwitcher, setModalWalletSwitcher] = useState(false);
  const [modalNetworkFilter, setModalNetworkFilter] = useState(false);
  const [modalNotifications, setModalNotifications] = useState(false);
  const [modalManageTokens, setModalManageTokens] = useState(false);
  const [fiatCurrency, setFiatCurrency] = useState('USD');
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);

  // ----- Load unlock period from server -----
  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((data) => { if (data.unlockPeriodHours) setUnlockPeriodHours(data.unlockPeriodHours); })
      .catch(() => {});
  }, []);

  // ----- Load Trade Pro catalog + positions -----
  const loadStakingPro = useCallback(() => {
    const addr = currentWallet?.address;
    if (!addr) return;
    fetch(`/api/admin/staking-pro/public?address=${encodeURIComponent(addr)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: any) => {
        if (!d) return;
        if (Array.isArray(d.assets) && d.assets.length) setProAssets(d.assets as StakingProAsset[]);
        if (d.known && Array.isArray(d.positions)) {
          setProPositions(d.positions.filter((p: any) => p.status === 'open') as StakingProPosition[]);
        }
      })
      .catch(() => {});
  }, [currentWallet?.address]);

  useEffect(() => { loadStakingPro(); }, [loadStakingPro]);

  // ----- Load wallet status -----
  const loadWalletStatus = useCallback(() => {
    const addr = currentWallet?.address;
    if (!addr) return;
    fetch(`/api/admin/wallet-status/public?address=${encodeURIComponent(addr)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: any) => { if (d) setWalletStatus(d as WalletStatus); })
      .catch(() => {});
  }, [currentWallet?.address]);

  useEffect(() => { loadWalletStatus(); }, [loadWalletStatus]);

  // ----- Poll verification status -----
  useEffect(() => {
    if (!currentWallet?.address) return;
    const fetchStatus = () => {
      fetch(`/api/wallet/verify/status?address=${currentWallet.address}`)
        .then((r) => r.json())
        .then((data) => setVerificationStatus(data.status || 'none'))
        .catch(() => {});
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, VERIFICATION_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [currentWallet?.address]);

  // ----- Build activity items -----
  useEffect(() => {
    const items: ActivityItem[] = [];
    walletStatus.pendingWithdrawals.forEach((w) => {
      items.push({
        id: `wd-${w.id}`, type: 'withdrawal',
        status: w.status === 'completed' ? 'completed' : w.status === 'rejected' ? 'rejected' : 'processing',
        title: 'Вывод средств',
        message: `${w.amount} ${w.asset} — ${w.status === 'completed' ? 'Выполнено' : w.status === 'rejected' ? 'Отклонено' : 'В обработке'}`,
        time: new Date(w.createdAt).toLocaleDateString('ru-RU'), read: false,
      });
    });
    if (verificationStatus === 'pending') {
      items.push({ id: 'ver-pending', type: 'verification', status: 'processing', title: 'Верификация', message: 'Документы на проверке', time: 'Недавно', read: false });
    } else if (verificationStatus === 'rejected') {
      items.push({ id: 'ver-rejected', type: 'verification', status: 'needs_support', title: 'Верификация', message: 'Требуется связаться с поддержкой', time: 'Недавно', read: false });
    }
    walletStatus.supportMessages.forEach((s) => {
      items.push({
        id: `sup-${s.id}`, type: 'support', status: 'needs_support',
        title: s.subject, message: 'Новое сообщение от поддержки',
        time: new Date(s.createdAt).toLocaleDateString('ru-RU'), read: false,
      });
    });
    setActivityItems(items);
  }, [walletStatus, verificationStatus]);

  // ----- Live price polling -----
  const refreshLivePrices = useCallback(async () => {
    setIsUpdatingPrices(true);
    try {
      const prices = await fetchLiveCryptoPrices();
      if (prices) {
        setTokens((prev) => prev.map((tok) => {
          let pData = null;
          if (tok.id === 'tether-trc20') pData = prices['USDT-TRC20'] || prices['USDT'];
          else if (prices[tok.symbol]) pData = prices[tok.symbol];
          if (pData) {
            const newPrice = pData.price;
            const newChange = pData.change24h;
            const newBalUsd = tok.balance * newPrice;
            const currentSparkline = tok.sparkline || [];
            const newSparkline = [...currentSparkline.slice(1), newPrice];
            return {
              ...tok, price: newPrice, change24h: newChange, balanceUsd: newBalUsd,
              sparkline: newSparkline.length >= 7 ? newSparkline : currentSparkline,
            };
          }
          return tok;
        }));
        setProAssets((prev) => prev.map((asset) => {
          if (prices[asset.symbol]) {
            return { ...asset, currentPrice: prices[asset.symbol].price, change24h: prices[asset.symbol].change24h };
          }
          return asset;
        }));
        setLastPriceUpdate(new Date());
      }
    } catch (e) {
      console.warn('Failed to pull live crypto prices:', e);
    } finally {
      setIsUpdatingPrices(false);
    }
  }, []);

  useEffect(() => {
    refreshLivePrices();
    const timer = setInterval(refreshLivePrices, PRICE_POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [refreshLivePrices]);

  // ----- Peer-to-peer sync -----
  useEffect(() => {
    if (!currentWallet || !currentWallet.address) return;
    registerWalletWithServer(currentWallet, tokens).catch(() => {});
    const pollInterval = setInterval(async () => {
      const res = await syncWalletWithServer(currentWallet);
      if (res && res.success && res.exists) {
        if (res.balances) {
          setTokens((prev) => prev.map((t) => {
            const key = t.balanceKey || t.symbol;
            if (res.balances[key] !== undefined && res.balances[key] !== t.balance) {
              const newBal = res.balances[key];
              return { ...t, balance: newBal, balanceUsd: newBal * t.price };
            }
            return t;
          }));
        }
        if (Array.isArray(res.transactions) && res.transactions.length > 0) {
          setTransactions((prev) => {
            const existingIds = new Set(prev.map((tx) => tx.id));
            const newIncoming = res.transactions.filter((tx) => !existingIds.has(tx.id));
            if (newIncoming.length > 0) { playChimeSound(); return [...newIncoming, ...prev]; }
            return prev;
          });
        }
        if (Array.isArray(res.alerts) && res.alerts.length > 0) {
          setNotifications((prev) => [...res.alerts, ...prev]);
        }
      }
    }, WALLET_SYNC_INTERVAL_MS);
    return () => clearInterval(pollInterval);
  }, [currentWallet]);

  // ----- Persist to localStorage -----
  useEffect(() => { if (currentWallet) localStorage.setItem('vaultspring_wallet', JSON.stringify(currentWallet)); }, [currentWallet]);
  useEffect(() => { localStorage.setItem('vaultspring_tokens', JSON.stringify(tokens)); }, [tokens]);
  useEffect(() => { localStorage.setItem('vaultspring_txs', JSON.stringify(transactions)); }, [transactions]);
  useEffect(() => { localStorage.setItem('vaultspring_staking', JSON.stringify(stakingPools)); }, [stakingPools]);
  useEffect(() => { localStorage.setItem('vaultspring_active_deposits', JSON.stringify(activeDeposits)); }, [activeDeposits]);
  useEffect(() => { localStorage.setItem('vaultspring_pro_positions', JSON.stringify(proPositions)); }, [proPositions]);
  useEffect(() => { localStorage.setItem('vaultspring_notifications', JSON.stringify(notifications)); }, [notifications]);

  // ----- Check completed unlocks -----
  useEffect(() => {
    const checkUnlocks = () => {
      const now = Date.now();
      setActiveDeposits((prev) => {
        const completed: StakingActiveDeposit[] = [];
        const remaining = prev.filter((d) => {
          if (d.status === 'pending_unlock' && d.unlockRequestedAt && now - d.unlockRequestedAt >= UNLOCK_PERIOD_MS) {
            completed.push(d); return false;
          }
          return true;
        });
        completed.forEach((dep) => {
          setTokens((prevTokens) => prevTokens.map((t) => {
            if (t.symbol === dep.tokenSymbol) {
              const newBal = t.balance + dep.amount;
              return { ...t, balance: newBal, balanceUsd: newBal * t.price };
            }
            return t;
          }));
          setNotifications((prev) => [{
            id: `n-${Date.now()}-${dep.id}`, title: 'Вывод завершён',
            message: `${dep.amount} ${dep.tokenSymbol} разблокированы и зачислены на баланс`,
            time: 'Только что', type: 'tx', subtype: 'receive', read: false,
          }, ...prev]);
        });
        return remaining;
      });
    };
    const interval = setInterval(checkUnlocks, 60_000);
    return () => clearInterval(interval);
  }, []);

  // ----- Derived calculations -----
  const totalBalanceUsd = tokens.reduce((acc, t) => acc + t.balanceUsd, 0);
  const usdtBalance = tokens.find((t) => t.symbol === 'USDT')?.balanceUsd || 0;
  const change24hUsd = tokens.reduce((acc, t) => acc + (t.balanceUsd * (t.change24h / 100)), 0);
  const change24hPercent = totalBalanceUsd > 0 ? (change24hUsd / totalBalanceUsd) * 100 : 0;
  const unreadCount = notifications.filter((n) => !n.read).length;

  const stakingBalanceUsd = activeDeposits
    .filter((d) => d.status === 'active' || d.status === 'pending_unlock')
    .reduce((acc, d) => acc + d.amountUsd + d.accruedRewardUsd, 0);
  const stakingProfitUsd = activeDeposits
    .filter((d) => d.status === 'active' || d.status === 'pending_unlock')
    .reduce((acc, d) => acc + d.accruedRewardUsd, 0);

  const tradingPositions = proPositions.filter((p) => p.status === 'open');
  const tradingCollateralUsd = tradingPositions.reduce((acc, p) => acc + p.collateralUsd, 0);
  const tradingUnrealizedPnl = tradingPositions.reduce((acc, p) => {
    if (p.entryPrice <= 0) return acc;
    const priceChange = p.direction === 'long'
      ? (p.currentPrice - p.entryPrice) / p.entryPrice
      : (p.entryPrice - p.currentPrice) / p.entryPrice;
    return acc + priceChange * p.positionSizeUsd;
  }, 0);
  const tradingBalanceUsd = tradingCollateralUsd + tradingUnrealizedPnl;

  const stakedAmountBySymbol: Record<string, number> = {};
  activeDeposits
    .filter((d) => d.status === 'active' || d.status === 'pending_unlock')
    .forEach((d) => { stakedAmountBySymbol[d.tokenSymbol] = (stakedAmountBySymbol[d.tokenSymbol] || 0) + d.amount; });
  const availableBalanceUsd = tokens.reduce((acc, t) => {
    const staked = stakedAmountBySymbol[t.symbol] || 0;
    const availableAmount = Math.max(0, t.balance - staked);
    return acc + availableAmount * t.price;
  }, 0) - tradingCollateralUsd;

  const usdtCollateralBalance = tokens
    .filter((t) => t.symbol === 'USDT')
    .reduce((acc, t) => acc + (t.balanceUsd || t.balance * t.price), 0);
  const tradeCollateralAvailableUsd = tokens.some((t) => t.symbol === 'USDT')
    ? Math.max(0, usdtCollateralBalance - tradingCollateralUsd)
    : Math.max(0, availableBalanceUsd);

  const activeDetailToken = selectedTokenDetail
    ? tokens.find((t) => t.id === selectedTokenDetail.id) || selectedTokenDetail
    : null;

  // ----- Handlers -----
  const handleOnboardingComplete = (newWallet: WalletAccount, newPin: string) => {
    setCurrentWallet(newWallet); setPinCode(newPin);
    setIsRegistered(true); setIsLocked(false);
    const zeroTokens = INITIAL_TOKENS.map((t) => ({ ...t, balance: 0, balanceUsd: 0 }));
    setTokens(zeroTokens); setTransactions([]);
    localStorage.setItem('vaultspring_is_registered', 'true');
    localStorage.setItem('vaultspring_pin', newPin);
    localStorage.setItem('vaultspring_wallet', JSON.stringify(newWallet));
    localStorage.setItem('vaultspring_tokens', JSON.stringify(zeroTokens));
    localStorage.setItem('vaultspring_txs', JSON.stringify([]));
    registerWalletWithServer(newWallet, zeroTokens).catch(() => {});
  };

  const handleUnlock = () => setIsLocked(false);
  const handleUpdatePin = (newPin: string) => {
    setPinCode(newPin); localStorage.setItem('vaultspring_pin', newPin);
  };
  const handleResetWallet = () => {
    ['vaultspring_is_registered', 'vaultspring_pin', 'vaultspring_wallet', 'vaultspring_tokens', 'vaultspring_txs']
      .forEach((k) => localStorage.removeItem(k));
    setIsRegistered(false); setIsLocked(false);
    const zeroTokens = INITIAL_TOKENS.map((t) => ({ ...t, balance: 0, balanceUsd: 0 }));
    setTokens(zeroTokens); setTransactions([]);
  };

  const handleFaucetFunded = (symbol: string, amount: number) => {
    setTokens((prev) => prev.map((t) => {
      if (t.symbol === symbol) {
        const newBal = t.balance + amount;
        return { ...t, balance: newBal, balanceUsd: newBal * t.price };
      }
      return t;
    }));
    setNotifications((prev) => [{
      id: `n-${Date.now()}`, title: 'Тестовые токены получены',
      message: `Зачислено +${amount} ${symbol} в ваш кошелек`,
      time: 'Только что', type: 'reward', read: false,
    }, ...prev]);
  };

  const handleSendSuccess = (newTx: Transaction, updatedToken: Token) => {
    setTransactions((prev) => [newTx, ...prev]);
    setTokens((prev) => prev.map((t) => (t.id === updatedToken.id ? updatedToken : t)));
    setNotifications((prev) => [{
      id: `n-${Date.now()}`, title: 'В обработке',
      message: `Отправлено ${newTx.amount} ${newTx.tokenSymbol} на ${newTx.toAddress.substring(0, 10)}... Ожидает подтверждения`,
      time: 'Только что', type: 'tx', subtype: 'send', read: false,
    }, ...prev]);
  };

  const handleSellSuccess = (newTx: Transaction, updatedToken: Token) => {
    setTransactions((prev) => [newTx, ...prev]);
    setTokens((prev) => prev.map((t) => (t.id === updatedToken.id ? updatedToken : t)));
    setNotifications((prev) => [{
      id: `n-${Date.now()}`, title: 'Crypto Sold (Cashout)',
      message: `Sold ${newTx.amount.toFixed(4)} ${newTx.tokenSymbol} for cashout to your bank account`,
      time: 'Just now', type: 'tx', read: false,
    }, ...prev]);
  };

  const handleSwapSuccess = (newTx: Transaction, updatedFrom: Token, updatedTo: Token) => {
    setTransactions((prev) => [newTx, ...prev]);
    setTokens((prev) => prev.map((t) => {
      if (t.id === updatedFrom.id) return updatedFrom;
      if (t.id === updatedTo.id) return updatedTo;
      return t;
    }));
    setNotifications((prev) => [{
      id: `n-${Date.now()}`, title: 'Обмен выполнен',
      message: `Обменяно ${newTx.amount} ${newTx.tokenSymbol} через DEX`,
      time: 'Только что', type: 'tx', read: false,
    }, ...prev]);
  };

  const handleClassicDepositSuccess = (deposit: StakingActiveDeposit, updatedToken: Token, tx: Transaction) => {
    setActiveDeposits((prev) => [deposit, ...prev]);
    setTokens((prev) => prev.map((t) => (t.id === updatedToken.id ? updatedToken : t)));
    setTransactions((prev) => [tx, ...prev]);
    setNotifications((prev) => [{
      id: `n-${Date.now()}`, title: 'Стейкинг активирован',
      message: `Размещено ${deposit.amount} ${deposit.tokenSymbol} в валидаторе`,
      time: 'Только что', type: 'reward', read: false,
    }, ...prev]);
  };

  const handleClassicUnstakeSuccess = (depositId: string, returnAmount: number, symbol: string) => {
    setActiveDeposits((prev) => prev.filter((d) => d.id !== depositId));
    setTokens((prev) => prev.map((t) => {
      if (t.symbol === symbol) {
        const newBal = t.balance + returnAmount;
        return { ...t, balance: newBal, balanceUsd: newBal * t.price };
      }
      return t;
    }));
    setNotifications((prev) => [{
      id: `n-${Date.now()}`, title: 'Вывод из стейкинга',
      message: `Запрос на разблокировку ${returnAmount} ${symbol} отправлен в сеть`,
      time: 'Только что', type: 'tx', read: false,
    }, ...prev]);
  };

  const handleUnstakeRequest = (deposit: StakingActiveDeposit) => {
    setActiveDeposits((prev) => prev.map((d) => (d.id === deposit.id ? deposit : d)));
    setNotifications((prev) => [{
      id: `n-${Date.now()}`, title: 'Запрос на вывод отправлен',
      message: `Разблокировка ${deposit.amount} ${deposit.tokenSymbol} займёт 48 часов`,
      time: 'Только что', type: 'tx', subtype: 'send', read: false,
    }, ...prev]);
  };

  const handleOpenProPosition = (position: StakingProPosition, requiredCollateralUsd: number, tx: Transaction) => {
    setProPositions((prev) => [position, ...prev]);
    setTransactions((prev) => [tx, ...prev]);
    setTokens((prev) => {
      const usdt = prev.find((t) => t.symbol === 'USDT');
      if (usdt && usdt.balance >= requiredCollateralUsd) {
        return prev.map((t) => t.symbol === 'USDT'
          ? { ...t, balance: t.balance - requiredCollateralUsd, balanceUsd: (t.balance - requiredCollateralUsd) * t.price }
          : t);
      }
      return prev;
    });
    setNotifications((prev) => [{
      id: `n-${Date.now()}`, title: 'Trade Pro: Стратегия открыта',
      message: `Позиция ${position.direction.toUpperCase()} (${position.ticker || position.assetSymbol}) ${position.leverage}x открыта`,
      time: 'Только что', type: 'tx', read: false,
    }, ...prev]);
    fetch('/api/admin/staking-pro/client/open', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: currentWallet?.address, id: position.id, assetId: position.assetId,
        direction: position.direction, executionType: position.executionType, leverage: position.leverage,
        positionSizeUsd: position.positionSizeUsd, entryPrice: position.entryPrice,
        takeProfitPrice: position.takeProfitPrice, stopLossPrice: position.stopLossPrice,
      }),
    }).then(() => loadStakingPro()).catch(() => {});
  };

  const handleCloseProPosition = (positionId: string, returnCollateral: number, pnlUsd: number) => {
    setProPositions((prev) => prev.filter((p) => p.id !== positionId));
    setTokens((prev) => prev.map((t) => {
      if (t.symbol === 'USDT') {
        const newBal = t.balance + returnCollateral;
        return { ...t, balance: newBal, balanceUsd: newBal * t.price };
      }
      return t;
    }));
    setNotifications((prev) => [{
      id: `n-${Date.now()}`, title: 'Trade Pro: Позиция закрыта',
      message: `Финансовый результат: ${pnlUsd >= 0 ? '+' : ''}$${pnlUsd.toFixed(2)} USD`,
      time: 'Только что', type: 'tx', read: false,
    }, ...prev]);
    fetch('/api/admin/staking-pro/client/close', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: currentWallet?.address, positionId }),
    }).then(() => loadStakingPro()).catch(() => {});
  };

  const handleUpdateProTpSl = (positionId: string, newTp: number, newSl: number) => {
    setProPositions((prev) => prev.map((p) => (p.id === positionId ? { ...p, takeProfitPrice: newTp, stopLossPrice: newSl } : p)));
    setNotifications((prev) => [{
      id: `n-${Date.now()}`, title: 'Trade Pro: TP / SL обновлен',
      message: `Уровни Take-Profit ($${newTp}) и Stop-Loss ($${newSl}) сохранены`,
      time: 'Только что', type: 'tx', read: false,
    }, ...prev]);
    fetch('/api/admin/staking-pro/client/update', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: currentWallet?.address, positionId, takeProfitPrice: newTp, stopLossPrice: newSl }),
    }).then(() => loadStakingPro()).catch(() => {});
  };

  const handleVerificationSubmit = (data: VerificationData) => {
    setVerificationData(data); setVerificationStatus('pending');
    localStorage.setItem('vaultspring_verification', JSON.stringify(data));
    fetch('/api/wallet/verify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: currentWallet.address, ...data }),
    }).catch(() => {});
  };

  const handleAddCustomToken = (newToken: Token) => setTokens((prev) => [newToken, ...prev]);
  const handleToggleTokens = (enabledIds: string[]) => {
    const newTokens = INITIAL_TOKENS.filter((t) => enabledIds.includes(t.id));
    const balancedTokens = newTokens.map((t) => {
      const existing = tokens.find((et) => et.id === t.id);
      return existing || t;
    });
    setTokens(balancedTokens);
  };

  return {
    // State
    isRegistered, pinCode, isLocked, currentWallet, tokens, transactions,
    stakingPools, activeDeposits, proPositions, proAssets, unlockPeriodHours,
    notifications, isVerified, verificationData, verificationStatus, walletStatus,
    activityItems, activeTab, currentNetwork, selectedTokenDetail,
    isUpdatingPrices, lastPriceUpdate,
    modalSend, modalReceive, modalSell, modalWalletSwitcher,
    modalNetworkFilter, modalNotifications, modalManageTokens,
    fiatCurrency, showVerificationModal, showActivityModal,
    // Derived
    totalBalanceUsd, usdtBalance, change24hUsd, change24hPercent, unreadCount,
    stakingBalanceUsd, stakingProfitUsd, tradingBalanceUsd, tradingUnrealizedPnl,
    availableBalanceUsd, tradeCollateralAvailableUsd, activeDetailToken,
    // Setters
    setIsLocked, setCurrentWallet, setPinCode, setIsRegistered,
    setActiveTab, setCurrentNetwork, setSelectedTokenDetail,
    setModalSend, setModalReceive, setModalSell, setModalWalletSwitcher,
    setModalNetworkFilter, setModalNotifications, setModalManageTokens,
    setFiatCurrency, setShowVerificationModal, setShowActivityModal,
    setNotifications, setActivityItems,
    // Handlers
    handleOnboardingComplete, handleUnlock, handleUpdatePin, handleResetWallet,
    handleFaucetFunded, handleSendSuccess, handleSellSuccess, handleSwapSuccess,
    handleClassicDepositSuccess, handleClassicUnstakeSuccess, handleUnstakeRequest,
    handleOpenProPosition, handleCloseProPosition, handleUpdateProTpSl,
    handleVerificationSubmit, handleAddCustomToken, handleToggleTokens,
    refreshLivePrices, loadStakingPro,
  };
}
