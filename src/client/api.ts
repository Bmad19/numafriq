// ── API Client Portal ────────────────────────────────────────────────────────
const BASE = import.meta.env.VITE_CLIENT_API ?? '/api/client';

function getToken(): string | null { return localStorage.getItem('client_token'); }

async function request<T = unknown>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: unknown,
  params?: Record<string, string>
): Promise<T> {
  const url = new URL(`${BASE}/${endpoint}`, window.location.origin);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Erreur ${res.status}`);
  return data as T;
}

export const clientAuthApi = {
  register:       (d: RegisterData) => request<AuthResponse>('auth.php', 'POST', d, { action: 'register' }),
  login:          (email: string, password: string) => request<AuthResponse>('auth.php', 'POST', { email, password }, { action: 'login' }),
  logout:         () => request('auth.php', 'POST', {}, { action: 'logout' }),
  me:             () => request<ClientUser>('auth.php', 'GET', undefined, { action: 'me' }),
  updateProfile:  (data: Partial<ClientUser>) => request('auth.php', 'PUT', data, { action: 'profile' }),
  changePassword: (old_password: string, new_password: string) => request('auth.php', 'POST', { old_password, new_password }, { action: 'change_password' }),
};

export const clientMessagesApi = {
  list:  (since?: number) => request<ClientMessage[]>('messages.php', 'GET', undefined, { action: 'list', ...(since ? { since: String(since) } : {}) }),
  send:  (content: string) => request<{ message: ClientMessage }>('messages.php', 'POST', { content }, { action: 'send' }),
  unread:() => request<{ count: number }>('messages.php', 'GET', undefined, { action: 'unread' }),
};

// For agents
export const agentClientApi = {
  conversations: () => request<ClientConversation[]>('messages.php', 'GET', undefined, { action: 'conversations' }),
  thread:        (clientId: number) => request<ClientMessage[]>('messages.php', 'GET', undefined, { action: 'thread', client_id: String(clientId) }),
  reply:         (clientId: number, content: string) => request('messages.php', 'POST', { client_id: clientId, content }, { action: 'agent_reply' }),
};

// ── Types ─────────────────────────────────────────────────────────────────────
export type RegisterData = { name: string; email: string; password: string; company?: string; phone?: string };
export type AuthResponse = { token: string; client: ClientUser };

export type ClientUser = {
  id: number; name: string; email: string; company?: string; phone?: string;
  project?: ClientProject; unread?: number;
};

export type ClientProject = {
  id: number; name: string; client: string; status: string;
  progress: number; deadline?: string; budget?: number;
};

export type ClientMessage = {
  id: number; client_id: number; sender_type: 'client' | 'agent';
  sender_id?: number; agent_name?: string; content: string;
  is_read: number; created_at: string;
};

export type ClientConversation = {
  id: number; name: string; email: string; company?: string;
  unread: number; last_message_at: string; last_message?: string;
};
