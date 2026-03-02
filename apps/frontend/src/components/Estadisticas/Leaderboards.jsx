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

const LIMIT = 10;
const FETCH_LIMIT = 700;

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
  inmortal: "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/1aaaa34593db3f2dea9d09a7bd4d985500d69de6.png",
};

const pickWallet = (p) => {
  const v =
    p?.wallet_coins ??
    p?.walletCoins ??
    p?.coins_wallet ??
    p?.coins_web ??
    p?.wallet;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const normalizePlatform = (p) => {
  const s = String(p || "").toLowerCase();
  if (s.includes("bedrock")) return "bedrock";
  if (s.includes("java")) return "java";
  return "other";
};

const normalizeRango = (r) => {
  const s = String(r || "").toLowerCase().trim();
  if (!s) return null;
  if (s.includes("nova")) return "nova";
  if (s.includes("alpha")) return "alpha";
  if (s.includes("inmortal") || s.includes("immortal")) return "inmortal";
  return null;
};

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

const buildFxPayload = (p, meta) => {
  const nombre = p?.nombre_minecraft || "";
  const platKey = normalizePlatform(p?.platform || getPlatform(p));
  const rangoRaw = meta?.rango || meta?.rango_usuario || meta?.rank || null;
  const rangoKey = normalizeRango(rangoRaw);
  const skin = `https://minotar.net/helm/${encodeURIComponent(
    nombre || "Steve"
  )}/128`;
  return { nombre, platKey, rangoKey, skin };
};

export default function Leaderboards() {
  const navigate = useNavigate();
  const usuariosVinculados = useUsuariosVinculados();

  const getMeta = useCallback(
    (uuid) => usuariosVinculados?.[uuid] || null,
    [usuariosVinculados]
  );

  const [loading, setLoading] = useState(true);
  const [errorTabla, setErrorTabla] = useState("");
  const [dataset, setDataset] = useState([]);

  const [query, setQuery] = useState("");
  const [soloVinculados, setSoloVinculados] = useState(false);
  const [offset, setOffset] = useState(0);

  const [isLeaving, setIsLeaving] = useState(false);
  const [exitFx, setExitFx] = useState(null);

  const leaveTimer = useRef(null);

  useEffect(() => {
    return () => {
      if (leaveTimer.current) clearTimeout(leaveTimer.current);
    };
  }, []);

  useEffect(() => {
    setOffset(0);
  }, [query, soloVinculados]);

  const onOpenPerfil = useCallback(
    (player) => {
      if (!player?.nombre_minecraft || isLeaving) return;

      const meta = getMeta(player?.uuid);
      const fx = buildFxPayload(player, meta);

      setExitFx(fx);
      setIsLeaving(true);

      leaveTimer.current = setTimeout(() => {
        navigate(`/perfil/${player.nombre_minecraft}`, { state: { fx } });
      }, 520);
    },
    [navigate, isLeaving, getMeta]
  );

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErrorTabla("");

        const res = await getLeaderboards({
          tipo: "svpoints",
          servidor: "survival",
          limit: FETCH_LIMIT,
          offset: 0,
          asc: false,
        });

        if (!alive) return;

        const items = Array.isArray(res?.resultados) ? res.resultados : [];

        const map = new Map();

        for (const p of items) {
          if (!isNombreValido(p?.nombre_minecraft)) continue;

          const uuid = p?.uuid || null;
          const name = p?.nombre_minecraft || "";
          const id = (uuid || name.toLowerCase()).trim();
          if (!id) continue;

          const pts = safeNum(
            p?.svpoints ??
              p?.points ??
              p?.puntos ??
              p?.puntos_sv ??
              p?.survival_points ??
              0
          );

          const t = safeNum(p?.tiempo_jugado);

          map.set(id, {
            uuid,
            nombre_minecraft: name,
            platform: getPlatform(p),
            wallet: pickWallet(p),
            tiempo_total: t > 0 ? t : 0,
            total_points: pts,
          });
        }

        const merged = Array.from(map.values());

        merged.sort((a, b) => {
          const dp = (b.total_points || 0) - (a.total_points || 0);
          if (dp !== 0) return dp;
          return (b.tiempo_total || 0) - (a.tiempo_total || 0);
        });

        const ranked = merged.map((r, i) => ({ ...r, global_rank: i + 1 }));
        setDataset(ranked);
      } catch {
        if (!alive) return;
        setErrorTabla("No se pudo cargar el ranking.");
        setDataset([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const filtrados = useMemo(() => {
    const q = (query || "").trim().toLowerCase();

    return (dataset || []).filter((p) => {
      const name = (p?.nombre_minecraft || "").toLowerCase();
      if (q && !name.includes(q)) return false;

      if (soloVinculados) {
        const meta = getMeta(p?.uuid);
        if (!meta) return false;
      }

      return true;
    });
  }, [dataset, query, soloVinculados, getMeta]);

  const totalRows = filtrados.length;

  const paginasTotales = useMemo(
    () => Math.max(1, Math.ceil(totalRows / LIMIT)),
    [totalRows]
  );

  const paginaActual = useMemo(() => Math.floor(offset / LIMIT) + 1, [offset]);

  const pageRows = useMemo(
    () => filtrados.slice(offset, offset + LIMIT),
    [filtrados, offset]
  );

  const goPage = useCallback(
    (page) => {
      const p = Math.max(1, Math.min(paginasTotales, Number(page || 1)));
      setOffset((p - 1) * LIMIT);
    },
    [paginasTotales]
  );

  const wrapClass = useMemo(() => {
    return ["lb-page", isLeaving ? "lb-is-leaving" : ""]
      .filter(Boolean)
      .join(" ");
  }, [isLeaving]);

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
                    <span
                      className={`lb-exitRango lb-exitRango--${exitFx.rangoKey}`}
                    >
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
                  Ranking global de Survival por puntos. Pulsa un jugador para ver
                  su perfil.
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
                    className={`lb-toggle ${soloVinculados ? "is-on" : ""}`}
                    onClick={() => setSoloVinculados((v) => !v)}
                    disabled={isLeaving}
                  >
                    Solo vinculados
                  </button>
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
                      Array.from({ length: LIMIT }).map((_, i) => (
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
                      pageRows.map((p) => {
                        const rank = Number(p?.global_rank || 0) || 0;
                        const topClass =
                          rank === 1
                            ? "lb-rowTop1"
                            : rank === 2
                            ? "lb-rowTop2"
                            : rank === 3
                            ? "lb-rowTop3"
                            : "";

                        const meta = getMeta(p?.uuid);
                        const rangoRaw =
                          meta?.rango || meta?.rango_usuario || meta?.rank || null;
                        const rangoKey = normalizeRango(rangoRaw);

                        const platTxt = p?.platform || "";
                        const platKey = normalizePlatform(platTxt);

                        const wallet = p?.wallet ?? pickWallet(meta);
                        const walletTxt =
                          wallet == null ? "—" : formatInt(wallet);

                        const tiempoTxt = formatearTiempo(
                          safeNum(p?.tiempo_total)
                        );

                        return (
                          <tr
                            key={p?.uuid || p?.nombre_minecraft}
                            className={`is-clickable ${topClass}`}
                            onClick={() => onOpenPerfil(p)}
                            data-rango={rangoKey || ""}
                          >
                            <td className="lb-rankCell lb-center">
                              <span className="lb-rankBadge">
                                #{rank || "—"}
                              </span>
                            </td>

                            <td className="lb-playerCell">
                              <div className="lb-player">
                                <div className="lb-skin">
                                  <img
                                    src={`https://minotar.net/helm/${encodeURIComponent(
                                      p?.nombre_minecraft || "Steve"
                                    )}/64`}
                                    alt=""
                                    loading="lazy"
                                  />
                                </div>

                                <div className="lb-nameWrap">
                                  <div
                                    className={`lb-name ${
                                      rangoKey ? `is-${rangoKey}` : ""
                                    }`}
                                  >
                                    {p?.nombre_minecraft}
                                  </div>

                                  <div className="lb-meta">
                                    {platKey === "java" ||
                                    platKey === "bedrock" ? (
                                      <span
                                        className={`lb-platformPill lb-platformPill--${platKey}`}
                                      >
                                        {platKey === "bedrock"
                                          ? "BEDROCK"
                                          : "JAVA"}
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
                            </td>

                            <td className="lb-center lb-pointsCell">
                              <span className="lb-pointsValue">
                                {formatInt(p?.total_points || 0)}
                              </span>
                            </td>

                            <td className="lb-center">
                              <span className="lb-num">{tiempoTxt}</span>
                            </td>

                            <td className="lb-center">
                              {walletTxt === "—" ? (
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
                                  <span className="lb-num">{walletTxt}</span>
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
                  Array.from({ length: LIMIT }).map((_, i) => (
                    <div key={`csk-${i}`} className="lb-card">
                      <div className="lb-cardTop">
                        <span className="lb-rankBadge">—</span>
                        <div className="lb-skelTxt">Cargando...</div>
                      </div>
                    </div>
                  ))
                ) : (
                  pageRows.map((p) => {
                    const rank = Number(p?.global_rank || 0) || 0;
                    const meta = getMeta(p?.uuid);
                    const rangoRaw =
                      meta?.rango || meta?.rango_usuario || meta?.rank || null;
                    const rangoKey = normalizeRango(rangoRaw);

                    const platTxt = p?.platform || "";
                    const platKey = normalizePlatform(platTxt);
                    const platformIcon = PLATFORM_ICON[platKey] || "";

                    const wallet = p?.wallet ?? pickWallet(meta);
                    const walletTxt =
                      wallet == null ? "—" : formatInt(wallet);
                    const tiempoTxt = formatearTiempo(
                      safeNum(p?.tiempo_total)
                    );

                    return (
                      <div
                        key={p?.uuid || p?.nombre_minecraft}
                        className="lb-card"
                        onClick={() => onOpenPerfil(p)}
                        data-rango={rangoKey || ""}
                      >
                        <div className="lb-cardTop">
                          <span className="lb-rankBadge">
                            #{rank || "—"}
                          </span>

                          <div className="lb-player">
                            <div className="lb-skin">
                              <img
                                src={`https://minotar.net/helm/${encodeURIComponent(
                                  p?.nombre_minecraft || "Steve"
                                )}/64`}
                                alt=""
                                loading="lazy"
                              />
                            </div>

                            <div className="lb-nameWrap">
                              <div
                                className={`lb-name ${
                                  rangoKey ? `is-${rangoKey}` : ""
                                }`}
                              >
                                {p?.nombre_minecraft}
                              </div>

                              <div className="lb-meta">
                                {platTxt ? (
                                  <span
                                    className={`lb-platform lb-platform--${platKey}`}
                                    title={platTxt}
                                    aria-label={platTxt}
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
                            <strong>{formatInt(p?.total_points || 0)}</strong>
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
                            <strong>{tiempoTxt}</strong>
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

                            {walletTxt === "—" ? (
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
                                {walletTxt}
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
                    onClick={() => goPage(paginaActual - 1)}
                    disabled={paginaActual <= 1 || isLeaving}
                  >
                    ‹
                  </button>

                  <div className="lb-pageInfo">
                    {paginaActual} / {paginasTotales}
                  </div>

                  <button
                    type="button"
                    onClick={() => goPage(paginaActual + 1)}
                    disabled={paginaActual >= paginasTotales || isLeaving}
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