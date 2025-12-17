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
  obtenerGoal,
  obtenerPagosRecientes,
  obtenerSidebarRaw,
  webhookPing,
  webhookHandler,
  health,
} = require("../controllers/tiendatebex.controller");

/* =========================
   Health / Debug
   ========================= */
router.get("/health", health);
router.get("/sidebar-raw", obtenerSidebarRaw);

/* =========================
   Headless sidebar modules
   ========================= */
router.get("/top-donator", obtenerTopDonator);
router.get("/goal", obtenerGoal);
router.get("/recent-payments", obtenerPagosRecientes);

/* =========================
   Sales
   ========================= */
router.get("/sale", obtenerSaleActiva);
router.get("/sale/:server", obtenerSaleActiva);

/* =========================
   Packages / categorías (plugin.tebex.io)
   ========================= */
router.get("/", obtenerDatosTienda);
router.get("/:server", obtenerDatosTienda);

router.post("/cache/refresh", forzarActualizarCache);
router.post("/cache/refresh/:server", forzarActualizarCache);

/* =========================
   Package detail
   ========================= */
router.get("/package/:id", obtenerDescripcionProducto);
router.get("/:server/package/:id", obtenerDescripcionProducto);

/* =========================
   Checkout
   ========================= */
router.post("/checkout", crearPedidoTebex);

/* =========================
   Webhook Tebex
   ========================= */
router.get("/webhook", webhookPing);
router.post("/webhook", webhookHandler);

module.exports = router;
