
const express = require("express");
const {
  obtenerMisionesDiariasJugador,
  obtenerMisionesSemanalesJugador,
  reclamarMision,
  rotarMisionesDiarias,
  rotarMisionesSemanales,
} = require("../controllers/logros.controller");

const router = express.Router();

router.get("/diarias/:uuid", obtenerMisionesDiariasJugador);
router.get("/semanales/:uuid", obtenerMisionesSemanalesJugador);
router.post("/reclamar/:tipoMision/:id", reclamarMision);
router.post("/rotar/diarias", rotarMisionesDiarias);
router.post("/rotar/semanales", rotarMisionesSemanales);

module.exports = router;
