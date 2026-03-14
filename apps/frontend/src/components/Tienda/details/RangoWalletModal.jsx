import React, { useEffect, useMemo } from "react";
import "../../../styles/components/Tienda/rangowallet.scss";

const nf = new Intl.NumberFormat("es-ES");
const fmt = (n) => {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return nf.format(v);
};

export default function RangoWalletModal({
  open,
  onClose,
  rankKey,
  rankLabel,
  rankIcon, // Usamos esta prop que ya recibes
  price,
  walletCoins,
  loading,
  error,
  success,
  canConfirm,
  needsLogin,
  onConfirm,
}) {
  const p = Number(price);
  const w = Number(walletCoins);
  const falta = useMemo(() => (Number.isFinite(p) && Number.isFinite(w) ? Math.max(0, p - w) : null), [p, w]);
  const isLow = falta != null && falta > 0;

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="mc-modal-overlay is-open" onClick={onClose}>
      <div className="mc-modal-backdrop" />

      <div className={`mc-stone-modal wallet-modal ${success ? "mc-burst-reveal" : ""}`} onClick={(e) => e.stopPropagation()}>
        <button className="mc-close-btn" onClick={onClose}>X</button>

        <div className="mc-reward-content">
          <div className="mc-title-plate">
            <h2>PAGO CON WALLET</h2>
          </div>

          {/* NUEVO: Visualización del Rango */}
          <div className="mc-rank-preview">
            <div className="mc-rank-glow"></div>
            {rankIcon && (
              <img src={rankIcon} alt={rankLabel} className="mc-rank-img" draggable="false" />
            )}
          </div>

          <div className="mc-wallet-hero">
            <span className="mc-rank-subtitle">RANGO PERMANENTE</span>
            <h3 className={`mc-rank-title ${rankKey}`}>{rankLabel || rankKey?.toUpperCase()}</h3>
          </div>

          <div className="mc-stats-container">
            <div className="mc-stat-row">
              <span className="label">PRECIO:</span>
              <div className="value">
                <span>{fmt(price)}</span>
                <img src="/tienda/assets/coin.png" alt="coins" />
              </div>
            </div>

            <div className="mc-stat-row">
              <span className="label">TU WALLET:</span>
              <div className="value">
                <span>{walletCoins == null ? "—" : fmt(walletCoins)}</span>
                <img src="/tienda/assets/coin.png" alt="coins" />
              </div>
            </div>

            <div className={`mc-stat-row divider ${isLow ? "is-danger" : "is-success"}`}>
              <span className="label">{isLow ? "TE FALTAN:" : "TE SOBRAN:"}</span>
              <div className="value">
                <span>{isLow ? fmt(falta) : fmt(w - p)}</span>
                <img src="/tienda/assets/coin.png" alt="coins" />
              </div>
            </div>
          </div>

          {needsLogin && <p className="mc-wallet-msg error">Inicia sesión para pagar con Coins</p>}
          {error && <p className="mc-wallet-msg error">{error}</p>}
          {success && <p className="mc-wallet-msg success">¡Rango desbloqueado correctamente!</p>}

          <div className="mc-wallet-actions">
            {!success ? (
              <button
                className="pixel-btn-green w-full"
                onClick={onConfirm}
                disabled={!canConfirm || loading}
              >
                <span className="new-price">{loading ? "PROCESANDO..." : "CONFIRMAR COMPRA"}</span>
              </button>
            ) : (
              <button className="pixel-btn-gray w-full" onClick={onClose}>
                CONTINUAR
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}