const db = require("../models/db");

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const STAFF_ORDER = ["builder", "helper", "srhelper", "mod", "srmod", "admin", "owner"];

const normalizeText = (v) => String(v ?? "").trim();
const normalizeLower = (v) => normalizeText(v).toLowerCase();
const normalizeRole = (value) => normalizeLower(value).replace(/[\s_-]+/g, "") || null;
const toInt = (v, fallback) => {
  const n = Number.parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : fallback;
};

const hasMinRole = (currentRole, minRole) => {
  const currentIndex = STAFF_ORDER.indexOf(normalizeRole(currentRole));
  const minIndex = STAFF_ORDER.indexOf(normalizeRole(minRole));
  if (currentIndex === -1 || minIndex === -1) return false;
  return currentIndex >= minIndex;
};

const getRequestRole = (req) => normalizeRole(req?.usuario?.rango_staff || req?.usuario?.rol_admin);

const requireApiKey = (req) => {
  const incoming = normalizeText(req.headers["x-api-key"]);
  const secret = normalizeText(process.env.JAILTRACKER_SECRET);

  if (!secret) return { ok: false, code: 500, error: "Server not configured" };
  if (!incoming || incoming !== secret) return { ok: false, code: 403, error: "Forbidden: invalid token" };
  return { ok: true };
};

const canRead = (req) => {
  const auth = requireApiKey(req);
  if (auth.ok) return { ok: true };
  if (hasMinRole(getRequestRole(req), "mod")) return { ok: true };
  return { ok: false, code: 403, error: "No tienes permisos suficientes." };
};

const canPatch = canRead;

exports.registrarDeteccion = async (req, res) => {
  const auth = requireApiKey(req);
  if (!auth.ok) return res.status(auth.code).json({ error: auth.error });

  try {
    const payload = {
      uuid_jugador: normalizeText(req.body.uuid) || null,
      nombre_jugador: normalizeText(req.body.name),
      ip_hash: normalizeText(req.body.ip_hash),
      servidor: normalizeLower(req.body.server) || null,
      timestamp: Number(req.body.timestamp) || Date.now(),
      related_count: Number(req.body.related_count) || 0,
      related_accounts: Array.isArray(req.body.related_accounts) ? req.body.related_accounts : [],
      estado: "pendiente",
      observacion: null,
      revisado_por: null,
    };

    if (!payload.nombre_jugador) return res.status(400).json({ error: "Missing field: name" });
    if (!payload.ip_hash) return res.status(400).json({ error: "Missing field: ip_hash" });

    const { data, error } = await db
      .from("multicuentas_alertas")
      .insert(payload)
      .select("*")
      .single();

    if (error) throw error;

    return res.status(201).json({ success: true, data });
  } catch (err) {
    console.error("[POST MULTICUENTA]", err);
    return res.status(500).json({ error: "Error al registrar detección" });
  }
};

exports.obtenerDetecciones = async (req, res) => {
  const auth = canRead(req);
  if (!auth.ok) return res.status(auth.code).json({ error: auth.error });

  try {
    const limit = Math.min(MAX_LIMIT, Math.max(1, toInt(req.query.limit, DEFAULT_LIMIT)));
    const offset = Math.max(0, toInt(req.query.offset, 0));
    const estado = normalizeLower(req.query.estado);
    const nombre = normalizeText(req.query.name);

    let q = db.from("multicuentas_alertas").select("*", { count: "exact" });
    if (estado) q = q.eq("estado", estado);
    if (nombre) q = q.ilike("nombre_jugador", `%${nombre}%`);
    q = q.order("timestamp", { ascending: false }).range(offset, offset + limit - 1);

    const { data, error, count } = await q;
    if (error) throw error;

    return res.status(200).json({
      data,
      page: {
        limit,
        offset,
        total: count ?? 0,
        hasMore: offset + limit < (count ?? 0),
      },
    });
  } catch (err) {
    console.error("[GET MULTICUENTA]", err);
    return res.status(500).json({ error: "Error al obtener detecciones" });
  }
};

exports.actualizarDeteccion = async (req, res) => {
  const auth = canPatch(req);
  if (!auth.ok) return res.status(auth.code).json({ error: auth.error });

  const id = normalizeText(req.params.id);
  if (!id) return res.status(400).json({ error: "id no válido" });

  try {
    const patch = {};
    if (req.body.estado != null) patch.estado = normalizeLower(req.body.estado) || null;
    if (req.body.observacion != null) patch.observacion = normalizeText(req.body.observacion) || null;
    if (req.body.revisado_por != null) patch.revisado_por = normalizeText(req.body.revisado_por) || null;

    if (!Object.keys(patch).length) {
      return res.status(400).json({ error: "No hay campos para actualizar" });
    }

    const { data, error } = await db
      .from("multicuentas_alertas")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("[PATCH MULTICUENTA]", err);
    return res.status(500).json({ error: "Error al actualizar detección" });
  }
};
