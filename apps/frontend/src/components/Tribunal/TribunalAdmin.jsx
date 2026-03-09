import React, { useEffect, useMemo, useState, useContext, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserContext } from "../../context/UserContext";
import {
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
  WarningCircle,
  NotePencil,
} from "phosphor-react";
import {
  parseTimestamp,
  obtenerFechaFin,
  calcularSituacion,
  situacionLabel,
  avatarUrl,
  buildStrikeTimelineMap,
  getStrikeFromMap,
  getStrikeFeedback,
  getResumenEscala,
  getDuracionVisible,
  debeMostrarFechaFin,
  esPerma,
  esSancionActiva,
} from "./tribunalUtils";
import "../../styles/components/Tribunal/_tribunaladmin.scss";
import { getAuthToken } from "../../lib/auth/storage";
import { apiUrl } from "../../lib/env";
import Seo from "../SEO/Seo";

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

const SITUACIONES = [
  { key: "todas", label: "Todas" },
  { key: "activa", label: "Activas" },
  { key: "finalizada", label: "Finalizadas" },
  { key: "perma", label: "Permaban" },
];

const normalizar = (v) => (v || "").toString().trim().toLowerCase();

const buildApiUrl = (path) => apiUrl(path);

const buildAdminHeaders = (withJson = false) => {
  const headers = {
    Accept: "application/json",
  };

  if (withJson) headers["Content-Type"] = "application/json";
  const token = getAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  return headers;
};

const pickArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.data)) return payload.data;
  if (payload && Array.isArray(payload.items)) return payload.items;
  if (payload && payload.data && Array.isArray(payload.data.data)) return payload.data.data;
  return [];
};

const iconoSituacion = (situacion) => {
  const props = { size: 18, weight: "duotone" };
  if (situacion === "perma") return <Skull {...props} />;
  if (situacion === "activa") return <HourglassMedium {...props} />;
  return <CheckCircle {...props} />;
};

export default function TribunalAdminPanel() {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();

  const [sanciones, setSanciones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [notice, setNotice] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [observacion, setObservacion] = useState("");
  const [motivoEditado, setMotivoEditado] = useState("otros");

  const [q, setQ] = useState("");
  const [fSituacion, setFSituacion] = useState("todas");
  const [fMotivo, setFMotivo] = useState("todos");
  const [nowMs, setNowMs] = useState(() => Date.now());

  const denied = user === null || !user?.loggedIn || !user?.rol_admin;

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(null), 3200);
    return () => clearTimeout(id);
  }, [notice]);

  const cargarSanciones = useCallback(async (withNotice = false) => {
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

      if (withNotice) {
        setNotice({
          type: "success",
          message: `Panel actualizado. ${arr.length} registros cargados.`,
        });
      }
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
    setMotivoEditado("otros");
  };

  const guardarCambios = async (sancion) => {
    try {
      setBusyId(sancion.id);
      setErrorMsg("");

      const res = await fetch(buildApiUrl(`/sanciones/${sancion.id}`), {
        method: "PATCH",
        headers: buildAdminHeaders(true),
        body: JSON.stringify({
          observacion,
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
      setNotice({
        type: "success",
        message: `Registro de ${sancion.name} actualizado.`,
      });
    } catch (err) {
      setErrorMsg(err?.message || "No se pudieron guardar los cambios.");
    } finally {
      setBusyId(null);
    }
  };

  const eliminarSancion = async (id, nombre) => {
    if (!confirm(`¿Seguro que deseas eliminar la sanción de ${nombre}?`)) return;

    try {
      setBusyId(id);
      setErrorMsg("");

      const res = await fetch(buildApiUrl(`/sanciones/${id}`), {
        method: "DELETE",
        headers: buildAdminHeaders(false),
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
      setNotice({
        type: "success",
        message: `Registro de ${nombre} eliminado.`,
      });
    } catch (err) {
      setErrorMsg(err?.message || "No se pudo eliminar la sanción.");
    } finally {
      setBusyId(null);
    }
  };

  const sancionesConMeta = useMemo(
    () => sanciones.map((s, __rowIndex) => ({ ...s, __rowIndex })),
    [sanciones]
  );

  const strikesMap = useMemo(
    () => buildStrikeTimelineMap(sancionesConMeta),
    [sancionesConMeta]
  );

  const stats = useMemo(() => {
    const total = sancionesConMeta.length;
    let activas = 0;
    let finalizadas = 0;
    let permabans = 0;

    for (const s of sancionesConMeta) {
      const situacion = calcularSituacion(s, nowMs);
      if (situacion === "activa") activas++;
      if (situacion === "finalizada") finalizadas++;
      if (situacion === "perma") permabans++;
    }

    return { total, activas, finalizadas, permabans };
  }, [sancionesConMeta, nowMs]);

  const sancionesFiltradas = useMemo(() => {
    const qq = normalizar(q);
    const situacionFiltro = normalizar(fSituacion);
    const motivoFiltro = normalizar(fMotivo);

    const list = sancionesConMeta.filter((s) => {
      const name = normalizar(s.name);
      const type = normalizar(s.type);
      const moderator = normalizar(s.moderator);
      const obs = normalizar(s.observacion);
      const situacion = calcularSituacion(s, nowMs);

      const matchQ =
        !qq ||
        name.includes(qq) ||
        type.includes(qq) ||
        moderator.includes(qq) ||
        obs.includes(qq);

      const matchSituacion = situacionFiltro === "todas" ? true : situacion === situacionFiltro;
      const matchMotivo = motivoFiltro === "todos" ? true : type === motivoFiltro;

      return matchQ && matchSituacion && matchMotivo;
    });

    list.sort((a, b) => (parseTimestamp(b.timestamp) || 0) - (parseTimestamp(a.timestamp) || 0));
    return list;
  }, [sancionesConMeta, q, fSituacion, fMotivo, nowMs]);

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
    <>
      <Seo title="Panel interno | FlanCraft" noindex />
      <section className="tribAdmin">
      <div className="tribAdmin__wrap">
        <div className="tribAdmin__topbar">
          <button className="tribBtn tribBtn--ghost" onClick={() => navigate("/tribunal")}>
            <ArrowLeft size={18} weight="bold" />
            Volver al Tribunal
          </button>

          <div className="tribAdmin__session">
            <span className="tribAdmin__sessionTag">Sesión</span>
            <span className={`tribAdmin__role tribAdmin__role--${normalizar(user?.rol_admin)}`}>
              {user?.rol_admin}
            </span>
          </div>
        </div>

        <header className="tribAdmin__header">
          <div className="tribAdmin__titleWrap">
            <h1 className="tribAdmin__title">Panel de Tribunal</h1>
            <p className="tribAdmin__subtitle">
              Survival · Este panel sirve para auditar registros, añadir notas internas,
              corregir motivos mal clasificados y eliminar entradas erróneas.
            </p>

            <div className="tribAdmin__explain">
              La sanción ya ha sido aplicada por el sistema. Aquí no se decide el castigo: aquí se revisa el registro.
            </div>
          </div>

          <div className="tribAdmin__chips">
            <div className="statChip statChip--pending">
              <HourglassMedium size={18} weight="duotone" />
              <div>
                <div className="statChip__value">{stats.activas}</div>
                <div className="statChip__label">Activas</div>
              </div>
            </div>

            <div className="statChip statChip--reviewed">
              <CheckCircle size={18} weight="duotone" />
              <div>
                <div className="statChip__value">{stats.finalizadas}</div>
                <div className="statChip__label">Finalizadas</div>
              </div>
            </div>

            <div className="statChip statChip--banned">
              <Skull size={18} weight="duotone" />
              <div>
                <div className="statChip__value">{stats.permabans}</div>
                <div className="statChip__label">Permaban</div>
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
              placeholder="Buscar por jugador, moderador, motivo o nota…"
            />
            {q?.trim() && (
              <button className="iconBtn" onClick={() => setQ("")} aria-label="Limpiar búsqueda">
                <XCircle size={18} weight="fill" />
              </button>
            )}
          </div>

          <div className="tribAdmin__filters">
            <div className="selectWrap">
              <span className="selectWrap__label">Situación</span>
              <select value={fSituacion} onChange={(e) => setFSituacion(e.target.value)}>
                {SITUACIONES.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="selectWrap">
              <span className="selectWrap__label">Motivo</span>
              <select value={fMotivo} onChange={(e) => setFMotivo(e.target.value)}>
                <option value="todos">Todos</option>
                {MOTIVOS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <button
              className="tribBtn tribBtn--primary"
              onClick={() => cargarSanciones(true)}
              disabled={loading}
            >
              <ArrowsClockwise size={18} weight="bold" />
              {loading ? "Cargando…" : "Actualizar"}
            </button>
          </div>
        </div>

        {notice && (
          <div className={`tribAdmin__notice tribAdmin__notice--${notice.type}`}>
            <div className="tribAdmin__noticeTitle">Hecho</div>
            <div className="tribAdmin__noticeDesc">{notice.message}</div>
          </div>
        )}

        {errorMsg && (
          <div className="tribAdmin__error">
            <div className="tribAdmin__errorTitle">Ha ocurrido un problema</div>
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
                <th className="colJugador">Jugador</th>
                <th className="colModerador">Moderador</th>
                <th className="colMotivo">Motivo</th>
                <th className="colEscala">Escala</th>
                <th className="colDuracion">Duración</th>
                <th className="colSituacion">Situación</th>
                <th className="colNota">Nota interna</th>
                <th className="colAccion">Acción</th>
              </tr>
            </thead>

            <tbody>
              {sancionesFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="tribAdmin__empty">
                    <div className="tribAdmin__emptyInner">
                      <Funnel size={22} weight="duotone" />
                      <div>
                        <div className="tribAdmin__emptyTitle">
                          {loading ? "Cargando…" : "No hay resultados"}
                        </div>
                        <div className="tribAdmin__emptyDesc">
                          {loading
                            ? "Obteniendo registros del backend."
                            : "Prueba otra búsqueda o ajusta los filtros."}
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                sancionesFiltradas.map((s) => {
                  const strike = getStrikeFromMap(strikesMap, s.__rowIndex);
                  const strikeFeedback = getStrikeFeedback(s.type, strike, s);
                  const resumenEscala = getResumenEscala(strike, strikeFeedback.accion, s);
                  const duracionVisible = getDuracionVisible(s.duration, strikeFeedback.accion, s);
                  const fechaFin = debeMostrarFechaFin(s.duration, strikeFeedback.accion, s)
                    ? obtenerFechaFin(s.timestamp, s.duration)
                    : null;
                  const situacion = calcularSituacion(s, nowMs);
                  const fechaMs = parseTimestamp(s.timestamp);
                  const fechaTexto = fechaMs ? new Date(fechaMs).toLocaleString("es-ES") : "-";
                  const motivoRow = (s.type || "otros").toString().trim();
                  const motivoKey = normalizar(motivoRow).replace(/\s+/g, "-") || "otros";
                  const isBusy = busyId === s.id;
                  const isEditing = editingId === s.id;
                  const perma = esPerma(s);
                  const activa = esSancionActiva(s, nowMs);

                  return (
                    <tr key={s.id} className={`row row--${situacion}`}>
                      <td data-label="Jugador">
                        <Link to={`/perfil/${s.name}`} className="playerLink">
                          <div className="playerCell">
                            <div className="avatarFrame">
                              <img
                                src={avatarUrl(s.name, 32)}
                                alt={s.name}
                                className="avatar"
                                loading="lazy"
                                decoding="async"
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

                      <td data-label="Moderador">
                        <div className="moderatorCell">
                          <div className="moderatorCell__name">{s.moderator || "Sistema"}</div>
                          <div className="moderatorCell__date">{fechaTexto}</div>
                        </div>
                      </td>

                      <td data-label="Motivo">
                        {isEditing ? (
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

                      <td data-label="Escala">
                        {resumenEscala ? (
                          <div className={`strikeBadge ${/ban\s*perm/i.test(resumenEscala) ? "permaban" : ""}`}>
                            <WarningCircle size={14} weight="duotone" />
                            <span>{resumenEscala}</span>
                          </div>
                        ) : (
                          <span className="muted">Sin escala detectada</span>
                        )}
                      </td>

                      <td data-label="Duración">
                        <div className="duration">
                          <div className="duration__main">{duracionVisible}</div>
                          {fechaFin && <div className="duration__sub">Finaliza: {fechaFin}</div>}
                          {!fechaFin && perma && <div className="duration__sub">Sin caducidad</div>}
                          {!fechaFin && !perma && !activa && <div className="duration__sub">Ya cumplida</div>}
                        </div>
                      </td>

                      <td data-label="Situación">
                        <span className={`badge badge--estado badge--${situacion}`}>
                          <span className="badge__icon">{iconoSituacion(situacion)}</span>
                          {situacionLabel(situacion)}
                        </span>
                      </td>

                      <td data-label="Nota interna">
                        {isEditing ? (
                          <textarea
                            className="inlineTextarea"
                            value={observacion}
                            onChange={(e) => setObservacion(e.target.value)}
                            placeholder="Añade contexto interno o corrige detalles del registro…"
                          />
                        ) : (
                          <div className={`obs ${s.observacion ? "" : "obs--empty"}`}>
                            {s.observacion || "Sin nota interna"}
                          </div>
                        )}
                      </td>

                      <td data-label="Acción">
                        {isEditing ? (
                          <div className="actions actions--edit">
                            <button
                              className="tribBtn tribBtn--save"
                              onClick={() => guardarCambios(s)}
                              disabled={isBusy}
                            >
                              <FloppyDisk size={18} weight="bold" />
                              {isBusy ? "Guardando…" : "Guardar"}
                            </button>

                            <button
                              className="tribBtn tribBtn--ghost"
                              onClick={cerrarEdicion}
                              disabled={isBusy}
                            >
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
                                setMotivoEditado(s.type || "otros");
                              }}
                              disabled={isBusy}
                            >
                              <NotePencil size={18} weight="bold" />
                              Anotar
                            </button>

                            {(user?.rol_admin === "admin" || user?.rol_admin === "owner") && (
                              <button
                                className="tribBtn tribBtn--danger"
                                onClick={() => eliminarSancion(s.id, s.name)}
                                disabled={isBusy}
                              >
                                <Trash size={18} weight="bold" />
                                {isBusy ? "Eliminando…" : "Eliminar"}
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
              <span className="hint">
                Uso recomendado: corregir motivo, añadir nota interna o borrar registros erróneos.
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
    </>
  );
}