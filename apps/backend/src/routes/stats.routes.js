// apps/backend/src/routes/stats.routes.js
const express = require("express");
const router = express.Router();
const statsController = require("../controllers/stats.controller");

// Importación vieja (tipo/categoria)
router.post("/importar", statsController.importarStat);

// Importación agrupada nueva (una llamada con todas las stats)
router.post("/importar-agrupadas", statsController.importarStatsAgrupadas);

// Leaderboards desde vista (opcional)
router.get("/ranking", statsController.obtenerRankingEstadisticas);

// Leaderboards desde tabla agrupada (página principal)
router.get("/leaderboards", statsController.obtenerLeaderboards);

// Perfil de jugador (detalle por jugador, para el perfil web)
router.get("/perfil/:uuid", statsController.obtenerPerfilJugador);

module.exports = router;
