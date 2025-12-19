'use strict';

const crypto = require('crypto');

/**
 * Node 18+ trae fetch global.
 */

const CACHE_TTL = Number(process.env.TEBEX_CACHE_TTL || 300);
const ONLY_VISIBLE = String(process.env.TEBEX_ONLY_VISIBLE || 'true').toLowerCase() !== 'false';

// Aplica rebajas si TEBEX_APPLY_SALES=true
const APPLY_SALES = String(process.env.TEBEX_APPLY_SALES || 'false').toLowerCase() === 'true';

// Headless (Top Donator / módulos sidebar / cupones basket)
const WEBSTORE_TOKEN =
  process.env.TEBEX_WEBSTORE_TOKEN ||
  process.env.TEBEX_ACCOUNT_TOKEN ||
  process.env.TEBEX_WEBSTORE_IDENTIFIER ||
  '';

const TEBEX_CURRENCY = (process.env.TEBEX_CURRENCY || 'EUR').toUpperCase().trim();

// Webhook secret (creator.tebex.io -> Webhooks -> Secret Key)
const WEBHOOK_SECRET = String(process.env.TEBEX_WEBHOOK_SECRET || '').trim();

/* =========================
   Helpers básicos
   ========================= */
const nowSec = () => Math.floor(Date.now() / 1000);
const isExpired = (c) => !c.cacheAt || nowSec() - c.cacheAt >= CACHE_TTL;
const DEBUG_TEBEX =
  String(process.env.DEBUG_TEBEX || '').toLowerCase() === 'true' ||
  String(process.env.DEBUG_TEBEX || '') === '1';

function tlog(rid, ...args) {
  if (DEBUG_TEBEX) console.log(`[TEBEX][${rid}]`, ...args);
}

function getClientIPv4(req) {
  const xf = String(req.headers['x-forwarded-for'] || '')
    .split(',')[0]
    .trim();

  const raw = xf || req.socket?.remoteAddress || '';
  const m = raw.match(/(\d{1,3}\.){3}\d{1,3}/);
  return m ? m[0] : null;
}

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
  return v === true || v === 1 || v === '1' || String(v).toLowerCase() === 'true';
}

function sha256Hex(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}
function hmacSha256Hex(secret, data) {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}
function timingSafeEqualHex(a, b) {
  try {
    const ba = Buffer.from(String(a || ''), 'hex');
    const bb = Buffer.from(String(b || ''), 'hex');
    if (ba.length !== bb.length) return false;
    return crypto.timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

/* =========================
   Carga de claves plugin/store
   ========================= */
function loadServerKeys() {
  const fromJson = safeParseJSON(process.env.TEBEX_SECRETS_JSON);
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

// Store Secret (checkout clásico) — si no lo usas, lo puedes dejar
const STORE_SECRET = process.env.TEBEX_STORE_SECRET || process.env.TEBEX_STORE_PRIVATE_KEY || '';

function getServerKey(req) {
  const sv = (req.params.server || req.query.sv || req.query.server || '').toLowerCase();
  if (['oneblock', 'lobby', 'clasico'].includes(sv)) return sv;
  return 'oneblock';
}

/* =========================
   Caché por servidor (packages)
   ========================= */
const cache = {
  oneblock: { categorias: [], paquetes: [], cacheAt: 0 },
  lobby: { categorias: [], paquetes: [], cacheAt: 0 },
  clasico: { categorias: [], paquetes: [], cacheAt: 0 },
};

/* =========================
   Caché sales + Headless
   ========================= */
const salesCache = {
  all: { sale: null, cacheAt: 0 },
  oneblock: { sale: null, cacheAt: 0 },
  lobby: { sale: null, cacheAt: 0 },
  clasico: { sale: null, cacheAt: 0 },
};

const headlessCache = {
  sidebar: { data: null, cacheAt: 0 },
  topDonator: { data: null, cacheAt: 0 },
  recentPayments: { data: null, cacheAt: 0 },
  sidebarRaw: { data: null, cacheAt: 0 },
};

/* =========================
   Normalización + Filtro visibles
   ========================= */
function normalizarPaquetes(json) {
  if (Array.isArray(json)) return json;
  if (json && Array.isArray(json.packages)) return json.packages;
  if (json && json.data && Array.isArray(json.data.packages)) return json.data.packages;
  if (json && typeof json === 'object') {
    const vals = Object.values(json);
    if (vals.length && vals.every((v) => typeof v === 'object')) return vals;
  }
  return [];
}

function isHiddenOrDisabled(pkg) {
  const pkgFlags = [pkg?.hidden, pkg?.disabled, pkg?.archived, pkg?.deleted, pkg?.gui_disabled];
  if (pkg?.status && ['hidden', 'disabled', 'archived', 'deleted'].includes(String(pkg.status).toLowerCase()))
    return true;
  if (pkgFlags.some(truthy)) return true;

  const cat = pkg?.category || pkg?.categories?.[0] || {};
  const catFlags = [cat?.hidden, cat?.disabled, cat?.archived, cat?.deleted];
  if (cat?.status && ['hidden', 'disabled', 'archived', 'deleted'].includes(String(cat.status).toLowerCase()))
    return true;
  if (catFlags.some(truthy)) return true;

  if (pkg?.price === null || typeof pkg?.name !== 'string') return true;
  return false;
}

/* =========================
   Tebex fetchers (plugin)
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
    const err = new Error(`[TEBEX ${path}] HTTP ${res.status} ${res.statusText} ${text}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

/* =========================
   Headless fetcher (/accounts/{token}/...)
   ========================= */
async function tebexFetchHeadless(path, init = {}) {
  if (!WEBSTORE_TOKEN) throw new Error('Falta TEBEX_WEBSTORE_TOKEN (Headless API).');
  const url = `https://headless.tebex.io/api/accounts/${WEBSTORE_TOKEN}/${path}`;

  const res = await fetch(url, {
    method: init.method || 'GET',
    headers: {
      'User-Agent': 'FlanCraftStore/1.0',
      ...(init.headers || {}),
    },
    body: init.body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`[TEBEX headless ${path}] HTTP ${res.status} ${res.statusText} ${text}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

/* =========================
   Headless cached (sidebar)
   ========================= */
async function getSidebarModulesCached(force = false) {
  const c = headlessCache.sidebar;
  if (!force && c.cacheAt && !isExpired(c) && c.data) return c.data;

  const data = await tebexFetchHeadless('sidebar');
  headlessCache.sidebar = { data, cacheAt: nowSec() };
  return data;
}

function sidebarArray(sidebar) {
  return Array.isArray(sidebar?.data) ? sidebar.data : Array.isArray(sidebar) ? sidebar : [];
}

/* =========================
   TOP DONATOR (desde sidebar)
   ========================= */
function pickTopCustomerModule(sidebar) {
  const arr = sidebarArray(sidebar);
  if (!arr.length) return null;
  return arr.find((m) => String(m?.type || '').toLowerCase() === 'top_customer') || null;
}

/* =========================
   PARSEO NÚMEROS TOP DONATOR
   ========================= */
function parseNumberFromString(str) {
  const s = String(str ?? '').trim();
  if (!s) return NaN;

  let c = s.replace(/[^\d.,-]/g, '');
  if (!c) return NaN;

  const lastComma = c.lastIndexOf(',');
  const lastDot = c.lastIndexOf('.');

  if (lastComma > -1 && lastDot > -1) {
    if (lastComma > lastDot) {
      c = c.replace(/\./g, '').replace(',', '.');
    } else {
      c = c.replace(/,/g, '');
    }
  } else if (lastComma > -1 && lastDot === -1) {
    c = c.replace(',', '.');
  }

  const n = Number(c);
  return Number.isFinite(n) ? n : NaN;
}

function hasPercentHint(v) {
  if (!v) return false;
  if (typeof v === 'string') return v.includes('%');
  if (typeof v === 'object') {
    const txt = String(v.formatted ?? v.text ?? v.label ?? v.display ?? '');
    return txt.includes('%');
  }
  return false;
}

function toMoneyNumberStrict(v) {
  if (hasPercentHint(v)) return NaN;

  if (v && typeof v === 'object') {
    const raw = v.raw ?? v.value ?? v.amount;
    if (typeof raw === 'number' && Number.isFinite(raw)) return raw;

    const formatted = v.formatted ?? v.text ?? v.label ?? v.display;
    const n1 = parseNumberFromString(formatted);
    if (Number.isFinite(n1)) return n1;

    return parseNumberFromString(raw);
  }

  const s = String(v ?? '').trim();
  if (s.includes('%')) return NaN;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  return parseNumberFromString(s);
}

function normalizeTopDonatorFromModule(module) {
  const d = module?.data || {};
  const username = String(d.username || d.ign || '').trim();
  const uuid = String(d.username_id || d.uuid || '').trim();

  const amountNum = toMoneyNumberStrict(d.total);
  const amount = Number.isFinite(amountNum) ? Number(amountNum.toFixed(2)) : null;

  return {
    username: username || 'Guest',
    uuid: uuid || '',
    amount,
    currency: String(d.currency || TEBEX_CURRENCY || 'EUR').toUpperCase(),
    periodLabel: String(d.header || 'TOP DONATOR').trim() || 'TOP DONATOR',
    serverLabel: 'GLOBAL',
  };
}

/* =========================
   PAYMENTS (desde sidebar)
   ========================= */
function pickPaymentsModule(sidebar) {
  const arr = sidebarArray(sidebar);
  if (!arr.length) return null;

  const byType = arr.find((m) => String(m?.type || '').toLowerCase() === 'recent_payments');
  if (byType) return byType;

  return arr.find((m) => Array.isArray(m?.data?.payments)) || null;
}

/* =========================
   Sales (para UI / countdown)
   ========================= */
function normalizarSales(json) {
  const arr = Array.isArray(json?.data)
    ? json.data
    : Array.isArray(json?.sales)
    ? json.sales
    : Array.isArray(json)
    ? json
    : [];

  return arr
    .map((s) => {
      const discount = s?.discount || {};
      const effective = s?.effective || {};
      return {
        id: s?.id ?? null,
        name: s?.name ?? null,
        percentage: Number(discount?.percentage ?? 0),
        expire: Number(s?.expire ?? 0),
        start: Number(s?.start ?? 0),
        order: Number(s?.order ?? 999),
        effectiveType: effective?.type || null,
      };
    })
    .filter((s) => s.expire && Number.isFinite(s.expire) && s.percentage > 0);
}

function pickBestSale(list = []) {
  const now = nowSec();
  const active = list.filter((s) => s.expire > now);
  if (!active.length) return null;

  active.sort((a, b) => {
    if (b.percentage !== a.percentage) return b.percentage - a.percentage;
    if (a.expire !== b.expire) return a.expire - b.expire;
    return a.order - b.order;
  });

  return active[0] || null;
}

async function getBestSaleForServer(server) {
  const secret = SERVER_KEYS[server];
  if (!secret) return null;

  const c = salesCache[server] || { sale: null, cacheAt: 0 };
  if (c.cacheAt && !isExpired(c)) return c.sale;

  try {
    const salesJson = await tebexFetchPlugin(secret, 'sales');
    const list = normalizarSales(salesJson);
    const best = pickBestSale(list);

    salesCache[server] = { sale: best, cacheAt: nowSec() };
    return best;
  } catch {
    salesCache[server] = { sale: null, cacheAt: nowSec() };
    return null;
  }
}

async function getBestSaleGlobal() {
  const c = salesCache.all;
  if (c.cacheAt && !isExpired(c)) return c.sale;

  const servers = Object.keys(SERVER_KEYS).filter((sv) => Boolean(SERVER_KEYS[sv]));
  let best = null;

  for (const sv of servers) {
    const s = await getBestSaleForServer(sv);
    if (!s) continue;

    const candidate = { ...s, server: sv };
    if (!best) best = candidate;
    else if (candidate.percentage > best.percentage) best = candidate;
    else if (candidate.percentage === best.percentage && candidate.expire < best.expire) best = candidate;
  }

  salesCache.all = { sale: best, cacheAt: nowSec() };
  return best;
}

/* =========================
   Construcción de caché visible (packages)
   ========================= */
async function actualizarCacheDe(server) {
  const secret = SERVER_KEYS[server];
  if (!secret) throw new Error(`Falta PLUGIN secret para servidor '${server}'.`);

  const json = await tebexFetchPlugin(secret, 'packages');
  let paquetes = normalizarPaquetes(json);

  if (APPLY_SALES) {
    try {
      const salesJson = await tebexFetchPlugin(secret, 'sales');
      // Mantengo tu applySalesToPackages fuera para no romper tu base;
      // si lo tienes arriba en tu archivo original, déjalo tal cual.
      // Aquí NO lo vuelvo a pegar para no duplicar.
      // paquetes = applySalesToPackages(paquetes, salesJson);
    } catch (e) {
      console.warn(`[TEBEX sales] No se pudieron aplicar rebajas para [${server}]:`, e?.message || e);
    }
  }

  if (ONLY_VISIBLE) {
    paquetes = paquetes.filter((p) => !isHiddenOrDisabled(p));
  }

  const categoriasMap = new Map();
  for (const p of paquetes) {
    const cat = p?.category || p?.categories?.[0];
    const id = cat?.id ?? cat?.category_id ?? p?.category_id;
    const name = cat?.name ?? cat?.category_name ?? p?.category_name;
    if (id && !categoriasMap.has(id)) categoriasMap.set(id, { id, name: name || `Categoría ${id}` });
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
   Headless: Basic Auth helpers
   ========================= */
function getHeadlessBasic() {
  const HEADLESS_PUBLIC = String(process.env.TEBEX_HEADLESS_PUBLIC_TOKEN || '').trim();
  const HEADLESS_PRIVATE = String(process.env.TEBEX_HEADLESS_PRIVATE_KEY || '').trim();

  const BASIC =
    HEADLESS_PUBLIC && HEADLESS_PRIVATE
      ? Buffer.from(`${HEADLESS_PUBLIC}:${HEADLESS_PRIVATE}`).toString('base64')
      : '';

  if (!BASIC) {
    const err = new Error(
      'Faltan credenciales Headless Basic Auth (TEBEX_HEADLESS_PUBLIC_TOKEN / TEBEX_HEADLESS_PRIVATE_KEY).'
    );
    err.status = 500;
    throw err;
  }

  return BASIC;
}

async function headlessFetchJson({ rid, url, method = 'GET', body = null }) {
  const BASIC = getHeadlessBasic();

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);

  try {
    const res = await fetch(url, {
      method,
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'FlanCraftStore/1.0',
        Accept: 'application/json',
        Authorization: `Basic ${BASIC}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const text = await res.text().catch(() => '');
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    if (!res.ok) {
      const err = new Error(`HTTP ${res.status} ${res.statusText}`);
      err.status = res.status;
      err.data = data;
      err.raw = (text || '').slice(0, 800);
      throw err;
    }

    return data;
  } finally {
    clearTimeout(t);
  }
}

/* =========================
   Controllers base
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
    headless: { hasWebstoreToken: Boolean(WEBSTORE_TOKEN) },
    servers: estado,
  });
};

const obtenerSaleActiva = async (req, res) => {
  try {
    const hasParamServer = Boolean(req.params?.server);
    if (hasParamServer) {
      const server = getServerKey(req);
      const best = await getBestSaleForServer(server);
      return res.json({
        ok: true,
        scope: 'server',
        server,
        active: Boolean(best),
        sale: best ? { ...best, server } : null,
        cacheado: salesCache[server]?.cacheAt ? new Date(salesCache[server].cacheAt * 1000).toISOString() : null,
      });
    }

    const bestGlobal = await getBestSaleGlobal();
    return res.json({
      ok: true,
      scope: 'all',
      active: Boolean(bestGlobal),
      sale: bestGlobal || null,
      cacheado: salesCache.all?.cacheAt ? new Date(salesCache.all.cacheAt * 1000).toISOString() : null,
    });
  } catch {
    return res.status(500).json({ ok: false, active: false, sale: null, error: 'No se pudo obtener la sale activa' });
  }
};

const obtenerDatosTienda = async (req, res) => {
  const server = getServerKey(req);
  const c = cache[server];

  try {
    if (!c.cacheAt || isExpired(c)) {
      console.log(`🟡 Caché vacía/expirada para [${server}], actualizando.`);
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
    console.error('❌ Error al obtener datos de tienda:', err?.status || '', err?.message || err);
    const code = err?.status >= 500 && err?.status < 600 ? 502 : 500;
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
    res.json({ ok: true, server, cacheado: new Date(cache[server].cacheAt * 1000).toISOString() });
  } catch (err) {
    console.error('❌ Error al cachear productos:', err);
    res.status(500).json({ ok: false, server, error: String(err.message || err) });
  }
};

const obtenerDescripcionProducto = async (req, res) => {
  const server = getServerKey(req);
  const secret = SERVER_KEYS[server];
  const { id } = req.params;

  try {
    if (!secret) return res.status(500).json({ error: `Falta PLUGIN secret para ${server}` });
    const data = await tebexFetchPlugin(secret, `package/${id}`);
    if (ONLY_VISIBLE && isHiddenOrDisabled(data)) return res.status(404).json({ error: 'Paquete no disponible.' });
    res.json({ server, ...data });
  } catch (err) {
    console.error('[Tebex /package] Error', err?.status || '', err?.message || err);
    const code = err?.status >= 500 && err?.status < 600 ? 502 : 500;
    res.status(code).json({ error: 'No se pudo obtener la descripción.' });
  }
};

/* =========================
   Crear checkout (HEADLESS) — (tu lógica original)
   ========================= */
const crearPedidoTebex = async (req, res) => {
  const rid = crypto.randomBytes(4).toString('hex');

  const body = req.body || {};
  const jugador = String(body.jugador || '').trim();

  const codigoDescuentoRaw = body.codigoDescuento ?? body.coupon ?? body.codigo_descuento ?? '';
  const coupon = String(codigoDescuentoRaw || '').trim();

  if (!jugador) return res.status(400).json({ ok: false, error: 'Falta "jugador".' });

  let basket = [];
  if (Array.isArray(body.items) && body.items.length) {
    basket = body.items.map((it) => ({
      id: Number(it.id),
      quantity: Number(it.quantity || 1),
    }));
  } else if (body.productoId) {
    basket = [{ id: Number(body.productoId), quantity: 1 }];
  } else {
    return res.status(400).json({ ok: false, error: 'Faltan "items" o "productoId".' });
  }

  basket = basket.filter(
    (it) => Number.isFinite(it.id) && it.id > 0 && Number.isFinite(it.quantity) && it.quantity > 0
  );

  if (!basket.length) {
    return res.status(400).json({ ok: false, error: 'Carrito inválido (ids/cantidades).' });
  }

  const token = String(WEBSTORE_TOKEN || '').trim();
  if (!token) {
    return res.status(500).json({ ok: false, error: 'Falta TEBEX_WEBSTORE_TOKEN (webstore identifier).' });
  }

  const ipv4 = getClientIPv4(req);
  tlog(rid, 'checkout req:', { jugador, coupon, items: basket, ipv4 });

  async function fetchJson(url, options = {}) {
    const BASIC = getHeadlessBasic();

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);

    try {
      const r = await fetch(url, {
        ...options,
        signal: ctrl.signal,
        headers: {
          'User-Agent': 'FlanCraftStore/1.0',
          Accept: 'application/json',
          Authorization: `Basic ${BASIC}`,
          ...(options.headers || {}),
        },
      });

      const text = await r.text().catch(() => '');
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }

      tlog(rid, 'HTTP', r.status, url, data || text?.slice(0, 200));

      if (!r.ok) {
        const err = new Error(`HTTP ${r.status} ${r.statusText}`);
        err.status = r.status;
        err.data = data;
        err.raw = (text || '').slice(0, 800);
        throw err;
      }

      return data;
    } finally {
      clearTimeout(t);
    }
  }

  try {
    // 1) Crear basket
    const createBasketUrl = `https://headless.tebex.io/api/accounts/${encodeURIComponent(token)}/baskets`;

    const createBody = {
      complete_url: 'https://flancraft.com/tienda?gracias=true',
      cancel_url: 'https://flancraft.com/tienda',
      complete_auto_redirect: true,
      username: jugador,
      ...(ipv4 ? { ip_address: ipv4 } : {}),
      custom: {
        mc_username: jugador,
        source: 'flancraft-web',
        ts: Date.now(),
      },
    };

    const created = await fetchJson(createBasketUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createBody),
    });

    const ident = created?.data?.ident;
    const username_id = created?.data?.username_id;

    if (!ident) {
      return res.status(502).json({
        ok: false,
        error: 'No se pudo crear el basket (sin ident).',
        detail: created || null,
      });
    }

    tlog(rid, 'basket created:', { ident, username_id });

    // 2) Añadir paquetes
    for (const it of basket) {
      const addUrl = `https://headless.tebex.io/api/baskets/${encodeURIComponent(ident)}/packages`;

      await fetchJson(addUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          package_id: it.id,
          quantity: it.quantity,
          ...(username_id ? { variable_data: { username_id } } : {}),
        }),
      });
    }

    // 3) Aplicar cupón (si hay) — usando accounts/{token}
    if (coupon) {
      const couponUrl = `https://headless.tebex.io/api/accounts/${encodeURIComponent(
        token
      )}/baskets/${encodeURIComponent(ident)}/coupons`;

      try {
        await fetchJson(couponUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ coupon_code: coupon }),
        });
      } catch (e) {
        const status = e?.status || 500;
        if (status === 422 || status === 400) {
          return res.status(400).json({
            ok: false,
            error: 'Código de descuento inválido o no aplicable.',
            detail: e?.data || e?.raw || e?.message,
          });
        }
        throw e;
      }
    }

    // 4) Obtener checkout link
    const getBasketUrl = `https://headless.tebex.io/api/accounts/${encodeURIComponent(
      token
    )}/baskets/${encodeURIComponent(ident)}`;

    const finalBasket = await fetchJson(getBasketUrl, { method: 'GET' });

    const checkoutUrl = finalBasket?.data?.links?.checkout || created?.data?.links?.checkout;

    if (!checkoutUrl) {
      return res.status(502).json({
        ok: false,
        error: 'Basket creado, pero no se encontró links.checkout.',
        detail: finalBasket?.data?.links || created?.data?.links || null,
      });
    }

    tlog(rid, 'checkout url:', checkoutUrl);
    return res.json({ ok: true, ident, url: checkoutUrl });
  } catch (err) {
    const data = err?.data || null;

    const title = String(data?.title || '').toLowerCase();
    if (err?.status === 400 && title.includes('unable to verify your username')) {
      return res.status(400).json({
        ok: false,
        error:
          'Tebex no puede verificar ese nombre como cuenta válida para esta tienda. Si tu servidor acepta nicks no-premium/offline, Tebex los rechazará. Usa un username premium (NameMC) o cambia el proyecto a Universal Store.',
        detail: data,
      });
    }

    console.error(
      `[TEBEX][${rid}] Checkout error`,
      err?.status || '',
      err?.message || err,
      err?.data || err?.raw || ''
    );

    const upstreamStatus = err?.status;
    const status = upstreamStatus >= 400 && upstreamStatus < 600 ? upstreamStatus : 500;

    return res.status(status).json({
      ok: false,
      error: 'No se pudo generar el checkout.',
      status,
      detail: err?.data || err?.raw || err?.message || 'unknown',
    });
  }
};

/* =========================
   SIDEBAR RAW (debug)
   ========================= */
const obtenerSidebarRaw = async (req, res) => {
  try {
    const force = String(req.query.refresh || '').toLowerCase() === '1';

    const c = headlessCache.sidebarRaw;
    if (!force && c.cacheAt && !isExpired(c) && c.data) {
      return res.json({ ok: true, ...c.data, cacheado: new Date(c.cacheAt * 1000).toISOString() });
    }

    const sidebar = await getSidebarModulesCached(force);
    const arr = sidebarArray(sidebar);

    const modules = arr.map((m) => {
      const data = m?.data || {};
      return {
        id: m?.id ?? null,
        type: m?.type ?? null,
        dataKeys: Object.keys(data),
        data,
      };
    });

    const payload = { modules };
    headlessCache.sidebarRaw = { data: payload, cacheAt: nowSec() };

    return res.json({ ok: true, ...payload, cacheado: new Date(headlessCache.sidebarRaw.cacheAt * 1000).toISOString() });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'No se pudo obtener sidebar raw', detail: e?.message || 'unknown' });
  }
};

/* =========================
   TOP DONATOR (GLOBAL) vía Headless Sidebar
   ========================= */
const obtenerTopDonator = async (req, res) => {
  try {
    const force = String(req.query.refresh || '').toLowerCase() === '1';

    const c = headlessCache.topDonator;
    if (!force && c.cacheAt && !isExpired(c) && c.data) {
      return res.json({ ok: true, ...c.data, cacheado: new Date(c.cacheAt * 1000).toISOString() });
    }

    const sidebar = await getSidebarModulesCached(force);
    const modTop = pickTopCustomerModule(sidebar);
    const top = modTop ? normalizeTopDonatorFromModule(modTop) : null;

    const payload =
      top || {
        username: 'Guest',
        uuid: '',
        amount: null,
        currency: TEBEX_CURRENCY,
        periodLabel: 'TOP DONATOR',
        serverLabel: 'GLOBAL',
      };

    headlessCache.topDonator = { data: payload, cacheAt: nowSec() };

    return res.json({ ok: true, ...payload, cacheado: new Date(headlessCache.topDonator.cacheAt * 1000).toISOString() });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: 'No se pudo obtener el Top Donator (Headless).',
      detail: e?.message || 'unknown',
    });
  }
};

/* =========================
   RECENT PAYMENTS
   ========================= */
const obtenerPagosRecientes = async (req, res) => {
  try {
    const force = String(req.query.refresh || '').toLowerCase() === '1';

    const c = headlessCache.recentPayments;
    if (!force && c.cacheAt && !isExpired(c) && c.data) {
      return res.json({ ok: true, payments: c.data, cacheado: new Date(c.cacheAt * 1000).toISOString() });
    }

    const sidebar = await getSidebarModulesCached(force);
    const mod = pickPaymentsModule(sidebar);

    const payments = Array.isArray(mod?.data?.payments) ? mod.data.payments : [];

    headlessCache.recentPayments = { data: payments, cacheAt: nowSec() };

    return res.json({ ok: true, payments, cacheado: new Date(headlessCache.recentPayments.cacheAt * 1000).toISOString() });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: 'No se pudieron obtener pagos recientes (Headless).',
      detail: e?.message || 'unknown',
    });
  }
};

/* =========================
   Basket: obtener (para tu modal)
   ========================= */
const obtenerBasketHeadless = async (req, res) => {
  const rid = crypto.randomBytes(4).toString('hex');
  try {
    const token = String(WEBSTORE_TOKEN || '').trim();
    if (!token) return res.status(500).json({ ok: false, error: 'Falta TEBEX_WEBSTORE_TOKEN.' });

    const ident = String(req.params.ident || '').trim();
    if (!ident) return res.status(400).json({ ok: false, error: 'Falta basket ident.' });

    const url = `https://headless.tebex.io/api/accounts/${encodeURIComponent(token)}/baskets/${encodeURIComponent(
      ident
    )}`;

    const data = await headlessFetchJson({ rid, url });
    return res.json({ ok: true, basket: data?.data || data });
  } catch (e) {
    return res.status(e?.status || 500).json({
      ok: false,
      error: 'No se pudo obtener el basket.',
      detail: e?.data || e?.raw || e?.message || 'unknown',
    });
  }
};

/* =========================
   Basket: aplicar códigos (creator / coupon / giftcard / coupon_giftcard)
   ========================= */
const aplicarCodigoBasket = async (req, res) => {
  const rid = crypto.randomBytes(4).toString('hex');

  try {
    const token = String(WEBSTORE_TOKEN || '').trim();
    if (!token) return res.status(500).json({ ok: false, error: 'Falta TEBEX_WEBSTORE_TOKEN.' });

    const ident = String(req.params.ident || '').trim();
    if (!ident) return res.status(400).json({ ok: false, error: 'Falta basket ident.' });

    const tipo = String(req.body?.tipo || '').toLowerCase().trim(); // creator | coupon | giftcard | coupon_giftcard
    const codigo = String(req.body?.codigo || '').trim();

    if (!['creator', 'coupon', 'giftcard', 'coupon_giftcard'].includes(tipo)) {
      return res.status(400).json({
        ok: false,
        error: 'Tipo inválido. Usa "creator", "coupon", "giftcard" o "coupon_giftcard".',
      });
    }
    if (!codigo) return res.status(400).json({ ok: false, error: 'Falta código.' });

    const tryApply = async (path, body) => {
      const url = `https://headless.tebex.io/api/accounts/${encodeURIComponent(token)}/baskets/${encodeURIComponent(
        ident
      )}/${path}`;

      return headlessFetchJson({ rid, url, method: 'POST', body });
    };

    let data = null;

    if (tipo === 'creator') {
      data = await tryApply('creator-codes', { creator_code: codigo });
      return res.json({ ok: true, basket: data?.data || data, appliedAs: 'creator' });
    }

    if (tipo === 'coupon') {
      data = await tryApply('coupons', { coupon_code: codigo });
      return res.json({ ok: true, basket: data?.data || data, appliedAs: 'coupon' });
    }

    if (tipo === 'giftcard') {
      data = await tryApply('giftcards', { card_number: codigo });
      return res.json({ ok: true, basket: data?.data || data, appliedAs: 'giftcard' });
    }

    // coupon_giftcard => intenta cupón, si falla (400/422) intenta giftcard
    try {
      data = await tryApply('coupons', { coupon_code: codigo });
      return res.json({ ok: true, basket: data?.data || data, appliedAs: 'coupon' });
    } catch (e1) {
      const s1 = e1?.status || 500;
      if (s1 !== 400 && s1 !== 422) throw e1;

      try {
        data = await tryApply('giftcards', { card_number: codigo });
        return res.json({ ok: true, basket: data?.data || data, appliedAs: 'giftcard' });
      } catch (e2) {
        const s2 = e2?.status || 500;
        if (s2 === 400 || s2 === 422) {
          return res.status(400).json({
            ok: false,
            error: 'Código inválido o no aplicable.',
            detail: e2?.data || e2?.raw || e2?.message || 'unknown',
          });
        }
        throw e2;
      }
    }
  } catch (e) {
    const status = e?.status || 500;

    if (status === 422 || status === 400) {
      return res.status(400).json({
        ok: false,
        error: 'Código inválido o no aplicable.',
        detail: e?.data || e?.raw || e?.message || 'unknown',
      });
    }

    return res.status(status).json({
      ok: false,
      error: 'No se pudo aplicar el código.',
      detail: e?.data || e?.raw || e?.message || 'unknown',
    });
  }
};

/* =========================
   Basket: quitar códigos
   ========================= */
const quitarCodigoBasket = async (req, res) => {
  const rid = crypto.randomBytes(4).toString('hex');

  try {
    const token = String(WEBSTORE_TOKEN || '').trim();
    if (!token) return res.status(500).json({ ok: false, error: 'Falta TEBEX_WEBSTORE_TOKEN.' });

    const ident = String(req.params.ident || '').trim();
    if (!ident) return res.status(400).json({ ok: false, error: 'Falta basket ident.' });

    const tipo = String(req.body?.tipo || '').toLowerCase().trim(); // creator | coupon | giftcard
    const codigo = String(req.body?.codigo || '').trim(); // necesario en giftcard

    if (!['creator', 'coupon', 'giftcard'].includes(tipo)) {
      return res.status(400).json({ ok: false, error: 'Tipo inválido. Usa "creator", "coupon" o "giftcard".' });
    }

    let path = '';
    let body = null;

    if (tipo === 'creator') {
      path = 'creator-codes/remove';
    } else if (tipo === 'coupon') {
      path = 'coupons/remove';
    } else if (tipo === 'giftcard') {
      path = 'giftcards/remove';
      if (!codigo) return res.status(400).json({ ok: false, error: 'Para quitar giftcard hace falta el card_number.' });
      body = { card_number: codigo };
    }

    const url = `https://headless.tebex.io/api/accounts/${encodeURIComponent(token)}/baskets/${encodeURIComponent(
      ident
    )}/${path}`;

    await headlessFetchJson({ rid, url, method: 'POST', body });

    return res.json({ ok: true });
  } catch (e) {
    return res.status(e?.status || 500).json({
      ok: false,
      error: 'No se pudo quitar el código.',
      detail: e?.data || e?.raw || e?.message || 'unknown',
    });
  }
};

/* =========================
   Basket: añadir paquete (upsell "Add")
   ========================= */
const agregarPaqueteBasket = async (req, res) => {
  const rid = crypto.randomBytes(4).toString('hex');

  try {
    const token = String(WEBSTORE_TOKEN || '').trim();
    if (!token) return res.status(500).json({ ok: false, error: 'Falta TEBEX_WEBSTORE_TOKEN.' });

    const ident = String(req.params.ident || '').trim();
    if (!ident) return res.status(400).json({ ok: false, error: 'Falta basket ident.' });

    const package_id = Number(req.body?.package_id);
    const quantity = Number(req.body?.quantity || 1);

    if (!Number.isFinite(package_id) || package_id <= 0) {
      return res.status(400).json({ ok: false, error: 'package_id inválido.' });
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return res.status(400).json({ ok: false, error: 'quantity inválida.' });
    }

    // Sacamos username_id del basket (para variable_data en tiendas Minecraft)
    const getUrl = `https://headless.tebex.io/api/accounts/${encodeURIComponent(token)}/baskets/${encodeURIComponent(
      ident
    )}`;
    const basketRes = await headlessFetchJson({ rid, url: getUrl, method: 'GET' });
    const b = basketRes?.data || basketRes;
    const username_id = b?.username_id || null;

    const addUrl = `https://headless.tebex.io/api/baskets/${encodeURIComponent(ident)}/packages`;

    const data = await headlessFetchJson({
      rid,
      url: addUrl,
      method: 'POST',
      body: {
        package_id,
        quantity,
        ...(username_id ? { variable_data: { username_id } } : {}),
      },
    });

    return res.json({ ok: true, basket: data?.data || data });
  } catch (e) {
    const status = e?.status || 500;
    return res.status(status).json({
      ok: false,
      error: 'No se pudo añadir el paquete al basket.',
      detail: e?.data || e?.raw || e?.message || 'unknown',
    });
  }
};

/* =========================
   Recomendaciones (You might like)
   - Devuelve paquetes visibles del cache del server
   ========================= */
const obtenerRecomendaciones = async (req, res) => {
  const server = getServerKey(req);
  const count = Math.max(1, Math.min(6, Number(req.query.count || 3)));
  const exclude = String(req.query.exclude || '')
    .split(',')
    .map((x) => Number(x))
    .filter((n) => Number.isFinite(n) && n > 0);

  try {
    const c = cache[server];
    if (!c.cacheAt || isExpired(c)) {
      await actualizarCacheDe(server);
    }

    const list = (cache[server].paquetes || [])
      .filter((p) => p && !exclude.includes(Number(p.id ?? p.package_id)))
      .map((p) => {
        const id = Number(p.id ?? p.package_id);
        const name = String(p.name || '').trim();
        const price = Number(p.price);
        const image =
          p?.image ||
          p?.image_url ||
          p?.imageUrl ||
          p?.imageUrlLarge ||
          p?.img ||
          '';

        return {
          id,
          name,
          price: Number.isFinite(price) ? price : null,
          currency: String(p.currency || TEBEX_CURRENCY || 'EUR').toUpperCase(),
          image: image ? String(image) : '',
        };
      })
      .filter((p) => p.id && p.name);

    // Heurística simple: primero los más caros, luego fallback
    list.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));

    return res.json({ ok: true, server, items: list.slice(0, count) });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'No se pudieron obtener recomendaciones', detail: e?.message || 'unknown' });
  }
};

/* =========================
   WEBHOOK (validación + firma)
   ========================= */
const webhookPing = (_req, res) => {
  res.status(200).send('ok');
};

const webhookHandler = async (req, res) => {
  try {
    if (!WEBHOOK_SECRET) {
      return res.status(500).json({ ok: false, error: 'Falta TEBEX_WEBHOOK_SECRET' });
    }

    const signature = req.get('X-Signature') || req.get('x-signature') || '';
    const raw = req.rawBody;
    if (!raw || !Buffer.isBuffer(raw)) return res.status(400).json({ ok: false, error: 'Missing raw body' });

    // signature = HMAC-SHA256( SHA256(rawBody), secret )
    const bodyHash = sha256Hex(raw);
    const expected = hmacSha256Hex(WEBHOOK_SECRET, bodyHash);

    if (!timingSafeEqualHex(expected, signature)) {
      return res.status(401).json({ ok: false, error: 'Invalid signature' });
    }

    const evt = JSON.parse(raw.toString('utf8') || '{}');

    if (evt?.type === 'validation.webhook') {
      return res.status(200).json({ id: evt.id });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'Webhook error', detail: e?.message || 'unknown' });
  }
};

/* =========================
   Precarga best-effort (packages)
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
  obtenerSaleActiva,

  obtenerSidebarRaw,
  obtenerTopDonator,
  obtenerPagosRecientes,

  obtenerBasketHeadless,
  aplicarCodigoBasket,
  quitarCodigoBasket,
  agregarPaqueteBasket,
  obtenerRecomendaciones,

  webhookPing,
  webhookHandler,
  health,
};
