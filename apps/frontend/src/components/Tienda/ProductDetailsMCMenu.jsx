import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import "../../styles/components/Tienda/product-details-mcui.scss";

function cx(...arr) {
  return arr.filter(Boolean).join(" ");
}

/** Enchants -> clases Minecraft */
function enchantClass(line) {
  const t = String(line || "").toLowerCase();

  if (t.includes("respira")) return "mc-aqua";
  if (t.includes("protecci")) return "mc-blue";
  if (t.includes("irromp")) return "mc-gray";
  if (t.includes("repar")) return "mc-green";
  if (t.includes("espina")) return "mc-darkgreen";

  if (t.includes("filo") || t.includes("sharp")) return "mc-lightpurple";
  if (t.includes("barrido") || t.includes("sweeping")) return "mc-gold";
  if (t.includes("aspecto")) return "mc-red";
  if (t.includes("botín") || t.includes("botin") || t.includes("loot")) return "mc-gold";
  if (t.includes("punch") || t.includes("empuje") || t.includes("knock")) return "mc-yellow";

  if (t.includes("eficiencia")) return "mc-yellow";
  if (t.includes("fortuna")) return "mc-yellow";
  if (t.includes("toque")) return "mc-aqua";

  return "mc-gray";
}

function splitMetaToEnchants(item) {
  if (Array.isArray(item?.enchants) && item.enchants.length) return item.enchants;
  const meta = String(item?.meta || "").trim();
  if (!meta) return [];
  return meta
    .split("·")
    .map((s) => s.trim())
    .filter(Boolean);
}

function useIsCoarsePointer() {
  const [coarse, setCoarse] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia?.("(pointer: coarse)");
    if (!mq) return;
    const update = () => setCoarse(!!mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  return coarse;
}

/** Tooltip fijo (portal) que NUNCA se sale de pantalla */
function TooltipPortal({ open, anchorRef, children, onRequestClose }) {
  const tipRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0, placement: "bottom" });

  const compute = useCallback(() => {
    const a = anchorRef?.current;
    const tip = tipRef.current;
    if (!a || !tip) return;

    const r = a.getBoundingClientRect();
    const vw = window.innerWidth || document.documentElement.clientWidth;
    const vh = window.innerHeight || document.documentElement.clientHeight;

    const tw = tip.offsetWidth || 280;
    const th = tip.offsetHeight || 120;

    const margin = 10;
    const gap = 10;

    const canBottom = r.bottom + gap + th + margin <= vh;
    const placement = canBottom ? "bottom" : "top";

    const top =
      placement === "bottom"
        ? Math.min(vh - th - margin, r.bottom + gap)
        : Math.max(margin, r.top - th - gap);

    const idealLeft = r.left + r.width / 2 - tw / 2;
    const left = Math.max(margin, Math.min(vw - tw - margin, idealLeft));

    setPos({ top, left, placement });
  }, [anchorRef]);

  useEffect(() => {
    if (!open) return;

    const raf = requestAnimationFrame(compute);

    const onReflow = () => compute();
    window.addEventListener("resize", onReflow);
    window.addEventListener("scroll", onReflow, { passive: true });

    const onDown = (e) => {
      const tip = tipRef.current;
      const a = anchorRef?.current;
      if (!tip || !a) return;
      if (tip.contains(e.target) || a.contains(e.target)) return;
      onRequestClose?.();
    };
    document.addEventListener("mousedown", onDown);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onReflow);
      window.removeEventListener("scroll", onReflow);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open, compute, anchorRef, onRequestClose]);

  if (!open) return null;

  return createPortal(
    <div
      ref={tipRef}
      className={cx("mcui-tooltipPortal", pos.placement === "top" && "is-top")}
      style={{ top: pos.top, left: pos.left }}
      role="tooltip"
    >
      {children}
    </div>,
    document.body
  );
}

/** Slot con imagen. Tooltip: hover desktop / tap móvil */
function ArmSlot({ item, rarity = "epic" }) {
  const coarse = useIsCoarsePointer();
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);

  const ench = useMemo(() => splitMetaToEnchants(item), [item]);
  const isEmpty = !item;

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => {
    if (coarse) setOpen((v) => !v);
  }, [coarse]);

  const onEnter = useCallback(() => {
    if (!coarse && !isEmpty) setOpen(true);
  }, [coarse, isEmpty]);

  const onLeave = useCallback(() => {
    if (!coarse) setOpen(false);
  }, [coarse]);

  return (
    <>
      <button
        ref={btnRef}
        className={cx("mcui-armSlot", isEmpty && "is-empty", open && "is-open")}
        type="button"
        onClick={isEmpty ? undefined : toggle}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        disabled={isEmpty}
        aria-label={item?.name || "Vacío"}
      >
        <div className={cx("mcui-armFrame", `rarity-${rarity}`)}>
          <div className="mcui-armThumb">
            {item?.img ? (
              <img className="mcui-armImg" src={item.img} alt="" loading="lazy" />
            ) : (
              <div className="mcui-armPlaceholder" aria-hidden="true" />
            )}
          </div>

          <div className="mcui-armLabel">
            {item?.slotLabel ||
              String(item?.slot || "")
                .replaceAll("_", " ")
                .toUpperCase()}
          </div>
        </div>
      </button>

      <TooltipPortal open={open && !isEmpty} anchorRef={btnRef} onRequestClose={close}>
        <div className="mcui-tooltipName">{item?.name}</div>

        <div className="mcui-tooltipMeta">
          {ench?.length ? (
            ench.map((e, idx) => (
              <div key={idx} className={cx("mcui-enchant", enchantClass(e))}>
                {e}
              </div>
            ))
          ) : (
            <div className="mcui-enchant mc-gray">Sin datos</div>
          )}
        </div>

        {coarse ? <div className="mcui-tooltipHint">Toca fuera para cerrar</div> : null}
      </TooltipPortal>
    </>
  );
}

function SectionTitle({ children, center = false, count = null }) {
  return (
    <div className={cx("mcui-sectionTitle", center && "center")}>
      <span>{children}</span>
      {typeof count === "number" ? <span className="mcui-count">{count}</span> : null}
    </div>
  );
}

export default function ProductDetailsMCMenu({ data }) {
  const tabs = Array.isArray(data?.tabs) ? data.tabs : [];

  const initial = data?.defaultTabId ? String(data.defaultTabId) : "";
  const [active, setActive] = useState(initial);

  useEffect(() => setActive(initial), [initial]);

  const activeTab = useMemo(() => {
    if (!active) return null;
    return tabs.find((t) => t.id === active) || null;
  }, [tabs, active]);

  const rarityRoot =
    data?.rarity ||
    activeTab?.sections?.find((s) => s.type === "kit")?.rarity ||
    "epic";

  const onPickCard = useCallback((id) => {
    setActive((prev) => (prev === id ? "" : id));
  }, []);

  // Fusion: Lo más importante + Resumen (beige)
  const summaryTitle = String(data?.common?.title || "").trim();
  const summaryItems = Array.isArray(data?.common?.items) ? data.common.items : [];
  const importantTitle = String(data?.highlight?.title || "").trim();

  const showBeigeHero = !!importantTitle || !!summaryTitle || summaryItems.length > 0;

  return (
    <div className={cx("mcui-root", rarityRoot === "epic" && "is-epic")}>
      {/* HEADER */}
      <div className="mcui-topbar">
        <div className="mcui-topbarGrid">
          <div className="mcui-topLeft">
            <div className="mcui-rankIcon">
              {data?.rankIcon ? <img src={data.rankIcon} alt="" /> : null}
            </div>

            <div className="mcui-leftBadges">
              {data?.tierLabel ? <div className="mcui-badge stone">{data.tierLabel}</div> : null}
              {data?.durationLabel ? <div className="mcui-badge gold">{data.durationLabel}</div> : null}
            </div>
          </div>

          <div className="mcui-topCenter">
            {data?.kicker ? <div className="mcui-kicker">{data.kicker}</div> : null}
            <div className="mcui-title">{data?.name || "DETALLES"}</div>
            {data?.subtitle ? <div className="mcui-sub">{data.subtitle}</div> : null}
          </div>

          <div className="mcui-topRight" aria-hidden="true" />
        </div>
      </div>

      {/* BLOQUE BEIGE (fusionado) */}
      {showBeigeHero ? (
        <div className="mcui-heroBeige">
          {importantTitle ? <div className="mcui-heroBig">{importantTitle}</div> : null}
          {summaryTitle ? <div className="mcui-heroSmall">{summaryTitle}</div> : null}

          {summaryItems.length ? (
            <ul className="mcui-heroList">
              {summaryItems.map((txt, i) => (
                <li key={i} className="mcui-heroRow">
                  <span className="mcui-check" aria-hidden="true" />
                  <span className="mcui-heroTxt">{txt}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {/* CARTAS MODALIDADES */}
      <div className="mcui-panel wood">
        <div className="mcui-panelHead center">
          <div className="mcui-panelTitle">Modalidades</div>
          <div className="mcui-panelNote">Pasa el ratón o toca una carta para ver su contenido</div>
        </div>

        <div className="mcui-modeGrid">
          {tabs.map((t) => {
            const isActive = t.id === active;
            return (
              <button
                key={t.id}
                type="button"
                className={cx("mcui-modeCard", isActive && "is-active")}
                onClick={() => onPickCard(t.id)}
              >
                <div
                  className="mcui-modeBg"
                  style={t.cardImage ? { backgroundImage: `url(${t.cardImage})` } : undefined}
                  aria-hidden="true"
                />

                <div className="mcui-modeShade" aria-hidden="true" />

                <div className="mcui-modeTop">
                  <div className="mcui-modeIcon">
                    {t.iconSrc ? <img src={t.iconSrc} alt="" /> : null}
                  </div>
                </div>

                <div className="mcui-modeMid">
                  <div className="mcui-modeLabel">{t.label}</div>
                  {t.hint ? <div className="mcui-modeHint">{t.hint}</div> : null}
                </div>

                <div className="mcui-modeBottom">
                  {t.tag ? <div className="mcui-tag">{t.tag}</div> : <div />}
                  <div className={cx("mcui-cardArrow", isActive && "is-hidden")} aria-hidden="true" />
                </div>
              </button>
            );
          })}
        </div>

        {/* CONTENIDO DESPLEGABLE */}
        <div className={cx("mcui-dropWrap", !!activeTab && "is-open")}>
          <div className="mcui-dropInner">
            {!activeTab ? (
              <div className="mcui-dropPlaceholder">
                Selecciona una modalidad para desplegar sus beneficios.
              </div>
            ) : (
              <div className="mcui-panel stone mcui-dropPanel">
                <div className="mcui-realmHeader">
                  <div className="mcui-realmIcon">
                    {activeTab.iconSrc ? <img src={activeTab.iconSrc} alt="" /> : null}
                  </div>
                  <div className="mcui-realmText">
                    <div className="mcui-realmName">{activeTab.label}</div>
                    <div className="mcui-realmSub">
                      {activeTab.hint ? <span>{activeTab.hint}</span> : null}
                      {activeTab.tag ? <span className="mcui-realmTag">{activeTab.tag}</span> : null}
                    </div>
                  </div>
                </div>

                <div className="mcui-sections">
                  {/* SIEMPRE INCLUIDO (beneficios base) */}
                  {summaryItems.length ? (
                    <div className="mcui-section">
                      <SectionTitle center>Siempre incluido</SectionTitle>
                      <ul className="mcui-list tight center">
                        {summaryItems.map((txt, i) => (
                          <li key={i} className="mcui-listRow center">
                            <span className="mcui-check" aria-hidden="true" />
                            <div className="mcui-listText">{txt}</div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {(activeTab.sections || []).map((sec, idx) => {
                    if (sec.type === "list") {
                      const items = Array.isArray(sec.items) ? sec.items : [];
                      // Nada de secciones vacías con textos genéricos
                      if (!items.length) return null;

                      return (
                        <div key={idx} className="mcui-section">
                          <SectionTitle center>{sec.title || "Extras"}</SectionTitle>

                          <ul className="mcui-list tight center">
                            {items.map((txt, i) => (
                              <li key={i} className="mcui-listRow center">
                                <span className="mcui-check" aria-hidden="true" />
                                <div className="mcui-listText">{txt}</div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    }

                    if (sec.type === "commands") {
                      const items = Array.isArray(sec.items) ? sec.items : [];
                      return (
                        <div key={idx} className="mcui-section">
                          <SectionTitle center count={items.length}>
                            {sec.title || "Comandos"}
                          </SectionTitle>

                          {items.length ? (
                            <ul className="mcui-cmdList ultra">
                              {items.map((c, i) => {
                                const cd = String(c.cd || "").trim();
                                const isFree = cd.toLowerCase() === "libre";
                                return (
                                  <li key={i} className="mcui-cmdRow">
                                    <div className="mcui-cmdLeft">
                                      {c.img ? (
                                        <img className="mcui-cmdImg" src={c.img} alt="" loading="lazy" />
                                      ) : (
                                        <div className="mcui-cmdDot" aria-hidden="true" />
                                      )}
                                    </div>

                                    <div className="mcui-cmdMain">
                                      <div className="mcui-cmdTop">
                                        <div className="mcui-cmdCode">{c.cmd}</div>
                                        {cd ? (
                                          <div className={cx("mcui-chip", isFree && "free")}>
                                            {isFree ? "SIN COOLDOWN" : cd.toUpperCase()}
                                          </div>
                                        ) : null}
                                      </div>
                                      {c.desc ? <div className="mcui-cmdDesc">{c.desc}</div> : null}
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                          ) : (
                            <div className="mcui-empty">Aquí no hay comandos exclusivos.</div>
                          )}
                        </div>
                      );
                    }

                    if (sec.type === "kit") {
                      const kitItems = Array.isArray(sec.items) ? sec.items : [];
                      const rarity = sec.rarity || "epic";

                      const leftArmor = ["helmet", "chest"];
                      const rightArmor = ["legs", "boots"];
                      const weapons = ["sword", "pickaxe_fortune", "pickaxe_silk", "axe", "shovel", "hoe"];

                      const bySlot = {};
                      for (const it of kitItems) bySlot[it.slot] = it;
                      const extra = kitItems.filter((x) => x.slot === "extra");

                      return (
                        <div key={idx} className="mcui-section">
                          <SectionTitle center>{sec.title || "Armería"}</SectionTitle>

                          <div className="mcui-kitMeta">
                            {sec.cooldown ? (
                              <div className="mcui-metaPill">
                                <span className="k">COOLDOWN</span>
                                <span className="v">{sec.cooldown}</span>
                              </div>
                            ) : null}
                            {sec.money ? (
                              <div className="mcui-metaPill gold">
                                <span className="k">DINERO</span>
                                <span className="v">{sec.money}</span>
                              </div>
                            ) : null}
                          </div>

                          <div className="mcui-armoryV2">
                            <div className="mcui-armorCol left">
                              {leftArmor.map((s) => (
                                <ArmSlot key={s} item={bySlot[s]} rarity={rarity} />
                              ))}
                            </div>

                            <div className="mcui-armCenter">
                              <div className={cx("mcui-steve", rarity === "epic" && "rarity-epic")}>
                                {sec.steveImage ? (
                                  <img className="mcui-steveImg" src={sec.steveImage} alt="" />
                                ) : (
                                  <div className="mcui-steveFallback" />
                                )}
                                <div className="mcui-steveGlow" aria-hidden="true" />
                              </div>
                              <div className="mcui-armHint">
                                Ordenador: pasa el ratón por los slots · Móvil: toca un slot para ver detalles
                              </div>
                            </div>

                            <div className="mcui-armorCol right">
                              {rightArmor.map((s) => (
                                <ArmSlot key={s} item={bySlot[s]} rarity={rarity} />
                              ))}
                            </div>

                            <div className="mcui-weaponsTray">
                              <div className="mcui-weaponsTitle">ARMAS Y HERRAMIENTAS</div>
                              <div className="mcui-weaponsGrid">
                                {weapons.map((s) => (
                                  <ArmSlot key={s} item={bySlot[s]} rarity={rarity} />
                                ))}
                              </div>
                            </div>
                          </div>

                          {extra?.length ? (
                            <div className="mcui-extraRow">
                              {extra.map((x, i) => (
                                <div key={i} className="mcui-extraChip">
                                  {x.name}
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      );
                    }

                    return null;
                  })}
                </div>

                {Array.isArray(data?.legal) && data.legal.length ? (
                  <div className="mcui-legal">
                    {data.legal.map((l, i) => (
                      <div key={i} className="mcui-legalLine">
                        {l}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
