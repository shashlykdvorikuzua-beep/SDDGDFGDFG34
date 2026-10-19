import React, { useEffect, useState } from 'react';
import { Search, Eye } from 'lucide-react';
import { api, fmtUsd, fmtNum, fmtDate } from '../api';
import { Card, SectionTitle, Badge, Button, Table, Td, Spinner, Empty, Modal, inputCls, useToast } from '../ui';
import type { UserProfile, UserDetail, Role } from '../types';

const statusTone: Record<string, any> = { active: 'green', restricted: 'amber', blocked: 'red', pending: 'blue' };
const kycTone: Record<string, any> = { verified: 'green', pending: 'amber', rejected: 'red', none: 'neutral' };
const kycLabel: Record<string, string> = { verified: 'Верифицирован', pending: 'На проверке', rejected: 'Отклонён', none: 'Нет KYC' };

export const UsersScreen: React.FC<{ role: Role }> = ({ role }) => {
  const [users, setUsers] = useState<UserProfile[] | null>(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [selected, setSelected] = useState<string | null>(null);
  const toast = useToast();

  const load = () => api.get<{ users: UserProfile[] }>('/users').then((r) => setUsers(r.users)).catch((e) => toast.show(e.message, 'red'));
  useEffect(() => { load(); }, []);

  if (!users) return <Spinner />;

  const filtered = users.filter((u) => {
    const matchQ = !q || [u.email, u.phone, u.address, u.id].join(' ').toLowerCase().includes(q.toLowerCase());
    const matchS = status === 'all' || u.status === status;
    return matchQ && matchS;
  });

  return (
    <div>
      <SectionTitle title="Пользователи / Аккаунты" subtitle="Поиск, профили и управление ограничениями" />
      <Card className="p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input className={`${inputCls} pl-9`} placeholder="Поиск по ID, email, телефону, адресу…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className={`${inputCls} sm:w-52`} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">Все статусы</option>
            <option value="active">Активные</option>
            <option value="restricted">Ограниченные</option>
            <option value="blocked">Заблокированные</option>
            <option value="pending">Новые</option>
          </select>
        </div>
      </Card>

      {filtered.length === 0 ? <Empty text="Пользователи не найдены" /> : (
        <Table columns={['Пользователь', 'Статус', 'KYC', 'Активы', 'Баланс', 'Откр. заявки', 'Последняя активность', '']}>
          {filtered.map((u) => (
            <tr key={u.id} className="hover:bg-slate-50">
              <Td>
                <div className="font-semibold text-slate-800">{u.email}</div>
                <div className="text-xs font-mono text-slate-400">{u.address}</div>
              </Td>
              <Td><Badge tone={statusTone[u.status]}>{u.status}</Badge></Td>
              <Td><Badge tone={kycTone[u.kycStatus]}>{kycLabel[u.kycStatus]}</Badge></Td>
              <Td className="text-slate-600">{u.assetCount}</Td>
              <Td className="font-semibold text-slate-800">{fmtUsd(u.balanceUsd)}</Td>
              <Td className={u.openWithdrawals > 0 ? 'text-amber-600 font-semibold' : 'text-slate-400'}>{u.openWithdrawals}</Td>
              <Td className="text-xs text-slate-500">{fmtDate(u.lastActiveAt)}</Td>
              <Td><Button size="sm" variant="outline" onClick={() => setSelected(u.id)}><Eye className="w-3.5 h-3.5" /> Открыть</Button></Td>
            </tr>
          ))}
        </Table>
      )}

      {selected && <UserDetailModal id={selected} role={role} onClose={() => setSelected(null)} onChanged={load} toast={toast.show} />}
      {toast.node}
    </div>
  );
};

const UserDetailModal: React.FC<{ id: string; role: Role; onClose: () => void; onChanged: () => void; toast: (t: string, tone?: 'green' | 'red') => void }> = ({ id, role, onClose, onChanged, toast }) => {
  const [tab, setTab] = useState('overview');
  const [d, setD] = useState<UserDetail | null>(null);
  const canWrite = role === 'super_admin' || role === 'risk_compliance';

  const load = () => api.get<UserDetail>(`/users/${id}`).then(setD).catch((e) => toast(e.message, 'red'));
  useEffect(() => { load(); }, [id]);

  if (!d) return <Modal open onClose={onClose} title="Профиль" wide><Spinner /></Modal>;

  const tabs = ['overview', 'assets', 'journal', 'restrictions', 'support'];
  const tabLabels: Record<string, string> = { overview: 'Обзор', assets: 'Активы', journal: 'Журнал', restrictions: 'Ограничения', support: 'Поддержка' };

  const update = async (patch: any) => {
    try { await api.patch(`/users/${id}`, patch); toast('Профиль обновлён'); load(); onChanged(); }
    catch (e: any) { toast(e.message, 'red'); }
  };

  return (
    <Modal open onClose={onClose} title={`Профиль · ${d.profile.email}`} wide>
      <div className="flex gap-2 flex-wrap border-b border-slate-100 pb-3 mb-4">
        {tabs.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${tab === t ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{tabLabels[t]}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Info label="Статус" value={<Badge tone={statusTone[d.profile.status]}>{d.profile.status}</Badge>} />
            <Info label="KYC" value={<Badge tone={kycTone[d.profile.kycStatus]}>{kycLabel[d.profile.kycStatus]}</Badge>} />
            <Info label="Баланс (доступно)" value={fmtUsd(d.balanceUsd - d.reservedUsd)} />
            <Info label="Зарезервировано" value={fmtUsd(d.reservedUsd)} />
            <Info label="Регистрация" value={fmtDate(d.profile.createdAt)} />
            <Info label="EVM адрес" value={<span className="font-mono text-xs">{d.wallet.address}</span>} />
          </div>
          {canWrite && (
            <div className="pt-2 border-t border-slate-100 grid sm:grid-cols-2 gap-3">
              <label className="block"><span className="text-xs font-semibold text-slate-600">Email</span>
                <input className={inputCls} defaultValue={d.profile.email} onBlur={(e) => e.target.value !== d.profile.email && update({ email: e.target.value })} /></label>
              <label className="block"><span className="text-xs font-semibold text-slate-600">Телефон</span>
                <input className={inputCls} defaultValue={d.profile.phone} onBlur={(e) => e.target.value !== d.profile.phone && update({ phone: e.target.value })} /></label>
              <label className="block"><span className="text-xs font-semibold text-slate-600">Статус</span>
                <select className={inputCls} value={d.profile.status} onChange={(e) => update({ status: e.target.value })}>
                  {['active', 'pending', 'restricted', 'blocked'].map((s) => <option key={s} value={s}>{s}</option>)}
                </select></label>
              <label className="block"><span className="text-xs font-semibold text-slate-600">KYC</span>
                <select className={inputCls} value={d.profile.kycStatus} onChange={(e) => update({ kycStatus: e.target.value })}>
                  {['none', 'pending', 'verified', 'rejected'].map((s) => <option key={s} value={s}>{kycLabel[s]}</option>)}
                </select></label>
            </div>
          )}
          <p className="text-[11px] text-slate-400">Корректировка баланса выполняется только через раздел «Пополнения» отдельной проводкой с основанием. Прямое редактирование баланса недоступно.</p>
        </div>
      )}

      {tab === 'assets' && (
        <Table columns={['Актив', 'Баланс', 'Резерв', 'Доступно', 'Цена', 'Стоимость']}>
          {d.assets.map((a) => (
            <tr key={a.symbol}>
              <Td className="font-semibold">{a.symbol}</Td>
              <Td>{fmtNum(a.amount)}</Td>
              <Td className="text-amber-600">{fmtNum(a.reserved)}</Td>
              <Td className="text-emerald-700">{fmtNum(a.available)}</Td>
              <Td>{fmtUsd(a.price)}</Td>
              <Td className="font-semibold">{fmtUsd(a.valueUsd)}</Td>
            </tr>
          ))}
        </Table>
      )}

      {tab === 'journal' && (d.journal.length === 0 ? <Empty text="Проводок нет" /> : (
        <Table columns={['Дата', 'Тип', 'Актив', 'Сумма', 'Автор', 'Основание', 'Статус']}>
          {d.journal.map((j) => (
            <tr key={j.id}>
              <Td className="text-xs">{fmtDate(j.createdAt)}</Td>
              <Td><Badge tone="purple">{j.type}</Badge></Td>
              <Td className="font-semibold">{j.asset}</Td>
              <Td>{fmtNum(j.amount)}</Td>
              <Td className="text-slate-500">{j.author}</Td>
              <Td className="text-xs text-slate-500 max-w-[180px] truncate">{j.reason || '—'}</Td>
              <Td>{j.approved ? <Badge tone="green">Проведено</Badge> : <Badge tone="amber">Ожидает 2-го подтв.</Badge>}</Td>
            </tr>
          ))}
        </Table>
      ))}

      {tab === 'restrictions' && (d.restrictions.length === 0 ? <Empty text="Активных ограничений нет" /> : (
        <div className="space-y-2">
          {d.restrictions.map((r) => (
            <Card key={r.id} className="p-3 flex items-center justify-between">
              <div><Badge tone="amber">{r.scope}</Badge><div className="text-sm text-slate-700 mt-1">{r.reason}</div></div>
              <div className="text-xs text-slate-400">{r.author} · {fmtDate(r.startedAt)}</div>
            </Card>
          ))}
        </div>
      ))}

      {tab === 'support' && (d.chats.length === 0 ? <Empty text="Обращений нет" /> : (
        <div className="space-y-2">
          {d.chats.map((c) => <Card key={c.id} className="p-3 flex justify-between"><span className="text-sm font-medium">{c.subject}</span><Badge tone={c.status === 'open' ? 'blue' : 'neutral'}>{c.status}</Badge></Card>)}
        </div>
      ))}
    </Modal>
  );
};

const Info: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="bg-slate-50 rounded-xl px-3 py-2">
    <div className="text-[11px] text-slate-500 uppercase tracking-wide">{label}</div>
    <div className="text-sm font-semibold text-slate-800 mt-0.5">{value}</div>
  </div>
);
