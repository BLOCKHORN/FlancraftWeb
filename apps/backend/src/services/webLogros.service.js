const db = require("../models/db");

const REALM_TIMEZONE = "Europe/Madrid";
const REALM_RESET_HOUR = 5;

const REALM_PARTS_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: REALM_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function toInt(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? Math.trunc(num) : fallback;
}

function toSafeMeta(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function isUniqueViolation(error) {
  return String(error?.code || "") === "23505";
}

function getRealmDateParts(date) {
  const parts = REALM_PARTS_FORMATTER.formatToParts(date instanceof Date ? date : new Date(date));
  const map = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      map[part.type] = part.value;
    }
  }

  return {
    year: toInt(map.year, 1970),
    month: toInt(map.month, 1),
    day: toInt(map.day, 1),
    hour: toInt(map.hour, 0),
    minute: toInt(map.minute, 0),
    second: toInt(map.second, 0),
  };
}

function shiftDayKey(dayKey, deltaDays) {
  const base = new Date(`${dayKey}T00:00:00.000Z`);
  base.setUTCDate(base.getUTCDate() + deltaDays);
  return base.toISOString().slice(0, 10);
}

function getRealmCycleKey(dateInput) {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  const parts = getRealmDateParts(date);
  let key = `${parts.year.toString().padStart(4, "0")}-${parts.month.toString().padStart(2, "0")}-${parts.day.toString().padStart(2, "0")}`;

  if (parts.hour < REALM_RESET_HOUR) {
    key = shiftDayKey(key, -1);
  }

  return key;
}

async function fetchUserBase(uuid) {
  try {
    const { data, error } = await db
      .from("usuarios")
      .select("uuid,uid,nivel,xp_actual,created_at")
      .eq("uuid", uuid)
      .maybeSingle();

    if (error) throw error;
    return data || null;
  } catch (error) {
    const { data, error: fallbackError } = await db
      .from("usuarios")
      .select("uuid,uid,nivel,xp_actual")
      .eq("uuid", uuid)
      .maybeSingle();

    if (fallbackError) throw fallbackError;
    if (!data) return null;

    return {
      ...data,
      created_at: null,
    };
  }
}

async function loadDefinitions(types = []) {
  let query = db
    .from("web_logros_definiciones")
    .select("codigo,nombre,descripcion,categoria,tipo,meta,recompensa_wallet,activa,solo_una_vez_global,orden,icono")
    .eq("activa", true)
    .order("orden", { ascending: true })
    .order("codigo", { ascending: true });

  if (Array.isArray(types) && types.length) {
    query = query.in("tipo", [...new Set(types)]);
  }

  const { data, error } = await query;
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

async function fetchTopRankUsers(limit = 10) {
  const safeLimit = Math.max(1, Math.min(toInt(limit, 10), 200));

  const { data, error } = await db
    .from("vista_leaderboard_svpoints")
    .select("uuid,nombre_minecraft,svpoints")
    .order("svpoints", { ascending: false })
    .order("uuid", { ascending: true })
    .limit(safeLimit);

  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

function buildRankingStatus(uuid, topUsers) {
  const index = Array.isArray(topUsers)
    ? topUsers.findIndex((entry) => String(entry?.uuid || "") === String(uuid || ""))
    : -1;

  return {
    posicion_top_10: index >= 0 ? index + 1 : null,
    es_top_1_actual: index === 0,
    es_top_10_actual: index >= 0 && index < 10,
    top_10_uuids: Array.isArray(topUsers) ? topUsers.map((entry) => entry.uuid).filter(Boolean) : [],
  };
}

async function countByUuid(table, field, uuid) {
  const { count, error } = await db
    .from(table)
    .select(field, { count: "exact", head: true })
    .eq(field, uuid);

  if (error) throw error;
  return toInt(count, 0);
}

async function addWalletReward(uuid, amount, codigoLogro, meta) {
  const reward = Math.max(0, toInt(amount, 0));
  if (reward <= 0) return null;

  const { data, error } = await db.rpc("wallet_add", {
    p_uuid: uuid,
    p_amount: reward,
    p_motivo: "web_logro",
    p_fuente: "web_logro",
    p_meta: {
      ...toSafeMeta(meta),
      codigo_logro: codigoLogro,
    },
  });

  if (error) throw error;
  return toInt(data, 0);
}

async function grantAchievement(uuid, definition, options = {}) {
  const scopeKey = options.scopeKey ? String(options.scopeKey).trim() : null;
  const reward = Math.max(0, toInt(definition?.recompensa_wallet, 0));
  const grantMeta = toSafeMeta(options.meta);

  const { data, error } = await db
    .from("web_logros_usuario")
    .insert({
      uuid_jugador: uuid,
      codigo_logro: definition.codigo,
      scope_key: scopeKey,
      recompensa_wallet_snapshot: reward,
      meta: grantMeta,
    })
    .select("id,uuid_jugador,codigo_logro,scope_key,recompensa_wallet_snapshot,meta,otorgado_en")
    .single();

  if (error) {
    if (isUniqueViolation(error)) {
      return {
        granted: false,
        reason: "duplicate",
        code: definition.codigo,
      };
    }

    throw error;
  }

  try {
    const walletBalance = await addWalletReward(uuid, reward, definition.codigo, grantMeta);

    return {
      granted: true,
      code: definition.codigo,
      row: data,
      walletBalance,
    };
  } catch (walletError) {
    await db.from("web_logros_usuario").delete().eq("id", data.id);
    throw walletError;
  }
}

async function evaluateFirstLevelAchievements(uuid, user, definitions, context = {}) {
  const previousLevel = toInt(context.previousLevel, toInt(user?.nivel, 1));
  const currentLevel = toInt(context.currentLevel, toInt(user?.nivel, 1));
  const granted = [];

  for (const definition of definitions) {
    const targetLevel = Math.max(1, toInt(definition?.meta?.level_target, 0));
    if (!targetLevel) continue;
    if (!(previousLevel < targetLevel && currentLevel >= targetLevel)) continue;

    const { data, error } = await db
      .from("web_logros_primeros_nivel")
      .insert({
        uuid_jugador: uuid,
        nivel_objetivo: targetLevel,
      })
      .select("nivel_objetivo,alcanzado_en")
      .single();

    if (error) {
      if (isUniqueViolation(error)) continue;
      throw error;
    }

    const grant = await grantAchievement(uuid, definition, {
      scopeKey: `first_level:${targetLevel}`,
      meta: {
        level_target: targetLevel,
        alcanzado_en: data?.alcanzado_en || new Date().toISOString(),
      },
    });

    if (grant.granted) granted.push(grant);
  }

  return granted;
}

async function evaluateTopRankAchievements(uuid, definitions) {
  const granted = [];
  const topUsers = await fetchTopRankUsers(10);
  const status = buildRankingStatus(uuid, topUsers);

  for (const definition of definitions) {
    const maxRank = Math.max(1, toInt(definition?.meta?.max_rank, 0));
    if (!maxRank) continue;
    if (!status.es_top_10_actual) continue;
    if ((status.posicion_top_10 || 9999) > maxRank) continue;

    const currentRankRow = topUsers.find((entry) => String(entry?.uuid || "") === String(uuid || ""));

    const grant = await grantAchievement(uuid, definition, {
      meta: {
        rank_achieved: status.posicion_top_10,
        ranking_source: "svpoints",
        svpoints: toInt(currentRankRow?.svpoints, 0),
        checked_at: new Date().toISOString(),
      },
    });

    if (grant.granted) granted.push(grant);
  }

  return {
    granted,
    rankingStatus: status,
  };
}

async function evaluateCountAchievements(uuid, definitions, table, field, metaKey) {
  if (!definitions.length) return [];

  const granted = [];
  const count = await countByUuid(table, field, uuid);

  for (const definition of definitions) {
    const required = Math.max(1, toInt(definition?.meta?.[metaKey], 0));
    if (!required) continue;
    if (count < required) continue;

    const grant = await grantAchievement(uuid, definition, {
      meta: {
        [metaKey]: required,
        actual_count: count,
        checked_at: new Date().toISOString(),
      },
    });

    if (grant.granted) granted.push(grant);
  }

  return granted;
}

async function fetchVoteTimes(uuid) {
  const { data, error } = await db
    .from("votos")
    .select("vote_time")
    .eq("user_uuid", uuid)
    .order("vote_time", { ascending: false });

  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

async function calculateCurrentVoteStreak(uuid) {
  const votes = await fetchVoteTimes(uuid);
  if (!votes.length) return 0;

  const uniqueKeys = [];
  const seen = new Set();

  for (const row of votes) {
    if (!row?.vote_time) continue;
    const cycleKey = getRealmCycleKey(row.vote_time);
    if (!seen.has(cycleKey)) {
      seen.add(cycleKey);
      uniqueKeys.push(cycleKey);
    }
  }

  if (!uniqueKeys.length) return 0;

  const currentCycleKey = getRealmCycleKey(new Date());
  const previousCycleKey = shiftDayKey(currentCycleKey, -1);
  const latestKey = uniqueKeys[0];

  if (latestKey !== currentCycleKey && latestKey !== previousCycleKey) {
    return 0;
  }

  let streak = 0;
  let expected = latestKey;

  for (const key of uniqueKeys) {
    if (key !== expected) break;
    streak += 1;
    expected = shiftDayKey(expected, -1);
  }

  return streak;
}

async function evaluateVoteStreakAchievements(uuid, definitions) {
  if (!definitions.length) return [];

  const granted = [];
  const streak = await calculateCurrentVoteStreak(uuid);

  for (const definition of definitions) {
    const required = Math.max(1, toInt(definition?.meta?.streak_required, 0));
    if (!required) continue;
    if (streak < required) continue;

    const grant = await grantAchievement(uuid, definition, {
      meta: {
        streak_required: required,
        actual_streak: streak,
        timezone: REALM_TIMEZONE,
        reset_hour: REALM_RESET_HOUR,
        checked_at: new Date().toISOString(),
      },
    });

    if (grant.granted) granted.push(grant);
  }

  return granted;
}

async function evaluateVeteranAchievements(uuid, user, definitions) {
  if (!definitions.length || !user?.created_at) return [];

  const createdAtMs = new Date(user.created_at).getTime();
  if (!Number.isFinite(createdAtMs)) return [];

  const now = Date.now();
  const elapsedDays = Math.floor((now - createdAtMs) / 86400000);
  const granted = [];

  for (const definition of definitions) {
    const requiredDays = Math.max(1, toInt(definition?.meta?.days_required, 0));
    if (!requiredDays) continue;
    if (elapsedDays < requiredDays) continue;

    const grant = await grantAchievement(uuid, definition, {
      meta: {
        days_required: requiredDays,
        account_age_days: elapsedDays,
        checked_at: new Date().toISOString(),
      },
    });

    if (grant.granted) granted.push(grant);
  }

  return granted;
}

async function evaluateWebAchievementsForUser(uuid, options = {}) {
  const userUuid = String(uuid || "").trim();
  if (!userUuid) {
    return {
      user: null,
      granted: [],
      rankingStatus: null,
    };
  }

  const requestedTypes = Array.isArray(options.types) && options.types.length
    ? [...new Set(options.types.map((item) => String(item || "").trim()).filter(Boolean))]
    : ["first_level", "top_rank", "daily_claim_count", "vote_count", "vote_streak", "account_age_days"];

  const user = await fetchUserBase(userUuid);
  if (!user) {
    return {
      user: null,
      granted: [],
      rankingStatus: null,
    };
  }

  const definitions = await loadDefinitions(requestedTypes);
  const grouped = definitions.reduce((acc, definition) => {
    const key = String(definition?.tipo || "").trim();
    if (!key) return acc;
    if (!acc[key]) acc[key] = [];
    acc[key].push(definition);
    return acc;
  }, {});

  const granted = [];
  let rankingStatus = null;

  if (grouped.first_level?.length) {
    const firstLevelGrants = await evaluateFirstLevelAchievements(userUuid, user, grouped.first_level, options.context || {});
    granted.push(...firstLevelGrants);
  }

  if (grouped.top_rank?.length) {
    const rankResult = await evaluateTopRankAchievements(userUuid, grouped.top_rank);
    granted.push(...rankResult.granted);
    rankingStatus = rankResult.rankingStatus;
  }

  if (grouped.daily_claim_count?.length) {
    const dailyGrants = await evaluateCountAchievements(userUuid, grouped.daily_claim_count, "daily_claims_log", "uuid_jugador", "claims_required");
    granted.push(...dailyGrants);
  }

  if (grouped.vote_count?.length) {
    const voteGrants = await evaluateCountAchievements(userUuid, grouped.vote_count, "votos", "user_uuid", "votes_required");
    granted.push(...voteGrants);
  }

  if (grouped.vote_streak?.length) {
    const streakGrants = await evaluateVoteStreakAchievements(userUuid, grouped.vote_streak);
    granted.push(...streakGrants);
  }

  if (grouped.account_age_days?.length) {
    const veteranGrants = await evaluateVeteranAchievements(userUuid, user, grouped.account_age_days);
    granted.push(...veteranGrants);
  }

  return {
    user,
    granted,
    rankingStatus,
  };
}

async function getWebAchievementsForProfile(uuid) {
  const userUuid = String(uuid || "").trim();
  if (!userUuid) {
    return {
      otorgados: [],
      ranking_actual: {
        posicion_top_10: null,
        es_top_1_actual: false,
        es_top_10_actual: false,
      },
    };
  }

  const { data, error } = await db
    .from("web_logros_usuario")
    .select(`
      codigo_logro,
      recompensa_wallet_snapshot,
      meta,
      otorgado_en,
      web_logros_definiciones!inner(
        codigo,
        nombre,
        descripcion,
        categoria,
        tipo,
        meta,
        recompensa_wallet,
        icono,
        orden
      )
    `)
    .eq("uuid_jugador", userUuid);

  if (error) throw error;

  const topUsers = await fetchTopRankUsers(10);
  const rankingActual = buildRankingStatus(userUuid, topUsers);

  const otorgados = (Array.isArray(data) ? data : [])
    .map((row) => {
      const definition = row.web_logros_definiciones || {};
      return {
        codigo: row.codigo_logro,
        nombre: definition.nombre || row.codigo_logro,
        descripcion: definition.descripcion || "",
        categoria: definition.categoria || null,
        tipo: definition.tipo || null,
        icono: definition.icono || null,
        recompensa_wallet: toInt(row.recompensa_wallet_snapshot, 0),
        meta_definicion: toSafeMeta(definition.meta),
        meta_otorgado: toSafeMeta(row.meta),
        orden: toInt(definition.orden, 9999),
        otorgado_en: row.otorgado_en || null,
      };
    })
    .sort((a, b) => {
      if (a.orden !== b.orden) return a.orden - b.orden;
      const ta = new Date(a.otorgado_en || 0).getTime();
      const tb = new Date(b.otorgado_en || 0).getTime();
      return ta - tb;
    });

  return {
    otorgados,
    ranking_actual: {
      posicion_top_10: rankingActual.posicion_top_10,
      es_top_1_actual: rankingActual.es_top_1_actual,
      es_top_10_actual: rankingActual.es_top_10_actual,
    },
  };
}

async function listWebAchievementsForUser(uuid) {
  const userUuid = String(uuid || "").trim();

  if (!userUuid) {
    return [];
  }

  const definitions = await loadDefinitions([
    "first_level",
    "top_rank",
    "daily_claim_count",
    "vote_count",
    "vote_streak",
    "account_age_days",
  ]);

  const { data, error } = await db
    .from("web_logros_usuario")
    .select("codigo_logro,recompensa_wallet_snapshot,meta,otorgado_en")
    .eq("uuid_jugador", userUuid);

  if (error) throw error;

  const grantsByCode = new Map(
    (Array.isArray(data) ? data : []).map((row) => [row.codigo_logro, row])
  );

  const topUsers = await fetchTopRankUsers(10);
  const rankingActual = buildRankingStatus(userUuid, topUsers);

  return definitions
    .map((definition) => {
      const grant = grantsByCode.get(definition.codigo) || null;
      const isTop1Code = definition.codigo === "top_1_nivel";
      const isTop10Code = definition.codigo === "top_10_nivel";

      return {
        codigo: definition.codigo,
        nombre: definition.nombre,
        descripcion: definition.descripcion,
        categoria: definition.categoria,
        tipo: definition.tipo,
        icono: definition.icono || null,
        orden: toInt(definition.orden, 9999),
        recompensa_wallet: toInt(definition.recompensa_wallet, 0),
        solo_una_vez_global: Boolean(definition.solo_una_vez_global),
        meta_definicion: toSafeMeta(definition.meta),
        meta_otorgado: toSafeMeta(grant?.meta),
        desbloqueado: Boolean(grant),
        otorgado_en: grant?.otorgado_en || null,
        actual_en_ranking: isTop1Code
          ? rankingActual.es_top_1_actual
          : isTop10Code
          ? rankingActual.es_top_10_actual
          : false,
        posicion_actual_ranking: rankingActual.posicion_top_10,
      };
    })
    .sort((a, b) => {
      if (a.orden !== b.orden) return a.orden - b.orden;
      return String(a.nombre || "").localeCompare(String(b.nombre || ""), "es");
    });
}

module.exports = {
  evaluateWebAchievementsForUser,
  getWebAchievementsForProfile,
  listWebAchievementsForUser,
};