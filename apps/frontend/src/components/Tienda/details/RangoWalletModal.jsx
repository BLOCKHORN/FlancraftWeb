// apps/frontend/src/components/Tienda/details/RangoWalletModal.jsx
import React, { useEffect, useMemo, useRef } from "react";
import "../../../styles/components/Tienda/tienda-storefront.scss";

const nf = new Intl.NumberFormat("es-ES");

const fmt = (n) => {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return nf.format(v);
};

const clamp01 = (n) => Math.max(0, Math.min(1, n));

export default function RangoWalletModal({
  open,
  onClose,
  rankKey,
  rankLabel,
  rankDeg,
  rankIcon,
  price,
  walletCoins,
  loading,
  error,
  success,
  canConfirm,
  needsLogin,
  onConfirm,
}) {
  const overlayRef = useRef(null);

  const p = Number(price);
  const w = Number(walletCoins);

  const falta = useMemo(() => {
    if (!Number.isFinite(p) || p <= 0) return null;
    if (!Number.isFinite(w)) return null;
    return Math.max(0, p - w);
  }, [p, w]);

  const pct = useMemo(() => {
    if (!Number.isFinite(p) || p <= 0) return 0;
    if (!Number.isFinite(w) || w <= 0) return 0;
    return Math.round(clamp01(w / p) * 100);
  }, [p, w]);

  const step = useMemo(() => {
    if (success) return 3;
    if (loading) return 2;
    return 1;
  }, [success, loading]);

  const particles = useMemo(() => {
    const seedStr = `${rankKey || "x"}-${open ? "1" : "0"}-${success ? "S" : "N"}`;
    let seed = 0;
    for (let i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;

    const rnd = () => {
      seed ^= seed << 13;
      seed ^= seed >> 17;
      seed ^= seed << 5;
      return (seed >>> 0) / 4294967296;
    };

    const count = success ? 14 : 10;
    return Array.from({ length: count }).map((_, i) => {
      const a = rnd() * Math.PI * 2;
      const r = (success ? 140 : 110) + rnd() * (success ? 160 : 120);
      const dx = Math.round(Math.cos(a) * r);
      const dy = Math.round(Math.sin(a) * r);
      const ps = (0.9 + rnd() * 0.8).toFixed(2);
      const pd = Math.round((success ? 780 : 660) + rnd() * 260);
      const delay = Math.round(rnd() * 120);

      return {
        key: `${i}-${dx}-${dy}`,
        style: {
          "--dx": `${dx}px`,
          "--dy": `${dy}px`,
          "--ps": ps,
          "--pd": `${pd}ms`,
          "--pdelay": `${delay}ms`,
        },
      };
    });
  }, [rankKey, open, success]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const isLow = falta != null && falta > 0;
  const titleRank = rankLabel || String(rankKey || "").toUpperCase();

  const headline = needsLogin
    ? "Inicia sesión para usar tu wallet"
    : success
    ? "¡Compra completada!"
    : loading
    ? "Procesando compra..."
    : isLow
    ? "Te faltan coins"
    : "Listo para comprar";

  const subline = needsLogin
    ? "Entra con tu cuenta vinculada y podrás comprar rangos con coins."
    : success
    ? "Ya puedes disfrutar del rango. Si no lo ves al instante, vuelve a entrar al servidor."
    : loading
    ? "No cierres esta ventana."
    : isLow
    ? "Consíguelas con Claims Diarios, Voto o Logros."
    : "Vas a desbloquear el rango permanente en tu cuenta.";

  return (
    <div
      className="tsf-wmodalOverlay"
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label="Compra con wallet coins"
      onMouseDown={(e) => {
        if (e.target === overlayRef.current) onClose?.();
      }}
    >
      <div className="tsf-wmodalBackdrop" aria-hidden="true" />

      <div
        className={`tsf-wmodal tsf-wmodal--${rankKey || "x"} ${success ? "is-reveal" : ""} ${
          error ? "is-error" : ""
        } ${loading ? "is-loading" : ""}`}
      >
        <button type="button" className="tsf-wmodalClose" onClick={onClose} aria-label="Cerrar">
          <span className="tsf-wmodalCloseX" aria-hidden="true" />
        </button>

        <div className="tsf-wmodalFx" aria-hidden="true">
          <div className="tsf-wmodalGlow" />
          <div className="tsf-wmodalShine" />
          <div className="tsf-wmodalBurst" />
          <div className="tsf-wmodalParticles">
            {particles.map((pp) => (
              <span key={pp.key} className="tsf-wmodalParticle" style={pp.style} />
            ))}
          </div>
        </div>

        <div className="tsf-wmodalContent">
          <div className="tsf-wmodalTop">
            <div className="tsf-wmodalBadge">
              <span className="t">Pago con wallet</span>
              <span className="s">COINS</span>
            </div>

            <div className="tsf-wmodalSteps" aria-hidden="true">
              <span className={`dot ${step >= 1 ? "is-on" : ""}`} />
              <span className={`dot ${step >= 2 ? "is-on" : ""}`} />
              <span className={`dot ${step >= 3 ? "is-on" : ""}`} />
            </div>
          </div>

          <div className="tsf-wmodalHero">
            <div className="tsf-wmodalRankBadge">
              {rankDeg ? <img className="tsf-wmodalDeg" src={rankDeg} alt="" draggable="false" /> : null}
              <span className="tsf-wmodalRankFx" aria-hidden="true" />
              {rankIcon ? <img className="tsf-wmodalRankIcon" src={rankIcon} alt="" draggable="false" /> : null}
            </div>

            <div className="tsf-wmodalHeroInfo">
              <div className="tsf-wmodalHeroKicker">Rango permanente</div>
              <div className="tsf-wmodalHeroTitle">{titleRank}</div>
              <div className="tsf-wmodalHeroHint">{headline}</div>
              <div className="tsf-wmodalHeroSub">{subline}</div>
            </div>
          </div>

          <div className="tsf-wmodalStats">
            <div className="tsf-wmodalStat">
              <div className="k">Precio</div>
              <div className="v">
                <span className="n">{fmt(price)}</span>
                <img className="c" src="/tienda/assets/coin.png" alt="" draggable="false" />
              </div>
            </div>

            <div className="tsf-wmodalStat">
              <div className="k">Tu wallet</div>
              <div className="v">
                <span className="n">{walletCoins == null ? "—" : fmt(walletCoins)}</span>
                <img className="c" src="/tienda/assets/coin.png" alt="" draggable="false" />
              </div>
            </div>

            <div className={`tsf-wmodalStat ${isLow ? "is-warn" : "is-ok"}`}>
              <div className="k">{isLow ? "Te faltan" : "Te sobran"}</div>
              <div className="v">
                <span className="n">
                  {falta == null
                    ? "—"
                    : isLow
                    ? fmt(falta)
                    : fmt(Math.max(0, Number.isFinite(w) && Number.isFinite(p) ? w - p : 0))}
                </span>
                <img className="c" src="/tienda/assets/coin.png" alt="" draggable="false" />
              </div>
            </div>
          </div>

          <div className="tsf-wmodalBar" aria-label="Progreso de coins">
            <div className="tsf-wmodalBarTrack">
              <div className="tsf-wmodalBarFill" style={{ width: `${pct}%` }} />
            </div>
            <div className="tsf-wmodalBarText">
              <span>{pct}%</span>
              <span className="sep">·</span>
              <span>{isLow ? "Faltan coins" : "Suficiente"}</span>
            </div>
          </div>

          {needsLogin ? (
            <div className="tsf-wmodalMsg tsf-wmodalMsg--error">Necesitas iniciar sesión para comprar con wallet coins.</div>
          ) : null}

          {error ? <div className="tsf-wmodalMsg tsf-wmodalMsg--error">{error}</div> : null}

          {success ? <div className="tsf-wmodalMsg tsf-wmodalMsg--ok">Perfecto. Ya está hecho.</div> : null}
        </div>

        <div className="tsf-wmodalActions">
          <button type="button" className="tsf-wmodalBtn tsf-wmodalBtn--ghost" onClick={onClose} disabled={loading}>
            Cerrar
          </button>

          <button
            type="button"
            className={`tsf-wmodalBtn tsf-wmodalBtn--buy ${loading ? "is-loading" : ""} ${success ? "is-ok" : ""}`}
            onClick={onConfirm}
            disabled={!canConfirm || loading || success}
            aria-label="Confirmar compra con wallet coins"
          >
            <span className="tsf-wmodalBtnFace">{loading ? "Procesando..." : success ? "Hecho" : "Confirmar compra"}</span>
            <span className="tsf-wmodalBtnDepth" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}