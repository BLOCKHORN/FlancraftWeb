import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import "../../styles/components/Bolsa/BlockStreetGuide.scss";

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
};

const BlockStreetGuide = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="mc-guide-wrapper">
      <div className="mc-guide-container">
        
        <motion.div className="mc-guide-header" initial="hidden" animate="visible" variants={fadeUp}>
          <Link to="/bolsa" className="mc-btn-back">&lt; VOLVER A LA BOLSA</Link>
          <div className="mc-guide-title-box">
            <img src="/tienda/assets/minerals/diamante.png" alt="Diamond" className="mc-pixelated drop-shadow" />
            <h1>CÓMO NO ARRUINARTE EN MC-500</h1>
            <p>Block Street no es un casino. Es un PVP financiero despiadado. El servidor nunca imprime dinero; lo que tú ganas, otro lo acaba de perder. Aprende las leyes o serás la liquidez de los clanes rivales.</p>
          </div>
        </motion.div>

        <div className="mc-guide-section">
          <motion.h2 className="mc-section-title" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
            LAS 3 LEYES DEL MERCADO
          </motion.h2>

          <div className="mc-laws-grid">
            <motion.div className="mc-gui-window law-card" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
              <div className="law-icon-area bg-red-dim">
                <img src="/tienda/assets/minerals/carbon.webp" alt="Shitcoins" className="mc-pixelated bounce-down" />
                <div className="trend-indicator text-red">PUMP & DUMP</div>
              </div>
              <div className="law-content">
                <h3>1. Las Shitcoins (Cobre y Carbón)</h3>
                <p>Activos de alto riesgo. Su precio sube si la gente compra y colapsa si venden de golpe. No hay valor real, solo especulación pura en tiempo real mediante AMM.</p>
                <div className="mc-tip">
                  <img src="/tienda/assets/icons/redstone_torch.png" className="mc-pixelated inline-tip-icon" alt="Tip" />
                  <strong>CONSEJO:</strong> Compra barato, crea FOMO en el chat global, y cuando los demás inflen el precio... vende todas tus acciones en su cara.
                </div>
              </div>
            </motion.div>

            <motion.div className="mc-gui-window law-card" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
              <div className="law-icon-area bg-green-dim">
                <img src="/tienda/assets/minerals/diamante.png" alt="Diamante" className="mc-pixelated bounce-up" />
                <div className="trend-indicator text-green">AIRDROP HORARIO</div>
              </div>
              <div className="law-content">
                <h3>2. El Diamante (La Lotería de los Ricos)</h3>
                <p>Las comisiones que pagan los novatos perdiendo dinero en las Shitcoins alimentan un bote global. Cada hora, el servidor sortea ese capital masivo.</p>
                <div className="mc-tip">
                  <img src="/tienda/assets/icons/redstone_torch.png" className="mc-pixelated inline-tip-icon" alt="Tip" />
                  <strong>CONSEJO:</strong> El Diamante son tus papeletas. Cuantas más acciones poseas, más probabilidades tendrás de llevarte el premio cada hora.
                </div>
              </div>
            </motion.div>

            <motion.div className="mc-gui-window law-card full-width" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
              <div className="law-icon-area bg-gold-dim">
                <img src="/tienda/assets/minerals/netherite.webp" alt="Netherite" className="mc-pixelated pulse" />
                <div className="trend-indicator text-yellow">EL AGUJERO NEGRO</div>
              </div>
              <div className="law-content">
                <h3>3. El Netherite (La Quema de Estatus)</h3>
                <p>El Netherite se compra para destruirse. Al quemar tus acciones in-game con <strong>/bolsa burn</strong>, reduces la oferta global y disparas el precio del mineral.</p>
                <p>A cambio, obtienes <strong>Puntos de Flanite</strong>, la moneda exclusiva necesaria para <a href="https://www.flancraft.com/forja" target="_blank" rel="noreferrer" className="mc-link-yellow">forjar en la Forja</a> artefactos únicos y cosméticos de prestigio.</p>
                <div className="mc-tip">
                  <img src="/tienda/assets/icons/redstone_torch.png" className="mc-pixelated inline-tip-icon" alt="Tip" />
                  <strong>IMPORTANTE:</strong> Para quemar Netherite debes estar vinculado. Usa <strong>/vincular</strong> en el chat del juego para registrarte en 2 segundos.
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        <div className="mc-guide-section">
          <motion.h2 className="mc-section-title" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
            MECÁNICAS ANTI-MANOS DE GELATINA
          </motion.h2>

          <div className="mc-mechanics-grid">
            <motion.div className="mechanic-item" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
              <img src="/tienda/assets/icons/fee_shears.png" className="mech-icon mc-pixelated" alt="Fee" />
              <h4>Impuesto al Novato</h4>
              <p>El Carbón paga un 5% de comisión, el Diamante un 2% y el Netherite solo un 1%. Si tradeas cada minuto como un loco, el banco te dejará a cero.</p>
            </motion.div>

            <motion.div className="mechanic-item" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
              <img src="/tienda/assets/icons/bedrock_lock.png" className="mech-icon mc-pixelated" alt="Aislamiento" />
              <h4>Liquidez Estanca</h4>
              <p>Si el Cobre se hunde, el Diamante no se mueve. Cada pool de dinero es independiente; no hay contagios cruzados ni atajos mágicos.</p>
            </motion.div>

            <motion.div className="mechanic-item" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
              <img src="/tienda/assets/icons/phantom_face.png" className="mech-icon mc-pixelated" alt="Fantasma" />
              <h4>Economía Real</h4>
              <p>Si ganas 10,000 Coins, es porque otro clan los ha perdido. No hay inflación de la bolsa, es un enfrentamiento directo por el control de la liquidez.</p>
            </motion.div>
          </div>
        </div>

        <motion.div className="mc-guide-footer" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
          <p>¿Entendido? Demuéstralo en el mercado.</p>
          <Link to="/bolsa" className="mc-btn-solid mc-btn-gold">ENTRAR A BLOCK STREET</Link>
        </motion.div>

      </div>
    </div>
  );
};

export default BlockStreetGuide;