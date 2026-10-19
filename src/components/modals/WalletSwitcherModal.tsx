import React, { useState } from 'react';
import { X, Check, Plus, Shield, KeyRound, Copy } from 'lucide-react';
import { WalletAccount } from '../../types/wallet';

interface WalletSwitcherModalProps {
  wallets: WalletAccount[];
  activeWalletId: string;
  onSelectWallet: (wallet: WalletAccount) => void;
  onCreateWallet: (newWallet: WalletAccount) => void;
  onClose: () => void;
}

export const WalletSwitcherModal: React.FC<WalletSwitcherModalProps> = ({
  wallets,
  activeWalletId,
  onSelectWallet,
  onCreateWallet,
  onClose
}) => {
  const [view, setView] = useState<'list' | 'create' | 'import'>('list');
  const [newWalletName, setNewWalletName] = useState('');
  const [generatedMnemonic, setGeneratedMnemonic] = useState<string[]>([]);
  const [copiedMnemonic, setCopiedMnemonic] = useState(false);
  const [importInput, setImportInput] = useState('');

  const sampleWords = [
    'alpine', 'banner', 'canvas', 'diver', 'eagle', 'forest',
    'glance', 'harbor', 'island', 'jungle', 'kite', 'lunar'
  ];

  const handleStartCreate = () => {
    // Generate randomized 12-word recovery seed
    const shuffled = [...sampleWords].sort(() => 0.5 - Math.random());
    setGeneratedMnemonic(shuffled);
    setNewWalletName(`Vaultspring Wallet ${wallets.length + 1}`);
    setView('create');
  };

  const handleCompleteCreate = () => {
    const randomHex = Math.random().toString(16).substring(2, 6);
    const newWallet: WalletAccount = {
      id: `w-${Date.now()}`,
      name: newWalletName || `Vaultspring Wallet ${wallets.length + 1}`,
      address: `0x${randomHex}...${Math.random().toString(16).substring(2, 6)}`,
      mnemonic: generatedMnemonic,
      totalBalanceUsd: 0.00,
      isBackedUp: true
    };
    onCreateWallet(newWallet);
    onSelectWallet(newWallet);
    onClose();
  };

  const handleCompleteImport = () => {
    const words = importInput.trim().split(/\s+/);
    const newWallet: WalletAccount = {
      id: `w-${Date.now()}`,
      name: `Imported Wallet ${wallets.length + 1}`,
      address: `0x${Math.random().toString(16).substring(2, 6)}...${Math.random().toString(16).substring(2, 6)}`,
      mnemonic: words.length >= 12 ? words.slice(0, 12) : sampleWords,
      totalBalanceUsd: 1250.00,
      isBackedUp: true
    };
    onCreateWallet(newWallet);
    onSelectWallet(newWallet);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full sm:max-w-md bg-[#0F1420] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl p-5 flex flex-col gap-4 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
          <span className="text-base font-bold text-white">
            {view === 'list' ? 'Wallets Manager' : view === 'create' ? 'Create New Multi-Coin Wallet' : 'Import Wallet'}
          </span>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white bg-white/[0.05]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* VIEW 1: WALLETS LIST */}
        {view === 'list' && (
          <div className="space-y-3">
            <div className="space-y-2">
              {wallets.map((w) => {
                const isActive = w.id === activeWalletId;
                return (
                  <div
                    key={w.id}
                    onClick={() => {
                      onSelectWallet(w);
                      onClose();
                    }}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-blue-600/10 border-blue-500/60'
                        : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-400 p-[1.5px] shrink-0">
                        <div className="w-full h-full rounded-full bg-[#0B0F19] flex items-center justify-center text-xs font-bold text-white">
                          {w.name.charAt(0)}
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-white">{w.name}</span>
                        <span className="text-xs text-slate-400 font-mono">{w.address}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white font-mono">
                        ${w.totalBalanceUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      {isActive && <Check className="w-4 h-4 text-blue-400" />}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={handleStartCreate}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-lg shadow-blue-600/20"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Wallet</span>
              </button>

              <button
                onClick={() => setView('import')}
                className="w-full py-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <KeyRound className="w-4 h-4 text-slate-300" />
                <span>I already have a wallet (Import Phrase)</span>
              </button>
            </div>
          </div>
        )}

        {/* VIEW 2: CREATE WALLET & BACKUP SEED */}
        {view === 'create' && (
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-medium">Wallet Name</label>
              <input
                type="text"
                value={newWalletName}
                onChange={(e) => setNewWalletName(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 p-2.5 rounded-xl text-xs text-blue-300">
              <Shield className="w-4 h-4 text-blue-400 shrink-0" />
              <span>Write down your 12-word Secret Recovery Phrase in order and store it safely offline.</span>
            </div>

            {/* 12-word seed phrase grid */}
            <div className="grid grid-cols-3 gap-2 bg-black/40 p-3 rounded-2xl border border-white/10">
              {generatedMnemonic.map((word, idx) => (
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
                navigator.clipboard.writeText(generatedMnemonic.join(' '));
                setCopiedMnemonic(true);
                setTimeout(() => setCopiedMnemonic(false), 2000);
              }}
              className="w-full py-2 bg-white/[0.04] hover:bg-white/[0.08] rounded-xl text-xs text-slate-300 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copiedMnemonic ? 'Phrase Copied!' : 'Copy Phrase to Clipboard'}</span>
            </button>

            <button
              onClick={handleCompleteCreate}
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs tracking-wide transition-colors"
            >
              I Have Saved My Secret Phrase
            </button>
          </div>
        )}

        {/* VIEW 3: IMPORT SEED PHRASE */}
        {view === 'import' && (
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-medium">12 or 24-Word Secret Recovery Phrase</label>
              <textarea
                rows={4}
                placeholder="Separate each word with a space (e.g. venture galaxy silent crypto shield...)"
                value={importInput}
                onChange={(e) => setImportInput(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setView('list')}
                className="w-1/3 py-3 rounded-xl bg-white/[0.06] text-slate-300 font-semibold text-xs"
              >
                Back
              </button>
              <button
                disabled={!importInput.trim()}
                onClick={handleCompleteImport}
                className="w-2/3 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold text-xs"
              >
                Restore Wallet
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
