const express = require("express");
const router = express.Router();
const bolsaController = require("../controllers/bolsa.controller");

router.get("/live", bolsaController.getLivePrices);
router.get("/portfolio/:uuid", bolsaController.getPortfolio);
router.get("/ledger", bolsaController.getLedger);
router.get("/chart/:mineral", bolsaController.getChartData);
router.get("/top-traders", bolsaController.getTopTraders);
router.get("/order-status/:id", bolsaController.getOrderStatus);
router.post("/trade", bolsaController.createOrder);
router.get("/admin/analytics", bolsaController.getMarketAnalytics);
router.get("/news", bolsaController.getMarketNews);

module.exports = router;