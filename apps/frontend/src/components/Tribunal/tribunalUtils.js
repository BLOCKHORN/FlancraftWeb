export const POR_PAGINA = 25;

export const parseTimestamp = (t) => {
  if (!t) return null;

  if (typeof t === "string" && !/^\d+$/.test(t.trim())) {
    const d = new Date(t);
    const time = d.getTime();
    return Number.isNaN(time) ? null : time;
  }

  const n = Number(t);
  if (Number.isNaN(n)) return null;

  return n < 1e12 ? n * 1000 : n;
};

export const parseDurationToMs = (raw) => {
  if (!raw) return null;
  const str = String(raw).toLowerCase().trim();

  if (/(perma|perm|permanent|infinite|∞)/.test(str)) return Infinity;

  if (/^\d+$/.test(str)) {
    const secs = Number(str);
    return secs * 1000;
  }

  const regex = /(\d+)\s*([smhd])/g;
  let match;
  let total = 0;
  const unitMs = { s: 1000, m: 60000, h: 3600000, d: 86400000 };

  while ((match = regex.exec(str)) !== null) {
    const val = parseInt(match[1], 10);
    const unit = match[2];
    total += val * unitMs[unit];
  }

  return total > 0 ? total : null;
};

export const obtenerFechaFinMs = (timestamp, raw) => {
  const start = parseTimestamp(timestamp);
  if (!start) return null;
  const ms = parseDurationToMs(raw);
  if (!ms || ms === Infinity) return null;
  return start + ms;
};

export const obtenerFechaFin = (timestamp, raw) => {
  const finMs = obtenerFechaFinMs(timestamp, raw);
  if (!finMs) return null;
  return new Date(finMs).toLocaleString("es-ES");
};

export const formatearDuracion = (raw) => {
  if (!raw) return "Desconocida";
  const ms = parseDurationToMs(raw);
  if (ms === Infinity) return "Permanente";
  if (!ms) return String(raw);

  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);

  const partes = [];
  if (d) partes.push(`${d} ${d === 1 ? "día" : "días"}`);
  if (h) partes.push(`${h} ${h === 1 ? "hora" : "horas"}`);
  if (m) partes.push(`${m} ${m === 1 ? "minuto" : "minutos"}`);
  if (!d && !h && !m && s) partes.push(`${s} ${s === 1 ? "segundo" : "segundos"}`);

  return partes.length ? partes.join(" ") : String(raw);
};

export const esPerma = (s) => {
  const bt = String(s?.bantype || "").toLowerCase();
  if (bt === "perma" || bt === "permanent") return true;
  const ms = parseDurationToMs(s?.duration);
  return ms === Infinity;
};

export const esRevocada = (s) => {
  const e = String(s?.estado || "").toLowerCase();
  return e === "revocado" || e === "revocada" || e === "anulado" || e === "anulada";
};

export const esSancionActiva = (s, nowMs) => {
  if (esRevocada(s)) return false;
  if (esPerma(s)) return true;

  const finMs = obtenerFechaFinMs(s.timestamp, s.duration);
  if (!finMs) return false;
  return finMs > nowMs;
};

export const calcularSituacion = (s, nowMs) => {
  if (esPerma(s)) return "perma";
  if (esSancionActiva(s, nowMs)) return "activa";
  return "finalizada";
};

export const situacionLabel = (codigo) => {
  if (codigo === "perma") return "PERMABAN";
  if (codigo === "activa") return "Activa";
  return "Finalizada";
};

export const tipoSancionLabel = (s) => {
  const bt = String(s?.bantype || "").toLowerCase();
  if (bt === "perma" || bt === "permanent") return "BAN PERMANENTE";
  if (bt === "temp" || bt === "tempban" || bt === "ban") return "BAN TEMPORAL";
  return "JAIL";
};

export const avatarUrl = (name, size) => `https://mc-heads.net/avatar/${name}/${size}`;

export const buildPageItems = (current, total) => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const items = [];
  items.push(1);

  const left = Math.max(2, current - 2);
  const right = Math.min(total - 1, current + 2);

  if (left > 2) items.push("…");
  for (let i = left; i <= right; i++) items.push(i);
  if (right < total - 1) items.push("…");

  items.push(total);
  return items;
};

export const buildStrikesMap = (sanciones) => {
  const map = new Map();
  for (const s of sanciones || []) {
    const name = String(s?.name || "");
    const type = String(s?.type || "");
    if (!name || !type) continue;
    const key = `${name.toLowerCase()}|${type.toLowerCase()}`;
    map.set(key, (map.get(key) || 0) + 1);
  }
  return map;
};

export const getStrikesFromMap = (map, jugador, tipo) => {
  const key = `${String(jugador || "").toLowerCase()}|${String(tipo || "").toLowerCase()}`;
  return map.get(key) || 0;
};