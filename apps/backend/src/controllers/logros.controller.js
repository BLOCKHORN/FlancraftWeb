const db = require("../models/db");

// POST /api/logros/progreso
async function registrarProgreso(req, res) {
  const { uuid, tipo, cantidad, servidor } = req.body;
  if (!uuid || !tipo || !cantidad || !servidor) {
    return res.status(400).json({ error: "Faltan datos obligatorios." });
  }

  try {
    const { data: logros, error: errLogros } = await db
      .from("logros")
      .select("id, objetivo")
      .eq("tipo", tipo)
      .eq("servidor", servidor)
      .eq("activa", true);

    if (errLogros) throw errLogros;
    if (!logros?.length) {
      return res.status(200).json({ message: "Sin logros activos." });
    }

    const cantidadReal = parseInt(cantidad);
    if (isNaN(cantidadReal)) {
      return res.status(400).json({ error: "Cantidad inválida." });
    }

    let resumen = {
      tipo,
      cantidad_recibida: cantidadReal,
      completados: 0,
      insertados: 0,
      actualizados: 0,
      historial_creados: 0
    };

    for (const logro of logros) {
      const { data: progreso, error: errProg } = await db
        .from("logros_progreso")
        .select("progreso_actual, completado")
        .eq("uuid_jugador", uuid)
        .eq("id_logro", logro.id)
        .maybeSingle();

      if (errProg) throw errProg;

      const actual = progreso?.progreso_actual || 0;
      const nuevo = actual + cantidadReal;
      const nuevoTope = Math.min(nuevo, logro.objetivo);
      const completado = nuevoTope >= logro.objetivo;

      if (!progreso) {
        await db.from("logros_progreso").insert({
          uuid_jugador: uuid,
          id_logro: logro.id,
          progreso_actual: nuevoTope,
          completado
        });
        resumen.insertados++;
      } else if (!progreso.completado) {
        await db.from("logros_progreso")
          .update({ progreso_actual: nuevoTope, completado })
          .eq("uuid_jugador", uuid)
          .eq("id_logro", logro.id);
        resumen.actualizados++;
      }

      if (completado && !progreso?.completado) resumen.completados++;

      await db.from("logros_historial").insert({
        uuid_jugador: uuid,
        tipo,
        cantidad: cantidadReal,
        servidor,
        fuente: "plugin"
      });
      resumen.historial_creados++;
    }

    return res.status(200).json({ message: "Progreso actualizado.", resumen });
  } catch (err) {
    console.error("[LOGROS PROGRESO ERROR]", err);
    return res.status(500).json({ error: "Error interno al registrar progreso." });
  }
}

// POST /api/logros/progreso-multiple
async function registrarProgresoMultiple(req, res) {
  const { uuid, servidor, progresos } = req.body;
  if (!uuid || !servidor || !progresos || typeof progresos !== "object") {
    return res.status(400).json({ error: "Faltan datos obligatorios." });
  }

  try {
    const { data: logros, error: errLogros } = await db
      .from("logros")
      .select("id, tipo, nombre, objetivo")
      .eq("servidor", servidor)
      .eq("activa", true);

    if (errLogros) throw errLogros;

    const logrosFiltrados = logros.filter(l => progresos.hasOwnProperty(l.tipo));
    let resumen = {
      totales: logrosFiltrados.length,
      insertados: 0,
      actualizados: 0,
      completados: 0,
      historial_creados: 0
    };

    const completadosAhora = [];

    for (const logro of logrosFiltrados) {
      const cantidad = parseInt(progresos[logro.tipo]);
      if (isNaN(cantidad) || cantidad <= 0) continue;

      const { data: progreso, error: errProg } = await db
        .from("logros_progreso")
        .select("progreso_actual, completado")
        .eq("uuid_jugador", uuid)
        .eq("id_logro", logro.id)
        .maybeSingle();

      if (errProg) throw errProg;

      const actual = progreso?.progreso_actual || 0;
      const nuevo = actual + cantidad;
      const nuevoTope = Math.min(nuevo, logro.objetivo);
      const completado = nuevoTope >= logro.objetivo;

      if (!progreso) {
        await db.from("logros_progreso").insert({
          uuid_jugador: uuid,
          id_logro: logro.id,
          progreso_actual: nuevoTope,
          completado
        });
        resumen.insertados++;
      } else if (!progreso.completado) {
        await db.from("logros_progreso")
          .update({ progreso_actual: nuevoTope, completado })
          .eq("uuid_jugador", uuid)
          .eq("id_logro", logro.id);
        resumen.actualizados++;
      }

      if (completado && !progreso?.completado) {
        resumen.completados++;
        completadosAhora.push({
          id: logro.id,
          tipo: logro.tipo,
          nombre: logro.nombre
        });
      }

      await db.from("logros_historial").insert({
        uuid_jugador: uuid,
        tipo: logro.tipo,
        cantidad,
        servidor,
        fuente: "plugin"
      });
      resumen.historial_creados++;
    }

    return res.status(200).json({
      message: "Progresos múltiples actualizados.",
      resumen,
      completados: completadosAhora
    });
  } catch (err) {
    console.error("[LOGROS MULTIPLES ERROR]", err);
    return res.status(500).json({ error: "Error interno al registrar múltiples logros." });
  }
}

// POST /api/logros/reclamar/:id_logro
async function reclamarLogro(req, res) {
  const { uuid } = req.body;
  const id_logro = req.params.id_logro;

  if (!uuid || !id_logro) {
    return res.status(400).json({ error: "Faltan datos obligatorios." });
  }

  try {
    const { data: progreso, error: errProg } = await db
      .from("logros_progreso")
      .select("completado, reclamado")
      .eq("uuid_jugador", uuid)
      .eq("id_logro", id_logro)
      .maybeSingle();

    if (errProg) throw errProg;
    if (!progreso || !progreso.completado || progreso.reclamado) {
      return res.status(400).json({ error: "El logro no puede reclamarse." });
    }

    const { data: logro, error: errLogro } = await db
      .from("logros")
      .select("xp_otorgada")
      .eq("id", id_logro)
      .maybeSingle();

    if (errLogro) throw errLogro;
    if (!logro) return res.status(404).json({ error: "Logro no encontrado." });

    const { data: jugador, error: errJugador } = await db
      .from("usuarios")
      .select("xp_actual, nivel")
      .eq("uuid", uuid)
      .maybeSingle();

    if (errJugador) throw errJugador;

    let nuevaXP = jugador.xp_actual + logro.xp_otorgada;
    let nuevoNivel = jugador.nivel;
    while (nuevaXP >= nuevoNivel * 500) nuevoNivel++;

    await db.from("usuarios")
      .update({ xp_actual: nuevaXP, nivel: nuevoNivel })
      .eq("uuid", uuid);

    await db.from("logros_progreso")
      .update({ reclamado: true })
      .eq("uuid_jugador", uuid)
      .eq("id_logro", id_logro);

    return res.status(200).json({ message: "XP sumada y logro reclamado." });
  } catch (err) {
    console.error("[LOGRO RECLAMAR ERROR]", err);
    return res.status(500).json({ error: "Error interno al reclamar logro." });
  }
}

// GET /api/logros/:uuid
async function obtenerLogrosJugador(req, res) {
  const uuid = req.params.uuid;
  const servidor = req.query.servidor;

  try {
    const { data, error } = await db
      .rpc("obtener_logros_jugador", { jugador_uuid: uuid });

    if (error) throw error;

    const filtrados = servidor
      ? data.filter(l => l.servidor === servidor)
      : data;

    const ordenados = filtrados.sort((a, b) =>
      a.servidor.localeCompare(b.servidor) ||
      (a.categoria || "").localeCompare(b.categoria || "") ||
      (a.orden || 0) - (b.orden || 0)
    );

    return res.status(200).json(ordenados);
  } catch (err) {
    console.error("[LOGROS GET ERROR]", err);
    return res.status(500).json({ error: "Error al obtener logros" });
  }
}

module.exports = {
  registrarProgreso,
  registrarProgresoMultiple,
  reclamarLogro,
  obtenerLogrosJugador
};
