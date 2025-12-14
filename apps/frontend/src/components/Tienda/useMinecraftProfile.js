useMinecraftProfile.js// apps/frontend/src/components/Tienda/useMinecraftProfile.js
import { useEffect, useMemo, useState } from "react";

const API_BASE = import.meta.env.VITE_BACKEND_URL || "http://localhost:10000";

// cache cliente (extra; el backend ya cachea 12h)
const memCache = new Map(); // key -> { uuid, name, exp }
const TTL = 1000 * 60 * 30; // 30 min

function buildUrls({ uuid, name }) {
  const safeUuid = (uuid || "").trim();
  const safeName = (name || "").trim();

  // Si hay UUID, mejor. Si no, fallback por name.
  const headUrl = safeUuid
    ? `https://crafthead.net/avatar/${safeUuid}?size=64&overlay`
    : safeName
    ? `https://crafthead.net/avatar/${encodeURIComponent(safeName)}?size=64&overlay`
    : `https://crafthead.net/avatar/Steve?size=64&overlay`;

  const bodyUrl = safeUuid
    ? `https://crafthead.net/body/${safeUuid}?size=128&overlay`
    : safeName
    ? `https://crafthead.net/body/${encodeURIComponent(safeName)}?size=128&overlay`
    : `https://crafthead.net/body/Steve?size=128&overlay`;

  return { headUrl, bodyUrl };
}

export default function useMinecraftProfile(username) {
  const key = useMemo(() => String(username || "").trim().toLowerCase(), [username]);

  const [state, setState] = useState({
    loading: false,
    error: null,
    uuid: "",
    name: "",
    headUrl: buildUrls({}).headUrl,
    bodyUrl: buildUrls({}).bodyUrl,
  });

  useEffect(() => {
    const name = String(username || "").trim();

    // Invitado / vacío
    if (!name) {
      const urls = buildUrls({});
      setState({
        loading: false,
        error: null,
        uuid: "",
        name: "",
        headUrl: urls.headUrl,
        bodyUrl: urls.bodyUrl,
      });
      return;
    }

    const now = Date.now();
    const hit = memCache.get(key);
    if (hit && hit.exp > now) {
      const urls = buildUrls({ uuid: hit.uuid, name: hit.name });
      setState({
        loading: false,
        error: null,
        uuid: hit.uuid,
        name: hit.name,
        headUrl: urls.headUrl,
        bodyUrl: urls.bodyUrl,
      });
      return;
    }

    const ac = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));

    (async () => {
      try {
        const r = await fetch(
          `${API_BASE}/api/minecraft/uuid/${encodeURIComponent(name)}`,
          {
            method: "GET",
            signal: ac.signal,
            headers: { Accept: "application/json" },
          }
        );

        if (!r.ok) {
          const data = await r.json().catch(() => ({}));
          throw new Error(data?.error || "No se pudo obtener el perfil.");
        }

        const data = await r.json().catch(() => ({}));
        const uuid = String(data?.uuid || "").trim();
        const resolvedName = String(data?.name || name).trim();

        if (!uuid) throw new Error("Respuesta inválida del backend.");

        memCache.set(key, { uuid, name: resolvedName, exp: now + TTL });

        const urls = buildUrls({ uuid, name: resolvedName });
        setState({
          loading: false,
          error: null,
          uuid,
          name: resolvedName,
          headUrl: urls.headUrl,
          bodyUrl: urls.bodyUrl,
        });
      } catch (e) {
        if (ac.signal.aborted) return;
        const urls = buildUrls({ name });
        setState({
          loading: false,
          error: e?.message || "Error al obtener el perfil.",
          uuid: "",
          name,
          headUrl: urls.headUrl,
          bodyUrl: urls.bodyUrl,
        });
      }
    })();

    return () => ac.abort();
  }, [key, username]);

  return state;
}
