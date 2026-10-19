import React, { useEffect, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { api, fmtNum, fmtDate } from '../api';
import { SectionTitle, Badge, Button, Table, Td, Spinner, Empty, Modal, Field, inputCls, useToast } from '../ui';
import type { Role, JournalEntry } from '../types';

const can = (role: Role) => role === 'super_admin' || role === 'finance_ops';

interface Program {
  id: string; asset: string; network: string; mode: string; apy: number; apySource: string;
  minStake: number; lockDuration: string; unlock: string; fee: number; status: string; updatedAt: number;
}

export const StakingScreen: React.FC<{ role: Role }> = ({ role }) => {
  const [data, setData] = useState<{ programs: Program[]; positions: JournalEntry[] } | null>(null);
  const [target, setTarget] = useState<Program | null>(null);
  const toast = useToast();
  const writable = can(role);

  const load = () => api.get<{ programs: Program[]; positions: JournalEntry[] }>('/staking').then(setData).catch((e) => toast.show(e.message, 'red'));
  useEffect(() => { load(); }, []);
  if (!data) return <Spinner />;

  return (
    <div>
      <SectionTitle title="Стейкинг (Classic)" subtitle="Каталог программ провайдера. Условия и APR импортируются из провайдера и не меняются задним числом." />

      <Table columns={['Актив', 'Сеть', 'Режим', 'APR', 'Источник APR', 'Мин. ставка', 'Блокировка', 'Вывод', 'Комиссия', 'Статус', '']}>
        {data.programs.map((p) => (
          <tr key={p.id} className="hover:bg-slate-50">
            <Td className="font-semibold">{p.asset}</Td>
            <Td className="text-xs text-slate-500">{p.network}</Td>
            <Td className="text-xs">{p.mode}</Td>
            <Td className="font-semibold text-emerald-600">{p.apy}%</Td>
            <Td className="text-xs text-slate-500">{p.apySource}</Td>
            <Td className="text-xs">{fmtNum(p.minStake)} {p.asset}</Td>
            <Td className="text-xs">{p.lockDuration}</Td>
            <Td className="text-xs text-slate-500">{p.unlock}</Td>
            <Td className="text-xs">{p.fee}%</Td>
            <Td><Badge tone={p.status === 'active' ? 'green' : 'neutral'}>{p.status === 'active' ? 'Активна' : 'На паузе'}</Badge></Td>
            <Td>{writable && (
              <Button size="sm" variant="outline" onClick={() => setTarget(p)}>
                {p.status === 'active' ? <><Pause className="w-3.5 h-3.5" /> Пауза</> : <><Play className="w-3.5 h-3.5" /> Вкл.</>}
              </Button>
            )}</Td>
          </tr>
        ))}
      </Table>

      <div className="mt-8">
        <SectionTitle title="Начисленные вознаграждения" subtitle="Стопки вознаграждений из журнала операций (тип reward)." />
        {data.positions.length === 0 ? <Empty text="Начислений вознаграждений пока нет" /> : (
          <Table columns={['Дата', 'Пользователь', 'Актив', 'Сумма', '≈USD', 'Статус']}>
            {data.positions.map((j) => (
              <tr key={j.id} className="hover:bg-slate-50">
                <Td className="text-xs whitespace-nowrap">{fmtDate(j.createdAt)}</Td>
                <Td className="font-mono text-xs">{j.userId}</Td>
                <Td className="font-semibold">{j.asset}</Td>
                <Td>{fmtNum(j.amount)}</Td>
                <Td className="text-slate-500">{fmtNum(j.amountUsd, 2)}</Td>
                <Td>{j.approved ? <Badge tone="green">Проведено</Badge> : <Badge tone="amber">Ожидает</Badge>}</Td>
              </tr>
            ))}
          </Table>
        )}
      </div>

      {target && <StatusModal program={target} onClose={() => setTarget(null)} onDone={() => { setTarget(null); load(); toast.show('Изменение зафиксировано в аудите'); }} toast={toast.show} />}
      {toast.node}
    </div>
  );
};

const StatusModal: React.FC<{ program: Program; onClose: () => void; onDone: () => void; toast: (t: string, tone?: 'green' | 'red') => void }> = ({ program, onClose, onDone, toast }) => {
  const [reason, setReason] = useState('');
  const next = program.status === 'active' ? 'paused' : 'active';
  const save = async () => {
    try { const r = await api.patch(`/staking/${program.id}`, { status: next, reason }); toast(r.message, 'green'); onDone(); }
    catch (e: any) { toast(e.message, 'red'); }
  };
  return (
    <Modal open onClose={onClose} title={`Сменить статус: ${program.asset} ${program.mode}`}>
      <p className="text-sm text-slate-600 mb-3">Действие фиксируется в неизменяемом аудит-журнале. Провайдерские условия (APR, комиссии) не редактируются.</p>
      <Field label="Причина (обязательно для аудита)"><input className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="напр. техническое обслуживание провайдера" /></Field>
      <div className="flex justify-end gap-2 pt-4"><Button variant="outline" onClick={onClose}>Отмена</Button><Button onClick={save} disabled={!reason}>Подтвердить</Button></div>
    </Modal>
  );
};
