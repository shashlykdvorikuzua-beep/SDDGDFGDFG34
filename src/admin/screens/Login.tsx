import React, { useState } from 'react';
import { ShieldCheck, Lock, User as UserIcon, KeyRound } from 'lucide-react';
import { api, setToken } from '../api';
import { Button, inputCls } from '../ui';

export const Login: React.FC<{ onLoggedIn: (account: any) => void }> = ({ onLoggedIn }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [mfaCode, setMfaCode] = useState('123456');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.post('/login', {
        username: username.trim(),
        password: password.trim(),
        mfaCode: mfaCode.trim() || undefined,
      });
      setToken(res.token);
      onLoggedIn(res.account);
    } catch (err: any) {
      if (err.data?.mfaRequired) {
        setError('Введите MFA-код (демо: 123456).');
      } else {
        setError(err.message || 'Ошибка входа');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-violet-50 p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <img src="/assets/vaultspring-logo.png" alt="VaultSpring" className="w-16 h-16 rounded-2xl object-contain shadow-lg shadow-violet-600/20" />
          <h1 className="text-xl font-extrabold text-slate-900 mt-4">VaultSpring Wallet</h1>
          <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1">
            <ShieldCheck className="w-4 h-4 text-violet-600" /> Административная панель
          </p>
        </div>

        <form onSubmit={submit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div>
            <span className="block text-xs font-semibold text-slate-600 mb-1">Логин</span>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input className={`${inputCls} pl-9`} value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin" />
            </div>
          </div>
          <div>
            <span className="block text-xs font-semibold text-slate-600 mb-1">Пароль</span>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input type="password" className={`${inputCls} pl-9`} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="пароль: admin" />
            </div>
          </div>
          <div>
            <span className="block text-xs font-semibold text-slate-600 mb-1">MFA код</span>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input className={`${inputCls} pl-9`} value={mfaCode} onChange={(e) => setMfaCode(e.target.value)} placeholder="123456" />
            </div>
          </div>
          {error && <div className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{error}</div>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Проверка…' : 'Войти'}
          </Button>
          <div className="text-[11px] text-slate-400 leading-relaxed border-t border-slate-100 pt-3">
            Демо-доступ — <b>пароль = логин или имя роли</b>. Проще всего:<br />
            логин <b>admin</b> · пароль <b>admin</b> (или <b>super_admin</b>) · MFA <b>123456</b>.<br />
            Ещё: finance, support, risk, auditor (пароль = логин).
          </div>
        </form>
      </div>
    </div>
  );
};
