// src/api/getLeaderboards.js

export async function getLeaderboards({ tipo, servidor, limit = 10, offset = 0 }) {
  const params = new URLSearchParams();
  if (tipo) params.append("tipo", tipo);
  if (servidor) params.append("servidor", servidor);
  params.append("limit", limit);
  params.append("offset", offset);

  const res = await fetch(`https://flancraftweb-backend.onrender.com/api/stats/ranking?${params}`);
  if (!res.ok) throw new Error("Error al obtener el leaderboard");

  return await res.json(); // { total, resultados: [...] }
}
