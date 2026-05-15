#!/usr/bin/env node
/**
 * Vérifie que .env.production existe et ne contient plus le placeholder.
 * Usage : node scripts/verify-production-env.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const envPath = path.join(root, '.env.production');

if (!fs.existsSync(envPath)) {
  console.error('❌ Fichier .env.production absent.\n');
  console.error('   → Copiez .env.production.example vers .env.production puis remplacez VOTRE-API.example.com par l’URL réelle de votre API.\n');
  process.exit(1);
}

const raw = fs.readFileSync(envPath, 'utf8');
const lines = raw.split('\n').filter((l) => l.trim() && !l.trim().startsWith('#'));

const requiredKeys = ['VITE_BUREAU_API', 'VITE_CLIENT_API', 'VITE_CHAT_API_URL', 'VITE_API_URL'];
const missing = [];
const bad = [];

for (const key of requiredKeys) {
  const line = lines.find((l) => l.startsWith(`${key}=`));
  if (!line) {
    missing.push(key);
    continue;
  }
  const val = line.slice(key.length + 1).trim();
  if (!val || val.includes('VOTRE-API.example.com') || val.includes('example.com')) {
    bad.push(key);
  }
}

if (missing.length) {
  console.error('❌ Clés manquantes dans .env.production :', missing.join(', '));
  process.exit(1);
}
if (bad.length) {
  console.error('❌ Remplacez encore le placeholder dans :', bad.join(', '));
  console.error('   L’URL doit être celle de votre API déployée (ex. https://xxx.onrender.com), sans slash final.\n');
  process.exit(1);
}

console.log('✅ .env.production : les 4 VITE_* pointent vers une URL réelle.');
console.log('   Vous pouvez lancer : npm run build\n');
process.exit(0);
