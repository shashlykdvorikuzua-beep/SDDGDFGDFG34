import React from 'react';
import { Wallet, ArrowLeftRight, Percent, Settings } from 'lucide-react';

export type BottomTabType = 'home' | 'swap' | 'earn' | 'settings';

interface BottomNavBarProps {
  activeTab: BottomTabType;
  onChangeTab: (tab: BottomTabType) => void;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({ activeTab, onChangeTab }) => {
  const tabs: { id: BottomTabType; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'home', label: 'Home', icon: Wallet },
    { id: 'swap', label: 'Swap', icon: ArrowLeftRight },
    { id: 'earn', label: 'Earn', icon: Percent },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 w-full h-16 bg-[#07090E]/95 backdrop-blur-lg border-t border-white/[0.06] grid grid-cols-4 items-center px-1 shrink-0 select-none z-50 pb-[env(safe-area-inset-bottom)]">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onChangeTab(tab.id)}
            className="flex flex-col items-center justify-center h-full min-h-[44px] min-w-[44px] relative group cursor-pointer"
          >
            <div className={`p-1 rounded-xl transition-transform ${isActive ? 'scale-105' : 'group-active:scale-95'}`}>
              <Icon
                className={`w-5 h-5 transition-colors stroke-[2.2] ${
                  isActive ? 'text-blue-500' : 'text-slate-400 group-hover:text-slate-200'
                }`}
              />
            </div>

            <span
              className={`text-[10px] font-semibold tracking-tight transition-colors ${
                isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'
              }`}
            >
              {tab.label}
            </span>

            {/* Micro active pill glow */}
            {isActive && (
              <div className="absolute top-1 w-1 h-1 rounded-full bg-blue-500 shadow-[0_0_8px_#0052FE]" />
            )}
          </button>
        );
      })}
    </nav>
  );
};
