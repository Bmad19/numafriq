#!/usr/bin/env node
/**
 * À chaque build : télécharge les articles WordPress (REST) et écrit public/blog-feed.json.
 * En ligne, plus besoin que /wp-json soit joignable depuis le navigateur — upload dist suffit.
 *
 * Variables : `process.env.VITE_WP_REST_BASE`, puis `.env.production`, `.env.local`,
 * puis essais automatiques `www` et apex (l’apex sert souvent la SPA et masque `/wp-json`).
 *
 * Si la synchro échoue : secours `data/blog-feed.manual.json` (liste éditoriale),
 * puis conservation d’un `blog-feed.json` déjà rempli si présent.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const outPath = path.join(root, 'public', 'blog-feed.json');

function parseEnvFile(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) return out;
  const raw = fs.readFileSync(filePath, 'utf8');
  for (const line of raw.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
      v = v.slice(1, -1);
    out[k] = v;
  }
  return out;
}

function wpPlainText(html) {
  if (!html) return '';
  return String(html)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function pickFeaturedUrl(media) {
  if (!media?.source_url) return null;
  const sizes = media.media_details?.sizes;
  const prefer = ['medium_large', 'large', 'medium', 'thumbnail'];
  for (const key of prefer) {
    const u = sizes?.[key]?.source_url;
    if (u) return u;
  }
  return media.source_url ?? null;
}

function normalize(post) {
  const embeddedTerms = post._embedded?.['wp:term'] ?? [];
  const categories =
    embeddedTerms.flat().filter((term) => term.taxonomy === 'category').map((term) => term.name) ?? [];

  const media = post._embedded?.['wp:featuredmedia']?.[0];
  const featuredImageUrl = pickFeaturedUrl(media);

  return {
    id: post.id,
    slug: post.slug,
    title: wpPlainText(post.title?.rendered ?? ''),
    excerptPlain: wpPlainText(post.excerpt?.rendered ?? ''),
    link: post.link,
    date: post.date,
    featuredImageUrl,
    categories,
  };
}

function wpSiteOrigin(wpRestBase) {
  try {
    const u = new URL(wpRestBase.endsWith('/') ? wpRestBase.slice(0, -1) : wpRestBase);
    return `${u.protocol}//${u.host}`;
  } catch {
    return 'https://afrilexconseil.com';
  }
}

function fixRelativeWpMediaUrls(html, origin) {
  if (!html) return '';
  return String(html).replace(
    /\b(src|href)="\/(wp-content\/[^"]+)"/gi,
    (_, attr, p) => `${attr}="${origin}/${p}"`,
  );
}

function uniqBases(list) {
  const seen = new Set();
  const out = [];
  for (const raw of list) {
    if (!raw || typeof raw !== 'string') continue;
    const b = raw.replace(/\/$/, '').trim();
    if (!b || seen.has(b)) continue;
    seen.add(b);
    out.push(b);
  }
  return out;
}

function collectRestBases() {
  const prodEnv = parseEnvFile(path.join(root, '.env.production'));
  const localEnv = parseEnvFile(path.join(root, '.env.local'));
  return uniqBases([
    process.env.VITE_WP_REST_BASE,
    prodEnv.VITE_WP_REST_BASE,
    localEnv.VITE_WP_REST_BASE,
    'https://www.afrilexconseil.com/wp-json',
    'https://afrilexconseil.com/wp-json',
  ]);
}

function readExistingFeed() {
  try {
    const j = JSON.parse(fs.readFileSync(outPath, 'utf8'));
    if (j && Array.isArray(j.posts) && j.posts.length) return j;
  } catch {
    /* ignore */
  }
  return null;
}

/** Secours si l’API WP n’est pas joignable (SPA sur /wp-json) : `data/blog-feed.manual.json`. */
function loadManualFallbackFeed() {
  const manualPath = path.join(root, 'data', 'blog-feed.manual.json');
  if (!fs.existsSync(manualPath)) return null;
  try {
    const j = JSON.parse(fs.readFileSync(manualPath, 'utf8'));
    const posts = j.posts;
    if (!Array.isArray(posts) || !posts.length) return null;
    for (const p of posts) {
      if (
        typeof p.id !== 'number' ||
        typeof p.slug !== 'string' ||
        typeof p.title !== 'string' ||
        typeof p.contentHtml !== 'string'
      ) {
        return null;
      }
    }
    return {
      posts,
      label: 'manual:data/blog-feed.manual.json',
    };
  } catch {
    return null;
  }
}

async function fetchPostsFromBase(base) {
  const origin = wpSiteOrigin(base);
  const url = `${base}/wp/v2/posts?${new URLSearchParams({
    per_page: '100',
    orderby: 'date',
    order: 'desc',
    _embed: '1',
  })}`;
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'AfrilexConseil-blog-sync/1.0',
    },
  });
  const ct = res.headers.get('content-type') || '';
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const looksJson = /\bjson\b/i.test(ct) || text.trim().startsWith('[');
  if (!looksJson) throw new Error('Réponse non JSON (HTML ou erreur réseau)');
  const data = JSON.parse(text);
  if (!Array.isArray(data)) throw new Error('Réponse WP invalide');
  const posts = data.map((row) => {
    const baseNorm = normalize(row);
    const contentHtml = fixRelativeWpMediaUrls(row.content?.rendered ?? '', origin);
    return { ...baseNorm, contentHtml };
  });
  return { source: base, posts };
}

async function main() {
  const bases = collectRestBases();
  let previous = readExistingFeed();
  let lastErr = 'Aucune base WordPress essayée';

  for (const base of bases) {
    try {
      const { source, posts } = await fetchPostsFromBase(base);
      const payload = {
        version: 1,
        generatedAt: new Date().toISOString(),
        source,
        posts,
      };
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8');
      console.log(`✅ Blog : ${posts.length} article(s) → public/blog-feed.json (source ${source})`);
      return;
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
    }
  }

  const manual = loadManualFallbackFeed();
  if (manual) {
    const payload = {
      version: 1,
      generatedAt: new Date().toISOString(),
      source: manual.label,
      posts: manual.posts,
    };
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8');
    console.log(`✅ Blog : ${manual.posts.length} article(s) → public/blog-feed.json (${manual.label})`);
    return;
  }

  if (previous) {
    console.warn(`⚠️  Sync WordPress échec (${lastErr}) — conservation du blog-feed.json existant.`);
    return;
  }
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        version: 1,
        generatedAt: new Date().toISOString(),
        source: bases[0] ?? '',
        posts: [],
        syncError: lastErr,
      },
      null,
      2,
    ),
    'utf8',
  );
  console.warn(`⚠️  Blog : aucun article synchronisé (${lastErr}). Fichier vide créé.`);
}

await main();
