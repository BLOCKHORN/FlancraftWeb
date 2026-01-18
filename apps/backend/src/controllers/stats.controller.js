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
 *
 * PRO (Gens):
 * - coins_balance = balance actual
 * - coins_ganadas_total = total ganado (acumula SOLO subidas)
 * - dinero = balance actual (vault)
 * - dinero_ganado_total = total ganado (acumula SOLO subidas, SOLO gens)
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
    // survival / oneblock usan dinero como balance (ok)
    setIfDefined(extrasUpdate, "dinero", numOrUndef(req.body.dinero));
    setIfDefined(extrasUpdate, "power_mcmmo", numOrUndef(req.body.power_mcmmo));

    // oneblock
    setIfDefined(extrasUpdate, "island_level", numOrUndef(req.body.island_level));
    setIfDefined(extrasUpdate, "oneblock_blocks_broken", numOrUndef(req.body.oneblock_blocks_broken));
    setIfDefined(extrasUpdate, "phase_actual", numOrUndef(req.body.phase_actual));
    setIfDefined(extrasUpdate, "phase_nombre", textOrUndef(req.body.phase_nombre));
    setIfDefined(extrasUpdate, "challenges_completados", numOrUndef(req.body.challenges_completados));

    // gens
    // ✅ coins_balance llega del plugin, el total lo calculamos nosotros
    setIfDefined(extrasUpdate, "coins_balance", numOrUndef(req.body.coins_balance));

    setIfDefined(extrasUpdate, "upgrades_comprados", numOrUndef(req.body.upgrades_comprados));
    setIfDefined(extrasUpdate, "gens_owned", numOrUndef(req.body.gens_owned));
    setIfDefined(extrasUpdate, "prestigios", numOrUndef(req.body.prestigios));

    // nivel track (num en tu caso, pero lo guardamos como texto para no romper compat)
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

  // 3) ¿Existe fila? (para PRO acumulados necesitamos leer balances previos)
  const { data: existing, error: findErr } = await db
    .from("estadisticas_agrupadas")
    .select("uuid, servidor, coins_balance, coins_ganadas_total, dinero, dinero_ganado_total")
    .eq("uuid", uuid)
    .eq("servidor", servidor)
    .maybeSingle();

  if (findErr) {
    console.error("[FlanSync] Error buscando stats existentes:", findErr.message);
    return res.status(500).json({ error: "Error al comprobar estadísticas existentes." });
  }

  // Helpers PRO
  const isGens = String(servidor).toLowerCase() === "gens";
  const max0 = (x) => Math.max(0, Number(x) || 0);

  const buildProGensPayload = (prevRow, incoming) => {
    // incoming.coins_balance y incoming.dinero son balances actuales (si vienen)
    const out = { ...incoming };

    // Coins: total ganado
    if (incoming.coins_balance !== undefined) {
      const prevBal = Number(prevRow?.coins_balance ?? 0) || 0;
      const prevTotal = Number(prevRow?.coins_ganadas_total ?? prevRow?.coins_balance ?? 0) || 0;
      const newBal = Number(incoming.coins_balance) || 0;

      const delta = max0(newBal - prevBal);
      const newTotal = prevTotal + delta;

      out.coins_balance = newBal;
      out.coins_ganadas_total = newTotal;
    }

    // Dinero: total ganado (solo gens)
    if (incoming.dinero !== undefined) {
      const prevBal = Number(prevRow?.dinero ?? 0) || 0;
      const prevTotal = Number(prevRow?.dinero_ganado_total ?? prevRow?.dinero ?? 0) || 0;
      const newBal = Number(incoming.dinero) || 0;

      const delta = max0(newBal - prevBal);
      const newTotal = prevTotal + delta;

      out.dinero = newBal;
      out.dinero_ganado_total = newTotal;
    }

    return out;
  };

  if (existing) {
    // UPDATE
    let updatePayload = allowExtras ? { ...baseUpdate, ...extrasUpdate } : { ...baseUpdate };

    // PRO: aplica acumulados solo si allowExtras y servidor gens
    if (allowExtras && isGens) {
      updatePayload = buildProGensPayload(existing, updatePayload);
    }

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

  // INSERT
  let insertPayload = {
    uuid,
    servidor,
    ...baseUpdate,
    ...(allowExtras ? extrasUpdate : {}),
  };

  // PRO: inicializa acumulados en el insert solo si gens + online
  if (allowExtras && isGens) {
    const initialRow = {
      coins_balance: 0,
      coins_ganadas_total: 0,
      dinero: 0,
      dinero_ganado_total: 0,
    };
    insertPayload = buildProGensPayload(initialRow, insertPayload);

    // Si no venían balances, deja todo a 0, pero no rompe
    if (insertPayload.coins_ganadas_total === undefined && insertPayload.coins_balance !== undefined) {
      insertPayload.coins_ganadas_total = insertPayload.coins_balance;
    }
    if (insertPayload.dinero_ganado_total === undefined && insertPayload.dinero !== undefined) {
      insertPayload.dinero_ganado_total = insertPayload.dinero;
    }
  }

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

    // GENS PRO
    "coins_balance",
    "coins_ganadas_total",
    "dinero_ganado_total",
    "upgrades_comprados",
    "gens_owned",
    "prestigios",

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
