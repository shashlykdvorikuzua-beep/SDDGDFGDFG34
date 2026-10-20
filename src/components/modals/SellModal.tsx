import React, { useState } from 'react';
import { X, CheckCircle2, CreditCard, ChevronDown, ShieldCheck, ArrowUpRight, Clock, AlertCircle } from 'lucide-react';
import { Token, Transaction } from '../../types/wallet';
import { CryptoIcon } from '../common/CryptoIcon';

interface SellModalProps {
  tokens: Token[];
  onClose: () => void;
  onSellSuccess: (tx: Transaction, updatedToken: Token) => void;
}

export const SellModal: React.FC<SellModalProps> = ({
  tokens,
  onClose,
  onSellSuccess
}) => {
  const [selectedToken, setSelectedToken] = useState<Token>(tokens[0]);
  const [showTokenPicker, setShowTokenPicker] = useState(false);
  const [cryptoAmount, setCryptoAmount] = useState<string>('0.05');
  const [fiatCurrency, setFiatCurrency] = useState<'USD' | 'GBP'>('USD');
  const [provider, setProvider] = useState<'moonpay' | 'transak' | 'ramp'>('moonpay');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [step, setStep] = useState<'input' | 'pending' | 'success'>('input');
  
  // Bank details
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [swiftCode, setSwiftCode] = useState('');

  const numCrypto = parseFloat(cryptoAmount) || 0;
  const fiatEstimated = numCrypto * selectedToken.price * 0.985; // 1.5% fee

  const handleMax = () => {
    setCryptoAmount(selectedToken.balance.toString());
  };

  const handleExecuteSell = () => {
    if (numCrypto <= 0 || numCrypto > selectedToken.balance) return;
    if (!bankName || !accountNumber || !accountHolder) return;

    setIsProcessing(true);
    setTimeout(() => {
      const newTx: Transaction = {
        id: `tx-${Date.now()}`,
        type: 'sell',
        tokenSymbol: selectedToken.symbol,
        tokenName: selectedToken.name,
        amount: numCrypto,
        amountUsd: fiatEstimated,
        toAddress: `${provider.toUpperCase()} - ${bankName}`,
        fromAddress: '0x71C...4e8B',
        timestamp: 'Just now',
        status: 'pending',
        hash: `0x${Math.random().toString(16).substring(2, 42)}`,
        fee: fiatEstimated * 0.015,
        network: selectedToken.network
      };

      const updatedToken: Token = {
        ...selectedToken,
        balance: Math.max(0, selectedToken.balance - numCrypto),
        balanceUsd: Math.max(0, (selectedToken.balance - numCrypto) * selectedToken.price)
      };

      setIsProcessing(false);
      setStep('pending');
      onSellSuccess(newTx, updatedToken);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full sm:max-w-md bg-[#0F1420] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl p-5 flex flex-col gap-4 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
          <span className="text-base font-bold text-white">Sell Crypto (Cash Out)</span>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white bg-white/[0.05]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!isSuccess ? (
          <div className="space-y-4">
            {/* Select Crypto to Sell */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-medium">Crypto to Sell</label>
              <div
                onClick={() => setShowTokenPicker(!showTokenPicker)}
                className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 flex items-center justify-between cursor-pointer hover:border-blue-500/50 transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <CryptoIcon symbol={selectedToken.symbol} size={28} />
                  <div className="flex flex-col text-left">
                    <span className="text-sm font-semibold text-white">{selectedToken.name}</span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Available: {selectedToken.balance.toFixed(4)} {selectedToken.symbol}
                    </span>
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </div>

              {showTokenPicker && (
                <div className="bg-[#141B2D] border border-white/10 rounded-xl p-1 max-h-40 overflow-y-auto divide-y divide-white/[0.04] shadow-xl">
                  {tokens.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => {
                        setSelectedToken(t);
                        setShowTokenPicker(false);
                      }}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-white/[0.05] cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <CryptoIcon symbol={t.symbol} size={22} />
                        <span className="text-xs font-semibold text-white">{t.name}</span>
                      </div>
                      <span className="text-xs text-slate-400 font-mono">
                        {t.balance.toFixed(3)} {t.symbol}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Crypto Amount to Sell */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <label className="text-slate-400 font-medium">Amount</label>
                <button
                  type="button"
                  onClick={handleMax}
                  className="text-blue-400 hover:text-blue-300 font-bold"
                >
                  MAX
                </button>
              </div>

              <div className="relative">
                <input
                  type="number"
                  value={cryptoAmount}
                  onChange={(e) => setCryptoAmount(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-3.5 pr-20 py-3 text-lg font-bold text-white focus:outline-none focus:border-blue-500 font-mono"
                />
                <button
                  onClick={() => setShowTokenPicker(!showTokenPicker)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-white/[0.06] hover:bg-white/[0.1] rounded-lg px-2 py-1.5 transition-colors cursor-pointer"
                >
                  <CryptoIcon symbol={selectedToken.symbol} size={18} />
                  <span className="text-xs font-bold text-white font-mono">
                    {selectedToken.symbol}
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>
              </div>
            </div>

            {/* You receive in bank/card */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3 flex items-center justify-between">
              <span className="text-xs text-slate-400">You Receive in Bank / Card</span>
              <span className="text-base font-bold text-emerald-400 font-mono">
                ≈ ${fiatEstimated.toFixed(2)} {fiatCurrency}
              </span>
            </div>

            {/* Payout Gateway */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-medium">Payout Method</label>
              <div className="space-y-1.5">
                {[
                  { id: 'moonpay', name: 'MoonPay Visa Direct / Mastercard', fee: '1.5%', time: 'Instant' },
                  { id: 'transak', name: 'Transak SEPA / Bank Transfer', fee: '1.2%', time: '1-2 hours' },
                  { id: 'ramp', name: 'Ramp Network Cashout', fee: '1.8%', time: 'Instant' }
                ].map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setProvider(p.id as any)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                      provider === p.id
                        ? 'bg-blue-600/10 border-blue-500/60'
                        : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-blue-400" />
                      <span className="text-xs font-semibold text-white">{p.name}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">{p.time}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bank Details */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-medium">Bank Details</label>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Bank Name"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <input
                  type="text"
                  placeholder="Account Holder Name"
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <input
                  type="text"
                  placeholder="Account Number / IBAN"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                />
                <input
                  type="text"
                  placeholder="SWIFT/BIC Code (optional)"
                  value={swiftCode}
                  onChange={(e) => setSwiftCode(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pt-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Certified non-custodial crypto off-ramp payout</span>
            </div>

            <button
              disabled={isProcessing || numCrypto <= 0 || numCrypto > selectedToken.balance || !bankName || !accountNumber || !accountHolder}
              onClick={handleExecuteSell}
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold text-xs tracking-wide transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 cursor-pointer"
            >
              {isProcessing
                ? 'Processing Cashout...'
                : numCrypto > selectedToken.balance
                ? `Insufficient ${selectedToken.symbol}`
                : (!bankName || !accountNumber || !accountHolder)
                ? 'Fill bank details'
                : `Sell to ${provider.toUpperCase()}`}
            </button>
          </div>
        ) : step === 'pending' ? (
          <div className="py-6 flex flex-col items-center text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center animate-pulse">
              <Clock className="w-8 h-8" />
            </div>
            <span className="text-lg font-bold text-white">В обработке</span>
            <p className="text-xs text-slate-400 max-w-xs">
              Заявка на вывод ${fiatEstimated.toFixed(2)} {fiatCurrency} принята и ожидает проверки оператором.
            </p>
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 text-[11px] text-amber-300 max-w-xs">
              Статусы: В обработке → Отправлено → Выполнено
            </div>
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs mt-4 transition-colors"
            >
              Закрыть
            </button>
          </div>
        ) : (
          <div className="py-6 flex flex-col items-center text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <span className="text-lg font-bold text-white">Cashout Ordered!</span>
            <p className="text-xs text-slate-400 max-w-xs">
              ${fiatEstimated.toFixed(2)} {fiatCurrency} has been transferred to your connected bank account.
            </p>

            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs mt-4 transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
