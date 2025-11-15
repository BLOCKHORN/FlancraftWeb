const express = require("express");
const router = express.Router();
const controller = require("../controllers/usuarios.controller");
const db = require("../models/db");

// ✅ Obtener todos los usuarios
router.get("/", controller.obtenerUsuarios);

// ✅ Obtener lista de UUIDs vinculados
router.get("/vinculados", async (req, res) => {
  try {
    const { data, error } = await db
      .from("usuarios")
      .select("uuid")
      .not("uuid", "is", null);

    if (error) throw error;

    const uuids = data.map(u => u.uuid);
    return res.status(200).json(uuids);
  } catch (err) {
    console.error("[USUARIOS VINCULADOS ERROR]", err);
    return res.status(500).json({ error: "Error al obtener usuarios vinculados." });
  }
});

// ✅ Obtener rangos expirados (antes de cualquier :uuid)
router.get("/rangos-expirados", controller.obtenerRangosExpirados);

// ✅ Obtener premiums expirados (antes de cualquier :uuid)
router.post("/premium/comprado", controller.registrarCompraPremium);

// ✅ Asignar rango desde la web
router.patch("/rango", controller.asignarRangoUsuario);

// ✅ Asignar o quitar estado premium
router.patch("/premium", controller.asignarPremiumUsuario);

// ✅ Registrar compra de rango (comando LP add/addtemp)
router.post("/rango/comprado", controller.registrarCompraRango);

// ✅ Obtener datos de experiencia y progresión
router.get("/:uuid/xp", controller.obtenerXPUsuario);

// ✅ Obtener datos del usuario
router.get("/:uuid", controller.obtenerUsuario);

module.exports = router;
