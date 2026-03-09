import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { apiUrl } from "../../lib/env";
import "../../styles/components/Landpage/_newshighlight.scss";

// ==============================
// Helpers de contenido / fechas
// ==============================
const formatDaysAgo = (dateStr) => {
  if (!dateStr) return "";
  const today = new Date();
  const newsDate = new Date(dateStr);
  const diff = Math.floor((today - newsDate) / (1000 * 60 * 60 * 24));
  if (diff <= 0) return "hoy";
  if (diff === 1) return "hace 1 día";
  if (diff < 7) return `hace ${diff} días`;
  return newsDate.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
  });
};

const tiptapNodeToText = (node) => {
  if (!node) return "";
  if (node.type === "text") return node.text || "";
  if (Array.isArray(node.content)) {
    return node.content.map(tiptapNodeToText).join(" ");
  }
  return "";
};

const normalizeContentToText = (contenido) => {
  if (!contenido) return "";
  if (typeof contenido === "string") {
    return contenido.replace(/<[^>]+>/g, "").trim();
  }
  if (typeof contenido === "object") {
    if (Array.isArray(contenido)) {
      return contenido.map(tiptapNodeToText).join(" ");
    }
    if (contenido.type === "doc" && Array.isArray(contenido.content)) {
      return contenido.content.map(tiptapNodeToText).join(" ");
    }
    return JSON.stringify(contenido);
  }
  return "";
};

const getExcerpt = (rawContent, length = 230) => {
  const text = normalizeContentToText(rawContent);
  if (!text) return "";
  if (text.length <= length) return text;
  const sliced = text.slice(0, length);
  const lastSpace = sliced.lastIndexOf(" ");
  return sliced.slice(0, lastSpace > 0 ? lastSpace : length) + "…";
};

const ensureSlug = (n) =>
  n.slug ||
  (n.titulo || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, "-");

const NewsHighlight = () => {
  const [newsData, setNewsData] = useState([]);
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    const fetchNews = async () => {
      setStatus("loading");
      try {
        const res = await fetch(apiUrl(`/api/noticias`));
        const data = await res.json();
        const sorted = (data || []).sort(
          (a, b) => new Date(b.fecha) - new Date(a.fecha)
        );
        setNewsData(sorted);
        setStatus("idle");
      } catch (error) {
        console.error("Error al obtener noticias:", error);
        setStatus("error");
      }
    };

    fetchNews();
  }, []);

  const latest = newsData[0];
  const previous = newsData.slice(1, 5);
  const highlight = useMemo(() => latest, [latest]);

  return (
    <section className="news-highlight">
      <div className="news-inner">
        {/* CABECERA */}
        <header className="news-header">
          <p className="news-kicker">ACTUALIZACIONES DEL REINO</p>
          <h2 className="news-title">NOTICIAS DE FLANCRAFT</h2>
        </header>

        {/* ESTADOS */}
        {status === "loading" && (
          <div className="news-skeleton">
            <div className="skeleton-featured" />
            <div className="skeleton-list">
              <div className="skeleton-row" />
              <div className="skeleton-row" />
              <div className="skeleton-row" />
            </div>
          </div>
        )}

        {status === "error" && (
          <p className="news-error">
            No se pudieron cargar las noticias ahora mismo.
          </p>
        )}

        {status === "idle" && highlight && (
          <div className="news-main">
            {/* NOTICIA PRINCIPAL */}
            <article className="highlight-featured">
              <Link
                to={`/news/${ensureSlug(highlight)}`}
                className="highlight-featured__link"
              >
                <div className="featured-media">
                  <img
                    src={
                      highlight.portada ||
                      highlight.imagen ||
                      "/assets/placeholder.png"
                    }
                    alt={highlight.titulo}
                    loading="lazy"
                  />
                  <span className="featured-tag">
                    Última noticia &middot; {formatDaysAgo(highlight.fecha)}
                  </span>
                </div>

                <div className="featured-overlay">
                  <h3 className="featured-title">{highlight.titulo}</h3>
                  <p className="featured-excerpt">
                    {getExcerpt(highlight.contenido)}
                  </p>

                  <span className="featured-readmore">
                    Leer la noticia completa
                    <img
                      src="/assets/flecha.webp"
                      alt=""
                      className="readmore-arrow"
                    />
                  </span>
                </div>
              </Link>
            </article>

            {/* LISTA SECUNDARIA */}
            {previous.length > 0 && (
              <div className="highlight-list-wrapper">
                <p className="highlight-list-kicker">
                  OTRAS NOTICIAS RECIENTES
                </p>

                <div className="highlight-list">
                  {previous.map((news) => (
                    <Link
                      to={`/news/${ensureSlug(news)}`}
                      key={news.id}
                      className="highlight-row-link"
                    >
                      <article className="highlight-row">
                        <div className="row-thumb">
                          <img
                            src={
                              news.portada ||
                              news.imagen ||
                              "/assets/placeholder.png"
                            }
                            alt={news.titulo}
                            loading="lazy"
                          />
                        </div>

                        <div className="row-body">
                          <div className="row-meta">
                            <span className="row-date">
                              {formatDaysAgo(news.fecha)}
                            </span>
                          </div>
                          <h4 className="row-title">{news.titulo}</h4>
                          <p className="row-excerpt">
                            {getExcerpt(news.contenido, 160)}
                          </p>
                        </div>
                      </article>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* CTA FINAL */}
        {status === "idle" && newsData.length > 0 && (
          <div className="news-cta">
            <Link to="/news" className="cta-button">
              Ver todas las noticias
            </Link>
          </div>
        )}
      </div>
    </section>
  );
};

export default NewsHighlight;
