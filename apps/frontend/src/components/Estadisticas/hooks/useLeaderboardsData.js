// src/components/Estadisticas/hooks/useLeaderboardsData.js
import { useEffect, useMemo, useState } from "react";
import { getLeaderboards } from "../api/getLeaderboards";
import { isNombreValido, safeNum } from "../leaderboards.utils";
import { computeGensScore } from "../leaderboards.gens";

const SEARCH_MIN_CHARS = 2;
const SEARCH_FETCH_LIMIT = 700;

export default function useLeaderboardsData({
  servidorApi,
  orden,
  ordenAsc,
  limit,
  offset,
  getStatNumber,

  // opcionales (si no los pasas, no rompe nada)
  query = "",
  soloVinculados = false,
  getMeta,
}) {
  const [datos, setDatos] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorTabla, setErrorTabla] = useState("");

  const q = useMemo(() => (query || "").trim().toLowerCase(), [query]);
  const searchMode = q.length >= SEARCH_MIN_CHARS;

  useEffect(() => {
    let alive = true;

    setLoading(true);
    setErrorTabla("");

    (async () => {
      try {
        // ============================================================
        // ✅ GENS: traemos dataset amplio y ordenamos por genpoints en frontend
        // - En búsqueda: filtramos sobre dataset amplio y luego paginamos local
        // ============================================================
        if (servidorApi === "gens") {
          const res = await getLeaderboards({
            tipo: "dinero_ganado_total",
            servidor: servidorApi,
            limit: SEARCH_FETCH_LIMIT,
            offset: 0,
          });
          if (!alive) return;

          const base = (res?.resultados || [])
            .filter((p) => isNombreValido(p?.nombre_minecraft))
            .map((p) => ({
              ...p,
              genpoints: safeNum(p?.genpoints) || computeGensScore(p),
            }))
            .sort((a, b) => (b.genpoints || 0) - (a.genpoints || 0));

          const filtered = searchMode || soloVinculados
            ? base.filter((p) => {
                const name = (p?.nombre_minecraft || "").toLowerCase();
                if (searchMode && !name.includes(q)) return false;
                if (soloVinculados) return !!getMeta?.(p?.uuid);
                return true;
              })
            : base;

          setTotalRows(filtered.length);
          setDatos(filtered.slice(offset, offset + limit));
          return;
        }

        // ============================================================
        // Resto de servidores:
        // - Sin búsqueda: paginación normal (backend)
        // - Con búsqueda: traemos dataset amplio, filtramos y paginamos local
        // ============================================================
        if (searchMode || soloVinculados) {
          const res = await getLeaderboards({
            tipo: orden,
            servidor: servidorApi,
            limit: SEARCH_FETCH_LIMIT,
            offset: 0,
          });
          if (!alive) return;

          const lista = (res?.resultados || []).filter((p) =>
            isNombreValido(p?.nombre_minecraft)
          );

          const ordenada = ordenAsc
            ? [...lista].sort(
                (a, b) => getStatNumber(a, orden) - getStatNumber(b, orden)
              )
            : [...lista].sort(
                (a, b) => getStatNumber(b, orden) - getStatNumber(a, orden)
              );

          const filtered = ordenada.filter((p) => {
            const name = (p?.nombre_minecraft || "").toLowerCase();
            if (searchMode && !name.includes(q)) return false;
            if (soloVinculados) return !!getMeta?.(p?.uuid);
            return true;
          });

          setTotalRows(filtered.length);
          setDatos(filtered.slice(offset, offset + limit));
          return;
        }

        // normal (backend pagina)
        const res = await getLeaderboards({
          tipo: orden,
          servidor: servidorApi,
          limit,
          offset,
        });
        if (!alive) return;

        const lista = (res?.resultados || []).filter((p) =>
          isNombreValido(p?.nombre_minecraft)
        );

        setTotalRows(res?.total || 0);

        const ordenada = ordenAsc
          ? [...lista].sort(
              (a, b) => getStatNumber(a, orden) - getStatNumber(b, orden)
            )
          : [...lista].sort(
              (a, b) => getStatNumber(b, orden) - getStatNumber(a, orden)
            );

        setDatos(ordenada);
      } catch (err) {
        if (!alive) return;
        console.error(err);
        setErrorTabla("No se pudo cargar el ranking.");
        setDatos([]);
        setTotalRows(0);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [
    orden,
    ordenAsc,
    servidorApi,
    offset,
    limit,
    getStatNumber,
    q,
    searchMode,
    soloVinculados,
    getMeta,
  ]);

  return { datos, totalRows, loading, errorTabla, setDatos };
}
