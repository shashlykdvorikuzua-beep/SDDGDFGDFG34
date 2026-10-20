import React, { useState } from 'react';
import { 
  ArrowLeft, Info, Sparkles, CheckCircle2, ChevronRight, AlertTriangle, 
  Layers, Clock, ShieldCheck, Plus, ArrowDownLeft, Lock
} from 'lucide-react';
import { StakingPool, Token, Transaction } from '../../types/wallet';
import { StakingActiveDeposit } from '../../types/stakingPro';
import { CryptoIcon } from '../common/CryptoIcon';
import { PinVerifyModal } from '../common/PinVerifyModal';

interface ClassicStakingScreenProps {
  tokens: Token[];
  activeDeposits: StakingActiveDeposit[];
  onBack: () => void;
  onOpenLearnMore: () => void;
  onDepositSuccess: (deposit: StakingActiveDeposit, updatedToken: Token, tx: Transaction) => void;
  onUnstakeSuccess: (depositId: string, returnAmount: number, symbol: string) => void;
  onUnstakeRequest: (deposit: StakingActiveDeposit) => void;
  unlockPeriodHours?: number;
}

export const ClassicStakingScreen: React.FC<ClassicStakingScreenProps> = ({
  tokens,
  activeDeposits,
  onBack,
  onOpenLearnMore,
  onDepositSuccess,
  onUnstakeSuccess,
  onUnstakeRequest,
  unlockPeriodHours = 48
}) => {
  const [tab, setTab] = useState<'catalog' | 'active'>('catalog');
  const [selectedAsset, setSelectedAsset] = useState<Token | null>(null);
  const [stakeAmount, setStakeAmount] = useState<string>('');
  const [lockPeriod, setLockPeriod] = useState<'flexible' | 'fixed_30'>('flexible');
  const [filterActive, setFilterActive] = useState<'all' | 'pending' | 'completed'>('all');
  const [showPinModal, setShowPinModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [unstakeTarget, setUnstakeTarget] = useState<StakingActiveDeposit | null>(null);
  const [showUnstakePin, setShowUnstakePin] = useState(false);

  // Supported staking catalogue with strictly verified terms
  const stakingCatalog = [
    {
      symbol: 'VLT',
      name: 'VaultSpring Token',
      network: 'BNB Smart Chain',
      apy: 14.8,
      lockType: 'Фиксированный 30 дней',
      minAmount: 10,
      unlockPeriod: '30 дней',
      networkFee: '~0.0008 BNB ($0.50)',
      validator: 'VaultSpring Native Validator #1',
      lastUpdated: 'Сегодня, 11:00 UTC'
    },
    {
      symbol: 'SOL',
      name: 'Solana',
      network: 'Solana',
      apy: 7.2,
      lockType: 'Гибкий (Flexible)',
      minAmount: 0.1,
      unlockPeriod: '1 эпоха (~2-3 дня)',
      networkFee: '~0.00001 SOL ($0.002)',
      validator: 'Jito / Solana Stake Pool',
      lastUpdated: 'Сегодня, 10:30 UTC'
    },
    {
      symbol: 'ETH',
      name: 'Ethereum',
      network: 'Ethereum',
      apy: 4.4,
      lockType: 'Гибкий (Lido Pool)',
      minAmount: 0.01,
      unlockPeriod: '1-3 дня',
      networkFee: '~0.0012 ETH ($4.60)',
      validator: 'Ethereum 2.0 Validator Pool',
      lastUpdated: 'Вчера, 23:00 UTC'
    },
    {
      symbol: 'BNB',
      name: 'BNB Smart Chain',
      network: 'BNB Smart Chain',
      apy: 5.8,
      lockType: 'Гибкий (BNB Chain)',
      minAmount: 0.05,
      unlockPeriod: '7 дней разблокировки',
      networkFee: '~0.0005 BNB ($0.32)',
      validator: 'BNB Greenfield Validator',
      lastUpdated: 'Сегодня, 08:00 UTC'
    },
    {
      symbol: 'TRX',
      name: 'TRON',
      network: 'TRON (TRC-20)',
      apy: 5.2,
      lockType: 'Гибкий (Flexible)',
      minAmount: 100,
      unlockPeriod: 'Мгновенно',
      networkFee: '~1 TRX ($0.12)',
      validator: 'TRON Super Representative',
      lastUpdated: 'Сегодня, 09:00 UTC'
    },
    {
      symbol: 'USDT',
      name: 'Tether USD',
      network: 'Ethereum',
      apy: 8.5,
      lockType: 'Фиксированный 14 дней',
      minAmount: 50,
      unlockPeriod: '14 дней',
      networkFee: '~$2.50 (ERC-20)',
      validator: 'Aave Lending Pool',
      lastUpdated: 'Сегодня, 10:00 UTC'
    },
    {
      symbol: 'USDC',
      name: 'USD Coin',
      network: 'Ethereum',
      apy: 7.8,
      lockType: 'Фиксированный 14 дней',
      minAmount: 50,
      unlockPeriod: '14 дней',
      networkFee: '~$2.50 (ERC-20)',
      validator: 'Compound Finance',
      lastUpdated: 'Сегодня, 10:00 UTC'
    },
    {
      symbol: 'ADA',
      name: 'Cardano',
      network: 'Cardano',
      apy: 5.5,
      lockType: 'Гибкий (Flexible)',
      minAmount: 10,
      unlockPeriod: '2-3 дня',
      networkFee: '~0.2 ADA ($0.08)',
      validator: 'Cardano Stake Pool',
      lastUpdated: 'Сегодня, 07:00 UTC'
    },
    {
      symbol: 'DOT',
      name: 'Polkadot',
      network: 'Polkadot',
      apy: 12.5,
      lockType: 'Фиксированный 28 дней',
      minAmount: 1,
      unlockPeriod: '28 дней',
      networkFee: '~0.01 DOT ($0.06)',
      validator: 'Polkadot Nomination Pool',
      lastUpdated: 'Сегодня, 08:30 UTC'
    },
    {
      symbol: 'AVAX',
      name: 'Avalanche',
      network: 'Avalanche C-Chain',
      apy: 8.1,
      lockType: 'Гибкий (Flexible)',
      minAmount: 0.5,
      unlockPeriod: '2-3 дня',
      networkFee: '~0.01 AVAX ($0.30)',
      validator: 'Avalanche Validator Node',
      lastUpdated: 'Сегодня, 09:30 UTC'
    },
    {
      symbol: 'MATIC',
      name: 'Polygon',
      network: 'Polygon',
      apy: 6.3,
      lockType: 'Гибкий (Flexible)',
      minAmount: 10,
      unlockPeriod: '1-2 дня',
      networkFee: '~0.1 MATIC ($0.05)',
      validator: 'Polygon PoS Validator',
      lastUpdated: 'Сегодня, 08:00 UTC'
    },
    {
      symbol: 'LINK',
      name: 'Chainlink',
      network: 'Ethereum',
      apy: 4.8,
      lockType: 'Фиксированный 30 дней',
      minAmount: 5,
      unlockPeriod: '30 дней',
      networkFee: '~$3.00 (ERC-20)',
      validator: 'Chainlink Staking v0.2',
      lastUpdated: 'Вчера, 22:00 UTC'
    }
  ];

  const currentToken = selectedAsset ? tokens.find((t) => t.symbol === selectedAsset.symbol) : null;
  const numAmount = parseFloat(stakeAmount) || 0;
  const currentCatalogItem = selectedAsset ? stakingCatalog.find((c) => c.symbol === selectedAsset.symbol) : null;
  const estAnnualYield = currentCatalogItem ? (numAmount * currentCatalogItem.apy) / 100 : 0;

  const handleQuickPercent = (pct: number) => {
    if (!currentToken) return;
    const val = (currentToken.balance * (pct / 100)).toFixed(4);
    setStakeAmount(val);
  };

  const handleStartDeposit = () => {
    if (!currentToken || numAmount <= 0 || numAmount > currentToken.balance) return;
    setShowPinModal(true);
  };

  const handleConfirmPin = () => {
    // Re-check balance (defense in depth)
    if (!currentToken || numAmount > currentToken.balance) {
      setShowPinModal(false);
      return;
    }

    setShowPinModal(false);
    setIsProcessing(true);

    setTimeout(() => {
      if (!selectedAsset || !currentToken || !currentCatalogItem) return;

      // Final balance check
      if (numAmount > currentToken.balance) {
        setIsProcessing(false);
        return;
      }

      const newDeposit: StakingActiveDeposit = {
        id: `dep-${Date.now()}`,
        tokenSymbol: selectedAsset.symbol,
        tokenName: selectedAsset.name,
        network: selectedAsset.network,
        amount: numAmount,
        amountUsd: numAmount * selectedAsset.price,
        apy: currentCatalogItem.apy,
        lockType: currentCatalogItem.lockType.includes('Фиксированный') ? 'fixed' : 'flexible',
        lockDays: currentCatalogItem.lockType.includes('30') ? 30 : 0,
        unlockPeriodText: currentCatalogItem.unlockPeriod,
        accruedReward: 0,
        accruedRewardUsd: 0,
        startDate: 'Сегодня',
        status: 'active',
        validatorName: currentCatalogItem.validator,
        depositTimestamp: Date.now()
      };

      const updatedToken: Token = {
        ...currentToken,
        balance: Math.max(0, currentToken.balance - numAmount),
        balanceUsd: Math.max(0, (currentToken.balance - numAmount) * currentToken.price)
      };

      const tx: Transaction = {
        id: `tx-${Date.now()}`,
        type: 'stake',
        tokenSymbol: selectedAsset.symbol,
        tokenName: selectedAsset.name,
        amount: numAmount,
        amountUsd: numAmount * selectedAsset.price,
        toAddress: currentCatalogItem.validator,
        fromAddress: '0x71C...4e8B',
        timestamp: 'Just now',
        status: 'completed',
        hash: `0x${Math.random().toString(16).substring(2, 42)}`,
        fee: 0.15,
        network: selectedAsset.network
      };

      setIsProcessing(false);
      setSelectedAsset(null);
      setStakeAmount('');
      onDepositSuccess(newDeposit, updatedToken, tx);
      setTab('active');
    }, 1200);
  };

  const handleConfirmUnstake = () => {
    if (!unstakeTarget) return;
    setShowUnstakePin(false);
    // Set status to pending_unlock with timestamp
    const updatedDeposit: StakingActiveDeposit = {
      ...unstakeTarget,
      status: 'pending_unlock',
      unlockRequestedAt: Date.now()
    };
    onUnstakeRequest(updatedDeposit);
    setUnstakeTarget(null);
  };

  return (
    <div className="w-full flex-1 flex flex-col bg-[#07090E] overflow-hidden">
      {/* Top Header */}
      <div className="px-4 py-3 bg-[#0B0F19] border-b border-white/[0.06] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white bg-white/[0.05]"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex flex-col">
            <span className="text-base font-extrabold text-white tracking-tight">Staking</span>
            <span className="text-[10px] text-slate-400">VaultSpring Classic Earn</span>
          </div>
        </div>

        <button
          onClick={onOpenLearnMore}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/[0.06] hover:bg-white/[0.1] text-xs text-blue-300 font-medium cursor-pointer"
        >
          <Info className="w-3.5 h-3.5 text-blue-400" />
          <span>Узнать больше</span>
        </button>
      </div>

      {/* Tabs: Каталог активов / Мои позиции */}
      <div className="px-4 border-b border-white/[0.06] flex gap-4 bg-[#07090E]">
        <button
          onClick={() => setTab('catalog')}
          className={`py-3 text-xs font-bold relative transition-colors ${
            tab === 'catalog' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>Каталог активов ({stakingCatalog.length})</span>
          {tab === 'catalog' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />}
        </button>
        <button
          onClick={() => setTab('active')}
          className={`py-3 text-xs font-bold relative transition-colors ${
            tab === 'active' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>Мои позиции ({activeDeposits.length})</span>
          {tab === 'active' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />}
        </button>
      </div>

      {/* Scrollable Container */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24 space-y-4">
        {tab === 'catalog' && !selectedAsset && (
          <div className="space-y-3">
            <div className="bg-blue-950/20 border border-blue-500/20 rounded-2xl p-3.5 text-xs text-blue-200 space-y-1">
              <span className="font-bold text-white block">Проверенные условия сети</span>
              <p className="text-[11px] text-blue-300/80 leading-relaxed">
                Доходность (APY) формируется протоколом и является ориентировочной. Средства делегируются валидаторам без передачи приватных ключей.
              </p>
            </div>

            <div className="space-y-2.5">
              {stakingCatalog.map((item) => {
                const token = tokens.find((t) => t.symbol === item.symbol);
                return (
                  <div
                    key={item.symbol}
                    className="bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.06] rounded-2xl p-4 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <CryptoIcon symbol={item.symbol} network={item.network} size={40} />
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-white">{item.name}</span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            Мин: {item.minAmount} {item.symbol} · {item.lockType}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end">
                        <span className="text-base font-extrabold text-emerald-400 font-mono">
                          {item.apy}%
                        </span>
                        <span className="text-[9px] text-slate-400 uppercase tracking-wider">
                          APY (Оценка)
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-white/[0.04] flex items-center justify-between text-[11px] text-slate-400">
                      <span>Вывод: {item.unlockPeriod}</span>
                      <button
                        onClick={() => {
                          const t = tokens.find((tok) => tok.symbol === item.symbol) || {
                            id: item.symbol.toLowerCase(),
                            name: item.name,
                            symbol: item.symbol,
                            network: item.network as any,
                            price: 100,
                            change24h: 0,
                            balance: 10,
                            balanceUsd: 1000,
                            sparkline: [100, 100],
                            decimals: 18,
                            iconBg: '#7C3AED',
                            iconColor: '#FFF'
                          };
                          setSelectedAsset(t);
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors cursor-pointer"
                      >
                        Стейкать
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Selected Asset Placement Flow */}
        {tab === 'catalog' && selectedAsset && currentCatalogItem && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-1">
              <button
                onClick={() => setSelectedAsset(null)}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold"
              >
                ← Вернуться к списку
              </button>
              <span className="text-xs text-slate-400">{currentCatalogItem.validator}</span>
            </div>

            {/* Asset Card */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CryptoIcon symbol={selectedAsset.symbol} network={selectedAsset.network} size={38} />
                <div className="flex flex-col">
                  <span className="text-base font-bold text-white">{selectedAsset.name}</span>
                  <span className="text-xs text-slate-400 font-mono">
                    Доступно: {currentToken ? currentToken.balance.toFixed(4) : 0} {selectedAsset.symbol}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-lg font-bold text-emerald-400 font-mono">
                  {currentCatalogItem.apy}% APY
                </span>
                <span className="text-[10px] text-slate-500">Оценка, не гарантия</span>
              </div>
            </div>

            {/* Amount Input */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Сумма размещения</label>
              <div className="relative">
                <input
                  type="number"
                  placeholder="0.0"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-3.5 pr-16 py-3 text-lg font-bold text-white focus:outline-none focus:border-blue-500 font-mono"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">
                  {selectedAsset.symbol}
                </span>
              </div>

              {/* Quick Percent Buttons */}
              <div className="grid grid-cols-4 gap-2 pt-1">
                {[25, 50, 75, 100].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => handleQuickPercent(pct)}
                    className="py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-xs font-mono font-semibold text-slate-300 hover:text-white border border-white/[0.04]"
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            {/* Calculations Breakdown */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Ожидаемое вознаграждение (1 год)</span>
                <span className="font-bold text-emerald-400 font-mono">
                  ≈ {estAnnualYield.toFixed(4)} {selectedAsset.symbol}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Срок блокировки</span>
                <span className="text-white font-medium">{currentCatalogItem.lockType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Период разблокировки при выводе</span>
                <span className="text-white">{currentCatalogItem.unlockPeriod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Сетевая комиссия</span>
                <span className="text-white font-mono">{currentCatalogItem.networkFee}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-white/[0.04]">
                <span className="text-slate-400">Обновлено</span>
                <span className="text-slate-400 font-mono text-[11px]">{currentCatalogItem.lastUpdated}</span>
              </div>
            </div>

            {/* Validation Notice */}
            {numAmount > (currentToken?.balance || 0) && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                Недостаточно средств. Доступно: {currentToken?.balance.toFixed(4)} {selectedAsset.symbol}.
              </div>
            )}

            {/* Submit CTA */}
            <button
              disabled={numAmount <= 0 || numAmount > (currentToken?.balance || 0) || isProcessing}
              onClick={handleStartDeposit}
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold text-xs tracking-wide transition-colors cursor-pointer shadow-lg shadow-blue-600/25"
            >
              {isProcessing ? 'Размещение в валидаторе...' : 'Подтвердить размещение'}
            </button>
          </div>
        )}

        {/* Tab 2: Мои позиции */}
        {tab === 'active' && (
          <div className="space-y-3">
            {activeDeposits.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs space-y-2">
                <Layers className="w-10 h-10 text-slate-600 mx-auto" />
                <p>У вас пока нет активных позиций стейкинга.</p>
                <button
                  onClick={() => setTab('catalog')}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs mt-2"
                >
                  Выбрать монету в каталоге
                </button>
              </div>
            ) : (
              activeDeposits.map((dep) => {
                const isPendingUnlock = dep.status === 'pending_unlock';
                const unlockRequestedAt = dep.unlockRequestedAt || 0;
                const unlockDuration = 48 * 60 * 60 * 1000; // 48 hours in ms
                const unlockCompletesAt = unlockRequestedAt + unlockDuration;
                const now = Date.now();
                const remainingMs = Math.max(0, unlockCompletesAt - now);
                const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));
                
                // Check if fixed deposit is still in lock period
                const depositTimestamp = dep.depositTimestamp || 0;
                const lockDuration = dep.lockDays * 24 * 60 * 60 * 1000; // Convert days to ms
                const lockCompletesAt = depositTimestamp + lockDuration;
                const isLocked = dep.lockType === 'fixed' && dep.status === 'active' && now < lockCompletesAt;
                const lockRemainingMs = Math.max(0, lockCompletesAt - now);
                const lockRemainingDays = Math.ceil(lockRemainingMs / (24 * 60 * 60 * 1000));
                
                return (
                  <div
                    key={dep.id}
                    className={`bg-white/[0.03] border rounded-2xl p-4 space-y-3 ${
                      isPendingUnlock ? 'border-amber-500/30' : 'border-white/[0.06]'
                    }`}
                  >
                    {/* Header: Coin name + Status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <CryptoIcon symbol={dep.tokenSymbol} network={dep.network} size={32} />
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-white">{dep.tokenName}</span>
                          <span className="text-[11px] text-slate-400 font-mono">{dep.tokenSymbol}</span>
                        </div>
                      </div>
                      {isPendingUnlock ? (
                        <span className="text-xs font-bold text-amber-400 font-mono bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          В обработке
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          {dep.apy}% APY
                        </span>
                      )}
                    </div>

                    {/* Pending unlock banner */}
                    {isPendingUnlock && (
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-center gap-3">
                        <Clock className="w-5 h-5 text-amber-400 shrink-0" />
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-amber-300">Вывод в обработке</span>
                          <span className="text-[11px] text-amber-400/80">
                            Осталось примерно: {remainingHours} ч. ({unlockPeriodHours} часов на разблокировку)
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Detail rows */}
                    <div className="bg-white/[0.02] rounded-xl p-3 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">Сумма в монете</span>
                        <span className="text-xs font-bold text-white font-mono">
                          {dep.amount} {dep.tokenSymbol}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">Комиссия</span>
                        <span className="text-xs font-semibold text-slate-200 font-mono">
                          {dep.apy}% APY
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">Начисленный доход</span>
                        <span className="text-xs font-bold text-emerald-400 font-mono">
                          +{dep.accruedReward.toFixed(6)} {dep.tokenSymbol} (${dep.accruedRewardUsd.toFixed(2)})
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">Время обработки</span>
                        <span className="text-xs font-semibold text-slate-200 font-mono">
                          {unlockPeriodHours} ч.
                        </span>
                      </div>
                      {dep.lockType === 'fixed' && dep.status === 'active' && (
                        <div className="flex items-center justify-between pt-1 border-t border-white/[0.04]">
                          <span className="text-[11px] text-slate-400">Статус блокировки</span>
                          <span className={`text-xs font-semibold font-mono ${isLocked ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {isLocked ? `Заблокировано (${lockRemainingDays} дн.)` : 'Можно выводить'}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-1">
                      {isPendingUnlock ? (
                        <button
                          disabled
                          className="flex-1 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold cursor-not-allowed flex items-center justify-center gap-1.5"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          Ожидание разблокировки...
                        </button>
                      ) : isLocked ? (
                        <button
                          disabled
                          className="flex-1 py-2 rounded-xl bg-slate-500/10 border border-slate-500/20 text-slate-400 text-xs font-semibold cursor-not-allowed flex items-center justify-center gap-1.5"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          Заблокировано ({lockRemainingDays} дн.)
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setUnstakeTarget(dep);
                            setShowUnstakePin(true);
                          }}
                          className="flex-1 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
                        >
                          Запросить вывод
                        </button>
                      )}
                      <button
                        onClick={() => {
                          const t = tokens.find((tok) => tok.symbol === dep.tokenSymbol);
                          if (t) {
                            setSelectedAsset(t);
                            setTab('catalog');
                          }
                        }}
                        className="flex-1 py-2 rounded-xl bg-blue-600/30 hover:bg-blue-600/40 text-blue-300 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        + Добавить еще
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* PIN Verification Modal for Staking */}
      {showPinModal && (
        <PinVerifyModal
          title="Подтверждение стейкинга"
          description={`Вы размещаете ${numAmount} ${selectedAsset?.symbol} в валидаторе`}
          onSuccess={handleConfirmPin}
          onClose={() => setShowPinModal(false)}
        />
      )}

      {/* PIN Verification Modal for Unstaking */}
      {showUnstakePin && unstakeTarget && (
        <PinVerifyModal
          title="Запрос на вывод средств"
          description={`Запрос на разблокировку ${unstakeTarget.amount} ${unstakeTarget.tokenSymbol}. Период ожидания: ${unstakeTarget.unlockPeriodText}.`}
          onSuccess={handleConfirmUnstake}
          onClose={() => setShowUnstakePin(false)}
        />
      )}
    </div>
  );
};
