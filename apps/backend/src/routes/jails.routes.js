const express = require("express");
const { registrarSancion } = require("../controllers/jails.controller");

const router = express.Router();

router.post("/", registrarSancion);

module.exports = router;
