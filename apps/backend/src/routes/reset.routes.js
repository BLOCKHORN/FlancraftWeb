const express = require("express");
const router = express.Router();
const resetController = require("../controllers/reset.controller");

router.post("/validate", resetController.validarResetToken);
router.post("/set-password", resetController.cambiarPassword);
router.post("/", resetController.generarResetToken); // POST /api/reset

module.exports = router;
