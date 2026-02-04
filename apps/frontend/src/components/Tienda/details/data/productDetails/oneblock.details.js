// src/components/Tienda/details/data/productDetails/oneblock.details.js
import ProductDetailsCoins from "../../ProductDetailsCoins.jsx";

export const ONEBLOCK_DETAILS = {
  "oneblock/coin": {
    component: ProductDetailsCoins,
    theme: "oneblock",
    name: "ONEBLOCK COINS",
    title: "ONEBLOCK COINS",
    subtitle:
      "Moneda premium de OneBlock. Úsala para progresar más rápido y desbloquear contenido del modo.",
    props: {
      theme: "oneblock",
      kicker: "Producto",
      title: "ONEBLOCK COINS",
      subtitle:
        "Moneda premium de OneBlock. Úsala para progresar más rápido y desbloquear contenido del modo.",
      bullets: [
        "Comprar utilidades y mejoras del modo OneBlock.",
        "Desbloquear ventajas de calidad de vida (según modalidad).",
        "Acceder a contenido premium del modo (packs, cosméticos, mejoras).",
        "Acelerar la progresión sin romper el balance del servidor.",
      ],
      steps: [
        "Compra el pack de Coins desde la tienda.",
        "Entra a OneBlock y abre la interfaz del modo.",
        "Gasta tus Coins en mejoras, utilidades o contenido del modo.",
      ],
      footer:
        "Diseñado para mejorar la experiencia de OneBlock manteniendo un progreso justo.",
      note:
        "Entrega automática al jugador vinculado. Si estás dentro del servidor, puede tardar unos segundos.",
      bust: null,
    },
  },

  // aliases
  "oneblock/coins": "oneblock/coin",
};