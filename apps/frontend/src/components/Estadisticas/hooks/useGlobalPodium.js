import { useEffect, useState } from "react";
import { getLeaderboards } from "../api/getLeaderboards";

export function useGlobalPodium() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [top3, setTop3] = useState([]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await getLeaderboards({
          tipo: "svpoints",
          servidor: "survival",
          limit: 3,
          offset: 0,
          asc: false,
          signal: controller.signal,
        });

        if (!active) return;
        setTop3(Array.isArray(res?.resultados) ? res.resultados : []);
      } catch (error) {
        if (!active || error?.name === "AbortError") return;
        setError(error?.message || "Error cargando el podium.");
        setTop3([]);
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
  }, []);

  return { loading, error, top3 };
}