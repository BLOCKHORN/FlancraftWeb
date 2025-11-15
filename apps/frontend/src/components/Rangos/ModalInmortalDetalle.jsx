// apps/frontend/src/components/Rangos/ModalInmortalDetalle.jsx

function ModalInmortalDetalle({ detalleRango, onClose }) {
  if (!detalleRango) return null;

  const imgs = detalleRango.imagenes || {};

  // Comandos "gordos" que salen en los bloques COMANDOS:
  const comandos = [
    {
      comando: "/heal",
      descripcion: "Cura toda tu vida.",
      cooldown: "5min",
    },
    {
      comando: "/repairall",
      descripcion: "Repara todo tu inventario.",
      cooldown: "30s",
    },
    {
      comando: "/fly",
      descripcion: "Habilita el vuelo.",
      cooldown: null,
    },
    {
      comando: "/anvil",
      descripcion: "Abre el yunque.",
      cooldown: null,
    },
    {
      comando: "/kittycannon",
      descripcion: "¡Lanza gatos explosivos!",
      cooldown: "3min",
    },
    {
      comando: "/respirar",
      descripcion: "Permite respirar bajo el agua.",
      cooldown: null,
    },
    {
      comando: "/canal",
      alias: ["/canalizador"],
      descripcion: "Visión submarina.",
      cooldown: null,
    },
  ];

  const kitItems =
    detalleRango.kit_detallado || [
      "Casco de Netherita (Respiración 6, Protección 6, Irrompibilidad 6, Reparación 1, Espinas 6)",
      "Pechera de Netherita (Protección 6, Irrompibilidad 6, Reparación 1, Espinas 6)",
      "Pantalones de Netherita (Protección 6, Irrompibilidad 6, Reparación 1, Espinas 6)",
      "Botas de Netherita (Protección 6, Irrompibilidad 6, Reparación 1, Espinas 6)",
      "Espada de Netherita (Filo 6, Barrido 3, Aspecto Ígneo 3, Botín 6, Irrompibilidad 6, Reparación 1)",
      "Pico de Netherita (Eficiencia 6, Fortuna 6, Irrompibilidad 6, Reparación 1)",
      "Pico de Netherita (Eficiencia 6, Toque de Seda 1, Irrompibilidad 6, Reparación 1)",
      "Hacha de Netherita (Eficiencia 6, Irrompibilidad 6, Reparación 1)",
      "Pala de Netherita (Eficiencia 6, Irrompibilidad 6, Reparación 1)",
      "Azada de Netherita (Eficiencia 6, Irrompibilidad 6, Reparación 1)",
      "16 Manzanas Encantadas",
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

        {/* HEADER GENERAL INMORTAL */}
        <div className="modal-detalle-header">
          <img
            src={detalleRango.imagen}
            alt={detalleRango.nombre}
            className="modal-detalle-imagen-rango"
          />
          <div className="modal-detalle-titulos">
            <h3>{detalleRango.meta?.titulo || "INMORTAL 30 Días"}</h3>
            <p>
              {detalleRango.meta?.descripcionCorta ||
                "Todo el contenido del rango INMORTAL 30 días, respetando el mismo orden visual que en la tienda."}
            </p>
          </div>
        </div>

        {/* BLOQUE 1: PREFIJO + ACCESO BASE (primeros 2 checks) */}
        <div className="nova-bloque">
          {/* Si quisieras mostrar la imagen 158e00... aquí, podrías usar imgs.topBanner */}
          {imgs.banner1 && (
            <img
              src={imgs.banner1}
              alt="Banner INMORTAL 1"
              className="nova-banner"
            />
          )}

          <p className="nova-linea">
            Prefijo{" "}
            {imgs.prefijo && (
              <img
                src={imgs.prefijo}
                alt="Prefijo INMORTAL"
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

        {/* BLOQUE 2: BANNER GENERAL + TRABAJOS, SETHOMES, DINERO, KIT */}
        <div className="nova-bloque">
          {imgs.banner2 && (
            <img
              src={imgs.banner2}
              alt="Banner INMORTAL 2"
              className="nova-banner"
            />
          )}

          <p className="nova-linea">
            Prefijo{" "}
            {imgs.prefijo && (
              <img
                src={imgs.prefijo}
                alt="Prefijo INMORTAL"
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
                Acceso a tener <strong>6 trabajos</strong> al mismo tiempo
              </p>
              <p className="nova-linea">
                <img src={imgs.check} alt="✔" className="nova-check" />
                Cambiar el mob del Spawner con un Huevo de Mob
              </p>
              <p className="nova-linea">
                <img src={imgs.check} alt="✔" className="nova-check" />
                Acceso al modo automático de AFK.
              </p>
              <p className="nova-linea">
                <img src={imgs.check} alt="✔" className="nova-check" />
                Acceso a los beneficios de los rangos anteriores.
              </p>
              <p className="nova-linea">
                <img src={imgs.check} alt="✔" className="nova-check" />
                Establece hasta{" "}
                <strong>50 puntos de inicio (sethome)</strong>
              </p>
              <p className="nova-linea">
                <img src={imgs.check} alt="✔" className="nova-check" />
                <strong>x20.000 $ Dinero del servidor</strong>
              </p>
              <p className="nova-linea">
                <img src={imgs.check} alt="✔" className="nova-check" />
                <strong>Acceso al Kit INMORTAL cada 6 Horas.</strong>
              </p>
            </>
          )}

          {/* Logos de kit INMORTAL */}
          <div className="nova-inline-images">
            {imgs.kitLogo1 && (
              <img
                src={imgs.kitLogo1}
                alt="Kit INMORTAL logo 1"
                className="nova-kitlogo"
              />
            )}
            {imgs.kitLogo2 && (
              <img
                src={imgs.kitLogo2}
                alt="Kit INMORTAL logo 2"
                className="nova-kitlogo"
              />
            )}
          </div>

          {/* Imágenes de los ítems del kit */}
          <div className="nova-inline-images">
            {imgs.kitArt1 && (
              <img
                src={imgs.kitArt1}
                alt="Kit INMORTAL items 1"
                className="nova-kitart"
              />
            )}
            {imgs.kitArt2 && (
              <img
                src={imgs.kitArt2}
                alt="Kit INMORTAL items 2"
                className="nova-kitart"
              />
            )}
          </div>
        </div>

        {/* COMANDOS (primer bloque COMANDOS:) */}
        <div className="nova-bloque nova-comandos">
          <h4>COMANDOS:</h4>
          <ul className="detalle-lista comandos-lista">
            {comandos.map((c) => (
              <li key={c.comando}>
                <p>
                  <code>{c.comando}</code>
                  {c.alias?.length
                    ? c.alias.map((a) => (
                        <code key={a} style={{ marginLeft: 4 }}>
                          {a}
                        </code>
                      ))
                    : null}{" "}
                  → {c.descripcion}
                  {c.cooldown && (
                    <span className="cooldown">
                      {" "}
                      ({c.cooldown} cooldown)
                    </span>
                  )}
                </p>
              </li>
            ))}
          </ul>
        </div>

        {/* BLOQUE 3: ECONOMÍA, SUBASTAS, WARPS, KEYS, MATERIALES, KIT DETALLE */}
        <div className="nova-bloque">
          {imgs.banner3 && (
            <img
              src={imgs.banner3}
              alt="Banner INMORTAL 3"
              className="nova-banner"
            />
          )}

          <p className="nova-linea">
            Prefijo{" "}
            {imgs.prefijo && (
              <img
                src={imgs.prefijo}
                alt="Prefijo INMORTAL"
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
                Podrás añadir hasta <strong>45 Subastas</strong>
              </p>
              <p className="nova-linea">
                <img src={imgs.check} alt="✔" className="nova-check" />
                Podrás añadir hasta <strong>30 Warps Personales</strong>
              </p>
              <p className="nova-linea">
                <img src={imgs.check} alt="✔" className="nova-check" />
                <strong>Acceso a crear hasta 40 Tiendas Personales</strong>
              </p>
              <p className="nova-linea">
                <img src={imgs.check} alt="✔" className="nova-check" />
                Cambiar el mob del Spawner con un Huevo de Mob
              </p>
              <p className="nova-linea">
                <img src={imgs.check} alt="✔" className="nova-check" />
                Acceso al modo automático de AFK.
              </p>
              <p className="nova-linea">
                <img src={imgs.check} alt="✔" className="nova-check" />
                Acceso a los beneficios de los rangos anteriores.
              </p>
              <p className="nova-linea">
                <img src={imgs.check} alt="✔" className="nova-check" />
                Establece hasta{" "}
                <strong>50 puntos de inicio (sethome)</strong>
              </p>
              <p className="nova-linea">
                <img src={imgs.check} alt="✔" className="nova-check" />
                <strong>x230.000 $ Dinero del servidor</strong>
              </p>
              <p className="nova-linea">
                <img src={imgs.check} alt="✔" className="nova-check" />
                x35 Keys Básica
              </p>
              <p className="nova-linea">
                <img src={imgs.check} alt="✔" className="nova-check" />
                x18 Keys Épica
              </p>
              <p className="nova-linea">
                <img src={imgs.check} alt="✔" className="nova-check" />
                x5 Keys Legendaria
              </p>
              <p className="nova-linea">
                <img src={imgs.check} alt="✔" className="nova-check" />
                Estos materiales :
              </p>
            </>
          )}

          {/* Imagen de materiales especiales */}
          {imgs.materiales && (
            <div className="modal-detalle-materiales-wrapper">
              <img
                src={imgs.materiales}
                alt="Materiales del rango INMORTAL"
                className="modal-detalle-materiales"
              />
            </div>
          )}

          {/* Kit INMORTAL detallado */}
          <h4 style={{ marginTop: "0.75rem" }}>Acceso al Kit INMORTAL :</h4>
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
            {comandos.map((c) => (
              <li key={`${c.comando}-2`}>
                <p>
                  <code>{c.comando}</code>
                  {c.alias?.length
                    ? c.alias.map((a) => (
                        <code key={a} style={{ marginLeft: 4 }}>
                          {a}
                        </code>
                      ))
                    : null}{" "}
                  → {c.descripcion}
                  {c.cooldown && (
                    <span className="cooldown">
                      {" "}
                      ({c.cooldown} cooldown)
                    </span>
                  )}
                </p>
              </li>
            ))}
          </ul>
        </div>

        {/* BLOQUE 4: BANNER / COMANDOS COLOREADOS (/afk, /compass, /feed, /hat) */}
        <div className="nova-bloque">
          {imgs.banner4 && (
            <img
              src={imgs.banner4}
              alt="Banner INMORTAL 4"
              className="nova-banner"
            />
          )}

          <p className="nova-linea">
            Prefijo{" "}
            {imgs.prefijo && (
              <img
                src={imgs.prefijo}
                alt="Prefijo INMORTAL"
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

        {/* BLOQUE 5: BANNER /DUPE */}
        <div className="nova-bloque">
          {imgs.banner5 && (
            <img
              src={imgs.banner5}
              alt="Banner INMORTAL 5"
              className="nova-banner"
            />
          )}

          <p className="nova-linea">
            Prefijo{" "}
            {imgs.prefijo && (
              <img
                src={imgs.prefijo}
                alt="Prefijo INMORTAL"
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
                  Multiplica x10 el ítem que tengas en la mano con{" "}
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

export default ModalInmortalDetalle;
