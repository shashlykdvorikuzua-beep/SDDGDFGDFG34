import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard, Users, Wallet2, ArrowDownToLine, ArrowUpFromLine, Layers,
  Gauge, Coins, ShieldAlert, MessageSquare, Bell, FileBarChart, Settings as SettingsIcon,
  LogOut, Menu, X, QrCode,
} from 'lucide-react';
import { api, clearToken } from './api';
import { ROLE_LABELS, type Role } from './types';
import { Login } from './screens/Login';
import { Dashboard } from './screens/Dashboard';
import { UsersScreen } from './screens/UsersScreen';
import { DepositsScreen } from './screens/DepositsScreen';
import { WithdrawalsScreen } from './screens/WithdrawalsScreen';
import { AddressPoolScreen } from './screens/AddressPoolScreen';
import { DepositWalletsScreen } from './screens/DepositWalletsScreen';
import { StakingScreen } from './screens/StakingScreen';
import { StakingProScreen } from './screens/StakingProScreen';
import { TokensScreen } from './screens/TokensScreen';
import { RestrictionsScreen } from './screens/RestrictionsScreen';
import { SupportScreen } from './screens/SupportScreen';
import { NotificationsScreen } from './screens/NotificationsScreen';
import { ReportsScreen } from './screens/ReportsScreen';
import { SettingsScreen } from './screens/SettingsScreen';

interface NavItem { key: string; label: string; icon: React.ReactNode; screen: React.ReactNode; roles?: Role[]; }

const App: React.FC = () => {
  const [account, setAccount] = useState<any | null>(null);
  const [checking, setChecking] = useState(true);
  const [active, setActive] = useState('dashboard');
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    api.get('/me')
      .then((r) => setAccount(r.account))
      .catch(() => clearToken())
      .finally(() => setChecking(false));
  }, []);

  const logout = async () => {
    try { await api.post('/logout'); } catch {}
    clearToken();
    setAccount(null);
  };

  if (checking) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400">Загрузка…</div>;
  if (!account) return <Login onLoggedIn={(a) => { setAccount(a); setActive('dashboard'); }} />;

  const role: Role = account.role;
  const nav: NavItem[] = [
    { key: 'dashboard', label: 'Обзор', icon: <LayoutDashboard className="w-4.5 h-4.5" />, screen: <Dashboard onNavigate={setActive} /> },
    { key: 'users', label: 'Пользователи / Аккаунты', icon: <Users className="w-4.5 h-4.5" />, screen: <UsersScreen role={role} /> },
    { key: 'pool', label: 'Пул адресов', icon: <Wallet2 className="w-4.5 h-4.5" />, screen: <AddressPoolScreen role={role} /> },
    { key: 'deposit-wallets', label: 'Кошельки пополнения', icon: <QrCode className="w-4.5 h-4.5" />, screen: <DepositWalletsScreen role={role} /> },
    { key: 'deposits', label: 'Пополнения и зачисления', icon: <ArrowDownToLine className="w-4.5 h-4.5" />, screen: <DepositsScreen role={role} /> },
    { key: 'withdrawals', label: 'Выводы', icon: <ArrowUpFromLine className="w-4.5 h-4.5" />, screen: <WithdrawalsScreen role={role} /> },
    { key: 'staking', label: 'Staking', icon: <Layers className="w-4.5 h-4.5" />, screen: <StakingScreen role={role} /> },
    { key: 'staking-pro', label: 'Staking Pro / Позиции', icon: <Gauge className="w-4.5 h-4.5" />, screen: <StakingProScreen role={role} /> },
    { key: 'tokens', label: 'Внутренние токены', icon: <Coins className="w-4.5 h-4.5" />, screen: <TokensScreen role={role} /> },
    { key: 'restrictions', label: 'Блокировки и ограничения', icon: <ShieldAlert className="w-4.5 h-4.5" />, screen: <RestrictionsScreen role={role} /> },
    { key: 'support', label: 'Чат поддержки', icon: <MessageSquare className="w-4.5 h-4.5" />, screen: <SupportScreen role={role} /> },
    { key: 'notifications', label: 'Уведомления', icon: <Bell className="w-4.5 h-4.5" />, screen: <NotificationsScreen role={role} /> },
    { key: 'reports', label: 'Отчёты и аудит', icon: <FileBarChart className="w-4.5 h-4.5" />, screen: <ReportsScreen role={role} /> },
    { key: 'settings', label: 'Настройки, роли и безопасность', icon: <SettingsIcon className="w-4.5 h-4.5" />, screen: <SettingsScreen role={role} />, roles: ['super_admin'] },
  ];
  const visible = nav.filter((n) => !n.roles || n.roles.includes(role));
  const current = visible.find((n) => n.key === active) || visible[0];

  const Sidebar = (
    <aside className="w-72 shrink-0 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0">
      <div className="px-5 py-5 flex items-center gap-3 border-b border-slate-100">
        <img src="/assets/vaultspring-logo.png" alt="VS" className="w-9 h-9 rounded-xl object-contain" />
        <div>
          <div className="font-extrabold text-slate-900 leading-tight">VaultSpring</div>
          <div className="text-[11px] text-slate-500">Admin Console</div>
        </div>
        <button className="ml-auto lg:hidden text-slate-400" onClick={() => setNavOpen(false)}><X className="w-5 h-5" /></button>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {visible.map((n) => (
          <button
            key={n.key}
            onClick={() => { setActive(n.key); setNavOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              active === n.key ? 'bg-violet-600 text-white shadow-sm shadow-violet-600/25' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {n.icon}<span className="truncate">{n.label}</span>
          </button>
        ))}
      </nav>
      <div className="px-4 py-4 border-t border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-bold text-sm">
            {account.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-800 truncate">{account.name}</div>
            <div className="text-[11px] text-slate-500 truncate">{ROLE_LABELS[role]}</div>
          </div>
          <button onClick={logout} title="Выйти" className="ml-auto text-slate-400 hover:text-rose-600"><LogOut className="w-4.5 h-4.5" /></button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <div className="hidden lg:block">{Sidebar}</div>
      {navOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setNavOpen(false)} />
          <div className="absolute left-0 top-0">{Sidebar}</div>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setNavOpen(true)} className="text-slate-600"><Menu className="w-5 h-5" /></button>
          <span className="font-bold text-slate-900">{current.label}</span>
          <button onClick={logout} className="ml-auto text-slate-400"><LogOut className="w-5 h-5" /></button>
        </header>
        <main className="p-5 sm:p-8 max-w-[1400px] mx-auto">{current.screen}</main>
      </div>
    </div>
  );
};

export default App;
