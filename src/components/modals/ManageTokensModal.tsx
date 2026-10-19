import React, { useState } from 'react';
import { X, Search, Plus, Check } from 'lucide-react';
import { Token, NetworkType } from '../../types/wallet';
import { CryptoIcon } from '../common/CryptoIcon';

interface ManageTokensModalProps {
  tokens: Token[];
  activeTokenIds: string[];
  onAddCustomToken: (newToken: Token) => void;
  onToggleTokens: (enabledIds: string[]) => void;
  onClose: () => void;
}

export const ManageTokensModal: React.FC<ManageTokensModalProps> = ({
  tokens,
  activeTokenIds,
  onAddCustomToken,
  onToggleTokens,
  onClose
}) => {
  const [tab, setTab] = useState<'manage' | 'custom'>('manage');
  const [search, setSearch] = useState('');
  const [enabledTokens, setEnabledTokens] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    tokens.forEach((t) => { init[t.id] = activeTokenIds.includes(t.id); });
    return init;
  });

  // Custom token form
  const [customNetwork, setCustomNetwork] = useState<NetworkType>('BNB Smart Chain');
  const [contractAddress, setContractAddress] = useState('');
  const [customName, setCustomName] = useState('');
  const [customSymbol, setCustomSymbol] = useState('');
  const [customDecimals, setCustomDecimals] = useState('18');

  const filtered = tokens.filter(
    (t) => t.name.toLowerCase().includes(search.toLowerCase()) || t.symbol.toLowerCase().includes(search.toLowerCase())
  );

  const toggleToken = (id: string) => {
    setEnabledTokens((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName || !customSymbol) return;

    const newToken: Token = {
      id: `custom-${Date.now()}`,
      name: customName,
      symbol: customSymbol.toUpperCase(),
      network: customNetwork,
      price: 1.25,
      change24h: 0.0,
      balance: 100.0,
      balanceUsd: 125.0,
      sparkline: [1.2, 1.22, 1.25, 1.24, 1.25],
      contractAddress: contractAddress || '0xcustom...',
      decimals: parseInt(customDecimals) || 18,
      iconBg: '#0052FE',
      iconColor: '#FFFFFF'
    };

    onAddCustomToken(newToken);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full sm:max-w-md bg-[#0F1420] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl p-5 flex flex-col gap-4 max-h-[88vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
          <span className="text-base font-bold text-white">Manage Cryptocurrencies</span>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white bg-white/[0.05]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="grid grid-cols-2 p-1 bg-white/[0.04] rounded-xl border border-white/[0.06] text-xs font-semibold">
          <button
            onClick={() => setTab('manage')}
            className={`py-2 rounded-lg transition-all ${
              tab === 'manage' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Token List ({tokens.length})
          </button>
          <button
            onClick={() => setTab('custom')}
            className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              tab === 'custom' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Custom Token</span>
          </button>
        </div>

        {tab === 'manage' ? (
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search tokens or contract..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="divide-y divide-white/[0.04] max-h-72 overflow-y-auto pr-1">
              {filtered.map((t) => {
                const isEnabled = enabledTokens[t.id] !== false;
                return (
                  <div
                    key={t.id}
                    onClick={() => toggleToken(t.id)}
                    className="flex items-center justify-between py-3 cursor-pointer select-none group"
                  >
                    <div className="flex items-center gap-2.5">
                      <CryptoIcon symbol={t.symbol} size={28} />
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-white group-hover:text-blue-400">
                          {t.name}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {t.symbol} · {t.network === 'TRON (TRC-20)' ? 'TRC-20' : t.network.split(' ')[0]}
                        </span>
                      </div>
                    </div>

                    {/* iOS / Android style toggle switch */}
                    <div
                      className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 ease-in-out ${
                        isEnabled ? 'bg-blue-600' : 'bg-slate-700'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out ${
                          isEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => {
                const enabledIds = Object.entries(enabledTokens)
                  .filter(([_, v]) => v)
                  .map(([id]) => id);
                onToggleTokens(enabledIds);
                onClose();
              }}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs tracking-wide transition-colors"
            >
              Сохранить ({Object.values(enabledTokens).filter(Boolean).length} токенов)
            </button>
          </div>
        ) : (
          <form onSubmit={handleAddCustom} className="space-y-3 text-xs">
            <div className="space-y-1">
              <label className="text-slate-400 font-medium">Network</label>
              <select
                value={customNetwork}
                onChange={(e) => setCustomNetwork(e.target.value as NetworkType)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="TRON (TRC-20)">TRON (TRC-20)</option>
                <option value="BNB Smart Chain">BNB Smart Chain (BEP-20)</option>
                <option value="Ethereum">Ethereum (ERC-20)</option>
                <option value="Solana">Solana (SPL)</option>
                <option value="Polygon">Polygon (POL)</option>
                <option value="The Open Network">The Open Network (TON)</option>
                <option value="Arbitrum">Arbitrum One</option>
                <option value="Optimism">Optimism</option>
                <option value="Base">Base</option>
                <option value="Avalanche">Avalanche</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 font-medium">Contract Address</label>
              <input
                type="text"
                placeholder="0x..."
                value={contractAddress}
                onChange={(e) => setContractAddress(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Name</label>
                <input
                  type="text"
                  placeholder="e.g. Vaultspring Fan"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Symbol</label>
                <input
                  type="text"
                  placeholder="e.g. FAN"
                  value={customSymbol}
                  onChange={(e) => setCustomSymbol(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-blue-500 uppercase"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 font-medium">Decimals</label>
              <input
                type="number"
                value={customDecimals}
                onChange={(e) => setCustomDecimals(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={!customName || !customSymbol}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold text-xs tracking-wide transition-colors mt-2"
            >
              Import Token
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
