// apps/backend/src/app.js
require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

/* ===== CORS ===== */
const allowedOrigins = [
  "http://localhost:5173",               // Vite local
  "https://flancraftweb.vercel.app",     // NUEVA web en Vercel
  "https://flancraft.com",               // dominio principal (cuando lo uses)
  // Si quieres seguir permitiendo el viejo:
  // "https://flancraftv3.vercel.app",
];

const corsOptions = {
  origin(origin, callback) {
    // Permitir:
    //  - llamadas sin origin (curl, cron, plugins, Render, etc.)
    //  - origins listados arriba
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // 👉 preflight para POST/DELETE/etc

/* ===== Body parsing ===== */
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

/* ===== Rutas ===== */
const pingRoute = require("./routes/ping");
const resetRoutes = require("./routes/reset.routes");
const usuariosRoutes = require("./routes/usuarios.routes");
const recompensasRoutes = require("./routes/recompensas.routes");
const comandosRoutes = require("./routes/comandos.routes");
const logrosRoutes = require("./routes/logros.routes");
const logrosEstadisticasRoutes = require("./routes/logros_estadisticas.routes");
const dailysRoutes = require("./routes/dailys.routes");
const jailsRoutes = require("./routes/jails.routes");
const vincularRoutes = require("./routes/vincular.routes");
const sancionesRoutes = require("./routes/sanciones.routes");
const permisosAdminRoutes = require("./routes/permisos.admin.routes");
const statsRoutes = require("./routes/stats.routes");
const rangosRoutes = require("./routes/rangos.routes");
const noticiasRoutes = require("./routes/noticias.routes");
const tiendaTebexRoutes = require("./routes/tiendatebex.routes");

// ping sencillo
app.use("/ping", pingRoute);

// API principal
app.use("/api/reset", resetRoutes);
app.use("/api/vincular", vincularRoutes);
app.use("/api/usuarios", usuariosRoutes);
app.use("/api/recompensas", recompensasRoutes);
app.use("/api/comandos-pendientes", comandosRoutes);

// logros + estadísticas de logros
app.use("/api/logros", logrosRoutes);
app.use("/api/logros", logrosEstadisticasRoutes);
app.use("/api/misiones", dailysRoutes);

app.use("/api/monedas", require("./routes/monedas.routes"));
app.use("/api/jails", jailsRoutes);
app.use("/api/sanciones", sancionesRoutes);
app.use("/api/permisos-admin", permisosAdminRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/rangos", rangosRoutes);
app.use("/api/noticias", noticiasRoutes);
app.use("/api/tebex", tiendaTebexRoutes);

/* ===== Tareas programadas ===== */
// Limpieza automática de rangos expirados
const limpiarRangosExpirados = require("./tasks/rangosExpiradosTask");
limpiarRangosExpirados();
setInterval(() => limpiarRangosExpirados(), 5 * 60 * 1000); // cada 5 min

// Limpieza automática de premium expirado
const limpiarPremiumExpirado = require("./tasks/premiumExpiradoTask");
limpiarPremiumExpirado();
setInterval(() => limpiarPremiumExpirado(), 5 * 60 * 1000); // cada 5 min

/* ===== 404 básico ===== */
app.use((req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

/* ===== Manejador de errores ===== */
app.use((err, _req, res, _next) => {
  console.error("❌ Error no controlado:", err);
  res.status(500).json({ error: "Error interno del servidor" });
});

module.exports = app;
