import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { clientAuthApi, type ClientUser } from "./api";

type ClientAuthState = {
  client: ClientUser | null;
  loading: boolean;
  login:   (email: string, password: string) => Promise<void>;
  register:(data: Parameters<typeof clientAuthApi.register>[0]) => Promise<void>;
  logout:  () => void;
  refresh: () => Promise<void>;
};

const ClientCtx = createContext<ClientAuthState>({} as ClientAuthState);

export function ClientProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<ClientUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const token = localStorage.getItem("client_token");
    if (!token) { setLoading(false); return; }
    try {
      const me = await clientAuthApi.me();
      setClient(me);
    } catch {
      localStorage.removeItem("client_token");
      setClient(null);
    } finally { setLoading(false); }
  }

  async function login(email: string, password: string) {
    const res = await clientAuthApi.login(email, password);
    localStorage.setItem("client_token", res.token);
    setClient(res.client);
  }

  async function register(data: Parameters<typeof clientAuthApi.register>[0]) {
    const res = await clientAuthApi.register(data);
    localStorage.setItem("client_token", res.token);
    setClient(res.client);
  }

  function logout() {
    clientAuthApi.logout().catch(() => {});
    localStorage.removeItem("client_token");
    setClient(null);
  }

  useEffect(() => { refresh(); }, []);

  return (
    <ClientCtx.Provider value={{ client, loading, login, register, logout, refresh }}>
      {children}
    </ClientCtx.Provider>
  );
}

export function useClient() { return useContext(ClientCtx); }
