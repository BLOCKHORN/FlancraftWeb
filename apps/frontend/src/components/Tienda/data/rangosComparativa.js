// src/components/Tienda/data/rangosComparativa.js

/**
 * values: { nova: boolean|string|number, alpha: ..., inmortal: ... }
 * hint: opcional (texto pequeño debajo)
 */

export const RANGOS_COMPARATIVA = {
  "30d": [
    {
      key: "prefijo",
      label: "Prefijo en chat y TAB",
      values: { nova: true, alpha: true, inmortal: true },
    },
    {
      key: "hereda",
      label: "Acceso a beneficios de rangos anteriores",
      values: { nova: false, alpha: true, inmortal: true },
      hint: "Los rangos superiores incluyen perks acumulados.",
    },
    {
      key: "full",
      label: "Acceso con servidor lleno",
      values: { nova: false, alpha: false, inmortal: true },
    },

    // Ejemplos (rellena con tu lista real)
    {
      key: "kits",
      label: "Kits exclusivos",
      values: { nova: "Básico", alpha: "Mejorado", inmortal: "Completo" },
    },
    {
      key: "homes",
      label: "Homes adicionales",
      values: { nova: "+1", alpha: "+3", inmortal: "+6" },
    },
    {
      key: "vaults",
      label: "Vaults / Backpacks",
      values: { nova: "1", alpha: "2", inmortal: "4" },
    },
    {
      key: "sell",
      label: "Bonificación en /sell",
      values: { nova: "—", alpha: "+5%", inmortal: "+10%" },
    },
  ],

  perma: [
    {
      key: "prefijo",
      label: "Prefijo en chat y TAB",
      values: { nova: true, alpha: true, inmortal: true },
    },
    {
      key: "hereda",
      label: "Acceso a beneficios de rangos anteriores",
      values: { nova: false, alpha: true, inmortal: true },
      hint: "Los rangos superiores incluyen perks acumulados.",
    },
    {
      key: "full",
      label: "Acceso con servidor lleno",
      values: { nova: false, alpha: false, inmortal: true },
    },

    // Ejemplos perma
    {
      key: "kits",
      label: "Kits exclusivos",
      values: { nova: "Básico (perma)", alpha: "Mejorado (perma)", inmortal: "Completo (perma)" },
    },
    {
      key: "homes",
      label: "Homes adicionales",
      values: { nova: "+2", alpha: "+5", inmortal: "+10" },
    },
    {
      key: "vaults",
      label: "Vaults / Backpacks",
      values: { nova: "2", alpha: "3", inmortal: "6" },
    },
    {
      key: "sell",
      label: "Bonificación en /sell",
      values: { nova: "+3%", alpha: "+8%", inmortal: "+15%" },
    },
  ],
};
