// apps/frontend/src/components/Tienda/details/data/productDetails/itemsop.details.js

const ENCHANTS_WAY = [
  { name: "Fortuna", level: 20 },
  { name: "Eficiencia", level: 60 },
  { name: "Irrompibilidad", level: 20 },
  { name: "Reparación", level: 1 },
];

const ATTRS_WAY = {
  header: "En la mano principal:",
  rows: [
    { left: "+6", leftColor: "green", right: "Daño de ataque" },
    { left: "+1.2", leftColor: "green", right: "Velocidad de ataque" },
    { left: "+3661", leftColor: "blue", right: "Eficiencia al romper bloques" },
  ],
};

export const ITEMSOP_DETAILS = {
  // =========================
  // PICO WAY
  // =========================
  "items-op/pico-way": {
    version: 2,
    type: "itemsop_tooltip",
    theme: "itemsop",
    id: "items-op/pico-way",
    kicker: "Producto",
    name: "PICO WAY",

    // ✅ imagen local (public/tienda/productos/picoway.png)
    image: "/tienda/productos/picoway.png",

    // ✅ reales (los 3 iguales)
    enchants: ENCHANTS_WAY,

    // ✅ sin efectos
    effects: [],

    // ✅ sin lore
    lore: [],

    // ✅ mismas stats (como pediste)
    attributes: {
      ...ATTRS_WAY,
      itemId: "minecraft:netherite_pickaxe",
    },
  },

  // =========================
  // HACHA WAY
  // =========================
  "items-op/hacha-way": {
    version: 2,
    type: "itemsop_tooltip",
    theme: "itemsop",
    id: "items-op/hacha-way",
    kicker: "Producto",
    name: "HACHA WAY",

    // ✅ la pondrás luego
    image: "/tienda/productos/hachaway.png",

    enchants: ENCHANTS_WAY,
    effects: [],
    lore: [],

    attributes: {
      ...ATTRS_WAY,
      itemId: "minecraft:netherite_axe",
    },
  },

  // =========================
  // PALA WAY
  // =========================
  "items-op/pala-way": {
    version: 2,
    type: "itemsop_tooltip",
    theme: "itemsop",
    id: "items-op/pala-way",
    kicker: "Producto",
    name: "PALA WAY",

    // ✅ la pondrás luego
    image: "/tienda/productos/palaway.png",

    enchants: ENCHANTS_WAY,
    effects: [],
    lore: [],

    attributes: {
      ...ATTRS_WAY,
      itemId: "minecraft:netherite_shovel",
    },
  },

  // ✅ alias por si llega sin categoría (slug)
  "pico-way": null,
  "hacha-way": null,
  "pala-way": null,
};

// Rellena alias apuntando a la misma ficha (sin duplicar)
ITEMSOP_DETAILS["pico-way"] = ITEMSOP_DETAILS["items-op/pico-way"];
ITEMSOP_DETAILS["hacha-way"] = ITEMSOP_DETAILS["items-op/hacha-way"];
ITEMSOP_DETAILS["pala-way"] = ITEMSOP_DETAILS["items-op/pala-way"];
