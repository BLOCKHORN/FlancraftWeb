import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Smartphone, Settings2, Gamepad2 } from "lucide-react";
import { FaAndroid, FaApple } from "react-icons/fa";
import "../../styles/components/Landpage/_consoleguide.scss";

export default function ConsoleGuideModal({ onClose }) {
  const [closing, setClosing] = useState(false);

  const cerrarModal = () => {
    if (closing) return;
    setClosing(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") cerrarModal();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  return createPortal(
    <div className={`console-modal-root ${closing ? "is-closing" : "is-open"}`}>
      <div className="console-modal-overlay" onClick={cerrarModal} />
      <div className="console-modal-box">
        <button className="console-modal-close" onClick={cerrarModal} aria-label="Cerrar">X</button>
        
        <div className="console-modal-header">
          <h2 className="console-modal-title">CÓMO ENTRAR DESDE CONSOLA</h2>
          <p className="console-modal-subtitle">
            Las consolas bloquean las IPs externas por defecto. Sigue estos 3 pasos para conectar tu PlayStation, Xbox o Switch usando tu móvil.
          </p>
        </div>

        <div className="console-steps-container">
          <div className="console-step">
            <div className="step-icon-wrapper">
              <Smartphone size={28} />
              <div className="step-number">1</div>
            </div>
            <div className="step-content">
              <h3>Descarga la App</h3>
              <p>Busca e instala la aplicación gratuita <strong>MC Server Connector</strong> o <strong>BedrockTogether</strong> en tu teléfono.</p>
              
              <div className="app-links-group">
                <a href="https://play.google.com/store/apps/details?id=com.smokiem.mcserverconnector" target="_blank" rel="noopener noreferrer" className="store-btn android-btn">
                  <FaAndroid size={18} /> Android
                </a>
                <a href="https://apps.apple.com/es/app/bedrocktogether/id1534593376" target="_blank" rel="noopener noreferrer" className="store-btn ios-btn">
                  <FaApple size={18} /> iOS
                </a>
              </div>
            </div>
          </div>

          <div className="console-step">
            <div className="step-icon-wrapper">
              <Settings2 size={28} />
              <div className="step-number">2</div>
            </div>
            <div className="step-content">
              <h3>Configura la IP</h3>
              <p>Abre la app, asegúrate de estar en la misma red WiFi que tu consola e introduce nuestra IP: <strong>play.flancraft.com</strong> y el Puerto: <strong>19132</strong>. Pulsa Start.</p>
            </div>
          </div>

          <div className="console-step">
            <div className="step-icon-wrapper">
              <Gamepad2 size={28} />
              <div className="step-number">3</div>
            </div>
            <div className="step-content">
              <h3>Únete desde Amigos</h3>
              <p>Sin cerrar la app en tu móvil, abre Minecraft en tu consola. FlanCraft aparecerá mágicamente en la pestaña de <strong>Amigos</strong> o <strong>Partidas LAN</strong>. ¡Entra y juega!</p>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}