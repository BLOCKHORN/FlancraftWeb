const db = require("../models/db");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

const HEX32_RE = /^[a-f0-9]{32}$/i;
const CODE_RE = /^[0-9]{6}$/;

function isValidResetToken(value) {
  return HEX32_RE.test(String(value || "").trim());
}

function isValidResetCode(value) {
  return CODE_RE.test(String(value || "").trim());
}

function makeCode6() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, "0");
}

function buildResetUrl(token, codigo) {
  const webBase = String(process.env.RESET_WEB_URL || "https://www.flancraft.com/reset").trim();
  const params = [];

  if (token) params.push(`token=${encodeURIComponent(token)}`);
  if (codigo) params.push(`codigo=${encodeURIComponent(codigo)}`);

  if (!params.length) return webBase;

  const sep = webBase.includes("?") ? "&" : "?";
  return `${webBase}${sep}${params.join("&")}`;
}

async function findResetRow({ token, codigo }) {
  let query = db
    .from("reset_password")
    .select("uuid, token, codigo, expiracion, utilizado")
    .limit(1);

  if (token) query = query.eq("token", token);
  else query = query.eq("codigo", codigo);

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data || null;
}

async function findActiveCodeCollision(codigo, nowIso) {
  const { data, error } = await db
    .from("reset_password")
    .select("codigo")
    .eq("codigo", codigo)
    .eq("utilizado", false)
    .gt("expiracion", nowIso)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}

exports.validarResetToken = async (req, res) => {
  const rawToken = String(req.body?.token || "").trim();
  const rawCodigo = String(req.body?.codigo || "").trim();

  if (!isValidResetToken(rawToken) && !isValidResetCode(rawCodigo)) {
    return res.status(400).json({ error: "Token o código inválido." });
  }

  try {
    const row = await findResetRow({
      token: isValidResetToken(rawToken) ? rawToken : null,
      codigo: isValidResetCode(rawCodigo) ? rawCodigo : null,
    });

    if (!row) {
      return res.status(404).json({ error: "Token o código no válido." });
    }

    const expiracionMs = new Date(row.expiracion).getTime();
    if (row.utilizado || !expiracionMs || expiracionMs <= Date.now()) {
      return res.status(410).json({ error: "Token o código expirado o ya utilizado." });
    }

    return res.status(200).json({
      uuid: row.uuid,
      token: row.token,
      codigo: row.codigo || null,
      expiracion: row.expiracion,
      url: buildResetUrl(row.token, row.codigo),
    });
  } catch (err) {
    console.error("[RESET VALIDATE ERROR]", err);
    return res.status(500).json({ error: "Error validando token." });
  }
};

exports.cambiarPassword = async (req, res) => {
  const rawToken = String(req.body?.token || "").trim();
  const rawCodigo = String(req.body?.codigo || "").trim();
  const nuevaPassword = String(req.body?.nuevaPassword || "");

  if ((!isValidResetToken(rawToken) && !isValidResetCode(rawCodigo)) || !nuevaPassword) {
    return res.status(400).json({ error: "Faltan datos." });
  }

  try {
    const row = await findResetRow({
      token: isValidResetToken(rawToken) ? rawToken : null,
      codigo: isValidResetCode(rawCodigo) ? rawCodigo : null,
    });

    if (!row) {
      return res.status(404).json({ error: "Token o código no válido." });
    }

    const expiracionMs = new Date(row.expiracion).getTime();
    if (row.utilizado || !expiracionMs || expiracionMs <= Date.now()) {
      return res.status(410).json({ error: "Token o código expirado o ya utilizado." });
    }

    const hashedPassword = await bcrypt.hash(nuevaPassword, 10);

    const { error: updateError } = await db
      .from("usuarios")
      .update({ password: hashedPassword })
      .eq("uuid", row.uuid);

    if (updateError) throw updateError;

    const { error: marcarError } = await db
      .from("reset_password")
      .update({ utilizado: true })
      .eq("token", row.token);

    if (marcarError) throw marcarError;

    return res.status(200).json({ message: "Contraseña actualizada con éxito." });
  } catch (err) {
    console.error("[RESET PASSWORD ERROR]", err);
    return res.status(500).json({ error: "Error actualizando la contraseña." });
  }
};

exports.generarResetToken = async (req, res) => {
  const uuid = String(req.body?.uuid || "").trim();

  if (!uuid) {
    return res.status(400).json({ error: "Falta UUID." });
  }

  try {
    const { data: user, error: userError } = await db
      .from("usuarios")
      .select("uuid")
      .eq("uuid", uuid)
      .maybeSingle();

    if (userError) throw userError;
    if (!user) {
      return res.status(404).json({ error: "Ese jugador no está vinculado con la web." });
    }

    const nowIso = new Date().toISOString();
    const expiracion = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const token = crypto.randomBytes(16).toString("hex");

    let codigo = null;
    for (let i = 0; i < 10; i++) {
      const candidate = makeCode6();
      const exists = await findActiveCodeCollision(candidate, nowIso);
      if (!exists) {
        codigo = candidate;
        break;
      }
    }

    if (!codigo) {
      return res.status(500).json({ error: "No se ha podido generar un código temporal." });
    }

    const { error: deleteError } = await db
      .from("reset_password")
      .delete()
      .eq("uuid", uuid);

    if (deleteError) throw deleteError;

    const { error: insertError } = await db
      .from("reset_password")
      .insert({
        uuid,
        token,
        codigo,
        expiracion,
        utilizado: false,
      });

    if (insertError) throw insertError;

    return res.status(201).json({
      token,
      codigo,
      expiracion,
      url: buildResetUrl(token, codigo),
    });
  } catch (err) {
    console.error("[GENERAR RESET TOKEN ERROR]", err);
    return res.status(500).json({ error: "Error generando token." });
  }
};