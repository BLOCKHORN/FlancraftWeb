const db = require("../models/db");

// ✅ Obtener todos los usuarios (UUID + nombre + rango + premium)
exports.obtenerUsuarios = async (req, res) => {
  try {
    const { data, error } = await db
      .from("usuarios")
      .select("uuid, uid, rango_usuario, es_premium")
      .order("uid", { ascending: true });

    if (error) throw error;

    return res.status(200).json(data);
  } catch (err) {
    console.error("[OBTENER TODOS LOS USUARIOS]", err);
    return res.status(500).json({ error: "Error al obtener usuarios." });
  }
};

// ✅ Obtener datos básicos del usuario por UUID (con limpieza de rangos expirados)
exports.obtenerUsuario = async (req, res) => {
  const { uuid } = req.params;

  if (!uuid) {
    return res.status(400).json({ error: "Falta UUID en la solicitud." });
  }

  try {
    // Limpieza automática si el rango temporal ya expiró
    const { data: tempRango, error: errorTemp } = await db
      .from("rangos_temporales")
      .select("fecha_expiracion, rango")
      .eq("uuid", uuid)
      .maybeSingle();

    if (errorTemp) throw errorTemp;

    if (
      tempRango?.fecha_expiracion &&
      new Date(tempRango.fecha_expiracion) <= new Date()
    ) {
      await db.from("usuarios").update({ rango_usuario: null }).eq("uuid", uuid);
      await db.from("rangos_temporales").delete().eq("uuid", uuid);
      console.log(`[EXPIRACIÓN] Rango expirado limpiado para ${uuid}`);
    }

    const { data: usuario, error: errorUsuario } = await db
      .from("usuarios")
      .select("uuid, uid, xp_actual, nivel, es_premium, rango_usuario")
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
      ...usuario,
      rol_admin: permiso?.rol || null
    });
  } catch (err) {
    console.error("[OBTENER USUARIO]", err);
    return res.status(500).json({ error: "Error interno del servidor." });
  }
};

// ✅ Obtener datos de progresión XP avanzados
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

    const nivelActual = usuario.nivel;
    const xpActual = usuario.xp_actual;

    const nivelInfo = niveles.find(n => n.nivel === nivelActual);
    const xpTotalActual = (nivelInfo?.xp_total_acumulada || 0) + xpActual;

    const xpTotalMaxima =
      niveles.find(n => n.nivel === 51)?.xp_total_acumulada ||
      niveles[niveles.length - 1]?.xp_total_acumulada + niveles[niveles.length - 1]?.xp_requerida;

    return res.status(200).json({
      nivel: nivelActual,
      xp_actual: xpActual,
      xp_total_actual: xpTotalActual,
      xp_total_maxima: xpTotalMaxima,
      niveles
    });
  } catch (err) {
    console.error("[OBTENER XP USUARIO]", err);
    return res.status(500).json({ error: "Error interno del servidor." });
  }
};

// ✅ Asignar rango comprado a un usuario (manual desde panel)
exports.asignarRangoUsuario = async (req, res) => {
  const { uuid, rango_usuario } = req.body;

  const rangosValidos = ['nova', 'alpha', 'inmortal'];
  if (!uuid || (rango_usuario !== null && !rangosValidos.includes(rango_usuario))) {
    return res.status(400).json({ error: "Datos inválidos para asignar rango." });
  }

  try {
    const { error } = await db
      .from("usuarios")
      .update({ rango_usuario })
      .eq("uuid", uuid);

    if (error) throw error;

    return res.status(200).json({ mensaje: "Rango asignado correctamente." });
  } catch (err) {
    console.error("[ASIGNAR RANGO USUARIO]", err);
    return res.status(500).json({ error: "Error al asignar rango al usuario." });
  }
};

// ✅ Asignar o quitar estado PREMIUM a un usuario
exports.asignarPremiumUsuario = async (req, res) => {
  const { uuid, es_premium } = req.body;

  if (!uuid || typeof es_premium !== "boolean") {
    return res.status(400).json({ error: "Datos inválidos para asignar premium." });
  }

  try {
    const { error } = await db
      .from("usuarios")
      .update({ es_premium })
      .eq("uuid", uuid);

    if (error) throw error;

    return res.status(200).json({ mensaje: "Estado premium actualizado correctamente." });
  } catch (err) {
    console.error("[ASIGNAR PREMIUM]", err);
    return res.status(500).json({ error: "Error al actualizar estado premium del usuario." });
  }
};

// ✅ Registrar compra de rango (permanente o temporal)
exports.registrarCompraRango = async (req, res) => {
  const { uuid, rango_usuario, temporal, fecha_expiracion } = req.body;

  const rangosValidos = ['nova', 'alpha', 'inmortal'];
  if (!uuid || (rango_usuario !== null && !rangosValidos.includes(rango_usuario))) {
    return res.status(400).json({ error: "Datos inválidos para asignar rango." });
  }

  try {
    const { error: errorUpdate } = await db
      .from("usuarios")
      .update({ rango_usuario, es_premium: true })
      .eq("uuid", uuid);

    if (errorUpdate) throw errorUpdate;

    if (temporal) {
      if (!fecha_expiracion) {
        return res.status(400).json({ error: "Falta fecha de expiración para rango temporal." });
      }

      const { error: errorTemp } = await db
        .from("rangos_temporales")
        .upsert({ uuid, rango: rango_usuario, fecha_expiracion });

      if (errorTemp) throw errorTemp;
    } else {
      await db.from("rangos_temporales").delete().eq("uuid", uuid);
    }

    return res.status(200).json({ mensaje: "Compra de rango registrada correctamente." });
  } catch (err) {
    console.error("[REGISTRAR COMPRA RANGO]", err);
    return res.status(500).json({ error: "Error al registrar el rango comprado." });
  }
};

// ✅ Obtener rangos expirados (solo para depuración o plugin si fuera necesario)
exports.obtenerRangosExpirados = async (req, res) => {
  try {
    const ahora = new Date().toISOString();

    const { data, error } = await db
      .from("rangos_temporales")
      .select("uuid, rango, fecha_expiracion")
      .lte("fecha_expiracion", ahora);

    if (error) throw error;

    return res.status(200).json(data);
  } catch (err) {
    console.error("[RANGOS EXPIRADOS]", err);
    return res.status(500).json({ error: "Error al obtener rangos expirados." });
  }
};
exports.registrarCompraPremium = async (req, res) => {
  const { uuid, fecha_expiracion } = req.body;

  if (!uuid || !fecha_expiracion) {
    return res.status(400).json({ error: "Faltan datos para registrar premium." });
  }

  try {
    const { error: errorUsuario } = await db
      .from("usuarios")
      .update({ es_premium: true })
      .eq("uuid", uuid);

    if (errorUsuario) throw errorUsuario;

    const { error: errorUpsert } = await db
      .from("premium_temporal")
      .upsert({ uuid, fecha_expiracion });

    if (errorUpsert) throw errorUpsert;

    return res.status(200).json({ mensaje: "Premium temporal registrado correctamente." });
  } catch (err) {
    console.error("[REGISTRAR PREMIUM TEMPORAL]", err);
    return res.status(500).json({ error: "Error al registrar premium temporal." });
  }
};
