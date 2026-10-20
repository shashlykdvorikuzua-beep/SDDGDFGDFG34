import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  ArrowLeft, Info, TrendingUp, TrendingDown, Search, AlertTriangle,
  X, Edit3, Star, ChevronDown, ShieldAlert,
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
import { MarketGrid, MarketNotice, FutureMarketsCard, InstrumentRow } from './TradeParts';

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

  // The server/admin catalog is authoritative for availability; the static
  // catalog is the fallback so the screen still renders before the first sync.
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

  // Step 1 — market, Step 2 — instrument inside that market.
  const [selectedMarket, setSelectedMarket] = useState<MarketCategory>('crypto');
  const [instrumentSearch, setInstrumentSearch] = useState('');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [selectedInstrumentId, setSelectedInstrumentId] = useState<string>('bitcoin');
  const [showAllInstruments, setShowAllInstruments] = useState(false);

  const [favorites, setFavorites] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('vaultspring_favorites');
    return saved ? new Set(JSON.parse(saved)) : new Set(['bitcoin', 'eur-usd', 'aapl']);
  });

  // Step 3-4 — direction, size in USDT, leverage.
  const [direction, setDirection] = useState<PositionDirection>('long');
  const [positionSizeUsd, setPositionSizeUsd] = useState<string>('200');
  const [leverage, setLeverage] = useState<number>(DEFAULT_LEVERAGE);

  // Step 5 — TP / SL.
  const [tpPrice, setTpPrice] = useState<string>('');
  const [slPrice, setSlPrice] = useState<string>('');

  // Step 6 — confirmation flow.
  const [providerAcknowledged, setProviderAcknowledged] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Open positions editing.
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

  // ---- Position math -----------------------------------------------------
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

  // Stop must sit inside the liquidation level, otherwise the engine liquidates first.
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

  // ---- Defaults when the market / instrument / direction changes ---------
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Quick sizing: margin presets are a share of the free collateral. The balance
  // handed in from the app is already USDT-only and net of reserved margin.
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

  // ---- Open position ------------------------------------------------------
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
        stakingYieldUsd: 0, // Kept strictly separate from trading result
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
            <span className="text-[10px] text-slate-400">Мульти-рынки · обеспечение в USDT</span>
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

      {/* Tabs */}
      <div className="px-4 border-b border-white/[0.06] flex gap-4 bg-[#07090E]">
        {(
          [
            { id: 'open_strategy', label: 'Открыть позицию' },
            { id: 'my_positions', label: `Мои позиции (${positions.length})` },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`py-3 text-xs font-bold relative transition-colors ${
              activeTab === t.id ? 'text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>{t.label}</span>
            {activeTab === t.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24 space-y-4">
        {activeTab === 'open_strategy' ? (
          <div className="space-y-4">
            {/* STEP 1 — market */}
            <Step title="1. Выберите рынок" hint={market.subtitle}>
              <MarketGrid
                markets={TRADING_MARKETS}
                counts={counts}
                selected={selectedMarket}
                onSelect={handleSelectMarket}
              />
            </Step>

            <MarketNotice market={market} />

            {/* STEP 2 — instrument catalog */}
            <Step title="2. Каталог инструментов" hint={`${marketInstruments.length} доступно`}>
              <div className="space-y-2">
                <div className="flex items-center gap-2 bg-white/[0.04] rounded-lg px-3 py-2">
                  <Search className="w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={instrumentSearch}
                    onChange={(e) => setInstrumentSearch(e.target.value)}
                    placeholder="Поиск по названию или тикеру..."
                    className="bg-transparent text-xs text-white placeholder-slate-500 outline-none flex-1"
                  />
                  {instrumentSearch && (
                    <button onClick={() => setInstrumentSearch('')} className="text-slate-500">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setOnlyFavorites((v) => !v)}
                    className={`p-1 rounded-md ${onlyFavorites ? 'bg-yellow-500/15' : ''}`}
                    title="Только избранные"
                  >
                    <Star
                      className={`w-4 h-4 ${onlyFavorites ? 'text-yellow-400 fill-yellow-400' : 'text-slate-500'}`}
                    />
                  </button>
                </div>

                {listSlice.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-xs">Ничего не найдено</div>
                ) : (
                  <div className="space-y-0.5">
                    {listSlice.map((inst) => (
                      <InstrumentRow
                        key={inst.id}
                        instrument={inst}
                        selected={selectedInstrument?.id === inst.id}
                        favorite={favorites.has(inst.id)}
                        onSelect={handleSelectInstrument}
                        onToggleFavorite={toggleFavorite}
                      />
                    ))}
                  </div>
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
            </Step>

            {/* Selected instrument ticket */}
            {selectedInstrument && (
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <CryptoIcon symbol={selectedInstrument.symbol} network={selectedInstrument.network} size={32} />
                    <div>
                      <span className="text-sm font-bold text-white block">{selectedInstrument.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono block">
                        {selectedInstrument.ticker} · {market.label}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-white font-mono block">
                      ${formatInstrumentPrice(selectedInstrument.currentPrice, precision)}
                    </span>
                    <span
                      className={`text-[10px] font-mono block ${
                        selectedInstrument.change24h >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {selectedInstrument.change24h >= 0 ? '+' : ''}
                      {selectedInstrument.change24h.toFixed(2)}% / 24ч
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-white/[0.05]">
                  <Meta label="Мин. позиция" value={`${selectedInstrument.minPositionUsd} USDT`} />
                  <Meta label="Макс. плечо" value={`${selectedInstrument.maxLeverage}x`} />
                  <Meta
                    label={selectedInstrument.category === 'crypto' ? 'Funding 8ч' : 'Swap 8ч'}
                    value={`${selectedInstrument.fundingRate8h}%`}
                  />
                </div>
              </div>
            )}

            {/* STEP 3 — direction */}
            <Step title="3. Направление">
              <div className="grid grid-cols-2 gap-2 p-1 bg-white/[0.04] rounded-xl border border-white/[0.06]">
                {(
                  [
                    { dir: 'long' as PositionDirection, label: 'Рост (Long)', Icon: TrendingUp, activeCls: 'bg-emerald-600 shadow-emerald-600/30' },
                    { dir: 'short' as PositionDirection, label: 'Падение (Short)', Icon: TrendingDown, activeCls: 'bg-rose-600 shadow-rose-600/30' },
                  ]
                ).map(({ dir, label, Icon, activeCls }) => (
                  <button
                    key={dir}
                    type="button"
                    onClick={() => handleSelectDirection(dir)}
                    className={`py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      direction === dir ? `${activeCls} text-white shadow-md` : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </Step>

            {/* STEP 4 — size in USDT + leverage */}
            <Step title="4. Размер позиции и плечо">
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <label className="font-semibold text-slate-300">Размер позиции (номинал)</label>
                    <span className="text-slate-400 font-mono text-[11px]">USDT</span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      value={positionSizeUsd}
                      onChange={(e) => setPositionSizeUsd(e.target.value)}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-base font-bold text-white focus:outline-none focus:border-blue-500 font-mono"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      USDT
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 pt-1">
                    {[0.25, 0.5, 1].map((share) => (
                      <button
                        key={share}
                        type="button"
                        onClick={() => applyMarginShare(share)}
                        className="flex-1 py-1 rounded-lg text-[10px] font-bold text-slate-400 bg-white/[0.04] hover:text-white"
                      >
                        {share === 1 ? 'Max' : `${share * 100}%`}
                      </button>
                    ))}
                    <span className="text-[10px] text-slate-500 font-mono ml-1">
                      свободно {availableBalanceUsd.toFixed(2)} USDT
                    </span>
                  </div>
                  {belowMinPosition && (
                    <span className="block text-[11px] text-rose-400 pt-1">
                      Минимальный размер позиции по {selectedInstrument.ticker}: {selectedInstrument.minPositionUsd} USDT
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Кредитное плечо</span>
                    <span className="font-bold text-blue-400 font-mono">
                      {leverage}x / максимум {selectedInstrument.maxLeverage}x
                    </span>
                  </div>
                  <div className="grid grid-cols-6 gap-1.5">
                    {leverageStepsFor(selectedInstrument.maxLeverage).map((lev) => (
                      <button
                        key={lev}
                        type="button"
                        onClick={() => setLeverage(lev)}
                        className={`py-1.5 rounded-lg text-xs font-bold border transition-all ${
                          leverage === lev
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'bg-white/[0.02] border-white/[0.06] text-slate-400 hover:text-white'
                        }`}
                      >
                        {lev}x
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-blue-950/20 border border-blue-500/20 rounded-xl p-3 flex items-center justify-between text-xs">
                  <span className="text-blue-300 font-medium">Требуемая маржа (из баланса USDT):</span>
                  <span className="font-extrabold text-white font-mono text-sm">
                    {requiredMargin.toFixed(2)} USDT
                  </span>
                </div>
                {notEnoughMargin && (
                  <span className="block text-[11px] text-rose-400">
                    Недостаточно свободного обеспечения: нужно {requiredMargin.toFixed(2)} USDT, доступно{' '}
                    {availableBalanceUsd.toFixed(2)} USDT
                  </span>
                )}
              </div>
            </Step>

            {/* STEP 5 — TP / SL */}
            <Step title="5. Take Profit / Stop Loss">
              <div className="space-y-3">
                <LevelField
                  label="Тейк-профит (TP)"
                  tone="emerald"
                  hint={direction === 'long' ? '> цены входа' : '< цены входа'}
                  value={tpPrice}
                  onChange={setTpPrice}
                  step={priceStep(precision)}
                  valid={isTpValid}
                  resultLine={`Расч. прибыль: +${Math.max(0, estProfitTpUsd).toFixed(2)} USDT (+${estProfitTpPercent.toFixed(2)}%)`}
                />
                <LevelField
                  label="Стоп-лосс (SL)"
                  tone="rose"
                  hint={direction === 'long' ? '< цены входа' : '> цены входа'}
                  value={slPrice}
                  onChange={setSlPrice}
                  step={priceStep(precision)}
                  valid={isSlValid}
                  resultLine={`Расч. убыток: ${estLossSlUsd.toFixed(2)} USDT (${estLossSlPercent.toFixed(2)}%)`}
                />

                {(!isTpValid || !isSlValid) && (
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px] flex items-start gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>
                      {direction === 'long'
                        ? `Для Long: TP выше цены входа ($${formatInstrumentPrice(entryPrice, precision)}), SL — ниже и выше цены ликвидации.`
                        : `Для Short: TP ниже цены входа ($${formatInstrumentPrice(entryPrice, precision)}), SL — выше и ниже цены ликвидации.`}
                    </span>
                  </div>
                )}

                {isSlBeyondLiquidation && (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] flex items-start gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      Стоп-лосс расположен за ценой ликвидации — позиция будет ликвидирована раньше срыва
                      стопа. Уменьшите плечо или отодвиньте уровень.
                    </span>
                  </div>
                )}

                {/* Cost transparency */}
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3 space-y-1.5 text-[11px]">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Комиссии и расчётные уровни
                  </span>
                  <CostRow label={`Комиссия открытия (${selectedInstrument.takerFeePercent}%)`} value={`${openingFee.toFixed(3)} USDT`} />
                  <CostRow label="Оценка комиссии закрытия" value={`~${estClosingFee.toFixed(3)} USDT`} />
                  <CostRow label="Оценка спреда" value={`~${spreadCost.toFixed(3)} USDT`} />
                  <CostRow
                    label={selectedInstrument.category === 'crypto' ? 'Funding (8 часов)' : 'Swap (8 часов)'}
                    value={`${selectedInstrument.fundingRate8h}% (${selectedInstrument.fundingDirection === 'pay' ? 'платите' : 'получаете'})`}
                    muted
                  />
                  <div className="flex justify-between pt-1 mt-1 border-t border-white/[0.05]">
                    <span className="text-rose-400 font-medium">Расчётная цена ликвидации</span>
                    <span className="text-rose-400 font-mono font-bold">
                      ${formatInstrumentPrice(liquidationPrice, precision)}
                    </span>
                  </div>
                  <CostRow label="Итого расходов при закрытии по рынку" value={`${totalFees.toFixed(3)} USDT`} strong />
                </div>
              </div>
            </Step>

            <p className="text-[10px] text-slate-500 leading-snug px-1">
              Тикеры, часы торгов, комиссии, funding/swap и правила ликвидации зависят от поставщика и
              должны быть подтверждены до разработки. Список инструментов — стартовый, не является
              инвестиционной рекомендацией и не гарантирует доступность в конкретном регионе.
            </p>

            {/* STEP 6 — confirm */}
            <button
              disabled={!canSubmit}
              onClick={handleOpenConfirmation}
              className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold text-sm tracking-wide transition-all shadow-lg shadow-blue-600/25 cursor-pointer"
            >
              {notEnoughMargin
                ? `Недостаточно обеспечения (${requiredMargin.toFixed(2)} USDT)`
                : !providerAcknowledged
                  ? 'Подтвердите условия провайдера'
                  : `Открыть ${direction.toUpperCase()} · ${selectedInstrument.ticker}`}
            </button>

            <FutureMarketsCard items={FUTURE_MARKETS} />
          </div>
        ) : (
          /* MY STRATEGIES */
          <div className="space-y-3">
            {positions.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs space-y-2">
                <TrendingUp className="w-10 h-10 text-slate-600 mx-auto" />
                <p>У вас пока нет открытых позиций Trade Pro.</p>
                <button
                  onClick={() => setActiveTab('open_strategy')}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs mt-2"
                >
                  Открыть первую позицию
                </button>
              </div>
            ) : (
              positions.map((pos) => {
                const isLong = pos.direction === 'long';
                const priceDiff = isLong ? pos.currentPrice - pos.entryPrice : pos.entryPrice - pos.currentPrice;
                const pnlPercent = (priceDiff / (pos.entryPrice || 1)) * pos.leverage * 100;
                const pnlUsd = (pos.collateralUsd * pnlPercent) / 100;
                const isProfit = pnlUsd >= 0;
                const currentValue = pos.collateralUsd + pnlUsd;
                const posMarket = pos.category ? MARKET_BY_ID[pos.category] : null;

                return (
                  <div key={pos.id} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <CryptoIcon symbol={pos.assetSymbol} size={32} />
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-white">{pos.assetName || pos.assetSymbol}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {pos.ticker || pos.assetSymbol}
                            {posMarket ? ` · ${posMarket.label}` : ''}
                          </span>
                          <span
                            className={`mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded inline-flex items-center gap-1 w-fit ${
                              isLong ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                            }`}
                          >
                            {isLong ? '▲ LONG' : '▼ SHORT'} {pos.leverage}x
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end">
                        <span className={`text-sm font-bold font-mono ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                          ${currentValue.toFixed(2)}
                        </span>
                        <span className={`text-[10px] font-mono ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isProfit ? '+' : ''}
                          {pnlUsd.toFixed(2)} ({isProfit ? '+' : ''}
                          {pnlPercent.toFixed(2)}%)
                        </span>
                      </div>
                    </div>

                    <div className="bg-white/[0.02] rounded-xl p-3 space-y-2">
                      <PosRow label="Цена входа" value={`$${priceOf(pos.entryPrice, pos)}`} />
                      <PosRow label="Текущая цена" value={`$${priceOf(pos.currentPrice, pos)}`} />
                      <PosRow label="Маржа" value={`${pos.collateralUsd.toFixed(2)} USDT`} />
                      <PosRow label="Тейк-профит" value={`$${priceOf(pos.takeProfitPrice, pos)}`} tone="text-emerald-400" />
                      <PosRow label="Стоп-лосс" value={`$${priceOf(pos.stopLossPrice, pos)}`} tone="text-rose-400" />
                      <PosRow label="Цена ликвидации" value={`$${priceOf(pos.liquidationPrice, pos)}`} tone="text-rose-400" />
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => {
                          setEditingPosition(pos);
                          setEditTpInput(pos.takeProfitPrice.toFixed(pos.pricePrecision ?? 2));
                          setEditSlInput(pos.stopLossPrice.toFixed(pos.pricePrecision ?? 2));
                        }}
                        className="flex-1 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-semibold text-slate-300 flex items-center justify-center gap-1.5"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Изменить TP/SL</span>
                      </button>
                      <button
                        onClick={() => setPositionToClose(pos)}
                        className="flex-1 py-2 rounded-xl bg-rose-600/30 hover:bg-rose-600/40 text-rose-300 text-xs font-semibold flex items-center justify-center gap-1.5"
                      >
                        <span>Закрыть позицию</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* STEP 6 — confirmation sheet */}
      {showConfirmation && selectedInstrument && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end justify-center">
          <div className="w-full max-w-lg bg-[#0F1420] border-t border-white/10 rounded-t-3xl p-5 pb-24 flex flex-col gap-4 max-h-[88vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <span className="text-base font-bold text-white">Подтверждение Trade Pro</span>
              <button
                onClick={() => setShowConfirmation(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white bg-white/[0.05]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-3.5 space-y-2 text-xs">
              <SumRow label="Рынок" value={`${market.title} (${market.subtitle})`} />
              <SumRow label="Инструмент" value={`${selectedInstrument.name} · ${selectedInstrument.ticker}`} />
              <SumRow
                label="Направление"
                value={`${direction === 'long' ? 'РОСТ (LONG)' : 'ПАДЕНИЕ (SHORT)'} · ${leverage}x`}
                tone={direction === 'long' ? 'text-emerald-400' : 'text-rose-400'}
              />
              <SumRow label="Размер позиции" value={`${numPosSize.toFixed(2)} USDT`} />
              <SumRow label="Маржа (обеспечение)" value={`${requiredMargin.toFixed(2)} USDT`} tone="text-blue-400" />
              <SumRow label="Цена входа" value={`$${formatInstrumentPrice(entryPrice, precision)}`} />
              <SumRow
                label="Take Profit / Stop Loss"
                value={`$${formatInstrumentPrice(numTp, precision)} / $${formatInstrumentPrice(numSl, precision)}`}
              />
              <SumRow label="Расчётная цена ликвидации" value={`$${formatInstrumentPrice(liquidationPrice, precision)}`} tone="text-rose-400" />
              <SumRow label="Комиссии (откр. + закр. + спред)" value={`${totalFees.toFixed(3)} USDT`} />
              <div className="flex justify-between pt-1 border-t border-white/[0.05]">
                <span className="text-slate-400">Продукт</span>
                <span className="text-[11px] text-slate-300 text-right max-w-[220px] leading-snug">
                  {selectedInstrument.productType || market.productType}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Часы торгов</span>
                <span className="text-[11px] text-slate-300 text-right max-w-[220px] leading-snug">
                  {selectedInstrument.tradingHours || market.tradingHours}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Провайдер</span>
                <span
                  className={`text-[11px] text-right max-w-[220px] leading-snug ${
                    providerPending ? 'text-amber-300' : 'text-emerald-300'
                  }`}
                >
                  {market.provider}
                </span>
              </div>
            </div>

            <div className="bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl text-[11px] text-rose-300 leading-snug">
              Стоп-лосс не гарантирует цену исполнения при резком движении рынка. При росте цены по Short и
              снижении по Long позиция может быть ликвидирована — возможна потеря всей маржи.
            </div>

            <label className="flex items-start gap-2 text-[11px] text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={providerAcknowledged}
                onChange={(e) => setProviderAcknowledged(e.target.checked)}
                className="mt-0.5 accent-blue-600"
              />
              <span>
                {providerPending
                  ? 'Я понимаю, что провайдер этого рынка ещё не подключён: тикеры, часы торгов, комиссии, funding/swap и правила ликвидации могут отличаться от показанных.'
                  : 'Я понимаю, что условия исполнения (тикеры, комиссии, funding и ликвидация) задаёт подключённый провайдер ликвидности.'}
              </span>
            </label>

            <button
              disabled={!providerAcknowledged}
              onClick={() => {
                setShowConfirmation(false);
                setShowPinModal(true);
              }}
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold text-xs tracking-wide transition-colors cursor-pointer"
            >
              Подтверждаю открытие позиции
            </button>
          </div>
        </div>
      )}

      {/* PIN */}
      {showPinModal && (
        <PinVerifyModal
          title="Авторизация Trade Pro"
          description={`Резервирование обеспечения: ${requiredMargin.toFixed(2)} USDT · ${selectedInstrument?.ticker}`}
          onSuccess={handleFinalExecutePosition}
          onClose={() => setShowPinModal(false)}
        />
      )}

      {/* EDIT TP / SL */}
      {editingPosition && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-[#0F1420] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <span className="text-base font-bold text-white">Изменить TP / SL</span>
              <button
                onClick={() => setEditingPosition(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white bg-white/[0.05]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Новый тейк-профит</label>
                <input
                  type="number"
                  step={priceStep(editingPosition.pricePrecision ?? 2)}
                  value={editTpInput}
                  onChange={(e) => setEditTpInput(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Новый стоп-лосс</label>
                <input
                  type="number"
                  step={priceStep(editingPosition.pricePrecision ?? 2)}
                  value={editSlInput}
                  onChange={(e) => setEditSlInput(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>
              <p className="text-[10px] text-slate-500">
                Цена входа: ${priceOf(editingPosition.entryPrice, editingPosition)} ·{' '}
                {editingPosition.direction === 'long' ? 'TP выше, SL ниже' : 'TP ниже, SL выше'}
              </p>
            </div>

            <button
              onClick={() => {
                onUpdateTpSl(
                  editingPosition.id,
                  parseFloat(editTpInput) || 0,
                  parseFloat(editSlInput) || 0
                );
                setEditingPosition(null);
              }}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
            >
              Сохранить изменения
            </button>
          </div>
        </div>
      )}

      {/* CLOSE POSITION */}
      {positionToClose && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-[#0F1420] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl p-5 flex flex-col gap-4">
            <span className="text-base font-bold text-white">
              Закрыть позицию по рынку?
            </span>
            <p className="text-xs text-slate-300 leading-relaxed">
              Позиция {positionToClose.ticker || positionToClose.assetSymbol} (
              {positionToClose.direction.toUpperCase()} {positionToClose.leverage}x) будет закрыта по текущей
              цене. Обеспечение с учётом финансового результата вернётся на баланс USDT.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPositionToClose(null)}
                className="flex-1 py-3 rounded-xl bg-white/[0.06] text-slate-300 font-bold text-xs"
              >
                Отмена
              </button>
              <button
                onClick={() => handleExecuteClose(positionToClose)}
                className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
              >
                Да, закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Small presentational helpers
// ---------------------------------------------------------------------------

const Step: React.FC<{ title: string; hint?: string; children: React.ReactNode }> = ({
  title,
  hint,
  children,
}) => (
  <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-2.5">
    <div className="flex items-center justify-between">
      <span className="text-xs font-bold text-slate-200">{title}</span>
      {hint && <span className="text-[10px] text-slate-500">{hint}</span>}
    </div>
    {children}
  </div>
);

const Meta: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="text-center">
    <span className="text-[9px] text-slate-500 block uppercase tracking-wide">{label}</span>
    <span className="text-[11px] text-white font-mono font-semibold">{value}</span>
  </div>
);

const CostRow: React.FC<{
  label: string;
  value: string;
  muted?: boolean;
  strong?: boolean;
}> = ({ label, value, muted, strong }) => (
  <div className="flex justify-between">
    <span className={muted ? 'text-slate-500' : 'text-slate-400'}>{label}</span>
    <span
      className={`font-mono ${strong ? 'text-white font-bold' : muted ? 'text-slate-300' : 'text-white'}`}
    >
      {value}
    </span>
  </div>
);

const PosRow: React.FC<{ label: string; value: string; tone?: string }> = ({ label, value, tone }) => (
  <div className="flex items-center justify-between">
    <span className="text-[11px] text-slate-400">{label}</span>
    <span className={`text-xs font-semibold font-mono ${tone || 'text-white'}`}>{value}</span>
  </div>
);

const SumRow: React.FC<{ label: string; value: string; tone?: string }> = ({ label, value, tone }) => (
  <div className="flex justify-between gap-2">
    <span className="text-slate-400">{label}</span>
    <span className={`font-mono font-bold text-right ${tone || 'text-white'}`}>{value}</span>
  </div>
);

const LevelField: React.FC<{
  label: string;
  tone: 'emerald' | 'rose';
  hint: string;
  value: string;
  step: string;
  valid: boolean;
  onChange: (v: string) => void;
  resultLine: string;
}> = ({ label, tone, hint, value, step, valid, onChange, resultLine }) => (
  <div className="space-y-1">
    <div className="flex justify-between text-xs">
      <span className={`${tone === 'emerald' ? 'text-emerald-400' : 'text-rose-400'} font-semibold`}>
        {label}
      </span>
      <span className="text-slate-400 font-mono text-[11px]">{hint}</span>
    </div>
    <input
      type="number"
      step={step}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full bg-white/[0.04] border rounded-xl px-3.5 py-2 text-sm font-bold text-white focus:outline-none font-mono ${
        valid ? 'border-white/[0.08] focus:border-blue-500' : 'border-rose-500 text-rose-300'
      }`}
    />
    <span className={`block text-[11px] font-mono ${tone === 'emerald' ? 'text-emerald-400' : 'text-rose-400'}`}>
      {resultLine}
    </span>
  </div>
);
