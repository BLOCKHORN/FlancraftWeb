import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Seo from "../SEO/Seo";
import { UserContext } from "../../context/UserContext";
import { apiGet } from "../../lib/api/client";
import { sanitizeHtml } from "../../lib/security/sanitizeHtml";
import { buildBreadcrumbJsonLd, buildCanonical } from "../../lib/seo/siteSeo";
import { hasMinRole } from "../../lib/auth/roles";
import "../../styles/components/Noticias/_newsdetail.scss";

const escapeHtml = (unsafe = "") =>
  String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const normalizeRole = (value) => {
  if (value === null || value === undefined) return null;
  const role = String(value).trim().toLowerCase().replace(/[\s_-]+/g, "");
  return role || null;
};

const renderMarks = (text, marks = []) =>
  (marks || []).reduce((acc, mark) => {
    if (!mark) return acc;
    switch (mark.type) {
      case "bold":
        return `<strong>${acc}</strong>`;
      case "italic":
        return `<em>${acc}</em>`;
      case "strike":
        return `<s>${acc}</s>`;
      case "code":
        return `<code>${acc}</code>`;
      case "link":
        if (mark.attrs?.href) {
          const href = escapeHtml(mark.attrs.href);
          return `<a href="${href}" target="_blank" rel="noopener noreferrer">${acc}</a>`;
        }
        return acc;
      default:
        return acc;
    }
  }, text);

const renderInlineNodes = (nodes = []) =>
  (nodes || [])
    .map((node) => {
      if (node.type === "text") {
        const safe = escapeHtml(node.text || "");
        return renderMarks(safe, node.marks);
      }
      return renderBlockNode(node);
    })
    .join("");

const renderBlockNode = (node) => {
  if (!node) return "";
  const content = node.content || [];

  switch (node.type) {
    case "paragraph":
      return `<p>${renderInlineNodes(content)}</p>`;
    case "heading": {
      const level = node.attrs?.level || 2;
      const text = renderInlineNodes(content);
      return `<h${level}>${text}</h${level}>`;
    }
    case "bulletList":
      return `<ul>${(content || []).map((child) => renderBlockNode(child)).join("")}</ul>`;
    case "orderedList":
      return `<ol>${(content || []).map((child) => renderBlockNode(child)).join("")}</ol>`;
    case "listItem":
      return `<li>${(content || []).map((child) => renderBlockNode(child)).join("")}</li>`;
    case "horizontalRule":
      return "<hr />";
    case "blockquote":
      return `<blockquote>${(content || []).map((child) => renderBlockNode(child)).join("")}</blockquote>`;
    case "image": {
      const src = escapeHtml(node.attrs?.src || "");
      const alt = escapeHtml(node.attrs?.alt || "");
      const title = node.attrs?.title ? ` title="${escapeHtml(node.attrs.title)}"` : "";
      return `<figure class="nd-figure"><img src="${src}" alt="${alt}"${title} /></figure>`;
    }
    case "iframe": {
      const src = escapeHtml(node.attrs?.src || "");
      const width = node.attrs?.width || "100%";
      const height = node.attrs?.height || "400";
      const frameborder = node.attrs?.frameborder || "0";
      const allowfullscreen =
        node.attrs?.allowfullscreen === "true" || node.attrs?.allowfullscreen === true
          ? " allowfullscreen"
          : "";
      return `<div class="nd-embed"><iframe src="${src}" width="${width}" height="${height}" frameborder="${frameborder}"${allowfullscreen}></iframe></div>`;
    }
    default:
      return (content || []).map((child) => renderBlockNode(child)).join("");
  }
};

const tiptapJsonToHtml = (doc) => {
  if (!doc || doc.type !== "doc") return "";
  return (doc.content || []).map((node) => renderBlockNode(node)).join("");
};

const stripHtml = (html = "") =>
  String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<\/?[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const extractTextFromTiptap = (node) => {
  if (!node) return "";
  if (Array.isArray(node)) return node.map(extractTextFromTiptap).join(" ");
  if (node.type === "text") return node.text || "";
  const content = node.content || [];
  return content.map(extractTextFromTiptap).join(" ");
};

const calcReadingMinutes = (noticia) => {
  let text = "";
  if (noticia?.contenido_html) text = stripHtml(noticia.contenido_html);
  else if (typeof noticia?.contenido === "string") text = stripHtml(noticia.contenido);
  else if (typeof noticia?.contenido === "object" && noticia?.contenido?.type === "doc") {
    text = extractTextFromTiptap(noticia.contenido);
  }

  const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
  return Math.max(1, Math.round(words / 220));
};

const NewsDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [noticia, setNoticia] = useState(null);
  const [relacionadas, setRelacionadas] = useState([]);
  const [status, setStatus] = useState("idle");
  const [copiado, setCopiado] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [progress, setProgress] = useState(0);

  const shareRef = useRef(null);
  const { user } = useContext(UserContext);

  const effectiveRole = useMemo(
    () => normalizeRole(user?.rango_staff || user?.rol_admin),
    [user]
  );

  const canEdit = useMemo(() => {
    if (!user?.loggedIn) return false;
    return hasMinRole(effectiveRole, "owner");
  }, [user, effectiveRole]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [slug]);

  useEffect(() => {
    if (!slug) return;

    const fetchNoticia = async () => {
      setStatus("loading");
      try {
        let data;
        try {
          data = await apiGet(`/api/noticias/${slug}`, { clearSessionOn401: false });
        } catch (err) {
          if (err?.status === 404) {
            setStatus("notfound");
            return;
          }
          throw err;
        }
        setNoticia(data);
        setStatus("loaded");
      } catch {
        setStatus("error");
      }
    };

    const fetchRelacionadas = async () => {
      try {
        const data = await apiGet(`/api/noticias`, { clearSessionOn401: false });
        const otras = (data || []).filter((n) => n.slug !== slug).slice(0, 8);
        setRelacionadas(otras);
      } catch {
        setRelacionadas([]);
      }
    };

    fetchNoticia();
    fetchRelacionadas();
  }, [slug]);

  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const scrollTop = doc.scrollTop || document.body.scrollTop;
      const scrollHeight = doc.scrollHeight || document.body.scrollHeight;
      const clientHeight = doc.clientHeight || window.innerHeight;
      const max = Math.max(1, scrollHeight - clientHeight);
      setProgress(Math.min(1, Math.max(0, scrollTop / max)));
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!shareOpen) return;

    const onDown = (e) => {
      if (!shareRef.current) return;
      if (!shareRef.current.contains(e.target)) setShareOpen(false);
    };

    const onKey = (e) => {
      if (e.key === "Escape") setShareOpen(false);
    };

    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [shareOpen]);

  const handleCopy = () => {
    const url = window.location.href;

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2200);
      });
      return;
    }

    const input = document.createElement("input");
    input.value = url;
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    document.body.removeChild(input);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2200);
  };

  const irAEditar = () => {
    if (!noticia?.id) return;
    navigate(`/admin/noticias/editar/${noticia.id}`);
  };

  const handleShare = (platform) => {
    if (!noticia) return;

    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(noticia.titulo || "FlanCraft");

    switch (platform) {
      case "x":
        window.open(
          `https://twitter.com/intent/tweet?url=${url}&text=${title}`,
          "_blank",
          "noopener,noreferrer"
        );
        break;
      case "telegram":
        window.open(
          `https://t.me/share/url?url=${url}&text=${title}`,
          "_blank",
          "noopener,noreferrer"
        );
        break;
      case "whatsapp":
        window.open(
          `https://api.whatsapp.com/send?text=${title}%20-%20${url}`,
          "_blank",
          "noopener,noreferrer"
        );
        break;
      case "discord":
        handleCopy();
        window.open("https://discord.com/app", "_blank", "noopener,noreferrer");
        break;
      case "copy":
      default:
        handleCopy();
        break;
    }

    setShareOpen(false);
  };

  const contentHtml = useMemo(() => {
    if (!noticia) return "";

    let html = "";
    if (noticia.contenido_html) html = noticia.contenido_html;
    else if (typeof noticia.contenido === "string") html = noticia.contenido;
    else if (typeof noticia.contenido === "object" && noticia.contenido?.type === "doc") {
      html = tiptapJsonToHtml(noticia.contenido);
    }

    return sanitizeHtml(html);
  }, [noticia]);

  const heroSrc = useMemo(
    () => (noticia?.portada || noticia?.imagen || "").trim(),
    [noticia]
  );

  const heroStyle = useMemo(
    () => (heroSrc ? { "--nd-hero": `url("${heroSrc}")` } : undefined),
    [heroSrc]
  );

  const authorDisplay = useMemo(
    () => noticia?.autor_nombre || noticia?.usuarios?.uid || noticia?.autor || "",
    [noticia]
  );

  const dateDisplay = useMemo(() => {
    if (!noticia?.fecha) return "";
    try {
      return new Date(noticia.fecha).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    } catch {
      return "";
    }
  }, [noticia]);

  const readingMins = useMemo(() => (noticia ? calcReadingMinutes(noticia) : 1), [noticia]);

  if (status === "loading") {
    return (
      <div className="news-detail nd-loading">
        <div className="nd-progress" style={{ transform: `scaleX(${progress})` }} />
        <section className="nd-hero nd-hero--placeholder">
          <div className="nd-hero__wrap">
            <div className="nd-hero__media nd-skel nd-skel--hero" />
          </div>
        </section>
        <main className="nd-shell">
          <article className="nd-article nd-article--placeholder">
            <div className="nd-skel nd-skel--meta" />
            <div className="nd-skel nd-skel--title" />
            <div className="nd-skel nd-skel--line" />
            <div className="nd-skel nd-skel--line" />
            <div className="nd-skel nd-skel--line short" />
          </article>
        </main>
      </div>
    );
  }

  if (status === "notfound") {
    return (
      <div className="news-detail nd-state">
        <main className="nd-shell">
          <article className="nd-article nd-state__card">
            <h1 className="nd-title">Noticia no encontrada</h1>
            <p className="nd-state__text">No existe o ha sido eliminada.</p>
            <button className="nd-btn nd-btn--solid" onClick={() => navigate("/news")}>
              Volver a noticias
            </button>
          </article>
        </main>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="news-detail nd-state">
        <main className="nd-shell">
          <article className="nd-article nd-state__card">
            <h1 className="nd-title">Error al cargar</h1>
            <p className="nd-state__text">Ha ocurrido un problema cargando la noticia.</p>
            <button className="nd-btn nd-btn--solid" onClick={() => navigate("/news")}>
              Volver a noticias
            </button>
          </article>
        </main>
      </div>
    );
  }

  if (!noticia) return null;

  const descriptionText = String(
    noticia.descripcion || noticia.resumen || stripHtml(contentHtml || "")
  ).slice(0, 155);

  return (
    <div className="news-detail nd-loaded">
      <Seo
        title={`${noticia.titulo || "Noticia"} | FlanCraft`}
        description={descriptionText}
        canonical={buildCanonical(`/news/${noticia.slug || slug}`)}
        image={heroSrc || undefined}
        jsonLd={[
          buildBreadcrumbJsonLd([
            { name: "Inicio", item: buildCanonical("/") },
            { name: "Noticias", item: buildCanonical("/news") },
            { name: noticia.titulo || "Noticia", item: buildCanonical(`/news/${noticia.slug || slug}`) },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "Article",
            headline: noticia.titulo || "Noticia",
            description: descriptionText,
            image: heroSrc || undefined,
            url: `https://www.flancraft.com/news/${noticia.slug || slug}`,
            datePublished: noticia.fecha || noticia.created_at || undefined,
            author: {
              "@type": "Organization",
              name: "FlanCraft",
            },
            publisher: {
              "@type": "Organization",
              name: "FlanCraft",
            },
          },
        ]}
      />

      <div className="nd-progress" style={{ transform: `scaleX(${progress})` }} />

      <section className="nd-hero" style={heroStyle}>
        <div className="nd-hero__wrap">
          <div className="nd-hero__top">
            <button className="nd-backchip" onClick={() => navigate("/news")} type="button">
              <span className="nd-backchip__icon" aria-hidden="true">
                <svg viewBox="0 0 20 20" width="14" height="14" focusable="false">
                  <path
                    d="M12.8 4.5a1 1 0 0 1 0 1.4L9.7 9l3.1 3.1a1 1 0 1 1-1.4 1.4l-3.8-3.8a1 1 0 0 1 0-1.4l3.8-3.8a1 1 0 0 1 1.4 0Z"
                    fill="currentColor"
                  />
                </svg>
              </span>
              <span>Noticias</span>
            </button>
          </div>

          <div className="nd-hero__media">
            {heroSrc ? (
              <img src={heroSrc} alt={noticia.titulo} className="nd-hero__img" loading="eager" />
            ) : (
              <div className="nd-hero__fallback" />
            )}
          </div>
        </div>
      </section>

      <main className="nd-shell">
        <article className="nd-article">
          <div className="nd-toprow">
            <div className="nd-meta">
              {authorDisplay ? <span className="nd-meta__item">{authorDisplay}</span> : null}
              {authorDisplay && dateDisplay ? <span className="nd-meta__dot">•</span> : null}
              {dateDisplay ? <span className="nd-meta__item">{dateDisplay}</span> : null}
              {(authorDisplay || dateDisplay) ? <span className="nd-meta__dot">•</span> : null}
              <span className="nd-meta__item">{readingMins} min lectura</span>
            </div>

            <div className="nd-actions">
              {canEdit && (
                <button className="nd-btn nd-btn--ghost" type="button" onClick={irAEditar}>
                  <span className="nd-btn__icon" aria-hidden="true">
                    <svg viewBox="0 0 16 16" width="14" height="14" focusable="false">
                      <path
                        d="M11.3 1.5a1.4 1.4 0 0 1 2 2L7 9.8 4 10.5l.7-3L11.3 1.5Z"
                        fill="currentColor"
                      />
                      <path d="M3 13.5h9v1H3z" fill="currentColor" />
                    </svg>
                  </span>
                  <span>Editar</span>
                </button>
              )}

              <div className="nd-share" ref={shareRef}>
                <button
                  type="button"
                  className="nd-btn nd-btn--solid"
                  onClick={() => setShareOpen((v) => !v)}
                  aria-label="Compartir noticia"
                  aria-expanded={shareOpen ? "true" : "false"}
                >
                  <span className="nd-btn__icon" aria-hidden="true">
                    <svg viewBox="0 0 20 20" width="14" height="14" focusable="false">
                      <path
                        d="M13.8 4a2 2 0 1 1-1.58 3.23L8.7 9a2 2 0 0 1-.02 2l3.52 1.77a2 2 0 1 1-.44 1.04L8.2 12a2 2 0 1 1 0-4l3.56-1.8A2 2 0 0 1 13.8 4Z"
                        fill="currentColor"
                      />
                    </svg>
                  </span>
                  <span>Compartir</span>
                </button>

                {shareOpen && (
                  <div className="nd-shareMenu" role="menu">
                    <button type="button" className="nd-shareItem" onClick={() => handleShare("x")} role="menuitem">
                      <span className="nd-shareItem__icon x">
                        <i className="fa-brands fa-x-twitter" aria-hidden="true" />
                      </span>
                      <span>X</span>
                    </button>

                    <button type="button" className="nd-shareItem" onClick={() => handleShare("discord")} role="menuitem">
                      <span className="nd-shareItem__icon discord">
                        <i className="fa-brands fa-discord" aria-hidden="true" />
                      </span>
                      <span>Discord</span>
                    </button>

                    <button type="button" className="nd-shareItem" onClick={() => handleShare("telegram")} role="menuitem">
                      <span className="nd-shareItem__icon telegram">
                        <i className="fa-brands fa-telegram" aria-hidden="true" />
                      </span>
                      <span>Telegram</span>
                    </button>

                    <button type="button" className="nd-shareItem" onClick={() => handleShare("whatsapp")} role="menuitem">
                      <span className="nd-shareItem__icon whatsapp">
                        <i className="fa-brands fa-whatsapp" aria-hidden="true" />
                      </span>
                      <span>WhatsApp</span>
                    </button>

                    <button type="button" className="nd-shareItem" onClick={() => handleShare("copy")} role="menuitem">
                      <span className="nd-shareItem__icon link">
                        <i className="fa-solid fa-link" aria-hidden="true" />
                      </span>
                      <span>Copiar enlace</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <h1 className="nd-title">{noticia.titulo}</h1>

          <div className="nd-divider" />

          <div className="nd-content" dangerouslySetInnerHTML={{ __html: contentHtml }} />

          <div className="nd-footer">
            <button className="nd-backlink" onClick={() => navigate("/news")} type="button">
              Volver a noticias
            </button>
          </div>
        </article>

        {relacionadas.length > 0 && (
          <section className="nd-related">
            <div className="nd-related__head">
              <h3 className="nd-related__title">Más noticias</h3>
              <button className="nd-related__all" onClick={() => navigate("/news")} type="button">
                Ver todas
              </button>
            </div>

            <div className="nd-related__grid">
              {relacionadas.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className="nd-card"
                  onClick={() => navigate(`/news/${n.slug || n.id}`)}
                >
                  <div className="nd-card__media">
                    <img
                      src={n.portada || n.imagen || "/assets/placeholder.png"}
                      alt={n.titulo}
                      loading="lazy"
                    />
                  </div>
                  <div className="nd-card__body">
                    <div className="nd-card__title">{n.titulo}</div>
                    <div className="nd-card__meta">
                      {n.fecha
                        ? new Date(n.fecha).toLocaleDateString("es-ES", {
                            day: "2-digit",
                            month: "short",
                          })
                        : ""}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
      </main>

      {copiado && (
        <div className="nd-toast" role="status" aria-live="polite">
          <span className="nd-toast__icon" aria-hidden="true">
            <svg viewBox="0 0 20 20" width="16" height="16" focusable="false">
              <path
                d="M8.2 13.2 4.8 9.8a1 1 0 1 0-1.4 1.4l4.1 4.1a1 1 0 0 0 1.4 0l8-8a1 1 0 1 0-1.4-1.4l-7.3 7.2Z"
                fill="currentColor"
              />
            </svg>
          </span>
          <span>Enlace copiado</span>
        </div>
      )}
    </div>
  );
};

export default NewsDetail;