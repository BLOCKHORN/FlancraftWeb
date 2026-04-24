import { memo } from "react";

const FLANITE_SRC = "/tienda/assets/flanite.webp";

function formatInt(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "0";
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(Math.round(v));
}

function NexoCard({ item, isOwned, onOpenModal }) {
  return (
    <article className={`nx-card is-${item.rareza} ${isOwned ? "is-owned" : ""}`} onClick={() => onOpenModal(item)}>
      <div className="nx-card-header">
        <h3 className="nx-card-name" title={item.nombre}>{item.nombre}</h3>
        <div className="nx-card-rarity-tag">{item.rareza.toUpperCase()}</div>
      </div>
      
      <div className="nx-card-art">
        <div className="nx-card-slot-bg" />
        <img src={item.imagen} alt="" className="nx-card-img" draggable="false" />
      </div>

      <div className="nx-card-body">
        <div className="nx-card-efecto" title={item.efecto}>{item.efecto}</div>
        <p className="nx-card-desc" title={item.lore}>{item.lore}</p>
        
        <div className="nx-card-bottom-anchor">
          <div className="nx-card-price-row">
            {isOwned ? (
              <span className="nx-owned-text">ADQUIRIDO</span>
            ) : (
              <>
                <span className="nx-price-val">{formatInt(item.precio)}</span>
                <img src={FLANITE_SRC} alt="" className="nx-mini-flt" />
              </>
            )}
          </div>

          <button className="nx-btn nx-btn-forge-card" disabled={isOwned}>
            {isOwned ? "EN POSESIÓN" : "FORJAR"}
          </button>
        </div>
      </div>
    </article>
  );
}

export default memo(NexoCard);