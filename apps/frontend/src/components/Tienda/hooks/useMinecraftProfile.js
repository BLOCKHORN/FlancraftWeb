import { useEffect, useMemo, useState } from "react";
import { apiUrl } from "../../../lib/env";

const memCache = new Map();
const TTL = 1000 * 60 * 30;

function buildUrls({ uuid, name }) {
  const safeUuid = (uuid || "").trim();
  const safeName = (name || "").trim();

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
    ...buildUrls({})
  });

  useEffect(() => {
    const name = String(username || "").trim();

    if (!name) {
      setState({ loading: false, error: null, uuid: "", name: "", ...buildUrls({}) });
      return;
    }

    const hit = memCache.get(key);
    if (hit && hit.exp > Date.now()) {
      setState({ loading: false, error: null, uuid: hit.uuid, name: hit.name, ...buildUrls(hit) });
      return;
    }

    const ac = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));

    (async () => {
      try {
        const r = await fetch(apiUrl(`/api/minecraft/uuid/${encodeURIComponent(name)}`), {
          signal: ac.signal,
          headers: { Accept: "application/json" },
        });

        if (!r.ok) throw new Error("No encontrado");

        const data = await r.json();
        const uuid = String(data?.uuid || "").trim();
        const resolvedName = String(data?.name || name).trim();

        if (!uuid) throw new Error("Sin UUID");

        memCache.set(key, { uuid, name: resolvedName, exp: Date.now() + TTL });

        setState({
          loading: false,
          error: null,
          uuid,
          name: resolvedName,
          ...buildUrls({ uuid, name: resolvedName }),
        });
      } catch (e) {
        if (ac.signal.aborted) return;
        setState({
          loading: false,
          error: e.message,
          uuid: "",
          name,
          ...buildUrls({ name }),
        });
      }
    })();

    return () => ac.abort();
  }, [key, username]);

  return state;
}