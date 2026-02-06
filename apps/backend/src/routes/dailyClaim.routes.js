// src/routes/dailyClaim.routes.js
const router = require("express").Router();
const verificaToken = require("../middlewares/verificaToken");
const dailyClaimController = require("../controllers/dailyClaim.controller");

router.get("/status", verificaToken, dailyClaimController.getDailyStatus);
router.post("/", verificaToken, dailyClaimController.claimDaily);

module.exports = router;
