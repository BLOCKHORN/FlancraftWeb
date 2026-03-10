"use strict";

const jwt = require("jsonwebtoken");
const db = require("../models/db");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

const HEX32_RE = /^[a-f0-9]{32}$/i;
const READABLE_RE = /^[A-Za-z0-9_-]{12,64}$/;
const CODE_RE = /^[0-9]{6}$/;

const RANGOS_USUARIO_ORDEN = ["nova", "alpha", "inmortal"];
const RANGOS_STAFF_ORDEN = ["builder", "helper", "srhelper", "mod", "srmod", "admin", "owner"];
const RANGOS_DISPLAY_ORDEN = ["usuario", ...RANGOS_USUARIO_ORDEN, ...RANGOS_STAFF_ORDEN];

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

function normalizeRank(value) {
  if (value === null || value === undefined) return null;

  let rank = String(value).trim().toLowerCase();
  if (!rank) return null;

  if (rank.startsWith("group.")) rank = rank.slice("group.".length);

  rank = rank.replace(/[\s_-]+/g, "");

  if (rank === "none" || rank === "null" || rank === "usuario") return null;
  if (RANGOS_USUARIO_ORDEN.includes(rank)) return rank;
  if (RANGOS_STAFF_ORDEN.includes(rank)) return rank;

  return null;
}

function normalizeRangoUsuario(value) {
  const rank = normalizeRank(value);
  return rank && RANGOS_USUARIO_ORDEN.includes(rank) ? rank : null;
}

function normalizeRangoStaff(value) {
  const rank = normalizeRank(value);
  return rank && RANGOS_STAFF_ORDEN.includes(rank) ? rank : null;
}

function resolveDisplayRank(rangoUsuario, rangoStaff, rolAdmin) {
  const userRank = normalizeRangoUsuario(rangoUsuario);
  const staffRank = normalizeRangoStaff(rangoStaff);
  const adminRank = normalizeRangoStaff(rolAdmin);

  const candidates = [userRank, staffRank, adminRank].filter(Boolean);
  if (!candidates.length) return "usuario";

  let best = "usuario";
  let bestIndex = 0;

  for (const rank of candidates) {
    const index = RANGOS_DISPLAY_ORDEN.indexOf(rank);
    if (index > bestIndex) {
      best = rank;
      bestIndex = index;
    }
  }

  return best;
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
      rango_usuario: null,
      rango_staff: null,
      es_premium: false,
      wallet_coins: 0,
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
  const { uid, password } = req.body || {};

  if (!uid || !password) {
    return res.status(400).json({ error: "Faltan campos obligatorios." });
  }

  try {
    const { data: user, error } = await db
      .from("usuarios")
      .select("uuid, uid, password, rango_usuario, rango_staff, es_premium, wallet_coins, nivel, xp_actual")
      .eq("uid", uid)
      .maybeSingle();

    if (error) throw error;
    if (!user) return res.status(404).json({ error: "Usuario no encontrado." });

    const validPassword = await bcrypt.compare(String(password), String(user.password || ""));
    if (!validPassword) {
      return res.status(401).json({ error: "Contraseña incorrecta." });
    }

    const rango_usuario = normalizeRangoUsuario(user.rango_usuario);
    const rango_staff = normalizeRangoStaff(user.rango_staff);
    const rol_admin = rango_staff;
    const rango_real = resolveDisplayRank(rango_usuario, rango_staff, rol_admin);

    const token = jwt.sign(
      {
        uuid: user.uuid,
        uid: user.uid,
        username: user.uid,
        rango_usuario,
        rango_staff,
        rol_admin,
        rango_real,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      uuid: user.uuid,
      username: user.uid,
      uid: user.uid,
      rango_usuario,
      rango_staff,
      rol_admin,
      rango_real,
      es_premium: user.es_premium === true,
      wallet_coins: Number(user.wallet_coins || 0),
      nivel: Number(user.nivel || 1),
      xp_actual: Number(user.xp_actual || 0),
      token,
    });
  } catch (err) {
    console.error("[LOGIN ERROR]", err);
    return res.status(500).json({ error: "Error interno al iniciar sesión." });
  }
};

exports.obtenerSesionActual = async (req, res) => {
  const uuid = req.usuario?.uuid;

  if (!uuid) {
    return res.status(401).json({ error: "Sesión inválida." });
  }

  try {
    const { data: usuario, error: userError } = await db
      .from("usuarios")
      .select("uuid, uid, xp_actual, nivel, rango_usuario, rango_staff, wallet_coins, es_premium")
      .eq("uuid", uuid)
      .maybeSingle();

    if (userError) throw userError;
    if (!usuario) return res.status(404).json({ error: "Usuario no encontrado." });

    const rango_usuario = normalizeRangoUsuario(usuario.rango_usuario);
    const rango_staff = normalizeRangoStaff(usuario.rango_staff);
    const rol_admin = rango_staff;
    const rango_real = resolveDisplayRank(rango_usuario, rango_staff, rol_admin);

    return res.status(200).json({
      uuid: usuario.uuid,
      username: usuario.uid,
      uid: usuario.uid,
      rol_admin,
      rango_staff,
      rango_usuario,
      rango_real,
      nivel: Number(usuario.nivel || 1),
      xp_actual: Number(usuario.xp_actual || 0),
      wallet_coins: Number(usuario.wallet_coins || 0),
      es_premium: usuario.es_premium === true,
    });
  } catch (err) {
    console.error("[SESION ACTUAL ERROR]", err);
    return res.status(500).json({ error: "Error al obtener la sesión actual." });
  }
};