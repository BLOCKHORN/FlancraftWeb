const express = require("express");
const router = express.Router();
const controller = require("../controllers/sanciones.controller");

// ✅ Obtener lista completa de sanciones
router.get("/", controller.obtenerSanciones);

// ✅ Obtener sanciones de un jugador específico
router.get("/jugador/:nombre", controller.obtenerSancionesPorJugador);

// ✅ Eliminar una sanción por ID
router.delete("/:id", controller.eliminarSancion);

module.exports = router;
