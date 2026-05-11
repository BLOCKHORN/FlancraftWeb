import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const blockUrl = "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20.4/assets/minecraft/textures/block/";
const itemUrl = "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20.4/assets/minecraft/textures/item/";
const flaniteIcon = "/tienda/assets/flanite.webp";

const WikiHome = () => {
  return (
    <div className="wiki-home-wynn">
      <motion.section 
        className="wiki-welcome-banner"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1>WIKI OFICIAL DE FLANCRAFT</h1>
        <p>Terminal de inteligencia avanzada para la dominación industrial y la supremacía económica. Accede a los protocolos oficiales del servidor.</p>
      </motion.section>

      <div className="wiki-featured-grid">
        <div className="featured-card major">
          <div className="card-header">ALERTA DE SEGURIDAD</div>
          <div className="card-body">
            <h3>AMENAZA: EL OSO BAJISTA</h3>
            <p>Se confirma la aparición del World Boss en el Mercado Negro. Fuerza bruta de 4,500 HP detectada. Se recomienda despliegue de equipo Chaos de forma inmediata para asegurar el botín épico.</p>
            <Link to="/wiki/rpg" className="wiki-btn-link">REVISAR PROTOCOLO</Link>
          </div>
        </div>

        <div className="featured-card">
          <div className="card-header">SISTEMA DE PRESTIGIO</div>
          <div className="card-body">
            <h3>LA FORJA ACTIVA</h3>
            <p>El canje de <strong>FLANITES</strong> está operativo. Transforma tu Netherite en artefactos de poder eterno desde el Nexo Web.</p>
            <Link to="/wiki/forja" className="wiki-btn-link">VER CATÁLOGO</Link>
          </div>
        </div>
      </div>

      <section className="wiki-index-sections">
        <h2>CENTROS DE OPERACIONES DISPONIBLES</h2>
        <div className="index-grid">
          <Link to="/wiki/inicio" className="index-item">
            <img src={blockUrl + "crafting_table_front.png"} className="index-icon" alt="Start" />
            <div className="index-text">
              <h4>Primeros Pasos</h4>
              <p>Guía de despliegue táctico, kits iniciales y generación de capital básico.</p>
            </div>
            <div className="click-hint">ACCEDER &gt;</div>
          </Link>
          <Link to="/wiki/factorias" className="index-item">
            <img src={blockUrl + "furnace_front.png"} className="index-icon" alt="Industry" />
            <div className="index-text">
              <h4>Era Industrial</h4>
              <p>Análisis de Tiers III, gestión de Uranio y optimización de combustibles líquidos.</p>
            </div>
            <div className="click-hint">ACCEDER &gt;</div>
          </Link>
          <Link to="/wiki/economia" className="index-item">
            <img src={itemUrl + "emerald.png"} className="index-icon" alt="Market" />
            <div className="index-text">
              <h4>Bolsa de Valores</h4>
              <p>Inteligencia de Block Street, pools de liquidez y protocolos de Airdrop.</p>
            </div>
            <div className="click-hint">ACCEDER &gt;</div>
          </Link>
          <Link to="/wiki/forja" className="index-item">
            <img src={flaniteIcon} className="index-icon" alt="Prestige" />
            <div className="index-text">
              <h4>La Forja</h4>
              <p>Manual de FLANITES, quema de activos y forja de artefactos eternos.</p>
            </div>
            <div className="click-hint">ACCEDER &gt;</div>
          </Link>
          <Link to="/wiki/rpg" className="index-item">
            <img src={itemUrl + "netherite_sword.png"} className="index-icon" alt="Combat" />
            <div className="index-text">
              <h4>RPG & Combate</h4>
              <p>Maestría de AuraSkills, puntos de stat y arsenal de grado Chaos.</p>
            </div>
            <div className="click-hint">ACCEDER &gt;</div>
          </Link>
          <Link to="/wiki/protecciones" className="index-item">
            <img src={blockUrl + "bedrock.png"} className="index-icon" alt="Claims" />
            <div className="index-text">
              <h4>Seguridad</h4>
              <p>Protocolos de blindaje Nivel 5 y gestión de flags de territorio.</p>
            </div>
            <div className="click-hint">ACCEDER &gt;</div>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default WikiHome;