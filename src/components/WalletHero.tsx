import React, { useState } from 'react';
import { 
  Eye, EyeOff, ArrowUp, ArrowDown, Banknote, ArrowLeftRight, 
  TrendingUp, ShieldAlert, X, ChevronRight, Sparkles, RotateCw,
  Clock, AlertCircle, CheckCircle2, Bell
} from 'lucide-react';

interface WalletHeroProps {
  totalBalanceUsd: number;
  change24hUsd: number;
  change24hPercent: number;
  stakingBalanceUsd: number;
  stakingProfitUsd: number;
  tradingBalanceUsd: number;
  tradingProfitUsd: number;
  isUpdatingPrices?: boolean;
  onRefreshPrices?: () => void;
  lastPriceUpdate?: Date | null;
  onOpenSend: () => void;
  onOpenReceive: () => void;
  onOpenSell: () => void;
  onOpenSwap: () => void;
  onOpenEarn: () => void;
  verificationStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  onOpenVerification?: () => void;
  activityCount?: number;
  onOpenActivity?: () => void;
}

export const WalletHero: React.FC<WalletHeroProps> = ({
  totalBalanceUsd,
  change24hUsd,
  change24hPercent,
  stakingBalanceUsd,
  stakingProfitUsd,
  tradingBalanceUsd,
  tradingProfitUsd,
  isUpdatingPrices = false,
  onRefreshPrices,
  lastPriceUpdate,
  onOpenSend,
  onOpenReceive,
  onOpenSell,
  onOpenSwap,
  onOpenEarn,
  verificationStatus = 'none',
  onOpenVerification,
  activityCount = 0,
  onOpenActivity
}) => {
  const [showBalance, setShowBalance] = useState(true);
  const [showBanner, setShowBanner] = useState(true);

  const isPositive = change24hPercent >= 0;

  return (
    <div className="w-full pt-4 pb-2 px-4 flex flex-col items-center">
      {/* Balance label & Eye toggle */}
      <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
        <span>Main Portfolio</span>
        <button
          onClick={() => setShowBalance(!showBalance)}
          className="text-slate-400 hover:text-white transition-colors cursor-pointer p-0.5"
          title={showBalance ? 'Hide balance' : 'Show balance'}
        >
          {showBalance ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Large Balance Display */}
      <div className="mt-1 flex items-baseline justify-center">
        {showBalance ? (
          <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-mono tabular-nums">
            ${totalBalanceUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        ) : (
          <span className="text-3xl sm:text-4xl font-bold text-slate-400 tracking-widest font-mono">
            ••••••••
          </span>
        )}
      </div>

      {/* 24h P&L Indicator */}
      {showBalance && (
        <div className={`mt-1.5 flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
          isPositive ? 'bg-emerald-500/10 text-[#0ECB81]' : 'bg-rose-500/10 text-[#F6465D]'
        }`}>
          <TrendingUp className={`w-3.5 h-3.5 ${!isPositive ? 'rotate-180' : ''}`} />
          <span className="tabular-nums">
            {isPositive ? '+' : '-'}${Math.abs(change24hUsd).toFixed(2)} ({isPositive ? '+' : ''}{change24hPercent.toFixed(2)}%)
          </span>
        </div>
      )}

      {/* Verification Status Badge (approved) */}
      {verificationStatus === 'approved' && (
        <div className="mt-2 flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[11px] font-semibold text-emerald-300">Верифицирован</span>
        </div>
      )}

      {/* Verification Status Banner (pending/rejected) */}
      {(verificationStatus === 'pending' || verificationStatus === 'rejected') && onOpenVerification && (
        <div className={`w-full mt-3 rounded-xl p-3 flex items-center justify-between text-xs ${
          verificationStatus === 'pending'
            ? 'bg-amber-500/10 border border-amber-500/20'
            : 'bg-rose-500/10 border border-rose-500/20'
        }`}>
          <div className="flex items-center gap-2.5 flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              verificationStatus === 'pending'
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-rose-500/20 text-rose-400'
            }`}>
              {verificationStatus === 'pending' ? <Clock className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            </div>
            <div className="flex flex-col">
              <span className={`font-bold leading-tight ${
                verificationStatus === 'pending' ? 'text-amber-300' : 'text-rose-300'
              }`}>
                {verificationStatus === 'pending' ? 'Документы на проверке' : 'Верификация отклонена'}
              </span>
              <span className="text-[11px] text-slate-400 mt-0.5">
                {verificationStatus === 'pending' ? 'Обычно 24-48 часов' : 'Загрузите документы снова'}
              </span>
            </div>
          </div>
          <button
            onClick={onOpenVerification}
            className={`px-3 py-1.5 rounded-lg font-semibold text-[11px] transition-colors ${
              verificationStatus === 'pending'
                ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                : 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30'
            }`}
          >
            {verificationStatus === 'pending' ? 'Заменить' : 'Загрузить снова'}
          </button>
        </div>
      )}

      {/* Live Market Price Status Indicator */}
      <div className="mt-2 flex items-center gap-2">
        <button
          onClick={onRefreshPrices}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-[10px] text-slate-400 transition-colors cursor-pointer group"
          title="Refresh prices"
        >
          <RotateCw className={`w-3 h-3 ${isUpdatingPrices ? 'animate-spin text-blue-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
        </button>
      </div>

      {/* Primary Circular Action Buttons (Send, Receive, Sell, Swap) */}
      <div className="w-full grid grid-cols-4 gap-3 mt-5 px-2 max-w-sm">
        {/* Send */}
        <button
          onClick={onOpenSend}
          className="flex flex-col items-center gap-1.5 group cursor-pointer"
        >
          <div className="w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-600/30 transition-all group-active:scale-95">
            <ArrowUp className="w-6 h-6 stroke-[2.4]" />
          </div>
          <span className="text-[11px] font-semibold text-slate-300 group-hover:text-white transition-colors">
            Send
          </span>
        </button>

        {/* Receive */}
        <button
          onClick={onOpenReceive}
          className="flex flex-col items-center gap-1.5 group cursor-pointer"
        >
          <div className="w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-600/30 transition-all group-active:scale-95">
            <ArrowDown className="w-6 h-6 stroke-[2.4]" />
          </div>
          <span className="text-[11px] font-semibold text-slate-300 group-hover:text-white transition-colors">
            Receive
          </span>
        </button>

        {/* Sell */}
        <button
          onClick={onOpenSell}
          className="flex flex-col items-center gap-1.5 group cursor-pointer"
        >
          <div className="w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-600/30 transition-all group-active:scale-95">
            <Banknote className="w-6 h-6 stroke-[2.2]" />
          </div>
          <span className="text-[11px] font-semibold text-slate-300 group-hover:text-white transition-colors">
            Sell
          </span>
        </button>

        {/* Swap */}
        <button
          onClick={onOpenSwap}
          className="flex flex-col items-center gap-1.5 group cursor-pointer"
        >
          <div className="w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-600/30 transition-all group-active:scale-95">
            <ArrowLeftRight className="w-6 h-6 stroke-[2.4]" />
          </div>
          <span className="text-[11px] font-semibold text-slate-300 group-hover:text-white transition-colors">
            Swap
          </span>
        </button>
      </div>

      {/* Activity Banner (when there are pending items) */}
      {activityCount > 0 && onOpenActivity && (
        <div 
          onClick={onOpenActivity}
          className="w-full mt-3 bg-gradient-to-r from-blue-900/30 to-indigo-900/20 border border-blue-500/20 rounded-2xl p-3 flex items-center justify-between text-xs cursor-pointer hover:from-blue-900/40 hover:to-indigo-900/30 transition-all"
        >
          <div className="flex items-center gap-2.5 flex-1">
            <div className="w-8 h-8 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0 relative">
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {activityCount}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-white leading-tight">
                Активность
              </span>
              <span className="text-[11px] text-slate-400 mt-0.5">
                {activityCount === 1 ? '1 операция в обработке' : `${activityCount} операций в обработке`}
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-blue-400" />
        </div>
      )}

      {/* Trust Wallet Security & Earn Announcement Banner */}
      {showBanner && (
        <div className="w-full mt-4 bg-gradient-to-r from-blue-900/30 to-indigo-900/20 border border-blue-500/20 rounded-2xl p-3 flex items-center justify-between text-xs transition-all">
          <div 
            onClick={onOpenEarn}
            className="flex items-center gap-2.5 cursor-pointer flex-1"
          >
            <div className="w-8 h-8 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-white leading-tight">
                Vaultspring Earn 2026
              </span>
              <span className="text-[11px] text-slate-400 mt-0.5">
                Stake VLT, SOL & BNB up to 14.8% APY
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={onOpenEarn}
              className="text-blue-400 hover:text-blue-300 p-1"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowBanner(false)}
              className="text-slate-500 hover:text-slate-300 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
