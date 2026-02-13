const db = require("../models/db");

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
      const coins = Number(rawCoins);

      if (!uuid || !servidor) continue;

      updates.push({
        uuid,
        servidor,
        coins: Number.isFinite(coins) ? Math.max(0, Math.floor(coins)) : 0,
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

    return res.status(200).json({
      message: "Saldos COINS actualizados",
      count: updates.length,
    });
  } catch (err) {
    console.error("[MONEDAS SYNC ERROR]", err);
    return res.status(500).json({ error: "Error al sincronizar COINS" });
  }
}

async function resolveUuid(identificador) {
  const id = String(identificador || "").trim();

  if (!id) return { ok: false, reason: "empty" };
  if (UUID_REGEX.test(id)) return { ok: true, uuid: id };

  // Si NO es UUID, intentamos resolver por nombre
  // Probables columnas: nombre_minecraft o uid (según tu proyecto)
  const name = id;

  // Intento 1: nombre_minecraft
  {
    const { data, error } = await db
      .from("usuarios")
      .select("uuid")
      .ilike("nombre_minecraft", name)
      .maybeSingle();

    if (error) throw error;
    if (data?.uuid) return { ok: true, uuid: data.uuid, resolvedFrom: "nombre_minecraft" };
  }

  // Intento 2: uid
  {
    const { data, error } = await db
      .from("usuarios")
      .select("uuid")
      .ilike("uid", name)
      .maybeSingle();

    if (error) throw error;
    if (data?.uuid) return { ok: true, uuid: data.uuid, resolvedFrom: "uid" };
  }

  return { ok: false, reason: "not_found" };
}

// GET /api/monedas/:id   (id = uuid o nombre)
// Opcional: ?servidor=gens
async function obtenerMonedasJugador(req, res) {
  const { uuid: rawId } = req.params;
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
        // En vez de 404, devolvemos 0 para que el dashboard no “rompa” si aún no existe fila
        return res.status(200).json({ uuid, servidor, coins: 0, ultima_sync: null });
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
  obtenerMonedasJugador,
};
