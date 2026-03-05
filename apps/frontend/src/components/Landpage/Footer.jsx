import React from "react";
import "../../styles/components/Landpage/_footer.scss";
import { FaXTwitter, FaYoutube, FaInstagram, FaDiscord, FaTiktok } from "react-icons/fa6";
import { FaWhatsapp } from "react-icons/fa";

export default function Footer() {
  return (
    <footer className="footer-flancraft">
      <div className="follow-section">
        <h2>SIGUENOS EN NUESTRAS REDES</h2>
        <div className="social-icons">
          <a href="https://discord.gg/uTJCqn4GsC" target="_blank" rel="noopener noreferrer" aria-label="Discord">
            <FaDiscord />
          </a>
          <a href="https://whatsapp.com/channel/0029Vb6zjCrIXnljntqxva3v" target="_blank" rel="noopener noreferrer" aria-label="Whatsapp">
            <FaWhatsapp />
          </a>
          <a href="https://youtube.com/@flancraft" target="_blank" rel="noopener noreferrer" aria-label="YouTube">
            <FaYoutube />
          </a>
          <a href="https://www.tiktok.com/@flancraftserver" target="_blank" rel="noopener noreferrer" aria-label="TikTok">
            <FaTiktok />
          </a>
          <a href="https://instagram.com/flancraftserver" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
            <FaInstagram />
          </a>
          <a href="https://x.com/flancraftserver" target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)">
            <FaXTwitter />
          </a>
        </div>
      </div>

      <div className="footer-bottom">
        <img src="/assets/logofooter2.webp" alt="Flancraft" className="footer-logo" />
        <p>©2025 Blockhorn Studios. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
}
