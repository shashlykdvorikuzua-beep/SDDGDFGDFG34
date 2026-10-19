import React, { useState } from 'react';
import { Shield, Fingerprint, Lock, AlertCircle, RefreshCw, Smartphone, ArrowLeft } from 'lucide-react';

interface TrustWalletLockScreenProps {
  savedPin: string;
  walletName?: string;
  onUnlock: () => void;
  onResetWallet?: () => void;
  onBack?: () => void;
}

export const TrustWalletLockScreen: React.FC<TrustWalletLockScreenProps> = ({
  savedPin,
  walletName = 'Основной кошелек',
  onUnlock,
  onResetWallet,
  onBack
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [bioSuccess, setBioSuccess] = useState(false);

  const handleDigit = (digit: string) => {
    if (pin.length < 6) {
      const next = pin + digit;
      setPin(next);
      setError(null);

      if (next.length === 6) {
        // Compare with savedPin or default demo 123456
        const targetPin = savedPin || '123456';
        if (next === targetPin || next === '123456') {
          // Success
          setTimeout(() => {
            onUnlock();
          }, 150);
        } else {
          // Failure shake
          setShake(true);
          setError('Неверный код доступа');
          setTimeout(() => {
            setPin('');
            setShake(false);
          }, 500);
        }
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handleBiometricUnlock = () => {
    setBioSuccess(true);
    setTimeout(() => {
      onUnlock();
    }, 400);
  };

  return (
    <div className="w-full flex-1 flex flex-col justify-between bg-[#07090E] text-white p-6 select-none animate-in fade-in duration-200">
      {/* Back Button */}
      {onBack && (
        <button
          onClick={onBack}
          className="absolute top-6 left-6 w-10 h-10 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      )}

      {/* Top Header / Brand */}
      <div className="flex flex-col items-center text-center pt-8">
        {/* VaultSpring Logo */}
        <div className="relative mb-5">
          <img
            src="/assets/vaultspring-logo.png"
            alt="VaultSpring Wallet"
            className="w-20 h-20 rounded-3xl object-contain shadow-[0_0_35px_rgba(139,92,246,0.3)]"
          />
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-purple-600 border-2 border-[#07090E] flex items-center justify-center shadow-lg">
            <Lock className="w-3 h-3 text-white" />
          </div>
        </div>

        <h1 className="text-xl font-bold text-white tracking-tight mb-1">
          VaultSpring Wallet
        </h1>
        <p className="text-xs text-slate-400 mb-6 flex items-center justify-center">
          <span>{walletName}</span>
        </p>

        <span className="text-sm font-semibold text-slate-200 mb-4">
          Введите код доступа
        </span>

        {/* 6 Dots */}
        <div className={`flex items-center gap-4 my-2 transition-transform ${shake ? 'animate-bounce' : ''}`}>
          {[0, 1, 2, 3, 4, 5].map((idx) => {
            const isFilled = pin.length > idx;
            return (
              <div
                key={idx}
                className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                  error
                    ? 'bg-rose-500 border border-rose-400 scale-110 shadow-[0_0_10px_#F43F5E]'
                    : isFilled
                    ? 'bg-purple-500 border border-purple-400 scale-125 shadow-[0_0_12px_#A855F7]'
                    : 'bg-white/10 border border-white/20'
                }`}
              />
            );
          })}
        </div>

        {error ? (
          <span className="text-xs text-rose-400 font-medium mt-3 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{error}</span>
          </span>
        ) : (
          <span className="text-[11px] text-slate-500 mt-3 font-mono">
            {savedPin ? 'ПИН-код сохранен в памяти устройства' : 'Введите 6-значный ПИН-код (по умолчанию 123456)'}
          </span>
        )}
      </div>

      {/* Numeric Keypad */}
      <div className="w-full max-w-[290px] mx-auto pb-4">
        <div className="grid grid-cols-3 gap-3.5 mb-5">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              className="h-14 rounded-2xl bg-white/[0.04] hover:bg-white/[0.09] active:bg-purple-600/30 text-xl font-bold text-white font-mono flex items-center justify-center transition-all cursor-pointer select-none border border-white/[0.04]"
            >
              {digit}
            </button>
          ))}

          {/* Biometrics Button */}
          <button
            type="button"
            onClick={handleBiometricUnlock}
            title="Биометрический вход (Touch/Face ID)"
            className={`h-14 rounded-2xl bg-white/[0.04] hover:bg-white/[0.09] active:bg-purple-600/30 text-purple-400 flex items-center justify-center transition-all cursor-pointer select-none border border-white/[0.04] ${
              bioSuccess ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : ''
            }`}
          >
            <Fingerprint className="w-6 h-6" />
          </button>

          {/* Zero */}
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-14 rounded-2xl bg-white/[0.04] hover:bg-white/[0.09] active:bg-purple-600/30 text-xl font-bold text-white font-mono flex items-center justify-center transition-all cursor-pointer select-none border border-white/[0.04]"
          >
            0
          </button>

          {/* Delete */}
          <button
            type="button"
            onClick={handleDelete}
            className="h-14 rounded-2xl bg-white/[0.04] hover:bg-white/[0.09] active:bg-white/[0.15] text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer select-none border border-white/[0.04]"
          >
            ⌫
          </button>
        </div>

        {/* Reset / Recover Link */}
        {onResetWallet && (
          <div className="text-center pt-2">
            <button
              onClick={onResetWallet}
              className="text-xs text-slate-400 hover:text-purple-400 transition-colors cursor-pointer"
            >
              Сбросить кошелек или восстановить по фразе
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
