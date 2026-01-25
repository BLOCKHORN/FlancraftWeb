// src/components/Estadisticas/hooks/useGlobalPodium.js
import { useEffect, useState } from "react";
import { getLeaderboards } from "../api/getLeaderboards";

export function useGlobalPodium() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [top3, setTop3] = useState([]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        setError("");

        const res = await getLeaderboards({
          tipo: "network_points",
          servidor: "",
          limit: 3,
          offset: 0,
          asc: false,
        });

        if (!mounted) return;
        setTop3(Array.isArray(res?.resultados) ? res.resultados : []);
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || "Error cargando el podium global.");
        setTop3([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return { loading, error, top3 };
}
