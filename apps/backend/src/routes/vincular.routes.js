const express = require("express");
const router = express.Router();
const controller = require("../controllers/vincular.controller");
const validateVincular = require("../middlewares/validateTokenInput"); // ✅ nombre correcto
const verificaToken = require("../middlewares/verificaToken");

router.post("/validate", controller.validarToken);
router.post("/", validateVincular, controller.vincular);
router.post("/registrar", controller.registrarUsuario);
router.post("/marcar", controller.marcarToken);
router.post("/login", controller.loginUsuario);
router.get("/me", verificaToken, controller.obtenerSesionActual);

module.exports = router;
