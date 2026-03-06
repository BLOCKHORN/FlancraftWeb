export const SERVIDOR_ID = "survival";
export const SERVIDOR_API = "survival";

export const SERVIDOR_API_MAP = {
  [SERVIDOR_ID]: SERVIDOR_API,
};

export const SERVIDORES = [
  {
    id: SERVIDOR_ID,
    nombre: "Survival",
    imagen: "/assets/reinos/survival-clasico.webp",
  },
];

export const SURVIVAL_STATS = [
  "svpoints",
  "tiempo_jugado",
  "bloques_minados",
  "mobs_matados",
  "dinero",
  "kills_pvp",
  "muertes",
];

export const STATS_BY_SERVER = {
  [SERVIDOR_ID]: SURVIVAL_STATS,
};

export const DEFAULTS_BY_SERVER = {
  [SERVIDOR_ID]: { orden: "svpoints", asc: false },
};

export const LABELS = {
  svpoints: "SVPoints",
  tiempo_jugado: "Tiempo",
  muertes: "Muertes",
  bloques_minados: "Minados",
  mobs_matados: "Mobs",
  kills_pvp: "Kills PvP",
  dinero: "Dinero",
};

export const STAT_HELP = {
  svpoints:
    "Puntuación competitiva de Survival. Suma progreso (minados, mobs, kills y dinero ganado total) y resta muertes. El tiempo pesa poco.",
  tiempo_jugado: "Tiempo total jugado en Survival.",
  muertes: "Número total de muertes del jugador en Survival.",
  bloques_minados: "Bloques minados.",
  mobs_matados: "Mobs eliminados.",
  kills_pvp: "Kills a otros jugadores.",
  dinero: "Dinero actual. Pasa el ratón para ver el total ganado.",
};

export const MEDALLAS = {
  1: "/assets/oro.webp",
  2: "/assets/plata.webp",
  3: "/assets/bronce.webp",
};