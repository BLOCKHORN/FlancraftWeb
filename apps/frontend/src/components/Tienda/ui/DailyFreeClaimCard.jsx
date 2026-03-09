import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { UserContext } from "../../../context/UserContext";
import { useAuthModal } from "../../../context/AuthModalContext";
import { apiUrl } from "../../../lib/env";
import { clearSessionStorage, getAuthToken } from "../../../lib/auth/storage";
import "../../../styles/components/Tienda/daily-free-claim-card.scss";
import "../../../styles/components/Tienda/daily-free-claim-burst.scss";

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

function buildParticles(count = 18) {
  const arr = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 90 + Math.random() * 130;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist * 0.75;
    const s = 0.7 + Math.random() * 1.25;
    const d = 450 + Math.random() * 450;
    const delay = Math.random() * 90;
    arr.push({ id: `${Date.now()}_${i}_${Math.random()}`, dx, dy, s, d, delay });
  }
  return arr;
}

function useCountUp(active, target, duration = 900) {
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
  const countVal = useCountUp(showCount, modal?.amount ?? 0, 900);

  const particles = useMemo(() => {
    if (!modal || modal.error) return [];
    return buildParticles(modal.phase === "done" ? 26 : 18);
  }, [modal?.particlesKey]);

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

    return () => {
      alive = false;
    };
  }, [token]);

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

  const openClaimLogin = () => {
    openAuthModal();
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
  const timerText = status?.claimedToday ? msToShort(nextMs) : isLocked ? "Inicia sesión" : "Disponible";

  if (loading) return null;

  const isRewardFlow = !!(modal && !modal.error && modal.phase !== "auth");

  const modalNode =
    modal &&
    createPortal(
      <div className={`dailyClaimModal dailyClaimModal--dopamine ${modal?.error ? "is-error" : ""}`} role="dialog" aria-modal="true">
        <div className="dailyClaimModal__backdrop" onClick={() => setModal(null)} />

        <div className={`dailyClaimModal__panel dailyClaimModal__panel--big ${modal?.phase ? `is-${modal.phase}` : ""}`}>
          {!modal.error ? (
            <>
              <div className="dailyClaimModal__fx" aria-hidden="true">
                <div className="dailyClaimModal__rays" />
                <div className="dailyClaimModal__shine" />
                <div className="dailyClaimModal__glow" />
                <div className="dailyClaimModal__burst" />
                <div className="dailyClaimModal__particles">
                  {particles.map((p) => (
                    <i
                      key={p.id}
                      className="dailyClaimParticle"
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

              <div className="dailyClaimModal__top">
                <div className="dailyClaimModal__badge">
                  <span className="t">RECOMPENSA DIARIA</span>
                  <span className="s">{modal.phase === "auth" ? "Requiere cuenta" : "Gratis"}</span>
                </div>
              </div>

              <div className="dailyClaimModal__center">
                {modal.phase === "auth" && (
                  <>
                    <div className="dailyClaimModal__title">Inicia sesión para reclamar</div>
                    <div className="dailyClaimModal__hint">
                      Para reclamar el regalo diario, primero vincula tu cuenta en el servidor con <b>/vincular</b> y luego inicia sesión aquí.
                    </div>

                    <div className="dailyClaimModal__ctaRow">
                      <button
                        type="button"
                        className="dailyClaimBtn dailyClaimBtn--primary"
                        onClick={() => {
                          setModal(null);
                          openClaimLogin();
                        }}
                      >
                        Iniciar sesión
                      </button>

                      <button type="button" className="dailyClaimBtn" onClick={() => setModal(null)}>
                        Cerrar
                      </button>
                    </div>
                  </>
                )}

                {modal.phase !== "auth" && (
                  <>
                    <div className="dailyClaimModal__serverName">Wallet</div>

                    {modal.phase === "intro" && (
                      <>
                        <div className="dailyClaimModal__title">Preparando recompensa…</div>
                        <div className="dailyClaimModal__ctaRow">
                          <button type="button" className="dailyClaimBtn dailyClaimBtn--primary" onClick={nextStep}>
                            Revelar
                          </button>
                        </div>
                      </>
                    )}

                    {modal.phase === "reveal" && (
                      <>
                        <div className="dailyClaimModal__title">Has ganado</div>

                        <div className="dailyClaimModal__amountBig" aria-label="Cantidad de coins ganados">
                          <span className="n">{formatInt(countVal)}</span>
                          <img className="coin" src="/tienda/assets/coin.png" alt="Coin" draggable="false" />
                        </div>

                        <div className="dailyClaimModal__hint">
                          Se han añadido a tu <b>Wallet</b>. Desde ahí podrás gastarlas en la tienda o enviarlas a un servidor.
                        </div>

                        <div className="dailyClaimModal__ctaRow">
                          <button type="button" className="dailyClaimBtn dailyClaimBtn--primary" onClick={nextStep}>
                            Continuar
                          </button>
                        </div>
                      </>
                    )}

                    {modal.phase === "done" && (
                      <>
                        <div className="dailyClaimModal__title">Completado</div>
                        <div className="dailyClaimModal__hint">Vuelve mañana para tu próxima recompensa.</div>
                        <div className="dailyClaimModal__ctaRow">
                          <button type="button" className="dailyClaimBtn" onClick={() => setModal(null)}>
                            Cerrar
                          </button>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>

              <button className="dailyClaimModal__x" type="button" aria-label="Cerrar" onClick={() => setModal(null)}>
                ✕
              </button>

              {isRewardFlow && <button className="dailyClaimModal__clickCatcher" type="button" aria-label="Siguiente" onClick={nextStep} />}
            </>
          ) : (
            <>
              <div className="dailyClaimModal__title">No se pudo reclamar</div>
              <div className="dailyClaimModal__hint">{modal.error}</div>
              <div className="dailyClaimModal__ctaRow">
                <button type="button" className="dailyClaimBtn" onClick={() => setModal(null)}>
                  Cerrar
                </button>
              </div>
            </>
          )}
        </div>
      </div>,
      document.body
    );

  return (
    <>
      <div className={`dailyClaimCard ${disabled ? "is-cooldown" : ""} ${isLocked ? "is-auth" : ""}`}>
        <div className="dailyClaimCard__title">REGALO DIARIO</div>

        <div className="dailyClaimCard__timer" aria-hidden="true">
          {timerText}
        </div>

        <div className="dailyClaimCard__sheet">
          <div className="dailyClaimCard__art" aria-hidden="true">
            <img className="dailyClaimCard__coin coin--back" src="/tienda/assets/coin.png" alt="" draggable="false" />
            <img className="dailyClaimCard__coin coin--front" src="/tienda/assets/coin.png" alt="" draggable="false" />
          </div>
        </div>

        <button
          type="button"
          className="dailyClaimCard__cta"
          disabled={disabled}
          onClick={() => {
            if (disabled) return;
            if (isLocked) return openAuthModal();
            return handleClaim();
          }}
        >
          <span className="dailyClaimCard__ctaLabel">{ctaText}</span>
        </button>
      </div>

      {modalNode}
    </>
  );
}