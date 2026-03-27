"use strict";

const db = require("../models/db");

const CATALOGO_FLANPOINTS = {
  keepinventory: {
    id: "keepinventory",
    nombre: "KeepInventory",
    precio: 3500,
    comandos: [
      "lp user {player} permission set keepinventory.use true server={server}"
    ],
    tipo: "permiso"
  },
  money_10k: {
    id: "money_10k",
    nombre: "$10,000 Dólares",
    precio: 500,
    comandos: [
      "eco give {player} 10000"
    ],
    tipo: "economia"
  },
  xp_normal: {
    id: "xp_normal",
    nombre: "100 Niveles de XP",
    precio: 200,
    comandos: [
      "xp add {player} 100 levels"
    ],
    tipo: "utilidad"
  }
};

function getCatalogo() {
  return Object.values(CATALOGO_FLANPOINTS);
}

async function canjearRecompensa(uuidJugador, nombreJugador, servidor, idRecompensa) {
  const recompensa = CATALOGO_FLANPOINTS[idRecompensa];
  
  if (!recompensa) {
    throw new Error("RECOMPENSA_NO_ENCONTRADA");
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
      tipo: recompensa.tipo,
      feedback_title: "&a¡Recompensa Canjeada!",
      feedback_subtitle: `&fHas recibido: &e${recompensa.nombre}`,
      feedback_chat: `&aHas canjeado exitosamente &e${recompensa.nombre} &apor &b${recompensa.precio} Flanpoints&a.`
    });
  }

  return { ok: true, restante: userData.flanpoints - recompensa.precio };
}

module.exports = {
  getCatalogo,
  canjearRecompensa
};