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

  const renderContenido = () => {
    if (!noticia) return null;

    // 1) Preferimos HTML directo si existe
    if (noticia.contenido_html) {
      return (
        <div
          className="content"
          dangerouslySetInnerHTML={{ __html: noticia.contenido_html }}
        />
      );
    }

    // 2) Contenido string legacy (lo tratamos como HTML)
    if (typeof noticia.contenido === "string") {
      return (
        <div
          className="content"
          dangerouslySetInnerHTML={{ __html: noticia.contenido }}
        />
      );
    }

    // 3) JSON de Tiptap
    if (
      typeof noticia.contenido === "object" &&
      noticia.contenido !== null &&
      noticia.contenido.type === "doc"
    ) {
      const html = tiptapJsonToHtml(noticia.contenido);
      return (
        <div
          className="content"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    }

    return null;
  };

  if (status === "loading") {
    return (
      <div className="news-detail loading">
        <div className="loading-placeholder">
          <div className="glow-bar" />
          <div className="glow-bar short" />
          <div className="glow-img" />
          <div className="glow-paragraph" />
        </div>
      </div>
    );
  }

  if (status === "notfound") {
    return (
      <div className="news-detail">
        <p>Noticia no encontrada.</p>
        <button className="back-btn" onClick={() => navigate("/news")}>
          ← Volver a noticias
        </button>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="news-detail">
        <p>Ha ocurrido un error al cargar la noticia.</p>
        <button className="back-btn" onClick={() => navigate("/news")}>
          ← Volver a noticias
        </button>
      </div>
    );
  }

  if (!noticia) return null;

  // ⬇️ aquí usamos el nombre bonito si viene del backend
  const authorDisplay =
    noticia.autor_nombre || noticia.usuarios?.uid || noticia.autor;

  return (
    <div className="news-detail loaded">
      <div className="news-layout">
        <div className="news-container">
          <header className="news-header">
            <div>
              <h1 className="title">{noticia.titulo}</h1>
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
            </div>

            <div className="right-actions">
              {canEdit && (
                <button className="edit-btn" onClick={irAEditar}>
                  Editar noticia
                </button>
              )}
              <div className="share">
                <svg
                  onClick={handleCopy}
                  xmlns="http://www.w3.org/2000/svg"
                  width="22"
                  height="22"
                  fill="currentColor"
                  viewBox="0 0 16 16"
                >
                  <path d="M13.5 1a1.5 1.5 0 0 0-1.415 1H8.913a.5.5 0 0 0-.354.146L5.793 4.914A.5.5 0 0 0 5.646 5.27l-.007 2.318-.54.54A2.5 2.5 0 1 0 6.5 10.5l.54-.54 2.318-.007a.5.5 0 0 0 .354-.147l2.768-2.767a.5.5 0 0 0 .146-.354V2.915A1.5 1.5 0 0 0 13.5 1z" />
                  <path d="M6.5 12a1.5 1.5 0 1 1-1.415-1H5.5a.5.5 0 0 1 .5.5v.5z" />
                </svg>
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
