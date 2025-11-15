const express = require("express");
const router = express.Router();
const controller = require("../controllers/comandos.controller");

// ✅ OBTENER los comandos pendientes en formato JSON (usado por el plugin)
router.get("/", controller.obtenerComandosPendientes);

// 🧪 OBTENER los comandos pendientes en texto plano (formato legacy)
router.get("/legacy", controller.obtenerComandosPendientesTextoPlano);

// ✅ MARCAR un comando como ejecutado
router.post("/:id/marcar", controller.marcarComoEjecutado);

module.exports = router;
