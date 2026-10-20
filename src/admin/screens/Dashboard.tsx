import React, { useEffect, useState } from 'react';
import { Users, UserPlus, ShieldAlert, ArrowUpFromLine, ArrowDownToLine, MessageSquare, DollarSign } from 'lucide-react';
import { api, fmtUsd, fmtDate } from '../api';
import { Card, StatCard, SectionTitle, Badge, Spinner, Empty } from '../ui';
import type { DashboardData } from '../types';

export const Dashboard: React.FC<{ onNavigate: (k: string) => void }> = ({ onNavigate }) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { api.get<DashboardData>('/dashboard').then(setData).catch((e) => setErr(e.message)); }, []);

  if (err) return <div className="text-rose-600 text-sm">{err}</div>;
  if (!data) return <Spinner />;

  const quick = [
    { label: 'Найти пользователя', key: 'users', icon: <Users className="w-4 h-4" /> },
    { label: 'Очередь выводов', key: 'withdrawals', icon: <ArrowUpFromLine className="w-4 h-4" /> },
    { label: 'Пул адресов', key: 'pool', icon: <ArrowDownToLine className="w-4 h-4" /> },
    { label: 'Обращения поддержки', key: 'support', icon: <MessageSquare className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      <SectionTitle title="Обзор" subtitle="Ключевые показатели и очереди операций" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Всего пользователей" value={data.cards.totalUsers} hint={`${data.cards.active} активных`} />
        <StatCard label="Новые регистрации" value={data.cards.newRegs} hint="за 7 дней" tone="text-violet-700" />
        <StatCard label="Ограниченные" value={data.cards.restricted} hint="заблокированы/ограничены" tone="text-rose-700" />
        <StatCard label="Под управлением" value={fmtUsd(data.summary.totalUnderManagement)} hint="оценка по активам" tone="text-emerald-700" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <QueueCard onClick={() => onNavigate('withdrawals')} icon={<ArrowUpFromLine className="w-5 h-5" />} tone="violet" label="Заявки на вывод в очереди" value={data.queues.pendingWithdrawals} />
        <QueueCard onClick={() => onNavigate('deposits')} icon={<ArrowDownToLine className="w-5 h-5" />} tone="amber" label="Пополнения на проверке" value={data.queues.pendingDeposits} />
        <QueueCard onClick={() => onNavigate('support')} icon={<MessageSquare className="w-5 h-5" />} tone="blue" label="Открытые обращения" value={data.queues.openChats} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="w-4 h-4 text-slate-400" />
            <h3 className="font-bold text-slate-900">Последние события (аудит)</h3>
          </div>
          {data.recentEvents.length === 0 ? (
            <Empty text="Событий пока нет. Действия операторов появятся здесь." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.recentEvents.map((e) => (
                <li key={e.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-800 truncate">{e.action} · <span className="font-mono text-xs text-slate-500">{e.object}</span></div>
                    <div className="text-xs text-slate-400">{e.actor} ({e.role})</div>
                  </div>
                  <span className="text-xs text-slate-400 whitespace-nowrap">{fmtDate(e.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><UserPlus className="w-4 h-4 text-slate-400" />Быстрые действия</h3>
          <div className="space-y-2">
            {quick.map((q) => (
              <button key={q.key} onClick={() => onNavigate(q.key)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-200 hover:border-violet-300 hover:bg-violet-50 text-sm font-medium text-slate-700 transition-colors">
                <span className="text-violet-600">{q.icon}</span>{q.label}
              </button>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
            <DollarSign className="w-3.5 h-3.5" /> Открытые Trade Pro позиции: {data.summary.openProPositions}
          </div>
        </Card>
      </div>

      {data.integrationErrors.length > 0 && (
        <Card className="p-5 border-rose-200">
          <h3 className="font-bold text-rose-700 mb-3">Ошибки интеграций</h3>
          <div className="space-y-2">
            {data.integrationErrors.map((n) => (
              <div key={n.id} className="flex items-center justify-between text-sm">
                <span className="text-slate-700">{n.title}: <span className="text-slate-500">{n.message}</span></span>
                <Badge tone="red">{fmtDate(n.createdAt)}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

const QueueCard: React.FC<{ onClick: () => void; icon: React.ReactNode; label: string; value: number; tone: string }> = ({ onClick, icon, label, value, tone }) => {
  const tones: Record<string, string> = { violet: 'bg-violet-100 text-violet-700', amber: 'bg-amber-100 text-amber-700', blue: 'bg-sky-100 text-sky-700' };
  return (
    <button onClick={onClick} className="text-left">
      <Card className="p-5 hover:border-violet-300 transition-colors">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${tones[tone]}`}>{icon}</div>
        <div className="text-2xl font-extrabold text-slate-900">{value}</div>
        <div className="text-sm text-slate-500">{label}</div>
      </Card>
    </button>
  );
};
