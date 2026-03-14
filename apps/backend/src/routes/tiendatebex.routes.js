"use strict";

const express = require("express");
const router = express.Router();

const {
  obtenerFx,
  obtenerDatosTienda,
  forzarActualizarCache,
  obtenerDescripcionProducto,
  crearPedidoTebex,
  obtenerSaleActiva,
  obtenerTopDonator,
  obtenerTopDonators,
  obtenerPagosRecientes,
  obtenerSidebarRaw,
  obtenerBasketHeadless,
  obtenerCheckoutStatus,
  aplicarCodigoBasket,
  quitarCodigoBasket,
  agregarPaqueteBasket,
  obtenerRecomendaciones,
  obtenerEstadoPackBienvenida,
  webhookPing,
  webhookHandler,
  health,
} = require("../controllers/tiendatebex.controller");

router.get("/health", health);

router.get("/fx", obtenerFx);

router.get("/sidebar-raw", obtenerSidebarRaw);
router.get("/top-donator", obtenerTopDonator);
router.get("/top-donators", obtenerTopDonators);
router.get("/recent-payments", obtenerPagosRecientes);

router.get("/sale", obtenerSaleActiva);
router.get("/sale/:server", obtenerSaleActiva);

router.get("/package/:id", obtenerDescripcionProducto);
router.get("/:server/package/:id", obtenerDescripcionProducto);

router.post("/checkout", crearPedidoTebex);

router.get("/basket/:ident", obtenerBasketHeadless);
router.post("/basket/:ident/code", aplicarCodigoBasket);
router.post("/basket/:ident/code/remove", quitarCodigoBasket);
router.post("/basket/:ident/packages", agregarPaqueteBasket);

router.get("/checkout-status/:ident", obtenerCheckoutStatus);

router.get("/bienvenida/status", obtenerEstadoPackBienvenida);

router.get("/recommendations", obtenerRecomendaciones);
router.get("/:server/recommendations", obtenerRecomendaciones);

router.post("/cache/refresh", forzarActualizarCache);
router.post("/cache/refresh/:server", forzarActualizarCache);

router.get("/webhook", webhookPing);
router.post("/webhook", webhookHandler);

router.get("/", obtenerDatosTienda);
router.get("/:server", obtenerDatosTienda);

module.exports = router;