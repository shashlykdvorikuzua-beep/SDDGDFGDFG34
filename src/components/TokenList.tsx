import React, { useState } from 'react';
import { Search, SlidersHorizontal, ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Percent, ExternalLink, Banknote } from 'lucide-react';
import { Token, NFTItem, Transaction, NetworkType } from '../types/wallet';
import { CryptoIcon } from './common/CryptoIcon';

interface TokenListProps {
  tokens: Token[];
  nfts: NFTItem[];
  transactions: Transaction[];
  currentNetwork: NetworkType;
  onSelectToken: (token: Token) => void;
  onOpenManageTokens: () => void;
}

export const TokenList: React.FC<TokenListProps> = ({
  tokens,
  nfts,
  transactions,
  currentNetwork,
  onSelectToken,
  onOpenManageTokens
}) => {
  const [activeTab, setActiveTab] = useState<'crypto' | 'nfts' | 'history'>('crypto');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  // Filter tokens by search query and network, then sort by balance (highest first)
  const filteredTokens = tokens
    .filter((t) => {
      const matchesNetwork = currentNetwork === 'All Networks' || t.network === currentNetwork;
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        t.name.toLowerCase().includes(query) ||
        t.symbol.toLowerCase().includes(query) ||
        t.network.toLowerCase().includes(query) ||
        (t.network === 'TRON (TRC-20)' && (query.includes('trc') || query.includes('tron') || query.includes('trc20')));
      return matchesNetwork && matchesSearch;
    })
    .sort((a, b) => b.balanceUsd - a.balanceUsd);

  // Filter NFTs
  const filteredNFTs = nfts.filter((nft) => {
    const matchesNetwork = currentNetwork === 'All Networks' || nft.network === currentNetwork;
    const matchesSearch =
      nft.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      nft.collection.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesNetwork && matchesSearch;
  });

  // Filter Transactions
  const filteredTransactions = transactions.filter((tx) => {
    const matchesNetwork = currentNetwork === 'All Networks' || tx.network === currentNetwork;
    const matchesSearch =
      tx.tokenSymbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.tokenName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.type.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesNetwork && matchesSearch;
  });

  return (
    <div className="w-full flex-1 flex flex-col bg-[#07090E] mt-1">
      {/* Segmented Tab Headers: Crypto | NFTs | History */}
      <div className="w-full px-4 border-b border-white/[0.06] flex items-center justify-between sticky top-[57px] bg-[#07090E] z-10">
        <div className="flex items-center gap-6">
          <button
            onClick={() => setActiveTab('crypto')}
            className={`py-3 text-sm font-semibold relative transition-colors cursor-pointer ${
              activeTab === 'crypto' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Crypto</span>
            {activeTab === 'crypto' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('nfts')}
            className={`py-3 text-sm font-semibold relative transition-colors cursor-pointer ${
              activeTab === 'nfts' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>NFTs</span>
            {activeTab === 'nfts' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`py-3 text-sm font-semibold relative transition-colors cursor-pointer ${
              activeTab === 'history' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>History</span>
            {activeTab === 'history' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
            )}
          </button>
        </div>

        {/* Manage Crypto icon button */}
        {activeTab === 'crypto' && (
          <button
            onClick={onOpenManageTokens}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
            title="Manage Token List"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search Input Bar */}
      <div className="px-4 py-2.5">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={
              activeTab === 'crypto' ? 'Search tokens...' : activeTab === 'nfts' ? 'Search collectibles...' : 'Search activity...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* Tab Content List */}
      <div className="flex-1 overflow-y-auto px-4 pb-20 divide-y divide-white/[0.04]">
        {/* CRYPTO TAB */}
        {activeTab === 'crypto' && (
          <>
            {filteredTokens.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No tokens found matching "{searchQuery}"
              </div>
            ) : (
              filteredTokens.map((token) => {
                const isPos = token.change24h >= 0;
                // Generate mini sparkline SVG points
                const minP = Math.min(...token.sparkline);
                const maxP = Math.max(...token.sparkline);
                const range = maxP - minP || 1;
                const sparkWidth = 56;
                const sparkHeight = 24;
                const sparkPath = token.sparkline.reduce((acc, curr, idx) => {
                  const x = (idx / (token.sparkline.length - 1)) * sparkWidth;
                  const y = sparkHeight - ((curr - minP) / range) * (sparkHeight - 4) - 2;
                  return `${acc} ${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                }, '');

                return (
                  <div
                    key={token.id}
                    onClick={() => onSelectToken(token)}
                    className="flex items-center justify-between py-3.5 group cursor-pointer hover:bg-white/[0.02] -mx-2 px-2 rounded-xl transition-colors select-none"
                  >
                    {/* Left: Token Icon + Name + Subtitle */}
                    <div className="flex items-center gap-3">
                      <CryptoIcon symbol={token.symbol} network={token.network} size={40} />
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold text-white tracking-tight group-hover:text-blue-400 transition-colors">
                            {token.name}
                          </span>
                          {token.network === 'TRON (TRC-20)' ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#EB0029]/20 text-[#FF5B65]">
                              TRC20
                            </span>
                          ) : token.network === 'BNB Smart Chain' && token.symbol !== 'BNB' ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#F3BA2F]/20 text-[#F3BA2F]">
                              BEP20
                            </span>
                          ) : token.network === 'Ethereum' && token.symbol !== 'ETH' ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#627EEA]/20 text-[#8CA0F8]">
                              ERC20
                            </span>
                          ) : token.network === 'Solana' && token.symbol !== 'SOL' ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#14F195]/20 text-[#14F195]">
                              SPL
                            </span>
                          ) : token.network === 'Polygon' && token.symbol !== 'POL' ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#8247E5]/20 text-[#C084FC]">
                              Polygon
                            </span>
                          ) : token.network === 'Arbitrum' && token.symbol !== 'ARB' ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#28A0F0]/20 text-[#60A5FA]">
                              Arbitrum
                            </span>
                          ) : token.network === 'Optimism' && token.symbol !== 'OP' ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#FF0420]/20 text-[#F87171]">
                              OP
                            </span>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono mt-0.5">
                          <span>
                            $
                            {token.price < 0.001
                              ? token.price.toFixed(7)
                              : token.price.toLocaleString('en-US', {
                                  minimumFractionDigits: token.price < 1 ? 4 : 2,
                                  maximumFractionDigits: token.price < 1 ? 4 : 2
                                })}
                          </span>
                          <span className={isPos ? 'text-[#0ECB81]' : 'text-[#F6465D]'}>
                            {isPos ? '+' : ''}{token.change24h}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Middle: Mini 24h Sparkline */}
                    <div className="hidden sm:block w-14 h-6">
                      <svg width="56" height="24" viewBox="0 0 56 24" className="overflow-visible">
                        <path
                          d={sparkPath}
                          fill="none"
                          stroke={isPos ? '#0ECB81' : '#F6465D'}
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>

                    {/* Right: User Balance and USD value */}
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-semibold text-white font-mono tabular-nums">
                        {token.balance.toLocaleString('en-US', { maximumFractionDigits: 4 })} {token.symbol}
                      </span>
                      <span className="text-xs text-slate-400 font-mono tabular-nums mt-0.5">
                        ${token.balanceUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}

            {/* Bottom Add Custom Crypto link */}
            <div className="py-5 text-center">
              <button
                onClick={onOpenManageTokens}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
              >
                <span>+ Manage & Add Custom Crypto</span>
              </button>
            </div>
          </>
        )}

        {/* NFTS TAB */}
        {activeTab === 'nfts' && (
          <div className="pt-2">
            {filteredNFTs.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No collectibles found in this wallet
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 pb-6">
                {filteredNFTs.map((nft) => (
                  <div
                    key={nft.id}
                    className="bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden hover:border-blue-500/40 transition-all group cursor-pointer"
                  >
                    <div className="w-full aspect-square relative overflow-hidden bg-slate-900">
                      <img
                        src={nft.imageUrl}
                        alt={nft.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] text-white font-mono">
                        {nft.network.split(' ')[0]}
                      </span>
                    </div>
                    <div className="p-2.5 flex flex-col">
                      <span className="text-[11px] text-slate-400 truncate">{nft.collection}</span>
                      <span className="text-xs font-bold text-white truncate mt-0.5">{nft.name}</span>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/[0.06] text-[11px]">
                        <span className="text-slate-400">Floor</span>
                        <span className="font-semibold text-blue-400 font-mono">
                          {nft.floorPrice} {nft.floorCurrency}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          <div className="pt-1">
            {filteredTransactions.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No recent transactions found
              </div>
            ) : (
              filteredTransactions.map((tx) => {
                const isReceive = tx.type === 'receive';
                const isSend = tx.type === 'send';
                const isSell = tx.type === 'sell';
                const isSwap = tx.type === 'swap';
                const isStake = tx.type === 'stake';

                return (
                  <div
                    key={tx.id}
                    onClick={() => setSelectedTx(tx)}
                    className="flex items-center justify-between py-3.5 hover:bg-white/[0.02] -mx-2 px-2 rounded-xl transition-colors cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        isReceive
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : isSend || isSell
                          ? 'bg-rose-500/10 text-rose-400'
                          : isSwap
                          ? 'bg-blue-500/10 text-blue-400'
                          : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        {isReceive && <ArrowDownLeft className="w-5 h-5 stroke-[2.2]" />}
                        {isSend && <ArrowUpRight className="w-5 h-5 stroke-[2.2]" />}
                        {isSell && <Banknote className="w-5 h-5 stroke-[2.2]" />}
                        {isSwap && <ArrowLeftRight className="w-5 h-5 stroke-[2.2]" />}
                        {isStake && <Percent className="w-5 h-5 stroke-[2.2]" />}
                      </div>

                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-white capitalize">
                          {tx.type} {tx.tokenSymbol}
                        </span>
                        <span className="text-xs text-slate-400">
                          {tx.timestamp} · {tx.status}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end">
                      <span className={`text-sm font-semibold font-mono tabular-nums ${
                        isReceive ? 'text-[#0ECB81]' : isSend ? 'text-white' : 'text-blue-400'
                      }`}>
                        {isReceive ? '+' : isSend ? '-' : ''}{tx.amount} {tx.tokenSymbol}
                      </span>
                      <span className="text-xs text-slate-400 font-mono tabular-nums mt-0.5">
                        ${tx.amountUsd.toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Transaction Details Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-[#0F1420] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl p-5 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom duration-200">
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto sm:hidden" />
            
            <div className="flex items-center justify-between">
              <span className="text-base font-bold text-white">Transaction Details</span>
              <button
                onClick={() => setSelectedTx(null)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-white/[0.05]"
              >
                Close
              </button>
            </div>

            <div className="flex flex-col items-center py-4 bg-white/[0.02] rounded-2xl border border-white/[0.05]">
              <span className="text-xs text-slate-400 uppercase tracking-wider">{selectedTx.type}</span>
              <span className="text-2xl font-bold text-white font-mono mt-1">
                {selectedTx.amount} {selectedTx.tokenSymbol}
              </span>
              <span className="text-xs text-slate-400 font-mono mt-0.5">
                ${selectedTx.amountUsd.toFixed(2)}
              </span>
              <span className="mt-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Success Confirmed
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-white/[0.04]">
                <span className="text-slate-400">Date & Time</span>
                <span className="text-white font-mono">{selectedTx.timestamp}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/[0.04]">
                <span className="text-slate-400">Network</span>
                <span className="text-white">{selectedTx.network}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/[0.04]">
                <span className="text-slate-400">Network Fee</span>
                <span className="text-white font-mono">${selectedTx.fee.toFixed(3)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/[0.04]">
                <span className="text-slate-400">Recipient / Contract</span>
                <span className="text-blue-400 font-mono">{selectedTx.toAddress}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/[0.04]">
                <span className="text-slate-400">Transaction Hash</span>
                <span className="text-slate-300 font-mono truncate max-w-[160px]">{selectedTx.hash}</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedTx(null)}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>View in Block Explorer</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
