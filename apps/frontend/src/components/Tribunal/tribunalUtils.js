export const POR_PAGINA = 25;

export const REGLAS_SANCION = {
  hacks: ["Jail 12h", "Jail 5d", "Ban"],
  insultos: ["Jail 30m", "Jail 5h", "Ban"],
  tpakill: ["Jail 6h", "Jail 5d", "Ban"],
  grif: ["Jail 2h", "Jail 8h", "Jail 5d"],
  spam: ["Jail 1d", "Jail 10d", "Ban"],
  flood: ["Aviso", "Jail 15m", "Jail 2h"],
  multicuenta: ["Aviso", "Jail 12h", "Ban"],
};

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
  if (bt === "ban" || bt === "perma" || bt === "permanent") return true;
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

export const normalizarMotivo = (value) => {
  const raw = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "");

  if (raw === "grief") return "grif";
  if (raw === "fly") return "hacks";
  return raw;
};

export const buildStrikeTimelineMap = (sanciones) => {
  const counters = new Map();
  const rowMap = new Map();

  const ordered = [...(sanciones || [])].sort((a, b) => {
    const ta = parseTimestamp(a?.timestamp) || 0;
    const tb = parseTimestamp(b?.timestamp) || 0;
    if (ta !== tb) return ta - tb;
    return (a?.__rowIndex || 0) - (b?.__rowIndex || 0);
  });

  for (const s of ordered) {
    const player = String(s?.name || "").trim().toLowerCase();
    const motive = normalizarMotivo(s?.type);

    if (!player || !motive) continue;

    const key = `${player}|${motive}`;
    const strike = (counters.get(key) || 0) + 1;

    counters.set(key, strike);
    rowMap.set(s.__rowIndex, strike);
  }

  return rowMap;
};

export const getStrikeFromMap = (map, rowIndex) => map.get(rowIndex) || 0;

export const getStrikeFeedback = (motivo, strike, sancion) => {
  const reglas = REGLAS_SANCION[normalizarMotivo(motivo)];

  if (reglas?.length && strike > 0) {
    const index = Math.min(strike, reglas.length) - 1;
    const accion = reglas[index];
    return {
      accion,
      esPermaban: /^ban\b/i.test(accion),
    };
  }

  if (esPerma(sancion)) {
    return {
      accion: "Ban",
      esPermaban: true,
    };
  }

  return {
    accion: null,
    esPermaban: false,
  };
};

export const getResumenEscala = (strike, accion) => {
  const partes = [];

  if (strike > 0) partes.push(`${strike}ª vez`);

  const a = String(accion || "").trim().toLowerCase();

  if (a === "aviso") partes.push("Aviso");
  if (/^jail\b/.test(a)) partes.push(accion);
  if (/^ban\b/.test(a)) partes.push(accion);

  return partes.join(" · ");
};

export const getDuracionVisible = (raw, accion, sancion) => {
  const a = String(accion || "").trim().toLowerCase();

  if (a === "aviso") return "Sin duración";
  if (esPerma(sancion)) return "Sin caducidad";

  return formatearDuracion(raw);
};

export const debeMostrarFechaFin = (raw, accion, sancion) => {
  const a = String(accion || "").trim().toLowerCase();

  if (a === "aviso") return false;
  if (esPerma(sancion)) return false;

  return !!obtenerFechaFinMs(sancion?.timestamp, raw);
};
