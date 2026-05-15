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
const multer   = require('multer');
const cors     = require('cors');
const bcrypt   = require('bcryptjs');
const crypto   = require('crypto');
const { createClient } = require('@supabase/supabase-js');
let ImapFlow;
try { ({ ImapFlow } = require('imapflow')); } catch { ImapFlow = null; }
let nodemailer;
try { nodemailer = require('nodemailer'); } catch { nodemailer = null; }

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
app.use(express.json({ limit: '10mb' })); // 10mb pour autoriser les images base64 (couvertures blog)

const uploadCareersCv = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5242880 },
});

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
    .select('expires_at, user:users!user_id(id,username,full_name,email,role,active,first_login,avatar,password,permissions)')
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

/** Liste des modules permission-aware (synchronisé avec la sidebar). super_admin a toujours tout. */
const PERMISSION_KEYS = [
  'leads', 'assistant', 'projects', 'missions', 'clients', 'chat',
  'hr', 'accounting', 'feedback', 'job_offers', 'blog',
  'mailbox',
];
function userHasPermission(user, perm) {
  if (!user) return false;
  if (user.role === 'super_admin') return true;
  const raw = String(user.permissions ?? '').trim();
  if (!raw || raw === '*') return true;
  const set = new Set(raw.split(/[,;\s]+/).filter(Boolean));
  if (set.has('*')) return true;
  return set.has(perm);
}
/** Garde permission après authGuard. Renvoie 403 si l'utilisateur n'a pas la perm demandée. */
function permGuard(req, res, perm) {
  if (userHasPermission(req.user, perm)) return true;
  res.status(403).json({ error: `Module « ${perm} » non autorisé pour ce compte.` });
  return false;
}

/** Normalise une CSV de permissions (whitelist + dédoublonnage + tri). */
function normalizePermissions(input) {
  if (input == null) return null;
  const str = Array.isArray(input) ? input.join(',') : String(input);
  const trimmed = str.trim();
  if (!trimmed || trimmed === '*') return null;
  const allowed = new Set(PERMISSION_KEYS);
  const list = Array.from(
    new Set(
      trimmed
        .split(/[,;\s]+/)
        .map((s) => s.trim().toLowerCase())
        .filter((s) => s && allowed.has(s))
    )
  ).sort();
  return list.length ? list.join(',') : null;
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
    .select('expires_at, user:users!user_id(id,role,active,permissions)')
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
          permissions: user.permissions ?? null,
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
      permissions: u.permissions ?? null,
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
      .select('id,username,full_name,email,practice_domains,permissions,role,avatar,active,created_at,last_login')
      .order('role', { ascending: false }).order('full_name');
    return res.json(data ?? []);
  }

  if (action === 'create' && req.method === 'POST') {
    const u = await authGuard(req, res, 'super_admin'); if (!u) return;
    const { username, full_name, email, role, password, practice_domains, permissions } = req.body;
    if (!username || !full_name || !password) return res.status(400).json({ error: 'Champs requis manquants' });
    const pd =
      typeof practice_domains === 'string' && practice_domains.trim() !== ''
        ? practice_domains.trim().slice(0, 512).replace(/\s+/g, ' ')
        : null;
    const perms = permissions === undefined ? null : normalizePermissions(permissions);
    const { error } = await supabase.from('users').insert({
      username,
      password: bcrypt.hashSync(password, 12),
      full_name,
      email: email || null,
      practice_domains: pd,
      permissions: perms,
      role: role || 'agent',
      first_login: true,
      active: true,
    });
    if (error) return res.status(409).json({ error: "Ce nom d'utilisateur existe déjà" });
    return res.json({ success: true });
  }

  if (action === 'update' && req.method === 'PUT') {
    const u = await authGuard(req, res, 'super_admin'); if (!u) return;
    const { username, full_name, email, role, active, practice_domains, permissions } = req.body;
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
      ...(permissions !== undefined ? { permissions: normalizePermissions(permissions) } : {}),
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
  if (!(await authGuard(req, res))) return;
  if (!permGuard(req, res, 'projects')) return;
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
  if (!(await authGuard(req, res))) return;
  if (!permGuard(req, res, 'missions')) return;
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
  if (!(await authGuard(req, res))) return;
  if (!permGuard(req, res, 'hr')) return;
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
  if (!(await authGuard(req, res))) return;
  if (!permGuard(req, res, 'accounting')) return;
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
  if (!(await authGuard(req, res))) return;
  if (!permGuard(req, res, 'chat')) return;
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
  if (!(await authGuard(req, res))) return;
  if (!permGuard(req, res, 'feedback')) return;
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
  if (!(await authGuard(req, res))) return;
  if (!permGuard(req, res, 'leads')) return;
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
// ASSISTANT RÉDACTION (Groq — clé serveur uniquement)
// ══════════════════════════════════════════════════════════════════════════════
function buildAssistantSystem(mode, kb, dossierBlock) {
  const base =
    '# Rappels de prudence\n' +
    "- L'outil produit des **brouillons** ou des pistes rédactionnelles. Il ne substitue pas l'examen humain ni un avis professionnel définitif.\n" +
    '- Ne cite pas comme acquises sans preuve les références légales ou jurisprudentielles : indique‑les après **les avoir vérifiées** sur les sources officielles ou avec l’avis interne qui s’appuie sur dossier réel.\n' +
    "- Base synthétique (non exhaustive) fournie ci-dessous ; **ne présume pas** d'autres règles que celles dont tu disposes :\n\n" +
    (kb.trim() ? kb.trim() + '\n\n---\n\n' : '');

  if (mode === 'memo_litige') {
    return (
      `${base}` +
      "Tu aides l'équipe à produire un **brouillon** de mémo argumenté ou de note de synthèse (contentieux ou stratégique).\n" +
      "- Réponds **en français** sauf si l'utilisateur demande explicitement une autre langue.\n" +
      '- Structure claire : problématiques, exposition des faits, arguments, contre-arguments envisageables, demandes concrètes, pièces / preuves à relire.\n' +
      '- Marque comme **[à vérifier]** toute référence à un article, texte officiel OU jurisprudence si tu ne l’as pas sous les yeux.\n' +
      '- Si les faits sont insuffisants, pose au plus **trois questions ciblées** avant de développer trop longtemps.\n' +
      (dossierBlock
        ? `\n## Contexte fourni par l'utilisateur\n${dossierBlock}\n`
        : '')
    );
  }

  return (
    `${base}` +
    "Tu es un assistant rédactionnel pour l'espace bureau **NUMAFRIQ**.\n" +
    '- Aide les agents à préparer dossiers internes : mails, présentations, plans d\'action projet, synthèses, check-lists livrables.\n' +
    '- Réponses **concises puis détaillables** ; ton professionnel bienveillant.\n' +
    '- Réponds **en français** sauf indication contraire.\n' +
    '- Si hors champ digital / gestion projet, reste prudent et propose des formulations neutres.'
  );
}

app.post('/api/bureau/assistant.php', async (req, res) => {
  const u = await authGuard(req, res);
  if (!u) return;
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey || !groqKey.trim()) {
    return res.status(503).json({
      error: 'Assistant désactivé. Définir la variable serveur GROQ_API_KEY (jamais côté client).',
    });
  }

  const {
    mode: rawMode = 'assist',
    messages = [],
    dossier_summary: dossierSummary = '',
  } = req.body ?? {};
  const mode = rawMode === 'memo_litige' ? 'memo_litige' : 'assist';
  const raw = Array.isArray(messages) ? messages : [];
  const sanitized = raw
    .filter((m) => m && typeof m.role === 'string' && typeof m.content === 'string')
    .map((m) => ({
      role: ['assistant', 'user'].includes(m.role) ? m.role : 'user',
      content: String(m.content).slice(0, 14_000),
    }))
    .slice(-22);

  if (!sanitized.length || sanitized[sanitized.length - 1].role !== 'user') {
    return res.status(422).json({ error: 'Fournissez au moins un message utilisateur à la fin de la conversation.' });
  }

  const dossierBlock = dossierSummary ? String(dossierSummary).slice(0, 20_000) : '';
  const system = buildAssistantSystem(mode, loadKbBureauMarkdown(), dossierBlock);

  try {
    const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'system', content: system }, ...sanitized],
        temperature: mode === 'memo_litige' ? 0.35 : 0.45,
        max_tokens: 8192,
      }),
    });

    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const hint = data?.error?.message || upstream.statusText;
      console.error('[assistant]', upstream.status, hint);
      return res.status(502).json({ error: 'Fournisseur LLM indisponible.', detail: hint });
    }

    const reply = data?.choices?.[0]?.message?.content;
    if (!reply || typeof reply !== 'string') {
      return res.status(502).json({ error: 'Réponse invalide du modèle.' });
    }
    return res.json({ reply: reply.trim(), mode });
  } catch (e) {
    console.error('[assistant]', e.message);
    return res.status(502).json({ error: 'Erreur lors de l’appel au modèle.' });
  }
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
    if (!permGuard(req, res, 'clients')) return;
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
    if (!permGuard(req, res, 'clients')) return;
    const { data } = await supabase.from('client_messages')
      .select('*, agent:users!sender_id(full_name)').eq('client_id', +client_id).order('created_at');
    await supabase.from('client_messages').update({ is_read: true }).eq('client_id', +client_id).eq('sender_type', 'client').eq('is_read', false);
    return res.json((data ?? []).map(m => ({ ...m, agent: undefined, agent_name: m.agent?.full_name ?? null })));
  }

  // Agent — réponse à un client
  if (action === 'agent_reply' && req.method === 'POST') {
    const u = await agentTokenGuard(req, res); if (!u) return;
    if (!permGuard(req, res, 'clients')) return;
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

/** Lit (wp_post_id, bureau_article_id) depuis query/body — exactement un des deux est valide. */
function pickCommentTarget(src) {
  const wp = parseInt(String(src?.wp_post_id ?? ''), 10);
  const ba = parseInt(String(src?.bureau_article_id ?? ''), 10);
  const wpOk = Number.isFinite(wp) && wp > 0;
  const baOk = Number.isFinite(ba) && ba > 0;
  if (wpOk && !baOk) return { kind: 'wp', wp_post_id: wp, bureau_article_id: null, key: `wp:${wp}` };
  if (!wpOk && baOk) return { kind: 'bureau', wp_post_id: null, bureau_article_id: ba, key: `ba:${ba}` };
  return null;
}

app.get('/api/blog/comments', async (req, res) => {
  const target = pickCommentTarget(req.query);
  if (!target) return res.status(400).json({ error: 'wp_post_id OU bureau_article_id requis' });
  try {
    let q = supabase
      .from('afrilex_blog_comments')
      .select('id, author_name, body, created_at')
      .order('created_at', { ascending: true })
      .limit(500);
    q = target.kind === 'wp'
      ? q.eq('wp_post_id', target.wp_post_id)
      : q.eq('bureau_article_id', target.bureau_article_id);
    const { data, error } = await q;
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
  const { author_name, author_email, body, website } = req.body || {};
  if (website != null && String(website).trim() !== '')
    return res.status(204).send();

  const target = pickCommentTarget(req.body);
  if (!target) return res.status(400).json({ error: 'Article invalide' });
  if (!blogCommentRateOk(ip, target.key))
    return res.status(429).json({ error: 'Trop de commentaires envoyés depuis cette connexion.' });

  const name = sanitizeBlogCommentText(author_name, 120);
  const email = sanitizeBlogCommentText(author_email, 254).toLowerCase();
  const text = sanitizeBlogCommentText(body, 4000);

  if (name.length < 2) return res.status(400).json({ error: 'Indiquez un nom (min. 2 caractères).' });
  if (!isEmailish(email)) return res.status(400).json({ error: 'Adresse email invalide.' });
  if (text.length < 3) return res.status(400).json({ error: 'Le message est trop court.' });

  const insertPayload = {
    wp_post_id: target.wp_post_id,
    bureau_article_id: target.bureau_article_id,
    author_name: name,
    author_email: email,
    body: text,
  };

  const { data, error } = await supabase
    .from('afrilex_blog_comments')
    .insert(insertPayload)
    .select('id, author_name, body, created_at')
    .single();

  if (error) {
    console.error('POST /api/blog/comments', error);
    const missing = /(does not exist|schema cache|Could not find the table)/i.test(error.message || '');
    return res.status(503).json({
      error: missing
        ? 'Créez la table afrilex_blog_comments dans Supabase (voir sql/supabase-setup.sql).'
        : "Impossible d'enregistrer le commentaire.",
    });
  }
  return res.status(201).json({ ok: true, comment: data });
});

// ══════════════════════════════════════════════════════════════════════════════
// JOB OFFERS — CRUD bureau + endpoint public
// ══════════════════════════════════════════════════════════════════════════════
function slugify(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || `offre-${Date.now()}`;
}

async function ensureUniqueSlug(table, baseSlug, excludeId) {
  let slug = baseSlug;
  let n = 1;
  while (true) {
    let q = supabase.from(table).select('id').eq('slug', slug).limit(1);
    if (excludeId) q = q.neq('id', excludeId);
    const { data } = await q;
    if (!data || data.length === 0) return slug;
    n += 1;
    slug = `${baseSlug}-${n}`;
    if (n > 200) return `${baseSlug}-${Date.now()}`;
  }
}

function normalizeJobOfferPayload(b) {
  return {
    position_key:  typeof b.position_key === 'string' && b.position_key.trim() ? b.position_key.trim().slice(0, 64) : null,
    title_fr:      String(b.title_fr ?? '').trim().slice(0, 240),
    title_en:      b.title_en != null ? String(b.title_en).trim().slice(0, 240) || null : null,
    summary_fr:    String(b.summary_fr ?? '').trim().slice(0, 600),
    summary_en:    b.summary_en != null ? String(b.summary_en).trim().slice(0, 600) || null : null,
    meta_fr:       b.meta_fr != null ? String(b.meta_fr).trim().slice(0, 240) || null : null,
    meta_en:       b.meta_en != null ? String(b.meta_en).trim().slice(0, 240) || null : null,
    content_fr:    b.content_fr != null ? String(b.content_fr).slice(0, 60000) || null : null,
    content_en:    b.content_en != null ? String(b.content_en).slice(0, 60000) || null : null,
    contract_type: b.contract_type ? String(b.contract_type).trim().slice(0, 32) : 'cdd',
    location:      b.location != null ? String(b.location).trim().slice(0, 160) || null : null,
    is_new:        b.is_new == null ? true : !!b.is_new,
    is_published:  !!b.is_published,
    sort_order:    Number.isFinite(+b.sort_order) ? +b.sort_order : 0,
  };
}

app.all('/api/bureau/job_offers.php', async (req, res) => {
  try {
    if (!(await authGuard(req, res))) return;
    if (!permGuard(req, res, 'job_offers')) return;
    const { action, id } = req.query;

    if (action === 'list' && req.method === 'GET') {
      const u = await authGuard(req, res); if (!u) return;
      const { data, error } = await supabase
        .from('job_offers')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data ?? []);
    }

    if (action === 'create' && req.method === 'POST') {
      const u = await authGuard(req, res, 'admin'); if (!u) return;
      const payload = normalizeJobOfferPayload(req.body || {});
      if (!payload.title_fr) return res.status(400).json({ error: 'Le titre (FR) est requis' });
      if (!payload.summary_fr) return res.status(400).json({ error: 'Le résumé (FR) est requis' });
      const baseSlug = slugify(req.body?.slug || payload.title_fr);
      const slug = await ensureUniqueSlug('job_offers', baseSlug);
      const { data, error } = await supabase
        .from('job_offers')
        .insert({ ...payload, slug, created_by: u.id, published_at: payload.is_published ? new Date().toISOString() : null })
        .select().single();
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ success: true, offer: data });
    }

    if (action === 'update' && req.method === 'PUT') {
      const u = await authGuard(req, res, 'admin'); if (!u) return;
      const payload = normalizeJobOfferPayload(req.body || {});
      if (!payload.title_fr) return res.status(400).json({ error: 'Le titre (FR) est requis' });
      if (!payload.summary_fr) return res.status(400).json({ error: 'Le résumé (FR) est requis' });
      const offerId = +id;
      const { data: current } = await supabase.from('job_offers').select('slug, is_published, published_at').eq('id', offerId).maybeSingle();
      let slug = current?.slug;
      if (req.body?.slug && slugify(req.body.slug) !== current?.slug) {
        slug = await ensureUniqueSlug('job_offers', slugify(req.body.slug), offerId);
      }
      const newPublishedAt = payload.is_published
        ? (current?.published_at || new Date().toISOString())
        : null;
      const { data, error } = await supabase
        .from('job_offers')
        .update({ ...payload, slug, published_at: newPublishedAt })
        .eq('id', offerId)
        .select().single();
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ success: true, offer: data });
    }

    if (action === 'delete' && req.method === 'DELETE') {
      const u = await authGuard(req, res, 'admin'); if (!u) return;
      const { error } = await supabase.from('job_offers').delete().eq('id', +id);
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ success: true });
    }

    return res.status(404).json({ error: 'Action non trouvée' });
  } catch (e) {
    console.error('job_offers.php', e);
    return res.status(500).json({ error: String(e?.message || e) });
  }
});

app.get('/api/jobs/published', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('job_offers')
      .select('id, slug, position_key, title_fr, title_en, summary_fr, summary_en, meta_fr, meta_en, content_fr, content_en, contract_type, location, is_new, sort_order, published_at')
      .eq('is_published', true)
      .order('sort_order', { ascending: true })
      .order('published_at', { ascending: false });
    if (error) {
      const missing = /(does not exist|schema cache|Could not find the table)/i.test(error.message || '');
      return res.status(missing ? 503 : 500).json({ offers: [], error: missing ? 'Table job_offers absente — exécutez sql/supabase-setup.sql.' : error.message });
    }
    return res.json({ offers: data ?? [] });
  } catch (e) {
    return res.status(500).json({ offers: [], error: String(e?.message || e) });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// BLOG ARTICLES — CRUD bureau + image upload (BYTEA) + endpoints publics
// ══════════════════════════════════════════════════════════════════════════════
function normalizeBlogArticlePayload(b) {
  return {
    title_fr:        String(b.title_fr ?? '').trim().slice(0, 240),
    title_en:        b.title_en != null ? String(b.title_en).trim().slice(0, 240) || null : null,
    excerpt_fr:      b.excerpt_fr != null ? String(b.excerpt_fr).trim().slice(0, 600) || null : null,
    excerpt_en:      b.excerpt_en != null ? String(b.excerpt_en).trim().slice(0, 600) || null : null,
    content_html_fr: String(b.content_html_fr ?? '').slice(0, 200000),
    content_html_en: b.content_html_en != null ? String(b.content_html_en).slice(0, 200000) || null : null,
    cover_image_url: b.cover_image_url != null ? String(b.cover_image_url).trim().slice(0, 600) || null : null,
    categories:      b.categories != null
      ? (Array.isArray(b.categories) ? b.categories : String(b.categories).split(','))
          .map((s) => String(s).trim()).filter(Boolean).slice(0, 10).join(',') || null
      : null,
    is_published:    !!b.is_published,
    author_name:     b.author_name != null ? String(b.author_name).trim().slice(0, 160) || null : null,
  };
}

const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

app.all('/api/bureau/blog_articles.php', async (req, res) => {
  try {
    if (!(await authGuard(req, res))) return;
    if (!permGuard(req, res, 'blog')) return;
    const { action, id } = req.query;

    if (action === 'list' && req.method === 'GET') {
      const u = await authGuard(req, res); if (!u) return;
      const { data, error } = await supabase
        .from('blog_articles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data ?? []);
    }

    if (action === 'get' && req.method === 'GET') {
      const u = await authGuard(req, res); if (!u) return;
      const { data, error } = await supabase
        .from('blog_articles')
        .select('*')
        .eq('id', +id)
        .maybeSingle();
      if (error) return res.status(500).json({ error: error.message });
      if (!data) return res.status(404).json({ error: 'Article introuvable' });
      const { data: images } = await supabase
        .from('blog_article_images')
        .select('id, filename, mime, size_bytes, created_at')
        .eq('article_id', +id)
        .order('created_at', { ascending: false });
      return res.json({ ...data, images: images ?? [] });
    }

    if (action === 'create' && req.method === 'POST') {
      const u = await authGuard(req, res, 'admin'); if (!u) return;
      const payload = normalizeBlogArticlePayload(req.body || {});
      if (!payload.title_fr) return res.status(400).json({ error: 'Le titre (FR) est requis' });
      if (!payload.content_html_fr.trim()) return res.status(400).json({ error: 'Le contenu (FR) est requis' });
      const baseSlug = slugify(req.body?.slug || payload.title_fr);
      const slug = await ensureUniqueSlug('blog_articles', baseSlug);
      if (!payload.author_name) payload.author_name = u.full_name || u.username;
      const { data, error } = await supabase
        .from('blog_articles')
        .insert({ ...payload, slug, created_by: u.id, published_at: payload.is_published ? new Date().toISOString() : null })
        .select().single();
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ success: true, article: data });
    }

    if (action === 'update' && req.method === 'PUT') {
      const u = await authGuard(req, res, 'admin'); if (!u) return;
      const payload = normalizeBlogArticlePayload(req.body || {});
      if (!payload.title_fr) return res.status(400).json({ error: 'Le titre (FR) est requis' });
      if (!payload.content_html_fr.trim()) return res.status(400).json({ error: 'Le contenu (FR) est requis' });
      const articleId = +id;
      const { data: current } = await supabase.from('blog_articles').select('slug, published_at').eq('id', articleId).maybeSingle();
      let slug = current?.slug;
      if (req.body?.slug && slugify(req.body.slug) !== current?.slug) {
        slug = await ensureUniqueSlug('blog_articles', slugify(req.body.slug), articleId);
      }
      const newPublishedAt = payload.is_published
        ? (current?.published_at || new Date().toISOString())
        : null;
      const { data, error } = await supabase
        .from('blog_articles')
        .update({ ...payload, slug, published_at: newPublishedAt })
        .eq('id', articleId)
        .select().single();
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ success: true, article: data });
    }

    if (action === 'delete' && req.method === 'DELETE') {
      const u = await authGuard(req, res, 'admin'); if (!u) return;
      const { error } = await supabase.from('blog_articles').delete().eq('id', +id);
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ success: true });
    }

    if (action === 'upload_image' && req.method === 'POST') {
      const u = await authGuard(req, res, 'admin'); if (!u) return;
      const articleId = +id;
      const { filename, mime, data_base64, set_as_cover } = req.body || {};
      if (!ALLOWED_IMAGE_MIMES.has(String(mime || ''))) return res.status(400).json({ error: 'Type image non supporté (JPEG/PNG/WEBP/GIF).' });
      if (typeof data_base64 !== 'string' || data_base64.length < 64) return res.status(400).json({ error: 'Image absente ou invalide.' });
      const cleanB64 = data_base64.replace(/^data:[^,]+,/, '');
      const buf = Buffer.from(cleanB64, 'base64');
      if (buf.length === 0) return res.status(400).json({ error: 'Image vide.' });
      if (buf.length > MAX_IMAGE_BYTES) return res.status(413).json({ error: 'Image trop lourde (max 5 Mo).' });
      const dataHex = '\\x' + buf.toString('hex');
      const { data, error } = await supabase
        .from('blog_article_images')
        .insert({
          article_id: articleId || null,
          filename: filename ? String(filename).slice(0, 240) : null,
          mime: String(mime),
          data: dataHex,
          size_bytes: buf.length,
        })
        .select('id, filename, mime, size_bytes, created_at')
        .single();
      if (error) return res.status(500).json({ error: error.message });
      const url = `/api/blog/images/${data.id}`;
      if (set_as_cover && articleId) {
        await supabase.from('blog_articles').update({ cover_image_url: url }).eq('id', articleId);
      }
      return res.json({ success: true, image: data, url });
    }

    if (action === 'delete_image' && req.method === 'DELETE') {
      const u = await authGuard(req, res, 'admin'); if (!u) return;
      const imageId = parseInt(String(req.query.image_id), 10);
      if (!Number.isFinite(imageId)) return res.status(400).json({ error: 'image_id requis' });
      const { error } = await supabase.from('blog_article_images').delete().eq('id', imageId);
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ success: true });
    }

    return res.status(404).json({ error: 'Action non trouvée' });
  } catch (e) {
    console.error('blog_articles.php', e);
    return res.status(500).json({ error: String(e?.message || e) });
  }
});

const BLOG_ARTICLE_PUBLIC_COLUMNS =
  'id, slug, title_fr, title_en, excerpt_fr, excerpt_en, content_html_fr, content_html_en, cover_image_url, categories, author_name, published_at, created_at';

app.get('/api/blog/articles', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('blog_articles')
      .select('id, slug, title_fr, title_en, excerpt_fr, excerpt_en, cover_image_url, categories, author_name, published_at, created_at')
      .eq('is_published', true)
      .order('published_at', { ascending: false });
    if (error) {
      const missing = /(does not exist|schema cache|Could not find the table)/i.test(error.message || '');
      return res.status(missing ? 503 : 500).json({ articles: [], error: missing ? 'Table blog_articles absente — exécutez sql/supabase-setup.sql.' : error.message });
    }
    return res.json({ articles: data ?? [] });
  } catch (e) {
    return res.status(500).json({ articles: [], error: String(e?.message || e) });
  }
});

app.get('/api/blog/articles/:slug', async (req, res) => {
  const slug = String(req.params.slug || '').trim();
  if (!slug) return res.status(400).json({ error: 'slug requis' });
  try {
    const { data, error } = await supabase
      .from('blog_articles')
      .select(BLOG_ARTICLE_PUBLIC_COLUMNS)
      .eq('slug', slug)
      .eq('is_published', true)
      .maybeSingle();
    if (error) {
      const missing = /(does not exist|schema cache|Could not find the table)/i.test(error.message || '');
      return res.status(missing ? 503 : 500).json({ error: missing ? 'Table blog_articles absente.' : error.message });
    }
    if (!data) return res.status(404).json({ error: 'Article introuvable' });
    return res.json({ article: data });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
});

app.get('/api/blog/images/:id', async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(id) || id < 1) return res.status(400).send('id invalide');
  try {
    const { data, error } = await supabase
      .from('blog_article_images')
      .select('mime, data, size_bytes')
      .eq('id', id)
      .maybeSingle();
    if (error) return res.status(500).send(error.message);
    if (!data) return res.status(404).send('Image introuvable');
    let buf;
    if (typeof data.data === 'string' && data.data.startsWith('\\x')) {
      buf = Buffer.from(data.data.slice(2), 'hex');
    } else if (typeof data.data === 'string') {
      buf = Buffer.from(data.data, 'base64');
    } else if (Buffer.isBuffer(data.data)) {
      buf = data.data;
    } else {
      return res.status(500).send('Format image inconnu');
    }
    res.set({
      'Content-Type': data.mime || 'application/octet-stream',
      'Content-Length': String(buf.length),
      'Cache-Control': 'public, max-age=31536000, immutable',
    });
    return res.end(buf);
  } catch (e) {
    return res.status(500).send(String(e?.message || e));
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// MAILBOX LWS — comptes mail (super_admin) + lecture IMAP via imapflow
// Mots de passe IMAP chiffrés AES-256-GCM avec MAILBOX_ENCRYPTION_KEY (.env.local).
// ══════════════════════════════════════════════════════════════════════════════
function mailboxKey() {
  const raw = (process.env.MAILBOX_ENCRYPTION_KEY || '').trim();
  if (raw) {
    // Hex (64 caractères) → 32 bytes ; sinon dérive un SHA-256 sur la chaîne.
    const buf = /^[0-9a-f]{64}$/i.test(raw) ? Buffer.from(raw, 'hex') : crypto.createHash('sha256').update(raw).digest();
    return buf;
  }
  // Fallback : dérive depuis la service_role_key (recoverable depuis le serveur, pas optimal mais fonctionnel).
  return crypto.createHash('sha256').update('afrilex-mailbox|' + (process.env.SUPABASE_SERVICE_ROLE_KEY || '')).digest();
}

function encryptSecret(plain) {
  if (typeof plain !== 'string' || !plain) throw new Error('Mot de passe vide');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', mailboxKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`;
}

function decryptSecret(blob) {
  if (typeof blob !== 'string' || !blob.includes(':')) throw new Error('Format chiffré invalide');
  const [ivB64, tagB64, encB64] = blob.split(':');
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const enc = Buffer.from(encB64, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', mailboxKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}

const MAILBOX_PUBLIC_COLUMNS =
  'id, label, email, imap_host, imap_port, imap_secure, smtp_host, smtp_port, smtp_secure, active, created_at, updated_at';

function inferImapDefaults(email) {
  const domain = String(email || '').split('@')[1] || '';
  // LWS standard : mail.lws-hosting.com (pour les domaines hébergés chez LWS).
  // Adapter au besoin via le formulaire.
  return {
    imap_host: domain ? `mail.${domain}` : 'mail.lws-hosting.com',
    imap_port: 993,
    imap_secure: true,
    smtp_host: domain ? `mail.${domain}` : 'mail.lws-hosting.com',
    smtp_port: 465,
    smtp_secure: true,
  };
}

async function loadMailboxAccount(id, includeSecret = false) {
  const cols = includeSecret
    ? `${MAILBOX_PUBLIC_COLUMNS}, password_enc`
    : MAILBOX_PUBLIC_COLUMNS;
  const { data, error } = await supabase.from('mailbox_accounts').select(cols).eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

/** Ouvre une connexion IMAP, exécute fn(client), ferme proprement (logout best-effort). */
async function withImapClient(account, fn, { timeoutMs = 25000 } = {}) {
  if (!ImapFlow) throw new Error('Module imapflow absent — npm install imapflow');
  const client = new ImapFlow({
    host: account.imap_host,
    port: account.imap_port,
    secure: !!account.imap_secure,
    auth: { user: account.email, pass: decryptSecret(account.password_enc) },
    logger: false,
    socketTimeout: timeoutMs,
    greetingTimeout: 10000,
  });
  try {
    await client.connect();
    const r = await fn(client);
    return r;
  } finally {
    try { await client.logout(); } catch { /* ignore */ }
  }
}

app.all('/api/bureau/mailbox.php', async (req, res) => {
  try {
    const { action, id } = req.query;
    const u = await authGuard(req, res, 'super_admin'); if (!u) return;
    if (!permGuard(req, res, 'mailbox')) return;

    if (action === 'accounts' && req.method === 'GET') {
      const { data, error } = await supabase
        .from('mailbox_accounts')
        .select(MAILBOX_PUBLIC_COLUMNS)
        .order('label', { ascending: true });
      if (error) {
        const missing = /(does not exist|schema cache|Could not find the table)/i.test(error.message || '');
        return res.status(missing ? 503 : 500).json({
          error: missing ? 'Table mailbox_accounts absente — exécutez sql/supabase_perms_mailbox_addon.sql.' : error.message,
        });
      }
      return res.json({ accounts: data ?? [] });
    }

    if (action === 'add_account' && req.method === 'POST') {
      const { label, email, password, imap_host, imap_port, imap_secure, smtp_host, smtp_port, smtp_secure } = req.body || {};
      if (!label || !email || !password) return res.status(400).json({ error: 'label, email, password requis.' });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) return res.status(400).json({ error: 'Email invalide.' });
      const defaults = inferImapDefaults(email);
      const payload = {
        label: String(label).trim().slice(0, 160),
        email: String(email).trim().toLowerCase().slice(0, 254),
        imap_host: imap_host ? String(imap_host).trim().slice(0, 240) : defaults.imap_host,
        imap_port: Number.isFinite(+imap_port) ? +imap_port : defaults.imap_port,
        imap_secure: imap_secure == null ? true : !!imap_secure,
        smtp_host: smtp_host ? String(smtp_host).trim().slice(0, 240) : defaults.smtp_host,
        smtp_port: Number.isFinite(+smtp_port) ? +smtp_port : defaults.smtp_port,
        smtp_secure: smtp_secure == null ? true : !!smtp_secure,
        password_enc: encryptSecret(String(password)),
        active: true,
        created_by: u.id,
      };
      const { data, error } = await supabase.from('mailbox_accounts').insert(payload).select(MAILBOX_PUBLIC_COLUMNS).single();
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ success: true, account: data });
    }

    if (action === 'update_account' && req.method === 'PUT') {
      const accountId = +id;
      const body = req.body || {};
      const update = {};
      if (typeof body.label === 'string')       update.label       = body.label.trim().slice(0, 160);
      if (typeof body.email === 'string')       update.email       = body.email.trim().toLowerCase().slice(0, 254);
      if (typeof body.imap_host === 'string')   update.imap_host   = body.imap_host.trim().slice(0, 240);
      if (Number.isFinite(+body.imap_port))     update.imap_port   = +body.imap_port;
      if (body.imap_secure != null)             update.imap_secure = !!body.imap_secure;
      if (typeof body.smtp_host === 'string')   update.smtp_host   = body.smtp_host.trim().slice(0, 240) || null;
      if (Number.isFinite(+body.smtp_port))     update.smtp_port   = +body.smtp_port;
      if (body.smtp_secure != null)             update.smtp_secure = !!body.smtp_secure;
      if (body.active != null)                  update.active      = !!body.active;
      if (typeof body.password === 'string' && body.password.trim() !== '')
        update.password_enc = encryptSecret(body.password);
      const { data, error } = await supabase.from('mailbox_accounts').update(update).eq('id', accountId).select(MAILBOX_PUBLIC_COLUMNS).single();
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ success: true, account: data });
    }

    if (action === 'delete_account' && req.method === 'DELETE') {
      const accountId = +id;
      const { error } = await supabase.from('mailbox_accounts').delete().eq('id', accountId);
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ success: true });
    }

    if (action === 'test_connection' && req.method === 'POST') {
      const accountId = +id;
      const account = await loadMailboxAccount(accountId, true);
      if (!account) return res.status(404).json({ error: 'Compte introuvable' });
      try {
        const r = await withImapClient(account, async (client) => {
          const lock = await client.getMailboxLock('INBOX');
          try {
            const status = await client.status('INBOX', { messages: true, unseen: true });
            return { messages: status.messages ?? 0, unseen: status.unseen ?? 0 };
          } finally {
            lock.release();
          }
        });
        return res.json({ success: true, ...r });
      } catch (e) {
        return res.status(502).json({ success: false, error: String(e?.message || e) });
      }
    }

    if (action === 'inbox' && req.method === 'GET') {
      const accountId = +id;
      const account = await loadMailboxAccount(accountId, true);
      if (!account) return res.status(404).json({ error: 'Compte introuvable' });
      const limit = Math.min(parseInt(String(req.query.limit ?? '50'), 10) || 50, 200);
      const folder = (req.query.folder && String(req.query.folder).trim()) || 'INBOX';
      try {
        const messages = await withImapClient(account, async (client) => {
          const lock = await client.getMailboxLock(folder);
          try {
            const status = await client.status(folder, { messages: true, unseen: true });
            const total = status.messages ?? 0;
            if (total === 0) return { folder, total: 0, unseen: 0, messages: [] };
            const start = Math.max(1, total - limit + 1);
            const range = `${start}:${total}`;
            const list = [];
            for await (const m of client.fetch(range, { uid: true, envelope: true, internalDate: true, flags: true, size: true })) {
              const env = m.envelope || {};
              const fromAddr = (env.from && env.from[0]) || {};
              const toAddrs = Array.isArray(env.to) ? env.to.map((a) => `${a.name ?? ''} <${a.address ?? ''}>`.trim()).join(', ') : '';
              list.push({
                uid: m.uid,
                seq: m.seq,
                date: env.date || m.internalDate || null,
                subject: env.subject || '(sans objet)',
                from_name: fromAddr.name || '',
                from_address: fromAddr.address || '',
                to: toAddrs,
                size: m.size ?? 0,
                seen: Array.isArray(m.flags) ? m.flags.includes('\\Seen') : (m.flags && m.flags.has ? m.flags.has('\\Seen') : false),
                flagged: Array.isArray(m.flags) ? m.flags.includes('\\Flagged') : false,
              });
            }
            list.sort((a, b) => (a.date < b.date ? 1 : -1));
            return { folder, total, unseen: status.unseen ?? 0, messages: list };
          } finally {
            lock.release();
          }
        }, { timeoutMs: 30000 });
        return res.json(messages);
      } catch (e) {
        return res.status(502).json({ error: String(e?.message || e) });
      }
    }

    if (action === 'send' && req.method === 'POST') {
      if (!nodemailer) return res.status(503).json({ error: 'Module nodemailer absent — npm install nodemailer.' });
      const accountId = +id;
      const account = await loadMailboxAccount(accountId, true);
      if (!account) return res.status(404).json({ error: 'Compte introuvable' });
      const { to, cc, bcc, subject, text, html, in_reply_to } = req.body || {};
      const toList   = sanitizeRecipientList(to);
      const ccList   = sanitizeRecipientList(cc);
      const bccList  = sanitizeRecipientList(bcc);
      if (toList.length === 0) return res.status(400).json({ error: 'Au moins un destinataire (To) est requis.' });
      const subjStr = String(subject ?? '').trim().slice(0, 998);
      const textStr = typeof text === 'string' ? text : '';
      const htmlStr = typeof html === 'string' ? html : '';
      if (!textStr.trim() && !htmlStr.trim()) return res.status(400).json({ error: 'Corps du message vide.' });

      const smtpHost = account.smtp_host || account.imap_host;
      const smtpPort = account.smtp_port ?? 465;
      const smtpSecure = account.smtp_secure ?? true;
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: !!smtpSecure,
        auth: { user: account.email, pass: decryptSecret(account.password_enc) },
        connectionTimeout: 25000,
        greetingTimeout: 15000,
      });

      try {
        const info = await transporter.sendMail({
          from: { name: account.label || account.email, address: account.email },
          to: toList,
          cc: ccList.length ? ccList : undefined,
          bcc: bccList.length ? bccList : undefined,
          subject: subjStr || '(sans objet)',
          text: textStr || undefined,
          html: htmlStr || undefined,
          inReplyTo: in_reply_to || undefined,
          references: in_reply_to ? [in_reply_to] : undefined,
        });
        // Best-effort : copie dans le dossier "Sent" via IMAP APPEND.
        try {
          await withImapClient(account, async (client) => {
            const sentBoxes = ['Sent', 'INBOX.Sent', 'Sent Items', 'Sent Messages', 'Envoy\u00e9s', 'INBOX.Envoy\u00e9s'];
            let target = null;
            for (const name of sentBoxes) {
              try {
                const exists = await client.mailboxOpen(name).catch(() => null);
                if (exists) { target = name; await client.mailboxClose(); break; }
              } catch { /* try next */ }
            }
            if (!target) return;
            // Reconstruit un email RFC822 simple (nodemailer renvoie raw via streamTransport, mais on l'a pas activé)
            // → Append minimal : utilise info.message si disponible (pas le cas sans streamTransport).
            // On skip si info.message absent — pas critique.
            const raw = info.message || null;
            if (raw) await client.append(target, raw, ['\\Seen']);
          }, { timeoutMs: 20000 });
        } catch (appendErr) {
          console.warn('Sent folder append skipped:', appendErr?.message);
        }
        try { transporter.close(); } catch { /* ignore */ }
        return res.json({
          success: true,
          messageId: info.messageId,
          accepted: info.accepted,
          rejected: info.rejected,
        });
      } catch (e) {
        try { transporter.close(); } catch { /* ignore */ }
        return res.status(502).json({ success: false, error: String(e?.message || e) });
      }
    }

    if (action === 'message' && req.method === 'GET') {
      const accountId = +id;
      const uid = parseInt(String(req.query.uid ?? ''), 10);
      if (!Number.isFinite(uid)) return res.status(400).json({ error: 'uid requis' });
      const account = await loadMailboxAccount(accountId, true);
      if (!account) return res.status(404).json({ error: 'Compte introuvable' });
      const folder = (req.query.folder && String(req.query.folder).trim()) || 'INBOX';
      try {
        const msg = await withImapClient(account, async (client) => {
          const lock = await client.getMailboxLock(folder);
          try {
            const m = await client.fetchOne(String(uid), { uid: true, envelope: true, source: true, internalDate: true, flags: true, size: true }, { uid: true });
            if (!m) return null;
            const env = m.envelope || {};
            const fromAddr = (env.from && env.from[0]) || {};
            // Parse minimaliste : extraire text/plain et text/html depuis source brute.
            const sourceStr = m.source ? m.source.toString('utf8') : '';
            const { text, html } = quickParseMime(sourceStr);
            return {
              uid: m.uid,
              message_id: env.messageId || null,
              date: env.date || m.internalDate || null,
              subject: env.subject || '(sans objet)',
              from_name: fromAddr.name || '',
              from_address: fromAddr.address || '',
              to: Array.isArray(env.to) ? env.to.map((a) => `${a.name ?? ''} <${a.address ?? ''}>`.trim()).join(', ') : '',
              to_addresses: Array.isArray(env.to) ? env.to.map((a) => a.address).filter(Boolean) : [],
              cc: Array.isArray(env.cc) ? env.cc.map((a) => `${a.name ?? ''} <${a.address ?? ''}>`.trim()).join(', ') : '',
              cc_addresses: Array.isArray(env.cc) ? env.cc.map((a) => a.address).filter(Boolean) : [],
              size: m.size ?? 0,
              text,
              html,
            };
          } finally {
            lock.release();
          }
        });
        if (!msg) return res.status(404).json({ error: 'Message introuvable' });
        return res.json(msg);
      } catch (e) {
        return res.status(502).json({ error: String(e?.message || e) });
      }
    }

    return res.status(404).json({ error: 'Action non trouvée' });
  } catch (e) {
    console.error('mailbox.php', e);
    return res.status(500).json({ error: String(e?.message || e) });
  }
});

/**
 * Normalise une liste de destinataires : accepte tableau ou CSV/saut-de-ligne, valide format email basique.
 * Retire les doublons et limite à 50 destinataires par champ.
 */
function sanitizeRecipientList(input) {
  if (input == null) return [];
  const raw = Array.isArray(input) ? input.join(',') : String(input);
  const seen = new Set();
  const out = [];
  for (const part of raw.split(/[\s,;]+/)) {
    const t = part.trim().replace(/^[<\s]+|[>\s]+$/g, '');
    if (!t || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
    if (out.length >= 50) break;
  }
  return out;
}

/**
 * Parse MIME ultra-léger : extrait text/plain et text/html du brut RFC 822.
 * Suffisant pour 90 % des emails LWS courants ; pour parsing complet (pièces jointes, encodings exotiques),
 * on remplacera par mailparser plus tard.
 */
function quickParseMime(source) {
  if (!source) return { text: '', html: '' };
  const headerEnd = source.indexOf('\r\n\r\n');
  const headers = headerEnd === -1 ? source : source.slice(0, headerEnd);
  const body = headerEnd === -1 ? '' : source.slice(headerEnd + 4);
  const ctMatch = /^content-type:\s*([^;\r\n]+)(?:;\s*boundary="?([^";\r\n]+)"?)?/im.exec(headers);
  const cteMatch = /^content-transfer-encoding:\s*([^\r\n]+)/im.exec(headers);
  const cte = (cteMatch?.[1] || '7bit').toLowerCase().trim();
  const ct = (ctMatch?.[1] || 'text/plain').toLowerCase().trim();
  const boundary = ctMatch?.[2];

  function decode(part, encoding) {
    if (encoding === 'base64') {
      try { return Buffer.from(part.replace(/\s+/g, ''), 'base64').toString('utf8'); } catch { return part; }
    }
    if (encoding === 'quoted-printable') {
      try {
        return part
          .replace(/=\r?\n/g, '')
          .replace(/=([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
      } catch { return part; }
    }
    return part;
  }

  if (!boundary) {
    if (ct.startsWith('text/html'))  return { text: '', html: decode(body, cte) };
    return { text: decode(body, cte), html: '' };
  }

  const sep = `--${boundary}`;
  const parts = body.split(sep).slice(1, -1);
  let text = '';
  let html = '';
  for (const raw of parts) {
    const rPart = raw.replace(/^\r?\n/, '');
    const pHeaderEnd = rPart.indexOf('\r\n\r\n');
    if (pHeaderEnd === -1) continue;
    const pHeaders = rPart.slice(0, pHeaderEnd);
    const pBody = rPart.slice(pHeaderEnd + 4);
    const pCt = (/^content-type:\s*([^;\r\n]+)/im.exec(pHeaders)?.[1] || '').toLowerCase().trim();
    const pCte = (/^content-transfer-encoding:\s*([^\r\n]+)/im.exec(pHeaders)?.[1] || '7bit').toLowerCase().trim();
    if (pCt.startsWith('text/plain') && !text) text = decode(pBody, pCte);
    else if (pCt.startsWith('text/html') && !html) html = decode(pBody, pCte);
  }
  return { text, html };
}

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
  if (!permGuard(req, res, 'assistant')) return;
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
