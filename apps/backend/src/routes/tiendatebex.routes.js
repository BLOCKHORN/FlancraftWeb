'use strict';
const express = require('express');
const router = express.Router();

const {
  crearPedidoTebex,
  obtenerDatosTienda,
  obtenerDescripcionProducto,
  forzarActualizarCache,
  health,
} = require('../controllers/tiendatebex.controller');

// Health
router.get('/health', health);

// Datos (server opcional)
router.get('/datos', obtenerDatosTienda);
router.get('/:server/datos', obtenerDatosTienda);

// Descripción de producto
router.get('/descripcion/:id', obtenerDescripcionProducto);
router.get('/:server/descripcion/:id', obtenerDescripcionProducto);

// Forzar caché
router.post('/actualizar-cache', forzarActualizarCache);
router.post('/:server/actualizar-cache', forzarActualizarCache);

// Checkout
router.post('/crear-pedido', crearPedidoTebex);

module.exports = router;
