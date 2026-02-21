const db = require("../models/db");

const safeNum = (v, def = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

const safeText = (v) => {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s ? s : null;
};

const normalizeMetersToKm = (v) => {
  const n = safeNum(v, 0);
  if (n > 5000) return n / 1000;
  return n;
};

const log10p1 = (v) => Math.log10(1 + Math.max(0, safeNum(v)));
const sqrtp = (v) => Math.sqrt(Math.max(0, safeNum(v)));

const fetchWebUser = async (uuid) => {
  try {
    const { data, error } = await db
      .from("usuarios")
      .select("rango_usuario,nivel,xp_actual,wallet_coins,es_premium")
      .eq("uuid", uuid)
      .maybeSingle();

    if (error) return null;
    return data || null;
  } catch {
    return null;
  }
};

const GENS_LIMITS = {
  MAX_GENS: 180,
  MAX_GEN_PRICE: 1_000_000_000,
  MAX_ISLAND_VALUE: 180_000_000_000,
};

function computeGensScore(p) {
  const coinsTotal = log10p1(safeNum(p?.coins_ganadas_total));
  const moneyTotal = log10p1(safeNum(p?.dinero_ganado_total));

  const gensValueRaw = safeNum(p?.gens_value_total);
  const gensValue = log10p1(Math.min(GENS_LIMITS.MAX_ISLAND_VALUE, Math.max(0, gensValueRaw)));

  const incomeRaw = safeNum(p?.gens_income_h);
  const incomeH = log10p1(Math.min(GENS_LIMITS.MAX_ISLAND_VALUE, Math.max(0, incomeRaw)));

  const tierRaw = safeNum(p?.gens_highest_tier);
  const maxTier = log10p1(Math.min(GENS_LIMITS.MAX_GEN_PRICE, Math.max(0, tierRaw)));

  const hours = safeNum(p?.tiempo_jugado) / 3600;
  const time = sqrtp(Math.min(160, Math.max(0, hours)));

  const lvl = Math.max(0, safeNum(p?.nivel));

  const w = { coins: 420, money: 260, value: 460, income: 360, tier: 220, time: 85, lvl: 120 };

  const score =
    coinsTotal * w.coins +
    moneyTotal * w.money +
    gensValue * w.value +
    incomeH * w.income +
    maxTier * w.tier +
    time * w.time +
    lvl * w.lvl;

  return Math.max(0, Math.round(score));
}

const GENS_VALOR_TIERS = [
  { min: 0, name: "Chatarra" },
  { min: 25_000_000, name: "Taller" },
  { min: 100_000_000, name: "Fábrica" },
  { min: 300_000_000, name: "Planta" },
  { min: 1_000_000_000, name: "Industria" },
  { min: 3_000_000_000, name: "Consorcio" },
  { min: 10_000_000_000, name: "Magnate" },
  { min: 25_000_000_000, name: "Imperio" },
  { min: 60_000_000_000, name: "Dinastía" },
  { min: 120_000_000_000, name: "Leyenda" },
  { min: GENS_LIMITS.MAX_ISLAND_VALUE, name: "Mítico" },
];

function getGensValorTierInfo(valor) {
  const vRaw = safeNum(valor);
  const v = Math.max(0, Math.min(GENS_LIMITS.MAX_ISLAND_VALUE, Math.floor(vRaw)));

  let idx = 0;
  for (let i = 0; i < GENS_VALOR_TIERS.length; i++) {
    if (v >= GENS_VALOR_TIERS[i].min) idx = i;
    else break;
  }

  const cur = GENS_VALOR_TIERS[idx];
  const next = GENS_VALOR_TIERS[idx + 1] || null;

  const curMin = cur?.min ?? 0;
  const nextMin = next?.min ?? null;

  let pct = 100;
  let left = 0;

  if (nextMin != null && nextMin > curMin) {
    const span = nextMin - curMin;
    const pos = Math.min(span, Math.max(0, v - curMin));
    pct = Math.round((pos / span) * 100);
    left = Math.max(0, nextMin - v);
  }

  return {
    idx,
    name: cur?.name || "—",
    value: v,
    curMin,
    nextMin,
    nextName: next?.name || null,
    pct,
    left,
    max: GENS_LIMITS.MAX_ISLAND_VALUE,
  };
}

const fetchViewPoints = async (viewName, uuid, fieldCandidates) => {
  try {
    const { data, error } = await db.from(viewName).select("*").eq("uuid", uuid).maybeSingle();
    if (error || !data) return null;

    for (const k of fieldCandidates) {
      const v = data?.[k];
      if (v !== null && v !== undefined && v !== "") return safeNum(v, 0);
    }
    return null;
  } catch {
    return null;
  }
};

const fetchPointsAll = async (uuid) => {
  const [genpoints, svpoints, obpoints, anpoints, pkpoints, network_points] = await Promise.all([
    fetchViewPoints("vista_leaderboard_genspoints", uuid, ["genpoints", "genspoints", "points"]),
    fetchViewPoints("vista_leaderboard_svpoints", uuid, ["svpoints", "points"]),
    fetchViewPoints("vista_leaderboard_obpoints", uuid, ["obpoints", "points"]),
    fetchViewPoints("vista_leaderboard_anpoints", uuid, ["anpoints", "points"]),
    fetchViewPoints("vista_leaderboard_pkpoints", uuid, ["pkpoints", "points"]),
    fetchViewPoints("vista_leaderboard_network_points", uuid, ["network_points", "points"]),
  ]);

  return { genpoints, svpoints, obpoints, anpoints, pkpoints, network_points };
};

function shapeServerRow(row, points = null) {
  if (!row) return null;

  const servidor = String(row.servidor || "").toLowerCase();
  const updatedAt = row.ultima_actualizacion || null;

  const tiempo = safeNum(row.tiempo_jugado);
  const walkKm = normalizeMetersToKm(row.distancia_caminada);
  const flyKm = normalizeMetersToKm(row.distancia_volada);

  const general = {
    tiempo_jugado: tiempo,
    bloques_minados: safeNum(row.bloques_minados),
    bloques_colocados: safeNum(row.bloques_colocados),
    saltos: safeNum(row.saltos),
    caminar: walkKm,
    walk_km: walkKm,
    volar: flyKm,
    fly_km: flyKm,
  };

  const combate = {
    mobs_matados: safeNum(row.mobs_matados),
    kills_pvp: safeNum(row.kills_pvp),
    muertes: safeNum(row.muertes),
    muertes_pvp: row.muertes_pvp == null ? null : safeNum(row.muertes_pvp),
    killstreak_max: row.killstreak_max == null ? null : safeNum(row.killstreak_max),
    dano_infligido: safeNum(row.dano_infligido),
    dano_recibido: safeNum(row.dano_recibido),
  };

  const recursos = {
    diamantes: safeNum(row.diamantes_minados),
    hierro: safeNum(row.hierro_minado),
    oro: safeNum(row.oro_minado),
    esmeraldas: safeNum(row.esmeraldas_minadas),
    cultivos: safeNum(row.cultivos_cosechados),
    pesca: safeNum(row.peces_pescados),
  };

  const economiaBase = {
    dinero: row.dinero == null ? null : safeNum(row.dinero),
    dinero_ganado_total: row.dinero_ganado_total == null ? null : safeNum(row.dinero_ganado_total),
    coins: row.coins_balance == null ? null : safeNum(row.coins_balance),
    coins_ganadas_total: row.coins_ganadas_total == null ? null : safeNum(row.coins_ganadas_total),
    nivel: row.nivel == null ? null : safeNum(row.nivel),
  };

  const resumen = {
    tiempo_jugado: tiempo,
    dinero: economiaBase.dinero,
    coins: economiaBase.coins,
  };

  const payload = {
    servidor,
    updated_at: updatedAt,
    resumen,
    general,
    combate,
    recursos,
    economia: economiaBase,
  };

  if (servidor === "gens") {
    const genpointsFromView = points?.genpoints ?? points?.genspoints ?? null;
    const genspoints = genpointsFromView != null ? safeNum(genpointsFromView, 0) : computeGensScore(row);

    const valorIsla = row.gens_value_total == null ? null : safeNum(row.gens_value_total);
    const incomeH = row.gens_income_h == null ? null : safeNum(row.gens_income_h);
    const tierMax = row.gens_highest_tier == null ? null : safeNum(row.gens_highest_tier);

    const info = getGensValorTierInfo(valorIsla || 0);
    const isla = {
      tier: info.idx + 1,
      etapa: info.name,
      valor: info.value,
      siguiente: info.nextName,
      falta: info.left,
      progreso_pct: info.pct,
      income_h: incomeH,
      tier_max: tierMax,
    };

    payload.resumen.genpoints = genspoints;
    payload.resumen.genspoints = genspoints;
    payload.resumen.points = genspoints;
    payload.resumen.valor_isla = valorIsla;

    payload.economia = {
      ...payload.economia,
      genpoints: genspoints,
      genspoints,
      points: genspoints,
      valor_isla: valorIsla,
      income_h: incomeH,
      tier_max: tierMax,
      gens_en_isla: row.gens_owned == null ? null : safeNum(row.gens_owned),
      upgrades_comprados: row.upgrades_comprados == null ? null : safeNum(row.upgrades_comprados),
      prestigios: row.prestigios == null ? null : safeNum(row.prestigios),
      gens_highest_tier: tierMax,
      gens_value_total: valorIsla,
      gens_income_h: incomeH,
    };

    payload.isla = isla;
    payload.valor_isla_detalle = isla;
  }

  if (servidor === "survival") {
    const svp = points?.svpoints;
    if (svp != null) {
      const v = safeNum(svp, 0);
      payload.resumen.svpoints = v;
      payload.resumen.points = v;
      payload.economia.svpoints = v;
      payload.economia.points = v;
    }
  }

  if (servidor === "oneblock") {
    const obp = points?.obpoints;
    if (obp != null) {
      const v = safeNum(obp, 0);
      payload.resumen.obpoints = v;
      payload.resumen.points = v;
      payload.economia.obpoints = v;
      payload.economia.points = v;
    }

    payload.isla = {
      island_level: row.island_level == null ? null : safeNum(row.island_level),
      oneblock_blocks_broken: row.oneblock_blocks_broken == null ? null : safeNum(row.oneblock_blocks_broken),
      phase_actual: row.phase_actual == null ? null : safeNum(row.phase_actual),
      phase_nombre: safeText(row.phase_nombre),
      challenges_completados: row.challenges_completados == null ? null : safeNum(row.challenges_completados),
    };
  }

  if (servidor === "anarquico") {
    const anp = points?.anpoints;
    if (anp != null) {
      const v = safeNum(anp, 0);
      payload.resumen.anpoints = v;
      payload.resumen.points = v;
      payload.economia.anpoints = v;
      payload.economia.points = v;
    }

    const kills = safeNum(row.kills_pvp);
    const deaths = row.muertes_pvp == null ? safeNum(row.muertes) : safeNum(row.muertes_pvp);
    const kdr = deaths > 0 ? Number((kills / deaths).toFixed(2)) : kills > 0 ? kills : 0;
    payload.combate.kdr = kdr;
  }

  if (servidor === "parkour") {
    const pkp = points?.pkpoints;
    if (pkp != null) {
      const v = safeNum(pkp, 0);
      payload.resumen.pkpoints = v;
      payload.resumen.points = v;
      payload.economia.pkpoints = v;
      payload.economia.points = v;
    }

    payload.parkour = {
      mejor_tiempo: row.mejor_tiempo == null ? null : safeNum(row.mejor_tiempo),
      completadas_total: row.completadas_total == null ? null : safeNum(row.completadas_total),
      perfect_runs: row.perfect_runs == null ? null : safeNum(row.perfect_runs),
      falls: row.falls == null ? null : safeNum(row.falls),
      medallas_ganadas: row.medallas_ganadas == null ? null : safeNum(row.medallas_ganadas),
      racha_dias: row.racha_dias == null ? null : safeNum(row.racha_dias),
    };
  }

  return payload;
}

function pickActiveServer(serversMap) {
  if (!serversMap) return "gens";
  if (serversMap.gens) return "gens";
  if (serversMap.oneblock) return "oneblock";
  if (serversMap.survival) return "survival";
  const keys = Object.keys(serversMap);
  return keys[0] || "gens";
}

const sumPointsFrom = (serversMap, pointsObj) => {
  const has = (k) => !!serversMap?.[k];
  const n0 = (v) => (v == null ? 0 : safeNum(v, 0));

  let total = 0;

  if (has("gens")) {
    const fromView = pointsObj?.genpoints ?? pointsObj?.genspoints;
    if (fromView != null) total += n0(fromView);
    else total += n0(serversMap?.gens?.resumen?.genspoints ?? serversMap?.gens?.economia?.genspoints);
  }

  if (has("survival")) total += n0(pointsObj?.svpoints);
  if (has("oneblock")) total += n0(pointsObj?.obpoints);
  if (has("anarquico")) total += n0(pointsObj?.anpoints);
  if (has("parkour")) total += n0(pointsObj?.pkpoints);

  return total;
};

exports.obtenerPerfilPorNombre = async (req, res) => {
  const { nombre } = req.params;
  const name = String(nombre || "").trim();
  if (!name) return res.status(400).json({ error: "Falta nombre en la ruta." });

  const { data: rowsByName, error: err1 } = await db
    .from("estadisticas_agrupadas")
    .select("*")
    .ilike("nombre_minecraft", name);

  if (err1) {
    console.error("[Perfil] Error buscando por nombre:", err1.message);
    return res.status(500).json({ error: "Error al buscar jugador." });
  }

  if (!rowsByName || rowsByName.length === 0) {
    return res.status(404).json({ error: "Jugador no encontrado." });
  }

  const sorted = [...rowsByName].sort((a, b) => {
    const ta = new Date(a?.ultima_actualizacion || 0).getTime();
    const tb = new Date(b?.ultima_actualizacion || 0).getTime();
    return tb - ta;
  });

  const uuid = sorted[0]?.uuid;
  if (!uuid) return res.status(404).json({ error: "Jugador no encontrado." });

  const { data: rows, error: err2 } = await db
    .from("estadisticas_agrupadas")
    .select("*")
    .eq("uuid", uuid);

  if (err2) {
    console.error("[Perfil] Error buscando por uuid:", err2.message);
    return res.status(500).json({ error: "Error al cargar perfil." });
  }

  const pointsAll = await fetchPointsAll(uuid);

  const servidores = {};
  let tiempoTotal = 0;
  let killsTotal = 0;

  for (const r of rows || []) {
    const srv = String(r?.servidor || "").toLowerCase();
    if (!srv || srv === "desconocido" || srv === "unknown") continue;

    tiempoTotal += safeNum(r?.tiempo_jugado);
    killsTotal += safeNum(r?.kills_pvp);

    servidores[srv] = shapeServerRow(r, pointsAll);
  }

  const servidor_activo = pickActiveServer(servidores);

  const latestRow = sorted[0] || null;
  const nivelGlobal = (() => {
    if (servidores?.gens?.economia?.nivel != null) return servidores.gens.economia.nivel;
    let best = null;
    for (const k of Object.keys(servidores)) {
      const n = servidores[k]?.economia?.nivel;
      if (n != null) best = best == null ? n : Math.max(best, n);
    }
    return best;
  })();

  const webUser = await fetchWebUser(uuid);

  const jugador = {
    uuid,
    nombre_minecraft: safeText(latestRow?.nombre_minecraft) || name,
    plataforma: safeText(latestRow?.plataforma),
    rango_usuario: webUser?.rango_usuario ?? null,
    nivel: webUser?.nivel ?? nivelGlobal,
    xp_actual: webUser?.xp_actual ?? null,
    wallet_coins: webUser?.wallet_coins == null ? null : safeNum(webUser.wallet_coins, 0),
    es_premium: webUser?.es_premium ?? null,
    xp_necesaria: null,
    actualizado: latestRow?.ultima_actualizacion || null,
  };

  const totales = {
    points_total: sumPointsFrom(servidores, pointsAll),
    tiempo_jugado_total: tiempoTotal,
    kills_pvp_total: killsTotal,
    wallet_coins: jugador.wallet_coins,
    points: {
      genpoints: pointsAll?.genpoints ?? null,
      svpoints: pointsAll?.svpoints ?? null,
      obpoints: pointsAll?.obpoints ?? null,
      anpoints: pointsAll?.anpoints ?? null,
      pkpoints: pointsAll?.pkpoints ?? null,
      network_points: pointsAll?.network_points ?? null,
    },
  };

  return res.json({
    jugador,
    servidores,
    servidor_activo,
    totales,
  });
};

exports.obtenerPerfilServidor = async (req, res) => {
  const { uuid, servidor } = req.params;
  const id = String(uuid || "").trim();
  const srv = String(servidor || "").trim().toLowerCase();

  if (!id) return res.status(400).json({ error: "Falta uuid en la ruta." });
  if (!srv) return res.status(400).json({ error: "Falta servidor en la ruta." });

  const { data: row, error } = await db
    .from("estadisticas_agrupadas")
    .select("*")
    .eq("uuid", id)
    .eq("servidor", srv)
    .maybeSingle();

  if (error) {
    console.error("[Perfil] Error cargando servidor:", error.message);
    return res.status(500).json({ error: "Error al cargar servidor." });
  }

  if (!row) return res.status(404).json({ error: "Servidor no encontrado para este jugador." });

  const pointsAll = await fetchPointsAll(id);
  return res.json(shapeServerRow(row, pointsAll));
};
