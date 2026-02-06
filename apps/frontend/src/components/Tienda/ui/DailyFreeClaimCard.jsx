// src/components/Tienda/ui/DailyFreeClaimCard.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import "../../../styles/components/Tienda/daily-free-claim-card.scss";

const API = import.meta.env.VITE_API_URL || "https://flancraft-backend.onrender.com";

const SERVER_META = {
  oneblock: { label: "Oneblock", icon: "/assets/reinos/oneblock.webp" },
  gens: { label: "Gens", icon: "/assets/reinos/gens.webp" },
};

function msToHMS(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${h}h ${m}m ${ss}s`;
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

  // modal: null | { error } | { steps, stepIndex, phase, nextClaimAt, particlesKey }
  const [modal, setModal] = useState(null);

  const token = localStorage.getItem("token");

  const nextMs = useMemo(() => {
    if (!status?.nextClaimAt) return 0;
    return new Date(status.nextClaimAt).getTime() - Date.now();
  }, [status?.nextClaimAt]);

  // ---- Modal helpers (hooks SIEMPRE ejecutados) ----
  const modalStep = useMemo(() => {
    if (!modal || modal.error || !modal.steps) return null;
    return modal.steps[modal.stepIndex] || null;
  }, [modal]);

  const stepMeta = useMemo(() => {
    if (!modalStep) return null;
    return SERVER_META[modalStep.serverKey] || { label: String(modalStep.serverKey || ""), icon: null };
  }, [modalStep]);

  const showCount = !!(modal && !modal.error && modal.phase === "reveal" && modalStep);
  const countVal = useCountUp(showCount, modalStep?.amount ?? 0, 900);

  const particles = useMemo(() => {
    if (!modal || modal.error) return [];
    return buildParticles(modal.phase === "done" ? 26 : 18);
  }, [modal?.particlesKey]);

  // ---- Fetch status ----
  useEffect(() => {
    let alive = true;

    if (!token) {
      setLoading(false);
      setStatus({ notLogged: true });
      return () => {};
    }

    (async () => {
      try {
        setLoading(true);
        const r = await fetch(`${API}/api/daily-claim/status`, {
          headers: { Authorization: `Bearer ${token}` },
        });
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

  // tick de cooldown
  useEffect(() => {
    if (!status?.claimedToday) return;
    const t = setInterval(() => setStatus((s) => ({ ...(s || {}) })), 1000);
    return () => clearInterval(t);
  }, [status?.claimedToday]);

  // ESC + lock scroll modal
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

  const openRewardModal = ({ amount, servers, nextClaimAt }) => {
    const list = Array.isArray(servers) && servers.length ? servers : ["oneblock", "gens"];
    const steps = list.map((sv) => ({ serverKey: sv, amount }));
    setModal({
      steps,
      stepIndex: 0,
      phase: "intro",
      nextClaimAt,
      particlesKey: `${Date.now()}_${Math.random()}`,
    });
  };

  const nextStep = () => {
    setModal((m) => {
      if (!m || m.error) return m;

      if (m.phase === "intro") return { ...m, phase: "reveal", particlesKey: `${Date.now()}_${Math.random()}` };

      if (m.phase === "reveal") {
        const last = m.stepIndex >= m.steps.length - 1;
        if (last) return { ...m, phase: "done", particlesKey: `${Date.now()}_${Math.random()}` };
        return {
          ...m,
          stepIndex: m.stepIndex + 1,
          phase: "intro",
          particlesKey: `${Date.now()}_${Math.random()}`,
        };
      }

      return m;
    });
  };

  const handleClaim = async () => {
    setClaiming(true);
    try {
      const res = await fetch(`${API}/api/daily-claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");

      openRewardModal({ amount: data.amount, servers: data.servers, nextClaimAt: data.nextClaimAt });

      setStatus({
        claimedToday: true,
        nextClaimAt: data.nextClaimAt,
        lastAmount: data.amount,
        streak: data.streak,
      });
    } catch (e) {
      setModal({ error: e.message });
    } finally {
      setClaiming(false);
    }
  };

  const isLocked = !token || status?.notLogged;
  const disabled = !!(status?.claimedToday || claiming);

  // --- Render (UN SOLO RETURN) ---
  if (loading) return null;

  return (
    <>
      {isLocked ? (
        <div className="dailyClaimCard is-locked">
          <div className="dailyClaimCard__title">Recompensa diaria</div>
          <div className="dailyClaimCard__desc">Vincula tu cuenta y entra para reclamar.</div>
          <button type="button" disabled>
            Bloqueado
          </button>
        </div>
      ) : (
        <div className={`dailyClaimCard ${disabled ? "is-cooldown" : ""}`}>
          <div className="dailyClaimCard__title">Claim gratuito diario</div>
          <div className="dailyClaimCard__desc">Recibe entre 10 y 35 coins.</div>

          {status?.claimedToday ? (
            <div className="dailyClaimCard__cooldown">Vuelve en {msToHMS(nextMs)}</div>
          ) : (
            <div className="dailyClaimCard__ready">Disponible ahora</div>
          )}

          <button type="button" onClick={handleClaim} disabled={disabled}>
            {claiming ? "Reclamando..." : status?.claimedToday ? "Reclamado" : "Reclamar"}
          </button>
        </div>
      )}

      {modal && (
        <div className={`dailyClaimModal dailyClaimModal--dopamine ${modal?.error ? "is-error" : ""}`} role="dialog" aria-modal="true">
          <div className="dailyClaimModal__backdrop" onClick={() => setModal(null)} />

          <div className={`dailyClaimModal__panel dailyClaimModal__panel--big ${modal?.phase ? `is-${modal.phase}` : ""}`}>
            {!modal.error ? (
              <>
                <div className="dailyClaimModal__fx" aria-hidden="true">
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
                    <span className="s">Gratis</span>
                  </div>

                  {modal?.steps?.length > 1 && (
                    <div className="dailyClaimModal__steps">
                      {modal.steps.map((_, i) => (
                        <span key={i} className={`dot ${i === modal.stepIndex ? "is-on" : ""}`} />
                      ))}
                    </div>
                  )}
                </div>

                <div className="dailyClaimModal__center">
                  {stepMeta?.icon ? (
                    <div className="dailyClaimModal__server">
                      <img src={stepMeta.icon} alt={stepMeta.label} draggable="false" />
                      <div className="dailyClaimModal__serverName">{stepMeta.label}</div>
                    </div>
                  ) : (
                    <div className="dailyClaimModal__serverName">{stepMeta?.label}</div>
                  )}

                  {modal.phase === "intro" && (
                    <>
                      <div className="dailyClaimModal__title">Preparando recompensa…</div>
                      <div className="dailyClaimModal__hint">Toca para revelar</div>
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
                      <div className="dailyClaimModal__amountBig">
                        <span className="n">{formatInt(countVal)}</span>
                        <span className="u">COINS</span>
                      </div>
                      <div className="dailyClaimModal__hint">Se entregan automáticamente en el servidor</div>

                      <div className="dailyClaimModal__ctaRow">
                        <button type="button" className="dailyClaimBtn dailyClaimBtn--primary" onClick={nextStep}>
                          {modal.stepIndex < modal.steps.length - 1 ? "Siguiente" : "Continuar"}
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
                </div>

                <button className="dailyClaimModal__x" type="button" aria-label="Cerrar" onClick={() => setModal(null)}>
                  ✕
                </button>

                <button className="dailyClaimModal__clickCatcher" type="button" aria-label="Siguiente" onClick={nextStep} />
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
        </div>
      )}
    </>
  );
}
