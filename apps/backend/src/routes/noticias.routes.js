// apps/backend/src/routes/noticias.routes.js
const express = require("express");
const router = express.Router();

const {
  obtenerNoticias,
  obtenerTodasLasNoticias,
  obtenerNoticiaPorSlug,
  obtenerNoticiaPorId,
  generarVistaPrevia,
  crearNoticia,
  actualizarNoticia,
  eliminarNoticia,
} = require("../controllers/noticias.controller");

const verificarAuth = require("../middlewares/verificaToken");
const verificaOwner = require("../middlewares/verificaOwner");

/* =========================
 *  RUTAS PÚBLICAS
 * ========================= */

// 1) listado público (principal)
router.get("/", obtenerNoticias);

// 2) obtener por slug público (detalle para la web pública)
router.get("/:slug", obtenerNoticiaPorSlug);

/* =========================
 *  RUTAS PROTEGIDAS (ADMIN)
 * ========================= */

// listado completo (ADMIN)
router.get("/todas", verificarAuth, verificaOwner, obtenerTodasLasNoticias);

// obtener por ID para el editor admin
router.get("/id/:id", verificarAuth, verificaOwner, obtenerNoticiaPorId);

// crear
router.post("/", verificarAuth, verificaOwner, crearNoticia);

// actualizar
router.put("/:id", verificarAuth, verificaOwner, actualizarNoticia);

// eliminar
router.delete("/:id", verificarAuth, verificaOwner, eliminarNoticia);

// preview
router.post("/preview", verificarAuth, generarVistaPrevia);

module.exports = router;
