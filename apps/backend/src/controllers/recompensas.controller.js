const db = require("../models/db");
const { evaluateWebAchievementsForUser } = require("../services/webLogros.service");

const STAFF_ROLES = new Set(["admin", "owner"]);

const normalizeRole = (value) => {
  if (value === null || value === undefined) return null;
  const role = String(value).trim().toLowerCase().replace(/[\s_-]+/g, "");
  return role || null;
};

const getSessionRole = (req) => {
  return normalizeRole(req.usuario?.rol_admin) || normalizeRole(req.usuario?.rango_staff);
};

exports.reclamarRecompensa = async (req, res) => {
  const sessionUuid = req.usuario?.uuid || null;
  const sessionRole = getSessionRole(req);
  const bodyUuid = String(req.body?.uuid || "").trim();
  const nivelNum = Number(req.body?.nivel);

  if (!sessionUuid) {
    return res.status(401).json({ error: "No autorizado." });
  }

  if (bodyUuid && bodyUuid !== sessionUuid && !STAFF_ROLES.has(sessionRole)) {
    return res.status(403).json({ error: "No puedes reclamar recompensas de otro usuario." });
  }

  if (!Number.isFinite(nivelNum) || nivelNum <= 0) {
    return res.status(400).json({ error: "Nivel inválido." });
  }

  try {
    const { data, error } = await db.rpc("claim_reward_wallet", {
      p_uuid: sessionUuid,
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

    try {
await evaluateWebAchievementsForUser(sessionUuid, {
  types: ["account_age_days"],
});
    } catch (webAchievementError) {
      console.error("[WEB LOGROS RECOMPENSA EVAL ERROR]", {
        uuid: sessionUuid,
        message: webAchievementError?.message || String(webAchievementError),
      });
    }

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

exports.getRecompensasReclamadas = async (req, res) => {
  const uuid = String(req.params?.uuid || "").trim();
  const sessionUuid = req.usuario?.uuid || null;
  const sessionRole = getSessionRole(req);

  if (!sessionUuid) {
    return res.status(401).json({ error: "No autorizado." });
  }

  if (!uuid) {
    return res.status(400).json({ error: "UUID faltante." });
  }

  if (sessionUuid !== uuid && !STAFF_ROLES.has(sessionRole)) {
    return res.status(403).json({ error: "No puedes consultar recompensas de otro usuario." });
  }

  try {
    const { data, error } = await db
      .from("recompensas_reclamadas")
      .select("nivel")
      .eq("uuid_jugador", uuid)
      .order("nivel", { ascending: true });

    if (error) {
      console.error("[RECOMPENSAS RECLAMADAS QUERY ERROR]", error);
      return res.status(500).json({ error: "Error interno al obtener recompensas reclamadas." });
    }

    return res.status(200).json((data || []).map((row) => Number(row.nivel)).filter(Number.isFinite));
  } catch (err) {
    console.error("[RECOMPENSAS RECLAMADAS ERROR]", err);
    return res.status(500).json({ error: "Error interno al obtener recompensas reclamadas." });
  }
};