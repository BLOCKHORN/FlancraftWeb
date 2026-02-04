// src/components/Tienda/details/data/productDetails/gens.details.js
import ProductDetailsCoins from "../../ProductDetailsCoins.jsx";

export const GENS_DETAILS = {
  "gens/coin": {
    component: ProductDetailsCoins,
    theme: "gens",
    name: "GENS COINS",
    title: "GENS COINS",
    subtitle: "Moneda premium de Gens. Sirve para comprar mejoras y contenido exclusivo dentro del modo.",
    props: {
      theme: "gens",
      kicker: "Producto",
      title: "GENS COINS",
      subtitle:
        "Moneda premium de Gens. Sirve para comprar mejoras y contenido exclusivo dentro del modo.",
      bullets: [
        "Comprar mejoras del generador y módulos especiales.",
        "Desbloquear utilidades exclusivas y quality-of-life.",
        "Acceder a contenido premium del modo (packs y ventajas estéticas).",
        "Progresión más cómoda: menos farmeo, más construcción y estrategia.",
      ],
      steps: [
        "Compra el pack de Coins desde la tienda.",
        "Entra a Gens y abre la interfaz del modo (si aplica).",
        "Gasta tus Coins en mejoras, módulos o utilidades.",
      ],
      footer:
        "Producto de progreso del modo: diseñado para sentirse premium visualmente, sin ensuciar la UI.",
      note:
        "Entrega automática al jugador vinculado. Si estás dentro del servidor, puede tardar unos segundos.",
      bust: null,
    },
  },

  // aliases
  "gens/coins": "gens/coin",
};