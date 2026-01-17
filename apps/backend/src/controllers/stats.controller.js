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
 *
 * REGLA:
 * - Vanilla SIEMPRE se actualiza
 * - Extras SOLO si sync_context === "online"
 *
 * FIX:
 * - Para offline/logout NO usamos UPSERT (evita pisar extras a 0/default)
 * - UPDATE selectivo; si no existe fila -> INSERT mínimo
 */
exports.importarStatsAgrupadas = async (req, res) => {
  const num = (v, def = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : def;
  };

  const numOrUndef = (v) => {
    if (v === undefined || v === null || v === "") return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };

  const textOrUndef = (v) => {
    if (v === undefined || v === null) return undefined;
    const s = String(v).trim();
    return s ? s : undefined;
  };

  const setIfDefined = (obj, key, value) => {
    if (value !== undefined) obj[key] = value;
  };

  const { uuid, servidor } = req.body;

  if (!uuid || !servidor) {
    return res.status(400).json({ error: "Faltan campos obligatorios (uuid/servidor)." });
  }

  const syncContext = String(req.body.sync_context || "online").toLowerCase();
  const allowExtras = syncContext === "online";

  // 1) Vanilla (siempre)
  const baseUpdate = {
    bloques_minados: num(req.body.bloques_minados),
    bloques_colocados: num(req.body.bloques_colocados),
    mobs_matados: num(req.body.mobs_matados),
    kills_pvp: num(req.body.kills_pvp),
    muertes: num(req.body.muertes),
    tiempo_jugado: num(req.body.tiempo_jugado),

    saltos: num(req.body.saltos),
    distancia_caminada: num(req.body.distancia_caminada),
    distancia_volada: num(req.body.distancia_volada),

    diamantes_minados: num(req.body.diamantes_minados),
    hierro_minado: num(req.body.hierro_minado),
    oro_minado: num(req.body.oro_minado),
    esmeraldas_minadas: num(req.body.esmeraldas_minadas),
    cultivos_cosechados: num(req.body.cultivos_cosechados),

    peces_pescados: num(req.body.peces_pescados),
    dano_infligido: num(req.body.dano_infligido),
    dano_recibido: num(req.body.dano_recibido),

    ultima_actualizacion: new Date().toISOString(),
  };

  // Campos blandos (solo si vienen)
  setIfDefined(baseUpdate, "nombre_minecraft", textOrUndef(req.body.nombre_minecraft));
  setIfDefined(baseUpdate, "plataforma", textOrUndef(req.body.plataforma));

  // 2) Extras (solo online)
  const extrasUpdate = {};
  if (allowExtras) {
    // survival
    setIfDefined(extrasUpdate, "dinero", numOrUndef(req.body.dinero));
    setIfDefined(extrasUpdate, "power_mcmmo", numOrUndef(req.body.power_mcmmo));

    // oneblock
    setIfDefined(extrasUpdate, "island_level", numOrUndef(req.body.island_level));
    setIfDefined(extrasUpdate, "oneblock_blocks_broken", numOrUndef(req.body.oneblock_blocks_broken));
    setIfDefined(extrasUpdate, "phase_actual", numOrUndef(req.body.phase_actual));
    setIfDefined(extrasUpdate, "phase_nombre", textOrUndef(req.body.phase_nombre));
    setIfDefined(extrasUpdate, "challenges_completados", numOrUndef(req.body.challenges_completados));

    // gens
    setIfDefined(extrasUpdate, "coins_ganadas_total", numOrUndef(req.body.coins_ganadas_total));
    setIfDefined(extrasUpdate, "income_rate", numOrUndef(req.body.income_rate));
    setIfDefined(extrasUpdate, "upgrades_comprados", numOrUndef(req.body.upgrades_comprados));
    setIfDefined(extrasUpdate, "gens_owned", numOrUndef(req.body.gens_owned));
    setIfDefined(extrasUpdate, "prestigios", numOrUndef(req.body.prestigios));

    // ✅ NIVEL (LuckPerms track): ES TEXTO (nova/alpha/inmortal)
    setIfDefined(extrasUpdate, "nivel", textOrUndef(req.body.nivel));

    // anarquico
    setIfDefined(extrasUpdate, "kdr", numOrUndef(req.body.kdr));
    setIfDefined(extrasUpdate, "killstreak_max", numOrUndef(req.body.killstreak_max));
    setIfDefined(extrasUpdate, "damage_dealt", numOrUndef(req.body.damage_dealt));

    // parkour
    setIfDefined(extrasUpdate, "mejor_tiempo", numOrUndef(req.body.mejor_tiempo));
    setIfDefined(extrasUpdate, "completadas_total", numOrUndef(req.body.completadas_total));
    setIfDefined(extrasUpdate, "perfect_runs", numOrUndef(req.body.perfect_runs));
    setIfDefined(extrasUpdate, "falls", numOrUndef(req.body.falls));
    setIfDefined(extrasUpdate, "medallas_ganadas", numOrUndef(req.body.medallas_ganadas));
    setIfDefined(extrasUpdate, "racha_dias", numOrUndef(req.body.racha_dias));
  }

  // 3) ¿Existe fila?
  const { data: existing, error: findErr } = await db
    .from("estadisticas_agrupadas")
    .select("uuid")
    .eq("uuid", uuid)
    .eq("servidor", servidor)
    .maybeSingle();

  if (findErr) {
    console.error("[FlanSync] Error buscando stats existentes:", findErr.message);
    return res.status(500).json({ error: "Error al comprobar estadísticas existentes." });
  }

  if (existing) {
    const updatePayload = allowExtras ? { ...baseUpdate, ...extrasUpdate } : { ...baseUpdate };

    const { error: updErr } = await db
      .from("estadisticas_agrupadas")
      .update(updatePayload)
      .eq("uuid", uuid)
      .eq("servidor", servidor);

    if (updErr) {
      console.error("[FlanSync] Error al actualizar stats:", updErr.message);
      return res.status(500).json({ error: "Error al actualizar estadísticas." });
    }

    return res.status(200).json({ success: true, mode: "update", sync_context: syncContext });
  }

  const insertPayload = {
    uuid,
    servidor,
    ...baseUpdate,
    ...(allowExtras ? extrasUpdate : {}),
  };

  const { error: insErr } = await db.from("estadisticas_agrupadas").insert([insertPayload]);

  if (insErr) {
    console.error("[FlanSync] Error al insertar stats:", insErr.message);
    return res.status(500).json({ error: "Error al insertar estadísticas." });
  }

  return res.status(200).json({ success: true, mode: "insert", sync_context: syncContext });
};

/**
 * Ranking desde vista optimizada
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
 */
exports.obtenerLeaderboards = async (req, res) => {
  const { tipo = "tiempo_jugado", servidor, limit = 10, offset = 0, asc } = req.query;

  const tiposValidos = [
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

    "dinero",
    "power_mcmmo",

    "island_level",
    "oneblock_blocks_broken",
    "phase_actual",
    "challenges_completados",

    "coins_ganadas_total",
    "income_rate",
    "upgrades_comprados",
    "gens_owned",
    "prestigios",

    // ✅ NIVEL LuckPerms (texto)
    "nivel",

    "kdr",
    "killstreak_max",
    "damage_dealt",

    "mejor_tiempo",
    "completadas_total",
    "perfect_runs",
    "falls",
    "medallas_ganadas",
    "racha_dias",
  ];

  if (!tiposValidos.includes(tipo)) {
    return res.status(400).json({ error: "Tipo de estadística inválido.", tiposValidos });
  }

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

  return res.json({ total: count, resultados: data });
};

/**
 * Perfil de estadísticas de un jugador
 */
exports.obtenerPerfilJugador = async (req, res) => {
  const { uuid } = req.params;
  const { servidor } = req.query;

  if (!uuid) return res.status(400).json({ error: "Falta uuid en la ruta." });

  let query = db.from("estadisticas_agrupadas").select("*").eq("uuid", uuid);
  if (servidor) query = query.eq("servidor", servidor);

  const { data, error } = await query;

  if (error) {
    console.error("[FlanSync] Error al obtener perfil de jugador:", error.message);
    return res.status(500).json({ error: "Error al obtener perfil de estadísticas." });
  }

  return res.json({ resultados: data || [] });
};
