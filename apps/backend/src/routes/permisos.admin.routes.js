const express = require("express");
const router = express.Router();
const controller = require("../controllers/permisos.admin.controller");
const requireRole = require("../middlewares/requireRole");

router.get("/", ...requireRole("owner"), controller.getPermisos);
router.get("/usuarios", ...requireRole("owner"), controller.getUsuarios);
router.post("/", ...requireRole("owner"), controller.asignarPermiso);
router.delete("/:uuid", ...requireRole("owner"), controller.eliminarPermiso);
router.patch("/:uuid", ...requireRole("owner"), controller.actualizarPermisoRol);

module.exports = router;
