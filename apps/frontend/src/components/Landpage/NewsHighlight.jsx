import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import "../../styles/components/Landpage/_newshighlight.scss";

const API_URL = "https://flancraft-backend.onrender.com/api/noticias";

const NewsHighlight = () => {
  const [newsData, setNewsData] = useState([]);
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    const fetchNews = async () => {
      setStatus("loading");
      try {
        const res = await fetch(API_URL);
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
  const previous = newsData.slice(1, 4);

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

  const getExcerpt = (rawContent, length = 180) => {
    const text = normalizeContentToText(rawContent);
    if (!text) return "";
    if (text.length <= length) return text;
    const sliced = text.slice(0, length);
    const lastSpace = sliced.lastIndexOf(" ");
    return sliced.slice(0, lastSpace > 0 ? lastSpace : length) + "…";
  };

  const highlight = useMemo(() => latest, [latest]);

  const ensureSlug = (n) =>
    n.slug ||
    (n.titulo || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9 ]/g, "")
      .replace(/\s+/g, "-");

  return (
    <section className="news-highlight">
      <div className="news-inner">
        <header className="news-header">
          <div className="news-title-wrapper">
            <h2 className="news-title">Novedades</h2>
            <p className="news-desc">
              Mantente al día con las últimas noticias y actualizaciones de
              Flancraft.
            </p>
          </div>
        </header>

        {status === "loading" && (
          <div className="news-skeleton">
            <div className="skeleton-featured" />
            <div className="skeleton-grid">
              <div className="skeleton-card" />
              <div className="skeleton-card" />
              <div className="skeleton-card" />
            </div>
          </div>
        )}

        {status === "error" && (
          <p className="news-error">
            No se pudieron cargar las noticias ahora mismo.
          </p>
        )}

        {status === "idle" && highlight && (
          <article className="highlight-featured">
            {/* HERO GRANDE ARRIBA */}
            <div className="featured-hero">
              <div className="featured-hero-inner">
                <img
                  src={
                    highlight.portada ||
                    highlight.imagen ||
                    "/assets/placeholder.png"
                  }
                  alt={highlight.titulo}
                  loading="lazy"
                />
              </div>
            </div>

            {/* PERGAMINO CON TEXTO DEBAJO */}
            <div className="featured-info">
              <div className="featured-info-inner">
                <div className="headline-row">
                  <span className="headline-label">Última noticia</span>
                  <span className="date">{formatDaysAgo(highlight.fecha)}</span>
                </div>

                <h3 className="highlight-title">
                  <Link to={`/news/${ensureSlug(highlight)}`}>
                    {highlight.titulo}
                  </Link>
                </h3>

                <p className="highlight-excerpt">
                  {getExcerpt(highlight.contenido)}
                </p>

                <Link
                  to={`/news/${ensureSlug(highlight)}`}
                  className="readmore-link readmore-link--inline"
                >
                  Leer más
                  <ArrowRight size={16} className="icon-inline" />
                </Link>
              </div>
            </div>
          </article>
        )}

        {status === "idle" && previous.length > 0 && (
          <div className="highlight-previous">
            {previous.map((news) => (
              <Link
                to={`/news/${ensureSlug(news)}`}
                key={news.id}
                className="highlight-card-link"
              >
                <article className="highlight-card">
                  <div className="card-img-wrapper">
                    <img
                      src={
                        news.portada || news.imagen || "/assets/placeholder.png"
                      }
                      alt={news.titulo}
                      loading="lazy"
                    />
                  </div>
                  <div className="card-content">
                    <span className="date">{formatDaysAgo(news.fecha)}</span>
                    <h4>{news.titulo}</h4>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}

        <div className="news-cta">
          <Link to="/news" className="cta-button">
            Ver todas las noticias
          </Link>
        </div>
      </div>
    </section>
  );
};

export default NewsHighlight;
