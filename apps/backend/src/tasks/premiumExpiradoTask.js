const db = require("../models/db");

async function limpiarPremiumExpirado() {
  try {
    const ahora = new Date().toISOString();

    // 1. Obtener los premium expirados
    const { data: expirados, error } = await db
      .from("premium_temporal")
      .select("uuid")
      .lte("fecha_expiracion", ahora);

    if (error) throw error;
    if (!expirados || expirados.length === 0) {
      console.log(`[PREMIUM] Ejecutando limpieza a las ${ahora} (UTC) - No hay expirados.`);
      return;
    }

    const uuids = expirados.map(e => e.uuid);

    // 2. Desmarcar es_premium en la tabla usuarios
    const { error: errorUpdate } = await db
      .from("usuarios")
      .update({ es_premium: false })
      .in("uuid", uuids);

    if (errorUpdate) throw errorUpdate;

    // 3. Eliminar entradas de premium_temporal
    const { error: errorDelete } = await db
      .from("premium_temporal")
      .delete()
      .in("uuid", uuids);

    if (errorDelete) throw errorDelete;

    console.log(`[PREMIUM] Premium expirado eliminado de ${uuids.length} usuario(s).`);
  } catch (err) {
    console.error("[PREMIUM] Error limpiando premium expirado:", err);
  }
}

module.exports = limpiarPremiumExpirado;
