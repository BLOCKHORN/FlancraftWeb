import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../../styles/components/Noticias/_newsdetail.scss";

const API_URL = "https://flancraft-backend.onrender.com";

// --- helpers para convertir el JSON de Tiptap a HTML ---

const escapeHtml = (unsafe = "") =>
  unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

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
      return `<ul>${(content || [])
        .map((child) => renderBlockNode(child))
        .join("")}</ul>`;
    case "orderedList":
      return `<ol>${(content || [])
        .map((child) => renderBlockNode(child))
        .join("")}</ol>`;
    case "listItem":
      return `<li>${(content || [])
        .map((child) => renderBlockNode(child))
        .join("")}</li>`;
    case "horizontalRule":
      return "<hr />";
    case "blockquote":
      return `<blockquote>${(content || [])
        .map((child) => renderBlockNode(child))
        .join("")}</blockquote>`;
    case "image": {
      const src = escapeHtml(node.attrs?.src || "");
      const alt = escapeHtml(node.attrs?.alt || "");
      const title = node.attrs?.title
        ? ` title="${escapeHtml(node.attrs.title)}"`
        : "";
      return `<figure><img src="${src}" alt="${alt}"${title} /></figure>`;
    }
    case "iframe": {
      const src = escapeHtml(node.attrs?.src || "");
      const width = node.attrs?.width || "100%";
      const height = node.attrs?.height || "400";
      const frameborder = node.attrs?.frameborder || "0";
      const allowfullscreen =
        node.attrs?.allowfullscreen === "true" ||
        node.attrs?.allowfullscreen === true
          ? " allowfullscreen"
          : "";
      return `<div class="embed-wrapper"><iframe src="${src}" width="${width}" height="${height}" frameborder="${frameborder}"${allowfullscreen}></iframe></div>`;
    }
    default:
      return (content || [])
        .map((child) => renderBlockNode(child))
        .join("");
  }
};

const tiptapJsonToHtml = (doc) => {
  if (!doc || doc.type !== "doc") return "";
  return (doc.content || []).map((node) => renderBlockNode(node)).join("");
};

// ----------------------------------------------------------------

const NewsDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [noticia, setNoticia] = useState(null);
  const [relacionadas, setRelacionadas] = useState([]);
  const [status, setStatus] = useState("idle");
  const [copiado, setCopiado] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  // usuario actual (para saber si puede editar)
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("flan_user"));
    } catch {
      return null;
    }
  })();

  const STAFF_ROLES = ["owner", "admin", "srmod", "mod"];
  const canEdit =
    user &&
    (STAFF_ROLES.includes(user.rol_admin) ||
      STAFF_ROLES.includes(user.rango_staff));

  useEffect(() => {
    if (!slug) return;

    const fetchNoticia = async () => {
      setStatus("loading");
      try {
        const res = await fetch(`${API_URL}/api/noticias/${slug}`);
        if (!res.ok) {
          setStatus("notfound");
          return;
        }
        const data = await res.json();
        setNoticia(data);
        setStatus("loaded");
      } catch (err) {
        console.error("Error al cargar noticia:", err);
        setStatus("error");
      }
    };

    const fetchRelacionadas = async () => {
      try {
        const res = await fetch(`${API_URL}/api/noticias`);
        const data = await res.json();
        const otras = (data || [])
          .filter((n) => n.slug !== slug)
          .slice(0, 6);
        setRelacionadas(otras);
      } catch (err) {
        console.error("Error al cargar relacionadas:", err);
      }
    };

    fetchNoticia();
    fetchRelacionadas();
  }, [slug]);

  const handleCopy = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    });
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
      case "x": {
        const shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${title}`;
        window.open(shareUrl, "_blank", "noopener,noreferrer");
        break;
      }
      case "discord": {
        handleCopy();
        window.open("https://discord.com/app", "_blank", "noopener,noreferrer");
        break;
      }
      case "telegram": {
        const shareUrl = `https://t.me/share/url?url=${url}&text=${title}`;
        window.open(shareUrl, "_blank", "noopener,noreferrer");
        break;
      }
      case "whatsapp": {
        const shareUrl = `https://api.whatsapp.com/send?text=${title}%20-%20${url}`;
        window.open(shareUrl, "_blank", "noopener,noreferrer");
        break;
      }
      case "copy":
      default:
        handleCopy();
        break;
    }

    setShareOpen(false);
  };

  const renderContenido = () => {
    if (!noticia) return null;

    if (noticia.contenido_html) {
      return (
        <div
          className="content"
          dangerouslySetInnerHTML={{ __html: noticia.contenido_html }}
        />
      );
    }

    if (typeof noticia.contenido === "string") {
      return (
        <div
          className="content"
          dangerouslySetInnerHTML={{ __html: noticia.contenido }}
        />
      );
    }

    if (
      typeof noticia.contenido === "object" &&
      noticia.contenido !== null &&
      noticia.contenido.type === "doc"
    ) {
      const html = tiptapJsonToHtml(noticia.contenido);
      return (
        <div className="content" dangerouslySetInnerHTML={{ __html: html }} />
      );
    }

    return null;
  };

  if (status === "loading") {
    return (
      <div className="news-detail loading">
        <div className="news-layout">
          <div className="loading-placeholder">
            <div className="glow-bar" />
            <div className="glow-bar short" />
            <div className="glow-img" />
            <div className="glow-paragraph" />
          </div>
        </div>
      </div>
    );
  }

  if (status === "notfound") {
    return (
      <div className="news-detail">
        <div className="news-layout">
          <p>Noticia no encontrada.</p>
          <button className="back-btn" onClick={() => navigate("/news")}>
            ← Volver a noticias
          </button>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="news-detail">
        <div className="news-layout">
          <p>Ha ocurrido un error al cargar la noticia.</p>
          <button className="back-btn" onClick={() => navigate("/news")}>
            ← Volver a noticias
          </button>
        </div>
      </div>
    );
  }

  if (!noticia) return null;

  const authorDisplay =
    noticia.autor_nombre || noticia.usuarios?.uid || noticia.autor;

  return (
    <div className="news-detail loaded">
      <div className="news-layout">
        <div className="news-container">
          <header className="news-header">
            {/* TÍTULO SOLO */}
            <h1 className="title">{noticia.titulo}</h1>

            {/* LÍNEA DIVISORA JUSTO BAJO EL TÍTULO */}
            <div className="news-header-divider" />

            {/* SEGUNDA LÍNEA: AUTOR/FECHA IZQ, BOTONES DCHA */}
            <div className="news-subheader">
              <div className="meta-line">
                {authorDisplay && (
                  <span className="autor">Autor: {authorDisplay}</span>
                )}
                {noticia.fecha && (
                  <span className="date">
                    {new Date(noticia.fecha).toLocaleDateString("es-ES", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                )}
              </div>

              <div className="news-header-actions">
                {canEdit && (
                  <button
                    className="edit-btn-rect"
                    type="button"
                    onClick={irAEditar}
                  >
                    <span className="edit-btn-rect__icon" aria-hidden="true">
                      <svg
                        viewBox="0 0 16 16"
                        width="13"
                        height="13"
                        focusable="false"
                      >
                        <path
                          d="M11.3 1.5a1.4 1.4 0 0 1 2 2L7 9.8 4 10.5l.7-3L11.3 1.5Z"
                          fill="currentColor"
                        />
                        <path
                          d="M3 13.5h9v1H3z"
                          fill="currentColor"
                        />
                      </svg>
                    </span>
                    <span className="edit-btn-rect__label">Editar</span>
                  </button>
                )}

                <div className="share-wrapper">
                  <button
                    type="button"
                    className="share-trigger-rect"
                    onClick={() => setShareOpen((v) => !v)}
                    aria-label="Compartir noticia"
                  >
                    <svg
                      viewBox="0 0 20 20"
                      width="14"
                      height="14"
                      focusable="false"
                    >
                      <path
                        d="M13.8 4a2 2 0 1 1-1.58 3.23L8.7 9a2 2 0 0 1-.02 2l3.52 1.77a2 2 0 1 1-.44 1.04L8.2 12a2 2 0 1 1 0-4l3.56-1.8A2 2 0 0 1 13.8 4Z"
                        fill="currentColor"
                      />
                    </svg>
                    <span>Compartir</span>
                  </button>

                  {shareOpen && (
  <div className="share-menu">
    <button
      type="button"
      className="share-item share-x"
      onClick={() => handleShare("x")}
    >
      <span className="share-item__icon">
        <i className="fa-brands fa-x-twitter" aria-hidden="true" />
      </span>
      <span>X</span>
    </button>

    <button
      type="button"
      className="share-item share-discord"
      onClick={() => handleShare("discord")}
    >
      <span className="share-item__icon">
        <i className="fa-brands fa-discord" aria-hidden="true" />
      </span>
      <span>Discord</span>
    </button>

    <button
      type="button"
      className="share-item share-telegram"
      onClick={() => handleShare("telegram")}
    >
      <span className="share-item__icon">
        <i className="fa-brands fa-telegram" aria-hidden="true" />
      </span>
      <span>Telegram</span>
    </button>

    <button
      type="button"
      className="share-item share-whatsapp"
      onClick={() => handleShare("whatsapp")}
    >
      <span className="share-item__icon">
        <i className="fa-brands fa-whatsapp" aria-hidden="true" />
      </span>
      <span>WhatsApp</span>
    </button>

    <button
      type="button"
      className="share-item share-copy"
      onClick={() => handleShare("copy")}
    >
      <span className="share-item__icon">
        <i className="fa-solid fa-link" aria-hidden="true" />
      </span>
      <span>Copiar enlace</span>
    </button>
  </div>
)}

                </div>
              </div>
            </div>
          </header>

          {(noticia.portada || noticia.imagen) && (
            <img
              src={noticia.portada || noticia.imagen}
              alt={noticia.titulo}
              className="featured-img"
              loading="lazy"
            />
          )}

          {renderContenido()}

          <button className="back-btn" onClick={() => navigate("/news")}>
            ← Volver a noticias
          </button>
        </div>

        <aside className="news-sidebar">
          <h3>Otras noticias</h3>
          <ul className="sidebar-news-list">
            {relacionadas.map((n) => (
              <li
                key={n.id}
                onClick={() => navigate(`/news/${n.slug || n.id}`)}
              >
                <img
                  src={n.portada || "/assets/placeholder.png"}
                  alt={n.titulo}
                  loading="lazy"
                />
                <div>
                  <h4>{n.titulo}</h4>
                  <p>
                    {new Date(n.fecha).toLocaleDateString("es-ES", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      {copiado && <div className="copied">Enlace copiado ✅</div>}
    </div>
  );
};

export default NewsDetail;
