'use strict';

const crypto = require('crypto');

/**
 * Node 18+ trae fetch global.
 */

const CACHE_TTL = Number(process.env.TEBEX_CACHE_TTL || 300);
const ONLY_VISIBLE = String(process.env.TEBEX_ONLY_VISIBLE || 'true').toLowerCase() !== 'false';

// Aplica rebajas si TEBEX_APPLY_SALES=true
const APPLY_SALES = String(process.env.TEBEX_APPLY_SALES || 'false').toLowerCase() === 'true';

// Headless (Top Donator / módulos sidebar)
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
const STORE_SECRET = process.env.TEBEX_STORE_SECRET || process.env.TEBEX_STORE_PRIVATE_KEY || '';

function getServerKey(req) {
  // ✅ soporta ?sv= y también ?server= (tu frontend usa server)
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
  goal: { data: null, cacheAt: 0 },
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
   Rebajas (sales) para packages
   ========================= */
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
    const type = (eff.type || '').toLowerCase();
    const discount = s.discount || {};
    return {
      id: s.id,
      name: s.name,
      effectiveType: type,
      packages: new Set(eff.packages || []),
      categories: new Set(eff.categories || []),
      discountType: (discount.type || '').toLowerCase(),
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

      if ((t === 'package' || t === 'packages') && pkgId && s.packages.has(pkgId)) applies = true;
      else if ((t === 'category' || t === 'categories') && catId && s.categories.has(catId)) applies = true;
      else if (t === 'all') applies = true;

      if (!applies) continue;

      let candidate = base;
      if (s.discountType === 'percentage' && typeof s.percentage === 'number') {
        candidate = base * (1 - s.percentage / 100);
      } else if ((s.discountType === 'value' || s.discountType === 'amount') && typeof s.value === 'number') {
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
   Headless fetcher (/sidebar)
   ========================= */
async function tebexFetchHeadless(path) {
  if (!WEBSTORE_TOKEN) throw new Error('Falta TEBEX_WEBSTORE_TOKEN (Headless API).');
  const url = `https://headless.tebex.io/api/accounts/${WEBSTORE_TOKEN}/${path}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'FlanCraftStore/1.0' } });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`[TEBEX headless ${path}] HTTP ${res.status} ${res.statusText} ${text}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

async function getSidebarModulesCached(force = false) {
  const c = headlessCache.sidebar;
  if (!force && c.cacheAt && !isExpired(c) && c.data) return c.data;

  const data = await tebexFetchHeadless('sidebar');
  headlessCache.sidebar = { data, cacheAt: nowSec() };
  return data;
}

function sidebarArray(sidebar) {
  // Headless docs => { data: [ ... ] }
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
   ✅ PARSEO NÚMEROS (ARREGLADO)
   - evitamos interpretar "4%" como dinero
   ========================= */
function parseNumberFromString(str) {
  const s = String(str ?? '').trim();
  if (!s) return NaN;

  // deja solo dígitos, coma, punto y signo
  let c = s.replace(/[^\d.,-]/g, '');
  if (!c) return NaN;

  const lastComma = c.lastIndexOf(',');
  const lastDot = c.lastIndexOf('.');

  if (lastComma > -1 && lastDot > -1) {
    if (lastComma > lastDot) {
      c = c.replace(/\./g, '').replace(',', '.'); // coma decimal
    } else {
      c = c.replace(/,/g, ''); // punto decimal
    }
  } else if (lastComma > -1 && lastDot === -1) {
    c = c.replace(',', '.'); // solo coma => decimal
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
  // ✅ si huele a %, NO es dinero
  if (hasPercentHint(v)) return NaN;

  if (v && typeof v === 'object') {
    // preferimos raw si existe y NO es percent
    const raw = v.raw ?? v.value ?? v.amount;
    if (typeof raw === 'number' && Number.isFinite(raw)) return raw;

    const formatted = v.formatted ?? v.text ?? v.label ?? v.display;
    const n1 = parseNumberFromString(formatted);
    if (Number.isFinite(n1)) return n1;

    return parseNumberFromString(raw);
  }

  // strings/números
  const s = String(v ?? '').trim();
  if (s.includes('%')) return NaN;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  return parseNumberFromString(s);
}

function toLooseNumber(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (v && typeof v === 'object') {
    const raw = v.raw ?? v.value ?? v.amount ?? v.total ?? v.current ?? v.target;
    if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
    const formatted = v.formatted ?? v.text ?? v.label ?? v.display ?? raw;
    return parseNumberFromString(formatted);
  }
  return parseNumberFromString(v);
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
   GOAL (desde sidebar)
   ========================= */
function pickGoalModule(sidebar) {
  const arr = sidebarArray(sidebar);
  if (!arr.length) return null;

  return (
    arr.find((m) => {
      const t = String(m?.type || '').toLowerCase();
      return t === 'community_goal' || t === 'payment_goal';
    }) || null
  );
}

function normalizeGoalFromModule(module) {
  const d = module?.data || {};

  // ✅ dinero estricto (ignora "4%")
  const totalNum = toMoneyNumberStrict(
    d.total ??
      d.current ??
      d.raised ??
      d.amount ??
      d.current_amount ??
      d.currentAmount ??
      d.progress_amount ??
      d.progressAmount
  );

  // ✅ target estricto (NO usamos "goal" genérico porque a veces viene como %)
  const targetNum = toMoneyNumberStrict(
    d.target ??
      d.objective ??
      d.target_amount ??
      d.targetAmount ??
      d.goal_amount ??
      d.goalAmount ??
      d.targetPrice ??
      d.target_price
  );

  // ✅ porcentaje (loose)
  const pctNum = toLooseNumber(d.percentage ?? d.percent ?? d.progress_percentage ?? d.progressPercent);

  let total = Number.isFinite(totalNum) ? totalNum : 0;
  let target = Number.isFinite(targetNum) ? targetNum : 0;
  let percentage = Number.isFinite(pctNum) ? pctNum : 0;

  // ✅ Heurística de consistencia:
  // si (total/target*100) no cuadra con percentage, recalculamos target con total*100/percentage
  if (total > 0 && percentage > 0) {
    const impliedTarget = total * (100 / percentage);
    const impliedPctFromTarget = target > 0 ? (total / target) * 100 : NaN;

    const mismatch =
      !Number.isFinite(impliedPctFromTarget) || Math.abs(impliedPctFromTarget - percentage) > 1.5 || target < total;

    if ((target <= 0 || mismatch) && Number.isFinite(impliedTarget) && impliedTarget >= total) {
      target = impliedTarget;
    }
  }

  // si tenemos target y % pero total no, lo derivamos
  if (target > 0 && total <= 0 && percentage > 0) {
    total = target * (percentage / 100);
  }

  // si tenemos total y target pero % no, lo derivamos
  if (target > 0 && total >= 0) {
    const p = (total / target) * 100;
    if (!Number.isFinite(percentage) || percentage <= 0) percentage = p;
  }

  // clamps + redondeos
  if (!Number.isFinite(total) || total < 0) total = 0;
  if (!Number.isFinite(target) || target < 0) target = 0;

  if (target > 0) {
    const p = (total / target) * 100;
    if (Number.isFinite(p)) percentage = p;
  }

  percentage = Math.max(0, Math.min(100, Number(percentage.toFixed(2))));
  total = Number(total.toFixed(2));
  target = Number(target.toFixed(2));

  const displayAmount =
    truthy(d.displayAmount) ||
    truthy(d.display_amount) ||
    String(d.displayAmount || d.display_amount || '').toLowerCase() === 'true';

  const barStyle = String(d?.bar?.style || d?.bar_style || 'default');
  const barAnimated =
    d?.bar?.animated === true || String(d?.bar?.animated || d?.bar_animated || '').toLowerCase() === 'true';

  const header = String(d.header || 'META').trim() || 'META';

  return {
    header,
    total,
    target,
    percentage,
    displayAmount,
    bar: { style: barStyle, animated: barAnimated },
    currency: String(d.currency || TEBEX_CURRENCY || 'EUR').toUpperCase(),
    _type: String(module?.type || ''),
    _moduleId: module?.id ?? null,
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
      paquetes = applySalesToPackages(paquetes, salesJson);
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

const crearPedidoTebex = async (req, res) => {
  const { productoId, jugador, items } = req.body || {};
  if (!jugador) return res.status(400).json({ error: 'Falta "jugador".' });

  try {
    if (!STORE_SECRET) return res.status(500).json({ error: 'Falta TEBEX_STORE_SECRET' });

    let basket;
    if (Array.isArray(items) && items.length) {
      basket = items.map((it) => ({ id: Number(it.id), quantity: Number(it.quantity || 1) }));
    } else if (productoId) {
      basket = [{ id: Number(productoId), quantity: 1 }];
    } else {
      return res.status(400).json({ error: 'Faltan "items" o "productoId".' });
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
      return res.status(502).json({ error: 'No se pudo generar el checkout.' });
    }
    res.json({ ok: true, url: data.data.checkout_url });
  } catch (err) {
    console.error('[Tebex Exception]', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

/* =========================
   ✅ SIDEBAR RAW (debug)
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
   ✅ TOP DONATOR (GLOBAL) vía Headless Sidebar
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
   ✅ GOAL (GLOBAL) vía Headless Sidebar (FIX MONEY)
   ========================= */
const obtenerGoal = async (req, res) => {
  try {
    const force = String(req.query.refresh || '').toLowerCase() === '1';

    const c = headlessCache.goal;
    if (!force && c.cacheAt && !isExpired(c) && c.data) {
      return res.json({ ok: true, ...c.data, cacheado: new Date(c.cacheAt * 1000).toISOString() });
    }

    const sidebar = await getSidebarModulesCached(force);
    const modGoal = pickGoalModule(sidebar);
    const goal = modGoal ? normalizeGoalFromModule(modGoal) : null;

    const payload =
      goal || {
        header: 'META',
        total: 0,
        target: 0,
        percentage: 0,
        displayAmount: true,
        bar: { style: 'default', animated: false },
        currency: TEBEX_CURRENCY,
        _missingModule: true,
      };

    headlessCache.goal = { data: payload, cacheAt: nowSec() };

    return res.json({ ok: true, ...payload, cacheado: new Date(headlessCache.goal.cacheAt * 1000).toISOString() });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: 'No se pudo obtener el Goal (Headless).',
      detail: e?.message || 'unknown',
    });
  }
};

/* =========================
   ✅ RECENT PAYMENTS
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
   ✅ WEBHOOK (validación + firma)
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
  obtenerGoal,
  obtenerPagosRecientes,

  webhookPing,
  webhookHandler,
  health,
};
