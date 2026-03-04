import React, { useEffect, useLayoutEffect, useRef, useState, useCallback } from "react";
import "../../../styles/components/Tienda/tienda-footer.scss";

const PEEK_HEIGHT = 20;

const TiendaFooter = () => {
  const [abierto, setAbierto] = useState(false);
  const footerRef = useRef(null);
  const innerRef = useRef(null);

  const toggle = useCallback(() => setAbierto((v) => !v), []);

  useLayoutEffect(() => {
    const writeVars = () => {
      const root = document.documentElement;
      root.style.setProperty("--tienda-footer-peek", `${PEEK_HEIGHT}px`);

      const el = innerRef.current || footerRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const vh = window.visualViewport?.height || window.innerHeight || 0;

      const visible = Math.max(0, Math.min(rect.height, vh - rect.top));
      root.style.setProperty("--tienda-footer-visible", `${Math.round(visible)}px`);
    };

    writeVars();

    const ro = new ResizeObserver(() => writeVars());
    if (footerRef.current) ro.observe(footerRef.current);
    if (innerRef.current) ro.observe(innerRef.current);

    const onResize = () => writeVars();
    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener?.("resize", onResize);
    window.visualViewport?.addEventListener?.("scroll", onResize);

    const t1 = window.setTimeout(writeVars, 60);
    const t2 = window.setTimeout(writeVars, 220);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener?.("resize", onResize);
      window.visualViewport?.removeEventListener?.("scroll", onResize);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [abierto]);

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
      style={{ "--footer-peek-h": `${PEEK_HEIGHT}px`, "--tienda-footer-peek": `${PEEK_HEIGHT}px` }}
      aria-label="Información legal"
    >
      <div ref={innerRef} className="tienda-footer-inner">
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
          aria-label={abierto ? "Ocultar información legal" : "Mostrar información legal"}
        >
          <button
            type="button"
            className="tienda-footer-toggle"
            aria-expanded={abierto}
            aria-label={abierto ? "Ocultar información legal" : "Mostrar información legal"}
            onClick={(e) => {
              e.stopPropagation();
              toggle();
            }}
          >
            <span className="tienda-footer-toggle-arrow" />
          </button>
        </div>

        <div className="tienda-footer-panel" aria-hidden={!abierto}>
          <div className="tienda-footer-bar">
            <div className="tienda-footer-main">
              <div className="tienda-footer-col tienda-footer-about">
                <h4 className="tienda-footer-title">Sobre nosotros</h4>
                <p>
                  FlanCraft es la tienda del servidor de Blockhorn, un servidor de Minecraft con una gran variedad de
                  modos de juego y contenido único.{" "}
                  <strong className="tienda-footer-highlight">Únete a FlanCraft y vive la experiencia completa.</strong>
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
                  Si tienes alguna duda, inquietud o incidencia con tu compra, puedes ponerte en contacto con nosotros a
                  través de nuestro servidor de Discord.
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
                FlanCraft no está afiliado de ninguna manera con Mojang AB, ni debe considerarse respaldado por Mojang AB.
              </span>
              <span className="tienda-footer-designed">
                Diseñado por
                <img src="/assets/blockhorn.webp" alt="Blockhorn" className="tienda-footer-logo" draggable={false} />
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default TiendaFooter;