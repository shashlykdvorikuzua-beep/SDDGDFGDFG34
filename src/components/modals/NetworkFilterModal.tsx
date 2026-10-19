import React from 'react';
import { X, Check, Globe } from 'lucide-react';
import { NetworkType } from '../../types/wallet';

interface NetworkFilterModalProps {
  currentNetwork: NetworkType;
  onSelectNetwork: (network: NetworkType) => void;
  onClose: () => void;
}

export const NetworkFilterModal: React.FC<NetworkFilterModalProps> = ({
  currentNetwork,
  onSelectNetwork,
  onClose
}) => {
  const networks: { name: NetworkType; iconText: string; color: string; desc: string }[] = [
    { name: 'All Networks', iconText: '🌐', color: '#0052FE', desc: 'All supported Layer 1 & Layer 2 blockchains' },
    { name: 'TRON (TRC-20)', iconText: '🔴', color: '#EB0029', desc: 'TRC-20 high speed, low-fee USDT network' },
    { name: 'BNB Smart Chain', iconText: '🟡', color: '#F3BA2F', desc: 'BEP-20 high speed, low gas ecosystem' },
    { name: 'Ethereum', iconText: '🔷', color: '#627EEA', desc: 'ERC-20 smart contracts and DeFi leader' },
    { name: 'Solana', iconText: '⚡', color: '#14F195', desc: 'SPL sub-second finality and high throughput' },
    { name: 'Bitcoin', iconText: '₿', color: '#F7931A', desc: 'Native Bitcoin blockchain network' },
    { name: 'XRP Ledger', iconText: '✕', color: '#23292F', desc: 'XRP instant cross-border settlement' },
    { name: 'Dogecoin', iconText: 'Ð', color: '#C2A633', desc: 'Dogecoin peer-to-peer digital currency' },
    { name: 'Cardano', iconText: '₳', color: '#0033AD', desc: 'Cardano proof-of-stake blockchain' },
    { name: 'The Open Network', iconText: '💎', color: '#0098EA', desc: 'TON ecosystem & Web3 integration' },
    { name: 'Polygon', iconText: '🟣', color: '#8247E5', desc: 'PoS Layer 2 scaling with low cost' },
    { name: 'Arbitrum', iconText: '🔵', color: '#28A0F0', desc: 'Arbitrum One Ethereum Rollup' },
    { name: 'Optimism', iconText: '🔴', color: '#FF0420', desc: 'Optimism Superchain Ethereum L2' },
    { name: 'Avalanche', iconText: '🔺', color: '#E84142', desc: 'Avalanche C-Chain EVM' },
    { name: 'Base', iconText: '🟦', color: '#0052FE', desc: 'Base EVM Rollup by Coinbase' },
    { name: 'Litecoin', iconText: 'Ł', color: '#345D9D', desc: 'Litecoin decentralized global payments' },
    { name: 'Near', iconText: 'Ⓝ', color: '#00FFA3', desc: 'NEAR high-performance sharded protocol' },
    { name: 'Bitcoin Cash', iconText: '₿', color: '#0AC18E', desc: 'Bitcoin Cash peer-to-peer electronic cash' },
    { name: 'Aptos', iconText: '▲', color: '#00FFA3', desc: 'Aptos Move-based Layer 1 blockchain' },
    { name: 'Cosmos', iconText: '⚛', color: '#5064FB', desc: 'Cosmos Hub & IBC inter-blockchain network' },
    { name: 'Filecoin', iconText: '⨎', color: '#0090FF', desc: 'Filecoin decentralized storage network' },
    { name: 'Sei', iconText: '〰', color: '#9E1A36', desc: 'Sei Network fast Layer 1 for trading' }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full sm:max-w-md bg-[#0F1420] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl p-5 flex flex-col gap-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-400" />
            <span className="text-base font-bold text-white">Select Blockchain Network</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white bg-white/[0.05]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1.5">
          {networks.map((net) => {
            const isSelected = net.name === currentNetwork;
            return (
              <div
                key={net.name}
                onClick={() => {
                  onSelectNetwork(net.name);
                  onClose();
                }}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600/10 border-blue-500/60'
                    : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl select-none">{net.iconText}</span>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white">{net.name}</span>
                    <span className="text-[11px] text-slate-400">{net.desc}</span>
                  </div>
                </div>

                {isSelected && <Check className="w-4 h-4 text-blue-400 shrink-0" />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
