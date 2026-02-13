const db = require("../models/db");

const toInt = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
};

// POST /api/wallet/transfer
// body: { uuid, servidor, amount }
exports.transferToServer = async (req, res) => {
  const { uuid, servidor, amount } = req.body;

  if (!uuid || !servidor) {
    return res.status(400).json({ error: "Faltan datos obligatorios." });
  }

  const amountNum = toInt(amount);
  if (amountNum <= 0) {
    return res.status(400).json({ error: "Cantidad inválida." });
  }

  try {
    const { data, error } = await db.rpc("wallet_transfer_to_server", {
      p_uuid: uuid,
      p_servidor: servidor,
      p_amount: amountNum,
    });

    if (error) {
      console.error("[wallet_transfer_to_server RPC ERROR]", error);
      return res.status(500).json({ error: "Error interno al transferir coins." });
    }

    const code = data?.code;

    if (code === "NOT_FOUND") return res.status(404).json({ error: "Jugador no encontrado." });
    if (code === "SERVER_INVALID") return res.status(400).json({ error: "Servidor inválido." });
    if (code === "INVALID_AMOUNT") return res.status(400).json({ error: "Cantidad inválida." });
    if (code === "INSUFFICIENT_FUNDS") {
      return res.status(403).json({
        error: "Saldo insuficiente en wallet.",
        wallet_balance: toInt(data?.wallet_balance),
      });
    }

    if (code !== "OK") {
      console.error("[wallet_transfer_to_server] code inesperado:", data);
      return res.status(500).json({ error: "Error interno al transferir coins." });
    }

    return res.status(200).json({
      message: "Transferencia creada.",
      servidor: String(data?.servidor || servidor),
      amount: amountNum,
      wallet_balance: toInt(data?.wallet_balance),
      server_balance: toInt(data?.server_balance),
      command_id: data?.command_id || null,
    });
  } catch (err) {
    console.error("[WALLET TRANSFER ERROR]", err);
    return res.status(500).json({ error: "Error interno al transferir coins." });
  }
};
