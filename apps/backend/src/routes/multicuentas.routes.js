const express = require("express");
const r = express.Router();
const c = require("../controllers/multicuentas.controller");
const requireRole = require("../middlewares/requireRole");

r.post("/detecciones", c.registrarDeteccion);
r.get("/detecciones", ...requireRole("mod"), c.obtenerDetecciones);
r.patch("/detecciones/:id", ...requireRole("mod"), c.actualizarDeteccion);

module.exports = r;