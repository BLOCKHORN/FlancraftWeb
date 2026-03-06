const db = require("../models/db");

const SURVIVAL_SERVER = "survival";
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 1000;

const SURVIVAL_STATS_SELECT = [
  "uuid",
  "nombre_minecraft",
  "servidor",
  "plataforma",
  "ultima_actualizacion",
  "bloques_minados",
  "bloques_colocados",
  "mobs_matados",
  "kills_pvp",
  "muertes",
  "muertes_pvp",
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
  "killstreak_max",
  "dinero",
  "dinero_ganado_total",
  "coins_balance",
  "coins_ganadas_total",
].join(",");

const TIPOS_VALIDOS = new Set([
  "svpoints",
  "network_points",
  "bloques_minados",
  "bloques_colocados",
  "mobs_matados",
  "kills_pvp",
  "muertes",
  "muertes_pvp",
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
  "killstreak_max",
  "dinero",
]);

const VIEWS_BY_TIPO = {
  svpoints: {
    view: "vista_leaderboard_svpoints_wallet",
    order: "svpoints",
  },
  network_points: {
    view: "vista_leaderboard_svpoints_wallet",
    order: "svpoints",
  },
};

const parseAsc = (value) => String(value).toLowerCase() === "true";

const parseLimit = (value, fallback = DEFAULT_LIMIT) => {
  const num = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(1, Math.min(MAX_LIMIT, num));
};

const parseOffset = (value) => {
  const num = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, num);
};

const num = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const numOrUndef = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
};

const textOrUndef = (value) => {
  if (value === undefined || value === null) return undefined;
  const str = String(value).trim();
  return str || undefined;
};

const setIfDefined = (obj, key, value) => {
  if (value !== undefined) {
    obj[key] = value;
  }
};

const normalizeServer = (value) => String(value ?? "").trim().toLowerCase();

const max0 = (value) => Math.max(0, Number(value) || 0);

const resolveServerOrReject = (value) => {
  const server = normalizeServer(value);
  if (!server) return SURVIVAL_SERVER;
  if (server !== SURVIVAL_SERVER) return null;
  return SURVIVAL_SERVER;
};

const buildLifetimePayload = (prevRow, incoming, currentKey, totalKey) => {
  const out = { ...incoming };

  if (out[currentKey] === undefined) {
    return out;
  }

  const prevCurrent = Number(prevRow?.[currentKey] ?? 0) || 0;
  const prevTotalRaw = Number(prevRow?.[totalKey] ?? prevCurrent) || 0;
  const prevTotal = Math.max(prevTotalRaw, prevCurrent);

  const newCurrent = Number(out[currentKey]) || 0;
  const delta = max0(newCurrent - prevCurrent);

  out[currentKey] = newCurrent;
  out[totalKey] = prevTotal + delta;

  return out;
};

const buildEconomyTotalsPayload = (prevRow, incoming) => {
  let out = buildLifetimePayload(prevRow, incoming, "dinero", "dinero_ganado_total");
  out = buildLifetimePayload(prevRow, out, "coins_balance", "coins_ganadas_total");
  return out;
};

exports.importarStat = async (req, res) => {
  const { uuid, nombre_minecraft, servidor, tipo, categoria, valor } = req.body;
  const server = resolveServerOrReject(servidor);

  if (!uuid || !server || !tipo || !categoria || valor == null) {
    return res.status(400).json({ error: "Faltan campos obligatorios o servidor inválido." });
  }

  const { error } = await db.from("estadisticas_importadas").upsert(
    [
      {
        uuid,
        nombre_minecraft,
        servidor: server,
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
  const { uuid, servidor } = req.body;
  const server = resolveServerOrReject(servidor);

  if (!uuid || !server) {
    return res.status(400).json({
      error: "Faltan campos obligatorios (uuid/servidor) o el servidor no es válido.",
    });
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
    setIfDefined(
      extrasUpdate,
      "coins_balance",
      numOrUndef(req.body.coins_balance ?? req.body.coins)
    );
    setIfDefined(extrasUpdate, "killstreak_max", numOrUndef(req.body.killstreak_max));
    setIfDefined(extrasUpdate, "muertes_pvp", numOrUndef(req.body.muertes_pvp));
  }

  const { data: existing, error: findErr } = await db
    .from("estadisticas_agrupadas")
    .select("uuid, servidor, dinero, dinero_ganado_total, coins_balance, coins_ganadas_total")
    .eq("uuid", uuid)
    .eq("servidor", server)
    .maybeSingle();

  if (findErr) {
    console.error("[FlanSync] Error buscando stats existentes:", findErr.message);
    return res.status(500).json({ error: "Error al comprobar estadísticas existentes." });
  }

  if (existing) {
    let updatePayload = allowExtras
      ? { ...baseUpdate, ...extrasUpdate }
      : { ...baseUpdate };

    if (allowExtras) {
      updatePayload = buildEconomyTotalsPayload(existing, updatePayload);
    }

    const { error: updErr } = await db
      .from("estadisticas_agrupadas")
      .update(updatePayload)
      .eq("uuid", uuid)
      .eq("servidor", server);

    if (updErr) {
      console.error("[FlanSync] Error al actualizar stats:", updErr.message);
      return res.status(500).json({ error: "Error al actualizar estadísticas." });
    }

    return res.status(200).json({
      success: true,
      mode: "update",
      sync_context: syncContext,
    });
  }

  let insertPayload = {
    uuid,
    servidor: server,
    ...baseUpdate,
    ...(allowExtras ? extrasUpdate : {}),
  };

  if (allowExtras) {
    insertPayload = buildEconomyTotalsPayload(
      {
        dinero: 0,
        dinero_ganado_total: 0,
        coins_balance: 0,
        coins_ganadas_total: 0,
      },
      insertPayload
    );
  }

  const { error: insErr } = await db
    .from("estadisticas_agrupadas")
    .insert([insertPayload]);

  if (insErr) {
    console.error("[FlanSync] Error al insertar stats:", insErr.message);
    return res.status(500).json({ error: "Error al insertar estadísticas." });
  }

  return res.status(200).json({
    success: true,
    mode: "insert",
    sync_context: syncContext,
  });
};

exports.obtenerRankingEstadisticas = async (req, res) => {
  const tipo = textOrUndef(req.query.tipo);
  const servidor = resolveServerOrReject(req.query.servidor);
  const limit = parseLimit(req.query.limit);
  const offset = parseOffset(req.query.offset);

  if (req.query.servidor && !servidor) {
    return res.json({ total: 0, resultados: [] });
  }

  let query = db
    .from("vista_ranking_estadisticas")
    .select("*", { count: "exact" })
    .eq("servidor", SURVIVAL_SERVER);

  if (tipo) {
    query = query.eq("tipo", tipo);
  }

  query = query
    .order("valor", { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    console.error("[FlanSync] Error al obtener ranking (vista):", error.message);
    return res.status(500).json({ error: "Error al obtener ranking." });
  }

  return res.json({ total: count, resultados: data || [] });
};

exports.obtenerLeaderboards = async (req, res) => {
  const tipo = textOrUndef(req.query.tipo) || "tiempo_jugado";
  const servidor = resolveServerOrReject(req.query.servidor);
  const limit = parseLimit(req.query.limit);
  const offset = parseOffset(req.query.offset);
  const ascending = parseAsc(req.query.asc);

  if (!TIPOS_VALIDOS.has(tipo)) {
    return res.status(400).json({
      error: "Tipo de estadística inválido.",
      tiposValidos: Array.from(TIPOS_VALIDOS),
    });
  }

  if (req.query.servidor && !servidor) {
    return res.json({ total: 0, resultados: [] });
  }

  const spec = VIEWS_BY_TIPO[tipo];

  if (spec) {
    const { data, count, error } = await db
      .from(spec.view)
      .select("*", { count: "exact" })
      .order(spec.order, { ascending })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("[FlanSync] Error al obtener leaderboard:", error.message);
      return res.status(500).json({ error: "Error al obtener datos." });
    }

    return res.json({ total: count, resultados: data || [] });
  }

  const { data, count, error } = await db
    .from("vista_estadisticas_agrupadas_wallet")
    .select("*", { count: "exact" })
    .eq("servidor", SURVIVAL_SERVER)
    .order(tipo, { ascending })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("[FlanSync] Error al obtener leaderboard agrupado:", error.message);
    return res.status(500).json({ error: "Error al obtener datos." });
  }

  return res.json({ total: count, resultados: data || [] });
};

exports.obtenerPerfilJugador = async (req, res) => {
  const { uuid } = req.params;
  const servidor = resolveServerOrReject(req.query.servidor);

  if (!uuid) {
    return res.status(400).json({ error: "Falta uuid en la ruta." });
  }

  if (req.query.servidor && !servidor) {
    return res.json({ resultados: [] });
  }

  const { data, error } = await db
    .from("estadisticas_agrupadas")
    .select(SURVIVAL_STATS_SELECT)
    .eq("uuid", uuid)
    .eq("servidor", SURVIVAL_SERVER);

  if (error) {
    console.error("[FlanSync] Error al obtener perfil de jugador:", error.message);
    return res.status(500).json({ error: "Error al obtener perfil de estadísticas." });
  }

  return res.json({ resultados: data || [] });
};