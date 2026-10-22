import React, { useState, useMemo, useEffect } from 'react';
import {
  X, ChevronLeft, ChevronDown, CreditCard, Building2, Zap, Upload,
  ShieldCheck, Clock, Check, ArrowRight, Loader2,
} from 'lucide-react';
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

type Step = 'amount' | 'method' | 'account' | 'add' | 'info' | 'confirm' | 'sent';
type Brand = 'visa' | 'mastercard';
type AccountStatus = 'verified' | 'in_review';

interface PayoutAccount {
  id: string;
  brand: Brand;
  last4: string;
  holder: string;
  status: AccountStatus;
  methodId: string;
  bankName?: string;
}

interface PayoutMethod {
  id: string;
  name: string;
  short: string;
  time: string;
  fee: number; // fraction
  accent: string;
  Icon: React.FC<{ className?: string }>;
}

const PAYOUT_METHODS: PayoutMethod[] = [
  { id: 'moonpay', name: 'MoonPay Visa Direct / Mastercard', short: 'MoonPay Visa Direct', time: 'Instant', fee: 0.02, accent: '#7D5CFF', Icon: ({ className }) => <CreditCard className={className} /> },
  { id: 'sepa', name: 'Transfer SEPA / Bank Transfer', short: 'SEPA Bank Transfer', time: '1–2 hours', fee: 0.015, accent: '#3B82F6', Icon: ({ className }) => <Building2 className={className} /> },
  { id: 'ramp', name: 'Ramp Network Cashout', short: 'Ramp Network', time: 'Instant', fee: 0.018, accent: '#2BD67B', Icon: ({ className }) => <Zap className={className} /> },
];

const SEED_ACCOUNTS: PayoutAccount[] = [
  { id: 'acc-1', brand: 'visa', last4: '4242', holder: 'John Doe', status: 'verified', methodId: 'moonpay' },
  { id: 'acc-2', brand: 'mastercard', last4: '1357', holder: 'Ivan Ivanov', status: 'in_review', methodId: 'moonpay' },
];

const ACCOUNTS_KEY = 'vaultspring_payout_accounts';

const fmtUsd = (n: number) =>
  `$${(isFinite(n) ? n : 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtCrypto = (n: number) =>
  (isFinite(n) ? n : 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 6 });

// Small Visa / Mastercard brand badges (offline, inline).
const CardBrand: React.FC<{ brand: Brand; size?: 'sm' | 'md' }> = ({ brand, size = 'md' }) => {
  const h = size === 'md' ? 'h-7' : 'h-5';
  if (brand === 'visa') {
    return (
      <div className={`${h} w-10 rounded-md bg-[#1A1F71] border border-white/10 flex items-center justify-center shrink-0`}>
        <span className="text-white font-bold italic tracking-wider" style={{ fontSize: size === 'md' ? 11 : 9 }}>VISA</span>
      </div>
    );
  }
  return (
    <div className={`${h} w-10 rounded-md bg-[#0B0F1A] border border-white/10 flex items-center justify-center shrink-0 overflow-hidden`}>
      <div className="relative flex items-center" style={{ width: 26, height: 16 }}>
        <span className="absolute rounded-full bg-[#EB001B]" style={{ width: 14, height: 14, left: 0 }} />
        <span className="absolute rounded-full bg-[#F79E1B]" style={{ width: 14, height: 14, right: 0, mixBlendMode: 'screen' }} />
      </div>
    </div>
  );
};

export const SellModal: React.FC<SellModalProps> = ({
  tokens,
  walletAddress = '0x71C...4e8B',
  onClose,
  onSellSuccess,
  onVerificationSubmit,
}) => {
  const [step, setStep] = useState<Step>('amount');

  // Step 2 — amount
  const sellableTokens = useMemo(
    () => [...tokens].sort((a, b) => b.balanceUsd - a.balanceUsd),
    [tokens]
  );
  const [selectedToken, setSelectedToken] = useState<Token>(sellableTokens[0] || tokens[0]);
  const [showTokenPicker, setShowTokenPicker] = useState(false);
  const [amountInput, setAmountInput] = useState('');
  const [amountMode, setAmountMode] = useState<'crypto' | 'usd'>('usd');

  // Step 3 — method
  const [methodId, setMethodId] = useState('moonpay');

  // Step 4 — account
  const [accounts, setAccounts] = useState<PayoutAccount[]>(() => {
    try {
      const saved = localStorage.getItem(ACCOUNTS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as PayoutAccount[];
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch { /* ignore */ }
    return SEED_ACCOUNTS;
  });
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  useEffect(() => {
    try { localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts)); } catch { /* ignore */ }
  }, [accounts]);

  // Step 5 — add account form
  const [fullName, setFullName] = useState('');
  const [documentType, setDocumentType] = useState<'passport' | 'id_card' | 'drivers_license'>('passport');
  const [documentNumber, setDocumentNumber] = useState('');
  const [acctPayoutMethod, setAcctPayoutMethod] = useState<'bank_transfer' | 'card'>('card');
  const [bankName, setBankName] = useState('');
  const [iban, setIban] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [documentFile, setDocumentFile] = useState<string | null>(null);
  const [submittingAcct, setSubmittingAcct] = useState(false);

  // Result
  const [isProcessing, setIsProcessing] = useState(false);
  const [requestId, setRequestId] = useState('');
  const [requestDate, setRequestDate] = useState('');

  const method = PAYOUT_METHODS.find((m) => m.id === methodId) || PAYOUT_METHODS[0];
  const price = selectedToken.price || 0;
  const coinAmount = amountMode === 'crypto' ? (parseFloat(amountInput) || 0) : (parseFloat(amountInput) || 0) / (price || 1);
  const usdAmount = amountMode === 'usd' ? (parseFloat(amountInput) || 0) : (parseFloat(amountInput) || 0) * price;
  const feeUsd = usdAmount * method.fee;
  const youReceive = usdAmount - feeUsd;
  const overBalance = coinAmount > selectedToken.balance + 1e-12;
  const amountValid = usdAmount > 0 && coinAmount > 0 && !overBalance;

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) || null;

  const goBack = () => {
    const map: Record<Step, Step> = {
      amount: 'amount', method: 'amount', account: 'method', add: 'account',
      info: 'account', confirm: 'info', sent: 'sent',
    };
    setStep(map[step]);
  };

  const handleAddAccountSubmit = () => {
    const digits = cardNumber.replace(/\D/g, '');
    const last4 = acctPayoutMethod === 'card' && digits.length >= 4 ? digits.slice(-4) : String(Math.floor(1000 + Math.random() * 9000));
    const brand: Brand = acctPayoutMethod === 'card' && digits.startsWith('4') ? 'visa' : 'mastercard';
    const newAcc: PayoutAccount = {
      id: `acc-${Date.now()}`,
      brand,
      last4,
      holder: fullName || 'Account Holder',
      status: 'in_review',
      methodId,
      bankName: bankName || undefined,
    };
    setAccounts((prev) => [...prev, newAcc]);

    onVerificationSubmit({
      fullName,
      documentType,
      documentNumber,
      payoutMethod: acctPayoutMethod,
      ...(acctPayoutMethod === 'bank_transfer' ? { bankName, iban } : { cardNumber, cardHolder: fullName }),
    });

    setSubmittingAcct(false);
    setStep('account');
  };

  const handleExecuteSell = () => {
    if (!amountValid || !selectedAccount) return;
    setIsProcessing(true);
    setTimeout(() => {
      const id = `tx-${Date.now()}`;
      const reqId = `#WD${Math.floor(100000 + Math.random() * 900000)}`;
      const now = new Date();
      const newTx: Transaction = {
        id,
        type: 'sell',
        tokenSymbol: selectedToken.symbol,
        tokenName: selectedToken.name,
        amount: coinAmount,
        amountUsd: usdAmount,
        toAddress: `${selectedAccount.brand === 'visa' ? 'Visa' : 'Mastercard'} ****${selectedAccount.last4} • ${method.short}`,
        fromAddress: walletAddress,
        timestamp: 'Just now',
        status: 'pending',
        hash: `0x${Math.random().toString(16).substring(2, 42)}`,
        fee: feeUsd,
        network: selectedToken.network,
      };
      const updatedToken: Token = {
        ...selectedToken,
        balance: Math.max(0, selectedToken.balance - coinAmount),
        balanceUsd: Math.max(0, (selectedToken.balance - coinAmount) * selectedToken.price),
      };
      setRequestId(reqId);
      setRequestDate(now.toLocaleString('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }));
      onSellSuccess(newTx, updatedToken);
      setIsProcessing(false);
      setStep('sent');
    }, 1400);
  };

  const titles: Record<Step, string> = {
    amount: 'Sell Crypto (Cash Out)',
    method: 'Sell Crypto (Cash Out)',
    account: 'Select Account',
    add: 'Add Account – MoonPay',
    info: 'Sell Crypto (Cash Out)',
    confirm: 'Confirm Sell',
    sent: 'Withdrawal Request Sent',
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full sm:max-w-md bg-[#0F1420] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl p-5 flex flex-col gap-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center gap-2 pb-2 border-b border-white/[0.06]">
          {step !== 'amount' && step !== 'sent' && (
            <button onClick={goBack} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 hover:text-white bg-white/[0.05] shrink-0">
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          <span className="text-base font-bold text-white flex-1 truncate">{titles[step]}</span>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white bg-white/[0.05] shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ===================== STEP 2: AMOUNT ===================== */}
        {step === 'amount' && (
          <div className="space-y-4">
            <p className="text-[11px] text-slate-400 -mt-1">Select a coin and enter the amount in coin or USD.</p>

            {/* Select Crypto */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-medium">Select Crypto</label>
              <div className="relative">
                <div
                  onClick={() => setShowTokenPicker((v) => !v)}
                  className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 flex items-center justify-between cursor-pointer hover:border-blue-500/50 transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <CryptoIcon symbol={selectedToken.symbol} network={selectedToken.network} size={28} />
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-semibold text-white">{selectedToken.name} {selectedToken.symbol}</span>
                      <span className="text-[11px] text-slate-400 font-mono">Available: {fmtCrypto(selectedToken.balance)} {selectedToken.symbol}</span>
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </div>
                {showTokenPicker && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-[#141B2D] border border-white/10 rounded-xl p-1 max-h-56 overflow-y-auto divide-y divide-white/[0.04] shadow-xl z-50">
                    {sellableTokens.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => { setSelectedToken(t); setShowTokenPicker(false); setAmountInput(''); }}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-white/[0.05] cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <CryptoIcon symbol={t.symbol} network={t.network} size={22} />
                          <span className="text-xs font-semibold text-white">{t.name}</span>
                        </div>
                        <span className="text-xs text-slate-400 font-mono">{fmtCrypto(t.balance)} {t.symbol}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <label className="text-slate-400 font-medium">Amount</label>
                <button onClick={() => { setAmountMode('crypto'); setAmountInput(String(selectedToken.balance)); }} className="text-blue-400 hover:text-blue-300 font-bold">MAX</button>
              </div>
              <div className="relative">
                <input
                  type="number"
                  inputMode="decimal"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-3 text-lg font-bold text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-white/[0.06] rounded-lg px-2 py-1.5">
                  <span className="text-xs font-bold text-white font-mono">{amountMode === 'usd' ? 'USD' : selectedToken.symbol}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </div>
              </div>
              {/* currency toggle */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { const v = usdAmount / (price || 1); setAmountMode('crypto'); setAmountInput(v ? String(+v.toFixed(6)) : ''); }}
                  className={`py-2 rounded-xl text-xs font-bold transition-all ${amountMode === 'crypto' ? 'bg-blue-600 text-white' : 'bg-white/[0.04] text-slate-400 hover:text-white'}`}
                >
                  {selectedToken.symbol}
                </button>
                <button
                  onClick={() => { const v = coinAmount * price; setAmountMode('usd'); setAmountInput(v ? String(+v.toFixed(2)) : ''); }}
                  className={`py-2 rounded-xl text-xs font-bold transition-all ${amountMode === 'usd' ? 'bg-blue-600 text-white' : 'bg-white/[0.04] text-slate-400 hover:text-white'}`}
                >
                  USD
                </button>
              </div>
              {usdAmount > 0 && (
                <p className="text-[11px] text-slate-400 font-mono">≡ {fmtCrypto(coinAmount)} {selectedToken.symbol}</p>
              )}
            </div>

            {/* Price + receive estimate */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Current Price</span>
                <span className="text-white font-mono font-semibold">{fmtUsd(price)}</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-white/[0.06]">
                <span className="text-slate-400 font-semibold">You Receive (est.)</span>
                <span className="text-emerald-400 font-bold font-mono text-base">{fmtUsd(youReceive)}</span>
              </div>
            </div>

            <button
              disabled={!amountValid}
              onClick={() => setStep('method')}
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-xs tracking-wide transition-colors shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
            >
              {overBalance ? `Insufficient ${selectedToken.symbol}` : 'Continue'} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ===================== STEP 3: METHOD ===================== */}
        {step === 'method' && (
          <div className="space-y-4">
            <p className="text-[11px] text-slate-400 -mt-1">Choose a convenient cash-out method. Fee and processing time are shown for each.</p>
            <div className="space-y-2.5">
              {PAYOUT_METHODS.map((m) => {
                const active = methodId === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setMethodId(m.id)}
                    className={`w-full text-left rounded-xl border p-3.5 flex items-center gap-3 transition-all ${
                      active ? 'bg-blue-600/10 border-blue-500/60 ring-1 ring-blue-500/30' : 'bg-white/[0.02] border-white/[0.08] hover:border-white/20'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${m.accent}22`, color: m.accent }}>
                      <m.Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{m.name}</p>
                      <p className="text-[11px] text-slate-400">{m.time}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-slate-500">Fee</p>
                      <p className="text-xs font-bold text-white font-mono">{(m.fee * 100).toFixed(1)}%</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${active ? 'border-blue-500 bg-blue-500' : 'border-white/20'}`}>
                      {active && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setStep('account')}
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs tracking-wide transition-colors shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ===================== STEP 4/6/7: ACCOUNT ===================== */}
        {step === 'account' && (
          <div className="space-y-4">
            <div>
              <p className="text-[11px] text-slate-400">Payout method</p>
              <p className="text-sm font-semibold text-white">{method.name}</p>
            </div>

            <button
              onClick={() => { resetAddForm(); setStep('add'); }}
              className="w-full py-3 rounded-xl border border-dashed border-blue-500/50 text-blue-400 font-semibold text-xs flex items-center justify-center gap-2 hover:bg-blue-500/5 transition-colors"
            >
              + Add New Account
            </button>

            <div>
              <p className="text-[11px] text-slate-400 mb-2">Your Accounts</p>
              <div className="space-y-2.5">
                {accounts.map((a) => {
                  const active = selectedAccountId === a.id;
                  const usable = a.status === 'verified';
                  return (
                    <button
                      key={a.id}
                      disabled={!usable}
                      onClick={() => { setSelectedAccountId(a.id); }}
                      className={`w-full text-left rounded-xl border p-3.5 flex items-center gap-3 transition-all ${
                        active ? 'bg-blue-600/10 border-blue-500/60 ring-1 ring-blue-500/30'
                          : usable ? 'bg-white/[0.02] border-white/[0.08] hover:border-white/20'
                          : 'bg-white/[0.02] border-white/[0.06] opacity-80'
                      } ${!usable ? 'cursor-not-allowed' : ''}`}
                    >
                      <CardBrand brand={a.brand} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{a.brand === 'visa' ? 'Visa' : 'Mastercard'} **** {a.last4}</p>
                        <p className="text-[11px] text-slate-400 truncate">{a.holder}</p>
                        <span className={`inline-flex items-center gap-1 mt-1 text-[10px] font-semibold ${usable ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {usable ? <><ShieldCheck className="w-3 h-3" /> Verified</> : <><Clock className="w-3 h-3" /> In Review</>}
                        </span>
                      </div>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${active ? 'border-blue-500 bg-blue-500' : 'border-white/20'}`}>
                        {active && <Check className="w-3.5 h-3.5 text-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              disabled={!selectedAccount || selectedAccount.status !== 'verified'}
              onClick={() => setStep('info')}
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-xs tracking-wide transition-colors shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ===================== STEP 5: ADD ACCOUNT ===================== */}
        {step === 'add' && (
          <div className="space-y-4">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 flex items-start gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-slate-300">Fill in your details to link a payout account. After submitting, the account goes to <span className="text-amber-300 font-semibold">“In Review”</span> and can be used once verified.</p>
            </div>

            {/* Document Type */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-medium">Document Type</label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { id: 'passport', label: 'Passport' },
                  { id: 'id_card', label: 'ID Card' },
                  { id: 'drivers_license', label: "Driver's License" },
                ] as const).map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setDocumentType(d.id)}
                    className={`py-2 rounded-xl text-[11px] font-semibold border transition-all ${
                      documentType === d.id ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-white/[0.02] border-white/[0.06] text-slate-400'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <Field label="Full Name (as on document)" value={fullName} onChange={setFullName} placeholder="Ivan Ivanov" />
            <Field label="Document Number" value={documentNumber} onChange={setDocumentNumber} placeholder="AB1234567" mono />

            {/* Upload */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-medium">Upload Document</label>
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-white/[0.1] rounded-xl p-4 cursor-pointer hover:border-blue-500/50 transition-colors">
                <Upload className="w-6 h-6 text-slate-400 mb-1" />
                <span className="text-[11px] text-slate-400">{documentFile || 'Tap to upload photo'}</span>
                <span className="text-[10px] text-slate-500 mt-0.5">JPG, PNG, PDF (max 10MB)</span>
                <input type="file" accept="image/*,.pdf" onChange={(e) => setDocumentFile(e.target.files?.[0]?.name || null)} className="hidden" />
              </label>
            </div>

            {/* Payout Method */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-medium">Payout Method</label>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setAcctPayoutMethod('card')} className={`py-2.5 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${acctPayoutMethod === 'card' ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-white/[0.02] border-white/[0.06] text-slate-400'}`}>
                  <CreditCard className="w-3.5 h-3.5" /> Card
                </button>
                <button onClick={() => setAcctPayoutMethod('bank_transfer')} className={`py-2.5 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${acctPayoutMethod === 'bank_transfer' ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-white/[0.02] border-white/[0.06] text-slate-400'}`}>
                  <Building2 className="w-3.5 h-3.5" /> Bank Account
                </button>
              </div>
            </div>

            {acctPayoutMethod === 'card' ? (
              <Field label="Card Number" value={cardNumber} mono onChange={(v) => setCardNumber(v.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim())} placeholder="4242 4242 4242 4242" />
            ) : (
              <div className="space-y-2">
                <Field label="Bank Name" value={bankName} onChange={setBankName} placeholder="Revolut Bank" />
                <Field label="IBAN" value={iban} mono onChange={setIban} placeholder="LT12 3250 0000 1234 5678" />
              </div>
            )}

            <button
              disabled={!fullName || !documentNumber || !documentFile || (acctPayoutMethod === 'bank_transfer' && (!bankName || !iban)) || (acctPayoutMethod === 'card' && cardNumber.replace(/\D/g, '').length < 12) || submittingAcct}
              onClick={() => { setSubmittingAcct(true); setTimeout(handleAddAccountSubmit, 900); }}
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-xs tracking-wide transition-colors shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
            >
              {submittingAcct ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : 'Submit for Verification'}
            </button>
          </div>
        )}

        {/* ===================== STEP 8: INFO & FEE ===================== */}
        {step === 'info' && selectedAccount && (
          <div className="space-y-4">
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3.5 flex items-center gap-3">
              <CardBrand brand={selectedAccount.brand} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{selectedAccount.brand === 'visa' ? 'Visa' : 'Mastercard'} **** {selectedAccount.last4}</p>
                <p className="text-[11px] text-slate-400">{selectedAccount.holder}</p>
              </div>
              <button onClick={() => setStep('account')} className="text-[11px] font-semibold text-blue-400 hover:text-blue-300">Change</button>
            </div>

            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3.5 space-y-2.5 text-xs">
              <Row label="Amount" value={`${fmtUsd(usdAmount)}`} sub={`≡ ${fmtCrypto(coinAmount)} ${selectedToken.symbol}`} />
              <Row label={`Fee (${(method.fee * 100).toFixed(1)}%)`} value={`-${fmtUsd(feeUsd)}`} valueClass="text-rose-400" />
              <div className="flex justify-between items-center pt-2 border-t border-white/[0.06]">
                <span className="text-slate-400 font-semibold">You Will Receive</span>
                <span className="text-emerald-400 font-bold font-mono text-lg">{fmtUsd(youReceive)}</span>
              </div>
            </div>

            <button
              onClick={() => setStep('confirm')}
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs tracking-wide transition-colors shadow-lg shadow-blue-600/20"
            >
              Confirm and Send
            </button>
          </div>
        )}

        {/* ===================== STEP 9: CONFIRM ===================== */}
        {step === 'confirm' && selectedAccount && (
          <div className="space-y-4">
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 space-y-2.5 text-xs">
              <KV k="Crypto" v={`${selectedToken.name} (${selectedToken.symbol})`} />
              <KV k="Amount" v={`${fmtUsd(usdAmount)}`} sub={`(= ${fmtCrypto(coinAmount)} ${selectedToken.symbol})`} />
              <KV k="Payout Method" v={method.short} />
              <KV k="Destination" v={`${selectedAccount.brand === 'visa' ? 'Visa' : 'Mastercard'} ****${selectedAccount.last4}`} sub={selectedAccount.holder} />
              <KV k={`Fee (${(method.fee * 100).toFixed(1)}%)`} v={`-${fmtUsd(feeUsd)}`} vClass="text-rose-400" />
              <div className="flex justify-between items-center pt-2 border-t border-white/[0.06]">
                <span className="text-slate-400 font-semibold">You Will Receive</span>
                <span className="text-emerald-400 font-bold font-mono text-base">{fmtUsd(youReceive)}</span>
              </div>
            </div>

            <div className="flex gap-2.5">
              <button onClick={() => setStep('info')} className="w-1/3 py-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 font-semibold text-xs transition-colors">Back</button>
              <button
                disabled={isProcessing}
                onClick={handleExecuteSell}
                className="w-2/3 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:pointer-events-none text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25"
              >
                {isProcessing ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</> : 'Confirm and Send'}
              </button>
            </div>
          </div>
        )}

        {/* ===================== STEP 10: SENT ===================== */}
        {step === 'sent' && (
          <div className="space-y-5 py-2">
            <div className="flex flex-col items-center text-center gap-2">
              <div className="w-16 h-16 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
                <Check className="w-8 h-8" />
              </div>
              <span className="text-lg font-bold text-white">Withdrawal Request Sent</span>
              <p className="text-[11px] text-slate-400 max-w-xs">Your request is being processed. You will receive a notification once it is completed.</p>
            </div>

            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 space-y-2.5 text-xs">
              <KV k="Amount" v={fmtUsd(usdAmount)} />
              <KV k="You Will Receive" v={fmtUsd(youReceive)} vClass="text-emerald-400" />
              <KV k="Payout Method" v={method.short} />
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Status</span>
                <span className="inline-flex items-center gap-1.5 text-amber-400 font-semibold"><Clock className="w-3.5 h-3.5" /> In Process</span>
              </div>
              <KV k="Request ID" v={requestId} mono />
              <KV k="Date" v={requestDate} />
            </div>

            <div className="space-y-2.5">
              <button onClick={onClose} className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs tracking-wide transition-colors shadow-lg shadow-blue-600/20">Done</button>
              <button onClick={onClose} className="w-full py-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 font-semibold text-xs transition-colors">View in History</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  function resetAddForm() {
    setFullName('');
    setDocumentType('passport');
    setDocumentNumber('');
    setAcctPayoutMethod('card');
    setBankName('');
    setIban('');
    setCardNumber('');
    setDocumentFile(null);
  }
};

// ---- small presentational helpers ----
const Field: React.FC<{ label: string; value: string; onChange: (v: string) => void; placeholder?: string; mono?: boolean }> = ({ label, value, onChange, placeholder, mono }) => (
  <div className="space-y-1.5">
    <label className="text-xs text-slate-400 font-medium">{label}</label>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 ${mono ? 'font-mono' : ''}`}
    />
  </div>
);

const Row: React.FC<{ label: string; value: string; sub?: string; valueClass?: string }> = ({ label, value, sub, valueClass = 'text-white' }) => (
  <div className="flex justify-between items-center">
    <span className="text-slate-400">{label}</span>
    <div className="text-right">
      <span className={`font-mono font-semibold ${valueClass}`}>{value}</span>
      {sub && <span className="block text-[10px] text-slate-500 font-mono">{sub}</span>}
    </div>
  </div>
);

const KV: React.FC<{ k: string; v: string; sub?: string; vClass?: string; mono?: boolean }> = ({ k, v, sub, vClass = 'text-white', mono }) => (
  <div className="flex justify-between items-center gap-3">
    <span className="text-slate-400 shrink-0">{k}</span>
    <div className="text-right min-w-0">
      <span className={`${vClass} ${mono ? 'font-mono' : 'font-semibold'} break-words`}>{v}</span>
      {sub && <span className="block text-[10px] text-slate-500">{sub}</span>}
    </div>
  </div>
);
