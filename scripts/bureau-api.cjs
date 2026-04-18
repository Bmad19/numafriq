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
  'http://localhost:3000',
  'http://localhost:5173',
];
app.use(cors({
  origin: (origin, cb) => {
    // Autoriser les requêtes sans origin (Postman, server-to-server) et les origines listées
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error(`CORS bloqué : ${origin}`));
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

// ── Helpers ───────────────────────────────────────────────────────────────────
const makeToken  = () => crypto.randomBytes(32).toString('hex');
const in8h       = () => new Date(Date.now() + 8  * 3600_000).toISOString();
const in12h      = () => new Date(Date.now() + 12 * 3600_000).toISOString();
const now        = () => new Date().toISOString();
const ROLES      = { agent: 1, admin: 2, super_admin: 3 };

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

// ── Seed initial ──────────────────────────────────────────────────────────────
async function seedIfEmpty() {
  const { count } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('username', 'dinar');
  if (count > 0) return;

  const hash = bcrypt.hashSync('dinar', 12);
  const { data: admin } = await supabase
    .from('users')
    .insert({ username: 'dinar', password: hash, full_name: 'Super Administrateur', email: 'admin@numafriq.com', role: 'super_admin', first_login: true, active: true })
    .select().single();

  if (!admin) return;
  const aid = admin.id;

  const { data: p1 } = await supabase.from('projects').insert({ name: 'Site vitrine Telecel', client: 'Telecel Faso', description: 'Refonte site corporate', status: 'en_cours', priority: 'haute', budget: 850000, progress: 65, created_by: aid }).select().single();
  const { data: p2 } = await supabase.from('projects').insert({ name: 'E-commerce BarkaPro', client: 'BarkaPro', description: 'Boutique en ligne', status: 'en_cours', priority: 'normale', budget: 1200000, progress: 40, created_by: aid }).select().single();

  await supabase.from('accounting').insert([
    { type: 'recette', category: 'Projet',    amount: 850000, description: 'Acompte Telecel Faso', date: '2026-04-01', created_by: aid, project_id: p1?.id },
    { type: 'depense', category: 'Logiciels', amount: 45000,  description: 'Adobe CC',             date: '2026-04-01', created_by: aid },
  ]);

  console.log('✅ Super admin "dinar" créé (mot de passe : dinar)');
}

// ══════════════════════════════════════════════════════════════════════════════
// AUTH BUREAU
// ══════════════════════════════════════════════════════════════════════════════
app.post('/api/bureau/auth.php', async (req, res) => {
  const { action } = req.query;

  // ── Login ──────────────────────────────────────────────────────────────────
  if (action === 'login') {
    const { username, password } = req.body;
    const { data: user } = await supabase.from('users').select('*').eq('username', username).eq('active', true).single();
    if (!user || !bcrypt.compareSync(password, user.password))
      return res.status(401).json({ error: 'Identifiants incorrects' });

    const token = makeToken();
    await supabase.from('sessions').insert({ user_id: user.id, token, expires_at: in8h() });
    await supabase.from('users').update({ last_login: now() }).eq('id', user.id);
    return res.json({ token, first_login: !!user.first_login, user: { id: user.id, username: user.username, full_name: user.full_name, email: user.email, role: user.role, avatar: user.avatar } });
  }

  // ── Logout ─────────────────────────────────────────────────────────────────
  if (action === 'logout') {
    const m = (req.headers.authorization ?? '').match(/Bearer\s+(.+)/i);
    if (m) await supabase.from('sessions').delete().eq('token', m[1]);
    return res.json({ success: true });
  }

  // ── Me ─────────────────────────────────────────────────────────────────────
  if (action === 'me') {
    const u = await authGuard(req, res); if (!u) return;
    return res.json({ id: u.id, username: u.username, full_name: u.full_name, email: u.email, role: u.role, avatar: u.avatar, first_login: !!u.first_login });
  }

  // ── Change password ────────────────────────────────────────────────────────
  if (action === 'change_password') {
    const u = await authGuard(req, res); if (!u) return;
    const { new_password, old_password } = req.body;
    if (!new_password || new_password.length < 6) return res.status(400).json({ error: 'Mot de passe trop court (min 6)' });
    if (!u.first_login && !bcrypt.compareSync(old_password ?? '', u.password))
      return res.status(401).json({ error: 'Ancien mot de passe incorrect' });
    await supabase.from('users').update({ password: bcrypt.hashSync(new_password, 12), first_login: false }).eq('id', u.id);
    return res.json({ success: true });
  }

  // ── Update profile ─────────────────────────────────────────────────────────
  if (action === 'profile') {
    const u = await authGuard(req, res); if (!u) return;
    const { username, full_name, email } = req.body;
    const { data: dup } = await supabase.from('users').select('id').eq('username', username).neq('id', u.id).maybeSingle();
    if (dup) return res.status(409).json({ error: "Nom d'utilisateur déjà pris" });
    await supabase.from('users').update({ username, full_name, email }).eq('id', u.id);
    return res.json({ success: true });
  }

  res.status(404).json({ error: 'Action non trouvée' });
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
    const unread: Record<string, number> = {};
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
    const [{ count: total }, { count: nouveau }, { count: en_cours }, { count: converti }] = await Promise.all([
      supabase.from('leads').select('*', { count: 'exact', head: true }),
      supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'nouveau'),
      supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'en_cours'),
      supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'converti'),
    ]);
    return res.json({ total, nouveau, en_cours, converti });
  }

  if (action === 'update' && req.method === 'PUT') {
    const u = await authGuard(req, res); if (!u) return;
    const { status, assigned_to, notes } = req.body;
    await supabase.from('leads').update({ status, assigned_to: assigned_to || null, notes: notes || null }).eq('id', +id);
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
// DÉMARRAGE
// ══════════════════════════════════════════════════════════════════════════════
const PORT = process.env.PORT || 8080;
app.listen(PORT, async () => {
  console.log(`\n🚀 NUMAFRIQ API (Supabase) — http://localhost:${PORT}`);
  console.log(`   🗄️  ${SUPABASE_URL}`);
  console.log(`   📱 WhatsApp : +${WA_PHONE}`);
  if (!META_ACCESS_TOKEN) console.log('   ⚠️  WhatsApp → console (dev mode)');
  console.log('');
  await seedIfEmpty();
});
