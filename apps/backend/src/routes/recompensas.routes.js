const express = require("express");
const router = express.Router();
const controller = require("../controllers/recompensas.controller");
const verificaToken = require("../middlewares/verificaToken");

router.post("/reclamar", verificaToken, controller.reclamarRecompensa);
router.get("/reclamadas/:uuid", verificaToken, controller.getRecompensasReclamadas);

module.exports = router;
