const db = require("../models/db");
const {
  enrichLeaderboardWith24hMovement,
  maybeStoreLeaderboardSnapshot,
} = require("../services/leaderboardSnapshots.service");

const SURVIVAL_SERVER = "survival";
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 1000;

const SURVIVAL_STATS_VIEW_SELECT = [
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
  "coins_balance",
  "coins_ganadas_total",
  "coins_gastadas_total",
  "dinero_ganado_total",
  "dinero_gastado_total",
  "wallet_coins",
  "nivel",
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

const resolveServerOrReject = (value) => {
  const server = normalizeServer(value);
  if (!server) return SURVIVAL_SERVER;
  if (server !== SURVIVAL_SERVER) return null;
  return SURVIVAL_SERVER;
};

const normalizeJobId = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

const sanitizeJobsStats = (value) => {
  if (!Array.isArray(value)) return [];

  return value
    .map((job) => {
      const rawId =
        textOrUndef(job?.id) ||
        textOrUndef(job?.job) ||
        textOrUndef(job?.name) ||
        textOrUndef(job?.nombre) ||
        null;

      const nombre =
        textOrUndef(job?.nombre) ||
        textOrUndef(job?.name) ||
        textOrUndef(job?.job) ||
        textOrUndef(job?.id) ||
        null;

      if (!nombre) return null;

      return {
        id: normalizeJobId(rawId || nombre),
        nombre,
        nivel: num(job?.nivel ?? job?.level, 0),
        xp: num(job?.xp ?? job?.experience, 0),
        xp_max: num(job?.xp_max ?? job?.xpMax ?? job?.maxExperience, 0),
      };
    })
    .filter((job) => job && job.id && job.nombre)
    .sort((a, b) => {
      if (b.nivel !== a.nivel) return b.nivel - a.nivel;
      return b.xp - a.xp;
    });
};

const buildRankedRows = (rows) => {
  const list = Array.isArray(rows) ? rows : [];
  return list.map((row, index) => ({
    ...row,
    global_rank: index + 1,
  }));
};

const fetchAllLeaderboardRows = async ({ tipo, ascending }) => {
  const spec = VIEWS_BY_TIPO[tipo];

  if (spec) {
    const { data, count, error } = await db
      .from(spec.view)
      .select(SURVIVAL_STATS_VIEW_SELECT, { count: "exact" })
      .eq("servidor", SURVIVAL_SERVER)
      .order(spec.order, { ascending })
      .range(0, MAX_LIMIT - 1);

    if (error) {
      throw error;
    }

    return {
      data: Array.isArray(data) ? data : [],
      count: Number.isFinite(Number(count)) ? Number(count) : Array.isArray(data) ? data.length : 0,
    };
  }

  const { data, count, error } = await db
    .from("vista_estadisticas_agrupadas_wallet")
    .select(SURVIVAL_STATS_VIEW_SELECT, { count: "exact" })
    .eq("servidor", SURVIVAL_SERVER)
    .order(tipo, { ascending })
    .range(0, MAX_LIMIT - 1);

  if (error) {
    throw error;
  }

  return {
    data: Array.isArray(data) ? data : [],
    count: Number.isFinite(Number(count)) ? Number(count) : Array.isArray(data) ? data.length : 0,
  };
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
  const allowExtras = syncContext === "online" || syncContext === "logout";
  const hasJobsStats = Object.prototype.hasOwnProperty.call(req.body, "jobs_stats");

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
    setIfDefined(extrasUpdate, "coins_ganadas_total", numOrUndef(req.body.coins_ganadas_total));
    setIfDefined(extrasUpdate, "dinero_ganado_total", numOrUndef(req.body.dinero_ganado_total));
  }

  if (hasJobsStats) {
    extrasUpdate.jobs_stats = sanitizeJobsStats(req.body.jobs_stats);
  }

  const { data: existing, error: findErr } = await db
    .from("estadisticas_agrupadas")
    .select("uuid, servidor")
    .eq("uuid", uuid)
    .eq("servidor", server)
    .maybeSingle();

  if (findErr) {
    return res.status(500).json({ error: "Error al comprobar estadísticas existentes." });
  }

  if (existing) {
    const updatePayload = {
      ...baseUpdate,
      ...(allowExtras ? extrasUpdate : hasJobsStats ? { jobs_stats: extrasUpdate.jobs_stats } : {}),
    };

    const { error: updErr } = await db
      .from("estadisticas_agrupadas")
      .update(updatePayload)
      .eq("uuid", uuid)
      .eq("servidor", server);

    if (updErr) {
      return res.status(500).json({ error: "Error al actualizar estadísticas." });
    }

    return res.status(200).json({
      success: true,
      mode: "update",
      sync_context: syncContext,
      jobs_stats_updated: hasJobsStats,
    });
  }

  const insertPayload = {
    uuid,
    servidor: server,
    ...baseUpdate,
    ...(allowExtras ? extrasUpdate : {}),
  };

  if (!allowExtras && hasJobsStats) {
    insertPayload.jobs_stats = sanitizeJobsStats(req.body.jobs_stats);
  }

  const { error: insErr } = await db.from("estadisticas_agrupadas").insert([insertPayload]);

  if (insErr) {
    return res.status(500).json({ error: "Error al insertar estadísticas." });
  }

  return res.status(200).json({
    success: true,
    mode: "insert",
    sync_context: syncContext,
    jobs_stats_updated: hasJobsStats,
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
    .select(SURVIVAL_STATS_VIEW_SELECT, { count: "exact" })
    .eq("servidor", SURVIVAL_SERVER);

  if (tipo) {
    query = query.eq("tipo", tipo);
  }

  query = query.order("valor", { ascending: false }).range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
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

  try {
    const { data, count } = await fetchAllLeaderboardRows({
      tipo,
      ascending,
    });

    const rankedRows = buildRankedRows(data);

    const enrichedRows = await enrichLeaderboardWith24hMovement({
      servidor: SURVIVAL_SERVER,
      tipo,
      rows: rankedRows,
    });

    maybeStoreLeaderboardSnapshot({
      servidor: SURVIVAL_SERVER,
      tipo,
      rows: rankedRows,
    }).catch((error) => {});

    const paged = enrichedRows.slice(offset, offset + limit);

    return res.json({
      total: count,
      resultados: paged,
    });
  } catch (error) {
    return res.status(500).json({ error: "Error al obtener datos." });
  }
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
    .from("vista_estadisticas_agrupadas_wallet")
    .select(SURVIVAL_STATS_VIEW_SELECT)
    .eq("uuid", uuid)
    .eq("servidor", SURVIVAL_SERVER);

  if (error) {
    return res.status(500).json({ error: "Error al obtener perfil de estadísticas." });
  }

  return res.json({ resultados: data || [] });
};