const express = require("express");
const r = express.Router();
const c = require("../controllers/sanciones.controller");
const requireRole = require("../middlewares/requireRole");

r.post("/jails", c.registrarSancion);
r.post("/", c.registrarSancion);

r.get("/estadisticas", c.obtenerEstadisticas); // Ruta agregada
r.get("/", c.obtenerSanciones);
r.get("/jugador/:nombre", c.obtenerSancionesPorJugador);

r.patch("/:id", ...requireRole("mod"), c.actualizarSancion);
r.delete("/:id", ...requireRole("admin"), c.eliminarSancion);

module.exports = r;