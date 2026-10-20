import React from 'react';
import { X, Clock, CheckCircle2, AlertCircle, MessageCircle, ArrowDownLeft, ArrowUpRight, FileText } from 'lucide-react';

export interface ActivityItem {
  id: string;
  type: 'deposit' | 'withdrawal' | 'verification' | 'support';
  status: 'processing' | 'completed' | 'rejected' | 'needs_support';
  title: string;
  message: string;
  time: string;
  read?: boolean;
}

interface ActivityModalProps {
  items: ActivityItem[];
  onMarkAsRead: (id: string) => void;
  onOpenSupport: () => void;
  onClose: () => void;
}

export const ActivityModal: React.FC<ActivityModalProps> = ({
  items,
  onMarkAsRead,
  onOpenSupport,
  onClose
}) => {
  const getStatusIcon = (status: ActivityItem['status']) => {
    switch (status) {
      case 'processing': return <Clock className="w-4 h-4 text-amber-400" />;
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'rejected': return <AlertCircle className="w-4 h-4 text-rose-400" />;
      case 'needs_support': return <MessageCircle className="w-4 h-4 text-blue-400" />;
    }
  };

  const getStatusColor = (status: ActivityItem['status']) => {
    switch (status) {
      case 'processing': return 'bg-amber-500/20 text-amber-300';
      case 'completed': return 'bg-emerald-500/20 text-emerald-300';
      case 'rejected': return 'bg-rose-500/20 text-rose-300';
      case 'needs_support': return 'bg-blue-500/20 text-blue-300';
    }
  };

  const getStatusText = (status: ActivityItem['status']) => {
    switch (status) {
      case 'processing': return 'В обработке';
      case 'completed': return 'Выполнено';
      case 'rejected': return 'Отклонено';
      case 'needs_support': return 'Требуется поддержка';
    }
  };

  const getTypeIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'deposit': return <ArrowDownLeft className="w-4 h-4 text-emerald-400" />;
      case 'withdrawal': return <ArrowUpRight className="w-4 h-4 text-rose-400" />;
      case 'verification': return <FileText className="w-4 h-4 text-purple-400" />;
      case 'support': return <MessageCircle className="w-4 h-4 text-blue-400" />;
    }
  };

  const handleItemClick = (item: ActivityItem) => {
    if (item.type === 'support') {
      onOpenSupport();
    }
    onMarkAsRead(item.id);
  };

  const unreadCount = items.filter(i => !i.read).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full sm:max-w-md bg-[#0F1420] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl p-5 flex flex-col gap-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <span className="text-base font-bold text-white">Активность</span>
            {unreadCount > 0 && (
              <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full font-bold">
                {unreadCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white bg-white/[0.05]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="py-12 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-white/[0.04] flex items-center justify-center mb-3">
              <CheckCircle2 className="w-8 h-8 text-slate-500" />
            </div>
            <span className="text-sm font-semibold text-white">Нет активных операций</span>
            <span className="text-xs text-slate-400 mt-1">Все операции завершены</span>
          </div>
        ) : (
          <div className="space-y-2.5">
            {items.map((item) => (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  !item.read
                    ? 'bg-blue-600/[0.08] border-blue-500/40'
                    : 'bg-white/[0.02] border-white/[0.06]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center shrink-0 mt-0.5">
                    {getTypeIcon(item.type)}
                  </div>

                  <div className="flex-1 flex flex-col">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{item.title}</span>
                      <span className="text-[10px] text-slate-500">{item.time}</span>
                    </div>
                    <span className="text-xs text-slate-400 mt-1 leading-relaxed">
                      {item.message}
                    </span>
                    <div className="mt-2 flex items-center gap-2">
                      {getStatusIcon(item.status)}
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${getStatusColor(item.status)}`}>
                        {getStatusText(item.status)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
