export const SITE_NAME = "FlanCraft";
export const SITE_URL = "https://www.flancraft.com";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/fav.png`;

export function buildCanonical(path = "/") {
  const normalized = String(path || "/").startsWith("/") ? String(path || "/") : `/${path}`;
  return `${SITE_URL}${normalized === "/" ? "/" : normalized.replace(/\/$/, "")}`;
}

export function buildTitle(pageTitle, suffix = SITE_NAME) {
  return pageTitle ? `${pageTitle} | ${suffix}` : suffix;
}

export function buildBreadcrumbJsonLd(items = []) {
  const list = items
    .filter(Boolean)
    .map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.item,
    }));

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: list,
  };
}

export function buildFaqJsonLd(questions = []) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions
      .filter((q) => q?.question && q?.answer)
      .map((q) => ({
        "@type": "Question",
        name: q.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: q.answer,
        },
      })),
  };
}

export function buildOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/fav.png`,
    sameAs: [
      "https://discord.gg/flancraft",
      "https://www.youtube.com/@flancraft",
      "https://www.instagram.com/flancraft",
    ],
  };
}

export function buildWebSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: "es",
  };
}
