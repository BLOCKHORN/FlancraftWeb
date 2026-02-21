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

// listado público
router.get("/", obtenerNoticias);

/* =========================
 *  RUTAS PROTEGIDAS (ADMIN)
 * ========================= */

// listado completo (ADMIN)
router.get("/todas", verificarAuth, verificaOwner, obtenerTodasLasNoticias);

// obtener por ID para el editor admin
router.get("/id/:id", verificarAuth, verificaOwner, obtenerNoticiaPorId);

// preview (POST)
router.post("/preview", verificarAuth, generarVistaPrevia);

// crear
router.post("/", verificarAuth, verificaOwner, crearNoticia);

// actualizar
router.put("/:id", verificarAuth, verificaOwner, actualizarNoticia);

// eliminar
router.delete("/:id", verificarAuth, verificaOwner, eliminarNoticia);

/* =========================
 *  RUTA PÚBLICA POR SLUG (AL FINAL)
 * ========================= */
router.get("/:slug", obtenerNoticiaPorSlug);

module.exports = router;
