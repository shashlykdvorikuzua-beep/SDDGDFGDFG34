import React, { useState } from 'react';
import { ArrowLeft, ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Copy, Check, ExternalLink, ShieldCheck } from 'lucide-react';
import { Token } from '../types/wallet';
import { CryptoIcon } from './common/CryptoIcon';
import { PriceChart } from './common/PriceChart';

interface TokenDetailModalProps {
  token: Token | null;
  onClose: () => void;
  onOpenSend: (token: Token) => void;
  onOpenReceive: (token: Token) => void;
  onOpenSwap: (token: Token) => void;
}

export const TokenDetailModal: React.FC<TokenDetailModalProps> = ({
  token,
  onClose,
  onOpenSend,
  onOpenReceive,
  onOpenSwap
}) => {
  const [copiedAddress, setCopiedAddress] = useState(false);

  if (!token) return null;

  const handleCopyContract = () => {
    if (token.contractAddress) {
      navigator.clipboard.writeText(token.contractAddress);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  };

  // Mock Market Stats
  const marketCapEstimate = (token.price * 18500000).toLocaleString('en-US', { maximumFractionDigits: 0 });
  const volume24h = (token.price * 950000).toLocaleString('en-US', { maximumFractionDigits: 0 });
  const athPrice = (token.price * 1.34).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="fixed inset-0 z-40 bg-[#040609]/80 backdrop-blur-sm flex justify-center animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#07090E] h-full flex flex-col overflow-hidden border-x border-white/[0.05]">
        {/* Top Header */}
      <div className="w-full px-4 py-3 flex items-center justify-between border-b border-white/[0.06] bg-[#07090E]">
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <CryptoIcon symbol={token.symbol} size={24} />
          <span className="font-bold text-white text-base">{token.name}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-white/[0.08] text-slate-300 font-mono">
            {token.symbol}
          </span>
        </div>

        <div className="w-9 h-9 flex items-center justify-center text-emerald-400" title="Security Verified">
          <ShieldCheck className="w-5 h-5" />
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 pb-24">
        {/* Interactive Chart */}
        <PriceChart
          data={token.sparkline}
          basePrice={token.price}
          change24h={token.change24h}
          symbol={token.symbol}
        />

        {/* User Balance Card */}
        <div className="w-full bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs text-slate-400 font-medium">Your Balance</span>
            <span className="text-xl font-bold text-white font-mono mt-0.5">
              {token.balance.toLocaleString('en-US', { maximumFractionDigits: 4 })} {token.symbol}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xs text-slate-400 font-medium">Value</span>
            <span className="text-lg font-bold text-blue-400 font-mono mt-0.5">
              ${token.balanceUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* 3 Action Buttons */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => onOpenSend(token)}
            className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-2xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] transition-all cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-full bg-blue-600 group-hover:bg-blue-500 text-white flex items-center justify-center shadow-md">
              <ArrowUpRight className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className="text-xs font-semibold text-slate-200 group-hover:text-white">Send</span>
          </button>

          <button
            onClick={() => onOpenReceive(token)}
            className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-2xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] transition-all cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-full bg-blue-600 group-hover:bg-blue-500 text-white flex items-center justify-center shadow-md">
              <ArrowDownLeft className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className="text-xs font-semibold text-slate-200 group-hover:text-white">Receive</span>
          </button>

          <button
            onClick={() => onOpenSwap(token)}
            className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-2xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] transition-all cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-full bg-blue-600 group-hover:bg-blue-500 text-white flex items-center justify-center shadow-md">
              <ArrowLeftRight className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className="text-xs font-semibold text-slate-200 group-hover:text-white">Swap</span>
          </button>
        </div>

        {/* Market Stats */}
        <div className="space-y-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Market Statistics (2026)
          </span>

          <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 divide-y divide-white/[0.04] text-xs">
            <div className="flex justify-between py-2">
              <span className="text-slate-400">Market Cap</span>
              <span className="font-semibold text-white font-mono">${marketCapEstimate}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-400">24h Trading Volume</span>
              <span className="font-semibold text-white font-mono">${volume24h}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-400">All-Time High (ATH)</span>
              <span className="font-semibold text-white font-mono">${athPrice}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-400">Network / Protocol</span>
              <span className="font-semibold text-white">{token.network}</span>
            </div>
            {token.contractAddress && (
              <div className="flex justify-between items-center py-2">
                <span className="text-slate-400">Contract Address</span>
                <button
                  onClick={handleCopyContract}
                  className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 font-mono"
                >
                  <span className="truncate max-w-[130px]">{token.contractAddress}</span>
                  {copiedAddress ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};
