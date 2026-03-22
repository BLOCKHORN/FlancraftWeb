import { useEffect, useState, useRef, useLayoutEffect, useCallback } from "react";
import { Lock, CheckCircle } from "lucide-react";
import { apiUrl } from "../../lib/env";
import { getAuthToken } from "../../lib/auth/storage";
import "../../styles/components/Dashboard/_rewardlist.scss";

const RECOMPENSAS = [
  { nivel: 1, descripcion: "12 COINS", tipo: "coin" },
  { nivel: 5, descripcion: "94 COINS", tipo: "coin" },
  { nivel: 10, descripcion: "178 COINS", tipo: "coin" },
  { nivel: 15, descripcion: "246 COINS", tipo: "coin" },
  { nivel: 20, descripcion: "302 COINS", tipo: "coin" },
  { nivel: 25, descripcion: "351 COINS", tipo: "coin" },
  { nivel: 30, descripcion: "393 COINS", tipo: "coin" },
  { nivel: 35, descripcion: "432 COINS", tipo: "coin" },
  { nivel: 40, descripcion: "469 COINS", tipo: "coin" },
  { nivel: 45, descripcion: "502 COINS", tipo: "coin" },
  { nivel: 50, descripcion: "521 COINS", tipo: "coin" },
];

const COIN_ICON = "/tienda/assets/coin.png";

const safeJson = async (res, fallback = null) => {
  if (!res) return fallback;
  try {
    return await res.json();
  } catch {
    return fallback;
  }
};

export default function RewardList({
  user,
  xpData,
  coinsRef,
  ecosRef,
  onActualizarMonedas,
}) {
  const saldoRef = coinsRef || ecosRef;

  const [reclamadas, setReclamadas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [claimingNivel, setClaimingNivel] = useState(null);

  const scrollRef = useRef(null);
  const nodo1Ref = useRef(null);
  const nodoFinalRef = useRef(null);

  const [offsetNodo1, setOffsetNodo1] = useState(0);
  const [anchoBarra, setAnchoBarra] = useState("0px");

  const calcularProgresoVisual = useCallback(() => {
    if (!xpData) return 0;

    const niveles = Array.isArray(xpData.niveles) ? xpData.niveles : [];
    const xpActual = Number(xpData.xp_total_actual || 0);

    const xpMinimo = niveles.find((n) => Number(n?.nivel) === 1)?.xp_total_acumulada || 0;
    if (xpActual <= xpMinimo) return 0;

    const nodos = RECOMPENSAS.map(
      (r) => niveles.find((n) => Number(n?.nivel) === r.nivel)?.xp_total_acumulada || 0
    );

    const totalTramos = nodos.length - 1;

    for (let i = 0; i < totalTramos; i++) {
      const inicio = Number(nodos[i] || 0);
      const fin = Number(nodos[i + 1] || 0);

      if (xpActual >= fin) continue;
      if (fin <= inicio) return 0;

      const progresoRelativo = (xpActual - inicio) / (fin - inicio);
      return ((i + progresoRelativo) / totalTramos) * 100;
    }

    return 100;
  }, [xpData]);

  const recalcularBarra = useCallback(() => {
    if (!nodo1Ref.current || !nodoFinalRef.current || !xpData) return;

    const left = nodo1Ref.current.offsetLeft + nodo1Ref.current.offsetWidth / 2;
    const totalWidth =
      nodoFinalRef.current.offsetLeft + nodoFinalRef.current.offsetWidth / 2 - left;

    const porcentaje = calcularProgresoVisual();

    setOffsetNodo1(left);

    if (porcentaje <= 0) {
      setAnchoBarra("0px");
      return;
    }

    if (porcentaje >= 100) {
      setAnchoBarra(`${totalWidth}px`);
      return;
    }

    setAnchoBarra(`${(totalWidth * porcentaje) / 100}px`);
  }, [xpData, calcularProgresoVisual]);

  useLayoutEffect(() => {
    recalcularBarra();
  }, [recalcularBarra, reclamadas, xpData]);

  useEffect(() => {
    const onResize = () => recalcularBarra();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [recalcularBarra]);

  useEffect(() => {
    if (!user?.uuid) {
      setReclamadas([]);
      setLoading(false);
      return;
    }

    const token = getAuthToken();
    if (!token) {
      setReclamadas([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(apiUrl(`/api/recompensas/reclamadas/${user.uuid}`), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await safeJson(res, []);

        if (!res.ok) {
          throw new Error(data?.error || "Error al cargar reclamadas");
        }

        if (!cancelled) {
          setReclamadas(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Error");
          setReclamadas([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.uuid]);

  const readNumberFromRef = (ref) => {
    if (!ref?.current) return 0;
    const raw = String(ref.current.textContent || "");
    const digits = raw.replace(/[^\d]/g, "");
    return parseInt(digits || "0", 10) || 0;
  };

  const animateCounter = (start, end, duration, updateFn) => {
    const startTime = performance.now();

    const step = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const current = Math.floor(start + (end - start) * progress);
      updateFn(current);
      if (progress < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  };

  const lanzarMonedasAnimadas = (origen, destino, cantidad) => {
    const startRect = origen.getBoundingClientRect();
    const endRect = destino.getBoundingClientRect();
    const maxMonedas = Math.min(cantidad, 40);

    for (let i = 0; i < maxMonedas; i++) {
      const moneda = document.createElement("img");
      moneda.src = COIN_ICON;
      moneda.className = "eco-fly mc-pixelated";
      document.body.appendChild(moneda);

      const startX = startRect.left + startRect.width / 2;
      const startY = startRect.top + startRect.height / 2;
      const endX = endRect.left + endRect.width / 2;
      const endY = endRect.top + endRect.height / 2;

      moneda.style.position = "fixed";
      moneda.style.left = `${startX}px`;
      moneda.style.top = `${startY}px`;
      moneda.style.width = "24px";
      moneda.style.pointerEvents = "none";
      moneda.style.zIndex = "9999";
      moneda.style.transition = "transform 0.6s ease-in-out, opacity 0.6s ease-in-out";

      moneda.getBoundingClientRect();

      moneda.style.transform = `translate(${endX - startX + (Math.random() * 30 - 15)}px, ${endY - startY + (Math.random() * 30 - 15)}px) scale(0.5)`;
      moneda.style.opacity = "0";

      setTimeout(() => moneda.remove(), 700 + Math.random() * 300);
    }
  };

  const handleReclamar = async (nivel) => {
    if (!user?.uuid || claimingNivel) return;

    const token = getAuthToken();
    if (!token) {
      setError("Tu sesión ha expirado. Vuelve a iniciar sesión.");
      return;
    }

    setClaimingNivel(nivel);
    setError(null);

    const recompensa = RECOMPENSAS.find((r) => r.nivel === nivel);
    const cantidadUI = parseInt(recompensa?.descripcion || "0", 10) || 0;

    try {
      const res = await fetch(apiUrl(`/api/recompensas/reclamar`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          uuid: user.uuid,
          nivel,
        }),
      });

      const data = await safeJson(res, null);

      if (!res.ok) {
        throw new Error(data?.error || "Error reclamando recompensa");
      }

      const coinsAñadidos = Number(data?.coinsAñadidos) || cantidadUI;
      const nuevoSaldoCoins =
        Number.isFinite(Number(data?.nuevoSaldoCoins)) ? Number(data?.nuevoSaldoCoins) : null;

      const nodo = document.querySelector(`.reward-slot[data-nivel="${nivel}"] .reward-icon`);
      const destino = saldoRef?.current;

      if (nodo && destino && coinsAñadidos > 0) {
        lanzarMonedasAnimadas(nodo, destino, coinsAñadidos);
      }

      if (saldoRef?.current && coinsAñadidos > 0) {
        const prev = readNumberFromRef(saldoRef);

        if (nuevoSaldoCoins !== null) {
          animateCounter(prev, nuevoSaldoCoins, 900, (val) => {
            if (saldoRef.current) saldoRef.current.textContent = String(val);
          });
        } else {
          const nuevoTotal = prev + coinsAñadidos;
          animateCounter(prev, nuevoTotal, 900, (val) => {
            if (saldoRef.current) saldoRef.current.textContent = String(val);
          });
        }
      }

      setReclamadas((prev) => (prev.includes(nivel) ? prev : [...prev, nivel]));

      if (typeof onActualizarMonedas === "function") {
        await onActualizarMonedas();
      }
    } catch (err) {
      console.error("[REWARDLIST reclamar]", err);
      setError(err.message || "Error reclamando recompensa");
    } finally {
      setClaimingNivel(null);
    }
  };

  const calcularProgreso = (nivel, index) => {
    if (!xpData) return "pendiente";

    const progresoActual = Number(xpData.xp_total_actual || 0);
    const niveles = Array.isArray(xpData.niveles) ? xpData.niveles : [];

    const nodoXP =
      niveles.find((n) => Number(n?.nivel) === nivel)?.xp_total_acumulada || 0;

    if (progresoActual >= nodoXP) return "progresado";

    const anteriorNodo = RECOMPENSAS[index - 1];
    const xpAnterior = anteriorNodo
      ? niveles.find((n) => Number(n?.nivel) === anteriorNodo.nivel)?.xp_total_acumulada || 0
      : 0;

    if (progresoActual >= xpAnterior && progresoActual < nodoXP) return "siguiente";
    return "pendiente";
  };

  const scrollBy = (direction) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: direction * 320, behavior: "smooth" });
    }
  };

  return (
    <section className="reward-pass no-tap-highlight">
      <div className="reward-passHeader">
        <h2 className="titulo-reward">CAMINO AL PRESTIGIO</h2>
        <div className="recompensas-subtitulo">
          COMPLETA AVENTURAS, SUBE DE NIVEL Y CONSIGUE COINS.
        </div>
      </div>

      <div className="rewards-scroll-container">
        <button
          type="button"
          className="scroll-button scroll-left"
          onClick={() => scrollBy(-1)}
          aria-label="Recompensas anteriores"
        >
          {"<"}
        </button>
        <button
          type="button"
          className="scroll-button scroll-right"
          onClick={() => scrollBy(1)}
          aria-label="Recompensas siguientes"
        >
          {">"}
        </button>

        <div className="fade-left" />
        <div className="fade-right" />

        <div className="rewards-wrapper" ref={scrollRef}>
          <div className="rewards-row">
            <div className="progreso-wrapper">
              <div className="linea-fondo" />
              <div
                className="linea-relleno"
                style={{ width: anchoBarra, left: `${offsetNodo1}px` }}
              />
            </div>

            {RECOMPENSAS.map((r, i) => {
              const estadoNodo = calcularProgreso(r.nivel, i);
              const yaReclamada = reclamadas.includes(r.nivel);
              const puedeReclamar = estadoNodo === "progresado" && !yaReclamada;
              const isClaimingThis = claimingNivel === r.nivel;

              return (
                <div
                  key={r.nivel}
                  className="reward-slot"
                  data-nivel={r.nivel}
                  ref={i === 0 ? nodo1Ref : i === RECOMPENSAS.length - 1 ? nodoFinalRef : null}
                >
                  <div
                    className={[
                      "reward-box",
                      estadoNodo !== "pendiente" ? "unlocked" : "locked",
                      estadoNodo === "siguiente" ? "next" : "",
                      yaReclamada ? "claimed" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <div className="reward-icon">
                      {estadoNodo !== "pendiente" ? (
                        <img src={COIN_ICON} alt="COIN" className="mc-pixelated drop-coin" />
                      ) : (
                        <Lock size={24} />
                      )}
                    </div>

                    <div className="reward-desc">{r.descripcion}</div>
                    <div className="reward-nivel">NIVEL {r.nivel}</div>

                    {puedeReclamar && (
                      <button
                        type="button"
                        onClick={() => handleReclamar(r.nivel)}
                        className="mc-btn mc-btn--gold reclamar-btn"
                        disabled={!!claimingNivel}
                      >
                        {isClaimingThis ? "..." : "RECLAMAR"}
                      </button>
                    )}

                    {yaReclamada && (
                      <div className="claimed-status">
                        <CheckCircle size={16} /> RECLAMADA
                      </div>
                    )}
                  </div>

                  <div
                    className={[
                      "nodo",
                      `nodo-${estadoNodo}`,
                      yaReclamada ? "nodo-claimed" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <span>{r.nivel}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {loading && <p className="estado">Cargando recompensas...</p>}
      {error && <p className="estado error">Error: {error}</p>}
    </section>
  );
}