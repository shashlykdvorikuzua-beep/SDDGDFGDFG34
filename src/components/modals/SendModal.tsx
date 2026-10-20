import React, { useState } from 'react';
import { X, ArrowRight, CheckCircle2, ChevronDown, AlertCircle, Clock } from 'lucide-react';
import { Token, Transaction } from '../../types/wallet';
import { CryptoIcon } from '../common/CryptoIcon';
import { executePeerTransfer } from '../../services/walletSyncService';

// Light address validation by network
function validateAddress(network: string, address: string): string | null {
  const a = (address || '').trim();
  if (!a) return 'Укажите адрес получателя';
  // Accept any address that looks reasonably valid (min length check)
  if (a.length < 10) return 'Адрес слишком короткий (мин. 10 символов)';
  return null;
}

interface SendModalProps {
  tokens: Token[];
  initialToken?: Token;
  walletAddress?: string;
  tronAddress?: string;
  fiatCurrency?: string;
  onClose: () => void;
  onSendSuccess: (tx: Transaction, updatedToken: Token) => void;
}

export const SendModal: React.FC<SendModalProps> = ({
  tokens,
  initialToken,
  walletAddress = '0x71C...4e8B',
  tronAddress = 'TYDZSxdvjW6H8HkWtK5J92mNqP7rS8tVwX',
  fiatCurrency = 'USD',
  onClose,
  onSendSuccess
}) => {
  const [selectedToken, setSelectedToken] = useState<Token>(initialToken || tokens[0]);
  const [showTokenPicker, setShowTokenPicker] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [amountMode, setAmountMode] = useState<'crypto' | 'fiat'>('crypto');
  const [gasSpeed, setGasSpeed] = useState<'slow' | 'normal' | 'fast'>('normal');
  const [step, setStep] = useState<'input' | 'confirm' | 'pending'>('input');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);

  const isTron = selectedToken.network === 'TRON (TRC-20)' || selectedToken.symbol === 'TRX';
  const numAmount = parseFloat(amount) || 0;
  // numAmount is always in crypto units internally
  const amountUsd = numAmount * selectedToken.price;
  const fiatSymbol = fiatCurrency === 'USD' ? '$' : fiatCurrency === 'EUR' ? '€' : fiatCurrency === 'GBP' ? '£' : fiatCurrency === 'JPY' ? '¥' : fiatCurrency === 'CNY' ? '¥' : fiatCurrency === 'CHF' ? 'CHF ' : fiatCurrency === 'CAD' ? 'C$' : fiatCurrency === 'AUD' ? 'A$' : fiatCurrency === 'PLN' ? 'zł' : fiatCurrency === 'INR' ? '₹' : '$';
  
  // Realistic gas fees based on network
  const gasFee = isTron 
    ? (gasSpeed === 'slow' ? 0.90 : gasSpeed === 'normal' ? 1.45 : 2.20)
    : (gasSpeed === 'slow' ? 0.20 : gasSpeed === 'normal' ? 0.45 : 1.10);

  // Address validation
  const addressError = recipient ? validateAddress(selectedToken.network, recipient) : null;
  
  // Balance check: amount + gas must not exceed balance
  const isNativeToken = selectedToken.symbol === 'TRX' || selectedToken.symbol === 'ETH' || selectedToken.symbol === 'BNB';
  const totalNeeded = numAmount + (isNativeToken ? gasFee : 0);
  const insufficientBalance = numAmount > 0 && totalNeeded > selectedToken.balance;

  // TRX gas fee check for TRON network (non-TRX tokens)
  const trxToken = tokens.find(t => t.symbol === 'TRX');
  const trxBalance = trxToken?.balance || 0;
  const tronGasFeeInTRX = isTron 
    ? (gasSpeed === 'slow' ? 8 : gasSpeed === 'normal' ? 13.7 : 20)
    : 0;
  const insufficientTrxForGas = isTron && !isNativeToken && numAmount > 0 && trxBalance < tronGasFeeInTRX;

  const handleMax = () => {
    const maxCrypto = isNativeToken ? Math.max(0, selectedToken.balance - gasFee) : selectedToken.balance;
    if (amountMode === 'fiat') {
      setAmount((maxCrypto * selectedToken.price).toFixed(2));
    } else {
      setAmount(maxCrypto.toFixed(6));
    }
  };

  const handleAmountChange = (val: string) => {
    setAmount(val);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setRecipient(text);
    } catch {
      // fallback test address
      setRecipient(isTron ? 'TYDZSxdvjW6H8HkWtK5J92mNqP7rS8tVwX' : '0x4e8B...99a1');
    }
  };

  const handleConfirmSend = async () => {
    setIsSubmitting(true);
    setTransferError(null);

    const fallbackRecipient = isTron ? 'TYDZSxdvjW6H8HkWtK5J92mNqP7rS8tVwX' : '0x4e8B...99a1';
    const targetRecipient = recipient.trim() || fallbackRecipient;
    const senderAddr = isTron ? tronAddress : walletAddress;

    const res = await executePeerTransfer({
      fromAddress: senderAddr,
      toAddress: targetRecipient,
      symbol: selectedToken.symbol,
      tokenName: selectedToken.name,
      network: selectedToken.network,
      amount: numAmount,
      fee: gasFee,
      price: selectedToken.price,
      balanceKey: selectedToken.balanceKey || selectedToken.symbol
    });

    if (res.success && res.transaction) {
      const updatedToken: Token = {
        ...selectedToken,
        balance: Math.max(0, selectedToken.balance - numAmount),
        balanceUsd: Math.max(0, (selectedToken.balance - numAmount) * selectedToken.price)
      };
      setIsSubmitting(false);
      setStep('pending');
      onSendSuccess(res.transaction, updatedToken);
    } else {
      setTransferError(res.error || 'Ошибка при отправке');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full sm:max-w-md bg-[#0F1420] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl p-5 flex flex-col gap-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
          <span className="text-base font-bold text-white">
            {step === 'input' ? 'Отправить' : step === 'confirm' ? 'Подтверждение' : 'В обработке'}
          </span>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white bg-white/[0.05]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* STEP 1: INPUT */}
        {step === 'input' && (
          <div className="space-y-4">
            {/* Select Asset */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-medium">Asset to Send</label>
              <div className="relative">
                <div
                  onClick={() => setShowTokenPicker(!showTokenPicker)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 flex items-center justify-between cursor-pointer hover:border-blue-500/50 transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <CryptoIcon symbol={selectedToken.symbol} size={32} />
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-semibold text-white">{selectedToken.name}</span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Available: {selectedToken.balance.toFixed(4)} {selectedToken.symbol}
                      </span>
                    </div>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${showTokenPicker ? 'rotate-180' : ''}`} />
                </div>

                {/* Token Dropdown - absolute positioned, sorted by balance (highest first) */}
                {showTokenPicker && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-[#141B2D] border border-white/10 rounded-xl p-1 max-h-80 overflow-y-auto divide-y divide-white/[0.04] shadow-2xl z-50">
                    {[...tokens].sort((a, b) => b.balanceUsd - a.balanceUsd).map((t) => (
                      <div
                        key={t.id}
                        onClick={() => {
                          setSelectedToken(t);
                          setShowTokenPicker(false);
                          setAmount(''); // Reset amount when token changes
                        }}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-white/[0.08] cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <CryptoIcon symbol={t.symbol} size={32} />
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-white">{t.name}</span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-slate-500">{t.symbol}</span>
                              {t.network && (
                                <span className="text-[10px] text-slate-600">• {t.network}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <span className="text-xs text-slate-400 font-mono">
                          {t.balance.toFixed(3)} {t.symbol}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recipient Address */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <label className="text-slate-400 font-medium">Recipient Address</label>
                <button
                  type="button"
                  onClick={handlePaste}
                  className="text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
                >
                  Paste
                </button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  placeholder={isTron ? 'T... (TRON TRC-20 Base58 address)' : '0x... or ENS domain or address'}
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className={`w-full bg-white/[0.04] border rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono ${
                    addressError ? 'border-rose-500/50' : 'border-white/[0.08]'
                  }`}
                />
                {addressError && (
                  <p className="text-[10px] text-rose-400 mt-1 px-1">{addressError}</p>
                )}
              </div>
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <label className="text-slate-400 font-medium">Amount</label>
                <div className="flex items-center gap-2">
                  {/* Crypto/Fiat toggle */}
                  <div className="flex bg-white/[0.04] rounded-lg border border-white/[0.06] p-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (amountMode === 'crypto') {
                          // Switch to fiat: convert current crypto amount to fiat
                          const fiatVal = numAmount * selectedToken.price;
                          setAmount(fiatVal > 0 ? fiatVal.toFixed(2) : '');
                          setAmountMode('fiat');
                        } else {
                          // Switch to crypto: convert current fiat amount to crypto
                          const fiatNum = parseFloat(amount) || 0;
                          const cryptoVal = selectedToken.price > 0 ? fiatNum / selectedToken.price : 0;
                          setAmount(cryptoVal > 0 ? cryptoVal.toFixed(6) : '');
                          setAmountMode('crypto');
                        }
                      }}
                      className="px-2 py-0.5 rounded text-[10px] font-bold transition-all"
                      style={{
                        background: amountMode === 'crypto' ? 'rgba(59,130,246,0.2)' : 'transparent',
                        color: amountMode === 'crypto' ? '#60a5fa' : '#94a3b8'
                      }}
                    >
                      {selectedToken.symbol}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (amountMode === 'crypto') {
                          const fiatVal = numAmount * selectedToken.price;
                          setAmount(fiatVal > 0 ? fiatVal.toFixed(2) : '');
                          setAmountMode('fiat');
                        } else {
                          const fiatNum = parseFloat(amount) || 0;
                          const cryptoVal = selectedToken.price > 0 ? fiatNum / selectedToken.price : 0;
                          setAmount(cryptoVal > 0 ? cryptoVal.toFixed(6) : '');
                          setAmountMode('crypto');
                        }
                      }}
                      className="px-2 py-0.5 rounded text-[10px] font-bold transition-all"
                      style={{
                        background: amountMode === 'fiat' ? 'rgba(59,130,246,0.2)' : 'transparent',
                        color: amountMode === 'fiat' ? '#60a5fa' : '#94a3b8'
                      }}
                    >
                      {fiatCurrency}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleMax}
                    className="text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
                  >
                    MAX
                  </button>
                </div>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  placeholder="0.0"
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-3.5 pr-16 py-2.5 text-sm font-semibold text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">
                  {amountMode === 'crypto' ? selectedToken.symbol : fiatSymbol}
                </span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 px-1 font-mono">
                <span>
                  {amountMode === 'crypto'
                    ? `≈ ${fiatSymbol}${amountUsd.toFixed(2)} ${fiatCurrency}`
                    : `≈ ${(numAmount / (selectedToken.price || 1)).toFixed(6)} ${selectedToken.symbol}`
                  }
                </span>
                <span>
                  Max: {amountMode === 'crypto'
                    ? `${selectedToken.balance.toFixed(4)} ${selectedToken.symbol}`
                    : `${fiatSymbol}${(selectedToken.balance * selectedToken.price).toFixed(2)} ${fiatCurrency}`
                  }
                </span>
              </div>
              {insufficientBalance && (
                <p className="text-[11px] text-rose-400 px-1">Недостаточно средств (сумма + комиссия превышают баланс)</p>
              )}
              {!isNativeToken && isTron && numAmount > 0 && (
                <p className={`text-[10px] px-1 ${insufficientTrxForGas ? 'text-rose-400 font-semibold' : 'text-amber-400'}`}>
                  {insufficientTrxForGas 
                    ? `❌ Недостаточно TRX для газа. Нужно: ${tronGasFeeInTRX} TRX, у вас: ${trxBalance.toFixed(2)} TRX` 
                    : `⚠ Комиссия оплачивается в TRX. У вас: ${trxBalance.toFixed(2)} TRX`}
                </p>
              )}
            </div>

            {/* Gas Speed Selector */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between items-center text-xs">
                <label className="text-slate-400 font-medium">Network Gas Priority</label>
                {isTron && (
                  <span className="text-[10px] text-rose-400 font-medium">TRON Energy/Bandwidth</span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(['slow', 'normal', 'fast'] as const).map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => setGasSpeed(spd)}
                    className={`py-2 px-2 rounded-xl text-xs font-semibold capitalize border transition-all ${
                      gasSpeed === spd
                        ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                        : 'bg-white/[0.02] border-white/[0.06] text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>{spd}</span>
                    <span className="block text-[10px] text-slate-500 font-mono font-normal">
                      {isTron
                        ? (spd === 'slow' ? '$0.90 (8 TRX)' : spd === 'normal' ? '$1.45 (13.7 TRX)' : '$2.20 (20 TRX)')
                        : (spd === 'slow' ? '$0.20' : spd === 'normal' ? '$0.45' : '$1.10')}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Next Button */}
            <button
              disabled={!numAmount || numAmount <= 0 || numAmount > selectedToken.balance || !!addressError || insufficientBalance || insufficientTrxForGas}
              onClick={() => setStep('confirm')}
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-xs tracking-wide transition-colors flex items-center justify-center gap-2 mt-2 cursor-pointer shadow-lg shadow-blue-600/20"
            >
              <span>Review Details</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 2: CONFIRM */}
        {step === 'confirm' && (
          <div className="space-y-4">
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 flex flex-col items-center">
              <CryptoIcon symbol={selectedToken.symbol} size={44} />
              <span className="text-2xl font-bold text-white font-mono mt-2">
                -{numAmount} {selectedToken.symbol}
              </span>
              <span className="text-xs text-slate-400 font-mono mt-0.5">
                ≈ ${amountUsd.toFixed(2)} USD
              </span>
            </div>

            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-3.5 space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-white/[0.04]">
                <span className="text-slate-400">Recipient</span>
                <span className="text-white font-mono truncate max-w-[170px]">
                  {recipient || '0x4e8B...99a1'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/[0.04]">
                <span className="text-slate-400">Network</span>
                <span className="text-white">{selectedToken.network}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/[0.04]">
                <span className="text-slate-400">Est. Network Fee</span>
                <span className="text-white font-mono">${gasFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400 font-semibold">Total Debited</span>
                <span className="text-blue-400 font-bold font-mono">
                  ${(amountUsd + gasFee).toFixed(2)} USD
                </span>
              </div>
            </div>

            {transferError && (
              <div className="bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl flex items-center gap-2 text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{transferError}</span>
              </div>
            )}

            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setStep('input')}
                className="w-1/3 py-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 font-semibold text-xs transition-colors"
              >
                Back
              </button>
              <button
                disabled={isSubmitting}
                onClick={handleConfirmSend}
                className="w-2/3 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25"
              >
                {isSubmitting ? (
                  <span>Broadcasting TX...</span>
                ) : (
                  <span>Confirm & Send</span>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: PENDING (processing, not success) */}
        {step === 'pending' && (
          <div className="py-6 flex flex-col items-center text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center animate-pulse">
              <Clock className="w-8 h-8" />
            </div>
            <span className="text-lg font-bold text-white">В обработке</span>
            <p className="text-xs text-slate-400 max-w-xs">
              Транзакция отправлена и ожидает подтверждения. Статус обновится после проверки оператором.
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
        )}
      </div>
    </div>
  );
};
