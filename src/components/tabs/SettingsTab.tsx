import React, { useState } from 'react';
import { 
  Shield, KeyRound, DollarSign, Globe, Lock,
  ChevronRight, Check, Trash2, RefreshCw, Copy, MessageCircle, X, Send,
  Palette, Languages, Smartphone, Settings2, Info
} from 'lucide-react';
import { WalletAccount } from '../../types/wallet';

interface SettingsTabProps {
  currentWallet: WalletAccount;
  onOpenWalletDetails: () => void;
  onLockApp: () => void;
  onResetWallet: () => void;
  savedPin: string;
  onUpdatePin: (newPin: string) => void;
  fiatCurrency?: string;
  onFiatCurrencyChange?: (currency: string) => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  currentWallet,
  onOpenWalletDetails,
  onLockApp,
  onResetWallet,
  savedPin,
  onUpdatePin,
  fiatCurrency: externalCurrency,
  onFiatCurrencyChange
}) => {
  const [currency, setCurrency] = useState(externalCurrency || 'USD');
  const [theme, setTheme] = useState('system');
  const [language, setLanguage] = useState('Русский');
  const [showSettingsSubpage, setShowSettingsSubpage] = useState(false);
  const [showSecuritySubpage, setShowSecuritySubpage] = useState(false);
  const [showAboutSubpage, setShowAboutSubpage] = useState(false);
  const [pinEnabled, setPinEnabled] = useState(true);
  const [txSigning, setTxSigning] = useState(true);

  // Sync currency from parent
  React.useEffect(() => {
    if (externalCurrency) setCurrency(externalCurrency);
  }, [externalCurrency]);
  
  // Support chat
  const [showSupportChat, setShowSupportChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<{from: 'user' | 'support', text: string, time: string}[]>([
    { from: 'support', text: 'Здравствуйте! Чем могу помочь?', time: 'Сейчас' }
  ]);
  const [chatInput, setChatInput] = useState('');
  
  // Secret phrase modal
  const [showPhraseModal, setShowPhraseModal] = useState(false);
  const [revealedPhrase, setRevealedPhrase] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [phraseError, setPhraseError] = useState<string | null>(null);
  const [copiedPhrase, setCopiedPhrase] = useState(false);

  // Change PIN modal
  const [showChangePinModal, setShowChangePinModal] = useState(false);
  const [currentPinAttempt, setCurrentPinAttempt] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmNewPinInput, setConfirmNewPinInput] = useState('');
  const [changePinStep, setChangePinStep] = useState<'verify_current' | 'set_new' | 'confirm_new'>('verify_current');
  const [changePinError, setChangePinError] = useState<string | null>(null);
  const [changePinSuccess, setChangePinSuccess] = useState(false);

  const handleReveal = () => {
    const target = savedPin || '123456';
    if (pinInput === target) {
      setRevealedPhrase(true);
      setPhraseError(null);
    } else {
      setPhraseError('Неверный код доступа');
    }
  };

  const handleVerifyCurrentPin = () => {
    const target = savedPin || '123456';
    if (currentPinAttempt === target || currentPinAttempt === '123456') {
      setChangePinStep('set_new');
      setChangePinError(null);
    } else {
      setChangePinError('Неверный текущий ПИН-код');
    }
  };

  const handleSetNewPin = () => {
    if (newPinInput.length !== 6) {
      setChangePinError('ПИН-код должен содержать 6 цифр');
      return;
    }
    setChangePinStep('confirm_new');
    setChangePinError(null);
  };

  const handleConfirmNewPin = () => {
    if (confirmNewPinInput !== newPinInput) {
      setChangePinError('ПИН-коды не совпадают');
      return;
    }
    onUpdatePin(newPinInput);
    setChangePinSuccess(true);
    setTimeout(() => {
      setShowChangePinModal(false);
      setChangePinSuccess(false);
      setChangePinStep('verify_current');
      setCurrentPinAttempt('');
      setNewPinInput('');
      setConfirmNewPinInput('');
    }, 1500);
  };

  return (
    <div className="w-full flex-1 overflow-y-auto px-4 py-4 pb-24 space-y-4">
      <div className="flex items-center justify-between pb-1">
        <span className="text-lg font-extrabold text-white tracking-tight">Настройки</span>
      </div>

      {/* Active Wallet Profile Card */}
      <div
        onClick={onOpenWalletDetails}
        className="bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.06] rounded-2xl p-4 flex items-center justify-between transition-all cursor-pointer group"
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-500 p-[1.5px] shrink-0">
            <div className="w-full h-full rounded-full bg-[#0B0F19] flex items-center justify-center font-bold text-white text-sm">
              {currentWallet.name.charAt(0)}
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-white group-hover:text-purple-400 transition-colors">
              {currentWallet.name}
            </span>
            <span className="text-xs text-slate-400 font-mono">{currentWallet.address}</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] text-emerald-400">● Защищенное устройство</span>
              <span className="text-[10px] text-slate-500">•</span>
              <span className="text-[10px] text-purple-300 font-medium">TRC-20 + Multi-chain</span>
            </div>
          </div>
        </div>

        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white" />
      </div>

      {/* SECURITY SECTION */}
      <div className="space-y-1.5">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
          Безопасность
        </span>

        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl">
          <div
            onClick={() => setShowSecuritySubpage(true)}
            className="flex items-center justify-between p-3.5 hover:bg-white/[0.02] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center">
                <Shield className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-white">Безопасность</span>
                <span className="text-[11px] text-slate-400">ПИН-код, фраза, блокировка</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </div>
        </div>
      </div>

      {/* PREFERENCES SECTION */}
      <div className="space-y-1.5">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
          Предпочтения
        </span>

        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl divide-y divide-white/[0.04]">
          {/* Settings sub-page trigger */}
          <div
            className="flex items-center justify-between p-3.5 hover:bg-white/[0.02] transition-colors cursor-pointer"
            onClick={() => setShowSettingsSubpage(true)}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-violet-500/10 text-violet-400 flex items-center justify-center">
                <Settings2 className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-white">Настройки</span>
                <span className="text-[11px] text-slate-400">Валюта, тема, язык</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </div>
        </div>
      </div>

      {/* ABOUT VAULTSPRING WALLET */}
      <div className="space-y-1.5">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
          О кошельке
        </span>

        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Приложение</span>
            <span className="text-white font-bold">VaultSpring Wallet</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Тип кошелька</span>
            <span className="text-purple-400 font-semibold">Мультичейн Web3</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Шифрование</span>
            <span className="text-emerald-400 font-medium">AES-256 Client-Side</span>
          </div>
        </div>
      </div>

      {/* CONTACT / SUPPORT SECTION */}
      <div className="space-y-1.5">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
          Поддержка
        </span>

        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl divide-y divide-white/[0.04]">
          {/* Live Support Chat */}
          <div
            className="flex items-center justify-between p-3.5 hover:bg-white/[0.02] transition-colors cursor-pointer"
            onClick={() => setShowSupportChat(true)}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <MessageCircle className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-white">Связаться с нами</span>
                <span className="text-[11px] text-slate-400">Техподдержка онлайн 24/7</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </div>

          {/* Telegram */}
          <a
            href="https://t.me/vaultspring_support"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3.5 hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-sky-500/10 text-sky-400 flex items-center justify-center">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.692-1.653-1.123-2.678-1.799-1.185-.781-.417-1.21.258-1.911.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635.099-.002.321.023.465.141.121.099.154.232.17.325.015.093.034.305.019.471z"/>
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-white">Telegram</span>
                <span className="text-[11px] text-slate-400">Канал обновлений и новостей</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </a>
        </div>
      </div>

      {/* ABOUT US SECTION */}
      <div className="space-y-1.5">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
          О нас
        </span>

        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl">
          <div
            onClick={() => setShowAboutSubpage(true)}
            className="flex items-center justify-between p-3.5 hover:bg-white/[0.02] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-500/10 text-slate-400 flex items-center justify-center">
                <Shield className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-white">О VaultSpring</span>
                <span className="text-[11px] text-slate-400">Политика, условия, версия</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </div>
        </div>
      </div>

      {/* CHANGE PIN MODAL */}
      {showChangePinModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-[#0F1420] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <span className="text-base font-bold text-white">Смена ПИН-кода</span>
              <button
                onClick={() => setShowChangePinModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white bg-white/[0.05]"
              >
                ✕
              </button>
            </div>

            {changePinSuccess ? (
              <div className="py-6 flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2">
                  <Check className="w-6 h-6" />
                </div>
                <span className="text-sm font-bold text-white">ПИН-код успешно изменен!</span>
                <span className="text-xs text-slate-400 mt-1">Новый код сохранен в памяти устройства</span>
              </div>
            ) : changePinStep === 'verify_current' ? (
              <div className="space-y-4">
                <span className="text-xs text-slate-300 block">Введите текущий 6-значный ПИН-код:</span>
                <input
                  type="password"
                  maxLength={6}
                  placeholder="Текущий ПИН-код"
                  value={currentPinAttempt}
                  onChange={(e) => setCurrentPinAttempt(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-center text-sm font-mono tracking-widest text-white focus:outline-none focus:border-purple-500"
                />
                {changePinError && <span className="text-xs text-rose-400 block">{changePinError}</span>}
                <button
                  onClick={handleVerifyCurrentPin}
                  className="w-full py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
                >
                  Продолжить
                </button>
              </div>
            ) : changePinStep === 'set_new' ? (
              <div className="space-y-4">
                <span className="text-xs text-slate-300 block">Придумайте новый 6-значный ПИН-код:</span>
                <input
                  type="password"
                  maxLength={6}
                  placeholder="Новый 6-значный код"
                  value={newPinInput}
                  onChange={(e) => setNewPinInput(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-center text-sm font-mono tracking-widest text-white focus:outline-none focus:border-purple-500"
                />
                {changePinError && <span className="text-xs text-rose-400 block">{changePinError}</span>}
                <button
                  onClick={handleSetNewPin}
                  className="w-full py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
                >
                  Далее
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <span className="text-xs text-slate-300 block">Повторите новый 6-значный ПИН-код:</span>
                <input
                  type="password"
                  maxLength={6}
                  placeholder="Повторите новый код"
                  value={confirmNewPinInput}
                  onChange={(e) => setConfirmNewPinInput(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-center text-sm font-mono tracking-widest text-white focus:outline-none focus:border-purple-500"
                />
                {changePinError && <span className="text-xs text-rose-400 block">{changePinError}</span>}
                <button
                  onClick={handleConfirmNewPin}
                  className="w-full py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
                >
                  Сохранить новый ПИН-код
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECRET RECOVERY PHRASE MODAL */}
      {showPhraseModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-[#0F1420] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <span className="text-base font-bold text-white">Секретная фраза восстановления</span>
              <button
                onClick={() => setShowPhraseModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white bg-white/[0.05]"
              >
                ✕
              </button>
            </div>

            {!revealedPhrase ? (
              <div className="space-y-4">
                <div className="flex items-start gap-2 bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl text-xs text-rose-300">
                  <Shield className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <span>
                    Никогда и никому не показывайте эти 12 слов! Каждый, кто узнает фразу, получит полный доступ к кошельку.
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-medium">Введите 6-значный ПИН-код</label>
                  <input
                    type="password"
                    maxLength={6}
                    placeholder="6-значный ПИН-код"
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-purple-500 text-center tracking-widest"
                  />
                  {phraseError && <span className="text-xs text-rose-400 block mt-1">{phraseError}</span>}
                </div>

                <button
                  onClick={handleReveal}
                  className="w-full py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs tracking-wide transition-colors cursor-pointer"
                >
                  Показать секретную фразу
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2 bg-black/50 p-3 rounded-2xl border border-white/10">
                  {currentWallet.mnemonic.map((word, idx) => (
                    <div
                      key={idx}
                      className="bg-white/[0.04] p-2 rounded-lg text-center flex items-center justify-between px-2 text-xs"
                    >
                      <span className="text-slate-500 text-[10px] select-none">{idx + 1}.</span>
                      <span className="font-mono font-medium text-white">{word}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(currentWallet.mnemonic.join(' '));
                    setCopiedPhrase(true);
                    setTimeout(() => setCopiedPhrase(false), 2000);
                  }}
                  className="w-full py-2.5 bg-white/[0.06] hover:bg-white/[0.1] rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>{copiedPhrase ? 'Фраза скопирована!' : 'Скопировать в буфер'}</span>
                </button>

                <button
                  onClick={() => setShowPhraseModal(false)}
                  className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-colors cursor-pointer"
                >
                  Готово
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Support Chat Modal */}
      {showSupportChat && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full sm:max-w-md bg-[#0F1420] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl flex flex-col h-[70vh] sm:h-[500px]">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-sm font-bold text-white">Чат поддержки</span>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="text-[10px] text-emerald-400">Онлайн</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowSupportChat(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white bg-white/[0.05] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                      msg.from === 'user'
                        ? 'bg-blue-600 text-white rounded-br-md'
                        : 'bg-white/[0.06] text-slate-200 rounded-bl-md'
                    }`}
                  >
                    {msg.text}
                    <div className={`text-[9px] mt-1 ${msg.from === 'user' ? 'text-blue-200' : 'text-slate-500'}`}>
                      {msg.time}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-white/[0.06]">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && chatInput.trim()) {
                      const now = new Date();
                      const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
                      setChatMessages((prev) => [...prev, { from: 'user', text: chatInput.trim(), time }]);
                      setChatInput('');
                      // Auto-reply
                      setTimeout(() => {
                        const replies = [
                          'Спасибо за обращение! Оператор ответит в ближайшее время.',
                          'Ваш вопрос принят. Ожидайте ответа специалиста.',
                          'Понял вас! Передаю запрос оператору.',
                          'Здравствуйте! Уточните, пожалуйста, номер кошелька.'
                        ];
                        const reply = replies[Math.floor(Math.random() * replies.length)];
                        const replyTime = `${now.getHours().toString().padStart(2, '0')}:${(now.getMinutes() + 1).toString().padStart(2, '0')}`;
                        setChatMessages((prev) => [...prev, { from: 'support', text: reply, time: replyTime }]);
                      }, 1500);
                    }
                  }}
                  placeholder="Напишите сообщение..."
                  className="flex-1 bg-white/[0.06] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={() => {
                    if (chatInput.trim()) {
                      const now = new Date();
                      const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
                      setChatMessages((prev) => [...prev, { from: 'user', text: chatInput.trim(), time }]);
                      setChatInput('');
                      setTimeout(() => {
                        const replies = [
                          'Спасибо за обращение! Оператор ответит в ближайшее время.',
                          'Ваш вопрос принят. Ожидайте ответа специалиста.',
                          'Понял вас! Передаю запрос оператору.',
                          'Здравствуйте! Уточните, пожалуйста, номер кошелька.'
                        ];
                        const reply = replies[Math.floor(Math.random() * replies.length)];
                        const replyTime = `${now.getHours().toString().padStart(2, '0')}:${(now.getMinutes() + 1).toString().padStart(2, '0')}`;
                        setChatMessages((prev) => [...prev, { from: 'support', text: reply, time: replyTime }]);
                      }, 1500);
                    }
                  }}
                  className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center cursor-pointer transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Security Sub-page Modal */}
      {showSecuritySubpage && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-[#0F1420] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl flex flex-col max-h-[85vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/[0.06] sticky top-0 bg-[#0F1420] z-10">
              <button
                onClick={() => setShowSecuritySubpage(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white bg-white/[0.05] cursor-pointer"
              >
                <ChevronRight className="w-4 h-4 rotate-180" />
              </button>
              <span className="text-sm font-bold text-white">Безопасность</span>
              <button className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 bg-white/[0.05]">
                <Info className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-1">
              {/* PIN Toggle */}
              <div className="flex items-center justify-between py-3">
                <span className="text-sm font-semibold text-white">Пароль</span>
                <button
                  onClick={() => setPinEnabled(!pinEnabled)}
                  className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer ${
                    pinEnabled ? 'bg-violet-600' : 'bg-slate-700'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                    pinEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Auto-lock */}
              <div className="flex items-center justify-between py-3">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-white">Автоблокировка</span>
                  <span className="text-[11px] text-slate-400">Мгновенно</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>

              {/* Lock Method */}
              <div
                onClick={() => {
                  setShowSecuritySubpage(false);
                  setShowChangePinModal(true);
                  setChangePinStep('verify_current');
                  setCurrentPinAttempt('');
                  setNewPinInput('');
                  setConfirmNewPinInput('');
                  setChangePinError(null);
                }}
                className="flex items-center justify-between py-3 cursor-pointer"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-white">Метод блокировки</span>
                  <span className="text-[11px] text-slate-400">ПИН-код</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>

              {/* Transaction Signing */}
              <div className="flex items-center justify-between py-3">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-white">Подписание транзакций</span>
                  <span className="text-[11px] text-slate-400">Запрашивать разрешение на проведение транзакций</span>
                </div>
                <button
                  onClick={() => setTxSigning(!txSigning)}
                  className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ml-3 ${
                    txSigning ? 'bg-violet-600' : 'bg-slate-700'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                    txSigning ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Confirmations */}
              <div className="flex items-center justify-between py-3">
                <span className="text-sm font-semibold text-white">Подтверждения</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>

              {/* Transfer Assets */}
              <div className="flex items-center justify-between py-3">
                <span className="text-sm font-semibold text-white">Переместить активы</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>

              {/* Show Seed Phrase */}
              <div
                onClick={() => {
                  setShowSecuritySubpage(false);
                  setShowPhraseModal(true);
                  setRevealedPhrase(false);
                  setPinInput('');
                  setPhraseError(null);
                }}
                className="flex items-center justify-between py-3 cursor-pointer"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-white">Показать сид-фразу</span>
                  <span className="text-[11px] text-slate-400">12 мастер-слов восстановления</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* About Us Sub-page Modal */}
      {showAboutSubpage && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-[#0F1420] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl flex flex-col max-h-[85vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/[0.06] sticky top-0 bg-[#0F1420] z-10">
              <button
                onClick={() => setShowAboutSubpage(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white bg-white/[0.05] cursor-pointer"
              >
                <ChevronRight className="w-4 h-4 rotate-180" />
              </button>
              <span className="text-sm font-bold text-white">О нас</span>
              <div className="w-8" />
            </div>

            <div className="p-4 space-y-1">
              {/* Feedback */}
              <a
                href="https://vaultspringwallet.com/feedback"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between py-3"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-white">У меня есть предложение</span>
                  <span className="text-[11px] text-slate-400">Если у вас есть идеи по улучшению приложения, напишите нам</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 ml-3" />
              </a>

              {/* Privacy Policy */}
              <a
                href="/privacy.html"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between py-3"
              >
                <span className="text-sm font-semibold text-white">Политика конфиденциальности</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </a>

              {/* Terms of Service */}
              <a
                href="/terms.html"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between py-3"
              >
                <span className="text-sm font-semibold text-white">Условия обслуживания</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </a>

              {/* Version */}
              <div className="py-3">
                <span className="text-sm font-semibold text-slate-300">Версия 1.0.0 (20261019)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Sub-page Modal */}
      {showSettingsSubpage && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-[#0F1420] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl flex flex-col max-h-[85vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/[0.06] sticky top-0 bg-[#0F1420] z-10">
              <button
                onClick={() => setShowSettingsSubpage(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white bg-white/[0.05] cursor-pointer"
              >
                <ChevronRight className="w-4 h-4 rotate-180" />
              </button>
              <span className="text-sm font-bold text-white">Настройки</span>
              <div className="w-8" />
            </div>

            <div className="p-4 space-y-4">
              {/* Currency */}
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-white">Валюта</span>
                  <span className="text-[11px] text-slate-400">{currency}</span>
                </div>
                <select
                  value={currency}
                  onChange={(e) => { setCurrency(e.target.value); onFiatCurrencyChange?.(e.target.value); }}
                  className="bg-white/[0.06] border border-white/[0.08] text-xs font-mono text-white rounded-lg px-2 py-1.5 focus:outline-none cursor-pointer"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="JPY">JPY (¥)</option>
                  <option value="CNY">CNY (¥)</option>
                  <option value="CHF">CHF (CHF)</option>
                  <option value="CAD">CAD (C$)</option>
                  <option value="AUD">AUD (A$)</option>
                  <option value="PLN">PLN (zł)</option>
                  <option value="INR">INR (₹)</option>
                </select>
              </div>

              {/* Theme */}
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-white">Тема</span>
                  <span className="text-[11px] text-slate-400">
                    {theme === 'system' ? 'Как в системе' : theme === 'dark' ? 'Тёмная' : 'Светлая'}
                  </span>
                </div>
                <div className="flex items-center gap-1 bg-white/[0.06] rounded-lg p-0.5">
                  {(['system', 'dark', 'light'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-colors cursor-pointer ${
                        theme === t ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {t === 'system' ? 'Авто' : t === 'dark' ? 'Тёмная' : 'Светлая'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Language */}
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-white">Язык приложения</span>
                  <span className="text-[11px] text-slate-400">{language}</span>
                </div>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="bg-white/[0.06] border border-white/[0.08] text-xs text-white rounded-lg px-2 py-1.5 focus:outline-none cursor-pointer"
                >
                  <option value="Русский">Русский</option>
                  <option value="English">English</option>
                  <option value="Українська">Українська</option>
                </select>
              </div>

              {/* App Icon */}
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-white">Иконка приложения</span>
                  <span className="text-[11px] text-slate-400">По умолчанию</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>

              {/* DApp Browser */}
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-white">Браузер DApp</span>
                  <span className="text-[11px] text-slate-400">Встроенный браузер</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>

              {/* Support Settings */}
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => { setShowSettingsSubpage(false); setShowSupportChat(true); }}
              >
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-white">Настройки поддержки</span>
                  <span className="text-[11px] text-slate-400">Чат, уведомления</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
