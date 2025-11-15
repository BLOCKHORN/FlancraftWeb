// apps/frontend/src/components/Rangos/ModalNovaDetalle.jsx

function ModalNovaDetalle({ detalleRango, onClose }) {
  if (!detalleRango) return null;

  const imgs = detalleRango.imagenes || {};

  // Icono de check (para no repetir la URL 200 veces)
  const CheckIcon = () =>
    imgs.check ? (
      <img src={imgs.check} alt="✔" className="nova-check" />
    ) : null;

  const PrefijoLinea = () => (
    <p className="nova-linea">
      Prefijo{" "}
      {imgs.prefijo && (
        <img
          src={imgs.prefijo}
          alt="Prefijo NOVA"
          className="nova-prefijo-img"
        />
      )}{" "}
      en el chat y en Tab
    </p>
  );

  const comandos = [
    { comando: "/back", descripcion: "Vuelve a tu última posición." },
    { comando: "/compass", descripcion: "Muestra hacia dónde estás mirando." },
    { comando: "/disposal o /trash", descripcion: "Basura portátil." },
    { comando: "/loom", descripcion: "Abre el telar." },
    {
      comando: "/tpahere",
      descripcion: "Envía una solicitud de teleportación hacia ti.",
    },
    { comando: "/hat", descripcion: "Coloca cualquier objeto en tu cabeza." },
    {
      comando: "/smithtable",
      descripcion: "Abre la mesa de herrería.",
    },
    {
      comando: "/near (30s cooldown)",
      descripcion: "Muestra jugadores cercanos.",
    },
  ];

  const kitItems = [
    "Casco de Diamante ( Respiración 3, Protección 3, Irrompibilidad 3, Reparación 1 )",
    "Pechera de Diamante ( Protección 3, Irrompibilidad 3, Reparación 1 )",
    "Pantalones de Diamante ( Protección 3, Irrompibilidad 3, Reparación 1 )",
    "Botas de Diamante ( Protección 3, Irrompibilidad 3, Reparación 1 )",
    "Espada de Diamante ( Filo 3, Botín 3, Irrompibilidad 3, Reparación 1 )",
    "Pico de Diamante ( Eficiencia 2, Fortuna 2, Irrompibilidad 2, Reparación 2)",
    "Hacha de Diamante ( Eficiencia 2, Irrompibilidad 2, Reparación 1 )",
    "Pala de Diamante ( Eficiencia 2, Irrompibilidad 2, Reparación 1 )",
    "Azada de Diamante ( Eficiencia 2, Irrompibilidad 2, Reparación 1 )",
    "16 Zanahorias Doradas",
  ];

  return (
    <div className="modal-detalle-rango">
      <div className="modal-detalle-contenido nova-detalle">
        <button
          className="modal-detalle-cerrar"
          type="button"
          onClick={onClose}
        >
          ×
        </button>

        {/* HEADER GENERAL NOVA */}
        <div className="modal-detalle-header">
          <img
            src={detalleRango.imagen}
            alt={detalleRango.nombre}
            className="modal-detalle-imagen-rango"
          />
          <div className="modal-detalle-titulos">
            <h3>{detalleRango.meta?.titulo || "NOVA 30 Días"}</h3>
            <p>
              {detalleRango.meta?.descripcionCorta ||
                "Todo el contenido del rango NOVA 30 días, en el mismo orden que la tienda."}
            </p>
          </div>
        </div>

        {/* 2) Banner 158e00... */}
        <div className="nova-bloque">
          {imgs.bannerDuracion1 && (
            <img
              src={imgs.bannerDuracion1}
              alt="NOVA banner duración 1"
              className="nova-banner"
            />
          )}

          {/* 3) Prefijo + 2 checks */}
          <PrefijoLinea />

          <p className="nova-linea">
            <CheckIcon />
            Acceso a los beneficios de los rangos anteriores.
          </p>
          <p className="nova-linea">
            <CheckIcon />
            ¡Podrás acceder al servidor cuando esté lleno!
          </p>
        </div>

        {/* 4) Banner f041ac... + texto de trabajos/sethomes/dinero/kit */}
        <div className="nova-bloque">
          {imgs.bannerDuracion2 && (
            <img
              src={imgs.bannerDuracion2}
              alt="NOVA banner duración 2"
              className="nova-banner"
            />
          )}

          <PrefijoLinea />

          <p className="nova-linea">
            <CheckIcon />
            Acceso a los beneficios de los rangos anteriores.
          </p>
          <p className="nova-linea">
            <CheckIcon />
            ¡Podrás acceder al servidor cuando esté lleno!
          </p>
          <p className="nova-linea">
            <CheckIcon />
            Acceso a tener 4 trabajos al mismo tiempo
          </p>
          <p className="nova-linea">
            <CheckIcon />
            Establece hasta 10 <strong>puntos de inicio (sethome)</strong>
          </p>
          <p className="nova-linea">
            <CheckIcon />
            <strong>x5.000 $ Dinero del servidor</strong>
          </p>
          <p className="nova-linea">
            <CheckIcon />
            <strong>Acceso al Kit NOVA cada 6 Horas.</strong>
          </p>
        </div>

        {/* 5) Logos/imágenes f70d..., b8240..., 5eef..., 9af3... */}
        <div className="nova-bloque">
          <div className="nova-inline-images">
            {imgs.logo1 && (
              <img
                src={imgs.logo1}
                alt="Logo NOVA 1"
                className="nova-kitlogo"
              />
            )}
            {imgs.logo2 && (
              <img
                src={imgs.logo2}
                alt="Logo NOVA 2"
                className="nova-kitlogo"
              />
            )}
          </div>
          <div className="nova-inline-images">
            {imgs.logo3 && (
              <img
                src={imgs.logo3}
                alt="Logo NOVA 3"
                className="nova-kitart"
              />
            )}
            {imgs.logo4 && (
              <img
                src={imgs.logo4}
                alt="Logo NOVA 4"
                className="nova-kitart"
              />
            )}
          </div>
        </div>

        {/* 6) COMANDOS (primer bloque, en texto, sin banner de color aún) */}
        <div className="nova-bloque nova-comandos">
          <h4>COMANDOS:</h4>
          <ul className="detalle-lista comandos-lista">
            {comandos.map((c) => (
              <li key={c.comando}>
                <p>
                  <code>{c.comando}</code> → {c.descripcion}
                </p>
              </li>
            ))}
          </ul>
        </div>

        {/* 7) Banner 539a37... (comandos con color) + ECONOMÍA/KEYS/MATERIALES/KIT */}
        <div className="nova-bloque">
          {imgs.comandosColorBanner && (
            <img
              src={imgs.comandosColorBanner}
              alt="NOVA comandos color"
              className="nova-banner"
            />
          )}

          <PrefijoLinea />

          <p className="nova-linea">
            <CheckIcon />
            Acceso a los beneficios de los rangos anteriores.
          </p>
          <p className="nova-linea">
            <CheckIcon />
            ¡Podrás acceder al servidor cuando esté lleno!
          </p>
          <p className="nova-linea">
            <CheckIcon />
            Podrás añadir hasta 30 Subastas
          </p>
          <p className="nova-linea">
            <CheckIcon />
            Podrás añadir hasta 15 Warps Personales
          </p>
          <p className="nova-linea">
            <CheckIcon />
            <strong>Acceso a crear hasta 20 Tiendas Personales</strong>
          </p>
          <p className="nova-linea">
            <CheckIcon />
            <strong>Establece hasta 10 puntos de inicio (sethome)</strong>
          </p>
          <p className="nova-linea">
            <CheckIcon />
            <strong>x50.000 $ Dinero del servidor</strong>
          </p>
          <p className="nova-linea">
            <CheckIcon />
            x8 Keys Basica (OneBlock)
          </p>
          <p className="nova-linea">
            <CheckIcon />
            x3 Keys Epica (OneBlock)
          </p>
          <p className="nova-linea">
            <CheckIcon />
            Estos materiales :
          </p>

          {/* Imagen de materiales */}
          {imgs.materiales && (
            <div className="modal-detalle-materiales-wrapper">
              <img
                src={imgs.materiales}
                alt="Materiales del rango NOVA"
                className="modal-detalle-materiales"
              />
            </div>
          )}

          {/* Acceso al Kit NOVA (lista de ítems) */}
          <p className="nova-linea" style={{ marginTop: "0.6rem" }}>
            <CheckIcon />
            Acceso al Kit NOVA :
          </p>

          <ul className="detalle-lista">
            {kitItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        {/* 8) COMANDOS (segundo bloque, repetido como en Tebex) */}
        <div className="nova-bloque nova-comandos">
          <h4>COMANDOS:</h4>
          <ul className="detalle-lista comandos-lista">
            {comandos.map((c) => (
              <li key={`${c.comando}-2`}>
                <p>
                  <code>{c.comando}</code> → {c.descripcion}
                </p>
              </li>
            ))}
          </ul>
        </div>

        {/* 9) Banner 627d52... + /afk, /compass, /feed, /hat */}
        <div className="nova-bloque">
          {imgs.afkBanner && (
            <img
              src={imgs.afkBanner}
              alt="NOVA AFK banner"
              className="nova-banner"
            />
          )}

          <PrefijoLinea />

          <p className="nova-linea">
            <CheckIcon />
            Acceso a los beneficios de los rangos anteriores.
          </p>
          <p className="nova-linea">
            <CheckIcon />
            ¡Podrás acceder al servidor cuando esté lleno!
          </p>
          <p className="nova-linea">
            <CheckIcon />
            Tendrás acceso al comando <code>/afk</code>
          </p>
          <p className="nova-linea">
            <CheckIcon />
            Tendrás acceso al comando <code>/compass</code>
          </p>
          <p className="nova-linea">
            <CheckIcon />
            Tendrás acceso al comando <code>/feed</code>
          </p>
          <p className="nova-linea">
            <CheckIcon />
            Tendrás acceso al comando <code>/hat</code>
          </p>
        </div>

        {/* 10) Banner a7607d... + /dupe x6 */}
        <div className="nova-bloque">
          {imgs.dupeBanner && (
            <img
              src={imgs.dupeBanner}
              alt="NOVA dupe banner"
              className="nova-banner"
            />
          )}

          <PrefijoLinea />

          <p className="nova-linea">
            <CheckIcon />
            Acceso a los beneficios de los rangos anteriores.
          </p>
          <p className="nova-linea">
            <CheckIcon />
            ¡Podrás acceder al servidor cuando esté lleno!
          </p>
          <p className="nova-linea">
            <CheckIcon />
            <strong>
              Multiplica x6 el item que tengas en la mano con{" "}
              <code>/dupe</code>
            </strong>
          </p>
        </div>

        {/* 11) NOTAS / DISCLAIMER FINAL */}
        <div className="modal-detalle-notas nova-notas">
          <p>
            <u>
              Para poder obtener el paquete debes disponer de slots disponibles
              en tu inventario y estar dentro del servidor.
            </u>
          </p>
          <p>
            <strong>
              ¡Esta compra es de un único uso, así que si pierdes esta
              protección de cualquier modo, no podrá volver a ser entregada!
            </strong>
          </p>
          <p>
            <strong>
              FlanCraft no está afiliado de ninguna forma con Mojang, AB.
              Tampoco debe considerarse respaldado por Mojang, AB.
            </strong>
          </p>
        </div>
      </div>
    </div>
  );
}

export default ModalNovaDetalle;
