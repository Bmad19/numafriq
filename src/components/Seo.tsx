import { useEffect } from "react";

type SeoProps = {
  title: string;
  description: string;
};

function upsertMeta(name: string, content: string, attribute: "name" | "property" = "name") {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${name}"]`);

  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, name);
    document.head.appendChild(element);
  }

  element.setAttribute("content", content);
}

function upsertCanonical(href: string) {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');

  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", "canonical");
    document.head.appendChild(element);
  }

  element.setAttribute("href", href);
}

export function Seo({ title, description }: SeoProps) {
  useEffect(() => {
    const fullTitle = `${title} | Afrilex Conseil`;
    const url = window.location.href;

    document.title = fullTitle;
    upsertMeta("description", description);
    upsertMeta("og:title", fullTitle, "property");
    upsertMeta("og:description", description, "property");
    upsertMeta("og:url", url, "property");
    upsertMeta("twitter:title", fullTitle);
    upsertMeta("twitter:description", description);
    upsertCanonical(url);
  }, [description, title]);

  return null;
}
