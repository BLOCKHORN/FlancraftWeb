import { apiGet } from "../api/client";
import {
  clearSessionStorage,
  getAuthToken,
  getStoredUser,
  persistSession,
} from "./storage";

const normalizeRole = (value) => {
  if (value === null || value === undefined) return null;
  const role = String(value).trim().toLowerCase().replace(/[\s_-]+/g, "");
  return role || null;
};

const normalizeUserRank = (value) => {
  if (value === null || value === undefined) return null;
  const rank = String(value).trim().toLowerCase().replace(/[\s_-]+/g, "");
  return rank || null;
};

export function buildUserSession(payload = {}) {
  const uid =
    payload.uid ||
    payload.username ||
    payload.nombre_minecraft ||
    payload.nick ||
    payload.name ||
    null;

  const rango_staff = normalizeRole(payload.rango_staff || payload.rol_admin);
  const rol_admin = normalizeRole(payload.rol_admin || payload.rango_staff);
  const rango_usuario = normalizeUserRank(payload.rango_usuario);
  const rango_real = normalizeRole(payload.rango_real) || rango_staff || rango_usuario || "usuario";

  const nivel = Number(payload.userLevel ?? payload.nivel ?? 1) || 1;
  const xpActual = Number(payload.userXP ?? payload.xp_actual ?? 0) || 0;
  const xpMax = Number(
    payload.userXPMax ?? payload.xp_total_maxima ?? payload.experiencia_max ?? 100
  ) || 100;
  const walletCoins = Number(payload.ecos ?? payload.wallet_coins ?? 0) || 0;

  return {
    uuid: payload.uuid || null,
    uid,
    username: uid,
    loggedIn: Boolean(payload.loggedIn ?? payload.uuid),
    rol_admin,
    rango_staff,
    rango_usuario,
    rango_real,
    userLevel: nivel,
    nivel,
    userXP: xpActual,
    xp_actual: xpActual,
    userXPMax: xpMax,
    xp_total_maxima: xpMax,
    ecos: walletCoins,
    wallet_coins: walletCoins,
    es_premium: payload.es_premium === true,
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