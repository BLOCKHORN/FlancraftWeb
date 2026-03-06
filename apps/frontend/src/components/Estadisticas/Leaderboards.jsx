import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Leaderboards.scss";

import useUsuariosVinculados from "../../components/Estadisticas/hooks/useUsuariosVinculados";
import { getLeaderboards } from "../../components/Estadisticas/api/getLeaderboards";

import {
  isNombreValido,
  safeNum,
  getPlatform,
  formatearTiempo,
  formatInt,
} from "../../components/Estadisticas/leaderboards.utils";

const API_BASE = (import.meta.env.VITE_BACKEND_URL || "https://flancraft-backend.onrender.com")
  .trim()
  .replace(/\/$/, "");
const apiUrl = (path) => (API_BASE ? `${API_BASE}${path}` : path);

const SERVER_ID = "survival";
const LIMIT = 10;
const FETCH_LIMIT = 700;
const EXIT_DELAY_MS = 520;
const SKELETON_ITEMS = Array.from({ length: LIMIT });

const COIN_SRC = "/tienda/assets/coin.png";
const ICON_POINTS = "/assets/points.png";
const ICON_TIME = "/assets/statsperfil/playtime.webp";
const ICON_WALLET = "/assets/wallet.png";

const PLATFORM_ICON = {
  java: "/assets/platform/java.png",
  bedrock: "/assets/platform/bedrock.png",
  other: "",
};

const RANGO_LOCAL = {
  nova: "/assets/nova.png",
  alpha: "/assets/alpha.png",
  inmortal: "/assets/inmortal.png",
};

const RANGO_REMOTE = {
  nova: "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/2de18b63a83cb0b8df9197a4eab9ca575906152d.png",
  alpha: "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/9c1a0dd33eb6327f1ceb179080f232bc842e8225.png",
  inmortal:
    "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/1aaaa34593db3f2dea9d09a7bd4d985500d69de6.png",
};

const POINTS_GUIDE = [
  {
    step: "01",
    title: "Pica, mata y progresa",
    text: "Minar, farmear mobs y avanzar de verdad te da la base más fuerte de puntos.",
  },
  {
    step: "02",
    title: "El PvP sí cuenta",
    text: "Ganar peleas suma bastante. Si eres bueno peleando, lo vas a notar rápido.",
  },
  {
    step: "03",
    title: "Morir te frena",
    text: "Las muertes restan. Subir al top no es solo grindear: también importa sobrevivir.",
  },
  {
    step: "04",
    title: "El tiempo ayuda",
    text: "Jugar más suma, pero no vale con estar AFK toda la vida. El progreso real pesa más.",
  },
  {
    step: "05",
    title: "La economía empuja",
    text: "Tener una economía fuerte también suma, pero no regala el top por sí sola.",
  },
  {
    step: "06",
    title: "Para ser top hay que ser completo",
    text: "El ranking premia al jugador que hace de todo bien: progreso, constancia, PvP y cabeza.",
  },
];

const skinUrlCache = new Map();
const skinPromiseCache = new Map();

const hideImg = (e) => {
  e.currentTarget.style.display = "none";
};

const fallbackRankImg = (key) => (e) => {
  const el = e.currentTarget;
  if (el?.dataset?.didFallback === "1") {
    el.style.display = "none";
    return;
  }
  el.dataset.didFallback = "1";
  el.src = RANGO_REMOTE[key] || "";
};

const cleanPlayerName = (value) => String(value || "").trim().replace(/^\.+/, "");

const looksLikeBedrockName = (value) => String(value || "").trim().startsWith(".");

const pickWallet = (source) => {
  const value =
    source?.wallet_coins ??
    source?.walletCoins ??
    source?.coins_wallet ??
    source?.coins_web ??
    source?.wallet;

  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const normalizePlatform = (platform) => {
  const value = String(platform || "").toLowerCase();
  if (value.includes("bedrock")) return "bedrock";
  if (value.includes("java")) return "java";
  return "other";
};

const normalizeRango = (rango) => {
  const value = String(rango || "").toLowerCase().trim();
  if (!value) return null;
  if (value.includes("nova")) return "nova";
  if (value.includes("alpha")) return "alpha";
  if (value.includes("inmortal") || value.includes("immortal")) return "inmortal";
  return null;
};

const getMetaRango = (meta) =>
  meta?.rango || meta?.rango_usuario || meta?.rank || null;

const fetchPlayerSkinUrl = async (uuid, signal) => {
  if (!uuid) return null;

  if (skinUrlCache.has(uuid)) {
    return skinUrlCache.get(uuid) || null;
  }

  if (skinPromiseCache.has(uuid)) {
    return skinPromiseCache.get(uuid);
  }

  const promise = fetch(apiUrl(`/api/usuarios/${uuid}/skin`), { signal })
    .then(async (res) => {
      if (!res.ok) return null;
      const data = await res.json().catch(() => null);
      const skinUrl = String(data?.skin_url || "").trim() || null;
      skinUrlCache.set(uuid, skinUrl);
      return skinUrl;
    })
    .catch(() => null)
    .finally(() => {
      skinPromiseCache.delete(uuid);
    });

  skinPromiseCache.set(uuid, promise);
  return promise;
};

const buildHeadSources = ({ uuid, nombre, platKey, remoteSkinUrl }) => {
  const cleanName = cleanPlayerName(nombre);
  const isBedrock = platKey === "bedrock" || looksLikeBedrockName(nombre);
  const list = [];

  if (remoteSkinUrl) {
    list.push(remoteSkinUrl);
  }

  if (!isBedrock && cleanName) {
    list.push(`https://minotar.net/helm/${encodeURIComponent(cleanName)}/64`);
  }

  if (isBedrock) {
    list.push("/assets/skins/bedrock-default.webp");
  }

  list.push("/assets/skins/default-steve.webp");

  return Array.from(new Set(list.filter(Boolean)));
};

const pickExitSkin = (nombre, platKey, uuid) => {
  const cleanName = cleanPlayerName(nombre);
  const isBedrock = platKey === "bedrock" || looksLikeBedrockName(nombre);
  const cached = uuid ? skinUrlCache.get(uuid) : null;

  if (cached) return cached;
  if (!isBedrock && cleanName) {
    return `https://minotar.net/helm/${encodeURIComponent(cleanName)}/128`;
  }
  if (isBedrock) {
    return "/assets/skins/bedrock-default.webp";
  }
  return "/assets/skins/default-steve.webp";
};

const buildFxPayload = (player, meta) => {
  const nombre = player?.nombre_minecraft || "";
  const platKey = normalizePlatform(player?.platform || getPlatform(player));
  const rangoKey = normalizeRango(getMetaRango(meta));

  return {
    nombre,
    platKey,
    rangoKey,
    skin: pickExitSkin(nombre, platKey, player?.uuid),
  };
};

const normalizeLeaderboardItem = (player) => {
  if (!isNombreValido(player?.nombre_minecraft)) return null;

  const uuid = player?.uuid || null;
  const nombre = player?.nombre_minecraft || "";
  const id = String(uuid || nombre.toLowerCase()).trim();

  if (!id) return null;

  const totalPoints = safeNum(
    player?.svpoints ??
      player?.points ??
      player?.puntos ??
      player?.puntos_sv ??
      player?.survival_points ??
      0
  );

  const tiempoTotal = Math.max(0, safeNum(player?.tiempo_jugado));
  const wallet = pickWallet(player);

  return {
    id,
    uuid,
    nombre_minecraft: nombre,
    platform: getPlatform(player),
    wallet,
    tiempo_total: tiempoTotal,
    total_points: totalPoints,
  };
};

const decoratePlayer = (player, meta) => {
  const rangoRaw = getMetaRango(meta);
  const rangoKey = normalizeRango(rangoRaw);
  const platKey = normalizePlatform(player?.platform);
  const wallet = player?.wallet ?? pickWallet(meta);
  const walletTxt = wallet == null ? "—" : formatInt(wallet);
  const tiempoTxt = formatearTiempo(safeNum(player?.tiempo_total));

  return {
    ...player,
    meta,
    rangoRaw,
    rangoKey,
    platKey,
    wallet,
    walletTxt,
    tiempoTxt,
    platformIcon: PLATFORM_ICON[platKey] || "",
  };
};

const HeadLabel = ({ icon, children }) => (
  <span className="lb-th">
    {icon ? (
      <img
        className="lb-thIcon"
        src={icon}
        alt=""
        loading="lazy"
        onError={hideImg}
      />
    ) : null}
    <span className="lb-thTxt">{children}</span>
  </span>
);

function LeaderboardSkin({ uuid, nombre, platKey }) {
  const [remoteSkinUrl, setRemoteSkinUrl] = useState(() => {
    if (!uuid) return "";
    return skinUrlCache.get(uuid) || "";
  });
  const [errorIndex, setErrorIndex] = useState(0);

  const isBedrock = platKey === "bedrock" || looksLikeBedrockName(nombre);
  const sources = useMemo(
    () =>
      buildHeadSources({
        uuid,
        nombre,
        platKey,
        remoteSkinUrl,
      }),
    [uuid, nombre, platKey, remoteSkinUrl]
  );

  useEffect(() => {
    setErrorIndex(0);
  }, [uuid, nombre, platKey, remoteSkinUrl]);

  useEffect(() => {
    if (!uuid || !isBedrock) return;

    let active = true;
    const controller = new AbortController();

    fetchPlayerSkinUrl(uuid, controller.signal).then((url) => {
      if (!active || !url) return;
      setRemoteSkinUrl(url);
    });

    return () => {
      active = false;
      controller.abort();
    };
  }, [uuid, isBedrock]);

  const currentSrc = sources[Math.min(errorIndex, Math.max(sources.length - 1, 0))] || "/assets/skins/default-steve.webp";

  return (
    <img
      src={currentSrc}
      alt=""
      loading="lazy"
      onError={() => {
        setErrorIndex((prev) => (prev < sources.length - 1 ? prev + 1 : prev));
      }}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        objectPosition: "center top",
        imageRendering: "pixelated",
        display: "block",
      }}
    />
  );
}

const PlayerIdentity = ({ player, mobile = false }) => {
  const { nombre_minecraft, rangoKey, rangoRaw, platKey, platformIcon } = player;

  return (
    <div className="lb-player">
      <div className="lb-skin">
        <LeaderboardSkin
          uuid={player?.uuid}
          nombre={nombre_minecraft}
          platKey={platKey}
        />
      </div>

      <div className="lb-nameWrap">
        <div className={`lb-name ${rangoKey ? `is-${rangoKey}` : ""}`}>
          {nombre_minecraft}
        </div>

        <div className="lb-meta">
          {mobile ? (
            platKey === "java" || platKey === "bedrock" ? (
              <span
                className={`lb-platform lb-platform--${platKey}`}
                title={platKey}
                aria-label={platKey}
              >
                {platformIcon ? (
                  <img
                    className="lb-platformIcon"
                    src={platformIcon}
                    alt=""
                    loading="lazy"
                    onError={hideImg}
                  />
                ) : null}
                <span className="lb-platformDot" />
              </span>
            ) : null
          ) : platKey === "java" || platKey === "bedrock" ? (
            <span className={`lb-platformPill lb-platformPill--${platKey}`}>
              {platKey === "bedrock" ? "BEDROCK" : "JAVA"}
            </span>
          ) : null}

          {rangoKey ? (
            <span
              className={`lb-rango lb-rango--${rangoKey}`}
              title={String(rangoRaw || "")}
            >
              <img
                className="lb-rangoIcon"
                src={RANGO_LOCAL[rangoKey]}
                alt=""
                loading="lazy"
                onError={fallbackRankImg(rangoKey)}
              />
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
};

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
  );
}