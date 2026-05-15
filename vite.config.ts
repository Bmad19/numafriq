import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Déploiement :
 * - Sans variable → `./` (chemins relatifs : tolère téléversement dans un sous-dossier ou racine FTP).
 * - `VITE_BASE_PATH=/` dans `.env.production` → URLs absolues (recommandé si le site est à la racine du domaine,
 *   sinon `/recrutement` charge les JS depuis `/recrutement/assets/…` → 404).
 * - `VITE_BASE_PATH=/mon-site/` → sous-dossier avec basename React Router.
 *
 * Utilise loadEnv : seuls `process.env.VITE_*` sans loadEnv ne voient pas `.env.production` au chargement de cette config.
 */
function viteBase(mode: string): string {
  const env = loadEnv(mode, process.cwd(), "");
  const raw = env.VITE_BASE_PATH?.trim();
  if (raw === "/") return "/";
  if (raw && raw !== "") {
    const lead = raw.startsWith("/") ? raw : `/${raw}`;
    return lead.endsWith("/") ? lead : `${lead}/`;
  }
  return "./";
}

export default defineConfig(({ mode }) => ({
  base: viteBase(mode),
  plugins: [react()],

  server: {
    // Premier port libre ≥ 3100 pour ne pas empiéter sur NUMAFRIQ (3000) ; l’URL exacte s’affiche au lancement.
    host: true,
    port: 3100,
    strictPort: false,
    // Pas de header no-cache — Vite gère le cache HMR via les query params ?t=…
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false,
      },
    },
  },

  build: {
    // Minification agressive
    minify: "esbuild",
    target: "es2020",
    // Seuil d'avertissement relevé (fichiers avec hash = cache long terme OK)
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Chunks manuels : sépare react, animations, i18n, bureau, client
        manualChunks(id) {
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom") || id.includes("node_modules/react-router")) {
            return "react-vendor";
          }
          if (id.includes("node_modules/framer-motion")) {
            return "motion";
          }
          if (id.includes("node_modules/i18next") || id.includes("node_modules/react-i18next")) {
            return "i18n";
          }
          if (id.includes("/src/bureau/")) {
            return "bureau";
          }
          if (id.includes("/src/client/")) {
            return "client";
          }
        },
        // Noms de fichiers avec hash pour cache-busting automatique
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
    // Purge du dossier dist à chaque build
    emptyOutDir: true,
    // Source maps seulement en dev
    sourcemap: false,
    // CSS inline si < 4kb, sinon chunk séparé
    cssCodeSplit: true,
  },

  // Optimise les dépendances pré-bundlées en dev
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "framer-motion",
      "i18next",
      "react-i18next",
    ],
  },

  cacheDir: "node_modules/.vite",
}));
