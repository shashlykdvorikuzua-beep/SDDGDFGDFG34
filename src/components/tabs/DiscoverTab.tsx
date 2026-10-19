import React, { useState } from 'react';
import { Search, Compass, ExternalLink, ArrowLeft, RotateCw, Lock, Star, ChevronRight } from 'lucide-react';
import { DAppItem } from '../../types/wallet';

interface DiscoverTabProps {
  dapps: DAppItem[];
  walletAddress: string;
}

export const DiscoverTab: React.FC<DiscoverTabProps> = ({ dapps, walletAddress }) => {
  const [searchUrl, setSearchUrl] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeDApp, setActiveDApp] = useState<DAppItem | null>(null);

  const categories = ['All', 'DeFi', 'NFT', 'Yield', 'Bridges', 'Gaming'];

  const filteredDApps = dapps.filter((d) => {
    const matchesCat = selectedCategory === 'All' || d.category === selectedCategory;
    const matchesSearch =
      d.name.toLowerCase().includes(searchUrl.toLowerCase()) ||
      d.description.toLowerCase().includes(searchUrl.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleLaunchUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchUrl) return;

    const customDApp: DAppItem = {
      id: 'custom-browser',
      name: searchUrl.replace(/^https?:\/\//, '').split('/')[0],
      category: 'DeFi',
      url: searchUrl.startsWith('http') ? searchUrl : `https://${searchUrl}`,
      description: 'Web3 Decentralized Application',
      network: 'All Networks',
      rating: 5.0,
      icon: '🌐'
    };
    setActiveDApp(customDApp);
  };

  return (
    <div className="w-full flex-1 flex flex-col bg-[#07090E] overflow-hidden">
      {/* If dApp Browser is open */}
      {activeDApp ? (
        <div className="flex-1 flex flex-col bg-[#0A0D14] z-30">
          {/* Browser Navigation Bar */}
          <div className="px-3 py-2 bg-[#0F1420] border-b border-white/[0.08] flex items-center gap-2">
            <button
              onClick={() => setActiveDApp(null)}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/[0.08]"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <button
              onClick={() => {}}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>

            {/* URL bar */}
            <div className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-2.5 py-1.5 flex items-center gap-2 text-xs text-white">
              <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="truncate font-mono text-[11px] text-slate-200">
                {activeDApp.url}
              </span>
            </div>

            {/* Connected Wallet Badge */}
            <div className="px-2 py-1 rounded-lg bg-blue-600/20 border border-blue-500/30 text-[10px] text-blue-300 font-mono flex items-center gap-1 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>{walletAddress.substring(0, 6)}...</span>
            </div>
          </div>

          {/* Embedded Web3 dApp View Simulation */}
          <div className="flex-1 p-4 overflow-y-auto flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-3xl shadow-xl">
              {activeDApp.icon}
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-bold text-white">{activeDApp.name}</h3>
              <p className="text-xs text-slate-400 max-w-xs">{activeDApp.description}</p>
            </div>

            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 max-w-xs w-full text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Web3 Provider</span>
                <span className="text-emerald-400 font-medium">window.ethereum (Injected)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Chain Network</span>
                <span className="text-white">{activeDApp.network}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Protocol Security</span>
                <span className="text-blue-400">Vaultspring Shield 2026</span>
              </div>
            </div>

            <button
              onClick={() => setActiveDApp(null)}
              className="px-5 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-xs font-semibold text-white transition-colors"
            >
              Exit to DApp Directory
            </button>
          </div>
        </div>
      ) : (
        /* dApp Explorer Directory */
        <div className="flex-1 overflow-y-auto px-4 py-4 pb-24 space-y-4">
          <div className="flex items-center justify-between pb-1">
            <span className="text-lg font-extrabold text-white tracking-tight">Explore Web3</span>
            <span className="text-xs text-slate-400">Web3 Browser</span>
          </div>

          {/* Search or type URL bar */}
          <form onSubmit={handleLaunchUrl} className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search or enter dApp URL (e.g. app.uniswap.org)..."
              value={searchUrl}
              onChange={(e) => setSearchUrl(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-9 pr-16 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
            />
            {searchUrl && (
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-blue-600 rounded-lg text-[10px] font-bold text-white hover:bg-blue-500"
              >
                Go
              </button>
            )}
          </form>

          {/* Featured Web3 Banner */}
          <div className="w-full bg-gradient-to-r from-blue-900/60 via-indigo-900/40 to-slate-900 border border-blue-500/20 rounded-2xl p-4 relative overflow-hidden">
            <div className="relative z-10 space-y-1.5 max-w-[240px]">
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                Vaultspring Web3 2026
              </span>
              <h4 className="text-sm font-extrabold text-white leading-snug">
                Gasless Swaps & Cross-Chain dApp Ecosystem
              </h4>
              <p className="text-[11px] text-slate-300">
                Connect seamlessly with 10,000+ protocols across 14 networks.
              </p>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/[0.04] text-slate-400 hover:text-white border border-white/[0.06]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* DApps List */}
          <div className="space-y-2.5">
            {filteredDApps.map((dapp) => (
              <div
                key={dapp.id}
                onClick={() => setActiveDApp(dapp)}
                className="bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.06] rounded-2xl p-3.5 transition-all cursor-pointer group flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform">
                    {dapp.icon}
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                        {dapp.name}
                      </span>
                      {dapp.badge && (
                        <span className="text-[10px] font-semibold text-blue-400 bg-blue-500/10 px-1.5 py-0.2 rounded">
                          {dapp.badge}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                      {dapp.description}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1 text-[11px] text-amber-400 font-mono">
                    <Star className="w-3 h-3 fill-amber-400" />
                    <span>{dapp.rating}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
