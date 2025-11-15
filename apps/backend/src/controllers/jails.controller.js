// src/controllers/jails.controller.js

const supabase = require("../models/db");

const registrarSancion = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const token = req.headers["x-api-key"];
  if (token !== process.env.JAILTRACKER_SECRET) {
    return res.status(403).json({ error: "Forbidden: invalid token" });
  }

  const jail = req.body;

  console.log("📥 Jail recibido:", jail);

  if (!jail.uuid || !jail.name || !jail.moderator || !jail.timestamp) {
    console.warn("⚠️ Falta algún campo requerido");
    return res.status(400).json({ error: "Missing jail data" });
  }

  // Normalización básica
  const safeTimestamp = Number(jail.timestamp);
  if (Number.isNaN(safeTimestamp)) {
    console.warn("⚠️ Timestamp inválido:", jail.timestamp);
    return res.status(400).json({ error: "Invalid timestamp" });
  }

  const payload = {
    uuid: jail.uuid,
    name: jail.name,
    moderator: jail.moderator,
    duration: jail.duration ?? null,
    timestamp: safeTimestamp,
    server: jail.server ?? null,
    type: jail.type ?? null,      // motivo categorizado (hacks, fly, etc.)
    banType: jail.banType ?? null // "jail" | "temp" | "perma"
  };

  console.log("📝 Insertando en jails:", payload);

  const { data, error } = await supabase.from("jails").insert([payload]);

  if (error) {
    console.error("❌ Error al guardar en Supabase:", error);
    return res.status(500).json({
      error: "Supabase insert failed",
      raw: error
    });
  }

  return res.status(200).json({ success: true, data });
};

module.exports = { registrarSancion };
