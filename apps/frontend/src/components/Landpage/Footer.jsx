import React from "react";
import "../../styles/components/Landpage/_footer.scss";
import { FaXTwitter, FaYoutube, FaInstagram, FaDiscord, FaTiktok } from "react-icons/fa6";
import { FaTelegramPlane } from "react-icons/fa";

export default function Footer() {
  return (
    <footer className="footer-flancraft">
      <div className="follow-section">
        <h2>SIGUENOS EN NUESTRAS REDES</h2>
        <div className="social-icons">
          <a href="https://discord.gg/flancraft" target="_blank" rel="noopener noreferrer" aria-label="Discord">
            <FaDiscord />
          </a>
          <a href="https://t.me/flancraft" target="_blank" rel="noopener noreferrer" aria-label="Telegram">
            <FaTelegramPlane />
          </a>
          <a href="https://youtube.com/@flancraft" target="_blank" rel="noopener noreferrer" aria-label="YouTube">
            <FaYoutube />
          </a>
          <a href="https://www.tiktok.com/@flancraft" target="_blank" rel="noopener noreferrer" aria-label="TikTok">
            <FaTiktok />
          </a>
          <a href="https://instagram.com/flancraft" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
            <FaInstagram />
          </a>
          <a href="https://x.com/flancraft" target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)">
            <FaXTwitter />
          </a>
        </div>
      </div>

      <div className="footer-bottom">
        <img src="/assets/logofooter2.png" alt="Flancraft" className="footer-logo" />
        <p>©2025 Blockhorn Studios. Todos los derechos reservados.</p>
        <ul className="footer-links">
          <li><a href="#">Privacidad</a></li>
          <li><a href="#">Términos</a></li>
          <li><a href="#">Cookies</a></li>
        </ul>
      </div>
    </footer>
  );
}
