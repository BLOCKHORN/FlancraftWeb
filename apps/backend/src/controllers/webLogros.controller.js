const { evaluateWebAchievementsForUser, listWebAchievementsForUser } = require("../services/webLogros.service");

exports.obtenerWebLogrosUsuario = async (req, res) => {
  const uuid = String(req.params?.uuid || "").trim();

  if (!uuid) {
    return res.status(400).json({ error: "UUID faltante." });
  }

  try {
await evaluateWebAchievementsForUser(uuid, {
  types: ["first_level", "top_rank", "daily_claim_count", "vote_count", "vote_streak", "account_age_days"],
});

    const data = await listWebAchievementsForUser(uuid);
    return res.status(200).json(data);
  } catch (error) {
    console.error("[WEB LOGROS LIST ERROR]", error);
    return res.status(500).json({ error: "Error interno al obtener logros web." });
  }
};