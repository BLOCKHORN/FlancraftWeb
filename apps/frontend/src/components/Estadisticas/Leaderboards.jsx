// src/pages/Leaderboards/Leaderboards.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import "./Leaderboards.scss";

import {
  SERVIDORES,
  SERVIDOR_API_MAP,
  STATS_BY_SERVER,
  DEFAULTS_BY_SERVER,
} from "../../components/Estadisticas/leaderboards.constants";

import {
  isNombreValido,
  safeNum,
  getPlatform,
  getIslandLevel,
  formatearTiempo,
  formatearTiempoParkour,
  formatInt,
} from "../../components/Estadisticas/leaderboards.utils";

import { computeGensScore } from "../../components/Estadisticas/leaderboards.gens";

import useLeaderboardsData from "../../components/Estadisticas/hooks/useLeaderboardsData";
import useUsuariosVinculados from "../../components/Estadisticas/hooks/useUsuariosVinculados";
import { useGlobalPodium } from "../../components/Estadisticas/hooks/useGlobalPodium";

import LeaderboardsHeader from "../../components/Estadisticas/parts/LeaderboardsHeader";
import LeaderboardsPodium from "../../components/Estadisticas/parts/LeaderboardsPodium";
import LeaderboardsServers from "../../components/Estadisticas/parts/LeaderboardsServers";
import LeaderboardsToolbar from "../../components/Estadisticas/parts/LeaderboardsToolbar";
import LeaderboardsTable from "../../components/Estadisticas/parts/LeaderboardsTable";
import LeaderboardsCards from "../../components/Estadisticas/parts/LeaderboardsCards";
import LeaderboardsPagination from "../../components/Estadisticas/parts/LeaderboardsPagination";

export default function Leaderboards() {
  const navigate = useNavigate();

  const [servidor, setServidor] = useState(
    SERVIDORES?.[2]?.id || SERVIDORES?.[0]?.id
  );
  const servidorApi = useMemo(
    () => SERVIDOR_API_MAP[servidor] || servidor,
    [servidor]
  );

  const defaults = useMemo(() => {
    return DEFAULTS_BY_SERVER[servidor] || { orden: "tiempo_jugado", asc: false };
  }, [servidor]);

  const [orden, setOrden] = useState(defaults.orden);
  const [ordenAsc, setOrdenAsc] = useState(defaults.asc);

  const [offset, setOffset] = useState(0);
  const limit = 10;

  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [soloVinculados, setSoloVinculados] = useState(false);
  const [openCard, setOpenCard] = useState(null);

  useEffect(() => {
    setOrden(defaults.orden);
    setOrdenAsc(defaults.asc);
    setOffset(0);
    setOpenCard(null);
    setQuery("");
    setSoloVinculados(false);
    setFiltersOpen(false);
  }, [servidor, defaults]);

  const usuariosVinculados = useUsuariosVinculados();
  const getMeta = useCallback(
    (uuid) => usuariosVinculados?.[uuid] || null,
    [usuariosVinculados]
  );

  const onOpenPerfil = useCallback(
    (player) => {
      if (!player?.nombre_minecraft) return;
      navigate(`/perfil/${player.nombre_minecraft}`);
    },
    [navigate]
  );

  const STATS = useMemo(
    () => STATS_BY_SERVER[servidor] || ["tiempo_jugado"],
    [servidor]
  );

  const getStatNumber = useCallback((p, key) => {
    if (!p) return 0;
    if (key === "genpoints") return safeNum(p?.genpoints) || computeGensScore(p);
    if (key === "svpoints") return safeNum(p?.svpoints);
    if (key === "pkpoints") return safeNum(p?.pkpoints);
    if (key === "obpoints") return safeNum(p?.obpoints);
    if (key === "network_points") return safeNum(p?.network_points);
    if (key === "island_level") return getIslandLevel(p);

    const raw = p?.[key];
    if (raw === null || raw === undefined || raw === "") return 0;
    const n = Number(raw);
    if (!Number.isFinite(n)) return 0;
    return n;
  }, []);

  const ordenApi = useMemo(() => {
    if (servidorApi === "gens") return "tiempo_jugado";
    return orden;
  }, [servidorApi, orden]);

  const { datos, totalRows, loading, errorTabla } = useLeaderboardsData({
    servidorApi,
    orden: ordenApi,
    ordenAsc,
    limit,
    offset,
    getStatNumber,
    query,
    soloVinculados,
    getMeta,
  });

  const { loading: loadingPodium, top3: top3Global } = useGlobalPodium();

  const datosFiltradosBase = useMemo(() => {
    const q = query.trim().toLowerCase();

    return (datos || []).filter((p) => {
      if (!isNombreValido(p?.nombre_minecraft)) return false;

      const nombre = (p?.nombre_minecraft || "").toLowerCase();
      const matchNombre = !q || nombre.includes(q);

      const meta = getMeta(p?.uuid);
      const vinc = !!meta;
      const okVinc = !soloVinculados || vinc;

      return matchNombre && okVinc;
    });
  }, [datos, query, soloVinculados, getMeta]);

  const datosFiltrados = useMemo(() => {
    if (servidorApi !== "gens") return datosFiltradosBase;

    return [...datosFiltradosBase]
      .map((p) => ({ ...p, genpoints: safeNum(p?.genpoints) || computeGensScore(p) }))
      .sort((a, b) => (b.genpoints || 0) - (a.genpoints || 0));
  }, [datosFiltradosBase, servidorApi]);

  const paginasTotales = useMemo(
    () => Math.max(1, Math.ceil((totalRows || 0) / limit)),
    [totalRows, limit]
  );
  const paginaActual = useMemo(() => Math.floor(offset / limit) + 1, [offset, limit]);
  const servidorSeleccionado = useMemo(
    () => SERVIDORES.find((s) => s.id === servidor),
    [servidor]
  );

  const cambiarOrden = useCallback(
    (stat) => {
      if (servidorApi === "gens") return;

      setOrden((prev) => {
        if (prev === stat) {
          setOrdenAsc((v) => !v);
          return prev;
        }
        setOrdenAsc(stat === "mejor_tiempo");
        return stat;
      });

      setOffset(0);
    },
    [servidorApi]
  );

  const { wideCount, mediumCount } = useMemo(() => {
    const WIDE = new Set(["oneblock_blocks_broken"]);
    const MED = new Set(["killstreak_max", "mejor_tiempo"]);
    let w = 0;
    let m = 0;
    for (const s of STATS) {
      if (WIDE.has(s)) w += 1;
      else if (MED.has(s)) m += 1;
    }
    return { wideCount: w, mediumCount: m };
  }, [STATS]);

  const cambiarPagina = useCallback(
    (pageIndex) => setOffset(pageIndex * limit),
    [limit]
  );

  const onSearch = useCallback((q) => {
    setQuery(q);
    setOffset(0);
    setOpenCard(null);
  }, []);

  const formatValueNonGens = useCallback((key, value) => {
    if (value === null || value === undefined) return "—";
    const n = Number(value);
    if (!Number.isFinite(n)) return "—";
    if (key === "svpoints" || key === "obpoints" || key === "pkpoints") {
      return formatInt(Math.round(n));
    }
    return formatInt(n);
  }, []);

  return (
    <section className="lb-page">
      <div className="lb-shell">
        <div className="lb-frame">
          <LeaderboardsHeader
            servidorSeleccionado={servidorSeleccionado}
            servidorApi={servidorApi}
            orden={orden}
            ordenAsc={ordenAsc}
            paginaActual={paginaActual}
            paginasTotales={paginasTotales}
          />

          {!loadingPodium && (
            <LeaderboardsPodium
              top3={top3Global}
              getMeta={getMeta}
              onOpenPerfil={onOpenPerfil}
            />
          )}

          <LeaderboardsServers servidor={servidor} setServidor={setServidor} />

          <LeaderboardsToolbar
            query={query}
            setQuery={setQuery}
            filtersOpen={filtersOpen}
            setFiltersOpen={setFiltersOpen}
            soloVinculados={soloVinculados}
            setSoloVinculados={(v) => {
              setSoloVinculados(v);
              setOffset(0);
              setOpenCard(null);
            }}
            servidorApi={servidorApi}
            orden={orden}
            setOrden={setOrden}
            setOrdenAsc={setOrdenAsc}
            setOffset={setOffset}
            STATS={STATS}
            datosFiltradosLen={datosFiltrados.length}
            totalRows={totalRows}
            limit={limit}
            offset={offset}
            onSearch={onSearch}
          />

          <section className="lb-content">
            <div className="lb-tableCard">
              <LeaderboardsTable
                errorTabla={errorTabla}
                loading={loading}
                limit={limit}
                STATS={STATS}
                wideCount={wideCount}
                mediumCount={mediumCount}
                datosFiltrados={datosFiltrados}
                offset={offset}
                servidorApi={servidorApi}
                orden={orden}
                ordenAsc={ordenAsc}
                cambiarOrden={cambiarOrden}
                getMeta={getMeta}
                getPlatform={getPlatform}
                onOpenPerfil={onOpenPerfil}
                formatearTiempo={formatearTiempo}
                formatearTiempoParkour={formatearTiempoParkour}
                getIslandLevelLocal={getIslandLevel}
              />

              <LeaderboardsCards
                loading={loading}
                datosFiltrados={datosFiltrados}
                offset={offset}
                servidorApi={servidorApi}
                STATS={STATS}
                orden={orden}
                openCard={openCard}
                setOpenCard={setOpenCard}
                getMeta={getMeta}
                getPlatform={getPlatform}
                onOpenPerfil={onOpenPerfil}
                formatearTiempo={formatearTiempo}
                formatearTiempoParkour={formatearTiempoParkour}
                formatValueNonGens={formatValueNonGens}
                getIslandLevelLocal={getIslandLevel}
              />

              <LeaderboardsPagination
                paginasTotales={paginasTotales}
                paginaActual={paginaActual}
                onGo={cambiarPagina}
              />
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
