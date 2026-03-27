import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  CheckCircle,
  HourglassMedium,
  WarningCircle,
  XCircle,
  CrownSimple,
  Trophy,
  Medal,
  ClockCounterClockwise,
  Gift,
  Lightning,
} from "phosphor-react";
import Seo from "../SEO/Seo";
import { buildBreadcrumbJsonLd, buildCanonical } from "../../lib/seo/siteSeo";
import { apiUrl } from "../../lib/env";
import {
  EMPTY,
  SANCTIONS_LIMIT,
  AVATAR_BACKS,
  ICONS,
  RANK_ASSETS,
  RANK_STYLES,
  clamp,
  fmtMoney,
  fmtNum,
  fmtTimeHM,
  fmtUpdated,
  makeMetric,
  guessPlatform,
  pickServerPoints,
  sectionIconKey,
  renderMetricValue,
  cleanPlayerName,
  buildSanctionCandidates,
  buildSanctionStrikeMap,
  fetchJSON,
  fetchPlayerSanctions,
  getHeroRecord,
  getSanctionDurationVisible,
  getSanctionEndText,
  getSanctionFeedback,
  getSanctionSituation,
  getSanctionSituationLabel,
  getSanctionsHeadline,
  getSanctionsSubtext,
  getSanctionsTone,
  getSanctionStrike,
  getSanctionSummary,
  isBanAction,
  loadServerBundle,
  loadXpBundle,
  renderToneIcon,
  SkinRender,
  safe,
  normalizeServerData,
  parseSanctionTimestamp,
  shouldShowSanctionEnd,
  toNumClean,
  getProfileRank,
  normalizeRankKey,
  getJobIcon,
  deriveXpStateFromTotal,
} from "./perfilJugador.shared";
import "./_perfiljugador.scss";

export default function PerfilJugador() {
  const { nombre } = useParams();
  const nav = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [loadingServer, setLoadingServer] = useState(false);
  const [loadingXp, setLoadingXp] = useState(false);

  const [error, setError] = useState("");
  const [perfil, setPerfil] = useState(null);
  const [serverData, setServerData] = useState(null);
  const [xpData, setXpData] = useState(null);

  const [sanctions, setSanctions] = useState([]);
  const [sanctionsLoading, setSanctionsLoading] = useState(true);
  const [sanctionsError, setSanctionsError] = useState("");

  const [tab, setTab] = useState("all");
  const [animKey, setAnimKey] = useState(0);

  const abortRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    setLoadingServer(false);
    setLoadingXp(false);
    setError("");
    setPerfil(null);
    setServerData(null);
    setXpData(null);
    setSanctions([]);
    setSanctionsError("");
    setSanctionsLoading(true);
    setTab("all");
    setAnimKey((v) => v + 1);

    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller = new AbortController();
    abortRef.current = controller;
    let active = true;

    const run = async () => {
      try {
        const raw = await fetchJSON(apiUrl(`/api/perfil/${encodeURIComponent(nombre)}`), controller.signal);
        if (!active) return;

        const jugador = raw?.jugador || raw?.player || null;
        const servidores = raw?.servidores || raw?.servers || null;
        const normalizedPerfil = { ...raw, jugador, servidores };

        setPerfil(normalizedPerfil);

        const uuid = jugador?.uuid || raw?.uuid || null;
        const embeddedSurvival = normalizeServerData(servidores?.survival);

        const hasWebAccount = Boolean(
          jugador &&
            (jugador?.rango_usuario !== null ||
              jugador?.rango_staff !== null ||
              jugador?.rango_real !== null ||
              jugador?.rol_admin !== null ||
              jugador?.nivel !== null ||
              jugador?.xp_actual !== null ||
              jugador?.flanpoints !== null ||
              jugador?.es_premium !== null)
        );

        const shouldLoadXp = Boolean(uuid && hasWebAccount);
        const shouldLoadServer = Boolean(uuid && !embeddedSurvival);

        setLoadingXp(shouldLoadXp);
        setLoadingServer(shouldLoadServer);

        const [xpResult, serverResult] = await Promise.allSettled([
          shouldLoadXp ? loadXpBundle(uuid, controller.signal) : Promise.resolve({ xp: null }),
          shouldLoadServer ? loadServerBundle(uuid, controller.signal) : Promise.resolve(embeddedSurvival),
        ]);

        if (!active) return;

        if (xpResult.status === "fulfilled") {
          setXpData(xpResult.value?.xp || null);
        } else {
          setXpData(null);
        }

        if (serverResult.status === "fulfilled") {
          setServerData(serverResult.value || null);
        } else {
          setServerData(null);
          setError(serverResult.reason?.message || "Error cargando Survival");
        }
      } catch (e) {
        if (!active || e?.name === "AbortError") return;
        setError(e?.message || "Error cargando perfil");
      } finally {
        if (!active) return;
        setLoading(false);
        setLoadingXp(false);
        setLoadingServer(false);
      }
    };

    run();

    return () => {
      active = false;
      controller.abort();
    };
  }, [nombre]);

  const jugador = perfil?.jugador || null;

  const hasWebAccount = useMemo(() => {
    if (!jugador || typeof jugador !== "object") return false;
    return Boolean(
      jugador?.rango_usuario !== null ||
        jugador?.rango_staff !== null ||
        jugador?.rango_real !== null ||
        jugador?.rol_admin !== null ||
        jugador?.nivel !== null ||
        jugador?.xp_actual !== null ||
        jugador?.flanpoints !== null ||
        jugador?.es_premium !== null
    );
  }, [jugador]);

  const displayName = jugador?.uid || jugador?.nombre_minecraft || jugador?.nombre || nombre;

  const platformKey = useMemo(() => {
    return guessPlatform(jugador?.plataforma || jugador?.platform, displayName);
  }, [jugador?.plataforma, jugador?.platform, displayName]);

  const plataformaLabel = platformKey === "bedrock" ? "Bedrock" : platformKey === "java" ? "Java" : "";

  const sanctionCandidates = useMemo(
    () =>
      buildSanctionCandidates(
        [nombre, displayName, jugador?.uid, jugador?.nombre_minecraft, jugador?.nombre],
        platformKey
      ),
    [nombre, displayName, jugador?.uid, jugador?.nombre_minecraft, jugador?.nombre, platformKey]
  );

  const sanctionsQueryKey = sanctionCandidates.join("|");

  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        setSanctionsLoading(true);
        setSanctionsError("");

        if (!sanctionCandidates.length) {
          if (!active) return;
          setSanctions([]);
          return;
        }

        const rows = await fetchPlayerSanctions(sanctionCandidates);

        if (!active) return;
        setSanctions(rows || []);
      } catch {
        if (!active) return;
        setSanctions([]);
        setSanctionsError("No se pudo cargar el historial disciplinario.");
      } finally {
        if (!active) return;
        setSanctionsLoading(false);
      }
    };

    run();

    return () => {
      active = false;
    };
  }, [sanctionsQueryKey]);

  const rankRaw = useMemo(() => {
    if (!hasWebAccount) return "";
    return getProfileRank(jugador);
  }, [jugador, hasWebAccount]);

  const rankKey = useMemo(() => normalizeRankKey(rankRaw), [rankRaw]);

  const rankAsset = RANK_ASSETS[rankKey] || null;
  const rankClass = RANK_STYLES[rankKey]?.className || "";
  const heroBgUrl = AVATAR_BACKS[rankKey] || AVATAR_BACKS.unrank;

  const derivedXp = useMemo(() => {
    if (!hasWebAccount) return null;
    const totalXp = toNumClean(jugador?.xp_actual) || 0;
    return deriveXpStateFromTotal(totalXp, xpData?.niveles || []);
  }, [hasWebAccount, jugador?.xp_actual, xpData?.niveles]);

  const webNivel = derivedXp ? derivedXp.nivel : null;
  const displayXpActual = derivedXp ? derivedXp.xpActualNivel : null;
  const xpDelNivelActual = derivedXp ? derivedXp.xpRequeridaNivel : null;
  const xpPct = derivedXp ? derivedXp.porcentaje : 0;
  
  const flanpoints = hasWebAccount ? safe(jugador?.flanpoints) : null;

  const general = serverData?.general || null;
  const combate = serverData?.combate || null;
  const recursos = serverData?.recursos || null;
  const economia = serverData?.economia || null;
  const trabajos = serverData?.trabajos || null;

  const jobsList = useMemo(() => {
    return Array.isArray(trabajos?.lista) ? trabajos.lista : [];
  }, [trabajos]);

  const totals = useMemo(() => {
    const t = perfil?.totales || null;
    return {
      time: safe(t?.tiempo_jugado_total),
      kills: safe(t?.kills_pvp_total),
      pointsTotal: safe(t?.points_total),
    };
  }, [perfil?.totales]);

  const survivalPoints = useMemo(() => {
    const direct = safe(pickServerPoints(serverData));
    if (direct !== null) return direct;
    return safe(totals.pointsTotal);
  }, [serverData, totals.pointsTotal]);

  const dineroActual = useMemo(
    () => safe(economia?.dinero_actual ?? economia?.dinero),
    [economia]
  );

  const dineroTotal = useMemo(
    () => safe(economia?.dinero_ganado_total ?? economia?.dinero_total),
    [economia]
  );

  const coinsActual = useMemo(
    () => safe(economia?.coins_actual ?? economia?.coins),
    [economia]
  );

  const coinsTotal = useMemo(
    () => safe(economia?.coins_ganadas_total ?? economia?.coins_total),
    [economia]
  );

  const quickMetrics = useMemo(() => {
    return [
      makeMetric({
        id: "survival_points",
        label: "Puntos Survival",
        iconKey: "puntos",
        value: survivalPoints !== null ? fmtNum(survivalPoints) : EMPTY,
      }),
      makeMetric({
        id: "flanpoints",
        label: "Flanite",
        iconKey: "flanite",
        value: flanpoints !== null ? `${fmtNum(flanpoints)} FLT` : EMPTY,
      }),
      makeMetric({
        id: "tiempo_total",
        label: "Tiempo jugado",
        iconKey: "tiempo",
        value: totals.time !== null ? fmtTimeHM(totals.time) : EMPTY,
      }),
      makeMetric({
        id: "kills_total",
        label: "Kills PvP",
        iconKey: "kills",
        value: totals.kills !== null ? fmtNum(totals.kills) : EMPTY,
      }),
    ];
  }, [survivalPoints, flanpoints, totals.time, totals.kills]);

  const omitIds = useMemo(() => new Set(quickMetrics.map((m) => m.id)), [quickMetrics]);

  const sections = useMemo(() => {
    const output = [];

    const generalTiles = [];
    const bMin = safe(general?.bloques_minados ?? general?.mined);
    const bCol = safe(general?.bloques_colocados ?? general?.placed);
    const saltos = safe(general?.saltos ?? general?.jumps);
    const caminarKm = safe(general?.walk_km ?? general?.caminar);
    const volarKm = safe(general?.fly_km ?? general?.volar);

    if (bMin !== null && !omitIds.has("bloques_minados")) {
      generalTiles.push(makeMetric({ id: "bloques_minados", label: "Bloques minados", iconKey: "bloques_minados", value: fmtNum(bMin) }));
    }
    if (bCol !== null && !omitIds.has("bloques_colocados")) {
      generalTiles.push(makeMetric({ id: "bloques_colocados", label: "Bloques colocados", iconKey: "bloques_colocados", value: fmtNum(bCol) }));
    }
    if (saltos !== null && !omitIds.has("saltos")) {
      generalTiles.push(makeMetric({ id: "saltos", label: "Saltos", iconKey: "saltos", value: fmtNum(saltos) }));
    }
    if (caminarKm !== null && !omitIds.has("caminar")) {
      generalTiles.push(makeMetric({ id: "caminar", label: "Dist. caminada", iconKey: "caminar", value: `${fmtNum(caminarKm)} km` }));
    }
    if (volarKm !== null && !omitIds.has("volar")) {
      generalTiles.push(makeMetric({ id: "volar", label: "Dist. volada", iconKey: "vuelo", value: `${fmtNum(volarKm)} km` }));
    }
    if (generalTiles.length) output.push({ key: "general", title: "General", tiles: generalTiles });

    const combateTiles = [];
    const mobs = safe(combate?.mobs_matados ?? combate?.mobs);
    const kills = safe(combate?.kills_pvp ?? combate?.kills);
    const muertes = safe(combate?.muertes ?? combate?.deaths);
    const dano = safe(combate?.dano_infligido ?? combate?.damage);

    if (mobs !== null) combateTiles.push(makeMetric({ id: "mobs", label: "Mobs matados", iconKey: "mobs", value: fmtNum(mobs) }));
    if (kills !== null) combateTiles.push(makeMetric({ id: "kills", label: "Kills PvP", iconKey: "kills", value: fmtNum(kills) }));
    if (muertes !== null) combateTiles.push(makeMetric({ id: "muertes", label: "Muertes", iconKey: "muertes", value: fmtNum(muertes) }));
    if (dano !== null) combateTiles.push(makeMetric({ id: "dano", label: "Daño infligido", iconKey: "dmg", value: fmtNum(dano) }));
    if (combateTiles.length) output.push({ key: "combate", title: "Combate", tiles: combateTiles });

    const recursosTiles = [];
    const diam = safe(recursos?.diamantes ?? recursos?.diamond);
    const hierro = safe(recursos?.hierro ?? recursos?.iron);
    const oro = safe(recursos?.oro ?? recursos?.gold);
    const esmer = safe(recursos?.esmeraldas ?? recursos?.emerald);
    const cult = safe(recursos?.cultivos ?? recursos?.crops);
    const pesca = safe(recursos?.pesca ?? recursos?.fish);

    if (diam !== null) recursosTiles.push(makeMetric({ id: "diamantes", label: "Diamantes", iconKey: "diamante", value: fmtNum(diam) }));
    if (hierro !== null) recursosTiles.push(makeMetric({ id: "hierro", label: "Hierro", iconKey: "hierro", value: fmtNum(hierro) }));
    if (oro !== null) recursosTiles.push(makeMetric({ id: "oro", label: "Oro", iconKey: "oro", value: fmtNum(oro) }));
    if (esmer !== null) recursosTiles.push(makeMetric({ id: "esmeraldas", label: "Esmeraldas", iconKey: "esmeralda", value: fmtNum(esmer) }));
    if (cult !== null) recursosTiles.push(makeMetric({ id: "cultivos", label: "Cultivos", iconKey: "cosecha", value: fmtNum(cult) }));
    if (pesca !== null) recursosTiles.push(makeMetric({ id: "pesca", label: "Pesca", iconKey: "pesca", value: fmtNum(pesca) }));
    if (recursosTiles.length) output.push({ key: "recursos", title: "Recursos", tiles: recursosTiles });

    const economiaTiles = [];
    if (dineroTotal !== null || dineroActual !== null) {
      economiaTiles.push(makeMetric({
        id: "dinero_block", label: "Dinero", iconKey: "dinero",
        lines: [
          // LAS VARIABLES HAN SIDO INVERTIDAS AQUÍ PARA QUE TENGAN SENTIDO
          { label: "Disponible", value: dineroTotal !== null ? fmtMoney(dineroTotal) : EMPTY },
          { label: "Total histórico", value: dineroActual !== null ? fmtMoney(dineroActual) : EMPTY },
        ],
      }));
    }
    if (coinsTotal !== null || coinsActual !== null) {
      economiaTiles.push(makeMetric({
        id: "coins_block", label: "Coins", iconKey: "coins",
        lines: [
          // LAS VARIABLES HAN SIDO INVERTIDAS AQUÍ PARA QUE TENGAN SENTIDO
          { label: "Disponibles", value: coinsTotal !== null ? fmtNum(coinsTotal) : EMPTY },
          { label: "Total históricas", value: coinsActual !== null ? fmtNum(coinsActual) : EMPTY },
        ],
      }));
    }
    if (economiaTiles.length) output.push({ key: "economia", title: "Economía", tiles: economiaTiles });

    return output;
  }, [general, combate, recursos, economia, omitIds, dineroActual, dineroTotal, coinsActual, coinsTotal]);

  const shownSections = useMemo(() => {
    if (tab === "all") return sections;
    return sections.filter((s) => s.key === tab);
  }, [tab, sections]);

  const tabs = useMemo(() => {
    const allCount = sections.reduce((acc, section) => acc + (section?.tiles?.length || 0), 0) + (jobsList.length || 0);
    return [
      { key: "all", label: "Todo", icon: "tiempo", count: allCount },
      ...sections.map((s) => ({ key: s.key, label: s.title, icon: sectionIconKey(s.key), count: s?.tiles?.length || 0 })),
      { key: "jobs", label: "Jobs", icon: "trabajos", count: jobsList.length },
    ];
  }, [sections, jobsList]);

  const onPickTab = useCallback((nextTab) => {
    setTab(nextTab);
    setAnimKey((v) => v + 1);
  }, []);

  const updatedRaw = serverData?.updated_at || jugador?.actualizado || jugador?.updated_at || jugador?.ultimo_sync || null;
  const updatedTxt = useMemo(() => fmtUpdated(updatedRaw), [updatedRaw]);

  const sanctionsWithMeta = useMemo(() => sanctions.map((s, __rowIndex) => ({ ...s, __rowIndex })), [sanctions]);
  const sanctionStrikeMap = useMemo(() => buildSanctionStrikeMap(sanctionsWithMeta), [sanctionsWithMeta]);

  const sanctionRows = useMemo(() => {
    return sanctionsWithMeta.map((row) => {
      const strike = getSanctionStrike(sanctionStrikeMap, row.__rowIndex);
      const feedback = getSanctionFeedback(row.type, strike, row);
      const situacion = getSanctionSituation(row, Date.now());
      const isBan = isBanAction(feedback.action, row);
      const durationVisible = getSanctionDurationVisible(row.duration, feedback.action, row);
      const endText = shouldShowSanctionEnd(row.duration, feedback.action, row) ? getSanctionEndText(row.timestamp, row.duration) : null;
      const dateMs = parseSanctionTimestamp(row.timestamp);
      const dateText = dateMs ? new Date(dateMs).toLocaleString("es-ES") : EMPTY;

      return {
        ...row, strike, feedback, situacion, situacionLabel: getSanctionSituationLabel(situacion), isBan,
        resumenEscala: getSanctionSummary(strike, feedback.action, row), durationVisible, endText, dateText,
      };
    });
  }, [sanctionsWithMeta, sanctionStrikeMap]);

  const activeSanction = useMemo(() => sanctionRows.find((row) => row.situacion === "perma" || row.situacion === "activa") || null, [sanctionRows]);
  const latestSanction = sanctionRows[0] || null;
  const hasSanctionHistory = sanctionRows.length > 0;
  const sanctionsTone = getSanctionsTone(activeSanction, hasSanctionHistory);
  const sanctionsHeadline = getSanctionsHeadline(sanctionsTone);
  const sanctionsSubtext = getSanctionsSubtext(sanctionsTone, activeSanction || latestSanction, sanctionRows.length);
  const heroRecord = getHeroRecord(sanctionsTone, hasSanctionHistory);
  const hasBanOverlay = sanctionsTone === "ban";
  const hasFlagOverlay = sanctionsTone === "active";

  const visibleSanctions = useMemo(() => sanctionRows.slice(0, SANCTIONS_LIMIT), [sanctionRows]);
  const showJobsOnly = tab === "jobs";
  const showJobsAlongsideSections = tab === "all" && jobsList.length > 0;
  const shouldRenderJobsBlock = showJobsOnly || showJobsAlongsideSections;

  const rootClass = useMemo(() => ["perfil-epic"].filter(Boolean).join(" "), []);

  return (
    <>
      <Seo
        title={`${displayName} | Perfil de jugador en FlanCraft`}
        description={`Consulta el perfil público de ${displayName} en FlanCraft: nivel, progreso, economía, estadísticas y sanciones.`}
        canonical={buildCanonical(`/perfil/${encodeURIComponent(nombre || displayName || "jugador")}`)}
        jsonLd={buildBreadcrumbJsonLd([
          { name: "Inicio", item: buildCanonical("/") },
          { name: "Perfiles", item: buildCanonical("/leaderboards") },
          { name: displayName, item: buildCanonical(`/perfil/${encodeURIComponent(nombre || displayName || "jugador")}`) },
        ])}
      />

      <div className={rootClass}>
        <div className="perfil-shell">
          <div className="perfil-frame">
            <div className="perfil-wrap">
              <div className="perfil-topbar">
                <div className="perfil-topbarLeft">
                  <div className="perfil-breadcrumb">Perfil público</div>
                </div>

                <div className="perfil-topbarRight">
                  <button
                    className="perfil-btn"
                    onClick={async () => {
                      try { await navigator.clipboard.writeText(window.location.href); } catch {}
                    }}
                    type="button"
                  >
                    Copiar enlace
                  </button>

                  <button className="perfil-btn is-ghost" onClick={() => nav(-1)} type="button">
                    Volver
                  </button>
                </div>
              </div>

              <div
                className={["perfil-hero", rankClass, hasBanOverlay ? "is-banned" : "", hasFlagOverlay ? "is-flagged" : ""]
                  .filter(Boolean).join(" ")}
                style={{ "--hero-bg": `url(${heroBgUrl})` }}
              >
                <div className="perfil-heroBgWrap">
                  <div className="perfil-heroBg" />
                </div>

                <div className="perfil-heroInner">
                  <div 
                    className={`perfil-skinSlot ${hasBanOverlay ? "is-banned" : hasFlagOverlay ? "is-flagged" : ""}`}
                    style={rankAsset ? { "--rank-asset-url": `url(${rankAsset})` } : null}
                  >
                    <SkinRender
                      variant="body"
                      uuid={jugador?.uuid}
                      displayName={displayName}
                      platformKey={platformKey}
                      className="perfil-skinBody"
                    />
                    {hasBanOverlay ? <div className="perfil-banStamp">BAN</div> : null}
                    {hasFlagOverlay ? <div className="perfil-banStamp is-flagged">JAIL</div> : null}
                  </div>

                  <div className="perfil-heroMain">
                    <div className="perfil-nameRow">
                      <div className="perfil-nameTop">
                        <div className="perfil-nameLine">
                          <div className="perfil-name">{displayName}</div>
                          {rankAsset ? (
                            <img className="perfil-rankIconInline" src={rankAsset} alt="" draggable="false" />
                          ) : rankRaw ? (
                            <div className={`perfil-rankTextBadge is-${rankKey || "plain"}`}>
                              {String(rankRaw).toUpperCase()}
                            </div>
                          ) : null}
                        </div>

                        {updatedTxt ? (
                          <div className="perfil-miniMeta is-right">
                            Actualizado: <span>{updatedTxt}</span>
                          </div>
                        ) : null}
                      </div>

                      <div className="perfil-subRow">
                        <div className={`perfil-recordBadge is-${heroRecord.tone}`}>
                          {renderToneIcon(heroRecord.tone, 14)}
                          <span>{heroRecord.label}</span>
                        </div>

                        {plataformaLabel ? (
                          <div className={`perfil-platform ${platformKey === "bedrock" ? "is-bedrock" : "is-java"}`}>
                            {plataformaLabel}
                          </div>
                        ) : null}

                        {loadingXp ? <div className="perfil-miniMeta">Cargando progreso…</div> : null}
                        {!loadingXp && !hasWebAccount ? (
                          <div className="perfil-miniMeta is-warn">No vinculado</div>
                        ) : null}
                      </div>
                    </div>

                    <div className={`perfil-progresoBlock ${hasWebAccount ? "" : "is-disabled"}`}>
                      <div className="perfil-progresoNivel">
                        <span className="perfil-progresoNivelLabel">Nivel</span>
                        <span className="perfil-progresoNivelNum">
                          {hasWebAccount && webNivel !== null ? fmtNum(webNivel) : EMPTY}
                        </span>
                      </div>
                      
                      <div className="perfil-xpBlock">
                        <div className="perfil-xpTop">
                          <div className="perfil-xpTitle">Experiencia</div>
                          <div className="perfil-xpNums">
                            <span>{hasWebAccount && displayXpActual !== null ? fmtNum(displayXpActual) : EMPTY}</span>
                            <span className="perfil-xpSep">/</span>
                            <span>{hasWebAccount && xpDelNivelActual !== null ? fmtNum(xpDelNivelActual) : EMPTY}</span>
                            <span className="perfil-xpUnit">XP</span>
                          </div>
                        </div>

                        <div className="perfil-xpBar" aria-hidden="true">
                          <div className="perfil-xpFill" style={{ width: `${xpPct}%` }} />
                        </div>
                      </div>
                    </div>

                    <div className="perfil-quickRow">
                      {quickMetrics.map((m, idx) => (
                        <div key={m.id} className="perfil-quickCard pf-tileIn" style={{ "--i": idx }} title={m.hint || ""}>
                          {m.icon ? <img className="perfil-quickIcon" src={m.icon} alt="" draggable="false" /> : null}

                          <div className="perfil-quickText">
                            <div className="perfil-quickLabel">{m.label}</div>
                            <div className="perfil-quickValue">{renderMetricValue(m)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="perfil-detail pf-tileIn" style={{ "--i": 4 }}>
                <div className="perfil-detailHead">
                  <div className="perfil-sectionTitle">Detalle · Survival</div>
                  <div className="perfil-detailMeta">
                    {loading ? "Cargando perfil…" : loadingServer ? "Actualizando servidor…" : error ? error : ""}
                  </div>
                </div>

                <div className="pf-tabs" role="tablist" aria-label="Categorías">
                  {tabs.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      className={`pf-tab ${tab === t.key ? "is-active" : ""}`}
                      onClick={() => onPickTab(t.key)}
                      role="tab"
                      aria-selected={tab === t.key}
                    >
                      {t.icon ? <img className="pf-tabIcon" src={ICONS[t.icon]} alt="" draggable="false" /> : null}
                      <span className="pf-tabTxt">{t.label}</span>
                      <span className="pf-tabCount">{t.count}</span>
                    </button>
                  ))}
                </div>

                {loading ? (
                  <div className="perfil-skeletonGrid">
                    {Array.from({ length: 9 }).map((_, i) => (
                      <div key={i} className="perfil-skeletonTile" />
                    ))}
                  </div>
                ) : error && !serverData ? (
                  <div className="perfil-errorBox">
                    <div className="perfil-errorTitle">No se pudo cargar</div>
                    <div className="perfil-errorMsg">{error}</div>
                  </div>
                ) : (
                  <>
                    {shouldRenderJobsBlock ? (
                      <div className="perfil-jobsSection" key={`jobs-${tab}-${animKey}`}>
                        <div className="perfil-sectionHeader">
                          <div className="perfil-sectionTitle2">Jobs</div>
                        </div>

                        {jobsList.length ? (
                          <div className="perfil-jobsGrid">
                            {jobsList.map((job, idx) => {
                              const xp = toNumClean(job?.xp);
                              const xpMax = toNumClean(job?.xp_max);
                              const pct = Number.isFinite(xp) && Number.isFinite(xpMax) && xpMax > 0 ? clamp((xp / xpMax) * 100, 0, 100) : 0;

                              return (
                                <article key={`${job.id || job.nombre}-${idx}`} className="perfil-jobCard pf-tileIn" style={{ "--i": idx }}>
                                  <div className="perfil-jobIconWrap">
                                    <img className="perfil-jobIcon" src={getJobIcon(job?.id)} alt="" draggable="false" />
                                  </div>

                                  <div className="perfil-jobBody">
                                    <div className="perfil-jobTop">
                                      <div className="perfil-jobName">{job?.nombre || "Trabajo"}</div>
                                      <div className="perfil-jobLevel">
                                        Nivel <strong>{fmtNum(job?.nivel)}</strong>
                                      </div>
                                    </div>

                                    {Number.isFinite(xp) && Number.isFinite(xpMax) && xpMax > 0 ? (
                                      <>
                                        <div className="perfil-jobXpMeta">
                                          <span>XP</span>
                                          <span>{fmtNum(xp)} / {fmtNum(xpMax)}</span>
                                        </div>
                                        <div className="perfil-jobXpBar" aria-hidden="true">
                                          <div className="perfil-jobXpFill" style={{ width: `${pct}%` }} />
                                        </div>
                                      </>
                                    ) : (
                                      <div className="perfil-jobXpMeta is-single">
                                        <span>XP acumulada</span>
                                        <span>{Number.isFinite(xp) ? fmtNum(xp) : EMPTY}</span>
                                      </div>
                                    )}
                                  </div>
                                </article>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="perfil-jobsEmpty">
                            <div className="perfil-jobsEmptyTitle">Sin jobs sincronizados</div>
                            <div className="perfil-jobsEmptySub">
                              Este jugador todavía no tiene profesiones registradas en el perfil público.
                            </div>
                          </div>
                        )}
                      </div>
                    ) : null}

                    {tab !== "jobs" ? (
                      <div className="perfil-sections" key={`sec-${tab}-${animKey}`}>
                        {shownSections.map((sec) => (
                          <div key={sec.key} className="perfil-section">
                            <div className="perfil-sectionHeader">
                              <div className="perfil-sectionTitle2">{sec.title}</div>
                            </div>

                            <div className="perfil-tiles">
                              {sec.tiles.map((t, idx) => (
                                <div
                                  key={t.id}
                                  className={`perfil-tile pf-tileIn ${Array.isArray(t.lines) && t.lines.length ? "is-multi" : ""}`}
                                  style={{ "--i": idx }}
                                  title={t.hint || ""}
                                >
                                  <div className="perfil-tileHead">
                                    {t.icon ? <img className="perfil-tileIcon" src={t.icon} alt="" draggable="false" /> : null}
                                    <div className="perfil-tileLabel">{t.label}</div>
                                  </div>
                                  <div className="perfil-tileValue">{renderMetricValue(t)}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </>
                )}
              </div>

              <div className="perfil-sanctionsPanel pf-tileIn" style={{ "--i": 5 }}>
                <div className="perfil-sanctionsHead">
                  <div className="perfil-sectionTitle">Sanciones</div>
                  <div className={`perfil-sanctionsState is-${sanctionsTone}`}>
                    {renderToneIcon(sanctionsTone, 15)}
                    <span>
                      {sanctionsTone === "ban" ? "Baneado" : sanctionsTone === "active" ? "Sanción activa" : sanctionsTone === "history" ? "Historial" : "Limpio"}
                    </span>
                  </div>
                </div>

                {sanctionsLoading ? (
                  <div className="perfil-sanctionsSkeleton">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="perfil-sanctionsSkeletonItem" />
                    ))}
                  </div>
                ) : sanctionsError ? (
                  <div className="perfil-errorBox">
                    <div className="perfil-errorTitle">No se pudo cargar</div>
                    <div className="perfil-errorMsg">{sanctionsError}</div>
                  </div>
                ) : !hasSanctionHistory ? (
                  <div className="perfil-sanctionsEmpty">
                    <div className="perfil-sanctionsEmptyIcon">
                      <CheckCircle size={24} weight="bold" />
                    </div>
                    <div className="perfil-sanctionsEmptyText">
                      <div className="perfil-sanctionsEmptyTitle">Jugador ejemplar</div>
                      <div className="perfil-sanctionsEmptySub">
                        Este jugador mantiene un expediente limpio en Survival. No hay sanciones registradas en el historial público del tribunal.
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className={`perfil-sanctionsHero is-${sanctionsTone}`}>
                      <div className="perfil-sanctionsHeroMain">
                        <div className={`perfil-sanctionsHeroIcon is-${sanctionsTone}`}>
                          {renderToneIcon(sanctionsTone, 22)}
                        </div>

                        <div className="perfil-sanctionsHeroText">
                          <div className="perfil-sanctionsHeroTitle">{sanctionsHeadline}</div>
                          <div className="perfil-sanctionsHeroSub">{sanctionsSubtext}</div>
                        </div>
                      </div>

                      <div className="perfil-sanctionsStats">
                        <div className="perfil-sanctionsStat">
                          <div className="perfil-sanctionsStatLabel">Estado actual</div>
                          <div className="perfil-sanctionsStatValue">
                            {sanctionsTone === "ban" ? "PERMABAN" : sanctionsTone === "active" ? "ACTIVA" : sanctionsTone === "history" ? "ARCHIVADO" : "LIMPIO"}
                          </div>
                        </div>
                        <div className="perfil-sanctionsStat">
                          <div className="perfil-sanctionsStatLabel">Historial</div>
                          <div className="perfil-sanctionsStatValue">{fmtNum(sanctionRows.length)}</div>
                        </div>
                        <div className="perfil-sanctionsStat">
                          <div className="perfil-sanctionsStatLabel">Último motivo</div>
                          <div className="perfil-sanctionsStatValue is-small">{latestSanction?.type || EMPTY}</div>
                        </div>
                        <div className="perfil-sanctionsStat">
                          <div className="perfil-sanctionsStatLabel">Última fecha</div>
                          <div className="perfil-sanctionsStatValue is-small">{latestSanction?.dateText || EMPTY}</div>
                        </div>
                      </div>
                    </div>

                    <div className="perfil-sanctionsList">
                      {visibleSanctions.map((row) => (
                        <div key={`${row.name}-${row.timestamp}-${row.type}-${row.moderator}`} className={`perfil-sanctionRow is-${row.situacion}`}>
                          <div className="perfil-sanctionMain">
                            <div className="perfil-sanctionReason">{row.type || "Sanción"}</div>

                            <div className="perfil-sanctionMeta">
                              {row.resumenEscala ? (
                                <span className={`perfil-sanctionScale ${row.feedback.isPermaban ? "is-permaban" : ""}`}>
                                  <WarningCircle size={13} weight="duotone" />
                                  <strong>{row.resumenEscala}</strong>
                                </span>
                              ) : null}

                              {row.moderator ? <span className="perfil-sanctionModerator">Moderador: {row.moderator}</span> : null}
                            </div>
                          </div>

                          <div className="perfil-sanctionCell">
                            <div className="perfil-sanctionCellLabel">Duración</div>
                            <div className="perfil-sanctionCellValue">{row.durationVisible}</div>
                            {row.endText ? <div className="perfil-sanctionCellSub">Finaliza: {row.endText}</div> : null}
                          </div>

                          <div className="perfil-sanctionCell">
                            <div className="perfil-sanctionCellLabel">Fecha</div>
                            <div className="perfil-sanctionCellValue">{row.dateText}</div>
                          </div>

                          <div className="perfil-sanctionStateWrap">
                            <span className={`perfil-sanctionBadge is-${row.situacion}`}>
                              {row.situacion === "perma" && <XCircle size={14} weight="bold" />}
                              {row.situacion === "activa" && <HourglassMedium size={14} weight="bold" />}
                              {row.situacion === "finalizada" && <CheckCircle size={14} weight="bold" />}
                              <span>{row.situacionLabel}</span>
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {sanctionRows.length > visibleSanctions.length ? (
                      <div className="perfil-sanctionsFoot">
                        Mostrando las últimas <strong>{fmtNum(visibleSanctions.length)}</strong> de{" "}
                        <strong>{fmtNum(sanctionRows.length)}</strong> sanciones registradas.
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}