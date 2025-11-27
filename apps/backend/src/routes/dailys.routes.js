// src/routes/dailys.routes.js
const express = require("express");
const router = express.Router();
const controller = require("../controllers/dailys.controller");

// Misiones diarias (rotación del día)
router.get("/dailys", controller.obtenerMisionesDiarias);

// Misiones semanales (rotación de la semana)
router.get("/semanales", controller.obtenerMisionesSemanales);

module.exports = router;
