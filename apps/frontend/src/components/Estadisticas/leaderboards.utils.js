const intFormatter = new Intl.NumberFormat("es-ES", {
  maximumFractionDigits: 0,
});

const moneyFormatter = new Intl.NumberFormat("es-ES", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const normalizeText = (value) => String(value ?? "").trim();
const normalizeLower = (value) => normalizeText(value).toLowerCase();

export const cn = (...args) => {
  const out = [];

  const pushValue = (value) => {
    if (!value) return;

    if (typeof value === "string") {
      if (value) out.push(value);
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(pushValue);
      return;
    }

    if (typeof value === "object") {
      Object.keys(value).forEach((key) => {
        if (value[key]) out.push(key);
      });
    }
  };

  args.forEach(pushValue);
  return out.join(" ");
};

export const isNombreValido = (nombre) => {
  const low = normalizeLower(nombre);
  return !!low && low !== "desconocido" && low !== "unknown";
};

export const safeNum = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

export const log10p1 = (value) => Math.log10(1 + Math.max(0, safeNum(value)));

export const sqrtp = (value) => Math.sqrt(Math.max(0, safeNum(value)));

export const formatMoney = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return "—";
  return `${moneyFormatter.format(num)} $`;
};

export const formatInt = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return "—";
  return intFormatter.format(Math.trunc(num));
};

export const formatearTiempo = (seconds) => {
  const totalSegundos = Math.max(0, Math.floor(safeNum(seconds)));
  const horas = Math.floor(totalSegundos / 3600);
  const minutos = Math.floor((totalSegundos % 3600) / 60);
  return `${horas}h ${minutos}m`;
};

export const formatearTiempoParkour = (value) => {
  const num = safeNum(value);
  if (num <= 0) return "—";

  const totalMs = num > 1000 ? Math.floor(num) : Math.floor(num * 1000);
  const min = Math.floor(totalMs / 60000);
  const sec = Math.floor((totalMs % 60000) / 1000);
  const ms = totalMs % 1000;

  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
};

export const getPlatform = (player) => {
  const raw = normalizeLower(player?.plataforma || player?.platform);
  if (raw.includes("bedrock")) return "bedrock";
  if (raw.includes("java")) return "java";
  return null;
};

export const getIslandLevel = (player) => {
  const islandLevel = safeNum(player?.island_level);
  const phaseActual = safeNum(player?.phase_actual);
  return Math.max(islandLevel, phaseActual);
};