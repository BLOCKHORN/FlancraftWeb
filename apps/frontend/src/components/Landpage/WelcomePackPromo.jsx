import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../../context/UserContext";
import { apiUrl } from "../../lib/env";
import TiendaModalJugador from "../Tienda/modals/TiendaModalJugador";
import "../../styles/components/Landpage/_welcomePackPromo.scss";

const WelcomePackPromo = () => {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const [packStatus, setPackStatus] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isLoggedIn = Boolean(user?.loggedIn);
  const isPurchased = packStatus?.purchased === true;

  useEffect(() => {
    if (!user?.username) return;
    fetch(apiUrl(`/api/tebex/bienvenida/status?jugador=${encodeURIComponent(user.username)}`))
      .then((res) => res.json())
      .then((data) => setPackStatus(data))
      .catch(() => {});
  }, [user?.username]);

  const handleAction = () => {
    if (!isPurchased) {
      localStorage.setItem("fc_pending_welcome_pack", "true");
    }

    if (isLoggedIn && user?.username) {
      localStorage.setItem("nombreJugador", user.username);
      if (user?.uuid) localStorage.setItem("uuidJugador", user.uuid);
      navigate("/tienda");
    } else if (localStorage.getItem("nombreJugador")) {
      navigate("/tienda");
    } else {
      setIsModalOpen(true);
    }
  };

  const handleModalConfirm = (nombre, uuid) => {
    localStorage.setItem("nombreJugador", nombre);
    if (uuid) {
      localStorage.setItem("uuidJugador", uuid);
    } else {
      localStorage.removeItem("uuidJugador");
    }
    
    setIsModalOpen(false);
    navigate("/tienda");
  };

  return (
    <>
      <section className="wp-promo-section no-tap-highlight">
        <div className="wp-top-transition-container">
          <div className="wp-top-cube tc-up-1"></div>
          <div className="wp-top-cube tc-up-2"></div>
          <div className="wp-top-cube tc-up-3"></div>
          <div className="wp-top-cube tc-up-4"></div>
          <div className="wp-top-cube tc-up-5"></div>
          <div className="wp-top-cube tc-up-6"></div>
        </div>

        <div className="wp-promo-container">
          <div className="wp-promo-content">
            <h2 className="wp-promo-title">
              {isPurchased ? "¡RECLAMA TU REGALO DIARIO!" : "ARRANCA COMO UN JEFE"}
            </h2>
            <p className="wp-promo-desc">
              {isPurchased ? (
                <>
                  Ya eres de los nuestros y tienes tu Pack de Bienvenida, pero la tienda sigue llena de sorpresas. Entra cada día y llévate <strong>recompensas y coins GRATIS</strong>.
                </>
              ) : (
                <>
                  Acelera tu progreso desde el primer minuto. Hazte con el <strong>Pack de Bienvenida</strong> a un precio de risa y pásate por la tienda a recoger tu <strong>Regalo Diario GRATIS</strong>.
                </>
              )}
            </p>

            <div className="wp-promo-actions">
              <button className="wp-pixel-btn wp-pixel-btn--green" onClick={handleAction}>
                <div className="btn-texts">
                  <span className="btn-main-text">
                    {isPurchased ? "IR A LA TIENDA AHORA" : "¡LO QUIERO TODO!"}
                  </span>
                  <span className="btn-sub-text">
                    {isPurchased ? "Descubre nuevas ofertas y regalos" : "Añadir al carrito y reclamar regalos"}
                  </span>
                </div>
                <span className="btn-arrow">&gt;</span>
              </button>
            </div>
          </div>

          <div className="wp-promo-showcase" onClick={handleAction}>
            <div className="wp-glow-bg"></div>

            {!isPurchased ? (
              <div className="wp-showcase-card">
                <div className="wp-card-tag">LÍMITE: 1 POR JUGADOR</div>

                <div className="wp-chest-wrapper">
                  <div className="sparkle sp-1"></div>
                  <div className="sparkle sp-2"></div>
                  <div className="sparkle sp-3"></div>
                  <img 
                    src="/tienda/assets/starter.png" 
                    alt="Cofre Bienvenida" 
                    className="wp-chest-img" 
                    draggable="false"
                  />
                </div>

                <div className="wp-card-info">
                  <h3 className="wp-pixel-title-mini">PACK DE BIENVENIDA</h3>
                  
                  <div className="wp-list">
                    <div className="wp-item">
                      <div className="wp-item-icon">
                        <img src="/tienda/assets/coin.png" alt="" draggable="false" />
                      </div>
                      <div className="wp-item-text">
                        <span className="name yellow">1.300 COINS SURVIVAL</span>
                        <span className="desc">750 + 550 GRATIS</span>
                      </div>
                    </div>

                    <div className="wp-item">
                      <div className="wp-item-icon">
                        <img src="/assets/statsperfil/dinero.png" alt="" draggable="false" />
                      </div>
                      <div className="wp-item-text">
                        <span className="name green">75.000$ IN-GAME</span>
                        <span className="desc">Capital inicial de imperio</span>
                      </div>
                    </div>

                    <div className="wp-item">
                      <div className="wp-item-icon">
                        <img src="/tienda/assets/elixir.png" alt="" draggable="false" />
                      </div>
                      <div className="wp-item-text">
                        <span className="name purple">30 NIVELES DE XP</span>
                        <span className="desc">Potencia tus encantamientos</span>
                      </div>
                    </div>

                    <div className="wp-item">
                      <div className="wp-item-icon">
                        <img src="/tienda/assets/xp.png" alt="" draggable="false" />
                      </div>
                      <div className="wp-item-text">
                        <span className="name yellow">130 XP DE /NIVELES</span>
                        <span className="desc">Progreso instantáneo</span>
                      </div>
                    </div>
                  </div>

                  <div className="wp-price-box">
                    <div className="wp-price-old">
                      <span>VALORADO EN</span>
                      <strike>20,00 €</strike>
                    </div>
                    <div className="wp-price-new">
                      <span>AHORRA 78%</span>
                      <strong>4,50 €</strong>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="wp-showcase-card wp-showcase-daily">
                <div className="wp-card-tag wp-tag-daily">¡DISPONIBLE AHORA!</div>
                <div className="wp-chest-wrapper daily-wrapper">
                  <div className="sparkle sp-1"></div>
                  <div className="sparkle sp-2"></div>
                  <div className="sparkle sp-3"></div>
                  <div className="daily-rays"></div>
                  <img 
                    src="/tienda/assets/rankskin.png" 
                    alt="Regalo Diario" 
                    className="wp-chest-img daily-img" 
                    draggable="false"
                  />
                </div>
                <div className="wp-card-info daily-info">
                  <h3 className="wp-pixel-title-mini daily-title-color">RECOMPENSA DIARIA</h3>
                  <p className="daily-subtext">Abre tu regalo misterioso de hoy y consigue Coins gratis para la tienda.</p>
                  <div className="daily-action-box">
                    <span>COSTE:</span>
                    <strong>GRATIS</strong>
                  </div>
                </div>
              </div>
            )}

            {!isPurchased && (
              <div className="wp-daily-badge">
                <div className="wp-daily-icon">
                  <img src="/tienda/assets/coin.png" alt="Regalo" draggable="false" />
                </div>
                <div className="wp-daily-texts">
                  <span className="daily-title">REGALO DIARIO</span>
                  <span className="daily-status">¡DISPONIBLE GRATIS!</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {isModalOpen && (
        <TiendaModalJugador 
          onConfirmar={handleModalConfirm} 
          onCerrar={() => setIsModalOpen(false)} 
        />
      )}
    </>
  );
};

export default WelcomePackPromo;