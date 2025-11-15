// apps/backend/src/app.js
require('dotenv').config(); // ✅ carga .env al arrancar

const express = require('express');
const cors = require('cors');

const app = express();

/* ===== CORS ===== */
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'https://flancraftv3.vercel.app',
    'https://flancraft.com',
  ],
  credentials: true,
};
app.use(cors(corsOptions));

/* ===== Body parsing ===== */
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

/* ===== Opcional: confiar en proxy si despliegas detrás de Render/Nginx ===== */
// app.set('trust proxy', true);

/* ===== Rutas ===== */
const pingRoute = require('./routes/ping');
const resetRoutes = require('./routes/reset.routes');
const usuariosRoutes = require('./routes/usuarios.routes');
const recompensasRoutes = require('./routes/recompensas.routes');
const comandosRoutes = require('./routes/comandos.routes');
const logrosRoutes = require('./routes/logros.routes');
const logrosEstadisticasRoutes = require('./routes/logros_estadisticas.routes');
const jailsRoutes = require('./routes/jails.routes');
const vincularRoutes = require('./routes/vincular.routes');
const sancionesRoutes = require('./routes/sanciones.routes');
const permisosAdminRoutes = require('./routes/permisos.admin.routes');
const statsRoutes = require('./routes/stats.routes');
const rangosRoutes = require('./routes/rangos.routes');
const noticiasRoutes = require('./routes/noticias.routes');
const tiendaTebexRoutes = require('./routes/tiendatebex.routes'); // <- tu router de Tebex

app.use('/ping', pingRoute);
app.use('/api/reset', resetRoutes);
app.use('/api/vincular', vincularRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/recompensas', recompensasRoutes);
app.use('/api/comandos-pendientes', comandosRoutes);

// Puedes montar varias rutas en el mismo prefijo sin problema:
app.use('/api/logros', logrosRoutes);
app.use('/api/logros', logrosEstadisticasRoutes);

app.use('/api/monedas', require('./routes/monedas.routes'));
app.use('/api/jails', jailsRoutes);
app.use('/api/sanciones', sancionesRoutes);
app.use('/api/permisos-admin', permisosAdminRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/rangos', rangosRoutes);
app.use('/api/noticias', noticiasRoutes);
app.use('/api/tebex', tiendaTebexRoutes);

/* ===== Tareas programadas ===== */
// Limpieza automática de rangos expirados
const limpiarRangosExpirados = require('./tasks/rangosExpiradosTask');
limpiarRangosExpirados();
setInterval(() => limpiarRangosExpirados(), 5 * 60 * 1000); // cada 5 min

// Limpieza automática de premium expirado
const limpiarPremiumExpirado = require('./tasks/premiumExpiradoTask');
limpiarPremiumExpirado();
setInterval(() => limpiarPremiumExpirado(), 5 * 60 * 1000); // cada 5 min

/* ===== 404 básico (opcional) ===== */
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

/* ===== Manejador de errores (opcional) ===== */
app.use((err, _req, res, _next) => {
  console.error('❌ Error no controlado:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

module.exports = app;
