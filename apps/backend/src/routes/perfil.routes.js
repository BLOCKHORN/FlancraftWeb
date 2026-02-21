// apps/backend/src/routes/perfil.routes.js
const express = require("express");
const router = express.Router();

const perfil = require("../controllers/perfil.controller");

// por nombre (ruta pública)
router.get("/:nombre", perfil.obtenerPerfilPorNombre);

// por uuid + servidor (cambio de pestaña en el perfil)
router.get("/:uuid/servidor/:servidor", perfil.obtenerPerfilServidor);

module.exports = router;
