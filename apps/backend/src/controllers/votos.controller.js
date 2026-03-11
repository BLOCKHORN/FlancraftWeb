const crypto = require("crypto");
const supabase = require("../models/db");
const { evaluateWebAchievementsForUser } = require("../services/webLogros.service");

const COOLDOWN_MS = 24 * 60 * 60 * 1000;

function safeLower(s) {
  return String(s || "").trim().toLowerCase();
}

function isUuid(v) {
  const s = String(v || "").trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

function parseVoteTime(ts) {
  if (!ts) return new Date();

  const n = Number(ts);
  if (Number.isFinite(n)) {
    if (n > 0 && n < 100000000000) return new Date(n * 1000);
    return new Date(n);
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

function getClientIp(req) {
  const xf = String(req.headers["x-forwarded-for"] || "").trim();
  if (xf) return xf.split(",")[0].trim();
  const xr = String(req.headers["x-real-ip"] || "").trim();
  if (xr) return xr;
  return String(req.ip || "").trim();
}

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

  try {
    const { data, error } = await supabase
      .from("usuarios")
      .select("uuid")
      .ilike("uid", k)
      .limit(1)
      .maybeSingle();

    if (!error && data?.uuid) return data.uuid;
  } catch {}

  return null;
}

async function fetchLastVoteForSite({ userUuid, username, ip }, siteId) {
  const patterns = patternsForSiteId(siteId);
  if (!patterns.length) return null;

  for (const p of patterns) {
    let q = supabase
      .from("votos")
      .select("vote_time, service")
      .order("vote_time", { ascending: false })
      .limit(1);

    if (userUuid) q = q.eq("user_uuid", userUuid);
    else if (username) q = q.ilike("username", String(username).trim());
    else if (ip) q = q.eq("ip", ip);
    else return null;

    q = q.ilike("service", `%${p}%`);

    const { data, error } = await q;
    if (!error && Array.isArray(data) && data.length) {
      const t = new Date(data[0].vote_time);
      if (!Number.isNaN(t.getTime())) return t;
    }
  }

  return null;
}

async function ingestVote(req, res) {
  const secretHeader = req.headers["x-vote-ingest-secret"];
  const secretEnv = process.env.VOTE_INGEST_SECRET;

  if (!secretEnv) {
    return res.status(500).json({ ok: false, error: "VOTE_INGEST_SECRET no configurado en el backend" });
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

  let user_uuid = null;
  try {
    const { data: u, error: uErr } = await supabase
      .from("usuarios")
      .select("uuid")
      .ilike("uid", username)
      .limit(1)
      .maybeSingle();

    if (!uErr && u?.uuid) user_uuid = u.uuid;
  } catch {}

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
        return res.status(200).json({ ok: true, inserted: false, duplicate: true, username, service });
      }

      return res.status(500).json({
        ok: false,
        error: "Error insertando voto",
        details: error.message || String(error),
      });
    }

    if (data?.user_uuid) {
      try {
await evaluateWebAchievementsForUser(data.user_uuid, {
  types: ["vote_count", "vote_streak", "account_age_days"],
});
      } catch (webAchievementError) {
        console.error("[WEB LOGROS VOTO EVAL ERROR]", {
          uuid: data.user_uuid,
          message: webAchievementError?.message || String(webAchievementError),
        });
      }
    }

    return res.status(200).json({ ok: true, inserted: true, duplicate: false, vote: data });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: "Excepción insertando voto",
      details: e?.message || String(e),
    });
  }
}

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

    return res.status(200).json({ ok: true, limit, offset, order: orderCol, items: data || [] });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: "Excepción obteniendo ranking",
      details: e?.message || String(e),
    });
  }
}

async function getResumen(req, res) {
  try {
    const now = new Date();
    const startTodayUtc = getUtcDayStart(now);
    const start7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const start30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const totalQ = supabase.from("votos").select("id", { count: "exact", head: true });
    const hoyQ = supabase.from("votos").select("id", { count: "exact", head: true }).gte("vote_time", startTodayUtc.toISOString());
    const d7Q = supabase.from("votos").select("id", { count: "exact", head: true }).gte("vote_time", start7d.toISOString());
    const d30Q = supabase.from("votos").select("id", { count: "exact", head: true }).gte("vote_time", start30d.toISOString());

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

async function getTop(req, res) {
  const range = String(req.query?.range || "30d").toLowerCase();
  const limitRaw = Number(req.query?.limit ?? 10);
  const pageRaw = Number(req.query?.page ?? 0);

  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 50) : 10;
  const page = Number.isFinite(pageRaw) ? Math.max(pageRaw, 0) : 0;
  const offset = page * limit;

  const col = range === "total" ? "total_votos" : "votos_30d";

  try {
    const { data, error, count } = await supabase
      .from("vista_ranking_votos")
      .select("jugador, username_lower, total_votos, votos_30d", { count: "exact" })
      .order(col, { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({
        ok: false,
        error: "Error obteniendo top",
        details: error.message || String(error),
      });
    }

    const rows = data || [];
    const names = rows
      .map((r) => String(r.jugador || r.username_lower || "").trim())
      .filter(Boolean);

    let usersMeta = [];
    if (names.length) {
      const { data: uu, error: uErr } = await supabase
        .from("usuarios")
        .select("uuid, uid, rango_usuario")
        .in("uid", names);

      if (!uErr && Array.isArray(uu)) usersMeta = uu;
    }

    const list = rows.map((r) => {
      const uid = String(r.jugador || r.username_lower || "Desconocido").trim();
      const votos = Number(r[col] || 0) || 0;

      const meta = usersMeta.find((u) => safeLower(u.uid) === safeLower(uid)) || null;

      return {
        uid,
        uuid: meta?.uuid || null,
        rango_usuario: meta?.rango_usuario || null,
        votos,
      };
    });

    return res.status(200).json({
      ok: true,
      total: Number(count || 0) || 0,
      page,
      limit,
      list,
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: "Excepción obteniendo top",
      details: e?.message || String(e),
    });
  }
}

async function getStatus(req, res) {
  const rawId = String(req.params?.id || "").trim();
  const qUser = String(req.query?.u || "").trim();
  const ip = getClientIp(req);

  const id = rawId && rawId.toLowerCase() !== "anon" ? rawId : "";
  const username = qUser || (id && !isUuid(id) ? id : "");

  try {
    const userUuid = id ? await resolveUserUuidFromKey(id) : null;

    let me = null;
    if (userUuid) {
      const { data: u, error: uErr } = await supabase
        .from("usuarios")
        .select("uuid, uid, rango_usuario, nivel")
        .eq("uuid", userUuid)
        .maybeSingle();

      if (!uErr && u?.uuid) me = u;
    } else if (username) {
      const { data: u, error: uErr } = await supabase
        .from("usuarios")
        .select("uuid, uid, rango_usuario, nivel")
        .ilike("uid", username)
        .maybeSingle();

      if (!uErr && u?.uid) me = u;
    }

    const nowMs = Date.now();
    const sites = ["v1", "v2", "v3", "v4", "v5"];
    const items = [];

    for (const siteId of sites) {
      const lastDate = await fetchLastVoteForSite({ userUuid, username, ip }, siteId);

      const lastVoteMs = lastDate ? lastDate.getTime() : 0;
      const nextAvailMs = lastVoteMs ? lastVoteMs + COOLDOWN_MS : 0;
      const available = !lastVoteMs || nowMs >= nextAvailMs;
      const left = available ? 0 : nextAvailMs - nowMs;

      items.push({
        id: siteId,
        last_vote_ms: lastVoteMs || 0,
        cooldown_ms: COOLDOWN_MS,
        next_available_ms: nextAvailMs || 0,
        available,
        left_ms: Math.max(0, Math.floor(left)),
      });
    }

    const done = items.filter((i) => i.available === false).length;
    const total = items.length;
    const remaining = total - done;
    const progress = total ? done / total : 0;

    return res.status(200).json({
      ok: true,
      server_now_ms: nowMs,
      cooldown_ms: COOLDOWN_MS,
      total,
      done,
      remaining,
      progress,
      me,
      items,
      hint: {
        used_uuid: !!userUuid,
        used_username: !!username,
        used_ip: !!ip,
      },
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