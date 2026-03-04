const express = require("express");
const r = express.Router();
const c = require("../controllers/sanciones.controller");

r.post("/jails", c.registrarSancion);

r.get("/", c.obtenerSanciones);
r.get("/jugador/:nombre", c.obtenerSancionesPorJugador);
r.patch("/:id", c.actualizarSancion);
r.delete("/:id", c.eliminarSancion);

module.exports = r;