import React, { useEffect, useState } from 'react';
import { Bell, Check, Megaphone } from 'lucide-react';
import { api, fmtDate } from '../api';
import { SectionTitle, Card, Badge, Button, Spinner, Empty, Modal, Field, inputCls, useToast } from '../ui';
import type { AdminNotification, Role } from '../types';

const SEV: Record<string, { label: string; tone: any }> = {
  info: { label: 'Инфо', tone: 'blue' }, warning: { label: 'Внимание', tone: 'amber' }, critical: { label: 'Критично', tone: 'red' },
};

export const NotificationsScreen: React.FC<{ role: Role }> = ({ role }) => {
  const [rows, setRows] = useState<AdminNotification[] | null>(null);
  const [broadcast, setBroadcast] = useState(false);
  const toast = useToast();
  const canBroadcast = role === 'super_admin';

  const load = () => api.get<{ notifications: AdminNotification[] }>('/notifications').then((r) => setRows(r.notifications)).catch((e) => toast.show(e.message, 'red'));
  useEffect(() => { load(); }, []);
  if (!rows) return <Spinner />;

  const markRead = async (id: string) => {
    try { await api.post(`/notifications/${id}/read`); setRows((prev) => prev!.map((n) => n.id === id ? { ...n, read: true } : n)); }
    catch (e: any) { toast.show(e.message, 'red'); }
  };

  const unread = rows.filter((n) => !n.read).length;

  return (
    <div>
      <SectionTitle title="Уведомления" subtitle={`${unread} непрочитанных. Системные события, ошибки интеграций и рассылки клиентам.`}
        action={canBroadcast && <Button onClick={() => setBroadcast(true)}><Megaphone className="w-4 h-4" /> Рассылка клиентам</Button>} />

      {rows.length === 0 ? <Empty text="Уведомлений нет" /> : (
        <div className="space-y-2">
          {rows.map((n) => (
            <Card key={n.id} className={`p-4 flex items-start gap-3 ${n.read ? 'opacity-70' : ''}`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${n.severity === 'critical' ? 'bg-rose-100 text-rose-600' : n.severity === 'warning' ? 'bg-amber-100 text-amber-600' : 'bg-sky-100 text-sky-600'}`}>
                <Bell className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800">{n.title}</span>
                  <Badge tone={SEV[n.severity].tone}>{SEV[n.severity].label}</Badge>
                  {n.audience === 'client' && <Badge tone="purple">клиенту</Badge>}
                </div>
                <p className="text-sm text-slate-600 mt-0.5">{n.message}</p>
                <div className="text-[11px] text-slate-400 mt-1">{fmtDate(n.createdAt)}</div>
              </div>
              {!n.read && <Button size="sm" variant="ghost" onClick={() => markRead(n.id)}><Check className="w-4 h-4" /> Прочитано</Button>}
            </Card>
          ))}
        </div>
      )}

      {broadcast && <BroadcastModal onClose={() => setBroadcast(false)} onDone={() => { setBroadcast(false); load(); toast.show('Рассылка создана'); }} toast={toast.show} />}
      {toast.node}
    </div>
  );
};

const BroadcastModal: React.FC<{ onClose: () => void; onDone: () => void; toast: (t: string, tone?: 'green' | 'red') => void }> = ({ onClose, onDone, toast }) => {
  const [f, setF] = useState({ title: '', message: '', audience: 'client' });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await api.post('/notifications/broadcast', f); onDone(); } catch (err: any) { toast(err.message, 'red'); }
  };
  return (
    <Modal open onClose={onClose} title="Рассылка уведомления">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Заголовок"><input className={inputCls} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required /></Field>
        <Field label="Сообщение"><textarea className={inputCls} rows={3} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} required /></Field>
        <Field label="Аудитория"><select className={inputCls} value={f.audience} onChange={(e) => setF({ ...f, audience: e.target.value })}><option value="client">Клиенты</option><option value="admin">Только администраторы</option></select></Field>
        <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={onClose}>Отмена</Button><Button type="submit">Отправить</Button></div>
      </form>
    </Modal>
  );
};
