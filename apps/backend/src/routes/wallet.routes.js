const express = require("express");
const router = express.Router();
const controller = require("../controllers/wallet.controller");
const verificaToken = require("../middlewares/verificaToken");

router.post("/transfer", verificaToken, controller.transferToServer);

module.exports = router;
