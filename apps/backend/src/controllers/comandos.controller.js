const db = require("../models/db");

// GET /api/comandos-pendientes (JSON por defecto para el plugin)
exports.obtenerComandosPendientes = async (req, res) => {
  try {
    const { servidor } = req.query;

    const { data, error } = await db
      .from("comandos_pendientes")
      .select("id, uuid_jugador, nombre_jugador, comando, servidor")
      .eq("ejecutado", false)
      .eq("servidor", servidor);

    if (error) throw error;

    res.setHeader("Content-Type", "application/json");
    return res.status(200).json(data || []);
  } catch (err) {
    console.error("[COMANDOS_JSON_ERROR]", err);
    res.status(500).json({ error: "Error al obtener comandos pendientes." });
  }
};

// GET /api/comandos-pendientes-legacy (Texto plano para otros sistemas)
exports.obtenerComandosPendientesTextoPlano = async (req, res) => {
  try {
    const { data, error } = await db
      .from("comandos_pendientes")
      .select("id, comando, servidor")
      .eq("ejecutado", false)
      .order("id", { ascending: true })
      .limit(10);

    if (error) throw error;

    const comandos = data.map(row => `${row.comando} || ${row.id} || ${row.servidor}`).join("\n");
    res.type("text/plain").send(comandos);
  } catch (err) {
    console.error("[COMANDOS_LEGACY_ERROR]", err);
    res.status(500).json({ error: "Error al obtener comandos pendientes." });
  }
};

// POST /api/comandos-pendientes/:id/marcar
exports.marcarComoEjecutado = async (req, res) => {
  const rawId = req.params.id;
  const id = rawId?.trim();

  if (!id || id.length !== 36) {
    return res.status(400).json({ error: "ID inválido." });
  }

  try {
    const { data: existe, error: errBuscar } = await db
      .from("comandos_pendientes")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (errBuscar) throw errBuscar;
    if (!existe) return res.status(404).json({ error: "Comando no encontrado." });

    const { error } = await db
      .from("comandos_pendientes")
      .update({ ejecutado: true })
      .eq("id", id);

    if (error) throw error;

    return res.status(200).json({ message: "Comando marcado como ejecutado." });
  } catch (err) {
    console.error("[MARCAR COMANDO ERROR]", err);
    return res.status(500).json({ error: "Error al marcar el comando." });
  }
};
