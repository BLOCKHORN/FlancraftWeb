import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "../../styles/components/Landpage/_teamcarousel.scss";
import { FaCode, FaCrown, FaPalette, FaCogs } from "react-icons/fa";

const teamMembers = [
  {
    id: "crystal",
    name: "Crystalchemist",
    role: "INGENIERO ARCANO",
    badgeColor: "#5ee034",
    skinImage: "/assets/skins/crystalchemist.webp",
    headImage: "/assets/skins/crystalhead.webp",
    description: "Es el cerebro detrás del código. Se encarga de programar los plugins personalizados que no verás en ningún otro sitio y de que la web funcione como un reloj.",
    icon: <FaCode />,
  },
  {
    id: "paxino",
    name: "Paxino",
    role: "GRAN MAESTRO",
    badgeColor: "#38bdf8",
    skinImage: "/assets/skins/paxino.webp",
    headImage: "/assets/skins/paxinohead.webp",
    description: "El alma y la visión de FlanCraft. Supervisa que el reino sea un lugar justo, divertido y estable para todos. Se encarga de coordinar al equipo.",
    icon: <FaCrown />,
  },
  {
    id: "janito",
    name: "JanitoVP",
    role: "ARQUITECTO",
    badgeColor: "#ff9248",
    skinImage: "/assets/skins/janitovp.webp",
    headImage: "/assets/skins/janitovphead.webp",
    description: "El responsable de que todo lo que veas te deje con la boca abierta. Desde las construcciones épicas del spawn hasta las cinemáticas de nuestras redes.",
    icon: <FaPalette />,
  },
  {
    id: "golden",
    name: "GoldenPunch101",
    role: "MAESTRO TÉCNICO",
    badgeColor: "#fbbf24",
    skinImage: "/assets/skins/golden.webp",
    headImage: "/assets/skins/goldenhead.webp",
    description: "El guardián de los engranajes. Experto en optimización y en mantener los sistemas internos a pleno rendimiento. Si no hay lag, es gracias a Golden.",
    icon: <FaCogs />,
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
  exit: {
    opacity: 0,
    transition: { staggerChildren: 0.05, staggerDirection: -1 },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0, scale: 0.95 },
  visible: { 
    y: 0, 
    opacity: 1, 
    scale: 1,
    transition: { type: "spring", stiffness: 300, damping: 25 }
  },
  exit: { y: -20, opacity: 0, scale: 0.95, transition: { duration: 0.2 } }
};

const skinVariants = {
  hidden: { y: 40, opacity: 0, scale: 0.8 },
  visible: { 
    y: 0, 
    opacity: 1, 
    scale: 1, 
    transition: { type: "spring", stiffness: 200, damping: 20, delay: 0.3 } 
  },
  exit: { y: 20, opacity: 0, scale: 0.9, transition: { duration: 0.3 } }
};

export default function TeamCarousel() {
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  
  const lastInteractionRef = useRef(Date.now());
  const lastFrameTimeRef = useRef(Date.now());
  
  const DELAY_BEFORE_START = 2000;
  const TRANSITION_DURATION = 8000;

  const current = teamMembers[index];

  const next = () => {
    setIndex((prev) => (prev + 1) % teamMembers.length);
    lastInteractionRef.current = Date.now();
    setProgress(0);
  };

  const manualSelect = (i) => {
    setIndex(i);
    lastInteractionRef.current = Date.now();
    setProgress(0);
  };

  useEffect(() => {
    let frame;
    const loop = () => {
      const now = Date.now();
      const delta = now - lastFrameTimeRef.current;
      lastFrameTimeRef.current = now;
      if (isPaused) { lastInteractionRef.current += delta; }
      const elapsed = now - lastInteractionRef.current;

      if (elapsed < DELAY_BEFORE_START) {
        setProgress(0);
      } else {
        const prog = ((elapsed - DELAY_BEFORE_START) / TRANSITION_DURATION) * 100;
        setProgress(Math.min(prog, 100));
        if (prog >= 100) next();
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [isPaused, index]);

  const RenderSelectionGrid = () => (
    <div className="selection-grid">
      {teamMembers.map((member, i) => (
        <button 
          key={member.id} 
          className={`select-slot ${i === index ? "is-active" : ""}`}
          onClick={() => manualSelect(i)}
          style={{ "--slot-accent": member.badgeColor }}
        >
          <div className="slot-inner">
            <img src={member.headImage} alt={member.name} />
            {i === index && (
              <svg className="slot-ring" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="48" />
              </svg>
            )}
          </div>
        </button>
      ))}
    </div>
  );

  return (
    <section className="team-carousel-wrapper" style={{ "--member-accent": current.badgeColor }}>
      <div className="ambient-light" />
      <div className="team-header">
        <h2 className="main-title">MAESTROS DEL REINO</h2>
      </div>

      <div className="team-container">
        <div className="selection-grid-mobile">
          <RenderSelectionGrid />
        </div>

        <div className="team-card">
          <AnimatePresence mode="wait">
            <motion.div 
              key={current.id}
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="card-inner"
            >
              <div className="info-side">
                <motion.div variants={itemVariants} className="role-tag">
                  <span>RANK:</span> {current.role}
                </motion.div>
                
                <motion.h3 variants={itemVariants} className="member-name">
                  <span className="icon">{current.icon}</span>
                  <span className="name-text">{current.name}</span>
                </motion.h3>
                
                <motion.div variants={itemVariants} className="bio-container">
                  <p className="bio-text">{current.description}</p>
                </motion.div>

                <motion.div variants={itemVariants} className="status-bars">
                  <div className="stat-row">
                    <span className="stat-label">{isPaused ? "PAUSED" : "AUTO"}</span>
                    <div className="stat-track">
                      <div className="stat-fill" style={{ transform: `scaleX(${progress / 100})` }} />
                    </div>
                  </div>
                </motion.div>
              </div>

              <div className="visual-side">
                <div className="character-display">
                  <motion.img
                    variants={skinVariants}
                    src={current.skinImage}
                    alt={current.name}
                    className="character-skin"
                    onMouseEnter={() => setIsPaused(true)}
                    onMouseLeave={() => setIsPaused(false)}
                  />
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="selection-grid-desktop">
          <RenderSelectionGrid />
        </div>
      </div>
    </section>
  );
}