const API_BASE = (
  import.meta.env.VITE_BACKEND_URL || "http://localhost:10000"
)
  .trim()
  .replace(/\/$/, "");

const toSafeInt = (value, fallback) => {
  const num = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(num) ? Math.max(0, num) : fallback;
};

export async function getLeaderboards({
  tipo,
  servidor,
  limit = 10,
  offset = 0,
  asc,
  signal,
} = {}) {
  const params = new URLSearchParams();

  if (tipo) params.set("tipo", String(tipo));
  if (servidor) params.set("servidor", String(servidor));

  params.set("limit", String(toSafeInt(limit, 10)));
  params.set("offset", String(toSafeInt(offset, 0)));

  if (typeof asc !== "undefined") {
    params.set("asc", String(Boolean(asc)));
  }

  const url = `${API_BASE}/api/stats/leaderboards?${params.toString()}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    signal,
  });

  const text = await res.text().catch(() => "");
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    const detail =
      data?.error || text || res.statusText || "Error desconocido";
    const error = new Error(`Error leaderboard HTTP ${res.status} :: ${detail}`);
    error.status = res.status;
    error.body = data ?? text;
    throw error;
  }

  return data ?? { total: 0, resultados: [] };
}

export { API_BASE };