const express = require("express");
const router = express.Router();
const controller = require("../controllers/recompensas.controller");

router.post("/reclamar", controller.reclamarRecompensa);
router.get("/reclamadas/:uuid", controller.getRecompensasReclamadas);

module.exports = router;
