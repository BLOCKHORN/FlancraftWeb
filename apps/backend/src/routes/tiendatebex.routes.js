"use strict";

const express = require("express");
const router = express.Router();

const {
  obtenerDatosTienda,
  forzarActualizarCache,
  obtenerDescripcionProducto,
  crearPedidoTebex,
  obtenerSaleActiva,
  obtenerTopDonator,
  obtenerPagosRecientes,
  obtenerSidebarRaw,
  webhookPing,
  webhookHandler,
  health,
} = require("../controllers/tiendatebex.controller");

router.get("/health", health);
router.get("/sidebar-raw", obtenerSidebarRaw);

router.get("/top-donator", obtenerTopDonator);
router.get("/recent-payments", obtenerPagosRecientes);

router.get("/sale", obtenerSaleActiva);
router.get("/sale/:server", obtenerSaleActiva);

// ✅ Package detail (ANTES del "/:server")
router.get("/package/:id", obtenerDescripcionProducto);
router.get("/:server/package/:id", obtenerDescripcionProducto);

router.post("/checkout", crearPedidoTebex);

router.post("/cache/refresh", forzarActualizarCache);
router.post("/cache/refresh/:server", forzarActualizarCache);

// ✅ Webhook ANTES de "/" y "/:server" (si no, lo pisa)
router.get("/webhook", webhookPing);
router.post("/webhook", webhookHandler);

// ✅ Datos tienda al final (para no pisar rutas)
router.get("/", obtenerDatosTienda);
router.get("/:server", obtenerDatosTienda);

module.exports = router;
