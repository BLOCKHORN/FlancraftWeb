const db = require("../models/db");

const CATALOGO_FLANPOINTS = {
  // Permanentes
  keepinventory: {
    id: "keepinventory",
    nombre: "El Vínculo del Alma",
    precio: 3500,
    categoria: "permanente",
    comandos: ["lp user {player} permission set essentials.keepinv"]
  },
  keepxp: {
    id: "keepxp",
    nombre: "Corona del Erudito",
    precio: 2500,
    categoria: "permanente",
    comandos: ["lp user {player} permission set essentials.keepxp"]
  },

  // Temporales
  keepinv_24h: {
    id: "keepinv_24h",
    nombre: "Frasco de Retorno (24h)",
    precio: 300,
    categoria: "temporal",
    comandos: ["lp user {player} permission settemp essentials.keepinv true 24h"]
  },
  keepxp_24h: {
    id: "keepxp_24h",
    nombre: "Frasco de Memoria (24h)",
    precio: 200,
    categoria: "temporal",
    comandos: ["lp user {player} permission settemp essentials.keepxp true 24h"]
  },

  // Economía
  money_10k: {
    id: "money_10k",
    nombre: "Bolsa de Contrabandista",
    precio: 500,
    categoria: "consumible",
    comandos: ["eco give {player} 10000"]
  },

  // XP Minecraft (Orbes)
  xp_50: {
    id: "xp_50",
    nombre: "Orbe de Sabiduría Menor",
    precio: 150,
    categoria: "consumible",
    comandos: ["xp give {player} 50L"]
  },
  xp_100: {
    id: "xp_100",
    nombre: "Orbe de Sabiduría Mayor",
    precio: 300,
    categoria: "consumible",
    comandos: ["xp give {player} 100L"]
  },
  xp_150: {
    id: "xp_150",
    nombre: "Orbe de Sabiduría Supremo",
    precio: 500,
    categoria: "consumible",
    comandos: ["xp give {player} 150L"]
  },

  // Niveles Globales (Cristales)
  nivel_100: {
    id: "nivel_100",
    nombre: "Cristal de Ascensión Menor",
    precio: 300,
    categoria: "consumible",
    comandos: ["levelxp give {player} 100"]
  },
  nivel_300: {
    id: "nivel_300",
    nombre: "Cristal de Ascensión Mayor",
    precio: 800,
    categoria: "consumible",
    comandos: ["levelxp give {player} 300"]
  },
  nivel_700: {
    id: "nivel_700",
    nombre: "Cristal de Ascensión Supremo",
    precio: 1800,
    categoria: "consumible",
    comandos: ["levelxp give {player} 700"]
  },

  // Investigación Fábricas (Códices)
  research_5: {
    id: "research_5",
    nombre: "Códice de Fábrica Básico",
    precio: 100,
    categoria: "consumible",
    comandos: ["factoriesresearch give {player} 5"]
  },
  research_15: {
    id: "research_15",
    nombre: "Códice de Fábrica Avanzado",
    precio: 250,
    categoria: "consumible",
    comandos: ["factoriesresearch give {player} 15"]
  },
  research_25: {
    id: "research_25",
    nombre: "Códice de Fábrica Maestro",
    precio: 400,
    categoria: "consumible",
    comandos: ["factoriesresearch give {player} 25"]
  }
};

function getCatalogo() {
  return Object.values(CATALOGO_FLANPOINTS);
}

async function canjearRecompensa(uuidJugador, nombreJugador, servidor, idRecompensa) {
  const recompensa = CATALOGO_FLANPOINTS[idRecompensa];
  
  if (!recompensa) {
    throw new Error("RECOMPENSA_NO_EXISTE");
  }

  // Prevención robusta en backend para no comprar permanentes repetidos
  if (recompensa.categoria === "permanente") {
    const { data: historial, error: historialError } = await db
      .from("flanpoints_movimientos")
      .select("id")
      .eq("uuid_jugador", uuidJugador)
      .eq("motivo", `canje_${recompensa.id}`)
      .limit(1);

    if (historialError) throw new Error("ERROR_VERIFICAR_HISTORIAL");
    if (historial && historial.length > 0) throw new Error("YA_ADQUIRIDO");
  }

  const { data: userData, error: userError } = await db
    .from("usuarios")
    .select("flanpoints")
    .eq("uuid", uuidJugador)
    .single();

  if (userError || !userData) {
    throw new Error("USUARIO_NO_ENCONTRADO");
  }

  if (userData.flanpoints < recompensa.precio) {
    throw new Error("FLANPOINTS_INSUFICIENTES");
  }

  const { error: updateError } = await db
    .from("usuarios")
    .update({ flanpoints: userData.flanpoints - recompensa.precio })
    .eq("uuid", uuidJugador);

  if (updateError) {
    throw new Error("ERROR_ACTUALIZAR_SALDO");
  }

  await db.from("flanpoints_movimientos").insert({
    uuid_jugador: uuidJugador,
    amount: -recompensa.precio,
    motivo: `canje_${recompensa.id}`,
    fuente: "dashboard",
    meta: { item: recompensa.nombre, server: servidor }
  });

  for (const cmdTpl of recompensa.comandos) {
    const cmdFinal = cmdTpl
      .replace(/{player}/g, nombreJugador)
      .replace(/{server}/g, servidor);

    await db.from("comandos_pendientes").insert({
      uuid_jugador: uuidJugador,
      nombre_jugador: nombreJugador,
      servidor: servidor,
      comando: cmdFinal,
      tipo: "comando",
      feedback_title: "El Nexo",
      feedback_subtitle: recompensa.nombre,
      feedback_chat: `&dHas forjado el artefacto: &5${recompensa.nombre}`
    });
  }

  return true;
}

module.exports = {
  getCatalogo,
  canjearRecompensa
};