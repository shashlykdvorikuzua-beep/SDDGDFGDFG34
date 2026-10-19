import React, { useEffect, useState } from 'react';
import { ShieldAlert, Unlock, Plus } from 'lucide-react';
import { api, fmtDate } from '../api';
import { SectionTitle, Badge, Button, Table, Td, Spinner, Empty, Modal, Field, inputCls, useToast } from '../ui';
import type { Restriction, UserProfile, Role } from '../types';

const can = (role: Role) => role === 'super_admin' || role === 'risk_compliance';

const SCOPES: Record<string, string> = {
  deposit: 'Пополнение', withdrawal: 'Вывод', staking: 'Стейкинг',
  staking_pro: 'Стейкинг Pro', swap: 'Обмен', login: 'Вход', review: 'На проверке',
};

export const RestrictionsScreen: React.FC<{ role: Role }> = ({ role }) => {
  const [rows, setRows] = useState<Restriction[] | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [open, setOpen] = useState(false);
  const toast = useToast();
  const writable = can(role);

  const load = () => {
    api.get<{ restrictions: Restriction[] }>('/restrictions').then((r) => setRows(r.restrictions)).catch((e) => toast.show(e.message, 'red'));
    api.get<{ users: UserProfile[] }>('/users').then((r) => setUsers(r.users)).catch(() => {});
  };
  useEffect(() => { load(); }, []);
  if (!rows) return <Spinner />;

  const release = async (id: string) => {
    const reason = window.prompt('Причина снятия ограничения (фиксируется в аудите):');
    if (!reason) return;
    try { await api.post(`/restrictions/${id}/release`, { reason }); toast.show('Ограничение снято'); load(); }
    catch (e: any) { toast.show(e.message, 'red'); }
  };

  const active = rows.filter((r) => r.active);
  const history = rows.filter((r) => !r.active);

  return (
    <div>
      <SectionTitle title="Блокировки и ограничения" subtitle="Ограничения по операциям. Видны клиенту через clientMessage. Снятие требует причины."
        action={writable && <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4" /> Новое ограничение</Button>} />

      <SectionTitle title={`Активные (${active.length})`} />
      {active.length === 0 ? <Empty text="Активных ограничений нет" /> : (
        <Table columns={['Пользователь', 'Область', 'Причина', 'Клиенту видно', 'Начало', 'До', 'Автор', '']}>
          {active.map((r) => (
            <tr key={r.id} className="hover:bg-slate-50">
              <Td className="font-mono text-xs">{r.userId}</Td>
              <Td><Badge tone="red"><ShieldAlert className="w-3 h-3 inline mr-1" />{SCOPES[r.scope] || r.scope}</Badge></Td>
              <Td className="text-xs max-w-[180px]">{r.reason}</Td>
              <Td className="text-xs text-slate-500 max-w-[200px]">{r.clientMessage}</Td>
              <Td className="text-xs whitespace-nowrap">{fmtDate(r.startedAt)}</Td>
              <Td className="text-xs">{r.endsAt ? fmtDate(r.endsAt) : 'бессрочно'}</Td>
              <Td className="text-xs text-slate-500">{r.author}</Td>
              <Td>{writable && <Button size="sm" variant="outline" onClick={() => release(r.id)}><Unlock className="w-3.5 h-3.5" /> Снять</Button>}</Td>
            </tr>
          ))}
        </Table>
      )}

      <div className="mt-8">
        <SectionTitle title={`История (${history.length})`} />
        {history.length === 0 ? <Empty text="Истории нет" /> : (
          <Table columns={['Пользователь', 'Область', 'Причина', 'Начало', 'Снято', 'Кем']}>
            {history.map((r: any) => (
              <tr key={r.id} className="text-slate-500">
                <Td className="font-mono text-xs">{r.userId}</Td>
                <Td className="text-xs">{SCOPES[r.scope] || r.scope}</Td>
                <Td className="text-xs max-w-[200px]">{r.reason}</Td>
                <Td className="text-xs whitespace-nowrap">{fmtDate(r.startedAt)}</Td>
                <Td className="text-xs">{fmtDate(r.releasedAt)}</Td>
                <Td className="text-xs">{r.releasedBy}</Td>
              </tr>
            ))}
          </Table>
        )}
      </div>

      {open && <AddRestrictionModal users={users} onClose={() => setOpen(false)} onDone={() => { setOpen(false); load(); toast.show('Ограничение установлено'); }} toast={toast.show} />}
      {toast.node}
    </div>
  );
};

const AddRestrictionModal: React.FC<{ users: UserProfile[]; onClose: () => void; onDone: () => void; toast: (t: string, tone?: 'green' | 'red') => void }> = ({ users, onClose, onDone, toast }) => {
  const [f, setF] = useState({ userId: '', scope: 'withdrawal', reason: '', clientMessage: 'Операция временно недоступна. Обратитесь в поддержку.' });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await api.post('/restrictions', f); onDone(); } catch (err: any) { toast(err.message, 'red'); }
  };
  return (
    <Modal open onClose={onClose} title="Новое ограничение">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Пользователь"><select className={inputCls} value={f.userId} onChange={(e) => setF({ ...f, userId: e.target.value })} required>
          <option value="">— выберите —</option>{users.map((u) => <option key={u.id} value={u.id}>{u.email} ({u.address})</option>)}
        </select></Field>
        <Field label="Область ограничения"><select className={inputCls} value={f.scope} onChange={(e) => setF({ ...f, scope: e.target.value })}>
          {Object.entries(SCOPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select></Field>
        <Field label="Внутренняя причина (аудит)"><textarea className={inputCls} rows={2} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} required /></Field>
        <Field label="Сообщение клиенту" hint="Что увидит пользователь в кошельке"><textarea className={inputCls} rows={2} value={f.clientMessage} onChange={(e) => setF({ ...f, clientMessage: e.target.value })} /></Field>
        <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={onClose}>Отмена</Button><Button type="submit">Установить</Button></div>
      </form>
    </Modal>
  );
};
