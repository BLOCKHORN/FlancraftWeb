// src/components/Tienda/ui/TiendaFooter.jsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import "../../../styles/components/Tienda/tienda-footer.scss";

const PEEK_HEIGHT = 20; // lo visible cuando está cerrado

const TiendaFooter = () => {
  const [abierto, setAbierto] = useState(false);
  const footerRef = useRef(null);

  const toggle = useCallback(() => setAbierto((v) => !v), []);

  // Cerrar al hacer click fuera (solo cuando está abierto)
  useEffect(() => {
    if (!abierto) return;

    const onDown = (e) => {
      const footer = footerRef.current;
      if (!footer) return;
      if (!footer.contains(e.target)) setAbierto(false);
    };

    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });

    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [abierto]);

  // ESC para cerrar
  useEffect(() => {
    if (!abierto) return;
    const onKey = (e) => {
      if (e.key === "Escape") setAbierto(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [abierto]);

  return (
    <footer
      ref={footerRef}
      className={["tienda-footer", abierto ? "is-open" : "is-closed"].join(" ")}
      style={{ "--footer-peek-h": `${PEEK_HEIGHT}px` }}
      aria-label="Información legal"
    >
      <div className="tienda-footer-inner">
        {/* TIRA SUPERIOR (mango) */}
        <div
          className="tienda-footer-strip"
          onClick={toggle}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              toggle();
            }
          }}
          aria-label={
            abierto ? "Ocultar información legal" : "Mostrar información legal"
          }
        >
          <button
            type="button"
            className="tienda-footer-toggle"
            aria-expanded={abierto}
            aria-label={
              abierto ? "Ocultar información legal" : "Mostrar información legal"
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
        <div className="tienda-footer-panel" aria-hidden={!abierto}>
          <div className="tienda-footer-bar">
            <div className="tienda-footer-main">
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

              <div className="tienda-footer-col tienda-footer-links">
                <h4 className="tienda-footer-title">Links</h4>
                <nav aria-label="Enlaces legales">
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
                  draggable={false}
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
