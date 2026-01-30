export const SERVIDOR_API_MAP = {
  survival_clasico: "survival",
  oneblock: "oneblock",
  gens: "gens",
  survival_anarquico: "anarquico",
  parkour: "parkour",
};

export const SERVIDORES = [
  { id: "survival_clasico", nombre: "Survival Clásico", imagen: "/assets/reinos/survival-clasico.webp" },
  { id: "oneblock", nombre: "OneBlock", imagen: "/assets/reinos/oneblock.webp" },
  { id: "gens", nombre: "Gens", imagen: "/assets/reinos/gens.webp" },
  { id: "survival_anarquico", nombre: "Survival Anárquico", imagen: "/assets/reinos/survival-anarquico.webp" },
  { id: "parkour", nombre: "Parkour", imagen: "/assets/reinos/parkour.webp" },
];

export const STATS_BY_SERVER = {
  survival_clasico: ["svpoints", "tiempo_jugado", "bloques_minados", "mobs_matados", "dinero", "kills_pvp", "muertes"],
  oneblock: ["obpoints", "oneblock_blocks_broken", "phase_actual", "dinero", "mobs_matados", "tiempo_jugado"],
  gens: ["genpoints", "gens_value_total", "coins_balance", "nivel", "dinero", "tiempo_jugado"],

  // ✅ ANÁRQUICO (competitivo)
  survival_anarquico: ["anpoints", "kills_pvp", "muertes", "killstreak_max", "dano_infligido", "kdr", "tiempo_jugado"],

  parkour: ["mejor_tiempo", "completadas_total", "perfect_runs", "falls", "medallas_ganadas", "racha_dias", "tiempo_jugado"],
};

export const DEFAULTS_BY_SERVER = {
  survival_clasico: { orden: "svpoints", asc: false },
  oneblock: { orden: "obpoints", asc: false },
  gens: { orden: "genpoints", asc: false },

  // ✅ orden por ANPoints
  survival_anarquico: { orden: "anpoints", asc: false },

  parkour: { orden: "mejor_tiempo", asc: true },
};

export const LABELS = {
  genpoints: "Genpoints",
  obpoints: "OBPoints",
  svpoints: "SVPoints",
  anpoints: "ANPoints",

  tiempo_jugado: "Tiempo",
  muertes: "Muertes",
  bloques_minados: "Minados",
  mobs_matados: "Mobs",
  kills_pvp: "Kills PvP",
  dinero: "Dinero",

  island_level: "Nivel Isla",
  oneblock_blocks_broken: "Bloque Infinito",
  phase_actual: "Bioma Isla",

  coins_balance: "Coins",
  nivel: "Nivel",
  gens_value_total: "Valor Isla",

  kdr: "KDR",
  killstreak_max: "Racha Máx",
  dano_infligido: "Daño",

  mejor_tiempo: "Mejor Tiempo",
  completadas_total: "Completadas",
  perfect_runs: "Perfect",
  falls: "Caídas",
  medallas_ganadas: "Medallas",
  racha_dias: "Racha",
};

export const STAT_HELP = {
  genpoints:
    "Puntuación competitiva de Gens. No baja al gastar: se basa en totales ganados (coins/dinero) + valor real de generadores y tu nivel.",

  obpoints:
    "Puntuación competitiva de OneBlock. Prioriza la fase de progreso, luego bloque infinito, dinero ganado, mobs y tiempo jugado.",

  svpoints:
    "Puntuación competitiva de Survival. Suma progreso (minados/mobs/kills/dinero ganado total) y resta muertes. El tiempo pesa poco.",

  // ✅ NUEVO: Anárquico
  anpoints:
    "Puntuación competitiva de Anárquico. Premia kills/racha/daño, pero penaliza más las muertes (más de lo que suman las kills). El tiempo pesa poco.",

  gens_value_total:
    "Etapa del Valor de Isla (lo que llevas invertido en generadores). Puede subir o bajar porque depende de tus generadores actuales.",
  coins_balance: "Coins actuales en Gens. Pasa el ratón para ver el total ganado (no baja al gastar).",
  nivel: "Nivel del jugador en Gens (se sincroniza desde el servidor).",
  dinero: "Dinero actual. Pasa el ratón para ver el total ganado (no baja al gastar).",
  tiempo_jugado: "Tiempo total jugado en este servidor.",
  muertes: "Número total de muertes del jugador en este servidor.",
  bloques_minados: "Bloques minados (estadística de Minecraft).",
  mobs_matados: "Mobs eliminados (estadística de Minecraft).",
  kills_pvp: "Kills a otros jugadores (PvP).",

  island_level: "Nivel de tu isla.",
  oneblock_blocks_broken: "Bloques rotos en el bloque infinito (lifetime).",
  phase_actual: "Fase numérica del progreso de OneBlock.",

  mejor_tiempo: "Mejor tiempo registrado en Parkour (mm:ss.ms).",
  completadas_total: "Número total de recorridos completados.",
  perfect_runs: "Recorridos perfectos (sin fallos).",
  falls: "Caídas registradas.",
  medallas_ganadas: "Medallas conseguidas en Parkour.",
  racha_dias: "Racha de días consecutivos jugando Parkour.",

  kdr: "Ratio K/D: kills PvP dividido entre muertes.",
  killstreak_max: "Mayor racha de kills sin morir.",
  dano_infligido: "Daño total infligido.",
};

export const MEDALLAS = {
  1: "/assets/oro.webp",
  2: "/assets/plata.webp",
  3: "/assets/bronce.webp",
};
