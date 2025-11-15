// apps/backend/src/controllers/tiendatebex.controller.js
'use strict';

// Node 18+ trae fetch global. Si no, descomenta:
// const fetch = require('node-fetch');

const CACHE_TTL = Number(process.env.TEBEX_CACHE_TTL || 300);
const ONLY_VISIBLE = String(process.env.TEBEX_ONLY_VISIBLE || 'true')
  .toLowerCase() !== 'false';

// Aplica rebajas si TEBEX_APPLY_SALES=true
const APPLY_SALES = String(process.env.TEBEX_APPLY_SALES || 'false')
  .toLowerCase() === 'true';

/* =========================
   Helpers básicos
   ========================= */
const nowSec = () => Math.floor(Date.now() / 1000);
const isExpired = (c) => !c.cacheAt || nowSec() - c.cacheAt >= CACHE_TTL;

function safeParseJSON(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
function cleanSecret(raw) {
  return String(raw || '').replace(/^tebex\s+secret\s+/i, '').trim();
}
function truthy(v) {
  return (
    v === true ||
    v === 1 ||
    v === '1' ||
    String(v).toLowerCase() === 'true'
  );
}
function falsy(v) {
  return (
    v === false ||
    v === 0 ||
    v === '0' ||
    String(v).toLowerCase() === 'false'
  );
}

/* =========================
   Carga de claves
   ========================= */
function loadServerKeys() {
  const fromJson = safeParseJSON(process.env.TEBEX_SECRETS_JSON);
  if (!fromJson) {
    console.warn(
      '[TEBEX] TEBEX_SECRETS_JSON inválido o no definido. Probando fallback suelto.'
    );
  }
  const fallback = {
    oneblock: process.env.TEBEX_PLUGIN_SECRET_ONEBLOCK || '',
    lobby: process.env.TEBEX_PLUGIN_SECRET_LOBBY || '',
    clasico: process.env.TEBEX_PLUGIN_SECRET_CLASICO || '',
  };
  return {
    oneblock: (fromJson && fromJson.oneblock) || fallback.oneblock,
    lobby: (fromJson && fromJson.lobby) || fallback.lobby,
    clasico: (fromJson && fromJson.clasico) || fallback.clasico,
  };
}

const SERVER_KEYS = loadServerKeys();
const STORE_SECRET =
  process.env.TEBEX_STORE_SECRET || process.env.TEBEX_STORE_PRIVATE_KEY || '';

/* =========================
   Caché por servidor
   ========================= */
const cache = {
  oneblock: { categorias: [], paquetes: [], cacheAt: 0 },
  lobby: { categorias: [], paquetes: [], cacheAt: 0 },
  clasico: { categorias: [], paquetes: [], cacheAt: 0 },
};

function getServerKey(req) {
  const sv = (req.params.server || req.query.sv || '').toLowerCase();
  if (['oneblock', 'lobby', 'clasico'].includes(sv)) return sv;
  return 'oneblock';
}

/* =========================
   Normalización + Filtro visibles
   ========================= */
function normalizarPaquetes(json) {
  if (Array.isArray(json)) return json;
  if (json && Array.isArray(json.packages)) return json.packages;
  if (json && json.data && Array.isArray(json.data.packages))
    return json.data.packages;
  if (json && typeof json === 'object') {
    const vals = Object.values(json);
    if (vals.length && vals.every((v) => typeof v === 'object')) return vals;
  }
  return [];
}

/** Devuelve true si el paquete/categoría NO debe mostrarse */
function isHiddenOrDisabled(pkg) {
  // Flags en el propio paquete
  const pkgFlags = [
    pkg?.hidden,
    pkg?.disabled,
    pkg?.archived,
    pkg?.deleted,
    pkg?.gui_disabled,
  ];
  if (
    pkg?.status &&
    ['hidden', 'disabled', 'archived', 'deleted'].includes(
      String(pkg.status).toLowerCase()
    )
  ) {
    return true;
  }
  if (pkgFlags.some(truthy)) return true;

  // Flags en la categoría del paquete
  const cat = pkg?.category || pkg?.categories?.[0] || {};
  const catFlags = [cat?.hidden, cat?.disabled, cat?.archived, cat?.deleted];
  if (
    cat?.status &&
    ['hidden', 'disabled', 'archived', 'deleted'].includes(
      String(cat.status).toLowerCase()
    )
  ) {
    return true;
  }
  if (catFlags.some(truthy)) return true;

  // Otros heurísticos (si Tebex devuelve algo raro)
  if (pkg?.price === null || typeof pkg?.name !== 'string') return true;

  return false;
}

/* =========================
   Rebajas (sales)
   ========================= */

/**
 * Aplica rebajas activas (endpoint /sales) a los paquetes.
 * Añade:
 *  - original_price: precio base
 *  - price: precio final con rebaja
 *  - sale: { name, discount_type, percentage, value }
 */
function applySalesToPackages(paquetes = [], rawSales = []) {
  const salesArr = Array.isArray(rawSales)
    ? rawSales
    : Array.isArray(rawSales.sales)
    ? rawSales.sales
    : Array.isArray(rawSales.data)
    ? rawSales.data
    : [];

  if (!salesArr.length) return paquetes;

  const sales = salesArr.map((s) => {
    const eff = s.effective || {};
    const type = (eff.type || '').toLowerCase(); // package(s), category(ies), all
    const discount = s.discount || {};

    return {
      id: s.id,
      name: s.name,
      effectiveType: type,
      packages: new Set(eff.packages || []),
      categories: new Set(eff.categories || []),
      discountType: (discount.type || '').toLowerCase(), // percentage, value, amount, ...
      percentage: discount.percentage,
      value: discount.value ?? discount.amount,
    };
  });

  return paquetes.map((pkg) => {
    const base = Number.parseFloat(pkg.price);
    if (!Number.isFinite(base)) return pkg;

    const pkgId = pkg.id ?? pkg.package_id;
    const catId =
      pkg?.category?.id ??
      pkg?.category_id ??
      pkg?.categories?.[0]?.id ??
      pkg?.categories?.[0]?.category_id ??
      null;

    let bestFinal = base;
    let bestSale = null;

    for (const s of sales) {
      let applies = false;
      const t = s.effectiveType;

      if ((t === 'package' || t === 'packages') && pkgId && s.packages.has(pkgId)) {
        applies = true;
      } else if (
        (t === 'category' || t === 'categories') &&
        catId &&
        s.categories.has(catId)
      ) {
        applies = true;
      } else if (t === 'all') {
        applies = true;
      }

      if (!applies) continue;

      let candidate = base;
      if (s.discountType === 'percentage' && typeof s.percentage === 'number') {
        candidate = base * (1 - s.percentage / 100);
      } else if (
        (s.discountType === 'value' || s.discountType === 'amount') &&
        typeof s.value === 'number'
      ) {
        candidate = base - s.value;
      }

      if (candidate < bestFinal) {
        bestFinal = candidate;
        bestSale = s;
      }
    }

    if (!bestSale || bestFinal >= base) return pkg;

    return {
      ...pkg,
      original_price: base,
      price: Number(bestFinal.toFixed(2)),
      sale: {
        name: bestSale.name,
        discount_type: bestSale.discountType,
        percentage: bestSale.percentage,
        value: bestSale.value,
      },
    };
  });
}

/* =========================
   Tebex fetchers
   ========================= */
async function tebexFetchPlugin(secret, path) {
  const url = `https://plugin.tebex.io/${path}`;
  const res = await fetch(url, {
    headers: {
      'X-Tebex-Secret': cleanSecret(secret),
      'User-Agent': 'FlanCraftStore/1.0',
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(
      `[TEBEX ${path}] HTTP ${res.status} ${res.statusText} ${text}`
    );
    err.status = res.status;
    throw err;
  }
  return res.json();
}

/* =========================
   Construcción de caché visible
   ========================= */
async function actualizarCacheDe(server) {
  const secret = SERVER_KEYS[server];
  if (!secret)
    throw new Error(`Falta PLUGIN secret para servidor '${server}'.`);

  // Paquetes base
  const json = await tebexFetchPlugin(secret, 'packages');
  let paquetes = normalizarPaquetes(json);

  // Rebajas / sales (opcional)
  if (APPLY_SALES) {
    try {
      const salesJson = await tebexFetchPlugin(secret, 'sales');
      paquetes = applySalesToPackages(paquetes, salesJson);
    } catch (e) {
      console.warn(
        `[TEBEX sales] No se pudieron aplicar rebajas para [${server}]:`,
        e?.message || e
      );
    }
  }

  // 1) Filtra solo visibles si está activo el flag (por defecto true)
  if (ONLY_VISIBLE) {
    paquetes = paquetes.filter((p) => !isHiddenOrDisabled(p));
  }

  // 2) Construye categorías SOLO a partir de los paquetes que han quedado
  const categoriasMap = new Map();
  for (const p of paquetes) {
    const cat = p?.category || p?.categories?.[0];
    const id = cat?.id ?? cat?.category_id ?? p?.category_id;
    const name = cat?.name ?? cat?.category_name ?? p?.category_name;
    if (id && !categoriasMap.has(id))
      categoriasMap.set(id, { id, name: name || `Categoría ${id}` });
  }

  cache[server] = {
    categorias: Array.from(categoriasMap.values()),
    paquetes,
    cacheAt: nowSec(),
  };
  console.log(
    `✅ [${server}] caché: ${paquetes.length} paquetes visibles, ${categoriasMap.size} categorías (TTL ${CACHE_TTL}s).`
  );
}

/* =========================
   Controllers
   ========================= */
const health = (_req, res) => {
  const estado = {};
  for (const k of Object.keys(SERVER_KEYS)) {
    const c = cache[k];
    estado[k] = {
      hasPluginSecret: Boolean(SERVER_KEYS[k]),
      paquetes: c.paquetes?.length || 0,
      categorias: c.categorias?.length || 0,
      cacheado: c.cacheAt ? new Date(c.cacheAt * 1000).toISOString() : null,
      expired: isExpired(c),
    };
  }
  res.json({
    ok: true,
    store: { hasStoreSecret: Boolean(STORE_SECRET) },
    onlyVisible: ONLY_VISIBLE,
    applySales: APPLY_SALES,
    servers: estado,
  });
};

const obtenerDatosTienda = async (req, res) => {
  const server = getServerKey(req);
  const c = cache[server];

  try {
    if (!c.cacheAt || isExpired(c)) {
      console.log(
        `🟡 Caché vacía/expirada para [${server}], actualizando.`
      );
      await actualizarCacheDe(server);
    }
    const ready = cache[server];
    return res.json({
      ok: true,
      server,
      categorias: ready.categorias,
      paquetes: ready.paquetes,
      cacheado: new Date(ready.cacheAt * 1000).toISOString(),
    });
  } catch (err) {
    console.error(
      '❌ Error al obtener datos de tienda:',
      err?.status || '',
      err?.message || err
    );
    const code =
      err?.status >= 500 && err?.status < 600 ? 502 : 500;
    return res.status(code).json({
      ok: false,
      server,
      error: 'No se pudo obtener datos de Tebex',
      detail: err?.message || 'unknown',
    });
  }
};

const forzarActualizarCache = async (req, res) => {
  const server = getServerKey(req);
  try {
    console.log(`🟡 Forzando actualización de caché [${server}].`);
    await actualizarCacheDe(server);
    res.json({
      ok: true,
      server,
      cacheado: new Date(cache[server].cacheAt * 1000).toISOString(),
    });
  } catch (err) {
    console.error('❌ Error al cachear productos:', err);
    res
      .status(500)
      .json({ ok: false, server, error: String(err.message || err) });
  }
};

const obtenerDescripcionProducto = async (req, res) => {
  const server = getServerKey(req);
  const secret = SERVER_KEYS[server];
  const { id } = req.params;
  try {
    if (!secret)
      return res
        .status(500)
        .json({ error: `Falta PLUGIN secret para ${server}` });
    const data = await tebexFetchPlugin(secret, `package/${id}`);

    // Si está activado ONLY_VISIBLE, y este paquete en concreto estuviera oculto/disabled, devuélvelo como 404 lógico
    if (ONLY_VISIBLE && isHiddenOrDisabled(data)) {
      return res.status(404).json({ error: 'Paquete no disponible.' });
    }

    res.json({ server, ...data });
  } catch (err) {
    console.error(
      '[Tebex /package] Error',
      err?.status || '',
      err?.message || err
    );
    const code =
      err?.status >= 500 && err?.status < 600 ? 502 : 500;
    res
      .status(code)
      .json({ error: 'No se pudo obtener la descripción.' });
  }
};

const crearPedidoTebex = async (req, res) => {
  const { productoId, jugador, items } = req.body || {};
  if (!jugador)
    return res.status(400).json({ error: 'Falta "jugador".' });

  try {
    if (!STORE_SECRET)
      return res
        .status(500)
        .json({ error: 'Falta TEBEX_STORE_SECRET' });

    let basket;
    if (Array.isArray(items) && items.length) {
      basket = items.map((it) => ({
        id: Number(it.id),
        quantity: Number(it.quantity || 1),
      }));
    } else if (productoId) {
      basket = [{ id: Number(productoId), quantity: 1 }];
    } else {
      return res
        .status(400)
        .json({ error: 'Faltan "items" o "productoId".' });
    }

    const r = await fetch('https://checkout.tebex.io/api/checkout', {
      method: 'POST',
      headers: {
        'X-Tebex-Secret': STORE_SECRET,
        'Content-Type': 'application/json',
        'User-Agent': 'FlanCraftStore/1.0',
      },
      body: JSON.stringify({
        return_url: 'https://flancraft.com/tienda',
        complete_url: 'https://flancraft.com/tienda?gracias=true',
        basket,
        purchaser: { username: jugador },
      }),
    });

    const data = await r.json().catch(() => ({}));
    if (!r.ok || !data?.data?.checkout_url) {
      console.error('[Tebex checkout] Error', data);
      return res
        .status(502)
        .json({ error: 'No se pudo generar el checkout.' });
    }
    res.json({ ok: true, url: data.data.checkout_url });
  } catch (err) {
    console.error('[Tebex Exception]', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

/* =========================
   Precarga best-effort
   ========================= */
(async () => {
  for (const sv of Object.keys(SERVER_KEYS)) {
    try {
      await actualizarCacheDe(sv);
    } catch (e) {
      console.warn(`⚠️ No se pudo precargar [${sv}]:`, e.message);
    }
  }
})();

module.exports = {
  obtenerDatosTienda,
  forzarActualizarCache,
  obtenerDescripcionProducto,
  crearPedidoTebex,
  health,
};
