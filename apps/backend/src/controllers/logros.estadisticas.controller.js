const db = require("../models/db");

// GET /api/logros/estadisticas?servidor=anarquico
exports.obtenerEstadisticas = async (req, res) => {
  const servidorFiltro = req.query.servidor;

  try {
    // 🏆 Top 100 jugadores por progreso total
    let queryJugadores = db
      .from("logros_historial")
      .select("uuid_jugador, cantidad, usuarios:uuid_jugador(nombre_minecraft)")
      .order("cantidad", { ascending: false })
      .limit(10000);

    if (servidorFiltro) {
      queryJugadores = queryJugadores.eq("servidor", servidorFiltro);
    }

    const { data: jugadores, error: errJugadores } = await queryJugadores;
    if (errJugadores) throw errJugadores;

    const agrupadoJugadores = jugadores.reduce((acc, row) => {
      const uuid = row.uuid_jugador;
      const nombre = row.usuarios?.nombre_minecraft || "Desconocido";
      if (!acc[uuid]) {
        acc[uuid] = { uuid, nombre, total: 0 };
      }
      acc[uuid].total += row.cantidad;
      return acc;
    }, {});

    const top_jugadores = Object.values(agrupadoJugadores)
      .sort((a, b) => b.total - a.total)
      .slice(0, 100);

    // 📊 Top 100 tipos de logros por uso
    let queryTipos = db
      .from("logros_historial")
      .select("tipo, cantidad")
      .limit(10000);

    if (servidorFiltro) {
      queryTipos = queryTipos.eq("servidor", servidorFiltro);
    }

    const { data: tipos, error: errTipos } = await queryTipos;
    if (errTipos) throw errTipos;

    const agrupadoTipos = tipos.reduce((acc, row) => {
      if (!acc[row.tipo]) acc[row.tipo] = 0;
      acc[row.tipo] += row.cantidad;
      return acc;
    }, {});

    const top_tipos = Object.entries(agrupadoTipos)
      .map(([tipo, total]) => ({ tipo, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 100);

    // 🌍 Actividad por servidor
    const { data: servidores, error: errServidores } = await db
      .from("logros_historial")
      .select("servidor, cantidad")
      .limit(10000);

    if (errServidores) throw errServidores;

    const agrupadoServidores = servidores.reduce((acc, row) => {
      if (!acc[row.servidor]) acc[row.servidor] = 0;
      acc[row.servidor] += row.cantidad;
      return acc;
    }, {});

    const actividad_por_servidor = Object.entries(agrupadoServidores)
      .map(([servidor, total]) => ({ servidor, total }));

    return res.status(200).json({
      top_jugadores,
      top_tipos,
      actividad_por_servidor,
      servidor: servidorFiltro || null
    });
  } catch (err) {
    console.error("[ESTADISTICAS ERROR]", err);
    return res.status(500).json({ error: "Error al obtener estadísticas." });
  }
};
