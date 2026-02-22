const db = require("../models/db");

const safeText = (v) => {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s ? s : null;
};

const ALLOWED_RANGOS = new Set(["nova", "alpha", "inmortal"]);
const ALLOWED_TIPOS = new Set(["perma", "30d"]);

const mapRpcError = (msg) => {
  const m = String(msg || "");
  if (m.includes("INVALID_SERVER:")) {
    const server = m.split("INVALID_SERVER:")[1]?.trim() || null;
    return { status: 400, error: "Servidor inválido en configuración de comandos.", server };
  }
  if (m.includes("INVALID_COMMANDS_FORMAT")) return { status: 500, error: "Formato de comandos inválido en rangos_comandos." };
  return { status: 500, error: "Error interno al procesar la compra." };
};

const comprarRangoWallet = async (req, res) => {
  const uuid = req?.usuario?.uuid;

  if (!uuid) return res.status(401).json({ error: "No autenticado." });

  const rango = safeText(req.body?.rango)?.toLowerCase();
  const tipo = safeText(req.body?.tipo)?.toLowerCase();
  const idempotencyKey = safeText(req.body?.idempotencyKey);

  if (!rango || !tipo || !idempotencyKey) {
    return res.status(400).json({ error: "Faltan parámetros." });
  }

  if (!ALLOWED_RANGOS.has(rango)) {
    return res.status(400).json({ error: "Rango inválido." });
  }

  if (!ALLOWED_TIPOS.has(tipo)) {
    return res.status(400).json({ error: "Tipo inválido." });
  }

  if (idempotencyKey.length < 12 || idempotencyKey.length > 128) {
    return res.status(400).json({ error: "idempotencyKey inválido." });
  }

  try {
    const { data, error } = await db.rpc("comprar_rango_wallet", {
      p_uuid: uuid,
      p_rango: rango,
      p_tipo: tipo,
      p_idempotency_key: idempotencyKey,
    });

    if (error) {
      const mapped = mapRpcError(error.message || error.details || error.hint);
      return res.status(mapped.status).json(mapped);
    }

    if (!data || data.ok !== true) {
      const code = data?.error || "UNKNOWN";
      if (code === "INSUFFICIENT_FUNDS") {
        return res.status(400).json({
          error: "No tienes suficientes coins en la wallet.",
          code,
          wallet_coins: data?.wallet_coins ?? null,
          price: data?.price ?? null,
        });
      }

      if (code === "ALREADY_HAS_EQUAL_OR_HIGHER") {
        return res.status(400).json({ error: "Ya tienes un rango igual o superior permanente.", code });
      }

      if (code === "RANK_CONFIG_NOT_FOUND") {
        return res.status(404).json({ error: "No se encontró la configuración del rango.", code });
      }

      if (code === "USER_NOT_FOUND") {
        return res.status(404).json({ error: "Usuario no encontrado.", code });
      }

      return res.status(400).json({ error: "No se pudo completar la compra.", code });
    }

    return res.status(200).json({
      success: true,
      already: data?.already === true,
      nuevoSaldo: data?.wallet_coins ?? null,
      price: data?.price ?? null,
      pedidoId: data?.pedido_id ?? null,
    });
  } catch (e) {
    return res.status(500).json({ error: "Error interno al procesar la compra." });
  }
};

const obtenerListaRangos = async (req, res) => {
  try {
    const { data, error } = await db
      .from("rangos_comandos")
      .select("rango, tipo, precio, precio_wallet")
      .order("rango", { ascending: true });

    if (error) return res.status(500).json({ error: "No se pudo obtener la lista de rangos." });

    return res.status(200).json(data || []);
  } catch {
    return res.status(500).json({ error: "No se pudo obtener la lista de rangos." });
  }
};

module.exports = {
  comprarRangoWallet,
  obtenerListaRangos,
};