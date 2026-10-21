import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus, Pencil, Trash2, Power, TrendingUp, TrendingDown, ShieldAlert, Download,
  SlidersHorizontal, RefreshCw, Pause, Play, RotateCcw,
} from 'lucide-react';
import { api, fmtUsd, fmtNum, fmtDate } from '../api';
import {
  SectionTitle, Badge, Button, Table, Td, Spinner, Empty, Modal,
  Field, inputCls, useToast, StatCard, Card,
} from '../ui';
import type { Role } from '../types';
import {
  TRADING_MARKETS, MARKET_BY_ID, formatInstrumentPrice, priceStep, TRADE_QUOTE_ASSET,
} from '../../data/tradeCatalog';
import type { MarketCategory } from '../../types/stakingPro';

const canWrite = (role: Role) => role === 'super_admin' || role === 'finance_ops';

interface Asset {
  id: string; symbol: string; name: string; network: string; currentPrice: number;
  change24h: number; minPositionUsd: number; maxLeverage: number; fundingRate8h: number;
  fundingDirection: 'pay' | 'receive'; spread: number; makerFeePercent: number;
  takerFeePercent: number; enabled: boolean; updatedAt: number;
  // Trade Pro market metadata. Legacy rows without a category are treated as crypto.
  category?: MarketCategory; ticker?: string; pricePrecision?: number;
  productType?: string; tradingHours?: string;
  // Operator price control: 'auto' follows the live feed (+ bias), 'manual' is frozen.
  priceMode?: 'auto' | 'manual'; biasPercent?: number;
  providerPrice?: number; providerChange?: number; providerAt?: number;
}
interface PriceSync {
  enabled: boolean; intervalMinutes: number; lastRunAt?: number;
  lastStatus?: string; lastError?: string;
}
interface Position {
  id: string; userId: string; walletPrimary: string; email: string; address: string;
  assetId: string; assetSymbol: string; assetName: string; direction: 'long' | 'short';
  executionType: 'market' | 'limit'; entryPrice: number; currentPrice: number;
  positionSizeUsd: number; collateralUsd: number; leverage: number; takeProfitPrice: number;
  stopLossPrice: number; liquidationPrice: number; openingFeeUsd: number; estClosingFeeUsd: number;
  accruedFundingUsd: number; openedAt: number; closedAt?: number; closePrice?: number;
  realizedPnlUsd?: number; status: string; source: string; openedBy: string;
  category?: MarketCategory; ticker?: string; pricePrecision?: number;
}
interface UserRow { id: string; email: string; address: string; balanceUsd: number; status: string; }

const marketOf = (a: { category?: MarketCategory }) => MARKET_BY_ID[a.category || 'crypto'];
/** Display price with the instrument's own precision (Forex pairs need 3-5 digits). */
const dispPrice = (value: number, precision?: number) => formatInstrumentPrice(value, precision ?? 2);
/** Label used everywhere a position/instrument is named: "BTC/USDT" + market. */
const instrLabel = (x: { ticker?: string; assetSymbol?: string; symbol?: string }) =>
  x.ticker || `${(x.assetSymbol || x.symbol || '').toUpperCase()}/${TRADE_QUOTE_ASSET}`;

// Net PnL for an open position — mirrors the server computation for a live preview.
function netPnl(p: { direction: string; entryPrice: number; currentPrice: number; leverage: number; collateralUsd: number; openingFeeUsd: number; estClosingFeeUsd: number; accruedFundingUsd: number }) {
  const diff = p.direction === 'long' ? p.currentPrice - p.entryPrice : p.entryPrice - p.currentPrice;
  const rawPct = (diff / (p.entryPrice || 1)) * p.leverage;
  return p.collateralUsd * rawPct - p.openingFeeUsd - p.estClosingFeeUsd - p.accruedFundingUsd;
}

export const StakingProScreen: React.FC<{ role: Role }> = ({ role }) => {
  const [tab, setTab] = useState<'positions' | 'catalog' | 'markets'>('positions');
  const [assets, setAssets] = useState<Asset[] | null>(null);
  const [positions, setPositions] = useState<Position[] | null>(null);
  const [priceSync, setPriceSync] = useState<PriceSync | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<'open' | 'closed' | 'all'>('open');
  const [marketFilter, setMarketFilter] = useState<MarketCategory | 'all'>('all');
  const [assetEdit, setAssetEdit] = useState<Asset | 'new' | null>(null);
  const [priceTarget, setPriceTarget] = useState<Asset | null>(null);
  const [openPos, setOpenPos] = useState(false);
  const [adjust, setAdjust] = useState<Position | null>(null);
  const [closeTarget, setCloseTarget] = useState<Position | null>(null);
  const toast = useToast();
  const writable = canWrite(role);

  const load = () => {
    api.get<{ assets: Asset[]; positions: Position[]; priceSync?: PriceSync }>('/staking-pro')
      .then((r) => { setAssets(r.assets); setPositions(r.positions); setPriceSync(r.priceSync || null); })
      .catch((e) => toast.show(e.message, 'red'));
  };

  useEffect(() => {
    load();
    api.get<{ users: UserRow[] }>('/users').then((r) => setUsers(r.users.filter((u) => u.status === 'active'))).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const inMarket = (c?: MarketCategory) => marketFilter === 'all' || (c || 'crypto') === marketFilter;

  const shown = useMemo(() => {
    if (!positions) return [];
    return positions
      .filter((p) => (statusFilter === 'all' ? true : statusFilter === 'open' ? p.status === 'open' : p.status !== 'open'))
      .filter((p) => inMarket(p.category));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positions, statusFilter, marketFilter]);

  const shownAssets = useMemo(() => (assets || []).filter((a) => inMarket(a.category)), [assets, marketFilter]);

  const openPositions = positions?.filter((p) => p.status === 'open') || [];
  const totalCollateral = openPositions.reduce((s, p) => s + p.collateralUsd, 0);
  const totalPnl = openPositions.reduce((s, p) => s + netPnl(p), 0);

  if (!assets || !positions) return <Spinner />;

  return (
    <div>
      <SectionTitle
        title="Trade Pro / Управление"
        subtitle="Каталог торговых инструментов по рынкам и позиции клиентов. Обеспечение всегда в USDT. Всё настраивается здесь и сразу видно пользователям в приложении; обеспечение резервируется/возвращается через журнал и фиксируется в аудите."
        action={writable && (
          <div className="flex gap-2 flex-wrap">
            {([['positions', 'Позиции'], ['catalog', 'Каталог'], ['markets', 'Управление ценами']] as const).map(([key, label]) => (
              <Button key={key} variant={tab === key ? 'primary' : 'outline'} size="sm" onClick={() => setTab(key)}>{label}</Button>
            ))}
            {tab === 'positions' && <Button variant="outline" size="sm" onClick={() => exportCsv(shown)}><Download className="w-4 h-4" /> CSV</Button>}
            {tab === 'positions'
              ? <>
                  <Button variant="outline" size="sm" onClick={() => runSweep(load, toast.show)}><ShieldAlert className="w-4 h-4" /> Проверить ликвидации</Button>
                  <Button size="sm" onClick={() => setOpenPos(true)}><Plus className="w-4 h-4" /> Открыть позицию</Button>
                </>
              : tab === 'catalog'
                ? <Button size="sm" onClick={() => setAssetEdit('new')}><Plus className="w-4 h-4" /> Добавить актив</Button>
                : <Button size="sm" onClick={() => runSync(load, toast.show)}><RefreshCw className="w-4 h-4" /> Обновить котировки</Button>}
          </div>
        )}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <StatCard label="Открытых позиций" value={openPositions.length} />
        <StatCard label="Обеспечение (Hold)" value={fmtUsd(totalCollateral)} />
        <StatCard label="Плавающий PnL" value={fmtUsd(totalPnl)} tone={totalPnl >= 0 ? 'text-emerald-600' : 'text-rose-600'} />
        <StatCard label="Инструментов в каталоге" value={`${assets.filter((a) => a.enabled).length} / ${assets.length}`} />
      </div>

      {/* Market filter — same control for positions and catalog. */}
      <div className="flex flex-wrap gap-2 mb-4">
        <MarketChip active={marketFilter === 'all'} onClick={() => setMarketFilter('all')} label="Все рынки" />
        {TRADING_MARKETS.map((m) => (
          <MarketChip
            key={m.id}
            active={marketFilter === m.id}
            onClick={() => setMarketFilter(m.id)}
            label={`${m.label} (${assets.filter((a) => (a.category || 'crypto') === m.id).length})`}
            pending={m.providerStatus === 'pending'}
          />
        ))}
      </div>
      {marketFilter === 'stocks' && (
        <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-3">
          По акциям нужно зафиксировать тип продукта (CFD / токенизированная акция / иной разрешённый инструмент) — см. поле «Тип продукта» у инструмента.
        </div>
      )}
      {marketFilter !== 'all' && marketFilter !== 'crypto' && (
        <div className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 mb-3">
          {marketOf({ category: marketFilter }).provider}. Наличие USDT на балансе само по себе не даёт доступ к рынку — инструменты остаются отключены, пока провайдер и условия не подтверждены.
        </div>
      )}

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
            <Table columns={['Пользователь', 'Инструмент', 'Направление', 'Размер', 'Обеспеч.', 'Вход / Сейчас', 'PnL', 'TP / SL', 'Статус', '']}>
              {shown.map((p) => {
                const pnl = p.status === 'open' ? netPnl(p) : (p.realizedPnlUsd ?? 0);
                const isLong = p.direction === 'long';
                const prec = p.pricePrecision;
                return (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <Td>
                      <div className="text-sm font-semibold text-slate-800">{p.email}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{p.address?.slice(0, 12)}…</div>
                      <div className="text-[10px] text-slate-400">{p.source === 'admin' ? `открыл: ${p.openedBy}` : 'сам клиент'} · {fmtDate(p.openedAt)}</div>
                    </Td>
                    <Td className="font-semibold">
                      <div>{instrLabel(p)}</div>
                      <div className="text-[10px] font-normal text-slate-400">{marketOf(p).label}</div>
                    </Td>
                    <Td>
                      <span className={`inline-flex items-center gap-1 text-xs font-bold ${isLong ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {isLong ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                        {isLong ? 'LONG' : 'SHORT'} {p.leverage}x
                      </span>
                    </Td>
                    <Td className="font-mono">{fmtUsd(p.positionSizeUsd)}</Td>
                    <Td className="font-mono text-slate-600">{fmtUsd(p.collateralUsd)}</Td>
                    <Td className="font-mono text-xs">
                      <div>${dispPrice(p.entryPrice, prec)}</div>
                      <div className="text-slate-400">→ ${dispPrice(p.currentPrice, prec)}</div>
                    </Td>
                    <Td className={`font-mono font-bold ${pnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{pnl >= 0 ? '+' : ''}{fmtUsd(pnl)}</Td>
                    <Td className="font-mono text-[11px]">
                      <div className="text-emerald-600">TP ${dispPrice(p.takeProfitPrice, prec)}</div>
                      <div className="text-rose-600">SL ${dispPrice(p.stopLossPrice, prec)}</div>
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
      ) : tab === 'catalog' ? (
        <div>
          <Table columns={['Инструмент', 'Рынок', 'Цена', 'Режим цены', '24ч', 'Мин. позиция', 'Плечо', 'Funding/8ч', 'Комис. taker', 'Доступен', '']}>
            {shownAssets.map((a) => (
              <tr key={a.id} className="hover:bg-slate-50">
                <Td>
                  <div className="font-bold text-slate-800">{a.ticker || `${a.symbol}/${TRADE_QUOTE_ASSET}`}</div>
                  <div className="text-[11px] text-slate-400">{a.name}</div>
                </Td>
                <Td className="text-xs text-slate-500">
                  <div>{marketOf(a).label}</div>
                  {marketOf(a).providerStatus === 'pending' && <Badge tone="amber">нет провайдера</Badge>}
                </Td>
                <Td className="font-mono">
                  <div>${dispPrice(a.currentPrice, a.pricePrecision)}</div>
                  {!!a.biasPercent && a.priceMode !== 'manual' && (
                    <div className={`text-[10px] font-normal ${a.biasPercent > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>смещение {a.biasPercent > 0 ? '+' : ''}{a.biasPercent}%</div>
                  )}
                </Td>
                <Td className="text-[11px]">
                  <button type="button" onClick={() => writable && setPriceTarget(a)} className="text-left">
                    <Badge tone={a.priceMode === 'manual' ? 'amber' : 'blue'}>
                      {a.priceMode === 'manual' ? 'ручная' : 'авто · провайдер'}
                    </Badge>
                  </button>
                  {a.providerAt && a.priceMode !== 'manual' && (
                    <div className="text-slate-400 mt-0.5">котировка {fmtDate(a.providerAt)}</div>
                  )}
                </Td>
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
                      <Button size="sm" variant="outline" title="Настроить цену" onClick={() => setPriceTarget(a)}><SlidersHorizontal className="w-3.5 h-3.5" /></Button>
                      <Button size="sm" variant="outline" onClick={() => setAssetEdit(a)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => removeAsset(a, () => load(), toast.show)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  )}
                </Td>
              </tr>
            ))}
          </Table>
          <p className="text-[11px] text-slate-400 mt-3">
            <Power className="w-3 h-3 inline mr-1" /> Выключенный инструмент исчезает из приложения у всех пользователей, но открытые по нему позиции сохраняются. Каталог пополняется автоматически из списка торговых инструментов при старте сервера — правки оператора не перезаписываются.
          </p>
        </div>
      ) : (
        <MarketsTab
          assets={assets}
          priceSync={priceSync}
          writable={writable}
          reload={load}
          show={toast.show}
          onEditPrice={setPriceTarget}
        />
      )}

      {openPos && <OpenPositionModal users={users} assets={assets} onClose={() => setOpenPos(false)} onDone={() => { setOpenPos(false); load(); toast.show('Позиция открыта, обеспечение зарезервировано'); }} />}
      {adjust && <AdjustModal pos={adjust} onClose={() => setAdjust(null)} onDone={() => { setAdjust(null); load(); toast.show('Уровни TP/SL обновлены'); }} />}
      {closeTarget && <CloseModal pos={closeTarget} onClose={() => setCloseTarget(null)} onDone={() => { setCloseTarget(null); load(); toast.show('Позиция закрыта, обеспечение возвращено'); }} />}
      {assetEdit && <AssetModal asset={assetEdit} onClose={() => setAssetEdit(null)} onDone={() => { setAssetEdit(null); load(); toast.show('Каталог обновлён'); }} />}
      {priceTarget && <PriceModal asset={priceTarget} onClose={() => setPriceTarget(null)} onDone={() => { setPriceTarget(null); load(); toast.show('Цена обновлена — пользователи видят её сразу'); }} />}
      {toast.node}
    </div>
  );
};

export const MarketChip: React.FC<{ active: boolean; label: string; pending?: boolean; onClick: () => void }> = ({ active, label, pending, onClick }) => (
  <button onClick={onClick}
    className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${active ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>
    {label}{pending && !active && <span className="ml-1 text-[10px] text-amber-600">•</span>}
  </button>
);

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

async function runSync(reload: () => void, show: (t: string, tone?: 'green' | 'red') => void) {
  try {
    const r = await api.post('/staking-pro/price-sync/run', { reason: 'Ручное обновление котировок из админки' });
    show(`Котировки обновлены: ${r.priceSync?.lastStatus || 'ответ провайдера получен'}`, 'green');
    reload();
  } catch (e: any) { show(e.message, 'red'); }
}

async function patchSync(body: Record<string, unknown>, reload: () => void, show: (t: string, tone?: 'green' | 'red') => void, ok: string) {
  try { await api.patch('/staking-pro/price-sync', body); show(ok); reload(); }
  catch (e: any) { show(e.message, 'red'); }
}

async function nudgeMarket(category: string, deltaPercent: number, reload: () => void, show: (t: string, tone?: 'green' | 'red') => void) {
  try {
    const r = await api.post('/staking-pro/markets/price', { category, deltaPercent, reason: `Корректировка рынка ${deltaPercent > 0 ? '+' : ''}${deltaPercent}%` });
    show(`${deltaPercent > 0 ? 'Подняли' : 'Опустили'} рынок на ${Math.abs(deltaPercent)}% — затронуто инструментов: ${r.updated}`, 'green');
    reload();
  } catch (e: any) { show(e.message, 'red'); }
}

async function setMarketMode(category: string, priceMode: 'auto' | 'manual', reload: () => void, show: (t: string, tone?: 'green' | 'red') => void) {
  try {
    const r = await api.post('/staking-pro/markets/price', { category, priceMode, reason: `Рынок переведён в режим ${priceMode}` });
    show(`Режим «${priceMode === 'manual' ? 'ручные цены' : 'авто по провайдеру'}» применён к ${r.updated} инструментам`, 'green');
    reload();
  } catch (e: any) { show(e.message, 'red'); }
}

function exportCsv(positions: Position[]) {
  const cols = ['id', 'email', 'address', 'assetSymbol', 'ticker', 'category', 'direction', 'leverage', 'positionSizeUsd', 'collateralUsd', 'entryPrice', 'currentPrice', 'takeProfitPrice', 'stopLossPrice', 'liquidationPrice', 'realizedPnlUsd', 'status', 'source', 'openedBy'];
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
  if (!window.confirm(`Удалить инструмент ${a.ticker || a.symbol} из каталога?`)) return;
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
  const prec = asset?.pricePrecision ?? 2;
  const entry = asset?.currentPrice || 0;
  const lev = Math.max(1, Math.min(f.leverage, asset?.maxLeverage || 10));
  const collateral = lev > 0 ? (f.positionSizeUsd || 0) / lev : 0;
  const liq = asset ? (f.direction === 'long' ? entry * (1 - (1 / lev) * 0.9) : entry * (1 + (1 / lev) * 0.9)) : 0;
  const user = users.find((u) => u.id === f.userId);

  // Instruments grouped by market, so the operator sees the same 5 markets as the user.
  const groupedMarkets = TRADING_MARKETS
    .map((m) => ({ market: m, rows: enabledAssets.filter((a) => (a.category || 'crypto') === m.id) }))
    .filter((g) => g.rows.length > 0);

  // Sensible default TP/SL when asset/direction changes.
  useEffect(() => {
    if (!asset) return;
    const p = asset.pricePrecision ?? 2;
    if (f.direction === 'long') { setF((s) => ({ ...s, takeProfitPrice: (asset.currentPrice * 1.08).toFixed(p), stopLossPrice: (asset.currentPrice * 0.95).toFixed(p) })); }
    else { setF((s) => ({ ...s, takeProfitPrice: (asset.currentPrice * 0.92).toFixed(p), stopLossPrice: (asset.currentPrice * 1.05).toFixed(p) })); }
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
    <Modal open onClose={onClose} title="Открыть Trade Pro позицию для пользователя" wide>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Пользователь">
            <select className={inputCls} value={f.userId} onChange={(e) => setF({ ...f, userId: e.target.value })}>
              {users.map((u) => <option key={u.id} value={u.id}>{u.email} · {fmtUsd(u.balanceUsd)}</option>)}
            </select>
          </Field>
          <Field label="Инструмент (рынок → тикер)">
            <select className={inputCls} value={f.assetId} onChange={(e) => setF({ ...f, assetId: e.target.value })}>
              {groupedMarkets.map((g) => (
                <optgroup key={g.market.id} label={`${g.market.label} — ${g.market.providerStatus === 'pending' ? 'провайдер не подключён' : 'live'}`}>
                  {g.rows.map((a) => <option key={a.id} value={a.id}>{a.ticker || a.symbol} · ${dispPrice(a.currentPrice, a.pricePrecision)} (до {a.maxLeverage}x)</option>)}
                </optgroup>
              ))}
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

        <Field label="Номинальный размер позиции (USDT)" hint={`Минимум инструмента: ${asset?.minPositionUsd} USDT · обеспечение списывается из USDT`}>
          <input type="number" min={asset?.minPositionUsd || 1} className={inputCls} value={f.positionSizeUsd} onChange={(e) => setF({ ...f, positionSizeUsd: Number(e.target.value) })} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Тейк-профит (цена)">
            <input type="number" step={priceStep(prec)} className={inputCls} value={f.takeProfitPrice} onChange={(e) => setF({ ...f, takeProfitPrice: e.target.value })} />
          </Field>
          <Field label="Стоп-лосс (цена)">
            <input type="number" step={priceStep(prec)} className={inputCls} value={f.stopLossPrice} onChange={(e) => setF({ ...f, stopLossPrice: e.target.value })} />
          </Field>
        </div>

        <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 text-sm grid grid-cols-3 gap-2">
          <div><div className="text-[11px] text-slate-500">Цена входа</div><div className="font-mono font-bold">${dispPrice(entry, prec)}</div></div>
          <div><div className="text-[11px] text-slate-500">Нужно обеспечения</div><div className="font-mono font-bold text-violet-700">{fmtUsd(collateral)}</div></div>
          <div><div className="text-[11px] text-slate-500">Цена ликвидации</div><div className="font-mono font-bold text-rose-600">${dispPrice(liq, prec)}</div></div>
          {asset && (
            <div className="col-span-3 text-[11px] text-slate-500 border-t border-violet-200 pt-2">
              Рынок: {marketOf(asset).label} · Тип продукта: {asset.productType || marketOf(asset).productType} · Часы: {asset.tradingHours || marketOf(asset).tradingHours}
            </div>
          )}
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
    <Modal open onClose={onClose} title={`Изменить TP / SL — ${instrLabel(pos)} ${pos.direction.toUpperCase()}`}>
      <form onSubmit={submit} className="space-y-4">
        <div className="text-sm text-slate-500">Цена входа: <span className="font-mono">${dispPrice(pos.entryPrice, pos.pricePrecision)}</span> · {pos.direction === 'long' ? 'TP выше входа, SL ниже' : 'TP ниже входа, SL выше'}</div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Новый тейк-профит"><input type="number" step={priceStep(pos.pricePrecision ?? 2)} className={inputCls} value={tp} onChange={(e) => setTp(e.target.value)} /></Field>
          <Field label="Новый стоп-лосс"><input type="number" step={priceStep(pos.pricePrecision ?? 2)} className={inputCls} value={sl} onChange={(e) => setSl(e.target.value)} /></Field>
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
    <Modal open onClose={onClose} title={`Закрыть позицию — ${instrLabel(pos)} ${pos.direction.toUpperCase()} ${pos.leverage}x`}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-3 gap-2 text-sm bg-slate-50 border border-slate-200 rounded-xl p-3">
          <div><div className="text-[11px] text-slate-500">Текущая цена</div><div className="font-mono font-bold">${dispPrice(pos.currentPrice, pos.pricePrecision)}</div></div>
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
    category: (a?.category || 'crypto') as MarketCategory, ticker: a?.ticker || '', pricePrecision: a?.pricePrecision ?? 2,
    productType: a?.productType || '', tradingHours: a?.tradingHours || '',
    currentPrice: a?.currentPrice ?? 0, change24h: a?.change24h ?? 0, minPositionUsd: a?.minPositionUsd ?? 10,
    maxLeverage: a?.maxLeverage ?? 10, fundingRate8h: a?.fundingRate8h ?? 0.01, fundingDirection: a?.fundingDirection || 'pay',
    spread: a?.spread ?? 0, makerFeePercent: a?.makerFeePercent ?? 0.02, takerFeePercent: a?.takerFeePercent ?? 0.05,
    enabled: a?.enabled ?? true, reason: '',
  });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Switching market adopts that market's product terms unless the operator already set them.
  const pickMarket = (m: MarketCategory) => {
    const meta = MARKET_BY_ID[m];
    setF((s) => ({
      ...s,
      category: m,
      network: s.network === meta.label ? meta.title : s.network,
      productType: s.productType || meta.productType,
      tradingHours: s.tradingHours || meta.tradingHours,
    }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(null);
    // Empty optional text fields are dropped so the server keeps its own defaults.
    const { ticker, productType, tradingHours, ...rest } = f;
    const payload: Record<string, unknown> = { ...rest };
    if (ticker?.trim()) payload.ticker = ticker.trim();
    if (productType?.trim()) payload.productType = productType.trim();
    if (tradingHours?.trim()) payload.tradingHours = tradingHours.trim();
    try {
      if (isNew) await api.post('/staking-pro/assets', payload);
      else await api.patch(`/staking-pro/assets/${a!.id}`, { ...payload, reason: f.reason || `Изменение актива ${f.symbol} в каталоге` });
      onDone();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title={isNew ? 'Добавить инструмент в каталог Trade Pro' : `Редактировать ${a?.ticker || a?.symbol}`} wide>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Рынок">
            <select className={inputCls} value={f.category} onChange={(e) => pickMarket(e.target.value as MarketCategory)}>
              {TRADING_MARKETS.map((m) => <option key={m.id} value={m.id}>{m.label} ({m.subtitle})</option>)}
            </select>
          </Field>
          <Field label="Символ"><input className={inputCls} value={f.symbol} onChange={(e) => setF({ ...f, symbol: e.target.value })} placeholder="BTC" /></Field>
          <Field label="Тикер" hint={`Остав пустым — будет ${f.symbol?.toUpperCase() || 'SYMBOL'}/${TRADE_QUOTE_ASSET}`}>
            <input className={inputCls} value={f.ticker} onChange={(e) => setF({ ...f, ticker: e.target.value })} placeholder="BTC/USDT" />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Название"><input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Bitcoin" /></Field>
          <Field label="Сегмент / сеть"><input className={inputCls} value={f.network} onChange={(e) => setF({ ...f, network: e.target.value })} /></Field>
          <Field label="Знаков в цене" hint="Форекс/JPY требует 3–5 знаков">
            <input type="number" min={0} max={8} className={inputCls} value={f.pricePrecision} onChange={(e) => setF({ ...f, pricePrecision: Number(e.target.value) })} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Тип продукта">
            <input className={inputCls} value={f.productType} onChange={(e) => setF({ ...f, productType: e.target.value })} placeholder={MARKET_BY_ID[f.category].productType} />
          </Field>
          <Field label="Часы торгов">
            <input className={inputCls} value={f.tradingHours} onChange={(e) => setF({ ...f, tradingHours: e.target.value })} placeholder={MARKET_BY_ID[f.category].tradingHours} />
          </Field>
        </div>
        {f.category !== 'crypto' && (
          <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            {MARKET_BY_ID[f.category].provider}. Включение этого инструмента без подтверждённого провайдера делает рынок доступным для открытия позиций — подтвердите тикеры, часы, комиссии и правила ликвидации до включения.
          </div>
        )}
        <div className="grid grid-cols-3 gap-3">
          <Field label="Текущая цена (USD)"><input type="number" step={priceStep(f.pricePrecision || 2)} className={inputCls} value={f.currentPrice} onChange={(e) => setF({ ...f, currentPrice: Number(e.target.value) })} /></Field>
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

// ------------------------------------------------------- Price management tab
type Show = (t: string, tone?: 'green' | 'red') => void;

const MarketPriceCard: React.FC<{
  market: (typeof TRADING_MARKETS)[number];
  rows: Asset[];
  writable: boolean;
  reload: () => void;
  show: Show;
  onEditPrice: (a: Asset) => void;
}> = ({ market, rows, writable, reload, show, onEditPrice }) => {
  const [custom, setCustom] = useState('1');
  const auto = rows.filter((a) => a.priceMode !== 'manual');
  const manual = rows.filter((a) => a.priceMode === 'manual');
  const avgBias = auto.length ? auto.reduce((s, a) => s + (a.biasPercent || 0), 0) / auto.length : 0;
  const delta = Number(custom) || 0;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <div className="text-sm font-bold text-slate-800">{market.icon} {market.label} <span className="text-slate-400 font-medium">({market.subtitle})</span></div>
          <div className="text-[11px] text-slate-500 mt-0.5">{market.provider}</div>
        </div>
        <Badge tone={market.providerStatus === 'live' ? 'green' : 'amber'}>{market.providerStatus === 'live' ? 'live feed' : 'нет провайдера'}</Badge>
      </div>

      <div className="text-[11px] text-slate-500 mb-3">
        Инструментов: <b>{rows.length}</b> · на авто: <b>{auto.length}</b> · вручную: <b>{manual.length}</b>
        {auto.length > 0 && <> · среднее смещение: <b className={avgBias >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{avgBias > 0 ? '+' : ''}{avgBias.toFixed(2)}%</b></>}
      </div>

      {rows.length === 0 ? <div className="text-[11px] text-slate-400">В этом рынке пока нет инструментов.</div> : (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {[-5, -1, 5].map((d) => (
              <button key={d} type="button" disabled={!writable} onClick={() => nudgeMarket(market.id, d, reload, show)}
                className={`text-xs font-bold px-2.5 py-1.5 rounded-lg border ${d > 0 ? 'text-emerald-700 border-emerald-300 bg-emerald-50 hover:bg-emerald-100' : 'text-rose-700 border-rose-300 bg-rose-50 hover:bg-rose-100'} disabled:opacity-40`}>
                {d > 0 ? `+${d}%` : `${d}%`}
              </button>
            ))}
            <input type="number" step="0.1" className={`${inputCls} !w-20 !py-1.5 text-xs`} value={custom} onChange={(e) => setCustom(e.target.value)} />
            <Button size="sm" variant="outline" disabled={!writable || !delta} onClick={() => nudgeMarket(market.id, delta, reload, show)}>
              Сдвинуть рынок
            </Button>
            <Button size="sm" variant="ghost" disabled={!writable} title="Сбросить ручные смещения всех инструментов рынка"
              onClick={() => api.post('/staking-pro/markets/price', { category: market.id, biasPercent: 0, reason: 'Сброс смещений на рынке' }).then(() => { show('Смещения сброшены — цены вернулись к котировкам провайдера', 'green'); reload(); }).catch((e: any) => show(e.message, 'red'))}>
              <RotateCcw className="w-3.5 h-3.5" /> Сброс
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Button size="sm" variant="outline" disabled={!writable} onClick={() => setMarketMode(market.id, 'auto', reload, show)}>Весь рынок на авто</Button>
            <Button size="sm" variant="outline" disabled={!writable} onClick={() => setMarketMode(market.id, 'manual', reload, show)}>Весь рынок на ручные цены</Button>
          </div>
          <div className="grid grid-cols-2 gap-1 mt-1 max-h-36 overflow-y-auto">
            {rows.map((a) => (
              <button key={a.id} type="button" onClick={() => onEditPrice(a)}
                className="text-left text-[11px] px-2 py-1.5 rounded-lg border border-slate-200 hover:border-violet-300 hover:bg-violet-50 flex items-center justify-between gap-2">
                <span className="font-semibold text-slate-700 truncate">{a.ticker || a.symbol}</span>
                <span className="font-mono text-slate-500 shrink-0">
                  ${dispPrice(a.currentPrice, a.pricePrecision)}
                  {a.priceMode === 'manual' && <span className="text-amber-600 ml-1">P</span>}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};

// Synthetic card that targets the whole catalog at once.
const ALL_MARKETS_CARD = {
  id: 'all', label: 'Все рынки', title: 'Все рынки', subtitle: 'All markets', icon: '🌐',
  provider: 'Binance + Yahoo Finance + Frankfurter (ECB) одновременно', providerStatus: 'live',
} as unknown as (typeof TRADING_MARKETS)[number];

const MarketsTab: React.FC<{
  assets: Asset[];
  priceSync: PriceSync | null;
  writable: boolean;
  reload: () => void;
  show: Show;
  onEditPrice: (a: Asset) => void;
}> = ({ assets, priceSync, writable, reload, show, onEditPrice }) => {
  const [busy, setBusy] = useState(false);

  const toggleFeed = async () => {
    if (!priceSync) return;
    setBusy(true);
    await patchSync({ enabled: !priceSync.enabled, reason: priceSync.enabled ? 'Автообновление котировок приостановлено' : 'Автообновление котировок включено' }, reload, show,
      priceSync.enabled ? 'Живые котировки приостановлены — цены заморозаны на текущих значениях' : 'Живые котировки снова обновляются автоматически');
    setBusy(false);
  };

  const setIntervalMinutes = (v: number) =>
    patchSync({ intervalMinutes: v, reason: `Интервал обновления котировок: ${v} мин` }, reload, show, `Интервал обновления: ${v} мин`);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-bold text-slate-800">Живые котировки и ручное управление рынками</div>
            <div className="text-[11px] text-slate-500 mt-1 max-w-3xl">
              Провайдеры без ключей: Binance (крипто), Yahoo Finance (индексы, акции, сырьё), Frankfurter/ECB (форекс).
              Смещение (%) работает поверх котировки — рынок «едет» по рынку, но с вашей поправкой. Ручной режим полностью
              замораживает инструмент: автосинхронизация его не перезапишет. Всё применяется моментально и видно всем пользователям.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={priceSync?.enabled ? 'green' : 'amber'}>{priceSync?.enabled ? 'авто-фид включён' : 'авто-фид выключен'}</Badge>
            <Button size="sm" variant="outline" disabled={!writable || busy} onClick={toggleFeed}>
              {priceSync?.enabled ? <><Pause className="w-3.5 h-3.5" /> Пауза</> : <><Play className="w-3.5 h-3.5" /> Включить</>}
            </Button>
            <Button size="sm" disabled={!writable || busy} onClick={() => runSync(reload, show)}><RefreshCw className="w-3.5 h-3.5" /> Обновить сейчас</Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-3 text-[11px] text-slate-500">
          <span>Интервал:</span>
          {[1, 2, 5, 15, 30, 60].map((v) => (
            <button key={v} type="button" disabled={!writable} onClick={() => setIntervalMinutes(v)}
              className={`px-2 py-1 rounded-lg border text-xs font-semibold ${priceSync?.intervalMinutes === v ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>
              {v} мин
            </button>
          ))}
          <span className="ml-auto">Последнее обновление: <b>{priceSync?.lastRunAt ? fmtDate(priceSync.lastRunAt) : '—'}</b></span>
        </div>
        {priceSync?.lastStatus && <div className="text-[11px] text-slate-500 mt-1">{priceSync.lastStatus}</div>}
        {priceSync?.lastError && <div className="text-[11px] text-rose-600 mt-1">Ошибка фида: {priceSync.lastError}</div>}
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <MarketPriceCard market={ALL_MARKETS_CARD} rows={assets} writable={writable} reload={reload} show={show} onEditPrice={onEditPrice} />
        {TRADING_MARKETS.map((m) => (
          <MarketPriceCard key={m.id} market={m} rows={assets.filter((a) => (a.category || 'crypto') === m.id)}
            writable={writable} reload={reload} show={show} onEditPrice={onEditPrice} />
        ))}
      </div>
      <p className="text-[11px] text-slate-400">
        Первая карточка — «Все рынки сразу»: сдвиг на ней влияет на каждый инструмент каталога. Изменения цен фиксируются в аудите с причиной.
      </p>
    </div>
  );
};

// ------------------------------------------------------------------ Price modal
const PriceModal: React.FC<{ asset: Asset; onClose: () => void; onDone: () => void }> = ({ asset, onClose, onDone }) => {
  const [a, setA] = useState(asset);
  const [price, setPrice] = useState(String(asset.currentPrice));
  const [change, setChange] = useState(String(asset.change24h ?? 0));
  const [bias, setBias] = useState(String(asset.biasPercent ?? 0));
  const [manual, setManual] = useState(asset.priceMode === 'manual');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const prec = a.pricePrecision ?? 2;

  const send = async (body: Record<string, unknown>, okMsg?: string) => {
    setBusy(true); setErr(null);
    try {
      const r = await api.post(`/staking-pro/assets/${a.id}/price`, { ...body, reason: body.reason || 'Ручная корректировка цены из админки' });
      setA(r.asset);
      setPrice(String(r.asset.currentPrice));
      setChange(String(r.asset.change24h ?? 0));
      setBias(String(r.asset.biasPercent ?? 0));
      setManual(r.asset.priceMode === 'manual');
      if (okMsg) onDone();
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} title={`Цена ${a.ticker || a.symbol} — ${marketOf(a).label}`}>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2 text-sm bg-slate-50 border border-slate-200 rounded-xl p-3">
          <div><div className="text-[11px] text-slate-500">Цена для пользователей</div><div className="font-mono font-bold">${dispPrice(a.currentPrice, prec)}</div></div>
          <div><div className="text-[11px] text-slate-500">Котировка провайдера</div><div className="font-mono">{a.providerPrice ? `$${dispPrice(a.providerPrice, prec)}` : '—'}</div></div>
          <div><div className="text-[11px] text-slate-500">Изменение 24ч</div><div className={`font-mono ${a.change24h >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{a.change24h >= 0 ? '+' : ''}{a.change24h}%</div></div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => send({ priceMode: 'auto' })}
            className={`py-2 rounded-xl text-sm font-bold border ${!manual ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-slate-500 border-slate-300'}`}>
            Авто по провайдеру
          </button>
          <button type="button" onClick={() => send({ priceMode: 'manual', price: a.currentPrice })}
            className={`py-2 rounded-xl text-sm font-bold border ${manual ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-slate-500 border-slate-300'}`}>
            Ручная цена
          </button>
        </div>

        <div>
          <div className="text-xs font-semibold text-slate-600 mb-1">Сдвинуть цену прямо сейчас</div>
          <div className="flex flex-wrap gap-1.5">
            {[-5, -2, -1, -0.5, 0.5, 1, 2, 5].map((d) => (
              <button key={d} type="button" disabled={busy} onClick={() => send({ deltaPercent: d })}
                className={`text-xs font-bold px-2.5 py-1.5 rounded-lg border ${d > 0 ? 'text-emerald-700 border-emerald-300 bg-emerald-50 hover:bg-emerald-100' : 'text-rose-700 border-rose-300 bg-rose-50 hover:bg-rose-100'}`}>
                {d > 0 ? `+${d}%` : `${d}%`}
              </button>
            ))}
          </div>
          <div className="text-[11px] text-slate-400 mt-1.5">
            {manual
              ? 'Ручной режим: сдвиг меняет саму цену, провайдер её не перезапишет.'
              : 'Авто-режим: сдвиг копится в смещении, поэтому котировка провайдера продолжает жить, но с вашей поправкой.'}
          </div>
        </div>

        {!manual && (
          <Field label="Смещение к котировке (%)" hint="0 — цена ровно как у провайдера">
            <div className="flex gap-2">
              <input type="number" step="0.1" className={inputCls} value={bias} onChange={(e) => setBias(e.target.value)} />
              <Button type="button" variant="outline" disabled={busy} onClick={() => send({ biasPercent: Number(bias) || 0 })}>Применить</Button>
            </div>
          </Field>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Задать цену вручную" hint={manual ? 'Применится сразу и заморозит инструмент' : 'Применение переведёт инструмент в ручной режим'}>
            <input type="number" step={priceStep(prec)} className={inputCls} value={price} onChange={(e) => setPrice(e.target.value)} />
          </Field>
          <Field label="Изменение 24ч (%)"><input type="number" step="0.01" className={inputCls} value={change} onChange={(e) => setChange(e.target.value)} /></Field>
        </div>

        {err && <div className="text-sm text-rose-600">{err}</div>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Закрыть</Button>
          <Button type="button" disabled={busy} onClick={() => send({ price: Number(price) || a.currentPrice, change24h: Number(change) || 0, priceMode: 'manual' }, 'saved')}>
            {busy ? 'Сохранение…' : 'Сохранить цену'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
