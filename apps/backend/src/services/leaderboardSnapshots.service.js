const db = require("../models/db");

const SNAPSHOT_INTERVAL_MS = 60 * 60 * 1000;
const LOOKBACK_MS = 24 * 60 * 60 * 1000;

let snapshotWritePromise = null;

const safeNum = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const buildPlayerKey = (row) =>
  String(row?.uuid || row?.id || row?.nombre_minecraft || "")
    .trim()
    .toLowerCase();

const getCurrentPoints = (row) =>
  safeNum(
    row?.svpoints ??
      row?.total_points ??
      row?.points ??
      row?.puntos ??
      row?.puntos_sv ??
      row?.survival_points ??
      0
  );

const getCurrentPlaytime = (row) =>
  safeNum(row?.tiempo_jugado ?? row?.tiempo_total ?? 0);

async function getLatestSnapshotAt({ servidor, tipo }) {
  const { data, error } = await db
    .from("leaderboard_snapshots")
    .select("captured_at")
    .eq("servidor", servidor)
    .eq("tipo", tipo)
    .order("captured_at", { ascending: false })
    .limit(1);

  if (error) throw error;

  return data?.[0]?.captured_at || null;
}

async function getSnapshotAtOrBefore({ servidor, tipo, targetDate }) {
  const { data, error } = await db
    .from("leaderboard_snapshots")
    .select("captured_at")
    .eq("servidor", servidor)
    .eq("tipo", tipo)
    .lte("captured_at", targetDate.toISOString())
    .order("captured_at", { ascending: false })
    .limit(1);

  if (error) throw error;

  return data?.[0]?.captured_at || null;
}

async function getSnapshotRows({ servidor, tipo, capturedAt }) {
  if (!capturedAt) return [];

  const { data, error } = await db
    .from("leaderboard_snapshots")
    .select("player_key, rank_pos, points")
    .eq("servidor", servidor)
    .eq("tipo", tipo)
    .eq("captured_at", capturedAt);

  if (error) throw error;

  return Array.isArray(data) ? data : [];
}

async function enrichLeaderboardWith24hMovement({ servidor, tipo, rows }) {
  const list = Array.isArray(rows) ? rows : [];

  if (!list.length) {
    return [];
  }

  let previousRows = [];

  try {
    const targetDate = new Date(Date.now() - LOOKBACK_MS);
    const capturedAt = await getSnapshotAtOrBefore({ servidor, tipo, targetDate });

    if (capturedAt) {
      previousRows = await getSnapshotRows({ servidor, tipo, capturedAt });
    }
  } catch {
    previousRows = [];
  }

  const previousMap = new Map();

  for (const row of previousRows) {
    const playerKey = String(row?.player_key || "").trim().toLowerCase();
    if (!playerKey) continue;

    previousMap.set(playerKey, {
      rank_pos: safeNum(row?.rank_pos),
      points: safeNum(row?.points),
    });
  }

  return list.map((row, index) => {
    const currentRank = safeNum(row?.global_rank) || index + 1;
    const currentPoints = getCurrentPoints(row);
    const playerKey = buildPlayerKey(row);
    const previous = previousMap.get(playerKey);

    if (!previous) {
      return {
        ...row,
        global_rank: currentRank,
        rank_change_24h: null,
        points_gain_24h: null,
        is_new_24h: true,
      };
    }

    return {
      ...row,
      global_rank: currentRank,
      rank_change_24h: previous.rank_pos - currentRank,
      points_gain_24h: currentPoints - previous.points,
      is_new_24h: false,
    };
  });
}

async function maybeStoreLeaderboardSnapshot({ servidor, tipo, rows }) {
  const list = Array.isArray(rows) ? rows : [];

  if (!list.length) {
    return;
  }

  if (snapshotWritePromise) {
    return snapshotWritePromise;
  }

  snapshotWritePromise = (async () => {
    const latestCapturedAt = await getLatestSnapshotAt({ servidor, tipo });

    if (latestCapturedAt) {
      const elapsed = Date.now() - new Date(latestCapturedAt).getTime();
      if (elapsed < SNAPSHOT_INTERVAL_MS) {
        return;
      }
    }

    const capturedAt = new Date().toISOString();

    const payload = list
      .map((row, index) => {
        const playerKey = buildPlayerKey(row);

        if (!playerKey || !row?.nombre_minecraft) {
          return null;
        }

        return {
          servidor,
          tipo,
          captured_at: capturedAt,
          player_key: playerKey,
          uuid: row?.uuid || null,
          nombre_minecraft: String(row.nombre_minecraft),
          rank_pos: safeNum(row?.global_rank) || index + 1,
          points: getCurrentPoints(row),
          tiempo_jugado: getCurrentPlaytime(row),
        };
      })
      .filter(Boolean);

    if (!payload.length) {
      return;
    }

    const { error } = await db.from("leaderboard_snapshots").insert(payload);

    if (error) {
      throw error;
    }
  })();

  try {
    await snapshotWritePromise;
  } finally {
    snapshotWritePromise = null;
  }
}

module.exports = {
  enrichLeaderboardWith24hMovement,
  maybeStoreLeaderboardSnapshot,
};
