// apps/backend/src/controllers/stats.controller.js
const db = require("../models/db");

exports.importarStat = async (req, res) => {
  const { uuid, nombre_minecraft, servidor, tipo, categoria, valor } = req.body;

  if (!uuid || !servidor || !tipo || !categoria || valor == null) {
    return res.status(400).json({ error: "Faltan campos obligatorios." });
  }

  const { error } = await db.from("estadisticas_importadas").upsert(
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

  const jsonOrUndef = (v) => {
    if (v === undefined || v === null) return undefined;
    if (typeof v === "object") return v;

    if (typeof v === "string") {
      const s = v.trim();
      if (!s) return undefined;
      try {
        const parsed = JSON.parse(s);
        if (parsed && typeof parsed === "object") return parsed;
        return undefined;
      } catch {
        return undefined;
      }
    }

    return undefined;
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

  const baseUpdate = {
    bloques_minados: num(req.body.bloques_minados),
    bloques_colocados: num(req.body.bloques_colocados),
    mobs_matados: num(req.body.mobs_matados),
    kills_pvp: num(req.body.kills_pvp),
    muertes: num(req.body.muertes),
    tiempo_jugado: num(req.body.tiempo_jugado),

    // ✅ añadidos para Anárquico (si el plugin los envía)
    killstreak_max: num(req.body.killstreak_max),
    damage_dealt: num(req.body.damage_dealt),

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

  setIfDefined(baseUpdate, "nombre_minecraft", textOrUndef(req.body.nombre_minecraft));
  setIfDefined(baseUpdate, "plataforma", textOrUndef(req.body.plataforma));

  const extrasUpdate = {};
  if (allowExtras) {
    setIfDefined(extrasUpdate, "dinero", numOrUndef(req.body.dinero));
    setIfDefined(extrasUpdate, "power_mcmmo", numOrUndef(req.body.power_mcmmo));

    setIfDefined(extrasUpdate, "island_level", numOrUndef(req.body.island_level));
    setIfDefined(extrasUpdate, "oneblock_blocks_broken", numOrUndef(req.body.oneblock_blocks_broken));
    setIfDefined(extrasUpdate, "phase_actual", numOrUndef(req.body.phase_actual));
    setIfDefined(extrasUpdate, "phase_nombre", textOrUndef(req.body.phase_nombre));
    setIfDefined(extrasUpdate, "challenges_completados", numOrUndef(req.body.challenges_completados));

    setIfDefined(extrasUpdate, "coins_balance", numOrUndef(req.body.coins_balance));
    setIfDefined(extrasUpdate, "upgrades_comprados", numOrUndef(req.body.upgrades_comprados));
    setIfDefined(extrasUpdate, "gens_owned", numOrUndef(req.body.gens_owned));
    setIfDefined(extrasUpdate, "prestigios", numOrUndef(req.body.prestigios));
    setIfDefined(extrasUpdate, "nivel", textOrUndef(req.body.nivel));

    setIfDefined(extrasUpdate, "gens_value_total", numOrUndef(req.body.gens_value_total));
    setIfDefined(extrasUpdate, "gens_income_h", numOrUndef(req.body.gens_income_h));
    setIfDefined(extrasUpdate, "gens_highest_tier", numOrUndef(req.body.gens_highest_tier));
    setIfDefined(extrasUpdate, "gens_tiers", jsonOrUndef(req.body.gens_tiers));
    setIfDefined(extrasUpdate, "gens_tiers_json", textOrUndef(req.body.gens_tiers_json));

    setIfDefined(extrasUpdate, "coins_snapshot", numOrUndef(req.body.coins_snapshot));
    setIfDefined(extrasUpdate, "dinero_snapshot", numOrUndef(req.body.dinero_snapshot));

    setIfDefined(extrasUpdate, "mejor_tiempo", numOrUndef(req.body.mejor_tiempo));
    setIfDefined(extrasUpdate, "completadas_total", numOrUndef(req.body.completadas_total));
    setIfDefined(extrasUpdate, "perfect_runs", numOrUndef(req.body.perfect_runs));
    setIfDefined(extrasUpdate, "falls", numOrUndef(req.body.falls));
    setIfDefined(extrasUpdate, "medallas_ganadas", numOrUndef(req.body.medallas_ganadas));
    setIfDefined(extrasUpdate, "racha_dias", numOrUndef(req.body.racha_dias));
  }

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

  const serverKey = String(servidor).toLowerCase();
  const trackMoneyTotals = serverKey === "gens" || serverKey === "oneblock";
  const trackCoinsTotals = serverKey === "gens";

  const max0 = (x) => Math.max(0, Number(x) || 0);

  const buildTotalsPayload = (prevRow, incoming) => {
    const out = { ...incoming };

    if (trackCoinsTotals && incoming.coins_balance !== undefined) {
      const prevBal = Number(prevRow?.coins_balance ?? 0) || 0;
      const prevTotalRaw = Number(prevRow?.coins_ganadas_total ?? prevRow?.coins_balance ?? 0) || 0;
      const prevTotal = Math.max(prevTotalRaw, prevBal);

      const newBal = Number(incoming.coins_balance) || 0;
      const delta = max0(newBal - prevBal);

      out.coins_balance = newBal;
      out.coins_ganadas_total = prevTotal + delta;
    }

    if (trackMoneyTotals && incoming.dinero !== undefined) {
      const prevBal = Number(prevRow?.dinero ?? 0) || 0;
      const prevTotalRaw = Number(prevRow?.dinero_ganado_total ?? prevRow?.dinero ?? 0) || 0;
      const prevTotal = Math.max(prevTotalRaw, prevBal);

      const newBal = Number(incoming.dinero) || 0;
      const delta = max0(newBal - prevBal);

      out.dinero = newBal;
      out.dinero_ganado_total = prevTotal + delta;
    }

    return out;
  };

  if (existing) {
    let updatePayload = allowExtras ? { ...baseUpdate, ...extrasUpdate } : { ...baseUpdate };
    if (allowExtras) updatePayload = buildTotalsPayload(existing, updatePayload);

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

  let insertPayload = {
    uuid,
    servidor,
    ...baseUpdate,
    ...(allowExtras ? extrasUpdate : {}),
  };

  if (allowExtras) {
    const initialRow = { coins_balance: 0, coins_ganadas_total: 0, dinero: 0, dinero_ganado_total: 0 };
    insertPayload = buildTotalsPayload(initialRow, insertPayload);

    if (trackCoinsTotals && insertPayload.coins_ganadas_total === undefined && insertPayload.coins_balance !== undefined) {
      insertPayload.coins_ganadas_total = insertPayload.coins_balance;
    }
    if (trackMoneyTotals && insertPayload.dinero_ganado_total === undefined && insertPayload.dinero !== undefined) {
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

exports.obtenerRankingEstadisticas = async (req, res) => {
  const { tipo, servidor, limit = 10, offset = 0 } = req.query;

  let query = db.from("vista_ranking_estadisticas").select("*", { count: "exact" });

  if (tipo) query = query.eq("tipo", tipo);
  if (servidor) query = query.eq("servidor", servidor);

  query = query.order("valor", { ascending: false }).range(+offset, +offset + +limit - 1);

  const { data, count, error } = await query;

  if (error) {
    console.error("[FlanSync] Error al obtener ranking (vista):", error.message);
    return res.status(500).json({ error: "Error al obtener ranking." });
  }

  return res.json({ total: count, resultados: data });
};

exports.obtenerLeaderboards = async (req, res) => {
  const { tipo = "tiempo_jugado", servidor, limit = 10, offset = 0, asc } = req.query;

  const tiposValidos = [
    "genpoints",
    "obpoints",
    "svpoints",
    "pkpoints",
    "anpoints",
    "network_points",

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

    // ✅ anárquico extras (si existen en tabla)
    "killstreak_max",
    "damage_dealt",

    "dinero",
    "power_mcmmo",

    "island_level",
    "oneblock_blocks_broken",
    "phase_actual",
    "challenges_completados",

    "coins_balance",
    "coins_ganadas_total",
    "dinero_ganado_total",
    "upgrades_comprados",
    "gens_owned",
    "prestigios",

    "gens_value_total",
    "gens_income_h",
    "gens_highest_tier",

    "nivel",

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
  }

  if (tipo === "genpoints") {
    let q = db
      .from("vista_leaderboard_genspoints")
      .select("*", { count: "exact" })
      .order("genpoints", { ascending })
      .range(+offset, +offset + +limit - 1);

    if (servidor && String(servidor).toLowerCase() !== "gens") {
      return res.json({ total: 0, resultados: [] });
    }

    const { data, count, error } = await q;
    if (error) {
      console.error("[FlanSync] Error al obtener genpoints:", error.message);
      return res.status(500).json({ error: "Error al obtener datos." });
    }

    return res.json({ total: count, resultados: data });
  }

  if (tipo === "obpoints") {
    let q = db
      .from("vista_leaderboard_obpoints")
      .select("*", { count: "exact" })
      .order("obpoints", { ascending })
      .range(+offset, +offset + +limit - 1);

    if (servidor && String(servidor).toLowerCase() !== "oneblock") {
      return res.json({ total: 0, resultados: [] });
    }

    const { data, count, error } = await q;
    if (error) {
      console.error("[FlanSync] Error al obtener obpoints:", error.message);
      return res.status(500).json({ error: "Error al obtener datos." });
    }

    return res.json({ total: count, resultados: data });
  }

  if (tipo === "svpoints") {
    let q = db
      .from("vista_leaderboard_svpoints")
      .select("*", { count: "exact" })
      .order("svpoints", { ascending })
      .range(+offset, +offset + +limit - 1);

    if (servidor && String(servidor).toLowerCase() !== "survival") {
      return res.json({ total: 0, resultados: [] });
    }

    const { data, count, error } = await q;
    if (error) {
      console.error("[FlanSync] Error al obtener svpoints:", error.message);
      return res.status(500).json({ error: "Error al obtener datos." });
    }

    return res.json({ total: count, resultados: data });
  }

  if (tipo === "pkpoints") {
    let q = db
      .from("vista_leaderboard_pkpoints")
      .select("*", { count: "exact" })
      .order("pkpoints", { ascending })
      .range(+offset, +offset + +limit - 1);

    if (servidor && String(servidor).toLowerCase() !== "parkour") {
      return res.json({ total: 0, resultados: [] });
    }

    const { data, count, error } = await q;
    if (error) {
      console.error("[FlanSync] Error al obtener pkpoints:", error.message);
      return res.status(500).json({ error: "Error al obtener datos." });
    }

    return res.json({ total: count, resultados: data });
  }

  // ✅ NUEVO: ANPoints
  if (tipo === "anpoints") {
    let q = db
      .from("vista_leaderboard_anpoints")
      .select("*", { count: "exact" })
      .order("anpoints", { ascending })
      .range(+offset, +offset + +limit - 1);

    if (servidor && String(servidor).toLowerCase() !== "anarquico") {
      return res.json({ total: 0, resultados: [] });
    }

    const { data, count, error } = await q;
    if (error) {
      console.error("[FlanSync] Error al obtener anpoints:", error.message);
      return res.status(500).json({ error: "Error al obtener datos." });
    }

    return res.json({ total: count, resultados: data });
  }

  if (tipo === "network_points") {
    let q = db
      .from("vista_leaderboard_network_points")
      .select("*", { count: "exact" })
      .order("network_points", { ascending })
      .range(+offset, +offset + +limit - 1);

    const { data, count, error } = await q;
    if (error) {
      console.error("[FlanSync] Error al obtener network_points:", error.message);
      return res.status(500).json({ error: "Error al obtener datos." });
    }

    return res.json({ total: count, resultados: data });
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
