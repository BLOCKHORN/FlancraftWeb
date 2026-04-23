import React, { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import "../../styles/components/Landpage/_blockStreetPromo.scss";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1, 
    transition: { staggerChildren: 0.15, delayChildren: 0.1 } 
  }
};

const itemVariants = {
  hidden: { y: 30, opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1, 
    transition: { type: "tween", ease: "easeOut", duration: 0.4 } 
  }
};

const BlockStreetPromo = () => {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.15 });

  return (
    <motion.section 
      id="block-street-promo"
      ref={sectionRef}
      className="bsp-section no-tap-highlight"
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={containerVariants}
    >
      <div className="bsp-decorations">
        <img src="/tienda/assets/coin.png" className="decor-item d-coin-1 mc-pixelated" alt="" draggable="false" />
        <img src="/tienda/assets/minerals/esmeralda.webp" className="decor-item d-em-1 mc-pixelated" alt="" draggable="false" />
        <img src="/tienda/assets/minerals/diamante.png" className="decor-item d-dia-1 mc-pixelated" alt="" draggable="false" />
        <div className="bsp-glow glow-1"></div>
        <div className="bsp-glow glow-2"></div>
      </div>

      <div className="bsp-transition-top">
        <div className="bsp-cube cube-1"></div>
        <div className="bsp-cube cube-2"></div>
        <div className="bsp-cube cube-3"></div>
        <div className="bsp-cube cube-4"></div>
        <div className="bsp-cube cube-5"></div>
      </div>

      <div className="bsp-container">
        <div className="bsp-content">
          <motion.div variants={itemVariants} className="mc-advancement-badge flex-center">
            <img src="/tienda/assets/icons/wallstreet_pickaxe.png" className="mc-pixelated badge-icon-img" alt="Pickaxe" />
            <span>WALL STREET EN FLANCRAFT</span>
          </motion.div>
          
          <motion.h2 variants={itemVariants} className="bsp-title">
            ¿QUIERES FORRARTE SIN PICAR UN SOLO BLOQUE?
          </motion.h2>
          
          <motion.p variants={itemVariants} className="bsp-desc">
            Bienvenidos a <strong>Block Street MC-500</strong>. El primer mercado de valores hiperrealista en Minecraft. Compra contratos, especula con las crisis del servidor y hazte inmensamente rico viendo a los demás trabajar.
          </motion.p>

          <motion.div variants={itemVariants} className="bsp-features">
            <div className="mc-feature-box">
              <div className="feature-icon">
                <img src="/tienda/assets/icons/redstone_dust.png" className="mc-pixelated" alt="Live" />
              </div>
              <div className="feature-text">
                <span className="feature-title color-red">CONECTADO AL SERVIDOR</span>
                <p>La bolsa lee lo que hacen los jugadores. Si farmean mucho, el precio cae. Si hay escasez, el valor explota.</p>
              </div>
            </div>

            <div className="mc-feature-box">
              <div className="feature-icon">
                <img src="/tienda/assets/icons/mc_map.png" className="mc-pixelated" alt="Mobile" />
              </div>
              <div className="feature-text">
                <span className="feature-title color-blue">TRADING DESDE EL MÓVIL</span>
                <p>No necesitas estar conectado en el juego. Compra y vende acciones en tiempo real desde esta misma web donde quieras.</p>
              </div>
            </div>

            <div className="mc-feature-box">
              <div className="feature-icon">
                <img src="/tienda/assets/icons/pvp_coin.png" className="mc-pixelated" alt="PvP" />
              </div>
              <div className="feature-text">
                <span className="feature-title color-gold">PVP FINANCIERO</span>
                <p>Las guerras ya no se ganan solo con espadas. Manipula el mercado, infla precios y arruina a los clanes rivales.</p>
              </div>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="bsp-action">
            <Link to="/bolsa" className="bsp-btn-mc">
              ENTRAR AL MERCADO <span className="arrow">&gt;</span>
            </Link>
            <Link to="/bolsa/guia" className="bsp-btn-mc bsp-btn-secondary flex-center">
              <img src="/tienda/assets/icons/guide_book.png" className="mc-pixelated btn-inline-icon" alt="Guia" />
              <span>CÓMO FUNCIONA</span>
            </Link>
          </motion.div>
        </div>

        <motion.div variants={itemVariants} className="bsp-visual">
          
          <div className="mc-gui-window">
            <div className="mc-gui-header">
              <span className="gui-title">Terminal del Broker</span>
              <div className="gui-close">X</div>
            </div>
            
            <div className="mc-gui-body">
              <div className="gui-asset-slot">
                <div className="mc-item-slot">
                  <img src="/tienda/assets/minerals/diamante.png" alt="Diamante" className="mc-pixelated" />
                  <span className="slot-count">64</span>
                </div>
                <div className="asset-info">
                  <span className="asset-name">Acciones de Diamante</span>
                  <span className="asset-price text-green">+145.8% ▲</span>
                </div>
              </div>

              <div className="mc-gui-chart">
                <svg viewBox="0 0 100 40" preserveAspectRatio="none">
                  <path 
                    d="M0,35 L10,35 L10,34 L20,34 L20,35 L30,35 L30,32 L40,32 L40,33 L45,33 L45,15 L55,15 L55,10 L70,10 L70,8 L85,8 L85,5 L100,5" 
                    fill="none" 
                    stroke="#5EE034" 
                    strokeWidth="2"
                    strokeLinecap="square"
                    strokeLinejoin="miter"
                    className="chart-line-mc"
                  />
                  <path 
                    d="M0,40 L0,35 L10,35 L10,34 L20,34 L20,35 L30,35 L30,32 L40,32 L40,33 L45,33 L45,15 L55,15 L55,10 L70,10 L70,8 L85,8 L85,5 L100,5 L100,40 Z" 
                    fill="url(#mc-grid)" 
                    className="chart-area-mc"
                  />
                  <defs>
                    <pattern id="mc-grid" width="4" height="4" patternUnits="userSpaceOnUse">
                      <rect width="4" height="4" fill="rgba(94, 224, 52, 0.2)" />
                      <rect width="2" height="2" fill="rgba(94, 224, 52, 0.4)" />
                    </pattern>
                  </defs>
                </svg>
              </div>

              <div className="mc-advancement-toast">
                <div className="toast-icon-wrapper">
                  <img src="/tienda/assets/minerals/diamante.png" alt="D" className="mc-pixelated" />
                </div>
                <div className="toast-texts">
                  <span className="toast-title">¡Pelotazo Realizado!</span>
                  <span className="toast-sub">+12,480 <img src="/tienda/assets/coin.png" className="inline-coin mc-pixelated" alt="c" /> de beneficio.</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mc-gui-window whale-radar-gui">
            <div className="mc-gui-header">
              <span className="gui-title color-yellow">Rádar de Ballenas (En Directo)</span>
            </div>
            
            <div className="mc-gui-body">
              <div className="whale-feed">
                
                <div className="whale-item type-pump">
                  <div className="w-icon">
                    <img src="/tienda/assets/minerals/oro.png" className="mc-pixelated" alt="Oro" />
                  </div>
                  <div className="w-text">
                    <span className="w-tag">[BALLENA]</span>
                    <span className="w-desc"><strong>Notch</strong> ha comprado <strong>250x Acciones de Oro</strong>.</span>
                  </div>
                </div>

                <div className="whale-item type-crash">
                  <div className="w-icon">
                    <img src="/tienda/assets/minerals/netherite.webp" className="mc-pixelated" alt="Netherite" />
                  </div>
                  <div className="w-text">
                    <span className="w-tag text-red">[CRASH]</span>
                    <span className="w-desc">Liquidación masiva. El <strong>Netherite</strong> cae un <strong>-12.4%</strong>.</span>
                  </div>
                </div>

                <div className="whale-item type-info">
                  <div className="w-icon">
                    <img src="/tienda/assets/minerals/esmeralda.webp" className="mc-pixelated" alt="Esmeralda" />
                  </div>
                  <div className="w-text">
                    <span className="w-tag color-yellow">[ALERTA]</span>
                    <span className="w-desc">Fuga de capital detectada hacia la <strong>Esmeralda</strong>.</span>
                  </div>
                </div>

              </div>
            </div>
          </div>

        </motion.div>
      </div>
    </motion.section>
  );
};

export default BlockStreetPromo;