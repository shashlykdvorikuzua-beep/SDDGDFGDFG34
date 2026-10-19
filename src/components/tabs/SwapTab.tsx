import React, { useState } from 'react';
import { ArrowUpDown, Settings2, Sliders, CheckCircle2, ChevronDown, Sparkles } from 'lucide-react';
import { Token, Transaction } from '../../types/wallet';
import { CryptoIcon } from '../common/CryptoIcon';

interface SwapTabProps {
  tokens: Token[];
  walletAddress?: string;
  initialFromToken?: Token;
  onSwapSuccess: (tx: Transaction, updatedFrom: Token, updatedTo: Token) => void;
}

export const SwapTab: React.FC<SwapTabProps> = ({
  tokens,
  walletAddress,
  initialFromToken,
  onSwapSuccess
}) => {
  const [fromToken, setFromToken] = useState<Token>(initialFromToken || tokens.find((t) => t.symbol === 'BNB') || tokens[0]);
  const [toToken, setToToken] = useState<Token>(tokens.find((t) => t.symbol === 'USDT') || tokens[1]);
  const [fromAmount, setFromAmount] = useState<string>('0.5');
  const [slippage, setSlippage] = useState<number>(0.5);
  const [showSettings, setShowSettings] = useState(false);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapCompleted, setSwapCompleted] = useState(false);

  const numFrom = parseFloat(fromAmount) || 0;
  // Calculate output based on real exchange rate
  const exchangeRate = fromToken.price / toToken.price;
  const toAmount = numFrom * exchangeRate * 0.998; // 0.2% LP fee
  const priceImpact = '0.04%';
  const gasFee = 0.42;

  const handleFlip = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
    setFromAmount('1');
  };

  const handleMax = () => {
    setFromAmount(fromToken.balance.toString());
  };

  const handleExecuteSwap = async () => {
    if (numFrom <= 0 || numFrom > fromToken.balance) return;

    setIsSwapping(true);
    try {
      const res = await fetch('/api/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: walletAddress || '0x71C...4e8B',
          fromSymbol: fromToken.symbol,
          toSymbol: toToken.symbol,
          fromAmount: numFrom,
          toAmount,
          fromPrice: fromToken.price,
          toPrice: toToken.price,
          fee: gasFee,
          fromBalanceKey: fromToken.balanceKey || fromToken.symbol,
          toBalanceKey: toToken.balanceKey || toToken.symbol,
          network: fromToken.network
        })
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Swap failed');
        setIsSwapping(false);
        return;
      }

      const data = await res.json();
      
      const updatedFrom: Token = {
        ...fromToken,
        balance: data.balances[fromToken.balanceKey || fromToken.symbol] || 0,
        balanceUsd: (data.balances[fromToken.balanceKey || fromToken.symbol] || 0) * fromToken.price
      };

      const updatedTo: Token = {
        ...toToken,
        balance: data.balances[toToken.balanceKey || toToken.symbol] || 0,
        balanceUsd: (data.balances[toToken.balanceKey || toToken.symbol] || 0) * toToken.price
      };

      setSwapCompleted(true);
      onSwapSuccess(data.transaction, updatedFrom, updatedTo);
      setTimeout(() => setSwapCompleted(false), 3000);
    } catch (err) {
      console.error('Swap error:', err);
      alert('Swap failed. Please try again.');
    } finally {
      setIsSwapping(false);
    }
  };

  return (
    <div className="w-full flex-1 overflow-y-auto px-4 py-4 pb-24 space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2">
          <span className="text-lg font-extrabold text-white tracking-tight">Swap & Trade</span>
          <span className="px-2 py-0.5 rounded-full bg-blue-600/20 text-blue-400 text-[10px] font-bold border border-blue-500/30 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            2026 Router
          </span>
        </div>

        <button
          onClick={() => setShowSettings(!showSettings)}
          className="w-8 h-8 rounded-full bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center text-slate-300 transition-colors"
        >
          <Settings2 className="w-4 h-4" />
        </button>
      </div>

      {/* Slippage Settings Drawer */}
      {showSettings && (
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-3.5 space-y-2 animate-in fade-in duration-150">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Slippage Tolerance</span>
            <span className="text-blue-400 font-bold font-mono">{slippage}%</span>
          </div>
          <div className="flex gap-2">
            {[0.1, 0.5, 1.0, 2.5].map((val) => (
              <button
                key={val}
                onClick={() => setSlippage(val)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  slippage === val
                    ? 'bg-blue-600 text-white border-blue-500'
                    : 'bg-white/[0.02] border-white/[0.06] text-slate-400 hover:text-white'
                }`}
              >
                {val}%
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Swap Container Card */}
      <div className="relative space-y-2">
        {/* FROM INPUT CARD */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">You Pay</span>
            <div className="flex items-center gap-1 text-slate-400">
              <span>Bal: {fromToken.balance.toFixed(4)}</span>
              <button
                onClick={handleMax}
                className="text-blue-400 hover:text-blue-300 font-bold ml-1 cursor-pointer"
              >
                MAX
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <input
              type="number"
              placeholder="0.0"
              value={fromAmount}
              onChange={(e) => setFromAmount(e.target.value)}
              className="w-1/2 bg-transparent text-2xl font-extrabold text-white focus:outline-none font-mono"
            />

            {/* Token Selector Button */}
            <button
              onClick={() => setShowFromPicker(!showFromPicker)}
              className="flex items-center gap-1.5 bg-white/[0.06] hover:bg-white/[0.1] px-2.5 py-2 rounded-xl transition-all cursor-pointer border border-white/[0.08]"
            >
              <CryptoIcon symbol={fromToken.symbol} network={fromToken.network} size={22} />
              <span className="font-bold text-white text-xs">{fromToken.symbol}</span>
              {fromToken.network === 'TRON (TRC-20)' && (
                <span className="text-[9px] font-bold text-[#FF5B65] bg-[#EB0029]/20 px-1 py-0.2 rounded">TRC20</span>
              )}
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>

          <div className="text-[11px] text-slate-400 font-mono">
            ≈ ${(numFrom * fromToken.price).toFixed(2)} USD
          </div>
        </div>

        {/* INVERT / FLIP BUTTON */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <button
            onClick={handleFlip}
            className="w-10 h-10 rounded-full bg-[#0F1420] border-2 border-white/10 hover:border-blue-500 text-blue-400 hover:text-white flex items-center justify-center shadow-xl transition-all cursor-pointer active:rotate-180 duration-200"
          >
            <ArrowUpDown className="w-4 h-4 stroke-[2.4]" />
          </button>
        </div>

        {/* TO INPUT CARD */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">You Receive (Estimate)</span>
            <span className="text-slate-400">Bal: {toToken.balance.toFixed(4)}</span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="w-1/2 text-2xl font-extrabold text-emerald-400 font-mono truncate">
              {toAmount > 0 ? toAmount.toFixed(toAmount < 1 ? 6 : 4) : '0.00'}
            </div>

            {/* Token Selector Button */}
            <button
              onClick={() => setShowToPicker(!showToPicker)}
              className="flex items-center gap-1.5 bg-white/[0.06] hover:bg-white/[0.1] px-2.5 py-2 rounded-xl transition-all cursor-pointer border border-white/[0.08]"
            >
              <CryptoIcon symbol={toToken.symbol} network={toToken.network} size={22} />
              <span className="font-bold text-white text-xs">{toToken.symbol}</span>
              {toToken.network === 'TRON (TRC-20)' && (
                <span className="text-[9px] font-bold text-[#FF5B65] bg-[#EB0029]/20 px-1 py-0.2 rounded">TRC20</span>
              )}
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>

          <div className="text-[11px] text-slate-400 font-mono">
            ≈ ${(toAmount * toToken.price).toFixed(2)} USD
          </div>
        </div>
      </div>

      {/* Token Select Dropdown Modal for FROM or TO */}
      {(showFromPicker || showToPicker) && (
        <div className="bg-[#141B2D] border border-white/10 rounded-2xl p-2 max-h-56 overflow-y-auto divide-y divide-white/[0.04] shadow-2xl">
          <span className="text-[11px] font-bold text-slate-400 px-2 py-1 block uppercase">
            Select Asset
          </span>
          {tokens.map((t) => (
            <div
              key={t.id}
              onClick={() => {
                if (showFromPicker) {
                  setFromToken(t);
                  setShowFromPicker(false);
                } else {
                  setToToken(t);
                  setShowToPicker(false);
                }
              }}
              className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/[0.05] cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <CryptoIcon symbol={t.symbol} network={t.network} size={26} />
                <div className="flex flex-col text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-white">{t.name}</span>
                    {t.network === 'TRON (TRC-20)' && (
                      <span className="text-[9px] font-bold text-[#FF5B65] bg-[#EB0029]/20 px-1 rounded">TRC20</span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    ${t.price >= 1 ? t.price.toFixed(2) : t.price.toFixed(4)} · {t.network === 'TRON (TRC-20)' ? 'TRC-20' : t.network.split(' ')[0]}
                  </span>
                </div>
              </div>
              <span className="text-xs text-slate-300 font-mono">
                {t.balance.toFixed(3)} {t.symbol}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Swap Routing Details Box */}
      <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-3.5 space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-slate-400">Rate</span>
          <span className="font-mono text-white">
            1 {fromToken.symbol} ≈ {exchangeRate.toFixed(4)} {toToken.symbol}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Price Impact</span>
          <span className="font-mono text-emerald-400">{priceImpact}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Minimum Received</span>
          <span className="font-mono text-white">
            {(toAmount * (1 - slippage / 100)).toFixed(4)} {toToken.symbol}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Smart Route</span>
          <span className="text-blue-400 font-medium">Vaultspring DEX V4 Aggregator</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Network Fee</span>
          <span className="font-mono text-slate-300">${gasFee}</span>
        </div>
      </div>

      {/* Success banner if just completed */}
      {swapCompleted && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Swap confirmed! Balances updated immediately.</span>
        </div>
      )}

      {/* SWAP CTA BUTTON */}
      <button
        disabled={numFrom <= 0 || numFrom > fromToken.balance || isSwapping}
        onClick={handleExecuteSwap}
        className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold text-sm tracking-wide transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
      >
        {isSwapping ? (
          <span>Routing & Swapping...</span>
        ) : numFrom > fromToken.balance ? (
          <span>Insufficient {fromToken.symbol} Balance</span>
        ) : (
          <span>Swap Tokens</span>
        )}
      </button>
    </div>
  );
};
