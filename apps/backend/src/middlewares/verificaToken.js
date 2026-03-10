const jwt = require("jsonwebtoken");
const db = require("../models/db");

function normalizeRole(value) {
  if (value === null || value === undefined) return null;
  const role = String(value).trim().toLowerCase().replace(/[\s_-]+/g, "");
  return role || null;
}

function normalizeUserRank(value) {
  if (value === null || value === undefined) return null;
  const rank = String(value).trim().toLowerCase().replace(/[\s_-]+/g, "");
  return rank || null;
}

module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token no proporcionado" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const uuid = String(decoded?.uuid || "").trim();

    if (!uuid) {
      return res.status(401).json({ error: "Token inválido o incompleto" });
    }

    const { data, error } = await db
      .from("usuarios")
      .select("uuid, uid, rango_usuario, rango_staff, es_premium")
      .eq("uuid", uuid)
      .maybeSingle();

    if (error) {
      console.error("[verificaToken] error cargando usuario:", error);
      return res.status(500).json({ error: "Error interno verificando usuario" });
    }

    if (!data) {
      return res.status(401).json({ error: "Usuario no válido" });
    }

    req.usuario = {
      ...decoded,
      uuid: data.uuid,
      uid: data.uid || decoded?.uid || null,
      rango_usuario: normalizeUserRank(data.rango_usuario),
      rango_staff: normalizeRole(data.rango_staff),
      rol_admin: normalizeRole(data.rango_staff),
      es_premium: data.es_premium === true,
    };

    next();
  } catch (err) {
    console.error("Error verificando token:", err);
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
};