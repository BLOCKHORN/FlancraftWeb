const db = require("../models/db");

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SURVIVAL_SERVER = "survival";

const normalizeServer = (value) => String(value ?? "").trim().toLowerCase();

const toFiniteNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const roundMoney = (value) => Math.round(value * 100) / 100;

const normalizeMovementType = (value) => {
  const type = String(value ?? "").trim().toLowerCase();
  return type === "coins" || type === "dinero" ? type : null;
};

const normalizeDelta = (type, value) => {
  const n = toFiniteNumber(value);
  if (n === null) return null;
  if (type === "coins") return Math.trunc(n);
  return roundMoney(n);
};

const normalizeBalance = (type, value) => {
  const n = toFiniteNumber(value);
  if (n === null) return null;
  if (type === "coins") return Math.max(0, Math.trunc(n));
  return Math.max(0, roundMoney(n));
};

const normalizeMetadata = (value) => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }
  return {};
};

async function getCurrentCoins(uuid, servidor) {
  const { data, error } = await db
    .from("monedas_actuales")
    .select("coins")
    .eq("uuid", uuid)
    .eq("servidor", servidor)
    .maybeSingle();

  if (error) throw error;
  return Number(data?.coins ?? 0) || 0;
}

async function getCurrentMoney(uuid, servidor) {
  const { data, error } = await db
    .from("estadisticas_agrupadas")
    .select("dinero")
    .eq("uuid", uuid)
    .eq("servidor", servidor)
    .maybeSingle();

  if (error) throw error;
  return Number(data?.dinero ?? 0) || 0;
}

async function upsertStatsEconomySnapshot({
  uuid,
  servidor,
  nombre_minecraft,
  dinero,
  coins_balance,
  now,
}) {
  const { data: existing, error: findErr } = await db
    .from("estadisticas_agrupadas")
    .select("uuid")
    .eq("uuid", uuid)
    .eq("servidor", servidor)
    .maybeSingle();

  if (findErr) throw findErr;

  if (existing) {
    const payload = {
      ultima_actualizacion: now,
    };

    if (nombre_minecraft) payload.nombre_minecraft = nombre_minecraft;
    if (dinero !== undefined) payload.dinero = dinero;
    if (coins_balance !== undefined) payload.coins_balance = coins_balance;

    const { error: updErr } = await db
      .from("estadisticas_agrupadas")
      .update(payload)
      .eq("uuid", uuid)
      .eq("servidor", servidor);

    if (updErr) throw updErr;
    return;
  }

  const payload = {
    uuid,
    servidor,
    ultima_actualizacion: now,
  };

  if (nombre_minecraft) payload.nombre_minecraft = nombre_minecraft;
  if (dinero !== undefined) payload.dinero = dinero;
  if (coins_balance !== undefined) payload.coins_balance = coins_balance;

  const { error: insErr } = await db
    .from("estadisticas_agrupadas")
    .insert([payload]);

  if (insErr) throw insErr;
}

async function sincronizarMonedasBatch(req, res) {
  const { jugadores } = req.body;
  const servidorBody = req.body?.servidor ? String(req.body.servidor).trim().toLowerCase() : "";

  if (!Array.isArray(jugadores)) {
    return res.status(400).json({ error: "Falta 'jugadores' (array)." });
  }

  try {
    const now = new Date().toISOString();
    const updates = [];

    for (const j of jugadores) {
      const uuid = j?.uuid ? String(j.uuid).trim() : "";
      const servidor = j?.servidor ? String(j.servidor).trim().toLowerCase() : servidorBody;
      const rawCoins = j?.coins ?? j?.ecos ?? 0;
      const coinsNum = Number(rawCoins);

      if (!uuid || !servidor) continue;

      updates.push({
        uuid,
        servidor,
        coins: Number.isFinite(coinsNum) ? Math.max(0, Math.trunc(coinsNum)) : 0,
        ultima_sync: now,
      });
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: "No hay updates válidos. Asegura uuid + servidor + coins.",
      });
    }

    const { error } = await db
      .from("monedas_actuales")
      .upsert(updates, { onConflict: "uuid,servidor" });

    if (error) throw error;

    for (const item of updates) {
      await upsertStatsEconomySnapshot({
        uuid: item.uuid,
        servidor: item.servidor,
        nombre_minecraft: null,
        coins_balance: item.coins,
        now,
      });
    }

    return res.status(200).json({
      message: "Saldos COINS actualizados",
      count: updates.length,
    });
  } catch (err) {
    console.error("[MONEDAS SYNC ERROR]", err);
    return res.status(500).json({ error: "Error al sincronizar COINS" });
  }
}

async function registrarMovimientosEconomiaBatch(req, res) {
  const movimientos = Array.isArray(req.body?.movimientos) ? req.body.movimientos : null;
  const servidorBody = normalizeServer(req.body?.servidor || SURVIVAL_SERVER);

  if (!movimientos) {
    return res.status(400).json({ error: "Falta 'movimientos' (array)." });
  }

  try {
    const now = new Date().toISOString();
    const inserts = [];
    const effects = new Map();

    for (const item of movimientos) {
      const uuid = item?.uuid ? String(item.uuid).trim() : "";
      const servidor = normalizeServer(item?.servidor || servidorBody);
      const tipo = normalizeMovementType(item?.tipo);
      const delta = normalizeDelta(tipo, item?.delta);
      const nombre_minecraft = item?.nombre_minecraft ? String(item.nombre_minecraft).trim() : null;
      const motivo = item?.motivo ? String(item.motivo).trim() : null;
      const fuente = item?.fuente ? String(item.fuente).trim() : "flansync";
      const saldo_actual = normalizeBalance(tipo, item?.saldo_actual);
      const metadata = normalizeMetadata(item?.metadata);

      if (!uuid || !servidor || !tipo || delta === null || delta === 0) {
        continue;
      }

      inserts.push({
        uuid,
        servidor,
        nombre_minecraft,
        tipo,
        delta,
        motivo,
        fuente,
        saldo_resultante: saldo_actual,
        metadata,
        fecha: now,
      });

      const key = `${uuid}::${servidor}::${tipo}`;
      const prev = effects.get(key) || {
        uuid,
        servidor,
        tipo,
        nombre_minecraft: null,
        deltaSum: 0,
        saldo_actual: null,
      };

      prev.nombre_minecraft = nombre_minecraft || prev.nombre_minecraft;
      prev.deltaSum += delta;
      if (saldo_actual !== null) {
        prev.saldo_actual = saldo_actual;
      }

      effects.set(key, prev);
    }

    if (inserts.length === 0) {
      return res.status(400).json({ error: "No hay movimientos válidos." });
    }

    const { error: insErr } = await db
      .from("economia_movimientos")
      .insert(inserts);

    if (insErr) throw insErr;

    for (const effect of effects.values()) {
      if (effect.tipo === "coins") {
        const current = effect.saldo_actual !== null
          ? effect.saldo_actual
          : normalizeBalance("coins", (await getCurrentCoins(effect.uuid, effect.servidor)) + effect.deltaSum);

        const { error: upsertCoinsErr } = await db
          .from("monedas_actuales")
          .upsert(
            [
              {
                uuid: effect.uuid,
                servidor: effect.servidor,
                coins: current,
                ultima_sync: now,
              },
            ],
            { onConflict: "uuid,servidor" }
          );

        if (upsertCoinsErr) throw upsertCoinsErr;

        await upsertStatsEconomySnapshot({
          uuid: effect.uuid,
          servidor: effect.servidor,
          nombre_minecraft: effect.nombre_minecraft,
          coins_balance: current,
          now,
        });
      }

      if (effect.tipo === "dinero") {
        const current = effect.saldo_actual !== null
          ? effect.saldo_actual
          : normalizeBalance("dinero", (await getCurrentMoney(effect.uuid, effect.servidor)) + effect.deltaSum);

        await upsertStatsEconomySnapshot({
          uuid: effect.uuid,
          servidor: effect.servidor,
          nombre_minecraft: effect.nombre_minecraft,
          dinero: current,
          now,
        });
      }
    }

    return res.status(200).json({
      message: "Movimientos económicos registrados",
      count: inserts.length,
      grupos_actualizados: effects.size,
    });
  } catch (err) {
    console.error("[ECONOMIA MOVIMIENTOS ERROR]", err);
    return res.status(500).json({ error: "Error al registrar movimientos económicos" });
  }
}

async function resolveUuid(identificador) {
  const id = String(identificador || "").trim();

  if (!id) return { ok: false, reason: "empty" };
  if (UUID_REGEX.test(id)) return { ok: true, uuid: id };

  const { data, error } = await db
    .from("usuarios")
    .select("uuid")
    .ilike("uid", id)
    .maybeSingle();

  if (error) throw error;
  if (data?.uuid) return { ok: true, uuid: data.uuid, resolvedFrom: "uid" };

  return { ok: false, reason: "not_found" };
}

async function obtenerMonedasJugador(req, res) {
  const rawId = String(req.params?.uuid || req.params?.id || "").trim();
  const servidor = req.query?.servidor ? String(req.query.servidor).trim().toLowerCase() : "";

  if (!rawId) {
    return res.status(400).json({ error: "Falta identificador en la ruta." });
  }

  try {
    const resolved = await resolveUuid(rawId);

    if (!resolved.ok) {
      return res.status(404).json({ error: "Jugador no encontrado (uuid/nombre)." });
    }

    const uuid = resolved.uuid;

    if (servidor) {
      const { data, error } = await db
        .from("monedas_actuales")
        .select("servidor, coins, ultima_sync")
        .eq("uuid", uuid)
        .eq("servidor", servidor)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        return res.status(200).json({
          uuid,
          servidor,
          coins: 0,
          ultima_sync: null,
        });
      }

      return res.status(200).json({
        uuid,
        servidor: data.servidor,
        coins: Number(data.coins) || 0,
        ultima_sync: data.ultima_sync || null,
      });
    }

    const { data, error } = await db
      .from("monedas_actuales")
      .select("servidor, coins, ultima_sync")
      .eq("uuid", uuid)
      .order("servidor", { ascending: true });

    if (error) throw error;

    const balances = Array.isArray(data) ? data : [];
    const byServer = {};

    for (const row of balances) {
      byServer[row.servidor] = Number(row.coins) || 0;
    }

    return res.status(200).json({
      uuid,
      balances: balances.map((r) => ({
        servidor: r.servidor,
        coins: Number(r.coins) || 0,
        ultima_sync: r.ultima_sync || null,
      })),
      byServer,
    });
  } catch (err) {
    console.error("[MONEDAS GET ERROR]", err);
    return res.status(500).json({ error: "Error al obtener COINS" });
  }
}

module.exports = {
  sincronizarMonedasBatch,
  registrarMovimientosEconomiaBatch,
  obtenerMonedasJugador,
};