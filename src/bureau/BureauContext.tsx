import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { authApi, type BureauUser } from "./api";

type AuthState = {
  user: BureauUser | null;
  loading: boolean;
  mustChangePassword: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
  setMustChangePassword: (v: boolean) => void;
};

const BureauCtx = createContext<AuthState>({} as AuthState);

export function BureauProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<BureauUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  async function refresh() {
    const token = localStorage.getItem("bureau_token");
    if (!token) { setLoading(false); return; }
    try {
      const me = await authApi.me();
      setUser(me);
      setMustChangePassword(!!me.first_login);
    } catch {
      localStorage.removeItem("bureau_token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(username: string, password: string) {
    const res = await authApi.login(username, password);
    localStorage.setItem("bureau_token", res.token);
    setUser(res.user);
    setMustChangePassword(res.first_login);
  }

  function logout() {
    authApi.logout().catch(() => {});
    localStorage.removeItem("bureau_token");
    setUser(null);
    setMustChangePassword(false);
  }

  useEffect(() => { refresh(); }, []);

  return (
    <BureauCtx.Provider value={{ user, loading, mustChangePassword, login, logout, refresh, setMustChangePassword }}>
      {children}
    </BureauCtx.Provider>
  );
}

export function useAuth() { return useContext(BureauCtx); }

export function hasRole(user: BureauUser | null, role: 'agent' | 'admin' | 'super_admin'): boolean {
  if (!user) return false;
  const map = { agent: 1, admin: 2, super_admin: 3 };
  return (map[user.role] ?? 0) >= (map[role] ?? 0);
}
