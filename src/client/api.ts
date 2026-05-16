// ── API Client Portal ────────────────────────────────────────────────────────
import { readRuntimeEnv } from "../lib/runtimeEnv";

const BASE = readRuntimeEnv("VITE_CLIENT_API", "/api/client");

function getToken(): string | null { return localStorage.getItem('client_token'); }

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
      mode: 'cors',
      credentials: 'omit',
      headers: {
        'Content-Type': 'application/json',
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error(
      'API client injoignable (réseau ou CORS). Vérifiez VITE_CLIENT_API dans .env.production et CORS sur Render.',
    );
  }
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

// ── Cases (dossiers du client) ───────────────────────────────────────────────
export type ClientCaseSummary = {
  id: number;
  name: string;
  status: string;
  priority?: string;
  current_phase?: string | null;
  practice_area?: string | null;
  case_number?: string | null;
  next_action?: string | null;
  next_action_date?: string | null;
  deadline?: string | null;
  progress: number;
  agent_name?: string | null;
  role_in_case?: string;
  created_at: string;
  updated_at?: string;
};

export type ClientCaseMilestone = {
  id: number;
  title: string;
  description?: string | null;
  due_date?: string | null;
  completed_at?: string | null;
  status: 'a_faire' | 'en_cours' | 'termine' | 'reporte' | 'annule';
  order_index: number;
  created_at: string;
};

export type ClientCaseEvent = {
  id: number;
  type: 'audience' | 'rdv' | 'echeance' | 'depot_pieces' | 'consultation' | 'autre';
  title: string;
  location?: string | null;
  scheduled_at: string;
  duration_minutes?: number | null;
  notes_client_facing?: string | null;
  completed_at?: string | null;
  outcome?: string | null;
};

export type ClientCaseDocument = {
  id: number;
  title: string;
  kind: string;
  description?: string | null;
  filename?: string | null;
  mime: string;
  size_bytes?: number | null;
  uploaded_by_kind: 'cabinet' | 'client' | 'inconnu';
  uploaded_by_name?: string | null;
  created_at: string;
};

export type ClientCaseDetail = {
  project: ClientCaseSummary & { description?: string | null };
  milestones: ClientCaseMilestone[];
  events: ClientCaseEvent[];
  documents: ClientCaseDocument[];
};

export type ClientCaseInvoice = {
  id: number;
  invoice_number?: string | null;
  title: string;
  description?: string | null;
  amount: number;
  currency: string;
  status: 'envoyee' | 'partiellement_payee' | 'payee' | 'annulee';
  due_date?: string | null;
  sent_at?: string | null;
  paid_amount: number;
  paid_at?: string | null;
  notes_client?: string | null;
  created_at: string;
};

export type ClientCasePayment = {
  id: number;
  invoice_id: number;
  amount: number;
  paid_at: string;
  method: string;
  reference?: string | null;
};

export type ClientEventRequest = {
  id: number;
  type: 'audience' | 'rdv' | 'consultation' | 'autre';
  title: string;
  proposed_date: string;
  alternative_date?: string | null;
  message?: string | null;
  status: 'pending' | 'accepted' | 'rescheduled' | 'refused' | 'cancelled';
  decided_at?: string | null;
  decided_message?: string | null;
  scheduled_event_id?: number | null;
  created_at: string;
};

export const clientCasesApi = {
  list: () => request<{ cases: ClientCaseSummary[] }>('cases.php', 'GET', undefined, { action: 'list' }),
  get:  (projectId: number) => request<ClientCaseDetail>('cases.php', 'GET', undefined, { action: 'get', id: String(projectId) }),
  uploadDocument: (projectId: number, payload: {
    title: string; kind?: string; description?: string; filename?: string;
    mime: string; data_base64: string;
  }) => request<{ success: boolean; document: ClientCaseDocument }>('cases.php', 'POST', payload, { action: 'upload_document', id: String(projectId) }),
  invoices: (projectId: number) => request<{ invoices: ClientCaseInvoice[]; payments: ClientCasePayment[] }>('cases.php', 'GET', undefined, { action: 'invoices', id: String(projectId) }),
  requestEvent: (projectId: number, payload: { type?: string; title: string; proposed_date: string; alternative_date?: string; message?: string }) =>
    request<{ success: boolean; request: ClientEventRequest }>('cases.php', 'POST', payload, { action: 'request_event', id: String(projectId) }),
  myEventRequests: (projectId: number) => request<ClientEventRequest[]>('cases.php', 'GET', undefined, { action: 'my_event_requests', id: String(projectId) }),
  /** Téléchargement document (auth via header → blob URL → ouvre nouvel onglet). */
  openDocument: async (docId: number, suggestedName?: string): Promise<void> => {
    const url = new URL(`${BASE}/cases.php`, window.location.origin);
    url.searchParams.set('action', 'document');
    url.searchParams.set('id', String(docId));
    const token = localStorage.getItem('client_token') ?? '';
    const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`Erreur ${res.status}`);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const win = window.open(blobUrl, '_blank', 'noopener,noreferrer');
    if (!win) {
      const a = document.createElement('a');
      a.href = blobUrl; a.download = suggestedName || `doc-${docId}`; a.rel = 'noopener';
      document.body.appendChild(a); a.click(); a.remove();
    }
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  },

  // ── Signatures électroniques ────────────────────────────────────────────
  signaturesPending: () => request<ClientSignature[]>('cases.php', 'GET', undefined, { action: 'signatures_pending' }),
  signaturesHistory: () => request<ClientSignature[]>('cases.php', 'GET', undefined, { action: 'signatures_history' }),
  sign: (sigId: number, payload: { full_name: string; accept: boolean }) =>
    request<{ success: boolean; signed_at: string; hash: string }>('cases.php', 'POST', payload, { action: 'signature_sign', id: String(sigId) }),
  refuse: (sigId: number, reason?: string) =>
    request<{ success: boolean }>('cases.php', 'POST', { reason }, { action: 'signature_refuse', id: String(sigId) }),

  /** Téléchargement PDF facture (auth via header → download direct). */
  downloadInvoicePdf: async (invoiceId: number, suggestedName?: string): Promise<void> => {
    const url = new URL(`${BASE}/cases.php`, window.location.origin);
    url.searchParams.set('action', 'invoice_pdf');
    url.searchParams.set('id', String(invoiceId));
    const token = localStorage.getItem('client_token') ?? '';
    const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`Erreur ${res.status}`);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl; a.download = suggestedName || `facture-${invoiceId}.pdf`; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  },
};

export type ClientSignature = {
  id: number;
  project_id: number;
  document_id?: number | null;
  title: string;
  content_text?: string;
  status: 'pending' | 'signed' | 'refused' | 'cancelled' | 'expired';
  signed_at?: string | null;
  signed_name?: string | null;
  expires_at?: string | null;
  created_at: string;
  case_name?: string | null;
  case_number?: string | null;
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
