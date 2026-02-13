// apps/backend/src/routes/monedas.routes.js
const express = require("express");
const router = express.Router();
const controller = require("../controllers/monedas.controller");

// POST: Sincroniza múltiples jugadores con sus saldos
router.post("/sync-batch", controller.sincronizarMonedasBatch);

// GET: Obtiene los saldos de un jugador por UUID
router.get("/:uuid", controller.obtenerMonedasJugador);

module.exports = router;
