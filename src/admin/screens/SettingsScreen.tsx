import React, { useEffect, useState } from 'react';
import { UserPlus, ShieldCheck, KeyRound } from 'lucide-react';
import { api, fmtDate } from '../api';
import { SectionTitle, Card, StatCard, Badge, Button, Table, Td, Spinner, Modal, Field, inputCls, useToast } from '../ui';
import { ROLE_LABELS, type AdminAccount, type Role } from '../types';

interface SettingsData {
  adminAccounts: AdminAccount[];
  permissions: Record<string, Role[]>;
  secondApprovalThresholdUsd: number;
  sessionTimeoutMinutes: number;
  unlockPeriodHours: number;
}

const ROLES: Role[] = ['super_admin', 'finance_ops', 'support', 'risk_compliance', 'auditor'];

export const SettingsScreen: React.FC<{ role: Role }> = () => {
  const [data, setData] = useState<SettingsData | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [unlockHours, setUnlockHours] = useState<number | null>(null);
  const [savingUnlock, setSavingUnlock] = useState(false);
  const toast = useToast();

  const load = () => api.get<SettingsData>('/settings').then((d) => { setData(d); setUnlockHours(d.unlockPeriodHours); }).catch((e) => toast.show(e.message, 'red'));
  useEffect(() => { load(); }, []);
  if (!data) return <Spinner />;

  const saveUnlock = async () => {
    if (unlockHours === null || unlockHours < 1 || unlockHours > 720) {
      toast.show('Значение должно быть от 1 до 720 часов', 'red');
      return;
    }
    setSavingUnlock(true);
    try {
      await api.patch('/settings/config', { unlockPeriodHours: unlockHours });
      toast.show('Время разблокировки обновлено');
      load();
    } catch (e: any) {
      toast.show(e.message, 'red');
    } finally {
      setSavingUnlock(false);
    }
  };

  const toggle = async (acct: AdminAccount, patch: any) => {
    try { await api.patch(`/settings/accounts/${acct.id}`, patch); toast.show('Аккаунт обновлён'); load(); }
    catch (e: any) { toast.show(e.message, 'red'); }
  };

  return (
    <div>
      <SectionTitle title="Настройки, роли и безопасность" subtitle="Управление доступом по принципу наименьших привилегий. Все изменения — в аудите."
        action={<Button onClick={() => setAddOpen(true)}><UserPlus className="w-4 h-4" /> Новый администратор</Button>} />

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <StatCard label="Порог 2-го подтверждения" value={`$${data.secondApprovalThresholdUsd}`} hint="Крупные начисления требуют второго оператора" />
        <StatCard label="Таймаут сессии" value={`${data.sessionTimeoutMinutes} мин`} />
        <StatCard label="Aктивных администраторов" value={data.adminAccounts.filter((a) => a.active).length} />
      </div>

      <Card className="p-5 mb-8">
        <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><KeyRound className="w-4 h-4 text-violet-600" /> Время разблокировки стейкинга</h3>
        <p className="text-sm text-slate-500 mb-3">Базовое время обработки запроса на вывод средств из классического стейкинга. Значение применяется ко всем новым запросам на вывод.</p>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={1}
            max={720}
            value={unlockHours ?? ''}
            onChange={(e) => setUnlockHours(Number(e.target.value))}
            className="w-28 px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <span className="text-sm text-slate-600">часов</span>
          <button
            onClick={saveUnlock}
            disabled={savingUnlock}
            className="px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors"
          >
            {savingUnlock ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </Card>

      <Card className="p-5 mb-8">
        <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><KeyRound className="w-4 h-4 text-violet-600" /> Администраторы</h3>
        <Table columns={['Логин', 'Имя', 'Роль', 'MFA', 'Статус', 'Последний вход', '']}>
          {data.adminAccounts.map((a) => (
            <tr key={a.id} className="hover:bg-slate-50">
              <Td className="font-mono text-xs">{a.username}</Td>
              <Td className="font-semibold">{a.name}</Td>
              <Td><Badge tone="purple">{ROLE_LABELS[a.role]}</Badge></Td>
              <Td>
                <button onClick={() => toggle(a, { mfaEnabled: !a.mfaEnabled })} className="inline-flex items-center gap-1">
                  <ShieldCheck className={`w-4 h-4 ${a.mfaEnabled ? 'text-emerald-600' : 'text-slate-300'}`} />
                  <span className="text-xs">{a.mfaEnabled ? 'вкл' : 'выкл'}</span>
                </button>
              </Td>
              <Td><Badge tone={a.active ? 'green' : 'neutral'}>{a.active ? 'Активен' : 'Отключён'}</Badge></Td>
              <Td className="text-xs text-slate-400">{fmtDate(a.lastLogin)}</Td>
              <Td><Button size="sm" variant={a.active ? 'outline' : 'primary'} onClick={() => toggle(a, { active: !a.active })}>{a.active ? 'Отключить' : 'Включить'}</Button></Td>
            </tr>
          ))}
        </Table>
      </Card>

      <Card className="p-5">
        <h3 className="font-bold text-slate-800 mb-3">Матрица прав (least privilege)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-500">
                <th className="text-left py-2 font-semibold">Право</th>
                {ROLES.map((r) => <th key={r} className="text-center py-2 font-semibold text-xs">{ROLE_LABELS[r]}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Object.entries(data.permissions).map(([perm, roles]) => (
                <tr key={perm}>
                  <td className="py-2 font-mono text-xs text-slate-600">{perm}</td>
                  {ROLES.map((r) => (
                    <td key={r} className="text-center py-2">
                      {(r === 'super_admin' || (roles as string[]).includes(r)) ? <Check /> : <span className="text-slate-200">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-slate-400 mt-3">Super Admin имеет все права. Права назначаются на сервере; клиент не может их расширить.</p>
      </Card>

      {addOpen && <AddAdminModal onClose={() => setAddOpen(false)} onDone={() => { setAddOpen(false); load(); toast.show('Аккаунт создан'); }} toast={toast.show} />}
      {toast.node}
    </div>
  );
};

const Check = () => <svg className="w-4 h-4 text-emerald-600 inline" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 011.4-1.4l3.1 3.1 6.8-6.8a1 1 0 011.4 0z" clipRule="evenodd" /></svg>;

const AddAdminModal: React.FC<{ onClose: () => void; onDone: () => void; toast: (t: string, tone?: 'green' | 'red') => void }> = ({ onClose, onDone, toast }) => {
  const [f, setF] = useState<{ username: string; name: string; role: Role; mfaEnabled: boolean }>({ username: '', name: '', role: 'support', mfaEnabled: true });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await api.post('/settings/accounts', f); onDone(); } catch (err: any) { toast(err.message, 'red'); }
  };
  return (
    <Modal open onClose={onClose} title="Новый администратор">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Логин"><input className={inputCls} value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} required /></Field>
        <Field label="Имя"><input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Роль" hint="Демонстрационный вход: пароль = имя роли"><select className={inputCls} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as Role })}>{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</select></Field>
        <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={f.mfaEnabled} onChange={(e) => setF({ ...f, mfaEnabled: e.target.checked })} /> Требовать MFA</label>
        <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={onClose}>Отмена</Button><Button type="submit">Создать</Button></div>
      </form>
    </Modal>
  );
};
