
const express = require("express");
const {
  registrarProgreso,
  registrarProgresoMultiple,
  obtenerLogrosJugador,
} = require("../controllers/logros.controller");

const router = express.Router();

router.post("/progreso", registrarProgreso);
router.post("/progreso-multiple", registrarProgresoMultiple);
router.get("/:uuid", obtenerLogrosJugador);

module.exports = router;
