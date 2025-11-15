const express = require("express");
const router = express.Router();
const controller = require("../controllers/permisos.admin.controller");

router.get("/", controller.getPermisos);
router.get("/usuarios", controller.getUsuarios); // NUEVA RUTA
router.post("/", controller.asignarPermiso);
router.delete("/:uuid", controller.eliminarPermiso);
router.patch("/:uuid", controller.actualizarPermisoRol);

module.exports = router;
