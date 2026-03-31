const db = require("../models/db");
const flanpointsService = require("./flanpoints.service"); 

exports.getCatalogo = (req, res) => {
  try {
    const catalogo = flanpointsService.getCatalogo();
    return res.status(200).json(catalogo);
  } catch (err) {
    return res.status(500).json({ error: "Error al cargar los artefactos del Nexo." });
  }
};

exports.getHistorial = async (req, res) => {
  const uuid = req.usuario?.uuid;
  if (!uuid) return res.status(401).json({ error: "No autorizado." });

  try {
    const { data, error } = await db
      .from("flanpoints_movimientos")
      .select("id, amount, motivo, meta, created_at")
      .eq("uuid_jugador", uuid)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;
    return res.status(200).json(data || []);
  } catch (err) {
    return res.status(500).json({ error: "Error al leer el Registro Akáshico." });
  }
};

exports.canjearArtefacto = async (req, res) => {
  const uuid = req.usuario?.uuid;
  const uid = req.usuario?.uid;
  const { itemId } = req.body;

  if (!uuid || !uid) return res.status(401).json({ error: "No autorizado." });
  if (!itemId) return res.status(400).json({ error: "Artefacto no especificado." });

  try {
    await flanpointsService.canjearRecompensa(uuid, uid, "survival", itemId);
    
    const { data, error } = await db
      .from("usuarios")
      .select("flanpoints")
      .eq("uuid", uuid)
      .single();
    
    if (error) throw error;

    return res.status(200).json({ 
      message: "Forja completada",
      nuevoSaldo: data.flanpoints
    });
  } catch (err) {
    let msg = "Error al forjar el artefacto.";
    if (err.message === "FLANPOINTS_INSUFICIENTES") msg = "No tienes suficiente Flanite.";
    if (err.message === "RECOMPENSA_NO_EXISTE") msg = "El artefacto no existe.";
    if (err.message === "USUARIO_NO_ENCONTRADO") msg = "No se ha encontrado tu usuario.";
    if (err.message === "YA_ADQUIRIDO") msg = "Ya posees este artefacto permanente.";
    
    return res.status(400).json({ error: msg });
  }
};