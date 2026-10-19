import React, { useEffect, useState } from 'react';
import { Plus, Link2, Send } from 'lucide-react';
import { api, fmtDate } from '../api';
import { SectionTitle, Badge, Button, Table, Td, Spinner, Empty, Modal, Field, inputCls, useToast } from '../ui';
import type { AddressPoolSet, UserProfile, Role } from '../types';

const can = (role: Role) => role === 'super_admin' || role === 'finance_ops';

const ST: Record<string, { label: string; tone: any }> = {
  free: { label: 'Свободен', tone: 'green' }, reserved: { label: 'Зарезервирован', tone: 'amber' },
  assigned: { label: 'Назначен', tone: 'purple' }, disabled: { label: 'Отключён', tone: 'neutral' },
  needs_review: { label: 'Требует проверки', tone: 'red' },
};

export const AddressPoolScreen: React.FC<{ role: Role }> = ({ role }) => {
  const [pool, setPool] = useState<AddressPoolSet[] | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [open, setOpen] = useState(false);
  const [assign, setAssign] = useState<AddressPoolSet | null>(null);
  const [issue, setIssue] = useState(false);
  const toast = useToast();
  const writable = can(role);

  const load = () => {
    api.get<{ pool: AddressPoolSet[] }>('/address-pool').then((r) => setPool(r.pool)).catch((e) => toast.show(e.message, 'red'));
    api.get<{ users: UserProfile[] }>('/users').then((r) => setUsers(r.users)).catch(() => {});
  };
  useEffect(() => { load(); }, []);
  if (!pool) return <Spinner />;

  const freeCount = pool.filter((s) => s.status === 'free').length;

  return (
    <div>
      <SectionTitle title="Пул свободных аккаунтов и адресов" subtitle={`${freeCount} свободных наборов. Секретные ключи не хранятся в админке — только custody-провайдер.`}
        action={writable && <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIssue(true)}><Send className="w-4 h-4" /> Выдать кошелёк</Button>
          <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4" /> Добавить набор</Button>
        </div>} />

      <Table columns={['ID', 'Активы', 'Сеть', 'Публичный адрес', 'Custody', 'Статус', 'Назначен', 'Создан', '']}>
        {pool.map((s) => (
          <tr key={s.id} className="hover:bg-slate-50">
            <Td className="font-mono text-xs">{s.id}</Td>
            <Td className="font-semibold">{s.assets.join(', ')}</Td>
            <Td className="text-xs text-slate-500">{s.network}</Td>
            <Td className="font-mono text-xs max-w-[180px] truncate">{s.publicAddress}</Td>
            <Td className="text-xs text-slate-500">{s.custodyProvider}</Td>
            <Td><Badge tone={ST[s.status].tone}>{ST[s.status].label}</Badge></Td>
            <Td className="text-xs font-mono text-slate-500">{s.assignedTo || '—'}</Td>
            <Td className="text-xs text-slate-400">{fmtDate(s.createdAt)}</Td>
            <Td>{writable && s.status === 'free' && <Button size="sm" variant="outline" onClick={() => setAssign(s)}><Link2 className="w-3.5 h-3.5" /> Назначить</Button>}</Td>
          </tr>
        ))}
      </Table>

      {open && <AddPoolModal onClose={() => setOpen(false)} onDone={() => { setOpen(false); load(); toast.show('Набор добавлен'); }} toast={toast.show} />}
      {assign && <AssignModal set={assign} users={users} onClose={() => setAssign(null)} onDone={() => { setAssign(null); load(); toast.show('Набор назначен'); }} toast={toast.show} />}
      {issue && <IssueWalletModal pool={pool} onClose={() => setIssue(false)} onDone={() => { setIssue(false); load(); }} toast={toast.show} />}
      {toast.node}
    </div>
  );
};

const AddPoolModal: React.FC<{ onClose: () => void; onDone: () => void; toast: (t: string, tone?: 'green' | 'red') => void }> = ({ onClose, onDone, toast }) => {
  const [f, setF] = useState({ assets: '', network: 'TRON (TRC-20)', publicAddress: '', custodyProvider: 'Fireblocks MPC', memo: '', note: '' });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await api.post('/address-pool', { ...f, assets: f.assets.split(',').map((x) => x.trim()).filter(Boolean) }); onDone(); }
    catch (err: any) { toast(err.message, 'red'); }
  };
  return (
    <Modal open onClose={onClose} title="Новый набор адресов">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Активы (через запятую)"><input className={inputCls} value={f.assets} onChange={(e) => setF({ ...f, assets: e.target.value })} placeholder="USDT, USDC" required /></Field>
        <Field label="Сеть"><input className={inputCls} value={f.network} onChange={(e) => setF({ ...f, network: e.target.value })} required /></Field>
        <Field label="Публичный адрес" hint="Формат и дубликаты проверяются сервером перед сохранением"><input className={inputCls} value={f.publicAddress} onChange={(e) => setF({ ...f, publicAddress: e.target.value })} required /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Custody-провайдер"><input className={inputCls} value={f.custodyProvider} onChange={(e) => setF({ ...f, custodyProvider: e.target.value })} /></Field>
          <Field label="Memo / Tag"><input className={inputCls} value={f.memo} onChange={(e) => setF({ ...f, memo: e.target.value })} /></Field>
        </div>
        <Field label="Заметка"><input className={inputCls} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
        <div className="text-[11px] text-slate-400">Приватные ключи и seed phrase не вводятся и не хранятся в админ-панели.</div>
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Отмена</Button><Button type="submit">Сохранить</Button></div>
      </form>
    </Modal>
  );
};

const AssignModal: React.FC<{ set: AddressPoolSet; users: UserProfile[]; onClose: () => void; onDone: () => void; toast: (t: string, tone?: 'green' | 'red') => void }> = ({ set, users, onClose, onDone, toast }) => {
  const [userId, setUserId] = useState('');
  const submit = async () => {
    try { await api.post(`/address-pool/${set.id}/assign`, { userId }); onDone(); }
    catch (e: any) { toast(e.message, 'red'); }
  };
  return (
    <Modal open onClose={onClose} title="Атомарное назначение набора">
      <p className="text-sm text-slate-600 mb-3">Набор <b>{set.id}</b> ({set.assets.join(', ')} · {set.network}) будет закреплён за пользователем и защищён от параллельного назначения.</p>
      <Field label="Пользователь"><select className={inputCls} value={userId} onChange={(e) => setUserId(e.target.value)} required>
        <option value="">— выберите —</option>{users.map((u) => <option key={u.id} value={u.id}>{u.email} ({u.address})</option>)}
      </select></Field>
      <div className="flex justify-end gap-2 pt-4"><Button variant="outline" onClick={onClose}>Отмена</Button><Button onClick={submit} disabled={!userId}>Назначить</Button></div>
    </Modal>
  );
};

const genDemoAddress = () => '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

const IssueWalletModal: React.FC<{ pool: AddressPoolSet[]; onClose: () => void; onDone: () => void; toast: (t: string, tone?: 'green' | 'red') => void }> = ({ pool, onClose, onDone, toast }) => {
  const freeSets = pool.filter((s) => s.status === 'free');
  const [mode, setMode] = useState<'manual' | 'pool'>(freeSets.length ? 'pool' : 'manual');
  const [f, setF] = useState({ name: '', email: '', note: '', address: '', poolSetId: '', tronAddress: '', btcAddress: '', solAddress: '', tonAddress: '' });
  const [result, setResult] = useState<{ address: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const body = mode === 'pool' ? { ...f, poolSetId: f.poolSetId, address: undefined } : f;
      const r = await api.post('/issue-wallet', body);
      setResult({ address: r.wallet.address, name: r.wallet.name });
      onDone();
    } catch (err: any) { toast(err.message, 'red'); }
    finally { setBusy(false); }
  };

  if (result) {
    return (
      <Modal open onClose={onClose} title="Кошелёк выдан">
        <div className="text-center py-2">
          <div className="mx-auto w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl mb-3">✓</div>
          <p className="text-sm text-slate-600 mb-1">Кошелёк <b>{result.name}</b> создан и записан в общий реестр приложения.</p>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 my-3">
            <div className="text-[11px] text-slate-500 uppercase mb-1">Адрес для импорта</div>
            <div className="font-mono text-sm text-slate-800 break-all">{result.address}</div>
          </div>
          <p className="text-[12px] text-slate-500">Пользователь вводит этот адрес в приложении VaultSpring — кошелёк сразу появляется с нулевым балансом. Пополнение выполняется через раздел «Пополнения» (проводкой).</p>
          <div className="flex justify-center gap-2 pt-4">
            <Button variant="outline" onClick={() => navigator.clipboard?.writeText(result.address)}>Скопировать адрес</Button>
            <Button onClick={onClose}>Готово</Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open onClose={onClose} title="Выдать кошелёк пользователю">
      <form onSubmit={submit} className="space-y-3">
        <div className="flex gap-2">
          {freeSets.length > 0 && <Button type="button" size="sm" variant={mode === 'pool' ? 'primary' : 'outline'} onClick={() => setMode('pool')}>Из пула адресов</Button>}
          <Button type="button" size="sm" variant={mode === 'manual' ? 'primary' : 'outline'} onClick={() => setMode('manual')}>Ввести адрес</Button>
        </div>

        {mode === 'pool' ? (
          <Field label="Свободный набор" hint="Адрес берётся из пула и помечается как назначенный">
            <select className={inputCls} value={f.poolSetId} onChange={(e) => setF({ ...f, poolSetId: e.target.value })} required>
              <option value="">— выберите —</option>
              {freeSets.map((s) => <option key={s.id} value={s.id}>{s.assets.join(', ')} · {s.network} · {s.publicAddress.slice(0, 12)}…</option>)}
            </select>
          </Field>
        ) : (
          <Field label="EVM-адрес кошелька" hint="Тот же адрес, который пользователь введёт в приложении">
            <div className="flex gap-2">
              <input className={inputCls} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} placeholder="0x…" required />
              <Button type="button" variant="outline" onClick={() => setF({ ...f, address: genDemoAddress() })}>Демо</Button>
            </div>
          </Field>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Название кошелька"><input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Кошелёк пользователя" /></Field>
          <Field label="Email пользователя"><input className={inputCls} type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="user@mail.com" /></Field>
        </div>

        {mode === 'manual' && (
          <details className="text-sm">
            <summary className="cursor-pointer text-slate-500 select-none mb-2">Дополнительные адреса сетей (необязательно)</summary>
            <div className="grid grid-cols-2 gap-3">
              <Field label="TRON"><input className={inputCls} value={f.tronAddress} onChange={(e) => setF({ ...f, tronAddress: e.target.value })} /></Field>
              <Field label="Bitcoin"><input className={inputCls} value={f.btcAddress} onChange={(e) => setF({ ...f, btcAddress: e.target.value })} /></Field>
              <Field label="Solana"><input className={inputCls} value={f.solAddress} onChange={(e) => setF({ ...f, solAddress: e.target.value })} /></Field>
              <Field label="TON"><input className={inputCls} value={f.tonAddress} onChange={(e) => setF({ ...f, tonAddress: e.target.value })} /></Field>
            </div>
          </details>
        )}

        <Field label="Заметка / основание"><input className={inputCls} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>

        <div className="text-[11px] text-slate-400 bg-slate-50 rounded-lg px-3 py-2">
          Приватные ключи и seed не генерируются и не хранятся в админке. Баланс нового кошелька пуст — средства начисляются только через журнал («Пополнения»). Действие фиксируется в аудите.
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>Отмена</Button>
          <Button type="submit" disabled={busy || (mode === 'pool' ? !f.poolSetId : !f.address)}>{busy ? 'Создание…' : 'Выдать кошелёк'}</Button>
        </div>
      </form>
    </Modal>
  );
};
