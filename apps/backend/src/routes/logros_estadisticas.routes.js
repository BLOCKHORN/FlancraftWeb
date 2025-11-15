const express = require("express");
const router = express.Router();
const db = require("../models/db");

// GET /api/logros/estadisticas?servidor=anarquico&page=2
router.get("/estadisticas", async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const perPage = 10;
  const offset = (page - 1) * perPage;
  const servidor = req.query.servidor;

  try {
    let query = db
      .from("vista_ranking_logros")
      .select("*")
      .order("progreso_total", { ascending: false });

    if (servidor) {
      query = query.eq("servidor", servidor);
    }

    const { data, error } = await query.range(offset, offset + perPage - 1);

    if (error) throw error;

    return res.status(200).json({
      page,
      perPage,
      servidor: servidor || null,
      resultados: data
    });
  } catch (err) {
    console.error("[LOGROS ESTADISTICAS ERROR]", err);
    return res.status(500).json({ error: "Error al obtener estadísticas de logros." });
  }
});

module.exports = router;
