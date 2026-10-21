import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  ArrowLeft, Info, TrendingUp, TrendingDown, Search, AlertTriangle,
  X, Edit3, Star, ChevronDown, ShieldAlert, RefreshCw, Bitcoin, DollarSign, Droplet, Apple, BarChart3,
} from 'lucide-react';
import {
  StakingProAsset, StakingProPosition, PositionDirection, MarketCategory, TradingInstrument,
} from '../../types/stakingPro';
import { Token, Transaction } from '../../types/wallet';
import { CryptoIcon } from '../common/CryptoIcon';
import { PinVerifyModal } from '../common/PinVerifyModal';
import {
  TRADING_INSTRUMENTS, TRADING_MARKETS, FUTURE_MARKETS, MARKET_BY_ID, resolveInstrument,
  formatInstrumentPrice, priceStep, leverageStepsFor, estimateLiquidationPrice, instrumentCount,
} from '../../data/stakingProData';
import { MarketNotice, FutureMarketsCard } from './TradeParts';

interface StakingProScreenProps {
  assets: StakingProAsset[];
  positions: StakingProPosition[];
  availableBalanceUsd: number;
  tokens: Token[];
  onBack: () => void;
  onOpenLearnMore: () => void;
  onOpenPosition: (position: StakingProPosition, requiredCollateralUsd: number, tx: Transaction) => void;
  onClosePosition: (positionId: string, returnCollateral: number, pnlUsd: number) => void;
  onUpdateTpSl: (positionId: string, newTp: number, newSl: number) => void;
}

const DEFAULT_LEVERAGE = 3;

// Иконки для рынков
const MARKET_ICONS: Record<MarketCategory, React.ReactNode> = {
  crypto: <Bitcoin className="w-4 h-4" />,
  forex: <DollarSign className="w-4 h-4" />,
  commodities: <Droplet className="w-4 h-4" />,
  stocks: <Apple className="w-4 h-4" />,
  indices: <BarChart3 className="w-4 h-4" />,
};

export const StakingProScreen: React.FC<StakingProScreenProps> = ({
  assets,
  positions,
  availableBalanceUsd,
  tokens,
  onBack,
  onOpenLearnMore,
  onOpenPosition,
  onClosePosition,
  onUpdateTpSl,
}) => {
  const [activeTab, setActiveTab] = useState<'open_strategy' | 'my_positions'>('open_strategy');

  const catalog: TradingInstrument[] = useMemo(() => {
    const rows = (assets && assets.length ? assets : TRADING_INSTRUMENTS).map(resolveInstrument);
    const seen = new Set<string>();
    return rows.filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)));
  }, [assets]);

  const counts = useMemo(
    () =>
      TRADING_MARKETS.reduce(
        (acc, m) => ({ ...acc, [m.id]: catalog.filter((i) => i.category === m.id).length }),
        {} as Record<string, number>
      ),
    [catalog]
  );

  const [selectedMarket, setSelectedMarket] = useState<MarketCategory>('crypto');
  const [instrumentSearch, setInstrumentSearch] = useState('');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [selectedInstrumentId, setSelectedInstrumentId] = useState<string>('bitcoin');
  const [showAllInstruments, setShowAllInstruments] = useState(false);

  const [favorites, setFavorites] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('vaultspring_favorites');
    return saved ? new Set(JSON.parse(saved)) : new Set(['bitcoin', 'eur-usd', 'aapl']);
  });

  const [direction, setDirection] = useState<PositionDirection>('long');
  const [positionSizeUsd, setPositionSizeUsd] = useState<string>('200');
  const [leverage, setLeverage] = useState<number>(DEFAULT_LEVERAGE);

  const [tpPrice, setTpPrice] = useState<string>('');
  const [slPrice, setSlPrice] = useState<string>('');

  const [providerAcknowledged, setProviderAcknowledged] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editingPosition, setEditingPosition] = useState<StakingProPosition | null>(null);
  const [editTpInput, setEditTpInput] = useState('');
  const [editSlInput, setEditSlInput] = useState('');
  const [positionToClose, setPositionToClose] = useState<StakingProPosition | null>(null);

  const market = MARKET_BY_ID[selectedMarket];
  const providerPending = market.providerStatus === 'pending';

  const marketInstruments = useMemo(
    () => catalog.filter((i) => i.category === selectedMarket),
    [catalog, selectedMarket]
  );

  const visibleInstruments = useMemo(() => {
    const q = instrumentSearch.trim().toLowerCase();
    return marketInstruments.filter((i) => {
      if (onlyFavorites && !favorites.has(i.id)) return false;
      if (!q) return true;
      return (
        i.ticker.toLowerCase().includes(q) ||
        i.symbol.toLowerCase().includes(q) ||
        i.name.toLowerCase().includes(q)
      );
    });
  }, [marketInstruments, instrumentSearch, onlyFavorites, favorites]);

  const listSlice = showAllInstruments || instrumentSearch || onlyFavorites
    ? visibleInstruments
    : visibleInstruments.slice(0, 8);

  const selectedInstrument: TradingInstrument =
    catalog.find((i) => i.id === selectedInstrumentId) || marketInstruments[0] || catalog[0];

  const precision = selectedInstrument?.pricePrecision ?? 2;
  const entryPrice = selectedInstrument?.currentPrice ?? 0;

  const numPosSize = parseFloat(positionSizeUsd) || 0;
  const requiredMargin = leverage > 0 ? numPosSize / leverage : numPosSize;
  const numTp = parseFloat(tpPrice) || 0;
  const numSl = parseFloat(slPrice) || 0;

  const openingFee = (numPosSize * (selectedInstrument?.takerFeePercent ?? 0)) / 100;
  const estClosingFee = (numPosSize * (selectedInstrument?.takerFeePercent ?? 0)) / 100;
  const spreadCost = entryPrice > 0 ? (numPosSize * (selectedInstrument?.spread ?? 0)) / entryPrice : 0;
  const totalFees = openingFee + estClosingFee + spreadCost;

  const liquidationPrice = estimateLiquidationPrice(entryPrice, leverage, direction);

  const isTpValid = direction === 'long' ? numTp > entryPrice : numTp < entryPrice && numTp > 0;
  const isSlValid = direction === 'long' ? numSl < entryPrice && numSl > 0 : numSl > entryPrice;

  const isSlBeyondLiquidation =
    entryPrice > 0 &&
    liquidationPrice > 0 &&
    (direction === 'long' ? numSl > 0 && numSl < liquidationPrice : numSl > 0 && numSl > liquidationPrice);

  const estProfitTpPercent =
    entryPrice > 0
      ? (direction === 'long' ? (numTp - entryPrice) / entryPrice : (entryPrice - numTp) / entryPrice) *
        leverage *
        100
      : 0;
  const estProfitTpUsd = (requiredMargin * estProfitTpPercent) / 100;

  const estLossSlPercent =
    entryPrice > 0
      ? (direction === 'long' ? (numSl - entryPrice) / entryPrice : (entryPrice - numSl) / entryPrice) *
        leverage *
        100
      : 0;
  const estLossSlUsd = (requiredMargin * estLossSlPercent) / 100;

  const applyDefaultLevels = useCallback(
    (price: number, dir: PositionDirection) => {
      if (!price) return;
      const tpFactor = dir === 'long' ? 1.08 : 0.92;
      const slFactor = dir === 'long' ? 0.95 : 1.05;
      setTpPrice((price * tpFactor).toFixed(precision));
      setSlPrice((price * slFactor).toFixed(precision));
    },
    [precision]
  );

  useEffect(() => {
    if (!selectedInstrument) return;
    setProviderAcknowledged(!providerPending);
    applyDefaultLevels(selectedInstrument.currentPrice, direction);
  }, [selectedInstrument?.id, selectedMarket]);

  const handleSelectMarket = (id: MarketCategory) => {
    setSelectedMarket(id);
    setInstrumentSearch('');
    setOnlyFavorites(false);
    setShowAllInstruments(false);
    const first = catalog.find((i) => i.category === id);
    if (first) setSelectedInstrumentId(first.id);
  };

  const handleSelectInstrument = (inst: TradingInstrument) => {
    setSelectedInstrumentId(inst.id);
    setSelectedMarket(inst.category);
    setLeverage((prev) => Math.min(prev, inst.maxLeverage));
    applyDefaultLevels(inst.currentPrice, direction);
  };

  const handleSelectDirection = (dir: PositionDirection) => {
    setDirection(dir);
    applyDefaultLevels(selectedInstrument.currentPrice, dir);
  };

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem('vaultspring_favorites', JSON.stringify([...next]));
      return next;
    });
  };

  const applyMarginShare = (share: number) => {
    const margin = availableBalanceUsd * share;
    setPositionSizeUsd((margin * leverage).toFixed(2));
  };

  const belowMinPosition = numPosSize > 0 && numPosSize < (selectedInstrument?.minPositionUsd ?? 0);
  const notEnoughMargin = requiredMargin > availableBalanceUsd;
  const canSubmit =
    !!selectedInstrument &&
    numPosSize > 0 &&
    !belowMinPosition &&
    !notEnoughMargin &&
    isTpValid &&
    isSlValid &&
    providerAcknowledged &&
    !isSubmitting;

  const handleOpenConfirmation = () => {
    if (!canSubmit) return;
    setShowConfirmation(true);
  };

  const handleFinalExecutePosition = () => {
    setShowPinModal(false);
    setIsSubmitting(true);

    setTimeout(() => {
      const newPos: StakingProPosition = {
        id: `pos-${Date.now()}`,
        assetId: selectedInstrument.id,
        assetSymbol: selectedInstrument.symbol,
        assetName: selectedInstrument.name,
        category: selectedInstrument.category,
        ticker: selectedInstrument.ticker,
        pricePrecision: precision,
        direction,
        executionType: 'market',
        entryPrice,
        currentPrice: selectedInstrument.currentPrice,
        positionSizeUsd: numPosSize,
        collateralUsd: requiredMargin,
        leverage,
        takeProfitPrice: numTp,
        stopLossPrice: numSl,
        estProfitTpUsd,
        estProfitTpPercent,
        estLossSlUsd,
        estLossSlPercent,
        liquidationPrice,
        openingFeeUsd: openingFee,
        estClosingFeeUsd: estClosingFee,
        spreadCostUsd: spreadCost,
        fundingRate8h: selectedInstrument.fundingRate8h,
        accruedFundingUsd: 0,
        stakingYieldUsd: 0,
        openedAt: 'Сегодня, 14:30',
        status: 'open',
      };

      const tx: Transaction = {
        id: `tx-${Date.now()}`,
        type: 'swap',
        tokenSymbol: `${selectedInstrument.ticker} ${direction.toUpperCase()}`,
        tokenName: 'Trade Pro Strategy',
        amount: requiredMargin,
        amountUsd: requiredMargin,
        toAddress: 'VaultSpring Pro Strategy Engine',
        fromAddress: '0x71C...4e8B',
        timestamp: 'Just now',
        status: 'completed',
        hash: `0x${Math.random().toString(16).substring(2, 42)}`,
        fee: openingFee,
        network: selectedInstrument.network,
      };

      setIsSubmitting(false);
      setShowConfirmation(false);
      onOpenPosition(newPos, requiredMargin, tx);
      setActiveTab('my_positions');
    }, 800);
  };

  const handleExecuteClose = (pos: StakingProPosition) => {
    const priceDiff =
      pos.direction === 'long' ? pos.currentPrice - pos.entryPrice : pos.entryPrice - pos.currentPrice;
    const rawPnlPercent = (priceDiff / (pos.entryPrice || 1)) * pos.leverage;
    const grossPnlUsd = pos.collateralUsd * rawPnlPercent;
    const netPnlUsd = grossPnlUsd - pos.openingFeeUsd - pos.estClosingFeeUsd - pos.accruedFundingUsd;
    const returnCollateral = Math.max(0, pos.collateralUsd + netPnlUsd);

    onClosePosition(pos.id, returnCollateral, netPnlUsd);
    setPositionToClose(null);
  };

  const priceOf = (value: number, pos: StakingProPosition) =>
    formatInstrumentPrice(value, pos.pricePrecision ?? 2);

  // Форматирование цены с изменением
  const formatPriceChange = (price: number, changePercent: number) => {
    const changeAbs = price * (changePercent / 100);
    const sign = changeAbs >= 0 ? '+' : '';
    return {
      price: formatInstrumentPrice(price, 2),
      changeAbs: `${sign}${changeAbs.toFixed(2)}`,
      changePercent: `${sign}${changePercent.toFixed(2)}%`,
      positive: changeAbs >= 0,
    };
  };

  const priceInfo = formatPriceChange(entryPrice, selectedInstrument?.change24h ?? 0);

  return (
    <div className="w-full h-full flex flex-col bg-[#07090E] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-[#0B0F19] border-b border-white/[0.06] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white bg-white/[0.05]"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex flex-col">
            <span className="text-base font-extrabold text-white tracking-tight">Trade Pro</span>
            <span className="text-[10px] text-slate-400">Торговля с кредитным плечом</span>
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

      {/* Горизонтальные табы рынков */}
      <div className="px-2 py-2 flex gap-1 bg-[#07090E] border-b border-white/[0.06] overflow-x-auto shrink-0">
        {TRADING_MARKETS.map((m) => {
          const isActive = selectedMarket === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => handleSelectMarket(m.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              {MARKET_ICONS[m.id]}
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 pb-24 space-y-3">
        {activeTab === 'open_strategy' ? (
          <div className="space-y-3">
            {/* Карточка выбранного инструмента с ценой */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CryptoIcon symbol={selectedInstrument.symbol} network={selectedInstrument.network} size={36} />
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-bold text-white">{selectedInstrument.ticker}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    <span className="text-[10px] text-slate-400">{selectedInstrument.name} / Tether</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-base font-bold text-white block">{priceInfo.price}</span>
                  <span className={`text-[10px] font-semibold ${priceInfo.positive ? 'text-emerald-400' : 'text-red-400'}`}>
                    {priceInfo.changeAbs} ({priceInfo.changePercent})
                  </span>
                </div>
              </div>
            </div>

            {/* Поиск инструментов */}
            <div className="relative">
              <div className="flex items-center gap-2 bg-white/[0.04] rounded-xl px-3 py-2.5">
                <Search className="w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={instrumentSearch}
                  onChange={(e) => setInstrumentSearch(e.target.value)}
                  placeholder="Поиск инструментов..."
                  className="bg-transparent text-sm text-white placeholder-slate-500 outline-none flex-1"
                />
                {instrumentSearch && (
                  <button onClick={() => setInstrumentSearch('')} className="text-slate-500 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Второй ряд табов-фильтров */}
            <div className="flex gap-4 border-b border-white/[0.06] pb-2">
              {TRADING_MARKETS.map((m) => {
                const isActive = selectedMarket === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleSelectMarket(m.id)}
                    className={`text-xs font-semibold pb-1 relative transition-colors ${
                      isActive ? 'text-white' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {m.label}
                    {isActive && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Список инструментов */}
            <div className="space-y-0.5">
              {listSlice.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs">Ничего не найдено</div>
              ) : (
                listSlice.map((inst) => {
                  const isActive = selectedInstrument?.id === inst.id;
                  const isFav = favorites.has(inst.id);
                  const price = formatInstrumentPrice(inst.currentPrice, inst.pricePrecision ?? 2);
                  const change = inst.change24h ?? 0;
                  const positive = change >= 0;

                  return (
                    <button
                      key={inst.id}
                      type="button"
                      onClick={() => handleSelectInstrument(inst)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-lg transition-all ${
                        isActive ? 'bg-blue-600/10 border border-blue-500/30' : 'hover:bg-white/[0.03]'
                      }`}
                    >
                      <CryptoIcon symbol={inst.symbol} network={inst.network} size={28} />
                      <div className="flex-1 text-left">
                        <span className="text-sm font-bold text-white block">{inst.ticker}</span>
                        <span className="text-[10px] text-slate-400">{inst.name} / Tether</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-white block">{price}</span>
                        <span className={`text-[10px] font-semibold ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
                          {positive ? '+' : ''}{change.toFixed(2)}%
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(inst.id);
                        }}
                        className="p-1"
                      >
                        <Star
                          className={`w-4 h-4 ${isFav ? 'text-blue-400 fill-blue-400' : 'text-slate-600'}`}
                        />
                      </button>
                    </button>
                  );
                })
              )}

              {!showAllInstruments && visibleInstruments.length > 8 && (
                <button
                  type="button"
                  onClick={() => setShowAllInstruments(true)}
                  className="w-full flex items-center justify-center gap-1 py-2 rounded-lg text-[11px] font-semibold text-blue-300 bg-white/[0.03] hover:bg-white/[0.06]"
                >
                  Показать все ({visibleInstruments.length})
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Баланс для торговли */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-bold text-white">Баланс для торговли (USDT)</span>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    <span className="text-[10px] text-slate-400">Tether USD (любая сеть)</span>
                  </div>
                </div>
                <div className="text-right flex items-center gap-2">
                  <span className="text-xs text-slate-400">
                    Доступно: <span className="font-bold text-white">{availableBalanceUsd.toFixed(2)} USDT</span>
                  </span>
                  <RefreshCw className="w-4 h-4 text-slate-500" />
                </div>
              </div>
            </div>

            {/* Направление позиции */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 space-y-2">
              <span className="text-xs font-semibold text-slate-300 block">Направление позиции</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectDirection('long')}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
                    direction === 'long'
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                      : 'bg-white/[0.05] text-slate-400 hover:text-white'
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>Рост (Long)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectDirection('short')}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
                    direction === 'short'
                      ? 'bg-red-600 text-white shadow-lg shadow-red-900/30'
                      : 'bg-white/[0.05] text-slate-400 hover:text-white'
                  }`}
                >
                  <TrendingDown className="w-4 h-4" />
                  <span>Падение (Short)</span>
                </button>
              </div>
            </div>

            {/* Сумма позиции */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">Сумма позиции (Номинальный размер)</span>
                <span className="text-[10px] text-slate-500">USDT</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  value={positionSizeUsd}
                  onChange={(e) => setPositionSizeUsd(e.target.value)}
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-lg font-bold text-white outline-none focus:border-blue-500/50"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">USDT</span>
              </div>
            </div>

            {/* Кредитное плечо */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 space-y-2">
              <span className="text-xs font-semibold text-slate-300 block">Кредитное плечо</span>
              <div className="flex gap-2">
                {leverageStepsFor(selectedInstrument.maxLeverage).map((step) => (
                  <button
                    key={step}
                    type="button"
                    onClick={() => setLeverage(step)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      leverage === step
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                        : 'bg-white/[0.05] text-slate-400 hover:text-white'
                    }`}
                  >
                    {step}x
                  </button>
                ))}
              </div>
            </div>

            {/* Требуемое обеспечение */}
            <div className="bg-blue-600/10 border border-blue-500/20 rounded-xl p-3 flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-300">Требуемое обеспечение (Маржа):</span>
              <span className="text-sm font-bold text-white">{requiredMargin.toFixed(2)} USDT</span>
            </div>

            {/* TP/SL */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 space-y-3">
              <span className="text-xs font-semibold text-slate-300 block">Тейк-профит / Стоп-лосс</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">Take Profit</label>
                  <input
                    type="number"
                    value={tpPrice}
                    onChange={(e) => setTpPrice(e.target.value)}
                    className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/50"
                    placeholder={entryPrice ? (entryPrice * 1.08).toFixed(precision) : ''}
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">Stop Loss</label>
                  <input
                    type="number"
                    value={slPrice}
                    onChange={(e) => setSlPrice(e.target.value)}
                    className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-red-500/50"
                    placeholder={entryPrice ? (entryPrice * 0.95).toFixed(precision) : ''}
                  />
                </div>
              </div>
            </div>

            {/* Provider notice */}
            <MarketNotice market={market} />

            {/* Submit button */}
            <button
              type="button"
              disabled={!canSubmit}
              onClick={handleOpenConfirmation}
              className={`w-full py-4 rounded-xl text-sm font-bold transition-all ${
                canSubmit
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/30'
                  : 'bg-white/[0.05] text-slate-500 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? 'Открытие...' : 'Открыть позицию'}
            </button>
          </div>
        ) : (
          /* Мои позиции */
          <div className="space-y-3">
            {positions.length === 0 ? (
              <div className="text-center py-12">
                <ShieldAlert className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <span className="text-sm text-slate-500">Нет открытых позиций</span>
              </div>
            ) : (
              positions.map((pos) => (
                <div
                  key={pos.id}
                  className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CryptoIcon symbol={pos.assetSymbol} network={pos.category} size={24} />
                      <div>
                        <span className="text-sm font-bold text-white block">{pos.ticker}</span>
                        <span className="text-[10px] text-slate-400">{pos.direction === 'long' ? 'Long' : 'Short'} · {pos.leverage}x</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-bold block ${pos.estProfitTpUsd >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {pos.estProfitTpUsd >= 0 ? '+' : ''}{pos.estProfitTpUsd.toFixed(2)} USDT
                      </span>
                      <span className="text-[10px] text-slate-400">PnL</span>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-white/[0.06]">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPosition(pos);
                        setEditTpInput(String(pos.takeProfitPrice));
                        setEditSlInput(String(pos.stopLossPrice));
                      }}
                      className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-white/[0.05] text-xs font-semibold text-slate-300 hover:bg-white/[0.08]"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Изменить TP/SL
                    </button>
                    <button
                      type="button"
                      onClick={() => setPositionToClose(pos)}
                      className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-red-600/20 text-xs font-semibold text-red-300 hover:bg-red-600/30"
                    >
                      <X className="w-3.5 h-3.5" />
                      Закрыть
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Confirmation modal */}
      {showConfirmation && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="w-full sm:max-w-md bg-[#0B0F19] border border-white/[0.1] rounded-t-3xl sm:rounded-3xl p-5 space-y-4 max-h-[90vh] overflow-y-auto pb-24">
            <div className="flex items-center justify-between">
              <span className="text-base font-bold text-white">Подтверждение ордера</span>
              <button onClick={() => setShowConfirmation(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Инструмент</span>
                <span className="text-white font-semibold">{selectedInstrument.ticker}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Направление</span>
                <span className={`font-semibold ${direction === 'long' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {direction === 'long' ? 'Long' : 'Short'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Плечо</span>
                <span className="text-white font-semibold">{leverage}x</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Размер</span>
                <span className="text-white font-semibold">{numPosSize} USDT</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Маржа</span>
                <span className="text-white font-semibold">{requiredMargin.toFixed(2)} USDT</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Цена входа</span>
                <span className="text-white font-semibold">{formatInstrumentPrice(entryPrice, precision)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Ликвидация</span>
                <span className="text-red-400 font-semibold">{formatInstrumentPrice(liquidationPrice, precision)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowConfirmation(false);
                setShowPinModal(true);
              }}
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-all"
            >
              Подтвердить
            </button>
          </div>
        </div>
      )}

      {showPinModal && (
        <PinVerifyModal
          onSuccess={handleFinalExecutePosition}
          onClose={() => setShowPinModal(false)}
        />
      )}

      {editingPosition && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="w-full sm:max-w-md bg-[#0B0F19] border border-white/[0.1] rounded-t-3xl sm:rounded-3xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-base font-bold text-white">Изменить TP/SL</span>
              <button onClick={() => setEditingPosition(null)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">Take Profit</label>
                <input
                  type="number"
                  value={editTpInput}
                  onChange={(e) => setEditTpInput(e.target.value)}
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">Stop Loss</label>
                <input
                  type="number"
                  value={editSlInput}
                  onChange={(e) => setEditSlInput(e.target.value)}
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white outline-none"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                onUpdateTpSl(editingPosition.id, parseFloat(editTpInput) || 0, parseFloat(editSlInput) || 0);
                setEditingPosition(null);
              }}
              className="w-full py-3 rounded-xl bg-blue-600 text-white text-sm font-bold"
            >
              Сохранить
            </button>
          </div>
        </div>
      )}

      {positionToClose && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="w-full sm:max-w-md bg-[#0B0F19] border border-white/[0.1] rounded-t-3xl sm:rounded-3xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-base font-bold text-white">Закрыть позицию</span>
              <button onClick={() => setPositionToClose(null)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Закрыть {positionToClose.ticker} {positionToClose.direction === 'long' ? 'Long' : 'Short'}?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPositionToClose(null)}
                className="flex-1 py-3 rounded-xl bg-white/[0.05] text-slate-300 text-sm font-semibold"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => handleExecuteClose(positionToClose)}
                className="flex-1 py-3 rounded-xl bg-red-600 text-white text-sm font-bold"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
