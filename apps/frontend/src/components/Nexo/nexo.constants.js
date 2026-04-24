export const NEXO_CATALOG = [
  // --- PERMANENTES ---
  {
    id: "keepinventory",
    nombre: "El Vínculo del Alma",
    efecto: "MANTIENE INVENTARIO AL MORIR PERMANENTEMENTE",
    lore: "La muerte ya no es un castigo, solo un contratiempo. Tu inventario queda ligado a tu espíritu para siempre.",
    precio: 3500,
    categoria: "permanente",
    rareza: "legendario",
    imagen: "/tienda/assets/nexo/keepinv.webp"
  },
  {
    id: "keepxp",
    nombre: "Corona del Erudito",
    efecto: "MANTIENE XP AL MORIR PERMANENTEMENTE",
    lore: "El conocimiento nunca se pierde. Conserva tu experiencia de Minecraft (niveles verdes) al morir de forma permanente.",
    precio: 2500,
    categoria: "permanente",
    rareza: "legendario",
    imagen: "/tienda/assets/nexo/keepxp.webp"
  },

  // --- TEMPORALES ---
  {
    id: "keepinv_24h",
    nombre: "Frasco de Retorno",
    efecto: "MANTIENE INVENTARIO (24 HORAS)",
    lore: "Protección temporal. No perderás tus objetos al morir durante las próximas 24 horas reales. Ideal para el End.",
    precio: 300,
    categoria: "temporal",
    rareza: "epico",
    imagen: "/tienda/assets/nexo/potion_inv.webp"
  },
  {
    id: "keepxp_24h",
    nombre: "Frasco de Memoria",
    efecto: "MANTIENE XP (24 HORAS)",
    lore: "Protección temporal. Tu experiencia de Minecraft está a salvo al morir durante 24 horas.",
    precio: 200,
    categoria: "temporal",
    rareza: "epico",
    imagen: "/tienda/assets/nexo/potion_xp.webp"
  },

  // --- ECONOMÍA ---
  {
    id: "money_10k",
    nombre: "Bolsa de Contrabandista",
    efecto: "+$10.000",
    lore: "Inyecta al instante $10,000 en tu cuenta bancaria del Survival. Dinero rápido, sin hacer preguntas.",
    precio: 500,
    categoria: "consumible",
    rareza: "raro",
    imagen: "/tienda/assets/nexo/bag_money.webp"
  },

  // --- XP MINECRAFT (Orbes) ---
  {
    id: "xp_50",
    nombre: "Orbe de Sabiduría Menor",
    efecto: "+50 NIVELES XP",
    lore: "Otorga 50 niveles de XP de Minecraft puros. Úsalo para reparar equipo en el yunque o encantar.",
    precio: 150,
    categoria: "consumible",
    rareza: "comun",
    imagen: "/tienda/assets/nexo/orb_xp_minor.webp"
  },
  {
    id: "xp_100",
    nombre: "Orbe de Sabiduría Mayor",
    efecto: "+100 NIVELES XP",
    lore: "Otorga 100 niveles de XP de Minecraft puros. Perfecto para sesiones intensas de encantamientos.",
    precio: 300,
    categoria: "consumible",
    rareza: "raro",
    imagen: "/tienda/assets/nexo/orb_xp_major.webp"
  },
  {
    id: "xp_150",
    nombre: "Orbe de Sabiduría Supremo",
    efecto: "+150 NIVELES XP",
    lore: "Otorga 150 niveles de XP de Minecraft puros. Energía mágica en su máxima concentración.",
    precio: 500,
    categoria: "consumible",
    rareza: "epico",
    imagen: "/tienda/assets/nexo/orb_xp_supreme.webp"
  },

  // --- NIVELES GLOBALES DEL SERVIDOR (Cristales) ---
  {
    id: "nivel_100",
    nombre: "Cristal de Ascensión Menor",
    efecto: "+100 PUNTOS DE /NIVELES",
    lore: "Te otorga 100 puntos para tu rango global (/niveles). Sube de nivel en el servidor y desbloquea ventajas.",
    precio: 300,
    categoria: "consumible",
    rareza: "comun",
    imagen: "/tienda/assets/nexo/crystal_minor.webp"
  },
  {
    id: "nivel_300",
    nombre: "Cristal de Ascensión Mayor",
    efecto: "+300 PUNTOS DE /NIVELES",
    lore: "Te otorga 300 puntos para tu rango global (/niveles). Da un salto enorme en tu prestigio dentro del servidor.",
    precio: 800,
    categoria: "consumible",
    rareza: "raro",
    imagen: "/tienda/assets/nexo/crystal_major.webp"
  },
  {
    id: "nivel_700",
    nombre: "Cristal de Ascensión Supremo",
    efecto: "+700 PUNTOS DE /NIVELES",
    lore: "Te otorga 700 puntos para tu rango global (/niveles). Acelera tu camino hacia los rangos más altos.",
    precio: 1800,
    categoria: "consumible",
    rareza: "epico",
    imagen: "/tienda/assets/nexo/crystal_supreme.webp"
  },

  // --- INVESTIGACIÓN DE FÁBRICAS (Códices) ---
  {
    id: "research_5",
    nombre: "Códice de Fábrica Básico",
    efecto: "+5 PUNTOS DE INVESTIGACIÓN",
    lore: "Contiene planos que te otorgan 5 Puntos de Investigación directos para mejorar tus fábricas.",
    precio: 100,
    categoria: "consumible",
    rareza: "comun",
    imagen: "/tienda/assets/nexo/codex_basic.webp"
  },
  {
    id: "research_15",
    nombre: "Códice de Fábrica Avanzado",
    efecto: "+15 PUNTOS DE INVESTIGACIÓN",
    lore: "Contiene planos complejos que te otorgan 15 Puntos de Investigación para escalar tu industria.",
    precio: 250,
    categoria: "consumible",
    rareza: "raro",
    imagen: "/tienda/assets/nexo/codex_advanced.webp"
  },
  {
    id: "research_25",
    nombre: "Códice de Fábrica Maestro",
    efecto: "+25 PUNTOS DE INVESTIGACIÓN",
    lore: "Tecnología perdida que te otorga 25 Puntos de Investigación. Domina la industria del servidor.",
    precio: 400,
    categoria: "consumible",
    rareza: "epico",
    imagen: "/tienda/assets/nexo/codex_master.webp"
  }
];