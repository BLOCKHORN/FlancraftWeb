// apps/backend/src/controllers/stats.controller.js
const db = require("../models/db");

/**
 * Compatibilidad con sistema viejo por tipo/categoria
 */
exports.importarStat = async (req, res) => {
  const { uuid, nombre_minecraft, servidor, tipo, categoria, valor } = req.body;

  if (!uuid || !servidor || !tipo || !categoria || valor == null) {
    return res.status(400).json({ error: "Faltan campos obligatorios." });
  }

  const { error } = await db
    .from("estadisticas_importadas")
    .upsert(
      [
        {
          uuid,
          nombre_minecraft,
          servidor,
          tipo,
          categoria,
          valor,
          ultima_actualizacion: new Date().toISOString(),
        },
      ],
      { onConflict: ["uuid", "servidor", "tipo", "categoria"] }
    );

  if (error) {
    console.error("[FlanSync] Error al importar stat:", error.message);
    return res.status(500).json({ error: "Error al guardar en la base de datos." });
  }

  return res.status(200).json({ success: true });
};

/**
 * Importación agrupada desde el plugin
 * Se llama 1 vez por jugador y servidor, con todas las stats agregadas.
 * Incluye extras por servidor cuando el plugin las manda.
 */
exports.importarStatsAgrupadas = async (req, res) => {
  const num = (v, def = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : def;
  };

  const textOrNull = (v) => {
    if (v == null) return null;
    const s = String(v).trim();
    return s ? s : null;
  };

  const {
    uuid,
    nombre_minecraft,
    servidor,

    // vanilla
    bloques_minados,
    bloques_colocados,
    mobs_matados,
    kills_pvp,
    muertes,
    tiempo_jugado,
    saltos,
    distancia_caminada,
    distancia_volada,

    diamantes_minados,
    hierro_minado,
    oro_minado,
    esmeraldas_minadas,
    cultivos_cosechados,
    peces_pescados,
    dano_infligido,
    dano_recibido,

    // extras survival
    dinero,
    power_mcmmo,

    // extras oneblock
    island_level,
    oneblock_blocks_broken,
    phase_actual,
    phase_nombre,
    challenges_completados,

    // extras gens
    coins_ganadas_total,
    income_rate,
    upgrades_comprados,
    gens_owned,
    prestigios,

    // extras anarquico
    kdr,
    killstreak_max,
    damage_dealt,

    // extras parkour
    mejor_tiempo,
    completadas_total,
    perfect_runs,
    falls,
    medallas_ganadas,
    racha_dias,
  } = req.body;

  if (!uuid || !servidor) {
    return res.status(400).json({ error: "Faltan campos obligatorios (uuid/servidor)." });
  }

  const payload = {
    uuid,
    nombre_minecraft: textOrNull(nombre_minecraft),
    servidor,

    // vanilla
    bloques_minados: num(bloques_minados),
    bloques_colocados: num(bloques_colocados),
    mobs_matados: num(mobs_matados),
    kills_pvp: num(kills_pvp),
    muertes: num(muertes),

    // recomendado en segundos (si usas ticks, el frontend debe adaptarse)
    tiempo_jugado: num(tiempo_jugado),

    saltos: num(saltos),
    distancia_caminada: num(distancia_caminada),
    distancia_volada: num(distancia_volada),

    diamantes_minados: num(diamantes_minados),
    hierro_minado: num(hierro_minado),
    oro_minado: num(oro_minado),
    esmeraldas_minadas: num(esmeraldas_minadas),
    cultivos_cosechados: num(cultivos_cosechados),
    peces_pescados: num(peces_pescados),
    dano_infligido: num(dano_infligido),
    dano_recibido: num(dano_recibido),

    // extras survival
    dinero: num(dinero),
    power_mcmmo: num(power_mcmmo),

    // extras oneblock
    island_level: num(island_level),
    oneblock_blocks_broken: num(oneblock_blocks_broken),
    phase_actual: num(phase_actual),
    phase_nombre: textOrNull(phase_nombre),
    challenges_completados: num(challenges_completados),

    // extras gens
    coins_ganadas_total: num(coins_ganadas_total),
    income_rate: num(income_rate),
    upgrades_comprados: num(upgrades_comprados),
    gens_owned: num(gens_owned),
    prestigios: num(prestigios),

    // extras anarquico
    kdr: num(kdr),
    killstreak_max: num(killstreak_max),
    damage_dealt: num(damage_dealt),

    // extras parkour
    mejor_tiempo: num(mejor_tiempo),
    completadas_total: num(completadas_total),
    perfect_runs: num(perfect_runs),
    falls: num(falls),
    medallas_ganadas: num(medallas_ganadas),
    racha_dias: num(racha_dias),

    ultima_actualizacion: new Date().toISOString(),
  };

  const { error } = await db.from("estadisticas_agrupadas").upsert([payload], {
    onConflict: ["uuid", "servidor"],
  });

  if (error) {
    console.error("[FlanSync] Error al guardar stats agrupadas:", error.message);
    return res.status(500).json({ error: "Error al guardar estadísticas." });
  }

  return res.status(200).json({ success: true });
};

/**
 * Ranking desde vista optimizada
 * vista_ranking_estadisticas: columnas esperadas:
 * - uuid, nombre_minecraft, servidor, tipo, valor
 */
exports.obtenerRankingEstadisticas = async (req, res) => {
  const { tipo, servidor, limit = 10, offset = 0 } = req.query;

  let query = db.from("vista_ranking_estadisticas").select("*", { count: "exact" });

  if (tipo) query = query.eq("tipo", tipo);
  if (servidor) query = query.eq("servidor", servidor);

  query = query
    .order("valor", { ascending: false })
    .range(+offset, +offset + +limit - 1);

  const { data, count, error } = await query;

  if (error) {
    console.error("[FlanSync] Error al obtener ranking (vista):", error.message);
    return res.status(500).json({ error: "Error al obtener ranking." });
  }

  return res.json({
    total: count,
    resultados: data,
  });
};

/**
 * Leaderboard desde tabla agrupada
 * Soporta: ?tipo=xxx&servidor=yyy&limit=10&offset=0&asc=true|false
 */
exports.obtenerLeaderboards = async (req, res) => {
  const { tipo = "tiempo_jugado", servidor, limit = 10, offset = 0, asc } = req.query;

  const tiposValidos = [
    // vanilla
    "bloques_minados",
    "bloques_colocados",
    "mobs_matados",
    "kills_pvp",
    "muertes",
    "tiempo_jugado",
    "saltos",
    "distancia_caminada",
    "distancia_volada",
    "diamantes_minados",
    "hierro_minado",
    "oro_minado",
    "esmeraldas_minadas",
    "cultivos_cosechados",
    "peces_pescados",
    "dano_infligido",
    "dano_recibido",

    // survival extras
    "dinero",
    "power_mcmmo",

    // oneblock extras
    "island_level",
    "oneblock_blocks_broken",
    "phase_actual",
    "challenges_completados",

    // gens extras
    "coins_ganadas_total",
    "income_rate",
    "upgrades_comprados",
    "gens_owned",
    "prestigios",

    // anarquico extras
    "kdr",
    "killstreak_max",
    "damage_dealt",

    // parkour extras
    "mejor_tiempo",
    "completadas_total",
    "perfect_runs",
    "falls",
    "medallas_ganadas",
    "racha_dias",
  ];

  if (!tiposValidos.includes(tipo)) {
    return res.status(400).json({
      error: "Tipo de estadística inválido.",
      tiposValidos,
    });
  }

  // asc opcional. Si no lo mandas:
  // - mejor_tiempo (parkour) por defecto ASC
  // - el resto por defecto DESC
  let ascending = false;
  if (typeof asc !== "undefined") {
    ascending = String(asc).toLowerCase() === "true";
  } else if (tipo === "mejor_tiempo") {
    ascending = true;
  }

  let query = db
    .from("estadisticas_agrupadas")
    .select("*", { count: "exact" })
    .order(tipo, { ascending })
    .range(+offset, +offset + +limit - 1);

  if (servidor) query = query.eq("servidor", servidor);

  const { data, count, error } = await query;

  if (error) {
    console.error("[FlanSync] Error al obtener leaderboard agrupado:", error.message);
    return res.status(500).json({ error: "Error al obtener datos." });
  }

  return res.json({
    total: count,
    resultados: data,
  });
};

/**
 * Perfil de estadísticas de un jugador
 * - GET /api/stats/perfil/:uuid?servidor=survival
 * - Si NO se pasa servidor: devuelve todas las filas del jugador (uno por servidor)
 */
exports.obtenerPerfilJugador = async (req, res) => {
  const { uuid } = req.params;
  const { servidor } = req.query;

  if (!uuid) {
    return res.status(400).json({ error: "Falta uuid en la ruta." });
  }

  let query = db.from("estadisticas_agrupadas").select("*").eq("uuid", uuid);

  if (servidor) {
    query = query.eq("servidor", servidor);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[FlanSync] Error al obtener perfil de jugador:", error.message);
    return res.status(500).json({ error: "Error al obtener perfil de estadísticas." });
  }

  return res.json({
    resultados: data || [],
  });
};
