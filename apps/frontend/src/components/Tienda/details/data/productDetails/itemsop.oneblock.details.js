// apps/frontend/src/components/Tienda/details/data/productDetails/itemsop.oneblock.details.js

const ENCHANTS_CELESTIAL = [
  { name: "Fortuna", level: 7 },
  { name: "Eficiencia", level: 15 },
  { name: "Irrompibilidad", level: 10 },
  { name: "Reparación", level: 1 },
];

// Stats “bonitos” (puedes ajustar números si quieres)
const ATTRS_CELESTIAL = {
  header: "En la mano principal:",
  rows: [
    { left: "+6", leftColor: "green", right: "Daño de ataque" },
    { left: "+1.2", leftColor: "green", right: "Velocidad de ataque" },
    { left: "+1550", leftColor: "blue", right: "Eficiencia al minar (Oneblock)" },
  ],
};

export const ITEMSOP_ONEBLOCK_DETAILS = {
  // =========================
  // PACK CELESTIAL (BUNDLE)
  // =========================
  "items-op-oneblock/pack-celestial": {
    version: 2,
    type: "itemsop_tooltip",
    theme: "itemsop",
    id: "items-op-oneblock/pack-celestial",
    kicker: "Pack",
    name: "PACK CELESTIAL",
    rarity: "legend",

    // Pon aquí tu ruta real si la tienes en /public
    // Si no existe, no pasa nada (se oculta sola por onError)
    image: "/tienda/productos/pack-celestial.webp",

    // En pack no mostramos enchants (o sí, si quisieras), mejor “incluye”
    enchants: [],
    effects: [],

    // Lore “bundle”
    lore: [
      { text: "El set completo Celestial para Oneblock.", italic: true },
      { text: "Incluye 3 herramientas legendarias.", muted: true },
      { text: "" },
      { text: "Perfecto para farmear fases y progresar más rápido.", muted: true },
    ],

    // Lista de contenido (aprovechamos attributes con header/rows)
    attributes: {
      header: "Incluye:",
      rows: [
        { left: "×1", leftColor: "green", right: "Pico Celestial (Fortuna VII)" },
        { left: "×1", leftColor: "green", right: "Hacha Celestial (Eficiencia XV)" },
        { left: "×1", leftColor: "green", right: "Pala Celestial (Irrompibilidad X)" },
      ],
      itemId: "Pack Oneblock: Celestial",
    },
  },

  // =========================
  // PICO CELESTIAL
  // =========================
  "items-op-oneblock/pico-celestial": {
    version: 2,
    type: "itemsop_tooltip",
    theme: "itemsop",
    id: "items-op-oneblock/pico-celestial",
    kicker: "Producto",
    name: "PICO CELESTIAL",
    rarity: "legend",

    image: "/tienda/productos/pico-celestial.webp",

    // (ItemsOpTooltipCard lo coge por data.enchants)
    enchants: ENCHANTS_CELESTIAL,
    effects: [],
    lore: [
      { text: "Herramienta legendaria forjada para Oneblock.", italic: true },
      { text: "Siente la Fortuna VII en cada ruptura.", muted: true },
    ],

    attributes: {
      ...ATTRS_CELESTIAL,
      itemId: "minecraft:netherite_pickaxe",
    },
  },

  // =========================
  // HACHA CELESTIAL
  // =========================
  "items-op-oneblock/hacha-celestial": {
    version: 2,
    type: "itemsop_tooltip",
    theme: "itemsop",
    id: "items-op-oneblock/hacha-celestial",
    kicker: "Producto",
    name: "HACHA CELESTIAL",
    rarity: "legend",

    image: "/tienda/productos/hacha-celestial.webp",

    enchants: ENCHANTS_CELESTIAL,
    effects: [],
    lore: [
      { text: "Impacto, velocidad y eficiencia celestial.", italic: true },
      { text: "Ideal para bloques y farmeos rápidos.", muted: true },
    ],

    attributes: {
      ...ATTRS_CELESTIAL,
      itemId: "minecraft:netherite_axe",
    },
  },

  // =========================
  // PALA CELESTIAL
  // =========================
  "items-op-oneblock/pala-celestial": {
    version: 2,
    type: "itemsop_tooltip",
    theme: "itemsop",
    id: "items-op-oneblock/pala-celestial",
    kicker: "Producto",
    name: "PALA CELESTIAL",
    rarity: "legend",

    image: "/tienda/productos/pala-celestial.webp",

    enchants: ENCHANTS_CELESTIAL,
    effects: [],
    lore: [
      { text: "Excava Oneblock como si fuera mantequilla.", italic: true },
      { text: "Eficiencia XV + Reparación I = comodidad total.", muted: true },
    ],

    attributes: {
      ...ATTRS_CELESTIAL,
      itemId: "minecraft:netherite_shovel",
    },
  },

  // =========================
  // ALIASES (por si el detailsKey llega “suelto”)
  // =========================
  "pack-celestial": null,
  "pack celestial": null,
  "pico-celestial": null,
  "hacha-celestial": null,
  "pala-celestial": null,
};

// Rellena alias apuntando a la misma ficha (sin duplicar)
ITEMSOP_ONEBLOCK_DETAILS["pack-celestial"] =
  ITEMSOP_ONEBLOCK_DETAILS["items-op-oneblock/pack-celestial"];
ITEMSOP_ONEBLOCK_DETAILS["pack celestial"] =
  ITEMSOP_ONEBLOCK_DETAILS["items-op-oneblock/pack-celestial"];

ITEMSOP_ONEBLOCK_DETAILS["pico-celestial"] =
  ITEMSOP_ONEBLOCK_DETAILS["items-op-oneblock/pico-celestial"];
ITEMSOP_ONEBLOCK_DETAILS["hacha-celestial"] =
  ITEMSOP_ONEBLOCK_DETAILS["items-op-oneblock/hacha-celestial"];
ITEMSOP_ONEBLOCK_DETAILS["pala-celestial"] =
  ITEMSOP_ONEBLOCK_DETAILS["items-op-oneblock/pala-celestial"];
