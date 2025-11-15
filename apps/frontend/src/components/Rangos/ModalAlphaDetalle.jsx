// apps/frontend/src/components/Rangos/ModalAlphaDetalle.jsx

function ModalAlphaDetalle({ detalleRango, onClose }) {
  if (!detalleRango) return null;

  const imgs = detalleRango.imagenes || {};

  // Lista de comandos "utiles" tal cual el texto de Tebex
  const comandosUtiles = [
    {
      comando: "/repair",
      cooldown: "30s",
      descripcion: "Repara el objeto en tu mano.",
    },
    {
      comando: "/feed",
      cooldown: "5min",
      descripcion: "Rellena tu barra de comida.",
    },
    {
      comando: "/stonecutter",
      descripcion: "Abre el cortapiedras.",
    },
    {
      comando: "/enderchest",
      descripcion: "Accede a tu cofre del End.",
    },
    {
      comando: "/condense",
      descripcion: "Convierte minerales en bloques automáticamente.",
    },
    {
      comando: "/vision",
      descripcion: "Activa o desactiva la visión nocturna.",
    },
  ];

  const kitItems = detalleRango.kit_detallado || [];

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

        {/* HEADER GENERAL ALPHA */}
        <div className="modal-detalle-header">
          <img
            src={detalleRango.imagen}
            alt={detalleRango.nombre}
            className="modal-detalle-imagen-rango"
          />
          <div className="modal-detalle-titulos">
            <h3>{detalleRango.meta?.titulo || "ALPHA 30 Días"}</h3>
            <p>
              {detalleRango.meta?.descripcionCorta ||
                "Rango intermedio ALPHA con más trabajos, mejores recompensas y kit full Netherita."}
            </p>
          </div>
        </div>

        {/* BLOQUE 1: BANNER TOP + PREFIJO + BENEFICIOS BASE */}
        <div className="nova-bloque">
          {imgs.topBanner && (
            <img
              src={imgs.topBanner}
              alt="Banner ALPHA top"
              className="nova-banner"
            />
          )}

          <p className="nova-linea">
            Prefijo{" "}
            {imgs.prefijo && (
              <img
                src={imgs.prefijo}
                alt="Prefijo ALPHA"
                className="nova-prefijo-img"
              />
            )}{" "}
            en el chat y en Tab
          </p>

          {imgs.check && (
            <>
              <p className="nova-linea">
                <img src={imgs.check} alt="✔" className="nova-check" />
                Acceso a los beneficios de los rangos anteriores.
              </p>
              <p className="nova-linea">
                <img src={imgs.check} alt="✔" className="nova-check" />
                ¡Podrás acceder al servidor cuando esté lleno!
              </p>
            </>
          )}
        </div>

        {/* BLOQUE 2: BANNER f041... + TRABAJOS, DINERO, KIT ALPHA + IMÁGENES KIT */}
        <div className="nova-bloque">
          {imgs.secciones?.[0] && (
            <img
              src={imgs.secciones[0]}
              alt="Banner ALPHA seccion 1"
              className="nova-banner"
            />
          )}

          <p className="nova-linea">
            Prefijo{" "}
            {imgs.prefijo && (
              <img
                src={imgs.prefijo}
                alt="Prefijo ALPHA"
                className="nova-prefijo-img"
              />
            )}{" "}
            en el chat y en Tab
          </p>

          {imgs.check && (
            <>
              <p className="nova-linea">
                <img src={imgs.check} alt="✔" className="nova-check" />
                Acceso a los beneficios de los rangos anteriores.
              </p>
              <p className="nova-linea">
                <img src={imgs.check} alt="✔" className="nova-check" />
                ¡Podrás acceder al servidor cuando esté lleno!
              </p>
              <p className="nova-linea">
                <img src={imgs.check} alt="✔" className="nova-check" />
                Acceso a tener <strong>5 trabajos</strong> al mismo tiempo
              </p>
              <p className="nova-linea">
                <img src={imgs.check} alt="✔" className="nova-check" />
                <strong>x15.000 $ Dinero del servidor</strong>
              </p>
              <p className="nova-linea">
                <img src={imgs.check} alt="✔" className="nova-check" />
                <strong>Acceso al Kit ALPHA cada 6 Horas.</strong>
              </p>
            </>
          )}

          {/* Logos del kit ALPHA (b717..., dab8...) */}
          <div className="nova-inline-images">
            {imgs.kitLogos?.[0] && (
              <img
                src={imgs.kitLogos[0]}
                alt="Kit ALPHA logo 1"
                className="nova-kitlogo"
              />
            )}
            {imgs.kitLogos?.[1] && (
              <img
                src={imgs.kitLogos[1]}
                alt="Kit ALPHA logo 2"
                className="nova-kitlogo"
              />
            )}
          </div>

          {/* Imágenes grandes del kit (80a3..., a01c...) */}
          <div className="nova-inline-images">
            {imgs.kitItems?.[0] && (
              <img
                src={imgs.kitItems[0]}
                alt="Kit ALPHA items 1"
                className="nova-kitart"
              />
            )}
            {imgs.kitItems?.[1] && (
              <img
                src={imgs.kitItems[1]}
                alt="Kit ALPHA items 2"
                className="nova-kitart"
              />
            )}
          </div>
        </div>

        {/* COMANDOS (primer bloque COMANDOS:) */}
        <div className="nova-bloque nova-comandos">
          <h4>COMANDOS:</h4>
          <ul className="detalle-lista comandos-lista">
            <li key="/repair">
              <p>
                <code>/repair</code>{" "}
                <span className="cooldown">(30s cooldown)</span> → Repara el
                objeto en tu mano.
              </p>
            </li>
            <li key="/feed">
              <p>
                <code>/feed</code>{" "}
                <span className="cooldown">(5min cooldown)</span> → Rellena tu
                barra de comida.
              </p>
            </li>
            <li key="/workbench">
              <p>
                <code>/workbench</code> o <code>/craft</code> → Abre la mesa de
                crafteo.
              </p>
            </li>
            {comandosUtiles
              .filter((c) => c.comando !== "/repair" && c.comando !== "/feed")
              .map((c) => (
                <li key={c.comando}>
                  <p>
                    <code>{c.comando}</code>
                    {c.cooldown && (
                      <>
                        {" "}
                        <span className="cooldown">
                          ({c.cooldown} cooldown)
                        </span>
                      </>
                    )}{" "}
                    → {c.descripcion}
                  </p>
                </li>
              ))}
          </ul>
        </div>

        {/* BLOQUE 3: BANNER 539a... + ECONOMÍA/KEYS/MATERIALES/KIT DETALLADO */}
        <div className="nova-bloque">
          {imgs.secciones?.[1] && (
            <img
              src={imgs.secciones[1]}
              alt="Banner ALPHA seccion 2"
              className="nova-banner"
            />
          )}

          <p className="nova-linea">
            Prefijo{" "}
            {imgs.prefijo && (
              <img
                src={imgs.prefijo}
                alt="Prefijo ALPHA"
                className="nova-prefijo-img"
              />
            )}{" "}
            en el chat y en Tab
          </p>

          {imgs.check && (
            <>
              <p className="nova-linea">
                <img src={imgs.check} alt="✔" className="nova-check" />
                Acceso a los beneficios de los rangos anteriores.
              </p>
              <p className="nova-linea">
                <img src={imgs.check} alt="✔" className="nova-check" />
                ¡Podrás acceder al servidor cuando esté lleno!
              </p>
              <p className="nova-linea">
                <img src={imgs.check} alt="✔" className="nova-check" />
                Podrás añadir hasta <strong>40 Subastas</strong>
              </p>
              <p className="nova-linea">
                <img src={imgs.check} alt="✔" className="nova-check" />
                Podrás añadir hasta <strong>20 Warps Personales</strong>
              </p>
              <p className="nova-linea">
                <img src={imgs.check} alt="✔" className="nova-check" />
                <strong>Acceso a crear hasta 30 Tiendas Personales</strong>
              </p>
              <p className="nova-linea">
                <img src={imgs.check} alt="✔" className="nova-check" />
                Cambiar el mob del Spawner con un Huevo de Mob
              </p>
              <p className="nova-linea">
                <img src={imgs.check} alt="✔" className="nova-check" />
                Establece hasta <strong>20 puntos de inicio (sethome)</strong>
              </p>
              <p className="nova-linea">
                <img src={imgs.check} alt="✔" className="nova-check" />
                <strong>x110.000 $ Dinero del servidor</strong>
              </p>
              <p className="nova-linea">
                <img src={imgs.check} alt="✔" className="nova-check" />
                x20 Keys Básica
              </p>
              <p className="nova-linea">
                <img src={imgs.check} alt="✔" className="nova-check" />
                x8 Keys Épica
              </p>
              <p className="nova-linea">
                <img src={imgs.check} alt="✔" className="nova-check" />
                Estos materiales :
              </p>
            </>
          )}

          {/* Imagen de materiales */}
          {imgs.materiales && (
            <div className="modal-detalle-materiales-wrapper">
              <img
                src={imgs.materiales}
                alt="Materiales del rango ALPHA"
                className="modal-detalle-materiales"
              />
            </div>
          )}

          {/* Kit ALPHA detallado */}
          <h4 style={{ marginTop: "0.75rem" }}>Acceso al Kit ALPHA :</h4>
          <ul className="detalle-lista">
            {kitItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        {/* COMANDOS (segundo bloque, repetido como en Tebex) */}
        <div className="nova-bloque nova-comandos">
          <h4>COMANDOS:</h4>
          <ul className="detalle-lista comandos-lista">
            <li key="/repair-2">
              <p>
                <code>/repair</code>{" "}
                <span className="cooldown">(30s cooldown)</span> → Repara el
                objeto en tu mano.
              </p>
            </li>
            <li key="/feed-2">
              <p>
                <code>/feed</code>{" "}
                <span className="cooldown">(5min cooldown)</span> → Rellena tu
                barra de comida.
              </p>
            </li>
            <li key="/workbench-2">
              <p>
                <code>/workbench</code> o <code>/craft</code> → Abre la mesa de
                crafteo.
              </p>
            </li>
            {comandosUtiles
              .filter((c) => c.comando !== "/repair" && c.comando !== "/feed")
              .map((c) => (
                <li key={`${c.comando}-2`}>
                  <p>
                    <code>{c.comando}</code>
                    {c.cooldown && (
                      <>
                        {" "}
                        <span className="cooldown">
                          ({c.cooldown} cooldown)
                        </span>
                      </>
                    )}{" "}
                    → {c.descripcion}
                  </p>
                </li>
              ))}
          </ul>
        </div>

        {/* BLOQUE 4: BANNER 627d... + /afk, /compass, /feed, /hat */}
        <div className="nova-bloque">
          {imgs.secciones?.[2] && (
            <img
              src={imgs.secciones[2]}
              alt="Banner ALPHA seccion 3"
              className="nova-banner"
            />
          )}

          <p className="nova-linea">
            Prefijo{" "}
            {imgs.prefijo && (
              <img
                src={imgs.prefijo}
                alt="Prefijo ALPHA"
                className="nova-prefijo-img"
              />
            )}{" "}
            en el chat y en Tab
          </p>

          {imgs.check && (
            <>
              <p className="nova-linea">
                <img src={imgs.check} alt="✔" className="nova-check" />
                Acceso a los beneficios de los rangos anteriores.
              </p>
              <p className="nova-linea">
                <img src={imgs.check} alt="✔" className="nova-check" />
                ¡Podrás acceder al servidor cuando esté lleno!
              </p>
              <p className="nova-linea">
                <img src={imgs.check} alt="✔" className="nova-check" />
                Tendrás acceso al comando <code>/afk</code>
              </p>
              <p className="nova-linea">
                <img src={imgs.check} alt="✔" className="nova-check" />
                Tendrás acceso al comando <code>/compass</code>
              </p>
              <p className="nova-linea">
                <img src={imgs.check} alt="✔" className="nova-check" />
                Tendrás acceso al comando <code>/feed</code>
              </p>
              <p className="nova-linea">
                <img src={imgs.check} alt="✔" className="nova-check" />
                Tendrás acceso al comando <code>/hat</code>
              </p>
            </>
          )}
        </div>

        {/* BLOQUE 5: BANNER  a7607... + /dupe x8 */}
        <div className="nova-bloque">
          {imgs.secciones?.[3] && (
            <img
              src={imgs.secciones[3]}
              alt="Banner ALPHA seccion 4"
              className="nova-banner"
            />
          )}

          <p className="nova-linea">
            Prefijo{" "}
            {imgs.prefijo && (
              <img
                src={imgs.prefijo}
                alt="Prefijo ALPHA"
                className="nova-prefijo-img"
              />
            )}{" "}
            en el chat y en Tab
          </p>

          {imgs.check && (
            <>
              <p className="nova-linea">
                <img src={imgs.check} alt="✔" className="nova-check" />
                Acceso a los beneficios de los rangos anteriores.
              </p>
              <p className="nova-linea">
                <img src={imgs.check} alt="✔" className="nova-check" />
                ¡Podrás acceder al servidor cuando esté lleno!
              </p>
              <p className="nova-linea">
                <img src={imgs.check} alt="✔" className="nova-check" />
                <strong>
                  Multiplica x8 el ítem que tengas en la mano con{" "}
                  <code>/dupe</code>
                </strong>
              </p>
            </>
          )}
        </div>

        {/* NOTAS / DISCLAIMER FINAL */}
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

export default ModalAlphaDetalle;
