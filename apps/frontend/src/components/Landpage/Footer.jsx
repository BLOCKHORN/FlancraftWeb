import React from "react";
import "../../styles/components/Landpage/_footer.scss";
import { FaXTwitter, FaYoutube, FaInstagram, FaDiscord, FaTiktok } from "react-icons/fa6";
import { FaWhatsapp } from "react-icons/fa";

const socialNetworks = [
  { name: "Discord", url: "https://discord.gg/uTJCqn4GsC", icon: <FaDiscord />, color: "#5865F2" },
  { name: "WhatsApp", url: "https://whatsapp.com/channel/0029Vb6zjCrIXnljntqxva3v", icon: <FaWhatsapp />, color: "#25D366" },
  { name: "YouTube", url: "https://youtube.com/@flancraft", icon: <FaYoutube />, color: "#FF0000" },
  { name: "TikTok", url: "https://www.tiktok.com/@flancraftserver", icon: <FaTiktok />, color: "#fe2c55" },
  { name: "Instagram", url: "https://instagram.com/flancraftserver", icon: <FaInstagram />, color: "#E1306C" },
  { name: "X", url: "https://x.com/flancraftserver", icon: <FaXTwitter />, color: "#ffffff" }
];

export default function Footer() {
  return (
    <footer className="footer-flancraft">
      <div className="footer-divider" />

      <div className="follow-section">
        <div className="header-box">
          <h2>ÚNETE A LA COMUNIDAD</h2>
          <p>Forma parte de los miles de jugadores que ya forjan su historia en FlanCraft.</p>
        </div>

        <div className="footer-social-grid">
          {socialNetworks.map((social) => (
            <a 
              key={social.name}
              href={social.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="social-card"
              style={{ "--card-color": social.color }}
            >
              <div className="sheen" />
              <div className="icon-wrap">{social.icon}</div>
              <div className="card-info">
                <span className="card-title">{social.name}</span>
              </div>
            </a>
          ))}
        </div>
      </div>

      <div className="footer-bottom">
        <div className="bottom-inner">
          <div className="brand">
            <img src="/assets/logofooter2.webp" alt="Blockhorn Studios" className="footer-logo" />
          </div>

          <div className="disclaimer">
            <p>No es un producto de Minecraft oficial.</p>
            <p>No aprobado ni asociado con Mojang o Microsoft.</p>
          </div>

          <div className="legal">
            <p>©2026 Todos los derechos reservados.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}