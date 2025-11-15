const express = require("express");
const router = express.Router();

const {
  comprarRango,
  obtenerListaRangos
} = require("../controllers/comprarRango.controller");

router.post("/comprar-rango", comprarRango);
router.get("/lista", obtenerListaRangos);

module.exports = router;
