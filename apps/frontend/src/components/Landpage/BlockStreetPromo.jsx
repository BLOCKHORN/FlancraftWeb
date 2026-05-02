import React, { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import "../../styles/components/Landpage/_blockStreetPromo.scss";

const TARGET_DATE = new Date("2026-04-27T18:00:00+02:00").getTime();

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
  
  const [isMarketOpen, setIsMarketOpen] = useState(Date.now() >= TARGET_DATE);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    if (isMarketOpen) return;
    const interval = setInterval(() => {
      const now = Date.now();
      const distance = TARGET_DATE - now;
      if (distance <= 0) {
        setIsMarketOpen(true);
        clearInterval(interval);
        return;
      }
      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000)
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isMarketOpen]);

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
        <img src="/tienda/assets/minerals/carbon.webp" className="decor-item d-em-1 mc-pixelated" alt="" draggable="false" />
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
            Bienvenidos a <strong>Block Street MC-500</strong>. El mercado automatizado de FlanCraft. Especula con shitcoins, quema Netherite por estatus o acumula Diamante para cobrar la lotería de los ricos.
          </motion.p>

          <motion.div variants={itemVariants} className="bsp-features">
            <div className="mc-feature-box">
              <div className="feature-icon">
                <img src="/tienda/assets/icons/pvp_coin.png" className="mc-pixelated" alt="PvP" />
              </div>
              <div className="feature-text">
                <span className="feature-title color-red">PVP FINANCIERO</span>
                <p>El servidor no imprime dinero. Lo que tú ganas al hacer un Dump, se lo estás robando directamente a los clanes rivales que compraron tarde y en pánico.</p>
              </div>
            </div>

            <div className="mc-feature-box">
              <div className="feature-icon">
                <img src="/tienda/assets/minerals/diamante.png" className="mc-pixelated" alt="Airdrop" />
              </div>
              <div className="feature-text">
                <span className="feature-title color-blue">LOTERÍA DE COMISIONES</span>
                <p>Las tasas que pagan los novatos van a un bote global. Cada hora, ese dinero se sortea exclusivamente entre los poseedores de Diamante.</p>
              </div>
            </div>

            <div className="mc-feature-box">
              <div className="feature-icon">
                <img src="/tienda/assets/icons/mc_map.png" className="mc-pixelated" alt="Mobile" />
              </div>
              <div className="feature-text">
                <span className="feature-title color-gold">WEB & MÓVIL EN VIVO</span>
                <p>Gana dinero aunque estés en clase. Opera en tiempo real desde esta web y sincroniza tus ganancias con el servidor al instante.</p>
              </div>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="bsp-action">
            {isMarketOpen ? (
              <Link to="/bolsa" className="bsp-btn-mc">
                ENTRAR AL MERCADO <span className="arrow">&gt;</span>
              </Link>
            ) : (
              <div className="bsp-btn-mc disabled-timer">
                APERTURA EN: {timeLeft.days}D {String(timeLeft.hours).padStart(2, '0')}H {String(timeLeft.minutes).padStart(2, '0')}M {String(timeLeft.seconds).padStart(2, '0')}S
              </div>
            )}
            <Link to="/bolsa/guia" className="bsp-btn-mc bsp-btn-secondary flex-center">
              <img src="/tienda/assets/icons/guide_book.png" className="mc-pixelated btn-inline-icon" alt="Guia" />
              <span>REGLAS DE ORO</span>
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
                  <img src="/tienda/assets/minerals/carbon.webp" alt="Carbon" className="mc-pixelated" />
                  <span className="slot-count">500</span>
                </div>
                <div className="asset-info">
                  <span className="asset-name">Shitcoin de Carbón</span>
                  <span className="asset-price text-green">+45.2% ▲</span>
                </div>
              </div>
              <div className="mc-gui-chart">
                <svg viewBox="0 0 100 40" preserveAspectRatio="none">
                  <path 
                    d="M0,35 L10,35 L10,34 L20,34 L20,35 L30,35 L30,32 L40,32 L40,33 L45,33 L45,15 L55,15 L55,10 L70,10 L70,8 L85,8 L85,5 L100,5" 
                    fill="none" stroke="#5EE034" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" className="chart-line-mc"
                  />
                  <path d="M0,40 L0,35 L10,35 L10,34 L20,34 L20,35 L30,35 L30,32 L40,32 L40,33 L45,33 L45,15 L55,15 L55,10 L70,10 L70,8 L85,8 L85,5 L100,5 L100,40 Z" fill="url(#mc-grid)" className="chart-area-mc"/>
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
                  <span className="toast-title">¡Airdrop Ganado!</span>
                  <span className="toast-sub">+15,000 <img src="/tienda/assets/coin.png" className="inline-coin mc-pixelated" alt="c" /> de beneficio.</span>
                </div>
              </div>
            </div>
          </div>
          <div className="mc-gui-window whale-radar-gui">
            <div className="mc-gui-header">
              <span className="gui-title color-yellow">Block Street Journal (En Vivo)</span>
            </div>
            <div className="mc-gui-body">
              <div className="whale-feed">
                <div className="whale-item type-pump">
                  <div className="w-icon"><img src="/tienda/assets/minerals/carbon.webp" className="mc-pixelated" alt="Carbon" /></div>
                  <div className="w-text">
                    <span className="w-tag">[DESPEGUE]</span>
                    <span className="w-desc">¡Inyección masiva en <strong>Carbón</strong>! El precio se dispara (+45%).</span>
                  </div>
                </div>
                <div className="whale-item type-crash">
                  <div className="w-icon"><img src="/tienda/assets/minerals/cobre.png" className="mc-pixelated" alt="Cobre" /></div>
                  <div className="w-text">
                    <span className="w-tag text-red">[DUMP]</span>
                    <span className="w-desc">Liquidación masiva. El <strong>Cobre</strong> colapsa tras una venta récord.</span>
                  </div>
                </div>
                <div className="whale-item type-info">
                  <div className="w-icon"><img src="/tienda/assets/minerals/netherite.webp" className="mc-pixelated" alt="Netherite" /></div>
                  <div className="w-text">
                    <span className="w-tag text-red-dark">[QUEMA]</span>
                    <span className="w-desc">Suministro reducido. Alguien ha sacrificado <strong>Netherite</strong> por Flanite.</span>
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