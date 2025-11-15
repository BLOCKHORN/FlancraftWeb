module.exports = (req, res, next) => {
  const { uuid_jugador, username, token } = req.body;

  if (!uuid_jugador || !username || !token) {
    return res.status(400).json({ error: "Faltan campos obligatorios." });
  }

  if (
    typeof uuid_jugador !== "string" ||
    typeof username !== "string" ||
    typeof token !== "string"
  ) {
    return res.status(400).json({ error: "Datos inválidos." });
  }

  if (!/^[a-f0-9\-]{36}$/.test(uuid_jugador)) {
    return res.status(400).json({ error: "UUID inválido." });
  }

  if (!/^[a-f0-9]{32}$/.test(token)) {
    return res.status(400).json({ error: "Token inválido." });
  }

  next();
};
