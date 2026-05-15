/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BUREAU_API?: string;
  readonly VITE_CLIENT_API?: string;
  readonly VITE_CHAT_API_URL?: string;
  readonly VITE_API_URL?: string;
  readonly VITE_CAREERS_API_URL?: string;
  readonly VITE_WP_REST_BASE?: string;
  readonly VITE_BASE_PATH?: string;
  /** Mettre `true` en dev pour conserver les URLs distantes (Render) au lieu du proxy local. */
  readonly VITE_USE_REMOTE_API?: string;
  /** Dev only : « 1 » = ignorer blog-feed.json, utiliser l’API WordPress en direct. */
  readonly VITE_BLOG_USE_LIVE_WP?: string;
}
