import React, { useState } from 'react';
import { X, Lock, ShieldCheck, Delete } from 'lucide-react';

interface PinVerifyModalProps {
  title?: string;
  description?: string;
  onSuccess: () => void;
  onClose: () => void;
}

export const PinVerifyModal: React.FC<PinVerifyModalProps> = ({
  title = 'Подтверждение операции',
  description = 'Введите 6-значный PIN-код безопасности кошелька',
  onSuccess,
  onClose
}) => {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handleKeyPress = (digit: string) => {
    if (pin.length < 6) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setError(null);
      if (nextPin.length === 6) {
        // Any 6 digits or default demo 123456
        setTimeout(() => {
          onSuccess();
        }, 200);
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full sm:max-w-md bg-[#0F1420] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl p-6 flex flex-col items-center gap-5">
        <div className="w-full flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-bold text-white">{title}</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white bg-white/[0.05]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-400 text-center max-w-xs">{description}</p>

        {/* 6 PIN Dots */}
        <div className="flex items-center gap-3 my-2">
          {[0, 1, 2, 3, 4, 5].map((idx) => (
            <div
              key={idx}
              className={`w-3.5 h-3.5 rounded-full transition-all ${
                pin.length > idx
                  ? 'bg-purple-500 scale-110 shadow-[0_0_10px_#8B5CF6]'
                  : 'bg-white/10 border border-white/20'
              }`}
            />
          ))}
        </div>

        {error && <span className="text-xs text-rose-400">{error}</span>}

        {/* Numeric Keypad */}
        <div className="w-full max-w-[280px] grid grid-cols-3 gap-3 pt-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleKeyPress(digit)}
              className="h-12 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] active:bg-white/[0.12] text-lg font-bold text-white font-mono flex items-center justify-center transition-colors cursor-pointer select-none"
            >
              {digit}
            </button>
          ))}
          <div />
          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="h-12 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] active:bg-white/[0.12] text-lg font-bold text-white font-mono flex items-center justify-center transition-colors cursor-pointer select-none"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="h-12 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] active:bg-white/[0.12] text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer select-none"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 pt-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Безопасное сквозное шифрование VaultSpring</span>
        </div>
      </div>
    </div>
  );
};
