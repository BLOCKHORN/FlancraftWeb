import React from "react";
import ProductDetailsTags from "./ProductDetailsTags.jsx";
import ProductDetailsItemsOP from "./ProductDetailsItemsOP.jsx";
import ProductDetailsLlaves from "./ProductDetailsLlaves.jsx";

export default function ProductDetailsMCMenu({ data }) {
  const theme = (data?.theme || "").toString().trim().toLowerCase();

  if (theme === "tags") return <ProductDetailsTags data={data} />;

  if (theme === "itemsop" || theme === "items-op" || theme === "items_op") {
    return <ProductDetailsItemsOP data={data} />;
  }

  if (theme === "keys" || theme === "llaves" || theme === "key" || theme === "keys_survival") {
    return <ProductDetailsLlaves data={data} />;
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
