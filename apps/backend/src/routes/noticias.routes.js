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

const requireRole = require("../middlewares/requireRole");

/* =========================
 *  RUTAS PÚBLICAS
 * ========================= */

// listado público
router.get("/", obtenerNoticias);

/* =========================
 *  RUTAS PROTEGIDAS (ADMIN)
 * ========================= */

// listado completo (ADMIN)
router.get("/todas", ...requireRole("admin"), obtenerTodasLasNoticias);

// obtener por ID para el editor admin
router.get("/id/:id", ...requireRole("admin"), obtenerNoticiaPorId);

// preview (POST)
router.post("/preview", ...requireRole("admin"), generarVistaPrevia);

// crear
router.post("/", ...requireRole("admin"), crearNoticia);

// actualizar
router.put("/:id", ...requireRole("admin"), actualizarNoticia);

// eliminar
router.delete("/:id", ...requireRole("admin"), eliminarNoticia);

/* =========================
 *  RUTA PÚBLICA POR SLUG (AL FINAL)
 * ========================= */
router.get("/:slug", obtenerNoticiaPorSlug);

module.exports = router;
