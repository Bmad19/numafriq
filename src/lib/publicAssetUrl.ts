/**
 * URL absolue vers un fichier dans `public/` (copié à la racine du déploiement).
 * Corrige le cas `base: "./"` où `./blog-feed.json` depuis `/blog/slug` pointe au mauvais dossier.
 */
export function publicAssetUrl(file: string): string {
  if (typeof window === "undefined") return `/${file.replace(/^\//, "")}`;
  const origin = window.location.origin;
  let base = import.meta.env.BASE_URL || "/";
  const name = file.replace(/^\//, "");

  if (base === "./") {
    return `${origin}/${name}`.replace(/([^:]\/)\/+/g, "$1");
  }

  if (!base.startsWith("/")) base = `/${base.replace(/^\.\//, "")}`;
  const dir = base.endsWith("/") ? base.slice(0, -1) : base;
  if (!dir || dir === "/") return `${origin}/${name}`.replace(/([^:]\/)\/+/g, "$1");
  return `${origin}${dir}/${name}`.replace(/([^:]\/)\/+/g, "$1");
}
