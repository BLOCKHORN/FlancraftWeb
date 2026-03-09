import { useEffect, useState } from "react";
import { apiUrl } from "../../../lib/env";

export default function useUsuariosVinculados() {
  const [usuariosVinculados, setUsuariosVinculados] = useState({});

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch(apiUrl(`/api/usuarios`), { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const usuarios = await res.json();

        const mapa = (usuarios || []).reduce((acc, u) => {
          if (u?.uuid) acc[u.uuid] = { rango: u.rango_usuario?.toLowerCase() || null };
          return acc;
        }, {});

        setUsuariosVinculados(mapa);
      } catch (err) {
        if (err?.name === "AbortError") return;
        console.error("Error usuarios:", err);
      }
    })();

    return () => controller.abort();
  }, []);

  return usuariosVinculados;
}
