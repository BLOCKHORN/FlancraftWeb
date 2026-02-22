const express = require("express");
const router = express.Router();

const verificaToken = require("../middlewares/verificaToken");
const { comprarRangoWallet, obtenerListaRangos } = require("../controllers/comprarRango.controller");

router.post("/comprar-wallet", verificaToken, comprarRangoWallet);
router.post("/comprar-rango", verificaToken, comprarRangoWallet);
router.get("/lista", obtenerListaRangos);

module.exports = router;