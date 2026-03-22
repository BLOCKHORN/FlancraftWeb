import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion as Motion } from "framer-motion";
import { UserContext } from "../../context/UserContext";
import Seo from "../SEO/Seo";
import { buildBreadcrumbJsonLd, buildCanonical } from "../../lib/seo/siteSeo";
import { apiUrl } from "../../lib/env";
import "../../styles/components/Noticias/_allnews.scss";

const MONTHS_ES = {
  enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
  julio: 6, agosto: 7, septiembre: 8, setiembre: 8, octubre: 9,
  noviembre: 10, diciembre: 11,
};

const normalizeRole = (value) => {
  if (value === null || value === undefined) return null;
  const role = String(value).trim().toLowerCase().replace(/[\s_-]+/g, "");
  return role || null;
};

function parseAnyDate(value) {
  if (!value) return NaN;
  if (typeof value === "number") return value;

  const s = String(value).trim();
  if (!s) return NaN;

  const iso = Date.parse(s);
  if (!Number.isNaN(iso)) return iso;

  const m1 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/);
  if (m1) {
    const dd = Number(m1[1]);
    const mm = Number(m1[2]) - 1;
    const yy = Number(m1[3]);
    const hh = m1[4] ? Number(m1[4]) : 0;
    const mi = m1[5] ? Number(m1[5]) : 0;
    return new Date(yy, mm, dd, hh, mi, 0).getTime();
  }

  const normalized = s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const m2 = normalized.match(/^(\d{1,2})\s+de\s+([a-z]+)\s+de\s+(\d{4})$/);
  if (m2) {
    const dd = Number(m2[1]);
    const mes = m2[2];
    const yy = Number(m2[3]);
    const mm = MONTHS_ES[mes];
    if (mm !== undefined) return new Date(yy, mm, dd, 0, 0, 0).getTime();
  }

  return NaN;
}

function getSortKey(n) {
  const created = n?.created_at || n?.createdAt || n?.fecha_creacion || n?.fechaCreacion || null;
  const tCreated = created ? parseAnyDate(created) : NaN;
  if (!Number.isNaN(tCreated)) return tCreated;

  const tFecha = parseAnyDate(n?.fecha);
  if (!Number.isNaN(tFecha)) return tFecha;

  const id = Number(n?.id);
  if (!Number.isNaN(id)) return id;

  return 0;
}

const generarSlug = (titulo) =>
  String(titulo || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, "-").trim();

const preloadImages = (urls, onDone) => {
  let loaded = 0;
  if (!urls.length) {
    onDone();
    return;
  }
  urls.forEach((url) => {
    const img = new Image();
    img.src = url;
    img.onload = img.onerror = () => {
      loaded += 1;
      if (loaded === urls.length) onDone();
    };
  });
};

const formatDate = (dateStr) => {
  const ts = parseAnyDate(dateStr);
  if (Number.isNaN(ts)) return "";
  const d = new Date(ts);
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });
};

const truncate = (text, limit = 160) => {
  const t = String(text || "").trim();
  if (!t) return "";
  return t.length <= limit ? t : t.slice(0, t.lastIndexOf(" ", limit)) + "...";
};

const extractSubtitleAndDescription = (contenido) => {
  try {
    if (typeof contenido === "string") {
      const div = document.createElement("div");
      div.innerHTML = contenido;
      const text = div.textContent || div.innerText || "";
      const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
      return {
        subtitulo: lines[0] || "",
        descripcion: truncate(lines.slice(1).join(" "), 170),
      };
    }

    if (typeof contenido === "object" && contenido !== null && Array.isArray(contenido?.content)) {
      let subtitulo = "";
      let descripcion = "";

      for (const block of contenido.content) {
        if (!block?.content) continue;

        const textoPlano = block.content.filter((c) => c.type === "text").map((c) => c.text).join(" ").replace(/\s+/g, " ").trim();
        if (!textoPlano) continue;

        if (!subtitulo && (block.type === "heading" || block.type === "paragraph")) {
          subtitulo = textoPlano;
          continue;
        }

        descripcion += `${textoPlano} `;
        if (descripcion.length > 180) break;
      }

      if (!descripcion && subtitulo) {
        descripcion = subtitulo;
        subtitulo = "";
      }

      return { subtitulo, descripcion: truncate(descripcion.trim(), 170) };
    }

    return { subtitulo: "", descripcion: "" };
  } catch {
    return { subtitulo: "", descripcion: "" };
  }
};

const AllNews = () => {
  const [newsData, setNewsData] = useState([]);
  const [visibleCount, setVisibleCount] = useState(10);
  const [loading, setLoading] = useState(true);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [serverFilter, setServerFilter] = useState("all");

  const listRef = useRef(null);
  const { user } = useContext(UserContext);

  const effectiveRole = useMemo(() => normalizeRole(user?.rango_staff || user?.rol_admin), [user]);
  const isOwner = user?.loggedIn && effectiveRole === "owner";

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: (i) => ({
      opacity: 1, y: 0, transition: { duration: 0.32, delay: i * 0.05 },
    }),
  };

  useEffect(() => {
    const fetchNoticias = async () => {
      try {
        const res = await fetch(apiUrl(`/api/noticias`));
        const data = await res.json();

        const publicadas = (Array.isArray(data) ? data : [])
          .filter((n) => Boolean(n?.publicada))
          .map((n) => ({
            ...n,
            slug: n.slug || generarSlug(n.titulo || "noticia"),
          }))
          .sort((a, b) => getSortKey(b) - getSortKey(a));

        setNewsData(publicadas);

        const preload = [publicadas[0], ...publicadas.slice(1, 1 + visibleCount)]
          .filter(Boolean)
          .map((n) => n.portada || "/assets/placeholder.png");

        preloadImages(preload, () => {
          setImagesLoaded(true);
          setTimeout(() => setLoading(false), 180);
        });
      } catch (error) {
        console.error("Error al obtener noticias:", error);
        setImagesLoaded(true);
        setTimeout(() => setLoading(false), 180);
      }
    };

    fetchNoticias();
  }, [visibleCount]);

  const servidoresDisponibles = useMemo(() => {
    const set = new Set();
    newsData.forEach((n) => {
      const s = String(n?.servidor || "").trim().toLowerCase();
      if (s) set.add(s);
    });
    return Array.from(set);
  }, [newsData]);

  const dataFiltrada = useMemo(() => {
    if (serverFilter === "all") return newsData;
    return newsData.filter((n) => String(n?.servidor || "").trim().toLowerCase() === serverFilter);
  }, [newsData, serverFilter]);

  const mainFeatured = dataFiltrada[0] || null;
  const rest = dataFiltrada.slice(1, 1 + visibleCount);

  const scrollToList = () => {
    listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const showMore = () => {
    setVisibleCount((prev) => prev + 10);
    setTimeout(() => {
      listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  const mainExcerpt = useMemo(() => {
    if (!mainFeatured) return { subtitulo: "", descripcion: "" };
    return extractSubtitleAndDescription(mainFeatured.contenido);
  }, [mainFeatured]);

  const dateOf = (n) => n?.fecha || n?.created_at || n?.fecha_creacion;

  return (
    <>
      <Seo
        title="Noticias de FlanCraft | Actualizaciones del servidor"
        description="Lee las últimas noticias, actualizaciones y anuncios de FlanCraft. Cambios del servidor, eventos y novedades de la comunidad."
        canonical={buildCanonical("/news")}
        jsonLd={buildBreadcrumbJsonLd([
          { name: "Inicio", item: buildCanonical("/") },
          { name: "Noticias", item: buildCanonical("/news") },
        ])}
      />

      <section className="allNews no-tap-highlight">
        <header className="allNews__hero">
          <div className="allNews__heroBg" aria-hidden="true" />
          <div className="allNews__heroFade" aria-hidden="true" />

          <div className="allNews__heroInner">
            <div className="allNews__topRow">
              {isOwner && (
                <Link to="/admin/noticias" className="allNews__adminBtn no-tap-highlight">
                  CREAR NOTICIA
                </Link>
              )}
            </div>

            <Motion.h1
              className="allNews__title"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
              NOTICIAS
            </Motion.h1>

            <div className="allNews__featuredSolo">
              {!imagesLoaded || loading ? (
                <div className="allNews__featuredCardSolo is-skeleton">
                  <div className="skHeroMedia" />
                  <div className="skHeroInfo">
                    <div className="skLine skTitle" />
                    <div className="skLine skP" />
                    <div className="skLine skMeta" />
                  </div>
                </div>
              ) : (
                mainFeatured && (
                  <Motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.05 }}
                    className="full-w-motion"
                  >
                    <Link to={`/news/${mainFeatured.slug}`} className="allNews__featuredCardSolo no-tap-highlight">
                      <div className="heroMedia heroMedia--contain">
                        <img src={mainFeatured.portada || "/assets/placeholder.png"} alt={mainFeatured.titulo} loading="eager" />
                      </div>

                      <div className="heroInfo">
                        <div className="meta">
                          <span className="badgeLatest">ÚLTIMA</span>
                          <span className="date">{formatDate(dateOf(mainFeatured))}</span>
                          {mainFeatured?.servidor && (
                            <span className="tag">{String(mainFeatured.servidor).toUpperCase()}</span>
                          )}
                        </div>

                        <h3 className="heroTitle">{mainFeatured.titulo}</h3>

                        {mainExcerpt.subtitulo ? (
                          <div className="heroSubtitle">{mainExcerpt.subtitulo}</div>
                        ) : null}
                      </div>
                    </Link>
                  </Motion.div>
                )
              )}
            </div>

            <div className="allNews__ctaRow">
              <button className="allNews__ctaBtn no-tap-highlight" onClick={scrollToList} type="button">
                VER TODAS
              </button>
            </div>
          </div>
        </header>

        <main className="allNews__body" ref={listRef}>
          <div className="allNews__bodyInner">
            <div className="allNews__sectionHead">
              <h2 className="allNews__sectionTitle">ÚLTIMOS ARTÍCULOS</h2>

              {servidoresDisponibles.length > 0 && (
                <div className="allNews__filters">
                  <button
                    type="button"
                    className={`pill no-tap-highlight ${serverFilter === "all" ? "is-active" : ""}`}
                    onClick={() => setServerFilter("all")}
                  >
                    TODOS
                  </button>

                  {servidoresDisponibles.slice(0, 6).map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`pill no-tap-highlight ${serverFilter === s ? "is-active" : ""}`}
                      onClick={() => setServerFilter(s)}
                    >
                      {s.toUpperCase()}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="allNews__list">
              {!imagesLoaded || loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="allNews__listCard is-skeleton">
                    <div className="skThumb" />
                    <div className="skText">
                      <div className="skLine skTitle" />
                      <div className="skLine skP" />
                      <div className="skLine skP" />
                      <div className="skLine skMeta" />
                    </div>
                  </div>
                ))
              ) : (
                rest.map((item, index) => {
                  const { subtitulo } = extractSubtitleAndDescription(item.contenido);

                  return (
                    <Motion.div key={item.id} custom={index} variants={itemVariants} initial="hidden" animate="visible">
                      <Link to={`/news/${item.slug}`} className="allNews__listCard no-tap-highlight">
                        <div className="thumb">
                          <img src={item.portada || "/assets/placeholder.png"} alt={item.titulo} loading="lazy" />
                        </div>

                        <div className="text">
                          <div className="meta">
                            <span className="date">{formatDate(dateOf(item))}</span>
                            {item?.servidor && (
                              <span className="tag">{String(item.servidor).toUpperCase()}</span>
                            )}
                          </div>

                          <h4 className="title">{item.titulo}</h4>
                          {subtitulo ? <div className="sub">{subtitulo}</div> : null}
                        </div>
                      </Link>
                    </Motion.div>
                  );
                })
              )}
            </div>

            {!loading && dataFiltrada.length > 1 + visibleCount && (
              <div className="allNews__more">
                <button className="allNews__moreBtn no-tap-highlight" onClick={showMore} type="button">
                  MOSTRAR MÁS
                </button>
              </div>
            )}
          </div>
        </main>
      </section>
    </>
  );
};

export default AllNews;