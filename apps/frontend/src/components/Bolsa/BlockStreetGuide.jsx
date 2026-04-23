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
            <p>Block Street no es un casino aleatorio. Es un reflejo exacto de lo que hacéis dentro del servidor. Si entiendes estas reglas, ganarás dinero. Si juegas a ciegas, serás la liquidez de los demás.</p>
          </div>
        </motion.div>

        <div className="mc-guide-section">
          <motion.h2 className="mc-section-title" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
            LAS 3 LEYES DEL MERCADO
          </motion.h2>

          <div className="mc-laws-grid">
            <motion.div className="mc-gui-window law-card" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
              <div className="law-icon-area bg-red-dim">
                <img src="/tienda/assets/minerals/plata.png" alt="Hierro" className="mc-pixelated bounce-down" />
                <div className="trend-indicator text-red">PRECIO CAE</div>
              </div>
              <div className="law-content">
                <h3>1. Ley de la Tienda (Sobreoferta)</h3>
                <p>El mercado está conectado al servidor. Si todo el mundo está minando Hierro y vendiéndolo al NPC de la tienda, <strong>el mercado se inunda de Hierro</strong>. Mucha oferta equivale a que el precio en bolsa se desplome.</p>
                <div className="mc-tip">
                  <img src="/tienda/assets/icons/redstone_torch.png" className="mc-pixelated inline-tip-icon" alt="Tip" />
                  <strong>CONSEJO:</strong> No compres acciones de algo que todo el servidor está farmeando fácilmente en ese momento.
                </div>
              </div>
            </motion.div>

            <motion.div className="mc-gui-window law-card" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
              <div className="law-icon-area bg-green-dim">
                <img src="/tienda/assets/minerals/frunta.webp" alt="Fruta" className="mc-pixelated bounce-up" />
                <div className="trend-indicator text-green">PRECIO SUBE</div>
              </div>
              <div className="law-content">
                <h3>2. Ley de la Escasez (Crecimiento)</h3>
                <p>Si hay jugadores conectados haciendo cosas, pero nadie está vendiendo un material a la tienda, el algoritmo asume que escasea. Por ejemplo, si nadie vende Fruta del End <em>(ESTO ES SOLO UN EJEMPLO, NO VAYAS A COMPRARLA A CIEGAS)</em>, su valor en bolsa subirá de forma constante.</p>
                <div className="mc-tip">
                  <img src="/tienda/assets/icons/redstone_torch.png" className="mc-pixelated inline-tip-icon" alt="Tip" />
                  <strong>CONSEJO:</strong> Anticípate. Busca materiales olvidados que nadie esté vendiendo hoy.
                </div>
              </div>
            </motion.div>

            <motion.div className="mc-gui-window law-card full-width" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
              <div className="law-icon-area bg-gold-dim">
                <img src="/tienda/assets/minerals/esmeralda.webp" alt="Esmeralda" className="mc-pixelated pulse" />
                <div className="trend-indicator text-yellow">MOMENTUM</div>
              </div>
              <div className="law-content">
                <h3>3. El Volumen de Trading (Juego Social)</h3>
                <p>Puedes operar dentro del juego con <strong>/bolsa</strong> o desde la <strong>Web y Móvil</strong> estando desconectado. Tus compras afectan al precio en tiempo real. Si tú y tu clan compráis masivamente acciones de un mineral, su precio se disparará al instante para todo el mundo.</p>
                <p>Además, el <strong>Block Street Journal</strong> chivará en directo lo que ha pasado en los últimos 15 minutos, alertando a todo el servidor de las compras masivas o desplomes.</p>
                <div className="mc-tip">
                  <img src="/tienda/assets/icons/redstone_torch.png" className="mc-pixelated inline-tip-icon" alt="Tip" />
                  <strong>CONSEJO:</strong> El PvP Financiero existe. Compra barato, convence por el chat a los demás de que compren porque "va a subir", y cuando ellos inflen el precio... véndeles tus acciones en la cara.
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        <div className="mc-guide-section">
          <motion.h2 className="mc-section-title" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
            MECÁNICAS ANTI-TRAMPAS
          </motion.h2>

          <div className="mc-mechanics-grid">
            <motion.div className="mechanic-item" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
              <img src="/tienda/assets/icons/fee_shears.png" className="mech-icon mc-pixelated" alt="Fee" />
              <h4>El Muro del 2% (Comisión)</h4>
              <p>Cada compra o venta quema un 2% del capital para el Broker. Tu inversión debe subir al menos un +4% bruto para que empieces a ver ganancias. No hagas trading de un minuto. Ten paciencia.</p>
            </motion.div>

            <motion.div className="mechanic-item" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
              <img src="/tienda/assets/icons/bedrock_lock.png" className="mech-icon mc-pixelated" alt="Aislamiento" />
              <h4>Aislamiento Estricto</h4>
              <p>Si un clan intenta dumpear toneladas de Cobre para hundirlo, solo bajará el Cobre. Los demás índices del mercado no se inmutarán en absoluto. No hay atajos mágicos cruzados.</p>
            </motion.div>

            <motion.div className="mechanic-item" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
              <img src="/tienda/assets/icons/phantom_face.png" className="mech-icon mc-pixelated" alt="Fantasma" />
              <h4>El Pueblo Fantasma</h4>
              <p>El mercado sabe cuánta gente hay online. Si el servidor está vacío de madrugada, la economía entra en letargo. Nadie se hará rico durmiendo ni aprovechándose de la inactividad nocturna.</p>
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