const db = require("../models/db");

const RANGOS_USUARIO_ORDEN = ["nova", "alpha", "inmortal"];
const RANGOS_STAFF_ORDEN = ["builder", "helper", "srhelper", "mod", "srmod", "admin", "owner"];
const RANGOS_DISPLAY_ORDEN = ["usuario", ...RANGOS_USUARIO_ORDEN, ...RANGOS_STAFF_ORDEN];

const RANGOS_USUARIO = new Set(RANGOS_USUARIO_ORDEN);
const RANGOS_STAFF = new Set(RANGOS_STAFF_ORDEN);
const RANGOS_DISPLAY = new Set(RANGOS_DISPLAY_ORDEN);

const FLOODGATE_PREFIX_HEX = "0000000000000000";

const cleanText = (v) => String(v || "").trim();

const stripBedrockPrefix = (v) => cleanText(v).replace(/^\.+/, "");

const isFloodgateUuid = (uuid) => {
  const compact = cleanText(uuid).replace(/-/g, "").toLowerCase();
  return compact.length === 32 && compact.startsWith(FLOODGATE_PREFIX_HEX);
};

const normalizeRank = (value) => {
  if (value === null || value === undefined) return null;

  let rank = String(value).trim().toLowerCase();
  if (!rank) return null;

  if (rank.startsWith("group.")) rank = rank.slice("group.".length);

  rank = rank.replace(/[\s_-]+/g, "");

  if (rank === "none" || rank === "null" || rank === "usuario") return null;
  if (rank === "srhelper" || rank === "helper" || rank === "builder" || rank === "mod" || rank === "srmod" || rank === "admin" || rank === "owner") return rank;
  if (rank === "nova" || rank === "alpha" || rank === "inmortal") return rank;

  return null;
};

const normalizeRangoUsuario = (value) => {
  const rank = normalizeRank(value);
  return rank && RANGOS_USUARIO.has(rank) ? rank : null;
};

const normalizeRangoStaff = (value) => {
  const rank = normalizeRank(value);
  return rank && RANGOS_STAFF.has(rank) ? rank : null;
};

const resolveDisplayRank = (rangoUsuario, rangoStaff, rolAdmin) => {
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
};

const mapUsuarioResponse = (usuario, rolAdminRaw = null) => {
  const rango_usuario = normalizeRangoUsuario(usuario?.rango_usuario);
  const rango_staff = normalizeRangoStaff(usuario?.rango_staff);
  const rol_admin = normalizeRangoStaff(rolAdminRaw) || rango_staff;

  return {
    ...(usuario || {}),
    rango_usuario,
    rango_staff,
    rol_admin,
    rango_real: resolveDisplayRank(rango_usuario, rango_staff, rol_admin),
    es_premium: usuario?.es_premium === true,
  };
};

const parseRankField = (value, allowedSet) => {
  if (value === undefined) return { present: false, ok: true, value: null };
  if (value === null) return { present: true, ok: true, value: null };

  const raw = String(value).trim();
  if (!raw || raw.toLowerCase() === "null" || raw.toLowerCase() === "none" || raw.toLowerCase() === "usuario") {
    return { present: true, ok: true, value: null };
  }

  const rank = normalizeRank(raw);
  if (!rank || !allowedSet.has(rank)) {
    return { present: true, ok: false, value: null };
  }

  return { present: true, ok: true, value: rank };
};

const parseGenericRank = (value) => {
  if (value === undefined) return { present: false, ok: true, user: null, staff: null };
  if (value === null) return { present: true, ok: true, user: null, staff: null };

  const raw = String(value).trim();
  if (!raw || raw.toLowerCase() === "null" || raw.toLowerCase() === "none" || raw.toLowerCase() === "usuario") {
    return { present: true, ok: true, user: null, staff: null };
  }

  const rank = normalizeRank(raw);
  if (!rank || !RANGOS_DISPLAY.has(rank)) {
    return { present: true, ok: false, user: null, staff: null };
  }

  if (RANGOS_USUARIO.has(rank)) {
    return { present: true, ok: true, user: rank, staff: null };
  }

  if (RANGOS_STAFF.has(rank)) {
    return { present: true, ok: true, user: null, staff: rank };
  }

  return { present: true, ok: true, user: null, staff: null };
};

const normalizeUserName = (value) => {
  const raw = cleanText(value);
  if (!raw) return null;
  return raw.replace(/^\.+/, "");
};

const buscarUsuarioParaSync = async ({ uuid, username }) => {
  const uuidClean = cleanText(uuid);
  const userClean = normalizeUserName(username);

  if (uuidClean) {
    const { data, error } = await db
      .from("usuarios")
      .select("uuid, uid, xp_actual, nivel, rango_usuario, rango_staff, wallet_coins, es_premium")
      .eq("uuid", uuidClean)
      .maybeSingle();

    if (error) throw error;
    if (data) return data;
  }

  if (userClean) {
    const { data, error } = await db
      .from("usuarios")
      .select("uuid, uid, xp_actual, nivel, rango_usuario, rango_staff, wallet_coins, es_premium")
      .ilike("uid", userClean)
      .maybeSingle();

    if (error) throw error;
    if (data) return data;
  }

  return null;
};

const actualizarRangosUsuario = async (uuid, patch) => {
  const uuidClean = cleanText(uuid);

  const { data: existente, error: errorBusqueda } = await db
    .from("usuarios")
    .select("uuid, uid, xp_actual, nivel, rango_usuario, rango_staff, wallet_coins, es_premium")
    .eq("uuid", uuidClean)
    .maybeSingle();

  if (errorBusqueda) throw errorBusqueda;
  if (!existente) return null;

  const update = {};

  if (Object.prototype.hasOwnProperty.call(patch || {}, "rango_usuario")) {
    update.rango_usuario = normalizeRangoUsuario(patch.rango_usuario);
  }

  if (Object.prototype.hasOwnProperty.call(patch || {}, "rango_staff")) {
    update.rango_staff = normalizeRangoStaff(patch.rango_staff);
  }

  if (!Object.keys(update).length) {
    return mapUsuarioResponse(existente);
  }

  const { data: updated, error: errorUpdate } = await db
    .from("usuarios")
    .update(update)
    .eq("uuid", uuidClean)
    .select("uuid, uid, xp_actual, nivel, rango_usuario, rango_staff, wallet_coins, es_premium")
    .maybeSingle();

  if (errorUpdate) throw errorUpdate;

  return mapUsuarioResponse(updated || { ...existente, ...update });
};

exports.obtenerUsuarios = async (req, res) => {
  try {
    const { data: usuarios, error: errorUsuarios } = await db
      .from("usuarios")
      .select("uuid, uid, nivel, xp_actual, rango_usuario, rango_staff, wallet_coins, es_premium")
      .order("uid", { ascending: true });

    if (errorUsuarios) throw errorUsuarios;

    const listaUsuarios = Array.isArray(usuarios) ? usuarios : [];

    return res.status(200).json(
      listaUsuarios.map((row) => mapUsuarioResponse(row))
    );
  } catch (err) {
    console.error("[OBTENER TODOS LOS USUARIOS]", err);
    return res.status(500).json({ error: "Error al obtener usuarios." });
  }
};

exports.obtenerUsuario = async (req, res) => {
  const { uuid } = req.params;

  if (!uuid) {
    return res.status(400).json({ error: "Falta UUID en la solicitud." });
  }

  try {
    const { data: usuario, error: errorUsuario } = await db
      .from("usuarios")
      .select("uuid, uid, xp_actual, nivel, rango_usuario, rango_staff, wallet_coins, es_premium")
      .eq("uuid", uuid)
      .maybeSingle();

    if (errorUsuario) throw errorUsuario;
    if (!usuario) return res.status(404).json({ error: "Usuario no encontrado." });

    return res.status(200).json(mapUsuarioResponse(usuario));
  } catch (err) {
    console.error("[OBTENER USUARIO]", err);
    return res.status(500).json({ error: "Error interno del servidor." });
  }
};

exports.obtenerXPUsuario = async (req, res) => {
  const { uuid } = req.params;

  if (!uuid) {
    return res.status(400).json({ error: "Falta UUID en la solicitud." });
  }

  try {
    const { data: usuario, error: errorUsuario } = await db
      .from("usuarios")
      .select("uuid, nivel, xp_actual")
      .eq("uuid", uuid)
      .maybeSingle();

    if (errorUsuario) throw errorUsuario;
    if (!usuario) return res.status(404).json({ error: "Usuario no encontrado." });

    const { data: niveles, error: errorNiveles } = await db
      .from("niveles")
      .select("nivel, xp_requerida, xp_total_acumulada")
      .order("nivel", { ascending: true });

    if (errorNiveles) throw errorNiveles;

    const nivelesSafe = Array.isArray(niveles) ? niveles : [];
    const nivelActual = Number(usuario.nivel) || 1;
    const xpActual = Number(usuario.xp_actual) || 0;

    const nivelInfo = nivelesSafe.find((n) => Number(n?.nivel) === nivelActual);
    const ultimoNivel = nivelesSafe.length ? nivelesSafe[nivelesSafe.length - 1] : null;
    const nivel51 = nivelesSafe.find((n) => Number(n?.nivel) === 51);

    const xpTotalActual = (Number(nivelInfo?.xp_total_acumulada) || 0) + xpActual;
    const xpTotalMaxima =
      Number(nivel51?.xp_total_acumulada) ||
      ((Number(ultimoNivel?.xp_total_acumulada) || 0) + (Number(ultimoNivel?.xp_requerida) || 0));

    return res.status(200).json({
      nivel: nivelActual,
      xp_actual: xpActual,
      xp_total_actual: xpTotalActual,
      xp_total_maxima: xpTotalMaxima,
      niveles: nivelesSafe,
    });
  } catch (err) {
    console.error("[OBTENER XP USUARIO]", err);
    return res.status(500).json({ error: "Error interno del servidor." });
  }
};

exports.obtenerSkinUsuario = async (req, res) => {
  const { uuid } = req.params;

  if (!uuid) {
    return res.status(400).json({ error: "Falta UUID en la solicitud." });
  }

  try {
    const { data: usuario, error: errorUsuario } = await db
      .from("usuarios")
      .select("uuid, uid")
      .eq("uuid", uuid)
      .maybeSingle();

    if (errorUsuario) throw errorUsuario;
    if (!usuario) return res.status(404).json({ error: "Usuario no encontrado." });

    const rawUid = cleanText(usuario.uid);
    const bedrockByUuid = isFloodgateUuid(usuario.uuid);
    const isBedrock = rawUid.startsWith(".") || bedrockByUuid;

    let skinUrl = "";

    if (isBedrock) {
      skinUrl = `https://crafthead.net/avatar/${usuario.uuid}`;
    } else {
      const gamertag = rawUid.replace(/^\.+/, "");
      skinUrl = `https://mc-heads.net/avatar/${encodeURIComponent(gamertag)}/160.png`;
    }

    return res.status(200).json({
      skin_url: skinUrl,
      source: isBedrock ? "bedrock" : "java",
    });
  } catch (err) {
    console.error("[OBTENER SKIN USUARIO]", err);
    return res.status(500).json({ error: "Error al obtener skin." });
  }
};

exports.asignarRangoUsuario = async (req, res) => {
  const uuid = cleanText(req.body?.uuid || req.body?.uuid_jugador);
  const parsed = parseRankField(req.body?.rango_usuario ?? req.body?.rango ?? null, RANGOS_USUARIO);

  if (!uuid || !parsed.ok) {
    return res.status(400).json({ error: "Datos inválidos para asignar rango." });
  }

  try {
    const updated = await actualizarRangosUsuario(uuid, { rango_usuario: parsed.value });
    if (!updated) {
      return res.status(404).json({ error: "Usuario no encontrado para asignar rango." });
    }

    return res.status(200).json({
      mensaje: "Rango de usuario asignado correctamente.",
      rango_usuario: updated.rango_usuario,
      rango_staff: updated.rango_staff,
      rango_real: updated.rango_real,
      rol_admin: updated.rol_admin,
    });
  } catch (err) {
    console.error("[ASIGNAR RANGO USUARIO]", err);
    return res.status(500).json({ error: "Error al asignar rango al usuario." });
  }
};

exports.asignarRangoStaff = async (req, res) => {
  const uuid = cleanText(req.body?.uuid || req.body?.uuid_jugador);
  const parsed = parseRankField(req.body?.rango_staff ?? req.body?.rango ?? null, RANGOS_STAFF);

  if (!uuid || !parsed.ok) {
    return res.status(400).json({ error: "Datos inválidos para asignar rango staff." });
  }

  try {
    const updated = await actualizarRangosUsuario(uuid, { rango_staff: parsed.value });
    if (!updated) {
      return res.status(404).json({ error: "Usuario no encontrado para asignar rango staff." });
    }

    return res.status(200).json({
      mensaje: "Rango staff asignado correctamente.",
      rango_usuario: updated.rango_usuario,
      rango_staff: updated.rango_staff,
      rango_real: updated.rango_real,
      rol_admin: updated.rol_admin,
    });
  } catch (err) {
    console.error("[ASIGNAR RANGO STAFF]", err);
    return res.status(500).json({ error: "Error al asignar rango staff al usuario." });
  }
};

exports.actualizarPremiumUsuario = async (req, res) => {
  const uuid = cleanText(req.body?.uuid || req.body?.uuid_jugador);
  const esPremium = req.body?.es_premium === true;

  if (!uuid) {
    return res.status(400).json({ error: "Faltan datos para actualizar premium." });
  }

  try {
    const { data: existente, error: errorBusqueda } = await db
      .from("usuarios")
      .select("uuid")
      .eq("uuid", uuid)
      .maybeSingle();

    if (errorBusqueda) throw errorBusqueda;
    if (!existente) return res.status(404).json({ error: "Usuario no encontrado." });

    const { error } = await db
      .from("usuarios")
      .update({ es_premium: esPremium })
      .eq("uuid", uuid);

    if (error) throw error;

    return res.status(200).json({ mensaje: "Premium actualizado correctamente.", es_premium: esPremium });
  } catch (err) {
    console.error("[ACTUALIZAR PREMIUM USUARIO]", err);
    return res.status(500).json({ error: "Error al actualizar premium." });
  }
};

exports.registrarCompraRango = async (req, res) => {
  const uuid = cleanText(req.body?.uuid || req.body?.uuid_jugador);
  const username = cleanText(req.body?.username || req.body?.nombre_jugador || req.body?.uid);
  const parsedUsuario = parseRankField(req.body?.rango_usuario, RANGOS_USUARIO);
  const parsedStaff = parseRankField(req.body?.rango_staff, RANGOS_STAFF);
  const parsedGeneric = parseGenericRank(req.body?.rango ?? req.body?.rango_real);

  if ((!uuid && !username) || !parsedUsuario.ok || !parsedStaff.ok || !parsedGeneric.ok) {
    return res.status(400).json({ error: "Datos inválidos para sincronizar el rango." });
  }

  try {
    const existente = await buscarUsuarioParaSync({ uuid, username });

    if (!existente) {
      return res.status(404).json({ error: "Usuario no encontrado para sincronizar el rango." });
    }

    let nextUsuario = normalizeRangoUsuario(existente.rango_usuario);
    let nextStaff = normalizeRangoStaff(existente.rango_staff);

    if (parsedGeneric.present) {
      nextUsuario = parsedGeneric.user;
      nextStaff = parsedGeneric.staff;
    }

    if (parsedUsuario.present) nextUsuario = parsedUsuario.value;
    if (parsedStaff.present) nextStaff = parsedStaff.value;

    const updated = await actualizarRangosUsuario(existente.uuid, {
      rango_usuario: nextUsuario,
      rango_staff: nextStaff,
    });

    return res.status(200).json({
      mensaje: "Rango sincronizado correctamente.",
      uuid: updated?.uuid || existente.uuid,
      uid: updated?.uid || existente.uid || username || null,
      rango_usuario: updated?.rango_usuario || null,
      rango_staff: updated?.rango_staff || null,
      rango_real: updated?.rango_real || "usuario",
      rol_admin: updated?.rol_admin || null,
    });
  } catch (err) {
    console.error("[REGISTRAR COMPRA RANGO]", err);
    return res.status(500).json({ error: "Error al registrar el rango." });
  }
};

exports.sincronizarRangoUsuario = exports.registrarCompraRango;
exports.syncRangoDesdePlugin = exports.registrarCompraRango;

exports.obtenerRangosExpirados = async (req, res) => {
  return res.status(200).json([]);
};