require("dotenv").config();

const express = require("express");
const cors = require("cors");

const { iniciarCronJobs, ejecutarRotacionInicial } = require("../cron");

const pingRoute = require("./routes/ping");
const resetRoutes = require("./routes/reset.routes");
const usuariosRoutes = require("./routes/usuarios.routes");
const recompensasRoutes = require("./routes/recompensas.routes");
const comandosRoutes = require("./routes/comandos.routes");
const logrosRoutes = require("./routes/logros.routes");
const logrosEstadisticasRoutes = require("./routes/logros_estadisticas.routes");
const misionesRoutes = require("./routes/misiones.routes");
const vincularRoutes = require("./routes/vincular.routes");
const sancionesRoutes = require("./routes/sanciones.routes");
const multicuentasRoutes = require("./routes/multicuentas.routes");
const permisosAdminRoutes = require("./routes/permisos.admin.routes");
const statsRoutes = require("./routes/stats.routes");
const perfilRoutes = require("./routes/perfil.routes");
const rangosRoutes = require("./routes/rangos.routes");
const noticiasRoutes = require("./routes/noticias.routes");
const tiendaTebexRoutes = require("./routes/tiendatebex.routes");
const minecraftRoutes = require("./routes/minecraft.routes");
const votosRoutes = require("./routes/votos.routes");
const monedasRoutes = require("./routes/monedas.routes");
const walletRoutes = require("./routes/wallet.routes");
const dailyClaimRoutes = require("./routes/dailyClaim.routes");
const webLogrosRoutes = require("./routes/webLogros.routes");

const app = express();

app.set("trust proxy", true);

const allowedOriginsExact = new Set([
  "http://localhost:5173",
  "https://flancraftweb.vercel.app",
  "https://flancraft.com",
  "https://www.flancraft.com",
]);

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (allowedOriginsExact.has(origin)) return true;
  if (/^https:\/\/([a-z0-9-]+\.)*vercel\.app$/i.test(origin)) return true;
  if (/^https:\/\/([a-z0-9-]+\.)*flancraft\.com$/i.test(origin)) return true;
  return false;
}

const corsOptions = {
  origin(origin, callback) {
    if (!isAllowedOrigin(origin)) {
      return callback(new Error("Not allowed by CORS"));
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Accept",
    "Authorization",
    "X-Requested-With",
    "X-Vote-Ingest-Secret",
    "x-vote-ingest-secret",
    "X-API-Key",
    "x-api-key",
  ],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(express.json({
  limit: "5mb",
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

iniciarCronJobs();
ejecutarRotacionInicial();

app.use("/ping", pingRoute);
app.use("/api/reset", resetRoutes);
app.use("/api/vincular", vincularRoutes);
app.use("/api/usuarios", usuariosRoutes);
app.use("/api/recompensas", recompensasRoutes);
app.use("/api/daily-claim", dailyClaimRoutes);
app.use("/api/comandos-pendientes", comandosRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/logros", logrosRoutes);
app.use("/api/estadisticas-logros", logrosEstadisticasRoutes);
app.use("/api/misiones", misionesRoutes);
app.use("/api/web-logros", webLogrosRoutes);
app.use("/api/monedas", monedasRoutes);
app.use("/api/sanciones", sancionesRoutes);
app.use("/api/multicuentas", multicuentasRoutes);
app.use("/api/permisos-admin", permisosAdminRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/perfil", perfilRoutes);
app.use("/api/rangos", rangosRoutes);
app.use("/api/noticias", noticiasRoutes);
app.use("/api/tebex", tiendaTebexRoutes);
app.use("/api/minecraft", minecraftRoutes);
app.use("/api/votos", votosRoutes);

app.use((req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

app.use((err, _req, res, _next) => {
  res.status(500).json({ error: "Error interno del servidor" });
});

module.exports = app;