import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion as Motion } from "framer-motion";
import "../../styles/components/Noticias/_allnews.scss";

const API_URL = "https://flancraft-backend.onrender.com";

const AllNews = () => {
  const [newsData, setNewsData] = useState([]);
  const [visibleCount, setVisibleCount] = useState(6);
  const [loading, setLoading] = useState(true);
  const [imagesLoaded, setImagesLoaded] = useState(false);

  const user = JSON.parse(localStorage.getItem("flan_user"));
  const isOwner = user?.rol_admin === "owner";

  const listItemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        delay: i * 0.1,
      },
    }),
  };

  useEffect(() => {
    const fetchNoticias = async () => {
      try {
        const res = await fetch(`${API_URL}/api/noticias`);
        const data = await res.json();
        const publicadas = data
          .filter((n) => Boolean(n.publicada))
          .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
          .map((n) => ({
            ...n,
            slug: n.slug || generarSlug(n.titulo),
          }));

        setNewsData(publicadas);
        preloadImages(
          publicadas.map((n) => n.portada || "/assets/placeholder.png")
        );
      } catch (error) {
        console.error("Error al obtener noticias:", error);
      }
    };
    fetchNoticias();
  }, []);

  const generarSlug = (titulo) => {
    return titulo
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9 ]/g, "")
      .replace(/\s+/g, "-");
  };

  const preloadImages = (urls) => {
    let loaded = 0;
    if (urls.length === 0) {
      setImagesLoaded(true);
      setLoading(false);
      return;
    }

    urls.forEach((url) => {
      const img = new Image();
      img.src = url;
      img.onload = img.onerror = () => {
        loaded++;
        if (loaded === urls.length) {
          setImagesLoaded(true);
          setTimeout(() => setLoading(false), 300);
        }
      };
    });
  };

  const formatDaysAgo = (dateStr) => {
    const today = new Date();
    const newsDate = new Date(dateStr);
    const diff = Math.floor((today - newsDate) / (1000 * 60 * 60 * 24));
    return `hace ${diff} día${diff !== 1 ? "s" : ""}`;
  };

  const truncate = (text, limit = 200) => {
    return text.length <= limit
      ? text
      : text.slice(0, text.lastIndexOf(" ", limit)) + "...";
  };

  const extractSubtitleAndDescription = (contenido) => {
    try {
      if (typeof contenido === "string") {
        const div = document.createElement("div");
        div.innerHTML = contenido;
        const text = div.textContent || div.innerText || "";
        const lines = text.split("\n").filter(Boolean);
        return {
          subtitulo: lines[0]?.trim() || "",
          descripcion: truncate(lines.slice(1).join(" "), 160),
        };
      }

      if (
        typeof contenido === "object" &&
        contenido !== null &&
        Array.isArray(contenido?.content)
      ) {
        let subtitulo = "";
        let descripcion = "";

        for (let block of contenido.content) {
          if (!block.content) continue;

          const textoPlano = block.content
            .filter((c) => c.type === "text")
            .map((c) => c.text)
            .join(" ")
            .replace(/\s+/g, " ")
            .trim();

          if (!textoPlano) continue;

          if (!subtitulo && block.type === "heading") {
            subtitulo = textoPlano;
            continue;
          }

          if (!subtitulo && block.type === "paragraph") {
            subtitulo = textoPlano;
            continue;
          }

          descripcion += textoPlano + " ";

          if (descripcion.length > 160) break;
        }

        if (!descripcion && subtitulo) {
          descripcion = subtitulo;
          subtitulo = "";
        }

        return {
          subtitulo,
          descripcion: truncate(descripcion.trim(), 160),
        };
      }

      return {
        subtitulo: "",
        descripcion: "",
      };
    } catch (err) {
      console.warn("Error al extraer resumen:", err);
      return {
        subtitulo: "",
        descripcion: "",
      };
    }
  };

  const featured = newsData.length > 0 ? [newsData[0]] : [];
  const rest = newsData.slice(1, visibleCount + 1);

  const showMore = () => {
    setVisibleCount((prev) => prev + 6);
    setTimeout(() => {
      document.querySelector(".load-more")?.scrollIntoView({
        behavior: "smooth",
      });
    }, 100);
  };

  return (
    <section className="all-news-section">
      <div className="news-header-bg">
        {isOwner && (
          <div className="crear-noticia-abs">
            <Link to="/admin/noticias" className="crear-noticia-boton">
              + Crear nueva noticia
            </Link>
          </div>
        )}

        <Motion.h2
          className="main-title"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          Noticias
        </Motion.h2>

        <Motion.div
          className="featured-news-grid"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          {featured.map((item) => (
            <Link
              key={item.id}
              to={`/news/${item.slug}`}
              className="featured-news-card"
            >
              <div className="img-wrapper">
                <img
                  src={item.portada || "/assets/placeholder.png"}
                  alt={item.titulo}
                  loading="lazy"
                />
              </div>
              <div className="info">
                <h3>{item.titulo}</h3>
                <span>{formatDaysAgo(item.fecha)}</span>
              </div>
            </Link>
          ))}
        </Motion.div>
      </div>

      <div className="news-scroll-bg">
        <div className="news-scroll-inner">
          <div className="news-scroll-top-decor">
            <img src="/assets/topborder.webp" alt="" className="border-main" />
            <img src="/assets/borde2.webp" alt="" className="border-corner" />
          </div>

          <h3 className="scroll-title">Últimos artículos</h3>

          <div className="floating-news-hero">
            <img
              src="/assets/avioneta.png"
              alt="Repartidor de noticias Flancraft"
            />
          </div>

          <hr className="news-section-divider" />

          <div className="news-list">
            {!imagesLoaded || loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="news-list-item loading-skeleton">
                  <div className="hover-wrapper">
                    <div className="skeleton-image" />
                    <div className="text">
                      <div className="skeleton-title" />
                      <div className="skeleton-paragraph" />
                      <div className="skeleton-date" />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              rest.map((item, index) => {
                const { subtitulo, descripcion } =
                  extractSubtitleAndDescription(item.contenido);

                return (
                  <Motion.div
                    key={item.id}
                    custom={index}
                    variants={listItemVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <Link
                      to={`/news/${item.slug}`}
                      className="news-list-item clickable"
                    >
                      <div className="hover-wrapper">
                        <img
                          src={item.portada || "/assets/placeholder.png"}
                          alt={item.titulo}
                          loading="lazy"
                        />
                        <div className="text">
                          <h4>{item.titulo}</h4>
                          {subtitulo && (
                            <h5 className="subtitulo">{subtitulo}</h5>
                          )}
                          <p>{descripcion}</p>
                          <div className="date">
                            {formatDaysAgo(item.fecha)}
                          </div>
                        </div>
                      </div>
                    </Link>
                  </Motion.div>
                );
              })
            )}
          </div>

          {newsData.length > visibleCount + 1 && !loading && (
            <div className="load-more">
              <button onClick={showMore}>Mostrar más</button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default AllNews;
