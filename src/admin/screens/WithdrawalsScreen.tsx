import React, { useEffect, useState } from 'react';
import { api, fmtUsd, fmtNum, fmtDate } from '../api';
import { Card, SectionTitle, Badge, Button, Table, Td, Spinner, Empty, Modal, Field, inputCls, useToast } from '../ui';
import type { Withdrawal, WithdrawalStatus, UserProfile, Role } from '../types';

const can = (role: Role, perm: string) => {
  const map: Record<string, Role[]> = { write: ['super_admin', 'finance_ops'] };
  return role === 'super_admin' || (map[perm] || []).includes(role);
};

const STATUS: Record<WithdrawalStatus, { label: string; tone: any }> = {
  new: { label: 'Новая', tone: 'blue' },
  review: { label: 'На проверке', tone: 'amber' },
  awaiting_send: { label: 'Ожидает отправки', tone: 'amber' },
  sent: { label: 'Отправлена', tone: 'purple' },
  awaiting_confirm: { label: 'Ожидает подтверждений', tone: 'purple' },
  completed: { label: 'Завершена', tone: 'green' },
  rejected: { label: 'Отклонена', tone: 'red' },
  error: { label: 'Ошибка', tone: 'red' },
};

// Allowed next transitions per ТЗ workflow.
const NEXT: Record<WithdrawalStatus, WithdrawalStatus[]> = {
  new: ['review', 'rejected'],
  review: ['awaiting_send', 'rejected'],
  awaiting_send: ['sent', 'rejected'],
  sent: ['awaiting_confirm', 'error'],
  awaiting_confirm: ['completed', 'error'],
  completed: [], rejected: [], error: ['awaiting_send'],
};

export const WithdrawalsScreen: React.FC<{ role: Role }> = ({ role }) => {
  const [rows, setRows] = useState<Withdrawal[] | null>(null);
  const [filter, setFilter] = useState<'open' | 'all'>('open');
  const [active, setActive] = useState<Withdrawal | null>(null);
  const toast = useToast();

  const load = () => api.get<{ withdrawals: Withdrawal[] }>('/withdrawals').then((r) => setRows(r.withdrawals)).catch((e) => toast.show(e.message, 'red'));
  useEffect(() => { load(); }, []);

  if (!rows) return <Spinner />;
  const openStatuses = ['new', 'review', 'awaiting_send', 'sent', 'awaiting_confirm'];
  const data = filter === 'open' ? rows.filter((w) => openStatuses.includes(w.status)) : rows;

  return (
    <div>
      <SectionTitle title="Вывод средств" subtitle="Обработка заявок: резерв → проверка → реальная отправка → подтверждения"
        action={<div className="flex gap-2"><Button size="sm" variant={filter === 'open' ? 'primary' : 'outline'} onClick={() => setFilter('open')}>В обработке</Button><Button size="sm" variant={filter === 'all' ? 'primary' : 'outline'} onClick={() => setFilter('all')}>Все</Button></div>} />

      {data.length === 0 ? <Empty text="Заявок на вывод нет. Новые заявки клиентов появятся здесь автоматически." /> : (
        <Table columns={['ID', 'Дата', 'Актив', 'Сеть', 'Сумма', 'Комиссия', 'Адрес получателя', 'TX hash', 'Статус', '']}>
          {data.map((w) => (
            <tr key={w.id} className="hover:bg-slate-50">
              <Td className="font-mono text-xs">{w.id.slice(-8)}</Td>
              <Td className="text-xs whitespace-nowrap">{fmtDate(w.createdAt)}</Td>
              <Td className="font-semibold">{w.asset}</Td>
              <Td className="text-xs text-slate-500">{w.network}</Td>
              <Td>{fmtNum(w.amount)}</Td>
              <Td className="text-slate-500">{fmtNum(w.fee)}</Td>
              <Td className="font-mono text-xs max-w-[160px] truncate">{w.toAddress}</Td>
              <Td className="font-mono text-xs max-w-[120px]">{w.txHash ? <a className="text-violet-600 hover:underline" href="#" onClick={(e) => e.preventDefault()} title="Ссылка на обозреватель сети">{w.txHash.slice(0, 10)}…</a> : <span className="text-slate-300">—</span>}</Td>
              <Td><Badge tone={STATUS[w.status].tone}>{STATUS[w.status].label}</Badge></Td>
              <Td><Button size="sm" variant="outline" onClick={() => setActive(w)}>Открыть</Button></Td>
            </tr>
          ))}
        </Table>
      )}

      {active && <WithdrawModal wd={active} role={role} onClose={() => setActive(null)} onDone={() => { setActive(null); load(); toast.show('Заявка обновлена'); }} toast={toast.show} />}
      {toast.node}
    </div>
  );
};

const WithdrawModal: React.FC<{ wd: Withdrawal; role: Role; onClose: () => void; onDone: () => void; toast: (t: string, tone?: 'green' | 'red') => void }> = ({ wd, role, onClose, onDone, toast }) => {
  const [status, setStatus] = useState<WithdrawalStatus>(wd.status);
  const [txHash, setTxHash] = useState(wd.txHash || '');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const writable = can(role, 'write');

  const save = async () => {
    setBusy(true);
    try {
      await api.patch(`/withdrawals/${wd.id}/status`, { status, txHash: txHash || undefined, reason: reason || undefined });
      onDone();
    } catch (e: any) { toast(e.message, 'red'); }
    finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} title={`Заявка ${wd.id.slice(-8)}`}>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Info label="Актив / сумма" value={`${fmtNum(wd.amount)} ${wd.asset}`} />
        <Info label="Сеть" value={wd.network} />
        <Info label="Комиссия" value={fmtNum(wd.fee)} />
        <Info label="Статус" value={<Badge tone={STATUS[wd.status].tone}>{STATUS[wd.status].label}</Badge>} />
        <div className="col-span-2"><Info label="Адрес получателя" value={<span className="font-mono text-xs">{wd.toAddress}{wd.memo ? ` · memo ${wd.memo}` : ''}</span>} /></div>
      </div>

      {!writable ? <p className="text-sm text-slate-500">У вашей роли нет прав на обработку выводов (только просмотр).</p> : (
        <div className="space-y-3 border-t border-slate-100 pt-4">
          <Field label="Новый статус">
            <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value as WithdrawalStatus)}>
              <option value={wd.status}>{STATUS[wd.status].label} (без изменения)</option>
              {NEXT[wd.status].map((s) => <option key={s} value={s}>{STATUS[s].label}</option>)}
            </select>
          </Field>
          {['sent', 'awaiting_confirm', 'completed'].includes(status) && (
            <Field label="TX hash реальной транзакции" hint="Статус «Отправлена/Завершена» невозможен без hash. Hash становится виден клиенту только после отправки.">
              <input className={inputCls} value={txHash} onChange={(e) => setTxHash(e.target.value)} placeholder="0x… (импорт из провайдера/кошелька)" />
            </Field>
          )}
          {status === 'rejected' && (
            <Field label="Причина отказа" hint="Резерв будет разблокирован компенсирующей проводкой"><input className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
          )}
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={onClose}>Отмена</Button><Button onClick={save} disabled={busy}>{busy ? 'Сохранение…' : 'Применить'}</Button></div>
        </div>
      )}
    </Modal>
  );
};

const Info: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="bg-slate-50 rounded-xl px-3 py-2"><div className="text-[11px] text-slate-500 uppercase">{label}</div><div className="text-sm font-semibold text-slate-800 mt-0.5">{value}</div></div>
);
