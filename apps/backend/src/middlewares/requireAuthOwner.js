// middlewares/requireAuthOwner.js
const jwt = require("jsonwebtoken");
const supabase = require("../models/db");

module.exports = async function (req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token no proporcionado" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decoded;

    const { uuid } = decoded;
    const { data, error } = await supabase
      .from("permisos_admin")
      .select("rol")
      .eq("uuid", uuid)
      .single();

    if (error || !data || data.rol !== "owner") {
      return res.status(403).json({ error: "Acceso restringido a owners" });
    }

    next();
  } catch (err) {
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
};
