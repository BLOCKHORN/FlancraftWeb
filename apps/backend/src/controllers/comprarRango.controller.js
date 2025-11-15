const supabase = require("../models/db");

const comprarRango = async (req, res) => {
  const { uuid, rango, tipo } = req.body;

  if (!uuid || !rango || !tipo) {
    return res.status(400).json({ error: "Faltan parámetros." });
  }

  // Obtener datos del usuario
  const { data: usuario, error: errUsuario } = await supabase
    .from("usuarios")
    .select("uid, rango_usuario")
    .eq("uuid", uuid)
    .single();

  if (errUsuario || !usuario) {
    return res.status(404).json({ error: "Usuario no encontrado." });
  }

  const username = usuario.uid;

  // Verificar si ya tiene el rango permanente
  if (tipo === "perma" && usuario.rango_usuario === rango) {
    return res.status(400).json({ error: "Ya tienes este rango permanente." });
  }

  // Obtener precio y comandos desde `rangos_comandos`
  const { data: rangoData, error: errRango } = await supabase
    .from("rangos_comandos")
    .select("precio, comandos")
    .eq("rango", rango)
    .eq("tipo", tipo)
    .single();

  if (errRango || !rangoData) {
    return res.status(404).json({ error: "No se encontró la configuración del rango." });
  }

  const { precio, comandos } = rangoData;

  // Obtener ECOS actuales
  const { data: monedas, error: errMonedas } = await supabase
    .from("monedas_actuales")
    .select("ecos")
    .eq("uuid", uuid)
    .single();

  if (errMonedas || !monedas) {
    return res.status(404).json({ error: "Saldo no encontrado." });
  }

  if (monedas.ecos < precio) {
    return res.status(400).json({ error: "No tienes suficientes ECOS." });
  }

  // Descontar ECOS
  const nuevoSaldo = monedas.ecos - precio;
  const { error: errDescuento } = await supabase
    .from("monedas_actuales")
    .update({ ecos: nuevoSaldo })
    .eq("uuid", uuid);

  if (errDescuento) {
    return res.status(500).json({ error: "Error al descontar ECOS." });
  }

  // Preparar e insertar comandos
  const comandosPendientes = comandos.flatMap(([comandoBase, servidores]) =>
    servidores.map((servidor) => ({
      uuid_jugador: uuid,
      nombre_jugador: username,
      comando: comandoBase.replace("{username}", username),
      servidor,
      ejecutado: false,
      fecha: new Date().toISOString(),
    }))
  );

  const { error: errInsertComandos } = await supabase
    .from("comandos_pendientes")
    .insert(comandosPendientes);

  if (errInsertComandos) {
    return res.status(500).json({ error: "Error al insertar comandos pendientes." });
  }

  // Si es permanente, actualizar el rango en `usuarios`
  if (tipo === "perma") {
    await supabase
      .from("usuarios")
      .update({ rango_usuario: rango })
      .eq("uuid", uuid);
  }

  return res.status(200).json({ success: true, nuevoSaldo });
};

const obtenerListaRangos = async (req, res) => {
  const { data, error } = await supabase
    .from("rangos_comandos")
    .select("rango, tipo, precio")
    .order("rango", { ascending: true });

  if (error) {
    return res.status(500).json({ error: "No se pudo obtener la lista de rangos." });
  }

  return res.status(200).json(data);
};

module.exports = {
  comprarRango,
  obtenerListaRangos,
};
