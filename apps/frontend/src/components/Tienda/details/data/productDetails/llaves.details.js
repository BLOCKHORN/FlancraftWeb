// apps/frontend/src/components/Tienda/details/data/productDetails/llaves.details.js
import ProductDetailsLlaves from "../../ProductDetailsLlaves.jsx";

/* =========================================================
   LLAVES (Survival Clásico)
   - Incluye aliases genéricos (llave voto, vote key, etc.)
   - ❌ NO incluye Spawners (eso va en OneBlock)
   ========================================================= */

export const LLAVES_DETAILS = {
  // ----------------------------
  // LLAVE RANDOM (Survival)
  // ----------------------------
  "llaves survival/llave random": buildLlaveRandom(),
  "llaves-survival/llave-random": buildLlaveRandom(),
  "llaves_survival/llave_random": buildLlaveRandom(),
  "llave random": buildLlaveRandom(),
  "llave-random": buildLlaveRandom(),
  "random key": buildLlaveRandom(),
  "key random": buildLlaveRandom(),

  // ----------------------------
  // LLAVE CABEZAS (Survival)
  // ----------------------------
  "llaves survival/llave cabezas": buildLlaveCabezas(),
  "llaves-survival/llave-cabezas": buildLlaveCabezas(),
  "llaves_survival/llave_cabezas": buildLlaveCabezas(),
  "llave cabezas": buildLlaveCabezas(),
  "llave-cabezas": buildLlaveCabezas(),
  "cabeza random": buildLlaveCabezas(),
  "head key": buildLlaveCabezas(),

  // ----------------------------
  // LLAVE VOTO (Survival) ✅ (GENÉRICA AQUÍ)
  // ----------------------------
  "llaves survival/llave voto": buildLlaveVotoClasico(),
  "llaves-survival/llave-voto": buildLlaveVotoClasico(),
  "llaves_survival/llave_voto": buildLlaveVotoClasico(),
  "llave voto": buildLlaveVotoClasico(),
  "llave-voto": buildLlaveVotoClasico(),
  "voto key": buildLlaveVotoClasico(),
  "vote key": buildLlaveVotoClasico(),
};

function buildLlaveRandom() {
  return {
    theme: "keys",
    kicker: "Llaves · Survival Clásico",
    name: "Llave Random",
    subline: "Apertura instantánea · 1 premio garantizado · Sorpresa pura",
    component: ProductDetailsLlaves,
    Component: ProductDetailsLlaves,
    render: ProductDetailsLlaves,
    props: { variant: "random", server: "clasico" },
  };
}

function buildLlaveCabezas() {
  return {
    theme: "keys",
    kicker: "Llaves · Survival Clásico",
    name: "Llave Cabezas",
    subline: "Apertura instantánea · 1 cabeza garantizada · Colección infinita",
    component: ProductDetailsLlaves,
    Component: ProductDetailsLlaves,
    render: ProductDetailsLlaves,
    props: { variant: "cabezas", server: "clasico" },
  };
}

function buildLlaveVotoClasico() {
  return {
    theme: "keys",
    kicker: "Llaves · Survival Clásico",
    name: "Llave Voto",
    subline: "Dinero + kit + materiales · Probabilidades por peso · Contenido Survival",
    component: ProductDetailsLlaves,
    Component: ProductDetailsLlaves,
    render: ProductDetailsLlaves,
    props: { variant: "voto", server: "clasico" },
  };
}
