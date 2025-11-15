export const API_BASE = /api
export const routes = {
  salud: () => `${API_BASE}/ping`,
  recompensas: {
    listar: (uuid) => `${API_BASE}/recompensas/reclamadas/${uuid}`,
    reclamar: () => `${API_BASE}/recompensas/reclamar`
  }
}

