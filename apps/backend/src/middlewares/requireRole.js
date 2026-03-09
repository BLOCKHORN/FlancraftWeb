const verificaToken = require("./verificaToken");

const ORDER = ["helper", "srhelper", "mod", "srmod", "admin", "owner"];

function hasMinRole(currentRole, minRole) {
  const currentIndex = ORDER.indexOf(String(currentRole || "").toLowerCase());
  const minIndex = ORDER.indexOf(String(minRole || "").toLowerCase());
  if (minIndex === -1) return false;
  return currentIndex >= minIndex;
}

module.exports = (minRole = "owner") => [
  verificaToken,
  (req, res, next) => {
    const rol = req.usuario?.rol_admin || null;
    if (!hasMinRole(rol, minRole)) {
      return res.status(403).json({ error: "No tienes permisos suficientes." });
    }
    next();
  },
];
