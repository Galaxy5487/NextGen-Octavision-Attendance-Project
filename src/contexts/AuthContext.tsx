import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Profile } from '../lib/types';

interface AuthCtx {
  user: Profile | null;
  loading: boolean;
  login: (email: string, password: string, fullName?: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
  error: string | null;
  setError: (e: string | null) => void;
}

const Ctx = createContext<AuthCtx>({ user: null, loading: true, login: async () => {}, logout: () => {}, refresh: async () => {}, error: null, setError: () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('ngo_session');
      if (raw) {
        const saved = JSON.parse(raw);
        fetch(`/api/auth?id=${saved.id}`)
          .then((r) => r.text())
          .then((text) => (text ? JSON.parse(text) : null))
          .then((fresh) => {
            if (fresh && fresh.id && fresh.active !== false) {
              setUser(fresh);
              localStorage.setItem('ngo_session', JSON.stringify(fresh));
            } else {
              localStorage.removeItem('ngo_session');
            }
          })
          .catch(() => setUser(saved))
          .finally(() => setLoading(false));
      } else setLoading(false);
    } catch { setLoading(false); }
  }, []);

  const login = async (email: string, password: string, fullName?: string) => {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, full_name: fullName || undefined }),
    });
    const text = await res.text();
    let data: any = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (!res.ok) throw new Error((data && (data.error || data.message)) || `Login failed (${res.status})`);
    setUser(data);
    localStorage.setItem('ngo_session', JSON.stringify(data));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('ngo_session');
  };

  const refresh = async () => {
    const raw = localStorage.getItem('ngo_session');
    if (!raw) return;
    try {
      const saved = JSON.parse(raw);
      const res = await fetch(`/api/auth?id=${saved.id}`);
      const text = await res.text();
      const fresh = text ? JSON.parse(text) : null;
      if (fresh && fresh.id) {
        setUser(fresh);
        localStorage.setItem('ngo_session', JSON.stringify(fresh));
      }
    } catch {}
  };

  return <Ctx.Provider value={{ user, loading, login, logout, refresh, error, setError }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
