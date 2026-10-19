import React, { useEffect, useState } from 'react';
import { MessageSquare, Plus, Send, Check } from 'lucide-react';
import { api, fmtDate } from '../api';
import { SectionTitle, Badge, Button, Card, Spinner, Empty, Modal, Field, inputCls, useToast } from '../ui';
import type { SupportChat, UserProfile, Role } from '../types';

const can = (role: Role) => role === 'super_admin' || role === 'support';

const STATUS: Record<string, { label: string; tone: any }> = {
  open: { label: 'Открыт', tone: 'green' }, pending: { label: 'В ожидании', tone: 'amber' }, closed: { label: 'Закрыт', tone: 'neutral' },
};

export const SupportScreen: React.FC<{ role: Role }> = ({ role }) => {
  const [chats, setChats] = useState<SupportChat[] | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const toast = useToast();
  const writable = can(role);

  const load = () => {
    api.get<{ chats: SupportChat[] }>('/support').then((r) => {
      setChats(r.chats);
      if (!activeId && r.chats.length) setActiveId(r.chats[0].id);
    }).catch((e) => toast.show(e.message, 'red'));
    api.get<{ users: UserProfile[] }>('/users').then((r) => setUsers(r.users)).catch(() => {});
  };
  useEffect(() => { load(); }, []);
  if (!chats) return <Spinner />;

  const active = chats.find((c) => c.id === activeId) || null;

  return (
    <div>
      <SectionTitle title="Чат поддержки" subtitle="Переписка с клиентами. Внутренние заметки не видны клиенту. Все действия в аудите."
        action={writable && <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4" /> Новое обращение</Button>} />

      {chats.length === 0 ? <Empty text="Обращений нет" /> : (
        <div className="grid lg:grid-cols-[320px_1fr] gap-5">
          <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
            {chats.map((c) => (
              <button key={c.id} onClick={() => setActiveId(c.id)}
                className={`w-full text-left p-3 rounded-xl border transition-colors ${activeId === c.id ? 'border-violet-300 bg-violet-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-sm text-slate-800 truncate">{c.subject}</span>
                  <Badge tone={STATUS[c.status].tone}>{STATUS[c.status].label}</Badge>
                </div>
                <div className="text-[11px] text-slate-500 mt-1 truncate">{c.userId}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{fmtDate(c.createdAt)} · {c.messages.length} сообщ.</div>
              </button>
            ))}
          </div>

          <Card className="p-0 overflow-hidden flex flex-col h-[70vh]">
            {active ? <ChatView chat={active} writable={writable} onChanged={load} toast={toast.show} /> : <Empty text="Выберите обращение" />}
          </Card>
        </div>
      )}

      {open && <NewChatModal users={users} onClose={() => setOpen(false)} onDone={(id) => { setOpen(false); setActiveId(id); load(); toast.show('Обращение создано'); }} toast={toast.show} />}
      {toast.node}
    </div>
  );
};

const ChatView: React.FC<{ chat: SupportChat; writable: boolean; onChanged: () => void; toast: (t: string, tone?: 'green' | 'red') => void }> = ({ chat, writable, onChanged, toast }) => {
  const [text, setText] = useState('');
  const [internal, setInternal] = useState(false);

  const send = async () => {
    if (!text.trim()) return;
    try { await api.post(`/support/${chat.id}/messages`, { text, internal }); setText(''); onChanged(); }
    catch (e: any) { toast(e.message, 'red'); }
  };
  const setStatus = async (status: string) => {
    try { await api.patch(`/support/${chat.id}`, { status }); onChanged(); }
    catch (e: any) { toast(e.message, 'red'); }
  };

  return (
    <>
      <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-violet-600" />
        <span className="font-bold text-slate-800">{chat.subject}</span>
        <Badge tone={STATUS[chat.status].tone}>{STATUS[chat.status].label}</Badge>
        <div className="ml-auto flex gap-1">
          {writable && chat.status !== 'closed' && <Button size="sm" variant="outline" onClick={() => setStatus('closed')}><Check className="w-3.5 h-3.5" /> Закрыть</Button>}
          {writable && chat.status === 'closed' && <Button size="sm" variant="outline" onClick={() => setStatus('open')}>Открыть</Button>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
        {chat.messages.map((m) => {
          const isClient = m.from === 'client';
          const isNote = m.from === 'internal_note';
          return (
            <div key={m.id} className={`flex ${isClient ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${isNote ? 'bg-amber-100 text-amber-900 border border-amber-200' : isClient ? 'bg-white border border-slate-200 text-slate-800' : 'bg-violet-600 text-white'}`}>
                {isNote && <div className="text-[10px] font-bold uppercase mb-0.5">Внутренняя заметка</div>}
                <div>{m.text}</div>
                <div className={`text-[10px] mt-1 ${isClient || isNote ? 'text-slate-400' : 'text-violet-200'}`}>{fmtDate(m.createdAt)}</div>
              </div>
            </div>
          );
        })}
      </div>

      {writable && (
        <div className="p-3 border-t border-slate-200 bg-white">
          <div className="flex items-center gap-3 mb-2 text-xs text-slate-500">
            <label className="flex items-center gap-1"><input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} /> Внутренняя заметка (не видна клиенту)</label>
          </div>
          <div className="flex gap-2">
            <input className={inputCls} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder={internal ? 'Заметка для команды…' : 'Ответ клиенту…'} />
            <Button onClick={send}><Send className="w-4 h-4" /></Button>
          </div>
        </div>
      )}
    </>
  );
};

const NewChatModal: React.FC<{ users: UserProfile[]; onClose: () => void; onDone: (id: string) => void; toast: (t: string, tone?: 'green' | 'red') => void }> = ({ users, onClose, onDone, toast }) => {
  const [f, setF] = useState({ userId: '', subject: '', text: '' });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try { const r = await api.post('/support', f); onDone(r.chat.id); } catch (err: any) { toast(err.message, 'red'); }
  };
  return (
    <Modal open onClose={onClose} title="Новое обращение">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Пользователь"><select className={inputCls} value={f.userId} onChange={(e) => setF({ ...f, userId: e.target.value })} required>
          <option value="">— выберите —</option>{users.map((u) => <option key={u.id} value={u.id}>{u.email} ({u.address})</option>)}
        </select></Field>
        <Field label="Тема"><input className={inputCls} value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} required /></Field>
        <Field label="Первое сообщение"><textarea className={inputCls} rows={3} value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} required /></Field>
        <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={onClose}>Отмена</Button><Button type="submit">Создать</Button></div>
      </form>
    </Modal>
  );
};
