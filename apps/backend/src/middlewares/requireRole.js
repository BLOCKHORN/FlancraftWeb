const verificaToken = require("./verificaToken");

const ORDER = ["builder", "helper", "srhelper", "mod", "srmod", "admin", "owner"];

function normalizeRole(value) {
  if (value === null || value === undefined) return null;
  const role = String(value).trim().toLowerCase().replace(/[\s_-]+/g, "");
  return role || null;
}

function hasMinRole(currentRole, minRole) {
  const currentIndex = ORDER.indexOf(normalizeRole(currentRole));
  const minIndex = ORDER.indexOf(normalizeRole(minRole));

  if (minIndex === -1) return false;
  if (currentIndex === -1) return false;

  return currentIndex >= minIndex;
}

module.exports = (minRole = "owner") => [
  verificaToken,
  (req, res, next) => {
    const rol = normalizeRole(req.usuario?.rango_staff || req.usuario?.rol_admin);

    if (!hasMinRole(rol, minRole)) {
      return res.status(403).json({ error: "No tienes permisos suficientes." });
    }

    next();
  },
];