"use strict";

const crypto = require("crypto");
const {
  ONLY_VISIBLE,
  APPLY_SALES,
  WEBSTORE_TOKEN,
  TEBEX_CURRENCY,
  WEBHOOK_SECRET,
  STORE_SECRET,
  SERVER_KEYS,
  cache,
  salesCache,
  headlessCache,
  nowSec,
  isExpired,
  tlog,
  getClientIPv4,
  sha256Hex,
  hmacSha256Hex,
  timingSafeEqualHex,
  getServerKey,
  normalizarPaquetes,
  isHiddenOrDisabled,
  tebexFetchPlugin,
  actualizarCacheDe,
  getSidebarModulesCached,
  sidebarArray,
  pickTopCustomerModule,
  pickPaymentsModule,
  normalizeTopDonatorFromModule,
  getBestSaleForServer,
  getBestSaleGlobal,
  applySalesToPackages,
  headlessFetchJson,
  getHeadlessBasic,
} = require("./tebex.helpers");

/* =========================================================
   ✅ Helpers cache-bust imagen
   ========================================================= */
function withCacheBust(url, bust) {
  const u = String(url || "").trim();
  if (!u) return "";
  const sep = u.includes("?") ? "&" : "?";
  return `${u}${sep}v=${encodeURIComponent(String(bust || ""))}`;
}

function pickPkgImageRaw(p) {
  return (
    p?.image_url ||
    p?.image ||
    p?.imageUrl ||
    p?.imageUrlLarge ||
    p?.img ||
    ""
  );
}

function applyImageBustToPackages(paquetes = [], bustKey) {
  const bust = String(bustKey || "");
  return (Array.isArray(paquetes) ? paquetes : []).map((p) => {
    const raw = pickPkgImageRaw(p);
    if (!raw) return p;
    return {
      ...p,
      image_url_raw: raw,
      image_url: withCacheBust(raw, bust),
    };
  });
}

/** ========= Health y estado general ========= **/
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
        scope: "server",
        server,
        active: Boolean(best),
        sale: best ? { ...best, server } : null,
        cacheado: salesCache[server]?.cacheAt
          ? new Date(salesCache[server].cacheAt * 1000).toISOString()
          : null,
      });
    }

    const bestGlobal = await getBestSaleGlobal();
    return res.json({
      ok: true,
      scope: "all",
      active: Boolean(bestGlobal),
      sale: bestGlobal || null,
      cacheado: salesCache.all?.cacheAt
        ? new Date(salesCache.all.cacheAt * 1000).toISOString()
        : null,
    });
  } catch {
    return res.status(500).json({
      ok: false,
      active: false,
      sale: null,
      error: "No se pudo obtener la sale activa",
    });
  }
};

/** ========= Tienda: paquetes + categorías ========= **/
const obtenerDatosTienda = async (req, res) => {
  const server = getServerKey(req);
  const c = cache[server];

  // ✅ permite forzar refresh: /api/tebex/datos?sv=oneblock&refresh=1
  const force =
    String(req.query.refresh || "").trim() === "1" ||
    String(req.query.refresh || "").toLowerCase() === "true";

  try {
    if (force) {
      console.log(`Forzando cache refresh por query para [${server}]`);
      await actualizarCacheDe(server);
    } else if (!c.cacheAt || isExpired(c)) {
      console.log(`Cache vacia/expirada para [${server}], actualizando.`);
      await actualizarCacheDe(server);
    }

    const ready = cache[server];
    const bustKey = ready.cacheAt || nowSec();

    const paquetesBusted = applyImageBustToPackages(ready.paquetes, bustKey);

    return res.json({
      ok: true,
      server,
      categorias: ready.categorias,
      paquetes: paquetesBusted,
      cacheado: new Date(ready.cacheAt * 1000).toISOString(),
      bust: bustKey,
    });
  } catch (err) {
    console.error(
      "Error al obtener datos de tienda:",
      `[server=${server}]`,
      err?.status || "",
      err?.message || err
    );

    // ✅ Si Tebex falla, es un "bad gateway" (no un 500 genérico)
    const upstream = Number(err?.status);
    const status =
      Number.isFinite(upstream) && upstream >= 400 && upstream < 600
        ? 502
        : 500;

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
  const server = getServerKey(req);
  try {
    console.log(`Forzando actualizacion de cache [${server}].`);
    await actualizarCacheDe(server);
    res.json({
      ok: true,
      server,
      cacheado: new Date(cache[server].cacheAt * 1000).toISOString(),
    });
  } catch (err) {
    console.error("Error al cachear productos:", err);
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
    if (ONLY_VISIBLE && isHiddenOrDisabled(data))
      return res.status(404).json({ error: "Paquete no disponible." });

    const bustKey = cache?.[server]?.cacheAt || nowSec();
    const raw = pickPkgImageRaw(data);
    const image_url = raw ? withCacheBust(raw, bustKey) : "";

    res.json({
      server,
      ...data,
      image_url_raw: raw,
      image_url,
      bust: bustKey,
    });
  } catch (err) {
    console.error(
      "[Tebex /package] Error",
      `[server=${server}]`,
      err?.status || "",
      err?.message || err
    );
    const code = err?.status >= 500 && err?.status < 600 ? 502 : 500;
    res.status(code).json({ error: "No se pudo obtener la descripcion." });
  }
};

/** ========= Checkout (Headless) ========= **/
const crearPedidoTebex = async (req, res) => {
  const rid = crypto.randomBytes(4).toString("hex");

  const body = req.body || {};
  const jugador = String(body.jugador || "").trim();
  const codigoDescuentoRaw =
    body.codigoDescuento ?? body.coupon ?? body.codigo_descuento ?? "";
  const coupon = String(codigoDescuentoRaw || "").trim();

  if (!jugador)
    return res.status(400).json({ ok: false, error: 'Falta "jugador".' });

  let basket = [];
  if (Array.isArray(body.items) && body.items.length) {
    basket = body.items.map((it) => ({
      id: Number(it.id),
      quantity: Number(it.quantity || 1),
    }));
  } else if (body.productoId) {
    basket = [{ id: Number(body.productoId), quantity: 1 }];
  } else {
    return res
      .status(400)
      .json({ ok: false, error: 'Faltan "items" o "productoId".' });
  }

  basket = basket.filter(
    (it) =>
      Number.isFinite(it.id) &&
      it.id > 0 &&
      Number.isFinite(it.quantity) &&
      it.quantity > 0
  );
  if (!basket.length) {
    return res
      .status(400)
      .json({ ok: false, error: "Carrito invalido (ids/cantidades)." });
  }

  const token = String(WEBSTORE_TOKEN || "").trim();
  if (!token) {
    return res.status(500).json({
      ok: false,
      error: "Falta TEBEX_WEBSTORE_TOKEN (webstore identifier).",
    });
  }

  const ipv4 = getClientIPv4(req);
  tlog(rid, "checkout req:", { jugador, coupon, items: basket, ipv4 });

  async function fetchJson(url, options = {}) {
    const BASIC = getHeadlessBasic();

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

      tlog(rid, "HTTP", r.status, url, data || text?.slice(0, 200));

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
    const createBasketUrl = `https://headless.tebex.io/api/accounts/${encodeURIComponent(
      token
    )}/baskets`;

    const createBody = {
      complete_url: "https://flancraft.com/tienda?gracias=true",
      cancel_url: "https://flancraft.com/tienda",
      complete_auto_redirect: true,
      username: jugador,
      ...(ipv4 ? { ip_address: ipv4 } : {}),
      custom: {
        mc_username: jugador,
        source: "flancraft-web",
        ts: Date.now(),
      },
    };

    const created = await fetchJson(createBasketUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createBody),
    });

    const ident = created?.data?.ident;
    const username_id = created?.data?.username_id;

    if (!ident) {
      return res.status(502).json({
        ok: false,
        error: "No se pudo crear el basket (sin ident).",
        detail: created || null,
      });
    }

    tlog(rid, "basket created:", { ident, username_id });

    for (const it of basket) {
      const addUrl = `https://headless.tebex.io/api/baskets/${encodeURIComponent(
        ident
      )}/packages`;

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
      const couponUrl = `https://headless.tebex.io/api/accounts/${encodeURIComponent(
        token
      )}/baskets/${encodeURIComponent(ident)}/coupons`;

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

    const getBasketUrl = `https://headless.tebex.io/api/accounts/${encodeURIComponent(
      token
    )}/baskets/${encodeURIComponent(ident)}`;

    const finalBasket = await fetchJson(getBasketUrl, { method: "GET" });
    const checkoutUrl =
      finalBasket?.data?.links?.checkout || created?.data?.links?.checkout;

    if (!checkoutUrl) {
      return res.status(502).json({
        ok: false,
        error: "Basket creado, pero no se encontro links.checkout.",
        detail: finalBasket?.data?.links || created?.data?.links || null,
      });
    }

    tlog(rid, "checkout url:", checkoutUrl);
    return res.json({ ok: true, ident, url: checkoutUrl });
  } catch (err) {
    const data = err?.data || null;
    const title = String(data?.title || "").toLowerCase();

    if (
      err?.status === 400 &&
      title.includes("unable to verify your username")
    ) {
      return res.status(400).json({
        ok: false,
        error:
          "Tebex no puede verificar ese nombre como cuenta valida para esta tienda. Usa un username premium o cambia el proyecto a Universal Store.",
        detail: data,
      });
    }

    console.error(
      `[TEBEX][${rid}] Checkout error`,
      err?.status || "",
      err?.message || err,
      err?.data || err?.raw || ""
    );

    const upstreamStatus = err?.status;
    const status =
      upstreamStatus >= 400 && upstreamStatus < 600 ? upstreamStatus : 500;

    return res.status(status).json({
      ok: false,
      error: "No se pudo generar el checkout.",
      status,
      detail: err?.data || err?.raw || err?.message || "unknown",
    });
  }
};

/** ========= Sidebar RAW (debug) ========= **/
const obtenerSidebarRaw = async (req, res) => {
  try {
    const force = String(req.query.refresh || "").toLowerCase() === "1";

    const c = headlessCache.sidebarRaw;
    if (!force && c.cacheAt && !isExpired(c) && c.data) {
      return res.json({
        ok: true,
        ...c.data,
        cacheado: new Date(c.cacheAt * 1000).toISOString(),
      });
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

    return res.json({
      ok: true,
      ...payload,
      cacheado: new Date(headlessCache.sidebarRaw.cacheAt * 1000).toISOString(),
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: "No se pudo obtener sidebar raw",
      detail: e?.message || "unknown",
    });
  }
};

/** ========= Top Donator ========= **/
const obtenerTopDonator = async (req, res) => {
  try {
    const force = String(req.query.refresh || "").toLowerCase() === "1";

    const c = headlessCache.topDonator;
    if (!force && c.cacheAt && !isExpired(c) && c.data) {
      return res.json({
        ok: true,
        ...c.data,
        cacheado: new Date(c.cacheAt * 1000).toISOString(),
      });
    }

    const sidebar = await getSidebarModulesCached(force);
    const modTop = pickTopCustomerModule(sidebar);
    const top = modTop ? normalizeTopDonatorFromModule(modTop) : null;

    const payload =
      top || {
        username: "Guest",
        uuid: "",
        amount: null,
        currency: TEBEX_CURRENCY,
        periodLabel: "TOP DONATOR",
        serverLabel: "GLOBAL",
      };

    headlessCache.topDonator = { data: payload, cacheAt: nowSec() };

    return res.json({
      ok: true,
      ...payload,
      cacheado: new Date(headlessCache.topDonator.cacheAt * 1000).toISOString(),
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: "No se pudo obtener el Top Donator (Headless).",
      detail: e?.message || "unknown",
    });
  }
};

/** ========= Pagos recientes ========= **/
const obtenerPagosRecientes = async (req, res) => {
  try {
    const force = String(req.query.refresh || "").toLowerCase() === "1";

    const c = headlessCache.recentPayments;
    if (!force && c.cacheAt && !isExpired(c) && c.data) {
      return res.json({
        ok: true,
        payments: c.data,
        cacheado: new Date(c.cacheAt * 1000).toISOString(),
      });
    }

    const sidebar = await getSidebarModulesCached(force);
    const mod = pickPaymentsModule(sidebar);

    const payments = Array.isArray(mod?.data?.payments) ? mod.data.payments : [];

    headlessCache.recentPayments = { data: payments, cacheAt: nowSec() };

    return res.json({
      ok: true,
      payments,
      cacheado: new Date(headlessCache.recentPayments.cacheAt * 1000).toISOString(),
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: "No se pudieron obtener pagos recientes (Headless).",
      detail: e?.message || "unknown",
    });
  }
};

/** ========= Basket: obtener ========= **/
const obtenerBasketHeadless = async (req, res) => {
  const rid = crypto.randomBytes(4).toString("hex");
  try {
    const token = String(WEBSTORE_TOKEN || "").trim();
    if (!token)
      return res.status(500).json({ ok: false, error: "Falta TEBEX_WEBSTORE_TOKEN." });

    const ident = String(req.params.ident || "").trim();
    if (!ident) return res.status(400).json({ ok: false, error: "Falta basket ident." });

    const url = `https://headless.tebex.io/api/accounts/${encodeURIComponent(
      token
    )}/baskets/${encodeURIComponent(ident)}`;

    const data = await headlessFetchJson({ rid, url });
    return res.json({ ok: true, basket: data?.data || data });
  } catch (e) {
    return res.status(e?.status || 500).json({
      ok: false,
      error: "No se pudo obtener el basket.",
      detail: e?.data || e?.raw || e?.message || "unknown",
    });
  }
};

/** ========= Checkout status ========= **/
const obtenerCheckoutStatus = async (req, res) => {
  const rid = crypto.randomBytes(4).toString("hex");

  try {
    const token = String(WEBSTORE_TOKEN || "").trim();
    if (!token)
      return res.status(500).json({ ok: false, error: "Falta TEBEX_WEBSTORE_TOKEN." });

    const ident = String(req.params.ident || "").trim();
    if (!ident) return res.status(400).json({ ok: false, error: "Falta basket ident." });

    const url = `https://headless.tebex.io/api/accounts/${encodeURIComponent(
      token
    )}/baskets/${encodeURIComponent(ident)}`;

    const data = await headlessFetchJson({ rid, url, method: "GET" });

    const b = data?.data || data || {};
    const links = b?.links || b?.data?.links || null;
    const paid = Boolean(links?.payment);

    return res.json({ ok: true, ident, paid, links });
  } catch (e) {
    return res.status(e?.status || 500).json({
      ok: false,
      error: "No se pudo obtener el estado del checkout.",
      detail: e?.data || e?.raw || e?.message || "unknown",
    });
  }
};

/** ========= Basket: aplicar códigos ========= **/
const aplicarCodigoBasket = async (req, res) => {
  const rid = crypto.randomBytes(4).toString("hex");

  try {
    const token = String(WEBSTORE_TOKEN || "").trim();
    if (!token)
      return res.status(500).json({ ok: false, error: "Falta TEBEX_WEBSTORE_TOKEN." });

    const ident = String(req.params.ident || "").trim();
    if (!ident) return res.status(400).json({ ok: false, error: "Falta basket ident." });

    const tipo = String(req.body?.tipo || "").toLowerCase().trim();
    const codigo = String(req.body?.codigo || "").trim();

    if (!["creator", "coupon", "giftcard", "coupon_giftcard"].includes(tipo)) {
      return res.status(400).json({
        ok: false,
        error: 'Tipo invalido. Usa "creator", "coupon", "giftcard" o "coupon_giftcard".',
      });
    }
    if (!codigo) return res.status(400).json({ ok: false, error: "Falta codigo." });

    const tryApply = async (path, body) => {
      const url = `https://headless.tebex.io/api/accounts/${encodeURIComponent(
        token
      )}/baskets/${encodeURIComponent(ident)}/${path}`;
      return headlessFetchJson({ rid, url, method: "POST", body });
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
          return res.status(400).json({
            ok: false,
            error: "Codigo invalido o no aplicable.",
            detail: e2?.data || e2?.raw || e2?.message || "unknown",
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
        error: "Codigo invalido o no aplicable.",
        detail: e?.data || e?.raw || e?.message || "unknown",
      });
    }
    return res.status(status).json({
      ok: false,
      error: "No se pudo aplicar el codigo.",
      detail: e?.data || e?.raw || e?.message || "unknown",
    });
  }
};

/** ========= Basket: quitar códigos ========= **/
const quitarCodigoBasket = async (req, res) => {
  const rid = crypto.randomBytes(4).toString("hex");

  try {
    const token = String(WEBSTORE_TOKEN || "").trim();
    if (!token)
      return res.status(500).json({ ok: false, error: "Falta TEBEX_WEBSTORE_TOKEN." });

    const ident = String(req.params.ident || "").trim();
    if (!ident) return res.status(400).json({ ok: false, error: "Falta basket ident." });

    const tipo = String(req.body?.tipo || "").toLowerCase().trim();
    const codigo = String(req.body?.codigo || "").trim();

    if (!["creator", "coupon", "giftcard"].includes(tipo)) {
      return res.status(400).json({
        ok: false,
        error: 'Tipo invalido. Usa "creator", "coupon" o "giftcard".',
      });
    }

    let path = "";
    let body = null;

    if (tipo === "creator") {
      path = "creator-codes/remove";
    } else if (tipo === "coupon") {
      path = "coupons/remove";
    } else if (tipo === "giftcard") {
      path = "giftcards/remove";
      if (!codigo)
        return res.status(400).json({
          ok: false,
          error: "Para quitar giftcard hace falta el card_number.",
        });
      body = { card_number: codigo };
    }

    const url = `https://headless.tebex.io/api/accounts/${encodeURIComponent(
      token
    )}/baskets/${encodeURIComponent(ident)}/${path}`;

    await headlessFetchJson({ rid, url, method: "POST", body });
    return res.json({ ok: true });
  } catch (e) {
    return res.status(e?.status || 500).json({
      ok: false,
      error: "No se pudo quitar el codigo.",
      detail: e?.data || e?.raw || e?.message || "unknown",
    });
  }
};

/** ========= Basket: añadir paquete ========= **/
const agregarPaqueteBasket = async (req, res) => {
  const rid = crypto.randomBytes(4).toString("hex");

  try {
    const token = String(WEBSTORE_TOKEN || "").trim();
    if (!token)
      return res.status(500).json({ ok: false, error: "Falta TEBEX_WEBSTORE_TOKEN." });

    const ident = String(req.params.ident || "").trim();
    if (!ident) return res.status(400).json({ ok: false, error: "Falta basket ident." });

    const package_id = Number(req.body?.package_id);
    const quantity = Number(req.body?.quantity || 1);

    if (!Number.isFinite(package_id) || package_id <= 0) {
      return res.status(400).json({ ok: false, error: "package_id invalido." });
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return res.status(400).json({ ok: false, error: "quantity invalida." });
    }

    const getUrl = `https://headless.tebex.io/api/accounts/${encodeURIComponent(
      token
    )}/baskets/${encodeURIComponent(ident)}`;

    const basketRes = await headlessFetchJson({ rid, url: getUrl, method: "GET" });
    const b = basketRes?.data || basketRes;
    const username_id = b?.username_id || null;

    const addUrl = `https://headless.tebex.io/api/baskets/${encodeURIComponent(
      ident
    )}/packages`;

    const data = await headlessFetchJson({
      rid,
      url: addUrl,
      method: "POST",
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
      error: "No se pudo añadir el paquete al basket.",
      detail: e?.data || e?.raw || e?.message || "unknown",
    });
  }
};

/** ========= Recomendaciones (You might like) ========= **/
const obtenerRecomendaciones = async (req, res) => {
  const server = getServerKey(req);
  const count = Math.max(1, Math.min(6, Number(req.query.count || 3)));
  const exclude = String(req.query.exclude || "")
    .split(",")
    .map((x) => Number(x))
    .filter((n) => Number.isFinite(n) && n > 0);

  try {
    const c = cache[server];
    if (!c.cacheAt || isExpired(c)) {
      await actualizarCacheDe(server);
    }

    const bustKey = cache?.[server]?.cacheAt || nowSec();

    const list = (cache[server].paquetes || [])
      .filter((p) => p && !exclude.includes(Number(p.id ?? p.package_id)))
      .map((p) => {
        const id = Number(p.id ?? p.package_id);
        const name = String(p.name || "").trim();
        const price = Number(p.price);

        const raw = pickPkgImageRaw(p);
        const image = raw ? withCacheBust(raw, bustKey) : "";

        return {
          id,
          name,
          price: Number.isFinite(price) ? price : null,
          currency: String(p.currency || TEBEX_CURRENCY || "EUR").toUpperCase(),
          image,
          image_raw: raw,
        };
      })
      .filter((p) => p.id && p.name);

    list.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    return res.json({ ok: true, server, items: list.slice(0, count), bust: bustKey });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: "No se pudieron obtener recomendaciones",
      detail: e?.message || "unknown",
    });
  }
};

/** ========= Webhook Tebex ========= **/
const webhookPing = (_req, res) => {
  res.status(200).send("ok");
};

const webhookHandler = async (req, res) => {
  try {
    if (!WEBHOOK_SECRET) {
      return res.status(500).json({ ok: false, error: "Falta TEBEX_WEBHOOK_SECRET" });
    }

    const signature = req.get("X-Signature") || req.get("x-signature") || "";
    const raw = req.rawBody;
    if (!raw || !Buffer.isBuffer(raw))
      return res.status(400).json({ ok: false, error: "Missing raw body" });

    const bodyHash = sha256Hex(raw);
    const expected = hmacSha256Hex(WEBHOOK_SECRET, bodyHash);

    if (!timingSafeEqualHex(expected, signature)) {
      return res.status(401).json({ ok: false, error: "Invalid signature" });
    }

    const evt = JSON.parse(raw.toString("utf8") || "{}");

    if (evt?.type === "validation.webhook") {
      return res.status(200).json({ id: evt.id });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: "Webhook error",
      detail: e?.message || "unknown",
    });
  }
};

/** ========= Exports ========= **/
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
  obtenerCheckoutStatus,
  aplicarCodigoBasket,
  quitarCodigoBasket,
  agregarPaqueteBasket,
  obtenerRecomendaciones,

  webhookPing,
  webhookHandler,
  health,
};