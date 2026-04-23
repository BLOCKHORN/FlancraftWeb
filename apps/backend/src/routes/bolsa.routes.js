const express = require("express");
const router = express.Router();
const bolsaController = require("../controllers/bolsa.controller");

// Rutas públicas y de jugadores
router.get("/live", bolsaController.getLivePrices);
router.get("/portfolio/:uuid", bolsaController.getPortfolio);
router.get("/ledger", bolsaController.getLedger);
router.get("/chart/:mineral", bolsaController.getChartData);
router.get("/top-traders", bolsaController.getTopTraders);
router.post("/trade", bolsaController.createOrder);

// Rutas de administración
router.get("/admin/analytics", bolsaController.getMarketAnalytics);

module.exports = router;