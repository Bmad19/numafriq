// ── NUMAFRIQ Bureau — Client API centralisé ───────────────────────────────────
const BASE = import.meta.env.VITE_BUREAU_API ?? '/api/bureau';

function getToken(): string | null { return localStorage.getItem('bureau_token'); }

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

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login:          (u: string, p: string) => request<{ token: string; first_login: boolean; user: BureauUser }>('auth.php', 'POST', { username: u, password: p }, { action: 'login' }),
  logout:         () => request('auth.php', 'POST', {}, { action: 'logout' }),
  me:             () => request<BureauUser>('auth.php', 'GET', undefined, { action: 'me' }),
  changePassword: (old_password: string, new_password: string) => request('auth.php', 'POST', { old_password, new_password }, { action: 'change_password' }),
  updateProfile:  (data: Partial<BureauUser>) => request('auth.php', 'PUT', data, { action: 'profile' }),
};

// ── Users ────────────────────────────────────────────────────────────────────
export const usersApi = {
  list:          () => request<BureauUser[]>('users.php', 'GET', undefined, { action: 'list' }),
  create:        (data: Partial<BureauUser> & { password: string }) => request('users.php', 'POST', data, { action: 'create' }),
  update:        (id: number, data: Partial<BureauUser>) => request('users.php', 'PUT', data, { action: 'update', id: String(id) }),
  delete:        (id: number) => request('users.php', 'DELETE', undefined, { action: 'delete', id: String(id) }),
  resetPassword: (id: number, password: string) => request('users.php', 'POST', { password }, { action: 'reset_password', id: String(id) }),
};

// ── Projects ─────────────────────────────────────────────────────────────────
export const projectsApi = {
  list:   () => request<Project[]>('projects.php', 'GET', undefined, { action: 'list' }),
  get:    (id: number) => request<Project>('projects.php', 'GET', undefined, { action: 'get', id: String(id) }),
  create: (data: Partial<Project>) => request('projects.php', 'POST', data, { action: 'create' }),
  update: (id: number, data: Partial<Project>) => request('projects.php', 'PUT', data, { action: 'update', id: String(id) }),
  delete: (id: number) => request('projects.php', 'DELETE', undefined, { action: 'delete', id: String(id) }),
  stats:  () => request<ProjectStats>('projects.php', 'GET', undefined, { action: 'stats' }),
};

// ── Missions ─────────────────────────────────────────────────────────────────
export const missionsApi = {
  list:   () => request<Mission[]>('missions.php', 'GET', undefined, { action: 'list' }),
  create: (data: Partial<Mission>) => request('missions.php', 'POST', data, { action: 'create' }),
  update: (id: number, data: Partial<Mission>) => request('missions.php', 'PUT', data, { action: 'update', id: String(id) }),
  delete: (id: number) => request('missions.php', 'DELETE', undefined, { action: 'delete', id: String(id) }),
};

// ── HR ───────────────────────────────────────────────────────────────────────
export const hrApi = {
  list:   () => request<HrRecord[]>('hr.php', 'GET', undefined, { action: 'list' }),
  create: (data: Partial<HrRecord>) => request('hr.php', 'POST', data, { action: 'create' }),
  update: (id: number, data: Partial<HrRecord>) => request('hr.php', 'PUT', data, { action: 'update', id: String(id) }),
  delete: (id: number) => request('hr.php', 'DELETE', undefined, { action: 'delete', id: String(id) }),
  stats:  () => request<HrStats>('hr.php', 'GET', undefined, { action: 'stats' }),
};

// ── Accounting ───────────────────────────────────────────────────────────────
export const accountingApi = {
  list:   () => request<AccountingEntry[]>('accounting.php', 'GET', undefined, { action: 'list' }),
  create: (data: Partial<AccountingEntry>) => request('accounting.php', 'POST', data, { action: 'create' }),
  delete: (id: number) => request('accounting.php', 'DELETE', undefined, { action: 'delete', id: String(id) }),
  stats:  () => request<AccountingStats>('accounting.php', 'GET', undefined, { action: 'stats' }),
};

// ── Chat ─────────────────────────────────────────────────────────────────────
export const chatApi = {
  list:      (since?: number, channel = 'general') => request<ChatMessage[]>('messages.php', 'GET', undefined, { action: 'list', channel, ...(since ? { since: String(since) } : {}) }),
  send:      (content: string, channel = 'general') => request<{ message: ChatMessage }>('messages.php', 'POST', { content, channel }, { action: 'send' }),
  unreadDms: (sinceId?: number) => request<Record<string, number>>('messages.php', 'GET', undefined, { action: 'unread_dms', ...(sinceId ? { since_id: String(sinceId) } : {}) }),
};

export function dmChannel(myId: number, otherId: number): string {
  return 'dm:' + [myId, otherId].sort((a, b) => a - b).join('-');
}

// ── Feedback ─────────────────────────────────────────────────────────────────
export const feedbackApi = {
  list:   () => request<Feedback[]>('feedback.php', 'GET', undefined, { action: 'list' }),
  create: (data: Partial<Feedback>) => request('feedback.php', 'POST', data, { action: 'create' }),
  update: (id: number, status: string) => request('feedback.php', 'PUT', { status }, { action: 'update', id: String(id) }),
  delete: (id: number) => request('feedback.php', 'DELETE', undefined, { action: 'delete', id: String(id) }),
};

// ── Types ─────────────────────────────────────────────────────────────────────
export type BureauUser = {
  id: number; username: string; full_name: string; email: string;
  role: 'super_admin' | 'admin' | 'agent'; avatar?: string;
  first_login?: boolean; active?: number; last_login?: string; created_at?: string;
};

export type Project = {
  id: number; name: string; client: string; description?: string;
  status: 'en_cours'|'termine'|'en_pause'|'annule';
  priority: 'basse'|'normale'|'haute'|'urgente';
  budget: number; deadline?: string; progress: number;
  assigned_to?: number; agent_name?: string;
  created_at: string; updated_at: string; missions?: Mission[];
};

export type ProjectStats = { total: number; en_cours: number; termine: number; en_pause: number; budget_total: number };

export type Mission = {
  id: number; title: string; description?: string;
  project_id?: number; project_name?: string;
  assigned_to: number; assignee_name?: string; assigned_by: number;
  status: 'a_faire'|'en_cours'|'termine'; due_date?: string; created_at: string;
};

export type HrRecord = {
  id: number; user_id: number; employee_name?: string;
  type: 'conge'|'absence'|'retard'|'prime'|'note';
  title: string; description?: string; date: string;
  amount?: number; status: 'en_attente'|'approuve'|'refuse'; created_at: string;
};
export type HrStats = { total_conges: number; en_attente: number; total_primes: number };

export type AccountingEntry = {
  id: number; type: 'recette'|'depense'; category: string;
  amount: number; description: string; project_id?: number; project_name?: string;
  date: string; created_by_name?: string; created_at: string;
};
export type AccountingStats = { recettes: number; depenses: number; solde: number; by_month: Array<{ month: string; type: string; total: number }> };

export type ChatMessage = { id: number; sender_id: number; sender_name: string; channel: string; content: string; created_at: string };

export type Feedback = {
  id: number; client_name: string; project_id?: number; project_name?: string;
  rating?: number; comment?: string; category: string;
  status: 'nouveau'|'traite'|'archive'; created_at: string;
};

// ── Leads (demandes de projet depuis le formulaire contact) ───────────────────
export type Lead = {
  id: number; name: string; email: string; phone?: string; company?: string;
  service?: string; budget?: string; timeline?: string; message: string;
  status: 'nouveau' | 'en_cours' | 'converti' | 'perdu';
  assigned_to?: number; agent_name?: string; notes?: string;
  created_at: string; updated_at: string;
};
export type LeadStats = { total: number; nouveau: number; en_cours: number; converti: number };

export const leadsApi = {
  list:   () => request<Lead[]>('leads.php', 'GET', undefined, { action: 'list' }),
  stats:  () => request<LeadStats>('leads.php', 'GET', undefined, { action: 'stats' }),
  update: (id: number, data: Partial<Lead>) => request('leads.php', 'PUT', data, { action: 'update', id: String(id) }),
  delete: (id: number) => request('leads.php', 'DELETE', undefined, { action: 'delete', id: String(id) }),
};

// ── Messages clients (accès depuis l'espace bureau — utilise le token bureau) ─
export type ClientConversation = {
  id: number; name: string; email: string; company?: string;
  unread: number; last_message_at: string; last_message?: string;
};
export type ClientMessage = {
  id: number; client_id: number; sender_type: 'client' | 'agent';
  sender_id?: number; agent_name?: string; content: string;
  is_read: number; created_at: string;
};

export const agentClientApi = {
  conversations: () => request<ClientConversation[]>('../client/messages.php', 'GET', undefined, { action: 'conversations' }),
  thread:        (clientId: number) => request<ClientMessage[]>('../client/messages.php', 'GET', undefined, { action: 'thread', client_id: String(clientId) }),
  reply:         (clientId: number, content: string) => request('../client/messages.php', 'POST', { client_id: clientId, content }, { action: 'agent_reply' }),
};
