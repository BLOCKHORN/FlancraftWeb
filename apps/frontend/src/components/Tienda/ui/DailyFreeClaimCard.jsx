import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { UserContext } from "../../../context/UserContext";
import { useAuthModal } from "../../../context/AuthModalContext";
import { apiUrl } from "../../../lib/env";
import { clearSessionStorage, getAuthToken } from "../../../lib/auth/storage";
import "../../../styles/components/Tienda/daily-free-claim-card.scss";

const FLANITE_SRC = "/tienda/assets/flanite.webp";
const COIN_SRC = "/tienda/assets/coin.png";

function msToShort(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h <= 0) return `${m}min`;
  return `${h}h ${m}min`;
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function formatInt(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "0";
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(Math.round(v));
}

function useCountUp(active, target, duration = 1200) {
  const [val, setVal] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!active) return;
    let start = null;
    const from = 0;
    const to = Math.max(0, Number(target) || 0);

    const tick = (ts) => {
      if (!start) start = ts;
      const t = clamp((ts - start) / duration, 0, 1);
      const eased = easeOutCubic(t);
      setVal(Math.round(from + (to - from) * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };

    setVal(0);
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [active, target, duration]);

  return val;
}

export default function DailyFreeClaimCard() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [modal, setModal] = useState(null);
  
  const { user, logout, setUser } = useContext(UserContext);
  const { openAuthModal } = useAuthModal();
  const [token, setToken] = useState(() => getAuthToken());

  useEffect(() => {
    setToken(getAuthToken());
  }, [user]);
  
  const isLocked = !user?.loggedIn || !token;

  const emitBalances = (detail) => {
    try { window.dispatchEvent(new CustomEvent("fc:balances", { detail: detail || {} })); } catch {}
  };

  const nextMs = useMemo(() => {
    if (!status?.nextClaimAt) return 0;
    return new Date(status.nextClaimAt).getTime() - Date.now();
  }, [status?.nextClaimAt]);

  const showCount = !!(modal && !modal.error && modal.phase === "reveal");
  const countCoins = useCountUp(showCount, modal?.coinsAmount ?? 0, 1200);
  const countFlanites = useCountUp(showCount, modal?.flanitesAmount ?? 0, 1200);

  useEffect(() => {
    let alive = true;

    if (!token) {
      setLoading(false);
      setStatus({ claimedToday: false });
      return () => {};
    }

    (async () => {
      try {
        setLoading(true);
        const r = await fetch(apiUrl(`/api/daily-claim/status`), {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (r.status === 401) {
          clearSessionStorage();
          logout();
          if (!alive) return;
          setToken(null);
          setStatus({ claimedToday: false });
          return;
        }

        const d = await r.json();
        if (!alive) return;
        setStatus(d);
      } catch {
        if (!alive) return;
        setStatus({ claimedToday: false });
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [token, user]);

  useEffect(() => {
    if (!status?.claimedToday) return;
    const t = setInterval(() => setStatus((s) => ({ ...(s || {}) })), 1000);
    return () => clearInterval(t);
  }, [status?.claimedToday]);

  useEffect(() => {
    if (!modal) return;
    const onKey = (e) => e.key === "Escape" && !claiming && setModal(null);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [modal, claiming]);

  const handleClaimClick = async () => {
    if (claiming) return;
    setClaiming(true);
    
    setModal((m) => ({ ...m, phase: "vibrating" }));

    try {
      const [res] = await Promise.all([
        fetch(apiUrl(`/api/daily-claim`), {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        }),
        new Promise((resolve) => setTimeout(resolve, 1500)) 
      ]);

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al reclamar");

      setModal((m) => ({
        ...m,
        phase: "reveal",
        coinsAmount: data.coinsAmount,
        flanitesAmount: data.flanitesAmount,
        nextClaimAt: data.nextClaimAt,
      }));

      setStatus((s) => ({
        ...(s || {}),
        claimedToday: true,
        nextClaimAt: data.nextClaimAt,
      }));
      
      if (data.flanitesAmount > 0) {
        setUser({ ...user, flanpoints: (user.flanpoints || 0) + data.flanitesAmount }, token);
      }

      emitBalances({ refresh: true });
    } catch (e) {
      setModal((m) => ({ ...m, error: e.message }));
    } finally {
      setClaiming(false);
    }
  };

  const handleContinue = () => setModal(null);
  const handleCloseModal = () => { if (!claiming) setModal(null); };

  const ctaText = status?.claimedToday ? "RECLAMADO" : "GRATIS";
  const timerText = status?.claimedToday ? `Vuelve en ${msToShort(nextMs)}` : isLocked ? "Requiere iniciar sesión" : "¡Recompensa disponible!";

  if (loading) return null;

  const modalNode = modal && createPortal(
    <div className="fc-daily-overlay" onClick={handleCloseModal}>
      <div className={`fc-daily-modal ${modal.phase === "reveal" ? "is-bursting" : ""}`} onClick={(e) => e.stopPropagation()}>
        <button className="fc-daily-close" onClick={handleCloseModal}>✖</button>
        
        <div className="fc-daily-content">
          {!modal.error ? (
            <>
              {modal.phase === "auth" && (
                <>
                  <h2 className="fc-daily-title">INICIA SESIÓN</h2>
                  <p className="fc-daily-text">Para reclamar el regalo diario, vincula tu cuenta en el servidor con <b>/vincular</b> y luego inicia sesión.</p>
                  <button className="fc-daily-btn-green mt-16" onClick={() => { setModal(null); openAuthModal(); }}>
                    <span>INICIAR SESIÓN</span>
                  </button>
                </>
              )}

              {(modal.phase === "intro" || modal.phase === "vibrating") && (
                <>
                  <h2 className="fc-daily-title yellow">¡ENERGIA DETECTADA!</h2>
                  <p className="fc-daily-text">Toca los núcleos para absorber la recompensa diaria.</p>
                  
                  <div className="fc-daily-visual" onClick={modal.phase === "intro" ? handleClaimClick : undefined} style={{ cursor: modal.phase === "vibrating" ? "default" : "pointer" }}>
                    <div className={`fc-daily-orbital-spinner ${modal.phase === "vibrating" ? "speed-up" : "normal-spin"}`}>
                      <div className={`fc-orbital-item item--flanite ${modal.phase === "vibrating" ? "speed-up" : "normal-spin"}`}>
                        <img src={FLANITE_SRC} alt="Flanite" className="pixelated" draggable="false" />
                      </div>
                      <div className={`fc-orbital-item item--coin ${modal.phase === "vibrating" ? "speed-up" : "normal-spin"}`}>
                        <img src={COIN_SRC} alt="Coin" draggable="false" />
                      </div>
                    </div>
                  </div>
                  
                  <button className="fc-daily-btn-green mt-16" onClick={modal.phase === "intro" ? handleClaimClick : undefined} disabled={modal.phase === "vibrating"}>
                    <span>{modal.phase === "vibrating" ? "FORJANDO..." : "RECLAMAR"}</span>
                  </button>
                </>
              )}

              {modal.phase === "reveal" && (
                <div className="fc-daily-reveal-wrapper">
                  <h2 className="fc-daily-title green">¡RECOMPENSA OBTENIDA!</h2>
                  
                  <div className="fc-daily-rewards-reveal pf-tileIn">
                    <div className="fc-daily-reward-line">
                      <img src={COIN_SRC} alt="Coins" className="fc-daily-coin-icon" />
                      <span className="fc-daily-amount-reveal">+{formatInt(countCoins)}</span>
                    </div>
                    
                    <div className="fc-daily-divider-reveal" />
                    
                    <div className="fc-daily-reward-line line-flanite">
                      <img src={FLANITE_SRC} alt="Flanite" className="fc-daily-coin-icon pixelated" />
                      <span className="fc-daily-amount-reveal">+{formatInt(countFlanites)}</span>
                    </div>
                  </div>
                  
                  <p className="fc-daily-text mt-16">
                    Tus <strong>Coins</strong> han sido enviadas al Survival y la <strong>Flanite</strong> ya está en La Forja.
                  </p>
                  
                  <button className="fc-daily-btn-green w-full" onClick={handleContinue}>
                    <span>CONTINUAR</span>
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <h2 className="fc-daily-title red">ERROR</h2>
              <p className="fc-daily-text red">{modal.error}</p>
              <button className="fc-daily-btn-gray mt-16 w-full" onClick={() => setModal(null)}>CERRAR</button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );

  return (
    <>
      <div className={`fc-daily-banner ${status?.claimedToday ? "is-cooldown" : ""} ${isLocked ? "is-locked" : ""} no-tap-highlight`}>
        <div className="fc-banner-icon-stack">
          <div className={`fc-banner-orbital ${!status?.claimedToday && !isLocked ? 'is-available' : ''}`} aria-hidden="true">
            <div className="fc-orbital-item-banner item--flanite"><img src={FLANITE_SRC} alt="" className="pixelated" /></div>
            <div className="fc-orbital-item-banner item--coin"><img src={COIN_SRC} alt="" /></div>
          </div>
        </div>
        
        <div className="fc-banner-info">
          <div className="fc-banner-title">REGALO DIARIO</div>
          <p className={`fc-banner-timer ${!status?.claimedToday && !isLocked ? 'is-ready' : ''}`}>{timerText}</p>
        </div>

        <div className="fc-banner-action">
          <button 
            type="button" className="fc-banner-cta no-tap-highlight"
            disabled={status?.claimedToday}
            onClick={() => {
              if (status?.claimedToday) return;
              if (isLocked) return openAuthModal();
              setModal({ phase: "intro" });
            }}
          >
            <span>{ctaText}</span>
          </button>
        </div>
      </div>
      {modalNode}
    </>
  );
}