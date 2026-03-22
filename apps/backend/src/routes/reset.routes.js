const express = require("express");
const router = express.Router();
const resetController = require("../controllers/reset.controller");

router.post("/", resetController.generarResetToken);
router.post("/validate", resetController.validarResetToken);
router.post("/set-password", resetController.cambiarPassword);

module.exports = router;