const db = require("../models/db");

// GET /api/sanciones
exports.obtenerSanciones = async (req, res) => {
  try {
    const { data, error } = await db
      .from("jails")
      .select("*")
      .order("timestamp", { ascending: false });

    if (error) throw error;

    return res.status(200).json(data);
  } catch (err) {
    console.error("[GET SANCIONES]", err);
    return res.status(500).json({ error: "Error al obtener sanciones" });
  }
};

// GET /api/sanciones/jugador/:nombre
exports.obtenerSancionesPorJugador = async (req, res) => {
  const { nombre } = req.params;

  if (!nombre || nombre.trim().length === 0) {
    return res.status(400).json({ error: "Nombre de jugador no válido" });
  }

  try {
    const { data, error } = await db
      .from("jails")
      .select("*")
      .eq("name", nombre)
      .order("timestamp", { ascending: false });

    if (error) throw error;

    return res.status(200).json(data);
  } catch (err) {
    console.error("[GET SANCIONES JUGADOR]", err);
    return res.status(500).json({ error: "Error al obtener sanciones del jugador" });
  }
};

// DELETE /api/sanciones/:id
exports.eliminarSancion = async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await db
      .from("jails")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("[DELETE SANCION]", err);
    return res.status(500).json({ error: "Error al eliminar sanción" });
  }
};
