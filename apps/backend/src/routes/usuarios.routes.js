const express = require("express");
const router = express.Router();
const controller = require("../controllers/usuarios.controller");
const db = require("../models/db");
const requireRole = require("../middlewares/requireRole");

router.get("/", controller.obtenerUsuarios);

router.get("/vinculados", async (req, res) => {
  try {
    const { data, error } = await db
      .from("usuarios")
      .select("uuid")
      .not("uuid", "is", null);

    if (error) throw error;

    const uuids = data.map((u) => u.uuid);
    return res.status(200).json(uuids);
  } catch (err) {
    console.error("[USUARIOS VINCULADOS ERROR]", err);
    return res.status(500).json({ error: "Error al obtener usuarios vinculados." });
  }
});


router.patch("/rango", ...requireRole("admin"), controller.asignarRangoUsuario);
router.patch("/premium", ...requireRole("admin"), controller.actualizarPremiumUsuario);

router.post("/rango/comprado", ...requireRole("admin"), controller.registrarCompraRango);
router.get("/:uuid/skin", controller.obtenerSkinUsuario);
router.get("/:uuid/xp", controller.obtenerXPUsuario);

router.get("/:uuid", controller.obtenerUsuario);

module.exports = router;
