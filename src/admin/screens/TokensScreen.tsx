import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Coins } from 'lucide-react';
import { api, fmtNum, fmtDate } from '../api';
import { SectionTitle, Badge, Button, Table, Td, Spinner, Empty, Modal, Field, inputCls, useToast } from '../ui';
import type { InternalToken, Role } from '../types';

const can = (role: Role) => role === 'super_admin' || role === 'finance_ops';

interface PriceHistory {
  symbol: string; oldPrice: number; newPrice: number; oldSupply: number; newSupply: number;
  author: string; reason: string; createdAt: number;
}

export const TokensScreen: React.FC<{ role: Role }> = ({ role }) => {
  const [tokens, setTokens] = useState<InternalToken[] | null>(null);
  const [history, setHistory] = useState<PriceHistory[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<InternalToken | null>(null);
  const toast = useToast();
  const writable = can(role);

  const load = () => {
    api.get<{ tokens: InternalToken[]; priceHistory: PriceHistory[] }>('/tokens')
      .then((r) => { setTokens(r.tokens); setHistory(r.priceHistory || []); })
      .catch((e) => toast.show(e.message, 'red'));
  };
  useEffect(() => { load(); }, []);
  if (!tokens) return <Spinner />;

  return (
    <div>
      <SectionTitle title="Внутренние токены" subtitle="Токены с внутренней ценой (priceSource: internal). Внешние рыночные цены из оракула менять запрещено."
        action={writable && <Button onClick={() => setAddOpen(true)}><Plus className="w-4 h-4" /> Новый токен</Button>} />

      {tokens.length === 0 ? <Empty text="Внутренних токенов нет" /> : (
        <Table columns={['Тикер', 'Название', 'Сеть', 'Контракт', 'Цена', 'Source', 'Supply', 'Стейкинг', 'Pro', 'Статус', '']}>
          {tokens.map((t) => (
            <tr key={t.symbol} className="hover:bg-slate-50">
              <Td className="font-bold text-violet-700"><Coins className="w-4 h-4 inline mr-1" />{t.symbol}</Td>
              <Td>{t.name}</Td>
              <Td className="text-xs text-slate-500">{t.network}</Td>
              <Td className="font-mono text-xs max-w-[160px] truncate text-slate-400">{t.contract || '—'}</Td>
              <Td>${fmtNum(t.price, 8)}</Td>
              <Td><Badge tone={t.priceSource === 'internal' ? 'purple' : 'blue'}>{t.priceSource}</Badge></Td>
              <Td className="text-xs">{fmtNum(t.circulatingSupply, 0)}</Td>
              <Td>{t.availableInStaking ? <Badge tone="green">да</Badge> : '—'}</Td>
              <Td>{t.availableInStakingPro ? <Badge tone="green">да</Badge> : '—'}</Td>
              <Td><Badge tone={t.status === 'active' ? 'green' : 'neutral'}>{t.status}</Badge></Td>
              <Td>{writable && t.priceSource === 'internal' && <Button size="sm" variant="outline" onClick={() => setEditTarget(t)}><Pencil className="w-3.5 h-3.5" /> Изменить</Button>}</Td>
            </tr>
          ))}
        </Table>
      )}

      <div className="mt-8">
        <SectionTitle title="История изменений цены" subtitle="Ничего не перезаписывается — только новые записи" />
        {history.length === 0 ? <Empty text="История пуста" /> : (
          <Table columns={['Дата', 'Тикер', 'Старая цена', 'Новая цена', 'Старый supply', 'Новый supply', 'Автор', 'Причина']}>
            {history.map((h, i) => (
              <tr key={i} className="hover:bg-slate-50">
                <Td className="text-xs whitespace-nowrap">{fmtDate(h.createdAt)}</Td>
                <Td className="font-semibold">{h.symbol}</Td>
                <Td>${fmtNum(h.oldPrice, 8)}</Td>
                <Td>${fmtNum(h.newPrice, 8)}</Td>
                <Td className="text-xs">{fmtNum(h.oldSupply, 0)}</Td>
                <Td className="text-xs">{fmtNum(h.newSupply, 0)}</Td>
                <Td className="text-xs">{h.author}</Td>
                <Td className="text-xs text-slate-500">{h.reason}</Td>
              </tr>
            ))}
          </Table>
        )}
      </div>

      {addOpen && <AddTokenModal onClose={() => setAddOpen(false)} onDone={() => { setAddOpen(false); load(); toast.show('Токен создан'); }} toast={toast.show} />}
      {editTarget && <EditPriceModal token={editTarget} onClose={() => setEditTarget(null)} onDone={() => { setEditTarget(null); load(); toast.show('Цена обновлена'); }} toast={toast.show} />}
      {toast.node}
    </div>
  );
};

const AddTokenModal: React.FC<{ onClose: () => void; onDone: () => void; toast: (t: string, tone?: 'green' | 'red') => void }> = ({ onClose, onDone, toast }) => {
  const [f, setF] = useState({ symbol: '', name: '', network: 'Ethereum (ERC-20)', contract: '', decimals: 18, price: 0, priceSource: 'internal' as 'internal' | 'oracle', priceMethod: 'Внутренняя расчётная', circulatingSupply: 0, availableInStaking: false, availableInStakingPro: false, limits: '' });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await api.post('/tokens', f); onDone(); } catch (err: any) { toast(err.message, 'red'); }
  };
  return (
    <Modal open onClose={onClose} title="Новый внутренний токен">
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Тикер"><input className={inputCls} value={f.symbol} onChange={(e) => setF({ ...f, symbol: e.target.value })} placeholder="VLT" required /></Field>
          <Field label="Название"><input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Сеть"><input className={inputCls} value={f.network} onChange={(e) => setF({ ...f, network: e.target.value })} /></Field>
          <Field label="Десятичные"><input className={inputCls} type="number" min={0} value={f.decimals} onChange={(e) => setF({ ...f, decimals: +e.target.value })} /></Field>
        </div>
        <Field label="Контракт"><input className={inputCls} value={f.contract} onChange={(e) => setF({ ...f, contract: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Цена (USD)"><input className={inputCls} type="number" step="any" value={f.price} onChange={(e) => setF({ ...f, price: +e.target.value })} /></Field>
          <Field label="Circulating Supply"><input className={inputCls} type="number" step="any" value={f.circulatingSupply} onChange={(e) => setF({ ...f, circulatingSupply: +e.target.value })} /></Field>
        </div>
        <Field label="Источник цены"><select className={inputCls} value={f.priceSource} onChange={(e) => setF({ ...f, priceSource: e.target.value as any })}><option value="internal">Внутренний</option><option value="oracle">Оракул (внешняя цена)</option></select></Field>
        <Field label="Метод расчёта"><input className={inputCls} value={f.priceMethod} onChange={(e) => setF({ ...f, priceMethod: e.target.value })} /></Field>
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-1.5"><input type="checkbox" checked={f.availableInStaking} onChange={(e) => setF({ ...f, availableInStaking: e.target.checked })} /> Staking</label>
          <label className="flex items-center gap-1.5"><input type="checkbox" checked={f.availableInStakingPro} onChange={(e) => setF({ ...f, availableInStakingPro: e.target.checked })} /> Staking Pro</label>
        </div>
        <Field label="Лимиты"><input className={inputCls} value={f.limits} onChange={(e) => setF({ ...f, limits: e.target.value })} placeholder="min/max stake, vesting…" /></Field>
        <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={onClose}>Отмена</Button><Button type="submit">Создать</Button></div>
      </form>
    </Modal>
  );
};

const EditPriceModal: React.FC<{ token: InternalToken; onClose: () => void; onDone: () => void; toast: (t: string, tone?: 'green' | 'red') => void }> = ({ token, onClose, onDone, toast }) => {
  const [price, setPrice] = useState(token.price);
  const [supply, setSupply] = useState(token.circulatingSupply);
  const [status, setStatus] = useState(token.status);
  const [reason, setReason] = useState('');
  const save = async () => {
    try { await api.patch(`/tokens/${token.symbol}`, { price, circulatingSupply: supply, status, reason }); onDone(); }
    catch (e: any) { toast(e.message, 'red'); }
  };
  return (
    <Modal open onClose={onClose} title={`Изменить: ${token.symbol}`}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Цена"><input className={inputCls} type="number" step="any" value={price} onChange={(e) => setPrice(+e.target.value)} /></Field>
          <Field label="Supply"><input className={inputCls} type="number" step="any" value={supply} onChange={(e) => setSupply(+e.target.value)} /></Field>
        </div>
        <Field label="Статус"><select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value as any)}><option value="active">Активен</option><option value="paused">Пауза</option></select></Field>
        <Field label="Причина изменения" hint="Обязательна — запись уходит в неизменяемый аудит"><input className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
        <div className="flex justify-end gap-2 pt-4"><Button variant="outline" onClick={onClose}>Отмена</Button><Button onClick={save} disabled={!reason}>Сохранить</Button></div>
      </div>
    </Modal>
  );
};
