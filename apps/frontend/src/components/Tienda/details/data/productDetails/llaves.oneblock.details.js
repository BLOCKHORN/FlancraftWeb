// apps/frontend/src/components/Tienda/details/data/productDetails/llaves.oneblock.details.js
import ProductDetailsLlaves from "../../ProductDetailsLlaves.jsx";

/* =========================================================
   LLAVES (OneBlock)
   - NO usar aliases genéricos tipo "llave voto"
   - Solo keys con prefijo oneblock para evitar mezcla
   ========================================================= */

export const LLAVES_ONEBLOCK_DETAILS = {
  // ----------------------------
  // LLAVE VOTO (OneBlock)
  // ----------------------------
  "llaves oneblock/llave voto": buildLlaveVotoOneblock(),
  "llaves-oneblock/llave-voto": buildLlaveVotoOneblock(),
  "llaves_oneblock/llave_voto": buildLlaveVotoOneblock(),

  // por si tu key llega como "oneblock/llave voto"
  "oneblock/llave voto": buildLlaveVotoOneblock(),
  "oneblock/llave-voto": buildLlaveVotoOneblock(),
  "oneblock/llave_voto": buildLlaveVotoOneblock(),

  // ----------------------------
  // LLAVE SPAWNERS (OneBlock)
  // ----------------------------
  "llaves oneblock/llave spawner": buildLlaveSpawnersOneblock(),
  "llaves oneblock/llave spawners": buildLlaveSpawnersOneblock(),
  "llaves-oneblock/llave-spawner": buildLlaveSpawnersOneblock(),
  "llaves-oneblock/llave-spawners": buildLlaveSpawnersOneblock(),
  "llaves_oneblock/llave_spawner": buildLlaveSpawnersOneblock(),
  "llaves_oneblock/llave_spawners": buildLlaveSpawnersOneblock(),

  // por si tu key llega como "oneblock/llave spawners"
  "oneblock/llave spawner": buildLlaveSpawnersOneblock(),
  "oneblock/llave spawners": buildLlaveSpawnersOneblock(),
  "oneblock/llave-spawner": buildLlaveSpawnersOneblock(),
  "oneblock/llave-spawners": buildLlaveSpawnersOneblock(),
  "oneblock/llave_spawner": buildLlaveSpawnersOneblock(),
  "oneblock/llave_spawners": buildLlaveSpawnersOneblock(),
};

function buildLlaveVotoOneblock() {
  return {
    theme: "keys",
    kicker: "Llaves · OneBlock",
    name: "Llave Voto",
    subline: "49 recompensas equiprobables (≈2,04% cada una) · Contenido OneBlock",
    component: ProductDetailsLlaves,
    Component: ProductDetailsLlaves,
    render: ProductDetailsLlaves,
    props: { variant: "voto", server: "oneblock" },
  };
}

function buildLlaveSpawnersOneblock() {
  return {
    theme: "keys",
    kicker: "Llaves · OneBlock",
    name: "Llave Spawners",
    subline: "1 spawner garantizado · Rareza real por Weight (peso) · 46 recompensas",
    component: ProductDetailsLlaves,
    Component: ProductDetailsLlaves,
    render: ProductDetailsLlaves,
    props: { variant: "spawner", server: "oneblock" },
  };
}
