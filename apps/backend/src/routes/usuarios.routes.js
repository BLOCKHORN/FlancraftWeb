const express = require("express");
const router = express.Router();
const controller = require("../controllers/usuarios.controller");
const db = require("../models/db");
const requireRole = require("../middlewares/requireRole");

const pluginApiKey = String(process.env.PLUGIN_API_KEY || process.env.JAILTRACKER_SECRET || "").trim();

function requirePluginSyncAuth(req, res, next) {
  const incoming = String(req.headers["x-api-key"] || req.headers["x-sync-token"] || "").trim();

  if (!pluginApiKey) {
    return res.status(500).json({ error: "PLUGIN_API_KEY no configurado en el backend." });
  }

  if (!incoming || incoming !== pluginApiKey) {
    return res.status(403).json({ error: "Token de sincronización inválido." });
  }

  next();
}

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

router.post("/rango/sync", requirePluginSyncAuth, controller.syncRangoDesdePlugin);
router.post("/rango/comprado", ...requireRole("admin"), controller.registrarCompraRango);
router.post("/check-online", controller.comprobarVinculadosOnline);

router.get("/:uuid/skin", controller.obtenerSkinUsuario);
router.get("/:uuid/xp", controller.obtenerXPUsuario);
router.get("/:uuid", controller.obtenerUsuario);

module.exports = router;