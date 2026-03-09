import { useEffect } from "react";
import { DEFAULT_OG_IMAGE } from "../../lib/seo/siteSeo";

function upsertMeta(selector, attributes) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement("meta");
    document.head.appendChild(el);
  }

  Object.entries(attributes).forEach(([key, value]) => {
    if (value != null) el.setAttribute(key, value);
  });

  return el;
}

function upsertCanonical(href) {
  let link = document.head.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", href);
  return link;
}

function upsertJsonLd(id, data) {
  let script = document.head.querySelector(`script[data-seo-jsonld="${id}"]`);
  if (!script) {
    script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-seo-jsonld", id);
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data);
  return script;
}

export default function Seo({
  title,
  description,
  canonical,
  image = DEFAULT_OG_IMAGE,
  noindex = false,
  jsonLd = null,
}) {
  useEffect(() => {
    const previousTitle = document.title;
    const previousDescription = document.head.querySelector('meta[name="description"]')?.getAttribute("content") || null;
    const previousOgTitle = document.head.querySelector('meta[property="og:title"]')?.getAttribute("content") || null;
    const previousOgDescription = document.head.querySelector('meta[property="og:description"]')?.getAttribute("content") || null;
    const previousOgUrl = document.head.querySelector('meta[property="og:url"]')?.getAttribute("content") || null;
    const previousTwitterTitle = document.head.querySelector('meta[name="twitter:title"]')?.getAttribute("content") || null;
    const previousTwitterDescription = document.head.querySelector('meta[name="twitter:description"]')?.getAttribute("content") || null;
    const previousTwitterImage = document.head.querySelector('meta[name="twitter:image"]')?.getAttribute("content") || null;
    const previousOgImage = document.head.querySelector('meta[property="og:image"]')?.getAttribute("content") || null;
    const previousRobots = document.head.querySelector('meta[name="robots"]')?.getAttribute("content") || null;
    const previousCanonical = document.head.querySelector('link[rel="canonical"]')?.getAttribute("href") || null;

    if (title) {
      document.title = title;
      upsertMeta('meta[property="og:title"]', { property: "og:title", content: title });
      upsertMeta('meta[name="twitter:title"]', { name: "twitter:title", content: title });
    }

    if (description) {
      upsertMeta('meta[name="description"]', { name: "description", content: description });
      upsertMeta('meta[property="og:description"]', { property: "og:description", content: description });
      upsertMeta('meta[name="twitter:description"]', { name: "twitter:description", content: description });
    }

    const effectiveImage = image || DEFAULT_OG_IMAGE;
    upsertMeta('meta[property="og:image"]', { property: "og:image", content: effectiveImage });
    upsertMeta('meta[name="twitter:image"]', { name: "twitter:image", content: effectiveImage });

    if (canonical) {
      upsertCanonical(canonical);
      upsertMeta('meta[property="og:url"]', { property: "og:url", content: canonical });
    }

    if (noindex) {
      upsertMeta('meta[name="robots"]', { name: "robots", content: "noindex,nofollow" });
    } else {
      upsertMeta('meta[name="robots"]', { name: "robots", content: "index,follow,max-image-preview:large" });
    }

    const jsonLdEntries = Array.isArray(jsonLd)
      ? jsonLd.filter(Boolean)
      : jsonLd && typeof jsonLd === "object"
      ? [jsonLd]
      : [];

    const jsonLdNodes = jsonLdEntries.map((entry, index) => upsertJsonLd(`route-${index}`, entry));

    return () => {
      document.title = previousTitle;
      if (title) {
        upsertMeta('meta[property="og:title"]', { property: "og:title", content: previousOgTitle || previousTitle });
        upsertMeta('meta[name="twitter:title"]', { name: "twitter:title", content: previousTwitterTitle || previousTitle });
      }
      if (description) {
        upsertMeta('meta[name="description"]', { name: "description", content: previousDescription || "" });
        upsertMeta('meta[property="og:description"]', { property: "og:description", content: previousOgDescription || "" });
        upsertMeta('meta[name="twitter:description"]', { name: "twitter:description", content: previousTwitterDescription || "" });
      }
      upsertMeta('meta[property="og:image"]', { property: "og:image", content: previousOgImage || DEFAULT_OG_IMAGE });
      upsertMeta('meta[name="twitter:image"]', { name: "twitter:image", content: previousTwitterImage || DEFAULT_OG_IMAGE });
      if (canonical) {
        upsertCanonical(previousCanonical || canonical);
        upsertMeta('meta[property="og:url"]', { property: "og:url", content: previousOgUrl || previousCanonical || canonical });
      }
      if (previousRobots) {
        upsertMeta('meta[name="robots"]', { name: "robots", content: previousRobots });
      }
      jsonLdNodes.forEach((node) => node.remove());
    };
  }, [title, description, canonical, image, noindex, jsonLd]);

  return null;
}
