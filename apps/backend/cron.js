const cron = require("node-cron");
const misionesController = require("./src/controllers/logros.controller");

const mockRes = (nombre) => ({
  status: () => ({
    json: (data) => console.log(`[CRON ${nombre}]`, data),
    send: (data) => console.log(`[CRON ${nombre}]`, data)
  })
});

const mockReq = { body: {}, query: {}, params: {} };

async function ejecutarRotacionInicial() {
  console.log("[SISTEMA] Comprobando rotaciones de misiones en el arranque...");
  try {
    await misionesController.rotarMisionesDiarias(mockReq, mockRes("DIARIAS_BOOT"));
    await misionesController.rotarMisionesSemanales(mockReq, mockRes("SEMANALES_BOOT"));
  } catch (e) {
    console.error("[ERROR BOOT ROTACION]", e);
  }
}

function iniciarCronJobs() {
  console.log("[CRON] Iniciando sistema de tareas automáticas...");

  cron.schedule("0 0 * * *", async () => {
    try {
      await misionesController.rotarMisionesDiarias(mockReq, mockRes("DIARIAS"));
    } catch (e) {
      console.error("[CRON ERROR DIARIAS]", e);
    }
  });

  cron.schedule("0 0 * * 1", async () => {
    try {
      await misionesController.rotarMisionesSemanales(mockReq, mockRes("SEMANALES"));
    } catch (e) {
      console.error("[CRON ERROR SEMANALES]", e);
    }
  });
}

module.exports = { iniciarCronJobs, ejecutarRotacionInicial };