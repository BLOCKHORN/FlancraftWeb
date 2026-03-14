import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { UserContext } from "../../../context/UserContext";
import { useAuthModal } from "../../../context/AuthModalContext";
import { apiUrl } from "../../../lib/env";
import { clearSessionStorage, getAuthToken } from "../../../lib/auth/storage";
import "../../../styles/components/Tienda/daily-free-claim-card.scss";

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

function buildParticles(count = 24) {
  const arr = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 60 + Math.random() * 80;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist * 0.85;
    const s = 0.8 + Math.random() * 1.5;
    const d = 500 + Math.random() * 600;
    const delay = Math.random() * 100;
    arr.push({ id: `${Date.now()}_${i}_${Math.random()}`, dx, dy, s, d, delay });
  }
  return arr;
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
  
  const { user, logout } = useContext(UserContext);
  const { openAuthModal } = useAuthModal();
  const [token, setToken] = useState(() => getAuthToken());
  
  const isLocked = !user?.loggedIn || !token;

  const emitBalances = (detail) => {
    try {
      window.dispatchEvent(new CustomEvent("fc:balances", { detail: detail || {} }));
    } catch {}
  };

  const nextMs = useMemo(() => {
    if (!status?.nextClaimAt) return 0;
    return new Date(status.nextClaimAt).getTime() - Date.now();
  }, [status?.nextClaimAt]);

  const showCount = !!(modal && !modal.error && modal.phase === "reveal");
  const countVal = useCountUp(showCount, modal?.amount ?? 0, 1200);

  const particles = useMemo(() => {
    if (!modal || modal.error) return [];
    return buildParticles(modal.phase === "done" ? 30 : 24);
  }, [modal?.particlesKey, modal?.phase]);

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
    const onKey = (e) => e.key === "Escape" && setModal(null);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [modal]);

  const openRewardModal = ({ amount, walletBalance, nextClaimAt }) => {
    setModal({
      phase: "intro",
      amount,
      walletBalance: Number(walletBalance) || 0,
      nextClaimAt,
      particlesKey: `${Date.now()}_${Math.random()}`,
    });
  };

  const nextStep = () => {
    setModal((m) => {
      if (!m || m.error) return m;
      if (m.phase === "auth") return m;
      if (m.phase === "intro") return { ...m, phase: "reveal", particlesKey: `${Date.now()}_${Math.random()}` };
      if (m.phase === "reveal") return { ...m, phase: "done", particlesKey: `${Date.now()}_${Math.random()}` };
      return m;
    });
  };

  const handleClaim = async () => {
    setClaiming(true);
    try {
      const res = await fetch(apiUrl(`/api/daily-claim`), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");

      openRewardModal({
        amount: data.amount,
        walletBalance: data.walletBalance,
        nextClaimAt: data.nextClaimAt,
      });

      setStatus((s) => ({
        ...(s || {}),
        claimedToday: true,
        nextClaimAt: data.nextClaimAt,
        lastAmount: data.amount,
        walletBalance: data.walletBalance,
      }));

      emitBalances({ walletCoins: data.walletBalance });
    } catch (e) {
      setModal({ error: e.message });
    } finally {
      setClaiming(false);
    }
  };

  const disabled = !!(status?.claimedToday || claiming);
  const ctaText = status?.claimedToday ? "RECLAMADO" : claiming ? "RECLAMANDO..." : "GRATIS";
  const timerText = status?.claimedToday ? `Vuelve en ${msToShort(nextMs)}` : isLocked ? "Requiere iniciar sesión" : "¡Recompensa disponible!";

  if (loading) return null;

  const modalNode = modal && createPortal(
    <div className="mc-modal-overlay is-open" onClick={() => setModal(null)}>
      <div className="mc-modal-backdrop" />
      
      <div className={`mc-stone-modal ${modal.phase === "reveal" ? "is-bursting mc-burst-reveal" : ""}`} onClick={(e) => e.stopPropagation()}>
        <button className="mc-close-btn" onClick={() => setModal(null)}>X</button>
        
        <div className="mc-reward-content">
          {!modal.error ? (
            <>
              {modal.phase === "auth" && (
                <>
                  <div className="mc-title-plate">
                    <h2>INICIA SESIÓN</h2>
                  </div>
                  <p className="mc-reward-text">Para reclamar el regalo diario, vincula tu cuenta en el servidor con <b>/vincular</b> y luego inicia sesión.</p>
                  <button className="pixel-btn-green split-btn mt-16" onClick={() => { setModal(null); openAuthModal(); }}>
                    <span className="new-price">INICIAR SESIÓN</span>
                  </button>
                </>
              )}

              {modal.phase === "intro" && (
                <>
                  <h2 className="mc-mystery-title">¡REGALO MISTERIOSO!</h2>
                  <p className="mc-mystery-subtitle">¿Qué contendrá tu recompensa de hoy?</p>
                  
                  <div className="mc-mystery-chest-wrapper" onClick={nextStep}>
                    <div className="mc-mystery-glow"></div>
                    <img src="/tienda/assets/rankskin.png" alt="Recompensa" className="mc-chest-img" />
                  </div>
                  
                  <button className="pixel-btn-green split-btn mt-16" onClick={nextStep}>
                    <span className="new-price">REVELAR</span>
                  </button>
                </>
              )}

              {modal.phase === "reveal" && (
                <div className="mc-reveal-wrapper">
                  <h2 className="mc-reveal-title">¡HAS GANADO!</h2>
                  
                  <div className="mc-reward-big-amount mc-contained-dopamine">
                    
                    <div className="mc-contained-burst-layer">
                      <div className="mc-contained-spin-rays"></div>
                      <div className="mc-particles-contained">
                        {particles.map((p) => (
                          <i
                            key={p.id}
                            className="mc-particle"
                            style={{
                              "--dx": `${p.dx.toFixed(1)}px`,
                              "--dy": `${p.dy.toFixed(1)}px`,
                              "--ps": p.s.toFixed(2),
                              "--pd": `${p.d.toFixed(0)}ms`,
                              "--pdelay": `${p.delay.toFixed(0)}ms`,
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    <span className="amount">+{formatInt(countVal)}</span>
                    <img src="/tienda/assets/coin.png" alt="Coins" />
                  </div>
                  
                  <p className="mc-reward-text">Se han añadido a tu Wallet. Úsalas en la tienda o envíalas al servidor.</p>
                  
                  <button className="pixel-btn-green split-btn mt-16 w-full" onClick={nextStep}>
                    <span className="new-price">CONTINUAR</span>
                  </button>
                </div>
              )}

              {modal.phase === "done" && (
                <>
                  <div className="mc-title-plate">
                    <h2 style={{color: "#4ade80"}}>¡COMPLETADO!</h2>
                  </div>
                  <p className="mc-reward-text">Vuelve mañana para tu próxima recompensa diaria.</p>
                  <button className="pixel-btn-gray mt-16 w-full" onClick={() => setModal(null)}>
                    CERRAR
                  </button>
                </>
              )}
            </>
          ) : (
            <>
              <div className="mc-title-plate">
                <h2 style={{color: "#f87171"}}>ERROR</h2>
              </div>
              <p className="mc-reward-text" style={{color: "#fca5a5"}}>{modal.error}</p>
              <button className="pixel-btn-gray mt-16 w-full" onClick={() => setModal(null)}>
                CERRAR
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );

  return (
    <>
      <div className={`mc-stone-banner ${disabled ? "is-cooldown" : ""} ${isLocked ? "is-locked" : ""}`}>
        <div className="mc-banner-icon-stack">
          <div className="mc-banner-art" aria-hidden="true">
            <img className="mc-banner-coin coin--back" src="/tienda/assets/coin.png" alt="" draggable="false" />
            <img className="mc-banner-coin coin--front" src="/tienda/assets/coin.png" alt="" draggable="false" />
          </div>
        </div>
        
        <div className="mc-banner-info">
          <div className="mc-banner-title">REGALO DIARIO</div>
          <p className={`mc-banner-timer ${!disabled && !isLocked ? 'is-ready' : ''}`}>{timerText}</p>
        </div>

        <div className="mc-banner-action">
          <button 
            type="button"
            className="mc-banner-cta"
            disabled={disabled}
            onClick={() => {
              if (disabled) return;
              if (isLocked) return openAuthModal();
              return handleClaim();
            }}
          >
            <span className="mc-banner-ctaLabel">{ctaText}</span>
          </button>
        </div>
      </div>
      {modalNode}
    </>
  );
}