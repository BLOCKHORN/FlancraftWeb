const db = require("../models/db");

const FLOODGATE_PREFIX_HEX = "0000000000000000";

const applyBedrockPrefix = (comando, uuid_jugador, nombre_jugador) => {
  let cmd = String(comando || "");
  
  if (uuid_jugador && nombre_jugador) {
    const compactUuid = String(uuid_jugador).trim().replace(/-/g, "").toLowerCase();
    
    if (compactUuid.length === 32 && compactUuid.startsWith(FLOODGATE_PREFIX_HEX)) {
      const nombre = String(nombre_jugador).trim();
      
      if (nombre && !nombre.startsWith(".")) {
        const safeName = nombre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(^|\\s)${safeName}(\\s|$)`, "g");
        cmd = cmd.replace(regex, `$1.${nombre}$2`);
      }
    }
  }
  
  return cmd;
};

exports.obtenerComandosPendientes = async (req, res) => {
  try {
    const { servidor } = req.query;

    const server = String(servidor || "").trim().toLowerCase();
    if (!server) return res.status(400).json({ error: "Servidor requerido." });

    const { data, error } = await db
      .from("comandos_pendientes")
      .select("id, uuid_jugador, nombre_jugador, comando, servidor, tipo, feedback_title, feedback_subtitle, feedback_chat")
      .eq("ejecutado", false)
      .eq("servidor", server);

    if (error) throw error;

    const fixedData = (data || []).map((row) => ({
      ...row,
      comando: applyBedrockPrefix(row.comando, row.uuid_jugador, row.nombre_jugador)
    }));

    res.setHeader("Content-Type", "application/json");
    return res.status(200).json(fixedData);
  } catch (err) {
    console.error("[COMANDOS_JSON_ERROR]", err);
    return res.status(500).json({ error: "Error al obtener comandos pendientes." });
  }
};

exports.obtenerComandosPendientesTextoPlano = async (req, res) => {
  try {
    const { data, error } = await db
      .from("comandos_pendientes")
      .select("id, comando, servidor, uuid_jugador, nombre_jugador")
      .eq("ejecutado", false)
      .order("id", { ascending: true })
      .limit(10);

    if (error) throw error;

    const comandos = (data || []).map((row) => {
      const cmd = applyBedrockPrefix(row.comando, row.uuid_jugador, row.nombre_jugador);
      return `${cmd} || ${row.id} || ${row.servidor}`;
    }).join("\n");
    
    res.type("text/plain").send(comandos);
  } catch (err) {
    console.error("[COMANDOS_LEGACY_ERROR]", err);
    return res.status(500).json({ error: "Error al obtener comandos pendientes." });
  }
};

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

    const { error } = await db.from("comandos_pendientes").update({ ejecutado: true }).eq("id", id);
    if (error) throw error;

    return res.status(200).json({ message: "Comando marcado como ejecutado." });
  } catch (err) {
    console.error("[MARCAR COMANDO ERROR]", err);
    return res.status(500).json({ error: "Error al marcar el comando." });
  }
};