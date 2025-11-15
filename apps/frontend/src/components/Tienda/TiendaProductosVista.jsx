// apps/frontend/src/components/Tienda/TiendaProductosVista.jsx
import React, { useMemo, useState } from "react";
import { PORTADA_TILES } from "./tiendaHelpers";
import "../../styles/components/Tienda/tienda-productos.scss";

/**
 * Vista interna de productos al estilo Wynncraft.
 *
 * Props:
 * - server
 * - productos: array de paquetes ya filtrados por categoría
 * - categoria: { name, slug, subcategorias? }
 * - carrito: array de productos en carrito (con .id)
 * - toggleProducto: fn(pkg)
 * - subcategoriaSeleccionadaURL: string | undefined
 * - permitidas: subcategorías permitidas (desde helpers)
 * - onVolver: fn() → volver a listado de categorías
 */
const TiendaProductosVista = ({
  server,
  productos,
  categoria,
  carrito = [],
  toggleProducto,
  subcategoriaSeleccionadaURL,
  permitidas = [],
  onVolver,
}) => {
  // ---------------------------------------------
  // Icono e intro de la categoría
  // ---------------------------------------------
  const { iconSrc, descripcion, subtitulo } = useMemo(() => {
    const slug = (categoria?.slug || "").toLowerCase();

    // Intentar usar la MISMA imagen que en la portada
    const tileMatch =
      PORTADA_TILES.find(
        (tile) =>
          tile.slug.toLowerCase() === slug &&
          (!server ||
            (tile.server || "").toLowerCase() === server.toLowerCase())
      ) ||
      PORTADA_TILES.find(
        (tile) => tile.slug.toLowerCase() === slug
      );

    const baseIcon = tileMatch?.image || null;

    switch (slug) {
      case "premium":
        return {
          iconSrc: baseIcon || "/tienda/imagenes/icon-premium.png",
          descripcion:
            "Premium es el paquete de apoyo al servidor. Consigue ventajas globales, bonos de economía y muchas mejoras de calidad de vida en todos los mundos de FlanCraft.",
          subtitulo:
            "Perfecto si quieres apoyar el proyecto y disfrutar de una experiencia más cómoda en todos los modos de juego.",
        };
      case "rangos":
        return {
          iconSrc: baseIcon || "/tienda/imagenes/icon-rangos.png",
          descripcion:
            "Los rangos desbloquean beneficios únicos, tags especiales en el chat y ventajas exclusivas en el servidor.",
          subtitulo:
            "Elige el rango que más encaje contigo y destaca entre el resto de aventureros.",
        };
      case "oneblock":
        return {
          iconSrc: baseIcon || "/tienda/imagenes/icon-oneblock.png",
          descripcion:
            "Paquetes diseñados específicamente para el mundo de OneBlock. Progresión, llaves y ventajas personalizadas.",
          subtitulo:
            "Ideal si tu hogar principal está en OneBlock y quieres potenciar tu isla.",
        };
      case "chunklock":
        return {
          iconSrc: baseIcon || "/tienda/imagenes/icon-chunklock.png",
          descripcion:
            "Paquetes pensados para el modo Chunklock, donde cada chunk cuenta y cada mejora marca la diferencia.",
          subtitulo:
            "Perfecto para quienes quieren exprimir al máximo esta modalidad estratégica.",
        };
      default:
        return {
          iconSrc: baseIcon || "/tienda/imagenes/icon-default.png",
          descripcion:
            "Explora los paquetes disponibles en esta categoría y encuentra el que mejor se adapte a tu forma de jugar.",
          subtitulo:
            "Cada paquete está pensado para mejorar tu experiencia dentro de FlanCraft.",
        };
    }
  }, [categoria, server]);

  // ---------------------------------------------
  // Subcategorías (si las hay)
  // ---------------------------------------------
  const subcats = useMemo(
    () => categoria?.subcategorias || [],
    [categoria]
  );

  const [subcatActiva, setSubcatActiva] = useState(
    subcategoriaSeleccionadaURL || subcats[0]?.slug || null
  );

  const productosMostrados = useMemo(() => {
    if (!subcatActiva) return productos;
    // Si los productos tienen campo de subcategoría:
    return productos.filter((p) => {
      const catSlug =
        (p.subcategoria_slug ||
          p.subcategoria ||
          p.categoria_slug ||
          p.category_slug ||
          "").toLowerCase();
      return !catSlug || catSlug === subcatActiva.toLowerCase();
    });
  }, [productos, subcatActiva]);

  // ---------------------------------------------
  // Modal de detalle de producto
  // ---------------------------------------------
  const [productoDetalle, setProductoDetalle] = useState(null);

  const abrirDetalle = (pkg) => {
    setProductoDetalle(pkg);
  };

  const cerrarDetalle = () => {
    setProductoDetalle(null);
  };

  const estaEnCarrito = (pkgId) =>
    carrito.some((p) => String(p.id) === String(pkgId));

  return (
    <div
      className={`vista-productos-wynn vista-productos-wynn--${
        (categoria?.slug || "generic").toLowerCase()
      }`}
    >
      {/* CABECERA PARCHMENT */}
      <header className="wynn-header">
        <div className="wynn-header-left">
          <div className="wynn-header-icon">
            {iconSrc && (
              <img
                src={iconSrc}
                alt={categoria?.name || "Categoría"}
                className="wynn-header-icon-img"
              />
            )}
          </div>

          <div className="wynn-header-text">
            <h2 className="wynn-header-title">{categoria?.name}</h2>
            <p className="wynn-header-desc">{descripcion}</p>
            <p className="wynn-header-sub">{subtitulo}</p>
          </div>
        </div>

        <div className="wynn-header-right">
          {subcats.length > 0 && (
            <div className="wynn-subcats-mini">
              {subcats.map((sc) => (
                <button
                  key={sc.slug || sc.id}
                  className={`wynn-subcat-mini ${
                    subcatActiva === sc.slug ? "active" : ""
                  }`}
                  onClick={() => setSubcatActiva(sc.slug)}
                >
                  {sc.name || sc.nombre}
                </button>
              ))}
            </div>
          )}

          <button className="wynn-close-btn" onClick={onVolver}>
            <span className="wynn-close-x">×</span>
            <span className="wynn-close-text">Volver a categorías</span>
          </button>
        </div>
      </header>

      {/* CUERPO CON PRODUCTOS */}
      <section className="wynn-body">
        {productosMostrados.length === 0 ? (
          <p className="wynn-sin-productos">
            No hay productos disponibles en esta categoría por el momento.
          </p>
        ) : (
          <div className="wynn-products-row">
            {productosMostrados.map((pkg) => {
              const id = pkg.id || pkg.package_id;
              const nombre = pkg.nombre || pkg.name;
              const precio = pkg.precio || pkg.price || 0;
              const precioFormato = `${precio.toFixed(2)} €`;
              const precioOriginal =
                pkg.precio_original || pkg.original_price || null;
              const precioOriginalFormato =
                typeof precioOriginal === "number"
                  ? `${precioOriginal.toFixed(2)} €`
                  : null;
              const img =
                pkg.image_url ||
                pkg.image ||
                "/assets/tienda/producto-placeholder.png";

              const enCarrito = estaEnCarrito(id);

              return (
                <article
                  key={id}
                  className={`wynn-product-card ${
                    enCarrito ? "in-cart" : ""
                  }`}
                  onClick={() => abrirDetalle(pkg)}
                >
                  <div className="wynn-product-top">
                    <div className="wynn-product-image-wrapper">
                      <img
                        src={img}
                        alt={nombre}
                        className="wynn-product-image"
                      />
                    </div>
                    <h4 className="wynn-product-name">{nombre}</h4>
                  </div>

                  <div className="wynn-producto-precio">
                    {precioOriginalFormato && (
                      <span className="wynn-precio-original">
                        {precioOriginalFormato}
                      </span>
                    )}
                    <span className="wynn-precio-oferta">
                      {precioFormato}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="wynn-product-cta"
                    onClick={(e) => {
                      e.stopPropagation(); // no abrir modal
                      toggleProducto(pkg);
                    }}
                  >
                    {enCarrito ? "Quitar del carrito" : "Añadir al carrito"}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* MODAL DETALLE */}
      {productoDetalle && (
        <div className="wynn-modal-overlay">
          <div className="wynn-modal">
            <button
              className="wynn-modal-close"
              onClick={cerrarDetalle}
              aria-label="Cerrar"
            >
              ×
            </button>

            <div className="wynn-modal-header">
              <div className="wynn-modal-image-frame">
                <img
                  src={
                    productoDetalle.image_url ||
                    productoDetalle.image ||
                    "/assets/tienda/producto-placeholder.png"
                  }
                  alt={productoDetalle.nombre || productoDetalle.name}
                  className="wynn-modal-image"
                />
              </div>
              <div className="wynn-modal-header-text">
                <h3 className="wynn-modal-title">
                  {productoDetalle.nombre || productoDetalle.name}
                </h3>
              </div>
            </div>

            <div className="wynn-modal-description">
              {productoDetalle.descripcion_html ? (
                <div
                  dangerouslySetInnerHTML={{
                    __html: productoDetalle.descripcion_html,
                  }}
                />
              ) : (
                <p>
                  {productoDetalle.descripcion ||
                    productoDetalle.description ||
                    "Este paquete incluye ventajas especiales dentro del servidor FlanCraft."}
                </p>
              )}
            </div>

            <div className="wynn-modal-actions">
              <button
                className="wynn-modal-cancel"
                type="button"
                onClick={cerrarDetalle}
              >
                Cerrar
              </button>
              <button
                className="wynn-modal-add"
                type="button"
                onClick={() => {
                  toggleProducto(productoDetalle);
                  cerrarDetalle();
                }}
              >
                Añadir al carrito
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TiendaProductosVista;
