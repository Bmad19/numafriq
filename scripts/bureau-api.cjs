// ══════════════════════════════════════════════════════════════════════════════
// Afrilex Conseil — API Express + Supabase (PostgreSQL)
// Lancer : node scripts/bureau-api.cjs  |  npm run dev:api
// ══════════════════════════════════════════════════════════════════════════════
'use strict';

const path = require('path');
const fs   = require('fs');

// ── Chargement .env.local ─────────────────────────────────────────────────────
const envFile = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envFile)) {
  fs.readFileSync(envFile, 'utf-8').split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eq = trimmed.indexOf('=');
    if (eq === -1) return;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (key && !process.env[key]) process.env[key] = val;
  });
}

// ── Dépendances ───────────────────────────────────────────────────────────────
const express  = require('express');
const cors     = require('cors');
const bcrypt   = require('bcryptjs');
const crypto   = require('crypto');
const { createClient } = require('@supabase/supabase-js');

// ── Supabase ──────────────────────────────────────────────────────────────────
const SUPABASE_URL  = process.env.SUPABASE_URL  || '';
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('\n❌  SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis.');
  console.error('   → Renseignez-les dans .env.local puis relancez.\n');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  db:   { schema: 'public' },
});

// ── WhatsApp Meta Cloud API ───────────────────────────────────────────────────
const WA_PHONE          = process.env.WA_PHONE          || '22656191930';
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || '';
const META_PHONE_ID     = process.env.META_PHONE_ID     || '';

async function sendWhatsApp(message) {
  if (META_ACCESS_TOKEN && META_PHONE_ID) {
    try {
      const r = await fetch(`https://graph.facebook.com/v20.0/${META_PHONE_ID}/messages`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${META_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ messaging_product: 'whatsapp', to: `+${WA_PHONE}`, type: 'text', text: { body: message } }),
      });
      const d = await r.json();
      if (r.ok) { console.log('📱 WhatsApp ✅'); return; }
      console.log('📱 WhatsApp erreur :', d?.error?.message);
    } catch (e) { console.log('📱 WhatsApp réseau :', e.message); }
  } else {
    console.log(`\n📱 ── WhatsApp (dev) ──────────────────────────────`);
    console.log(message);
    console.log(`🔗 wa.me/+${WA_PHONE}?text=${encodeURIComponent(message)}`);
    console.log(`──────────────────────────────────────────────────\n`);
  }
}

// ── App ───────────────────────────────────────────────────────────────────────
const app = express();

const ALLOWED_ORIGINS = [
  'https://numafriq.com',
  'https://www.numafriq.com',
  'https://afrilexconseil.com',
  'https://www.afrilexconseil.com',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3100',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3100',
  'http://127.0.0.1:5173',
];
/** Tout origine http(s)://localhost:port — pratique dev (Vite peut changer de port si le port demandé est pris). */
const LOCALHOST_DEV_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/;
/** Par défaut autorise localhost:any port ; désactivez avec AFRILEX_RELAX_LOCAL_CORS=0 en prod stricte */
const RELAX_LOCALHOST_CORS = process.env.AFRILEX_RELAX_LOCAL_CORS !== '0';
/** Sites vitrine et sous-domaines (évite Failed to fetch si www vs apex déjà OK mais autre sous-domaine). */
const DEFAULT_SITE_ORIGIN =
  /^https?:\/\/([a-z0-9-]+\.)*(afrilexconseil\.com|numafriq\.com)(:\d+)?$/i;

function corsRegexList() {
  const raw = process.env.CORS_ORIGIN_PATTERNS || '';
  return raw
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((p) => {
      try {
        return new RegExp(p);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}
const CORS_REGEXES = corsRegexList();

const EXTRA_CORS = (process.env.CORS_ORIGINS || '')
  .split(/[\s,]+/)
  .map((s) => s.trim())
  .filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (ALLOWED_ORIGINS.includes(origin) || EXTRA_CORS.includes(origin)) return cb(null, true);
    if (RELAX_LOCALHOST_CORS && LOCALHOST_DEV_ORIGIN.test(origin)) return cb(null, true);
    if (DEFAULT_SITE_ORIGIN.test(origin)) return cb(null, true);
    if (CORS_REGEXES.some((re) => re.test(origin))) return cb(null, true);
    console.warn('[cors] origine refusée (CORS_ORIGINS ou CORS_ORIGIN_PATTERNS sur Render) :', origin);
    return cb(null, false);
  },
  credentials: true,
}));
app.use(express.json());

// No-cache sur toutes les réponses API
app.use((_req, res, next) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma':        'no-cache',
    'Expires':       '0',
  });
  next();
});

// Diagnostic : ouvrir GET http://localhost:3100/api/bureau/health (via proxy Vite) ou http://localhost:8080/api/bureau/health
app.get('/api/bureau/health', async (_req, res) => {
  try {
    const { error: uErr } = await supabase.from('users').select('id').limit(1);
    const { error: sErr } = await supabase.from('sessions').select('id').limit(1);
    const issues = [];
    if (uErr) issues.push(`users: ${uErr.message}`);
    if (sErr) issues.push(`sessions: ${sErr.message}`);
    if (issues.length) return res.status(503).json({ ok: false, issues });
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────
const makeToken  = () => crypto.randomBytes(32).toString('hex');
const in8h       = () => new Date(Date.now() + 8  * 3600_000).toISOString();
const in12h      = () => new Date(Date.now() + 12 * 3600_000).toISOString();
const now        = () => new Date().toISOString();
const ROLES      = { agent: 1, admin: 2, super_admin: 3 };

/** Évite une exception bcryptjs (« Illegal arguments ») si hash absent ou invalide — sinon erreur HTTP 500 au login. */
function safeComparePassword(plain, hash) {
  if (plain == null || hash == null || typeof hash !== 'string' || hash.length < 20) return false;
  try {
    return bcrypt.compareSync(String(plain), hash);
  } catch {
    return false;
  }
}

// Auth guard bureau — retourne user ou null (envoie la réponse si erreur)
async function authGuard(req, res, minRole = 'agent') {
  const m = (req.headers.authorization ?? '').match(/^Bearer\s+(.+)$/i);
  if (!m) { res.status(401).json({ error: 'Non authentifié' }); return null; }

  const { data: sess, error: sessErr } = await supabase
    .from('sessions')
    .select('expires_at, user:users!user_id(id,username,full_name,email,role,active,first_login,avatar,password)')
    .eq('token', m[1])
    .maybeSingle();

  if (sessErr || !sess || new Date(sess.expires_at) < new Date() || !sess.user?.active) {
    res.status(401).json({ error: 'Session expirée' });
    return null;
  }
  if ((ROLES[sess.user.role] ?? 0) < (ROLES[minRole] ?? 0)) {
    res.status(403).json({ error: 'Accès refusé' });
    return null;
  }
  // Prolonge la session
  await supabase.from('sessions').update({ expires_at: in8h() }).eq('token', m[1]);
  req.user = sess.user;
  return sess.user;
}

// Auth guard client
async function clientGuard(req, res) {
  const m = (req.headers.authorization ?? '').match(/^Bearer\s+(.+)$/i);
  if (!m) { res.status(401).json({ error: 'Non authentifié' }); return null; }

  const { data: sess } = await supabase
    .from('client_sessions')
    .select('expires_at, client:clients!client_id(id,name,email,company,phone,project_id,active,password)')
    .eq('token', m[1])
    .single();

  if (!sess || new Date(sess.expires_at) < new Date() || !sess.client?.active) {
    res.status(401).json({ error: 'Non authentifié' }); return null;
  }
  req.client = sess.client;
  return sess.client;
}

// Auth guard agent depuis route client (même token bureau)
async function agentTokenGuard(req, res) {
  const m = (req.headers.authorization ?? '').match(/^Bearer\s+(.+)$/i);
  if (!m) { res.status(401).json({ error: 'Non authentifié' }); return null; }

  const { data: sess } = await supabase
    .from('sessions')
    .select('expires_at, user:users!user_id(id,role,active)')
    .eq('token', m[1])
    .gt('expires_at', now())
    .single();

  if (!sess || !sess.user?.active) { res.status(401).json({ error: 'Non authentifié' }); return null; }
  req.user = sess.user;
  return sess.user;
}



/** Aligné avec api/contact.php — domain pour assignation pôle métier */
function resolveLeadDomain(service) {
  const s = String(service ?? '').trim().toLowerCase();
  const dm = {
    'non précisé':       'non_classe',
    'non precisé':       'non_classe',
    'conseil-juridique': 'juridique',
    fiscalite:           'fiscal',
    fiscalité:           'fiscal',
    comptabilite:        'comptabilite',
    comptabilité:        'comptabilite',
    structuration:       'structuration',
    investissement:      'investissement',
    autre:               'autre',
  };
  return dm[s] || 'non_classe';
}

function walkKbMarkdownFiles(absDir, relBase, collected) {
  if (!fs.existsSync(absDir)) return;
  for (const ent of fs.readdirSync(absDir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const abs = path.join(absDir, ent.name);
    const rel = path.join(relBase, ent.name).replace(/\\/g, '/');
    if (ent.isDirectory()) walkKbMarkdownFiles(abs, rel, collected);
    else if (ent.name.endsWith('.md')) {
      try {
        collected.push({ rel, body: fs.readFileSync(abs, 'utf8') });
      } catch {
        /* ignore fichiers illisibles */
      }
    }
  }
}

function loadKbBureauMarkdown(maxLen = 32000) {
  const kbDir = path.join(__dirname, '..', 'api', 'bureau', 'kb');
  const chunks = [];
  walkKbMarkdownFiles(kbDir, '', chunks);
  chunks.sort((a, b) => a.rel.localeCompare(b.rel));
  let buf = '';
  for (const { rel, body } of chunks) {
    buf += `\n\n<!-- ${rel || 'racine'} -->\n${body}`;
    if (buf.length > maxLen) break;
  }
  return buf.length > maxLen ? buf.slice(0, maxLen) + '\n\n… [tronqué pour limite tokens]' : buf;
}

/** memo_litige → même pipeline que mémoire de défense (synonyme métier). */
function normalizeAssistantMode(mode) {
  const m = String(mode ?? 'assist').trim().toLowerCase();
  if (m === 'memo_litige') return 'memo_defense';
  return m === 'memo_defense' ? 'memo_defense' : 'assist';
}

const ASSISTANT_MAX_MSG_CHARS = 12000;
function sanitizeAssistantMessages(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const item of raw.slice(-20)) {
    if (!item || typeof item !== 'object') continue;
    const role = item.role;
    if (role !== 'user' && role !== 'assistant') continue;
    let content = typeof item.content === 'string' ? item.content.replace(/\u0000/g, '').trim() : '';
    if (content.length > ASSISTANT_MAX_MSG_CHARS) {
      content = content.slice(0, ASSISTANT_MAX_MSG_CHARS) + '\n… [message tronqué]';
    }
    if (!content) continue;
    out.push({ role, content });
  }
  return out.slice(-14);
}

function userHandlesLeadDomain(practiceCsv, leadDomain) {
  const ld = String(leadDomain || '').trim().toLowerCase();
  if (!ld || ld === 'non_classe') return true;
  const csv = String(practiceCsv || '').trim().toLowerCase();
  if (!csv) return true;
  const parts = csv.split(/[,;/|]/).map((s) => s.trim()).filter(Boolean);
  return parts.some((p) => p === '*' || p === 'tous' || p === ld);
}

/** Premier agent dont les pôles couvrent le domaine du lead (sinon null). */
async function pickAssigneeUserIdForDomain(domain) {
  try {
    const d = String(domain ?? '').trim().toLowerCase();
    if (!d || d === 'non_classe') return null;
    const { data, error } = await supabase
      .from('users')
      .select('id, practice_domains')
      .eq('active', true)
      .in('role', ['agent', 'admin']);
    if (error) return null;
    const cand = (data ?? []).filter((u) => userHandlesLeadDomain(u.practice_domains, d));
    return cand[0]?.id ?? null;
  } catch {
    return null;
  }
}

/** Hash bcrypt pré-calculé — mot de passe : AfrilexBureau2026! (compte secours « afrilex_agent », changer en production). */
const BOOTSTRAP_AFRILEX_AGENT_HASH =
  '$2b$12$10Pkk3gCJOHWmt8mKnJjuuuCEOvSEJL7J/pwGKNCtMndn5X68NRMG';

/** Hash bcrypt : mot de passe initial « SAGNON » (majuscules). Rotation obligatoire en production. */
const BOOTSTRAP_SAGNON_HASH =
  '$2b$12$neroZBVpVUyy9dg0Wvnaau7jpfjn/IViI9p6EO8xKZ.Tatfqyp8pS';

/** Base vide uniquement — crée données démo cabinet + administrateur système prévu hors documentation publique du secret. */
async function seedCabinetDemoIfTotallyEmpty() {
  const { count: uc } = await supabase.from('users').select('*', { count: 'exact', head: true });
  if (uc > 0) return;

  await supabase.from('users').insert({
    username: 'sagnon',
    password: BOOTSTRAP_SAGNON_HASH,
    full_name: 'Administrateur Afrilex',
    email: 'cabinet@afrilexconseil.com',
    role: 'super_admin',
    first_login: false,
    active: true,
    practice_domains: null,
  });
  const { data: admin } = await supabase.from('users').select('id').eq('username', 'sagnon').single();
  const aid = admin?.id ?? 1;

  const { data: p1 } = await supabase
    .from('projects')
    .insert({
      name: 'Révision groupement consortium',
      client: 'Client confidentiel',
      description: 'Structuration projet et défense pré-contentieuse.',
      status: 'en_cours',
      priority: 'haute',
      budget: 0,
      progress: 40,
      created_by: aid,
    })
    .select().single();

  await supabase.from('projects').insert([
    {
      name: 'Contentieux créance commerciale',
      client: 'Client confidentiel',
      description: 'Préparation pièces sous cadre OHADA — synthèses internes.',
      status: 'en_cours',
      priority: 'normale',
      budget: 0,
      progress: 25,
      created_by: aid,
    },
  ]);

  await supabase.from('accounting').insert([
    {
      type: 'recette',
      category: 'Honoraires',
      amount: 0,
      description: 'À personnaliser (exemple démo vide)',
      date: '2026-01-15',
      created_by: aid,
      project_id: p1?.id ?? null,
    },
  ]);

  console.log(
    '\n✅ Base Supabase initialisée (cabinet) : compte super_admin « sagnon » — mot de passe initial : SAGNON (à changer tout de suite en production).\n'
  );
}

async function ensureBootstrapAdminExists() {
  const { data: row } = await supabase.from('users').select('id').eq('username', 'sagnon').maybeSingle();
  if (row?.id) {
    if (process.env.AFRILEX_LOCAL_SYNC_SAGNON === '1') {
      await supabase
        .from('users')
        .update({ password: BOOTSTRAP_SAGNON_HASH, active: true, first_login: false })
        .eq('id', row.id);
      console.log('🔧 AFRILEX_LOCAL_SYNC_SAGNON=1 — hash mot de passe « sagnon » réaligné sur le bootstrap (SAGNON). Retirez la variable après la première connexion réussie.');
    }
    return;
  }
  await supabase.from('users').insert({
    username: 'sagnon',
    password: BOOTSTRAP_SAGNON_HASH,
    full_name: 'Administrateur Afrilex',
    email: 'cabinet@afrilexconseil.com',
    role: 'super_admin',
    first_login: false,
    active: true,
    practice_domains: null,
  });
  console.log('✅ Compte « sagnon » ajouté — identifiant : sagnon ou SAGNON ; mot de passe initial : SAGNON');
}

/** Compte bureau de secours (identifiant afrilex_agent) — créé si absent ; mot de passe réaligné si AFRILEX_SYNC_AGENT_LOGIN=1 */
async function ensureAfrilexAgentBootstrapUser() {
  const username = 'afrilex_agent';
  const { data: row } = await supabase.from('users').select('id').eq('username', username).maybeSingle();
  const payload = {
    username,
    password: BOOTSTRAP_AFRILEX_AGENT_HASH,
    full_name: 'Agent bureau Afrilex',
    email: 'agent@afrilexconseil.com',
    role: 'super_admin',
    first_login: false,
    active: true,
    practice_domains: null,
  };
  if (!row?.id) {
    const { error } = await supabase.from('users').insert(payload);
    if (error) {
      console.error('ensureAfrilexAgentBootstrapUser insert:', error);
      return;
    }
    console.log('✅ Compte secours « afrilex_agent » créé — mot de passe : AfrilexBureau2026! (à changer en production)');
    return;
  }
  if (process.env.AFRILEX_SYNC_AGENT_LOGIN === '1') {
    await supabase
      .from('users')
      .update({ password: BOOTSTRAP_AFRILEX_AGENT_HASH, active: true, first_login: false })
      .eq('id', row.id);
    console.log('🔧 AFRILEX_SYNC_AGENT_LOGIN=1 — mot de passe « afrilex_agent » réinitialisé sur le hash bootstrap.');
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// AUTH BUREAU — aligné route + méthode HTTP (login POST, me GET, profile PUT)
// ══════════════════════════════════════════════════════════════════════════════
app.all('/api/bureau/auth.php', async (req, res) => {
  try {
    const { action } = req.query;
    const method = req.method;

  // ── Login ──────────────────────────────────────────────────────────────────
  if (method === 'POST' && action === 'login') {
    try {
      const rawUser = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
      const password = req.body?.password != null ? String(req.body.password) : '';
      const uname = rawUser.toLowerCase();
      if (!rawUser || !password)
        return res.status(400).json({ error: 'Identifiants requis' });

      const { data: user, error: selErr } = await supabase
        .from('users')
        .select('*')
        .eq('username', uname)
        .eq('active', true)
        .maybeSingle();

      if (selErr) {
        console.error('auth login select:', selErr);
        return res.status(500).json({ error: 'Erreur serveur (utilisateur)', detail: selErr.message });
      }

      if (!user || !safeComparePassword(password, user.password))
        return res.status(401).json({ error: 'Identifiants incorrects' });

      const token = makeToken();
      const { error: insErr } = await supabase.from('sessions').insert({
        user_id: user.id,
        token,
        expires_at: in8h(),
      });
      if (insErr) {
        console.error('auth login session:', insErr);
        return res.status(500).json({
          error: 'Impossible de créer la session',
          detail: insErr.message || String(insErr),
          hint: 'Vérifiez la table sessions (sql) et les clés étrangères user_id → users.id.',
        });
      }

      await supabase.from('users').update({ last_login: now() }).eq('id', user.id);

      return res.json({
        token,
        first_login: !!user.first_login,
        user: {
          id: Number(user.id),
          username: user.username,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
          avatar: user.avatar ?? null,
        },
      });
    } catch (e) {
      console.error('auth login:', e);
      return res.status(500).json({ error: 'Erreur serveur', detail: String(e?.message || e) });
    }
  }

  // ── Logout ─────────────────────────────────────────────────────────────────
  if (method === 'POST' && action === 'logout') {
    const m = (req.headers.authorization ?? '').match(/Bearer\s+(.+)/i);
    if (m) await supabase.from('sessions').delete().eq('token', m[1]);
    return res.json({ success: true });
  }

  // ── Me ─────────────────────────────────────────────────────────────────────
  if (method === 'GET' && action === 'me') {
    const u = await authGuard(req, res); if (!u) return;
    return res.json({
      id: Number(u.id),
      username: u.username,
      full_name: u.full_name,
      email: u.email,
      role: u.role,
      avatar: u.avatar,
      first_login: !!u.first_login,
    });
  }

  // ── Change password ────────────────────────────────────────────────────────
  if (method === 'POST' && action === 'change_password') {
    const u = await authGuard(req, res); if (!u) return;
      const { new_password, old_password } = req.body;
      if (!new_password || new_password.length < 6) return res.status(400).json({ error: 'Mot de passe trop court (min 6)' });
      if (!u.first_login && !safeComparePassword(old_password ?? '', u.password))
        return res.status(401).json({ error: 'Ancien mot de passe incorrect' });
      await supabase.from('users').update({ password: bcrypt.hashSync(new_password, 12), first_login: false }).eq('id', u.id);
      return res.json({ success: true });
    }

  // ── Update profile ─────────────────────────────────────────────────────────
  if (method === 'PUT' && action === 'profile') {
    const u = await authGuard(req, res); if (!u) return;
      const { username, full_name, email } = req.body;
      const { data: dup } = await supabase.from('users').select('id').eq('username', username).neq('id', u.id).maybeSingle();
      if (dup) return res.status(409).json({ error: "Nom d'utilisateur déjà pris" });
      await supabase.from('users').update({ username, full_name, email }).eq('id', u.id);
      return res.json({ success: true });
    }

  return res.status(404).json({ error: 'Action non trouvée' });
  } catch (e) {
    console.error('POST /api/bureau/auth.php', e);
    if (!res.headersSent) res.status(500).json({ error: 'Erreur serveur auth', detail: String(e?.message || e) });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// UTILISATEURS
// ══════════════════════════════════════════════════════════════════════════════
app.all('/api/bureau/users.php', async (req, res) => {
  const { action, id } = req.query;

  if (action === 'list') {
    const u = await authGuard(req, res, 'admin'); if (!u) return;
    const { data } = await supabase.from('users')
      .select('id,username,full_name,email,practice_domains,role,avatar,active,created_at,last_login')
      .order('role', { ascending: false }).order('full_name');
    return res.json(data ?? []);
  }

  if (action === 'create' && req.method === 'POST') {
    const u = await authGuard(req, res, 'super_admin'); if (!u) return;
    const { username, full_name, email, role, password, practice_domains } = req.body;
    if (!username || !full_name || !password) return res.status(400).json({ error: 'Champs requis manquants' });
    const pd =
      typeof practice_domains === 'string' && practice_domains.trim() !== ''
        ? practice_domains.trim().slice(0, 512).replace(/\s+/g, ' ')
        : null;
    const { error } = await supabase.from('users').insert({ username, password: bcrypt.hashSync(password, 12), full_name, email: email || null, practice_domains: pd, role: role || 'agent', first_login: true, active: true });
    if (error) return res.status(409).json({ error: "Ce nom d'utilisateur existe déjà" });
    return res.json({ success: true });
  }

  if (action === 'update' && req.method === 'PUT') {
    const u = await authGuard(req, res, 'super_admin'); if (!u) return;
    const { username, full_name, email, role, active, practice_domains } = req.body;
    const pd =
      typeof practice_domains === 'string'
        ? (practice_domains.trim() === '' ? null : practice_domains.trim().slice(0, 512).replace(/\s+/g, ' '))
        : undefined;
    const row = {
      username,
      full_name,
      email,
      role,
      active: active ?? true,
      ...(pd !== undefined ? { practice_domains: pd } : {}),
    };
    await supabase.from('users').update(row).eq('id', +id);
    return res.json({ success: true });
  }

  if (action === 'delete' && req.method === 'DELETE') {
    const u = await authGuard(req, res, 'super_admin'); if (!u) return;
    if (+id === u.id) return res.status(400).json({ error: 'Impossible de supprimer son propre compte' });
    await supabase.from('users').update({ active: false }).eq('id', +id);
    return res.json({ success: true });
  }

  if (action === 'reset_password' && req.method === 'POST') {
    const u = await authGuard(req, res, 'super_admin'); if (!u) return;
    const nw = req.body.password;
    if (!nw || typeof nw !== 'string' || nw.length < 8)
      return res.status(422).json({ error: 'Mot de passe trop court (min 8 caractères)' });
    await supabase.from('users').update({ password: bcrypt.hashSync(nw, 12), first_login: true }).eq('id', +id);
    return res.json({ success: true });
  }

  res.status(404).json({ error: 'Action non trouvée' });
});

// ══════════════════════════════════════════════════════════════════════════════
// PROJETS
// ══════════════════════════════════════════════════════════════════════════════
app.all('/api/bureau/projects.php', async (req, res) => {
  const { action, id } = req.query;

  if (action === 'list') {
    const u = await authGuard(req, res); if (!u) return;
    const { data } = await supabase
      .from('projects')
      .select('*, assigned_user:users!assigned_to(full_name)')
      .order('created_at', { ascending: false });
    return res.json((data ?? []).map(p => ({ ...p, agent_name: p.assigned_user?.full_name ?? null, assigned_user: undefined })));
  }

  if (action === 'stats') {
    const u = await authGuard(req, res); if (!u) return;
    const [{ count: total }, { count: en_cours }, { count: termine }, { count: en_pause }, { data: bud }] = await Promise.all([
      supabase.from('projects').select('*', { count: 'exact', head: true }),
      supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'en_cours'),
      supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'termine'),
      supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'en_pause'),
      supabase.from('projects').select('budget').neq('status', 'annule'),
    ]);
    const budget_total = (bud ?? []).reduce((s, p) => s + (p.budget ?? 0), 0);
    return res.json({ total, en_cours, termine, en_pause, budget_total });
  }

  if (action === 'create' && req.method === 'POST') {
    const u = await authGuard(req, res, 'admin'); if (!u) return;
    const b = req.body;
    const { data, error } = await supabase.from('projects')
      .insert({ name: b.name, client: b.client, description: b.description || null, status: b.status || 'en_cours', priority: b.priority || 'normale', budget: +b.budget || 0, deadline: b.deadline || null, assigned_to: b.assigned_to || null, created_by: u.id })
      .select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true, id: data.id });
  }

  if (action === 'update' && req.method === 'PUT') {
    const u = await authGuard(req, res, 'admin'); if (!u) return;
    const b = req.body;
    await supabase.from('projects')
      .update({ name: b.name, client: b.client, description: b.description || null, status: b.status, priority: b.priority, budget: +b.budget || 0, deadline: b.deadline || null, assigned_to: b.assigned_to || null, progress: +b.progress || 0 })
      .eq('id', +id);
    return res.json({ success: true });
  }

  if (action === 'delete' && req.method === 'DELETE') {
    const u = await authGuard(req, res, 'admin'); if (!u) return;
    await supabase.from('projects').delete().eq('id', +id);
    return res.json({ success: true });
  }

  res.status(404).json({ error: 'Action non trouvée' });
});

// ══════════════════════════════════════════════════════════════════════════════
// MISSIONS
// ══════════════════════════════════════════════════════════════════════════════
app.all('/api/bureau/missions.php', async (req, res) => {
  const { action, id } = req.query;

  if (action === 'list') {
    const u = await authGuard(req, res); if (!u) return;
    let q = supabase.from('missions')
      .select('*, assignee:users!assigned_to(full_name), project:projects!project_id(name)')
      .order('created_at', { ascending: false });
    if (u.role === 'agent') q = q.eq('assigned_to', u.id);
    const { data } = await q;
    return res.json((data ?? []).map(m => ({ ...m, assignee: undefined, project: undefined, assignee_name: m.assignee?.full_name ?? null, project_name: m.project?.name ?? null })));
  }

  if (action === 'create' && req.method === 'POST') {
    const u = await authGuard(req, res, 'admin'); if (!u) return;
    const b = req.body;
    await supabase.from('missions').insert({ title: b.title, description: b.description || null, project_id: b.project_id || null, assigned_to: +b.assigned_to, assigned_by: u.id, status: b.status || 'a_faire', due_date: b.due_date || null });
    return res.json({ success: true });
  }

  if (action === 'update' && req.method === 'PUT') {
    const u = await authGuard(req, res); if (!u) return;
    const b = req.body;
    if (u.role === 'agent') {
      await supabase.from('missions').update({ status: b.status }).eq('id', +id).eq('assigned_to', u.id);
    } else {
      await supabase.from('missions').update({ title: b.title, description: b.description || null, status: b.status, due_date: b.due_date || null, assigned_to: +b.assigned_to }).eq('id', +id);
    }
    return res.json({ success: true });
  }

  if (action === 'delete' && req.method === 'DELETE') {
    const u = await authGuard(req, res, 'admin'); if (!u) return;
    await supabase.from('missions').delete().eq('id', +id);
    return res.json({ success: true });
  }

  res.status(404).json({ error: 'Action non trouvée' });
});

// ══════════════════════════════════════════════════════════════════════════════
// RH
// ══════════════════════════════════════════════════════════════════════════════
app.all('/api/bureau/hr.php', async (req, res) => {
  const { action, id } = req.query;

  if (action === 'list') {
    const u = await authGuard(req, res); if (!u) return;
    const { data } = await supabase.from('hr_records')
      .select('*, employee:users!user_id(full_name)').order('date', { ascending: false });
    return res.json((data ?? []).map(h => ({ ...h, employee: undefined, employee_name: h.employee?.full_name ?? null })));
  }

  if (action === 'stats') {
    const u = await authGuard(req, res); if (!u) return;
    const [{ count: total_conges }, { count: en_attente }, { data: primes }] = await Promise.all([
      supabase.from('hr_records').select('*', { count: 'exact', head: true }).eq('type', 'conge'),
      supabase.from('hr_records').select('*', { count: 'exact', head: true }).eq('status', 'en_attente'),
      supabase.from('hr_records').select('amount').eq('type', 'prime').eq('status', 'approuve'),
    ]);
    return res.json({ total_conges, en_attente, total_primes: (primes ?? []).reduce((s, h) => s + (h.amount ?? 0), 0) });
  }

  if (action === 'create' && req.method === 'POST') {
    const u = await authGuard(req, res, 'admin'); if (!u) return;
    const b = req.body;
    await supabase.from('hr_records').insert({ user_id: +b.user_id, type: b.type, title: b.title, description: b.description || null, date: b.date, amount: +b.amount || 0, status: b.status || 'en_attente', created_by: u.id });
    return res.json({ success: true });
  }

  if (action === 'update' && req.method === 'PUT') {
    const u = await authGuard(req, res, 'admin'); if (!u) return;
    await supabase.from('hr_records').update({ status: req.body.status, description: req.body.description || null }).eq('id', +id);
    return res.json({ success: true });
  }

  if (action === 'delete' && req.method === 'DELETE') {
    const u = await authGuard(req, res, 'super_admin'); if (!u) return;
    await supabase.from('hr_records').delete().eq('id', +id);
    return res.json({ success: true });
  }

  res.status(404).json({ error: 'Action non trouvée' });
});

// ══════════════════════════════════════════════════════════════════════════════
// COMPTABILITÉ
// ══════════════════════════════════════════════════════════════════════════════
app.all('/api/bureau/accounting.php', async (req, res) => {
  const { action, id } = req.query;

  if (action === 'list') {
    const u = await authGuard(req, res); if (!u) return;
    const { data } = await supabase.from('accounting')
      .select('*, created_by_user:users!created_by(full_name), project:projects!project_id(name)')
      .order('date', { ascending: false });
    return res.json((data ?? []).map(a => ({ ...a, created_by_user: undefined, project: undefined, created_by_name: a.created_by_user?.full_name ?? null, project_name: a.project?.name ?? null })));
  }

  if (action === 'stats') {
    const u = await authGuard(req, res); if (!u) return;
    const [{ data: rec }, { data: dep }, { data: all }] = await Promise.all([
      supabase.from('accounting').select('amount').eq('type', 'recette'),
      supabase.from('accounting').select('amount').eq('type', 'depense'),
      supabase.from('accounting').select('date,type,amount').order('date', { ascending: false }),
    ]);
    const recettes = (rec ?? []).reduce((s, a) => s + (a.amount ?? 0), 0);
    const depenses = (dep ?? []).reduce((s, a) => s + (a.amount ?? 0), 0);
    const grouped  = {};
    (all ?? []).forEach(({ date, type, amount }) => {
      const month = (date ?? '').slice(0, 7);
      const key   = `${month}|${type}`;
      if (!grouped[key]) grouped[key] = { month, type, total: 0 };
      grouped[key].total += amount ?? 0;
    });
    return res.json({ recettes, depenses, solde: recettes - depenses, by_month: Object.values(grouped).sort((a, b) => b.month.localeCompare(a.month)).slice(0, 24) });
  }

  if (action === 'create' && req.method === 'POST') {
    const u = await authGuard(req, res, 'admin'); if (!u) return;
    const b = req.body;
    await supabase.from('accounting').insert({ type: b.type, category: b.category, amount: +b.amount, description: b.description, project_id: b.project_id || null, date: b.date, created_by: u.id });
    return res.json({ success: true });
  }

  if (action === 'delete' && req.method === 'DELETE') {
    const u = await authGuard(req, res, 'admin'); if (!u) return;
    await supabase.from('accounting').delete().eq('id', +id);
    return res.json({ success: true });
  }

  res.status(404).json({ error: 'Action non trouvée' });
});

// ══════════════════════════════════════════════════════════════════════════════
// CHAT INTERNE
// ══════════════════════════════════════════════════════════════════════════════
app.all('/api/bureau/messages.php', async (req, res) => {
  const { action, since, channel } = req.query;

  if (action === 'list') {
    const u = await authGuard(req, res); if (!u) return;
    const ch = channel || 'general';
    // Pour les DMs, vérifier que l'utilisateur fait partie du canal
    if (String(ch).startsWith('dm:')) {
      const parts = String(ch).replace('dm:', '').split('-');
      if (!parts.includes(String(u.id))) return res.status(403).json({ error: 'Accès refusé' });
    }
    let q = supabase.from('messages').select('*, sender:users!sender_id(full_name)')
      .eq('channel', ch).order('created_at');
    if (since) q = q.gt('id', +since);
    else q = q.limit(100);
    const { data } = await q;
    return res.json((data ?? []).map(m => ({ ...m, sender: undefined, sender_name: m.sender?.full_name ?? null })));
  }

  if (action === 'send' && req.method === 'POST') {
    const u = await authGuard(req, res); if (!u) return;
    if (!req.body.content?.trim()) return res.status(400).json({ error: 'Message vide' });
    const ch = req.body.channel || 'general';
    // Pour les DMs, vérifier que l'utilisateur fait partie du canal
    if (String(ch).startsWith('dm:')) {
      const parts = String(ch).replace('dm:', '').split('-');
      if (!parts.includes(String(u.id))) return res.status(403).json({ error: 'Accès refusé' });
    }
    const { data } = await supabase.from('messages')
      .insert({ sender_id: u.id, channel: ch, content: req.body.content.trim() })
      .select('*, sender:users!sender_id(full_name)').single();
    return res.json({ success: true, message: data ? { ...data, sender: undefined, sender_name: data.sender?.full_name } : null });
  }

  // Comptage des non-lus DM pour l'utilisateur courant
  if (action === 'unread_dms') {
    const u = await authGuard(req, res); if (!u) return;
    const { data } = await supabase.from('messages')
      .select('channel, sender_id')
      .like('channel', 'dm:%')
      .gt('id', +(req.query.since_id || 0));
    /** @type {Record<string, number>} */
    const unread = {};
    (data ?? []).forEach(m => {
      const parts = String(m.channel).replace('dm:', '').split('-');
      if (parts.includes(String(u.id)) && String(m.sender_id) !== String(u.id)) {
        unread[m.channel] = (unread[m.channel] || 0) + 1;
      }
    });
    return res.json(unread);
  }

  res.status(404).json({ error: 'Action non trouvée' });
});

// ══════════════════════════════════════════════════════════════════════════════
// RETOURS CLIENTS (feedback)
// ══════════════════════════════════════════════════════════════════════════════
app.all('/api/bureau/feedback.php', async (req, res) => {
  const { action, id } = req.query;

  if (action === 'list') {
    const u = await authGuard(req, res); if (!u) return;
    const { data } = await supabase.from('feedback')
      .select('*, project:projects!project_id(name)').order('created_at', { ascending: false });
    return res.json((data ?? []).map(f => ({ ...f, project: undefined, project_name: f.project?.name ?? null })));
  }

  if (action === 'create' && req.method === 'POST') {
    const u = await authGuard(req, res, 'admin'); if (!u) return;
    const b = req.body;
    await supabase.from('feedback').insert({ client_name: b.client_name, project_id: b.project_id || null, rating: +b.rating || 5, comment: b.comment || null, category: b.category || 'satisfaction', status: 'nouveau' });
    return res.json({ success: true });
  }

  if (action === 'update' && req.method === 'PUT') {
    const u = await authGuard(req, res, 'admin'); if (!u) return;
    await supabase.from('feedback').update({ status: req.body.status }).eq('id', +id);
    return res.json({ success: true });
  }

  if (action === 'delete' && req.method === 'DELETE') {
    const u = await authGuard(req, res, 'admin'); if (!u) return;
    await supabase.from('feedback').delete().eq('id', +id);
    return res.json({ success: true });
  }

  res.status(404).json({ error: 'Action non trouvée' });
});

// ══════════════════════════════════════════════════════════════════════════════
// DEMANDES / LEADS
// ══════════════════════════════════════════════════════════════════════════════
app.all('/api/bureau/leads.php', async (req, res) => {
  const { action, id } = req.query;

  if (action === 'list') {
    const u = await authGuard(req, res); if (!u) return;
    const { data } = await supabase.from('leads')
      .select('*, agent:users!assigned_to(full_name)').order('created_at', { ascending: false });
    return res.json((data ?? []).map(l => ({ ...l, agent: undefined, agent_name: l.agent?.full_name ?? null })));
  }

  if (action === 'stats') {
    const u = await authGuard(req, res); if (!u) return;
    const ck = async (st) =>
      supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', st);
    const [{ count: total }, { count: nouveau }, { count: en_cours }, { count: converti }, { count: perdu }, { count: archive }] = await Promise.all([
      supabase.from('leads').select('*', { count: 'exact', head: true }),
      supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'nouveau'),
      supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'en_cours'),
      supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'converti'),
      ck('perdu'),
      ck('archive'),
    ]);
    return res.json({ total, nouveau, en_cours, converti, perdu, archive });
  }

  if (action === 'assignees') {
    const u = await authGuard(req, res); if (!u) return;
    const LEAD_DOMS = ['juridique', 'fiscal', 'comptabilite', 'structuration', 'investissement', 'autre', 'non_classe'];
    const forDomain = String(req.query.for_domain || '').trim().toLowerCase();
    const { data } = await supabase
      .from('users')
      .select('id, full_name, role, practice_domains')
      .eq('active', true)
      .in('role', ['agent', 'admin', 'super_admin'])
      .order('full_name');
    let rows = data ?? [];
    if (forDomain && LEAD_DOMS.includes(forDomain)) {
      rows = rows.filter((r) => userHandlesLeadDomain(r.practice_domains, forDomain));
    }
    return res.json(rows);
  }

  if (action === 'update' && req.method === 'PUT') {
    const u = await authGuard(req, res); if (!u) return;
    const patch = {};
    const { status, assigned_to, notes, domain } = req.body ?? {};
    if (status !== undefined) patch.status = status;
    if (assigned_to !== undefined) patch.assigned_to = assigned_to || null;
    if (notes !== undefined) patch.notes = notes;
    if (domain !== undefined) patch.domain = domain;
    if (!Object.keys(patch).length) return res.status(422).json({ error: 'Aucune donnée à mettre à jour' });
    await supabase.from('leads').update(patch).eq('id', +id);
    return res.json({ success: true });
  }

  if (action === 'delete' && req.method === 'DELETE') {
    const u = await authGuard(req, res, 'admin'); if (!u) return;
    await supabase.from('leads').delete().eq('id', +id);
    return res.json({ success: true });
  }

  res.status(404).json({ error: 'Action non trouvée' });
});

// ══════════════════════════════════════════════════════════════════════════════
// AUTH CLIENT
// ══════════════════════════════════════════════════════════════════════════════
app.all('/api/client/auth.php', async (req, res) => {
  const { action } = req.query;

  if (action === 'register' && req.method === 'POST') {
    const { name, email, password, company, phone } = req.body;
    if (!name || !email || !password || password.length < 6) return res.status(400).json({ error: 'Champs invalides' });
    const { data: client, error } = await supabase.from('clients')
      .insert({ name, email, password: bcrypt.hashSync(password, 12), company: company || null, phone: phone || null, active: true })
      .select().single();
    if (error) return res.status(409).json({ error: 'Email déjà utilisé' });
    await supabase.from('client_messages').insert({ client_id: client.id, sender_type: 'agent', content: `Bonjour ${name} ! 👋 Bienvenue dans votre espace client Afrilex Conseil. Notre équipe est là pour vous accompagner.` });
    sendWhatsApp(`✅ *Nouveau client Afrilex Conseil*\n\n👤 ${name}\n📧 ${email}\n🏢 ${company || 'Non précisé'}\n⏰ ${new Date().toLocaleString('fr-FR')}`);
    const token = makeToken();
    await supabase.from('client_sessions').insert({ client_id: client.id, token, expires_at: in12h() });
    return res.json({ token, client: { id: client.id, name, email, company: company || null, phone: phone || null } });
  }

  if (action === 'login' && req.method === 'POST') {
    const { email, password } = req.body;
    const { data: client } = await supabase.from('clients').select('*').eq('email', email).eq('active', true).single();
    if (!client || !safeComparePassword(password, client.password)) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    const token = makeToken();
    await supabase.from('client_sessions').insert({ client_id: client.id, token, expires_at: in12h() });
    return res.json({ token, client: { id: client.id, name: client.name, email: client.email, company: client.company, phone: client.phone } });
  }

  if (action === 'logout' && req.method === 'POST') {
    const m = (req.headers.authorization ?? '').match(/Bearer\s+(.+)/i);
    if (m) await supabase.from('client_sessions').delete().eq('token', m[1]);
    return res.json({ success: true });
  }

  if (action === 'me') {
    const c = await clientGuard(req, res); if (!c) return;
    let project = null;
    if (c.project_id) {
      const { data } = await supabase.from('projects').select('id,name,client,status,progress,deadline,budget').eq('id', c.project_id).single();
      project = data;
    }
    const { count: unread } = await supabase.from('client_messages').select('*', { count: 'exact', head: true }).eq('client_id', c.id).eq('sender_type', 'agent').eq('is_read', false);
    return res.json({ id: c.id, name: c.name, email: c.email, company: c.company, phone: c.phone, project, unread });
  }

  if (action === 'profile' && req.method === 'PUT') {
    const c = await clientGuard(req, res); if (!c) return;
    await supabase.from('clients').update({ name: req.body.name || c.name, company: req.body.company || null, phone: req.body.phone || null }).eq('id', c.id);
    return res.json({ success: true });
  }

  if (action === 'change_password' && req.method === 'POST') {
    const c = await clientGuard(req, res); if (!c) return;
    const { old_password, new_password } = req.body;
    if (!new_password || new_password.length < 6) return res.status(400).json({ error: 'Mot de passe trop court (min 6 caractères)' });
    if (!safeComparePassword(old_password ?? '', c.password)) return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
    await supabase.from('clients').update({ password: bcrypt.hashSync(new_password, 12) }).eq('id', c.id);
    return res.json({ success: true });
  }

  res.status(404).json({ error: 'Action non trouvée' });
});

// ══════════════════════════════════════════════════════════════════════════════
// MESSAGES CLIENTS
// ══════════════════════════════════════════════════════════════════════════════
app.all('/api/client/messages.php', async (req, res) => {
  const { action, since, client_id } = req.query;

  // Client — liste ses messages
  if (action === 'list') {
    const c = await clientGuard(req, res); if (!c) return;
    let q = supabase.from('client_messages').select('*').eq('client_id', c.id).order('created_at');
    if (since) q = q.gt('id', +since); else q = q.limit(100);
    const { data } = await q;
    await supabase.from('client_messages').update({ is_read: true }).eq('client_id', c.id).eq('sender_type', 'agent').eq('is_read', false);
    return res.json(data ?? []);
  }

  // Client — envoie un message
  if (action === 'send' && req.method === 'POST') {
    const c = await clientGuard(req, res); if (!c) return;
    if (!req.body.content?.trim()) return res.status(400).json({ error: 'Message vide' });
    const { data } = await supabase.from('client_messages')
      .insert({ client_id: c.id, sender_type: 'client', content: req.body.content.trim() }).select().single();
    sendWhatsApp(`💬 *Message client*\n👤 ${c.name}\n${req.body.content.trim()}\n⏰ ${new Date().toLocaleString('fr-FR')}`);
    return res.json({ success: true, message: data });
  }

  // Agent — liste les conversations
  if (action === 'conversations') {
    const u = await agentTokenGuard(req, res); if (!u) return;
    const { data: cls } = await supabase.from('clients').select('id,name,email,company').eq('active', true);
    const result = await Promise.all((cls ?? []).map(async c => {
      const [{ count: unread }, { data: last }] = await Promise.all([
        supabase.from('client_messages').select('*', { count: 'exact', head: true }).eq('client_id', c.id).eq('sender_type', 'client').eq('is_read', false),
        supabase.from('client_messages').select('content,created_at').eq('client_id', c.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ]);
      return { ...c, unread, last_message: last?.content ?? null, last_message_at: last?.created_at ?? null };
    }));
    return res.json(result.sort((a, b) => new Date(b.last_message_at ?? 0) - new Date(a.last_message_at ?? 0)));
  }

  // Agent — fil d'un client
  if (action === 'thread') {
    const u = await agentTokenGuard(req, res); if (!u) return;
    const { data } = await supabase.from('client_messages')
      .select('*, agent:users!sender_id(full_name)').eq('client_id', +client_id).order('created_at');
    await supabase.from('client_messages').update({ is_read: true }).eq('client_id', +client_id).eq('sender_type', 'client').eq('is_read', false);
    return res.json((data ?? []).map(m => ({ ...m, agent: undefined, agent_name: m.agent?.full_name ?? null })));
  }

  // Agent — réponse à un client
  if (action === 'agent_reply' && req.method === 'POST') {
    const u = await agentTokenGuard(req, res); if (!u) return;
    const { client_id: cid, content } = req.body;
    if (!cid || !content?.trim()) return res.status(400).json({ error: 'Champs requis' });
    await supabase.from('client_messages').insert({ client_id: +cid, sender_type: 'agent', sender_id: u.id, content: content.trim() });
    return res.json({ success: true });
  }

  // Client — nb non lus
  if (action === 'unread') {
    const c = await clientGuard(req, res); if (!c) return;
    const { count } = await supabase.from('client_messages').select('*', { count: 'exact', head: true }).eq('client_id', c.id).eq('sender_type', 'agent').eq('is_read', false);
    return res.json({ count });
  }

  res.status(404).json({ error: 'Action non trouvée' });
});

// ══════════════════════════════════════════════════════════════════════════════
// FORMULAIRE CONTACT → enregistré en lead
// ══════════════════════════════════════════════════════════════════════════════
app.post('/api/contact.php', async (req, res) => {
  const { from_name: name, from_email: email, phone, company, service, budget, timeline, message } = req.body;
  if (!name || !email || !message) return res.status(422).json({ success: false, message: 'Champs requis manquants' });

  const domain = resolveLeadDomain(service);
  const assigned_to = await pickAssigneeUserIdForDomain(domain);
  const payload = {
    name, email,
    phone: phone || null, company: company || null, service: service || null,
    domain,
    budget: budget || null, timeline: timeline || null,
    source: 'contact_web',
    message,
    status: 'nouveau',
    assigned_to,
  };
  const { data, error } = await supabase.from('leads').insert(payload).select().single();

  if (error) return res.status(500).json({ success: false, message: error.message });

  sendWhatsApp(`🔔 *Nouvelle demande Afrilex Conseil*\n\n👤 ${name}\n📧 ${email}\n📞 ${phone || '—'}\n🏢 ${company || '—'}\n🛠 ${service || '—'}\n💰 ${budget || '—'}\n📅 ${timeline || '—'}\n\n💬 ${message}\n\n🔗 /bureau/leads\n⏰ ${new Date().toLocaleString('fr-FR')}`);

  return res.json({ success: true, message: 'Demande enregistrée', id: data?.id });
});

// ══════════════════════════════════════════════════════════════════════════════
// BLOG — commentaires (wp_post_id = ID REST article WordPress)
// ══════════════════════════════════════════════════════════════════════════════
const BLOG_COMMENT_HITS = new Map();
function blogCommentRateOk(ip, wpPostId, max = 5, windowMs = 3_600_000) {
  const k = `${ip}:${wpPostId}`;
  const now = Date.now();
  const arr = (BLOG_COMMENT_HITS.get(k) || []).filter((t) => now - t < windowMs);
  if (arr.length >= max) return false;
  arr.push(now);
  BLOG_COMMENT_HITS.set(k, arr);
  return true;
}

function sanitizeBlogCommentText(s, maxLen) {
  if (typeof s !== 'string') return '';
  const t = s.replace(/[\u0000-\u001f]/g, ' ').replace(/<[^>]*>/g, '').trim();
  return t.length <= maxLen ? t : t.slice(0, maxLen);
}

function isEmailish(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim().slice(0, 254));
}

app.get('/api/blog/comments', async (req, res) => {
  const wp = parseInt(String(req.query.wp_post_id ?? ''), 10);
  if (!Number.isFinite(wp) || wp < 1) return res.status(400).json({ error: 'wp_post_id invalide' });
  try {
    const { data, error } = await supabase
      .from('afrilex_blog_comments')
      .select('id, author_name, body, created_at')
      .eq('wp_post_id', wp)
      .order('created_at', { ascending: true })
      .limit(500);
    if (error) {
      console.error('GET /api/blog/comments', error);
      const missing = /(does not exist|schema cache|Could not find the table)/i.test(error.message || '');
      return res.status(missing ? 503 : 500).json({ error: missing ? 'Table afrilex_blog_comments absente.' : error.message, comments: [] });
    }
    return res.json({ comments: data ?? [] });
  } catch (e) {
    console.error('GET /api/blog/comments', e);
    return res.status(500).json({ error: e.message, comments: [] });
  }
});

app.post('/api/blog/comments', async (req, res) => {
  const ip = req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim()
    || req.socket?.remoteAddress
    || 'unknown';
  const { wp_post_id, author_name, author_email, body, website } = req.body || {};
  if (website != null && String(website).trim() !== '')
    return res.status(204).send();

  const wp = parseInt(String(wp_post_id), 10);
  if (!Number.isFinite(wp) || wp < 1) return res.status(400).json({ error: 'Article invalide' });
  if (!blogCommentRateOk(ip, wp))
    return res.status(429).json({ error: 'Trop de commentaires envoyés depuis cette connexion.' });

  const name = sanitizeBlogCommentText(author_name, 120);
  const email = sanitizeBlogCommentText(author_email, 254).toLowerCase();
  const text = sanitizeBlogCommentText(body, 4000);

  if (name.length < 2) return res.status(400).json({ error: 'Indiquez un nom (min. 2 caractères).' });
  if (!isEmailish(email)) return res.status(400).json({ error: 'Adresse email invalide.' });
  if (text.length < 3) return res.status(400).json({ error: 'Le message est trop court.' });

  const { data, error } = await supabase
    .from('afrilex_blog_comments')
    .insert({ wp_post_id: wp, author_name: name, author_email: email, body: text })
    .select('id, author_name, body, created_at')
    .single();

  if (error) {
    console.error('POST /api/blog/comments', error);
    const missing = /(does not exist|schema cache|Could not find the table)/i.test(error.message || '');
    return res.status(503).json({
      error: missing
        ? 'Créez la table afrilex_blog_comments dans Supabase (voir scripts/sql/afrilex_blog_comments.sql).'
        : "Impossible d'enregistrer le commentaire.",
    });
  }
  return res.status(201).json({ ok: true, comment: data });
});

// ══════════════════════════════════════════════════════════════════════════════
// CHAT IA — Proxy Groq
// ══════════════════════════════════════════════════════════════════════════════
const GROQ_KEY = process.env.GROQ_API_KEY || '';

app.post('/api/chat.php', async (req, res) => {
  const { messages } = req.body;
  if (!messages) return res.status(400).json({ error: 'messages requis' });

  const system = `Tu es AFRI, l'assistant IA officiel d'Afrilex Conseil (cabinet d'assistance juridique, fiscale et comptable, Ouagadougou, Burkina Faso).
Zones d'intervention du cabinet : Afrique de l'Ouest, autres pays OHADA, diaspora.
Tu es professionnel, chaleureux, concis et orienté solutions.
Tu réponds TOUJOURS en français sauf si le client parle anglais.
Tu n'inventes jamais de conseils juridiques précis : tu orientes vers le cabinet pour les dossiers concrets.

Expertises : droit des affaires & contrats ; fiscalité & optimisation (cadre légal) ; comptabilité & conformité ; structuration & financement ; conformité & gouvernance (dont OHADA) ; accompagnement investisseurs.
Contact : info@afrilexconseil.com | WhatsApp / tél. +226 52 20 91 91 | Réponse sous 24h ouvrées.
Blog : https://afrilexconseil.com/blog/

Règles : 3-4 lignes max sauf détails demandés ; **gras** pour les infos clés ; proposer une prochaine étape (contact, rendez-vous).
Si la personne veut être rappelée ou mandater le cabinet, demande NOM et TÉLÉPHONE. Quand tu as les deux, ajoute à la fin :
[LEAD:nom=NOM COMPLET|tel=NUMÉRO|sujet=SUJET COURT]`;

  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method:  'POST',
      headers: { Authorization: `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'system', content: system }, ...messages.slice(-10)], temperature: 0.7, max_tokens: 512 }),
    });
    const d = await r.json();
    let text = d.choices?.[0]?.message?.content ?? 'Désolé, erreur technique.';
    let lead = false;
    const lm = text.match(/\[LEAD:nom=([^|]+)\|tel=([^|]+)\|sujet=([^\]]+)\]/i);
    if (lm) {
      sendWhatsApp(`🤖 *Lead chat Afrilex Conseil*\n👤 ${lm[1].trim()}\n📞 ${lm[2].trim()}\n🎯 ${lm[3].trim()}\n⏰ ${new Date().toLocaleString('fr-FR')}`);
      text = text.replace(/\[LEAD:[^\]]+\]/gi, '').trim();
      lead = true;
    }
    return res.json({ success: true, message: text, lead });
  } catch(e) {
    return res.status(500).json({ error: 'Erreur IA : ' + e.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// ASSISTANT MÉTIER AGENTS — Groq + base locale Markdown (api/bureau/kb)
// ══════════════════════════════════════════════════════════════════════════════
app.post('/api/bureau/assistant.php', async (req, res) => {
  const u = await authGuard(req, res); if (!u) return;
  if (!GROQ_KEY) {
    return res.status(503).json({
      error: 'Clé Groq absente — définissez GROQ_API_KEY dans .env.local (même variable que chat public).',
    });
  }
  const modeRaw = req.body.mode || 'assist';
  const mode = normalizeAssistantMode(modeRaw);
  const dossier = req.body.dossier && typeof req.body.dossier === 'object' ? req.body.dossier : {};
  const messages = sanitizeAssistantMessages(req.body.messages);
  if (messages.length === 0) return res.status(400).json({ error: 'messages[] requis (user|assistant avec contenu non vide)' });

  let system = `Tu es l'assistant métier exclusif des agents connectés d'Afrilex Conseil (cabinet juridique et droit des affaires ; zones d'intervention : Afrique de l'Ouest, autres pays OHADA, diaspora).
Réponds en français. Reste prudent : pas de garantie de résultat ; ne cite des numéros d'articles officiels que si le contexte ou la base ci-dessous les indique clairement, sinon propose une orientation et renvoie vers les sources officielles.
CONSIGNÉ : rappeler régulièrement que toute pièce ou stratégie doit être validée par l'associé référent.

Base de synthèses internes (non officielles, compléter par vos recherches) :
"""
${loadKbBureauMarkdown()}
"""`;

  if (mode === 'memo_defense') {
    system += `\nMODE : BROUILLON de mémoire de défense / conclusions / écritures adverses. Produis du Markdown structuré (titres, listes) avec [À compléter] pour les faits ou pièces manquants. Termine par un bloc « AVERTISSEMENT CABINET » (brouillon IA, vérification obligatoire avant dépôt).`;
    const keys = [
      'reference', 'juridiction', 'pieces', 'objectif', 'contraintes_delais',
      'client', 'demandeur', 'resume_faits', 'theses_principales', 'points_de_droit', 'conclusions_souhaitees',
    ];
    const parts = [];
    for (const k of keys) {
      const v = dossier[k];
      if (v != null && String(v).trim() !== '') parts.push(`${k}=${String(v).trim()}`);
    }
    const memoLitige = dossier.memo_litige;
    if (memoLitige != null && String(memoLitige).trim() !== '' && !dossier.resume_faits) {
      parts.push(`synopsis_litige=${String(memoLitige).trim()}`);
    }
    if (parts.length) system += '\nInformations dossier renseignées par l\'agent : ' + parts.join(' | ');
  }

  const temperature = mode === 'memo_defense' ? 0.25 : 0.45;
  const max_tokens  = mode === 'memo_defense' ? 8192 : 2600;

  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method:  'POST',
      headers: { Authorization: `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'system', content: system }, ...messages],
        temperature,
        max_tokens,
      }),
    });
    const d = await r.json();
    const msg = d.choices?.[0]?.message?.content ?? '';
    if (!msg || r.status !== 200) return res.status(503).json({ error: d.error?.message || 'Assistant Groq indisponible.' });
    return res.json({
      success: true,
      message: msg,
      reply: msg,
      model: 'llama-3.3-70b-versatile',
      mode,
      mode_requested: modeRaw,
      kb_attached: true,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// DÉMARRAGE — migrations avant écoute (évite connexion avant création des comptes)
// ══════════════════════════════════════════════════════════════════════════════
const PORT = process.env.PORT || 8080;

seedCabinetDemoIfTotallyEmpty()
  .then(() => ensureBootstrapAdminExists())
  .then(() => ensureAfrilexAgentBootstrapUser())
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n🚀 Afrilex Conseil API (Supabase) — http://localhost:${PORT}`);
      console.log(`   GET http://localhost:${PORT}/api/bureau/health — test tables users/sessions`);
      console.log(`   🗄️  ${SUPABASE_URL}`);
      console.log(`   📱 WhatsApp : +${WA_PHONE}`);
      if (!META_ACCESS_TOKEN) console.log('   ⚠️  WhatsApp → console (dev mode)');
      console.log('');
      if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
        console.log(
          '💡 Bureau : « sagnon » / « sagnon » ou « afrilex_agent » / « AfrilexBureau2026! » — changez en production.\n' +
            '   Réinit. hash secours : AFRILEX_SYNC_AGENT_LOGIN=1 ; « sagnon » : AFRILEX_LOCAL_SYNC_SAGNON=1\n',
        );
      }
    });
  })
  .catch((err) => {
    console.error('\n❌ Impossible d’initialiser la base / Supabase avant démarrage :', err?.message || err);
    console.error('   Vérifiez SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY et que sql/supabase-setup.sql a été exécuté.\n');
    process.exit(1);
  });
