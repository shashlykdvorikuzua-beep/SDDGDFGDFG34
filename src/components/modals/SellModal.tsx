import React, { useState } from 'react';
import { X, CheckCircle2, CreditCard, ChevronDown, ShieldCheck, Clock, Upload, FileText, AlertCircle, Building2 } from 'lucide-react';
import { Token, Transaction } from '../../types/wallet';
import { CryptoIcon } from '../common/CryptoIcon';

interface SellModalProps {
  tokens: Token[];
  walletAddress?: string;
  isVerified?: boolean;
  onClose: () => void;
  onSellSuccess: (tx: Transaction, updatedToken: Token) => void;
  onVerificationSubmit: (data: VerificationData) => void;
}

export interface VerificationData {
  fullName: string;
  documentType: 'passport' | 'id_card' | 'drivers_license';
  documentNumber: string;
  payoutMethod: 'bank_transfer' | 'card';
  bankName?: string;
  accountHolder?: string;
  iban?: string;
  swiftCode?: string;
  cardNumber?: string;
  cardHolder?: string;
  cardExpiry?: string;
}

export const SellModal: React.FC<SellModalProps> = ({
  tokens,
  walletAddress = '0x71C...4e8B',
  isVerified = false,
  onClose,
  onSellSuccess,
  onVerificationSubmit
}) => {
  // Verification state
  const [verStep, setVerStep] = useState<'form' | 'pending' | 'rejected'>('form');
  const [verRejectReason, setVerRejectReason] = useState('');
  
  // Verification form
  const [fullName, setFullName] = useState('');
  const [documentType, setDocumentType] = useState<'passport' | 'id_card' | 'drivers_license'>('passport');
  const [documentNumber, setDocumentNumber] = useState('');
  const [payoutMethod, setPayoutMethod] = useState<'bank_transfer' | 'card'>('bank_transfer');
  const [bankName, setBankName] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [iban, setIban] = useState('');
  const [swiftCode, setSwiftCode] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [documentFile, setDocumentFile] = useState<string | null>(null);

  // Sell state
  const [selectedToken, setSelectedToken] = useState<Token>(tokens[0]);
  const [showTokenPicker, setShowTokenPicker] = useState(false);
  const [cryptoAmount, setCryptoAmount] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [sellStep, setSellStep] = useState<'input' | 'confirm' | 'pending'>('input');

  const numCrypto = parseFloat(cryptoAmount) || 0;
  const feePercentage = 0.055; // 5.5%
  const feeUsd = numCrypto * selectedToken.price * feePercentage;
  const recipientUsd = numCrypto * selectedToken.price - feeUsd;
  const fiatSymbol = '$';

  const handleMax = () => {
    setCryptoAmount(selectedToken.balance.toString());
  };

  const handleVerificationSubmit = () => {
    if (!fullName || !documentNumber || !documentFile) return;
    if (payoutMethod === 'bank_transfer' && (!bankName || !accountHolder || !iban)) return;
    if (payoutMethod === 'card' && (!cardNumber || !cardHolder || !cardExpiry)) return;

    const verData: VerificationData = {
      fullName,
      documentType,
      documentNumber,
      payoutMethod,
      ...(payoutMethod === 'bank_transfer' ? { bankName, accountHolder, iban, swiftCode } : {}),
      ...(payoutMethod === 'card' ? { cardNumber, cardHolder, cardExpiry } : {})
    };

    onVerificationSubmit(verData);
    onClose();
  };

  const handleExecuteSell = () => {
    if (numCrypto <= 0 || numCrypto > selectedToken.balance) return;

    setIsProcessing(true);
    setTimeout(() => {
      const newTx: Transaction = {
        id: `tx-${Date.now()}`,
        type: 'sell',
        tokenSymbol: selectedToken.symbol,
        tokenName: selectedToken.name,
        amount: numCrypto,
        amountUsd: recipientUsd,
        toAddress: payoutMethod === 'bank_transfer' ? `Bank: ${bankName}` : `Card: ${cardNumber}`,
        fromAddress: walletAddress,
        timestamp: 'Just now',
        status: 'pending',
        hash: `0x${Math.random().toString(16).substring(2, 42)}`,
        fee: feeUsd,
        network: selectedToken.network
      };

      const updatedToken: Token = {
        ...selectedToken,
        balance: Math.max(0, selectedToken.balance - numCrypto),
        balanceUsd: Math.max(0, (selectedToken.balance - numCrypto) * selectedToken.price)
      };

      setIsProcessing(false);
      setSellStep('pending');
      onSellSuccess(newTx, updatedToken);
    }, 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDocumentFile(file.name);
    }
  };

  // ==================== RENDER ====================

  // NOT VERIFIED - Show verification flow
  if (!isVerified) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
        <div className="w-full sm:max-w-md bg-[#0F1420] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl p-5 flex flex-col gap-4 max-h-[92vh] overflow-y-auto">
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
            <span className="text-base font-bold text-white">
              {verStep === 'form' ? 'Верификация' : verStep === 'pending' ? 'На проверке' : 'Отклонено'}
            </span>
            <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white bg-white/[0.05]">
              <X className="w-4 h-4" />
            </button>
          </div>

          {verStep === 'form' && (
            <div className="space-y-4">
              {/* Info */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 flex items-start gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-blue-300 font-semibold">Требуется верификация</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Загрузите документ и укажите реквизиты для вывода средств</p>
                </div>
              </div>

              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium">Full Name (as on document)</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ivan Ivanov"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Document Type */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium">Document Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { id: 'passport', label: 'Passport' },
                    { id: 'id_card', label: 'ID Card' },
                    { id: 'drivers_license', label: "Driver's License" }
                  ] as const).map((d) => (
                    <button
                      key={d.id}
                      onClick={() => setDocumentType(d.id)}
                      className={`py-2 rounded-xl text-[11px] font-semibold border transition-all ${
                        documentType === d.id
                          ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                          : 'bg-white/[0.02] border-white/[0.06] text-slate-400'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Document Number */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium">Document Number</label>
                <input
                  type="text"
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  placeholder="AB1234567"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              {/* Document Upload */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium">Upload Document Photo</label>
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-white/[0.1] rounded-xl p-4 cursor-pointer hover:border-blue-500/50 transition-colors">
                  <Upload className="w-6 h-6 text-slate-400 mb-1" />
                  <span className="text-[11px] text-slate-400">
                    {documentFile || 'Tap to upload photo'}
                  </span>
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>

              {/* Payout Method */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium">Payout Method</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPayoutMethod('bank_transfer')}
                    className={`py-2.5 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                      payoutMethod === 'bank_transfer'
                        ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                        : 'bg-white/[0.02] border-white/[0.06] text-slate-400'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    Bank Transfer
                  </button>
                  <button
                    onClick={() => setPayoutMethod('card')}
                    className={`py-2.5 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                      payoutMethod === 'card'
                        ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                        : 'bg-white/[0.02] border-white/[0.06] text-slate-400'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    Card
                  </button>
                </div>
              </div>

              {/* Bank Transfer Fields */}
              {payoutMethod === 'bank_transfer' && (
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
                    placeholder="IBAN"
                    value={iban}
                    onChange={(e) => setIban(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                  />
                  <input
                    type="text"
                    placeholder="SWIFT/BIC (optional)"
                    value={swiftCode}
                    onChange={(e) => setSwiftCode(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              )}

              {/* Card Fields */}
              {payoutMethod === 'card' && (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Card Number"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim())}
                    maxLength={19}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                  />
                  <input
                    type="text"
                    placeholder="Cardholder Name"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Expiry (MM/YY)"
                    value={cardExpiry}
                    onChange={(e) => {
                      let v = e.target.value.replace(/\D/g, '');
                      if (v.length >= 2) v = v.slice(0, 2) + '/' + v.slice(2, 4);
                      setCardExpiry(v);
                    }}
                    maxLength={5}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              )}

              <button
                disabled={!fullName || !documentNumber || !documentFile || 
                  (payoutMethod === 'bank_transfer' && (!bankName || !accountHolder || !iban)) ||
                  (payoutMethod === 'card' && (!cardNumber || !cardHolder || !cardExpiry))}
                onClick={handleVerificationSubmit}
                className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-xs tracking-wide transition-colors shadow-lg shadow-blue-600/20 cursor-pointer"
              >
                Submit for Verification
              </button>
            </div>
          )}

          {verStep === 'pending' && (
            <div className="py-6 flex flex-col items-center text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center animate-pulse">
                <Clock className="w-8 h-8" />
              </div>
              <span className="text-lg font-bold text-white">На проверке</span>
              <p className="text-xs text-slate-400 max-w-xs">
                Ваши документы и реквизиты отправлены на проверку оператором. После подтверждения вы сможете выводить средства.
              </p>
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 text-[11px] text-amber-300 max-w-xs">
                Обычно проверка занимает 24-48 часов
              </div>
              <button onClick={onClose} className="w-full py-3 rounded-xl bg-white/[0.06] text-slate-300 font-semibold text-xs mt-4 transition-colors">
                Закрыть
              </button>
            </div>
          )}

          {verStep === 'rejected' && (
            <div className="py-6 flex flex-col items-center text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center">
                <AlertCircle className="w-8 h-8" />
              </div>
              <span className="text-lg font-bold text-white">Отклонено</span>
              <p className="text-xs text-slate-400 max-w-xs">
                {verRejectReason || 'Ваши документы не прошли проверку. Попробуйте ещё раз.'}
              </p>
              <button onClick={() => setVerStep('form')} className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold text-xs mt-4 transition-colors">
                Попробовать снова
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // VERIFIED - Show sell flow
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full sm:max-w-md bg-[#0F1420] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl p-5 flex flex-col gap-4 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
          <span className="text-base font-bold text-white">
            {sellStep === 'input' ? 'Продать крипто' : sellStep === 'confirm' ? 'Подтверждение' : 'В обработке'}
          </span>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white bg-white/[0.05]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {sellStep === 'input' && (
          <div className="space-y-4">
            {/* Verified badge */}
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-2.5 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-[11px] text-emerald-300 font-semibold">Верифицирован</span>
              <span className="text-[10px] text-slate-400 ml-auto">
                {payoutMethod === 'bank_transfer' ? `${bankName} • ${iban?.slice(-4) || ''}` : `Card •••• ${cardNumber?.slice(-4) || ''}`}
              </span>
            </div>

            {/* Select Token */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-medium">Монета</label>
              <div className="relative">
                <div
                  onClick={() => setShowTokenPicker(!showTokenPicker)}
                  className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 flex items-center justify-between cursor-pointer hover:border-blue-500/50 transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <CryptoIcon symbol={selectedToken.symbol} size={28} />
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-semibold text-white">{selectedToken.name}</span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Баланс: {selectedToken.balance.toFixed(4)} {selectedToken.symbol}
                      </span>
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </div>
                {showTokenPicker && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-[#141B2D] border border-white/10 rounded-xl p-1 max-h-40 overflow-y-auto divide-y divide-white/[0.04] shadow-xl z-50">
                    {[...tokens].sort((a, b) => b.balanceUsd - a.balanceUsd).map((t) => (
                      <div
                        key={t.id}
                        onClick={() => { setSelectedToken(t); setShowTokenPicker(false); setCryptoAmount(''); }}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-white/[0.05] cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <CryptoIcon symbol={t.symbol} size={22} />
                          <span className="text-xs font-semibold text-white">{t.name}</span>
                        </div>
                        <span className="text-xs text-slate-400 font-mono">{t.balance.toFixed(3)} {t.symbol}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <label className="text-slate-400 font-medium">Сумма</label>
                <button onClick={handleMax} className="text-blue-400 hover:text-blue-300 font-bold">MAX</button>
              </div>
              <div className="relative">
                <input
                  type="number"
                  value={cryptoAmount}
                  onChange={(e) => setCryptoAmount(e.target.value)}
                  placeholder="0.0"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-3.5 pr-20 py-3 text-lg font-bold text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                />
                <button
                  onClick={() => setShowTokenPicker(!showTokenPicker)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-white/[0.06] hover:bg-white/[0.1] rounded-lg px-2 py-1.5 transition-colors cursor-pointer"
                >
                  <CryptoIcon symbol={selectedToken.symbol} size={18} />
                  <span className="text-xs font-bold text-white font-mono">{selectedToken.symbol}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>
              </div>
            </div>

            {/* Fee breakdown */}
            {numCrypto > 0 && (
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Вы продаёте</span>
                  <span className="text-white font-mono">{fiatSymbol}{(numCrypto * selectedToken.price).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Комиссия (5.5%)</span>
                  <span className="text-rose-400 font-mono">-{fiatSymbol}{feeUsd.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-white/[0.06]">
                  <span className="text-slate-400 font-semibold">Вы получите</span>
                  <span className="text-emerald-400 font-bold font-mono">{fiatSymbol}{recipientUsd.toFixed(2)}</span>
                </div>
              </div>
            )}

            <button
              disabled={numCrypto <= 0 || numCrypto > selectedToken.balance}
              onClick={() => setSellStep('confirm')}
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-xs tracking-wide transition-colors shadow-lg shadow-blue-600/20 cursor-pointer"
            >
              {numCrypto > selectedToken.balance ? `Недостаточно ${selectedToken.symbol}` : 'Далее'}
            </button>
          </div>
        )}

        {sellStep === 'confirm' && (
          <div className="space-y-4">
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 flex flex-col items-center">
              <CryptoIcon symbol={selectedToken.symbol} size={44} />
              <span className="text-2xl font-bold text-white font-mono mt-2">-{numCrypto} {selectedToken.symbol}</span>
              <span className="text-xs text-slate-400 font-mono mt-0.5">≈ {fiatSymbol}{(numCrypto * selectedToken.price).toFixed(2)}</span>
            </div>

            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-3.5 space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-white/[0.04]">
                <span className="text-slate-400">Способ вывода</span>
                <span className="text-white">
                  {payoutMethod === 'bank_transfer' ? `Bank: ${bankName}` : `Card: •••• ${cardNumber?.slice(-4)}`}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/[0.04]">
                <span className="text-slate-400">Комиссия (5.5%)</span>
                <span className="text-rose-400 font-mono">-{fiatSymbol}{feeUsd.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400 font-semibold">К зачислению</span>
                <span className="text-emerald-400 font-bold font-mono">{fiatSymbol}{recipientUsd.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button onClick={() => setSellStep('input')} className="w-1/3 py-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 font-semibold text-xs transition-colors">
                Назад
              </button>
              <button
                disabled={isProcessing}
                onClick={handleExecuteSell}
                className="w-2/3 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25"
              >
                {isProcessing ? 'Обработка...' : 'Подтвердить вывод'}
              </button>
            </div>
          </div>
        )}

        {sellStep === 'pending' && (
          <div className="py-6 flex flex-col items-center text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center animate-pulse">
              <Clock className="w-8 h-8" />
            </div>
            <span className="text-lg font-bold text-white">В обработке</span>
            <p className="text-xs text-slate-400 max-w-xs">
              Заявка на вывод {fiatSymbol}{recipientUsd.toFixed(2)} принята и ожидает обработки оператором.
            </p>
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 text-[11px] text-amber-300 max-w-xs">
              Статусы: В обработке → Отправлено → Выполнено
            </div>
            <button onClick={onClose} className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs mt-4 transition-colors">
              Закрыть
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
