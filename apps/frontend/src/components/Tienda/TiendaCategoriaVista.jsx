import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import TiendaProductosVista from "./TiendaProductosVista";
import {
  API_URL,
  SUBCATS_PER_TILE,
  pickSubcatsFromApi,
  filterPackagesBySubcats,
} from "./tiendaHelpers";
import "../../styles/components/Tienda/tienda-categoria.scss";

/**
 * Vista de una categoría concreta de la tienda:
 * 1) Lee :server y :categoria
 * 2) Pide /api/tebex/datos?sv=:server
 * 3) Genera categoría sintética con subcategorías reales
 */
const TiendaCategoriaVista = ({ carrito, toggleProducto }) => {
  const { server, categoria, subcategoria } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [paquetes, setPaquetes] = useState([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null);
  const [error, setError] = useState("");

  // Mapa server+slug → lista de subcategorías reales que deben verse
  const mapKey = `${(server || "").toLowerCase()}|${(
    categoria || ""
  ).toLowerCase()}`;
  const nombresPermitidos = SUBCATS_PER_TILE[mapKey] || [];

  useEffect(() => {
    let cancel = false;

    async function cargar() {
      setLoading(true);
      setError("");

      try {
        const r = await fetch(`${API_URL}/api/tebex/datos?sv=${server}`);
        if (!r.ok) {
          throw new Error("No se pudo cargar la tienda para este servidor.");
        }
        const data = await r.json();

        const subcats = pickSubcatsFromApi(
          data.categorias || [],
          nombresPermitidos
        );

        const catObj = {
          name:
            (categoria === "survival-clasico" && "SURVIVAL CLÁSICO") ||
            (categoria === "oneblock" && "ONEBLOCK") ||
            (categoria === "rangos" && "RANGOS") ||
            (categoria === "premium" && "PREMIUM") ||
            (categoria === "chunklock" && "CHUNKLOCK") ||
            (categoria === "antes-de-comprar" && "¡ANTES DE COMPRAR!") ||
            (categoria && categoria.toUpperCase()) ||
            "CATEGORÍA",
          slug: categoria,
          subcategorias: subcats,
        };

        if (!cancel) {
          setPaquetes(data.paquetes || []);
          setCategoriaSeleccionada(catObj);
        }
      } catch (e) {
        if (!cancel) setError(e.message || "Error al cargar");
      } finally {
        if (!cancel) setLoading(false);
      }
    }

    cargar();
    return () => {
      cancel = true;
    };
  }, [server, categoria, nombresPermitidos]);

  const productosFiltrados = useMemo(() => {
    if (!categoriaSeleccionada) return [];
    return filterPackagesBySubcats(
      paquetes,
      categoriaSeleccionada.subcategorias || []
    );
  }, [paquetes, categoriaSeleccionada]);

// -----------------------------
// ESTADO: CARGANDO (F NEÓN)
// -----------------------------
if (loading) {
  return (
    <div className="tienda-tebex tienda-tebex--loading">
      <div className="tienda-loading-inner">
        <div className="logo-f-loader">
          <span>F</span>
        </div>
        <p className="tienda-loading-text">CARGANDO LA TIENDA...</p>
      </div>
    </div>
  );
}


  // -----------------------------
  // ESTADO: ERROR
  // -----------------------------
  if (error) {
    return (
      <div className="tienda-tebex">
        <div className="tienda-contenido">
          <div className="error-box">
            <strong>Error:</strong> {error}
          </div>
        </div>
      </div>
    );
  }

  // -----------------------------
  // ESTADO: SIN CATEGORÍA
  // -----------------------------
  if (!categoriaSeleccionada) {
    return (
      <div className="tienda-tebex">
        <div className="tienda-contenido">
          <div className="error-box">
            <strong>No se encontró la categoría.</strong>
            <div style={{ marginTop: ".6rem" }}>
              <button onClick={() => navigate("/tienda")}>
                Volver a categorías
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -----------------------------
  // VISTA ESPECIAL: ANTES DE COMPRAR
  // -----------------------------
  if (categoria === "antes-de-comprar" && productosFiltrados.length === 0) {
    return (
      <div className="tienda-tebex">
        <div className="tienda-contenido tienda-antes-comprar">
          <button className="volver" onClick={() => navigate("/tienda")}>
            Volver a categorías
          </button>

          <h2 className="tienda-antes-comprar-titulo">
            {categoriaSeleccionada.name}
          </h2>

          <div className="antes-comprar-texto">
            <p>
              Antes de realizar cualquier compra en la tienda de FlanCraft, es
              importante que revises con calma esta información. Queremos evitar
              problemas, cobros en la cuenta equivocada y, sobre todo,
              asegurarnos de que tienes la mejor experiencia posible.
            </p>

            <h3>1. Asegúrate de entrar con la cuenta correcta</h3>
            <ul>
              <li>
                Conéctate al servidor de Minecraft con la cuenta con la que
                juegas habitualmente.
              </li>
              <li>
                Utiliza exactamente el mismo nombre de jugador que aparece en el
                servidor (incluyendo mayúsculas/minúsculas).
              </li>
              <li>
                Si escribes mal tu nick, el paquete puede entregarse a otro
                jugador o perderse, y eso no se puede corregir fácilmente.
              </li>
            </ul>

            <h3>2. Cómo funcionan las compras en FlanCraft</h3>
            <ul>
              <li>
                Los pagos son gestionados de forma segura por Tebex (la
                plataforma oficial para tiendas de servidores de Minecraft).
              </li>
              <li>
                Una vez confirmado el pago, los paquetes se entregan en el juego
                cuando entras al servidor correspondiente.
              </li>
              <li>
                Algunos productos pueden requerir que tengas espacio en el
                inventario o que estés en un servidor concreto (por ejemplo,
                llaves de OneBlock o rangos del servidor Clásico).
              </li>
            </ul>

            <h3>3. Rangos y ECOS</h3>
            <p>
              En esta sección de la web verás principalmente paquetes especiales
              (rangos, llaves, objetos únicos, etc.). Ten en cuenta:
            </p>
            <ul>
              <li>
                Los <strong>rangos</strong> y paquetes permanentes se asocian a
                tu cuenta de Minecraft y no son transferibles.
              </li>
              <li>
                Los <strong>ECOS</strong> (moneda exclusiva de FlanCraft) no se
                pueden comprar con dinero real desde la tienda; se obtienen
                únicamente a través de misiones, eventos y sistemas web
                especiales.
              </li>
              <li>
                En resumen:{" "}
                <strong>
                  los rangos de esta sección se pagan con dinero real
                </strong>
                ; los ECOS se usan para otras secciones internas de la web
                (como el sistema de rangos por ECOS y recompensas de misiones).
              </li>
            </ul>

            <h3>4. Compras automáticas y renovaciones</h3>
            <p>
              Algunos paquetes pueden indicar una duración (por ejemplo, 30 días
              en el caso de ciertos rangos temporales). En esos casos:
            </p>
            <ul>
              <li>
                La duración empezará a contar desde el momento en que el rango
                se aplique a tu cuenta dentro del servidor.
              </li>
              <li>
                Si el paquete indica que es una suscripción, se renovará de
                forma automática según las condiciones que se muestren en el
                propio producto. Asegúrate de leer bien la descripción antes de
                comprar.
              </li>
              <li>
                Si ya no quieres que un paquete se renueve, deberás cancelar la
                suscripción desde el panel de Tebex o la plataforma de pago
                asociada (por ejemplo, tu cuenta de PayPal).
              </li>
            </ul>

            <h3>5. Problemas con compras o entregas</h3>
            <p>
              Si crees que algo no ha ido bien con tu compra, antes de abrir un
              ticket prepara esta información:
            </p>
            <ul>
              <li>Nombre de tu cuenta de Minecraft.</li>
              <li>Correo electrónico usado en el pago.</li>
              <li>ID del pago o recibo (PayPal, tarjeta, etc.).</li>
              <li>
                Fecha y hora aproximada de la compra y qué paquete intentabas
                adquirir.
              </li>
            </ul>
            <p>
              Con esos datos podremos revisar tu caso mucho más rápido y darte
              una solución.
            </p>

            <h3>6. Normas y reembolsos</h3>
            <p>
              Al comprar en la tienda de FlanCraft aceptas nuestras normas y
              términos de uso. Los reembolsos no están garantizados, especialmente
              en casos de:
            </p>
            <ul>
              <li>Uso indebido o compartido de cuentas.</li>
              <li>Sanciones por incumplir las normas del servidor.</li>
              <li>Errores al escribir el nombre del jugador.</li>
            </ul>
            <p>
              Queremos que la experiencia sea justa y transparente tanto para ti
              como para el resto de la comunidad.
            </p>

            <p className="antes-comprar-cierre">
              Si después de leer todo esto sigues teniendo dudas, te recomendamos
              preguntar en nuestro Discord antes de hacer la compra. ¡Así te
              aseguras de elegir el paquete perfecto para ti!
            </p>
          </div>
        </div>
      </div>
    );
  }

  // -----------------------------
  // VISTA NORMAL DE CATEGORÍA
  // -----------------------------
  return (
    <div className="tienda-tebex">
      <div className="tienda-contenido">
        <TiendaProductosVista
          key={`${server}-${categoria}-${subcategoria || "root"}`}
          server={server}
          productos={productosFiltrados}
          categoria={categoriaSeleccionada}
          carrito={carrito}
          toggleProducto={toggleProducto}
          subcategoriaSeleccionadaURL={subcategoria}
          permitidas={nombresPermitidos}
          onVolver={() => navigate("/tienda")}
        />
      </div>
    </div>
  );
};

export default TiendaCategoriaVista;
