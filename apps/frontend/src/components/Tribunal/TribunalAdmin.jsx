import React, { useEffect, useMemo, useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserContext } from "../../context/UserContext";
import {
  PencilSimple,
  Trash,
  FloppyDisk,
  ArrowLeft,
  Tree,
  Fire,
  PaintBrush,
  Cube,
  CrownSimple,
  Sword,
  PersonSimpleRun,
  Globe,
  CheckCircle,
  HourglassMedium,
  Skull,
  MagnifyingGlass,
  ArrowsClockwise,
  XCircle,
  Funnel,
} from "phosphor-react";

import "../../styles/components/Tribunal/_tribunaladmin.scss";

const API_BASE = "https://flancraft-backend.onrender.com";

export default function AdminPanel() {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();

  const [sanciones, setSanciones] = useState([]);
  const [loading, setLoading] = useState(false);

  // edición
  const [editingId, setEditingId] = useState(null);
  const [observacion, setObservacion] = useState("");
  const [estado, setEstado] = useState("pendiente");
  const [motivoEditado, setMotivoEditado] = useState("");

  // filtros UI
  const [q, setQ] = useState("");
  const [fServidor, setFServidor] = useState("todos");
  const [fEstado, setFEstado] = useState("todos");

  const motivos = [
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

  // ====== ACL ======
  if (user === null || !user?.loggedIn || !user?.rol_admin) {
    return (
      <section className="tribAdmin">
        <div className="tribAdmin__wrap tribAdmin__wrap--denied">
          <div className="tribAdmin__deniedCard">
            <img
              src="/assets/gandalf_minecraft.webp"
              alt="No tienes poder aquí"
              className="tribAdmin__deniedImg"
            />
            <h2 className="tribAdmin__deniedTitle">¡No tienes poder aquí!</h2>
            <p className="tribAdmin__deniedDesc">
              Acceso denegado al panel administrativo.
            </p>
            <button className="tribBtn tribBtn--primary" onClick={() => navigate("/tribunal")}>
              <ArrowLeft size={18} weight="bold" />
              Volver al Tribunal
            </button>
          </div>
        </div>
      </section>
    );
  }

  // ====== LOAD ======
  useEffect(() => {
    if (user?.loggedIn && user?.rol_admin) cargarSanciones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.loggedIn, user?.rol_admin]);

  const cargarSanciones = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/sanciones`);
      const data = await res.json();
      setSanciones(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error cargando sanciones", err);
      setSanciones([]);
    } finally {
      setLoading(false);
    }
  };

  const guardarCambios = async (sancion) => {
    try {
      await fetch(`${API_BASE}/api/sanciones/${sancion.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          observacion,
          estado,
          type: motivoEditado,
          revisado_por: user.uid,
        }),
      });

      await cargarSanciones();
      cerrarEdicion();
    } catch (err) {
      console.error("Error guardando cambios", err);
    }
  };

  const eliminarSancion = async (id, nombre) => {
    // eslint-disable-next-line no-restricted-globals
    if (!confirm(`¿Seguro que deseas eliminar la sanción de ${nombre}?`)) return;
    try {
      await fetch(`${API_BASE}/api/sanciones/${id}`, { method: "DELETE" });
      await cargarSanciones();
    } catch (err) {
      console.error("Error al eliminar sanción", err);
    }
  };

  const cerrarEdicion = () => {
    setEditingId(null);
    setObservacion("");
    setEstado("pendiente");
    setMotivoEditado("");
  };

  // ====== HELPERS ======
  const obtenerNombreServidor = (raw) => {
    const mapa = {
      survival: "Survival",
      anarquico: "Anárquico",
      creativo: "Creativo",
      oneblock: "OneBlock",
      kingdoms: "Kingdoms",
      boxpvp: "BoxPvP",
      parkour: "Parkour",
      "play.flancraft.com": "Lobby",
    };
    return mapa[raw?.toLowerCase()] || "Servidor desconocido";
  };

  const obtenerIconoServidor = (server) => {
    const baseProps = { size: 16, weight: "fill" };
    const mapa = {
      survival: <Tree {...baseProps} />,
      anarquico: <Fire {...baseProps} />,
      creativo: <PaintBrush {...baseProps} />,
      oneblock: <Cube {...baseProps} />,
      kingdoms: <CrownSimple {...baseProps} />,
      boxpvp: <Sword {...baseProps} />,
      parkour: <PersonSimpleRun {...baseProps} />,
      "play.flancraft.com": <Globe {...baseProps} />,
    };
    return mapa[server?.toLowerCase()] || <Globe {...baseProps} />;
  };

  const obtenerIconoEstado = (estadoVal) => {
    const props = { size: 18, weight: "duotone" };
    switch ((estadoVal || "pendiente").toLowerCase()) {
      case "baneado":
        return <Skull {...props} />;
      case "revisado":
        return <CheckCircle {...props} />;
      case "pendiente":
      default:
        return <HourglassMedium {...props} />;
    }
  };

  const formatearDuracion = (duracionRaw) => {
    if (!duracionRaw) return "Desconocida";
    const match = duracionRaw.toLowerCase().match(/(\d+)([smhd])/);
    if (!match) return duracionRaw;
    const valor = parseInt(match[1], 10);
    const unidad = match[2];
    const unidades = { s: "segundo", m: "minuto", h: "hora", d: "día" };
    const u = unidades[unidad] || "";
    return `${valor} ${u}${valor !== 1 ? "s" : ""}`;
  };

  const obtenerFechaFin = (timestamp, duracionRaw) => {
    const match = duracionRaw?.toLowerCase().match(/(\d+)([smhd])/);
    if (!match) return null;
    const valor = parseInt(match[1], 10);
    const unidad = match[2];
    const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    const ms = valor * (multipliers[unidad] || 0);
    const ts = parseInt(timestamp, 10);
    if (Number.isNaN(ts) || !ms) return null;
    return new Date(ts + ms).toLocaleString("es-ES");
  };

  const normalizar = (v) => (v || "").toString().trim().toLowerCase();

  // ====== DERIVED ======
  const servidoresDisponibles = useMemo(() => {
    const set = new Set();
    sanciones.forEach((s) => set.add(normalizar(s.server) || "desconocido"));
    const arr = Array.from(set).sort((a, b) => a.localeCompare(b));
    return ["todos", ...arr];
  }, [sanciones]);

  const stats = useMemo(() => {
    const total = sanciones.length;
    const pendientes = sanciones.filter((s) => normalizar(s.estado) === "pendiente").length;
    const revisadas = sanciones.filter((s) => normalizar(s.estado) === "revisado").length;
    const baneadas = sanciones.filter((s) => normalizar(s.estado) === "baneado").length;
    return { total, pendientes, revisadas, baneadas };
  }, [sanciones]);

  const sancionesFiltradas = useMemo(() => {
    const qq = normalizar(q);
    const serv = normalizar(fServidor);
    const est = normalizar(fEstado);

    const list = sanciones.filter((s) => {
      const name = normalizar(s.name);
      const type = normalizar(s.type);
      const obs = normalizar(s.observacion);
      const server = normalizar(s.server) || "desconocido";
      const estadoRow = normalizar(s.estado) || "pendiente";

      const matchQ = !qq || name.includes(qq) || type.includes(qq) || obs.includes(qq) || server.includes(qq);
      const matchServ = serv === "todos" ? true : server === serv;
      const matchEstado = est === "todos" ? true : estadoRow === est;

      return matchQ && matchServ && matchEstado;
    });

    list.sort((a, b) => (parseInt(b.timestamp || 0, 10) || 0) - (parseInt(a.timestamp || 0, 10) || 0));
    return list;
  }, [sanciones, q, fServidor, fEstado]);

  return (
    <section className="tribAdmin">
      <div className="tribAdmin__wrap">
        {/* TOP BAR */}
        <div className="tribAdmin__topbar">
          <button className="tribBtn tribBtn--ghost" onClick={() => navigate("/tribunal")}>
            <ArrowLeft size={18} weight="bold" />
            Volver al Tribunal
          </button>

          <div className="tribAdmin__session">
            <span className="tribAdmin__sessionTag">Sesión</span>
            <span className="tribAdmin__sessionId" title={user?.uid}>{user?.uid}</span>
            <span className={`tribAdmin__role tribAdmin__role--${normalizar(user?.rol_admin)}`}>
              {user?.rol_admin}
            </span>
          </div>
        </div>

        {/* HEADER + STATS */}
        <header className="tribAdmin__header">
          <div className="tribAdmin__titleWrap">
            <h1 className="tribAdmin__title">Panel de Administración</h1>
            <p className="tribAdmin__subtitle">
              Revisa sanciones, deja observaciones claras y marca su estado con criterio.
            </p>
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

        {/* CONTROLS */}
        <div className="tribAdmin__controls">
          <div className="tribAdmin__search">
            <MagnifyingGlass size={18} weight="bold" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por jugador, motivo, servidor u observación…"
            />
            {q?.trim() && (
              <button className="iconBtn" onClick={() => setQ("")} aria-label="Limpiar búsqueda">
                <XCircle size={18} weight="fill" />
              </button>
            )}
          </div>

          <div className="tribAdmin__filters">
            <div className="selectWrap">
              <span className="selectWrap__label">Servidor</span>
              <select value={fServidor} onChange={(e) => setFServidor(e.target.value)}>
                {servidoresDisponibles.map((sv) => (
                  <option key={sv} value={sv}>
                    {sv === "todos" ? "Todos" : obtenerNombreServidor(sv)}
                  </option>
                ))}
              </select>
            </div>

            <div className="selectWrap">
              <span className="selectWrap__label">Estado</span>
              <select value={fEstado} onChange={(e) => setFEstado(e.target.value)}>
                <option value="todos">Todos</option>
                <option value="pendiente">Pendiente</option>
                <option value="revisado">Revisado</option>
                <option value="baneado">Baneado</option>
              </select>
            </div>

            <button className="tribBtn tribBtn--primary" onClick={cargarSanciones} disabled={loading}>
              <ArrowsClockwise size={18} weight="bold" />
              {loading ? "Cargando…" : "Recargar"}
            </button>
          </div>
        </div>

        {/* TABLE */}
        <div className="tribAdmin__tableWrap">
          <table className="tribAdmin__table">
            <thead>
              <tr>
                <th>Jugador</th>
                <th>Motivo</th>
                <th>Duración</th>
                <th>Estado</th>
                <th>Observación</th>
                <th>Servidor</th>
                <th>Acción</th>
              </tr>
            </thead>

            <tbody>
              {sancionesFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="tribAdmin__empty">
                    <div className="tribAdmin__emptyInner">
                      <Funnel size={22} weight="duotone" />
                      <div>
                        <div className="tribAdmin__emptyTitle">No hay resultados</div>
                        <div className="tribAdmin__emptyDesc">Ajusta filtros o prueba otra búsqueda.</div>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                sancionesFiltradas.map((s) => {
                  const fechaFin = obtenerFechaFin(s.timestamp, s.duration);
                  const estRow = normalizar(s.estado) || "pendiente";
                  const servRow = normalizar(s.server) || "desconocido";
                  const motivoRow = (s.type || "otros").toString();

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
                              <div className="playerSub">
                                ID <span className="muted">{s.id}</span>
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
                            {motivos.map((motivo) => (
                              <option key={motivo} value={motivo}>
                                {motivo}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span
                            className={`badge badge--motivo badge--${normalizar(motivoRow).replace(/\s/g, "-") || "otros"}`}
                            title={motivoRow}
                          >
                            {motivoRow || "Sin clasificar"}
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
                          <span className="badge__icon">{obtenerIconoEstado(estRow)}</span>
                          {estRow}
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

                      <td data-label="Servidor">
                        <span className={`badge badge--server badge--${servRow}`}>
                          <span className="badge__icon">{obtenerIconoServidor(s.server)}</span>
                          {obtenerNombreServidor(s.server)}
                        </span>
                      </td>

                      <td data-label="Acción">
                        {editingId === s.id ? (
                          <div className="actions actions--edit">
                            <select className="inlineSelect" value={estado} onChange={(e) => setEstado(e.target.value)}>
                              <option value="pendiente">Pendiente</option>
                              <option value="revisado">Revisado</option>
                              <option value="baneado">Baneado</option>
                            </select>

                            <button className="tribBtn tribBtn--save" onClick={() => guardarCambios(s)}>
                              <FloppyDisk size={18} weight="bold" />
                              Guardar
                            </button>

                            <button className="tribBtn tribBtn--ghost" onClick={cerrarEdicion}>
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
                              <button className="tribBtn tribBtn--danger" onClick={() => eliminarSancion(s.id, s.name)}>
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
              <span className="hint">Observaciones cortas y específicas: qué, por qué y evidencia.</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
