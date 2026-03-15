"use strict";

const crypto = require("crypto");
const tebex = require("./tebex.helpers");
const welcomePackService = require("./tebexWelcomePack.service");
const tebexPaymentsService = require("./tebexPayments.service");

const FX_TTL_SEC = 6 * 60 * 60;
let fxCache = { data: null, cacheAt: 0, inflight: null };

function normalizeIso(code, fallback = "EUR") {
  const c = String(code || "").trim().toUpperCase();
  return /^[A-Z]{3}$/.test(c) ? c : fallback;
}

function uniqSortedUpper(list) {
  const set = new Set((list || []).map((x) => String(x || "").trim().toUpperCase()).filter(Boolean));
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

function getCurrentPeriodInfo() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const periodKey = `${y}-${m}`;
  const txt = new Intl.DateTimeFormat("es-ES", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(now);
  const periodLabel = txt.charAt(0).toUpperCase() + txt.slice(1);
  return { periodKey, periodLabel };
}

async function buildSidebarFallbackTop({ force = false, server = "global", limit = 3 } = {}) {
  const { periodKey, periodLabel } = getCurrentPeriodInfo();
  const sidebar = await tebex.getSidebarModulesCached(force);
  const modTop = tebex.pickTopCustomerModule(sidebar);
  const top = modTop ? tebex.normalizeTopDonatorFromModule(modTop) : null;

  if (!top) {
    return {
      ok: true,
      source: "empty",
      periodKey,
      periodLabel,
      server,
      count: 0,
      empty: true,
      items: [],
    };
  }

  return {
    ok: true,
    source: "sidebar_fallback",
    periodKey,
    periodLabel,
    server,
    count: Math.min(1, limit),
    empty: false,
    items: [
      {
        rank: 1,
        username: top.username,
        uuid: top.uuid,
        amount: top.amount,
        currency: top.currency,
        server,
        latestPurchaseAt: null,
      },
    ],
  };
}

async function fetchFxFromFrankfurter(base) {
  const baseISO = normalizeIso(base, "EUR");
  const url = `https://api.frankfurter.app/latest?from=${encodeURIComponent(baseISO)}`;

  const r = await fetch(url, { headers: { Accept: "application/json" } });
  const text = await r.text().catch(() => "");
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!r.ok || !data?.rates || typeof data.rates !== "object") {
    const err = new Error(`FX upstream ${r.status}`);
    err.status = r.status;
    err.data = data || text?.slice(0, 400);
    throw err;
  }

  const outBase = normalizeIso(data.base || baseISO, baseISO);
  const currencies = uniqSortedUpper([outBase, ...Object.keys(data.rates || {})]);

  return { base: outBase, date: data.date || null, rates: data.rates || {}, currencies, provider: "frankfurter" };
}

const obtenerFx = async (req, res) => {
  try {
    const base = normalizeIso(tebex.TEBEX_CURRENCY || "EUR", "EUR");
    const refresh = String(req.query.refresh || "").trim().toLowerCase();
    const force = refresh === "1" || refresh === "true";

    if (!force && fxCache.data && fxCache.cacheAt && tebex.nowSec() - fxCache.cacheAt < FX_TTL_SEC) {
      return res.json({ ok: true, ...fxCache.data, cacheado: new Date(fxCache.cacheAt * 1000).toISOString(), ttlSec: FX_TTL_SEC });
    }

    if (!force && fxCache.inflight) {
      const d = await fxCache.inflight;
      return res.json({ ok: true, ...d, cacheado: new Date(fxCache.cacheAt * 1000).toISOString(), ttlSec: FX_TTL_SEC });
    }

    fxCache.inflight = (async () => {
      const d = await fetchFxFromFrankfurter(base);
      fxCache.data = d;
      fxCache.cacheAt = tebex.nowSec();
      fxCache.inflight = null;
      return d;
    })();

    const d = await fxCache.inflight;
    return res.json({ ok: true, ...d, cacheado: new Date(fxCache.cacheAt * 1000).toISOString(), ttlSec: FX_TTL_SEC });
  } catch (e) {
    fxCache.inflight = null;
    return res.status(500).json({ ok: false, error: "No se pudo obtener FX", detail: e?.data || e?.message || "unknown" });
  }
};

function withCacheBust(url, bust) {
  const u = String(url || "").trim();
  if (!u) return "";
  const sep = u.includes("?") ? "&" : "?";
  return `${u}${sep}v=${encodeURIComponent(String(bust || ""))}`;
}

function pickPkgImageRaw(p) {
  return p?.image_url || p?.image || p?.imageUrl || p?.imageUrlLarge || p?.img || "";
}

function applyImageBustToPackages(paquetes = [], bustKey) {
  const bust = String(bustKey || "");
  return (Array.isArray(paquetes) ? paquetes : []).map((p) => {
    const raw = pickPkgImageRaw(p);
    if (!raw) return p;
    return { ...p, image_url_raw: raw, image_url: withCacheBust(raw, bust) };
  });
}

const health = (_req, res) => {
  const estado = {};

  const keys = Object.keys(tebex.cache || {});
  for (const k of keys) {
    const c = tebex.cache[k];
    estado[k] = {
      paquetes: c?.paquetes?.length || 0,
      categorias: c?.categorias?.length || 0,
      cacheado: c?.cacheAt ? new Date(c.cacheAt * 1000).toISOString() : null,
      expired: tebex.isExpired(c),
    };
  }

  res.json({
    ok: true,
    store: { hasStoreSecret: Boolean(tebex.STORE_SECRET) },
    onlyVisible: tebex.ONLY_VISIBLE,
    applySales: tebex.APPLY_SALES,
    headless: { hasWebstoreToken: Boolean(tebex.WEBSTORE_TOKEN) },
    currency: String(tebex.TEBEX_CURRENCY || "EUR").toUpperCase(),
    servers: estado,
  });
};

const obtenerSaleActiva = async (req, res) => {
  try {
    const hasParamServer = Boolean(req.params?.server);
    if (hasParamServer) {
      const server = tebex.getServerKey(req);
      const best = await tebex.getBestSaleForServer(server);
      return res.json({
        ok: true,
        scope: "server",
        server,
        active: Boolean(best),
        sale: best ? { ...best, server } : null,
        cacheado: tebex.salesCache?.[server]?.cacheAt ? new Date(tebex.salesCache[server].cacheAt * 1000).toISOString() : null,
      });
    }

    const bestGlobal = await tebex.getBestSaleGlobal();
    return res.json({
      ok: true,
      scope: "all",
      active: Boolean(bestGlobal),
      sale: bestGlobal || null,
      cacheado: tebex.salesCache?.all?.cacheAt ? new Date(tebex.salesCache.all.cacheAt * 1000).toISOString() : null,
    });
  } catch {
    return res.status(500).json({ ok: false, active: false, sale: null, error: "No se pudo obtener la sale activa" });
  }
};

const obtenerDatosTienda = async (req, res) => {
  const server = tebex.getServerKey(req);
  const c = tebex.cache[server];

  const refresh = String(req.query.refresh || "").trim().toLowerCase();
  const force = refresh === "1" || refresh === "true";

  try {
    if (force) {
      await tebex.actualizarCacheDe(server);
    } else if (!c?.cacheAt || tebex.isExpired(c)) {
      await tebex.actualizarCacheDe(server);
    }

    const ready = tebex.cache[server];
    const bustKey = ready.cacheAt || tebex.nowSec();
    const paquetesBusted = applyImageBustToPackages(ready.paquetes, bustKey);

    return res.json({
      ok: true,
      server,
      currency: String(tebex.TEBEX_CURRENCY || "EUR").toUpperCase(),
      categorias: ready.categorias,
      paquetes: paquetesBusted,
      cacheado: new Date(ready.cacheAt * 1000).toISOString(),
      bust: bustKey,
    });
  } catch (err) {
    const upstream = Number(err?.status);
    const status = Number.isFinite(upstream) && upstream >= 400 && upstream < 600 ? 502 : 500;

    return res.status(status).json({
      ok: false,
      server,
      error: "No se pudo obtener datos de Tebex",
      upstreamStatus: Number.isFinite(upstream) ? upstream : null,
      detail: err?.message || "unknown",
    });
  }
};

const forzarActualizarCache = async (req, res) => {
  const server = tebex.getServerKey(req);
  try {
    await tebex.actualizarCacheDe(server);
    res.json({ ok: true, server, cacheado: new Date(tebex.cache[server].cacheAt * 1000).toISOString() });
  } catch (err) {
    res.status(500).json({ ok: false, server, error: String(err.message || err) });
  }
};

const obtenerDescripcionProducto = async (req, res) => {
  const server = tebex.getServerKey(req);
  const secret = tebex.STORE_PLUGIN_SECRET;
  const { id } = req.params;

  try {
    if (!secret) return res.status(500).json({ error: `Falta PLUGIN secret para ${server}` });

    const data = await tebex.tebexFetchPlugin(secret, `package/${id}`);
    if (tebex.ONLY_VISIBLE && tebex.isHiddenOrDisabled(data)) return res.status(404).json({ error: "Paquete no disponible." });

    const bustKey = tebex.cache?.[server]?.cacheAt || tebex.nowSec();
    const raw = pickPkgImageRaw(data);
    const image_url = raw ? withCacheBust(raw, bustKey) : "";

    res.json({
      server,
      currency: String(tebex.TEBEX_CURRENCY || "EUR").toUpperCase(),
      ...data,
      image_url_raw: raw,
      image_url,
      bust: bustKey,
    });
  } catch (err) {
    const code = err?.status >= 500 && err?.status < 600 ? 502 : 500;
    res.status(code).json({ error: "No se pudo obtener la descripcion." });
  }
};

const crearPedidoTebex = async (req, res) => {
  const rid = crypto.randomBytes(4).toString("hex");

  const body = req.body || {};
  const jugador = String(body.jugador || "").trim();
  const codigoDescuentoRaw = body.codigoDescuento ?? body.coupon ?? body.codigo_descuento ?? "";
  const coupon = String(codigoDescuentoRaw || "").trim();
  const uuidJugador = String(body.uuidJugador || body.uuid || "").trim();
  const server = String(body.server || "global").trim().toLowerCase();

  if (!jugador) return res.status(400).json({ ok: false, error: 'Falta "jugador".' });

  let basket = [];
  if (Array.isArray(body.items) && body.items.length) {
    basket = body.items.map((it) => ({ id: Number(it.id), quantity: Number(it.quantity || 1) }));
  } else if (body.productoId) {
    basket = [{ id: Number(body.productoId), quantity: 1 }];
  } else {
    return res.status(400).json({ ok: false, error: 'Faltan "items" o "productoId".' });
  }

  basket = basket.filter((it) => Number.isFinite(it.id) && it.id > 0 && Number.isFinite(it.quantity) && it.quantity > 0);
  if (!basket.length) return res.status(400).json({ ok: false, error: "Carrito invalido (ids/cantidades)." });

  try {
    const guard = await welcomePackService.assertBasketAllowed({ jugador, uuid: uuidJugador, basket });
    if (guard?.blocked) {
      return res.status(409).json({
        ok: false,
        code: "WELCOME_PACK_ALREADY_OWNED",
        error: "El Pack de Bienvenida ya fue comprado por esta cuenta.",
      });
    }
  } catch (guardError) {
    return res.status(500).json({
      ok: false,
      error: "No se pudo validar el Pack de Bienvenida.",
      detail: guardError?.message || "unknown",
    });
  }

  const token = String(tebex.WEBSTORE_TOKEN || "").trim();
  if (!token) return res.status(500).json({ ok: false, error: "Falta TEBEX_WEBSTORE_TOKEN (webstore identifier)." });

  const ipv4 = tebex.getClientIPv4(req);
  tebex.tlog(rid, "checkout req:", { jugador, coupon, items: basket, ipv4 });

  async function fetchJson(url, options = {}) {
    const BASIC = tebex.getHeadlessBasic();

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);

    try {
      const r = await fetch(url, {
        ...options,
        signal: ctrl.signal,
        headers: {
          "User-Agent": "FlanCraftStore/1.0",
          Accept: "application/json",
          Authorization: `Basic ${BASIC}`,
          ...(options.headers || {}),
        },
      });

      const text = await r.text().catch(() => "");
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }

      tebex.tlog(rid, "HTTP", r.status, url, data || text?.slice(0, 200));

      if (!r.ok) {
        const err = new Error(`HTTP ${r.status} ${r.statusText}`);
        err.status = r.status;
        err.data = data;
        err.raw = (text || "").slice(0, 800);
        throw err;
      }

      return data;
    } finally {
      clearTimeout(t);
    }
  }

  try {
    const createBasketUrl = `https://headless.tebex.io/api/accounts/${encodeURIComponent(token)}/baskets`;

    const createBody = {
      complete_url: "https://flancraft.com/tienda?gracias=true",
      cancel_url: "https://flancraft.com/tienda",
      complete_auto_redirect: true,
      username: jugador,
      ...(ipv4 ? { ip_address: ipv4 } : {}),
      custom: welcomePackService.buildCheckoutCustom({ jugador, uuid: uuidJugador, basket, server }),
    };

    const created = await fetchJson(createBasketUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createBody),
    });

    const ident = created?.data?.ident;
    const username_id = created?.data?.username_id;

    if (!ident) {
      return res.status(502).json({ ok: false, error: "No se pudo crear el basket (sin ident).", detail: created || null });
    }

    for (const it of basket) {
      const addUrl = `https://headless.tebex.io/api/baskets/${encodeURIComponent(ident)}/packages`;

      await fetchJson(addUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          package_id: it.id,
          quantity: it.quantity,
          ...(username_id ? { variable_data: { username_id } } : {}),
        }),
      });
    }

    if (coupon) {
      const couponUrl = `https://headless.tebex.io/api/accounts/${encodeURIComponent(token)}/baskets/${encodeURIComponent(ident)}/coupons`;

      try {
        await fetchJson(couponUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ coupon_code: coupon }),
        });
      } catch (e) {
        const status = e?.status || 500;
        if (status === 422 || status === 400) {
          return res.status(400).json({
            ok: false,
            error: "Codigo de descuento invalido o no aplicable.",
            detail: e?.data || e?.raw || e?.message,
          });
        }
        throw e;
      }
    }

    const getBasketUrl = `https://headless.tebex.io/api/accounts/${encodeURIComponent(token)}/baskets/${encodeURIComponent(ident)}`;
    const finalBasket = await fetchJson(getBasketUrl, { method: "GET" });

    const checkoutUrl = finalBasket?.data?.links?.checkout || created?.data?.links?.checkout;
    if (!checkoutUrl) {
      return res.status(502).json({
        ok: false,
        error: "Basket creado, pero no se encontro links.checkout.",
        detail: finalBasket?.data?.links || created?.data?.links || null,
      });
    }

    return res.json({ ok: true, ident, url: checkoutUrl });
  } catch (err) {
    const data = err?.data || null;
    const title = String(data?.title || "").toLowerCase();

    if (err?.status === 400 && title.includes("unable to verify your username")) {
      return res.status(400).json({
        ok: false,
        error: "Tebex no puede verificar ese nombre como cuenta valida para esta tienda. Usa un username premium o cambia el proyecto a Universal Store.",
        detail: data,
      });
    }

    const upstreamStatus = err?.status;
    const status = upstreamStatus >= 400 && upstreamStatus < 600 ? upstreamStatus : 500;

    return res.status(status).json({
      ok: false,
      error: "No se pudo generar el checkout.",
      status,
      detail: err?.data || err?.raw || err?.message || "unknown",
    });
  }
};

const obtenerSidebarRaw = async (req, res) => {
  try {
    const refresh = String(req.query.refresh || "").trim().toLowerCase();
    const force = refresh === "1" || refresh === "true";

    const c = tebex.headlessCache.sidebarRaw;
    if (!force && c.cacheAt && !tebex.isExpired(c) && c.data) {
      return res.json({ ok: true, ...c.data, cacheado: new Date(c.cacheAt * 1000).toISOString() });
    }

    const sidebar = await tebex.getSidebarModulesCached(force);
    const arr = tebex.sidebarArray(sidebar);

    const modules = arr.map((m) => {
      const data = m?.data || {};
      return { id: m?.id ?? null, type: m?.type ?? null, dataKeys: Object.keys(data), data };
    });

    const payload = { modules };
    tebex.headlessCache.sidebarRaw = { data: payload, cacheAt: tebex.nowSec() };

    return res.json({ ok: true, ...payload, cacheado: new Date(tebex.headlessCache.sidebarRaw.cacheAt * 1000).toISOString() });
  } catch (e) {
    return res.status(500).json({ ok: false, error: "No se pudo obtener sidebar raw", detail: e?.message || "unknown" });
  }
};

const obtenerTopDonator = async (req, res) => {
  try {
    const refresh = String(req.query.refresh || "").trim().toLowerCase();
    const force = refresh === "1" || refresh === "true";
    const server = String(req.query.server || "global").trim().toLowerCase() || "global";

    try {
      const ranking = await tebexPaymentsService.getMonthlyTopDonators({
        server,
        limit: 1,
        force,
      });

      if (Array.isArray(ranking?.items) && ranking.items.length) {
        const first = ranking.items[0];
        return res.json({
          ok: true,
          username: first.username,
          uuid: first.uuid,
          amount: first.amount,
          currency: first.currency,
          periodLabel: `TOP DONADOR · ${String(ranking.periodLabel || "Mes actual").toUpperCase()}`,
          serverLabel: String(server || "global").toUpperCase(),
          cacheado: new Date().toISOString(),
        });
      }
    } catch {}

    const c = tebex.headlessCache.topDonator;
    if (!force && c.cacheAt && !tebex.isExpired(c) && c.data) {
      return res.json({ ok: true, ...c.data, cacheado: new Date(c.cacheAt * 1000).toISOString() });
    }

    const sidebar = await tebex.getSidebarModulesCached(force);
    const modTop = tebex.pickTopCustomerModule(sidebar);
    const top = modTop ? tebex.normalizeTopDonatorFromModule(modTop) : null;

    const payload =
      top || {
        username: "Guest",
        uuid: "",
        amount: null,
        currency: tebex.TEBEX_CURRENCY,
        periodLabel: "TOP DONATOR",
        serverLabel: "GLOBAL",
      };

    tebex.headlessCache.topDonator = { data: payload, cacheAt: tebex.nowSec() };
    return res.json({
      ok: true,
      ...payload,
      cacheado: new Date(tebex.headlessCache.topDonator.cacheAt * 1000).toISOString(),
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: "No se pudo obtener el Top Donator.",
      detail: e?.message || "unknown",
    });
  }
};

const obtenerTopDonators = async (req, res) => {
  try {
    const refresh = String(req.query.refresh || "").trim().toLowerCase();
    const force = refresh === "1" || refresh === "true";
    const server = String(req.query.server || "global").trim().toLowerCase() || "global";
    const limit = Math.max(1, Math.min(10, Number(req.query.limit || 3)));

    try {
      const ranking = await tebexPaymentsService.getMonthlyTopDonators({
        server,
        limit,
        force,
      });

      if (Array.isArray(ranking?.items) && ranking.items.length) {
        return res.json({
          ok: true,
          source: "database",
          ...ranking,
        });
      }
    } catch {}

    const fallback = await buildSidebarFallbackTop({ force, server, limit });
    return res.json(fallback);
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: "No se pudo obtener el Top Donators.",
      detail: e?.message || "unknown",
    });
  }
};

const obtenerPagosRecientes = async (req, res) => {
  try {
    const refresh = String(req.query.refresh || "").trim().toLowerCase();
    const force = refresh === "1" || refresh === "true";

    const c = tebex.headlessCache.recentPayments;
    if (!force && c.cacheAt && !tebex.isExpired(c) && c.data) {
      return res.json({ ok: true, payments: c.data, cacheado: new Date(c.cacheAt * 1000).toISOString() });
    }

    const sidebar = await tebex.getSidebarModulesCached(force);
    const mod = tebex.pickPaymentsModule(sidebar);

    const payments = Array.isArray(mod?.data?.payments) ? mod.data.payments : [];
    tebex.headlessCache.recentPayments = { data: payments, cacheAt: tebex.nowSec() };

    return res.json({ ok: true, payments, cacheado: new Date(tebex.headlessCache.recentPayments.cacheAt * 1000).toISOString() });
  } catch (e) {
    return res.status(500).json({ ok: false, error: "No se pudieron obtener pagos recientes (Headless).", detail: e?.message || "unknown" });
  }
};

const obtenerBasketHeadless = async (req, res) => {
  const rid = crypto.randomBytes(4).toString("hex");

  try {
    const token = String(tebex.WEBSTORE_TOKEN || "").trim();
    if (!token) return res.status(500).json({ ok: false, error: "Falta TEBEX_WEBSTORE_TOKEN." });

    const ident = String(req.params.ident || "").trim();
    if (!ident) return res.status(400).json({ ok: false, error: "Falta basket ident." });

    const url = `https://headless.tebex.io/api/accounts/${encodeURIComponent(token)}/baskets/${encodeURIComponent(ident)}`;
    const data = await tebex.headlessFetchJson({ rid, url });

    return res.json({ ok: true, basket: data?.data || data });
  } catch (e) {
    return res.status(e?.status || 500).json({ ok: false, error: "No se pudo obtener el basket.", detail: e?.data || e?.raw || e?.message || "unknown" });
  }
};

const obtenerCheckoutStatus = async (req, res) => {
  const rid = crypto.randomBytes(4).toString("hex");

  try {
    const token = String(tebex.WEBSTORE_TOKEN || "").trim();
    if (!token) return res.status(500).json({ ok: false, error: "Falta TEBEX_WEBSTORE_TOKEN." });

    const ident = String(req.params.ident || "").trim();
    if (!ident) return res.status(400).json({ ok: false, error: "Falta basket ident." });

    const url = `https://headless.tebex.io/api/accounts/${encodeURIComponent(token)}/baskets/${encodeURIComponent(ident)}`;
    const data = await tebex.headlessFetchJson({ rid, url, method: "GET" });

    const b = data?.data || data || {};
    const links = b?.links || b?.data?.links || null;
    const paid = Boolean(links?.payment);

    return res.json({ ok: true, ident, paid, links });
  } catch (e) {
    return res.status(e?.status || 500).json({ ok: false, error: "No se pudo obtener el estado del checkout.", detail: e?.data || e?.raw || e?.message || "unknown" });
  }
};

const aplicarCodigoBasket = async (req, res) => {
  const rid = crypto.randomBytes(4).toString("hex");

  try {
    const token = String(tebex.WEBSTORE_TOKEN || "").trim();
    if (!token) return res.status(500).json({ ok: false, error: "Falta TEBEX_WEBSTORE_TOKEN." });

    const ident = String(req.params.ident || "").trim();
    if (!ident) return res.status(400).json({ ok: false, error: "Falta basket ident." });

    const tipo = String(req.body?.tipo || "").toLowerCase().trim();
    const codigo = String(req.body?.codigo || "").trim();

    if (!["creator", "coupon", "giftcard", "coupon_giftcard"].includes(tipo)) {
      return res.status(400).json({ ok: false, error: 'Tipo invalido. Usa "creator", "coupon", "giftcard" o "coupon_giftcard".' });
    }
    if (!codigo) return res.status(400).json({ ok: false, error: "Falta codigo." });

    const tryApply = async (path, body) => {
      const url = `https://headless.tebex.io/api/accounts/${encodeURIComponent(token)}/baskets/${encodeURIComponent(ident)}/${path}`;
      return tebex.headlessFetchJson({ rid, url, method: "POST", body });
    };

    let data = null;

    if (tipo === "creator") {
      data = await tryApply("creator-codes", { creator_code: codigo });
      return res.json({ ok: true, basket: data?.data || data, appliedAs: "creator" });
    }

    if (tipo === "coupon") {
      data = await tryApply("coupons", { coupon_code: codigo });
      return res.json({ ok: true, basket: data?.data || data, appliedAs: "coupon" });
    }

    if (tipo === "giftcard") {
      data = await tryApply("giftcards", { card_number: codigo });
      return res.json({ ok: true, basket: data?.data || data, appliedAs: "giftcard" });
    }

    try {
      data = await tryApply("coupons", { coupon_code: codigo });
      return res.json({ ok: true, basket: data?.data || data, appliedAs: "coupon" });
    } catch (e1) {
      const s1 = e1?.status || 500;
      if (s1 !== 400 && s1 !== 422) throw e1;

      try {
        data = await tryApply("giftcards", { card_number: codigo });
        return res.json({ ok: true, basket: data?.data || data, appliedAs: "giftcard" });
      } catch (e2) {
        const s2 = e2?.status || 500;
        if (s2 === 400 || s2 === 422) {
          return res.status(400).json({ ok: false, error: "Codigo invalido o no aplicable.", detail: e2?.data || e2?.raw || e2?.message || "unknown" });
        }
        throw e2;
      }
    }
  } catch (e) {
    const status = e?.status || 500;
    if (status === 422 || status === 400) {
      return res.status(400).json({ ok: false, error: "Codigo invalido o no aplicable.", detail: e?.data || e?.raw || e?.message || "unknown" });
    }
    return res.status(status).json({ ok: false, error: "No se pudo aplicar el codigo.", detail: e?.data || e?.raw || e?.message || "unknown" });
  }
};

const quitarCodigoBasket = async (req, res) => {
  const rid = crypto.randomBytes(4).toString("hex");

  try {
    const token = String(tebex.WEBSTORE_TOKEN || "").trim();
    if (!token) return res.status(500).json({ ok: false, error: "Falta TEBEX_WEBSTORE_TOKEN." });

    const ident = String(req.params.ident || "").trim();
    if (!ident) return res.status(400).json({ ok: false, error: "Falta basket ident." });

    const tipo = String(req.body?.tipo || "").toLowerCase().trim();
    const codigo = String(req.body?.codigo || "").trim();

    if (!["creator", "coupon", "giftcard"].includes(tipo)) {
      return res.status(400).json({ ok: false, error: 'Tipo invalido. Usa "creator", "coupon" o "giftcard".' });
    }

    let path = "";
    let body = null;

    if (tipo === "creator") {
      path = "creator-codes/remove";
    } else if (tipo === "coupon") {
      path = "coupons/remove";
    } else {
      path = "giftcards/remove";
      if (!codigo) return res.status(400).json({ ok: false, error: "Para quitar giftcard hace falta el card_number." });
      body = { card_number: codigo };
    }

    const url = `https://headless.tebex.io/api/accounts/${encodeURIComponent(token)}/baskets/${encodeURIComponent(ident)}/${path}`;

    await tebex.headlessFetchJson({ rid, url, method: "POST", body });
    return res.json({ ok: true });
  } catch (e) {
    return res.status(e?.status || 500).json({ ok: false, error: "No se pudo quitar el codigo.", detail: e?.data || e?.raw || e?.message || "unknown" });
  }
};

const agregarPaqueteBasket = async (req, res) => {
  const rid = crypto.randomBytes(4).toString("hex");

  try {
    const token = String(tebex.WEBSTORE_TOKEN || "").trim();
    if (!token) return res.status(500).json({ ok: false, error: "Falta TEBEX_WEBSTORE_TOKEN." });

    const ident = String(req.params.ident || "").trim();
    if (!ident) return res.status(400).json({ ok: false, error: "Falta basket ident." });

    const package_id = Number(req.body?.package_id);
    const quantity = Number(req.body?.quantity || 1);

    if (!Number.isFinite(package_id) || package_id <= 0) return res.status(400).json({ ok: false, error: "package_id invalido." });
    if (!Number.isFinite(quantity) || quantity <= 0) return res.status(400).json({ ok: false, error: "quantity invalida." });

    const getUrl = `https://headless.tebex.io/api/accounts/${encodeURIComponent(token)}/baskets/${encodeURIComponent(ident)}`;
    const basketRes = await tebex.headlessFetchJson({ rid, url: getUrl, method: "GET" });
    const b = basketRes?.data || basketRes;
    const username_id = b?.username_id || null;

    const addUrl = `https://headless.tebex.io/api/baskets/${encodeURIComponent(ident)}/packages`;

    const data = await tebex.headlessFetchJson({
      rid,
      url: addUrl,
      method: "POST",
      body: { package_id, quantity, ...(username_id ? { variable_data: { username_id } } : {}) },
    });

    return res.json({ ok: true, basket: data?.data || data });
  } catch (e) {
    const status = e?.status || 500;
    return res.status(status).json({ ok: false, error: "No se pudo añadir el paquete al basket.", detail: e?.data || e?.raw || e?.message || "unknown" });
  }
};

const obtenerRecomendaciones = async (req, res) => {
  const server = tebex.getServerKey(req);
  const count = Math.max(1, Math.min(6, Number(req.query.count || 3)));
  const exclude = String(req.query.exclude || "")
    .split(",")
    .map((x) => Number(x))
    .filter((n) => Number.isFinite(n) && n > 0);

  try {
    const c = tebex.cache[server];
    if (!c?.cacheAt || tebex.isExpired(c)) await tebex.actualizarCacheDe(server);

    const bustKey = tebex.cache?.[server]?.cacheAt || tebex.nowSec();

    const list = (tebex.cache[server].paquetes || [])
      .filter((p) => p && !exclude.includes(Number(p.id ?? p.package_id)))
      .map((p) => {
        const id = Number(p.id ?? p.package_id);
        const name = String(p.name || "").trim();
        const price = typeof p.price === "number" && Number.isFinite(p.price) ? p.price : null;

        const raw = pickPkgImageRaw(p);
        const image = raw ? withCacheBust(raw, bustKey) : "";

        return {
          id,
          name,
          price,
          currency: String(p.currency || tebex.TEBEX_CURRENCY || "EUR").toUpperCase(),
          image,
          image_raw: raw,
        };
      })
      .filter((p) => p.id && p.name);

    list.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    return res.json({ ok: true, server, items: list.slice(0, count), bust: bustKey });
  } catch (e) {
    return res.status(500).json({ ok: false, error: "No se pudieron obtener recomendaciones", detail: e?.message || "unknown" });
  }
};

const obtenerEstadoPackBienvenida = async (req, res) => {
  try {
    const jugador = String(req.query?.jugador || req.query?.nombreJugador || "").trim();
    const uuid = String(req.query?.uuid || req.query?.uuidJugador || "").trim();
    const refresh = String(req.query?.refresh || "").trim().toLowerCase();

    const status = await welcomePackService.getWelcomePackStatus({
      jugador,
      uuid,
      refresh: refresh === "1" || refresh === "true",
    });

    return res.json({ ok: true, ...status });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: "No se pudo obtener el estado del Pack de Bienvenida.",
      detail: e?.message || "unknown",
    });
  }
};

const webhookPing = (_req, res) => {
  res.status(200).send("ok");
};

const webhookHandler = async (req, res) => {
  try {
    if (!tebex.WEBHOOK_SECRET) {
      return res.status(500).json({ ok: false, error: "Falta TEBEX_WEBHOOK_SECRET" });
    }

    const signature = req.get("X-Signature") || req.get("x-signature") || "";
    const raw = req.rawBody;

    if (!raw || !Buffer.isBuffer(raw)) {
      return res.status(400).json({ ok: false, error: "Missing raw body" });
    }

    const bodyHash = tebex.sha256Hex(raw);
    const expected = tebex.hmacSha256Hex(tebex.WEBHOOK_SECRET, bodyHash);

    if (!tebex.timingSafeEqualHex(expected, signature)) {
      return res.status(401).json({ ok: false, error: "Invalid signature" });
    }

    const evt = JSON.parse(raw.toString("utf8") || "{}");

    if (evt?.type === "validation.webhook") {
      return res.status(200).json({ id: evt.id });
    }

    await welcomePackService.handleWelcomePackWebhook(evt);
    await tebexPaymentsService.persistPaymentFromWebhook(evt);

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: "Webhook error",
      detail: e?.message || "unknown",
    });
  }
};

module.exports = {
  obtenerFx,
  obtenerDatosTienda,
  forzarActualizarCache,
  obtenerDescripcionProducto,
  crearPedidoTebex,
  obtenerSaleActiva,
  obtenerSidebarRaw,
  obtenerTopDonator,
  obtenerTopDonators,
  obtenerPagosRecientes,
  obtenerBasketHeadless,
  obtenerCheckoutStatus,
  aplicarCodigoBasket,
  quitarCodigoBasket,
  agregarPaqueteBasket,
  obtenerRecomendaciones,
  obtenerEstadoPackBienvenida,
  webhookPing,
  webhookHandler,
  health,
};