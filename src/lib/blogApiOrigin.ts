import { readRuntimeEnv } from "./runtimeEnv";

/** Origine HTTP de l’API Node (Render, etc.) — même logique que pour le formulaire contact. */
export function blogCommentsApiOrigin(): string {
  const u = readRuntimeEnv("VITE_API_URL", "");
  if (typeof u !== "string" || !/^https?:\/\//i.test(u)) return "";
  try {
    const { protocol, host } = new URL(u);
    return `${protocol}//${host}`;
  } catch {
    return "";
  }
}
