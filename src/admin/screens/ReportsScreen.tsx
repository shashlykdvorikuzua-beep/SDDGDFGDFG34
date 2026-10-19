import React, { useEffect, useState } from 'react';
import { FileBarChart, Download } from 'lucide-react';
import { api, fmtUsd, fmtDate } from '../api';
import { SectionTitle, Card, StatCard, Badge, Button, Table, Td, Spinner, Empty, useToast } from '../ui';
import type { AuditEntry, Role } from '../types';

const TYPE_LABEL: Record<string, string> = {
  deposit: 'Депозит', bonus: 'Бонус', reward: 'Вознаграждение', fee_refund: 'Возврат комиссии',
  compensation: 'Компенсация', correction: 'Исправление', withdrawal: 'Вывод', other: 'Прочее',
};

interface ReportData {
  period: { generatedAt: number; timezone: string };
  totalUnderManagement: number;
  journalByType: Record<string, { count: number; usd: number }>;
  withdrawalsCompleted: { count: number; usd: number };
  reconciliation: { wallet: string; bookUsd: number }[];
  promoBonusUsd: number;
}

export const ReportsScreen: React.FC<{ role: Role }> = () => {
  const [report, setReport] = useState<ReportData | null>(null);
  const [audit, setAudit] = useState<AuditEntry[] | null>(null);
  const toast = useToast();

  useEffect(() => {
    api.get<ReportData>('/reports').then(setReport).catch((e) => toast.show(e.message, 'red'));
    api.get<{ auditLog: AuditEntry[] }>('/audit').then((r) => setAudit(r.auditLog)).catch(() => {});
  }, []);

  if (!report || !audit) return <Spinner />;

  const exportCsv = () => {
    const header = 'actor,role,action,object,reason,oldValue,newValue,reference,createdAt\n';
    const body = audit.map((a) => [a.actor, a.role, a.action, a.object, a.reason ?? '', a.oldValue ?? '', a.newValue ?? '', a.reference ?? '', a.createdAt].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([header + body], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `vaultspring-audit-${Date.now()}.csv`; link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <SectionTitle title="Отчёты и аудит" subtitle={`Сформировано ${fmtDate(report.period.generatedAt)} · ${report.period.timezone}. Аудит-журнал неизменяем (append-only).`}
        action={<Button variant="outline" onClick={exportCsv}><Download className="w-4 h-4" /> Экспорт аудита (CSV)</Button>} />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Активы под управлением" value={fmtUsd(report.totalUnderManagement)} tone="text-violet-700" />
        <StatCard label="Завершённые выводы" value={report.withdrawalsCompleted.count} hint={fmtUsd(report.withdrawalsCompleted.usd)} />
        <StatCard label="Промо-бонусы" value={fmtUsd(report.promoBonusUsd)} />
        <StatCard label="Записей в аудите" value={audit.length} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <Card className="p-5">
          <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><FileBarChart className="w-4 h-4 text-violet-600" /> Журнал по типам операций</h3>
          {Object.keys(report.journalByType).length === 0 ? <Empty text="Проводок нет" /> : (
            <Table columns={['Тип', 'Кол-во', 'Сумма USD']}>
              {Object.entries(report.journalByType).map(([t, v]) => (
                <tr key={t}><Td className="font-semibold">{TYPE_LABEL[t] || t}</Td><Td>{v.count}</Td><Td>{fmtUsd(v.usd)}</Td></tr>
              ))}
            </Table>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="font-bold text-slate-800 mb-3">Сверка книги балансов по кошелькам</h3>
          <div className="max-h-64 overflow-y-auto">
            <Table columns={['Кошелёк', 'Баланс USD']}>
              {report.reconciliation.map((r) => (
                <tr key={r.wallet}><Td className="font-mono text-xs">{r.wallet}</Td><Td>{fmtUsd(r.bookUsd)}</Td></tr>
              ))}
            </Table>
          </div>
        </Card>
      </div>

      <SectionTitle title="Аудит-журнал" subtitle="Неизменяемая лента действий администраторов" />
      {audit.length === 0 ? <Empty text="Действий пока не зафиксировано" /> : (
        <div className="max-h-[520px] overflow-y-auto">
          <Table columns={['Дата', 'Автор', 'Роль', 'Действие', 'Объект', 'Основание', 'Было', 'Стало']}>
            {audit.map((a) => (
              <tr key={a.id} className="hover:bg-slate-50">
                <Td className="text-xs whitespace-nowrap">{fmtDate(a.createdAt)}</Td>
                <Td className="text-xs font-semibold">{a.actor}</Td>
                <Td><Badge tone="purple">{a.role}</Badge></Td>
                <Td className="font-mono text-xs">{a.action}</Td>
                <Td className="font-mono text-xs max-w-[140px] truncate">{a.object}</Td>
                <Td className="text-xs text-slate-500 max-w-[160px]">{a.reason || '—'}</Td>
                <Td className="text-xs text-slate-400 max-w-[140px] truncate">{a.oldValue || '—'}</Td>
                <Td className="text-xs text-slate-600 max-w-[140px] truncate">{a.newValue || '—'}</Td>
              </tr>
            ))}
          </Table>
        </div>
      )}
      {toast.node}
    </div>
  );
};
