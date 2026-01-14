// apps/frontend/src/components/Tienda/details/ProductDetailsLlaves.jsx
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import "../../../styles/components/Tienda/productDetailsLlaves.scss";

const ASSET_BASE = "/tienda/productos/llaves";

const RARITY = {
  common: { label: "Común" },
  rare: { label: "Raro" },
  epic: { label: "Épico" },
  legend: { label: "Legendario" },
};

function normServer(v) {
  return String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

function displayServerLabel(server) {
  const s = normServer(server);
  if (s.includes("oneblock")) return "OneBlock";
  if (s.includes("gens")) return "Gens";
  if (s.includes("global")) return "Global";
  return "Survival Clásico";
}

function normVariant(v) {
  return String(v ?? "").trim().toLowerCase();
}

function inferServerFromPkg(pkg) {
  const hay = [
    pkg?.server,
    pkg?.category_slug,
    pkg?.category_name,
    pkg?.name,
    pkg?.slug,
    pkg?.short_description,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (hay.includes("oneblock") || hay.includes("one block") || hay.includes("one_block")) return "oneblock";
  if (hay.includes("gens")) return "gens";
  if (hay.includes("global")) return "global";
  if (hay.includes("survival")) return "survival";
  return "";
}

function inferServerFromLocation() {
  try {
    const p = String(window?.location?.pathname || "").toLowerCase();
    if (p.includes("/oneblock")) return "oneblock";
    if (p.includes("/gens")) return "gens";
    if (p.includes("/survival")) return "survival";
    return "";
  } catch {
    return "";
  }
}

/* Helpers */

function makeItem({ id, name, meta, rarity = "common", weight = 1, icon = null, group = "", amount = null }) {
  return { id, name, meta, rarity, weight, icon, group, amount };
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function easeOutQuint(t) {
  return 1 - Math.pow(1 - t, 5);
}

function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    const onChange = () => setReduced(!!mq.matches);
    onChange();
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);
  return reduced;
}

/* Sound */

function useSpinSounds() {
  const ctxRef = useRef(null);
  const masterRef = useRef(null);
  const lastTickAtRef = useRef(0);

  const ensure = useCallback(() => {
    try {
      if (!ctxRef.current) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return false;
        const ctx = new AudioCtx();
        const master = ctx.createGain();
        master.gain.value = 0.28;
        master.connect(ctx.destination);
        ctxRef.current = ctx;
        masterRef.current = master;
      }
      if (ctxRef.current?.state === "suspended") ctxRef.current.resume?.();
      return true;
    } catch {
      return false;
    }
  }, []);

  const tick = useCallback(
    (intensity = 1) => {
      const ok = ensure();
      if (!ok) return;

      const now = performance.now();
      const minGap = 18;
      if (now - lastTickAtRef.current < minGap) return;
      lastTickAtRef.current = now;

      const ctx = ctxRef.current;
      const master = masterRef.current;
      const t0 = ctx.currentTime;

      const dur = 0.028;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.setValueAtTime(1500, t0);

      osc.type = "square";
      const base = 760 + Math.random() * 260;
      osc.frequency.setValueAtTime(base, t0);
      osc.frequency.exponentialRampToValueAtTime(base * 0.70, t0 + dur);

      const v = 0.10 * Math.min(1, Math.max(0.20, intensity));
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(v, t0 + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

      osc.connect(hp);
      hp.connect(gain);
      gain.connect(master);

      osc.start(t0);
      osc.stop(t0 + dur + 0.01);
    },
    [ensure]
  );

  const success = useCallback(
    (rarity = "common") => {
      const ok = ensure();
      if (!ok) return;

      const ctx = ctxRef.current;
      const master = masterRef.current;
      const t0 = ctx.currentTime;

      const dry = ctx.createGain();
      const wet = ctx.createGain();
      const delay = ctx.createDelay(1.2);
      const fb = ctx.createGain();
      const lp = ctx.createBiquadFilter();

      delay.delayTime.setValueAtTime(0.11, t0);
      fb.gain.setValueAtTime(0.34, t0);
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(3600, t0);

      dry.gain.setValueAtTime(0.86, t0);
      wet.gain.setValueAtTime(0.52, t0);

      dry.connect(master);
      wet.connect(master);

      delay.connect(lp);
      lp.connect(fb);
      fb.connect(delay);
      delay.connect(wet);

      const play = (freq, type, start, len, peak) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();

        o.type = type;
        o.frequency.setValueAtTime(freq, start);

        g.gain.setValueAtTime(0.0001, start);
        g.gain.exponentialRampToValueAtTime(peak, start + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, start + len);

        o.connect(g);
        g.connect(dry);
        g.connect(delay);

        o.start(start);
        o.stop(start + len + 0.02);
      };

      const isBig = rarity === "legend";
      const isMid = rarity === "epic";

      play(isBig ? 150 : isMid ? 175 : 205, "sine", t0, 0.40, isBig ? 0.40 : 0.32);
      play(isBig ? 300 : isMid ? 360 : 420, "triangle", t0, 0.32, isBig ? 0.20 : 0.16);

      const seq = isBig ? [740, 880, 1100, 1320, 1760] : isMid ? [660, 740, 880, 1100] : [620, 740, 880];
      seq.forEach((f, i) => {
        const st = t0 + 0.12 + i * 0.085;
        play(f, "sine", st, 0.26, isBig ? 0.17 : isMid ? 0.14 : 0.11);
      });
    },
    [ensure]
  );

  return { tick, success, ensure };
}

/* Iconos */

const ICONS = {
  spawner_generic: `${ASSET_BASE}/spawner.webp`,
  book: `${ASSET_BASE}/libro.webp`,
  enchanted_book: `${ASSET_BASE}/libroencantado.webp`,
  potion: `${ASSET_BASE}/pocion.webp`,
  bucket: `${ASSET_BASE}/cubo.webp`,
  money: `${ASSET_BASE}/dinero.webp`,

  money_75: `${ASSET_BASE}/dinero.webp`,
  money_150: `${ASSET_BASE}/dinero.webp`,
  money_300: `${ASSET_BASE}/dinero.webp`,
  money_500: `${ASSET_BASE}/dinero.webp`,
  money_1000: `${ASSET_BASE}/dinero.webp`,

  iron_32: `${ASSET_BASE}/hierro.webp`,
  diamond_5: `${ASSET_BASE}/diamantes.webp`,
  oak_64: `${ASSET_BASE}/maderaroble.webp`,
  book_unb3: `${ASSET_BASE}/libroencantado.webp`,
  scrap_4: `${ASSET_BASE}/netheritescrap.webp`,
  gapples_3: `${ASSET_BASE}/goldenapple.webp`,
  rockets_32: `${ASSET_BASE}/cohetes.webp`,
  totem_1: `${ASSET_BASE}/totem.webp`,
  dragon_head: `${ASSET_BASE}/cabezadragon.webp`,
  key2: `${ASSET_BASE}/llavevoto.webp`,

  voto_sword: `${ASSET_BASE}/espadavoto.webp`,
  voto_pick: `${ASSET_BASE}/picovoto.webp`,
  voto_axe: `${ASSET_BASE}/hachavoto.webp`,
  voto_shovel: `${ASSET_BASE}/palavoto.webp`,
  voto_hoe: `${ASSET_BASE}/azadavoto.webp`,
  voto_boots: `${ASSET_BASE}/botasvoto.webp`,
  voto_legs: `${ASSET_BASE}/pantvoto.webp`,
  voto_chest: `${ASSET_BASE}/pecheravoto.webp`,
  voto_helm: `${ASSET_BASE}/cascovoto.webp`,

  axolotl_bucket: `${ASSET_BASE}/cuboajolote.webp`,
  tadpole_bucket: `${ASSET_BASE}/cuborenacuajo.webp`,

  bread_64: `${ASSET_BASE}/pan.webp`,
  cooked_beef_16: `${ASSET_BASE}/ternera.webp`,
  cake_1: `${ASSET_BASE}/tarta.webp`,
  golden_apple_1: `${ASSET_BASE}/goldenapple.webp`,

  pot_strength_long: `${ASSET_BASE}/pocionfuerza.webp`,
  pot_fire_res_long: `${ASSET_BASE}/pocionfuego.webp`,
  pot_invis_long: `${ASSET_BASE}/pocioninvis.webp`,
  pot_speed_long: `${ASSET_BASE}/pocionvelocidad.webp`,

  books_8: `${ASSET_BASE}/libro.webp`,
  ench_silk_touch_1: `${ASSET_BASE}/libroencantado.webp`,
  ench_infinity_1: `${ASSET_BASE}/libroencantado.webp`,
  ench_swift_sneak_3: `${ASSET_BASE}/libroencantado.webp`,
  ench_soul_speed_3: `${ASSET_BASE}/libroencantado.webp`,

  oak_log_64: `${ASSET_BASE}/maderaroble.webp`,
  grass_block_64: `${ASSET_BASE}/hierba.webp`,
  redstone_64: `${ASSET_BASE}/redstone.webp`,
  lapis_64: `${ASSET_BASE}/lapis.webp`,
  copper_ingot_64: `${ASSET_BASE}/cobre.webp`,
  leather_48: `${ASSET_BASE}/cuero.webp`,
  iron_ingot_32: `${ASSET_BASE}/hierro.webp`,
  gold_ingot_24: `${ASSET_BASE}/oro.webp`,
  emerald_16: `${ASSET_BASE}/esmeraldas.webp`,
  diamond_8: `${ASSET_BASE}/diamantes.webp`,

  ender_pearl_1: `${ASSET_BASE}/enderpearl.webp`,
  blaze_rod_3: `${ASSET_BASE}/blazerod.webp`,
  netherite_ingot_1: `${ASSET_BASE}/netheriteingot.webp`,
  netherite_upgrade_template_1: `${ASSET_BASE}/templateupgrade.webp`,
  trim_snout_1: `${ASSET_BASE}/templatehocico.webp`,
  diamond_horse_armor_1: `${ASSET_BASE}/armaduracaballo.webp`,
  saddle_1: `${ASSET_BASE}/silla.webp`,
  name_tag_1: `${ASSET_BASE}/nametag.webp`,
  music_disc_far_1: `${ASSET_BASE}/disc_far.webp`,
  turtle_helmet_1: `${ASSET_BASE}/casco_tortuga.webp`,
  wolf_armor_1: `${ASSET_BASE}/armadura_lobo.webp`,

  lime_bundle_1: `${ASSET_BASE}/lime_bundle.webp`,
  lime_harness_1: `${ASSET_BASE}/lime_harness.webp`,

  goat_horn_ponder_1: `${ASSET_BASE}/cuerno.webp`,
  goat_horn_sing_1: `${ASSET_BASE}/cuerno.webp`,
};

function getMoneyBadgeFromId(id) {
  if (!id?.startsWith?.("money_")) return null;
  const n = String(id).split("_")[1];
  if (!n) return null;
  return `${n}$`;
}

function withIcons(items) {
  return items.map((it) => {
    const icon = ICONS[it.id] || it.icon || null;
    const amount = it.amount ?? getMoneyBadgeFromId(it.id);
    return { ...it, icon, amount };
  });
}

/* Datasets */

function datasetRandom() {
  return {
    hero: { title: "Llave Random", tagline: "Sorpresa inmediata", line: "Puede tocar de todo" },
    reel: [
      makeItem({ id: "elytra", name: "Élitros", meta: "Movilidad total", rarity: "legend", weight: 1, group: "Sorpresa" }),
      makeItem({ id: "netherite_sword", name: "Espada Netherite", meta: "Daño premium", rarity: "epic", weight: 2, group: "Combate" }),
      makeItem({ id: "shulker_box", name: "Shulker", meta: "Inventario extra", rarity: "epic", weight: 3, group: "Utilidad" }),
      makeItem({ id: "diamond_pickaxe", name: "Pico Diamante", meta: "Progreso rápido", rarity: "rare", weight: 5, group: "Progreso" }),
      makeItem({ id: "totem", name: "Tótem", meta: "Segunda oportunidad", rarity: "legend", weight: 1, group: "Supervivencia" }),
      makeItem({ id: "golden_apple", name: "Manzana Dorada", meta: "Clutch", rarity: "rare", weight: 6, group: "Consumible" }),
      makeItem({ id: "xp_bottle", name: "Botes de XP", meta: "Encantos y mejoras", rarity: "common", weight: 10, group: "Progreso" }),
      makeItem({ id: "obsidian", name: "Obsidiana", meta: "Base sólida", rarity: "common", weight: 10, group: "Construcción" }),
      makeItem({ id: "ender_pearl", name: "Perlas", meta: "Escape / rotación", rarity: "common", weight: 10, group: "Movilidad" }),
      makeItem({ id: "enchanted_book", name: "Libro Encantado", meta: "Mejora sorpresa", rarity: "rare", weight: 4, group: "Encantos" }),
    ],
    best: ["elytra", "totem", "netherite_sword", "shulker_box"],
  };
}

function datasetCabezas() {
  return {
    hero: { title: "Llave Cabezas", tagline: "1 cabeza garantizada", line: "Colección enorme para decoración" },
    reel: [
      makeItem({ id: "head_legend", name: "Cabeza Legendaria", meta: "Pieza de museo", rarity: "legend", weight: 1, group: "Colección" }),
      makeItem({ id: "head_epic", name: "Cabeza Épica", meta: "Muy vistosa", rarity: "epic", weight: 4, group: "Colección" }),
      makeItem({ id: "head_rare", name: "Cabeza Rara", meta: "Detalle especial", rarity: "rare", weight: 10, group: "Build" }),
      makeItem({ id: "head_meme", name: "Cabeza Meme", meta: "Para trolear fino", rarity: "common", weight: 18, group: "Fun" }),
      makeItem({ id: "head_pixel", name: "Cabeza Pixel Art", meta: "Perfecta para builds", rarity: "rare", weight: 10, group: "Build" }),
      makeItem({ id: "head_common", name: "Cabeza Misteriosa", meta: "Decoración", rarity: "common", weight: 22, group: "Colección" }),
    ],
    best: ["head_legend", "head_epic", "head_pixel", "head_rare"],
  };
}

function datasetVotoClasico() {
  const total = 105;

  const raw = [
    makeItem({ id: "money_75", name: "+75$", meta: "Economía", rarity: "common", weight: 18.0, group: "Dinero" }),
    makeItem({ id: "money_150", name: "+150$", meta: "Economía", rarity: "common", weight: 12.0, group: "Dinero" }),
    makeItem({ id: "money_300", name: "+300$", meta: "Economía", rarity: "rare", weight: 8.0, group: "Dinero" }),
    makeItem({ id: "money_500", name: "+500$", meta: "Economía", rarity: "rare", weight: 6.0, group: "Dinero" }),
    makeItem({ id: "money_1000", name: "+1000$", meta: "Economía", rarity: "epic", weight: 3.0, group: "Dinero" }),

    makeItem({ id: "voto_sword", name: "Espada Voto", meta: "Buen comienzo", rarity: "rare", weight: 10.0, group: "Kit" }),
    makeItem({ id: "voto_pick", name: "Pico Voto", meta: "Progreso rápido", rarity: "epic", weight: 2.0, group: "Kit" }),
    makeItem({ id: "voto_helm", name: "Casco Voto", meta: "Defensa", rarity: "rare", weight: 3.0, group: "Kit" }),
    makeItem({ id: "voto_chest", name: "Pechera Voto", meta: "Defensa", rarity: "epic", weight: 3.5, group: "Kit" }),
    makeItem({ id: "voto_legs", name: "Pantalones Voto", meta: "Defensa", rarity: "rare", weight: 2.5, group: "Kit" }),
    makeItem({ id: "voto_boots", name: "Botas Voto", meta: "Defensa", rarity: "rare", weight: 3.0, group: "Kit" }),

    makeItem({ id: "iron_32", name: "32× Hierro", meta: "Materiales", rarity: "common", weight: 8.5, group: "Materiales" }),
    makeItem({ id: "diamond_5", name: "5× Diamantes", meta: "Materiales", rarity: "rare", weight: 6.0, group: "Materiales" }),
    makeItem({ id: "oak_64", name: "64× Roble", meta: "Materiales", rarity: "common", weight: 5.0, group: "Materiales" }),
    makeItem({ id: "book_unb3", name: "Libro Encantado", meta: "Mejora", rarity: "epic", weight: 1.5, group: "Materiales" }),
    makeItem({ id: "scrap_4", name: "4× Netherite Scrap", meta: "Materiales", rarity: "epic", weight: 3.0, group: "Materiales" }),
    makeItem({ id: "gapples_3", name: "3× Golden Apple", meta: "Consumible", rarity: "rare", weight: 3.5, group: "Materiales" }),
    makeItem({ id: "rockets_32", name: "32× Cohetes", meta: "Movilidad", rarity: "rare", weight: 3.5, group: "Materiales" }),
    makeItem({ id: "totem_1", name: "Tótem", meta: "Supervivencia", rarity: "legend", weight: 1.5, group: "Materiales" }),
    makeItem({ id: "dragon_head", name: "Cabeza Dragón", meta: "Ultra raro", rarity: "legend", weight: 0.5, group: "Materiales" }),
    makeItem({ id: "key2", name: "2× Llave Voto", meta: "Extra dentro", rarity: "legend", weight: 1.0, group: "Extra" }),
  ];

  const items = withIcons(raw);
  const pct = (w) => ((w / total) * 100).toFixed(2).replace(".", ",");

  return {
    hero: { title: "Llave Voto", tagline: "Progreso real (Survival)", line: "Dinero, kit y materiales" },
    reel: items.map((it) => ({ ...it, meta: `${it.meta} · ${pct(it.weight)}%` })),
    best: ["dragon_head", "key2", "totem_1", "money_1000"],
  };
}

function datasetVotoOneblock() {
  const W = 10.0;

  const raw = [
    makeItem({ id: "voto_sword", name: "Espada Voto", meta: "Kit caja voto OneBlock", rarity: "common", weight: W, group: "Kit Voto" }),
    makeItem({ id: "voto_pick", name: "Pico Voto", meta: "Kit caja voto OneBlock", rarity: "common", weight: W, group: "Kit Voto" }),
    makeItem({ id: "voto_axe", name: "Hacha Voto", meta: "Kit caja voto OneBlock", rarity: "common", weight: W, group: "Kit Voto" }),
    makeItem({ id: "voto_shovel", name: "Pala Voto", meta: "Kit caja voto OneBlock", rarity: "common", weight: W, group: "Kit Voto" }),
    makeItem({ id: "voto_hoe", name: "Azada Voto", meta: "Kit caja voto OneBlock", rarity: "common", weight: W, group: "Kit Voto" }),
    makeItem({ id: "voto_boots", name: "Botas Voto", meta: "Kit caja voto OneBlock", rarity: "common", weight: W, group: "Kit Voto" }),
    makeItem({ id: "voto_legs", name: "Pantalones Voto", meta: "Kit caja voto OneBlock", rarity: "common", weight: W, group: "Kit Voto" }),
    makeItem({ id: "voto_chest", name: "Peto Voto", meta: "Kit caja voto OneBlock", rarity: "common", weight: W, group: "Kit Voto" }),
    makeItem({ id: "voto_helm", name: "Casco Voto", meta: "Kit caja voto OneBlock", rarity: "common", weight: W, group: "Kit Voto" }),

    makeItem({ id: "axolotl_bucket", name: "Cubo con Ajolote", meta: "Cubo con mob", rarity: "common", weight: W, group: "Cubos", amount: "x1" }),
    makeItem({ id: "tadpole_bucket", name: "Cubo con Renacuajo", meta: "Cubo con mob", rarity: "common", weight: W, group: "Cubos", amount: "x1" }),

    makeItem({ id: "bread_64", name: "Pan", meta: "Comida", rarity: "common", weight: W, group: "Comida", amount: "x64" }),
    makeItem({ id: "cooked_beef_16", name: "Ternera cocinada", meta: "Comida", rarity: "common", weight: W, group: "Comida", amount: "x16" }),
    makeItem({ id: "cake_1", name: "Tarta", meta: "Comida", rarity: "common", weight: W, group: "Comida", amount: "x1" }),
    makeItem({ id: "golden_apple_1", name: "Manzana dorada", meta: "Comida", rarity: "common", weight: W, group: "Comida", amount: "x1" }),

    makeItem({ id: "pot_strength_long", name: "Poción de Fuerza (long)", meta: "Poción extendida", rarity: "common", weight: W, group: "Pociones", amount: "x1" }),
    makeItem({ id: "pot_fire_res_long", name: "Resistencia al Fuego (long)", meta: "Poción extendida", rarity: "common", weight: W, group: "Pociones", amount: "x1" }),
    makeItem({ id: "pot_invis_long", name: "Invisibilidad (long)", meta: "Poción extendida", rarity: "common", weight: W, group: "Pociones", amount: "x1" }),
    makeItem({ id: "pot_speed_long", name: "Velocidad (long)", meta: "Poción extendida", rarity: "common", weight: W, group: "Pociones", amount: "x1" }),

    makeItem({ id: "books_8", name: "Libro", meta: "Libros", rarity: "common", weight: W, group: "Libros", amount: "x8" }),
    makeItem({ id: "ench_silk_touch_1", name: "Toque de Seda I", meta: "Libro encantado", rarity: "common", weight: W, group: "Encantos", amount: "x1" }),
    makeItem({ id: "ench_infinity_1", name: "Infinidad I", meta: "Libro encantado", rarity: "common", weight: W, group: "Encantos", amount: "x1" }),
    makeItem({ id: "ench_swift_sneak_3", name: "Swift Sneak III", meta: "Libro encantado", rarity: "common", weight: W, group: "Encantos", amount: "x1" }),
    makeItem({ id: "ench_soul_speed_3", name: "Soul Speed III", meta: "Libro encantado", rarity: "common", weight: W, group: "Encantos", amount: "x1" }),

    makeItem({ id: "oak_log_64", name: "Tronco de roble", meta: "Materiales", rarity: "common", weight: W, group: "Materiales", amount: "x64" }),
    makeItem({ id: "grass_block_64", name: "Bloque de hierba", meta: "Materiales", rarity: "common", weight: W, group: "Materiales", amount: "x64" }),
    makeItem({ id: "redstone_64", name: "Redstone", meta: "Materiales", rarity: "common", weight: W, group: "Materiales", amount: "x64" }),
    makeItem({ id: "lapis_64", name: "Lapislázuli", meta: "Materiales", rarity: "common", weight: W, group: "Materiales", amount: "x64" }),
    makeItem({ id: "copper_ingot_64", name: "Lingote de cobre", meta: "Materiales", rarity: "common", weight: W, group: "Materiales", amount: "x64" }),
    makeItem({ id: "leather_48", name: "Cuero", meta: "Materiales", rarity: "common", weight: W, group: "Materiales", amount: "x48" }),
    makeItem({ id: "iron_ingot_32", name: "Lingote de hierro", meta: "Materiales", rarity: "common", weight: W, group: "Materiales", amount: "x32" }),
    makeItem({ id: "gold_ingot_24", name: "Lingote de oro", meta: "Materiales", rarity: "common", weight: W, group: "Materiales", amount: "x24" }),
    makeItem({ id: "emerald_16", name: "Esmeraldas", meta: "Materiales", rarity: "common", weight: W, group: "Materiales", amount: "x16" }),
    makeItem({ id: "diamond_8", name: "Diamantes", meta: "Materiales", rarity: "common", weight: W, group: "Materiales", amount: "x8" }),

    makeItem({ id: "ender_pearl_1", name: "Perla de Ender", meta: "Utilidad", rarity: "common", weight: W, group: "Nether/End", amount: "x1" }),
    makeItem({ id: "blaze_rod_3", name: "Vara de Blaze", meta: "Nether", rarity: "common", weight: W, group: "Nether/End", amount: "x3" }),
    makeItem({ id: "netherite_ingot_1", name: "Lingote de netherita", meta: "Progreso", rarity: "common", weight: W, group: "Nether/End", amount: "x1" }),
    makeItem({ id: "netherite_upgrade_template_1", name: "Plantilla mejora netherita", meta: "Plantilla", rarity: "common", weight: W, group: "Nether/End", amount: "x1" }),
    makeItem({ id: "trim_snout_1", name: "Ribete Snout (Hocico)", meta: "Plantilla herrería", rarity: "common", weight: W, group: "Nether/End", amount: "x1" }),
    makeItem({ id: "diamond_horse_armor_1", name: "Armadura caballo diamante", meta: "Coleccionable", rarity: "common", weight: W, group: "Utilidad", amount: "x1" }),
    makeItem({ id: "saddle_1", name: "Silla de montar", meta: "Utilidad", rarity: "common", weight: W, group: "Utilidad", amount: "x1" }),
    makeItem({ id: "name_tag_1", name: "Name Tag", meta: "Utilidad", rarity: "common", weight: W, group: "Utilidad", amount: "x1" }),
    makeItem({ id: "music_disc_far_1", name: "Disco “Far”", meta: "Coleccionable", rarity: "common", weight: W, group: "Coleccionable", amount: "x1" }),
    makeItem({ id: "turtle_helmet_1", name: "Casco de tortuga", meta: "Utilidad", rarity: "common", weight: W, group: "Utilidad", amount: "x1" }),
    makeItem({ id: "wolf_armor_1", name: "Armadura de lobo", meta: "Utilidad", rarity: "common", weight: W, group: "Utilidad", amount: "x1" }),

    makeItem({ id: "lime_bundle_1", name: "lime_bundle", meta: "ID especial (YAML)", rarity: "common", weight: W, group: "Raro/Custom", amount: "x1" }),
    makeItem({ id: "lime_harness_1", name: "lime_harness", meta: "ID especial (YAML)", rarity: "common", weight: W, group: "Raro/Custom", amount: "x1" }),

    makeItem({ id: "goat_horn_ponder_1", name: "Cuerno de cabra (ponder)", meta: "Instrumento", rarity: "common", weight: W, group: "Cuernos", amount: "x1" }),
    makeItem({ id: "goat_horn_sing_1", name: "Cuerno de cabra (sing)", meta: "Instrumento", rarity: "common", weight: W, group: "Cuernos", amount: "x1" }),
  ];

  return {
    hero: { title: "Llave Voto", tagline: "49 recompensas (OneBlock)", line: "Todas equiprobables (≈ 2,04% cada una)" },
    reel: withIcons(raw),
    best: ["netherite_ingot_1", "netherite_upgrade_template_1", "ench_swift_sneak_3", "ench_soul_speed_3", "diamond_8", "emerald_16"],
  };
}

function datasetSpawners() {
  const COMMON_W = 10.0;
  const RARE_W = 2.33;
  const LEG_W = 0.5;

  const common = [
    ["axolotl", "Ajolote"],
    ["breeze", "Brisa"],
    ["camel", "Camello"],
    ["cave_spider", "Araña de cueva"],
    ["chicken", "Gallina"],
    ["cod", "Bacalao"],
    ["donkey", "Burro"],
    ["drowned", "Ahogado"],
    ["fox", "Zorro"],
    ["frog", "Rana"],
    ["glow_squid", "Calamar brillante"],
    ["goat", "Cabra"],
    ["hoglin", "Hoglin"],
    ["horse", "Caballo"],
    ["husk", "Zombi momificado"],
    ["llama", "Llama"],
    ["magma_cube", "Cubo de magma"],
    ["mooshroom", "Vaca seta"],
    ["mule", "Mula"],
    ["ocelot", "Ocelote"],
    ["panda", "Panda"],
    ["parrot", "Loro"],
    ["pig", "Cerdo"],
    ["piglin_brute", "Piglin bruto"],
    ["piglin", "Piglin"],
    ["polar_bear", "Oso polar"],
    ["rabbit", "Conejo"],
    ["salmon", "Salmón"],
    ["sheep", "Oveja"],
    ["skeleton_horse", "Caballo esqueleto"],
    ["skeleton", "Esqueleto"],
    ["slime", "Slime / Baba"],
    ["spider", "Araña"],
    ["tropical_fish", "Pez tropical"],
    ["turtle", "Tortuga"],
    ["zoglin", "Zoglin"],
    ["zombie_horse", "Caballo zombi"],
    ["zombie", "Zombi"],
  ];

  const rare = [
    ["blaze", "Blaze"],
    ["witch", "Bruja"],
  ];

  const legend = [
    ["creeper", "Creeper"],
    ["enderman", "Enderman"],
    ["iron_golem", "Gólem de hierro"],
    ["pillager", "Saqueador"],
    ["villager", "Aldeano"],
    ["vindicator", "Vindicador"],
  ];

  const reelRaw = [
    ...common.map(([k, label]) =>
      makeItem({
        id: `sp_${k}`,
        name: `Spawner ${label}`,
        meta: "Spawner de Entidades",
        rarity: "common",
        weight: COMMON_W,
        icon: ICONS.spawner_generic,
        group: "Spawner",
      })
    ),
    ...rare.map(([k, label]) =>
      makeItem({
        id: `sp_${k}`,
        name: `Spawner ${label}`,
        meta: "Spawner de Entidades",
        rarity: "rare",
        weight: RARE_W,
        icon: ICONS.spawner_generic,
        group: "Spawner",
      })
    ),
    ...legend.map(([k, label]) =>
      makeItem({
        id: `sp_${k}`,
        name: `Spawner ${label}`,
        meta: "Spawner de Entidades",
        rarity: "legend",
        weight: LEG_W,
        icon: ICONS.spawner_generic,
        group: "Spawner",
      })
    ),
  ];

  return {
    hero: { title: "Llave Spawners", tagline: "1 spawner garantizado", line: "La rareza real la marca el Weight (peso)" },
    reel: withIcons(reelRaw),
    best: ["sp_villager", "sp_iron_golem", "sp_enderman", "sp_creeper", "sp_vindicator", "sp_pillager"],
  };
}

function getDataset(variant, server) {
  const v = normVariant(variant);
  const sN = normServer(server);

  if (v === "cabezas") return datasetCabezas();

  if (v === "voto") {
    if (sN.includes("oneblock")) return datasetVotoOneblock();
    return datasetVotoClasico();
  }

  if (v === "spawner" || v === "spawners") return datasetSpawners();

  return datasetRandom();
}

function weightedPick(items) {
  const list = items.filter((x) => (x?.weight ?? 0) > 0);
  const total = list.reduce((a, b) => a + (b.weight || 0), 0);
  if (total <= 0) return list[0] || null;

  let r = Math.random() * total;
  for (const it of list) {
    r -= it.weight;
    if (r <= 0) return it;
  }
  return list[list.length - 1] || null;
}

function IconFallback({ text = "?" }) {
  const letter = String(text || "?").trim().slice(0, 1).toUpperCase();
  return (
    <div className="pdkeys__icoFallback" aria-hidden="true">
      <span>{letter}</span>
    </div>
  );
}

function calcPercents(items) {
  const list = items.filter((x) => (x?.weight ?? 0) > 0);
  const total = list.reduce((a, b) => a + (b.weight || 0), 0);
  const map = new Map();
  if (total <= 0) return map;
  for (const it of list) map.set(it.id, (it.weight / total) * 100);
  return map;
}

export default function ProductDetailsLlaves({
  data: registryData = null,
  variant = "random",
  server = "clasico",
  pkg = null,
  onAddToCart = null,
}) {
  const reducedMotion = usePrefersReducedMotion();
  const { tick, success, ensure } = useSpinSounds();

  const rootRef = useRef(null);
  const viewportRef = useRef(null);
  const reelRef = useRef(null);
  const artImgRef = useRef(null);

  const rafRef = useRef(0);
  const spinSeqRef = useRef(0);
  const pendingRef = useRef(null);
  const startedRef = useRef(false);

  const animRef = useRef({
    running: false,
    startAt: 0,
    duration: 0,
    fromX: 0,
    midX: 0,
    toX: 0,
    cut: 0.78,
    lastIdx: -1,
    lastX: 0,
  });

  const payloadPkg = registryData?.__pkg || pkg || null;

  const resolvedVariant = useMemo(() => {
    const v = registryData?.props?.variant ?? variant;
    return normVariant(v);
  }, [registryData, variant]);

  const resolvedServer = useMemo(() => {
    const direct = registryData?.props?.server ?? registryData?.server ?? server;
    const fromPkg = inferServerFromPkg(payloadPkg);
    const fromPath = inferServerFromLocation();

    const directN = normServer(direct);
    const pkgN = normServer(fromPkg);
    const pathN = normServer(fromPath);

    // Si estás en ruta OneBlock y el registry viene mal (survival), forzamos OneBlock en la Llave Voto
    if (resolvedVariant === "voto" && pathN.includes("oneblock") && !directN.includes("oneblock")) {
      return "oneblock";
    }

    return directN || pkgN || pathN || "clasico";
  }, [registryData, payloadPkg, server, resolvedVariant]);

  const dataset = useMemo(() => getDataset(resolvedVariant, resolvedServer), [resolvedVariant, resolvedServer]);

  const productImg =
    registryData?.__pkg?.image_url ||
    registryData?.__pkg?.image ||
    payloadPkg?.image_url ||
    payloadPkg?.image ||
    payloadPkg?.imageUrl ||
    null;

  const serverText = displayServerLabel(resolvedServer);

  const accentClass =
    resolvedVariant === "voto"
      ? "is-voto"
      : resolvedVariant === "cabezas"
      ? "is-cabezas"
      : resolvedVariant === "spawner" || resolvedVariant === "spawners"
      ? "is-spawner"
      : "is-random";

  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [strip, setStrip] = useState(() => dataset.reel);
  const [openDropsModal, setOpenDropsModal] = useState(false);
  const [openWinModal, setOpenWinModal] = useState(false);

  const pctMap = useMemo(() => calcPercents(dataset.reel), [dataset]);

  const bestDrops = useMemo(() => {
    const ids = new Set(dataset.best || []);
    const byId = new Map(dataset.reel.map((x) => [x.id, x]));
    const arr = [];
    for (const id of ids) {
      const it = byId.get(id);
      if (it) arr.push(it);
    }
    return arr.slice(0, 8);
  }, [dataset]);

  const rarityLabel = (r) => RARITY[r]?.label || "Común";

  const setReelX = useCallback((x) => {
    const el = reelRef.current;
    if (!el) return;
    el.style.transform = `translate3d(${x}px,0,0)`;
  }, []);

  const setSpinP = useCallback((p) => {
    const el = rootRef.current;
    if (!el) return;
    el.style.setProperty("--spinP", String(clamp(p, 0, 1)));
  }, []);

  const stopAnim = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    animRef.current.running = false;
    startedRef.current = false;
    setSpinP(0);
  }, [setSpinP]);

  const measureMetrics = useCallback(() => {
    const reel = reelRef.current;
    const vp = viewportRef.current;
    if (!reel || !vp) return null;
    const first = reel.children?.[0];
    if (!first) return null;

    const itemW = first.getBoundingClientRect().width || 150;
    const gapStr = getComputedStyle(reel).gap || "0px";
    const gap = Number(String(gapStr).replace("px", "")) || 0;

    const stepW = itemW + gap;
    const vpW = vp.clientWidth || 0;

    const totalWidth = strip.length * stepW - gap;
    const maxRight = vpW - totalWidth;
    const maxLeft = 0;

    return { itemW, gap, stepW, vpW, maxRight, maxLeft };
  }, [strip.length]);

  const runAnim = useCallback(
    ({ fromX, toX, duration, picked, seq, midX, cut = 0.78 }) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      animRef.current.running = true;
      animRef.current.startAt = performance.now();
      animRef.current.duration = duration;
      animRef.current.fromX = fromX;
      animRef.current.midX = midX;
      animRef.current.toX = toX;
      animRef.current.cut = cut;
      animRef.current.lastIdx = -1;
      animRef.current.lastX = fromX;

      ensure();

      const step = () => {
        if (seq !== spinSeqRef.current) return;
        if (!animRef.current.running) return;

        const now = performance.now();
        const tAll = clamp((now - animRef.current.startAt) / animRef.current.duration, 0, 1);

        const cutT = animRef.current.cut;
        let x = fromX;

        if (tAll <= cutT) {
          const t1 = tAll / cutT;
          x = animRef.current.fromX + (animRef.current.midX - animRef.current.fromX) * easeOutQuint(t1);
        } else {
          const t2 = (tAll - cutT) / (1 - cutT);
          x = animRef.current.midX + (animRef.current.toX - animRef.current.midX) * easeOutBack(t2);
        }

        setReelX(x);
        setSpinP(tAll);

        const m = measureMetrics();
        if (m) {
          const pointerX = m.vpW / 2;
          const idx = Math.floor((pointerX - x) / m.stepW);

          const vel = Math.abs(x - animRef.current.lastX);
          animRef.current.lastX = x;
          const velN = clamp(vel / (m.stepW * 0.9), 0, 1);
          const endBoost = 0.35 + Math.pow(tAll, 2.1) * 0.85;
          const inten = clamp(velN * endBoost, 0.15, 1);

          if (idx !== animRef.current.lastIdx && tAll < 0.995) {
            animRef.current.lastIdx = idx;
            tick(inten);
          }
        }

        if (tAll >= 1) {
          animRef.current.running = false;
          setSpinning(false);
          setSpinP(0);
          setResult(picked || null);
          setOpenWinModal(true);
          if (picked?.rarity) success(picked.rarity);
          startedRef.current = false;
          pendingRef.current = null;
          return;
        }

        rafRef.current = requestAnimationFrame(step);
      };

      rafRef.current = requestAnimationFrame(step);
    },
    [ensure, measureMetrics, setReelX, setSpinP, success, tick]
  );

  useEffect(() => {
    stopAnim();
    setStrip(dataset.reel);
    setResult(null);
    setSpinning(false);
    setOpenDropsModal(false);
    setOpenWinModal(false);
    pendingRef.current = null;
    startedRef.current = false;
    requestAnimationFrame(() => setReelX(0));
  }, [dataset, setReelX, stopAnim]);

  useEffect(() => {
    const anyOpen = openDropsModal || openWinModal;
    if (!anyOpen) return;

    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpenDropsModal(false);
        setOpenWinModal(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openDropsModal, openWinModal]);

  useLayoutEffect(() => {
    if (!spinning) return;
    if (startedRef.current) return;
    const p = pendingRef.current;
    if (!p?.picked || !p?.seq) return;

    const id = requestAnimationFrame(() => {
      if (!reelRef.current || !viewportRef.current) return;
      if (p.seq !== spinSeqRef.current) return;

      const m = measureMetrics();
      if (!m) return;

      const idx = p.targetIndex;
      const targetX = -(idx * m.stepW) + (m.vpW / 2 - m.itemW / 2);
      const toX = clamp(targetX, m.maxRight, m.maxLeft);

      const sign = Math.sign(toX - 0) || -1;
      const overshoot = Math.min(18, Math.max(10, m.stepW * 0.10));
      const midX = clamp(toX + sign * overshoot, m.maxRight, m.maxLeft);

      const duration = 3200 + Math.floor(Math.random() * 950);
      startedRef.current = true;

      setReelX(0);
      setSpinP(0);

      runAnim({ fromX: 0, toX, midX, duration, picked: p.picked, seq: p.seq, cut: 0.80 });
    });

    return () => cancelAnimationFrame(id);
  }, [spinning, strip.length, measureMetrics, runAnim, setReelX, setSpinP]);

  const emitFlyToBasket = useCallback(() => {
    try {
      const img = productImg;
      if (!img) return;

      const rect = artImgRef.current?.getBoundingClientRect?.();
      if (!rect) return;

      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;

      document.dispatchEvent(new CustomEvent("tienda:fly", { detail: { img, rect: { x, y } } }));
    } catch {}
  }, [productImg]);

  const dispatchAddToCart = useCallback(() => {
    if (!payloadPkg) return;

    emitFlyToBasket();

    if (typeof onAddToCart === "function") {
      onAddToCart(payloadPkg);
      return;
    }

    window.dispatchEvent(new CustomEvent("flancraft:add-to-cart", { detail: { pkg: payloadPkg } }));
  }, [emitFlyToBasket, onAddToCart, payloadPkg]);

  const pctText = (id) => {
    const v = pctMap.get(id);
    if (!Number.isFinite(v)) return null;
    const s = v >= 1 ? v.toFixed(1) : v.toFixed(2);
    return `${s.replace(".", ",")}%`;
  };

  const spin = useCallback(() => {
    if (spinning) return;

    spinSeqRef.current += 1;
    const seq = spinSeqRef.current;

    const base = dataset.reel;
    const picked = weightedPick(base);
    if (!picked) return;

    setOpenWinModal(false);
    setOpenDropsModal(false);
    setResult(null);

    if (reducedMotion) {
      setResult(picked);
      setOpenWinModal(true);
      success(picked.rarity);
      return;
    }

    const long = [];
    const targetIndex = 58;
    const before = targetIndex;
    const after = 14;

    for (let i = 0; i < before; i++) long.push(base[Math.floor(Math.random() * base.length)]);
    long.push(picked);
    for (let i = 0; i < after; i++) long.push(base[Math.floor(Math.random() * base.length)]);

    pendingRef.current = { picked, seq, targetIndex };
    startedRef.current = false;

    stopAnim();
    setReelX(0);
    setSpinning(true);
    setStrip(long);

    ensure();
    tick(0.55);
  }, [dataset, reducedMotion, spinning, stopAnim, setReelX, success, ensure, tick]);

  return (
    <div ref={rootRef} className={`pdkeys ${accentClass}`} data-server={resolvedServer}>
      <div className="pdkeys__top">
        <div className="pdkeys__topLeft">
          <div className="pdkeys__head">
            <div className="pdkeys__kicker">LLAVES · {serverText}</div>
          </div>

          <div className="pdkeys__best">
            <div className="pdkeys__bestHead">
              <div className="pdkeys__bestLabel">TOP ITEMS</div>
              <div className="pdkeys__bestHint">Los más buscados en esta llave</div>
            </div>

            <div className="pdkeys__bestGrid">
              {bestDrops.map((it) => (
                <div key={it.id} className={`pdkeys__bestCard is-${it.rarity}`} title={it.name}>
                  <div className={`pdkeys__bestIcon ${it.amount ? "has-amt" : ""}`} data-amt={it.amount || undefined}>
                    {it.icon ? <img src={it.icon} alt="" loading="lazy" draggable="false" /> : <IconFallback text={it.name} />}
                  </div>
                  <div className="pdkeys__bestText">
                    <div className="pdkeys__bestName">{it.name}</div>
                    <div className="pdkeys__bestMeta">{RARITY[it.rarity]?.label || "Común"}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="pdkeys__topRight">
          <div className="pdkeys__art">
            <div className="pdkeys__artFrame">
              {productImg ? (
                <img ref={artImgRef} className="pdkeys__artImg" src={productImg} alt="" loading="lazy" draggable="false" />
              ) : (
                <div className="pdkeys__artImg ph" aria-hidden="true" />
              )}
              <div className="pdkeys__artSpark" aria-hidden="true" />
            </div>
          </div>

          <div className="pdkeys__actions">
            <button type="button" className="pdkeys__btn pdkeys__btn--ghost" onClick={() => setOpenDropsModal(true)} disabled={spinning}>
              <span className="pdkeys__btnShine" aria-hidden="true" />
              VER PREMIOS
            </button>

            <button type="button" className="pdkeys__btn pdkeys__btn--spin" onClick={spin} disabled={spinning}>
              <span className="pdkeys__btnShine" aria-hidden="true" />
              {spinning ? "ABRIENDO..." : "VISTA PREVIA"}
            </button>

            <button type="button" className="pdkeys__btn pdkeys__btn--buy" onClick={dispatchAddToCart}>
              <span className="pdkeys__btnShine" aria-hidden="true" />
              AÑADIR AL CARRITO
            </button>
          </div>
        </div>
      </div>

      <div className={`pdkeys__case ${spinning ? "is-spinning" : ""}`}>
        <div className="pdkeys__pointer" aria-hidden="true">
          <span className="pdkeys__pointerLine" />
          <span className="pdkeys__pointerCap" />
        </div>

        <div className="pdkeys__reelViewport" ref={viewportRef}>
          <div className="pdkeys__reel" ref={reelRef}>
            {strip.map((it, idx) => (
              <div key={`${it.id}-${idx}`} className={`pdkeys__item is-${it.rarity}`}>
                <div className={`pdkeys__itemIcon ${it.amount ? "has-amt" : ""}`} data-amt={it.amount || undefined}>
                  {it.icon ? <img src={it.icon} alt="" loading="lazy" draggable="false" /> : <IconFallback text={it.name} />}
                </div>
                <div className="pdkeys__itemName">{it.name}</div>
                <div className="pdkeys__itemMeta">{it.group ? it.group : it.meta}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="pdkeys__note">Vista previa orientativa · La apertura real ocurre en el servidor</div>
      </div>

      {openDropsModal ? (
        <div className="pdkeysModal" role="dialog" aria-label="Premios">
          <div className="pdkeysModal__backdrop" onClick={() => setOpenDropsModal(false)} />
          <div className="pdkeysModal__panel">
            <div className="pdkeysModal__head">
              <div className="pdkeysModal__title">Posibles premios</div>
              <button className="pdkeysModal__close" onClick={() => setOpenDropsModal(false)} aria-label="Cerrar">
                ×
              </button>
            </div>

            <div className="pdkeysModal__sub">Probabilidades orientativas · Puede variar in-game</div>

            <div className="pdkeysModal__grid">
              {dataset.reel.map((it) => (
                <div key={it.id} className={`pdkeysDrop is-${it.rarity}`}>
                  <div className={`pdkeysDrop__icon ${it.amount ? "has-amt" : ""}`} data-amt={it.amount || undefined}>
                    {it.icon ? <img src={it.icon} alt="" loading="lazy" draggable="false" /> : <IconFallback text={it.name} />}
                  </div>

                  <div className="pdkeysDrop__mid">
                    <div className="pdkeysDrop__name">{it.name}</div>
                    <div className="pdkeysDrop__meta">{it.group ? it.group : it.meta}</div>
                  </div>

                  <div className="pdkeysDrop__right">
                    <div className="pdkeysDrop__rar">{rarityLabel(it.rarity)}</div>
                    {pctText(it.id) ? <div className="pdkeysDrop__pct">{pctText(it.id)}</div> : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {openWinModal && result ? (
        <div className="pdkeysWin" role="dialog" aria-label="Resultado">
          <div className="pdkeysWin__backdrop" onClick={() => setOpenWinModal(false)} />

          <div className={`pdkeysWin__panel is-${result.rarity}`}>
            <button className="pdkeysWin__close" onClick={() => setOpenWinModal(false)} aria-label="Cerrar">
              ×
            </button>

            <div className="pdkeysWin__header">
              <div className="pdkeysWin__name">{result.name}</div>
              <div className="pdkeysWin__meta">{result.group ? result.group : result.meta}</div>
            </div>

            <div className="pdkeysWin__hero">
              <div className={`pdkeysWin__heroIcon ${result.amount ? "has-amt" : ""}`} data-amt={result.amount || undefined}>
                <div className="pdkeysWin__corner pdkeysWin__corner--rar">{rarityLabel(result.rarity)}</div>
                {pctText(result.id) ? <div className="pdkeysWin__corner pdkeysWin__corner--pct">{pctText(result.id)}</div> : null}
                {result.icon ? <img src={result.icon} alt="" loading="lazy" draggable="false" /> : <IconFallback text={result.name} />}
              </div>
            </div>

            <div className="pdkeysWin__note">La apertura real se realiza en el servidor al usar la llave.</div>

            <div className="pdkeysWin__glow" aria-hidden="true" />
            <div className="pdkeysWin__shine" aria-hidden="true" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
