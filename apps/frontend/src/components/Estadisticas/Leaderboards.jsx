import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Leaderboards.scss";
import Seo from "../SEO/Seo";
import { buildBreadcrumbJsonLd, buildCanonical } from "../../lib/seo/siteSeo";
import useUsuariosVinculados from "../../components/Estadisticas/hooks/useUsuariosVinculados";
import { getLeaderboards } from "../../components/Estadisticas/api/getLeaderboards";
import { formatInt } from "../../components/Estadisticas/leaderboards.utils";
import {
  SERVER_ID,
  LIMIT,
  FETCH_LIMIT,
  EXIT_DELAY_MS,
  SKELETON_ITEMS,
  ICON_POINTS,
  ICON_TIME,
  RANGO_LOCAL,
  POINTS_GUIDE,
  hideImg,
  fallbackRankImg,
  buildFxPayload,
  normalizeLeaderboardItem,
  decoratePlayer,
  PlayerIdentity,
  HeadLabel,
} from "./leaderboards.shared";

export default function Leaderboards() {
  const navigate = useNavigate();
  const usuariosVinculados = useUsuariosVinculados() || {};

  const [loading, setLoading] = useState(true);
  const [errorTabla, setErrorTabla] = useState("");
  const [dataset, setDataset] = useState([]);

  const [query, setQuery] = useState("");
  const [soloVinculados, setSoloVinculados] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [page, setPage] = useState(1);

  const [isLeaving, setIsLeaving] = useState(false);
  const [exitFx, setExitFx] = useState(null);

  const leaveTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (leaveTimerRef.current) {
        clearTimeout(leaveTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [query, soloVinculados]);

  const onOpenPerfil = useCallback(
    (player) => {
      if (!player?.nombre_minecraft || isLeaving) return;

      const meta = player?.meta || (player?.uuid ? usuariosVinculados[player.uuid] : null);
      const fx = buildFxPayload(player, meta);

      if (leaveTimerRef.current) {
        clearTimeout(leaveTimerRef.current);
      }

      setExitFx(fx);
      setIsLeaving(true);

      leaveTimerRef.current = setTimeout(() => {
        navigate(`/perfil/${player.nombre_minecraft}`, { state: { fx } });
      }, EXIT_DELAY_MS - 100); 
    },
    [isLeaving, navigate, usuariosVinculados]
  );

  useEffect(() => {
    const controller = new AbortController();
    let alive = true;

    const load = async () => {
      try {
        setLoading(true);
        setErrorTabla("");

        const res = await getLeaderboards({
          tipo: "svpoints",
          servidor: SERVER_ID,
          limit: FETCH_LIMIT,
          offset: 0,
          asc: false,
          signal: controller.signal,
        });

        if (!alive) return;

        const items = Array.isArray(res?.resultados) ? res.resultados : [];
        const uniqueMap = new Map();

        for (const item of items) {
          const normalized = normalizeLeaderboardItem(item);
          if (!normalized) continue;
          uniqueMap.set(normalized.id, normalized);
        }

        const ranked = Array.from(uniqueMap.values())
          .sort((a, b) => {
            const pointsDiff = (b.total_points || 0) - (a.total_points || 0);
            if (pointsDiff !== 0) return pointsDiff;
            return (b.tiempo_total || 0) - (a.tiempo_total || 0);
          })
          .map((item, index) => ({
            ...item,
            global_rank: index + 1,
          }));

        setDataset(ranked);
      } catch (error) {
        if (!alive || error?.name === "AbortError") return;
        setErrorTabla("No se pudo cargar el ranking.");
        setDataset([]);
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      alive = false;
      controller.abort();
    };
  }, []);

  const normalizedQuery = useMemo(() => query.trim().toLowerCase(), [query]);

  const filtrados = useMemo(() => {
    return dataset.filter((player) => {
      const name = String(player?.nombre_minecraft || "").toLowerCase();

      if (normalizedQuery && !name.includes(normalizedQuery)) {
        return false;
      }

      if (soloVinculados && !usuariosVinculados[player?.uuid]) {
        return false;
      }

      return true;
    });
  }, [dataset, normalizedQuery, soloVinculados, usuariosVinculados]);

  const paginasTotales = Math.max(1, Math.ceil(filtrados.length / LIMIT));
  const currentPage = Math.min(page, paginasTotales);
  const start = (currentPage - 1) * LIMIT;

  const pageRows = useMemo(() => {
    return filtrados.slice(start, start + LIMIT).map((player) => {
      const meta = player?.uuid ? usuariosVinculados[player.uuid] || null : null;
      return decoratePlayer(player, meta);
    });
  }, [filtrados, start, usuariosVinculados]);

  useEffect(() => {
    if (page !== currentPage) {
      setPage(currentPage);
    }
  }, [page, currentPage]);

  const goPage = useCallback(
    (nextPage) => {
      if (isLeaving) return;
      const safePage = Math.max(1, Math.min(paginasTotales, Number(nextPage || 1)));
      setPage(safePage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [isLeaving, paginasTotales]
  );

  const toggleGuide = useCallback(() => {
    setShowGuide((prev) => !prev);
  }, []);

  const wrapClass = `lb-page no-tap-highlight ${isLeaving ? "lb-is-leaving" : ""}`;

  return (
    <>
      <Seo
        title="Leaderboards de FlanCraft | Ranking del servidor"
        description="Consulta los leaderboards de FlanCraft y descubre a los jugadores más destacados del servidor Survival."
        canonical={buildCanonical("/leaderboards")}
        jsonLd={buildBreadcrumbJsonLd([
          { name: "Inicio", item: buildCanonical("/") },
          { name: "Leaderboards", item: buildCanonical("/leaderboards") },
        ])}
      />

      <section className={wrapClass}>
        <div className="lb-backgroundWrap" aria-hidden="true" />

        {isLeaving && exitFx ? (
          <div className="lb-exitOverlay" aria-hidden="true">
            <div className="lb-exitFog" />
            <div className="lb-exitCard">
              <div className="lb-exitTop">
                <img
                  className="lb-exitSkin"
                  src={exitFx.skin}
                  alt=""
                  draggable="false"
                  onError={hideImg}
                  style={{ objectFit: "cover", objectPosition: "center top" }}
                />
                <div className="lb-exitInfo">
                  <div className="lb-exitName">{exitFx.nombre}</div>
                  <div className="lb-exitBadges">
                    {exitFx.platKey === "java" || exitFx.platKey === "bedrock" ? (
                      <span className={`lb-platformPill lb-platformPill--${exitFx.platKey}`}>
                        {exitFx.platKey === "bedrock" ? "BEDROCK" : "JAVA"}
                      </span>
                    ) : null}

                    {exitFx.rangoKey ? (
                      <span className={`lb-exitRango lb-exitRango--${exitFx.rangoKey}`}>
                        <img
                          className="lb-rangoIcon"
                          src={RANGO_LOCAL[exitFx.rangoKey]}
                          alt=""
                          loading="eager"
                          onError={fallbackRankImg(exitFx.rangoKey)}
                        />
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="lb-exitBar">
                <div className="lb-exitBarFill" />
                <div className="lb-exitBarSheen" />
              </div>

              <div className="lb-exitHint">ENTRANDO AL PERFIL...</div>
            </div>
          </div>
        ) : null}

        <div className="lb-shell">
          <div className="lb-frame">
            <section className="lb-content">
              <div className={`lb-tableCard ${isLeaving ? "is-leaving" : ""}`}>
                
                <div className="lb-cardHero">
                  <div className="lb-cardHeroTitle">RANKING GLOBAL</div>
                  <div className="lb-cardHeroSub">
                    DOMINA EL SURVIVAL. TOCA UN JUGADOR PARA VER SUS STATS.
                  </div>
                </div>

                <div className="lb-toolbar-sticky-wrapper">
                  <div className="lb-toolbar">
                    <div className="lb-search">
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Buscar jugador..."
                        autoComplete="off"
                        disabled={isLeaving}
                        className="no-tap-highlight"
                      />
                    </div>

                    <div className="lb-toolbarRight">
                      <button
                        type="button"
                        className={`lb-helpToggle no-tap-highlight ${showGuide ? "is-open" : ""}`}
                        onClick={toggleGuide}
                        aria-expanded={showGuide}
                        disabled={isLeaving}
                      >
                        {showGuide ? "▲ Ocultar info" : "▼ ¿Cómo subo?"}
                      </button>

                      <button
                        type="button"
                        className={`lb-toggle no-tap-highlight ${soloVinculados ? "is-on" : ""}`}
                        onClick={() => setSoloVinculados((prev) => !prev)}
                        disabled={isLeaving}
                      >
                        {soloVinculados ? "★ Solo Vinculados" : "☆ Todos"}
                      </button>
                    </div>
                  </div>
                </div>

                <div className={`lb-guide ${showGuide ? "is-open" : ""}`}>
                  <div className="lb-guideInner">
                    <div className="lb-guideBox">
                      <div className="lb-guideHeader">
                        <div className="lb-guideTitle">LA FÓRMULA DEL ÉXITO</div>
                        <div className="lb-guideSub">
                          Fijate bien: el top no es para el que solo farmea. Tienes que ser completo.
                        </div>
                      </div>

                      <div className="lb-guideGrid">
                        {POINTS_GUIDE.map((item) => (
                          <div key={item.step} className="lb-guideItem">
                            <span className="lb-guideStep">{item.step}</span>
                            <div className="lb-guideItemContent">
                              <div className="lb-guideItemTitle">{item.title}</div>
                              <div className="lb-guideItemText">{item.text}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {errorTabla ? <div className="lb-error">{errorTabla}</div> : null}

                {/* DESKTOP TABLE */}
                <div className="lb-tableWrap">
                  <div className="lb-gridTable">
                    <div className="lb-gridHeader">
                      <div className="lb-headCell lb-center">#TOP</div>
                      <div className="lb-headCell">JUGADOR</div>
                      <div className="lb-headCell lb-center">
                        <HeadLabel icon={ICON_POINTS}>POINTS</HeadLabel>
                      </div>
                      <div className="lb-headCell lb-center">
                        <HeadLabel icon={ICON_TIME}>HORAS</HeadLabel>
                      </div>
                    </div>

                    <div className="lb-gridBody">
                      {loading ? (
                        SKELETON_ITEMS.map((_, i) => (
                          <div key={`sk-${i}`} className="lb-row" style={{ "--stagger": i }}>
                            <div className="lb-cell lb-center">
                              <span className="lb-rankBadge">—</span>
                            </div>
                            <div className="lb-cell">
                              <div className="lb-skelPlayer">
                                <div className="lb-skelSkin" />
                                <div className="lb-skelName" />
                              </div>
                            </div>
                            <div className="lb-cell lb-center lb-skelTxt">—</div>
                            <div className="lb-cell lb-center lb-skelTxt">—</div>
                          </div>
                        ))
                      ) : pageRows.length ? (
                        pageRows.map((player, i) => {
                          const rank = Number(player?.global_rank || 0) || 0;
                          
                          const topClass = rank === 1 ? "lb-rowTop1"
                            : rank === 2 ? "lb-rowTop2"
                            : rank === 3 ? "lb-rowTop3"
                            : "";

                          const moveClass = player?.isNew24h ? "lb-rowNew"
                            : player?.rankDelta24h > 0 ? "lb-rowClimbing"
                            : player?.rankDelta24h < 0 ? "lb-rowFalling"
                            : player?.pointsDelta24h > 0 ? "lb-rowHot"
                            : "";

                          return (
                            <div
                              key={player?.uuid || player?.nombre_minecraft}
                              className={`lb-row is-clickable no-tap-highlight animate-pop ${topClass} ${moveClass}`.trim()}
                              onClick={() => onOpenPerfil(player)}
                              data-rango={player?.rangoKey || ""}
                              style={{ "--stagger": i }}
                            >
                              <div className="lb-cell lb-center">
                                <span className={`lb-rankBadge ${rank <= 3 ? `lb-rankBadge--top${rank}` : ""}`}>
                                  #{rank || "—"}
                                </span>
                              </div>

                              <div className="lb-cell lb-colPlayer">
                                <PlayerIdentity player={player} />
                              </div>

                              <div className="lb-cell lb-center lb-pointsCell">
                                <span className="lb-pointsValue">
                                  {formatInt(player?.total_points || 0)}
                                </span>
                              </div>

                              <div className="lb-cell lb-center">
                                <span className="lb-num">{player?.tiempoTxt}</span>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="lb-empty">Nadie por aquí... 🦗</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* MOBILE LIST (Hyper-optimized vertical format) */}
                <div className="lb-mobCards">
                  {loading ? (
                    SKELETON_ITEMS.map((_, i) => (
                      <div key={`csk-${i}`} className="lb-mobRow-skel" style={{ "--stagger": i }}>
                        <div className="lb-skelSkin" />
                        <div className="lb-skelName" />
                      </div>
                    ))
                  ) : (
                    pageRows.map((player, i) => {
                      const rank = Number(player?.global_rank || 0) || 0;
                      
                      const topClass = rank === 1 ? "lb-rowTop1"
                            : rank === 2 ? "lb-rowTop2"
                            : rank === 3 ? "lb-rowTop3"
                            : "";

                      return (
                        <div
                          key={player?.uuid || player?.nombre_minecraft}
                          className={`lb-mobRow no-tap-highlight animate-pop ${topClass}`.trim()}
                          onClick={() => onOpenPerfil(player)}
                          data-rango={player?.rangoKey || ""}
                          style={{ "--stagger": i }}
                        >
                          <div className="lb-mobRow-main">
                             <div className="lb-mobRow-left">
                               <span className={`lb-rankBadge ${rank <= 3 ? `lb-rankBadge--top${rank}` : ""}`}>
                                  #{rank || "—"}
                                </span>
                             </div>
                             <div className="lb-mobRow-center">
                                <PlayerIdentity player={player} mobile />
                             </div>
                             <div className="lb-mobRow-right">
                               <div className="lb-mobRow-points">
                                 <img className="lb-rowIcon" src={ICON_POINTS} alt="" />
                                 <span>{formatInt(player?.total_points || 0)}</span>
                               </div>
                             </div>
                          </div>

                          <div className="lb-mobRow-footer">
                            <span className="lb-mobRow-stat">
                              <img src={ICON_TIME} alt="" /> {player?.tiempoTxt}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="lb-pagination">
                  <div className="lb-pager">
                    <button
                      type="button"
                      className="no-tap-highlight"
                      onClick={() => goPage(currentPage - 1)}
                      disabled={currentPage <= 1 || isLeaving}
                    >
                      ◀
                    </button>

                    <div className="lb-pageInfo">
                      {currentPage} <span style={{opacity: 0.5}}>/</span> {paginasTotales}
                    </div>

                    <button
                      type="button"
                      className="no-tap-highlight"
                      onClick={() => goPage(currentPage + 1)}
                      disabled={currentPage >= paginasTotales || isLeaving}
                    >
                      ▶
                    </button>
                  </div>
                </div>

                <div className="lb-leaveBlocker" aria-hidden="true" />
              </div>
            </section>
          </div>
        </div>
      </section>
    </>
  );
}