import React, { useEffect, useMemo, useState, useContext } from "react";
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

const API_BASE = "https://flancraft-backend.onrender.com";

const SERVER_META = [
  {
    key: "survival",
    label: "Survival Clásico",
    badge: "SURVIVAL",
    image: "/assets/reinos/survival-clasico.webp",
    aliases: ["survival", "survival-clasico", "survival_clasico", "survivalclasico"],
  },
  {
    key: "oneblock",
    label: "OneBlock",
    badge: "ONEBLOCK",
    image: "/assets/reinos/oneblock.webp",
    aliases: ["oneblock", "one-block", "one_block"],
  },
  {
    key: "lobby",
    label: "Lobby",
    badge: "LOBBY",
    image: "/assets/reinos/global.webp",
    aliases: ["lobby", "play.flancraft.com", "proxy", "hub"],
  },
];

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

const canonServerKey = (raw) => {
  const r = normalizar(raw);
  if (!r) return "desconocido";
  for (const meta of SERVER_META) {
    if (meta.aliases.includes(r)) return meta.key;
  }
  return "desconocido";
};

const getServerMeta = (raw) => {
  const key = canonServerKey(raw);
  const meta = SERVER_META.find((m) => m.key === key);
  if (meta) return meta;
  return { key: "desconocido", label: "Servidor desconocido", badge: "DESCONOCIDO", image: null };
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
  const n = Number(ts);
  if (Number.isFinite(n) && n > 0) return n;
  const p = Date.parse(ts);
  return Number.isFinite(p) ? p : 0;
};

const formatearDuracion = (duracionRaw) => {
  if (!duracionRaw) return "Desconocida";
  const s = duracionRaw.toString().trim();
  const low = s.toLowerCase();
  if (low.includes("perma")) return "Permaban";
  const match = low.match(/(\d+)\s*([smhd])/);
  if (!match) return s;

  const valor = parseInt(match[1], 10);
  const unidad = match[2];

  const unidades = { s: "segundo", m: "minuto", h: "hora", d: "día" };
  const u = unidades[unidad] || "";
  return `${valor} ${u}${valor !== 1 ? "s" : ""}`;
};

const obtenerFechaFin = (timestamp, duracionRaw) => {
  const low = (duracionRaw || "").toString().toLowerCase();
  if (low.includes("perma")) return null;

  const match = low.match(/(\d+)\s*([smhd])/);
  if (!match) return null;

  const valor = parseInt(match[1], 10);
  const unidad = match[2];
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };

  const ms = valor * (multipliers[unidad] || 0);
  const base = parseTimestamp(timestamp);

  if (!base || !ms) return null;
  return new Date(base + ms).toLocaleString("es-ES");
};

export default function AdminPanel() {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();

  const [sanciones, setSanciones] = useState([]);
  const [loading, setLoading] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [observacion, setObservacion] = useState("");
  const [estado, setEstado] = useState("pendiente");
  const [motivoEditado, setMotivoEditado] = useState("otros");

  const [q, setQ] = useState("");
  const [fServidor, setFServidor] = useState("todos");
  const [fEstado, setFEstado] = useState("todos");

  if (user === null || !user?.loggedIn || !user?.rol_admin) {
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

  const cerrarEdicion = () => {
    setEditingId(null);
    setObservacion("");
    setEstado("pendiente");
    setMotivoEditado("otros");
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

  const servidoresDisponibles = useMemo(() => {
    const present = new Set();
    sanciones.forEach((s) => present.add(canonServerKey(s.server)));

    const base = ["todos", ...SERVER_META.map((m) => m.key)];
    if (present.has("desconocido")) base.push("desconocido");

    const uniq = Array.from(new Set(base));
    return uniq;
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
      const serverKey = canonServerKey(s.server);
      const estadoRow = normalizar(s.estado) || "pendiente";

      const matchQ =
        !qq ||
        name.includes(qq) ||
        type.includes(qq) ||
        obs.includes(qq) ||
        serverKey.includes(qq);

      const matchServ = serv === "todos" ? true : serverKey === serv;
      const matchEstado = est === "todos" ? true : estadoRow === est;

      return matchQ && matchServ && matchEstado;
    });

    list.sort((a, b) => parseTimestamp(b.timestamp) - parseTimestamp(a.timestamp));
    return list;
  }, [sanciones, q, fServidor, fEstado]);

  const selectedServerMeta = useMemo(() => {
    if (fServidor === "todos") return null;
    return getServerMeta(fServidor);
  }, [fServidor]);

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
              <div className="selectWrap__head">
                <span className="selectWrap__label">Servidor</span>
                {selectedServerMeta?.image && (
                  <span
                    className="selectWrap__preview"
                    style={{ backgroundImage: `url(${selectedServerMeta.image})` }}
                    aria-hidden="true"
                  />
                )}
              </div>

              <select value={fServidor} onChange={(e) => setFServidor(e.target.value)}>
                {servidoresDisponibles.map((sv) => {
                  if (sv === "todos") {
                    return (
                      <option key="todos" value="todos">
                        Todos
                      </option>
                    );
                  }
                  if (sv === "desconocido") {
                    return (
                      <option key="desconocido" value="desconocido">
                        Servidor desconocido
                      </option>
                    );
                  }
                  const meta = SERVER_META.find((m) => m.key === sv);
                  return (
                    <option key={sv} value={sv}>
                      {meta?.label || sv}
                    </option>
                  );
                })}
              </select>
            </div>

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
                        <div className="tribAdmin__emptyDesc">
                          Ajusta filtros o prueba otra búsqueda.
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                sancionesFiltradas.map((s) => {
                  const estRow = normalizar(s.estado) || "pendiente";
                  const meta = getServerMeta(s.server);
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

                      <td data-label="Servidor">
                        <span className={`badge badge--server badge--server-${meta.key}`}>
                          {meta.image ? (
                            <span
                              className="badge__thumb"
                              style={{ backgroundImage: `url(${meta.image})` }}
                              aria-hidden="true"
                            />
                          ) : (
                            <span className="badge__thumb badge__thumb--empty" aria-hidden="true" />
                          )}
                          <span className="badge__text">{meta.badge}</span>
                        </span>
                        <div className="serverSub">{meta.label}</div>
                      </td>

                      <td data-label="Acción">
                        {editingId === s.id ? (
                          <div className="actions actions--edit">
                            <select className="inlineSelect" value={estado} onChange={(e) => setEstado(e.target.value)}>
                              {ESTADOS.map((e) => (
                                <option key={e.key} value={e.key}>
                                  {e.label}
                                </option>
                              ))}
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
              <span className="hint">Observación ideal: qué pasó, evidencia y decisión.</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
