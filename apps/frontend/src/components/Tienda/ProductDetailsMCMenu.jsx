// apps/frontend/src/components/Tienda/ProductDetailsMCMenu.jsx
import React from "react";
import ProductDetailsTags from "./ProductDetailsTags.jsx";

export default function ProductDetailsMCMenu({ data }) {
  const theme = (data?.theme || "").toString().trim().toLowerCase();

  if (theme === "tags") {
    return <ProductDetailsTags data={data} />;
  }

  return (
    <div className="tienda-modal__fallback">
      <div className="tienda-modal__fallbackTitle">Detalles avanzados</div>
      <div className="tienda-modal__fallbackText">
        No hay renderer para <code>{data?.theme || data?.id || "este producto"}</code>.
      </div>
    </div>
  );
}
