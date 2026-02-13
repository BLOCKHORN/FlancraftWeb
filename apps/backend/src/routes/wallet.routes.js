const express = require("express");
const router = express.Router();
const controller = require("../controllers/wallet.controller");

router.post("/transfer", controller.transferToServer);

module.exports = router;
