const db = require("../models/db");

async function limpiarRangosExpirados() {
  try {
    const ahora = new Date().toISOString();

    // 1. Obtener los rangos expirados
    const { data: expirados, error } = await db
      .from("rangos_temporales")
      .select("uuid")
      .lte("fecha_expiracion", ahora);

    if (error) throw error;
    if (!expirados || expirados.length === 0) return;

    const uuids = expirados.map(e => e.uuid);

    // 2. Limpiar rangos en tabla `usuarios`
    const { error: errorUpdate } = await db
      .from("usuarios")
      .update({ rango_usuario: null })
      .in("uuid", uuids);

    if (errorUpdate) throw errorUpdate;

    // 3. Eliminar entradas de `rangos_temporales`
    const { error: errorDelete } = await db
      .from("rangos_temporales")
      .delete()
      .in("uuid", uuids);

    if (errorDelete) throw errorDelete;

    console.log(`[RANGOS EXPIRADOS] ${uuids.length} rangos expirados eliminados.`);
  } catch (err) {
    console.error("[ERROR AL LIMPIAR RANGOS EXPIRADOS]", err);
  }
}

module.exports = limpiarRangosExpirados;
