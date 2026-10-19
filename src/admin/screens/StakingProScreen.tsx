import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Power, TrendingUp, TrendingDown, ShieldAlert, Download } from 'lucide-react';
import { api, fmtUsd, fmtNum, fmtDate } from '../api';
import {
  SectionTitle, Badge, Button, Table, Td, Spinner, Empty, Modal,
  Field, inputCls, useToast, StatCard,
} from '../ui';
import type { Role } from '../types';

const canWrite = (role: Role) => role === 'super_admin' || role === 'finance_ops';

interface Asset {
  id: string; symbol: string; name: string; network: string; currentPrice: number;
  change24h: number; minPositionUsd: number; maxLeverage: number; fundingRate8h: number;
  fundingDirection: 'pay' | 'receive'; spread: number; makerFeePercent: number;
  takerFeePercent: number; enabled: boolean; updatedAt: number;
}
interface Position {
  id: string; userId: string; walletPrimary: string; email: string; address: string;
  assetId: string; assetSymbol: string; assetName: string; direction: 'long' | 'short';
  executionType: 'market' | 'limit'; entryPrice: number; currentPrice: number;
  positionSizeUsd: number; collateralUsd: number; leverage: number; takeProfitPrice: number;
  stopLossPrice: number; liquidationPrice: number; openingFeeUsd: number; estClosingFeeUsd: number;
  accruedFundingUsd: number; openedAt: number; closedAt?: number; closePrice?: number;
  realizedPnlUsd?: number; status: string; source: string; openedBy: string;
}
interface UserRow { id: string; email: string; address: string; balanceUsd: number; status: string; }

// Net PnL for an open position — mirrors the server computation for a live preview.
function netPnl(p: { direction: string; entryPrice: number; currentPrice: number; leverage: number; collateralUsd: number; openingFeeUsd: number; estClosingFeeUsd: number; accruedFundingUsd: number }) {
  const diff = p.direction === 'long' ? p.currentPrice - p.entryPrice : p.entryPrice - p.currentPrice;
  const rawPct = (diff / (p.entryPrice || 1)) * p.leverage;
  return p.collateralUsd * rawPct - p.openingFeeUsd - p.estClosingFeeUsd - p.accruedFundingUsd;
}

export const StakingProScreen: React.FC<{ role: Role }> = ({ role }) => {
  const [tab, setTab] = useState<'positions' | 'catalog'>('positions');
  const [assets, setAssets] = useState<Asset[] | null>(null);
  const [positions, setPositions] = useState<Position[] | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<'open' | 'closed' | 'all'>('open');
  const [assetEdit, setAssetEdit] = useState<Asset | 'new' | null>(null);
  const [openPos, setOpenPos] = useState(false);
  const [adjust, setAdjust] = useState<Position | null>(null);
  const [closeTarget, setCloseTarget] = useState<Position | null>(null);
  const toast = useToast();
  const writable = canWrite(role);

  const load = () => {
    api.get<{ assets: Asset[]; positions: Position[] }>('/staking-pro')
      .then((r) => { setAssets(r.assets); setPositions(r.positions); })
      .catch((e) => toast.show(e.message, 'red'));
  };

  useEffect(() => {
    load();
    api.get<{ users: UserRow[] }>('/users').then((r) => setUsers(r.users.filter((u) => u.status === 'active'))).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shown = useMemo(() => {
    if (!positions) return [];
    return statusFilter === 'all' ? positions : positions.filter((p) => (statusFilter === 'open' ? p.status === 'open' : p.status !== 'open'));
  }, [positions, statusFilter]);

  const openPositions = positions?.filter((p) => p.status === 'open') || [];
  const totalCollateral = openPositions.reduce((s, p) => s + p.collateralUsd, 0);
  const totalPnl = openPositions.reduce((s, p) => s + netPnl(p), 0);

  if (!assets || !positions) return <Spinner />;

  return (
    <div>
      <SectionTitle
        title="Staking Pro / Управление"
        subtitle="Каталог активов и позиции клиентов. Всё настраивается здесь и сразу видно пользователям в приложении. Обеспечение резервируется/возвращается через журнал и фиксируется в аудите."
        action={writable && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setTab(tab === 'positions' ? 'catalog' : 'positions')}>
              {tab === 'positions' ? 'Каталог активов' : 'Позиции'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportCsv(shown)}><Download className="w-4 h-4" /> CSV</Button>
            {tab === 'positions'
              ? <>
                  <Button variant="outline" size="sm" onClick={() => runSweep(load, toast.show)}><ShieldAlert className="w-4 h-4" /> Проверить ликвидации</Button>
                  <Button size="sm" onClick={() => setOpenPos(true)}><Plus className="w-4 h-4" /> Открыть позицию</Button>
                </>
              : <Button size="sm" onClick={() => setAssetEdit('new')}><Plus className="w-4 h-4" /> Добавить актив</Button>}
          </div>
        )}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <StatCard label="Открытых позиций" value={openPositions.length} />
        <StatCard label="Обеспечение (Hold)" value={fmtUsd(totalCollateral)} />
        <StatCard label="Плавающий PnL" value={fmtUsd(totalPnl)} tone={totalPnl >= 0 ? 'text-emerald-600' : 'text-rose-600'} />
        <StatCard label="Активов в каталоге" value={`${assets.filter((a) => a.enabled).length} / ${assets.length}`} />
      </div>

      {tab === 'positions' ? (
        <div>
          <div className="flex gap-2 mb-3">
            {(['open', 'closed', 'all'] as const).map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${statusFilter === s ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>
                {s === 'open' ? 'Открытые' : s === 'closed' ? 'Закрытые' : 'Все'}
              </button>
            ))}
          </div>

          {shown.length === 0 ? <Empty text="Позиций нет. Откройте позицию для пользователя кнопкой выше." /> : (
            <Table columns={['Пользователь', 'Актив', 'Направление', 'Размер', 'Обеспеч.', 'Вход / Сейчас', 'PnL', 'TP / SL', 'Статус', '']}>
              {shown.map((p) => {
                const pnl = p.status === 'open' ? netPnl(p) : (p.realizedPnlUsd ?? 0);
                const isLong = p.direction === 'long';
                return (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <Td>
                      <div className="text-sm font-semibold text-slate-800">{p.email}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{p.address?.slice(0, 12)}…</div>
                      <div className="text-[10px] text-slate-400">{p.source === 'admin' ? `открыл: ${p.openedBy}` : 'сам клиент'} · {fmtDate(p.openedAt)}</div>
                    </Td>
                    <Td className="font-semibold">{p.assetSymbol}</Td>
                    <Td>
                      <span className={`inline-flex items-center gap-1 text-xs font-bold ${isLong ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {isLong ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                        {isLong ? 'LONG' : 'SHORT'} {p.leverage}x
                      </span>
                    </Td>
                    <Td className="font-mono">{fmtUsd(p.positionSizeUsd)}</Td>
                    <Td className="font-mono text-slate-600">{fmtUsd(p.collateralUsd)}</Td>
                    <Td className="font-mono text-xs">
                      <div>${fmtNum(p.entryPrice, 2)}</div>
                      <div className="text-slate-400">→ ${fmtNum(p.currentPrice, 2)}</div>
                    </Td>
                    <Td className={`font-mono font-bold ${pnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{pnl >= 0 ? '+' : ''}{fmtUsd(pnl)}</Td>
                    <Td className="font-mono text-[11px]">
                      <div className="text-emerald-600">TP ${fmtNum(p.takeProfitPrice, 2)}</div>
                      <div className="text-rose-600">SL ${fmtNum(p.stopLossPrice, 2)}</div>
                    </Td>
                    <Td>
                      <Badge tone={p.status === 'open' ? 'green' : p.status === 'liquidated' ? 'red' : 'neutral'}>
                        {p.status === 'open' ? 'открыта' : p.status === 'liquidated' ? 'ликвид.' : 'закрыта'}
                      </Badge>
                    </Td>
                    <Td>
                      {writable && p.status === 'open' && (
                        <div className="flex gap-1.5">
                          <Button size="sm" variant="outline" onClick={() => setAdjust(p)}>TP/SL</Button>
                          <Button size="sm" variant="danger" onClick={() => setCloseTarget(p)}>Закрыть</Button>
                        </div>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </Table>
          )}
        </div>
      ) : (
        <div>
          <Table columns={['Актив', 'Сеть', 'Цена', '24ч', 'Мин. позиция', 'Плечо', 'Funding/8ч', 'Комис. taker', 'Доступен', '']}>
            {assets.map((a) => (
              <tr key={a.id} className="hover:bg-slate-50">
                <Td>
                  <div className="font-bold text-slate-800">{a.symbol}</div>
                  <div className="text-[11px] text-slate-400">{a.name}</div>
                </Td>
                <Td className="text-xs text-slate-500">{a.network}</Td>
                <Td className="font-mono">${fmtNum(a.currentPrice, 4)}</Td>
                <Td className={`font-mono text-xs ${a.change24h >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{a.change24h >= 0 ? '+' : ''}{a.change24h}%</Td>
                <Td className="text-xs">${fmtNum(a.minPositionUsd, 0)}</Td>
                <Td className="text-xs font-semibold">{a.maxLeverage}x</Td>
                <Td className="text-xs font-mono">{a.fundingRate8h}% ({a.fundingDirection})</Td>
                <Td className="text-xs font-mono">{a.takerFeePercent}%</Td>
                <Td>
                  {writable ? (
                    <button onClick={() => toggleAsset(a, () => load(), toast.show)}
                      className="inline-flex items-center gap-1.5">
                      <Badge tone={a.enabled ? 'green' : 'neutral'}>{a.enabled ? 'включён' : 'выключен'}</Badge>
                    </button>
                  ) : <Badge tone={a.enabled ? 'green' : 'neutral'}>{a.enabled ? 'включён' : 'выключен'}</Badge>}
                </Td>
                <Td>
                  {writable && (
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => setAssetEdit(a)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => removeAsset(a, () => load(), toast.show)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  )}
                </Td>
              </tr>
            ))}
          </Table>
          <p className="text-[11px] text-slate-400 mt-3">
            <Power className="w-3 h-3 inline mr-1" /> Выключенный актив исчезает из приложения у всех пользователей, но открытые по нему позиции сохраняются.
          </p>
        </div>
      )}

      {openPos && <OpenPositionModal users={users} assets={assets} onClose={() => setOpenPos(false)} onDone={() => { setOpenPos(false); load(); toast.show('Позиция открыта, обеспечение зарезервировано'); }} />}
      {adjust && <AdjustModal pos={adjust} onClose={() => setAdjust(null)} onDone={() => { setAdjust(null); load(); toast.show('Уровни TP/SL обновлены'); }} />}
      {closeTarget && <CloseModal pos={closeTarget} onClose={() => setCloseTarget(null)} onDone={() => { setCloseTarget(null); load(); toast.show('Позиция закрыта, обеспечение возвращено'); }} />}
      {assetEdit && <AssetModal asset={assetEdit} onClose={() => setAssetEdit(null)} onDone={() => { setAssetEdit(null); load(); toast.show('Каталог обновлён'); }} />}
      {toast.node}
    </div>
  );
};

async function toggleAsset(a: Asset, reload: () => void, show: (t: string, tone?: 'green' | 'red') => void) {
  try { await api.patch(`/staking-pro/assets/${a.id}`, { enabled: !a.enabled, reason: `Админ переключил доступность актива ${a.symbol}` }); reload(); }
  catch (e: any) { show(e.message, 'red'); }
}

async function runSweep(reload: () => void, show: (t: string, tone?: 'green' | 'red') => void) {
  try {
    const r = await api.post('/staking-pro/liquidate-sweep', {});
    show(r.count ? `Ликвидировано позиций: ${r.count}` : 'Позиций для ликвидации нет', r.count ? 'red' : 'green');
    reload();
  } catch (e: any) { show(e.message, 'red'); }
}

function exportCsv(positions: Position[]) {
  const cols = ['id', 'email', 'address', 'assetSymbol', 'direction', 'leverage', 'positionSizeUsd', 'collateralUsd', 'entryPrice', 'currentPrice', 'takeProfitPrice', 'stopLossPrice', 'liquidationPrice', 'realizedPnlUsd', 'status', 'source', 'openedBy'];
  const rows = [cols.join(','), ...positions.map((p) => cols.map((c) => {
    const v = (p as any)[c];
    const s = v === undefined || v === null ? '' : String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }).join(','))];
  const blob = new Blob(['\ufeff' + rows.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `staking-pro-positions-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
}
async function removeAsset(a: Asset, reload: () => void, show: (t: string, tone?: 'green' | 'red') => void) {
  if (!window.confirm(`Удалить актив ${a.symbol} из каталога?`)) return;
  try { await api.del(`/staking-pro/assets/${a.id}`, { reason: `Удаление актива ${a.symbol} из каталога` }); reload(); }
  catch (e: any) { show(e.message, 'red'); }
}

// ---------------------------------------------------------------- Open modal
const OpenPositionModal: React.FC<{ users: UserRow[]; assets: Asset[]; onClose: () => void; onDone: () => void }> = ({ users, assets, onClose, onDone }) => {
  const enabledAssets = assets.filter((a) => a.enabled);
  const [f, setF] = useState({ userId: users[0]?.id || '', assetId: enabledAssets[0]?.id || '', direction: 'long' as 'long' | 'short', leverage: 3, positionSizeUsd: 200, takeProfitPrice: '', stopLossPrice: '', reason: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const asset = enabledAssets.find((a) => a.id === f.assetId);
  const entry = asset?.currentPrice || 0;
  const lev = Math.max(1, Math.min(f.leverage, asset?.maxLeverage || 10));
  const collateral = lev > 0 ? (f.positionSizeUsd || 0) / lev : 0;
  const liq = asset ? (f.direction === 'long' ? entry * (1 - (1 / lev) * 0.9) : entry * (1 + (1 / lev) * 0.9)) : 0;
  const user = users.find((u) => u.id === f.userId);

  // Sensible default TP/SL when asset/direction changes.
  useEffect(() => {
    if (!asset) return;
    if (f.direction === 'long') { setF((s) => ({ ...s, takeProfitPrice: (asset.currentPrice * 1.08).toFixed(2), stopLossPrice: (asset.currentPrice * 0.95).toFixed(2) })); }
    else { setF((s) => ({ ...s, takeProfitPrice: (asset.currentPrice * 0.92).toFixed(2), stopLossPrice: (asset.currentPrice * 1.05).toFixed(2) })); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.assetId, f.direction]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      await api.post('/staking-pro/positions', {
        userId: f.userId, assetId: f.assetId, direction: f.direction, leverage: lev,
        positionSizeUsd: f.positionSizeUsd, takeProfitPrice: parseFloat(f.takeProfitPrice) || 0,
        stopLossPrice: parseFloat(f.stopLossPrice) || 0, executionType: 'market', reason: f.reason || 'Открытие позиции оператором',
      });
      onDone();
    } catch (e: any) { setErr(e.message || 'Ошибка'); }
    finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} title="Открыть Staking Pro позицию для пользователя" wide>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Пользователь">
            <select className={inputCls} value={f.userId} onChange={(e) => setF({ ...f, userId: e.target.value })}>
              {users.map((u) => <option key={u.id} value={u.id}>{u.email} · {fmtUsd(u.balanceUsd)}</option>)}
            </select>
          </Field>
          <Field label="Актив">
            <select className={inputCls} value={f.assetId} onChange={(e) => setF({ ...f, assetId: e.target.value })}>
              {enabledAssets.map((a) => <option key={a.id} value={a.id}>{a.symbol} · ${fmtNum(a.currentPrice, 2)} (до {a.maxLeverage}x)</option>)}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Направление">
            <div className="grid grid-cols-2 gap-2">
              {(['long', 'short'] as const).map((d) => (
                <button type="button" key={d} onClick={() => setF({ ...f, direction: d })}
                  className={`py-2 rounded-xl text-sm font-bold border ${f.direction === d ? (d === 'long' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-rose-600 text-white border-rose-600') : 'bg-white text-slate-500 border-slate-300'}`}>
                  {d === 'long' ? 'LONG (рост)' : 'SHORT (падение)'}
                </button>
              ))}
            </div>
          </Field>
          <Field label={`Плечо: ${lev}x`} hint={`Максимум актива: ${asset?.maxLeverage}x`}>
            <input type="number" min={1} max={asset?.maxLeverage || 10} className={inputCls} value={f.leverage} onChange={(e) => setF({ ...f, leverage: Number(e.target.value) })} />
          </Field>
        </div>

        <Field label="Номинальный размер позиции (USD)" hint={`Минимум актива: $${asset?.minPositionUsd}`}>
          <input type="number" min={asset?.minPositionUsd || 1} className={inputCls} value={f.positionSizeUsd} onChange={(e) => setF({ ...f, positionSizeUsd: Number(e.target.value) })} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Тейк-профит (цена)">
            <input type="number" step="0.01" className={inputCls} value={f.takeProfitPrice} onChange={(e) => setF({ ...f, takeProfitPrice: e.target.value })} />
          </Field>
          <Field label="Стоп-лосс (цена)">
            <input type="number" step="0.01" className={inputCls} value={f.stopLossPrice} onChange={(e) => setF({ ...f, stopLossPrice: e.target.value })} />
          </Field>
        </div>

        <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 text-sm grid grid-cols-3 gap-2">
          <div><div className="text-[11px] text-slate-500">Цена входа</div><div className="font-mono font-bold">${fmtNum(entry, 2)}</div></div>
          <div><div className="text-[11px] text-slate-500">Нужно обеспечения</div><div className="font-mono font-bold text-violet-700">{fmtUsd(collateral)}</div></div>
          <div><div className="text-[11px] text-slate-500">Цена ликвидации</div><div className="font-mono font-bold text-rose-600">${fmtNum(liq, 2)}</div></div>
          <div className="col-span-3 text-[11px] text-slate-500">
            Доступно у пользователя: {user ? fmtUsd(user.balanceUsd) : '—'} · Обеспечение спишется из USDT через журнал и вернётся при закрытии.
          </div>
        </div>

        <Field label="Причина / комментарий (в аудит)">
          <input className={inputCls} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} placeholder="напр. Запрошено клиентом в чате поддержки" />
        </Field>

        {err && <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-2">{err}</div>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>Отмена</Button>
          <Button type="submit" disabled={busy || !f.userId || !asset}>{busy ? 'Открытие…' : 'Открыть позицию'}</Button>
        </div>
      </form>
    </Modal>
  );
};

// --------------------------------------------------------------- Adjust modal
const AdjustModal: React.FC<{ pos: Position; onClose: () => void; onDone: () => void }> = ({ pos, onClose, onDone }) => {
  const [tp, setTp] = useState(String(pos.takeProfitPrice));
  const [sl, setSl] = useState(String(pos.stopLossPrice));
  const [reason, setReason] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(null);
    try { await api.patch(`/staking-pro/positions/${pos.id}`, { takeProfitPrice: parseFloat(tp) || 0, stopLossPrice: parseFloat(sl) || 0, reason: reason || 'Корректировка уровней оператором' }); onDone(); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title={`Изменить TP / SL — ${pos.assetSymbol} ${pos.direction.toUpperCase()}`}>
      <form onSubmit={submit} className="space-y-4">
        <div className="text-sm text-slate-500">Цена входа: <span className="font-mono">${fmtNum(pos.entryPrice, 2)}</span> · {pos.direction === 'long' ? 'TP выше входа, SL ниже' : 'TP ниже входа, SL выше'}</div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Новый тейк-профит"><input type="number" step="0.01" className={inputCls} value={tp} onChange={(e) => setTp(e.target.value)} /></Field>
          <Field label="Новый стоп-лосс"><input type="number" step="0.01" className={inputCls} value={sl} onChange={(e) => setSl(e.target.value)} /></Field>
        </div>
        <Field label="Причина (обязательно)"><input className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
        {err && <div className="text-sm text-rose-600">{err}</div>}
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Отмена</Button><Button type="submit" disabled={busy}>Сохранить</Button></div>
      </form>
    </Modal>
  );
};

// ------------------------------------------------------------------ Close modal
const CloseModal: React.FC<{ pos: Position; onClose: () => void; onDone: () => void }> = ({ pos, onClose, onDone }) => {
  const [reason, setReason] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pnl = netPnl(pos);
  const ret = Math.max(0, pos.collateralUsd + pnl);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(null);
    try { await api.post(`/staking-pro/positions/${pos.id}/close`, { reason: reason || 'Закрытие позиции оператором' }); onDone(); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title={`Закрыть позицию — ${pos.assetSymbol} ${pos.direction.toUpperCase()} ${pos.leverage}x`}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-3 gap-2 text-sm bg-slate-50 border border-slate-200 rounded-xl p-3">
          <div><div className="text-[11px] text-slate-500">Текущая цена</div><div className="font-mono font-bold">${fmtNum(pos.currentPrice, 2)}</div></div>
          <div><div className="text-[11px] text-slate-500">Фин. результат</div><div className={`font-mono font-bold ${pnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{pnl >= 0 ? '+' : ''}{fmtUsd(pnl)}</div></div>
          <div><div className="text-[11px] text-slate-500">Возврат в USDT</div><div className="font-mono font-bold text-violet-700">{fmtUsd(ret)}</div></div>
        </div>
        <Field label="Причина закрытия (обязательно)"><input className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
        {err && <div className="text-sm text-rose-600">{err}</div>}
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Отмена</Button><Button type="submit" variant="danger" disabled={busy}>{busy ? 'Закрытие…' : 'Закрыть и вернуть обеспечение'}</Button></div>
      </form>
    </Modal>
  );
};

// --------------------------------------------------------------- Asset editor
const AssetModal: React.FC<{ asset: Asset | 'new'; onClose: () => void; onDone: () => void }> = ({ asset, onClose, onDone }) => {
  const isNew = asset === 'new';
  const a = isNew ? null : (asset as Asset);
  const [f, setF] = useState({
    id: a?.id || '', symbol: a?.symbol || '', name: a?.name || '', network: a?.network || 'Multi-Chain',
    currentPrice: a?.currentPrice ?? 0, change24h: a?.change24h ?? 0, minPositionUsd: a?.minPositionUsd ?? 10,
    maxLeverage: a?.maxLeverage ?? 10, fundingRate8h: a?.fundingRate8h ?? 0.01, fundingDirection: a?.fundingDirection || 'pay',
    spread: a?.spread ?? 0, makerFeePercent: a?.makerFeePercent ?? 0.02, takerFeePercent: a?.takerFeePercent ?? 0.05,
    enabled: a?.enabled ?? true, reason: '',
  });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(null);
    try {
      if (isNew) await api.post('/staking-pro/assets', f);
      else await api.patch(`/staking-pro/assets/${a!.id}`, { ...f, reason: f.reason || `Изменение актива ${f.symbol} в каталоге` });
      onDone();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title={isNew ? 'Добавить актив в каталог Staking Pro' : `Редактировать ${a?.symbol}`} wide>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Символ"><input className={inputCls} value={f.symbol} onChange={(e) => setF({ ...f, symbol: e.target.value })} placeholder="BTC" /></Field>
          <Field label="Название"><input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Bitcoin" /></Field>
          <Field label="Сеть"><input className={inputCls} value={f.network} onChange={(e) => setF({ ...f, network: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Текущая цена (USD)"><input type="number" step="0.0001" className={inputCls} value={f.currentPrice} onChange={(e) => setF({ ...f, currentPrice: Number(e.target.value) })} /></Field>
          <Field label="Изменение 24ч (%)"><input type="number" step="0.01" className={inputCls} value={f.change24h} onChange={(e) => setF({ ...f, change24h: Number(e.target.value) })} /></Field>
          <Field label="Спред (USD)"><input type="number" step="0.0001" className={inputCls} value={f.spread} onChange={(e) => setF({ ...f, spread: Number(e.target.value) })} /></Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Мин. позиция (USD)"><input type="number" className={inputCls} value={f.minPositionUsd} onChange={(e) => setF({ ...f, minPositionUsd: Number(e.target.value) })} /></Field>
          <Field label="Макс. плечо (x)"><input type="number" className={inputCls} value={f.maxLeverage} onChange={(e) => setF({ ...f, maxLeverage: Number(e.target.value) })} /></Field>
          <Field label="Funding / 8ч (%)"><input type="number" step="0.001" className={inputCls} value={f.fundingRate8h} onChange={(e) => setF({ ...f, fundingRate8h: Number(e.target.value) })} /></Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Maker fee (%)"><input type="number" step="0.01" className={inputCls} value={f.makerFeePercent} onChange={(e) => setF({ ...f, makerFeePercent: Number(e.target.value) })} /></Field>
          <Field label="Taker fee (%)"><input type="number" step="0.01" className={inputCls} value={f.takerFeePercent} onChange={(e) => setF({ ...f, takerFeePercent: Number(e.target.value) })} /></Field>
          <Field label="Funding направление">
            <select className={inputCls} value={f.fundingDirection} onChange={(e) => setF({ ...f, fundingDirection: e.target.value as 'pay' | 'receive' })}>
              <option value="pay">Платят лонги</option><option value="receive">Получают лонги</option>
            </select>
          </Field>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input type="checkbox" checked={f.enabled} onChange={(e) => setF({ ...f, enabled: e.target.checked })} /> Актив виден пользователям
          </label>
        </div>
        {!isNew && <Field label="Причина изменения (в аудит)"><input className={inputCls} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} /></Field>}
        {err && <div className="text-sm text-rose-600">{err}</div>}
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Отмена</Button><Button type="submit" disabled={busy || !f.symbol || !f.name}>{busy ? 'Сохранение…' : 'Сохранить'}</Button></div>
      </form>
    </Modal>
  );
};
