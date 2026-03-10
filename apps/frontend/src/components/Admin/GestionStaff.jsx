import React, { useEffect, useMemo, useRef, useState, useContext, useCallback } from "react";
import { UserContext } from "../../context/UserContext";
import { apiUrl } from "../../lib/env";
import { getAuthToken } from "../../lib/auth/storage";
import Seo from "../SEO/Seo";
import "../../styles/components/Admin/_gestionstaff.scss";

function UiShield() {
  return (
    <svg className="ui-svg" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.4c3.2 2.5 6.8 3.1 8.6 3.4v7.2c0 5.2-3.8 8.8-8.6 9.6C7.2 21.8 3.4 18.2 3.4 13V5.8C5.2 5.5 8.8 4.9 12 2.4Z" className="ui-fill" />
      <path d="M12 4.2c-2.7 1.9-5.7 2.6-7.1 2.8V13c0 4.2 3.2 7.1 7.1 7.7 3.9-.6 7.1-3.5 7.1-7.7V7c-1.4-.2-4.4-.9-7.1-2.8Z" className="ui-stroke" />
      <path d="M12 7.1v10.3" className="ui-stroke-soft" />
      <path d="M8.2 10.1h7.6" className="ui-stroke-soft" />
    </svg>
  );
}

function UiRefresh() {
  return (
    <svg className="ui-svg" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 12a8 8 0 0 1-13.7 5.6" className="ui-stroke" />
      <path d="M4 12a8 8 0 0 1 13.7-5.6" className="ui-stroke" />
      <path d="M6.3 17.6 6 21l3.3-1.2" className="ui-stroke-soft" />
      <path d="M17.7 6.4 18 3l-3.3 1.2" className="ui-stroke-soft" />
    </svg>
  );
}

function UiSearch() {
  return (
    <svg className="ui-svg" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="6.6" className="ui-stroke" />
      <path d="M16.2 16.2 21 21" className="ui-stroke" />
      <path d="M8.2 9.3c.8-1.4 2.2-2.2 3.8-2.2" className="ui-stroke-soft" />
    </svg>
  );
}

function UiCheck() {
  return (
    <svg className="ui-svg" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 6 9.6 18 4 12.5" className="ui-stroke" />
      <path d="M12 2.8c5.1 0 9.2 4.1 9.2 9.2S17.1 21.2 12 21.2 2.8 17.1 2.8 12 6.9 2.8 12 2.8Z" className="ui-stroke-soft" />
    </svg>
  );
}

function UiX() {
  return (
    <svg className="ui-svg" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 7l10 10M17 7 7 17" className="ui-stroke" />
      <path d="M12 2.8c5.1 0 9.2 4.1 9.2 9.2S17.1 21.2 12 21.2 2.8 17.1 2.8 12 6.9 2.8 12 2.8Z" className="ui-stroke-soft" />
    </svg>
  );
}

const PREMIUM_ICON = "/assets/premium.webp";

const RANGO_ICONS = {
  nova: "/assets/rangos/nova.webp",
  alpha: "/assets/rangos/alpha.webp",
  inmortal: "/assets/rangos/inmortal.webp",
};

const STAFF_ROLE_ORDER = ["owner", "admin", "srmod", "mod", "srhelper", "helper", "builder"];
const STAFF_ROLE_WEIGHT = {
  owner: 0,
  admin: 1,
  srmod: 2,
  mod: 3,
  srhelper: 4,
  helper: 5,
  builder: 6,
};

function normalizeRole(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function normalizeUserRank(value) {
  const rank = normalizeRole(value);
  return ["nova", "alpha", "inmortal"].includes(rank) ? rank : "";
}

function getAuthHeaders(extra = {}) {
  const token = getAuthToken();
  return {
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export default function GestionStaff() {
  const { user } = useContext(UserContext);

  const [usuarios, setUsuarios] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [busquedaLive, setBusquedaLive] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [rowBusy, setRowBusy] = useState({});

  const abortRef = useRef(null);

  const sessionStaffRole = normalizeRole(user?.rango_staff || user?.rol_admin);
  const isOwner = !!user?.loggedIn && sessionStaffRole === "owner";

  const pushToast = useCallback((mensaje, tipo = "success") => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((prev) => [{ id, mensaje, tipo }, ...prev].slice(0, 4));
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, 3200);
  }, []);

  const setBusy = useCallback((uuid, patch) => {
    setRowBusy((prev) => ({
      ...prev,
      [uuid]: { ...(prev[uuid] || {}), ...patch },
    }));
  }, []);

  const cargarDatos = useCallback(
    async ({ silent = false } = {}) => {
      if (!isOwner) return false;

      if (!silent) setLoading(true);
      setError(null);

      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(apiUrl(`/api/usuarios`), {
          signal: controller.signal,
          headers: getAuthHeaders(),
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(data?.error || "No se pudieron cargar los datos del panel.");
        }

        setUsuarios(Array.isArray(data) ? data : []);
        return true;
      } catch (err) {
        if (err?.name === "AbortError") return false;
        setError(err?.message || "Error inesperado cargando datos.");
        return false;
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [isOwner]
  );

  useEffect(() => {
    if (isOwner) {
      cargarDatos();
    } else {
      setUsuarios([]);
      setLoading(false);
    }

    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [isOwner, cargarDatos]);

  useEffect(() => {
    const t = window.setTimeout(() => setBusquedaLive(busqueda), 120);
    return () => window.clearTimeout(t);
  }, [busqueda]);

  const usuariosFiltrados = useMemo(() => {
    const q = String(busquedaLive || "").trim().toLowerCase();
    const list = Array.isArray(usuarios) ? [...usuarios] : [];

    const filtered = !q
      ? list
      : list.filter((u) => String(u?.uid || "").toLowerCase().includes(q));

    return filtered.sort((a, b) => {
      const roleA = normalizeRole(a?.rango_staff || a?.rol_admin);
      const roleB = normalizeRole(b?.rango_staff || b?.rol_admin);

      const weightA = STAFF_ROLE_WEIGHT[roleA] ?? 999;
      const weightB = STAFF_ROLE_WEIGHT[roleB] ?? 999;

      if (weightA !== weightB) return weightA - weightB;

      const premiumA = a?.es_premium === true ? 0 : 1;
      const premiumB = b?.es_premium === true ? 0 : 1;

      if (premiumA !== premiumB) return premiumA - premiumB;

      return String(a?.uid || "").localeCompare(String(b?.uid || ""), "es", {
        sensitivity: "base",
      });
    });
  }, [usuarios, busquedaLive]);

  const refresh = async () => {
    setRefreshing(true);
    const ok = await cargarDatos({ silent: true });
    setRefreshing(false);
    if (ok) pushToast("Datos actualizados", "success");
  };

  const actualizarPermiso = async (uuid, nuevoRol) => {
    try {
      setBusy(uuid, { permiso: true });

      if (!nuevoRol) {
        const res = await fetch(apiUrl(`/api/permisos-admin/${uuid}`), {
          method: "DELETE",
          headers: getAuthHeaders(),
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(data?.error || "No se pudo eliminar el permiso.");
        }

        pushToast("Permiso eliminado", "success");
      } else {
        const res = await fetch(apiUrl(`/api/permisos-admin`), {
          method: "POST",
          headers: getAuthHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ uuid, rol: nuevoRol }),
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(data?.error || "No se pudo asignar el permiso.");
        }

        pushToast("Permiso actualizado", "success");
      }

      await cargarDatos({ silent: true });
    } catch (err) {
      pushToast(`Error: ${err.message || "Acción fallida"}`, "error");
    } finally {
      setBusy(uuid, { permiso: false });
    }
  };

  const actualizarRango = async (uuid, nuevoRango) => {
    try {
      setBusy(uuid, { rango: true });

      const res = await fetch(apiUrl(`/api/usuarios/rango`), {
        method: "PATCH",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ uuid, rango_usuario: nuevoRango || null }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "No se pudo actualizar el rango.");
      }

      pushToast("Rango actualizado", "success");
      await cargarDatos({ silent: true });
    } catch (err) {
      pushToast(`Error: ${err.message || "Acción fallida"}`, "error");
    } finally {
      setBusy(uuid, { rango: false });
    }
  };

  const actualizarPremium = async (uuid, value) => {
    try {
      if (value === "") return;

      const nuevoEstado = value === "true";

      setBusy(uuid, { premium: true });

      const res = await fetch(apiUrl(`/api/usuarios/premium`), {
        method: "PATCH",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ uuid, es_premium: nuevoEstado }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "No se pudo actualizar el estado premium.");
      }

      pushToast("Premium actualizado", "success");
      await cargarDatos({ silent: true });
    } catch (err) {
      pushToast(`Error: ${err.message || "Acción fallida"}`, "error");
    } finally {
      setBusy(uuid, { premium: false });
    }
  };

  if (!isOwner) {
    return (
      <div className="staffpanel-denied">
        <div className="staffpanel-denied__frame">
          <img
            src="/assets/gandalf_minecraft.webp"
            alt="Acceso denegado"
            className="staffpanel-denied__img"
          />
          <h2 className="staffpanel-denied__title">¡No tienes poder aquí!</h2>
          <p className="staffpanel-denied__text">
            Acceso denegado al panel de gestión de staff.
          </p>
        </div>
      </div>
    );
  }

  const total = usuarios.length;
  const filtrados = usuariosFiltrados.length;

  return (
    <>
      <Seo title="Panel interno | FlanCraft" noindex />
      <div className="staffwrap">
        <section className="staffwrap__panel">
          <div className="staffwrap__header">
            <div className="staffwrap__titlebox">
              <div className="staffwrap__crest" aria-hidden="true">
                <UiShield />
              </div>
              <div className="staffwrap__titles">
                <h1 className="staffwrap__title">Gestión de Staff y Rangos</h1>
                <p className="staffwrap__subtitle">
                  Control total de permisos, rangos y premium, con sincronización inmediata.
                </p>
              </div>
            </div>

            <button
              className={`staffwrap__btnRefresh ${refreshing ? "is-loading" : ""}`}
              onClick={refresh}
              type="button"
              title="Actualizar datos"
            >
              <span className="staffwrap__btnIcon" aria-hidden="true">
                <UiRefresh />
              </span>
              <span>Actualizar</span>
            </button>
          </div>

          <div className="staffwrap__divider" aria-hidden="true" />

          <div className="staffwrap__toolbar">
            <div className="staffwrap__search">
              <span className="staffwrap__searchIcon" aria-hidden="true">
                <UiSearch />
              </span>

              <input
                className="staffwrap__searchInput"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar jugador por nombre..."
                autoComplete="off"
                spellCheck={false}
              />

              <div className="staffwrap__count" title="Mostrados / Total">
                <span className="staffwrap__countStrong">{filtrados}</span>
                <span className="staffwrap__countSep">/</span>
                <span>{total}</span>
              </div>
            </div>

            {error && (
              <div className="staffwrap__error">
                <div className="staffwrap__errorTitle">No se pudo cargar</div>
                <div className="staffwrap__errorMsg">{error}</div>
                <button className="staffwrap__retry" onClick={() => cargarDatos()}>
                  Reintentar
                </button>
              </div>
            )}
          </div>

          <div className="staffwrap__list">
            <div className="staffrowHead">
              <div className="staffrowHead__left">Jugador</div>
              <div className="staffrowHead__right">
                <span>Permiso</span>
                <span>Rango</span>
                <span>Premium</span>
              </div>
            </div>

            {loading ? (
              <div className="staffrows staffrows--skeleton">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="staffrow staffrow--skeleton">
                    <div className="staffrow__left">
                      <div className="skel skel-avatar" />
                      <div className="staffrow__ident">
                        <div className="skel skel-name" />
                        <div className="skel skel-uuid" />
                        <div className="skel skel-icons" />
                      </div>
                    </div>
                    <div className="staffrow__right">
                      <div className="skel skel-select" />
                      <div className="skel skel-select" />
                      <div className="skel skel-select" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="staffrows">
                {usuariosFiltrados.map((u) => {
                  const rol = normalizeRole(u?.rango_staff || u?.rol_admin);
                  const busy = rowBusy[u.uuid] || {};
                  const isBusy = !!(busy.permiso || busy.rango || busy.premium);

                  const premiumValue =
                    u.es_premium === true ? "true" : u.es_premium === false ? "false" : "";

                  const premiumTone =
                    premiumValue === "true"
                      ? "premium"
                      : premiumValue === "false"
                      ? "nopremium"
                      : "none";

                  const rangoValue = normalizeUserRank(u?.rango_usuario);
                  const rangoTone = rangoValue || "none";
                  const rangoIcon = rangoValue ? RANGO_ICONS[rangoValue] : null;
                  const avatarName = encodeURIComponent(String(u?.uid || "Steve"));

                  return (
                    <article key={u.uuid} className={`staffrow ${isBusy ? "is-busy" : ""}`}>
                      <div className="staffrow__left">
                        <div className="staffrow__avatarWrap">
                          <img
                            className="staffrow__avatar"
                            src={`https://mc-heads.net/avatar/${avatarName}/56`}
                            alt={u.uid}
                            loading="lazy"
                          />
                          <span className="staffrow__avatarRing" aria-hidden="true" />
                        </div>

                        <div className="staffrow__ident">
                          <div className="staffrow__nameLine">
                            <strong className="staffrow__name">{u.uid}</strong>

                            {rol && (
                              <span className={`staffstamp staffstamp--${rol}`}>
                                <span className="staffstamp__dot" aria-hidden="true" />
                                {rol.toUpperCase()}
                              </span>
                            )}
                          </div>

                          <div className="staffrow__uuid mono">{u.uuid}</div>

                          <div className="staffrow__icons">
                            {rangoIcon ? (
                              <span
                                className={`assetBadge assetBadge--rango assetBadge--${rangoTone}`}
                                title={`Rango: ${rangoValue}`}
                              >
                                <img src={rangoIcon} alt={rangoValue} />
                              </span>
                            ) : (
                              <span className="assetBadge assetBadge--empty" title="Sin rango">
                                <span>—</span>
                              </span>
                            )}

                            {u.es_premium === true ? (
                              <span className="assetBadge assetBadge--premiumOn" title="Premium">
                                <img src={PREMIUM_ICON} alt="Premium" />
                              </span>
                            ) : (
                              <span className="assetBadge assetBadge--empty" title="No premium">
                                <span>—</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="staffrow__right">
                        <div className="ctrl">
                          <label>Permiso</label>
                          <div className={`selectWrap tone tone--${rol || "none"}`}>
                            <select
                              value={rol}
                              onChange={(e) => actualizarPermiso(u.uuid, e.target.value)}
                              disabled={!!busy.permiso}
                            >
                              <option value="">Sin permiso</option>
                              {STAFF_ROLE_ORDER.map((staffRole) => (
                                <option key={staffRole} value={staffRole}>
                                  {staffRole.toUpperCase()}
                                </option>
                              ))}
                            </select>
                          </div>
                          {busy.permiso && <span className="hint">Guardando…</span>}
                        </div>

                        <div className="ctrl">
                          <label>Rango</label>
                          <div className={`selectWrap tone tone--${rangoTone}`}>
                            <select
                              value={rangoValue}
                              onChange={(e) => actualizarRango(u.uuid, e.target.value)}
                              disabled={!!busy.rango}
                            >
                              <option value="">Sin rango</option>
                              <option value="nova">Nova</option>
                              <option value="alpha">Alpha</option>
                              <option value="inmortal">Inmortal</option>
                            </select>
                          </div>
                          {busy.rango && <span className="hint">Guardando…</span>}
                        </div>

                        <div className="ctrl">
                          <label>Premium</label>
                          <div className={`selectWrap tone tone--${premiumTone}`}>
                            <select
                              value={premiumValue}
                              onChange={(e) => actualizarPremium(u.uuid, e.target.value)}
                              disabled={!!busy.premium}
                            >
                              <option value="">Sin definir</option>
                              <option value="true">Sí Premium</option>
                              <option value="false">No Premium</option>
                            </select>
                          </div>
                          {busy.premium && <span className="hint">Guardando…</span>}
                        </div>
                      </div>

                      {isBusy && (
                        <div className="staffrow__busyOverlay" aria-hidden="true">
                          <div className="staffrow__busySpinner" />
                          <span>Aplicando cambios…</span>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <div className="toaststack" aria-live="polite" aria-atomic="true">
          {toasts.map((t) => (
            <div key={t.id} className={`toast toast--${t.tipo}`}>
              <div className="toast__icon" aria-hidden="true">
                {t.tipo === "success" ? <UiCheck /> : <UiX />}
              </div>
              <div className="toast__msg">{t.mensaje}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}