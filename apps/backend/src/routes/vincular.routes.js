const express = require("express");
const router = express.Router();
const controller = require("../controllers/vincular.controller");
const validateVincular = require("../middlewares/validateTokenInput"); // ✅ nombre correcto

router.post("/validate", controller.validarToken);
router.post("/", validateVincular, controller.vincular);
router.post("/registrar", controller.registrarUsuario);
router.post("/marcar", controller.marcarToken);
router.post("/login", controller.loginUsuario);

module.exports = router;
