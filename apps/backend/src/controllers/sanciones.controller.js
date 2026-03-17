const db = require("../models/db");

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

const STAFF_ORDER = ["builder", "helper", "srhelper", "mod", "srmod", "admin", "owner"];

const normalizeText = (v) => String(v ?? "").trim();
const normalizeLower = (v) => normalizeText(v).toLowerCase();

const normalizeRole = (value) => {
  const role = normalizeLower(value).replace(/[\s_-]+/g, "");
  return role || null;
};

const normalizeMotivo = (value) => {
  const motivo = normalizeLower(value).replace(/[\s_-]+/g, " ").trim();
  if (motivo === "fly") return "hacks";
  if (motivo === "grief") return "grif";
  return motivo || null;
};

const toInt = (v, fallback) => {
  const n = Number.parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : fallback;
};

const safeId = (id) => {
  const v = normalizeText(id);
  return /^[0-9a-fA-F-]{36}$/.test(v) ? v : null;
};

const safeBigint = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
};

const hasMinRole = (currentRole, minRole) => {
  const currentIndex = STAFF_ORDER.indexOf(normalizeRole(currentRole));
  const minIndex = STAFF_ORDER.indexOf(normalizeRole(minRole));

  if (currentIndex === -1 || minIndex === -1) return false;
  return currentIndex >= minIndex;
};

const getRequestRole = (req) => {
  return normalizeRole(req?.usuario?.rango_staff || req?.usuario?.rol_admin);
};

const requireApiKey = (req) => {
  const incoming = normalizeText(req.headers["x-api-key"]);
  const secret = normalizeText(process.env.JAILTRACKER_SECRET);

  if (!secret) {
    return { ok: false, code: 500, error: "Server not configured" };
  }

  if (!incoming || incoming !== secret) {
    return { ok: false, code: 403, error: "Forbidden: invalid token" };
  }

  return { ok: true };
};

const canPatchSanction = (req) => {
  const auth = requireApiKey(req);
  if (auth.ok) return { ok: true };

  const role = getRequestRole(req);
  if (hasMinRole(role, "mod")) return { ok: true };

  if (req.usuario?.uuid) {
    return { ok: false, code: 403, error: "No tienes permisos suficientes." };
  }

  return auth;
};

const canDeleteSanction = (req) => {
  const auth = requireApiKey(req);
  if (auth.ok) return { ok: true };

  const role = getRequestRole(req);
  if (hasMinRole(role, "admin")) return { ok: true };

  if (req.usuario?.uuid) {
    return { ok: false, code: 403, error: "No tienes permisos suficientes." };
  }

  return auth;
};

const pickOrder = (raw) => {
  const allowed = new Set(["timestamp", "name", "server", "estado", "type", "bantype"]);
  const key = normalizeLower(raw);
  return allowed.has(key) ? key : "timestamp";
};

const pickDir = (raw) => (normalizeLower(raw) === "asc" ? "asc" : "desc");

const buildFilters = (query, q) => {
  const server = normalizeLower(query.server);
  const estado = normalizeLower(query.estado);
  const type = normalizeMotivo(query.type);
  const bantype = normalizeLower(query.bantype);
  const name = normalizeText(query.name);
  const moderator = normalizeText(query.moderator);

  if (server) q = q.eq("server", server);
  if (estado) q = q.eq("estado", estado);
  if (type) q = q.eq("type", type);
  if (bantype) q = q.eq("bantype", bantype);
  if (name) q = q.ilike("name", `%${name}%`);
  if (moderator) q = q.ilike("moderator", `%${moderator}%`);

  return q;
};

exports.registrarSancion = async (req, res) => {
  const auth = requireApiKey(req);
  if (!auth.ok) return res.status(auth.code).json({ error: auth.error });

  try {
    const uuid = normalizeText(req.body.uuid) || null;
    const name = normalizeText(req.body.name);
    const moderator = normalizeText(req.body.moderator);
    const duration = normalizeText(req.body.duration) || null;
    const server = normalizeLower(req.body.server) || null;
    const type = normalizeMotivo(req.body.type);
    const bantype = normalizeLower(req.body.banType ?? req.body.bantype);
    const timestamp = safeBigint(req.body.timestamp) ?? Date.now();

    if (!name) return res.status(400).json({ error: "Missing field: name" });
    if (!moderator) return res.status(400).json({ error: "Missing field: moderator" });
    if (!bantype) return res.status(400).json({ error: "Missing field: banType" });

    const payload = {
      uuid,
      name,
      moderator,
      duration,
      timestamp,
      server,
      type,
      bantype,
      estado: "pendiente",
    };

    const { data, error } = await db.from("jails").insert(payload).select("*").single();
    if (error) throw error;

    return res.status(201).json({ success: true, data });
  } catch (err) {
    console.error("[POST SANCION]", err);
    return res.status(500).json({ error: "Error al registrar sanción" });
  }
};

exports.obtenerSanciones = async (req, res) => {
  try {
    const limit = Math.min(MAX_LIMIT, Math.max(1, toInt(req.query.limit, DEFAULT_LIMIT)));
    const offset = Math.max(0, toInt(req.query.offset, 0));
    const order = pickOrder(req.query.order);
    const dir = pickDir(req.query.dir);

    let q = db.from("jails").select("*", { count: "exact" });
    q = buildFilters(req.query, q);
    q = q.order(order, { ascending: dir === "asc" }).range(offset, offset + limit - 1);

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
    console.error("[GET SANCIONES]", err);
    return res.status(500).json({ error: "Error al obtener sanciones" });
  }
};

exports.obtenerSancionesPorJugador = async (req, res) => {
  const nombre = normalizeText(req.params.nombre);
  if (!nombre) return res.status(400).json({ error: "Nombre de jugador no válido" });

  try {
    const limit = Math.min(MAX_LIMIT, Math.max(1, toInt(req.query.limit, DEFAULT_LIMIT)));
    const offset = Math.max(0, toInt(req.query.offset, 0));
    const order = pickOrder(req.query.order);
    const dir = pickDir(req.query.dir);

    let q = db.from("jails").select("*", { count: "exact" }).eq("name", nombre);
    q = buildFilters(req.query, q);
    q = q.order(order, { ascending: dir === "asc" }).range(offset, offset + limit - 1);

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
    console.error("[GET SANCIONES JUGADOR]", err);
    return res.status(500).json({ error: "Error al obtener sanciones del jugador" });
  }
};

exports.actualizarSancion = async (req, res) => {
  const auth = canPatchSanction(req);
  if (!auth.ok) return res.status(auth.code).json({ error: auth.error });

  const id = safeId(req.params.id);
  if (!id) return res.status(400).json({ error: "id no válido" });

  try {
    const patch = {};

    if (req.body.estado != null) patch.estado = normalizeLower(req.body.estado) || null;
    if (req.body.observacion != null) patch.observacion = normalizeText(req.body.observacion) || null;
    if (req.body.revisado_por != null) patch.revisado_por = normalizeText(req.body.revisado_por) || null;
    if (req.body.type != null) patch.type = normalizeMotivo(req.body.type);
    if (req.body.duration != null) patch.duration = normalizeText(req.body.duration) || null;
    if (req.body.bantype != null) patch.bantype = normalizeLower(req.body.bantype) || null;

    if (!Object.keys(patch).length) {
      return res.status(400).json({ error: "No hay campos para actualizar" });
    }

    const { data, error } = await db
      .from("jails")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("[PATCH SANCION]", err);
    return res.status(500).json({ error: "Error al actualizar sanción" });
  }
};

exports.eliminarSancion = async (req, res) => {
  const auth = canDeleteSanction(req);
  if (!auth.ok) return res.status(auth.code).json({ error: auth.error });

  const id = safeId(req.params.id);
  if (!id) return res.status(400).json({ error: "id no válido" });

  try {
    const { error } = await db.from("jails").delete().eq("id", id);
    if (error) throw error;

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("[DELETE SANCION]", err);
    return res.status(500).json({ error: "Error al eliminar sanción" });
  }
};
