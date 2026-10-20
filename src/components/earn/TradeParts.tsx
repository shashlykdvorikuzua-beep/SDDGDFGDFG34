import React from 'react';
import { AlertTriangle, Check, Star } from 'lucide-react';
import { TradingInstrument, TradingMarket, FutureMarket } from '../../types/stakingPro';
import { CryptoIcon } from '../common/CryptoIcon';
import { formatInstrumentPrice, TRADE_QUOTE_ASSET } from '../../data/tradeCatalog';

/** Step 1 — the user picks a market first; availability is a provider fact. */
export const MarketGrid: React.FC<{
  markets: TradingMarket[];
  counts: Record<string, number>;
  selected: TradingMarket['id'];
  onSelect: (id: TradingMarket['id']) => void;
}> = ({ markets, counts, selected, onSelect }) => (
  <div className="space-y-2">
    <div className="grid grid-cols-2 gap-2">
      {markets.map((m) => {
        const isActive = m.id === selected;
        const pending = m.providerStatus === 'pending';
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onSelect(m.id)}
            className={`text-left p-3 rounded-2xl border transition-all ${
              isActive
                ? 'bg-blue-600/10 border-blue-500/40 shadow-lg shadow-blue-900/20'
                : 'bg-white/[0.03] border-white/[0.06] hover:border-white/[0.12]'
            }`}
          >
            <div className="flex items-start justify-between">
              <span className="text-lg leading-none">{m.icon}</span>
              {isActive && <Check className="w-4 h-4 text-blue-400" />}
            </div>
            <div className="mt-2 space-y-0.5">
              <span className="block text-xs font-bold text-white">{m.title}</span>
              <span className="block text-[10px] text-slate-400">
                {m.subtitle} · {counts[m.id] || 0} инстр.
              </span>
            </div>
            <span
              className={`mt-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold border ${
                pending
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/25'
                  : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${pending ? 'bg-amber-400' : 'bg-emerald-400'}`} />
              {pending ? 'Нет провайдера' : 'Live'}
            </span>
          </button>
        );
      })}
    </div>

    <p className="text-[10px] text-slate-500 leading-snug">
      Базовая валюта обеспечения — {TRADE_QUOTE_ASSET}. Баланс USDT сам по себе не открывает доступ к
      Форексу, акциям, индексам или сырьё: каждый рынок требует провайдера, который поддерживает
      соответствующие инструменты и обеспечение в USDT.
    </p>
  </div>
);

/** Per-market provider / product-type notice (implementation notes from the catalog). */
export const MarketNotice: React.FC<{ market: TradingMarket }> = ({ market }) => {
  const pending = market.providerStatus === 'pending';
  return (
    <div
      className={`rounded-2xl border p-3 space-y-2 ${
        pending ? 'bg-amber-500/[0.07] border-amber-500/20' : 'bg-emerald-500/[0.06] border-emerald-500/20'
      }`}
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${pending ? 'text-amber-400' : 'text-emerald-400'}`} />
        <div className="space-y-1">
          <span className={`block text-[11px] font-bold ${pending ? 'text-amber-200' : 'text-emerald-200'}`}>
            {pending ? `${market.provider} —${' '}условия подтверждаются до разработки` : market.provider}
          </span>
          <span className="block text-[10px] text-slate-300 leading-snug">Продукт: {market.productType}</span>
          <span className="block text-[10px] text-slate-300 leading-snug">Часы торгов: {market.tradingHours}</span>
          <span className="block text-[10px] text-slate-300 leading-snug">Стоимость удержания: {market.fundingModel}</span>
        </div>
      </div>
      <ul className="space-y-0.5">
        {market.notes.map((n) => (
          <li key={n} className="text-[10px] text-slate-400 leading-snug">
            • {n}
          </li>
        ))}
      </ul>
    </div>
  );
};

/** Section 6 — markets on the roadmap, shown but not tradable. */
export const FutureMarketsCard: React.FC<{ items: FutureMarket[] }> = ({ items }) => (
  <div className="bg-white/[0.02] border border-dashed border-white/[0.08] rounded-2xl p-3 space-y-2">
    <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
      Дополнительные рынки на будущее
    </span>
    <div className="space-y-1.5">
      {items.map((f) => (
        <div key={f.title} className="flex items-start justify-between gap-2">
          <span className="text-[10px] text-slate-400 shrink-0 w-[110px] leading-snug">{f.title}</span>
          <span className="text-[10px] text-slate-500 leading-snug text-right">{f.items.join(', ')}</span>
        </div>
      ))}
    </div>
    <span className="block text-[10px] text-slate-500">
      В каталоге зарезервированы, но недоступны, пока не подключён провайдер.
    </span>
  </div>
);

/** Step 2 — catalog list: name, ticker and current price for every instrument. */
export const InstrumentRow: React.FC<{
  instrument: TradingInstrument;
  selected: boolean;
  favorite: boolean;
  onSelect: (i: TradingInstrument) => void;
  onToggleFavorite: (id: string) => void;
}> = ({ instrument, selected, favorite, onSelect, onToggleFavorite }) => {
  const price = formatInstrumentPrice(instrument.currentPrice, instrument.pricePrecision);
  return (
    <div
      onClick={() => onSelect(instrument)}
      className={`flex items-center justify-between gap-2 p-2.5 rounded-xl cursor-pointer transition-colors ${
        selected ? 'bg-blue-600/10 border border-blue-500/30' : 'hover:bg-white/[0.04] border border-transparent'
      }`}
    >
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <CryptoIcon symbol={instrument.symbol} network={instrument.network} size={28} />
        <div className="min-w-0">
          <span className="text-xs font-bold text-white block truncate">{instrument.name}</span>
          <span className="text-[10px] text-slate-400 font-mono block truncate">
            {instrument.ticker} · до {instrument.maxLeverage}x
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="text-right">
          <span className="text-xs text-white font-mono block">${price}</span>
          <span
            className={`text-[10px] font-mono block ${
              instrument.change24h >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {instrument.change24h >= 0 ? '+' : ''}
            {instrument.change24h.toFixed(2)}%
          </span>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(instrument.id);
          }}
          className="p-1"
          aria-label="В избранное"
        >
          <Star
            className={`w-4 h-4 ${favorite ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'}`}
          />
        </button>
      </div>
    </div>
  );
};
