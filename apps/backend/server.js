// server.js
require("dotenv").config();
const cors = require("cors");
const app = require("./src/app");

// ==============================
// CORS CONFIG
// ==============================
const allowedOrigins = [
  "http://localhost:5173",              // Vite en local
  "http://localhost:10000",             // llamadas directas si las haces
  "https://flancraftweb.vercel.app",    // frontend en Vercel
  // añade aquí tu dominio propio cuando lo tengas, por ejemplo:
  // "https://flancraft.es",
];

const corsOptions = {
  origin(origin, callback) {
    // Permitir:
    //  - peticiones sin origin (cron, curl, Render llamándose a sí mismo, etc.)
    //  - origins listados en allowedOrigins
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
};

// aplicar CORS y preflight
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// ==============================
// ARRANQUE SERVIDOR
// ==============================
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`✅ FlanSync API escuchando en puerto ${PORT}`);
});
