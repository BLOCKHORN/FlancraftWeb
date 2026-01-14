// src/components/Tienda/details/data/productDetails/gens.details.js
import ProductDetailsGensCoins from "../../ProductDetailsGensCoins.jsx";

export const GENS_DETAILS = {
  "gens/coin": {
    component: ProductDetailsGensCoins,
    theme: "gens",
    name: "GENS COINS",
    title: "GENS COINS",
    subtitle: "Moneda premium de Gens.",
    props: {
      bust: null, // lo sobreescribe el modal si quieres pasar cacheBust
    },
  },

  // aliases por si acaso
  "gens/coins": "gens/coin",
};
