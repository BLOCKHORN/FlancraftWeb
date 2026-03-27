const db = require("../models/db");
const { evaluateWebAchievementsForUser } = require("../services/webLogros.service");

const STAFF_ROLES = new Set(["admin", "owner"]);

const normalizeRole = (value) => {
  if (value === null || value === undefined) return null;
  const role = String(value).trim().toLowerCase().replace(/[\s_-]+/g, "");
  return role || null;
};

const getSessionRole = (req) => {
  return normalizeRole(req.usuario?.rol_admin) || normalizeRole(req.usuario?.rango_staff);
};

// Mapeo fijo de recompensas. Si el nivel no está aquí, no se da dinero.
const RECOMPENSAS_COINS = {
  1: 12, 5: 94, 10: 178, 15: 246, 20: 302,
  25: 351, 30: 393, 35: 432, 40: 469, 45: 502, 50: 521
};

exports.reclamarRecompensa = async (req, res) => {
  const sessionUuid = req.usuario?.uuid || null;
  const sessionRole = getSessionRole(req);
  const bodyUuid = String(req.body?.uuid || "").trim();
  const nivelNum = Number(req.body?.nivel);

  if (!sessionUuid) {
    return res.status(401).json({ error: "No autorizado." });
  }

  if (bodyUuid && bodyUuid !== sessionUuid && !STAFF_ROLES.has(sessionRole)) {
    return res.status(403).json({ error: "No puedes reclamar recompensas de otro usuario." });
  }

  if (!Number.isFinite(nivelNum) || nivelNum <= 0) {
    return res.status(400).json({ error: "Nivel inválido." });
  }

  const cantidadCoins = RECOMPENSAS_COINS[nivelNum];
  if (!cantidadCoins) {
    return res.status(404).json({ error: "No hay recompensa definida para este nivel." });
  }

  try {
    // 1. Verificamos el nivel actual del usuario
    const { data: userData, error: userError } = await db
      .from("usuarios")
      .select("uid, nivel")
      .eq("uuid", sessionUuid)
      .single();

    if (userError || !userData) {
      return res.status(404).json({ error: "Jugador no encontrado." });
    }

    if (userData.nivel < nivelNum) {
      return res.status(403).json({ error: "Aún no has alcanzado este nivel." });
    }

    // 2. Verificamos si ya lo reclamó
    const { data: existente } = await db
      .from("recompensas_reclamadas")
      .select("id")
      .eq("uuid_jugador", sessionUuid)
      .eq("nivel", nivelNum)
      .maybeSingle();

    if (existente) {
      return res.status(409).json({ error: "Recompensa ya reclamada." });
    }

    // 3. Marcamos como reclamado
    const { error: insertError } = await db
      .from("recompensas_reclamadas")
      .insert({ uuid_jugador: sessionUuid, nivel: nivelNum });

    if (insertError) {
      return res.status(500).json({ error: "Error al guardar el estado de la recompensa." });
    }

    // 4. Generamos el comando de pago al servidor
    await db.from("comandos_pendientes").insert({
      uuid_jugador: sessionUuid,
      nombre_jugador: userData.uid,
      servidor: 'survival', // Asumimos 'survival' como destino principal
      comando: `eco give ${userData.uid} ${cantidadCoins}`,
      tipo: 'recompensa_nivel',
      feedback_title: '&a¡Recompensa Reclamada!',
      feedback_subtitle: `&fHas subido al nivel ${nivelNum}`,
      feedback_chat: `&aHas recibido &e${cantidadCoins} Coins &apor subir al Nivel ${nivelNum} en la web.`
    });

    try {
      await evaluateWebAchievementsForUser(sessionUuid, {
        types: ["account_age_days"],
      });
    } catch (webAchievementError) {
      console.error("[WEB LOGROS RECOMPENSA EVAL ERROR]", webAchievementError);
    }

    return res.status(200).json({
      message: "Recompensa reclamada correctamente. Se enviarán al servidor.",
      nivel: nivelNum,
      coinsAñadidos: cantidadCoins,
      nuevoSaldoCoins: null, // Ya no existe saldo en la web
    });
  } catch (err) {
    console.error("[RECLAMAR ERROR]", err);
    return res.status(500).json({ error: "Error interno al reclamar recompensa." });
  }
};

exports.getRecompensasReclamadas = async (req, res) => {
  const uuid = String(req.params?.uuid || "").trim();
  const sessionUuid = req.usuario?.uuid || null;
  const sessionRole = getSessionRole(req);

  if (!sessionUuid) {
    return res.status(401).json({ error: "No autorizado." });
  }

  if (!uuid) {
    return res.status(400).json({ error: "UUID faltante." });
  }

  if (sessionUuid !== uuid && !STAFF_ROLES.has(sessionRole)) {
    return res.status(403).json({ error: "No puedes consultar recompensas de otro usuario." });
  }

  try {
    const { data, error } = await db
      .from("recompensas_reclamadas")
      .select("nivel")
      .eq("uuid_jugador", uuid)
      .order("nivel", { ascending: true });

    if (error) {
      console.error("[RECOMPENSAS RECLAMADAS QUERY ERROR]", error);
      return res.status(500).json({ error: "Error interno al obtener recompensas reclamadas." });
    }

    return res.status(200).json((data || []).map((row) => Number(row.nivel)).filter(Number.isFinite));
  } catch (err) {
    console.error("[RECOMPENSAS RECLAMADAS ERROR]", err);
    return res.status(500).json({ error: "Error interno al obtener recompensas reclamadas." });
  }
};