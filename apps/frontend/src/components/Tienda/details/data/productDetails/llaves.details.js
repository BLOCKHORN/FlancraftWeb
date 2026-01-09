// apps/frontend/src/components/Tienda/details/data/productDetails/llaves.details.js
import ProductDetailsLlaves from "../../ProductDetailsLlaves.jsx";

/* =========================================================
   LLAVES (Survival Clásico)
   - Añade aliases “a lo bestia” para que siempre resuelva.
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
  // LLAVE VOTO (Survival)
  // ----------------------------
  "llaves survival/llave voto": buildLlaveVoto(),
  "llaves-survival/llave-voto": buildLlaveVoto(),
  "llaves_survival/llave_voto": buildLlaveVoto(),
  "llave voto": buildLlaveVoto(),
  "llave-voto": buildLlaveVoto(),
  "voto key": buildLlaveVoto(),
  "vote key": buildLlaveVoto(),
};

function buildLlaveRandom() {
  return {
    theme: "keys",
    kicker: "Llaves · Survival Clásico",
    name: "Llave Random",
    subline: "Apertura instantánea · 1 premio garantizado · Sorpresa pura",
    // ✅ compat: varias formas por si tu modal usa un nombre u otro
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

function buildLlaveVoto() {
  return {
    theme: "keys",
    kicker: "Llaves · Survival Clásico",
    name: "Llave Voto",
    subline: "Dinero + kit + materiales · Probabilidades claras · Puede soltar llaves extra",
    component: ProductDetailsLlaves,
    Component: ProductDetailsLlaves,
    render: ProductDetailsLlaves,
    props: { variant: "voto", server: "clasico" },
  };
}
