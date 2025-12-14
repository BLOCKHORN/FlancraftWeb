const express = require("express");

const router = express.Router();

// Cache simple en memoria (evita rate limit y llamadas repetidas)
const cache = new Map(); // key -> { uuid, name, exp }
const TTL_MS = 1000 * 60 * 60 * 12; // 12h

router.get("/uuid/:name", async (req, res) => {
  try {
    const nameRaw = String(req.params.name || "").trim();
    if (!nameRaw) return res.status(400).json({ error: "Nombre inválido" });

    // Validación básica de nombre MC
    if (!/^[a-zA-Z0-9_]{3,16}$/.test(nameRaw)) {
      return res.status(400).json({ error: "Nombre de Minecraft inválido" });
    }

    const key = nameRaw.toLowerCase();
    const now = Date.now();

    const hit = cache.get(key);
    if (hit && hit.exp > now) {
      return res.json({ uuid: hit.uuid, name: hit.name, cached: true });
    }

    // Mojang API (server-side -> sin CORS)
    const url = `https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(
      nameRaw
    )}`;

    const r = await fetch(url, {
      headers: {
        "User-Agent": "FlanCraft-Store/1.0",
        Accept: "application/json",
      },
    });

    // Mojang a veces responde 204 si no existe
    if (r.status === 204) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    if (!r.ok) {
      return res.status(502).json({ error: "No se pudo consultar Mojang" });
    }

    const data = await r.json().catch(() => ({}));
    const uuid = String(data?.id || "").trim();
    const name = String(data?.name || nameRaw).trim();

    if (!uuid) {
      return res.status(502).json({ error: "Respuesta inválida de Mojang" });
    }

    cache.set(key, { uuid, name, exp: now + TTL_MS });

    return res.json({ uuid, name, cached: false });
  } catch (e) {
    console.error("UUID resolve error:", e);
    return res.status(500).json({ error: "Error interno" });
  }
});

module.exports = router;
