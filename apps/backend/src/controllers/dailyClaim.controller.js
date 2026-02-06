// src/controllers/dailyClaim.controller.js
const db = require("../models/db");

function getMadridDayKey(date = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(date); // YYYY-MM-DD
}

function getMadridNowDate() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Madrid" }));
}

function getMonthMetaMadrid() {
  const now = getMadridNowDate();
  const y = now.getFullYear();
  const m = now.getMonth(); // 0..11

  const firstUTC = new Date(Date.UTC(y, m, 1));
  const nextUTC = new Date(Date.UTC(y, m + 1, 1));
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

  return {
    firstISO: firstUTC.toISOString().slice(0, 10),
    nextISO: nextUTC.toISOString().slice(0, 10),
    lastDay,
    dayOfMonth: now.getDate(),
  };
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function nextMidnightMadridISO() {
  const nowMadrid = getMadridNowDate();
  const next = new Date(nowMadrid);
  next.setHours(24, 0, 0, 0);
  return next.toISOString();
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

function computeTodayAmount({ totalSoFar, dayOfMonth, lastDay, target, min, max }) {
  const daysLeft = (lastDay - dayOfMonth) + 1; // contando hoy
  const remaining = target - totalSoFar;

  const low = Math.max(min, remaining - (daysLeft - 1) * max);
  const high = Math.min(max, remaining - (daysLeft - 1) * min);

  if (low > high) return null;
  return randomInt(low, high);
}

// POST /api/daily-claim
exports.claimDaily = async (req, res) => {
  try {
    const uuid = req.usuario?.uuid;
    if (!uuid) return res.status(401).json({ error: "No autorizado." });

    const today = getMadridDayKey(new Date());

    // 1) Jugador
    const { data: jugador, error: errJugador } = await db
      .from("usuarios")
      .select("uuid, uid")
      .eq("uuid", uuid)
      .maybeSingle();

    if (errJugador) throw errJugador;
    if (!jugador) return res.status(404).json({ error: "Jugador no encontrado." });
    if (!jugador.uid) return res.status(400).json({ error: "Usuario no vinculado correctamente." });

    // 2) Ya reclamado hoy? (historial)
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

    // 3) Objetivo mensual y límites
    const TARGET = Number(process.env.DAILY_CLAIM_MONTH_TARGET || 800);
    const MIN = Number(process.env.DAILY_CLAIM_MIN || 10);
    const MAX = Number(process.env.DAILY_CLAIM_MAX || 35);

    // 4) Suma del mes (historial)
    const { firstISO, nextISO, lastDay, dayOfMonth } = getMonthMetaMadrid();
    const { total: totalSoFar, daysClaimed } = await getMonthSum(uuid, firstISO, nextISO);

    const amount = computeTodayAmount({
      totalSoFar,
      dayOfMonth,
      lastDay,
      target: TARGET,
      min: MIN,
      max: MAX,
    });

    if (amount === null) {
      return res.status(500).json({
        error: "Configuración inválida del claim mensual (rango imposible).",
      });
    }

    // 5) Insert del día en historial (PK evita doble claim real)
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

    // 6) Comandos pendientes (oneblock + gens)
    const player = jugador.uid;
    const cmd = `coins give ${player} ${amount}`;
    const servidores = ["oneblock", "gens"];

    const { error: errCmds } = await db
      .from("comandos_pendientes")
      .insert(
        servidores.map((s) => ({
          uuid_jugador: uuid,
          nombre_jugador: player,
          comando: cmd,
          servidor: s,
        }))
      );

    if (errCmds) throw errCmds;

    // 7) Upsert estado resumen (tu tabla daily_claims actual)
    const nuevoStreak = (daysClaimed || 0) + 1; // (si luego quieres streak real consecutivo, lo cambiamos)
    const { error: errUpsert } = await db
      .from("daily_claims")
      .upsert(
        {
          uuid_jugador: uuid,
          last_claim_at: new Date().toISOString(),
          last_amount: amount,
          streak: nuevoStreak,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "uuid_jugador" }
      );

    if (errUpsert) throw errUpsert;

    return res.status(200).json({
      message: "Recompensa diaria registrada.",
      amount,
      servers: servidores,
      nextClaimAt: nextMidnightMadridISO(),
      monthTarget: TARGET,
      monthSoFar: totalSoFar + amount,
      dayIndex: nuevoStreak,
    });
  } catch (err) {
    console.error("[DAILY CLAIM ERROR]", err);
    return res.status(500).json({ error: "Error interno al reclamar recompensa diaria." });
  }
};

// GET /api/daily-claim/status
exports.getDailyStatus = async (req, res) => {
  try {
    const uuid = req.usuario?.uuid;
    if (!uuid) return res.status(401).json({ error: "No autorizado." });

    const today = getMadridDayKey(new Date());

    const { data: hoyRow, error: errHoy } = await db
      .from("daily_claims_log")
      .select("amount, created_at")
      .eq("uuid_jugador", uuid)
      .eq("claim_date", today)
      .maybeSingle();

    if (errHoy) throw errHoy;

    const { firstISO, nextISO } = getMonthMetaMadrid();
    const { total: monthSoFar, daysClaimed } = await getMonthSum(uuid, firstISO, nextISO);

    return res.status(200).json({
      claimedToday: !!hoyRow,
      lastAmount: hoyRow?.amount ?? null,
      nextClaimAt: nextMidnightMadridISO(),
      monthSoFar,
      daysClaimed,
    });
  } catch (err) {
    console.error("[DAILY STATUS ERROR]", err);
    return res.status(500).json({ error: "Error interno al obtener estado diario." });
  }
};
