// apps/backend/src/controllers/stats.controller.js
const db = require("../models/db");

/**
 * 🧩 ANTIGUO (compatibilidad con sistema viejo por tipo/categoria)
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
          ultima_actualizacion: new Date().toISOString()
        }
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
 * ✅ NUEVO: Importación agrupada desde el plugin
 * Se llama 1 vez por jugador y servidor, con todas las stats agregadas.
 */
exports.importarStatsAgrupadas = async (req, res) => {
  const {
    uuid,
    nombre_minecraft,
    servidor,

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
    dano_recibido
  } = req.body;

  if (!uuid || !servidor) {
    return res.status(400).json({ error: "Faltan campos obligatorios (uuid/servidor)." });
  }

  const payload = {
    uuid,
    nombre_minecraft,
    servidor,
    bloques_minados: bloques_minados || 0,
    bloques_colocados: bloques_colocados || 0,
    mobs_matados: mobs_matados || 0,
    kills_pvp: kills_pvp || 0,
    muertes: muertes || 0,
    tiempo_jugado: tiempo_jugado || 0,
    saltos: saltos || 0,
    distancia_caminada: distancia_caminada || 0,
    distancia_volada: distancia_volada || 0,
    diamantes_minados: diamantes_minados || 0,
    hierro_minado: hierro_minado || 0,
    oro_minado: oro_minado || 0,
    esmeraldas_minadas: esmeraldas_minadas || 0,
    cultivos_cosechados: cultivos_cosechados || 0,
    peces_pescados: peces_pescados || 0,
    dano_infligido: dano_infligido || 0,
    dano_recibido: dano_recibido || 0,
    ultima_actualizacion: new Date().toISOString()
  };

  const { error } = await db
    .from("estadisticas_agrupadas")
    .upsert([payload], {
      onConflict: ["uuid", "servidor"]
    });

  if (error) {
    console.error("[FlanSync] Error al guardar stats agrupadas:", error.message);
    return res.status(500).json({ error: "Error al guardar estadísticas." });
  }

  return res.status(200).json({ success: true });
};

/**
 * 📊 Ranking desde vista optimizada (si la sigues usando)
 * vista_ranking_estadisticas: columnas esperadas:
 * - uuid, nombre_minecraft, servidor, tipo, valor
 */
exports.obtenerRankingEstadisticas = async (req, res) => {
  const { tipo, servidor, limit = 10, offset = 0 } = req.query;

  let query = db
    .from("vista_ranking_estadisticas")
    .select("*", { count: "exact" });

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
    resultados: data
  });
};

/**
 * 🏆 Leaderboard REAL desde tabla agrupada
 * Usado para la página principal de leaderboards
 */
exports.obtenerLeaderboards = async (req, res) => {
  const { tipo = "tiempo_jugado", servidor, limit = 10, offset = 0 } = req.query;

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
    "dano_recibido"
  ];

  if (!tiposValidos.includes(tipo)) {
    return res.status(400).json({
      error: "Tipo de estadística inválido.",
      tiposValidos
    });
  }

  let query = db
    .from("estadisticas_agrupadas")
    .select("*", { count: "exact" })
    .order(tipo, { ascending: false })
    .range(+offset, +offset + +limit - 1);

  if (servidor) query = query.eq("servidor", servidor);

  const { data, count, error } = await query;

  if (error) {
    console.error("[FlanSync] Error al obtener leaderboard agrupado:", error.message);
    return res.status(500).json({ error: "Error al obtener datos." });
  }

  return res.json({
    total: count,
    resultados: data
  });
};

/**
 * 👤 Perfil de estadísticas de un jugador
 * - GET /api/stats/perfil/:uuid?servidor=survival
 * - Si NO se pasa servidor → devuelve todas las filas del jugador (uno por servidor)
 */
exports.obtenerPerfilJugador = async (req, res) => {
  const { uuid } = req.params;
  const { servidor } = req.query;

  if (!uuid) {
    return res.status(400).json({ error: "Falta uuid en la ruta." });
  }

  let query = db
    .from("estadisticas_agrupadas")
    .select("*")
    .eq("uuid", uuid);

  if (servidor) {
    query = query.eq("servidor", servidor);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[FlanSync] Error al obtener perfil de jugador:", error.message);
    return res.status(500).json({ error: "Error al obtener perfil de estadísticas." });
  }

  return res.json({
    resultados: data || []
  });
};
