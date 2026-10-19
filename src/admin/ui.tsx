import React, { useState } from 'react';
import { X } from 'lucide-react';

// ---- Design tokens (aligned with VaultSpring Wallet) ----------------------
// Light/white background, purple primary actions, dark text, gray labels,
// green for positive statuses, red for errors/risk.

export const Card: React.FC<{ className?: string; children: React.ReactNode }> = ({ className = '', children }) => (
  <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm ${className}`}>{children}</div>
);

export const SectionTitle: React.FC<{ title: string; subtitle?: string; action?: React.ReactNode }> = ({ title, subtitle, action }) => (
  <div className="flex items-end justify-between gap-4 mb-5">
    <div>
      <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{title}</h1>
      {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
    </div>
    {action}
  </div>
);

type BtnVariant = 'primary' | 'ghost' | 'danger' | 'outline';
export const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: 'sm' | 'md' }
> = ({ variant = 'primary', size = 'md', className = '', children, ...rest }) => {
  const base = 'inline-flex items-center justify-center gap-1.5 font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const sizes = { sm: 'text-xs px-3 py-1.5', md: 'text-sm px-4 py-2.5' };
  const variants: Record<BtnVariant, string> = {
    primary: 'bg-violet-600 hover:bg-violet-500 text-white shadow-sm shadow-violet-600/20',
    ghost: 'bg-transparent hover:bg-slate-100 text-slate-700',
    outline: 'bg-white border border-slate-300 hover:bg-slate-50 text-slate-800',
    danger: 'bg-rose-600 hover:bg-rose-500 text-white',
  };
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
};

const TONE: Record<string, string> = {
  neutral: 'bg-slate-100 text-slate-600 ring-slate-200',
  purple: 'bg-violet-100 text-violet-700 ring-violet-200',
  green: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
  red: 'bg-rose-100 text-rose-700 ring-rose-200',
  amber: 'bg-amber-100 text-amber-700 ring-amber-200',
  blue: 'bg-sky-100 text-sky-700 ring-sky-200',
};
export const Badge: React.FC<{ tone?: keyof typeof TONE; children: React.ReactNode }> = ({ tone = 'neutral', children }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ring-1 ring-inset ${TONE[tone]}`}>
    {children}
  </span>
);

export const StatCard: React.FC<{ label: string; value: React.ReactNode; hint?: string; tone?: string }> = ({ label, value, hint, tone = 'text-slate-900' }) => (
  <Card className="p-5">
    <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</div>
    <div className={`text-2xl font-extrabold mt-1.5 ${tone}`}>{value}</div>
    {hint && <div className="text-xs text-slate-400 mt-1">{hint}</div>}
  </Card>
);

export const Field: React.FC<{ label: string; children: React.ReactNode; hint?: string }> = ({ label, children, hint }) => (
  <label className="block">
    <span className="block text-xs font-semibold text-slate-600 mb-1">{label}</span>
    {children}
    {hint && <span className="block text-[11px] text-slate-400 mt-1">{hint}</span>}
  </label>
);

export const inputCls =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500';

export const Modal: React.FC<{ open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }> = ({
  open, onClose, title, children, wide,
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-8 bg-slate-900/40 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
      <div
        className={`bg-white rounded-2xl shadow-xl w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} my-8`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

export const Table: React.FC<{ columns: string[]; children: React.ReactNode }> = ({ columns, children }) => (
  <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-slate-50 text-slate-500">
          {columns.map((c) => (
            <th key={c} className="text-left font-semibold px-4 py-3 whitespace-nowrap">{c}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">{children}</tbody>
    </table>
  </div>
);

export const Td: React.FC<{ className?: string; children: React.ReactNode }> = ({ className = '', children }) => (
  <td className={`px-4 py-3 align-middle ${className}`}>{children}</td>
);

export const Empty: React.FC<{ text: string }> = ({ text }) => (
  <div className="text-center py-12 text-slate-400 text-sm">{text}</div>
);

export const Spinner: React.FC = () => (
  <div className="flex justify-center py-12">
    <div className="w-6 h-6 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
  </div>
);

export const useToast = () => {
  const [msg, setMsg] = useState<{ text: string; tone: 'green' | 'red' } | null>(null);
  const show = (text: string, tone: 'green' | 'red' = 'green') => {
    setMsg({ text, tone });
    setTimeout(() => setMsg(null), 3500);
  };
  const node = msg ? (
    <div className={`fixed bottom-6 right-6 z-[60] px-4 py-3 rounded-xl text-sm font-semibold shadow-lg text-white ${msg.tone === 'green' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
      {msg.text}
    </div>
  ) : null;
  return { show, node };
};
