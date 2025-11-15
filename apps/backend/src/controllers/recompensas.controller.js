const db = require("../models/db");

// POST /api/recompensas/reclamar
exports.reclamarRecompensa = async (req, res) => {
  const { uuid, nivel } = req.body;

  if (!uuid || !nivel) {
    return res.status(400).json({ error: "Faltan datos obligatorios." });
  }

  try {
    // 1. Verificamos que el jugador existe
    const { data: jugador, error: errJugador } = await db
      .from("usuarios")
      .select("uuid, uid, nivel")
      .eq("uuid", uuid)
      .maybeSingle();

    if (errJugador) throw errJugador;
    if (!jugador) return res.status(404).json({ error: "Jugador no encontrado." });

    // 2. Comprobamos si ya reclamó esa recompensa
    const { data: yaReclamada, error: errCheck } = await db
      .from("recompensas_reclamadas")
      .select("id")
      .eq("uuid_jugador", uuid)
      .eq("nivel", nivel);

    if (errCheck) throw errCheck;
    if (yaReclamada.length > 0) {
      return res.status(409).json({ error: "Recompensa ya reclamada." });
    }

    // 3. Verificamos si ha alcanzado ese nivel
    if (jugador.nivel < nivel) {
      return res.status(403).json({ error: "Aún no has alcanzado este nivel." });
    }

    // 4. Cargar recompensa desde BD
    const recompensa = await getRecompensaParaNivel(nivel);
    if (!recompensa) {
      return res.status(404).json({ error: "No hay recompensa definida para este nivel." });
    }

    const comando = recompensa.comando.replace("{nombre}", jugador.uid);

    // 5. Insertar el comando pendiente
    const { error: errInsertCmd } = await db
      .from("comandos_pendientes")
      .insert({
        uuid_jugador: uuid,
        nombre_jugador: jugador.uid,
        comando
      });

    if (errInsertCmd) throw errInsertCmd;

    // 6. Registrar la recompensa como reclamada
    const { error: errRecompensa } = await db
      .from("recompensas_reclamadas")
      .insert({
        uuid_jugador: uuid,
        nivel
      });

    if (errRecompensa) throw errRecompensa;

    // 7. Si la recompensa es de tipo ECOS, actualizar Supabase
    if (recompensa.recompensa_tipo === "ECOS") {
      const cantidad = recompensa.recompensa_cantidad;

      const { data: monedasActuales, error: errFetchMonedas } = await db
        .from("monedas_actuales")
        .select("ecos")
        .eq("uuid", uuid)
        .maybeSingle();

      if (errFetchMonedas) throw errFetchMonedas;

      const nuevoBalance = (monedasActuales?.ecos || 0) + cantidad;

      const { error: errUpdate } = await db
        .from("monedas_actuales")
        .update({ ecos: nuevoBalance })
        .eq("uuid", uuid);

      if (errUpdate) throw errUpdate;
    }

    return res.status(200).json({
      message: "Recompensa registrada correctamente.",
      tipo: recompensa.recompensa_tipo,
      cantidad: recompensa.recompensa_cantidad
    });

  } catch (err) {
    console.error("[RECLAMAR ERROR]", err);
    return res.status(500).json({ error: "Error interno al reclamar recompensa." });
  }
};

// GET /api/recompensas/reclamadas/:uuid
exports.getRecompensasReclamadas = async (req, res) => {
  const { uuid } = req.params;

  if (!uuid) {
    return res.status(400).json({ error: "UUID faltante." });
  }

  try {
    const { data, error } = await db
      .from("recompensas_reclamadas")
      .select("nivel")
      .eq("uuid_jugador", uuid);

    if (error) throw error;

    return res.status(200).json(data.map(row => row.nivel));
  } catch (err) {
    console.error("[RECOMPENSAS RECLAMADAS ERROR]", err);
    return res.status(500).json({ error: "Error interno al obtener recompensas reclamadas." });
  }
};

// 📦 Consulta la recompensa desde la tabla recompensas
async function getRecompensaParaNivel(nivel) {
  const { data, error } = await db
    .from("recompensas")
    .select("comando, recompensa_tipo, recompensa_cantidad")
    .eq("nivel_requerido", nivel)
    .eq("activa", true)
    .maybeSingle();

  if (error) throw error;
  return data;
}
