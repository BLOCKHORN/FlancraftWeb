import { apiGet } from "../api/client";
import { clearSessionStorage, getAuthToken, getStoredUser, persistSession } from "./storage";

export function buildUserSession(payload = {}) {
  return {
    uuid: payload.uuid || null,
    username:
      payload.username || payload.uid || payload.nombre_minecraft || payload.nick || payload.name || null,
    loggedIn: Boolean(payload.uuid),
    rol_admin: payload.rol_admin || null,
    rango_usuario: payload.rango_usuario || null,
    userLevel: payload.userLevel ?? payload.nivel ?? 1,
    userXP: payload.userXP ?? payload.xp_actual ?? 0,
    userXPMax: payload.userXPMax ?? payload.xp_total_maxima ?? payload.experiencia_max ?? 100,
    ecos: payload.ecos ?? payload.wallet_coins ?? 0,
  };
}

export async function hydrateSessionFromBackend() {
  const token = getAuthToken();
  const stored = getStoredUser();

  if (!token || !stored?.uuid) {
    return stored?.loggedIn ? stored : { loggedIn: false };
  }

  try {
    const me = await apiGet("/api/vincular/me", { token });
    const nextUser = buildUserSession({ ...stored, ...me, loggedIn: true });
    persistSession(nextUser, token);
    return nextUser;
  } catch {
    clearSessionStorage();
    return { loggedIn: false };
  }
}
