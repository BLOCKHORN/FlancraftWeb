const db = require("../models/db");
const logros = require("../data/logros_combate.json");

(async () => {
  for (const logro of logros) {
    const { error } = await db.from("logros").insert(logro);
    if (error) {
      console.error("❌ Error insertando:", logro.tipo, error.message);
    } else {
      console.log("✅ Insertado:", logro.tipo);
    }
  }
})();
