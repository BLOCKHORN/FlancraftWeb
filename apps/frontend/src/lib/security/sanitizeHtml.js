const FALLBACK_ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "blockquote",
  "pre",
  "code",
  "ul",
  "ol",
  "li",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "a",
  "img",
  "figure",
  "figcaption",
  "iframe",
  "hr",
  "span",
  "div"
]);

const FALLBACK_ALLOWED_ATTRS = new Set([
  "href",
  "src",
  "alt",
  "title",
  "target",
  "rel",
  "class",
  "width",
  "height",
  "frameborder",
  "allow",
  "allowfullscreen",
  "loading",
  "style"
]);

const isSafeUrl = (value) => {
  const v = String(value || "").trim().toLowerCase();
  if (!v) return true;
  return (
    v.startsWith("http://") ||
    v.startsWith("https://") ||
    v.startsWith("/") ||
    v.startsWith("#") ||
    v.startsWith("data:image/")
  );
};

export function sanitizeHtml(input) {
  const html = String(input || "");
  if (!html || typeof window === "undefined" || typeof DOMParser === "undefined") return html;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  doc.querySelectorAll("script, style, object, embed, link, meta").forEach((node) => node.remove());

  const walk = (node) => {
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const tag = node.tagName.toLowerCase();
    if (!FALLBACK_ALLOWED_TAGS.has(tag)) {
      node.replaceWith(...Array.from(node.childNodes));
      return;
    }

    [...node.attributes].forEach((attr) => {
      const name = attr.name.toLowerCase();
      const value = attr.value;

      if (name.startsWith("on")) {
        node.removeAttribute(attr.name);
        return;
      }

      if (!FALLBACK_ALLOWED_ATTRS.has(name)) {
        node.removeAttribute(attr.name);
        return;
      }

      if ((name === "href" || name === "src") && !isSafeUrl(value)) {
        node.removeAttribute(attr.name);
      }
    });

    Array.from(node.childNodes).forEach(walk);
  };

  Array.from(doc.body.childNodes).forEach(walk);
  return doc.body.innerHTML;
}
