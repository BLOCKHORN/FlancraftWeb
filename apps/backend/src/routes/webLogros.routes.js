const express = require("express");
const router = express.Router();
const { obtenerWebLogrosUsuario } = require("../controllers/webLogros.controller");

router.get("/:uuid", obtenerWebLogrosUsuario);

module.exports = router;