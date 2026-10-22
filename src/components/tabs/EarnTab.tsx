import React, { useState } from 'react';
import { 
  Layers, TrendingUp, TrendingDown, Info, ChevronRight, ShieldCheck, 
  Sparkles, AlertCircle, ArrowUpRight, CheckCircle2 
} from 'lucide-react';
import { Token, Transaction } from '../../types/wallet';
import { StakingProAsset, StakingProPosition, StakingActiveDeposit } from '../../types/stakingPro';
import { ClassicStakingScreen } from '../earn/ClassicStakingScreen';
import { StakingProScreen } from '../earn/StakingProScreen';
import { LearnMoreModal } from '../earn/LearnMoreModal';
import { CryptoIcon } from '../common/CryptoIcon';
import { TRADING_MARKETS, instrumentCount } from '../../data/tradeCatalog';

interface EarnTabProps {
  tokens: Token[];
  activeDeposits: StakingActiveDeposit[];
  proPositions: StakingProPosition[];
  proAssets: StakingProAsset[];
  availableBalanceUsd: number;
  unlockPeriodHours?: number;
  onDepositSuccess: (deposit: StakingActiveDeposit, updatedToken: Token, tx: Transaction) => void;
  onUnstakeSuccess: (depositId: string, returnAmount: number, symbol: string) => void;
  onUnstakeRequest: (deposit: StakingActiveDeposit) => void;
  onOpenPosition: (position: StakingProPosition, requiredCollateralUsd: number, tx: Transaction) => void;
  onClosePosition: (positionId: string, returnCollateral: number, pnlUsd: number) => void;
  onUpdateTpSl: (positionId: string, newTp: number, newSl: number) => void;
}

export const EarnTab: React.FC<EarnTabProps> = ({
  tokens,
  activeDeposits,
  proPositions,
  proAssets,
  availableBalanceUsd,
  unlockPeriodHours = 48,
  onDepositSuccess,
  onUnstakeSuccess,
  onUnstakeRequest,
  onOpenPosition,
  onClosePosition,
  onUpdateTpSl
}) => {
  const [currentView, setCurrentView] = useState<'main' | 'classic' | 'pro'>('main');
  const [learnMoreTarget, setLearnMoreTarget] = useState<'staking' | 'staking_pro' | null>(null);

  // Total metrics
  const totalStakingUsd = activeDeposits.reduce((acc, d) => acc + d.amountUsd, 0);
  const totalStakingRewardsUsd = activeDeposits.reduce((acc, d) => acc + d.accruedRewardUsd, 0);
  const totalProCollateralUsd = proPositions.reduce((acc, p) => acc + p.collateralUsd, 0);

  // Shared "Learn more" dialog — rendered in every view (main, classic, pro)
  // so the "Узнать больше" button is active regardless of the current screen.
  const learnMoreModal = learnMoreTarget ? (
    <LearnMoreModal
      type={learnMoreTarget}
      onClose={() => setLearnMoreTarget(null)}
      onAction={() => {
        const tgt = learnMoreTarget;
        setLearnMoreTarget(null);
        setCurrentView(tgt === 'staking' ? 'classic' : 'pro');
      }}
    />
  ) : null;

  if (currentView === 'classic') {
    return (
      <>
        <ClassicStakingScreen
          tokens={tokens}
          activeDeposits={activeDeposits}
          onBack={() => setCurrentView('main')}
          onOpenLearnMore={() => setLearnMoreTarget('staking')}
          onDepositSuccess={onDepositSuccess}
          onUnstakeSuccess={onUnstakeSuccess}
          onUnstakeRequest={onUnstakeRequest}
          unlockPeriodHours={unlockPeriodHours}
        />
        {learnMoreModal}
      </>
    );
  }

  if (currentView === 'pro') {
    return (
      <>
        <StakingProScreen
          assets={proAssets}
          positions={proPositions}
          availableBalanceUsd={availableBalanceUsd}
          tokens={tokens}
          onBack={() => setCurrentView('main')}
          onOpenLearnMore={() => setLearnMoreTarget('staking_pro')}
          onOpenPosition={onOpenPosition}
          onClosePosition={onClosePosition}
          onUpdateTpSl={onUpdateTpSl}
        />
        {learnMoreModal}
      </>
    );
  }

  return (
    <>
      <div className="w-full flex-1 overflow-y-auto px-4 py-4 pb-24 space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex flex-col">
          <span className="text-xl font-extrabold text-white tracking-tight">Earn / Доходность</span>
          <span className="text-xs text-slate-400">Два продукта: классический стейкинг и торговый каталог Trade Pro</span>
        </div>
      </div>

      {/* Portfolio Overview Strip — only show if there are active positions */}
      {(totalStakingUsd > 0 || proPositions.length > 0) && (
        <div className="grid grid-cols-2 gap-2.5">
          {totalStakingUsd > 0 && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-3.5 flex flex-col justify-between">
              <span className="text-[11px] text-slate-400 font-medium">В классическом стейкинге</span>
              <span className="text-lg font-extrabold text-white font-mono mt-1">
                ${totalStakingUsd.toFixed(2)}
              </span>
              <span className="text-[10px] text-emerald-400 font-mono mt-0.5">
                +{totalStakingRewardsUsd.toFixed(2)} начислено
              </span>
            </div>
          )}

          {proPositions.length > 0 && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-3.5 flex flex-col justify-between">
              <span className="text-[11px] text-slate-400 font-medium">В Trade Pro (Обеспечение)</span>
              <span className="text-lg font-extrabold text-blue-400 font-mono mt-1">
                ${totalProCollateralUsd.toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5">
                {proPositions.length} открытых позиций
              </span>
            </div>
          )}
        </div>
      )}

      {/* КАРТОЧКА A — STAKING (Требование 3 ТЗ) */}
      <div className="w-full bg-[#0F1422] border border-white/[0.08] rounded-3xl p-5 space-y-4 shadow-xl relative overflow-hidden">
        <div className="flex items-start justify-between">
          <div className="space-y-1 max-w-[260px]">
            <div className="flex items-center gap-2">
              <span className="text-lg font-extrabold text-white tracking-tight">Staking</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                Классический
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Получайте вознаграждения за стейкинг поддерживаемых криптоактивов.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setCurrentView('classic')}
            className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 hover:bg-blue-500/20 hover:border-blue-500/40 transition-colors cursor-pointer"
            title="Открыть Staking"
            aria-label="Открыть Staking"
          >
            <Layers className="w-5 h-5" />
          </button>
        </div>

        {/* Available supported assets preview */}
        <div className="bg-white/[0.02] border border-white/[0.04] rounded-2xl p-3 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Доступные проверенные активы:</span>
            <span className="text-emerald-400 font-bold font-mono">до 14.8% APY*</span>
          </div>

          <div className="flex items-center gap-2">
            {['VLT', 'SOL', 'ETH', 'BNB'].map((sym) => (
              <div
                key={sym}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/[0.04] text-xs font-semibold text-white border border-white/[0.06]"
              >
                <CryptoIcon symbol={sym} size={16} />
                <span>{sym}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
            <span>*Ориентировочная ставка программы. Не гарантия.</span>
            <span>Мин. сумма: от 0.01</span>
          </div>
        </div>

        {/* Buttons: Основная и Информационная */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => setCurrentView('classic')}
            className="flex-1 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs tracking-wide transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Открыть Staking</span>
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => setLearnMoreTarget('staking')}
            className="px-3.5 py-3.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
            title="Узнать больше о стейкинге"
          >
            <Info className="w-4 h-4 text-blue-400" />
          </button>
        </div>
      </div>

      {/* КАРТОЧКА B — TRADE PRO / МУЛЬТИ-РЫНОК (Требование 3 ТЗ) */}
      <div className="w-full bg-[#0F1422] border border-blue-500/20 rounded-3xl p-5 space-y-4 shadow-xl relative overflow-hidden">
        <div className="flex items-start justify-between">
          <div className="space-y-1 max-w-[260px]">
            <div className="flex items-center gap-2">
              <span className="text-lg font-extrabold text-white tracking-tight">Trade Pro</span>
              <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold border border-blue-500/30">
                5 рынков
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Каталог инструментов: крипто, форекс, сырьё, акции и индексы. Обеспечение — в USDT, направление цены и уровни закрытия выбираете вы.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setCurrentView('pro')}
            className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 hover:bg-blue-500/20 hover:border-blue-500/40 transition-colors cursor-pointer"
            title="Открыть Trade Pro"
            aria-label="Открыть Trade Pro"
          >
            <TrendingUp className="w-5 h-5" />
          </button>
        </div>

        {/* Short Labels as specified in 3: «Рост / Long», «Падение / Short», «Тейк-профит», «Стоп-лосс» */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="flex flex-col">
              <span className="font-bold text-white text-[11px]">Рост / Long</span>
              <span className="text-[10px] text-emerald-300">Прибыль при росте цены</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-rose-400 shrink-0" />
            <div className="flex flex-col">
              <span className="font-bold text-white text-[11px]">Падение / Short</span>
              <span className="text-[10px] text-rose-300">Прибыль при снижении</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between bg-white/[0.02] border border-white/[0.04] rounded-xl px-3 py-2 text-xs text-slate-300 font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Тейк-профит (TP)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            <span>Стоп-лосс (SL)</span>
          </div>
        </div>

        {/* Market availability — access comes from the provider, not from the USDT balance */}
        <div className="flex flex-wrap gap-1.5">
          {TRADING_MARKETS.map((m) => (
            <span
              key={m.id}
              className={`px-2 py-1 rounded-lg text-[10px] font-semibold border ${m.providerStatus === 'live' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-white/[0.03] text-slate-400 border-white/[0.06]'}`}
            >
              {m.icon} {m.label} · {instrumentCount(m.id)}
            </span>
          ))}
        </div>

        <div className="text-[11px] text-slate-400 leading-snug">
          Доступ к рынку определяет подключённый провайдер ликвидности, а не остаток USDT. Без гарантированного APY; возможен риск убытка.
        </div>

        {/* Buttons: Основная и Информационная */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => setCurrentView('pro')}
            className="flex-1 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs tracking-wide transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Открыть Trade Pro</span>
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => setLearnMoreTarget('staking_pro')}
            className="px-3.5 py-3.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
            title="Узнать больше о Trade Pro"
          >
            <Info className="w-4 h-4 text-blue-400" />
          </button>
        </div>
      </div>
      </div>
      {learnMoreModal}
    </>
  );
};
