// src/components/Tienda/TiendaFooter.jsx
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

const STRIP_HEIGHT = 35; // altura visible de la roca cuando está contraído

const TiendaFooter = () => {
  const [abierto, setAbierto] = useState(false);
  const [offset, setOffset] = useState(0);
  const innerRef = useRef(null);

  const toggle = () => setAbierto((v) => !v);
  const cerrar = () => setAbierto(false);

  // Calcula cuánto hay que esconder para que sólo se vea la roca
  useLayoutEffect(() => {
    const calcOffset = () => {
      const el = innerRef.current;
      if (!el) return;
      const h = el.getBoundingClientRect().height;
      const hidden = h - STRIP_HEIGHT;
      setOffset(hidden > 0 ? hidden : 0);
    };

    calcOffset();
    window.addEventListener("resize", calcOffset);
    return () => window.removeEventListener("resize", calcOffset);
  }, []);

  // CERRAR AL HACER CLICK FUERA DEL FOOTER
  useEffect(() => {
    if (!abierto) return;

    const handleClickOutside = (event) => {
      const el = innerRef.current;
      if (!el) return;

      // Si el click NO está dentro del bloque deslizante, cerramos
      if (!el.contains(event.target)) {
        setAbierto(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [abierto]);

  return (
    <footer
      className={[
        "tienda-footer",
        abierto ? "is-open" : "is-closed",
      ].join(" ")}
    >
      {/* BLOQUE DESLIZANTE: ROCA + TEXTO */}
      <div
        ref={innerRef}
        className="tienda-footer-inner"
        style={{ "--footer-offset": `${offset}px` }}
      >
        {/* Imagen de roca (clickable) */}
        <div className="tienda-footer-strip" onClick={toggle}>
          <button
            type="button"
            className="tienda-footer-toggle"
            aria-expanded={abierto}
            aria-label={
              abierto
                ? "Ocultar información legal"
                : "Mostrar información legal"
            }
            onClick={(e) => {
              e.stopPropagation();
              toggle();
            }}
          >
            <span className="tienda-footer-toggle-arrow" />
          </button>
        </div>

        {/* PANEL DEL FOOTER */}
        <div className="tienda-footer-panel">
          <div className="tienda-footer-bar">
            <div className="tienda-footer-main">
              {/* Columna SOBRE NOSOTROS */}
              <div className="tienda-footer-col tienda-footer-about">
                <h4 className="tienda-footer-title">Sobre nosotros</h4>
                <p>
                  FlanCraft es la tienda del servidor de Blockhorn, un servidor
                  de Minecraft con una gran variedad de modos de juego y
                  contenido único.{" "}
                  <strong className="tienda-footer-highlight">
                    Únete a FlanCraft y vive la experiencia completa.
                  </strong>
                </p>
              </div>

              {/* Columna LINKS */}
              <div className="tienda-footer-col tienda-footer-links">
                <h4 className="tienda-footer-title">Links</h4>
                <nav>
                  <ul>
                    <li>
                      <a href="/terminos">Términos</a>
                    </li>
                    <li>
                      <a href="/privacidad">Privacidad</a>
                    </li>
                    <li>
                      <a href="/impressum">Impressum</a>
                    </li>
                    <li>
                      <a href="/contacto">Contacta con nosotros</a>
                    </li>
                  </ul>
                </nav>
              </div>

              {/* Columna CONTACTO / DISCORD */}
              <div className="tienda-footer-col tienda-footer-contact">
                <h4 className="tienda-footer-title">Contacta con nosotros</h4>
                <p>
                  Si tienes alguna duda, inquietud o incidencia con tu compra,
                  puedes ponerte en contacto con nosotros a través de nuestro
                  servidor de Discord.
                </p>
                <a
                  href="https://discord.gg/flancraft"
                  target="_blank"
                  rel="noreferrer"
                  className="tienda-footer-discord-btn"
                >
                  Discord Server
                </a>
              </div>
            </div>

            {/* Franja inferior: copyright, disclaimer y crédito diseño */}
            <div className="tienda-footer-bottom">
              <span>Todos los derechos reservados. 2025 © FlanCraft</span>
              <span>
                FlanCraft no está afiliado de ninguna manera con Mojang AB, ni
                debe considerarse respaldado por Mojang AB.
              </span>
              <span className="tienda-footer-designed">
                Diseñado por
                <img
                  src="/assets/blockhorn.webp"
                  alt="Blockhorn"
                  className="tienda-footer-logo"
                />
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default TiendaFooter;
