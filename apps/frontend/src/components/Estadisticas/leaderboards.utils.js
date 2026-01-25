// src/components/Estadisticas/leaderboards.utils.js
export const cn = (...args) =>
  args
    .flatMap((a) => {
      if (!a) return [];
      if (typeof a === "string") return [a];
      if (typeof a === "object") return Object.keys(a).filter((k) => !!a[k]);
      return [];
    })
    .join(" ");

export const isNombreValido = (nombre) => {
  const n = (nombre || "").trim();
  if (!n) return false;
  const low = n.toLowerCase();
  if (low === "desconocido" || low === "unknown") return false;
  return true;
};

export function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function log10p1(v) {
  return Math.log10(1 + Math.max(0, safeNum(v)));
}

export function sqrtp(v) {
  return Math.sqrt(Math.max(0, safeNum(v)));
}

export function formatMoney(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  return `${x.toLocaleString("es-ES")} $`;
}

export function formatInt(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  return x.toLocaleString("es-ES");
}

export function formatearTiempo(seconds) {
  const totalSegundos = Math.floor(Number(seconds || 0));
  const horas = Math.floor(totalSegundos / 3600);
  const minutos = Math.floor((totalSegundos % 3600) / 60);
  return `${horas}h ${minutos}m`;
}

export function formatearTiempoParkour(v) {
  const n = Number(v || 0);
  if (!Number.isFinite(n) || n <= 0) return "—";
  const isMs = n > 1000;
  const totalMs = isMs ? Math.floor(n) : Math.floor(n * 1000);

  const min = Math.floor(totalMs / 60000);
  const sec = Math.floor((totalMs % 60000) / 1000);
  const ms = totalMs % 1000;

  const mm = String(min).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  const mss = String(ms).padStart(3, "0");
  return `${mm}:${ss}.${mss}`;
}

export function getPlatform(p) {
  const pl = (p?.plataforma || "").toString().toLowerCase();
  if (pl === "bedrock") return "bedrock";
  if (pl === "java") return "java";
  return null;
}

export function getIslandLevel(p) {
  const isl = Number(p?.island_level || 0);
  const ph = Number(p?.phase_actual || 0);
  const v = Math.max(isl, ph);
  return Number.isFinite(v) ? v : 0;
}
