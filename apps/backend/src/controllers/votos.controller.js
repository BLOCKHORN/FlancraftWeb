// apps/backend/src/controllers/votos.controller.js
const crypto = require("crypto");
const supabase = require("../models/db");

const COOLDOWN_MS = 24 * 60 * 60 * 1000;

// =========================
// Utils
// =========================
function safeLower(s) {
  return String(s || "").trim().toLowerCase();
}

function isUuid(v) {
  const s = String(v || "").trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    s
  );
}

function parseVoteTime(ts) {
  if (!ts) return new Date();

  const n = Number(ts);
  if (Number.isFinite(n)) {
    if (n > 0 && n < 100000000000) return new Date(n * 1000); // seconds -> ms
    return new Date(n); // already ms
  }

  const d = new Date(String(ts));
  if (Number.isNaN(d.getTime())) return new Date();
  return d;
}

function timingSafeEqual(a, b) {
  try {
    const aa = Buffer.from(String(a || ""), "utf8");
    const bb = Buffer.from(String(b || ""), "utf8");
    if (aa.length !== bb.length) return false;
    return crypto.timingSafeEqual(aa, bb);
  } catch {
    return false;
  }
}

function getUtcDayStart(date = new Date()) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// Mapeo “best effort” de serviceName -> id del widget (v1..v5)
// Ajusta estos patterns si tus service names en NuVotifier son otros.
// (No rompe nada: solo mejora el status por sitio)
const SITE_MATCH = [
  { id: "v1", patterns: ["servidoresdeminecraft", "servidores de minecraft", "sdm"] },
  { id: "v2", patterns: ["minecraft-server", "minecraft server"] },
  { id: "v3", patterns: ["minestatus"] },
  { id: "v4", patterns: ["minecraft-mp", "minecraft mp"] },
  { id: "v5", patterns: ["minecraftservers", "minecraftservers.org"] },
];

function patternsForSiteId(siteId) {
  const row = SITE_MATCH.find((x) => x.id === siteId);
  return row?.patterns?.length ? row.patterns : [];
}

async function resolveUserUuidFromKey(key) {
  const k = String(key || "").trim();
  if (!k) return null;

  if (isUuid(k)) return k;

  // Intentar mapear username -> usuarios.uuid (case-insensitive)
  try {
    const { data, error } = await supabase
      .from("usuarios")
      .select("uuid")
      .ilike("uid", k)
      .limit(1)
      .maybeSingle();

    if (!error && data?.uuid) return data.uuid;
  } catch {
    // ignore
  }

  return null;
}

// Busca último voto (vote_time) para un usuario (uuid o username) filtrando por service “parecido”
async function fetchLastVoteForSite({ userUuid, username }, siteId) {
  const patterns = patternsForSiteId(siteId);

  // Si no hay patterns, no podemos estimar por service
  if (!patterns.length) return null;

  // probamos pattern por pattern para evitar .or() complejo
  for (const p of patterns) {
    let q = supabase
      .from("votos")
      .select("vote_time, service")
      .order("vote_time", { ascending: false })
      .limit(1);

    if (userUuid) q = q.eq("user_uuid", userUuid);
    else q = q.ilike("username", username);

    q = q.ilike("service", `%${p}%`);

    const { data, error } = await q;
    if (!error && Array.isArray(data) && data.length) {
      const t = new Date(data[0].vote_time);
      if (!Number.isNaN(t.getTime())) return t;
    }
  }

  // fallback final: si no matchea por service, no sabemos
  return null;
}

// =========================
// POST /api/votos/ingest
// Header: x-vote-ingest-secret
// Body: { username, service, ip, timestamp }
// =========================
async function ingestVote(req, res) {
  const secretHeader = req.headers["x-vote-ingest-secret"];
  const secretEnv = process.env.VOTE_INGEST_SECRET;

  if (!secretEnv) {
    return res.status(500).json({
      ok: false,
      error: "VOTE_INGEST_SECRET no configurado en el backend",
    });
  }

  if (!timingSafeEqual(secretHeader, secretEnv)) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  const username = String(req.body?.username || "").trim();
  const service = String(req.body?.service || "").trim() || "unknown";
  const ip = String(req.body?.ip || "").trim() || null;
  const timestamp = req.body?.timestamp;

  if (!username) {
    return res.status(400).json({ ok: false, error: "username requerido" });
  }

  const voteTime = parseVoteTime(timestamp);

  // 1) Intentar enlazar con usuarios.uuid por usuarios.uid (case-insensitive)
  let user_uuid = null;
  try {
    const { data: u, error: uErr } = await supabase
      .from("usuarios")
      .select("uuid")
      .ilike("uid", username)
      .limit(1)
      .maybeSingle();

    if (!uErr && u?.uuid) user_uuid = u.uuid;
  } catch {
    // ignore
  }

  // 2) Insert en votos
  try {
    const payload = {
      vote_time: voteTime.toISOString(),
      username,
      service,
      ip,
      source: "nuvotifier",
      user_uuid,
    };

    const { data, error } = await supabase
      .from("votos")
      .insert(payload)
      .select("id, vote_time, username, service, user_uuid")
      .single();

    if (error) {
      if (error.code === "23505") {
        return res.status(200).json({
          ok: true,
          inserted: false,
          duplicate: true,
          username,
          service,
        });
      }

      return res.status(500).json({
        ok: false,
        error: "Error insertando voto",
        details: error.message || String(error),
      });
    }

    return res.status(200).json({
      ok: true,
      inserted: true,
      duplicate: false,
      vote: data,
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: "Excepción insertando voto",
      details: e?.message || String(e),
    });
  }
}

// =========================
// GET /api/votos/ranking
// Query: limit, offset, order=total|30d
// =========================
async function getRanking(req, res) {
  const limitRaw = Number(req.query?.limit ?? 50);
  const offsetRaw = Number(req.query?.offset ?? 0);
  const order = String(req.query?.order || "total").toLowerCase();

  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 50;
  const offset = Number.isFinite(offsetRaw) ? Math.max(offsetRaw, 0) : 0;

  const orderCol = order === "30d" ? "votos_30d" : "total_votos";

  try {
    const { data, error } = await supabase
      .from("vista_ranking_votos")
      .select("jugador, username_lower, total_votos, votos_30d, ultimo_voto")
      .order(orderCol, { ascending: false })
      .order("ultimo_voto", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({
        ok: false,
        error: "Error obteniendo ranking",
        details: error.message || String(error),
      });
    }

    return res.status(200).json({
      ok: true,
      limit,
      offset,
      order: orderCol,
      items: data || [],
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: "Excepción obteniendo ranking",
      details: e?.message || String(e),
    });
  }
}

// =========================
// GET /api/votos/resumen
// =========================
async function getResumen(req, res) {
  try {
    const now = new Date();
    const startTodayUtc = getUtcDayStart(now);
    const start7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const start30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const totalQ = supabase.from("votos").select("id", { count: "exact", head: true });
    const hoyQ = supabase
      .from("votos")
      .select("id", { count: "exact", head: true })
      .gte("vote_time", startTodayUtc.toISOString());
    const d7Q = supabase
      .from("votos")
      .select("id", { count: "exact", head: true })
      .gte("vote_time", start7d.toISOString());
    const d30Q = supabase
      .from("votos")
      .select("id", { count: "exact", head: true })
      .gte("vote_time", start30d.toISOString());

    const [totalR, hoyR, d7R, d30R] = await Promise.all([totalQ, hoyQ, d7Q, d30Q]);

    const anyErr = totalR.error || hoyR.error || d7R.error || d30R.error;
    if (anyErr) {
      return res.status(500).json({
        ok: false,
        error: "Error calculando resumen",
        details: String(anyErr?.message || anyErr),
      });
    }

    return res.status(200).json({
      ok: true,
      hoy_utc: hoyR.count ?? 0,
      ultimos_7d: d7R.count ?? 0,
      ultimos_30d: d30R.count ?? 0,
      total: totalR.count ?? 0,
      ventanas: {
        startTodayUtc: startTodayUtc.toISOString(),
        start7d: start7d.toISOString(),
        start30d: start30d.toISOString(),
      },
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: "Excepción calculando resumen",
      details: e?.message || String(e),
    });
  }
}

// =========================
// GET /api/votos/top?range=30d|total&limit=6
// Devuelve: { ok, list:[{nombre, uuid?, votos}] }
// =========================
async function getTop(req, res) {
  const range = String(req.query?.range || "30d").toLowerCase();
  const limitRaw = Number(req.query?.limit ?? 6);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 50) : 6;

  const col = range === "total" ? "total_votos" : "votos_30d";

  try {
    const { data, error } = await supabase
      .from("vista_ranking_votos")
      .select("jugador, username_lower, total_votos, votos_30d")
      .order(col, { ascending: false })
      .limit(limit);

    if (error) {
      return res.status(500).json({
        ok: false,
        error: "Error obteniendo top",
        details: error.message || String(error),
      });
    }

    const list = (data || []).map((r) => ({
      nombre: r.jugador || r.username_lower || "Desconocido",
      uuid: null, // si más adelante quieres, lo resolvemos con join/lookup
      votos: Number(r[col] || 0) || 0,
    }));

    return res.status(200).json({ ok: true, list });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: "Excepción obteniendo top",
      details: e?.message || String(e),
    });
  }
}

// =========================
// GET /api/votos/status/:id   (id = uuid o username)
// Devuelve estado por cada site v1..v5 con cooldown 24h
// =========================
async function getStatus(req, res) {
  const key = String(req.params?.id || "").trim();
  if (!key) return res.status(400).json({ ok: false, error: "id requerido" });

  try {
    // resolver uuid si es posible
    const userUuid = await resolveUserUuidFromKey(key);
    const username = safeLower(key); // fallback por username

    const now = Date.now();

    const sites = ["v1", "v2", "v3", "v4", "v5"];
    const items = [];

    for (const siteId of sites) {
      const lastDate = await fetchLastVoteForSite({
        userUuid,
        username,
      }, siteId);

      const last = lastDate ? lastDate.getTime() : 0;
      const elapsed = last ? now - last : Infinity;
      const available = !last || elapsed >= COOLDOWN_MS;
      const left = available ? 0 : COOLDOWN_MS - elapsed;

      items.push({
        id: siteId,
        last: last || 0,
        available,
        left: Math.max(0, Math.floor(left)),
      });
    }

    const done = items.filter((i) => i.available === false).length;
    const total = items.length;
    const remaining = total - done;
    const progress = total ? done / total : 0;

    return res.status(200).json({
      ok: true,
      total,
      done,
      remaining,
      progress,
      items,
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: "Excepción obteniendo status",
      details: e?.message || String(e),
    });
  }
}

module.exports = {
  ingestVote,
  getRanking,
  getResumen,
  getTop,
  getStatus,
};
