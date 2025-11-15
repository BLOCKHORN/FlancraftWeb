const db = require("../models/db");

// POST /api/monedas/sync-batch
async function sincronizarMonedasBatch(req, res) {
  const { jugadores } = req.body;
  if (!Array.isArray(jugadores)) {
    return res.status(400).json({ error: "Falta 'jugadores'" });
  }

  try {
    const updates = jugadores.map((j) => ({
      uuid: j.uuid,
      ecos: j.ecos,
      ultima_sync: new Date(),
    }));

    for (const jugador of updates) {
      const { error } = await db
        .from("monedas_actuales")
        .upsert(jugador, { onConflict: ["uuid"] });

      if (error) throw error;
    }

    return res.status(200).json({ message: "Saldos actualizados", count: updates.length });
  } catch (err) {
    console.error("[MONEDAS SYNC ERROR]", err);
    return res.status(500).json({ error: "Error al sincronizar monedas" });
  }
}

// GET /api/monedas/:uuid
async function obtenerMonedasJugador(req, res) {
  const { uuid } = req.params;

  try {
    const { data, error } = await db
      .from("monedas_actuales")
      .select("ecos")
      .eq("uuid", uuid)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: "Jugador no encontrado" });
    }

    return res.status(200).json({ ecos: data.ecos });
  } catch (err) {
    console.error("[MONEDAS GET ERROR]", err);
    return res.status(500).json({ error: "Error al obtener monedas" });
  }
}

module.exports = {
  sincronizarMonedasBatch,
  obtenerMonedasJugador,
};
