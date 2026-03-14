"use strict";

const db = require("../models/db");
const tebex = require("./tebex.helpers");

const DEFAULT_WELCOME_NAMES = [
  "Pack de Bienvenida",
  "Pack Bienvenida",
  "Bienvenida",
  "Welcome Pack",
  "Starter Pack",
];

function toStr(value) {
  return String(value || "").trim();
}

function normalizePlayerName(value) {
  return toStr(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function normalizeUuid(value) {
  return toStr(value).toLowerCase();
}

function parseConfiguredNames() {
  const raw = toStr(process.env.TEBEX_WELCOME_PACK_NAME);
  if (!raw) return DEFAULT_WELCOME_NAMES;

  return raw
    .split("|")
    .map((name) => toStr(name))
    .filter(Boolean);
}

function parseConfiguredId() {
  const id = Number(process.env.TEBEX_WELCOME_PACK_ID || 0);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function getPackageId(pkg) {
  const value = Number(pkg?.id ?? pkg?.package_id ?? pkg?.packageId ?? 0);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function getPackageName(pkg) {
  return toStr(pkg?.name || pkg?.nombre || pkg?.package_name || pkg?.title || "");
}

async function ensureCatalog(force = false) {
  const server = tebex.getServerKey();
  const cache = tebex.cache?.[server];

  if (force || !cache?.cacheAt || tebex.isExpired(cache)) {
    await tebex.actualizarCacheDe(server);
  }

  return tebex.cache?.[server] || { categorias: [], paquetes: [], cacheAt: 0 };
}

async function findWelcomePack(force = false) {
  const cache = await ensureCatalog(force);
  const packages = Array.isArray(cache?.paquetes) ? cache.paquetes : [];
  const configuredId = parseConfiguredId();

  if (configuredId) {
    const byId = packages.find((pkg) => getPackageId(pkg) === configuredId);
    if (byId) return byId;
  }

  const configuredNames = parseConfiguredNames().map((name) => normalizePlayerName(name));
  return packages.find((pkg) => configuredNames.includes(normalizePlayerName(getPackageName(pkg)))) || null;
}

function pickPackImage(pkg) {
  return toStr(pkg?.image_url || pkg?.image || pkg?.imageUrl || pkg?.imageUrlLarge || pkg?.img || "");
}

function serializePack(pkg) {
  if (!pkg) return null;

  return {
    id: getPackageId(pkg),
    name: getPackageName(pkg),
    price: Number.isFinite(Number(pkg?.price)) ? Number(pkg.price) : null,
    original_price: Number.isFinite(Number(pkg?.original_price)) ? Number(pkg.original_price) : null,
    image_url: pickPackImage(pkg),
    image_url_raw: pickPackImage(pkg),
    currency: toStr(pkg?.currency || tebex.TEBEX_CURRENCY || "EUR").toUpperCase(),
    sale_percentage: Number.isFinite(Number(pkg?.sale_percentage)) ? Number(pkg.sale_percentage) : null,
  };
}

async function findExistingPurchase({ packageId, uuid, jugador }) {
  if (!packageId) return null;

  const uuidNorm = normalizeUuid(uuid);
  const nameNorm = normalizePlayerName(jugador);

  if (uuidNorm) {
    const { data, error } = await db
      .from("tebex_bienvenida_compras")
      .select("*")
      .eq("package_id", packageId)
      .eq("uuid_jugador", uuidNorm)
      .maybeSingle();

    if (error && error.code !== "PGRST116") throw error;
    if (data) return data;
  }

  if (nameNorm) {
    const { data, error } = await db
      .from("tebex_bienvenida_compras")
      .select("*")
      .eq("package_id", packageId)
      .eq("nombre_normalizado", nameNorm)
      .maybeSingle();

    if (error && error.code !== "PGRST116") throw error;
    if (data) return data;
  }

  return null;
}

async function hasPurchasedWelcomePack({ jugador, uuid, packageId }) {
  const existing = await findExistingPurchase({ packageId, uuid, jugador });
  return Boolean(existing);
}

async function getWelcomePackStatus({ jugador, uuid, refresh = false }) {
  const pack = await findWelcomePack(refresh);

  if (!pack) {
    return {
      available: false,
      purchased: false,
      shouldShow: false,
      pack: null,
      reason: "not-found",
    };
  }

  const packageId = getPackageId(pack);
  const purchased = jugador ? await hasPurchasedWelcomePack({ jugador, uuid, packageId }) : false;

  return {
    available: true,
    purchased,
    shouldShow: Boolean(jugador && !purchased),
    pack: serializePack(pack),
    reason: purchased ? "already-owned" : "ok",
  };
}

async function assertBasketAllowed({ jugador, uuid, basket }) {
  const pack = await findWelcomePack(false);
  if (!pack) return { blocked: false, pack: null };

  const welcomePackId = getPackageId(pack);
  const wantsWelcomePack = (Array.isArray(basket) ? basket : []).some((item) => Number(item?.id) === welcomePackId);

  if (!wantsWelcomePack) {
    return { blocked: false, pack: serializePack(pack) };
  }

  const purchased = await hasPurchasedWelcomePack({ jugador, uuid, packageId: welcomePackId });

  return {
    blocked: purchased,
    pack: serializePack(pack),
  };
}

function buildCheckoutCustom({ jugador, uuid, basket }) {
  return {
    mc_username: toStr(jugador),
    mc_uuid: normalizeUuid(uuid),
    source: "flancraft-web",
    ts: Date.now(),
    package_ids: (Array.isArray(basket) ? basket : [])
      .map((item) => Number(item?.id))
      .filter((id) => Number.isFinite(id) && id > 0),
  };
}

function extractEventSubject(evt) {
  return evt?.subject || evt?.data || {};
}

function pickCandidateArrays(subject) {
  return [
    subject?.products,
    subject?.rows,
    subject?.basket?.rows,
    subject?.basket?.products,
    subject?.payment?.products,
    subject?.payment?.rows,
    subject?.transaction?.products,
    subject?.transaction?.rows,
  ].filter(Array.isArray);
}

function extractPurchasedPackageIds(evt) {
  const subject = extractEventSubject(evt);
  const arrays = pickCandidateArrays(subject);
  const ids = new Set();

  for (const arr of arrays) {
    for (const item of arr) {
      const candidates = [
        item?.id,
        item?.package_id,
        item?.packageId,
        item?.package?.id,
        item?.package?.package_id,
        item?.meta?.package_id,
      ];

      for (const candidate of candidates) {
        const id = Number(candidate);
        if (Number.isFinite(id) && id > 0) ids.add(id);
      }
    }
  }

  return Array.from(ids);
}

function extractCustomPayload(evt) {
  const subject = extractEventSubject(evt);

  return (
    subject?.custom ||
    subject?.basket?.custom ||
    subject?.payment?.custom ||
    subject?.transaction?.custom ||
    {}
  );
}

function extractPlayerIdentity(evt) {
  const subject = extractEventSubject(evt);
  const custom = extractCustomPayload(evt);

  const jugador =
    toStr(custom?.mc_username) ||
    toStr(subject?.username) ||
    toStr(subject?.customer?.username) ||
    toStr(subject?.payment?.username) ||
    toStr(subject?.transaction?.username) ||
    toStr(subject?.ign);

  const uuid =
    normalizeUuid(custom?.mc_uuid) ||
    normalizeUuid(subject?.username_id) ||
    normalizeUuid(subject?.customer?.uuid) ||
    normalizeUuid(subject?.payment?.username_id) ||
    normalizeUuid(subject?.transaction?.username_id);

  return { jugador, uuid };
}

function extractPaymentMeta(evt) {
  const subject = extractEventSubject(evt);

  return {
    paymentId:
      toStr(subject?.transaction_id) ||
      toStr(subject?.payment?.id) ||
      toStr(subject?.transaction?.id) ||
      toStr(subject?.id) ||
      toStr(evt?.id),
    basketIdent:
      toStr(subject?.basket?.ident) ||
      toStr(subject?.basket_id) ||
      toStr(subject?.payment?.basket_id) ||
      toStr(subject?.transaction?.basket_id),
  };
}

async function savePurchaseRecord({ packageId, packageName, jugador, uuid, paymentId, basketIdent, payload }) {
  const uuidNorm = normalizeUuid(uuid);
  const nameNorm = normalizePlayerName(jugador);

  if (!packageId || !jugador) {
    return { persisted: false, reason: "missing-player-or-package" };
  }

  if (paymentId) {
    const { data: byPayment, error: paymentLookupError } = await db
      .from("tebex_bienvenida_compras")
      .select("id")
      .eq("payment_id", paymentId)
      .maybeSingle();

    if (paymentLookupError && paymentLookupError.code !== "PGRST116") throw paymentLookupError;
    if (byPayment) return { persisted: false, reason: "payment-already-processed" };
  }

  const existing = await findExistingPurchase({ packageId, uuid: uuidNorm, jugador });

  if (existing?.id) {
    const { error: updateError } = await db
      .from("tebex_bienvenida_compras")
      .update({
        package_name: packageName,
        uuid_jugador: uuidNorm || existing.uuid_jugador,
        nombre_jugador: jugador,
        nombre_normalizado: nameNorm,
        payment_id: paymentId || existing.payment_id,
        basket_ident: basketIdent || existing.basket_ident,
        payload,
      })
      .eq("id", existing.id);

    if (updateError) throw updateError;
    return { persisted: false, reason: "already-owned-updated" };
  }

  const { error: insertError } = await db.from("tebex_bienvenida_compras").insert({
    package_id: packageId,
    package_name: packageName,
    uuid_jugador: uuidNorm || null,
    nombre_jugador: jugador,
    nombre_normalizado: nameNorm,
    payment_id: paymentId || null,
    basket_ident: basketIdent || null,
    payload,
  });

  if (insertError) throw insertError;

  return { persisted: true, reason: "inserted" };
}

async function handleWelcomePackWebhook(evt) {
  if (toStr(evt?.type).toLowerCase() !== "payment.completed") {
    return { ok: true, skipped: true, reason: "event-not-relevant" };
  }

  const pack = await findWelcomePack(false);
  if (!pack) {
    return { ok: true, skipped: true, reason: "welcome-pack-not-found" };
  }

  const welcomePackId = getPackageId(pack);
  const purchasedIds = extractPurchasedPackageIds(evt);

  if (!purchasedIds.includes(welcomePackId)) {
    return { ok: true, skipped: true, reason: "welcome-pack-not-in-event" };
  }

  const { jugador, uuid } = extractPlayerIdentity(evt);
  const { paymentId, basketIdent } = extractPaymentMeta(evt);

  const result = await savePurchaseRecord({
    packageId: welcomePackId,
    packageName: getPackageName(pack),
    jugador,
    uuid,
    paymentId,
    basketIdent,
    payload: evt,
  });

  return {
    ok: true,
    skipped: false,
    ...result,
  };
}

module.exports = {
  findWelcomePack,
  getWelcomePackStatus,
  assertBasketAllowed,
  buildCheckoutCustom,
  handleWelcomePackWebhook,
};
