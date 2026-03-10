const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEX32_RE = /^[a-f0-9]{32}$/i;
const READABLE_RE = /^[A-Za-z0-9_-]{12,64}$/;

function isValidToken(t) {
  if (!t) return false;
  const s = String(t).trim();
  return HEX32_RE.test(s) || READABLE_RE.test(s);
}

module.exports = function validateVincular(req, res, next) {
  const b = req.body || {};
  const uuid_jugador = String(b.uuid_jugador || "").trim();
  const username = String(b.username || "").trim();
  const token = String(b.token || "").trim();

  if (!uuid_jugador || !username || !token) {
    return res.status(400).json({ error: "Faltan campos obligatorios." });
  }

  if (!UUID_RE.test(uuid_jugador)) {
    return res.status(400).json({ error: "UUID inválido." });
  }

  if (username.length < 2 || username.length > 20) {
    return res.status(400).json({ error: "Username inválido." });
  }

  if (!isValidToken(token)) {
    return res.status(400).json({ error: "Token inválido." });
  }

  req.body.uuid_jugador = uuid_jugador;
  req.body.username = username;
  req.body.token = token;

  next();
};