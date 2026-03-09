import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Leaderboards.scss";
import Seo from "../SEO/Seo";
import { buildBreadcrumbJsonLd, buildCanonical } from "../../lib/seo/siteSeo";

import useUsuariosVinculados from "../../components/Estadisticas/hooks/useUsuariosVinculados";
import { getLeaderboards } from "../../components/Estadisticas/api/getLeaderboards";

import { isNombreValido, safeNum, getPlatform, formatearTiempo, formatInt } from "../../components/Estadisticas/leaderboards.utils";
import {
  SERVER_ID,
  LIMIT,
  FETCH_LIMIT,
  EXIT_DELAY_MS,
  SKELETON_ITEMS,
  COIN_SRC,
  ICON_POINTS,
  ICON_TIME,
  ICON_WALLET,
  PLATFORM_ICON,
  RANGO_LOCAL,
  RANGO_REMOTE,
  POINTS_GUIDE,
  hideImg,
  fallbackRankImg,
  cleanPlayerName,
  looksLikeBedrockName,
  pickWallet,
  normalizePlatform,
  normalizeRango,
  getMetaRango,
  fetchPlayerSkinUrl,
  buildHeadSources,
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
      }, EXIT_DELAY_MS);
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
    },
    [isLeaving, paginasTotales]
  );

  const toggleGuide = useCallback(() => {
    setShowGuide((prev) => !prev);
  }, []);

  const wrapClass = `lb-page${isLeaving ? " lb-is-leaving" : ""}`;

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
                    <span
                      className={`lb-platformPill lb-platformPill--${exitFx.platKey}`}
                    >
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

            <div className="lb-exitHint">Abriendo perfil…</div>
          </div>
        </div>
      ) : null}

      <div className="lb-shell">
        <div className="lb-frame">
          <section className="lb-content">
            <div className={`lb-tableCard ${isLeaving ? "is-leaving" : ""}`}>
              <div className="lb-cardHero">
                <div className="lb-cardHeroTitle">RANKINGS</div>
                <div className="lb-cardHeroSub">
                  Ranking global de Survival por puntos. Pulsa un jugador para ver su perfil.
                </div>
              </div>

              <div className="lb-toolbar">
                <div className="lb-search">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar jugador..."
                    autoComplete="off"
                    disabled={isLeaving}
                  />
                </div>

                <div className="lb-toolbarRight">
                  <button
                    type="button"
                    className={`lb-helpToggle ${showGuide ? "is-open" : ""}`}
                    onClick={toggleGuide}
                    aria-expanded={showGuide}
                    disabled={isLeaving}
                  >
                    {showGuide ? "Ocultar cómo subir puntos" : "¿Cómo se suben los puntos?"}
                  </button>

                  <button
                    type="button"
                    className={`lb-toggle ${soloVinculados ? "is-on" : ""}`}
                    onClick={() => setSoloVinculados((prev) => !prev)}
                    disabled={isLeaving}
                  >
                    Solo vinculados
                  </button>
                </div>
              </div>

              <div className={`lb-guide ${showGuide ? "is-open" : ""}`}>
                <div className="lb-guideInner">
                  <div className="lb-guideBox">
                    <div className="lb-guideHeader">
                      <div className="lb-guideTitle">Cómo subir en el ranking</div>
                      <div className="lb-guideSub">
                        Haz más de una cosa bien. El top no es para el que farmea una sola estadística.
                      </div>
                    </div>

                    <div className="lb-guideGrid">
                      {POINTS_GUIDE.map((item) => (
                        <div key={item.step} className="lb-guideItem">
                          <span className="lb-guideStep">{item.step}</span>
                          <div className="lb-guideItemTitle">{item.title}</div>
                          <div className="lb-guideItemText">{item.text}</div>
                        </div>
                      ))}
                    </div>

                    <div className="lb-guideFooter">
                      Cuanto más completo seas como jugador, más fácil será acercarte al top.
                    </div>
                  </div>
                </div>
              </div>

              {errorTabla ? <div className="lb-error">{errorTabla}</div> : null}

              <div className="lb-tableWrap">
                <table className="lb-table">
                  <colgroup>
                    <col style={{ width: 76 }} />
                    <col />
                    <col style={{ width: 170 }} />
                    <col style={{ width: 170 }} />
                    <col style={{ width: 150 }} />
                  </colgroup>

                  <thead>
                    <tr>
                      <th className="lb-colRank lb-center">#TOP</th>
                      <th>Jugador</th>
                      <th className="lb-center">
                        <HeadLabel icon={ICON_POINTS}>Points</HeadLabel>
                      </th>
                      <th className="lb-center">
                        <HeadLabel icon={ICON_TIME}>Horas</HeadLabel>
                      </th>
                      <th className="lb-center">
                        <HeadLabel icon={ICON_WALLET}>Wallet</HeadLabel>
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {loading ? (
                      SKELETON_ITEMS.map((_, i) => (
                        <tr key={`sk-${i}`}>
                          <td className="lb-rankCell lb-center">
                            <span className="lb-rankBadge">—</span>
                          </td>
                          <td className="lb-playerCell">Cargando...</td>
                          <td className="lb-center">—</td>
                          <td className="lb-center">—</td>
                          <td className="lb-center">—</td>
                        </tr>
                      ))
                    ) : pageRows.length ? (
                      pageRows.map((player) => {
                        const rank = Number(player?.global_rank || 0) || 0;
                        const topClass =
                          rank === 1
                            ? "lb-rowTop1"
                            : rank === 2
                            ? "lb-rowTop2"
                            : rank === 3
                            ? "lb-rowTop3"
                            : "";

                        return (
                          <tr
                            key={player?.uuid || player?.nombre_minecraft}
                            className={`is-clickable ${topClass}`}
                            onClick={() => onOpenPerfil(player)}
                            data-rango={player?.rangoKey || ""}
                          >
                            <td className="lb-rankCell lb-center">
                              <span className="lb-rankBadge">#{rank || "—"}</span>
                            </td>

                            <td className="lb-playerCell">
                              <PlayerIdentity player={player} />
                            </td>

                            <td className="lb-center lb-pointsCell">
                              <span className="lb-pointsValue">
                                {formatInt(player?.total_points || 0)}
                              </span>
                            </td>

                            <td className="lb-center">
                              <span className="lb-num">{player?.tiempoTxt}</span>
                            </td>

                            <td className="lb-center">
                              {player?.walletTxt === "—" ? (
                                <span className="lb-num">—</span>
                              ) : (
                                <span className="lb-walletValue">
                                  <img
                                    className="lb-coin"
                                    src={COIN_SRC}
                                    alt=""
                                    loading="lazy"
                                    onError={hideImg}
                                  />
                                  <span className="lb-num">{player?.walletTxt}</span>
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="lb-empty">
                          No hay resultados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="lb-cards">
                {loading ? (
                  SKELETON_ITEMS.map((_, i) => (
                    <div key={`csk-${i}`} className="lb-card">
                      <div className="lb-cardTop">
                        <span className="lb-rankBadge">—</span>
                        <div className="lb-skelTxt">Cargando...</div>
                      </div>
                    </div>
                  ))
                ) : (
                  pageRows.map((player) => {
                    const rank = Number(player?.global_rank || 0) || 0;

                    return (
                      <div
                        key={player?.uuid || player?.nombre_minecraft}
                        className="lb-card"
                        onClick={() => onOpenPerfil(player)}
                        data-rango={player?.rangoKey || ""}
                      >
                        <div className="lb-cardTop">
                          <span className="lb-rankBadge">#{rank || "—"}</span>
                          <PlayerIdentity player={player} mobile />
                        </div>

                        <div className="lb-cardMain">
                          <div className="lb-cardRow">
                            <span className="lb-cardLabel">
                              <img
                                className="lb-rowIcon"
                                src={ICON_POINTS}
                                alt=""
                                loading="lazy"
                                onError={hideImg}
                              />
                              <span>Points</span>
                            </span>
                            <strong>{formatInt(player?.total_points || 0)}</strong>
                          </div>

                          <div className="lb-cardRow">
                            <span className="lb-cardLabel">
                              <img
                                className="lb-rowIcon"
                                src={ICON_TIME}
                                alt=""
                                loading="lazy"
                                onError={hideImg}
                              />
                              <span>Horas</span>
                            </span>
                            <strong>{player?.tiempoTxt}</strong>
                          </div>

                          <div className="lb-cardRow">
                            <span className="lb-cardLabel">
                              <img
                                className="lb-rowIcon"
                                src={ICON_WALLET}
                                alt=""
                                loading="lazy"
                                onError={hideImg}
                              />
                              <span>Wallet</span>
                            </span>

                            {player?.walletTxt === "—" ? (
                              <strong>—</strong>
                            ) : (
                              <strong className="lb-walletInline">
                                <img
                                  className="lb-coin"
                                  src={COIN_SRC}
                                  alt=""
                                  loading="lazy"
                                  onError={hideImg}
                                />
                                {player?.walletTxt}
                              </strong>
                            )}
                          </div>
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
                    onClick={() => goPage(currentPage - 1)}
                    disabled={currentPage <= 1 || isLeaving}
                  >
                    ‹
                  </button>

                  <div className="lb-pageInfo">
                    {currentPage} / {paginasTotales}
                  </div>

                  <button
                    type="button"
                    onClick={() => goPage(currentPage + 1)}
                    disabled={currentPage >= paginasTotales || isLeaving}
                  >
                    ›
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