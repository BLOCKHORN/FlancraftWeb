// apps/frontend/src/components/Rangos/RangoSelectorAnimado.jsx

import { useState, useEffect, useContext } from "react";
import { UserContext } from "../../context/UserContext";
import toast from "react-hot-toast";
import "../../styles/components/Rangos/rangoSelectorAnimado.scss";

import { RANGOS, RANGOS_ORDENADOS, FILAS } from "./dataRangos";
import ModalCompraRango from "./ModalCompraRango";
import RangoDetalleModal from "./RangoDetalleModal";

function RangoSelectorAnimado() {
  const [precios, setPrecios] = useState({});
  const [rangoSeleccionado, setRangoSeleccionado] = useState(null);
  const [confirmando, setConfirmando] = useState(false);
  const [comprando, setComprando] = useState(false);
  const [kitDesplegado, setKitDesplegado] = useState(null);
  const [detalleRango, setDetalleRango] = useState(null);

  // Saldo real de ECOS (desde backend)
  const [saldoEcos, setSaldoEcos] = useState(null);
  const [cargandoSaldo, setCargandoSaldo] = useState(false);

  // Datos usuario
  const { user, setUser } = useContext(UserContext);

  // Datos de rango del usuario (igual lógica que en Navbar)
  const [rangoDatos, setRangoDatos] = useState(null);

  // -------- Cargar precios desde el backend --------
  useEffect(() => {
    const fetchPrecios = async () => {
      try {
        const res = await fetch(
          "https://flancraft-backend.onrender.com/api/rangos/lista"
        );
        const data = await res.json();
        if (res.ok) {
          const mapa = {};
          data.forEach(({ rango, tipo, precio }) => {
            if (!mapa[rango]) mapa[rango] = {};
            mapa[rango][tipo] = precio;
          });
          setPrecios(mapa);
        } else {
          toast.error("No se pudieron cargar los precios.");
        }
      } catch (err) {
        console.error(err);
        toast.error("Error al obtener los precios.");
      }
    };
    fetchPrecios();
  }, []);

  // -------- Cargar saldo de ECOS --------
  useEffect(() => {
    if (!user?.uuid) {
      setSaldoEcos(null);
      return;
    }

    const fetchSaldo = async () => {
      try {
        setCargandoSaldo(true);
        const res = await fetch(
          `https://flancraft-backend.onrender.com/api/monedas/${user.uuid}`
        );
        if (!res.ok) throw new Error("No se pudo obtener el saldo.");
        const data = await res.json();
        setSaldoEcos(Number(data.ecos ?? 0));
      } catch (err) {
        console.error("Error al obtener saldo de ECOS:", err);
        // Fallback con lo que haya en el contexto de usuario
        if (typeof user?.ecos === "number") {
          setSaldoEcos(user.ecos);
        } else {
          setSaldoEcos(0);
        }
      } finally {
        setCargandoSaldo(false);
      }
    };

    fetchSaldo();
  }, [user?.uuid]);

  // -------- Cargar rango actual del usuario (igual que en Navbar) --------
  useEffect(() => {
    const fetchRangoUsuario = async () => {
      if (user?.uuid) {
        try {
          const res = await fetch(
            `https://flancraft-backend.onrender.com/api/usuarios/${user.uuid}`
          );
          const data = await res.json();
          setRangoDatos({
            rango: data.rango_usuario?.toLowerCase() || null,
            premium: data.es_premium === true,
          });
        } catch (err) {
          console.error("Error al obtener datos de rango del usuario:", err);
          setRangoDatos(null);
        }
      } else {
        setRangoDatos(null);
      }
    };

    fetchRangoUsuario();
  }, [user?.uuid]);

  // Helper: saldo efectivo = backend o, si no, contexto
  const getSaldoDisponible = () => {
    if (saldoEcos !== null && !Number.isNaN(saldoEcos)) return saldoEcos;
    if (typeof user?.ecos === "number") return user.ecos;
    return null;
  };

  // Helper: nombre bonito del rango actual
  const getNombreRangoActual = () => {
    if (!user || !user.uuid) return "Invitado";
    const raw = rangoDatos?.rango;
    if (!raw) return "Sin rango";

    const rangoObj = RANGOS.find((r) => r.id === raw);
    if (rangoObj) return rangoObj.nombre;

    return raw.charAt(0).toUpperCase() + raw.slice(1);
  };

  const saldoVisible = getSaldoDisponible();

  // Índice del rango actual en el orden de rangos (para bloquear inferiores)
  const indiceRangoActual = rangoDatos?.rango
    ? RANGOS_ORDENADOS.indexOf(rangoDatos.rango)
    : -1;

  // -------- Comprar rango (siempre 30d en esta vista) --------
  const handleComprar = (rango) => {
    const precio = precios?.[rango.id]?.["30d"];

    if (precio === undefined) {
      toast.error("No se ha podido cargar el precio de este rango.");
      return;
    }

    if (!user) {
      toast.error("Debes iniciar sesión para comprar un rango.");
      return;
    }

    // Bloquear compra de rangos inferiores al que ya tiene
    if (indiceRangoActual !== -1) {
      const indiceNuevo = RANGOS_ORDENADOS.indexOf(rango.id);
      if (indiceNuevo !== -1 && indiceNuevo < indiceRangoActual) {
        toast.error(
          "Ya tienes un rango superior. No puedes comprar uno inferior."
        );
        return;
      }
    }

    const saldoDisponible = getSaldoDisponible();

    if (saldoDisponible === null) {
      toast.error("Todavía no se ha cargado tu saldo.");
      return;
    }

    if (saldoDisponible < precio) {
      toast.error(`No tienes suficientes ECOS. Necesitas ${precio}.`);
      return;
    }

    setRangoSeleccionado({ rango, tipo: "30d", precio });
    setConfirmando(true);
  };

  const confirmarCompra = async () => {
    if (!rangoSeleccionado || !user) return;
    const { rango, tipo } = rangoSeleccionado;

    setComprando(true);
    try {
      const res = await fetch(
        "https://flancraft-backend.onrender.com/api/rangos/comprar-rango",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.token}`,
          },
          body: JSON.stringify({
            uuid: user.uuid,
            rango: rango.id,
            tipo, // "30d"
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Error al comprar el rango");

      toast.custom((t) => (
        <div className={`toast-rango-compra ${t.visible ? "mostrar" : ""}`}>
          <img
            src={rango.imagen}
            alt={rango.nombre}
            className="toast-rango-imagen"
          />
          <div className="toast-rango-texto">
            <strong>¡Has desbloqueado el rango {rango.nombre}!</strong>
            <span>
              30 días por {precios[rango.id]["30d"]}{" "}
              <img
                src="/assets/eco.webp"
                alt="ECOS"
                className="eco-mini-inline"
              />
            </span>
          </div>
        </div>
      ));

      setConfirmando(false);

      // Actualizar saldo local y en el contexto
      if (data.nuevoSaldo !== undefined) {
        const nuevoSaldoNum = Number(data.nuevoSaldo);
        setSaldoEcos(nuevoSaldoNum);
        if (setUser) {
          setUser((prev) => (prev ? { ...prev, ecos: nuevoSaldoNum } : prev));
        }
      }
    } catch (err) {
      console.error("Error en la compra:", err);
      toast.error("Hubo un problema al procesar la compra.");
    } finally {
      setComprando(false);
    }
  };

  const handleVerDetalles = (rango) => {
    setDetalleRango(rango);
  };

  const cerrarDetalles = () => {
    setDetalleRango(null);
  };

  return (
    <section className="rango-selector-epico">
      {/* HERO */}
      <div className="rango-banner-hero">
        <div className="banner-overlay">
          <h1>Rangos</h1>
          <p>
            Desbloquea beneficios exclusivos durante un mes completo: kits
            mejorados, más trabajos, más llaves y comandos especiales que te
            harán la vida mucho más fácil en FlanCraft.
          </p>
        </div>
      </div>

      {/* BARRA INFORMATIVA + RANGO ACTUAL + SALDO */}
      <div className="rango-banner-textura">
        <div className="banner-info-grid">
          {/* Izquierda: rango actual */}
          <div className="info-rango-actual">
            {user ? (
              <>
                <span className="label">Tu rango actual es:</span>
                <strong className="valor">{getNombreRangoActual()}</strong>
              </>
            ) : (
              <span className="label">
                Inicia sesión para ver tu rango actual.
              </span>
            )}
          </div>

          {/* Centro: texto ECOS */}
          <p className="modo-unico-texto">
            Los rangos solo pueden comprarse con <strong>ECOS</strong>,
            obtenidos al completar misiones y logros únicos desde tu perfil web.
          </p>

          {/* Derecha: saldo ECOS */}
          <div className="saldo-ecos">
            {user ? (
              <>
                <span>Tu saldo:</span>
                <strong>
                  {cargandoSaldo && saldoVisible === null
                    ? "Cargando..."
                    : saldoVisible !== null
                    ? saldoVisible.toLocaleString("es-ES")
                    : "—"}
                  {saldoVisible !== null && (
                    <img
                      src="/assets/eco.webp"
                      alt="ECOS"
                      className="eco-mini-inline"
                    />
                  )}
                </strong>
              </>
            ) : (
              <>
                <span>Inicia sesión para ver tu saldo de</span>
                <img
                  src="/assets/eco.webp"
                  alt="ECOS"
                  className="eco-mini-inline"
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* TABLA DE RANGOS */}
      <div className="tabla-rangos">
        {/* Header: columnas de rangos */}
        <div className="tabla-header">
          <div className="beneficio-label encabezado">
            Beneficios de cada rango
          </div>

          {RANGOS_ORDENADOS.map((id) => {
            const rango = RANGOS.find((r) => r.id === id);
            const precio = precios?.[rango.id]?.["30d"];
            const b = rango?.beneficios_30d ?? {};

            const indiceRango = RANGOS_ORDENADOS.indexOf(rango.id);
            const tieneRangoActual = indiceRangoActual !== -1;
            const esRangoInferior =
              tieneRangoActual && indiceRango < indiceRangoActual;
            const esRangoActual =
              tieneRangoActual && rango.id === rangoDatos?.rango;

            return (
              <div
                key={rango.id}
                className={`columna-rango ${
                  rango.id === "inmortal" ? "resaltado" : ""
                } ${esRangoActual ? "rango-actual" : ""} ${
                  esRangoInferior ? "rango-bloqueado" : ""
                }`}
              >
                {rango.id === "inmortal" && (
                  <span className="etiqueta-popular">MÁS COMPRADO</span>
                )}

                {esRangoActual && (
                  <span className="etiqueta-rango-actual">TU RANGO</span>
                )}

                <img
                  src={rango.imagen}
                  alt={`Rango ${rango.nombre}`}
                  className="imagen-rango"
                />

                <h2 className="nombre-rango">{rango.nombre}</h2>
                <p className="rango-duracion">1 Mes</p>

                <div className="rango-mini-resumen">
                  <span>{b.trabajos ?? "-"} trabajos</span>
                  <span>{b.dinero || "—"} iniciales</span>
                  <span>{b.dupe ? `/dupe ${b.dupe}` : "Sin /dupe"}</span>
                </div>

                <div className="botones-compra">
                  <button
                    className="boton-compra btn-30"
                    onClick={
                      esRangoInferior ? undefined : () => handleComprar(rango)
                    }
                    disabled={precio === undefined || esRangoInferior}
                  >
                    {esRangoInferior ? (
                      "Rango inferior bloqueado"
                    ) : precio !== undefined ? (
                      <>
                        {precio.toLocaleString("es-ES")}{" "}
                        <img
                          src="/assets/eco.webp"
                          alt="ECOS"
                          className="eco-mini"
                        />{" "}
                        30 días
                      </>
                    ) : (
                      "Cargando..."
                    )}
                  </button>

                  <button
                    className="boton-detalles"
                    type="button"
                    onClick={() => handleVerDetalles(rango)}
                  >
                    Ver detalles
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Cuerpo comparativa */}
        <div className="tabla-body">
          {FILAS.map((fila) => {
            const esFilaKit = fila.clave === "kit";

            return (
              <div key={fila.clave}>
                <div
                  className={`fila-beneficio ${
                    fila.clave === "comida" ? "fila-comida" : ""
                  }`}
                >
                  <div className="beneficio-label">{fila.label}</div>

                  <div className="beneficio-celda-group">
                    {RANGOS_ORDENADOS.map((id) => {
                      const rango = RANGOS.find((r) => r.id === id);
                      const valor = rango?.beneficios_30d?.[fila.clave];

                      const claseColor =
                        fila.clave === "dinero"
                          ? "verde-economico"
                          : [
                              "sethomes",
                              "subastas",
                              "warps",
                              "tiendas",
                              "trabajos",
                            ].includes(fila.clave)
                          ? "amarillo-beneficio"
                          : ["keys_survival", "keys_oneblock"].includes(
                              fila.clave
                            )
                          ? "violeta-keys"
                          : ["kit", "comida", "dupe"].includes(fila.clave)
                          ? "dorado-kit"
                          : "";

                      const claseCheck = fila.clave.includes("avanzados")
                        ? "check-avanzado"
                        : fila.clave.includes("extra")
                        ? "check-extra"
                        : "check-basico";

                      return (
                        <div
                          key={rango.id + fila.clave}
                          className="beneficio-celda"
                        >
                          {typeof valor === "boolean" ? (
                            valor ? (
                              <img
                                src="/assets/check.webp"
                                alt="Sí"
                                className={`icono-check ${claseCheck}`}
                              />
                            ) : (
                              <span className="no-disponible">X</span>
                            )
                          ) : fila.clave === "kit" ? (
                            <div className="kit-con-icono">
                              <img
                                src={
                                  valor &&
                                  String(valor)
                                    .toLowerCase()
                                    .includes("op")
                                    ? "/assets/netheritafull.webp"
                                    : valor &&
                                      String(valor)
                                        .toLowerCase()
                                        .includes("netherita")
                                    ? "/assets/netherita.webp"
                                    : "/assets/diamante.webp"
                                }
                                alt="Kit Icon"
                                className="kit-icono"
                              />
                              <span
                                className={`valor-num ${claseColor} kit-desplegable-toggle`}
                                onClick={() =>
                                  setKitDesplegado(
                                    kitDesplegado ? null : "todos"
                                  )
                                }
                                style={{ cursor: "pointer" }}
                                title="Ver detalles de los kits"
                              >
                                {valor ?? "—"} ▼
                              </span>
                            </div>
                          ) : (
                            <span className={`valor-num ${claseColor}`}>
                              {valor ?? "—"}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Detalle de kits (muestra los tres a la vez) */}
                {esFilaKit && kitDesplegado && (
                  <div className="fila-kit-detallado">
                    <div className="beneficio-label" />
                    <div className="beneficio-celda-group">
                      {RANGOS_ORDENADOS.map((id) => {
                        const rango = RANGOS.find((r) => r.id === id);
                        return (
                          <div
                            key={id + "_kitdetalle"}
                            className="beneficio-celda"
                          >
                            {rango?.kit_detallado?.length ? (
                              <ul className="kit-detalle-lista">
                                {rango.kit_detallado.map((item, index) => (
                                  <li key={index}>{item}</li>
                                ))}
                              </ul>
                            ) : (
                              <span className="kit-detalle-vacio">—</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL COMPRA */}
      <ModalCompraRango
        open={confirmando}
        rangoSeleccionado={rangoSeleccionado}
        precios={precios}
        comprando={comprando}
        onConfirm={confirmarCompra}
        onCancel={() => setConfirmando(false)}
      />

      {/* MODAL DETALLE RANGO */}
      {detalleRango && (
        <RangoDetalleModal detalleRango={detalleRango} onClose={cerrarDetalles} />
      )}

      {/* EFECTO MÁGICO MIENTRAS COMPRA */}
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

export default RangoSelectorAnimado;
