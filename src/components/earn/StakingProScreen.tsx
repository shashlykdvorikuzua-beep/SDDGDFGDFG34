import React, { useState } from 'react';
import { 
  ArrowLeft, Info, TrendingUp, TrendingDown, ShieldAlert, CheckCircle2, 
  ChevronDown, Search, Sliders, AlertTriangle, X, Check, Edit3 
} from 'lucide-react';
import { StakingProAsset, StakingProPosition, PositionDirection, ExecutionType } from '../../types/stakingPro';
import { Token, Transaction } from '../../types/wallet';
import { CryptoIcon } from '../common/CryptoIcon';
import { PinVerifyModal } from '../common/PinVerifyModal';

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

export const StakingProScreen: React.FC<StakingProScreenProps> = ({
  assets,
  positions,
  availableBalanceUsd,
  tokens,
  onBack,
  onOpenLearnMore,
  onOpenPosition,
  onClosePosition,
  onUpdateTpSl
}) => {
  const [activeTab, setActiveTab] = useState<'open_strategy' | 'my_positions'>('open_strategy');
  
  // STRATEGY BUILDER STATE
  const [selectedAsset, setSelectedAsset] = useState<StakingProAsset>(assets[0]);
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const [assetSearch, setAssetSearch] = useState('');
  
  // Direction: Long vs Short (Unified interface)
  const [direction, setDirection] = useState<PositionDirection>('long');
  const [executionType, setExecutionType] = useState<ExecutionType>('market');
  const [positionSizeUsd, setPositionSizeUsd] = useState<string>('200');
  const [leverage, setLeverage] = useState<number>(3);
  
  // Entry price
  const [customEntryPrice, setCustomEntryPrice] = useState<string>('');
  const entryPrice = executionType === 'limit' && customEntryPrice 
    ? parseFloat(customEntryPrice) || selectedAsset.currentPrice 
    : selectedAsset.currentPrice;

  // TP and SL
  const [tpPrice, setTpPrice] = useState<string>(() => {
    return (selectedAsset.currentPrice * 1.08).toFixed(2);
  });
  const [slPrice, setSlPrice] = useState<string>(() => {
    return (selectedAsset.currentPrice * 0.95).toFixed(2);
  });

  // Flow states
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Position editing states
  const [editingPosition, setEditingPosition] = useState<StakingProPosition | null>(null);
  const [editTpInput, setEditTpInput] = useState('');
  const [editSlInput, setEditSlInput] = useState('');
  const [positionToClose, setPositionToClose] = useState<StakingProPosition | null>(null);

  // Math & Calculations
  const numPosSize = parseFloat(positionSizeUsd) || 0;
  const requiredCollateral = leverage > 0 ? numPosSize / leverage : numPosSize;
  const numTp = parseFloat(tpPrice) || 0;
  const numSl = parseFloat(slPrice) || 0;

  // Fee calculation (transparent and declared)
  const openingFee = (numPosSize * selectedAsset.takerFeePercent) / 100;
  const estClosingFee = (numPosSize * selectedAsset.takerFeePercent) / 100;
  const spreadCost = (numPosSize * (selectedAsset.spread / selectedAsset.currentPrice));

  // Liquidation price estimation
  const liquidationPrice = direction === 'long'
    ? entryPrice * (1 - (1 / leverage) * 0.9)
    : entryPrice * (1 + (1 / leverage) * 0.9);

  // Validation according to Section 6.2
  const isTpValid = direction === 'long' ? numTp > entryPrice : numTp < entryPrice;
  const isSlValid = direction === 'long' ? numSl < entryPrice : numSl > entryPrice;

  // Estimated P/L
  const estProfitTpPercent = entryPrice > 0 
    ? (direction === 'long' ? ((numTp - entryPrice) / entryPrice) : ((entryPrice - numTp) / entryPrice)) * leverage * 100
    : 0;
  const estProfitTpUsd = (requiredCollateral * estProfitTpPercent) / 100;

  const estLossSlPercent = entryPrice > 0 
    ? (direction === 'long' ? ((numSl - entryPrice) / entryPrice) : ((entryPrice - numSl) / entryPrice)) * leverage * 100
    : 0;
  const estLossSlUsd = (requiredCollateral * estLossSlPercent) / 100;

  // When direction changes, reset sensible default TP/SL
  const handleSelectDirection = (newDir: PositionDirection) => {
    setDirection(newDir);
    if (newDir === 'long') {
      setTpPrice((entryPrice * 1.08).toFixed(2));
      setSlPrice((entryPrice * 0.95).toFixed(2));
    } else {
      setTpPrice((entryPrice * 0.92).toFixed(2));
      setSlPrice((entryPrice * 1.05).toFixed(2));
    }
  };

  const handleAssetSelect = (asset: StakingProAsset) => {
    setSelectedAsset(asset);
    setShowAssetPicker(false);
    const p = asset.currentPrice;
    if (direction === 'long') {
      setTpPrice((p * 1.08).toFixed(2));
      setSlPrice((p * 0.95).toFixed(2));
    } else {
      setTpPrice((p * 0.92).toFixed(2));
      setSlPrice((p * 1.05).toFixed(2));
    }
  };

  const handleOpenConfirmation = () => {
    if (numPosSize <= 0 || requiredCollateral > availableBalanceUsd || !isTpValid || !isSlValid) return;
    setShowConfirmation(true);
  };

  const handleProceedToPin = () => {
    setShowConfirmation(false);
    setShowPinModal(true);
  };

  const handleFinalExecutePosition = () => {
    setShowPinModal(false);
    setIsSubmitting(true);

    setTimeout(() => {
      const newPos: StakingProPosition = {
        id: `pos-${Date.now()}`,
        assetId: selectedAsset.id,
        assetSymbol: selectedAsset.symbol,
        assetName: selectedAsset.name,
        direction,
        executionType,
        entryPrice,
        currentPrice: selectedAsset.currentPrice,
        positionSizeUsd: numPosSize,
        collateralUsd: requiredCollateral,
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
        fundingRate8h: selectedAsset.fundingRate8h,
        accruedFundingUsd: 0,
        stakingYieldUsd: 0, // Separated strictly as per section 4.2 / 6.1
        openedAt: 'Сегодня, 14:30',
        status: 'open'
      };

      const tx: Transaction = {
        id: `tx-${Date.now()}`,
        type: 'swap',
        tokenSymbol: `${selectedAsset.symbol} ${direction.toUpperCase()}`,
        tokenName: 'Trade Pro Strategy',
        amount: requiredCollateral,
        amountUsd: requiredCollateral,
        toAddress: 'VaultSpring Pro Strategy Engine',
        fromAddress: '0x71C...4e8B',
        timestamp: 'Just now',
        status: 'completed',
        hash: `0x${Math.random().toString(16).substring(2, 42)}`,
        fee: openingFee,
        network: selectedAsset.network
      };

      setIsSubmitting(false);
      onOpenPosition(newPos, requiredCollateral, tx);
      setActiveTab('my_positions');
    }, 1000);
  };

  // Close Position Handler
  const handleExecuteClose = (pos: StakingProPosition) => {
    // calculate current live PnL
    const priceDiff = pos.direction === 'long' 
      ? pos.currentPrice - pos.entryPrice 
      : pos.entryPrice - pos.currentPrice;
    const rawPnlPercent = (priceDiff / pos.entryPrice) * pos.leverage;
    const grossPnlUsd = (pos.collateralUsd * rawPnlPercent);
    const netPnlUsd = grossPnlUsd - pos.openingFeeUsd - pos.estClosingFeeUsd - pos.accruedFundingUsd;
    const returnCollateral = Math.max(0, pos.collateralUsd + netPnlUsd);

    onClosePosition(pos.id, returnCollateral, netPnlUsd);
    setPositionToClose(null);
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#07090E] overflow-hidden">
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
            <span className="text-base font-extrabold text-white tracking-tight">Trade Pro</span>
            <span className="text-[10px] text-slate-400">Стратегия Long / Short</span>
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

      {/* Segmented Tabs: Открыть стратегию / Мои позиции */}
      <div className="px-4 border-b border-white/[0.06] flex gap-4 bg-[#07090E]">
        <button
          onClick={() => setActiveTab('open_strategy')}
          className={`py-3 text-xs font-bold relative transition-colors ${
            activeTab === 'open_strategy' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>Открыть стратегию</span>
          {activeTab === 'open_strategy' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('my_positions')}
          className={`py-3 text-xs font-bold relative transition-colors ${
            activeTab === 'my_positions' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>Мои стратегии ({positions.length})</span>
          {activeTab === 'my_positions' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
          )}
        </button>
      </div>

      {/* Main Container */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24 space-y-4">
        {activeTab === 'open_strategy' ? (
          <div className="space-y-4">
            {/* 1. Asset & Direction Selector Card */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Криптоактив</span>
                <span className="text-xs text-slate-400 font-mono">
                  Доступно: ${availableBalanceUsd.toFixed(2)} USD
                </span>
              </div>

              {/* Asset Picker Trigger */}
              <div
                onClick={() => setShowAssetPicker(!showAssetPicker)}
                className="bg-white/[0.04] border border-white/[0.08] hover:border-blue-500/50 rounded-xl p-3 flex items-center justify-between cursor-pointer transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <CryptoIcon symbol={selectedAsset.symbol} network={selectedAsset.network} size={32} />
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-white">{selectedAsset.name}</span>
                    <span className="text-xs text-slate-400 font-mono">
                      ${selectedAsset.currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </div>

              {/* Asset Dropdown */}
              {showAssetPicker && (
                <div className="bg-[#141B2D] border border-white/10 rounded-2xl p-2 max-h-48 overflow-y-auto divide-y divide-white/[0.04] shadow-2xl">
                  {assets.map((a) => (
                    <div
                      key={a.id}
                      onClick={() => handleAssetSelect(a)}
                      className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/[0.05] cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <CryptoIcon symbol={a.symbol} network={a.network} size={26} />
                        <span className="text-xs font-bold text-white">{a.name}</span>
                      </div>
                      <span className="text-xs text-slate-300 font-mono">
                        ${a.currentPrice.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* 2. DIRECTION TOGGLE (Long vs Short) inside same screen */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-semibold text-slate-300">
                  Направление позиции
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-white/[0.04] rounded-xl border border-white/[0.06]">
                  {/* LONG BUTTON */}
                  <button
                    type="button"
                    onClick={() => handleSelectDirection('long')}
                    className={`py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      direction === 'long'
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <TrendingUp className="w-4 h-4" />
                    <span>Рост (Long)</span>
                  </button>

                  {/* SHORT BUTTON */}
                  <button
                    type="button"
                    onClick={() => handleSelectDirection('short')}
                    className={`py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      direction === 'short'
                        ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <TrendingDown className="w-4 h-4" />
                    <span>Падение (Short)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 3. Position Size & Collateral (Explicitly separate) */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-semibold text-slate-300">
                    Сумма позиции (Номинальный размер)
                  </label>
                  <span className="text-slate-400 font-mono text-[11px]">USD</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    value={positionSizeUsd}
                    onChange={(e) => setPositionSizeUsd(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-base font-bold text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    USD
                  </span>
                </div>
              </div>

              {/* Leverage Selector */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Кредитное плечо</span>
                  <span className="font-bold text-blue-400 font-mono">{leverage}x</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 5].map((lev) => (
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

              {/* Required Collateral Callout */}
              <div className="bg-blue-950/20 border border-blue-500/20 rounded-xl p-3 flex items-center justify-between text-xs">
                <span className="text-blue-300 font-medium">Требуемое обеспечение (Маржа):</span>
                <span className="font-extrabold text-white font-mono text-sm">
                  ${requiredCollateral.toFixed(2)} USD
                </span>
              </div>
            </div>

            {/* 4. Take-Profit & Stop-Loss with strict validation */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-3">
              <span className="text-xs font-bold text-slate-300 block">
                Уровни фиксации (Тейк-профит / Стоп-лосс)
              </span>

              {/* Take-Profit Field */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-emerald-400 font-semibold">Тейк-профит (TP)</span>
                  <span className="text-slate-400 font-mono text-[11px]">
                    {direction === 'long' ? '> цены входа' : '< цены входа'}
                  </span>
                </div>
                <input
                  type="number"
                  value={tpPrice}
                  onChange={(e) => setTpPrice(e.target.value)}
                  className={`w-full bg-white/[0.04] border rounded-xl px-3.5 py-2 text-sm font-bold text-white focus:outline-none font-mono ${
                    !isTpValid ? 'border-rose-500 text-rose-300' : 'border-white/[0.08] focus:border-blue-500'
                  }`}
                />
                <div className="flex justify-between text-[11px] font-mono">
                  <span className={isTpValid ? 'text-emerald-400' : 'text-rose-400'}>
                    Расч. прибыль: +${Math.max(0, estProfitTpUsd).toFixed(2)} (+{estProfitTpPercent.toFixed(1)}%)
                  </span>
                </div>
              </div>

              {/* Stop-Loss Field */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-rose-400 font-semibold">Стоп-лосс (SL)</span>
                  <span className="text-slate-400 font-mono text-[11px]">
                    {direction === 'long' ? '< цены входа' : '> цены входа'}
                  </span>
                </div>
                <input
                  type="number"
                  value={slPrice}
                  onChange={(e) => setSlPrice(e.target.value)}
                  className={`w-full bg-white/[0.04] border rounded-xl px-3.5 py-2 text-sm font-bold text-white focus:outline-none font-mono ${
                    !isSlValid ? 'border-rose-500 text-rose-300' : 'border-white/[0.08] focus:border-blue-500'
                  }`}
                />
                <div className="flex justify-between text-[11px] font-mono">
                  <span className={isSlValid ? 'text-rose-400' : 'text-slate-400'}>
                    Расч. убыток: ${estLossSlUsd.toFixed(2)} ({estLossSlPercent.toFixed(1)}%)
                  </span>
                </div>
              </div>

              {/* Validation Error Message */}
              {(!isTpValid || !isSlValid) && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>
                    {direction === 'long'
                      ? 'Для Long тейк-профит должен быть выше цены входа ($' + entryPrice.toFixed(2) + '), а стоп-лосс — ниже.'
                      : 'Для Short тейк-профит должен быть ниже цены входа ($' + entryPrice.toFixed(2) + '), а стоп-лосс — выше.'}
                  </span>
                </div>
              )}
            </div>

            {/* 5. Cost Transparency & Expenses Breakdown */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 space-y-2 text-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Прозрачный расчет расходов
              </span>
              <div className="flex justify-between">
                <span className="text-slate-400">Комиссия открытия (Taker 0.05%)</span>
                <span className="text-white font-mono">${openingFee.toFixed(3)} USD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Оценка комиссии закрытия</span>
                <span className="text-white font-mono">~${estClosingFee.toFixed(3)} USD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Оценка спреда</span>
                <span className="text-white font-mono">~${spreadCost.toFixed(3)} USD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Funding / Swap (8 часов)</span>
                <span className="text-slate-300 font-mono">{selectedAsset.fundingRate8h}% (Платите)</span>
              </div>
              {leverage > 1 && (
                <div className="flex justify-between pt-1 border-t border-white/[0.04]">
                  <span className="text-rose-400 font-medium">Цена ликвидации (Оценка)</span>
                  <span className="text-rose-400 font-mono font-bold">${liquidationPrice.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Disclaimer */}
            <p className="text-[11px] text-slate-500 text-center px-2">
              Оценка расходов. Фактические результаты зависят от рыночной ликвидности и проскальзывания.
            </p>

            {/* Submit Button */}
            <button
              disabled={
                numPosSize <= 0 ||
                requiredCollateral > availableBalanceUsd ||
                !isTpValid ||
                !isSlValid ||
                isSubmitting
              }
              onClick={handleOpenConfirmation}
              className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold text-sm tracking-wide transition-all shadow-lg shadow-blue-600/25 cursor-pointer"
            >
              {requiredCollateral > availableBalanceUsd
                ? `Недостаточно обеспечения (Требуется: $${requiredCollateral.toFixed(2)})`
                : `Открыть ${direction.toUpperCase()} (${selectedAsset.symbol})`}
            </button>
          </div>
        ) : (
          /* MY STRATEGIES / POSITIONS LIST */
          <div className="space-y-3">
            {positions.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs space-y-2">
                <TrendingUp className="w-10 h-10 text-slate-600 mx-auto" />
                <p>У вас пока нет активных стратегий Trade Pro.</p>
                <button
                  onClick={() => setActiveTab('open_strategy')}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs mt-2"
                >
                  Открыть новую стратегию
                </button>
              </div>
            ) : (
              positions.map((pos) => {
                const isLong = pos.direction === 'long';
                const priceDiff = isLong 
                  ? pos.currentPrice - pos.entryPrice 
                  : pos.entryPrice - pos.currentPrice;
                const pnlPercent = (priceDiff / pos.entryPrice) * pos.leverage * 100;
                const pnlUsd = (pos.collateralUsd * pnlPercent) / 100;
                const isPosProfit = pnlUsd >= 0;
                const currentValue = pos.collateralUsd + pnlUsd;

                return (
                  <div
                    key={pos.id}
                    className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-3"
                  >
                    {/* Header: Coin name + Direction */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <CryptoIcon symbol={pos.assetSymbol} size={32} />
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-white">{pos.assetName || pos.assetSymbol}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded inline-flex items-center gap-1 w-fit ${
                            isLong ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                          }`}>
                            {isLong ? '▲ LONG' : '▼ SHORT'} {pos.leverage}x
                          </span>
                        </div>
                      </div>

                      {/* Current value with arrow */}
                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1">
                          {isPosProfit ? (
                            <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L10 6.414l-3.293 3.293a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4 text-rose-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L10 13.586l3.293-3.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                          <span className={`text-sm font-bold font-mono ${isPosProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                            ${currentValue.toFixed(2)}
                          </span>
                        </div>
                        <span className={`text-[10px] font-mono ${isPosProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isPosProfit ? '+' : ''}{pnlUsd.toFixed(2)} ({isPosProfit ? '+' : ''}{pnlPercent.toFixed(2)}%)
                        </span>
                      </div>
                    </div>

                    {/* Detail rows */}
                    <div className="bg-white/[0.02] rounded-xl p-3 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">Направление</span>
                        <span className={`text-xs font-bold font-mono ${isLong ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isLong ? 'Лонг (Рост)' : 'Шорт (Падение)'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">Цена входа</span>
                        <span className="text-xs font-semibold text-white font-mono">
                          ${pos.entryPrice.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">Текущая цена</span>
                        <span className="text-xs font-semibold text-white font-mono">
                          ${pos.currentPrice.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-white/[0.04]">
                        <span className="text-[11px] text-slate-400">Тейк-профит</span>
                        <span className="text-xs font-semibold text-emerald-400 font-mono">
                          ${pos.takeProfitPrice.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">Стоп-лосс</span>
                        <span className="text-xs font-semibold text-rose-400 font-mono">
                          ${pos.stopLossPrice.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => {
                          setEditingPosition(pos);
                          setEditTpInput(pos.takeProfitPrice.toString());
                          setEditSlInput(pos.stopLossPrice.toString());
                        }}
                        className="flex-1 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-semibold text-slate-300 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Изменить TP/SL</span>
                      </button>

                      <button
                        onClick={() => setPositionToClose(pos)}
                        className="flex-1 py-2 rounded-xl bg-rose-600/30 hover:bg-rose-600/40 text-rose-300 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
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

      {/* CONFIRMATION BOTTOM SHEET (Section 6.3) */}
      {showConfirmation && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full sm:max-w-md bg-[#0F1420] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl p-5 pb-24 flex flex-col gap-4 max-h-[85vh] overflow-y-auto">
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
              <div className="flex justify-between">
                <span className="text-slate-400">Актив и направление</span>
                <span className={`font-bold ${direction === 'long' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {selectedAsset.name} · {direction === 'long' ? 'РОСТ (LONG)' : 'ПАДЕНИЕ (SHORT)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Номинальный размер позиции</span>
                <span className="font-mono text-white font-bold">${numPosSize.toFixed(2)} USD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Обеспечение (Собственные средства)</span>
                <span className="font-mono text-blue-400 font-bold">${requiredCollateral.toFixed(2)} USD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Цена входа / Плечо</span>
                <span className="font-mono text-white">${entryPrice.toFixed(2)} · {leverage}x</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Тейк-профит / Стоп-лосс</span>
                <span className="font-mono text-white">${numTp.toFixed(2)} / ${numSl.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-white/[0.04]">
                <span className="text-slate-400">Комиссия открытия</span>
                <span className="font-mono text-white">${openingFee.toFixed(3)} USD</span>
              </div>
            </div>

            <div className="bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl text-[11px] text-rose-300">
              Стоп-лосс не гарантирует цену исполнения при резком движении. Для Short рост цены означает убыток.
            </div>

            <button
              onClick={handleProceedToPin}
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs tracking-wide transition-colors cursor-pointer"
            >
              Подтверждаю открытие позиции
            </button>
          </div>
        </div>
      )}

      {/* 6-DIGIT PIN CONFIRMATION */}
      {showPinModal && (
        <PinVerifyModal
          title="Авторизация Trade Pro"
          description={`Резервирование обеспечения: $${requiredCollateral.toFixed(2)} USD`}
          onSuccess={handleFinalExecutePosition}
          onClose={() => setShowPinModal(false)}
        />
      )}

      {/* EDIT TP / SL MODAL */}
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
                <label className="text-slate-300 font-semibold block mb-1">Новый Тейк-профит</label>
                <input
                  type="number"
                  value={editTpInput}
                  onChange={(e) => setEditTpInput(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Новый Стоп-лосс</label>
                <input
                  type="number"
                  value={editSlInput}
                  onChange={(e) => setEditSlInput(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>
            </div>

            <button
              onClick={() => {
                const t = parseFloat(editTpInput) || 0;
                const s = parseFloat(editSlInput) || 0;
                onUpdateTpSl(editingPosition.id, t, s);
                setEditingPosition(null);
              }}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
            >
              Сохранить изменения
            </button>
          </div>
        </div>
      )}

      {/* CLOSE POSITION CONFIRMATION */}
      {positionToClose && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-[#0F1420] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl p-5 flex flex-col gap-4">
            <span className="text-base font-bold text-white">Закрыть позицию по рынку?</span>
            <p className="text-xs text-slate-300 leading-relaxed">
              Вы закрываете позицию {positionToClose.assetSymbol} ({positionToClose.direction.toUpperCase()}). Обеспечение с учетом финансового результата будет возвращено на ваш доступный баланс.
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
