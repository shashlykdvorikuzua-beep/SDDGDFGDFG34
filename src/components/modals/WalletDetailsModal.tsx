import React, { useState } from 'react';
import { 
  X, Check, Shield, KeyRound, Copy, Smartphone, Lock, AlertTriangle, Trash2,
  Clock, AlertCircle, CheckCircle2
} from 'lucide-react';
import { WalletAccount } from '../../types/wallet';
import { DEFAULT_PIN, FALLBACK_ADDRESSES } from '../../utils';

interface WalletDetailsModalProps {
  wallet: WalletAccount;
  onLockApp: () => void;
  onResetWallet: () => void;
  onClose: () => void;
  verificationStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  onOpenVerification?: () => void;
}

export const WalletDetailsModal: React.FC<WalletDetailsModalProps> = ({
  wallet,
  onLockApp,
  onResetWallet,
  onClose,
  verificationStatus = 'none',
  onOpenVerification
}) => {
  const [copiedEvm, setCopiedEvm] = useState(false);
  const [copiedTron, setCopiedTron] = useState(false);
  const [copiedBtc, setCopiedBtc] = useState(false);
  const [copiedSol, setCopiedSol] = useState(false);
  const [copiedTon, setCopiedTon] = useState(false);
  const [copiedMnemonic, setCopiedMnemonic] = useState(false);

  const [showPhrase, setShowPhrase] = useState(false);
  const [pinPrompt, setPinPrompt] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetPin, setResetPin] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);

  const handleRevealPhrase = () => {
    const savedPin = localStorage.getItem('vaultspring_pin') || DEFAULT_PIN;
    if (pinInput === savedPin) {
      setShowPhrase(true);
      setPinPrompt(false);
      setPinError(null);
    } else {
      setPinError('Неверный ПИН-код');
    }
  };

  const handleConfirmReset = () => {
    const savedPin = localStorage.getItem('vaultspring_pin') || DEFAULT_PIN;
    if (resetPin === savedPin) {
      onResetWallet();
      onClose();
    } else {
      setResetError('Неверный ПИН-код для подтверждения сброса');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full sm:max-w-md bg-[#0F1420] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl p-5 flex flex-col gap-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-purple-400" />
            <span className="text-base font-bold text-white">Основной кошелек устройства</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white bg-white/[0.05]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Security Status Banner */}
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3 flex items-start gap-3">
          <Shield className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-bold text-white block">Мультичейн Web3 кошелек</span>
            <span className="text-slate-300 text-[11px] leading-relaxed">
              Некастодиальный кошелек. Секретные ключи зашифрованы и хранятся исключительно на этом устройстве.
            </span>
          </div>
        </div>

        {/* Wallet Profile Card */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-500 p-[1.5px] shrink-0">
                <div className="w-full h-full rounded-full bg-[#0B0F19] flex items-center justify-center font-bold text-white text-sm">
                  {wallet.name.charAt(0)}
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white">{wallet.name}</span>
                <span className="text-[11px] text-emerald-400">● Активен и защищен ПИН-кодом</span>
              </div>
            </div>

            <span className="text-xs font-mono font-bold text-white">
              ${wallet.totalBalanceUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* Addresses */}
          <div className="space-y-2 pt-2 border-t border-white/[0.06]">
            {/* EVM Address */}
            <div className="flex items-center justify-between bg-black/40 p-2.5 rounded-xl border border-white/[0.04]">
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] text-slate-400 font-medium">EVM (ETH, BSC, Polygon, ARB)</span>
                <span className="text-xs font-mono text-slate-200 break-all">{wallet.address}</span>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(wallet.address);
                  setCopiedEvm(true);
                  setTimeout(() => setCopiedEvm(false), 2000);
                }}
                className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white shrink-0"
              >
                {copiedEvm ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* TRON Address */}
            <div className="flex items-center justify-between bg-black/40 p-2.5 rounded-xl border border-white/[0.04]">
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 font-medium">TRON Network</span>
                  <span className="text-[9px] bg-red-500/20 text-red-300 font-bold px-1.5 py-0.2 rounded">USDT TRC-20</span>
                </div>
                <span className="text-xs font-mono text-purple-300 break-all">
                  {wallet.tronAddress || FALLBACK_ADDRESSES.tron}
                </span>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(wallet.tronAddress || FALLBACK_ADDRESSES.tron);
                  setCopiedTron(true);
                  setTimeout(() => setCopiedTron(false), 2000);
                }}
                className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white shrink-0"
              >
                {copiedTron ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Bitcoin Address */}
            <div className="flex items-center justify-between bg-black/40 p-2.5 rounded-xl border border-white/[0.04]">
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] text-slate-400 font-medium">Bitcoin Native SegWit</span>
                <span className="text-xs font-mono text-amber-400 break-all">bc1q9v8h2e4w9s3z7p5m1k6j8d4l9n2c3v5t7</span>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText('bc1q9v8h2e4w9s3z7p5m1k6j8d4l9n2c3v5t7');
                  setCopiedBtc(true);
                  setTimeout(() => setCopiedBtc(false), 2000);
                }}
                className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white shrink-0"
              >
                {copiedBtc ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Solana Address */}
            <div className="flex items-center justify-between bg-black/40 p-2.5 rounded-xl border border-white/[0.04]">
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] text-slate-400 font-medium">Solana (SPL)</span>
                <span className="text-xs font-mono text-emerald-400 break-all">7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU</span>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText('7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU');
                  setCopiedSol(true);
                  setTimeout(() => setCopiedSol(false), 2000);
                }}
                className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white shrink-0"
              >
                {copiedSol ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* TON Address */}
            <div className="flex items-center justify-between bg-black/40 p-2.5 rounded-xl border border-white/[0.04]">
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] text-slate-400 font-medium">The Open Network (TON)</span>
                <span className="text-xs font-mono text-sky-400 break-all">EQBvW8m53GoU-VuznDBqCDWxdvcU-e2Yp7Qf8x3_tJ7y1ton</span>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText('EQBvW8m53GoU-VuznDBqCDWxdvcU-e2Yp7Qf8x3_tJ7y1ton');
                  setCopiedTon(true);
                  setTimeout(() => setCopiedTon(false), 2000);
                }}
                className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white shrink-0"
              >
                {copiedTon ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Security Actions */}
        <div className="space-y-2">
          {/* View Secret Phrase */}
          {!showPhrase && !pinPrompt && (
            <button
              onClick={() => {
                setPinPrompt(true);
                setPinInput('');
                setPinError(null);
              }}
              className="w-full py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <KeyRound className="w-4 h-4 text-purple-400" />
              <span>Показать секретную фразу (12 слов)</span>
            </button>
          )}

          {/* PIN prompt to reveal phrase */}
          {pinPrompt && !showPhrase && (
            <div className="p-3 bg-white/[0.03] border border-purple-500/30 rounded-2xl space-y-3">
              <span className="text-xs text-slate-300 font-semibold block">Введите ПИН-код для показа фразы</span>
              <input
                type="password"
                maxLength={6}
                placeholder="6-значный ПИН-код"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-center text-sm font-mono tracking-widest text-white focus:outline-none focus:border-purple-500"
              />
              {pinError && <span className="text-xs text-rose-400 block">{pinError}</span>}
              <div className="flex gap-2">
                <button
                  onClick={() => setPinPrompt(false)}
                  className="w-1/2 py-2 rounded-xl bg-white/[0.06] text-slate-300 text-xs font-semibold"
                >
                  Отмена
                </button>
                <button
                  onClick={handleRevealPhrase}
                  className="w-1/2 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold"
                >
                  Подтвердить
                </button>
              </div>
            </div>
          )}

          {/* Revealed Secret Phrase */}
          {showPhrase && (
            <div className="p-3 bg-black/50 border border-purple-500/40 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Секретная фраза кошелька</span>
                <button
                  onClick={() => setShowPhrase(false)}
                  className="text-xs text-purple-400 hover:underline"
                >
                  Скрыть
                </button>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {wallet.mnemonic.map((word, idx) => (
                  <div key={idx} className="bg-white/[0.04] p-1.5 rounded-lg flex items-center justify-between px-2 text-[11px]">
                    <span className="text-slate-500 font-mono select-none">{idx + 1}.</span>
                    <span className="font-mono font-bold text-white">{word}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(wallet.mnemonic.join(' '));
                  setCopiedMnemonic(true);
                  setTimeout(() => setCopiedMnemonic(false), 2000);
                }}
                className="w-full py-2 bg-white/[0.06] hover:bg-white/[0.1] rounded-xl text-xs text-slate-300 flex items-center justify-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedMnemonic ? 'Скопировано!' : 'Скопировать все 12 слов'}</span>
              </button>
            </div>
          )}

          {/* Quick Lock Now */}
          <button
            onClick={() => {
              onLockApp();
              onClose();
            }}
            className="w-full py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Lock className="w-4 h-4 text-blue-400" />
            <span>Заблокировать кошелек сейчас (ПИН-код)</span>
          </button>

          {/* Verification Status Banner */}
          {verificationStatus !== 'none' && onOpenVerification && (
            <div className={`rounded-xl p-3 flex items-center justify-between text-xs ${
              verificationStatus === 'approved'
                ? 'bg-emerald-500/10 border border-emerald-500/20'
                : verificationStatus === 'pending'
                ? 'bg-amber-500/10 border border-amber-500/20'
                : 'bg-rose-500/10 border border-rose-500/20'
            }`}>
              <div className="flex items-center gap-2.5 flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  verificationStatus === 'approved'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : verificationStatus === 'pending'
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-rose-500/20 text-rose-400'
                }`}>
                  {verificationStatus === 'approved' ? <CheckCircle2 className="w-4 h-4" /> :
                   verificationStatus === 'pending' ? <Clock className="w-4 h-4" /> :
                   <AlertCircle className="w-4 h-4" />}
                </div>
                <div className="flex flex-col">
                  <span className={`font-bold leading-tight ${
                    verificationStatus === 'approved' ? 'text-emerald-300' :
                    verificationStatus === 'pending' ? 'text-amber-300' : 'text-rose-300'
                  }`}>
                    {verificationStatus === 'approved' ? 'Верифицирован' :
                     verificationStatus === 'pending' ? 'Документы на проверке' :
                     'Верификация отклонена'}
                  </span>
                  <span className="text-[11px] text-slate-400 mt-0.5">
                    {verificationStatus === 'approved' ? 'Все документы подтверждены' :
                     verificationStatus === 'pending' ? 'Обычно 24-48 часов' :
                     'Загрузите документы снова'}
                  </span>
                </div>
              </div>
              {verificationStatus !== 'approved' && (
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
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
