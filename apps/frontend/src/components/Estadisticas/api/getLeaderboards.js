const API_BASE = import.meta.env.VITE_BACKEND_URL || "http://localhost:10000";

export async function getLeaderboards({ tipo, servidor, limit = 10, offset = 0, asc }) {
  const params = new URLSearchParams();
  if (tipo) params.set("tipo", tipo);
  if (servidor) params.set("servidor", servidor);
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  if (typeof asc !== "undefined") params.set("asc", String(asc));

  const url = `${API_BASE}/api/stats/leaderboards?${params.toString()}`;
  const res = await fetch(url);

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Error leaderboard HTTP ${res.status} :: ${text}`);
  }

  return res.json();
}