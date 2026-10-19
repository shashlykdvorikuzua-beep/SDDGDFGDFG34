import React from 'react';
import { X, Bell, CheckCircle2, ShieldCheck, ArrowDownLeft, ArrowUpRight, TrendingUp } from 'lucide-react';
import { AppNotification } from '../../types/wallet';

interface NotificationsModalProps {
  notifications: AppNotification[];
  onMarkAllAsRead: () => void;
  onClose: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  notifications,
  onMarkAllAsRead,
  onClose
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full sm:max-w-md bg-[#0F1420] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl p-5 flex flex-col gap-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-blue-400" />
            <span className="text-base font-bold text-white">Notifications</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onMarkAllAsRead}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium"
            >
              Mark all read
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white bg-white/[0.05]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="space-y-2.5">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`p-3.5 rounded-2xl border transition-all ${
                !n.read
                  ? 'bg-blue-600/[0.08] border-blue-500/40'
                  : 'bg-white/[0.02] border-white/[0.06]'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center shrink-0 mt-0.5">
                  {n.type === 'tx' && n.subtype === 'send' && <ArrowUpRight className="w-4 h-4 text-rose-400" />}
                  {n.type === 'tx' && n.subtype === 'receive' && <ArrowDownLeft className="w-4 h-4 text-emerald-400" />}
                  {n.type === 'tx' && !n.subtype && <ArrowDownLeft className="w-4 h-4 text-emerald-400" />}
                  {n.type === 'reward' && <CheckCircle2 className="w-4 h-4 text-blue-400" />}
                  {n.type === 'price' && <TrendingUp className="w-4 h-4 text-amber-400" />}
                  {n.type === 'security' && <ShieldCheck className="w-4 h-4 text-purple-400" />}
                </div>

                <div className="flex-1 flex flex-col">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{n.title}</span>
                    <span className="text-[10px] text-slate-500">{n.time}</span>
                  </div>
                  <span className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {n.message}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
