import { safeNum, log10p1, sqrtp } from "./leaderboards.utils";

/**
 * Límites reales del modo Gens:
 * - Máximo generadores en isla: 180
 * - Generador más caro: 1.000.000.000
 * => Valor máximo teórico de isla = 180 * 1e9 = 180.000.000.000
 */
export const GENS_LIMITS = {
  MAX_GENS: 180,
  MAX_GEN_PRICE: 1_000_000_000,
  MAX_ISLAND_VALUE: 180_000_000_000,
};

/**
 * Score “genpoints”
 * - Se mantiene log10p1 para que no explote con números grandes.
 * - Se capea con límites reales para que sea estable y comparable.
 */
export function computeGensScore(p) {
  const coinsTotal = log10p1(safeNum(p?.coins_ganadas_total));
  const moneyTotal = log10p1(safeNum(p?.dinero_ganado_total));

  // ✅ cap al máximo real de isla
  const gensValueRaw = safeNum(p?.gens_value_total);
  const gensValue = log10p1(Math.min(GENS_LIMITS.MAX_ISLAND_VALUE, Math.max(0, gensValueRaw)));

  // income/h: no tenemos “máximo real” fiable, pero lo capeo relativo al valor máximo (estable)
  const incomeRaw = safeNum(p?.gens_income_h);
  const incomeH = log10p1(Math.min(GENS_LIMITS.MAX_ISLAND_VALUE, Math.max(0, incomeRaw)));

  // highest tier (si esto representa “precio del mejor generador”): cap a 1e9
  const tierRaw = safeNum(p?.gens_highest_tier);
  const maxTier = log10p1(Math.min(GENS_LIMITS.MAX_GEN_PRICE, Math.max(0, tierRaw)));

  const hours = safeNum(p?.tiempo_jugado) / 3600;
  const time = sqrtp(Math.min(160, Math.max(0, hours)));

  const lvl = Math.max(0, safeNum(p?.nivel));

  // Pesos (puedes afinarlos, pero ya quedan “estables” con los caps)
  const w = { coins: 420, money: 260, value: 460, income: 360, tier: 220, time: 85, lvl: 120 };

  const score =
    coinsTotal * w.coins +
    moneyTotal * w.money +
    gensValue * w.value +
    incomeH * w.income +
    maxTier * w.tier +
    time * w.time +
    lvl * w.lvl;

  return Math.max(0, Math.round(score));
}

/**
 * Tiers reescalados al máximo real:
 * MAX_ISLAND_VALUE = 180.000.000.000 (180B)
 *
 * Nota: son umbrales logarítmicos “bonitos” para progresión.
 * Mantengo tus nombres, pero el último tier ahora es alcanzable (180B).
 */
export const GENS_VALOR_TIERS = [
  { min: 0, name: "Chatarra" },
  { min: 25_000_000, name: "Taller" },          // 25M
  { min: 100_000_000, name: "Fábrica" },        // 100M
  { min: 300_000_000, name: "Planta" },         // 300M
  { min: 1_000_000_000, name: "Industria" },    // 1B
  { min: 3_000_000_000, name: "Consorcio" },    // 3B
  { min: 10_000_000_000, name: "Magnate" },     // 10B
  { min: 25_000_000_000, name: "Imperio" },     // 25B
  { min: 60_000_000_000, name: "Dinastía" },    // 60B
  { min: 120_000_000_000, name: "Leyenda" },    // 120B
  { min: GENS_LIMITS.MAX_ISLAND_VALUE, name: "Mítico" }, // 180B (cap real)
];

export function getGensValorTierInfo(valor) {
  // ✅ cap al máximo real para que el % no pase de 100 y sea coherente
  const vRaw = safeNum(valor);
  const v = Math.max(0, Math.min(GENS_LIMITS.MAX_ISLAND_VALUE, Math.floor(vRaw)));

  let idx = 0;
  for (let i = 0; i < GENS_VALOR_TIERS.length; i++) {
    if (v >= GENS_VALOR_TIERS[i].min) idx = i;
    else break;
  }

  const cur = GENS_VALOR_TIERS[idx];
  const next = GENS_VALOR_TIERS[idx + 1] || null;

  const curMin = cur?.min ?? 0;
  const nextMin = next?.min ?? null;

  let pct = 100;
  let left = 0;

  if (nextMin != null && nextMin > curMin) {
    const span = nextMin - curMin;
    const pos = Math.min(span, Math.max(0, v - curMin));
    pct = Math.round((pos / span) * 100);
    left = Math.max(0, nextMin - v);
  }

  return {
    idx,
    name: cur?.name || "—",
    value: v,
    curMin,
    nextMin,
    nextName: next?.name || null,
    pct,
    left,
    max: GENS_LIMITS.MAX_ISLAND_VALUE,
  };
}
