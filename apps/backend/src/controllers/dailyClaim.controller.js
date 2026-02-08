// src/controllers/dailyClaim.controller.js
const db = require("../models/db");

const TZ = "Europe/Madrid";
const DEBUG = String(process.env.DAILY_CLAIM_DEBUG || "").trim() === "1" || process.env.NODE_ENV !== "production";

// Objetivo mensual POR SERVIDOR
const MONTH_TARGET_PER_SERVER = 600;

// Servidores a los que se entrega siempre
const SERVIDORES = ["oneblock", "gens"];

function num(v, def) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

/**
 * CAP diario "no se pasa de la raya".
 * Puedes dejarlo automático o forzarlo con env:
 * - DAILY_CLAIM_HARD_CAP=50  -> nunca más de 50
 */
function getHardCap(lastDay) {
  const forced = num(process.env.DAILY_CLAIM_HARD_CAP, 0);
  if (forced > 0) return Math.max(1, Math.floor(forced));

  // Auto: promedio mensual * multiplicador, con límites globales.
  const avg = MONTH_TARGET_PER_SERVER / Math.max(1, lastDay);
  const mult = num(process.env.DAILY_CLAIM_CAP_MULT, 2.2);
  const minCap = num(process.env.DAILY_CLAIM_MIN_CAP, 20);
  const maxCap = num(process.env.DAILY_CLAIM_MAX_CAP, 80);

  const cap = Math.round(avg * mult);
  return Math.max(1, Math.max(minCap, Math.min(maxCap, cap)));
}

// ---- Fechas Madrid seguras ----
function fmtMadridParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const map = {};
  for (const p of parts) map[p.type] = p.value;

  return {
    y: Number(map.year),
    m: Number(map.month), // 1..12
    d: Number(map.day),   // 1..31
  };
}

function madridDayKey(date = new Date()) {
  const { y, m, d } = fmtMadridParts(date);
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function monthMetaMadrid(date = new Date()) {
  const { y, m, d } = fmtMadridParts(date); // m 1..12
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate(); // último día del mes m
  const firstISO = `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-01`;

  const nextY = m === 12 ? y + 1 : y;
  const nextM = m === 12 ? 1 : m + 1;
  const nextISO = `${String(nextY).padStart(4, "0")}-${String(nextM).padStart(2, "0")}-01`;

  return { y, m, dayOfMonth: d, lastDay, firstISO, nextISO };
}

function nextMidnightMadridISO() {
  // Visual: mañana 00:00 (aprox). El control real es claim_date (Madrid).
  const { y, m, d } = fmtMadridParts(new Date());
  const baseUTC = new Date(Date.UTC(y, m - 1, d));
  baseUTC.setUTCDate(baseUTC.getUTCDate() + 1);
  return baseUTC.toISOString();
}

// ---- Helpers ----
function randomInt(min, max) {
  const a = Math.ceil(min);
  const b = Math.floor(max);
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

/**
 * Random "sesgado" alrededor de un centro, sin salir de [lo, hi]
 * Usa spreadRatio para acotar variación alrededor del avg.
 */
function pickBiased(lo, hi, center, spreadRatio = 0.35) {
  if (lo >= hi) return lo;

  const range = hi - lo;
  const span = Math.max(1, Math.round(range * spreadRatio));

  const c = Math.round(center);
  const a = Math.max(lo, c - span);
  const b = Math.min(hi, c + span);

  // triangular distribution (más probabilidad cerca del centro)
  const r = (Math.random() + Math.random()) / 2; // 0..1
  const val = Math.round(a + r * (b - a));
  return Math.max(lo, Math.min(hi, val));
}

async function getMonthSum(uuid, firstISO, nextISO) {
  const { data, error } = await db
    .from("daily_claims_log")
    .select("amount")
    .eq("uuid_jugador", uuid)
    .gte("claim_date", firstISO)
    .lt("claim_date", nextISO);

  if (error) throw error;

  const total = (data || []).reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
  const daysClaimed = (data || []).length;
  return { total, daysClaimed };
}

/**
 * Exacto si se puede, sin "dump" final:
 *
 * - CAP diario duro: nunca se pasa.
 * - Si remaining es alcanzable con daysLeft * cap:
 *     elegimos amount en un rango [lo, hi] que GARANTIZA que el resto de días
 *     (dando como máximo cap y como mínimo 1) puede cerrar exacto.
 * - Si NO es alcanzable (no fue constante): no compensamos -> damos normal (1..cap)
 *
 * Último día:
 * - Si remaining <= cap -> se da remaining (cierre exacto)
 * - Si remaining > cap -> se da cap y no se llega (por no constancia / imposible)
 */
function computeTodayAmountExactIfPossible({ totalSoFar, dayOfMonth, lastDay, target, cap }) {
  const daysLeft = lastDay - dayOfMonth + 1;
  const remaining = Math.max(0, target - totalSoFar);
  const spread = num(process.env.DAILY_CLAIM_SPREAD, 0.35);

  // Si ya llegó (o se pasó por pruebas), no inflamos: damos 1 (o 0 si quieres)
  if (remaining <= 0) {
    return {
      amount: 1,
      debug: { reason: "already_reached_target", daysLeft, remaining, totalSoFar, target, cap },
    };
  }

  // Último día: cierre exacto si cabe en cap, si no, cap y ya está
  if (daysLeft <= 1) {
    const amount = Math.min(cap, remaining);
    return {
      amount,
      debug: { reason: remaining <= cap ? "last_day_exact" : "last_day_capped_not_feasible", daysLeft, remaining, totalSoFar, target, cap },
    };
  }

  // ¿Es posible llegar al target con lo que queda sin pasar el cap?
  const feasible = remaining <= daysLeft * cap;

  // Centro = promedio necesario
  const avgNeeded = remaining / daysLeft;

  if (feasible) {
    // Rango que garantiza cierre exacto en los días restantes:
    // mínimo hoy para que el resto no tenga que superar cap
    const lo = Math.max(1, remaining - (daysLeft - 1) * cap);
    // máximo hoy para que el resto al menos con 1 por día pueda completar exacto
    const hi = Math.min(cap, remaining - (daysLeft - 1) * 1);

    if (lo > hi) {
      // raro, pero por seguridad: caemos a algo estable
      const amount = Math.min(cap, Math.max(1, Math.round(avgNeeded)));
      return {
        amount,
        debug: { reason: "feasible_but_bounds_invalid_fallback", daysLeft, remaining, totalSoFar, target, cap, avg: avgNeeded, lo, hi },
      };
    }

    const amount = pickBiased(lo, hi, avgNeeded, spread);
    return {
      amount,
      debug: { reason: "exact_feasible", daysLeft, remaining, totalSoFar, target, cap, avg: avgNeeded, lo, hi },
    };
  }

  // NOT FEASIBLE: el jugador no fue constante o ya es imposible cerrar sin superar cap.
  // No compensamos. Damos algo razonable 1..cap (sesgado a avg, pero limitado).
  const lo = 1;
  const hi = cap;
  const amount = pickBiased(lo, hi, Math.min(cap, avgNeeded), spread);
  return {
    amount,
    debug: { reason: "not_feasible_no_compensation", daysLeft, remaining, totalSoFar, target, cap, avg: avgNeeded, lo, hi },
  };
}

// POST /api/daily-claim
exports.claimDaily = async (req, res) => {
  let step = "start";
  try {
    const uuid = req.usuario?.uuid;
    if (!uuid) return res.status(401).json({ error: "No autorizado." });

    step = "today_key";
    const today = madridDayKey(new Date());

    step = "fetch_usuario";
    const { data: jugador, error: errJugador } = await db
      .from("usuarios")
      .select("uuid, uid")
      .eq("uuid", uuid)
      .maybeSingle();

    if (errJugador) throw errJugador;
    if (!jugador) return res.status(404).json({ error: "Jugador no encontrado." });
    if (!jugador.uid) return res.status(400).json({ error: "Usuario no vinculado correctamente." });

    step = "check_claim_today";
    const { data: yaHoy, error: errYa } = await db
      .from("daily_claims_log")
      .select("amount")
      .eq("uuid_jugador", uuid)
      .eq("claim_date", today)
      .maybeSingle();

    if (errYa) throw errYa;

    if (yaHoy) {
      return res.status(429).json({
        error: "Ya has reclamado tu recompensa de hoy.",
        nextClaimAt: nextMidnightMadridISO(),
      });
    }

    step = "month_meta";
    const { firstISO, nextISO, lastDay, dayOfMonth, y, m } = monthMetaMadrid(new Date());

    step = "month_sum";
    const { total: totalSoFar, daysClaimed } = await getMonthSum(uuid, firstISO, nextISO);

    const target = MONTH_TARGET_PER_SERVER;
    const cap = getHardCap(lastDay);

    step = "compute_amount";
    const { amount, debug } = computeTodayAmountExactIfPossible({
      totalSoFar,
      dayOfMonth,
      lastDay,
      target,
      cap,
    });

    if (DEBUG) {
      console.log("[DAILY_CLAIM DEBUG]", {
        uuid,
        today,
        month: `${y}-${String(m).padStart(2, "0")}`,
        firstISO,
        nextISO,
        dayOfMonth,
        lastDay,
        targetPerServer: target,
        hardCap: cap,
        sum: { totalSoFar, daysClaimed },
        calc: debug,
        playerUid: jugador.uid,
      });
    }

    step = "insert_daily_claims_log";
    const { error: errInsert } = await db
      .from("daily_claims_log")
      .insert({ uuid_jugador: uuid, claim_date: today, amount });

    if (errInsert) {
      const msg = String(errInsert.message || "").toLowerCase();
      if (msg.includes("duplicate") || msg.includes("unique")) {
        return res.status(429).json({
          error: "Ya has reclamado tu recompensa de hoy.",
          nextClaimAt: nextMidnightMadridISO(),
        });
      }
      throw errInsert;
    }

    step = "insert_comandos_pendientes";
    const player = jugador.uid;
    const cmd = `coins give ${player} ${amount}`;
    const servidores = SERVIDORES;

    const { error: errCmds } = await db.from("comandos_pendientes").insert(
      servidores.map((s) => ({
        uuid_jugador: String(uuid), // TEXT en tabla
        nombre_jugador: player,
        comando: cmd,
        servidor: s,
      }))
    );

    if (errCmds) {
      // Rollback: si falla comandos, eliminamos el claim del día para no bloquear al user
      await db.from("daily_claims_log").delete().eq("uuid_jugador", uuid).eq("claim_date", today);
      throw errCmds;
    }

    step = "upsert_daily_claims";
    const nuevoStreak = (daysClaimed || 0) + 1;
    const nowISO = new Date().toISOString();

    const { error: errUpsert } = await db
      .from("daily_claims")
      .upsert(
        {
          uuid_jugador: uuid,
          last_claim_at: nowISO,
          last_amount: amount,
          streak: nuevoStreak,
          updated_at: nowISO,
        },
        { onConflict: "uuid_jugador" }
      );

    if (errUpsert) throw errUpsert;

    return res.status(200).json({
      message: "Recompensa diaria registrada.",
      amount,
      servers: servidores,
      nextClaimAt: nextMidnightMadridISO(),
      monthTargetPerServer: target,
      monthSoFarPerServer: totalSoFar + amount,
      dayIndex: nuevoStreak,
      debug: DEBUG ? { today, firstISO, nextISO, lastDay, dayOfMonth, totalSoFar, daysClaimed, cap, calc: debug } : undefined,
    });
  } catch (err) {
    console.error("[DAILY CLAIM ERROR]", { step, err });

    return res.status(500).json({
      error: "Error interno al reclamar recompensa diaria.",
      step,
      details: err?.message || String(err),
      code: err?.code || null,
      hint: err?.hint || null,
      where: err?.details || null,
    });
  }
};

// GET /api/daily-claim/status
exports.getDailyStatus = async (req, res) => {
  let step = "start";
  try {
    const uuid = req.usuario?.uuid;
    if (!uuid) return res.status(401).json({ error: "No autorizado." });

    step = "today_key";
    const today = madridDayKey(new Date());

    step = "fetch_today_log";
    const { data: hoyRow, error: errHoy } = await db
      .from("daily_claims_log")
      .select("amount, created_at")
      .eq("uuid_jugador", uuid)
      .eq("claim_date", today)
      .maybeSingle();

    if (errHoy) throw errHoy;

    step = "month_meta";
    const { firstISO, nextISO, lastDay, dayOfMonth } = monthMetaMadrid(new Date());

    step = "month_sum";
    const { total: monthSoFar, daysClaimed } = await getMonthSum(uuid, firstISO, nextISO);

    const cap = getHardCap(lastDay);

    // Info útil (opcional) para UI: si aún es posible llegar exacto sin dump
    const daysLeft = lastDay - dayOfMonth + 1;
    const remaining = Math.max(0, MONTH_TARGET_PER_SERVER - monthSoFar);
    const feasibleToCloseExact = remaining <= daysLeft * cap;

    return res.status(200).json({
      claimedToday: !!hoyRow,
      lastAmount: hoyRow?.amount ?? null,
      nextClaimAt: nextMidnightMadridISO(),
      monthSoFarPerServer: monthSoFar,
      daysClaimed,
      monthTargetPerServer: MONTH_TARGET_PER_SERVER,
      dailyHardCap: cap,
      feasibleToCloseExact,
      debug: DEBUG ? { today, firstISO, nextISO, cap, remaining, daysLeft } : undefined,
    });
  } catch (err) {
    console.error("[DAILY STATUS ERROR]", { step, err });

    return res.status(500).json({
      error: "Error interno al obtener estado diario.",
      step,
      details: err?.message || String(err),
      code: err?.code || null,
      hint: err?.hint || null,
      where: err?.details || null,
    });
  }
};
