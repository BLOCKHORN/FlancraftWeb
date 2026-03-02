import { useEffect, useMemo, useState } from "react";
import { getLeaderboards } from "../api/getLeaderboards";
import { isNombreValido, safeNum } from "../leaderboards.utils";

const SEARCH_MIN_CHARS = 2;
const SEARCH_FETCH_LIMIT = 700;

export default function useLeaderboardsData({
  limit,
  offset,
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
        if (searchMode || soloVinculados) {
          const res = await getLeaderboards({
            tipo: "svpoints",
            servidor: "survival",
            limit: SEARCH_FETCH_LIMIT,
            offset: 0,
            asc: false,
          });
          if (!alive) return;

          const base = (res?.resultados || [])
            .filter((p) => isNombreValido(p?.nombre_minecraft))
            .map((p) => ({
              ...p,
              svpoints: safeNum(p?.svpoints),
            }))
            .sort((a, b) => (b.svpoints || 0) - (a.svpoints || 0));

          const filtered = base.filter((p) => {
            const name = (p?.nombre_minecraft || "").toLowerCase();
            if (searchMode && !name.includes(q)) return false;
            if (soloVinculados) return !!getMeta?.(p?.uuid);
            return true;
          });

          setTotalRows(filtered.length);
          setDatos(filtered.slice(offset, offset + limit));
          return;
        }

        const res = await getLeaderboards({
          tipo: "svpoints",
          servidor: "survival",
          limit,
          offset,
          asc: false,
        });
        if (!alive) return;

        const lista = (res?.resultados || [])
          .filter((p) => isNombreValido(p?.nombre_minecraft))
          .map((p) => ({
            ...p,
            svpoints: safeNum(p?.svpoints),
          }))
          .sort((a, b) => (b.svpoints || 0) - (a.svpoints || 0));

        setDatos(lista);
        setTotalRows(res?.total || 0);
      } catch {
        if (!alive) return;
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
  }, [limit, offset, q, searchMode, soloVinculados, getMeta]);

  return { datos, totalRows, loading, errorTabla, setDatos };
}