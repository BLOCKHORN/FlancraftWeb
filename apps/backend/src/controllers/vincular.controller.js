// 📁 src/controllers/vincular.controller.js
const jwt = require("jsonwebtoken"); 
const db = require("../models/db");
const bcrypt = require("bcrypt");

// POST /api/vincular
exports.vincular = async (req, res) => {
  const { uuid_jugador, username, token } = req.body;

  if (!uuid_jugador || !username || !token) {
    return res.status(400).json({ error: "Faltan campos obligatorios." });
  }

  try {
    const now = new Date();
    const expiracion = new Date(now.getTime() + 15 * 60 * 1000);

    await db
      .from("vinculaciones")
      .delete()
      .eq("uuid_jugador", uuid_jugador)
      .eq("utilizado", false)
      .gt("expiracion", now.toISOString());

    const { error: insertError } = await db.from("vinculaciones").insert({
      uuid_jugador,
      username,
      token,
      expiracion: expiracion.toISOString(),
      utilizado: false
    });

    if (insertError) throw insertError;

    return res.status(201).json({ message: "Token registrado con éxito" });
  } catch (err) {
    console.error("[VINCULAR ERROR]", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
};

// POST /api/vincular/validate
exports.validarToken = async (req, res) => {
  const { token } = req.body;

  if (!token || typeof token !== "string" || !/^[a-f0-9]{32}$/.test(token)) {
    return res.status(400).json({ error: "Token inválido." });
  }

  try {
    const now = new Date().toISOString();

    const { data, error } = await db
      .from("vinculaciones")
      .select("uuid_jugador, username")
      .eq("token", token)
      .eq("utilizado", false)
      .gt("expiracion", now)
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Token no válido o expirado." });

    const { data: userExists, error: userError } = await db
      .from("usuarios")
      .select("uuid")
      .eq("uuid", data.uuid_jugador)
      .maybeSingle();

    if (userError) throw userError;
    if (userExists) return res.status(409).json({ error: "Este usuario ya está registrado." });

    return res.status(200).json({
      uuid_jugador: data.uuid_jugador,
      username: data.username
    });
  } catch (err) {
    console.error("[VALIDAR TOKEN ERROR]", err);
    return res.status(500).json({ error: "Error interno del servidor." });
  }
};

// POST /api/vincular/marcar
exports.marcarToken = async (req, res) => {
  const { token } = req.body;

  if (!token || typeof token !== "string" || !/^[a-f0-9]{32}$/.test(token)) {
    return res.status(400).json({ error: "Token inválido." });
  }

  try {
    const { error } = await db
      .from("vinculaciones")
      .update({ utilizado: true })
      .eq("token", token)
      .eq("utilizado", false);

    if (error) throw error;
    return res.status(200).json({ message: "Token marcado como utilizado" });
  } catch (err) {
    console.error("[MARCAR TOKEN ERROR]", err);
    return res.status(500).json({ error: "Error al marcar token como utilizado." });
  }
};

// POST /api/vincular/registrar
exports.registrarUsuario = async (req, res) => {
  const { uuid, uid, password } = req.body;

  if (!uuid || !uid || !password) {
    return res.status(400).json({ error: "Faltan datos para registrar el usuario." });
  }

  try {
    const { data: exists, error: existsError } = await db
      .from("usuarios")
      .select("uuid")
      .eq("uuid", uuid)
      .maybeSingle();

    if (existsError) throw existsError;
    if (exists) return res.status(409).json({ error: "El usuario ya está registrado." });

    const hashedPassword = await bcrypt.hash(password, 10);

    const { error: insertError } = await db.from("usuarios").insert({
      uuid,
      uid,
      password: hashedPassword,
      xp_actual: 0,
      nivel: 1
    });

    if (insertError) throw insertError;

    return res.status(201).json({ message: "Usuario registrado con éxito" });
  } catch (err) {
    console.error("[REGISTRO ERROR]", err);
    return res.status(500).json({ error: "Error registrando usuario." });
  }
};

// POST /api/vincular/login
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

    // ✅ Generar JWT
    const token = jwt.sign(
      {
        uuid: user.uuid,
        username: user.uid,
        rol_admin: permiso?.rol || null,
      },
      process.env.JWT_SECRET, // asegúrate de tener esta clave en tu `.env`
      { expiresIn: "7d" }
    );

    // ✅ Devolver token al frontend
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