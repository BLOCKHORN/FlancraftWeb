const supabase = require("../models/db");

function normalizeRole(value) {
  if (value === null || value === undefined) return null;
  const role = String(value).trim().toLowerCase().replace(/[\s_-]+/g, "");
  return role || null;
}

module.exports = async function verificaOwner(req, res, next) {
  const uuid = String(req.usuario?.uuid || "").trim();

  if (!uuid) {
    return res.status(401).json({ error: "No autorizado." });
  }

  try {
    const { data, error } = await supabase
      .from("usuarios")
      .select("rango_staff")
      .eq("uuid", uuid)
      .maybeSingle();

    if (error) {
      console.error("[verificaOwner]", error);
      return res.status(500).json({ error: "Error interno verificando permisos." });
    }

    const role = normalizeRole(data?.rango_staff);

    if (role !== "owner") {
      return res.status(403).json({ error: "Acceso restringido a owners" });
    }

    req.usuario = {
      ...req.usuario,
      rango_staff: "owner",
      rol_admin: "owner",
    };

    next();
  } catch (err) {
    console.error("[verificaOwner]", err);
    return res.status(500).json({ error: "Error interno verificando permisos." });
  }
};