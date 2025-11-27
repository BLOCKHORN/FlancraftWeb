// src/controllers/dailys.controller.js
const db = require("../models/db");

// =====================================
// Helpers de fecha
// =====================================
function hoyISO() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function lunesSemanaISO() {
  const d = new Date();
  const day = d.getDay(); // 0 = domingo, 1 = lunes...
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // mover a lunes
  const lunes = new Date(d.setDate(diff));
  return lunes.toISOString().slice(0, 10);
}

// =====================================
// Helper para mezclar aleatoriamente (Fisher–Yates)
// =====================================
function mezclarArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// =====================================
// Parámetros de cuántas misiones mostrar
// (ajusta estos números a tu gusto)
// =====================================
const DAILY_LIMIT = 6;   // cuántas misiones diarias se muestran a la vez
const WEEKLY_LIMIT = 5;  // cuántas misiones semanales se muestran a la vez

// =====================================
// LÓGICA ROTACIÓN DIARIA
// =====================================

async function obtenerMisionesDiarias(_req, res) {
  const hoy = hoyISO();

  try {
    // 1) ¿Ya hay rotación generada para hoy?
    const { data: rotacionHoy, error: rotacionError } = await db
      .from("misiones_diarias_rotacion")
      .select("id_mision, orden")
      .eq("fecha", hoy)
      .order("orden", { ascending: true });

    if (rotacionError) throw rotacionError;

    let misionesFinales = [];

    if (rotacionHoy && rotacionHoy.length > 0) {
      // 2) Ya hay rotación, cargamos esas misiones
      const ids = rotacionHoy.map((r) => r.id_mision);

      const { data: misiones, error: misionesError } = await db
        .from("misiones_diarias")
        .select("*")
        .in("id", ids);

      if (misionesError) throw misionesError;

      // Ordenamos por el orden guardado en la tabla de rotación
      const ordenMap = new Map();
      rotacionHoy.forEach((r) => ordenMap.set(r.id_mision, r.orden));

      misionesFinales = [...misiones].sort(
        (a, b) => (ordenMap.get(a.id) ?? 0) - (ordenMap.get(b.id) ?? 0)
      );
    } else {
      // 3) No hay rotación para hoy → generamos una nueva

      // 3.1) Traemos todas las misiones activas
      const { data: misionesActivas, error: activasError } = await db
        .from("misiones_diarias")
        .select("*")
        .eq("activa", true);

      if (activasError) throw activasError;

      if (!misionesActivas || misionesActivas.length === 0) {
        // no hay misiones definidas
        return res.status(200).json({ fecha: hoy, misiones: [] });
      }

      // 3.2) Traemos el estado de pool (qué misiones ya se han usado en el ciclo actual)
      const { data: poolEstado, error: poolError } = await db
        .from("misiones_diarias_pool_estado")
        .select("id_mision, usado_en_ciclo");

      if (poolError) throw poolError;

      const poolMap = new Map();
      (poolEstado || []).forEach((p) =>
        poolMap.set(p.id_mision, !!p.usado_en_ciclo)
      );

      // 3.3) Candidatas: activas y todavía no usadas en este ciclo
      let candidatas = misionesActivas.filter(
        (m) => !poolMap.get(m.id) // undefined o false = no usada
      );

      // 3.4) Si ya hemos gastado toda la pool, reiniciamos ciclo
      if (candidatas.length < DAILY_LIMIT) {
        // reset: poner usado_en_ciclo = false a todas las activas
        const idsActivas = misionesActivas.map((m) => m.id);

        if (idsActivas.length > 0) {
          const { error: resetError } = await db
            .from("misiones_diarias_pool_estado")
            .update({ usado_en_ciclo: false })
            .in("id_mision", idsActivas);

          if (resetError) throw resetError;
        }

        // ahora todas vuelven a ser candidatas
        candidatas = [...misionesActivas];
      }

      // 3.5) Mezclamos y cogemos DAILY_LIMIT
      const barajadas = mezclarArray(candidatas);
      const seleccionadas = barajadas.slice(
        0,
        Math.min(DAILY_LIMIT, barajadas.length)
      );

      // 3.6) Marcamos en pool_estado que estas han sido usadas en este ciclo
      const upsertsPool = seleccionadas.map((m) => ({
        id_mision: m.id,
        usado_en_ciclo: true,
      }));

      if (upsertsPool.length > 0) {
        const { error: upsertPoolError } = await db
          .from("misiones_diarias_pool_estado")
          .upsert(upsertsPool, { onConflict: "id_mision" });

        if (upsertPoolError) throw upsertPoolError;
      }

      // 3.7) Guardamos la rotación de hoy
      const insertsRotacion = seleccionadas.map((m, index) => ({
        fecha: hoy,
        id_mision: m.id,
        orden: index,
      }));

      if (insertsRotacion.length > 0) {
        const { error: insertRotError } = await db
          .from("misiones_diarias_rotacion")
          .insert(insertsRotacion);

        if (insertRotError) throw insertRotError;
      }

      misionesFinales = seleccionadas;
    }

    // 4) Devolvemos solo las misiones de la rotación de hoy
    return res.status(200).json({
      fecha: hoy,
      misiones: misionesFinales,
    });
  } catch (err) {
    console.error("[DAILYS] Error al obtener misiones diarias:", err);
    return res
      .status(500)
      .json({ error: "No se pudieron obtener las misiones diarias." });
  }
}

// =====================================
// LÓGICA ROTACIÓN SEMANAL
// =====================================

async function obtenerMisionesSemanales(_req, res) {
  const semanaInicio = lunesSemanaISO(); // lunes de esta semana

  try {
    // 1) ¿Ya hay rotación generada para esta semana?
    const { data: rotacionSemana, error: rotacionError } = await db
      .from("misiones_semanales_rotacion")
      .select("id_mision, orden")
      .eq("semana", semanaInicio)
      .order("orden", { ascending: true });

    if (rotacionError) throw rotacionError;

    let misionesFinales = [];

    if (rotacionSemana && rotacionSemana.length > 0) {
      // 2) Ya hay rotación, cargamos esas misiones
      const ids = rotacionSemana.map((r) => r.id_mision);

      const { data: misiones, error: misionesError } = await db
        .from("misiones_semanales")
        .select("*")
        .in("id", ids);

      if (misionesError) throw misionesError;

      const ordenMap = new Map();
      rotacionSemana.forEach((r) => ordenMap.set(r.id_mision, r.orden));

      misionesFinales = [...misiones].sort(
        (a, b) => (ordenMap.get(a.id) ?? 0) - (ordenMap.get(b.id) ?? 0)
      );
    } else {
      // 3) No hay rotación de esta semana → generamos

      // 3.1) Traemos todas las misiones semanales activas
      const { data: misionesActivas, error: activasError } = await db
        .from("misiones_semanales")
        .select("*")
        .eq("activa", true);

      if (activasError) throw activasError;

      if (!misionesActivas || misionesActivas.length === 0) {
        return res.status(200).json({ semana: semanaInicio, misiones: [] });
      }

      // 3.2) Estado del pool semanal
      const { data: poolEstado, error: poolError } = await db
        .from("misiones_semanales_pool_estado")
        .select("id_mision, usado_en_ciclo");

      if (poolError) throw poolError;

      const poolMap = new Map();
      (poolEstado || []).forEach((p) =>
        poolMap.set(p.id_mision, !!p.usado_en_ciclo)
      );

      // 3.3) Candidatas: activas y no usadas en el ciclo actual
      let candidatas = misionesActivas.filter(
        (m) => !poolMap.get(m.id) // undefined o false
      );

      // 3.4) Si hemos gastado todas, reseteamos ciclo
      if (candidatas.length < WEEKLY_LIMIT) {
        const idsActivas = misionesActivas.map((m) => m.id);

        if (idsActivas.length > 0) {
          const { error: resetError } = await db
            .from("misiones_semanales_pool_estado")
            .update({ usado_en_ciclo: false })
            .in("id_mision", idsActivas);

          if (resetError) throw resetError;
        }

        candidatas = [...misionesActivas];
      }

      // 3.5) Mezclamos y cogemos WEEKLY_LIMIT
      const barajadas = mezclarArray(candidatas);
      const seleccionadas = barajadas.slice(
        0,
        Math.min(WEEKLY_LIMIT, barajadas.length)
      );

      // 3.6) Marcamos en pool_estado como usadas
      const upsertsPool = seleccionadas.map((m) => ({
        id_mision: m.id,
        usado_en_ciclo: true,
      }));

      if (upsertsPool.length > 0) {
        const { error: upsertPoolError } = await db
          .from("misiones_semanales_pool_estado")
          .upsert(upsertsPool, { onConflict: "id_mision" });

        if (upsertPoolError) throw upsertPoolError;
      }

      // 3.7) Guardamos rotación de la semana
      const insertsRotacion = seleccionadas.map((m, index) => ({
        semana: semanaInicio,
        id_mision: m.id,
        orden: index,
      }));

      if (insertsRotacion.length > 0) {
        const { error: insertRotError } = await db
          .from("misiones_semanales_rotacion")
          .insert(insertsRotacion);

        if (insertRotError) throw insertRotError;
      }

      misionesFinales = seleccionadas;
    }

    return res.status(200).json({
      semana: semanaInicio,
      misiones: misionesFinales,
    });
  } catch (err) {
    console.error("[DAILYS] Error al obtener misiones semanales:", err);
    return res
      .status(500)
      .json({ error: "No se pudieron obtener las misiones semanales." });
  }
}

module.exports = {
  obtenerMisionesDiarias,
  obtenerMisionesSemanales,
};
