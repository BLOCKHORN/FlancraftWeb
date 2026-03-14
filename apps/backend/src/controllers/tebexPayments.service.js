"use strict";

const { createClient } = require("@supabase/supabase-js");
const tebex = require("./tebex.helpers");

const TOP_TTL_SEC = Number(process.env.TEBEX_TOP_TTL_SEC || 60);

const SUPABASE_URL = String(process.env.SUPABASE_URL || "").trim();
const SUPABASE_SERVICE_ROLE_KEY = String(
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    ""
).trim();

const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

const rankingCache = new Map();

function ensureSupabase() {
  if (supabase) return supabase;
  throw new Error("Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY");
}

function nowSec() {
  return Math.floor(Date.now() / 1000);
}

function toText(v, fallback = "") {
  if (v === null || v === undefined) return fallback;
  const s = String(v).trim();
  return s || fallback;
}

function parseNumberFromString(str) {
  const s = String(str ?? "").trim();
  if (!s) return NaN;

  let c = s.replace(/[^\d.,-]/g, "");
  if (!c) return NaN;

  const lastComma = c.lastIndexOf(",");
  const lastDot = c.lastIndexOf(".");

  if (lastComma > -1 && lastDot > -1) {
    if (lastComma > lastDot) c = c.replace(/\./g, "").replace(",", ".");
    else c = c.replace(/,/g, "");
  } else if (lastComma > -1 && lastDot === -1) {
    c = c.replace(",", ".");
  }

  const n = Number(c);
  return Number.isFinite(n) ? n : NaN;
}

function toMoneyNumber(v) {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (!v) return NaN;

  if (typeof v === "object") {
    const raw =
      v.raw ??
      v.value ??
      v.amount ??
      v.total ??
      v.gross ??
      v.price ??
      v.total_price;

    if (typeof raw === "number" && Number.isFinite(raw)) return raw;

    const nested =
      v.amount?.value ??
      v.amount?.raw ??
      v.price?.amount ??
      v.price?.value ??
      v.total?.amount;

    if (typeof nested === "number" && Number.isFinite(nested)) return nested;

    const formatted =
      v.formatted ??
      v.text ??
      v.label ??
      v.display ??
      v.amount?.formatted ??
      v.price?.formatted;

    const n1 = parseNumberFromString(formatted);
    if (Number.isFinite(n1)) return n1;

    return parseNumberFromString(raw);
  }

  return parseNumberFromString(v);
}

function getPath(obj, path) {
  let cur = obj;
  for (const key of path) {
    if (cur === null || cur === undefined) return undefined;
    cur = cur[key];
  }
  return cur;
}

function firstFromCandidates(candidates, paths) {
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object") continue;
    for (const path of paths) {
      const value = getPath(candidate, path);
      if (value !== undefined && value !== null && value !== "") return value;
    }
  }
  return undefined;
}

function getCandidates(evt) {
  const list = [
    evt?.subject,
    evt?.data,
    evt?.payment,
    evt?.transaction,
    evt,
  ];
  return list.filter((x) => x && typeof x === "object");
}

function normalizeServer(v) {
  const s = String(v || "").trim().toLowerCase();
  return s || "global";
}

function normalizeCurrency(v) {
  const s = String(v || tebex.TEBEX_CURRENCY || "EUR").trim().toUpperCase();
  return /^[A-Z]{3}$/.test(s) ? s : "EUR";
}

function normalizeEventType(evt) {
  return String(
    evt?.type || evt?.event_type || evt?.eventType || evt?.name || ""
  )
    .trim()
    .toLowerCase();
}

function isRefundLike(type) {
  return /(refund|chargeback|reversed|reversal|dispute|cancelled|canceled)/i.test(
    String(type || "")
  );
}

function isPaidLike(type) {
  const t = String(type || "");
  if (!t) return true;
  return /(paid|complete|completed|successful|success)/i.test(t) && !isRefundLike(t);
}

function buildPeriodKey(date = new Date()) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function buildPeriodLabel(date = new Date()) {
  const txt = new Intl.DateTimeFormat("es-ES", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

function getMonthBounds(date = new Date()) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1, 0, 0, 0, 0));
  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    periodKey: buildPeriodKey(date),
    periodLabel: buildPeriodLabel(date),
  };
}

function invalidateTopCaches() {
  rankingCache.clear();
  tebex.headlessCache.topDonator = { data: null, cacheAt: 0 };
}

function extractPaymentRecord(evt) {
  const candidates = getCandidates(evt);

  const paymentId = toText(
    firstFromCandidates(candidates, [
      ["payment_id"],
      ["transaction_id"],
      ["txn_id"],
      ["reference"],
      ["id"],
      ["payment", "id"],
      ["transaction", "id"],
      ["basket", "payment", "id"],
      ["basket", "ident"],
    ])
  );

  const username = toText(
    firstFromCandidates(candidates, [
      ["username"],
      ["ign"],
      ["player", "name"],
      ["customer", "username"],
      ["customer", "name"],
      ["basket", "username"],
      ["basket", "custom", "jugador"],
      ["basket", "custom", "username"],
      ["custom", "jugador"],
      ["custom", "username"],
    ])
  );

  const uuid = toText(
    firstFromCandidates(candidates, [
      ["uuid"],
      ["player", "uuid"],
      ["customer", "uuid"],
      ["basket", "custom", "uuid"],
      ["basket", "custom", "uuidJugador"],
      ["basket", "custom", "uuid_jugador"],
      ["custom", "uuid"],
      ["custom", "uuidJugador"],
      ["custom", "uuid_jugador"],
    ])
  );

  const amountRaw = firstFromCandidates(candidates, [
    ["amount"],
    ["price", "amount"],
    ["price"],
    ["total"],
    ["total_price"],
    ["value"],
    ["gross"],
    ["basket", "total_price"],
    ["basket", "price"],
    ["payment", "amount"],
  ]);

  const amountNum = toMoneyNumber(amountRaw);

  const currency = normalizeCurrency(
    firstFromCandidates(candidates, [
      ["currency"],
      ["price", "currency"],
      ["basket", "currency"],
      ["payment", "currency"],
    ])
  );

  const server = normalizeServer(
    firstFromCandidates(candidates, [
      ["server"],
      ["basket", "custom", "server"],
      ["custom", "server"],
    ])
  );

  const createdAtRaw = firstFromCandidates(candidates, [
    ["created_at"],
    ["createdAt"],
    ["date"],
    ["completed_at"],
    ["basket", "created_at"],
    ["payment", "created_at"],
  ]);

  const createdAt = createdAtRaw
    ? new Date(createdAtRaw).toISOString()
    : new Date().toISOString();

  return {
    payment_id: paymentId || "",
    username: username || "",
    uuid: uuid || null,
    amount: Number.isFinite(amountNum) ? Number(amountNum.toFixed(2)) : NaN,
    currency,
    server,
    created_at: createdAt,
    raw: evt,
  };
}

async function persistPaymentFromWebhook(evt) {
  const db = ensureSupabase();
  const type = normalizeEventType(evt);
  const record = extractPaymentRecord(evt);

  if (!record.payment_id) {
    return { ok: false, skipped: true, reason: "missing_payment_id" };
  }

  if (isRefundLike(type)) {
    const { error } = await db
      .from("tebex_payments")
      .delete()
      .eq("payment_id", record.payment_id);

    if (error) throw error;

    invalidateTopCaches();
    return { ok: true, removed: true, payment_id: record.payment_id };
  }

  if (!isPaidLike(type)) {
    return { ok: false, skipped: true, reason: "event_not_paid" };
  }

  if (!record.username || !Number.isFinite(record.amount) || record.amount <= 0) {
    return { ok: false, skipped: true, reason: "incomplete_payload", record };
  }

  const payload = {
    payment_id: record.payment_id,
    username: record.username,
    uuid: record.uuid,
    amount: record.amount,
    currency: record.currency,
    server: record.server,
    created_at: record.created_at,
    raw: record.raw,
  };

  const { error } = await db
    .from("tebex_payments")
    .upsert(payload, { onConflict: "payment_id" });

  if (error) throw error;

  invalidateTopCaches();

  return { ok: true, saved: true, payment_id: record.payment_id };
}

async function getMonthlyTopDonators({ server = "global", limit = 3, force = false } = {}) {
  const db = ensureSupabase();
  const safeServer = normalizeServer(server);
  const safeLimit = Math.max(1, Math.min(10, Number(limit || 3)));
  const { startIso, endIso, periodKey, periodLabel } = getMonthBounds();
  const cacheKey = `${safeServer}:${periodKey}:${safeLimit}`;
  const cached = rankingCache.get(cacheKey);

  if (!force && cached && nowSec() - cached.cacheAt < TOP_TTL_SEC) {
    return cached.data;
  }

  let query = db
    .from("tebex_payments")
    .select("payment_id, username, uuid, amount, currency, server, created_at")
    .gte("created_at", startIso)
    .lt("created_at", endIso)
    .order("created_at", { ascending: false })
    .limit(5000);

  if (safeServer !== "all") {
    query = query.eq("server", safeServer);
  }

  const { data, error } = await query;

  if (error) throw error;

  const rows = Array.isArray(data) ? data : [];
  const map = new Map();

  for (const row of rows) {
    const username = toText(row.username);
    const uuid = toText(row.uuid);
    const key = uuid || username.toLowerCase();
    if (!key) continue;

    const amount = Number(row.amount || 0);
    const createdAt = row.created_at || null;

    if (!map.has(key)) {
      map.set(key, {
        username: username || "Jugador",
        uuid: uuid || "",
        amount: 0,
        currency: normalizeCurrency(row.currency),
        server: normalizeServer(row.server),
        latestPurchaseAt: createdAt,
      });
    }

    const entry = map.get(key);
    entry.amount += Number.isFinite(amount) ? amount : 0;

    if (!entry.uuid && uuid) entry.uuid = uuid;
    if (createdAt && (!entry.latestPurchaseAt || new Date(createdAt) > new Date(entry.latestPurchaseAt))) {
      entry.latestPurchaseAt = createdAt;
      if (username) entry.username = username;
      entry.currency = normalizeCurrency(row.currency);
      entry.server = normalizeServer(row.server);
    }
  }

  const items = Array.from(map.values())
    .map((item) => ({
      ...item,
      amount: Number(item.amount.toFixed(2)),
    }))
    .sort((a, b) => {
      if (b.amount !== a.amount) return b.amount - a.amount;
      const ad = a.latestPurchaseAt ? new Date(a.latestPurchaseAt).getTime() : 0;
      const bd = b.latestPurchaseAt ? new Date(b.latestPurchaseAt).getTime() : 0;
      if (bd !== ad) return bd - ad;
      return a.username.localeCompare(b.username, "es");
    })
    .slice(0, safeLimit)
    .map((item, index) => ({
      rank: index + 1,
      ...item,
    }));

  const payload = {
    items,
    periodKey,
    periodLabel,
    server: safeServer,
    count: items.length,
    empty: items.length === 0,
  };

  rankingCache.set(cacheKey, { data: payload, cacheAt: nowSec() });

  return payload;
}

module.exports = {
  persistPaymentFromWebhook,
  getMonthlyTopDonators,
  invalidateTopCaches,
};