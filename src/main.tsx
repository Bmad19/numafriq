import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import "./i18n";
import App from "./App";
import { BRAND_LOGO_PNG } from "./components/BrandLogo";
import { ErrorBoundary } from "./components/ErrorBoundary";

/** Charge `public/runtime-config.js` avant React (évite page blanche / doubles configs avec Vite HTML). */
function loadPublicRuntimeConfig(): Promise<void> {
  return new Promise((resolve) => {
    const src = `${import.meta.env.BASE_URL}runtime-config.js`;
    const sc = document.createElement("script");
    sc.src = src;
    sc.async = false;
    sc.onload = () => resolve();
    sc.onerror = () => resolve();
    document.head.appendChild(sc);
  });
}

function viteRouterBasename(): string | undefined {
  const base = import.meta.env.BASE_URL;
  if (!base || base === "/" || base === "./") return undefined;
  const trimmed = base.replace(/\/$/, "");
  return trimmed === "" ? undefined : trimmed;
}

/** Onglet du navigateur / ajout écran d’accueil : même URL que `BrandLogo`. */
function applyLogoAsSiteIcons(): void {
  const href = BRAND_LOGO_PNG.replace(/([^:]\/)\/+/g, "$1");

  const upsert = (rel: string) => {
    let el = document.querySelector(`link[rel="${rel}"]`);
    if (!el || el.tagName !== "LINK") {
      el = document.createElement("link");
      el.setAttribute("rel", rel);
      document.head.appendChild(el);
    }
    el.setAttribute("href", href);
    el.setAttribute("type", "image/png");
  };

  upsert("icon");
  upsert("apple-touch-icon");
  document.querySelectorAll('link[rel="icon"][type="image/svg+xml"]').forEach((n) => n.remove());
}

async function bootstrap() {
  applyLogoAsSiteIcons();
  await loadPublicRuntimeConfig();

  const rootEl = document.getElementById("root");
  if (!rootEl) {
    document.body.innerHTML = "<p style=\"font-family:sans-serif;padding:2rem\">Élément #root introuvable.</p>";
    return;
  }
  createRoot(rootEl).render(
    <StrictMode>
      <ErrorBoundary>
        <BrowserRouter basename={viteRouterBasename()}>
          <App />
        </BrowserRouter>
      </ErrorBoundary>
    </StrictMode>
  );
}

bootstrap();
