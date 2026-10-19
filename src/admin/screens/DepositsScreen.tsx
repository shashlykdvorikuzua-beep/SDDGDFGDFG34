import React, { useEffect, useState } from 'react';
import { Plus, ShieldCheck } from 'lucide-react';
import { api, fmtUsd, fmtNum, fmtDate } from '../api';
import { Card, SectionTitle, Badge, Button, Table, Td, Spinner, Empty, Modal, Field, inputCls, useToast } from '../ui';
import type { JournalEntry, UserProfile, Role } from '../types';

const can = (role: Role, perm: string) => {
  const map: Record<string, Role[]> = { write: ['super_admin', 'finance_ops'] };
  return role === 'super_admin' || (map[perm] || []).includes(role);
};

const TYPES = [
  { v: 'deposit', l: 'Подтверждённый депозит / перевод' },
  { v: 'bonus', l: 'Бонус' },
  { v: 'reward', l: 'Вознаграждение' },
  { v: 'fee_refund', l: 'Возврат комиссии' },
  { v: 'compensation', l: 'Компенсация' },
  { v: 'correction', l: 'Исправление' },
  { v: 'other', l: 'Другое' },
];

export const DepositsScreen: React.FC<{ role: Role }> = ({ role }) => {
  const [rows, setRows] = useState<JournalEntry[] | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [open, setOpen] = useState(false);
  const toast = useToast();
  const writable = can(role, 'write');

  const load = () => {
    api.get<{ journal: JournalEntry[] }>('/journal').then((r) => setRows(r.journal)).catch((e) => toast.show(e.message, 'red'));
    api.get<{ users: UserProfile[] }>('/users').then((r) => setUsers(r.users)).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  if (!rows) return <Spinner />;

  const approve = async (id: string) => {
    try { await api.post(`/journal/${id}/approve`); toast.show('Начисление подтверждено и проведено'); load(); }
    catch (e: any) { toast.show(e.message, 'red'); }
  };

  return (
    <div>
      <SectionTitle title="Пополнения и ручные зачисления" subtitle="Все зачисления — проводки с основанием; крупные требуют второго подтверждения"
        action={writable && <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4" /> Ручное зачисление</Button>} />

      {rows.length === 0 ? <Empty text="Проводок зачислений пока нет" /> : (
        <Table columns={['Дата', 'Пользователь', 'Тип', 'Источник', 'Актив', 'Сумма', '≈USD', 'Основание', 'Автор', 'Статус']}>
          {rows.map((j) => (
            <tr key={j.id} className="hover:bg-slate-50">
              <Td className="text-xs whitespace-nowrap">{fmtDate(j.createdAt)}</Td>
              <Td className="font-mono text-xs">{j.userId}</Td>
              <Td><Badge tone="purple">{TYPES.find((t) => t.v === j.type)?.l || j.type}</Badge></Td>
              <Td>{j.source === 'onchain' ? <Badge tone="blue">on-chain</Badge> : <Badge>manual</Badge>}</Td>
              <Td className="font-semibold">{j.asset}</Td>
              <Td>{fmtNum(j.amount)}</Td>
              <Td className="text-slate-500">{fmtUsd(j.amountUsd)}</Td>
              <Td className="text-xs text-slate-500 max-w-[200px]"><div className="truncate">{j.reason || '—'}</div>{j.txHash && <div className="font-mono text-[10px] text-slate-400 truncate">tx {j.txHash}</div>}{j.reference && <div className="text-[10px] text-slate-400">ref {j.reference}</div>}</Td>
              <Td className="text-slate-500 text-xs">{j.author}</Td>
              <Td>
                {j.approved
                  ? <Badge tone="green">Проведено</Badge>
                  : writable
                    ? <Button size="sm" onClick={() => approve(j.id)}><ShieldCheck className="w-3.5 h-3.5" /> Подтвердить</Button>
                    : <Badge tone="amber">Ожидает 2-го подтв.</Badge>}
              </Td>
            </tr>
          ))}
        </Table>
      )}

      {open && <CreditModal users={users} onClose={() => setOpen(false)} onDone={() => { setOpen(false); load(); toast.show('Проводка создана'); }} toast={toast.show} />}
      {toast.node}
    </div>
  );
};

const CreditModal: React.FC<{ users: UserProfile[]; onClose: () => void; onDone: () => void; toast: (t: string, tone?: 'green' | 'red') => void }> = ({ users, onClose, onDone, toast }) => {
  const [userId, setUserId] = useState('');
  const [asset, setAsset] = useState('USDT');
  const [network, setNetwork] = useState('ERC20');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('deposit');
  const [source, setSource] = useState<'manual' | 'onchain'>('manual');
  const [txHash, setTxHash] = useState('');
  const [reference, setReference] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      // For USDT, use composite key like USDT-ERC20, USDT-TRC20, etc.
      const assetKey = asset.toUpperCase() === 'USDT' ? `USDT-${network}` : asset.toUpperCase();
      await api.post('/credit', { userId, asset: assetKey, amount: Number(amount), type, source, txHash: txHash || undefined, reference: reference || undefined, reason });
      onDone();
    } catch (err: any) { toast(err.message, 'red'); }
    finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} title="Новое ручное зачисление">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Пользователь"><select className={inputCls} value={userId} onChange={(e) => setUserId(e.target.value)} required>
          <option value="">— выберите —</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.email} ({u.address})</option>)}
        </select></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Актив"><input className={inputCls} value={asset} onChange={(e) => setAsset(e.target.value)} required /></Field>
          <Field label="Сумма"><input className={inputCls} type="number" step="any" min="0.000001" value={amount} onChange={(e) => setAmount(e.target.value)} required /></Field>
        </div>
        {asset.toUpperCase() === 'USDT' && (
          <Field label="Сеть USDT">
            <select className={inputCls} value={network} onChange={(e) => setNetwork(e.target.value)}>
              <option value="ERC20">Ethereum (ERC20)</option>
              <option value="TRC20">TRON (TRC20)</option>
              <option value="BEP20">BNB Smart Chain (BEP20)</option>
            </select>
          </Field>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Тип операции"><select className={inputCls} value={type} onChange={(e) => setType(e.target.value)}>{TYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}</select></Field>
          <Field label="Источник"><select className={inputCls} value={source} onChange={(e) => setSource(e.target.value as any)}><option value="manual">Ручное начисление</option><option value="onchain">On-chain перевод</option></select></Field>
        </div>
        {source === 'onchain' && <Field label="TX hash" hint="Обязателен для on-chain перевода"><input className={inputCls} value={txHash} onChange={(e) => setTxHash(e.target.value)} required /></Field>}
        {(type === 'fee_refund' || type === 'correction') && <Field label="Ссылка на основание" hint="ID исходной операции/записи"><input className={inputCls} value={reference} onChange={(e) => setReference(e.target.value)} required /></Field>}
        <Field label="Комментарий / основание"><textarea className={inputCls} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
        <div className="flex items-center gap-2 text-[11px] text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
          Начисления ≥ $5 000 требуют подтверждения вторым оператором и фиксируются в неизменяемом аудит-журнале.
        </div>
        <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={onClose}>Отмена</Button><Button type="submit" disabled={busy}>{busy ? 'Сохранение…' : 'Создать проводку'}</Button></div>
      </form>
    </Modal>
  );
};
