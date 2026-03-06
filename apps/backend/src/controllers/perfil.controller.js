const db = require("../models/db");

const SURVIVAL_SERVER = "survival";

const SURVIVAL_PROFILE_SELECT = [
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
].join(",");

const PLAYER_MATCH_SELECT = [
  "uuid",
  "nombre_minecraft",
  "servidor",
  "plataforma",
  "ultima_actualizacion",
].join(",");

const safeNum = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const safeText = (value) => {
  if (value === undefined || value === null) return null;
  const str = String(value).trim();
  return str || null;
};

const normalizeMetersToKm = (value) => {
  const num = safeNum(value, 0);
  return num > 5000 ? num / 1000 : num;
};

const fetchWebUser = async (uuid) => {
  try {
    const { data, error } = await db
      .from("usuarios")
      .select("uuid,uid,rango_usuario,nivel,xp_actual,wallet_coins,es_premium")
      .eq("uuid", uuid)
      .maybeSingle();

    if (error) return null;
    return data || null;
  } catch {
    return null;
  }
};

const fetchSurvivalPoints = async (uuid) => {
  try {
    const { data, error } = await db
      .from("vista_leaderboard_svpoints")
      .select("uuid,svpoints")
      .eq("uuid", uuid)
      .maybeSingle();

    if (error || !data) return 0;
    return safeNum(data.svpoints, 0);
  } catch {
    return 0;
  }
};

const fetchSurvivalCoins = async (uuid) => {
  try {
    const { data, error } = await db
      .from("monedas_actuales")
      .select("coins")
      .eq("uuid", uuid)
      .eq("servidor", SURVIVAL_SERVER)
      .maybeSingle();

    if (error || !data) return null;
    return safeNum(data.coins, 0);
  } catch {
    return null;
  }
};

const fetchEconomyTotals = async (uuid) => {
  try {
    const { data, error } = await db
      .from("vista_economia_resumen")
      .select("uuid,servidor,coins_ganadas_total,coins_gastadas_total,dinero_ganado_total,dinero_gastado_total,ultima_actividad_economica")
      .eq("uuid", uuid)
      .eq("servidor", SURVIVAL_SERVER)
      .maybeSingle();

    if (error || !data) {
      return {
        coins_ganadas_total: 0,
        coins_gastadas_total: 0,
        dinero_ganado_total: 0,
        dinero_gastado_total: 0,
        ultima_actividad_economica: null,
      };
    }

    return {
      coins_ganadas_total: safeNum(data.coins_ganadas_total, 0),
      coins_gastadas_total: safeNum(data.coins_gastadas_total, 0),
      dinero_ganado_total: safeNum(data.dinero_ganado_total, 0),
      dinero_gastado_total: safeNum(data.dinero_gastado_total, 0),
      ultima_actividad_economica: data.ultima_actividad_economica || null,
    };
  } catch {
    return {
      coins_ganadas_total: 0,
      coins_gastadas_total: 0,
      dinero_ganado_total: 0,
      dinero_gastado_total: 0,
      ultima_actividad_economica: null,
    };
  }
};

const shapeSurvivalRow = (row, extras = {}) => {
  if (!row) return null;

  const updatedAt = row.ultima_actualizacion || null;
  const tiempo = safeNum(row.tiempo_jugado, 0);
  const walkKm = normalizeMetersToKm(row.distancia_caminada);
  const flyKm = normalizeMetersToKm(row.distancia_volada);

  const dineroActual = safeNum(row.dinero, 0);
  const coinsActual =
    extras.currentCoins != null
      ? safeNum(extras.currentCoins, 0)
      : safeNum(row.coins_balance, 0);

  const dineroGanadoTotal = safeNum(extras.economyTotals?.dinero_ganado_total, 0);
  const dineroGastadoTotal = safeNum(extras.economyTotals?.dinero_gastado_total, 0);
  const coinsGanadasTotal = safeNum(extras.economyTotals?.coins_ganadas_total, 0);
  const coinsGastadasTotal = safeNum(extras.economyTotals?.coins_gastadas_total, 0);
  const svpoints = safeNum(extras.svpoints, 0);

  return {
    servidor: SURVIVAL_SERVER,
    updated_at: updatedAt,
    resumen: {
      tiempo_jugado: tiempo,
      svpoints,
      points: svpoints,
    },
    general: {
      tiempo_jugado: tiempo,
      bloques_minados: safeNum(row.bloques_minados, 0),
      bloques_colocados: safeNum(row.bloques_colocados, 0),
      saltos: safeNum(row.saltos, 0),
      caminar: walkKm,
      walk_km: walkKm,
      volar: flyKm,
      fly_km: flyKm,
    },
    combate: {
      mobs_matados: safeNum(row.mobs_matados, 0),
      kills_pvp: safeNum(row.kills_pvp, 0),
      muertes: safeNum(row.muertes, 0),
      muertes_pvp: row.muertes_pvp == null ? null : safeNum(row.muertes_pvp, 0),
      killstreak_max: row.killstreak_max == null ? null : safeNum(row.killstreak_max, 0),
      dano_infligido: safeNum(row.dano_infligido, 0),
      dano_recibido: safeNum(row.dano_recibido, 0),
    },
    recursos: {
      diamantes: safeNum(row.diamantes_minados, 0),
      hierro: safeNum(row.hierro_minado, 0),
      oro: safeNum(row.oro_minado, 0),
      esmeraldas: safeNum(row.esmeraldas_minadas, 0),
      cultivos: safeNum(row.cultivos_cosechados, 0),
      pesca: safeNum(row.peces_pescados, 0),
    },
    economia: {
      dinero_actual: dineroActual,
      dinero_ganado_total: dineroGanadoTotal,
      dinero_gastado_total: dineroGastadoTotal,
      dinero_total: dineroGanadoTotal,
      coins_actual: coinsActual,
      coins_ganadas_total: coinsGanadasTotal,
      coins_gastadas_total: coinsGastadasTotal,
      coins_total: coinsGanadasTotal,
      svpoints,
      points: svpoints,
    },
  };
};

const findBestPlayerRow = async (name) => {
  const { data, error } = await db
    .from("estadisticas_agrupadas")
    .select(PLAYER_MATCH_SELECT)
    .ilike("nombre_minecraft", name);

  if (error) {
    throw new Error(error.message || "Error al buscar jugador.");
  }

  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }

  const sorted = [...data].sort((a, b) => {
    const aIsSurvival = String(a?.servidor || "").toLowerCase() === SURVIVAL_SERVER ? 1 : 0;
    const bIsSurvival = String(b?.servidor || "").toLowerCase() === SURVIVAL_SERVER ? 1 : 0;

    if (aIsSurvival !== bIsSurvival) {
      return bIsSurvival - aIsSurvival;
    }

    const ta = new Date(a?.ultima_actualizacion || 0).getTime();
    const tb = new Date(b?.ultima_actualizacion || 0).getTime();
    return tb - ta;
  });

  return sorted[0] || null;
};

exports.obtenerPerfilPorNombre = async (req, res) => {
  try {
    const rawName = String(req.params.nombre || "").trim();

    if (!rawName) {
      return res.status(400).json({ error: "Falta nombre en la ruta." });
    }

    const matchedRow = await findBestPlayerRow(rawName);

    if (!matchedRow?.uuid) {
      return res.status(404).json({ error: "Jugador no encontrado." });
    }

    const uuid = matchedRow.uuid;

    const { data: survivalRow, error: survivalError } = await db
      .from("estadisticas_agrupadas")
      .select(SURVIVAL_PROFILE_SELECT)
      .eq("uuid", uuid)
      .eq("servidor", SURVIVAL_SERVER)
      .maybeSingle();

    if (survivalError) {
      console.error("[Perfil] Error cargando survival:", survivalError.message);
      return res.status(500).json({ error: "Error al cargar perfil." });
    }

    if (!survivalRow) {
      return res.status(404).json({ error: "Perfil de survival no encontrado." });
    }

    const [webUser, svpoints, currentCoins, economyTotals] = await Promise.all([
      fetchWebUser(uuid),
      fetchSurvivalPoints(uuid),
      fetchSurvivalCoins(uuid),
      fetchEconomyTotals(uuid),
    ]);

    const survival = shapeSurvivalRow(survivalRow, {
      svpoints,
      currentCoins,
      economyTotals,
    });

    const displayName =
      safeText(webUser?.uid) ||
      safeText(survivalRow?.nombre_minecraft) ||
      safeText(matchedRow?.nombre_minecraft) ||
      rawName;

    const plataforma =
      safeText(survivalRow?.plataforma) ||
      safeText(matchedRow?.plataforma) ||
      null;

    const jugador = {
      uuid,
      uid: displayName,
      nombre_minecraft: displayName,
      plataforma,
      rango_usuario: webUser?.rango_usuario ?? null,
      nivel: webUser?.nivel ?? null,
      xp_actual: webUser?.xp_actual ?? null,
      wallet_coins: webUser?.wallet_coins == null ? null : safeNum(webUser.wallet_coins, 0),
      es_premium: webUser?.es_premium ?? null,
      actualizado: survivalRow?.ultima_actualizacion || null,
    };

    return res.json({
      jugador,
      servidores: {
        survival,
      },
      servidor_activo: SURVIVAL_SERVER,
      totales: {
        points_total: safeNum(svpoints, 0),
        tiempo_jugado_total: safeNum(survival?.general?.tiempo_jugado, 0),
        kills_pvp_total: safeNum(survival?.combate?.kills_pvp, 0),
        wallet_coins: jugador.wallet_coins,
        points: {
          svpoints: safeNum(svpoints, 0),
          network_points: safeNum(svpoints, 0),
        },
      },
    });
  } catch (error) {
    console.error("[Perfil] Error buscando por nombre:", error.message);
    return res.status(500).json({ error: "Error al cargar perfil." });
  }
};

exports.obtenerPerfilServidor = async (req, res) => {
  try {
    const uuid = String(req.params.uuid || "").trim();
    const servidor = String(req.params.servidor || "").trim().toLowerCase();

    if (!uuid) {
      return res.status(400).json({ error: "Falta uuid en la ruta." });
    }

    if (!servidor) {
      return res.status(400).json({ error: "Falta servidor en la ruta." });
    }

    if (servidor !== SURVIVAL_SERVER) {
      return res.status(404).json({ error: "Servidor no disponible." });
    }

    const { data: row, error } = await db
      .from("estadisticas_agrupadas")
      .select(SURVIVAL_PROFILE_SELECT)
      .eq("uuid", uuid)
      .eq("servidor", SURVIVAL_SERVER)
      .maybeSingle();

    if (error) {
      console.error("[Perfil] Error cargando servidor:", error.message);
      return res.status(500).json({ error: "Error al cargar servidor." });
    }

    if (!row) {
      return res.status(404).json({ error: "Servidor no encontrado para este jugador." });
    }

    const [svpoints, currentCoins, economyTotals] = await Promise.all([
      fetchSurvivalPoints(uuid),
      fetchSurvivalCoins(uuid),
      fetchEconomyTotals(uuid),
    ]);

    return res.json(
      shapeSurvivalRow(row, {
        svpoints,
        currentCoins,
        economyTotals,
      })
    );
  } catch (error) {
    console.error("[Perfil] Error general cargando servidor:", error.message);
    return res.status(500).json({ error: "Error al cargar servidor." });
  }
};