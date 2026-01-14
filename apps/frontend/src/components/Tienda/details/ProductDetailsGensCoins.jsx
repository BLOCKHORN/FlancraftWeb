// src/components/Tienda/details/ProductDetailsGensCoins.jsx
import React, { useMemo } from "react";
import { withCacheBust } from "../utils/tiendaHelpers";
import "../../../styles/components/Tienda/details/gensCoinsDetails.scss";

export default function ProductDetailsGensCoins({ pkg, data }) {
  const bust = data?.bust ?? null;

  const img = useMemo(() => {
    const raw =
      pkg?.image_url || pkg?.image || pkg?.imageUrl || pkg?.img || "/assets/tienda/producto-placeholder.png";
    return withCacheBust(raw, bust);
  }, [pkg, bust]);

  const name = (pkg?.name || pkg?.nombre || "GENS COINS").toString();
  const price = Number(pkg?.precio ?? pkg?.price ?? 0);
  const priceFmt = Number.isFinite(price) ? `${price.toFixed(2)} €` : "—";

  return (
    <div className="pd pd--genscoins">
      <div className="gcd">
        <div className="gcd__top">
          <div className="gcd__titleRow">
            <div className="gcd__title">GENS COINS</div>
            <div className="gcd__meta">
              <span className="gcd__pill">
                <span className="k">Producto</span>
                <span className="v">{name}</span>
              </span>
              <span className="gcd__pill gcd__pill--gold">
                <span className="k">Precio</span>
                <span className="v">{priceFmt}</span>
              </span>
            </div>
          </div>

          <div className="gcd__sub">
            Moneda premium de Gens. Sirve para comprar mejoras y contenido exclusivo dentro del modo.
          </div>
        </div>

        <div className="gcd__grid">
          <div className="gcd__panel gcd__panel--preview">
            <div className="gcd__h">Vista previa</div>

            <div className="gcd__card">
              <div className="gcd__cardInner">
                <img src={img} alt={name} loading="lazy" />
                <span className="gcd__glow" aria-hidden="true" />
                <span className="gcd__spark" aria-hidden="true" />
              </div>
            </div>

            <div className="gcd__note">
              Entrega automática al jugador vinculado. Si estás dentro del servidor, puede tardar unos segundos.
            </div>
          </div>

          <div className="gcd__panel">
            <div className="gcd__h">¿Para qué sirven?</div>
            <div className="gcd__muted">
              Las Coins son la moneda del modo Gens. Se usan para acelerar el progreso sin romper el balance.
            </div>

            <div className="gcd__list">
              <div className="gcd__li">
                <span className="dot" aria-hidden="true" />
                Comprar mejoras del generador y módulos especiales.
              </div>
              <div className="gcd__li">
                <span className="dot" aria-hidden="true" />
                Desbloquear utilidades exclusivas y quality-of-life.
              </div>
              <div className="gcd__li">
                <span className="dot" aria-hidden="true" />
                Acceder a contenido premium del modo (packs y ventajas estéticas).
              </div>
              <div className="gcd__li">
                <span className="dot" aria-hidden="true" />
                Progresión más cómoda: menos farmeo, más construcción y estrategia.
              </div>
            </div>

            <div className="gcd__h2">Cómo se usan</div>
            <div className="gcd__how">
              <div className="step">
                <div className="n">1</div>
                <div className="t">Compra el pack de Coins desde la tienda.</div>
              </div>
              <div className="step">
                <div className="n">2</div>
                <div className="t">Entra a Gens y abre la interfaz del modo (si aplica).</div>
              </div>
              <div className="step">
                <div className="n">3</div>
                <div className="t">Gasta tus Coins en mejoras, módulos o utilidades.</div>
              </div>
            </div>

            <div className="gcd__foot">
              Producto de progreso del modo: diseñado para sentirse “premium” visualmente, sin ensuciar la UI.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
