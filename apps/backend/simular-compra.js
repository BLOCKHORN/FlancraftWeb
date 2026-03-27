require("dotenv").config();
const tebexPaymentsService = require("./src/controllers/tebexPayments.service"); 

const simular = async () => {
  console.log("⏳ Simulando pago de 10$ para Crystalchemist...");

  const mockWebhook = {
    type: "payment.completed",
    payment: {
      // Usamos Date.now() para que el ID sea único cada vez que ejecutes el script
      id: "txn_simulacion_" + Date.now(), 
      amount: 10.00,
      currency: "USD",
      created_at: new Date().toISOString()
    },
    custom: {
      mc_username: "Crystalchemist",
      // ESTE ES TU UUID REAL (como lo envía Tebex, sin guiones)
      mc_uuid: "ef606b957134330f97a51e8e21bdfbba" 
    }
  };

  try {
    const result = await tebexPaymentsService.persistPaymentFromWebhook(mockWebhook);
    console.log("✅ Resultado de la simulación:", result);
    console.log("🚀 Revisa tu base de datos y tu Dashboard. ¡Deberías tener 500 FLT nuevos!");
  } catch (error) {
    console.error("❌ Error en la simulación:", error);
  }
};

simular();