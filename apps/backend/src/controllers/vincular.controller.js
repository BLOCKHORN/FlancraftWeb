"use strict";

const jwt = require("jsonwebtoken");
const db = require("../models/db");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

const HEX32_RE = /^[a-f0-9]{32}$/i;
const READABLE_RE = /^[A-Za-z0-9_-]{12,64}$/;
const CODE_RE = /^[0-9]{6}$/;

function isValidToken(t) {
  if (!t) return false;
  const s = String(t).trim();
  return HEX32_RE.test(s) || READABLE_RE.test(s);
}

function makeCode6() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, "0");
}

function buildUrl(token) {
  const webBase = String(process.env.VINCULAR_WEB_URL || "https://www.flancraft.com/vincular").trim();
  const sep = webBase.includes("?") ? "&" : "?";
  return `${webBase}${sep}token=${encodeURIComponent(token)}`;
}

exports.vincular = async (req, res) => {
  const { uuid_jugador, username, token } = req.body;

  if (!uuid_jugador || !username || !token) {
    return res.status(400).json({ error: "Faltan campos obligatorios." });
  }

  const tok = String(token).trim();
  if (!isValidToken(tok)) {
    return res.status(400).json({ error: "Token inválido." });
  }

  try {
    const nowIso = new Date().toISOString();

    const { data: pending, error: pendErr } = await db
      .from("vinculaciones")
      .select("token,codigo,expiracion,username")
      .eq("uuid_jugador", uuid_jugador)
      .eq("utilizado", false)
      .gt("expiracion", nowIso)
      .order("expiracion", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pendErr) throw pendErr;

    if (pending?.token) {
      return res.status(200).json({
        message: "Vinculación pendiente existente",
        token: pending.token,
        codigo: pending.codigo || null,
        expiracion: pending.expiracion,
        url: buildUrl(pending.token),
        username: pending.username || username,
      });
    }

    const ttlMin = Math.max(1, Number(process.env.VINCULAR_TTL_MIN || 15));
    const expiracion = new Date(Date.now() + ttlMin * 60 * 1000).toISOString();

    let codigo = null;
    for (let i = 0; i < 6; i++) {
      const c = makeCode6();
      const { data: exists, error: exErr } = await db
        .from("vinculaciones")
        .select("codigo")
        .eq("codigo", c)
        .eq("utilizado", false)
        .gt("expiracion", nowIso)
        .maybeSingle();

      if (exErr) throw exErr;
      if (!exists) {
        codigo = c;
        break;
      }
    }

    const { error: insertError } = await db.from("vinculaciones").insert({
      uuid_jugador,
      username,
      token: tok,
      codigo,
      expiracion,
      utilizado: false,
    });

    if (insertError) throw insertError;

    return res.status(201).json({
      message: "Token registrado con éxito",
      token: tok,
      codigo,
      expiracion,
      url: buildUrl(tok),
      username,
    });
  } catch (err) {
    console.error("[VINCULAR ERROR]", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
};

exports.validarToken = async (req, res) => {
  const { token, codigo } = req.body || {};
  const tok = String(token || "").trim();
  const cod = String(codigo || "").trim();

  if (!isValidToken(tok) && !CODE_RE.test(cod)) {
    return res.status(400).json({ error: "Token o código inválido." });
  }

  try {
    const now = new Date().toISOString();

    let q = db
      .from("vinculaciones")
      .select("uuid_jugador, username, token, codigo")
      .eq("utilizado", false)
      .gt("expiracion", now)
      .limit(1);

    q = isValidToken(tok) ? q.eq("token", tok) : q.eq("codigo", cod);

    const { data, error } = await q.maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Token/código no válido o expirado." });

    const { data: userExists, error: userError } = await db
      .from("usuarios")
      .select("uuid")
      .eq("uuid", data.uuid_jugador)
      .maybeSingle();

    if (userError) throw userError;
    if (userExists) return res.status(409).json({ error: "Este usuario ya está registrado." });

    return res.status(200).json({
      uuid_jugador: data.uuid_jugador,
      username: data.username,
      token: data.token,
      codigo: data.codigo,
    });
  } catch (err) {
    console.error("[VALIDAR TOKEN ERROR]", err);
    return res.status(500).json({ error: "Error interno del servidor." });
  }
};

exports.marcarToken = async (req, res) => {
  const { token } = req.body;
  const tok = String(token || "").trim();
  if (!isValidToken(tok)) {
    return res.status(400).json({ error: "Token inválido." });
  }

  try {
    const { error } = await db
      .from("vinculaciones")
      .update({ utilizado: true })
      .eq("token", tok)
      .eq("utilizado", false);

    if (error) throw error;
    return res.status(200).json({ message: "Token marcado como utilizado" });
  } catch (err) {
    console.error("[MARCAR TOKEN ERROR]", err);
    return res.status(500).json({ error: "Error al marcar token como utilizado." });
  }
};

exports.registrarUsuario = async (req, res) => {
  const { uuid, uid, password, token, codigo } = req.body || {};

  if (!uuid || !uid || !password) {
    return res.status(400).json({ error: "Faltan datos para registrar el usuario." });
  }

  const tok = String(token || "").trim();
  const cod = String(codigo || "").trim();

  try {
    const { data: exists, error: existsError } = await db
      .from("usuarios")
      .select("uuid")
      .eq("uuid", uuid)
      .maybeSingle();

    if (existsError) throw existsError;
    if (exists) return res.status(409).json({ error: "El usuario ya está registrado." });

    const hashedPassword = await bcrypt.hash(String(password), 10);

    const { error: insertError } = await db.from("usuarios").insert({
      uuid,
      uid,
      password: hashedPassword,
      xp_actual: 0,
      nivel: 1,
    });

    if (insertError) throw insertError;

    if (isValidToken(tok) || CODE_RE.test(cod)) {
      const now = new Date().toISOString();

      let q = db
        .from("vinculaciones")
        .select("uuid_jugador")
        .eq("utilizado", false)
        .gt("expiracion", now)
        .limit(1);

      q = isValidToken(tok) ? q.eq("token", tok) : q.eq("codigo", cod);

      const { data: vinc, error: vErr } = await q.maybeSingle();
      if (!vErr && vinc?.uuid_jugador) {
        await db
          .from("vinculaciones")
          .update({ utilizado: true })
          .eq("uuid_jugador", vinc.uuid_jugador)
          .eq("utilizado", false);
      }
    }

    return res.status(201).json({ message: "Usuario registrado con éxito" });
  } catch (err) {
    console.error("[REGISTRO ERROR]", err);
    return res.status(500).json({ error: "Error registrando usuario." });
  }
};

exports.loginUsuario = async (req, res) => {
  const { uid, password } = req.body;

  if (!uid || !password) {
    return res.status(400).json({ error: "Faltan campos obligatorios." });
  }

  try {
    const { data: user, error } = await db
      .from("usuarios")
      .select("uuid, uid, password")
      .eq("uid", uid)
      .maybeSingle();

    if (error) throw error;
    if (!user) return res.status(404).json({ error: "Usuario no encontrado." });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: "Contraseña incorrecta." });
    }

    const { data: permiso, error: rolError } = await db
      .from("permisos_admin")
      .select("rol")
      .eq("uuid", user.uuid)
      .maybeSingle();

    if (rolError) throw rolError;

    const token = jwt.sign(
      { uuid: user.uuid, username: user.uid, rol_admin: permiso?.rol || null },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      uuid: user.uuid,
      username: user.uid,
      rol_admin: permiso?.rol || null,
      token,
    });
  } catch (err) {
    console.error("[LOGIN ERROR]", err);
    return res.status(500).json({ error: "Error interno al iniciar sesión." });
  }
};