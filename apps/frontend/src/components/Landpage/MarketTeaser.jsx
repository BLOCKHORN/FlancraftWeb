import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/components/Landpage/_marketTeaser.scss";

const MarketTeaser = ({ phase, targetDate }) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    if (phase !== "COUNTDOWN") return;
    
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = targetDate - now;

      if (distance <= 0) {
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
  }, [phase, targetDate]);

  const scrollToPromo = () => {
    const el = document.getElementById("block-street-promo");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Por si acaso, aunque Home.jsx ya corta su renderizado
  if (phase === "RELEASED") return null;

  return (
    <div className={`mc-market-teaser-widget ${phase.toLowerCase()}`}>
      <div className="mc-teaser-scanline"></div>
      
      {phase === "COUNTDOWN" ? (
        <div className="widget-content">
          <div className="widget-header">
            <span className="blink-dot"></span>
            <span className="color-green">MC-500</span>
          </div>
          <div className="widget-timer">
            <span>{String(timeLeft.days).padStart(2, '0')}D</span>
            <span className="sep">:</span>
            <span>{String(timeLeft.hours).padStart(2, '0')}H</span>
            <span className="sep">:</span>
            <span>{String(timeLeft.minutes).padStart(2, '0')}M</span>
            <span className="sep">:</span>
            <span>{String(timeLeft.seconds).padStart(2, '0')}S</span>
          </div>
          <div className="widget-footer intrigue">PRÓXIMA APERTURA</div>
          <div 
            className="widget-footer highlight" 
            onClick={() => navigate('/tienda')}
            style={{ marginTop: '2px', cursor: 'pointer' }}
          >
            ¡Prepara tus bolsas! &gt;
          </div>
        </div>
      ) : (
        <div className="widget-content widget-cta" onClick={scrollToPromo}>
          <div className="widget-header">
            <span className="blink-dot"></span>
            <span className="color-green">ACCESO DESBLOQUEADO</span>
          </div>
          <div className="widget-title">BLOCK STREET</div>
          <div className="widget-footer highlight">Haz clic para entrar &gt;</div>
        </div>
      )}
    </div>
  );
};

export default MarketTeaser;