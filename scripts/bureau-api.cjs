// ══════════════════════════════════════════════════════════════════════════════
// NUMAFRIQ Bureau — API Express + Supabase (PostgreSQL)
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
  'http://localhost:3100',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3100',
  'http://127.0.0.1:5173',
];
/** http(s) sur localhost / 127.0.0.1 — tout port (Vite change souvent de port). */
const LOCALHOST_ANY_PORT = /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/;
/** Sites vitrine officiels et sous-domaines (www, préprod, etc.) sans config Render. */
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
    if (LOCALHOST_ANY_PORT.test(origin)) return cb(null, true);
    if (DEFAULT_SITE_ORIGIN.test(origin)) return cb(null, true);
    if (CORS_REGEXES.some((re) => re.test(origin))) return cb(null, true);
    console.warn('[cors] origine refusée (ajoutez-la dans CORS_ORIGINS sur Render) :', origin);
    cb(null, false);
  },
  credentials: true,
}));
app.use(express.json());

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

function safeComparePassword(plain, hash) {
  if (plain == null || typeof plain !== 'string') return false;
  if (!hash || typeof hash !== 'string' || hash.length < 10) return false;
  try {
    return bcrypt.compareSync(plain, hash);
  } catch {
    return false;
  }
}

function loadKbBureauMarkdown() {
  const dir = path.join(__dirname, '..', 'api', 'bureau', 'kb');
  if (!fs.existsSync(dir)) return '';
  try {
    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.md'))
      .sort()
      .map((f) => fs.readFileSync(path.join(dir, f), 'utf-8'))
      .join('\n\n---\n\n');
  } catch {
    return '';
  }
}

// Auth guard bureau — retourne user ou null (envoie la réponse si erreur)
async function authGuard(req, res, minRole = 'agent') {
  const m = (req.headers.authorization ?? '').match(/^Bearer\s+(.+)$/i);
  if (!m) { res.status(401).json({ error: 'Non authentifié' }); return null; }

  const { data: sess } = await supabase
    .from('sessions')
    .select('expires_at, user:users!user_id(id,username,full_name,email,role,active,first_login,avatar,password)')
    .eq('token', m[1])
    .single();

  if (!sess || new Date(sess.expires_at) < new Date() || !sess.user?.active) {
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

// ── Migration legacy : ancien compte dinar → sagnon (site cabinet Afrilex) ─────
async function migrateDinarToSagnonIfNeeded() {
  const { data: hasSagnon } = await supabase.from('users').select('id').eq('username', 'sagnon').maybeSingle();
  if (hasSagnon?.id) return;
  const { data: dinar } = await supabase.from('users').select('id').eq('username', 'dinar').maybeSingle();
  if (!dinar?.id) return;
  const hash = bcrypt.hashSync('SAGNON', 12);
  await supabase
    .from('users')
    .update({
      username: 'sagnon',
      password: hash,
      full_name: 'Administrateur Afrilex',
      email: 'cabinet@afrilexconseil.com',
    })
    .eq('id', dinar.id);
  console.log('✅ Compte bureau : « dinar » → « sagnon » (mot de passe : SAGNON)');
}

// ── Seed initial ──────────────────────────────────────────────────────────────
async function seedIfEmpty() {
  const { count } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('username', 'sagnon');
  if (count > 0) return;

  const hash = bcrypt.hashSync('SAGNON', 12);
  const { data: admin } = await supabase
    .from('users')
    .insert({
      username: 'sagnon',
      password: hash,
      full_name: 'Administrateur Afrilex',
      email: 'cabinet@afrilexconseil.com',
      role: 'super_admin',
      first_login: true,
      active: true,
    })
    .select().single();

  if (!admin) return;
  const aid = admin.id;

  const { data: p1 } = await supabase.from('projects').insert({ name: 'Site vitrine Telecel', client: 'Telecel Faso', description: 'Refonte site corporate', status: 'en_cours', priority: 'haute', budget: 850000, progress: 65, created_by: aid }).select().single();
  const { data: p2 } = await supabase.from('projects').insert({ name: 'E-commerce BarkaPro', client: 'BarkaPro', description: 'Boutique en ligne', status: 'en_cours', priority: 'normale', budget: 1200000, progress: 40, created_by: aid }).select().single();

  await supabase.from('accounting').insert([
    { type: 'recette', category: 'Projet',    amount: 850000, description: 'Acompte Telecel Faso', date: '2026-04-01', created_by: aid, project_id: p1?.id },
    { type: 'depense', category: 'Logiciels', amount: 45000,  description: 'Adobe CC',             date: '2026-04-01', created_by: aid },
  ]);

  console.log('✅ Super admin bureau « sagnon » créé (mot de passe : SAGNON — à changer en production)');
}

// ══════════════════════════════════════════════════════════════════════════════
// AUTH BUREAU (toutes méthodes : GET me, PUT profile, POST login… — aligné front)
// ══════════════════════════════════════════════════════════════════════════════
app.all('/api/bureau/auth.php', async (req, res) => {
  try {
    const { action } = req.query;
    const method = req.method;

    // ── Login ────────────────────────────────────────────────────────────────
    if (method === 'POST' && action === 'login') {
      const { username, password } = req.body || {};
      if (!username || typeof password !== 'string' || !password.trim())
        return res.status(400).json({ error: 'Identifiants requis' });

      const uname = String(username).trim().toLowerCase();

      const { data: user, error: selErr } = await supabase
        .from('users')
        .select('*')
        .eq('username', uname)
        .eq('active', true)
        .maybeSingle();

      if (selErr) {
        console.error('POST auth login select', selErr);
        return res.status(500).json({ error: 'Erreur base de données', detail: selErr.message });
      }

      if (!user || !safeComparePassword(password, user.password))
        return res.status(401).json({ error: 'Identifiants incorrects' });

      const token = makeToken();
      const { error: sessErr } = await supabase
        .from('sessions')
        .insert({ user_id: user.id, token, expires_at: in8h() });

      if (sessErr) {
        console.error('POST auth login session', sessErr);
        return res.status(500).json({
          error: 'Impossible de créer la session',
          detail: sessErr.message,
          hint: 'Créez la table sessions dans Supabase (sql/supabase-setup.sql).',
        });
      }

      await supabase.from('users').update({ last_login: now() }).eq('id', user.id);

      const uid = Number(user.id);
      return res.json({
        token,
        first_login: !!user.first_login,
        user: {
          id: uid,
          username: user.username,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
        },
      });
    }

    // ── Logout ───────────────────────────────────────────────────────────────
    if (method === 'POST' && action === 'logout') {
      const m = (req.headers.authorization ?? '').match(/Bearer\s+(.+)/i);
      if (m) await supabase.from('sessions').delete().eq('token', m[1]);
      return res.json({ success: true });
    }

    // ── Me ─────────────────────────────────────────────────────────────────────
    if (method === 'GET' && action === 'me') {
      const u = await authGuard(req, res);
      if (!u) return;
      const uid = Number(u.id);
      return res.json({
        id: uid,
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
      const u = await authGuard(req, res);
      if (!u) return;
      const { new_password, old_password } = req.body || {};
      if (!new_password || new_password.length < 6) return res.status(400).json({ error: 'Mot de passe trop court (min 6)' });
      if (!u.first_login && !safeComparePassword(old_password ?? '', u.password))
        return res.status(401).json({ error: 'Ancien mot de passe incorrect' });
      await supabase.from('users').update({ password: bcrypt.hashSync(new_password, 12), first_login: false }).eq('id', u.id);
      return res.json({ success: true });
    }

    // ── Update profile ─────────────────────────────────────────────────────────
    if (method === 'PUT' && action === 'profile') {
      const u = await authGuard(req, res);
      if (!u) return;
      const { username, full_name, email } = req.body || {};
      const { data: dup } = await supabase.from('users').select('id').eq('username', username).neq('id', u.id).maybeSingle();
      if (dup) return res.status(409).json({ error: "Nom d'utilisateur déjà pris" });
      await supabase.from('users').update({ username, full_name, email }).eq('id', u.id);
      return res.json({ success: true });
    }

    res.status(404).json({ error: 'Action non trouvée' });
  } catch (e) {
    console.error('/api/bureau/auth.php', e);
    return res.status(500).json({ error: 'Erreur serveur', detail: String(e?.message || e) });
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
      .select('id,username,full_name,email,role,avatar,active,created_at,last_login')
      .order('role', { ascending: false }).order('full_name');
    return res.json(data ?? []);
  }

  if (action === 'create' && req.method === 'POST') {
    const u = await authGuard(req, res, 'super_admin'); if (!u) return;
    const { username, full_name, email, role, password } = req.body;
    if (!username || !full_name || !password) return res.status(400).json({ error: 'Champs requis manquants' });
    const { error } = await supabase.from('users').insert({ username, password: bcrypt.hashSync(password, 12), full_name, email: email || null, role: role || 'agent', first_login: true, active: true });
    if (error) return res.status(409).json({ error: "Ce nom d'utilisateur existe déjà" });
    return res.json({ success: true });
  }

  if (action === 'update' && req.method === 'PUT') {
    const u = await authGuard(req, res, 'super_admin'); if (!u) return;
    const { username, full_name, email, role, active } = req.body;
    await supabase.from('users').update({ username, full_name, email, role, active: active ?? true }).eq('id', +id);
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
    await supabase.from('users').update({ password: bcrypt.hashSync(req.body.password || 'Numafriq2026!', 12), first_login: true }).eq('id', +id);
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
    const cStatus = async (eq) =>
      supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', eq);
    const [
      { count: total },
      { count: nouveau },
      { count: en_cours },
      { count: converti },
      { count: perdu },
      { count: archive },
    ] = await Promise.all([
      supabase.from('leads').select('*', { count: 'exact', head: true }),
      cStatus('nouveau'),
      cStatus('en_cours'),
      cStatus('converti'),
      cStatus('perdu'),
      cStatus('archive'),
    ]);
    return res.json({
      total: total ?? 0,
      nouveau: nouveau ?? 0,
      en_cours: en_cours ?? 0,
      converti: converti ?? 0,
      perdu: perdu ?? 0,
      archive: archive ?? 0,
    });
  }

  if (action === 'update' && req.method === 'PUT') {
    const u = await authGuard(req, res); if (!u) return;
    const { status, assigned_to, notes } = req.body;
    const patch = {};
    if (status !== undefined) patch.status = status;
    if (assigned_to !== undefined) patch.assigned_to = assigned_to || null;
    if (notes !== undefined) patch.notes = notes;
    if (!Object.keys(patch).length) return res.status(422).json({ error: 'Aucun champ à mettre à jour' });
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
    await supabase.from('client_messages').insert({ client_id: client.id, sender_type: 'agent', content: `Bonjour ${name} ! 👋 Bienvenue dans votre espace client NUMAFRIQ. Notre équipe est là pour vous accompagner.` });
    sendWhatsApp(`✅ *Nouveau client NUMAFRIQ*\n\n👤 ${name}\n📧 ${email}\n🏢 ${company || 'Non précisé'}\n⏰ ${new Date().toLocaleString('fr-FR')}`);
    const token = makeToken();
    await supabase.from('client_sessions').insert({ client_id: client.id, token, expires_at: in12h() });
    return res.json({ token, client: { id: client.id, name, email, company: company || null, phone: phone || null } });
  }

  if (action === 'login' && req.method === 'POST') {
    const { email, password } = req.body;
    const { data: client } = await supabase.from('clients').select('*').eq('email', email).eq('active', true).single();
    if (!client || !bcrypt.compareSync(password, client.password)) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
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
    if (!bcrypt.compareSync(old_password ?? '', c.password)) return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
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

  const { data, error } = await supabase.from('leads')
    .insert({ name, email, phone: phone || null, company: company || null, service: service || null, budget: budget || null, timeline: timeline || null, message, status: 'nouveau' })
    .select().single();

  if (error) return res.status(500).json({ success: false, message: error.message });

  sendWhatsApp(`🔔 *Nouvelle demande NUMAFRIQ*\n\n👤 ${name}\n📧 ${email}\n📞 ${phone || '—'}\n🏢 ${company || '—'}\n🛠 ${service || '—'}\n💰 ${budget || '—'}\n📅 ${timeline || '—'}\n\n💬 ${message}\n\n🔗 /bureau/leads\n⏰ ${new Date().toLocaleString('fr-FR')}`);

  return res.json({ success: true, message: 'Demande enregistrée', id: data?.id });
});

// ══════════════════════════════════════════════════════════════════════════════
// BLOG — fichier JSON sur le disque du serveur API (pas Supabase). Édition /bureau/blog
// Variables : BLOG_STORE_PATH (optionnel, chemin absolu vers le fichier JSON).
// ══════════════════════════════════════════════════════════════════════════════
const BLOG_STORE_PATH = process.env.BLOG_STORE_PATH
  ? path.resolve(process.env.BLOG_STORE_PATH)
  : path.join(__dirname, '..', 'data', 'blog-store.json');

const CAREERS_OFFERS_PATH = process.env.CAREERS_OFFERS_PATH
  ? path.resolve(process.env.CAREERS_OFFERS_PATH)
  : path.join(__dirname, '..', 'data', 'careers-offers.json');

function blogEnsureDataDir() {
  const dir = path.dirname(BLOG_STORE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadBlogStore() {
  try {
    blogEnsureDataDir();
    if (!fs.existsSync(BLOG_STORE_PATH)) {
      const empty = { version: 1, articles: [], comments: [] };
      saveBlogStore(empty);
      return empty;
    }
    const raw = fs.readFileSync(BLOG_STORE_PATH, 'utf8');
    const data = JSON.parse(raw);
    if (!Array.isArray(data.articles)) data.articles = [];
    if (!Array.isArray(data.comments)) data.comments = [];
    return data;
  } catch (e) {
    console.error('[blog] lecture fichier:', e.message);
    return { version: 1, articles: [], comments: [] };
  }
}

function saveBlogStore(store) {
  blogEnsureDataDir();
  const tmp = `${BLOG_STORE_PATH}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2), 'utf8');
  fs.renameSync(tmp, BLOG_STORE_PATH);
}

function blogSlugFromTitle(title) {
  return String(title || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200);
}
function isValidBlogSlug(slug) {
  return typeof slug === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= 200;
}
function sanitizeBlogArticleHtml(html) {
  if (typeof html !== 'string') return '';
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .slice(0, 500000);
}
function sanitizeBlogExcerpt(s, max = 4000) {
  if (typeof s !== 'string') return '';
  const t = s.replace(/[\u0000-\u001f]/g, ' ').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return t.length <= max ? t : t.slice(0, max);
}

function mapArticleRow(row, includeBody) {
  const o = {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    featured_image_url: row.featured_image_url ?? null,
    categories: Array.isArray(row.categories) ? row.categories : [],
    published: !!row.published,
    published_at: row.published_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
  if (includeBody) o.body_html = row.body_html ?? '';
  return o;
}

function blogSlugTaken(store, slug, excludeId) {
  return store.articles.some((a) => {
    if (a.slug !== slug) return false;
    if (excludeId == null || excludeId === '') return true;
    return a.id !== excludeId;
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// OFFRES EMPLOI (site carrières) — JSON sur disque serveur API, CRUD /bureau/recrutement
// Variable : CAREERS_OFFERS_PATH (optionnel).
// ══════════════════════════════════════════════════════════════════════════════
const CAREERS_LEGACY_POSITIONS = new Set([
  'developer_fullstack', 'developer_frontend', 'developer_backend', 'designer_uiux',
  'seo_content', 'project_manager', 'marketing_growth', 'legal_editorial', 'internship', 'spontaneous',
]);
const CAREERS_CONTRACTS = new Set(['cdi', 'cdd', 'freelance', 'internship', 'discuss']);
const CAREERS_EXPERIENCE = new Set(['0-1', '2-3', '4-6', '7plus', '']);
const CAREERS_EDUCATION = new Set(['bac', 'bac2_3', 'bac4_5', 'bac5_plus', 'professional_track', '']);

const CAREERS_ALLOWED_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

function careersEnsureOffersDir() {
  const dir = path.dirname(CAREERS_OFFERS_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadCareersOffersStore() {
  try {
    careersEnsureOffersDir();
    if (!fs.existsSync(CAREERS_OFFERS_PATH)) {
      const empty = { version: 1, offers: [] };
      saveCareersOffersStore(empty);
      return empty;
    }
    const raw = fs.readFileSync(CAREERS_OFFERS_PATH, 'utf8');
    const data = JSON.parse(raw);
    if (!Array.isArray(data.offers)) data.offers = [];
    return data;
  } catch (e) {
    console.error('[careers-offers] lecture:', e.message);
    return { version: 1, offers: [] };
  }
}

function saveCareersOffersStore(store) {
  careersEnsureOffersDir();
  const tmp = `${CAREERS_OFFERS_PATH}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2), 'utf8');
  fs.renameSync(tmp, CAREERS_OFFERS_PATH);
}

function isValidCareerPositionKey(key) {
  return typeof key === 'string' && /^[a-z0-9_]{2,120}$/.test(key);
}

function publishedCareerPositionKeys(store) {
  const keys = new Set(CAREERS_LEGACY_POSITIONS);
  for (const o of store.offers || []) {
    if (o && o.published && o.position_key) keys.add(String(o.position_key));
  }
  return keys;
}

function mapCareersOfferPublic(row) {
  return {
    id: row.id,
    position_key: row.position_key,
    title_fr: row.title_fr,
    title_en: row.title_en,
    meta_fr: row.meta_fr ?? '',
    meta_en: row.meta_en ?? '',
    summary_fr: row.summary_fr ?? '',
    summary_en: row.summary_en ?? '',
    detail_fr: row.detail_fr ?? '',
    detail_en: row.detail_en ?? '',
    sort_order: typeof row.sort_order === 'number' ? row.sort_order : 0,
    published_at: row.published_at,
    updated_at: row.updated_at,
  };
}

function mapCareersOfferAdmin(row) {
  return { ...mapCareersOfferPublic(row), published: !!row.published, created_at: row.created_at };
}

function positionKeyTaken(store, positionKey, excludeId) {
  return store.offers.some((o) => {
    if (o.position_key !== positionKey) return false;
    if (excludeId == null || excludeId === '') return true;
    return o.id !== excludeId;
  });
}

function waMsgCareerApp(fullName, email, phone, position, contract, cvName) {
  return (
    '📋 *Nouvelle candidature (Afrilex / NUMAFRIQ)*\n\n' +
    `👤 *Nom :* ${fullName}\n` +
    `📧 *Email :* ${email}\n` +
    `📞 *Tél :* ${phone}\n\n` +
    `💼 *Poste :* ${position}\n` +
    `📄 *Contrat :* ${contract}\n` +
    `📎 *CV :* ${cvName}\n\n` +
    '➡️ CV stocké dans Supabase (table job_applications).\n' +
    `⏰ ${new Date().toLocaleString('fr-FR')}`
  );
}

/** Offres publiées — site public carrières. */
app.get('/api/careers/offers', (_req, res) => {
  try {
    const store = loadCareersOffersStore();
    const offers = store.offers
      .filter((o) => o.published)
      .sort((a, b) => {
        const so = (a.sort_order ?? 0) - (b.sort_order ?? 0);
        if (so !== 0) return so;
        return new Date(b.updated_at || 0) - new Date(a.updated_at || 0);
      })
      .map((r) => mapCareersOfferPublic(r));
    return res.json({ offers });
  } catch (e) {
    console.error('GET /api/careers/offers', e);
    return res.status(500).json({ error: e.message, offers: [] });
  }
});

app.all('/api/bureau/careers-offers.php', async (req, res) => {
  const { action, id } = req.query;

  if (action === 'list') {
    const u = await authGuard(req, res, 'admin');
    if (!u) return;
    const store = loadCareersOffersStore();
    const offers = [...store.offers].sort(
      (a, b) => new Date(b.updated_at) - new Date(a.updated_at),
    );
    return res.json({ offers: offers.map((r) => mapCareersOfferAdmin(r)) });
  }

  if (action === 'get') {
    const u = await authGuard(req, res, 'admin');
    if (!u) return;
    if (!id) return res.status(422).json({ error: 'id requis' });
    const store = loadCareersOffersStore();
    const row = store.offers.find((o) => o.id === id);
    if (!row) return res.status(404).json({ error: 'Offre introuvable' });
    return res.json({ offer: mapCareersOfferAdmin(row) });
  }

  if (action === 'create' && req.method === 'POST') {
    const u = await authGuard(req, res, 'admin');
    if (!u) return;
    const position_key = String(req.body?.position_key || '').trim().toLowerCase();
    const title_fr = sanitizeBlogExcerpt(String(req.body?.title_fr || ''), 300);
    const title_en = sanitizeBlogExcerpt(String(req.body?.title_en || ''), 300);
    if (!isValidCareerPositionKey(position_key)) {
      return res.status(422).json({ error: 'Clé poste invalide (min 2 car., a-z, 0-9, _).' });
    }
    if (!title_fr.length || !title_en.length) return res.status(422).json({ error: 'Titres FR et EN requis.' });
    const store = loadCareersOffersStore();
    if (positionKeyTaken(store, position_key, null)) return res.status(409).json({ error: 'Cette clé existe déjà.' });
    if (CAREERS_LEGACY_POSITIONS.has(position_key)) {
      return res.status(409).json({ error: 'Clé réservée (poste générique). Choisissez un autre identifiant.' });
    }
    const now = new Date().toISOString();
    const published = !!req.body?.published;
    const row = {
      id: crypto.randomUUID(),
      position_key,
      title_fr,
      title_en,
      meta_fr: sanitizeBlogExcerpt(String(req.body?.meta_fr || ''), 500),
      meta_en: sanitizeBlogExcerpt(String(req.body?.meta_en || ''), 500),
      summary_fr: sanitizeBlogExcerpt(String(req.body?.summary_fr || ''), 4000),
      summary_en: sanitizeBlogExcerpt(String(req.body?.summary_en || ''), 4000),
      detail_fr: sanitizeBlogArticleHtml(String(req.body?.detail_fr || '')),
      detail_en: sanitizeBlogArticleHtml(String(req.body?.detail_en || '')),
      sort_order: Math.min(9999, Math.max(0, parseInt(String(req.body?.sort_order ?? '0'), 10) || 0)),
      published,
      published_at: published ? (req.body?.published_at ? String(req.body.published_at) : now) : null,
      created_at: now,
      updated_at: now,
    };
    store.offers.push(row);
    saveCareersOffersStore(store);
    return res.status(201).json({ ok: true, offer: mapCareersOfferAdmin(row) });
  }

  if (action === 'update' && req.method === 'PUT') {
    const u = await authGuard(req, res, 'admin');
    if (!u) return;
    if (!id) return res.status(422).json({ error: 'id requis' });
    const store = loadCareersOffersStore();
    const idx = store.offers.findIndex((o) => o.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Offre introuvable' });
    const patch = {};
    if (req.body?.position_key !== undefined) {
      const pk = String(req.body.position_key || '').trim().toLowerCase();
      if (!isValidCareerPositionKey(pk)) return res.status(422).json({ error: 'Clé poste invalide.' });
      if (CAREERS_LEGACY_POSITIONS.has(pk)) {
        return res.status(409).json({ error: 'Clé réservée aux postes génériques.' });
      }
      if (positionKeyTaken(store, pk, id)) return res.status(409).json({ error: 'Cette clé existe déjà.' });
      patch.position_key = pk;
    }
    if (req.body?.title_fr !== undefined) patch.title_fr = sanitizeBlogExcerpt(String(req.body.title_fr), 300);
    if (req.body?.title_en !== undefined) patch.title_en = sanitizeBlogExcerpt(String(req.body.title_en), 300);
    if (req.body?.meta_fr !== undefined) patch.meta_fr = sanitizeBlogExcerpt(String(req.body.meta_fr), 500);
    if (req.body?.meta_en !== undefined) patch.meta_en = sanitizeBlogExcerpt(String(req.body.meta_en), 500);
    if (req.body?.summary_fr !== undefined) patch.summary_fr = sanitizeBlogExcerpt(String(req.body.summary_fr), 4000);
    if (req.body?.summary_en !== undefined) patch.summary_en = sanitizeBlogExcerpt(String(req.body.summary_en), 4000);
    if (req.body?.detail_fr !== undefined) patch.detail_fr = sanitizeBlogArticleHtml(String(req.body.detail_fr));
    if (req.body?.detail_en !== undefined) patch.detail_en = sanitizeBlogArticleHtml(String(req.body.detail_en));
    if (req.body?.sort_order !== undefined) {
      patch.sort_order = Math.min(9999, Math.max(0, parseInt(String(req.body.sort_order), 10) || 0));
    }
    if (req.body?.published !== undefined) {
      patch.published = !!req.body.published;
      if (patch.published) {
        patch.published_at =
          req.body?.published_at != null && String(req.body.published_at).trim()
            ? String(req.body.published_at)
            : store.offers[idx].published_at || new Date().toISOString();
      } else {
        patch.published_at = null;
      }
    }
    patch.updated_at = new Date().toISOString();
    Object.assign(store.offers[idx], patch);
    saveCareersOffersStore(store);
    return res.json({ ok: true, offer: mapCareersOfferAdmin(store.offers[idx]) });
  }

  if (action === 'delete' && req.method === 'DELETE') {
    const u = await authGuard(req, res, 'admin');
    if (!u) return;
    if (!id) return res.status(422).json({ error: 'id requis' });
    const store = loadCareersOffersStore();
    const before = store.offers.length;
    store.offers = store.offers.filter((o) => o.id !== id);
    if (store.offers.length === before) return res.status(404).json({ error: 'Offre introuvable' });
    saveCareersOffersStore(store);
    return res.json({ ok: true });
  }

  res.status(404).json({ error: 'Action non trouvée' });
});

app.post(
  '/api/careers.php',
  (req, res, next) => {
    uploadCareersCv.single('cv')(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(422).json({
            success: false,
            message: 'Le CV ne doit pas dépasser 5 Mo.',
          });
        }
        return res.status(422).json({ success: false, message: 'Envoi du fichier CV invalide.' });
      }
      next();
    });
  },
  async (req, res) => {
    const store = loadCareersOffersStore();
    const allowedPos = publishedCareerPositionKeys(store);

    const locale = ['fr', 'en'].includes(String(req.body?.locale || '').toLowerCase())
      ? String(req.body.locale).toLowerCase()
      : 'fr';
    const msg = (fr, en) => (locale === 'en' ? en : fr);

    if (req.body?.website != null && String(req.body.website).trim() !== '') {
      return res.status(200).json({ success: true, message: 'OK' });
    }

    const first = String(req.body?.first_name || '').trim();
    const last = String(req.body?.last_name || '').trim();
    const email = String(req.body?.email || '').trim();
    const motivation = String(req.body?.motivation || '').trim();
    const consent = req.body?.consent_data_processing === '1' || req.body?.consent_data_processing === 'true';

    if (!first || !last || !email || !motivation) {
      return res.status(422).json({ success: false, message: msg('Champs obligatoires manquants.', 'Missing required fields.') });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(422).json({ success: false, message: msg('Email invalide.', 'Invalid email.') });
    }
    if (motivation.length < 80) {
      return res.status(422).json({
        success: false,
        message: msg(
          'Le message de motivation doit contenir au moins 80 caractères.',
          'Motivation text must be at least 80 characters.',
        ),
      });
    }
    if (!consent) {
      return res.status(422).json({
        success: false,
        message: msg(
          'Vous devez accepter le traitement de vos données pour envoyer votre candidature.',
          'You must accept the processing of your data to apply.',
        ),
      });
    }

    const position = String(req.body?.position_applied || '').trim();
    const contract = String(req.body?.contract_type || '').trim();
    if (!allowedPos.has(position)) {
      return res.status(422).json({ success: false, message: msg('Poste invalide.', 'Invalid position.') });
    }
    if (!CAREERS_CONTRACTS.has(contract)) {
      return res.status(422).json({ success: false, message: msg('Type de contrat invalide.', 'Invalid contract type.') });
    }

    const experience = String(req.body?.experience_years || '').trim();
    const education = String(req.body?.education_level || '').trim();
    if (experience && !CAREERS_EXPERIENCE.has(experience)) {
      return res.status(422).json({ success: false, message: msg('Expérience invalide.', 'Invalid experience.') });
    }
    if (education && !CAREERS_EDUCATION.has(education)) {
      return res.status(422).json({ success: false, message: msg('Niveau de formation invalide.', 'Invalid education level.') });
    }

    let linkedin = String(req.body?.linkedin_url || '').trim();
    if (linkedin) {
      if (!/^https?:\/\//i.test(linkedin)) linkedin = 'https://' + linkedin.replace(/^\//, '');
      if (linkedin.length > 500 || !/^https?:\/\/.+/i.test(linkedin)) {
        return res.status(422).json({ success: false, message: msg('URL LinkedIn invalide.', 'Invalid LinkedIn URL.') });
      }
    }

    const f = req.file;
    if (!f || !f.buffer) {
      return res.status(422).json({ success: false, message: msg('Veuillez joindre votre CV.', 'Please attach your CV.') });
    }
    const origName = f.originalname || 'cv';
    const ext = path.extname(origName).toLowerCase().slice(1);
    const allowedExt = ['pdf', 'doc', 'docx'];
    if (!allowedExt.includes(ext)) {
      return res.status(422).json({
        success: false,
        message: msg('Le CV doit être au format PDF, DOC ou DOCX.', 'CV must be PDF, DOC or DOCX.'),
      });
    }
    const mime = f.mimetype || '';
    if (!CAREERS_ALLOWED_MIME.has(mime)) {
      return res.status(422).json({
        success: false,
        message: msg('Type de fichier CV non autorisé.', 'Invalid CV file type.'),
      });
    }

    const fullName = `${first} ${last}`;
    const phone = String(req.body?.phone || '').trim();
    const city = String(req.body?.city_country || '').trim();
    const availability = String(req.body?.availability || '').trim();
    const languages = String(req.body?.languages || '').trim();

    try {
      const { error: insErr } = await supabase.from('job_applications').insert({
        first_name: first,
        last_name: last,
        email,
        phone: phone || null,
        city_country: city || null,
        linkedin_url: linkedin || null,
        position_applied: position,
        contract_type: contract,
        availability: availability || null,
        experience_years: experience || null,
        education_level: education || null,
        languages: languages || null,
        motivation,
        cv_original_name: origName,
        cv_mime: mime,
        cv_data: f.buffer,
        locale,
        consent_data_processing: true,
      });
      if (insErr) {
        console.error('[careers.php] insert', insErr);
        return res.status(500).json({
          success: false,
          message: msg(
            'Impossible d’enregistrer votre candidature. Réessayez plus tard.',
            'Could not save your application. Please try again later.',
          ),
          hint: 'Vérifiez que la table job_applications existe (sql/supabase_job_applications.sql).',
        });
      }
    } catch (e) {
      console.error('[careers.php]', e);
      return res.status(500).json({ success: false, message: msg('Erreur serveur.', 'Server error.') });
    }

    sendWhatsApp(waMsgCareerApp(fullName, email, phone || '—', position, contract, origName));

    return res.json({
      success: true,
      message: msg('Candidature enregistrée.', 'Application submitted.'),
    });
  },
);

/** Liste publique (publiés uniquement). */
app.get('/api/blog/posts', (_req, res) => {
  try {
    const store = loadBlogStore();
    const posts = store.articles
      .filter((a) => a.published)
      .sort((a, b) => new Date(b.published_at || b.updated_at) - new Date(a.published_at || a.updated_at))
      .slice(0, 100)
      .map((r) => mapArticleRow(r, false));
    return res.json({ posts });
  } catch (e) {
    console.error('GET /api/blog/posts', e);
    return res.status(500).json({ error: e.message, posts: [] });
  }
});

/** Détail public par slug. */
app.get('/api/blog/posts/:slug', (req, res) => {
  const slug = String(req.params.slug || '').trim().slice(0, 220);
  if (!isValidBlogSlug(slug)) return res.status(400).json({ error: 'Slug invalide' });
  try {
    const store = loadBlogStore();
    const row = store.articles.find((a) => a.slug === slug && a.published);
    if (!row) return res.status(404).json({ error: 'Article introuvable' });
    return res.json({ post: mapArticleRow(row, true) });
  } catch (e) {
    console.error('GET /api/blog/posts/:slug', e);
    return res.status(500).json({ error: e.message });
  }
});

// CRUD bureau — agent ; suppression article → admin
app.all('/api/bureau/blog.php', async (req, res) => {
  const { action, id } = req.query;

  if (action === 'list') {
    const u = await authGuard(req, res); if (!u) return;
    const store = loadBlogStore();
    const articles = [...store.articles].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    return res.json({ articles: articles.map((r) => mapArticleRow(r, true)) });
  }

  if (action === 'get') {
    const u = await authGuard(req, res); if (!u) return;
    if (!id) return res.status(422).json({ error: 'id requis' });
    const store = loadBlogStore();
    const row = store.articles.find((a) => a.id === id);
    if (!row) return res.status(404).json({ error: 'Article introuvable' });
    return res.json({ article: mapArticleRow(row, true) });
  }

  if (action === 'comments_list' && req.method === 'GET') {
    const u = await authGuard(req, res); if (!u) return;
    const store = loadBlogStore();
    const aid = String(req.query.article_id ?? '').trim();
    let list = store.comments;
    if (aid) list = list.filter((c) => c.article_id === aid);
    list = [...list].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const comments = list.map((c) => ({
      id: c.id,
      article_id: c.article_id,
      author_name: c.author_name,
      author_email: c.author_email,
      body: c.body,
      created_at: c.created_at,
      article_title: store.articles.find((a) => a.id === c.article_id)?.title ?? '—',
    }));
    return res.json({ comments });
  }

  if (action === 'comment_delete' && req.method === 'DELETE') {
    const u = await authGuard(req, res, 'admin'); if (!u) return;
    const cid = String(req.query.id ?? '');
    if (!cid) return res.status(422).json({ error: 'id requis' });
    const store = loadBlogStore();
    const before = store.comments.length;
    store.comments = store.comments.filter((c) => c.id !== cid);
    if (store.comments.length === before) return res.status(404).json({ error: 'Commentaire introuvable' });
    saveBlogStore(store);
    return res.json({ ok: true });
  }

  if (action === 'create' && req.method === 'POST') {
    const u = await authGuard(req, res); if (!u) return;
    let slug = String(req.body?.slug || '').trim();
    const title = sanitizeBlogExcerpt(String(req.body?.title || ''), 500);
    const excerpt = sanitizeBlogExcerpt(String(req.body?.excerpt || ''), 4000);
    const body_html = sanitizeBlogArticleHtml(String(req.body?.body_html || ''));
    const featured_image_url = req.body?.featured_image_url != null
      ? String(req.body.featured_image_url).trim().slice(0, 2000) || null
      : null;
    const categories = Array.isArray(req.body?.categories)
      ? req.body.categories.map((c) => String(c).trim()).filter(Boolean).slice(0, 20)
      : [];
    const published = !!req.body?.published;
    if (!title.length) return res.status(422).json({ error: 'Titre requis' });
    if (!excerpt.length) return res.status(422).json({ error: 'Résumé requis' });
    if (!body_html.length) return res.status(422).json({ error: 'Contenu HTML requis' });
    if (!slug.length) slug = blogSlugFromTitle(title);
    if (!isValidBlogSlug(slug)) return res.status(422).json({ error: 'Slug invalide (lettres minuscules, chiffres, tirets).' });
    const published_at = published ? (req.body?.published_at ? String(req.body.published_at) : new Date().toISOString()) : null;
    const store = loadBlogStore();
    if (blogSlugTaken(store, slug, null)) return res.status(409).json({ error: 'Ce slug existe déjà.' });
    const now = new Date().toISOString();
    const row = {
      id: crypto.randomUUID(),
      slug,
      title,
      excerpt,
      body_html,
      featured_image_url,
      categories,
      published,
      published_at,
      created_at: now,
      updated_at: now,
    };
    store.articles.push(row);
    saveBlogStore(store);
    return res.status(201).json({ ok: true, article: mapArticleRow(row, true) });
  }

  if (action === 'update' && req.method === 'PUT') {
    const u = await authGuard(req, res); if (!u) return;
    if (!id) return res.status(422).json({ error: 'id requis' });
    const patch = {};
    if (req.body?.slug !== undefined) {
      const s = String(req.body.slug || '').trim();
      if (!isValidBlogSlug(s)) return res.status(422).json({ error: 'Slug invalide' });
      patch.slug = s;
    }
    if (req.body?.title !== undefined) patch.title = sanitizeBlogExcerpt(String(req.body.title), 500);
    if (req.body?.excerpt !== undefined) patch.excerpt = sanitizeBlogExcerpt(String(req.body.excerpt), 4000);
    if (req.body?.body_html !== undefined) patch.body_html = sanitizeBlogArticleHtml(String(req.body.body_html));
    if (req.body?.featured_image_url !== undefined) {
      const x = String(req.body.featured_image_url || '').trim();
      patch.featured_image_url = x.length >= 8 ? x.slice(0, 2000) : null;
    }
    if (req.body?.categories !== undefined) {
      patch.categories = Array.isArray(req.body.categories)
        ? req.body.categories.map((c) => String(c).trim()).filter(Boolean).slice(0, 20)
        : [];
    }
    if (req.body?.published !== undefined) {
      patch.published = !!req.body.published;
      if (patch.published && req.body?.published_at !== undefined) {
        patch.published_at = req.body.published_at ? String(req.body.published_at) : new Date().toISOString();
      } else if (patch.published === true) {
        const store = loadBlogStore();
        const cur = store.articles.find((a) => a.id === id);
        patch.published_at = cur?.published_at || new Date().toISOString();
      } else if (patch.published === false) {
        patch.published_at = null;
      }
    }
    patch.updated_at = new Date().toISOString();
    if (patch.title !== undefined && !String(patch.title).trim())
      return res.status(422).json({ error: 'Titre invalide' });
    if (patch.excerpt !== undefined && !String(patch.excerpt).trim())
      return res.status(422).json({ error: 'Résumé invalide' });
    if (patch.body_html !== undefined && !String(patch.body_html).trim())
      return res.status(422).json({ error: 'Contenu invalide' });
    const meaningfulKeys = Object.keys(patch).filter((k) => k !== 'updated_at');
    if (!meaningfulKeys.length) return res.status(422).json({ error: 'Aucun champ à mettre à jour' });

    const store = loadBlogStore();
    const idx = store.articles.findIndex((a) => a.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Article introuvable' });
    if (patch.slug && blogSlugTaken(store, patch.slug, id)) return res.status(409).json({ error: 'Ce slug existe déjà.' });
    Object.assign(store.articles[idx], patch);
    saveBlogStore(store);
    return res.json({ ok: true, article: mapArticleRow(store.articles[idx], true) });
  }

  if (action === 'delete' && req.method === 'DELETE') {
    const u = await authGuard(req, res, 'admin'); if (!u) return;
    if (!id) return res.status(422).json({ error: 'id requis' });
    const store = loadBlogStore();
    const before = store.articles.length;
    store.articles = store.articles.filter((a) => a.id !== id);
    if (store.articles.length === before) return res.status(404).json({ error: 'Article introuvable' });
    store.comments = store.comments.filter((c) => c.article_id !== id);
    saveBlogStore(store);
    return res.json({ ok: true });
  }

  res.status(404).json({ error: 'Action non trouvée' });
});

// ── Commentaires lecteurs (même fichier JSON) ─────────────────────────────────
const BLOG_COMMENT_HITS = new Map(); // `${ip}:${topicKey}` → timestamps ms
function blogCommentRateOk(ip, topicKey, max = 5, windowMs = 3_600_000) {
  const k = `${ip}:${topicKey}`;
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

/** Liste des commentaires publics pour un article (UUID). */
app.get('/api/blog/comments', (req, res) => {
  const articleId = String(req.query.article_id ?? '').trim();
  const uuidOk =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(articleId);
  if (!uuidOk) return res.status(400).json({ error: 'article_id (UUID) requis' });
  try {
    const store = loadBlogStore();
    const article = store.articles.find((a) => a.id === articleId && a.published);
    if (!article) return res.json({ comments: [] });
    const comments = store.comments
      .filter((c) => c.article_id === articleId)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .slice(0, 500)
      .map((c) => ({ id: c.id, author_name: c.author_name, body: c.body, created_at: c.created_at }));
    return res.json({ comments });
  } catch (e) {
    console.error('GET /api/blog/comments', e);
    return res.status(500).json({ error: e.message, comments: [] });
  }
});

/** Publication d’un commentaire (anti‑spam + limite débit IP). */
app.post('/api/blog/comments', (req, res) => {
  const ip = req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim()
    || req.socket?.remoteAddress
    || 'unknown';
  const { article_id, author_name, author_email, body, website } = req.body || {};
  if (website != null && String(website).trim() !== '')
    return res.status(204).send();

  const aid = String(article_id ?? '').trim();
  const uuidOk =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(aid);
  if (!uuidOk) return res.status(400).json({ error: 'Article invalide.' });

  if (!blogCommentRateOk(ip, `a:${aid}`))
    return res.status(429).json({ error: 'Trop de commentaires envoyés depuis cette connexion.' });

  const name = sanitizeBlogCommentText(author_name, 120);
  const email = sanitizeBlogCommentText(author_email, 254).toLowerCase();
  const text = sanitizeBlogCommentText(body, 4000);

  if (name.length < 2) return res.status(400).json({ error: 'Indiquez un nom (min. 2 caractères).' });
  if (!isEmailish(email)) return res.status(400).json({ error: 'Adresse email invalide.' });
  if (text.length < 3) return res.status(400).json({ error: 'Le message est trop court.' });

  try {
    const store = loadBlogStore();
    const article = store.articles.find((a) => a.id === aid && a.published);
    if (!article) return res.status(400).json({ error: 'Article introuvable ou non publié.' });

    const comment = {
      id: crypto.randomUUID(),
      article_id: aid,
      author_name: name,
      author_email: email,
      body: text,
      created_at: new Date().toISOString(),
    };
    store.comments.push(comment);
    saveBlogStore(store);
    return res.status(201).json({
      ok: true,
      comment: {
        id: comment.id,
        author_name: comment.author_name,
        body: comment.body,
        created_at: comment.created_at,
      },
    });
  } catch (e) {
    console.error('POST /api/blog/comments', e);
    return res.status(500).json({ error: "Impossible d'enregistrer le commentaire." });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// CHAT IA — Proxy Groq
// ══════════════════════════════════════════════════════════════════════════════
const GROQ_KEY = process.env.GROQ_API_KEY || '';

app.post('/api/chat.php', async (req, res) => {
  const { messages } = req.body;
  if (!messages) return res.status(400).json({ error: 'messages requis' });

  const system = `Tu es NUMA, l'assistant IA officiel de NUMAFRIQ.
Tu es professionnel, chaleureux et orienté résultat.
Réponds TOUJOURS en français sauf si le client parle anglais.
Services : Sites vitrine (450k FCFA+), E-commerce (850k+), SEO, Branding, Apps web.
Contact : info@numafriq.com | WhatsApp +22656191930 | Réponse < 24h.
Si l'utilisateur veut un devis, recueille nom + téléphone puis ajoute en fin de réponse :
[LEAD:nom=NOM|tel=TEL|sujet=SUJET]`;

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
      sendWhatsApp(`🤖 *Lead chat NUMAFRIQ*\n👤 ${lm[1].trim()}\n📞 ${lm[2].trim()}\n🎯 ${lm[3].trim()}\n⏰ ${new Date().toLocaleString('fr-FR')}`);
      text = text.replace(/\[LEAD:[^\]]+\]/gi, '').trim();
      lead = true;
    }
    return res.json({ success: true, message: text, lead });
  } catch(e) {
    return res.status(500).json({ error: 'Erreur IA : ' + e.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// DÉMARRAGE — migrations avant écoute (évite login avant seed)
// ══════════════════════════════════════════════════════════════════════════════
const PORT = process.env.PORT || 8080;

migrateDinarToSagnonIfNeeded()
  .then(() => seedIfEmpty())
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n🚀 NUMAFRIQ API (Supabase) — http://localhost:${PORT}`);
      console.log(`   GET http://localhost:${PORT}/api/bureau/health — tables users / sessions`);
      console.log(`   📄 Blog JSON : ${BLOG_STORE_PATH}`);
      console.log(`   📋 Offres emploi JSON : ${CAREERS_OFFERS_PATH}`);
      console.log(`   📱 WhatsApp : +${WA_PHONE}`);
      if (!META_ACCESS_TOKEN) console.log('   ⚠️  WhatsApp → console (dev mode)');
      console.log('');
      console.log('   Connexion bureau : utilisateur « sagnon » ou « SAGNON » (identifiant sans casse), mot de passe : « SAGNON » — changez en prod.\n');
    });
  })
  .catch((err) => {
    console.error('\n❌ Bootstrap Supabase impossible avant démarrage :', err?.message || err);
    console.error('   Vérifiez SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY et sql/supabase-setup.sql.\n');
    process.exit(1);
  });
