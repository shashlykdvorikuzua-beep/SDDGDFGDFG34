import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search, Eye, Plus, Pencil, Trash2, Upload, X, QrCode, RotateCcw, Save,
  SlidersHorizontal, TrendingUp, Wallet2, Copy, Check,
} from 'lucide-react';
import { api, fmtUsd, fmtNum, fmtDate } from '../api';
import { Card, SectionTitle, Badge, Button, Table, Td, Spinner, Empty, Modal, Field, inputCls, useToast, StatCard } from '../ui';
import { QRCodeSvg } from '../../components/common/QRCodeSvg';
import type { UserProfile, UserDetail, ClientDepositOverride, Role } from '../types';

const statusTone: Record<string, any> = { active: 'green', restricted: 'amber', blocked: 'red', pending: 'blue' };
const kycTone: Record<string, any> = { verified: 'green', pending: 'amber', rejected: 'red', none: 'neutral' };
const kycLabel: Record<string, string> = { verified: 'Верифицирован', pending: 'На проверке', rejected: 'Отклонён', none: 'Нет KYC' };

type Show = (t: string, tone?: 'green' | 'red') => void;

export const UsersScreen: React.FC<{ role: Role }> = ({ role }) => {
  const [users, setUsers] = useState<UserProfile[] | null>(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [selected, setSelected] = useState<string | null>(null);
  const toast = useToast();

  const load = () => api.get<{ users: UserProfile[] }>('/users').then((r) => setUsers(r.users)).catch((e) => toast.show(e.message, 'red'));
  useEffect(() => { load(); }, []);

  if (!users) return <Spinner />;

  const filtered = users.filter((u) => {
    const matchQ = !q || [u.email, u.phone, u.address, u.id].join(' ').toLowerCase().includes(q.toLowerCase());
    const matchS = status === 'all' || u.status === status;
    return matchQ && matchS;
  });

  return (
    <div>
      <SectionTitle title="Пользователи / Аккаунты" subtitle="Профиль, персональный баланс, рынок и кошельки пополнения — для каждого клиента отдельно" />
      <Card className="p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input className={`${inputCls} pl-9`} placeholder="Поиск по ID, email, телефону, адресу…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className={`${inputCls} sm:w-52`} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">Все статусы</option>
            <option value="active">Активные</option>
            <option value="restricted">Ограниченные</option>
            <option value="blocked">Заблокированные</option>
            <option value="pending">Новые</option>
          </select>
        </div>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <StatCard label="Всего" value={users.length} />
        <StatCard label="Активных" value={users.filter((u) => u.status === 'active').length} tone="text-emerald-600" />
        <StatCard label="Верифицировано" value={users.filter((u) => u.kycStatus === 'verified').length} tone="text-violet-600" />
        <StatCard label="Под управлением" value={fmtUsd(users.reduce((s, u) => s + (u.balanceUsd || 0), 0))} />
      </div>

      {filtered.length === 0 ? <Empty text="Пользователи не найдены" /> : (
        <Table columns={['Пользователь', 'Статус', 'KYC', 'Активы', 'Баланс', 'Откр. заявки', 'Последняя активность', '']}>
          {filtered.map((u) => (
            <tr key={u.id} className="hover:bg-slate-50">
              <Td>
                <div className="font-semibold text-slate-800">{u.email}</div>
                <div className="text-xs font-mono text-slate-400">{u.address}</div>
              </Td>
              <Td><Badge tone={statusTone[u.status]}>{u.status}</Badge></Td>
              <Td><Badge tone={kycTone[u.kycStatus]}>{kycLabel[u.kycStatus]}</Badge></Td>
              <Td className="text-slate-600">{u.assetCount}</Td>
              <Td className="font-semibold text-slate-800">{fmtUsd(u.balanceUsd)}</Td>
              <Td className={u.openWithdrawals > 0 ? 'text-amber-600 font-semibold' : 'text-slate-400'}>{u.openWithdrawals}</Td>
              <Td className="text-xs text-slate-500">{fmtDate(u.lastActiveAt)}</Td>
              <Td><Button size="sm" variant="outline" onClick={() => setSelected(u.id)}><Eye className="w-3.5 h-3.5" /> Открыть</Button></Td>
            </tr>
          ))}
        </Table>
      )}

      {selected && <UserDetailModal id={selected} role={role} onClose={() => setSelected(null)} onChanged={load} toast={toast.show} />}
      {toast.node}
    </div>
  );
};

const UserDetailModal: React.FC<{ id: string; role: Role; onClose: () => void; onChanged: () => void; toast: Show }> = ({ id, role, onClose, onChanged, toast }) => {
  const [tab, setTab] = useState('overview');
  const [d, setD] = useState<UserDetail | null>(null);
  const canProfile = role === 'super_admin' || role === 'risk_compliance';
  const canOps = role === 'super_admin' || role === 'finance_ops';

  const load = () => api.get<UserDetail>(`/users/${id}`).then(setD).catch((e) => toast(e.message, 'red'));
  useEffect(() => { load(); }, [id]);

  if (!d) return <Modal open onClose={onClose} title="Профиль" wide><Spinner /></Modal>;

  const tabs: { key: string; label: string; icon?: React.ReactNode }[] = [
    { key: 'overview', label: 'Обзор' },
    { key: 'balance', label: 'Баланс', icon: <Wallet2 className="w-3.5 h-3.5" /> },
    { key: 'market', label: 'Рынок', icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { key: 'deposit', label: 'Пополнение', icon: <QrCode className="w-3.5 h-3.5" /> },
    { key: 'journal', label: 'Журнал' },
    { key: 'restrictions', label: 'Ограничения' },
    { key: 'support', label: 'Поддержка' },
  ];

  const update = async (patch: any) => {
    try { await api.patch(`/users/${id}`, patch); toast('Профиль обновлён'); load(); onChanged(); }
    catch (e: any) { toast(e.message, 'red'); }
  };

  return (
    <Modal open onClose={onClose} title={`Профиль · ${d.profile.email}`} wide>
      <div className="flex gap-2 flex-wrap border-b border-slate-100 pb-3 mb-4">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Info label="Статус" value={<Badge tone={statusTone[d.profile.status]}>{d.profile.status}</Badge>} />
            <Info label="KYC" value={<Badge tone={kycTone[d.profile.kycStatus]}>{kycLabel[d.profile.kycStatus]}</Badge>} />
            <Info label="Баланс (доступно)" value={fmtUsd(d.balanceUsd - d.reservedUsd)} />
            <Info label="Зарезервировано" value={fmtUsd(d.reservedUsd)} />
            <Info label="Регистрация" value={fmtDate(d.profile.createdAt)} />
            <Info label="EVM адрес" value={<span className="font-mono text-xs">{d.wallet.address}</span>} />
          </div>
          {canProfile && (
            <div className="pt-2 border-t border-slate-100 grid sm:grid-cols-2 gap-3">
              <label className="block"><span className="text-xs font-semibold text-slate-600">Email</span>
                <input className={inputCls} defaultValue={d.profile.email} onBlur={(e) => e.target.value !== d.profile.email && update({ email: e.target.value })} /></label>
              <label className="block"><span className="text-xs font-semibold text-slate-600">Телефон</span>
                <input className={inputCls} defaultValue={d.profile.phone} onBlur={(e) => e.target.value !== d.profile.phone && update({ phone: e.target.value })} /></label>
              <label className="block"><span className="text-xs font-semibold text-slate-600">Статус</span>
                <select className={inputCls} value={d.profile.status} onChange={(e) => update({ status: e.target.value })}>
                  {['active', 'pending', 'restricted', 'blocked'].map((s) => <option key={s} value={s}>{s}</option>)}
                </select></label>
              <label className="block"><span className="text-xs font-semibold text-slate-600">KYC</span>
                <select className={inputCls} value={d.profile.kycStatus} onChange={(e) => update({ kycStatus: e.target.value })}>
                  {['none', 'pending', 'verified', 'rejected'].map((s) => <option key={s} value={s}>{kycLabel[s]}</option>)}
                </select></label>
            </div>
          )}
          <div className="grid grid-cols-4 gap-2 pt-1">
            <Stat label="Активов" value={String(d.assets.length)} />
            <Stat label="Рынков доступно" value={Array.isArray(d.allowedAssetIds) && d.allowedAssetIds.length > 0 ? `${d.allowedAssetIds.length}` : 'все'} />
            <Stat label="Персональных цен" value={String(Object.keys(d.priceOverrides || {}).length)} />
            <Stat label="Личных кошельков" value={String(Object.keys(d.depositOverrides || {}).length)} />
          </div>
          <p className="text-[11px] text-slate-400">Баланс, цены рынка и кошельки пополнения правятся во вкладках выше — отдельно для этого клиента.</p>
        </div>
      )}

      {tab === 'balance' && <BalanceTab d={d} canOps={canOps} reload={load} onChanged={onChanged} toast={toast} />}
      {tab === 'market' && <MarketTab d={d} canOps={canOps} reload={load} toast={toast} />}
      {tab === 'deposit' && <DepositTab d={d} canOps={canOps} reload={load} toast={toast} />}

      {tab === 'journal' && (d.journal.length === 0 ? <Empty text="Проводок нет" /> : (
        <Table columns={['Дата', 'Тип', 'Актив', 'Сумма', 'Автор', 'Основание', 'Статус']}>
          {d.journal.map((j) => (
            <tr key={j.id}>
              <Td className="text-xs">{fmtDate(j.createdAt)}</Td>
              <Td><Badge tone="purple">{j.type}</Badge></Td>
              <Td className="font-semibold">{j.asset}</Td>
              <Td className={j.amount < 0 ? 'text-rose-600' : 'text-emerald-700'}>{j.amount > 0 ? '+' : ''}{fmtNum(j.amount)}</Td>
              <Td className="text-slate-500">{j.author}</Td>
              <Td className="text-xs text-slate-500 max-w-[180px] truncate">{j.reason || '—'}</Td>
              <Td>{j.approved ? <Badge tone="green">Проведено</Badge> : <Badge tone="amber">Ожидает 2-го подтв.</Badge>}</Td>
            </tr>
          ))}
        </Table>
      ))}

      {tab === 'restrictions' && (d.restrictions.length === 0 ? <Empty text="Активных ограничений нет" /> : (
        <div className="space-y-2">
          {d.restrictions.map((r) => (
            <Card key={r.id} className="p-3 flex items-center justify-between">
              <div><Badge tone="amber">{r.scope}</Badge><div className="text-sm text-slate-700 mt-1">{r.reason}</div></div>
              <div className="text-xs text-slate-400">{r.author} · {fmtDate(r.startedAt)}</div>
            </Card>
          ))}
        </div>
      ))}

      {tab === 'support' && (d.chats.length === 0 ? <Empty text="Обращений нет" /> : (
        <div className="space-y-2">
          {d.chats.map((c) => <Card key={c.id} className="p-3 flex justify-between"><span className="text-sm font-medium">{c.subject}</span><Badge tone={c.status === 'open' ? 'blue' : 'neutral'}>{c.status}</Badge></Card>)}
        </div>
      ))}
    </Modal>
  );
};

// -------------------------------------------------------------- Balance tab
const BalanceTab: React.FC<{ d: UserDetail; canOps: boolean; reload: () => void; onChanged: () => void; toast: Show }> = ({ d, canOps, reload, onChanged, toast }) => {
  const coins = useMemo(() => Array.from(new Set([...(d.coinOptions || []), ...d.assets.map((a) => a.symbol)])).sort(), [d]);
  const [asset, setAsset] = useState(coins[0] || 'USDT');
  const [mode, setMode] = useState<'add' | 'sub' | 'set'>('add');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const apply = async () => {
    const amt = Number(amount);
    if (!asset) return toast('Выберите актив', 'red');
    if (!Number.isFinite(amt) || amt < 0) return toast('Введите корректную сумму', 'red');
    setBusy(true);
    try {
      const r = await api.post(`/users/${d.profile.id}/balance`, { asset, mode, amount: amt, reason });
      toast(`${r.noChange ? 'Без изменений' : `Новый баланс: ${fmtNum(r.balance)} ${asset}`}`);
      setAmount(''); setReason(''); reload(); onChanged();
    } catch (e: any) { toast(e.message, 'red'); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Текущих активов" value={String(d.assets.length)} />
        <Stat label="Стоимость портфеля" value={fmtUsd(d.balanceUsd)} />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {d.assets.map((a) => (
          <button key={a.symbol} onClick={() => setAsset(a.symbol)} className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border ${asset === a.symbol ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>
            {a.symbol}: {fmtNum(a.amount)}
          </button>
        ))}
      </div>

      {canOps ? (
        <Card className="p-4 bg-slate-50 border-slate-200">
          <div className="flex items-center gap-2 mb-3 text-sm font-bold text-slate-700"><SlidersHorizontal className="w-4 h-4" /> Скорректировать баланс клиента</div>
          <div className="grid sm:grid-cols-4 gap-3">
            <Field label="Актив">
              <input className={inputCls} list="bal-coins" value={asset} onChange={(e) => setAsset(e.target.value.toUpperCase())} />
              <datalist id="bal-coins">{coins.map((c) => <option key={c} value={c} />)}</datalist>
            </Field>
            <Field label="Действие">
              <select className={inputCls} value={mode} onChange={(e) => setMode(e.target.value as any)}>
                <option value="add">Начислить (+)</option>
                <option value="sub">Списать (−)</option>
                <option value="set">Установить (=)</option>
              </select>
            </Field>
            <Field label="Сумма"><input type="number" min={0} step="any" className={inputCls} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" /></Field>
            <Field label="Основание"><input className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="напр. бонус / корректировка" /></Field>
          </div>
          <div className="flex justify-end mt-3">
            <Button onClick={apply} disabled={busy || amount === ''}><Save className="w-4 h-4" /> {busy ? 'Применение…' : 'Применить'}</Button>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Каждая корректировка пишется в журнал и аудит, создаёт запись в истории и уведомление клиенту.</p>
        </Card>
      ) : (
        <Card className="p-3 bg-amber-50 border-amber-100 text-amber-800 text-sm">У вашей роли нет прав на изменение баланса (нужна роль Finance/Ops или Super Admin).</Card>
      )}

      <Table columns={['Актив', 'Баланс', 'Резерв', 'Доступно', 'Цена', 'Стоимость']}>
        {d.assets.map((a) => (
          <tr key={a.symbol}>
            <Td className="font-semibold">{a.symbol}</Td>
            <Td>{fmtNum(a.amount)}</Td>
            <Td className="text-amber-600">{fmtNum(a.reserved)}</Td>
            <Td className="text-emerald-700">{fmtNum(a.available)}</Td>
            <Td>{fmtUsd(a.price)}</Td>
            <Td className="font-semibold">{fmtUsd(a.valueUsd)}</Td>
          </tr>
        ))}
      </Table>
    </div>
  );
};

// ---------------------------------------------------------------- Market tab
const CATEGORY_LABELS: Record<string, string> = { crypto: 'Крипто', forex: 'Форекс', commodities: 'Сырьё', stocks: 'Акции', indices: 'Индексы' };

const MarketTab: React.FC<{ d: UserDetail; canOps: boolean; reload: () => void; toast: Show }> = ({ d, canOps, reload, toast }) => {
  const [category, setCategory] = useState('all');
  const overrides = d.priceOverrides || {};
  const cats = useMemo(() => Array.from(new Set(d.marketAssets.map((a) => a.category))), [d]);
  const rows = d.marketAssets.filter((a) => category === 'all' || a.category === category);
  const overrideCount = Object.keys(overrides).length;

  // Per-client market access state
  const hasCustomAccess = Array.isArray(d.allowedAssetIds) && d.allowedAssetIds!.length > 0;
  const [accessMode, setAccessMode] = useState<'all' | 'custom'>(hasCustomAccess ? 'custom' : 'all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(hasCustomAccess ? d.allowedAssetIds! : [])
  );
  const [accessBusy, setAccessBusy] = useState(false);

  const clearAll = async () => {
    try { await api.patch(`/users/${d.profile.id}/price-overrides`, { clear: true, reason: 'Сброс персональных цен' }); toast('Персональные цены сброшены'); reload(); }
    catch (e: any) { toast(e.message, 'red'); }
  };

  const toggleAsset = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAllInCategory = (cat: string) => {
    const ids = d.marketAssets.filter((a) => a.category === cat).map((a) => a.id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
  };

  const deselectAllInCategory = (cat: string) => {
    const ids = d.marketAssets.filter((a) => a.category === cat).map((a) => a.id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
  };

  const saveAccess = async () => {
    setAccessBusy(true);
    try {
      const body = accessMode === 'all'
        ? { mode: 'all', reason: 'Доступ ко всем рынкам' }
        : { assetIds: Array.from(selectedIds), reason: 'Индивидуальный набор рынков для клиента' };
      await api.patch(`/users/${d.profile.id}/allowed-assets`, body);
      toast(accessMode === 'all' ? 'Доступ: все рынки' : `Доступ: ${selectedIds.size} инструментов`);
      reload();
    } catch (e: any) { toast(e.message, 'red'); }
    finally { setAccessBusy(false); }
  };

  const allowedCount = hasCustomAccess ? d.allowedAssetIds!.length : d.marketAssets.length;

  return (
    <div className="space-y-4">
      {/* Per-client market access section */}
      <Card className="p-4 bg-sky-50 border-sky-100">
        <div className="flex items-center gap-2 mb-3">
          <SlidersHorizontal className="w-4 h-4 text-sky-600" />
          <span className="text-sm font-bold text-sky-800">Доступ к рынкам Trade Pro</span>
          <Badge tone={hasCustomAccess ? 'purple' : 'green'}>
            {hasCustomAccess ? `${allowedCount} выбрано` : 'все рынки'}
          </Badge>
        </div>
        <p className="text-xs text-sky-700 mb-3">
          По умолчанию клиент видит <b>все включённые инструменты</b>. Здесь можно выбрать конкретные рынки, которые увидит именно этот клиент в Trade Pro.
        </p>

        {canOps ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <button
                onClick={() => setAccessMode('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                  accessMode === 'all' ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                }`}
              >
                Все рынки
              </button>
              <button
                onClick={() => setAccessMode('custom')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                  accessMode === 'custom' ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                }`}
              >
                Выбрать вручную
              </button>
            </div>

            {accessMode === 'custom' && (
              <div className="space-y-2">
                {/* Category quick-actions */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {cats.map((cat) => {
                    const catTotal = d.marketAssets.filter((a) => a.category === cat).length;
                    const catSelected = d.marketAssets.filter((a) => a.category === cat && selectedIds.has(a.id)).length;
                    const allSelected = catSelected === catTotal;
                    return (
                      <div key={cat} className="flex items-center gap-1">
                        <button
                          onClick={() => allSelected ? deselectAllInCategory(cat) : selectAllInCategory(cat)}
                          className={`text-[11px] font-semibold px-2 py-1 rounded-lg border transition-colors ${
                            allSelected ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {CATEGORY_LABELS[cat] || cat} ({catSelected}/{catTotal})
                        </button>
                      </div>
                    );
                  })}
                  <button
                    onClick={() => setSelectedIds(new Set(d.marketAssets.map((a) => a.id)))}
                    className="text-[11px] font-semibold px-2 py-1 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                  >
                    Выбрать все
                  </button>
                  <button
                    onClick={() => setSelectedIds(new Set())}
                    className="text-[11px] font-semibold px-2 py-1 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                  >
                    Снять все
                  </button>
                </div>

                {/* Asset checkboxes grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-52 overflow-y-auto">
                  {d.marketAssets.map((a) => (
                    <label
                      key={a.id}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-xs border transition-colors ${
                        selectedIds.has(a.id) ? 'bg-sky-50 border-sky-300 text-sky-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(a.id)}
                        onChange={() => toggleAsset(a.id)}
                        className="w-3.5 h-3.5 rounded accent-sky-600"
                      />
                      <span className="font-semibold truncate">{a.symbol}</span>
                      <span className="text-[10px] text-slate-400 truncate">{CATEGORY_LABELS[a.category] || a.category}</span>
                    </label>
                  ))}
                </div>

                <div className="text-[11px] text-slate-500">
                  Выбрано: <b className="text-sky-700">{selectedIds.size}</b> из {d.marketAssets.length}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button size="sm" onClick={saveAccess} disabled={accessBusy || (accessMode === 'custom' && selectedIds.size === 0)}>
                <Save className="w-3.5 h-3.5" /> {accessBusy ? 'Сохранение…' : 'Сохранить доступ'}
              </Button>
            </div>
          </div>
        ) : (
          <Card className="p-3 bg-amber-50 border-amber-100 text-amber-800 text-sm">
            У вашей роли нет прав на изменение доступа к рынкам.
          </Card>
        )}
      </Card>

      {/* Price overrides section */}
      <Card className="p-4 bg-violet-50 border-violet-100">
        <p className="text-sm text-violet-800">
          Здесь задаются <b>личные цены этого клиента</b>. В Trade Pro он будет видеть именно их, а общий рынок для остальных не меняется.
          Можно задать цену и изменение за 24ч. Оставленное поле — значение из общего фида.
        </p>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setCategory('all')} className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border ${category === 'all' ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-slate-600 border-slate-300'}`}>Все</button>
        {cats.map((c) => (
          <button key={c} onClick={() => setCategory(c)} className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border ${category === c ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-slate-600 border-slate-300'}`}>{CATEGORY_LABELS[c] || c}</button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <Badge tone={overrideCount ? 'purple' : 'neutral'}>{overrideCount} персональных</Badge>
          {canOps && overrideCount > 0 && <Button size="sm" variant="ghost" onClick={clearAll}><RotateCcw className="w-3.5 h-3.5" /> Сбросить всё</Button>}
        </div>
      </div>

      <Table columns={['Инструмент', 'Рынок', 'Цена (общая)', 'Ваша цена', 'Изм. 24ч (общ.)', 'Ваше изм.', '']}>
        {rows.map((a) => (
          <MarketRow key={a.id} asset={a} override={overrides[a.id]} canOps={canOps} userId={d.profile.id} onDone={reload} toast={toast} />
        ))}
      </Table>
    </div>
  );
};

const MarketRow: React.FC<{
  asset: UserDetail['marketAssets'][number]; override?: { currentPrice?: number; change24h?: number };
  canOps: boolean; userId: string; onDone: () => void; toast: Show;
}> = ({ asset, override, canOps, userId, onDone, toast }) => {
  const [price, setPrice] = useState(override?.currentPrice != null ? String(override.currentPrice) : '');
  const [change, setChange] = useState(override?.change24h != null ? String(override.change24h) : '');
  const [busy, setBusy] = useState(false);
  const isOver = !!override;
  const prec = asset.pricePrecision ?? (asset.currentPrice >= 100 ? 2 : asset.currentPrice >= 1 ? 4 : 6);

  const save = async () => {
    setBusy(true);
    try {
      await api.patch(`/users/${userId}/price-overrides`, {
        overrides: { [asset.id]: { currentPrice: price === '' ? undefined : Number(price), change24h: change === '' ? undefined : Number(change) } },
        reason: 'Персональная цена клиента',
      });
      toast(`Сохранено: ${asset.symbol}`); onDone();
    } catch (e: any) { toast(e.message, 'red'); }
    finally { setBusy(false); }
  };
  const reset = async () => {
    setBusy(true);
    try { await api.patch(`/users/${userId}/price-overrides`, { clearAsset: asset.id }); toast('Сброшено к общей цене'); onDone(); }
    catch (e: any) { toast(e.message, 'red'); }
    finally { setBusy(false); }
  };

  return (
    <tr className={isOver ? 'bg-violet-50/60' : 'hover:bg-slate-50'}>
      <Td>
        <div className="font-semibold text-slate-800">{asset.symbol}</div>
        <div className="text-[11px] text-slate-500 max-w-[160px] truncate">{asset.name}</div>
      </Td>
      <Td className="text-xs text-slate-500">{CATEGORY_LABELS[asset.category] || asset.category}</Td>
      <Td className="text-slate-500 font-mono text-xs">{fmtNum(asset.currentPrice, prec)}</Td>
      <Td>
        {canOps ? (
          <input className={`${inputCls} w-28 py-1 text-xs`} value={price} onChange={(e) => setPrice(e.target.value)} placeholder={fmtNum(asset.currentPrice, prec)} />
        ) : <span className="font-mono text-xs">{override?.currentPrice != null ? fmtNum(override.currentPrice, prec) : '—'}</span>}
      </Td>
      <Td className={`text-xs font-mono ${asset.change24h >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{asset.change24h >= 0 ? '+' : ''}{asset.change24h.toFixed(2)}%</Td>
      <Td>
        {canOps ? (
          <input className={`${inputCls} w-20 py-1 text-xs`} value={change} onChange={(e) => setChange(e.target.value)} placeholder="+/-" />
        ) : <span className="font-mono text-xs">{override?.change24h != null ? `${override.change24h >= 0 ? '+' : ''}${override.change24h.toFixed(2)}%` : '—'}</span>}
      </Td>
      <Td>
        {canOps && (
          <div className="flex gap-1">
            <Button size="sm" variant={isOver ? 'outline' : 'primary'} onClick={save} disabled={busy}><Check className="w-3.5 h-3.5" /></Button>
            {isOver && <Button size="sm" variant="ghost" onClick={reset} disabled={busy} title="Вернуть общую цену"><RotateCcw className="w-3.5 h-3.5" /></Button>}
          </div>
        )}
      </Td>
    </tr>
  );
};

// --------------------------------------------------------------- Deposit tab
const COMMON_SYMBOLS = ['BTC', 'ETH', 'USDT', 'USDC', 'TRX', 'SOL', 'BNB', 'XRP', 'TON', 'ADA', 'DOGE', 'LTC'];
const COMMON_NETWORKS = ['Bitcoin', 'Ethereum (ERC-20)', 'BNB Smart Chain (BEP-20)', 'TRON (TRC-20)', 'Solana', 'Polygon (MATIC)', 'Arbitrum One', 'Base', 'TON', 'XRP Ledger', 'Litecoin', 'Dogecoin', 'All Networks'];

const DepositTab: React.FC<{ d: UserDetail; canOps: boolean; reload: () => void; toast: Show }> = ({ d, canOps, reload, toast }) => {
  const overrides = Object.values(d.depositOverrides || {}) as ClientDepositOverride[];
  const [edit, setEdit] = useState<ClientDepositOverride | 'new' | null>(null);
  const [copied, setCopied] = useState('');

  const remove = async (ov: ClientDepositOverride) => {
    if (!window.confirm(`Удалить персональный кошелёк ${ov.symbol} (${ov.network || 'без сети'}) для этого клиента?`)) return;
    try { await api.post(`/users/${d.profile.id}/deposit-overrides/remove`, { symbol: ov.symbol, network: ov.network }); toast('Удалено'); reload(); }
    catch (e: any) { toast(e.message, 'red'); }
  };

  const copyGlobal = (o: UserDetail['operatorDeposits'][number]) => setEdit({ symbol: o.symbol, network: o.network, address: o.address, memo: o.memo, label: o.label, qrImage: o.qrImage, updatedAt: 0 });

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-violet-50 border-violet-100">
        <p className="text-sm text-violet-800">
          Здесь можно <b>заменить кошелёк пополнения</b> для этого клиента по любой монете и <b>поставить свой QR-код</b>.
          В приложении на экране «Получить / Пополнение» этот клиент увидит именно ваш адрес и QR.
        </p>
      </Card>

      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-500">Персональных кошельков: <b className="text-slate-800">{overrides.length}</b></div>
        {canOps && <Button size="sm" onClick={() => setEdit('new')}><Plus className="w-4 h-4" /> Добавить кошелёк</Button>}
      </div>

      {overrides.length === 0 ? <Empty text="Персональные кошельки пополнения не заданы — клиент видит общий кошелёк платформы." /> : (
        <Table columns={['Монета', 'Сеть', 'Адрес пополнения', 'QR', '']}>
          {overrides.map((ov) => {
            const key = `${ov.symbol}|${ov.network}`;
            return (
              <tr key={key} className="hover:bg-slate-50">
                <Td className="font-bold text-violet-700">{ov.symbol}</Td>
                <Td className="text-xs text-slate-600">{ov.network || '—'}</Td>
                <Td className="font-mono text-xs max-w-[240px]">
                  <div className="break-all">{ov.address}</div>
                  {ov.memo ? <div className="text-[11px] text-amber-600 break-all">метка: {ov.memo}</div> : null}
                  {ov.label ? <div className="text-[11px] text-slate-400">{ov.label}</div> : null}
                </Td>
                <Td>
                  {ov.qrImage
                    ? <img src={ov.qrImage} alt="QR" className="w-12 h-12 rounded-lg object-contain border border-slate-200 bg-white" />
                    : <button className="text-slate-400 hover:text-violet-600" title="Скопировать адрес" onClick={() => { navigator.clipboard.writeText(ov.address); setCopied(key); setTimeout(() => setCopied(''), 1500); }}>
                        {copied === key ? <Check className="w-4 h-4 text-emerald-600" /> : <QrCode className="w-5 h-5" />}
                      </button>}
                </Td>
                <Td>
                  {canOps && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => setEdit(ov)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(ov)}><Trash2 className="w-3.5 h-3.5 text-rose-500" /></Button>
                    </div>
                  )}
                </Td>
              </tr>
            );
          })}
        </Table>
      )}

      {d.operatorDeposits.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-slate-600 mb-2">Общие кошельки платформы (можно скопировать как основу)</div>
          <div className="flex flex-wrap gap-2">
            {d.operatorDeposits.map((o, i) => (
              <button key={i} onClick={() => copyGlobal(o)} className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50">
                <Copy className="w-3 h-3" /> {o.symbol} · {o.network || '—'}
              </button>
            ))}
          </div>
        </div>
      )}

      {edit && (
        <DepositOverrideModal
          initial={edit === 'new' ? null : edit}
          userId={d.profile.id}
          onClose={() => setEdit(null)}
          onDone={() => { setEdit(null); reload(); toast('Сохранено'); }}
          toast={toast}
        />
      )}
    </div>
  );
};

const DepositOverrideModal: React.FC<{ initial: ClientDepositOverride | null; userId: string; onClose: () => void; onDone: () => void; toast: Show }> = ({ initial, userId, onClose, onDone, toast }) => {
  const [f, setF] = useState<ClientDepositOverride>(
    initial || { symbol: '', network: '', address: '', memo: '', label: '', qrImage: null, updatedAt: 0 },
  );
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (k: keyof ClientDepositOverride, v: any) => setF((p) => ({ ...p, [k]: v }));

  const readQr = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast('Нужен файл изображения', 'red'); return; }
    if (file.size > 800_000) { toast('Файл слишком большой (макс. ~800 КБ)', 'red'); return; }
    const reader = new FileReader();
    reader.onload = () => set('qrImage', String(reader.result));
    reader.onerror = () => toast('Не удалось прочитать файл', 'red');
    reader.readAsDataURL(file);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try { await api.patch(`/users/${userId}/deposit-overrides`, f); onDone(); }
    catch (err: any) { toast(err.message, 'red'); }
    finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} title={initial ? 'Изменить кошелёк пополнения клиента' : 'Новый кошелёк пополнения клиента'} wide>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <div className="text-xs font-semibold text-slate-600 mb-1.5">Быстрый выбор монеты</div>
          <div className="flex flex-wrap gap-1.5">
            {COMMON_SYMBOLS.map((sym) => (
              <button type="button" key={sym} onClick={() => set('symbol', sym)} className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${f.symbol === sym ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>{sym}</button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Тикер монеты" hint="напр. USDT"><input className={inputCls} value={f.symbol} onChange={(e) => set('symbol', e.target.value.toUpperCase())} required /></Field>
          <Field label="Сеть">
            <input className={inputCls} list="do-networks" value={f.network} onChange={(e) => set('network', e.target.value)} placeholder="TRON (TRC-20)" />
            <datalist id="do-networks">{COMMON_NETWORKS.map((n) => <option key={n} value={n} />)}</datalist>
          </Field>
        </div>

        <Field label="Адрес пополнения" hint="Этот адрес увидит именно данный клиент на экране пополнения">
          <textarea className={`${inputCls} font-mono`} rows={2} value={f.address} onChange={(e) => set('address', e.target.value)} required />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Метка / memo / destination tag" hint="для XRP, TON, ATOM и т.п."><input className={inputCls} value={f.memo || ''} onChange={(e) => set('memo', e.target.value)} /></Field>
          <Field label="Подпись / предупреждение"><input className={inputCls} value={f.label || ''} onChange={(e) => set('label', e.target.value)} placeholder="напр. Только USDT TRC-20" /></Field>
        </div>

        <div className={`border rounded-xl p-3 ${drag ? 'border-violet-500 bg-violet-50' : 'border-slate-200'}`}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); readQr(e.dataTransfer.files?.[0]); }}>
          <div className="text-xs font-semibold text-slate-600 mb-2">QR-код <span className="font-normal text-slate-400">— перетащите изображение или загрузите</span></div>
          <div className="flex items-start gap-4">
            <div className="w-32 h-32 rounded-xl border border-slate-200 bg-white flex items-center justify-center shrink-0">
              {f.qrImage
                ? <img src={f.qrImage} alt="QR preview" className="w-full h-full object-contain rounded-xl" />
                : f.address
                  ? <QRCodeSvg value={f.address} size={120} />
                  : <div className="flex flex-col items-center text-slate-400 text-[11px] px-2 text-center"><QrCode className="w-7 h-7 mb-1" />введите адрес</div>}
            </div>
            <div className="flex flex-col gap-2">
              <input ref={fileRef} type="file" accept="image/*" onChange={(e) => readQr(e.target.files?.[0])} className="hidden" />
              <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()}><Upload className="w-3.5 h-3.5" /> Загрузить свой QR</Button>
              {f.qrImage && <Button type="button" size="sm" variant="ghost" onClick={() => set('qrImage', null)}><X className="w-3.5 h-3.5" /> Убрать QR</Button>}
              <p className="text-[11px] text-slate-400 max-w-xs">Если загрузите свой QR — клиент сканирует именно его. Без загрузки приложение построит код из адреса.</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>Отмена</Button>
          <Button type="submit" disabled={busy || !f.symbol || !f.address}>{busy ? 'Сохранение…' : 'Сохранить'}</Button>
        </div>
      </form>
    </Modal>
  );
};

const Info: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="bg-slate-50 rounded-xl px-3 py-2">
    <div className="text-[11px] text-slate-500 uppercase tracking-wide">{label}</div>
    <div className="text-sm font-semibold text-slate-800 mt-0.5">{value}</div>
  </div>
);

const Stat: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="bg-violet-50 rounded-xl px-3 py-2 text-center">
    <div className="text-[11px] text-violet-500 uppercase tracking-wide">{label}</div>
    <div className="text-sm font-bold text-violet-800 mt-0.5">{value}</div>
  </div>
);
