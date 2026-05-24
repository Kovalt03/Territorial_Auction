export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

const BASE = '/api/v1';

let isRefreshing = false;
let pendingQueue: Array<(token: string | null) => void> = [];

function drainQueue(token: string | null) {
  pendingQueue.forEach(cb => cb(token));
  pendingQueue = [];
}

async function tryRefresh(): Promise<string> {
  const res = await fetch(BASE + '/auth/refresh', { method: 'POST', credentials: 'include' });
  if (!res.ok) throw new Error('refresh failed');
  const body = await res.json();
  const token: string = body.data.accessToken;
  localStorage.setItem('accessToken', token);
  return token;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('accessToken');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string>),
  };

  const res = await fetch(BASE + path, { ...options, headers, credentials: 'include' });

  if (res.status !== 401) {
    if (!res.ok) {
      throw new ApiError(res.statusText, res.status);
    }
    const body = await res.json();
    return body.data as T;
  }

  // 401 — attempt token refresh
  if (isRefreshing) {
    return new Promise<T>((resolve, reject) => {
      pendingQueue.push((newToken) => {
        if (!newToken) { reject(new Error('Session expired')); return; }
        const retryHeaders = { ...headers, Authorization: `Bearer ${newToken}` };
        fetch(BASE + path, { ...options, headers: retryHeaders, credentials: 'include' })
          .then(r => {
            if (!r.ok) {
              throw new ApiError(r.statusText, r.status);
            }
            return r.json();
          })
          .then(b => resolve(b.data as T))
          .catch(reject);
      });
    });
  }

  isRefreshing = true;
  try {
    const newToken = await tryRefresh();
    isRefreshing = false;
    drainQueue(newToken);
    const retryHeaders = { ...headers, Authorization: `Bearer ${newToken}` };
    const retryRes = await fetch(BASE + path, { ...options, headers: retryHeaders, credentials: 'include' });
    if (!retryRes.ok) {
      const error = new Error(retryRes.statusText);
      (error as Error & { status: number }).status = retryRes.status;
      throw error;
    }
    const body = await retryRes.json();
    return body.data as T;
  } catch {
    isRefreshing = false;
    drainQueue(null);
    localStorage.removeItem('accessToken');
    window.location.href = '/login';
    throw new Error('Session expired');
  }
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(data) }),
  patch: <T>(path: string, data: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'DELETE', ...(data ? { body: JSON.stringify(data) } : {}) }),
};
