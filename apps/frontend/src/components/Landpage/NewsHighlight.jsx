import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import { apiUrl } from "../../lib/env";
import "../../styles/components/Landpage/_newshighlight.scss";

const formatDaysAgo = (dateStr) => {
  if (!dateStr) return "";
  const today = new Date();
  const newsDate = new Date(dateStr);
  const diff = Math.floor((today - newsDate) / (1000 * 60 * 60 * 24));
  if (diff <= 0) return "HOY";
  if (diff === 1) return "HACE 1 DÍA";
  if (diff < 7) return `HACE ${diff} DÍAS`;
  return newsDate.toLocaleDateString("es-ES", { day: "2-digit", month: "short" }).toUpperCase();
};

const normalizeContentToText = (contenido) => {
  if (!contenido) return "";
  if (typeof contenido === "string") return contenido.replace(/<[^>]+>/g, "").trim();
  if (typeof contenido === "object" && contenido.content) {
    const extract = (node) => node.type === "text" ? node.text : (node.content?.map(extract).join(" ") || "");
    return Array.isArray(contenido.content) ? contenido.content.map(extract).join(" ") : "";
  }
  return "";
};

const getExcerpt = (raw, length = 180) => {
  const text = normalizeContentToText(raw);
  return text.length > length ? text.slice(0, length).split(' ').slice(0, -1).join(' ') + "…" : text;
};

const ensureSlug = (n) => n.slug || (n.titulo || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, "-");

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1, 
    transition: { staggerChildren: 0.1, delayChildren: 0.1 } 
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1, 
    transition: { type: "tween", ease: "easeOut", duration: 0.5 } 
  }
};

const NewsHighlight = () => {
  const [newsData, setNewsData] = useState([]);
  const [status, setStatus] = useState("loading");
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.1 });

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const res = await fetch(apiUrl(`/api/noticias`));
        const data = await res.json();
        setNewsData((data || []).sort((a, b) => new Date(b.fecha) - new Date(a.fecha)));
        setStatus("idle");
      } catch (error) {
        setStatus("error");
      }
    };
    fetchNews();
  }, []);

  const highlight = newsData[0];
  const previous = newsData.slice(1, 4);

  return (
    <motion.section 
      ref={sectionRef}
      className="news-highlight"
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={containerVariants}
    >
      <div className="news-environment">
        <div className="env-vignette"></div>
        <div className="env-texture"></div>
      </div>

      <div className="news-transition-container">
        <div className="news-transition-cube tc-1"></div>
        <div className="news-transition-cube tc-2"></div>
        <div className="news-transition-cube tc-3"></div>
        <div className="news-transition-cube tc-4"></div>
        <div className="news-transition-cube tc-5"></div>
      </div>

      <div className="news-inner">
        <motion.header variants={itemVariants} className="news-header">
          <h2 className="news-title">ACTUALIZACIONES DEL REINO</h2>
        </motion.header>

        {status === "loading" && <div className="news-loading">INICIANDO ENLACE...</div>}
        {status === "error" && <div className="news-error">ERROR EN EL ENLACE DE DATOS.</div>}

        {status === "idle" && highlight && (
          <div className="news-main">
            <motion.article variants={itemVariants} className="highlight-featured">
              <Link to={`/news/${ensureSlug(highlight)}`} className="highlight-featured__link">
                <div className="featured-bg">
                  <img src={highlight.portada || highlight.imagen || "/assets/placeholder.png"} alt={highlight.titulo} loading="lazy" />
                  <div className="gradient-overlay"></div>
                </div>
                <div className="featured-content">
                  <div className="featured-meta">
                    <span className="featured-tag">NUEVO</span>
                    <span className="featured-date">{formatDaysAgo(highlight.fecha)}</span>
                  </div>
                  <h3 className="featured-title">{highlight.titulo}</h3>
                  <div className="featured-action">
                    <span>ACCEDER AL REPORTE</span>
                    <div className="action-arrow"></div>
                  </div>
                </div>
              </Link>
            </motion.article>

            <div className="highlight-list">
              {previous.map((news) => (
                <motion.div key={news.id} variants={itemVariants}>
                  <Link to={`/news/${ensureSlug(news)}`} className="highlight-row-link">
                    <article className="highlight-row">
                      <div className="row-thumb">
                        <img src={news.portada || news.imagen || "/assets/placeholder.png"} alt={news.titulo} loading="lazy" />
                        <div className="thumb-overlay"></div>
                      </div>
                      <div className="row-body">
                        <div className="row-meta">
                          <span className="row-date">{formatDaysAgo(news.fecha)}</span>
                        </div>
                        <h4 className="row-title">{news.titulo}</h4>
                        <p className="row-excerpt">{getExcerpt(news.contenido, 100)}</p>
                        <div className="row-footer">
                          <span>VER MÁS</span>
                          <span className="plus-icon">+</span>
                        </div>
                      </div>
                    </article>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {status === "idle" && newsData.length > 0 && (
          <motion.div variants={itemVariants} className="news-cta">
            <Link to="/news" className="cta-button">EXPLORAR HISTORIAL</Link>
          </motion.div>
        )}
      </div>
    </motion.section>
  );
};

export default NewsHighlight;