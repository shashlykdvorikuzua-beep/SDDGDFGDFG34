import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Pencil, Trash2, QrCode, Upload, X, Eye, EyeOff } from 'lucide-react';
import { api, fmtDate } from '../api';
import { SectionTitle, Card, Badge, Button, Table, Td, Spinner, Empty, Modal, Field, inputCls, useToast } from '../ui';
import type { Role } from '../types';

const can = (role: Role) => role === 'super_admin' || role === 'finance_ops';

export interface DepositSetting {
  id: string;
  symbol: string;
  name?: string;
  network: string;
  address: string;
  memo?: string;
  label?: string;
  minDeposit?: number;
  confirmations?: number;
  qrImage: string | null;
  enabled: boolean;
  updatedAt: number;
}

const COMMON_SYMBOLS = ['BTC', 'ETH', 'USDT', 'USDC', 'TRX', 'SOL', 'BNB', 'XRP', 'TON', 'ADA', 'DOGE', 'LTC'];

// Light format sanity-check by network/coin so operators don't save broken addresses.
function validateAddress(network: string, symbol: string, address: string): string | null {
  const a = (address || '').trim();
  if (!a) return 'Укажите адрес';
  const net = (network || '').toLowerCase();
  const sym = (symbol || '').toUpperCase();
  const tron = /tron|trc-20/.test(net) || sym === 'TRX';
  const evm = /erc-20|bnb|polygon|avalanche|arbitrum|optimism|base|ethereum|smart chain|\bevm\b|bsc/.test(net) || (sym === 'USDT' && /eth|erc|bnb|polygon|bsc/.test(net));
  const sol = /solana/.test(net) || sym === 'SOL';
  const xrp = /xrp|ripple/.test(net) || sym === 'XRP';
  const btc = /bitcoin/.test(net) && !/cash/.test(net);
  if (tron) return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(a) ? null : 'Адрес TRON: начинается с «T», всего 34 символа';
  if (evm) return /^0x[0-9a-fA-F]{40}$/.test(a) ? null : 'EVM-адрес: 0x + 40 hex-символов';
  if (sol) return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a) ? null : 'Похоже, это не адрес Solana (base58, 32–44 символа)';
  if (xrp) return /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(a) ? null : 'Адрес XRP: начинается с «r»';
  if (btc) return /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/.test(a) ? null : 'Похоже, это не Bitcoin-адрес';
  return a.replace(/\s/g, '').length >= 20 ? null : 'Слишком короткий адрес — проверьте его';
}
const COMMON_NETWORKS = [
  'Bitcoin', 'Ethereum (ERC-20)', 'BNB Smart Chain (BEP-20)', 'TRON (TRC-20)', 'Solana',
  'Polygon (MATIC)', 'Avalanche (C-Chain)', 'Arbitrum One', 'Optimism', 'Base', 'Cosmos (ATOM)',
  'TON', 'XRP Ledger', 'Litecoin', 'Dogecoin', 'All Networks',
];

export const DepositWalletsScreen: React.FC<{ role: Role }> = ({ role }) => {
  const [rows, setRows] = useState<Record<string, DepositSetting> | null>(null);
  const [edit, setEdit] = useState<DepositSetting | 'new' | null>(null);
  const [q, setQ] = useState('');
  const toast = useToast();
  const writable = can(role);

  const load = () => api.get<{ depositSettings: Record<string, DepositSetting> }>('/deposit-settings').then((r) => setRows(r.depositSettings)).catch((e) => toast.show(e.message, 'red'));
  useEffect(() => { load(); }, []);

  const list = useMemo(() => {
    if (!rows) return [];
    const all = Object.values(rows).sort((a, b) => a.symbol.localeCompare(b.symbol) || a.network.localeCompare(b.network));
    const term = q.trim().toLowerCase();
    return term ? all.filter((s) => s.symbol.toLowerCase().includes(term) || s.network.toLowerCase().includes(term) || s.address.toLowerCase().includes(term)) : all;
  }, [rows, q]);

  // How many networks are configured per coin (for the badge).
  const perSymbol = useMemo(() => {
    const m: Record<string, number> = {};
    Object.values(rows || {}).forEach((s) => { m[s.symbol] = (m[s.symbol] || 0) + 1; });
    return m;
  }, [rows]);

  if (!rows) return <Spinner />;

  const remove = async (s: DepositSetting) => {
    if (!window.confirm(`Удалить кошелёк пополнения ${s.symbol} (${s.network || 'без сети'})?`)) return;
    try { await api.post('/deposit-settings/remove', { id: s.id }); toast.show('Удалено'); load(); }
    catch (e: any) { toast.show(e.message, 'red'); }
  };

  const toggleEnabled = async (s: DepositSetting) => {
    try { await api.patch('/deposit-settings', { ...s, enabled: !s.enabled }); load(); }
    catch (e: any) { toast.show(e.message, 'red'); }
  };

  return (
    <div>
      <SectionTitle
        title="Кошельки пополнения"
        subtitle="Ваши адреса для приёма средств — пользователи видят их в приложении на экране получения. Можно завести несколько сетей для одной монеты и загрузить свой QR-код."
        action={writable && <Button onClick={() => setEdit('new')}><Plus className="w-4 h-4" /> Добавить кошелёк</Button>}
      />

      <Card className="p-4 mb-5 bg-violet-50 border-violet-100">
        <p className="text-sm text-violet-800">
          Один адрес на монету <b>и на сеть</b>. Если <b>QR не загружен</b> — приложение сгенерирует его из адреса.
          Если <b>загрузите своё QR-изображение</b> — пользователям показывается именно оно. Для монет с меткой (XRP, TON, EOS, ATOM) заполните поле «Метка / memo».
        </p>
      </Card>

      <div className="mb-3 max-w-sm">
        <input className={inputCls} placeholder="Поиск: монета, сеть или адрес…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {list.length === 0 ? <Empty text="Кошельки пополнения не настроены. Добавьте адрес, чтобы он отображался пользователям." /> : (
        <Table columns={['Монета', 'Сеть', 'Адрес пополнения', 'QR', 'Условия', 'Виден', 'Обновлён', '']}>
          {list.map((s) => (
            <tr key={s.id} className="hover:bg-slate-50">
              <Td>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-violet-700">{s.symbol}</span>
                  {perSymbol[s.symbol] > 1 && <Badge tone="purple">{perSymbol[s.symbol]} сетей</Badge>}
                </div>
                {s.name && <div className="text-[11px] text-slate-500">{s.name}</div>}
              </Td>
              <Td className="text-xs text-slate-600">{s.network || '—'}</Td>
              <Td className="font-mono text-xs max-w-[240px]">
                <div className="break-all">{s.address}</div>
                {s.memo ? <div className="text-[11px] text-amber-600 break-all">метка: {s.memo}</div> : null}
              </Td>
              <Td>
                {s.qrImage
                  ? <img src={s.qrImage} alt="QR" className="w-12 h-12 rounded-lg object-contain border border-slate-200 bg-white" />
                  : <Badge tone="blue"><QrCode className="w-3 h-3 mr-1 inline" />авто</Badge>}
              </Td>
              <Td className="text-[11px] text-slate-500">
                {s.minDeposit ? <div>мин. {s.minDeposit} {s.symbol}</div> : null}
                {s.confirmations ? <div>{s.confirmations} подтв.</div> : null}
                {s.label ? <div className="text-slate-400">{s.label}</div> : null}
              </Td>
              <Td>
                {writable ? (
                  <button onClick={() => toggleEnabled(s)} title={s.enabled ? 'Скрыть от пользователей' : 'Показать пользователям'}>
                    <Badge tone={s.enabled ? 'green' : 'neutral'}>
                      {s.enabled ? <><Eye className="w-3 h-3 mr-1 inline" />виден</> : <><EyeOff className="w-3 h-3 mr-1 inline" />скрыт</>}
                    </Badge>
                  </button>
                ) : <Badge tone={s.enabled ? 'green' : 'neutral'}>{s.enabled ? 'виден' : 'скрыт'}</Badge>}
              </Td>
              <Td className="text-xs text-slate-400">{fmtDate(s.updatedAt)}</Td>
              <Td>
                {writable && (
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => setEdit(s)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(s)}><Trash2 className="w-3.5 h-3.5 text-rose-500" /></Button>
                  </div>
                )}
              </Td>
            </tr>
          ))}
        </Table>
      )}

      {edit && <DepositModal initial={edit === 'new' ? null : edit} onClose={() => setEdit(null)} onDone={() => { setEdit(null); load(); toast.show('Сохранено'); }} toast={toast.show} />}
      {toast.node}
    </div>
  );
};

const DepositModal: React.FC<{ initial: DepositSetting | null; onClose: () => void; onDone: () => void; toast: (t: string, tone?: 'green' | 'red') => void }> = ({ initial, onClose, onDone, toast }) => {
  const [f, setF] = useState<DepositSetting>(
    initial || { id: '', symbol: '', name: '', network: '', address: '', memo: '', label: '', minDeposit: undefined, confirmations: undefined, qrImage: null, enabled: true, updatedAt: 0 },
  );
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const addressErr = f.address ? validateAddress(f.network, f.symbol, f.address) : 'Укажите адрес';

  const readQr = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast('Нужен файл изображения', 'red'); return; }
    if (file.size > 800_000) { toast('Файл слишком большой (макс. ~800 КБ)', 'red'); return; }
    const reader = new FileReader();
    reader.onload = () => setF((p) => ({ ...p, qrImage: String(reader.result) }));
    reader.onerror = () => toast('Не удалось прочитать файл', 'red');
    reader.readAsDataURL(file);
  };
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => readQr(e.target.files?.[0]);
  const onDrop = (e: React.DragEvent) => { e.preventDefault(); setDrag(false); readQr(e.dataTransfer.files?.[0]); };

  const downloadQr = () => {
    if (!f.qrImage) return;
    const a = document.createElement('a');
    a.href = f.qrImage;
    a.download = `${f.symbol || 'coin'}-${(f.network || 'qr').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-deposit-qr.png`;
    a.click();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try { await api.patch('/deposit-settings', f); onDone(); }
    catch (err: any) { toast(err.message, 'red'); setBusy(false); }
  };

  const set = (k: keyof DepositSetting, v: any) => setF((p) => ({ ...p, [k]: v }));

  return (
    <Modal open onClose={onClose} title={initial ? 'Изменить кошелёк пополнения' : 'Новый кошелёк пополнения'} wide>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <div className="text-xs font-semibold text-slate-600 mb-1.5">Быстрый выбор монеты</div>
          <div className="flex flex-wrap gap-1.5">
            {COMMON_SYMBOLS.map((sym) => (
              <button type="button" key={sym} onClick={() => setF((p) => ({ ...p, symbol: sym, name: p.name || sym }))}
                className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${f.symbol === sym ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>
                {sym}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Тикер монеты" hint="напр. USDT"><input className={inputCls} value={f.symbol} onChange={(e) => set('symbol', e.target.value.toUpperCase())} required /></Field>
          <Field label="Название"><input className={inputCls} value={f.name || ''} onChange={(e) => set('name', e.target.value)} placeholder="Tether" /></Field>
        </div>

        <Field label="Сеть" hint="одна монета может иметь несколько сетей — заведите отдельный кошелёк для каждой">
          <input className={inputCls} list="dep-networks" value={f.network} onChange={(e) => set('network', e.target.value)} placeholder="TRON (TRC-20)" />
          <datalist id="dep-networks">{COMMON_NETWORKS.map((n) => <option key={n} value={n} />)}</datalist>
        </Field>

        <Field label="Адрес пополнения" hint="Тот адрес, куда пользователям отправлять средства">
          <textarea className={`${inputCls} ${f.address && addressErr ? 'border-rose-400 focus:ring-rose-500/40 focus:border-rose-500' : ''}`} rows={2} value={f.address} onChange={(e) => set('address', e.target.value)} required />
          {f.address && addressErr && <span className="block text-[11px] text-rose-600 mt-1">⚠ {addressErr}</span>}
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Метка / memo / destination tag" hint="нужен для XRP, TON, EOS, ATOM и т.п. — оставьте пустым если не требуется">
            <input className={inputCls} value={f.memo || ''} onChange={(e) => set('memo', e.target.value)} />
          </Field>
          <Field label="Подпись / предупреждение" hint="Напр. «Только USDT TRC-20»"><input className={inputCls} value={f.label || ''} onChange={(e) => set('label', e.target.value)} /></Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Минимальный депозит (в монете)" hint="необязательно"><input type="number" min={0} step="any" className={inputCls} value={f.minDeposit ?? ''} onChange={(e) => set('minDeposit', e.target.value === '' ? undefined : Number(e.target.value))} /></Field>
          <Field label="Подтверждений сети" hint="необязательно"><input type="number" min={0} step={1} className={inputCls} value={f.confirmations ?? ''} onChange={(e) => set('confirmations', e.target.value === '' ? undefined : Number(e.target.value))} /></Field>
        </div>

        <div
          className={`border rounded-xl p-3 transition-colors ${drag ? 'border-violet-500 bg-violet-50' : 'border-slate-200'}`}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
        >
          <div className="text-xs font-semibold text-slate-600 mb-2">QR-код <span className="font-normal text-slate-400">— перетащите изображение сюда или загрузите</span></div>
          <div className="flex items-start gap-4">
            <div className="w-32 h-32 rounded-xl border border-slate-200 bg-white flex items-center justify-center shrink-0">
              {f.qrImage
                ? <img src={f.qrImage} alt="QR preview" className="w-full h-full object-contain rounded-xl" />
                : <div className="flex flex-col items-center justify-center text-slate-400 text-[11px] px-2 text-center"><QrCode className="w-7 h-7 mb-1" />авто из адреса</div>}
            </div>
            <div className="flex flex-col gap-2">
              <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
              <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()}><Upload className="w-3.5 h-3.5" /> Загрузить своё QR</Button>
              {f.qrImage && <Button type="button" size="sm" variant="ghost" onClick={() => set('qrImage', null)}><X className="w-3.5 h-3.5" /> Убрать QR</Button>}
              {f.qrImage && <Button type="button" size="sm" variant="ghost" onClick={downloadQr}>Скачать QR</Button>}
              <p className="text-[11px] text-slate-400 max-w-xs">Загрузите реальный QR из вашего кошельк-провайдера, чтобы пользователи сканировали именно его. Без загрузки приложение построит код из адреса.</p>
            </div>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <input type="checkbox" checked={f.enabled} onChange={(e) => set('enabled', e.target.checked)} /> Показывать этот кошелёк пользователям
        </label>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>Отмена</Button>
          <Button type="submit" disabled={busy || !f.symbol || !f.address || !!addressErr}>{busy ? 'Сохранение…' : 'Сохранить'}</Button>
        </div>
      </form>
    </Modal>
  );
};
