import { useEffect, useState } from "react";
import { apiUrl } from "../../../lib/env";

const normalizeRank = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw || raw === "null" || raw === "none" || raw === "usuario") return null;
  return raw;
};

export default function useUsuariosVinculados() {
  const [usuariosVinculados, setUsuariosVinculados] = useState({});

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch(apiUrl(`/api/usuarios`), { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const usuarios = await res.json();

        const mapa = (Array.isArray(usuarios) ? usuarios : []).reduce((acc, u) => {
          if (!u?.uuid) return acc;

          const rango_usuario = normalizeRank(u.rango_usuario);
          const rango_staff = normalizeRank(u.rango_staff);
          const rol_admin = normalizeRank(u.rol_admin);
          const rango_real =
            normalizeRank(u.rango_real) ||
            rol_admin ||
            rango_staff ||
            rango_usuario ||
            null;

          acc[u.uuid] = {
            uuid: u.uuid,
            uid: u.uid || null,
            rango: rango_real,
            rango_real,
            rango_usuario,
            rango_staff,
            rol_admin,
            es_premium: u.es_premium === true,
            wallet_coins: Number.isFinite(Number(u.wallet_coins)) ? Number(u.wallet_coins) : null,
            nivel: Number.isFinite(Number(u.nivel)) ? Number(u.nivel) : null,
            xp_actual: Number.isFinite(Number(u.xp_actual)) ? Number(u.xp_actual) : null,
          };

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