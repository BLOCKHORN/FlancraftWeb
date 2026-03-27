import React, { useRef } from "react";
import { motion, useInView } from "framer-motion";
import "../../styles/components/Landpage/_gamemodes.scss";

const mode = {
  id: "survival",
  name: "SURVIVAL",
  description:
    "El corazón de FlanCraft. Empieza desde cero y construye tu imperio con la tranquilidad de que tu base es inviolable. Sube de nivel, domina la economía de subastas y forma alianzas para conquistar eventos globales. Juegues para ser el más rico o el más letal, aquí forjas tu propio legado.",
  image: "/assets/modes/survival.webp",
  icon: "/assets/reinos/survival-clasico.webp",
  accent: "#38bdf8",
};

const blockVariants = {
  hidden: { y: 30, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100, damping: 20 } }
};

const GameModes = () => {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.1 });

  return (
    <section ref={sectionRef} className="gamemodes-wrapper" style={{ "--gm-accent": mode.accent }}>
      
      <div className="gm-bg-wrapper">
        <div className="gm-bg-pattern" />
        <div className="gm-bg-gradient" />
        
        <div className="gm-particles">
          <div className="gm-particle p-1"></div>
          <div className="gm-particle p-2"></div>
          <div className="gm-particle p-3"></div>
          <div className="gm-particle p-4"></div>
          <div className="gm-particle p-5"></div>
          <div className="gm-particle p-6"></div>
        </div>
      </div>
      
      <div className="gm-inner">
        <motion.div 
          variants={blockVariants} 
          initial="hidden" 
          animate={isInView ? "visible" : "hidden"} 
          className="gm-selector-block"
        >
          <div className="gm-subheader">
            <h2 className="gm-mundos">MUNDO UNIFICADO</h2>
          </div>
        </motion.div>

        <div className="gm-content">
          <motion.div 
            variants={blockVariants} 
            initial="hidden" 
            animate={isInView ? "visible" : "hidden"} 
            transition={{ delay: 0.2 }} 
            className="gm-left"
          >
            <div className="gm-video-frame">
              <div className="gm-video-inner">
                <div className="gm-media-stack">
                  <img 
                    src={mode.image} 
                    alt={mode.name} 
                    className="gm-media-image" 
                  />
                  <div className="gm-media-shade" />
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div 
            variants={blockVariants} 
            initial="hidden" 
            animate={isInView ? "visible" : "hidden"} 
            transition={{ delay: 0.4 }} 
            className="gm-details"
          >
            <div className="gm-details-wrapper">
              <div className="gm-data-header">
                <div className="gm-single-icon">
                  <img src={mode.icon} alt={mode.name} />
                </div>
                <div className="gm-title-block">
                  <span className="gm-status-indicator">ONLINE</span>
                  <h3 className={mode.id}>{mode.name}</h3>
                </div>
              </div>

              <div className="gm-data-body">
                <p className="gm-glitch-transition">{mode.description}</p>
              </div>

              <div className="gm-data-footer">
                {[
                  { label: "PROGRESIÓN Y HABILIDADES", delay: 0.6 },
                  { label: "ECONOMÍA DINÁMICA", delay: 0.8 },
                  { label: "ALIANZAS Y CONQUISTA", delay: 1.0 }
                ].map((stat, i) => (
                  <div className="data-bar" key={i}>
                    <span>{stat.label}</span>
                    <div className="bar-track">
                      <motion.div 
                        className="bar-fill"
                        initial={{ scaleX: 0 }}
                        animate={isInView ? { scaleX: 1 } : { scaleX: 0 }}
                        transition={{ delay: stat.delay, duration: 1.5, ease: "circOut" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default GameModes;