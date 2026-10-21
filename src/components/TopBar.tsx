import React from 'react';
import { ChevronDown, Bell, Globe, Copy, Check } from 'lucide-react';
import { WalletAccount, NetworkType } from '../types/wallet';

interface TopBarProps {
  currentWallet: WalletAccount;
  currentNetwork: NetworkType;
  unreadCount: number;
  onOpenWalletSwitcher: () => void;
  onOpenNetworkFilter: () => void;
  onOpenNotifications: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentWallet,
  currentNetwork,
  unreadCount,
  onOpenWalletSwitcher,
  onOpenNetworkFilter,
  onOpenNotifications
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(currentWallet.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full px-4 py-2.5 flex items-center justify-between gap-3 bg-[#07090E]/90 backdrop-blur-md sticky top-0 z-20 border-b border-white/[0.04]">
      {/* Wallet Switcher Dropdown */}
      <div 
        onClick={onOpenWalletSwitcher}
        className="flex items-center gap-2 cursor-pointer group py-1 select-none min-w-0 flex-1"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-500 p-[1.5px] shrink-0 shadow-sm">
          <div className="w-full h-full rounded-full bg-[#0B0F19] flex items-center justify-center text-xs font-bold text-white">
            {currentWallet.name.charAt(0)}
          </div>
        </div>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-sm font-semibold text-white tracking-tight group-hover:text-purple-400 transition-colors truncate max-w-[130px]">
              {currentWallet.name}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors shrink-0" />
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-purple-300 transition-colors text-left font-mono min-w-0 max-w-full"
          >
            <span className="truncate">{currentWallet.address}</span>
            {copied ? (
              <Check className="w-2.5 h-2.5 text-emerald-400" />
            ) : (
              <Copy className="w-2.5 h-2.5 text-slate-500 hover:text-slate-300" />
            )}
          </button>
        </div>
      </div>

      {/* Right Action Icons: Network, Scanner, Notifications */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Network Filter Pill */}
        <button
          onClick={onOpenNetworkFilter}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-xs font-medium text-slate-300 hover:text-white transition-all cursor-pointer"
          title="Select Chain Network"
        >
          <Globe className="w-3.5 h-3.5 text-blue-400" />
          <span className="truncate max-w-[80px]">
            {currentNetwork === 'All Networks' ? 'All' : currentNetwork.split(' ')[0]}
          </span>
        </button>

        {/* Notification Bell */}
        <button
          onClick={onOpenNotifications}
          className="w-9 h-9 rounded-full relative flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-500" />
          )}
        </button>
      </div>
    </div>
  );
};
