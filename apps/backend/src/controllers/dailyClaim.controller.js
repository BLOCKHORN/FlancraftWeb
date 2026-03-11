// src/controllers/dailyClaim.controller.js
const db = require("../models/db");
const { evaluateWebAchievementsForUser } = require("../services/webLogros.service");

const TZ = "Europe/Madrid";
const DEBUG =
  String(process.env.DAILY_CLAIM_DEBUG || "").trim() === "1" ||
  process.env.NODE_ENV !== "production";

// Objetivo mensual TOTAL (Wallet)
const MONTH_TARGET_WALLET = 600;

function num(v, def) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

/**
 * CAP diario duro.
 * - DAILY_CLAIM_HARD_CAP=50  -> nunca más de 50
 */
function getHardCap(lastDay) {
  const forced = num(process.env.DAILY_CLAIM_HARD_CAP, 0);
  if (forced > 0) return Math.max(1, Math.floor(forced));

  const avg = MONTH_TARGET_WALLET / Math.max(1, lastDay);
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
    d: Number(map.day), // 1..31
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
  const { y, m, d } = fmtMadridParts(new Date());
  const baseUTC = new Date(Date.UTC(y, m - 1, d));
  baseUTC.setUTCDate(baseUTC.getUTCDate() + 1);
  return baseUTC.toISOString();
}

// ---- Helpers ----
function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

/**
 * Random sesgado alrededor de un centro, sin salir de [lo, hi]
 */
function pickBiased(lo, hi, center, spreadRatio = 0.35) {
  if (lo >= hi) return lo;

  const range = hi - lo;
  const span = Math.max(1, Math.round(range * spreadRatio));

  const c = Math.round(center);
  const a = Math.max(lo, c - span);
  const b = Math.min(hi, c + span);

  const r = (Math.random() + Math.random()) / 2; // triangular
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
 * Exacto si se puede (sin dump final), con CAP.
 */
function computeTodayAmountExactIfPossible({ totalSoFar, dayOfMonth, lastDay, target, cap }) {
  const daysLeft = lastDay - dayOfMonth + 1;
  const remaining = Math.max(0, target - totalSoFar);
  const spread = num(process.env.DAILY_CLAIM_SPREAD, 0.35);

  if (remaining <= 0) {
    return {
      amount: 1,
      debug: { reason: "already_reached_target", daysLeft, remaining, totalSoFar, target, cap },
    };
  }

  if (daysLeft <= 1) {
    const amount = Math.min(cap, remaining);
    return {
      amount,
      debug: {
        reason: remaining <= cap ? "last_day_exact" : "last_day_capped_not_feasible",
        daysLeft,
        remaining,
        totalSoFar,
        target,
        cap,
      },
    };
  }

  const feasible = remaining <= daysLeft * cap;
  const avgNeeded = remaining / daysLeft;

  if (feasible) {
    const lo = Math.max(1, remaining - (daysLeft - 1) * cap);
    const hi = Math.min(cap, remaining - (daysLeft - 1) * 1);

    if (lo > hi) {
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

  const lo = 1;
  const hi = cap;
  const amount = pickBiased(lo, hi, Math.min(cap, avgNeeded), spread);
  return {
    amount,
    debug: { reason: "not_feasible_no_compensation", daysLeft, remaining, totalSoFar, target, cap, avg: avgNeeded, lo, hi },
  };
}

/**
 * Sumar a wallet (atómico) + ledger
 * Requiere la función SQL public.wallet_add(...)
 */
async function addToWallet({ uuid, amount, meta }) {
  const { data, error } = await db.rpc("wallet_add", {
    p_uuid: uuid,
    p_amount: amount,
    p_motivo: "daily_claim",
    p_fuente: "daily_claim",
    p_meta: meta || {},
  });

  if (error) throw error;
  // Supabase RPC devuelve `data` como el return (balance bigint)
  return Number(data) || 0;
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
      .select("uuid, uid, wallet_coins")
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

    const target = MONTH_TARGET_WALLET;
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
        targetWallet: target,
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

    // ✅ WALLET: sumar coins (atómico) + movimiento
    step = "wallet_add";
    let walletBalance = 0;
    try {
      walletBalance = await addToWallet({
        uuid,
        amount,
        meta: {
          claim_date: today,
          month: `${y}-${String(m).padStart(2, "0")}`,
          hardCap: cap,
        },
      });
    } catch (e) {
      // rollback: si falla wallet, deshacemos el log del claim para no bloquear al user
      await db.from("daily_claims_log").delete().eq("uuid_jugador", uuid).eq("claim_date", today);
      throw e;
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

try {
  await evaluateWebAchievementsForUser(uuid, {
    types: ["daily_claim_count", "account_age_days"],
  });
} catch (webAchievementError) {
  console.error("[WEB LOGROS DAILY CLAIM EVAL ERROR]", {
    uuid,
    message: webAchievementError?.message || String(webAchievementError),
  });
}

return res.status(200).json({
      message: "Recompensa diaria añadida a tu Wallet.",
      amount,
      walletBalance,
      nextClaimAt: nextMidnightMadridISO(),
      monthTargetWallet: target,
      monthSoFarWallet: totalSoFar + amount,
      dayIndex: nuevoStreak,
      debug: DEBUG
        ? { today, firstISO, nextISO, lastDay, dayOfMonth, totalSoFar, daysClaimed, cap, calc: debug }
        : undefined,
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

    step = "wallet_balance";
    const { data: u, error: errU } = await db
      .from("usuarios")
      .select("wallet_coins")
      .eq("uuid", uuid)
      .maybeSingle();

    if (errU) throw errU;

    step = "month_meta";
    const { firstISO, nextISO, lastDay, dayOfMonth } = monthMetaMadrid(new Date());

    step = "month_sum";
    const { total: monthSoFar, daysClaimed } = await getMonthSum(uuid, firstISO, nextISO);

    const cap = getHardCap(lastDay);

    const daysLeft = lastDay - dayOfMonth + 1;
    const remaining = Math.max(0, MONTH_TARGET_WALLET - monthSoFar);
    const feasibleToCloseExact = remaining <= daysLeft * cap;

    return res.status(200).json({
      claimedToday: !!hoyRow,
      lastAmount: hoyRow?.amount ?? null,
      nextClaimAt: nextMidnightMadridISO(),
      monthSoFarWallet: monthSoFar,
      daysClaimed,
      monthTargetWallet: MONTH_TARGET_WALLET,
      dailyHardCap: cap,
      feasibleToCloseExact,
      walletBalance: Number(u?.wallet_coins) || 0,
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
