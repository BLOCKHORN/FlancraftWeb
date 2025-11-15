const db = require("../models/db");
const bcrypt = require("bcrypt");

// POST /api/reset/validate
exports.validarResetToken = async (req, res) => {
  const { token } = req.body;

  if (!token || typeof token !== "string" || !/^[a-f0-9]{32}$/.test(token)) {
    return res.status(400).json({ error: "Token inválido." });
  }

  try {
    const now = new Date().toISOString();

    const { data, error } = await db
      .from("reset_password")
      .select("uuid")
      .eq("token", token)
      .eq("utilizado", false)
      .gt("expiracion", now)
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Token no válido o expirado." });

    return res.status(200).json({ uuid: data.uuid });
  } catch (err) {
    console.error("[RESET VALIDATE ERROR]", err);
    return res.status(500).json({ error: "Error validando token." });
  }
};

// POST /api/reset/set-password
exports.cambiarPassword = async (req, res) => {
  const { token, nuevaPassword } = req.body;

  if (!token || !nuevaPassword) {
    return res.status(400).json({ error: "Faltan datos." });
  }

  try {
    const now = new Date().toISOString();

    const { data: tokenData, error: tokenError } = await db
      .from("reset_password")
      .select("uuid")
      .eq("token", token)
      .eq("utilizado", false)
      .gt("expiracion", now)
      .maybeSingle();

    if (tokenError) throw tokenError;
    if (!tokenData) return res.status(404).json({ error: "Token no válido o expirado." });

    const hashedPassword = await bcrypt.hash(nuevaPassword, 10);

    const { error: updateError } = await db
      .from("usuarios")
      .update({ password: hashedPassword })
      .eq("uuid", tokenData.uuid);

    if (updateError) throw updateError;

    const { error: marcarError } = await db
      .from("reset_password")
      .update({ utilizado: true })
      .eq("token", token);

    if (marcarError) throw marcarError;

    return res.status(200).json({ message: "Contraseña actualizada con éxito." });
  } catch (err) {
    console.error("[RESET PASSWORD ERROR]", err);
    return res.status(500).json({ error: "Error actualizando la contraseña." });
  }
};
const crypto = require("crypto");

exports.generarResetToken = async (req, res) => {
  const { uuid } = req.body;

  if (!uuid) return res.status(400).json({ error: "Falta UUID." });

  try {
    const token = crypto.randomBytes(16).toString("hex"); // 32 chars
    const expiracion = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min

    const { error } = await db.from("reset_password").insert({
      uuid,
      token,
      expiracion,
      utilizado: false
    });

    if (error) throw error;

    return res.status(201).json({ token });
  } catch (err) {
    console.error("[GENERAR RESET TOKEN ERROR]", err);
    return res.status(500).json({ error: "Error generando token." });
  }
};
