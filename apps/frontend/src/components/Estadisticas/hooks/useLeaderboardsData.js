import { useEffect, useMemo, useState } from "react";
import { getLeaderboards } from "../api/getLeaderboards";
import { isNombreValido, safeNum } from "../leaderboards.utils";

const SEARCH_FETCH_LIMIT = 700;
const DEFAULT_QUERY = {
  tipo: "svpoints",
  servidor: "survival",
  asc: false,
};

const parseNullableNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const normalizeRows = (rows) => {
  const map = new Map();

  for (const row of Array.isArray(rows) ? rows : []) {
    if (!isNombreValido(row?.nombre_minecraft)) continue;

    const uuid = row?.uuid || null;
    const nombre = row?.nombre_minecraft || "";
    const id = String(uuid || nombre.toLowerCase()).trim();

    if (!id) continue;

    const rankChange24h = parseNullableNumber(
      row?.rank_change_24h ?? row?.rankDelta24h ?? null
    );

    const pointsGain24h = parseNullableNumber(
      row?.points_gain_24h ?? row?.pointsGain24h ?? null
    );

    const hasMovementData =
      rankChange24h !== null ||
      pointsGain24h !== null ||
      row?.is_new_24h !== undefined ||
      row?.isNew24h !== undefined;

    map.set(id, {
      ...row,
      uuid,
      nombre_minecraft: nombre,
      svpoints: safeNum(
        row?.svpoints ??
          row?.points ??
          row?.puntos ??
          row?.puntos_sv ??
          row?.survival_points ??
          0
      ),
      tiempo_jugado: safeNum(row?.tiempo_jugado),
      rank_change_24h: rankChange24h,
      points_gain_24h: pointsGain24h,
      is_new_24h: hasMovementData ? Boolean(row?.is_new_24h ?? row?.isNew24h) : false,
      has_movement_24h: hasMovementData,
    });
  }

  return Array.from(map.values()).sort((a, b) => {
    const diffPoints = (b.svpoints || 0) - (a.svpoints || 0);
    if (diffPoints !== 0) return diffPoints;
    return (b.tiempo_jugado || 0) - (a.tiempo_jugado || 0);
  });
};

export default function useLeaderboardsData({
  limit,
  offset = 0,
  query = "",
  soloVinculados = false,
  getMeta,
}) {
  const [datos, setDatos] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorTabla, setErrorTabla] = useState("");

  const q = useMemo(() => String(query || "").trim().toLowerCase(), [query]);
  const needsFullDataset = Boolean(q || soloVinculados);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setErrorTabla("");

        if (needsFullDataset) {
          const res = await getLeaderboards({
            ...DEFAULT_QUERY,
            limit: SEARCH_FETCH_LIMIT,
            offset: 0,
            signal: controller.signal,
          });

          if (!active) return;

          const normalized = normalizeRows(res?.resultados);
          const filtered = normalized.filter((player) => {
            const name = String(player?.nombre_minecraft || "").toLowerCase();

            if (q && !name.includes(q)) {
              return false;
            }

            if (soloVinculados && !getMeta?.(player?.uuid)) {
              return false;
            }

            return true;
          });

          setTotalRows(filtered.length);
          setDatos(filtered.slice(offset, offset + limit));
          return;
        }

        const res = await getLeaderboards({
          ...DEFAULT_QUERY,
          limit,
          offset,
          signal: controller.signal,
        });

        if (!active) return;

        const normalized = normalizeRows(res?.resultados);

        setDatos(normalized);
        setTotalRows(Number.isFinite(Number(res?.total)) ? Number(res.total) : normalized.length);
      } catch (error) {
        if (!active || error?.name === "AbortError") return;
        setErrorTabla("No se pudo cargar el ranking.");
        setDatos([]);
        setTotalRows(0);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
      controller.abort();
    };
  }, [limit, offset, q, soloVinculados, getMeta, needsFullDataset]);

  return { datos, totalRows, loading, errorTabla, setDatos };
}
