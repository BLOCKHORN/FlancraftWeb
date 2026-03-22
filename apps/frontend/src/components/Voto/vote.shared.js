import { getStoredUser } from "../../lib/auth/storage";

export const HOUR = 60 * 60 * 1000;
export const COOLDOWN_24H = 24 * HOUR;
export const COOLDOWN_15H = 15 * HOUR;

export const EXTERNAL_VOTE_SITES = [
  {
    id: "v1",
    label: "ServidoresDeMinecraft",
    url: "https://servidoresdeminecraft.es/server/vote/wvkYI63n/play.flancraft.com#google_vignette",
    cooldownMs: COOLDOWN_15H,
    kind: "external",
  },
  {
    id: "v2",
    label: "Minecraft-Server",
    url: "https://minecraft-server.net/vote/FlanCraft/",
    cooldownMs: COOLDOWN_24H,
    kind: "external",
  },
  {
    id: "v3",
    label: "MineStatus",
    url: "https://minestatus.net/server/vote/play.flancraft.com",
    cooldownMs: COOLDOWN_24H,
    kind: "external",
  },
  {
    id: "v4",
    label: "Minecraft-MP",
    url: "https://minecraft-mp.com/server/333849/vote/",
    cooldownMs: COOLDOWN_24H,
    kind: "external",
  },
  {
    id: "v5",
    label: "MinecraftServers",
    url: "https://minecraftservers.org/vote/663927",
    cooldownMs: COOLDOWN_24H,
    kind: "external",
  },
];

export const PAGE_VOTE_SITES = [
  {
    id: "web",
    label: "Voto en la web",
    subtitle: "Haz una mini-tarea y suma tu voto",
    cooldownMs: COOLDOWN_24H,
    kind: "web",
  },
  ...EXTERNAL_VOTE_SITES,
];

export function safeJson(str, fallback) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

export function pad2(n) {
  return String(n).padStart(2, "0");
}

export function msToHMS(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}

export function getHostname(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

export function faviconUrlFor(siteUrl) {
  const host = getHostname(siteUrl);
  if (!host) return "";
  return `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(host)}`;
}

export function normalizarRango(r) {
  const s = String(r || "").toLowerCase().trim();
  if (s.includes("nova")) return "nova";
  if (s.includes("alpha")) return "alpha";
  if (s.includes("inmortal")) return "inmortal";
  return "unrank";
}

export function cleanNick(v) {
  return String(v || "")
    .trim()
    .replace(/\s+/g, "")
    .slice(0, 16);
}

export function ensureDeviceId() {
  const key = "vw_device_id";
  let id = window.localStorage.getItem(key);
  if (id) return id;
  id = `d_${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
  window.localStorage.setItem(key, id);
  return id;
}

export function localKey(identityKey, siteId) {
  return `vw_last_click::${identityKey}::${siteId}`;
}

export function getLocalLast(identityKey, siteId) {
  const value = Number(window.localStorage.getItem(localKey(identityKey, siteId)) || 0);
  return Number.isFinite(value) ? value : 0;
}

export function setLocalLast(identityKey, siteId, ms) {
  try {
    window.localStorage.setItem(localKey(identityKey, siteId), String(ms));
  } catch {
    // ignore
  }
}

export function resolveVoteSession() {
  const storedUser = getStoredUser();
  const legacyUser = storedUser || safeJson(window.localStorage.getItem("fc_user") || "null", null);

  const userUuid =
    legacyUser?.uuid ||
    legacyUser?.uuid_jugador ||
    window.localStorage.getItem("uuid") ||
    window.localStorage.getItem("uuid_jugador") ||
    "";

  const userName =
    legacyUser?.username ||
    legacyUser?.uid ||
    legacyUser?.nombre_minecraft ||
    window.localStorage.getItem("username") ||
    window.localStorage.getItem("uid") ||
    "";

  return {
    storedUser: legacyUser,
    userUuid: String(userUuid || "").trim(),
    userName: cleanNick(userName || ""),
  };
}

export function headCandidates({ uuid, name, size = 32 }) {
  const n = encodeURIComponent(String(name || "").trim());
  const u = encodeURIComponent(String(uuid || "").trim());
  const s = Number(size) || 32;

  const arr = [];
  if (u) arr.push(`https://mc-heads.net/head/${u}/${s}`);
  if (n) arr.push(`https://mc-heads.net/head/${n}/${s}`);
  if (u) arr.push(`https://crafthead.net/avatar/${u}?size=${s}&overlay`);
  if (n) arr.push(`https://crafthead.net/avatar/${n}?size=${s}&overlay`);
  arr.push("/assets/skins/default-steve.webp");
  return Array.from(new Set(arr));
}