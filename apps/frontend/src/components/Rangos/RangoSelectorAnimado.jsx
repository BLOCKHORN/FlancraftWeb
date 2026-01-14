import { useEffect, useMemo, useState, useContext } from "react";
import { UserContext } from "../../context/UserContext";
import toast from "react-hot-toast";

import "../../styles/components/Rangos/rangoSelectorAnimado.scss";
import "../../styles/components/Rangos/rangoComparativaExtras.scss";

import { RANGOS_COMPARATIVA, RANGOS_MODAL } from "./dataRangos";

import ModalCompraRango from "./ModalCompraRango";
import RangoAccionModal from "./RangoAccionModal";
import RangoDetalleModal from "./RangoDetalleModal";

const API_BASE = import.meta.env.VITE_BACKEND_URL || "https://flancraft-backend.onrender.com";

const RANGOS_ORDENADOS = ["nova", "alpha", "inmortal"];
const RANGOS_UI = [
  { id: "nova", nombre: "NOVA", imagen: "/assets/rangos/nova.webp" },
  { id: "alpha", nombre: "ALPHA", imagen: "/assets/rangos/alpha.webp" },
  { id: "inmortal", nombre: "INMORTAL", imagen: "/assets/rangos/inmortal.webp" },
];

const SERVERS = [
  { id: "lobby", label: "Lobby", img: "/assets/reinos/global.webp" },
  { id: "survival", label: "Survival", img: "/assets/reinos/survival-clasico.webp" },
  { id: "oneblock", label: "OneBlock", img: "/assets/reinos/oneblock.webp" },
  { id: "anarq", label: "Anárquico", img: "/assets/reinos/survival-anarquico.webp" },
];

function isAction(v) {
  return v && typeof v === "object" && (v.kind === "kit" || v.kind === "cmds");
}
function formatCompact(v) {
  if (Array.isArray(v)) return v.join(" · ");
  return String(v);
}

export default function RangoSelectorAnimado() {
  const [precios, setPrecios] = useState({});
  const [servidor, setServidor] = useState("survival");

  const [rangoSeleccionado, setRangoSeleccionado] = useState(null);
  const [confirmando, setConfirmando] = useState(false);
  const [comprando, setComprando] = useState(false);

  const [modalAccion, setModalAccion] = useState(null);
  const [detalleRango, setDetalleRango] = useState(null);

  const [saldoEcos, setSaldoEcos] = useState(null);
  const [cargandoSaldo, setCargandoSaldo] = useState(false);

  const { user, setUser } = useContext(UserContext);
  const [rangoDatos, setRangoDatos] = useState(null);

  // Precios (solo 30d)
  useEffect(() => {
    const fetchPrecios = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/rangos/lista`);
        const data = await res.json();
        if (!res.ok) throw new Error("No se pudieron cargar los precios.");

        const mapa = {};
        data.forEach(({ rango, tipo, precio }) => {
          if (!mapa[rango]) mapa[rango] = {};
          mapa[rango][tipo] = precio; // usaremos tipo="30d"
        });
        setPrecios(mapa);
      } catch (err) {
        console.error(err);
        toast.error("Error al obtener los precios.");
      }
    };
    fetchPrecios();
  }, []);

  // Saldo
  useEffect(() => {
    if (!user?.uuid) {
      setSaldoEcos(null);
      return;
    }
    const fetchSaldo = async () => {
      try {
        setCargandoSaldo(true);
        const res = await fetch(`${API_BASE}/api/monedas/${user.uuid}`);
        if (!res.ok) throw new Error("No se pudo obtener el saldo.");
        const data = await res.json();
        setSaldoEcos(Number(data.ecos ?? 0));
      } catch (err) {
        console.error(err);
        setSaldoEcos(typeof user?.ecos === "number" ? user.ecos : 0);
      } finally {
        setCargandoSaldo(false);
      }
    };
    fetchSaldo();
  }, [user?.uuid]);

  // Rango actual
  useEffect(() => {
    const fetchRangoUsuario = async () => {
      if (!user?.uuid) {
        setRangoDatos(null);
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/api/usuarios/${user.uuid}`);
        const data = await res.json();
        setRangoDatos({ rango: data.rango_usuario?.toLowerCase() || null, premium: data.es_premium === true });
      } catch (err) {
        console.error(err);
        setRangoDatos(null);
      }
    };
    fetchRangoUsuario();
  }, [user?.uuid]);

  const saldoVisible = useMemo(() => {
    if (saldoEcos !== null && !Number.isNaN(saldoEcos)) return saldoEcos;
    if (typeof user?.ecos === "number") return user.ecos;
    return null;
  }, [saldoEcos, user?.ecos]);

  const indiceRangoActual = useMemo(() => {
    return rangoDatos?.rango ? RANGOS_ORDENADOS.indexOf(rangoDatos.rango) : -1;
  }, [rangoDatos?.rango]);

  const filas = useMemo(() => RANGOS_COMPARATIVA?.[servidor] ?? [], [servidor]);

  const miniRowValue = (key, rankId) => {
    const row = filas.find((r) => r.key === key);
    const v = row?.values?.[rankId];
    if (v === undefined || v === null) return "—";
    if (isAction(v)) return v.label || "Ver";
    if (typeof v === "boolean") return v ? "Sí" : "No";
    return formatCompact(v);
  };

  const getNombreRangoActual = () => {
    if (!user?.uuid) return "Invitado";
    const raw = rangoDatos?.rango;
    if (!raw) return "Sin rango";
    const found = RANGOS_UI.find((r) => r.id === raw);
    return found ? found.nombre : raw;
  };

  // Comprar (siempre 30d)
  const handleComprar = (rango) => {
    const tipo = "30d";
    const precio = precios?.[rango.id]?.[tipo];

    if (precio === undefined) return toast.error("No se ha podido cargar el precio.");
    if (!user) return toast.error("Debes iniciar sesión para comprar un rango.");

    if (indiceRangoActual !== -1) {
      const idxNuevo = RANGOS_ORDENADOS.indexOf(rango.id);
      if (idxNuevo !== -1 && idxNuevo < indiceRangoActual) {
        return toast.error("Ya tienes un rango superior. No puedes comprar uno inferior.");
      }
    }

    if (saldoVisible === null) return toast.error("Todavía no se ha cargado tu saldo.");
    if (saldoVisible < precio) return toast.error(`No tienes suficientes ECOS. Necesitas ${precio}.`);

    setRangoSeleccionado({ rango, tipo, precio });
    setConfirmando(true);
  };

  const confirmarCompra = async () => {
    if (!rangoSeleccionado || !user) return;
    const { rango, tipo } = rangoSeleccionado;

    setComprando(true);
    try {
      const res = await fetch(`${API_BASE}/api/rangos/comprar-rango`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${user.token}` },
        body: JSON.stringify({ uuid: user.uuid, rango: rango.id, tipo }), // tipo="30d"
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Error al comprar el rango");

      toast.custom((t) => (
        <div className={`toast-rango-compra ${t.visible ? "mostrar" : ""}`}>
          <img src={rango.imagen} alt={rango.nombre} className="toast-rango-imagen" />
          <div className="toast-rango-texto">
            <strong>Rango {rango.nombre} activado</strong>
            <span>
              {precios?.[rango.id]?.["30d"]?.toLocaleString("es-ES") ?? rangoSeleccionado.precio}
              <img src="/assets/eco.webp" alt="ECOS" className="eco-mini-inline" />
              · 30 días
            </span>
          </div>
        </div>
      ));

      setConfirmando(false);

      if (data.nuevoSaldo !== undefined) {
        const nuevoSaldoNum = Number(data.nuevoSaldo);
        setSaldoEcos(nuevoSaldoNum);
        setUser?.((prev) => (prev ? { ...prev, ecos: nuevoSaldoNum } : prev));
      }
    } catch (err) {
      console.error(err);
      toast.error("Hubo un problema al procesar la compra.");
    } finally {
      setComprando(false);
    }
  };

  const abrirAccion = (action) => {
    if (!action) return;
    setModalAccion({ kind: action.kind, server: action.id, rank: action.rank, label: action.label });
  };

  return (
    <section className="rango-selector-epico">
      <div className="rango-panel-marco">
        <div className="rango-banner-hero">
          <div className="banner-overlay">
            <h1>Rangos</h1>
            <p>Desbloquea beneficios exclusivos: kits, comandos y perks por servidor. Compra con ECOS.</p>
          </div>
        </div>

        <div className="rango-banner-textura">
          <div className="banner-info-grid">
            <div className="info-rango-actual">
              {user ? (
                <>
                  <span className="label">Tu rango actual es:</span>
                  <strong className="valor">{getNombreRangoActual()}</strong>
                </>
              ) : (
                <span className="label">Inicia sesión para ver tu rango actual.</span>
              )}
            </div>

            <p className="modo-unico-texto">
              Los rangos se compran con <strong>ECOS</strong> y duran <strong>30 días</strong>.
            </p>

            <div className="saldo-ecos">
              {user ? (
                <>
                  <span>Tu saldo:</span>
                  <strong>
                    {cargandoSaldo && saldoVisible === null ? "Cargando..." : saldoVisible !== null ? saldoVisible.toLocaleString("es-ES") : "—"}
                    {saldoVisible !== null && <img src="/assets/eco.webp" alt="ECOS" className="eco-mini-inline" />}
                  </strong>
                </>
              ) : (
                <>
                  <span>Inicia sesión para ver tu saldo</span>
                  <img src="/assets/eco.webp" alt="ECOS" className="eco-mini-inline" />
                </>
              )}
            </div>
          </div>

          {/* ✅ Selector de servidor con imágenes */}
          <div className="rango-server-picker" role="tablist" aria-label="Servidor">
            {SERVERS.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`server-tile ${servidor === s.id ? "active" : ""}`}
                onClick={() => setServidor(s.id)}
              >
                <span className="server-art" aria-hidden="true">
                  <img src={s.img} alt="" loading="lazy" />
                </span>
                <span className="server-name">{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="tabla-rangos">
          <div className="tabla-header">
            <div className="beneficio-label encabezado">
              Beneficios ({SERVERS.find((s) => s.id === servidor)?.label})
            </div>

            {RANGOS_ORDENADOS.map((id) => {
              const rango = RANGOS_UI.find((r) => r.id === id);
              const precio = precios?.[rango.id]?.["30d"];

              const idxNuevo = RANGOS_ORDENADOS.indexOf(rango.id);
              const tieneActual = indiceRangoActual !== -1;
              const esInferior = tieneActual && idxNuevo < indiceRangoActual;
              const esActual = tieneActual && rango.id === rangoDatos?.rango;

              return (
                <div
                  key={rango.id}
                  className={`columna-rango ${rango.id === "inmortal" ? "resaltado" : ""} ${
                    esActual ? "rango-actual" : ""
                  } ${esInferior ? "rango-bloqueado" : ""}`}
                >
                  {rango.id === "inmortal" && <span className="etiqueta-popular">MÁS COMPRADO</span>}
                  {esActual && <span className="etiqueta-rango-actual">TU RANGO</span>}

                  <img src={rango.imagen} alt={`Rango ${rango.nombre}`} className="imagen-rango" />
                  <h2 className="nombre-rango">{rango.nombre}</h2>
                  <p className="rango-duracion">30 días</p>

                  <div className="rango-mini-resumen">
                    <span>{miniRowValue("jobs", rango.id)} trabajos</span>
                    <span>{miniRowValue("money", rango.id)} iniciales</span>
                    <span>{miniRowValue("dupe", rango.id).includes("x") ? `/dupe ${miniRowValue("dupe", rango.id)}` : "Sin /dupe"}</span>
                  </div>

                  <div className="botones-compra">
                    <button
                      className="boton-compra btn-30"
                      onClick={esInferior ? undefined : () => handleComprar(rango)}
                      disabled={precio === undefined || esInferior}
                      type="button"
                    >
                      {esInferior ? (
                        "Rango inferior bloqueado"
                      ) : precio !== undefined ? (
                        <>
                          {precio.toLocaleString("es-ES")}
                          <img src="/assets/eco.webp" alt="ECOS" className="eco-mini" />
                          30 días
                        </>
                      ) : (
                        "Cargando..."
                      )}
                    </button>

                    <button className="boton-detalles" type="button" onClick={() => setDetalleRango(rango)}>
                      Ver detalles
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="tabla-body">
            {filas.length === 0 ? (
              <div className="rango-empty">
                No hay comparativa para <strong>{SERVERS.find((s) => s.id === servidor)?.label}</strong>.
              </div>
            ) : (
              filas.map((fila) => (
                <div key={fila.key} className="fila-beneficio">
                  <div className="beneficio-label">{fila.label}</div>

                  <div className="beneficio-celda-group">
                    {RANGOS_ORDENADOS.map((rid) => {
                      const v = fila.values?.[rid];

                      return (
                        <div key={`${fila.key}_${rid}`} className="beneficio-celda">
                          {typeof v === "boolean" ? (
                            v ? (
                              <img src="/assets/check.webp" alt="Sí" className="icono-check check-basico" />
                            ) : (
                              <span className="no-disponible">X</span>
                            )
                          ) : isAction(v) ? (
                            <button type="button" className="celda-accion" onClick={() => abrirAccion(v)}>
                              {v.label || "Ver"}
                            </button>
                          ) : v === undefined || v === null ? (
                            <span className="valor-num">—</span>
                          ) : Array.isArray(v) ? (
                            <span className="valor-num">{formatCompact(v)}</span>
                          ) : (
                            <span className="valor-num">{String(v)}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <ModalCompraRango
        open={confirmando}
        rangoSeleccionado={rangoSeleccionado}
        precios={precios}
        comprando={comprando}
        onConfirm={confirmarCompra}
        onCancel={() => setConfirmando(false)}
      />

      <RangoDetalleModal
        open={!!detalleRango}
        rango={detalleRango}
        servidor={servidor}
        filas={filas}
        onClose={() => setDetalleRango(null)}
        onOpenAction={(action) => abrirAccion(action)}
      />

      <RangoAccionModal open={!!modalAccion} accion={modalAccion} dataModal={RANGOS_MODAL} onClose={() => setModalAccion(null)} />

      {comprando && (
        <div className="overlay-conjuro">
          <div className="circulo-magico" />
          <div className="chispa chispa1" />
          <div className="chispa chispa2" />
          <div className="chispa chispa3" />
        </div>
      )}
    </section>
  );
}
