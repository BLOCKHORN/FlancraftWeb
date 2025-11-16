// src/controllers/logros.controller.js
const db = require("../models/db");

/**
 * Utilidades de fecha
 */
function hoyISO() {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function estaActivaEnFecha(logro, fecha) {
  // Los permanentes siempre se consideran activos
  if (logro.tipo_mision === "permanente") return true;

  if (!logro.fecha_inicio || !logro.fecha_fin) return false;
  return logro.fecha_inicio <= fecha && logro.fecha_fin >= fecha;
}

/**
 * POST /api/logros/progreso
 * Registra progreso para un solo tipo de acción (matar_zombi, etc.)
 */
async function registrarProgreso(req, res) {
  const { uuid, tipo, cantidad, servidor } = req.body;
  if (!uuid || !tipo || !cantidad || !servidor) {
    return res.status(400).json({ error: "Faltan datos obligatorios." });
  }

  try {
    const hoy = hoyISO();

    // Traemos TODOS los logros activos de ese tipo+servidor
    const { data: logrosRaw, error: errLogros } = await db
      .from("logros")
      .select(
        "id, objetivo, tipo_mision, fecha_inicio, fecha_fin, activa"
      )
      .eq("tipo", tipo)
      .eq("servidor", servidor)
      .eq("activa", true);

    if (errLogros) throw errLogros;

    // Solo logros activos hoy (permanentes o diarias/semanales dentro de rango)
    const logros = (logrosRaw || []).filter((l) => estaActivaEnFecha(l, hoy));

    if (!logros.length) {
      return res.status(200).json({ message: "Sin logros activos." });
    }

    const cantidadReal = parseInt(cantidad, 10);
    if (Number.isNaN(cantidadReal)) {
      return res.status(400).json({ error: "Cantidad inválida." });
    }

    let resumen = {
      tipo,
      cantidad_recibida: cantidadReal,
      completados: 0,
      insertados: 0,
      actualizados: 0,
      historial_creados: 0,
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
          completado,
        });
        resumen.insertados++;
      } else if (!progreso.completado) {
        await db
          .from("logros_progreso")
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
        fuente: "plugin",
      });
      resumen.historial_creados++;
    }

    return res.status(200).json({ message: "Progreso actualizado.", resumen });
  } catch (err) {
    console.error("[LOGROS PROGRESO ERROR]", err);
    return res
      .status(500)
      .json({ error: "Error interno al registrar progreso." });
  }
}

/**
 * POST /api/logros/progreso-multiple
 * Registra progreso para varios tipos a la vez (payload agrupado del plugin)
 */
async function registrarProgresoMultiple(req, res) {
  const { uuid, servidor, progresos } = req.body;
  if (!uuid || !servidor || !progresos || typeof progresos !== "object") {
    return res.status(400).json({ error: "Faltan datos obligatorios." });
  }

  try {
    const hoy = hoyISO();

    // Traemos todos los logros activos de ese servidor
    const { data: logrosRaw, error: errLogros } = await db
      .from("logros")
      .select(
        "id, tipo, nombre, objetivo, tipo_mision, fecha_inicio, fecha_fin, activa"
      )
      .eq("servidor", servidor)
      .eq("activa", true);

    if (errLogros) throw errLogros;

    // Solo logros activos hoy (permanentes o diarias/semanales dentro de rango)
    const logrosActivos = (logrosRaw || []).filter((l) =>
      estaActivaEnFecha(l, hoy)
    );

    const logrosFiltrados = logrosActivos.filter((l) =>
      Object.prototype.hasOwnProperty.call(progresos, l.tipo)
    );

    let resumen = {
      totales: logrosFiltrados.length,
      insertados: 0,
      actualizados: 0,
      completados: 0,
      historial_creados: 0,
    };

    const completadosAhora = [];

    for (const logro of logrosFiltrados) {
      const cantidad = parseInt(progresos[logro.tipo], 10);
      if (Number.isNaN(cantidad) || cantidad <= 0) continue;

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
          completado,
        });
        resumen.insertados++;
      } else if (!progreso.completado) {
        await db
          .from("logros_progreso")
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
          nombre: logro.nombre,
        });
      }

      await db.from("logros_historial").insert({
        uuid_jugador: uuid,
        tipo: logro.tipo,
        cantidad,
        servidor,
        fuente: "plugin",
      });
      resumen.historial_creados++;
    }

    return res.status(200).json({
      message: "Progresos múltiples actualizados.",
      resumen,
      completados: completadosAhora,
    });
  } catch (err) {
    console.error("[LOGROS MULTIPLES ERROR]", err);
    return res
      .status(500)
      .json({ error: "Error interno al registrar múltiples logros." });
  }
}

/**
 * POST /api/logros/reclamar/:id_logro
 * Suma XP al usuario y marca el logro como reclamado
 */
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
    if (!logro) {
      return res.status(404).json({ error: "Logro no encontrado." });
    }

    const { data: jugador, error: errJugador } = await db
      .from("usuarios")
      .select("xp_actual, nivel")
      .eq("uuid", uuid)
      .maybeSingle();

    if (errJugador) throw errJugador;

    let nuevaXP = (jugador?.xp_actual || 0) + logro.xp_otorgada;
    let nuevoNivel = jugador?.nivel || 1;

    while (nuevaXP >= nuevoNivel * 500) nuevoNivel++;

    await db
      .from("usuarios")
      .update({ xp_actual: nuevaXP, nivel: nuevoNivel })
      .eq("uuid", uuid);

    await db
      .from("logros_progreso")
      .update({ reclamado: true })
      .eq("uuid_jugador", uuid)
      .eq("id_logro", id_logro);

    return res.status(200).json({
      message: "XP sumada y logro reclamado.",
      xp_otorgada: logro.xp_otorgada,
    });
  } catch (err) {
    console.error("[LOGRO RECLAMAR ERROR]", err);
    return res
      .status(500)
      .json({ error: "Error interno al reclamar logro." });
  }
}

/**
 * GET /api/logros/:uuid
 * Devuelve logros + progreso del jugador, con filtros:
 *  - ?servidor=...
 *  - ?tipo_mision=permanente|diaria|semanal
 */
async function obtenerLogrosJugador(req, res) {
  const uuid = req.params.uuid;
  const servidor = req.query.servidor || null;
  const tipoMision = req.query.tipo_mision || "permanente"; // por defecto
  const hoy = hoyISO();

  try {
    // IMPORTANTE: la función obtener_logros_jugador debe devolver:
    // id, nombre, descripcion, tipo, objetivo, xp_otorgada,
    // servidor, categoria, orden, completado, reclamado,
    // tipo_mision, fecha_inicio, fecha_fin, activa
    const { data, error } = await db.rpc("obtener_logros_jugador", {
      jugador_uuid: uuid,
    });

    if (error) throw error;

    let filtrados = data || [];

    // --- Filtro por tipo de misión ---
    if (tipoMision) {
      // Solo ese tipo (permanente / diaria / semanal)
      filtrados = filtrados.filter((l) => l.tipo_mision === tipoMision);

      // Para diarias y semanales, además comprobamos rango de fechas y activa
      if (tipoMision !== "permanente") {
        filtrados = filtrados.filter(
          (l) => l.activa && estaActivaEnFecha(l, hoy)
        );
      }
    }

    // --- Filtro por servidor (solo si se ha pedido) ---
    if (servidor) {
      filtrados = filtrados.filter((l) => l.servidor === servidor);
    }

    // --- Orden base (servidor > categoria > orden) ---
    const ordenados = filtrados.sort(
      (a, b) =>
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

/**
 * ROTACIÓN PRO DE MISIONES
 * Estos endpoints están pensados para ser llamados por un CRON de Render.
 */

const DAILY_MISSIONS_PER_SERVER = 1;
const WEEKLY_MISSIONS_PER_SERVER = 1;

async function rotarMisionesDiarias(req, res) {
  try {
    const hoy = hoyISO();

    // Servidores activos
    const { data: servidores, error: errServ } = await db
      .from("servidores")
      .select("nombre")
      .eq("activo", true);

    if (errServ) throw errServ;

    for (const srv of servidores || []) {
      const servidor = srv.nombre;

      // Pool de diarias para este servidor
      const { data: poolRaw, error: errPool } = await db
        .from("logros")
        .select("id")
        .eq("tipo_mision", "diaria")
        .eq("servidor", servidor);

      if (errPool) throw errPool;
      const pool = poolRaw || [];
      if (!pool.length) continue;

      // Desactivar todas las diarias actuales de ese servidor
      await db
        .from("logros")
        .update({
          activa: false,
          fecha_inicio: null,
          fecha_fin: null,
        })
        .eq("tipo_mision", "diaria")
        .eq("servidor", servidor);

      // Elegir aleatoriamente N
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      const seleccionadas = shuffled.slice(
        0,
        Math.min(DAILY_MISSIONS_PER_SERVER, shuffled.length)
      );
      const idsSeleccionados = seleccionadas.map((l) => l.id);

      // Activar las seleccionadas para HOY
      if (idsSeleccionados.length) {
        await db
          .from("logros")
          .update({
            activa: true,
            fecha_inicio: hoy,
            fecha_fin: hoy,
          })
          .in("id", idsSeleccionados);
      }
    }

    return res
      .status(200)
      .json({ message: "Misiones diarias rotadas correctamente." });
  } catch (err) {
    console.error("[ROTAR DIARIAS ERROR]", err);
    return res
      .status(500)
      .json({ error: "Error interno al rotar misiones diarias." });
  }
}

async function rotarMisionesSemanales(req, res) {
  try {
    const hoy = new Date();
    const inicioISO = hoy.toISOString().slice(0, 10);

    const fin = new Date(hoy);
    fin.setDate(fin.getDate() + 6);
    const finISO = fin.toISOString().slice(0, 10);

    const { data: servidores, error: errServ } = await db
      .from("servidores")
      .select("nombre")
      .eq("activo", true);

    if (errServ) throw errServ;

    for (const srv of servidores || []) {
      const servidor = srv.nombre;

      const { data: poolRaw, error: errPool } = await db
        .from("logros")
        .select("id")
        .eq("tipo_mision", "semanal")
        .eq("servidor", servidor);

      if (errPool) throw errPool;
      const pool = poolRaw || [];
      if (!pool.length) continue;

      await db
        .from("logros")
        .update({
          activa: false,
          fecha_inicio: null,
          fecha_fin: null,
        })
        .eq("tipo_mision", "semanal")
        .eq("servidor", servidor);

      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      const seleccionadas = shuffled.slice(
        0,
        Math.min(WEEKLY_MISSIONS_PER_SERVER, shuffled.length)
      );
      const idsSeleccionados = seleccionadas.map((l) => l.id);

      if (idsSeleccionados.length) {
        await db
          .from("logros")
          .update({
            activa: true,
            fecha_inicio: inicioISO,
            fecha_fin: finISO,
          })
          .in("id", idsSeleccionados);
      }
    }

    return res
      .status(200)
      .json({ message: "Misiones semanales rotadas correctamente." });
  } catch (err) {
    console.error("[ROTAR SEMANALES ERROR]", err);
    return res
      .status(500)
      .json({ error: "Error interno al rotar misiones semanales." });
  }
}

module.exports = {
  registrarProgreso,
  registrarProgresoMultiple,
  reclamarLogro,
  obtenerLogrosJugador,
  rotarMisionesDiarias,
  rotarMisionesSemanales,
};
