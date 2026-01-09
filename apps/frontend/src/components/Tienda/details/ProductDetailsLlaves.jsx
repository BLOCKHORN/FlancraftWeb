import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import "../../../styles/components/Tienda/productDetailsLlaves.scss";

/* =========================================================
   ProductDetailsLlaves (MEJORADO)
   - 0 scroll horizontal
   - 6/7 cartas visibles
   - Reel tipo CSGO (barrita centro + tensión al frenar)
   - Tick sound al pasar cada carta + SUCCESS dopaminico al premio
   - UI gaming/Minecraft, radios <= 3px
   - Títulos con IM Fell, cuerpo más legible (sans)
   ========================================================= */

const RARITY = {
  common: { label: "Común" },
  rare: { label: "Raro" },
  epic: { label: "Épico" },
  legend: { label: "Legendario" },
};

function makeItem({ id, name, meta, rarity = "common", weight = 1, icon = null, group = "" }) {
  return { id, name, meta, rarity, weight, icon, group };
}

function stripDiacritics(s) {
  try {
    return String(s || "").normalize("NFD").replace(/\p{Diacritic}/gu, "");
  } catch {
    return String(s || "");
  }
}

/* ---------------------------
   Prefer reduced motion
--------------------------- */
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

/* ---------------------------
   SOUND (WebAudio) – sin assets
--------------------------- */
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
        master.gain.value = 0.30; // volumen global
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

  const tick = useCallback((intensity = 1) => {
    const ok = ensure();
    if (!ok) return;

    const now = performance.now();
    // anti-spam (CSGO-like tick rate)
    const minGap = 22; // ms
    if (now - lastTickAtRef.current < minGap) return;
    lastTickAtRef.current = now;

    const ctx = ctxRef.current;
    const master = masterRef.current;

    const t0 = ctx.currentTime;
    const dur = 0.03 + 0.01 * (1 - Math.min(1, intensity));

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.setValueAtTime(1800, t0);

    // click “metallic”
    const base = 850 + 220 * Math.random();
    osc.type = "square";
    osc.frequency.setValueAtTime(base, t0);
    osc.frequency.exponentialRampToValueAtTime(base * 0.75, t0 + dur);

    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.16 * Math.min(1, intensity), t0 + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    osc.connect(hp);
    hp.connect(gain);
    gain.connect(master);

    osc.start(t0);
    osc.stop(t0 + dur + 0.01);
  }, [ensure]);

  const success = useCallback((rarity = "common") => {
    const ok = ensure();
    if (!ok) return;

    const ctx = ctxRef.current;
    const master = masterRef.current;
    const t0 = ctx.currentTime;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.55, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.9);
    g.connect(master);

    const mk = (freq, type, start, len, peak = 0.35) => {
      const o = ctx.createOscillator();
      const gg = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, start);
      gg.gain.setValueAtTime(0.0001, start);
      gg.gain.exponentialRampToValueAtTime(peak, start + 0.02);
      gg.gain.exponentialRampToValueAtTime(0.0001, start + len);
      o.connect(gg);
      gg.connect(g);
      o.start(start);
      o.stop(start + len + 0.02);
    };

    // “Dopamine” chord / arpeggio
    const isBig = rarity === "legend";
    const isMid = rarity === "epic";

    // hit
    mk(isBig ? 170 : isMid ? 190 : 210, "sine", t0, 0.24, 0.32);
    mk(isBig ? 340 : isMid ? 380 : 420, "triangle", t0, 0.22, 0.22);

    // sparkle arpeggio
    const notes = isBig
      ? [880, 1100, 1320, 1760]
      : isMid
      ? [740, 880, 1100]
      : [660, 740];

    notes.forEach((f, i) => {
      const st = t0 + 0.12 + i * 0.07;
      mk(f, "sine", st, 0.18, isBig ? 0.20 : 0.15);
    });

    // tail “whoosh”
    const noise = ctx.createBufferSource();
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.25, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    noise.buffer = buffer;

    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.setValueAtTime(isBig ? 900 : 700, t0);
    bp.Q.setValueAtTime(1.6, t0);

    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.0001, t0);
    ng.gain.exponentialRampToValueAtTime(isBig ? 0.25 : 0.18, t0 + 0.02);
    ng.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.35);

    noise.connect(bp);
    bp.connect(ng);
    ng.connect(g);
    noise.start(t0);
    noise.stop(t0 + 0.28);
  }, [ensure]);

  return { tick, success, ensure };
}

/* =========================================================
   DATASETS (más “user-facing”, sin comandos)
   ========================================================= */

function datasetRandom() {
  return {
    hero: {
      title: "Llave Random",
      tagline: "Sorpresa inmediata.",
      accent: "random",
      line: "Un premio directo. Puede tocar de todo.",
    },
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
    hero: {
      title: "Llave Cabezas",
      tagline: "1 cabeza garantizada.",
      accent: "cabezas",
      line: "Colección enorme para decoración.",
    },
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

function datasetVoto() {
  // pesos (preview)
  const total = 105;

  const votoItems = [
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

  const pct = (w) => ((w / total) * 100).toFixed(2).replace(".", ",");

  return {
    hero: {
      title: "Llave Voto",
      tagline: "Progreso real.",
      accent: "voto",
      line: "Dinero, kit y materiales en una sola apertura.",
    },
    reel: votoItems.map((it) => ({ ...it, meta: `${it.meta} · ${pct(it.weight)}%` })),
    best: ["dragon_head", "key2", "totem_1", "money_1000"],
    oddsTable: {
      total,
      groups: [
        { name: "Dinero", totalW: 47.0, pct: "44,76%" },
        { name: "Kit", totalW: 24.0, pct: "22,86%" },
        { name: "Materiales", totalW: 33.0, pct: "31,43%" },
        { name: "Extra", totalW: 1.0, pct: "0,95%" },
      ],
    },
  };
}

function getDataset(variant) {
  if (variant === "cabezas") return datasetCabezas();
  if (variant === "voto") return datasetVoto();
  return datasetRandom();
}

/* =========================================================
   Spin helpers
   ========================================================= */

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

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

// ease out con “tensión” al final
function easeTension(t) {
  // base easeOutCubic
  let e = 1 - Math.pow(1 - t, 3);

  // micro “freno” (wobble suave) en el 92%+
  if (t > 0.90) {
    const u = (t - 0.90) / 0.10; // 0..1
    e += Math.sin(u * Math.PI) * 0.010 * (1 - u);
  }
  return clamp(e, 0, 1);
}

/* =========================================================
   UI bits
   ========================================================= */

function IconFallback({ text = "?" }) {
  const letter = String(text || "?").trim().slice(0, 1).toUpperCase();
  return (
    <div className="pdkeys__icoFallback" aria-hidden="true">
      <span>{letter}</span>
    </div>
  );
}

/* =========================================================
   COMPONENT
   ========================================================= */

export default function ProductDetailsLlaves({
  // compat: si te llega “data” desde el registry/mc_menu
  data: registryData = null,

  // props directas
  variant = "random",
  server = "clasico",
  pkg = null,
}) {
  const reducedMotion = usePrefersReducedMotion();
  const { tick, success, ensure } = useSpinSounds();

  // si viene del registry, respetamos sus props
  const resolvedVariant = registryData?.props?.variant || variant;
  const resolvedServer = registryData?.props?.server || server;

  const dataset = useMemo(() => getDataset(resolvedVariant), [resolvedVariant]);

  // imagen: preferimos pkg, si no, intentamos pillar algo del registry
  const productImg =
    registryData?.__pkg?.image_url ||
    registryData?.__pkg?.image ||
    pkg?.image_url ||
    pkg?.image ||
    pkg?.imageUrl ||
    null;

  const kicker =
    registryData?.kicker ||
    (resolvedServer === "clasico" ? "Llaves · Survival Clásico" : "Llaves");

  const title = registryData?.name || dataset.hero.title;
  const tagline = dataset.hero.tagline;
  const line = dataset.hero.line;

  const accentClass =
    resolvedVariant === "voto" ? "is-voto" : resolvedVariant === "cabezas" ? "is-cabezas" : "is-random";

  // reel refs
  const viewportRef = useRef(null);
  const reelRef = useRef(null);

  // animation state (controlado por refs para smooth)
  const rafRef = useRef(0);
  const animRef = useRef({
    running: false,
    startAt: 0,
    duration: 0,
    fromX: 0,
    toX: 0,
    lastIdx: -1,
    cardW: 156,
    targetIdx: 0,
  });

  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [strip, setStrip] = useState(() => dataset.reel);

  // best drops
  const bestDrops = useMemo(() => {
    const ids = new Set(dataset.best || []);
    const byId = new Map(dataset.reel.map((x) => [x.id, x]));
    const arr = [];
    for (const id of ids) {
      const it = byId.get(id);
      if (it) arr.push(it);
    }
    // fallback: top rarities
    if (arr.length === 0) {
      const sorted = [...dataset.reel].sort((a, b) => {
        const rank = (r) => (r === "legend" ? 3 : r === "epic" ? 2 : r === "rare" ? 1 : 0);
        return rank(b.rarity) - rank(a.rarity);
      });
      return sorted.slice(0, 6);
    }
    return arr.slice(0, 8);
  }, [dataset]);

  useEffect(() => {
    // reset al cambiar dataset
    setStrip(dataset.reel);
    setResult(null);
    setSpinning(false);

    // limpiar anim
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    animRef.current.running = false;
  }, [dataset]);

  const stopAnim = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    animRef.current.running = false;
  }, []);

  const setReelX = useCallback((x) => {
    const el = reelRef.current;
    if (!el) return;
    el.style.transform = `translate3d(${x}px,0,0)`;
  }, []);

  const computeCardW = () => {
    const vp = viewportRef.current;
    if (!vp) return 156;
    const styles = getComputedStyle(vp);
    const v = styles.getPropertyValue("--pdkeys-cardW").trim();
    const n = Number(String(v).replace("px", ""));
    return Number.isFinite(n) && n > 40 ? n : 156;
  };

  const runAnim = useCallback(
    ({ fromX, toX, duration, targetIdx, picked }) => {
      const vp = viewportRef.current;
      const reel = reelRef.current;
      if (!vp || !reel) return;

      const cardW = computeCardW();
      animRef.current.cardW = cardW;
      animRef.current.fromX = fromX;
      animRef.current.toX = toX;
      animRef.current.duration = duration;
      animRef.current.startAt = performance.now();
      animRef.current.running = true;
      animRef.current.targetIdx = targetIdx;
      animRef.current.lastIdx = -1;

      // ensure audio context on user gesture
      ensure();

      const step = () => {
        if (!animRef.current.running) return;

        const now = performance.now();
        const t = clamp((now - animRef.current.startAt) / animRef.current.duration, 0, 1);
        const e = easeTension(t);
        const x = animRef.current.fromX + (animRef.current.toX - animRef.current.fromX) * e;

        setReelX(x);

        // tick index bajo el puntero (centro)
        const vpW = vp.clientWidth || 0;
        const pointerX = vpW / 2;
        const idx = Math.floor((pointerX - x) / cardW);

        if (idx !== animRef.current.lastIdx && t < 0.985) {
          animRef.current.lastIdx = idx;
          // intensidad: más fuerte cuando va más lento
          const intensity = 0.35 + (1 - t) * 0.75;
          tick(intensity);
        }

        if (t >= 1) {
          animRef.current.running = false;
          setSpinning(false);
          setResult(picked || null);

          // SUCCESS
          if (picked?.rarity) success(picked.rarity);
          return;
        }

        rafRef.current = requestAnimationFrame(step);
      };

      rafRef.current = requestAnimationFrame(step);
    },
    [ensure, setReelX, success, tick]
  );

  const spin = useCallback(() => {
    if (spinning) return;

    const base = dataset.reel;
    const picked = weightedPick(base);
    if (!picked) return;

    if (reducedMotion) {
      setResult(picked);
      success(picked.rarity);
      return;
    }

    setSpinning(true);
    setResult(null);

    // Construimos strip largo (CSGO vibe)
    const long = [];
    const targetIndex = 64; // lejos => tensión
    const noiseBefore = targetIndex;
    const noiseAfter = 10;

    for (let i = 0; i < noiseBefore; i++) {
      long.push(base[Math.floor(Math.random() * base.length)]);
    }
    long.push(picked);
    for (let i = 0; i < noiseAfter; i++) {
      long.push(base[Math.floor(Math.random() * base.length)]);
    }

    setStrip(long);

    // espera 1 frame para medir
    requestAnimationFrame(() => {
      const vp = viewportRef.current;
      if (!vp) return;

      const vpW = vp.clientWidth || 0;
      const cardW = computeCardW();

      const idx = targetIndex;

      // centramos el item idx en el puntero (centro)
      const targetX = -(idx * cardW) + (vpW / 2 - cardW / 2);

      // limites
      const maxLeft = 0;
      const maxRight = -(long.length * cardW) + vpW;
      const toX = clamp(targetX, maxRight, maxLeft);

      // partimos desde 0 siempre (o desde donde esté)
      const current = reelRef.current?.style?.transform || "";
      let fromX = 0;
      const m = current.match(/translate3d\(([-\d.]+)px/);
      if (m?.[1]) fromX = Number(m[1]) || 0;

      // duración con variación
      const duration = 3100 + Math.floor(Math.random() * 850);

      // arrancamos anim
      stopAnim();
      runAnim({ fromX, toX, duration, targetIdx: idx, picked });
    });
  }, [dataset, reducedMotion, runAnim, spinning, stopAnim, success]);

  const rarityLabel = (r) => RARITY[r]?.label || "Común";

  return (
    <div className={`pdkeys ${accentClass}`} data-server={resolvedServer}>
      {/* HERO (gaming / minecraft) */}
      <div className="pdkeys__hero">
        <div className="pdkeys__heroLeft">
          <div className="pdkeys__kicker">{kicker}</div>
          <h2 className="pdkeys__title">{title}</h2>

          <div className="pdkeys__desc">
            <span className="pdkeys__tagline">{tagline}</span>
            <span className="pdkeys__dot">•</span>
            <span className="pdkeys__line">{line}</span>
          </div>

          <div className="pdkeys__mini">
            <span>Instantánea</span>
            <span className="pdkeys__sep">/</span>
            <span>1 premio</span>
            <span className="pdkeys__sep">/</span>
            <span>Puede tocar de todo</span>
          </div>

          {/* BEST DROPS */}
          <div className="pdkeys__best">
            <div className="pdkeys__bestTitle">Best drops</div>
            <div className="pdkeys__bestRow">
              {bestDrops.map((it) => (
                <div key={it.id} className={`pdkeys__bestCard is-${it.rarity}`} title={it.name}>
                  <div className="pdkeys__bestIcon">
                    {it.icon ? <img src={it.icon} alt="" loading="lazy" draggable="false" /> : <IconFallback text={it.name} />}
                  </div>
                  <div className="pdkeys__bestName">{it.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="pdkeys__heroRight">
          <div className="pdkeys__artCard" role="presentation">
            <div className="pdkeys__artFrame">
              {productImg ? (
                <img className="pdkeys__artImg" src={productImg} alt="" loading="lazy" draggable="false" />
              ) : (
                <div className="pdkeys__artImg ph" aria-hidden="true" />
              )}
              <div className="pdkeys__artGlow" aria-hidden="true" />
            </div>

            <div className="pdkeys__artMeta">
              <div className="pdkeys__artName">{title}</div>
              <div className="pdkeys__artSub">{tagline}</div>
            </div>
          </div>
        </div>
      </div>

      {/* SIM */}
      <div className="pdkeys__sim">
        <div className="pdkeys__simHead">
          <div className="pdkeys__simLeft">
            <div className="pdkeys__simTitle">Simulación</div>
            <div className="pdkeys__simSub">Preview visual · El premio real lo decide el servidor</div>
          </div>

          <button
            type="button"
            className="pdkeys__cta"
            onClick={spin}
            disabled={spinning}
          >
            <span className="pdkeys__ctaShine" aria-hidden="true" />
            {spinning ? "ABRIENDO…" : "SIMULAR APERTURA"}
          </button>
        </div>

        <div className={`pdkeys__case ${spinning ? "is-spinning" : ""}`}>
          {/* spotlight edges */}
          <div className="pdkeys__caseShade" aria-hidden="true" />

          {/* pointer */}
          <div className="pdkeys__pointer" aria-hidden="true">
            <span className="pdkeys__pointerLine" />
            <span className="pdkeys__pointerCap" />
          </div>

          {/* viewport */}
          <div className="pdkeys__reelViewport" ref={viewportRef}>
            <div className="pdkeys__reel" ref={reelRef}>
              {strip.map((it, idx) => (
                <div key={`${it.id}-${idx}`} className={`pdkeys__item is-${it.rarity}`}>
                  <div className="pdkeys__itemTop">
                    <div className="pdkeys__itemIcon">
                      {it.icon ? <img src={it.icon} alt="" loading="lazy" draggable="false" /> : <IconFallback text={it.name} />}
                    </div>
                    <div className="pdkeys__itemTag">
                      <span className="pdkeys__rar">{rarityLabel(it.rarity)}</span>
                      {it.group ? <span className="pdkeys__grp">{it.group}</span> : null}
                    </div>
                  </div>
                  <div className="pdkeys__itemName">{it.name}</div>
                  <div className="pdkeys__itemMeta">{it.meta}</div>
                </div>
              ))}
            </div>
          </div>

          {/* result */}
          <div className={`pdkeys__result ${result ? "has" : ""}`}>
            {result ? (
              <div className={`pdkeys__resultCard is-${result.rarity}`}>
                <div className="pdkeys__resultHead">
                  <div className="pdkeys__resultTitle">PREMIO</div>
                  <div className="pdkeys__resultBadges">
                    <span className="pdkeys__rar">{rarityLabel(result.rarity)}</span>
                    {result.group ? <span className="pdkeys__grp">{result.group}</span> : null}
                  </div>
                </div>

                <div className="pdkeys__resultMain">
                  <div className="pdkeys__resultName">{result.name}</div>
                  <div className="pdkeys__resultMeta">{result.meta}</div>
                </div>

                <div className="pdkeys__resultGlow" aria-hidden="true" />
              </div>
            ) : (
              <div className="pdkeys__resultEmpty">
                Pulsa <strong>SIMULAR APERTURA</strong> para ver una recompensa posible.
              </div>
            )}
          </div>

          {/* odds (solo voto, discreto) */}
          {dataset.oddsTable ? (
            <details className="pdkeys__odds">
              <summary>Probabilidades</summary>
              <div className="pdkeys__oddsGrid">
                {dataset.oddsTable.groups.map((g) => (
                  <div key={g.name} className="pdkeys__oddsRow">
                    <div className="pdkeys__oddsName">{g.name}</div>
                    <div className="pdkeys__oddsBar">
                      <div className="pdkeys__oddsFill" style={{ width: g.pct.replace(",", ".") + "%" }} />
                    </div>
                    <div className="pdkeys__oddsPct">{g.pct}</div>
                  </div>
                ))}
              </div>
            </details>
          ) : null}
        </div>
      </div>
    </div>
  );
}
