import React, { useEffect, useMemo, useState, useContext, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserContext } from "../../context/UserContext";
import {
  PencilSimple,
  Trash,
  FloppyDisk,
  ArrowLeft,
  CheckCircle,
  HourglassMedium,
  Skull,
  MagnifyingGlass,
  ArrowsClockwise,
  XCircle,
  Funnel,
} from "phosphor-react";
import "../../styles/components/Tribunal/_tribunaladmin.scss";
const API_BASE = import.meta.env.VITE_BACKEND_URL || "https://flancraft-backend.onrender.com";

const ESTADOS = [
  { key: "pendiente", label: "Pendiente" },
  { key: "revisado", label: "Revisado" },
  { key: "baneado", label: "Baneado" },
];

const MOTIVOS = [
  "hacks",
  "fly",
  "minar survival",
  "insultos",
  "tpakill",
  "granja de lag",
  "grif",
  "spam",
  "flood",
  "usar bugs",
  "estafas",
  "otros",
];

const normalizar = (v) => (v || "").toString().trim().toLowerCase();

const buildApiUrl = (path) => {
  const base = String(API_BASE || "").trim().replace(/\/+$/, "");
  if (!base) return path;
  if (/\/api$/i.test(base)) return `${base}${path.startsWith("/") ? path : `/${path}`}`;
  return `${base}/api${path.startsWith("/") ? path : `/${path}`}`;
};

const iconoEstado = (estadoVal) => {
  const props = { size: 18, weight: "duotone" };
  switch (normalizar(estadoVal || "pendiente")) {
    case "baneado":
      return <Skull {...props} />;
    case "revisado":
      return <CheckCircle {...props} />;
    default:
      return <HourglassMedium {...props} />;
  }
};

const labelEstado = (estadoVal) => {
  const k = normalizar(estadoVal || "pendiente");
  return ESTADOS.find((e) => e.key === k)?.label || "Pendiente";
};

const parseTimestamp = (ts) => {
  if (!ts) return 0;
  if (typeof ts === "number" && Number.isFinite(ts)) return ts < 1e12 ? ts * 1000 : ts;

  if (typeof ts === "string") {
    const trimmed = ts.trim();
    if (/^\d+$/.test(trimmed)) {
      const n = Number(trimmed);
      if (Number.isFinite(n)) return n < 1e12 ? n * 1000 : n;
    }
    const p = Date.parse(trimmed);
    return Number.isFinite(p) ? p : 0;
  }

  const n = Number(ts);
  if (Number.isFinite(n)) return n < 1e12 ? n * 1000 : n;
  return 0;
};

const parseDurationToMs = (raw) => {
  if (!raw) return null;
  const str = String(raw).toLowerCase().trim();
  if (/(perma|perm|permanent|infinite|∞)/.test(str)) return Infinity;

  if (/^\d+$/.test(str)) {
    const secs = Number(str);
    return secs * 1000;
  }

  const regex = /(\d+)\s*([smhd])/g;
  const unitMs = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  let total = 0;
  let match;

  while ((match = regex.exec(str)) !== null) {
    const val = parseInt(match[1], 10);
    const unit = match[2];
    total += val * (unitMs[unit] || 0);
  }

  return total > 0 ? total : null;
};

const formatearDuracion = (raw) => {
  if (!raw) return "Desconocida";
  const ms = parseDurationToMs(raw);
  if (ms === Infinity) return "Permaban";
  if (!ms) return String(raw);

  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);

  const partes = [];
  if (d) partes.push(`${d} ${d === 1 ? "día" : "días"}`);
  if (h) partes.push(`${h} ${h === 1 ? "hora" : "horas"}`);
  if (m) partes.push(`${m} ${m === 1 ? "minuto" : "minutos"}`);
  if (!d && !h && !m && s) partes.push(`${s} ${s === 1 ? "segundo" : "segundos"}`);
  return partes.length ? partes.join(" ") : String(raw);
};

const obtenerFechaFin = (timestamp, raw) => {
  const start = parseTimestamp(timestamp);
  if (!start) return null;
  const ms = parseDurationToMs(raw);
  if (!ms || ms === Infinity) return null;
  return new Date(start + ms).toLocaleString("es-ES");
};

const pickArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.data)) return payload.data;
  if (payload && Array.isArray(payload.items)) return payload.items;
  if (payload && payload.data && Array.isArray(payload.data.data)) return payload.data.data;
  return [];
};

export default function TribunalAdminPanel() {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();

  const [sanciones, setSanciones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [observacion, setObservacion] = useState("");
  const [estado, setEstado] = useState("pendiente");
  const [motivoEditado, setMotivoEditado] = useState("otros");

  const [q, setQ] = useState("");
  const [fEstado, setFEstado] = useState("todos");

  const denied = user === null || !user?.loggedIn || !user?.rol_admin;

  const cargarSanciones = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch(buildApiUrl("/sanciones"), {
        headers: { Accept: "application/json" },
      });

      const text = await res.text();
      let json = null;

      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = null;
      }

      if (!res.ok) {
        const msg = (json && (json.error || json.message)) || `HTTP ${res.status}`;
        throw new Error(msg);
      }

      const arr = pickArray(json);
      setSanciones(arr);
    } catch (err) {
      setSanciones([]);
      setErrorMsg(err?.message || "No se pudieron cargar las sanciones.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!denied) cargarSanciones();
  }, [denied, cargarSanciones]);

  const cerrarEdicion = () => {
    setEditingId(null);
    setObservacion("");
    setEstado("pendiente");
    setMotivoEditado("otros");
  };

  const guardarCambios = async (sancion) => {
    try {
      setLoading(true);
      setErrorMsg("");

      const res = await fetch(buildApiUrl(`/sanciones/${sancion.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          observacion,
          estado,
          type: motivoEditado,
          revisado_por: user?.uid || null,
        }),
      });

      const text = await res.text();
      let json = null;

      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = null;
      }

      if (!res.ok) {
        const msg = (json && (json.error || json.message)) || `HTTP ${res.status}`;
        throw new Error(msg);
      }

      await cargarSanciones();
      cerrarEdicion();
    } catch (err) {
      setErrorMsg(err?.message || "No se pudieron guardar los cambios.");
    } finally {
      setLoading(false);
    }
  };

  const eliminarSancion = async (id, nombre) => {
    if (!confirm(`¿Seguro que deseas eliminar la sanción de ${nombre}?`)) return;

    try {
      setLoading(true);
      setErrorMsg("");

      const res = await fetch(buildApiUrl(`/sanciones/${id}`), { method: "DELETE" });

      if (!res.ok) {
        const text = await res.text();
        let json = null;

        try {
          json = text ? JSON.parse(text) : null;
        } catch {
          json = null;
        }

        const msg = (json && (json.error || json.message)) || `HTTP ${res.status}`;
        throw new Error(msg);
      }

      await cargarSanciones();
    } catch (err) {
      setErrorMsg(err?.message || "No se pudo eliminar la sanción.");
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const total = sanciones.length;
    const pendientes = sanciones.filter((s) => normalizar(s.estado) === "pendiente").length;
    const revisadas = sanciones.filter((s) => normalizar(s.estado) === "revisado").length;
    const baneadas = sanciones.filter((s) => normalizar(s.estado) === "baneado").length;
    return { total, pendientes, revisadas, baneadas };
  }, [sanciones]);

  const sancionesFiltradas = useMemo(() => {
    const qq = normalizar(q);
    const est = normalizar(fEstado);

    const list = sanciones.filter((s) => {
      const name = normalizar(s.name);
      const type = normalizar(s.type);
      const obs = normalizar(s.observacion);
      const estadoRow = normalizar(s.estado) || "pendiente";

      const matchQ = !qq || name.includes(qq) || type.includes(qq) || obs.includes(qq);
      const matchEstado = est === "todos" ? true : estadoRow === est;

      return matchQ && matchEstado;
    });

    list.sort((a, b) => parseTimestamp(b.timestamp) - parseTimestamp(a.timestamp));
    return list;
  }, [sanciones, q, fEstado]);

  if (denied) {
    return (
      <section className="tribAdmin">
        <div className="tribAdmin__wrap tribAdmin__wrap--denied">
          <div className="tribAdmin__deniedCard">
            <img
              src="/assets/gandalf_minecraft.webp"
              alt="Acceso denegado"
              className="tribAdmin__deniedImg"
            />
            <h2 className="tribAdmin__deniedTitle">Acceso denegado</h2>
            <p className="tribAdmin__deniedDesc">No tienes permisos para entrar al panel.</p>
            <button className="tribBtn tribBtn--primary" onClick={() => navigate("/tribunal")}>
              <ArrowLeft size={18} weight="bold" />
              Volver al Tribunal
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="tribAdmin">
      <div className="tribAdmin__wrap">
        <div className="tribAdmin__topbar">
          <button className="tribBtn tribBtn--ghost" onClick={() => navigate("/tribunal")}>
            <ArrowLeft size={18} weight="bold" />
            Volver al Tribunal
          </button>

          <div className="tribAdmin__session">
            <span className="tribAdmin__sessionTag">Sesión</span>
            <span className="tribAdmin__sessionId" title={user?.uid}>
              {user?.uid}
            </span>
            <span className={`tribAdmin__role tribAdmin__role--${normalizar(user?.rol_admin)}`}>
              {user?.rol_admin}
            </span>
          </div>
        </div>

        <header className="tribAdmin__header">
          <div className="tribAdmin__titleWrap">
            <h1 className="tribAdmin__title">Panel de Administración</h1>
            <p className="tribAdmin__subtitle">Survival · Revisa sanciones, deja observaciones y marca su estado.</p>
          </div>

          <div className="tribAdmin__chips">
            <div className="statChip statChip--pending">
              <HourglassMedium size={18} weight="duotone" />
              <div>
                <div className="statChip__value">{stats.pendientes}</div>
                <div className="statChip__label">Pendientes</div>
              </div>
            </div>

            <div className="statChip statChip--reviewed">
              <CheckCircle size={18} weight="duotone" />
              <div>
                <div className="statChip__value">{stats.revisadas}</div>
                <div className="statChip__label">Revisadas</div>
              </div>
            </div>

            <div className="statChip statChip--banned">
              <Skull size={18} weight="duotone" />
              <div>
                <div className="statChip__value">{stats.baneadas}</div>
                <div className="statChip__label">Baneadas</div>
              </div>
            </div>

            <div className="statChip statChip--total">
              <Funnel size={18} weight="duotone" />
              <div>
                <div className="statChip__value">{stats.total}</div>
                <div className="statChip__label">Total</div>
              </div>
            </div>
          </div>
        </header>

        <div className="tribAdmin__controls">
          <div className="tribAdmin__search">
            <MagnifyingGlass size={18} weight="bold" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por jugador, motivo u observación…"
            />
            {q?.trim() && (
              <button className="iconBtn" onClick={() => setQ("")} aria-label="Limpiar búsqueda">
                <XCircle size={18} weight="fill" />
              </button>
            )}
          </div>

          <div className="tribAdmin__filters">
            <div className="selectWrap">
              <span className="selectWrap__label">Estado</span>
              <select value={fEstado} onChange={(e) => setFEstado(e.target.value)}>
                <option value="todos">Todos</option>
                {ESTADOS.map((e) => (
                  <option key={e.key} value={e.key}>
                    {e.label}
                  </option>
                ))}
              </select>
            </div>

            <button className="tribBtn tribBtn--primary" onClick={cargarSanciones} disabled={loading}>
              <ArrowsClockwise size={18} weight="bold" />
              {loading ? "Cargando…" : "Recargar"}
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="tribAdmin__error">
            <div className="tribAdmin__errorTitle">No se pudo cargar</div>
            <div className="tribAdmin__errorDesc">{errorMsg}</div>
            <div className="tribAdmin__errorHint">
              Endpoint: <span className="mono">{buildApiUrl("/sanciones")}</span>
            </div>
          </div>
        )}

        <div className="tribAdmin__tableWrap">
          <table className="tribAdmin__table">
            <thead>
              <tr>
                <th>Jugador</th>
                <th>Motivo</th>
                <th>Duración</th>
                <th>Estado</th>
                <th>Observación</th>
                <th>Acción</th>
              </tr>
            </thead>

            <tbody>
              {sancionesFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="tribAdmin__empty">
                    <div className="tribAdmin__emptyInner">
                      <Funnel size={22} weight="duotone" />
                      <div>
                        <div className="tribAdmin__emptyTitle">
                          {loading ? "Cargando…" : "No hay resultados"}
                        </div>
                        <div className="tribAdmin__emptyDesc">
                          {loading ? "Obteniendo sanciones del backend." : "Ajusta filtros o prueba otra búsqueda."}
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                sancionesFiltradas.map((s) => {
                  const estRow = normalizar(s.estado) || "pendiente";
                  const fechaFin = obtenerFechaFin(s.timestamp, s.duration);
                  const motivoRow = (s.type || "otros").toString().trim();
                  const motivoKey = normalizar(motivoRow).replace(/\s+/g, "-") || "otros";

                  return (
                    <tr key={s.id} className={`row row--${estRow}`}>
                      <td data-label="Jugador">
                        <Link to={`/perfil/${s.name}`} className="playerLink">
                          <div className="playerCell">
                            <div className="avatarFrame">
                              <img
                                src={`https://mc-heads.net/avatar/${s.name}/32`}
                                alt={s.name}
                                className="avatar"
                                loading="lazy"
                              />
                            </div>
                            <div className="playerMeta">
                              <div className="playerName">{s.name}</div>
                              <div className="playerSub" title={s.id}>
                                ID <span className="muted">{String(s.id || "").slice(0, 8)}…</span>
                              </div>
                            </div>
                          </div>
                        </Link>
                      </td>

                      <td data-label="Motivo">
                        {editingId === s.id ? (
                          <select
                            className="inlineSelect"
                            value={motivoEditado}
                            onChange={(e) => setMotivoEditado(e.target.value)}
                          >
                            {MOTIVOS.map((m) => (
                              <option key={m} value={m}>
                                {m}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className={`badge badge--motivo badge--${motivoKey}`} title={motivoRow}>
                            {motivoRow || "otros"}
                          </span>
                        )}
                      </td>

                      <td data-label="Duración">
                        <div className="duration">
                          <div className="duration__main">{formatearDuracion(s.duration)}</div>
                          {fechaFin && <div className="duration__sub">Termina: {fechaFin}</div>}
                        </div>
                      </td>

                      <td data-label="Estado">
                        <span className={`badge badge--estado badge--${estRow}`}>
                          <span className="badge__icon">{iconoEstado(estRow)}</span>
                          {labelEstado(estRow)}
                        </span>
                      </td>

                      <td data-label="Observación">
                        {editingId === s.id ? (
                          <textarea
                            className="inlineTextarea"
                            value={observacion}
                            onChange={(e) => setObservacion(e.target.value)}
                            placeholder="Escribe una observación clara…"
                          />
                        ) : (
                          <div className={`obs ${s.observacion ? "" : "obs--empty"}`}>
                            {s.observacion || "—"}
                          </div>
                        )}
                      </td>

                      <td data-label="Acción">
                        {editingId === s.id ? (
                          <div className="actions actions--edit">
                            <select
                              className="inlineSelect"
                              value={estado}
                              onChange={(e) => setEstado(e.target.value)}
                            >
                              {ESTADOS.map((e) => (
                                <option key={e.key} value={e.key}>
                                  {e.label}
                                </option>
                              ))}
                            </select>

                            <button className="tribBtn tribBtn--save" onClick={() => guardarCambios(s)} disabled={loading}>
                              <FloppyDisk size={18} weight="bold" />
                              Guardar
                            </button>

                            <button className="tribBtn tribBtn--ghost" onClick={cerrarEdicion} disabled={loading}>
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <div className="actions">
                            <button
                              className="tribBtn tribBtn--ghost"
                              onClick={() => {
                                setEditingId(s.id);
                                setObservacion(s.observacion || "");
                                setEstado(s.estado || "pendiente");
                                setMotivoEditado(s.type || "otros");
                              }}
                            >
                              <PencilSimple size={18} weight="bold" />
                              Editar
                            </button>

                            {(user.rol_admin === "admin" || user.rol_admin === "owner") && (
                              <button
                                className="tribBtn tribBtn--danger"
                                onClick={() => eliminarSancion(s.id, s.name)}
                                disabled={loading}
                              >
                                <Trash size={18} weight="bold" />
                                Eliminar
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          <div className="tribAdmin__foot">
            <div className="tribAdmin__footLeft">
              Mostrando <b>{sancionesFiltradas.length}</b> de <b>{sanciones.length}</b>
            </div>
            <div className="tribAdmin__footRight">
              <span className="hint">Observación ideal: qué pasó, evidencia y decisión.</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}