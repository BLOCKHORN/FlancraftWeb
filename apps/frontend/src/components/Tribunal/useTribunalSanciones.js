import { useEffect, useState } from "react";
import { apiUrl } from "../../lib/env";

export default function useTribunalSanciones() {
  const [sanciones, setSanciones] = useState([]);
  const [estadisticas, setEstadisticas] = useState({ total: 0, jugadoresPerma: 0, sancionesActivas: 0 });
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let cancel = false;

    (async () => {
      try {
        setLoading(true);
        setErrorMsg("");

        const statsRes = await fetch(apiUrl("/api/sanciones/estadisticas"));
        let statsData = { total: 0, jugadoresPerma: 0, sancionesActivas: 0 };
        if (statsRes.ok) {
          const statsJson = await statsRes.json();
          statsData = statsJson.data || statsData;
        }

        const dataRes = await fetch(apiUrl("/api/sanciones?limit=2000&server=survival"));
        if (!dataRes.ok) {
           throw new Error("Error de red");
        }

        const dataJson = await dataRes.json();

        if (!cancel) {
          setEstadisticas(statsData);
          setSanciones(dataJson.data || []);
        }
      } catch (e) {
        if (!cancel) setErrorMsg("No se pudo cargar el historial de sanciones.");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();

    return () => {
      cancel = true;
    };
  }, []);

  return { sanciones, estadisticas, loading, errorMsg };
}