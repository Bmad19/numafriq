// ── Afrilex Conseil Bureau — Client API centralisé ───────────────────────────
import { readRuntimeEnv } from "../lib/runtimeEnv";

const BASE = readRuntimeEnv("VITE_BUREAU_API", "/api/bureau");

function getToken(): string | null { return localStorage.getItem('bureau_token'); }

async function request<T = unknown>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: unknown,
  params?: Record<string, string>
): Promise<T> {
  const url = new URL(`${BASE}/${endpoint}`, window.location.origin);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method,
      mode: "cors",
      credentials: "omit",
      headers: {
        "Content-Type": "application/json",
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const apiHint =
      /^https?:\/\//i.test(BASE)
        ? `API : ${BASE.replace(/\/api\/bureau\/?$/i, "")}. Testez …/api/bureau/health. En ligne : sur Render ajoutez CORS_ORIGINS avec l’URL exacte de ce site (schéma https + domaine, ex. avec ou sans www).`
        : "Production : rebuild avec .env.production et VITE_BUREAU_API vers votre API déployée. En local : « npm run dev » + « npm run dev:api » (ou « npm run dev:full ») ; Vite utilise souvent le port 3100 (voir la console), l’API le 8080 ; fichier .env.local à la racine avec SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY (obligatoires pour démarrer l’API). Sans VITE_BUREAU_API, les appels passent par /api/bureau (proxy Vite → 8080). Groq : GROQ_API_KEY dans .env.local pour l’assistant.";
    throw new Error(`Impossible de joindre l’API bureau (${msg}). ${apiHint}`);
  }

  const text = await res.text();
  let data: Record<string, unknown> = {};
  try {
    data = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    data = { error: text?.slice(0, 400) || `Réponse invalide (${res.status})` };
  }

  if (!res.ok) {
    const parts = [data.error, data.detail].filter(Boolean) as string[];
    throw new Error(parts.length ? parts.join(" — ") : `Erreur ${res.status}`);
  }
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
/** Modules permission-aware (synchronisé avec scripts/bureau-api.cjs PERMISSION_KEYS et la sidebar). */
export const PERMISSION_KEYS = [
  'leads', 'assistant', 'projects', 'missions', 'clients', 'chat',
  'hr', 'accounting', 'feedback', 'job_offers', 'blog',
  'mailbox',
] as const;
export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export const PERMISSION_LABELS: Record<PermissionKey, { label: string; group: 'agent' | 'admin' | 'super_admin'; description: string }> = {
  leads:      { label: "Demandes (leads)",       group: 'agent', description: "Voir, traiter et assigner les demandes du formulaire contact." },
  assistant:  { label: "Assistant IA agent",     group: 'agent', description: "Utiliser l'assistant Groq + base juridique interne." },
  projects:   { label: "Projets",                group: 'agent', description: "Voir les dossiers ; admin → créer/modifier/supprimer." },
  missions:   { label: "Mes missions",           group: 'agent', description: "Voir / mettre à jour le statut de ses missions." },
  clients:    { label: "Messages clients",       group: 'agent', description: "Lire et répondre aux messages de l'espace client." },
  chat:       { label: "Chat interne",           group: 'agent', description: "Discuter avec les autres membres du bureau." },
  hr:         { label: "Ressources humaines",    group: 'admin', description: "Congés, primes, notes RH." },
  accounting: { label: "Comptabilité",           group: 'admin', description: "Recettes, dépenses, rapports financiers." },
  feedback:   { label: "Retours clients",        group: 'admin', description: "Notes et avis des clients." },
  job_offers: { label: "Offres d'emploi",        group: 'admin', description: "Publier et modérer les offres affichées sur /recrutement." },
  blog:       { label: "Blog",                   group: 'admin', description: "Publier et modérer les articles affichés sur /blog." },
  mailbox:    { label: "Boîte mail LWS",         group: 'super_admin', description: "Consulter les boîtes mail professionnelles configurées." },
};

export type BureauUser = {
  id: number; username: string; full_name: string; email: string;
  practice_domains?: string | null;
  permissions?: string | null;     // CSV des modules autorisés ; null/vide/* = pas de restriction
  role: 'super_admin' | 'admin' | 'agent'; avatar?: string;
  first_login?: boolean; active?: boolean | number; last_login?: string; created_at?: string;
};

/** Vrai si l'utilisateur a accès au module donné. Super_admin a toujours tout. */
export function userHasPermission(user: BureauUser | null, perm: PermissionKey): boolean {
  if (!user) return false;
  if (user.role === 'super_admin') return true;
  const raw = (user.permissions ?? '').trim();
  if (!raw || raw === '*') return true;
  const set = new Set(raw.split(/[,;\s]+/).filter(Boolean));
  if (set.has('*')) return true;
  return set.has(perm);
}

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
export type LeadDomain =
  | "juridique"
  | "fiscal"
  | "comptabilite"
  | "structuration"
  | "investissement"
  | "autre"
  | "non_classe";

export type Lead = {
  id: number;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  service?: string;
  domain?: LeadDomain;
  source?: string;
  budget?: string;
  timeline?: string;
  message: string;
  status: "nouveau" | "en_cours" | "converti" | "perdu" | "archive";
  assigned_to?: number;
  agent_name?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
};
export type LeadStats = {
  total: number;
  nouveau: number;
  en_cours: number;
  converti: number;
  perdu: number;
  archive: number;
};

export type LeadAssignee = {
  id: number;
  full_name: string;
  role: string;
  practice_domains?: string | null;
};

export const leadsApi = {
  list:      () => request<Lead[]>('leads.php', 'GET', undefined, { action: 'list' }),
  stats:     () => request<LeadStats>('leads.php', 'GET', undefined, { action: 'stats' }),
  assignees: (forDomain?: LeadDomain) =>
    request<LeadAssignee[]>(
      'leads.php',
      'GET',
      undefined,
      forDomain ? { action: 'assignees', for_domain: forDomain } : { action: 'assignees' },
    ),
  update:    (id: number, data: Partial<Lead>) => request('leads.php', 'PUT', data, { action: 'update', id: String(id) }),
  delete:    (id: number) => request('leads.php', 'DELETE', undefined, { action: 'delete', id: String(id) }),
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

/** Assistant dossiers agents (Groq + base Markdown api/bureau/kb) — identifiant GROQ_API_KEY serveur */
export type AssistantMode = "assist" | "memo_defense" | "memo_litige";

export const assistantApi = {
  chat: (
    messages: Array<{ role: "user" | "assistant"; content: string }>,
    mode?: AssistantMode,
    dossier?: Record<string, string>,
  ) =>
    request<{
      success: boolean;
      message: string;
      reply?: string;
      model?: string;
      mode?: string;
      mode_requested?: string;
    }>("assistant.php", "POST", {
      messages,
      mode: mode ?? "assist",
      dossier,
    }),
};

// ── Offres d'emploi (publication depuis le bureau) ───────────────────────────
export type JobOfferAdmin = {
  id: number;
  slug: string;
  position_key?: string | null;
  title_fr: string;
  title_en?: string | null;
  summary_fr: string;
  summary_en?: string | null;
  meta_fr?: string | null;
  meta_en?: string | null;
  content_fr?: string | null;
  content_en?: string | null;
  contract_type?: string | null;
  location?: string | null;
  is_new: boolean;
  is_published: boolean;
  sort_order: number;
  published_at?: string | null;
  created_by?: number | null;
  created_at: string;
  updated_at?: string;
};

export type JobOfferInput = Omit<Partial<JobOfferAdmin>, "id" | "created_by" | "created_at" | "updated_at" | "published_at"> & {
  slug?: string;
};

export const jobOffersApi = {
  list:   () => request<JobOfferAdmin[]>("job_offers.php", "GET", undefined, { action: "list" }),
  create: (data: JobOfferInput) =>
    request<{ success: boolean; offer: JobOfferAdmin }>("job_offers.php", "POST", data, { action: "create" }),
  update: (id: number, data: JobOfferInput) =>
    request<{ success: boolean; offer: JobOfferAdmin }>("job_offers.php", "PUT", data, { action: "update", id: String(id) }),
  delete: (id: number) => request("job_offers.php", "DELETE", undefined, { action: "delete", id: String(id) }),
};

// ── Candidatures (job_applications) ──────────────────────────────────────────
export type JobApplication = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  city_country?: string | null;
  linkedin_url?: string | null;
  position_applied: string;
  contract_type: string;
  availability?: string | null;
  experience_years?: string | null;
  education_level?: string | null;
  languages?: string | null;
  motivation: string;
  application_mode?: 'offer' | 'profile_pool' | 'spontaneous' | null;
  job_offer_ref?: string | null;
  sought_role_title?: string | null;
  cv_original_name?: string | null;
  cv_mime?: string | null;
  cv_size_bytes?: number | null;
  locale?: 'fr' | 'en';
  consent_data_processing: boolean;
  status: 'nouveau' | 'examine' | 'entretien' | 'refuse' | 'embauche' | 'archive';
  notes?: string | null;
  assigned_to?: number | null;
  agent_name?: string | null;
  created_at: string;
  updated_at?: string;
};

export type JobApplicationStats = {
  total: number;
  nouveau: number;
  examine: number;
  entretien: number;
  refuse: number;
  embauche: number;
  archive: number;
};

export const applicationsApi = {
  list: () => request<JobApplication[]>('applications.php', 'GET', undefined, { action: 'list' }),
  stats: () => request<JobApplicationStats>('applications.php', 'GET', undefined, { action: 'stats' }),
  update: (id: number, data: Partial<Pick<JobApplication, 'status' | 'notes' | 'assigned_to'>>) =>
    request('applications.php', 'PUT', data, { action: 'update', id: String(id) }),
  delete: (id: number) => request('applications.php', 'DELETE', undefined, { action: 'delete', id: String(id) }),
  /** Ouvre le CV dans un nouvel onglet (auth via header, blob URL). */
  openCv: async (id: number, suggestedName?: string): Promise<void> => {
    const url = new URL(`${BASE}/applications.php`, window.location.origin);
    url.searchParams.set('action', 'cv');
    url.searchParams.set('id', String(id));
    const token = localStorage.getItem('bureau_token') ?? '';
    const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`Erreur ${res.status} lors du téléchargement du CV`);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const win = window.open(blobUrl, '_blank', 'noopener,noreferrer');
    if (!win) {
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = suggestedName || `cv-${id}`;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  },
};

// ── Mailbox LWS (super_admin) ────────────────────────────────────────────────
export type MailboxAccount = {
  id: number;
  label: string;
  email: string;
  imap_host: string;
  imap_port: number;
  imap_secure: boolean;
  smtp_host?: string | null;
  smtp_port?: number | null;
  smtp_secure?: boolean | null;
  active: boolean;
  created_at: string;
  updated_at?: string;
};

export type MailboxAccountInput = {
  label: string;
  email: string;
  password?: string;       // requis à la création, optionnel à l'update (ne change pas si vide)
  imap_host?: string;
  imap_port?: number;
  imap_secure?: boolean;
  smtp_host?: string;
  smtp_port?: number;
  smtp_secure?: boolean;
  active?: boolean;
};

export type MailboxMessageSummary = {
  uid: number;
  seq?: number;
  date: string | null;
  subject: string;
  from_name: string;
  from_address: string;
  to: string;
  size: number;
  seen: boolean;
  flagged: boolean;
};

export type MailboxInbox = {
  folder: string;
  total: number;
  unseen: number;
  messages: MailboxMessageSummary[];
};

export type MailboxAttachment = {
  filename: string;
  contentType: string;
  size: number;
};

export type MailboxMessageDetail = MailboxMessageSummary & {
  message_id?: string | null;
  to_addresses?: string[];
  cc?: string;
  cc_addresses?: string[];
  text: string;
  html: string;
  attachments?: MailboxAttachment[];
};

export const mailboxApi = {
  accounts: () => request<{ accounts: MailboxAccount[] }>('mailbox.php', 'GET', undefined, { action: 'accounts' }),
  addAccount: (data: MailboxAccountInput) =>
    request<{ success: boolean; account: MailboxAccount }>('mailbox.php', 'POST', data, { action: 'add_account' }),
  updateAccount: (id: number, data: MailboxAccountInput) =>
    request<{ success: boolean; account: MailboxAccount }>('mailbox.php', 'PUT', data, { action: 'update_account', id: String(id) }),
  deleteAccount: (id: number) =>
    request('mailbox.php', 'DELETE', undefined, { action: 'delete_account', id: String(id) }),
  testConnection: (id: number) =>
    request<{ success: boolean; messages?: number; unseen?: number; error?: string }>(
      'mailbox.php', 'POST', undefined, { action: 'test_connection', id: String(id) },
    ),
  inbox: (id: number, opts?: { folder?: string; limit?: number }) =>
    request<MailboxInbox>('mailbox.php', 'GET', undefined, {
      action: 'inbox',
      id: String(id),
      ...(opts?.folder ? { folder: opts.folder } : {}),
      ...(opts?.limit ? { limit: String(opts.limit) } : {}),
    }),
  message: (id: number, uid: number, folder?: string) =>
    request<MailboxMessageDetail>('mailbox.php', 'GET', undefined, {
      action: 'message',
      id: String(id),
      uid: String(uid),
      ...(folder ? { folder } : {}),
    }),
  send: (id: number, payload: {
    to: string;
    cc?: string;
    bcc?: string;
    subject: string;
    text?: string;
    html?: string;
    in_reply_to?: string;
  }) =>
    request<{ success: boolean; messageId?: string; accepted?: string[]; rejected?: string[]; attempted?: Array<{ port: number; secure: boolean; ok: boolean; error?: string }> }>(
      'mailbox.php', 'POST', payload, { action: 'send', id: String(id) },
    ),
  testSmtp: (id: number) =>
    request<{
      success: boolean;
      host: string;
      results: Array<{ port: number; secure: boolean; ok: boolean; ms: number; error?: string }>;
      recommendation: string;
    }>('mailbox.php', 'POST', undefined, { action: 'test_smtp', id: String(id) }),
  /** Télécharge une pièce jointe (auth via header → blob URL → ouvre nouvel onglet). */
  openAttachment: async (
    accountId: number,
    uid: number,
    idx: number,
    suggestedName?: string,
    folder?: string,
  ): Promise<void> => {
    const url = new URL(`${BASE}/mailbox.php`, window.location.origin);
    url.searchParams.set('action', 'attachment');
    url.searchParams.set('id', String(accountId));
    url.searchParams.set('uid', String(uid));
    url.searchParams.set('idx', String(idx));
    if (folder) url.searchParams.set('folder', folder);
    const token = localStorage.getItem('bureau_token') ?? '';
    const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      throw new Error(t || `Erreur ${res.status}`);
    }
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const win = window.open(blobUrl, '_blank', 'noopener,noreferrer');
    if (!win) {
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = suggestedName || `piece-jointe-${idx + 1}`;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  },
};

// ── Articles blog (publication depuis le bureau) ─────────────────────────────
export type BlogImage = {
  id: number;
  filename?: string | null;
  mime: string;
  size_bytes?: number | null;
  created_at: string;
};

export type BlogArticleAdmin = {
  id: number;
  slug: string;
  title_fr: string;
  title_en?: string | null;
  excerpt_fr?: string | null;
  excerpt_en?: string | null;
  content_html_fr: string;
  content_html_en?: string | null;
  cover_image_url?: string | null;
  categories?: string | null;
  is_published: boolean;
  published_at?: string | null;
  author_name?: string | null;
  created_by?: number | null;
  created_at: string;
  updated_at?: string;
  images?: BlogImage[];
};

export type BlogArticleInput = Omit<Partial<BlogArticleAdmin>, "id" | "created_by" | "created_at" | "updated_at" | "published_at" | "images"> & {
  slug?: string;
};

export const blogArticlesApi = {
  list:   () => request<BlogArticleAdmin[]>("blog_articles.php", "GET", undefined, { action: "list" }),
  get:    (id: number) => request<BlogArticleAdmin>("blog_articles.php", "GET", undefined, { action: "get", id: String(id) }),
  create: (data: BlogArticleInput) =>
    request<{ success: boolean; article: BlogArticleAdmin }>("blog_articles.php", "POST", data, { action: "create" }),
  update: (id: number, data: BlogArticleInput) =>
    request<{ success: boolean; article: BlogArticleAdmin }>("blog_articles.php", "PUT", data, { action: "update", id: String(id) }),
  delete: (id: number) => request("blog_articles.php", "DELETE", undefined, { action: "delete", id: String(id) }),
  uploadImage: (
    articleId: number,
    payload: { filename: string; mime: string; data_base64: string; set_as_cover?: boolean },
  ) =>
    request<{ success: boolean; image: BlogImage; url: string }>(
      "blog_articles.php",
      "POST",
      payload,
      { action: "upload_image", id: String(articleId) },
    ),
  deleteImage: (articleId: number, imageId: number) =>
    request("blog_articles.php", "DELETE", undefined, {
      action: "delete_image",
      id: String(articleId),
      image_id: String(imageId),
    }),
};
