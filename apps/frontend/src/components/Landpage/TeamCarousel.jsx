import React, { useState, useEffect, useRef } from "react";
import "../../styles/components/Landpage/_teamcarousel.scss";
import {
  FaCode,
  FaUserTie,
  FaPencilRuler,
  FaServer,
  FaShieldAlt,
} from "react-icons/fa";

// Si no usas fallbacks, puedes borrar estas dos constantes y los onError.
const FALLBACK_HEAD = "/assets/skins/default-head.png";
const FALLBACK_SKIN = "/assets/skins/default-skin.png";

const teamMembers = [
  {
    name: "Crystalchemist",
    role: "INGENIERO ARCANO",
    badgeColor: "#c16aff",
    skinImage: "/assets/skins/crystalchemist.png",
    headImage: "/assets/skins/crystalhead.png",
    description:
      "Fundador de Flancraft y Desarrollador fullstack con enfoque en backend y arquitectura de plugins. Diseña y mantiene sistemas personalizados en Java para Bukkit y Spigot, incluyendo economías virtuales, comandos avanzados y estructuras automatizadas. También colabora en diseño frontend con React y SCSS, asegurando una experiencia de usuario fluida y coherente. Especialista en optimización de rendimiento.",
    icon: <FaCode />,
  },
  {
    name: "Paxino",
    role: "GRAN MAESTRE DEL REINO",
    badgeColor: "#f4cc62",
    skinImage: "/assets/skins/paxino.png",
    headImage: "/assets/skins/paxinohead.png",
    description:
      "Fundador de Flancraft y estratega principal. Supervisa la visión global del servidor, la cohesión del equipo y la toma de decisiones clave. Experto en diseño de experiencias multijugador, gestión de proyectos con metodologías ágiles y resolución de conflictos en comunidades online. Coordina todas las áreas del proyecto para asegurar estabilidad, innovación y crecimiento sostenible.",
    icon: <FaUserTie />,
  },
  {
    name: "JanitoVP",
    role: "ARQUITECTO DE REALIDADES",
    badgeColor: "#ff9248",
    skinImage: "/assets/skins/janitovp.png",
    headImage: "/assets/skins/janitovphead.png",
    description:
      "Especialista en diseño visual, construcción estructural y producción multimedia. Domina herramientas como WorldEdit, VoxelSniper, Blender y ReplayMod para crear mundos inmersivos y material promocional de alto impacto. Responsable del estilo visual del servidor, animaciones y cinemáticas. Colabora con desarrollo para alinear estética con funcionalidades jugables.",
    icon: <FaPencilRuler />,
  },
  {
    name: "ElJugante",
    role: "ALTO CANCILLER DEL REINO",
    badgeColor: "#7fd4ff",
    skinImage: "/assets/skins/eljugante.png",
    headImage: "/assets/skins/jugantehead.png",
    description:
      "Responsable de la administración global del servidor y la gestión del staff. Supervisa el día a día de los reinos, la aplicación de normas y la experiencia del jugador. Encargado de coordinar eventos, revisar incidencias y asegurar que cada decisión mantenga el equilibrio entre diversión, justicia y estabilidad a largo plazo.",
    icon: <FaShieldAlt />,
  },
  {
    name: "GoldenPunch101",
    role: "MAESTRO DE LOS ENGRANAJES",
    badgeColor: "#ffd15b",
    skinImage: "/assets/skins/golden.png",
    headImage: "/assets/skins/goldenhead.png",
    description:
      "Especialista en plugins y sistemas internos del servidor. Domina la configuración avanzada de Paper, Bungee y plugins de terceros, así como el diagnóstico de errores y conflictos. Trabaja codo con codo con el equipo de desarrollo para integrar nuevas mecánicas, optimizar el rendimiento y garantizar que cada engranaje técnico del reino funcione como un reloj.",
    icon: <FaServer />,
  },
];

export default function TeamCarousel() {
  const [index, setIndex] = useState(0);
  const [animate, setAnimate] = useState(false);
  const [progress, setProgress] = useState(0);

  const lastInteractionRef = useRef(Date.now());
  const timerRef = useRef(null);

  const DELAY_BEFORE_START = 2000;
  const TRANSITION_DURATION = 8000;

  const current = teamMembers[index];

  const next = () => {
    setAnimate(true);
    setTimeout(() => setAnimate(false), 500);
    setIndex((prev) => (prev + 1) % teamMembers.length);
    lastInteractionRef.current = Date.now();
    setProgress(0);
  };

  const resetTimer = () => {
    lastInteractionRef.current = Date.now();
    setProgress(0);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      lastInteractionRef.current = Date.now();
    }, DELAY_BEFORE_START);
  };

  const manualSelect = (i) => {
    setAnimate(true);
    setTimeout(() => setAnimate(false), 500);
    setIndex(i);
    resetTimer();
  };

  const handleHover = () => {
    resetTimer();
  };

  useEffect(() => {
    let frame;
    const loop = () => {
      const now = Date.now();
      const elapsed = now - lastInteractionRef.current;

      if (elapsed < DELAY_BEFORE_START) {
        setProgress(0);
      } else {
        const prog =
          ((elapsed - DELAY_BEFORE_START) / TRANSITION_DURATION) * 100;
        setProgress(Math.min(prog, 100));
        if (prog >= 100) {
          next();
        }
      }

      frame = requestAnimationFrame(loop);
    };

    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <section className="team-carousel-wrapper">
      <div
        className="team-carousel"
        onMouseEnter={handleHover}
        onMouseLeave={handleHover}
      >
        <div className="team-content">
          <div className="team-text">
            <h2 className="title">Conoce a los Maestros de Flancraft</h2>
            <h3 className="name">
              {current.icon}
              {current.name}
              <span
                className="badge"
                style={{
                  backgroundColor: current.badgeColor,
                  color: current.badgeColor === "#f4cc62" ? "#222" : "#fff",
                }}
              >
                {current.role}
              </span>
            </h3>
            <p className="description">{current.description}</p>
          </div>

          <div className="team-avatar">
            <img
              src={current.skinImage}
              alt={`${current.name} skin`}
              className={`skin-pose ${animate ? "animate-in" : ""}`}
              onError={(e) => {
                if (FALLBACK_SKIN && e.currentTarget.src !== FALLBACK_SKIN) {
                  e.currentTarget.src = FALLBACK_SKIN;
                }
              }}
            />
          </div>
        </div>

        <div className="progress-bar-wrapper">
          <div
            key={index}
            className="progress-inner"
            style={{ transform: `scaleX(${1 - progress / 100})` }}
          />
        </div>

        <div className="carousel-heads">
          {teamMembers.map((member, i) => (
            <img
              key={i}
              src={member.headImage}
              alt={member.name}
              className={`head-icon ${i === index ? "active" : ""}`}
              onClick={() => manualSelect(i)}
              onMouseEnter={handleHover}
              onError={(e) => {
                if (FALLBACK_HEAD && e.currentTarget.src !== FALLBACK_HEAD) {
                  e.currentTarget.src = FALLBACK_HEAD;
                }
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
