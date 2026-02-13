const db = require("../models/db");

// POST /api/recompensas/reclamar
exports.reclamarRecompensa = async (req, res) => {
  const { uuid, nivel } = req.body;

  if (!uuid || nivel === undefined || nivel === null) {
    return res.status(400).json({ error: "Faltan datos obligatorios." });
  }

  const nivelNum = Number(nivel);
  if (!Number.isFinite(nivelNum) || nivelNum <= 0) {
    return res.status(400).json({ error: "Nivel inválido." });
  }

  try {
    // RPC atómica (devuelve JSON)
    const { data, error } = await db.rpc("claim_reward_wallet", {
      p_uuid: uuid,
      p_nivel: nivelNum,
    });

    if (error) {
      console.error("[claim_reward_wallet RPC ERROR]", {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
      });
      return res.status(500).json({ error: "Error interno al reclamar recompensa." });
    }

    // data es jsonb => { code, coins_added, wallet_balance }
    const code = data?.code;

    if (code === "NOT_FOUND") return res.status(404).json({ error: "Jugador no encontrado." });
    if (code === "BAD_LEVEL") return res.status(400).json({ error: "Nivel inválido." });
    if (code === "LEVEL_TOO_LOW") return res.status(403).json({ error: "Aún no has alcanzado este nivel." });
    if (code === "NO_REWARD") return res.status(404).json({ error: "No hay recompensa definida para este nivel." });
    if (code === "UNSUPPORTED_TYPE") return res.status(400).json({ error: "Tipo de recompensa no soportado." });
    if (code === "ALREADY_CLAIMED") return res.status(409).json({ error: "Recompensa ya reclamada." });

    if (code !== "OK") {
      console.error("[claim_reward_wallet] code inesperado:", data);
      return res.status(500).json({ error: "Error interno al reclamar recompensa." });
    }

    const coinsAñadidos = Number(data?.coins_added ?? 0) || 0;
    const nuevoSaldoCoins = Number(data?.wallet_balance ?? 0) || 0;

    return res.status(200).json({
      message: "Recompensa reclamada correctamente.",
      nivel: nivelNum,
      coinsAñadidos,
      nuevoSaldoCoins,
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

    return res.status(200).json((data || []).map((row) => row.nivel));
  } catch (err) {
    console.error("[RECOMPENSAS RECLAMADAS ERROR]", err);
    return res.status(500).json({ error: "Error interno al obtener recompensas reclamadas." });
  }
};
