const express = require("express");
const router = express.Router();

const verificaToken = require("../middlewares/verificaToken"); //
const flanpointsWebController = require("../controllers/flanpointsWeb.controller");

router.get("/catalogo", verificaToken, flanpointsWebController.getCatalogo);
router.get("/historial", verificaToken, flanpointsWebController.getHistorial);
router.post("/canjear", verificaToken, flanpointsWebController.canjearArtefacto);

module.exports = router;