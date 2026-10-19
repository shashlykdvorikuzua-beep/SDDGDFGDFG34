// Thin fetch wrapper for the admin API. Persists the session token in
// sessionStorage and attaches it to every request.

const TOKEN_KEY = 'vaultspring_admin_token';

export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}
export function setToken(t: string) {
  sessionStorage.setItem(TOKEN_KEY, t);
}
export function clearToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  data: any;
  constructor(message: string, status: number, data: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function request<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  const token = getToken();
  if (token) headers['x-admin-token'] = token;

  const res = await fetch(`/api/admin${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) clearToken();
    throw new ApiError(data.error || `Ошибка ${res.status}`, res.status, data);
  }
  return data as T;
}

export const api = {
  get: <T = any>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T = any>(path: string, body?: any) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  patch: <T = any>(path: string, body?: any) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),
  del: <T = any>(path: string, body?: any) =>
    request<T>(path, { method: 'DELETE', body: JSON.stringify(body ?? {}) }),
};

export const fmtUsd = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);
export const fmtNum = (n: number, max = 6) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: max }).format(n || 0);
export const fmtDate = (ts: number | null) =>
  ts ? new Date(ts).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' }) : '—';
