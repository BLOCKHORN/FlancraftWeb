const db = require("../models/db");

const RANGOS_VALIDOS = new Set(["nova", "alpha", "inmortal"]);
const FLOODGATE_PREFIX_HEX = "0000000000000000";

const cleanText = (v) => String(v || "").trim();

const stripBedrockPrefix = (v) => cleanText(v).replace(/^\.+/, "");

const isFloodgateUuid = (uuid) => {
  const compact = cleanText(uuid).replace(/-/g, "").toLowerCase();
  return compact.length === 32 && compact.startsWith(FLOODGATE_PREFIX_HEX);
};

const xuidFromFloodgateUuid = (uuid) => {
  try {
    const compact = cleanText(uuid).replace(/-/g, "").toLowerCase();
    if (compact.length !== 32 || !compact.startsWith(FLOODGATE_PREFIX_HEX)) return null;
    return BigInt(`0x${compact.slice(16)}`).toString(10);
  } catch {
    return null;
  }
};

const getJson = async (url) => {
  const res = await fetch(url);
  const data = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, data };
};

const mapUsuarioResponse = (usuario) => ({
  ...(usuario || {}),
  es_premium: usuario?.es_premium === true,
});

const parseRango = (value) => {
  if (value === null || value === undefined) return { ok: true, value: null };

  const rango = String(value).trim().toLowerCase();
  if (!rango || rango === "null" || rango === "none") {
    return { ok: true, value: null };
  }

  if (!RANGOS_VALIDOS.has(rango)) {
    return { ok: false, value: null };
  }

  return { ok: true, value: rango };
};

const actualizarRangoUsuario = async (uuid, rangoUsuario) => {
  const uuidClean = cleanText(uuid);

  const { data: existente, error: errorBusqueda } = await db
    .from("usuarios")
    .select("uuid")
    .eq("uuid", uuidClean)
    .maybeSingle();

  if (errorBusqueda) throw errorBusqueda;
  if (!existente) return false;

  const { error: errorUpdate } = await db
    .from("usuarios")
    .update({ rango_usuario: rangoUsuario })
    .eq("uuid", uuidClean);

  if (errorUpdate) throw errorUpdate;
  return true;
};

exports.obtenerUsuarios = async (req, res) => {
  try {
    const { data, error } = await db
      .from("usuarios")
      .select("uuid, uid, nivel, xp_actual, rango_usuario, wallet_coins, es_premium")
      .order("uid", { ascending: true });

    if (error) throw error;

    return res.status(200).json((data || []).map(mapUsuarioResponse));
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
      .select("uuid, uid, xp_actual, nivel, rango_usuario, wallet_coins, es_premium")
      .eq("uuid", uuid)
      .maybeSingle();

    if (errorUsuario) throw errorUsuario;
    if (!usuario) return res.status(404).json({ error: "Usuario no encontrado." });

    const { data: permiso, error: errorPermiso } = await db
      .from("permisos_admin")
      .select("rol")
      .eq("uuid", uuid)
      .maybeSingle();

    if (errorPermiso) throw errorPermiso;

    return res.status(200).json({
      ...mapUsuarioResponse(usuario),
      rol_admin: permiso?.rol || null,
    });
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
    const gamertag = stripBedrockPrefix(rawUid);
    const bedrockByName = rawUid.startsWith(".");
    const bedrockByUuid = isFloodgateUuid(usuario.uuid);
    const isBedrock = bedrockByName || bedrockByUuid;

    const identifier = isBedrock ? usuario.uuid : gamertag;

    if (!identifier) {
      return res.status(200).json({
        skin_url: null,
        source: "empty",
      });
    }

    return res.status(200).json({
      skin_url: `https://mc-heads.net/player/${encodeURIComponent(identifier)}/160.png`,
      source: isBedrock ? "bedrock" : "java",
    });
  } catch (err) {
    console.error("[OBTENER SKIN USUARIO]", err);
    return res.status(500).json({ error: "Error al obtener skin." });
  }
};

exports.asignarRangoUsuario = async (req, res) => {
  const uuid = cleanText(req.body?.uuid || req.body?.uuid_jugador);
  const parsed = parseRango(req.body?.rango_usuario ?? req.body?.rango ?? null);

  if (!uuid || !parsed.ok) {
    return res.status(400).json({ error: "Datos inválidos para asignar rango." });
  }

  try {
    const updated = await actualizarRangoUsuario(uuid, parsed.value);
    if (!updated) {
      return res.status(404).json({ error: "Usuario no encontrado para asignar rango." });
    }

    return res.status(200).json({ mensaje: "Rango asignado correctamente." });
  } catch (err) {
    console.error("[ASIGNAR RANGO USUARIO]", err);
    return res.status(500).json({ error: "Error al asignar rango al usuario." });
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
  const parsed = parseRango(req.body?.rango_usuario ?? req.body?.rango ?? null);

  if (!uuid || !parsed.ok) {
    return res.status(400).json({ error: "Datos inválidos para registrar el rango." });
  }

  try {
    const updated = await actualizarRangoUsuario(uuid, parsed.value);
    if (!updated) {
      return res.status(404).json({ error: "Usuario no encontrado para registrar rango." });
    }

    return res.status(200).json({
      mensaje: "Rango sincronizado correctamente.",
      rango_usuario: parsed.value,
    });
  } catch (err) {
    console.error("[REGISTRAR COMPRA RANGO]", err);
    return res.status(500).json({ error: "Error al registrar el rango." });
  }
};

exports.sincronizarRangoUsuario = exports.registrarCompraRango;

exports.obtenerRangosExpirados = async (req, res) => {
  return res.status(200).json([]);
};