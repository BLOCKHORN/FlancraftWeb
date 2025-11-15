// 📁 src/routes/logros.routes.js
const express = require("express");
const router = express.Router();
const controller = require("../controllers/logros.controller");
const estadisticasController = require("../controllers/logros.estadisticas.controller");

// 🔁 Añadir progreso al logro (desde el plugin)
router.post("/progreso", controller.registrarProgreso);

// 🎁 Reclamar logro completo (desde la web)
router.post("/reclamar/:id_logro", controller.reclamarLogro);

// 📋 Obtener logros y progreso del jugador (desde la web)
router.get("/:uuid", controller.obtenerLogrosJugador);

// 🔁 Añadir varios progresos al mismo tiempo (desde el buffer)
router.post("/progreso-multiple", controller.registrarProgresoMultiple);

// 📊 Obtener estadísticas de logros
router.get("/estadisticas", estadisticasController.obtenerEstadisticas);

module.exports = router;
