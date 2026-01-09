// apps/frontend/src/components/Tienda/details/ItemsOpTooltipCard.jsx
import React from "react";

function normArray(v) {
  return Array.isArray(v) ? v : [];
}

function getLevelText(e) {
  if (!e) return "";
  if (e.levelText) return String(e.levelText);
  if (e.level != null) return String(e.level);
  return "";
}

function Line({ bullet, stat, children }) {
  return (
    <div className={`mct__line ${stat ? "mct__line--stat" : ""}`}>
      {bullet ? <span className="mct__bullet">•</span> : null}
      <span className="mct__txt">{children}</span>
    </div>
  );
}

export default function ItemsOpTooltipCard({ data }) {
  const t = data?.tooltip || {};

  const ench =
    normArray(t.enchantments).length
      ? normArray(t.enchantments)
      : normArray(data?.enchantments).length
      ? normArray(data?.enchantments)
      : normArray(data?.enchants); // ✅ tu campo

  const eff =
    normArray(t.effects).length ? normArray(t.effects) : normArray(data?.effects);

  const loreRaw =
    normArray(t.lore).length ? normArray(t.lore) : normArray(data?.lore);

  const lore = loreRaw.map((l) => {
    if (typeof l === "string") return { text: l, muted: false, italic: false };
    const text = l?.text ?? "";
    const italic = l?.italic || l?.style === "italic";
    const muted = l?.muted || l?.color === "muted";
    return { text, italic, muted };
  });

  const attrsArray = normArray(t.attributes).length
    ? normArray(t.attributes)
    : normArray(data?.attributes);

  const attrsObj =
    data?.attributes && !Array.isArray(data.attributes) ? data.attributes : null;

  const img = String(data?.image || t?.image || "").trim();
  const title = String(t.title || data?.title || data?.name || "Ítem").trim();
  const rarity = String(t.rarity || data?.rarity || "epic").trim();

  return (
    <div className="mct" data-rarity={rarity}>
      <div className="mct__inner">
        <div className="mct__titleRow">
          <div className="mct__title">{title}</div>
        </div>

        <div className="mct__sep" />

        {img ? (
          <div className="mct__imgRow">
            <img
              className="mct__img"
              src={img}
              alt={title}
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
        ) : null}

        {ench.length ? (
          <>
            <div className="mct__sectionTitle mct__sectionTitle--ench">ENCANTAMIENTOS</div>
            <div className="mct__sep mct__sep--thin" />
            {ench.map((e, i) => {
              const lvl = getLevelText(e);
              return (
                <Line bullet stat key={i}>
                  <span className="mct__statName mct__enchName">{e?.name}</span>
                  {lvl ? <span className="mct__statLvl mct__enchLvl">{lvl}</span> : null}
                </Line>
              );
            })}
            <div className="mct__sep" />
          </>
        ) : null}

        {eff.length ? (
          <>
            <div className="mct__sectionTitle">EFECTOS</div>
            <div className="mct__sep mct__sep--thin" />
            {eff.map((e, i) => {
              const lvl = getLevelText(e);
              return (
                <Line bullet stat key={i}>
                  <span className="mct__statName mct__effName">{e?.name}</span>
                  {lvl ? <span className="mct__statLvl mct__effLvl">{lvl}</span> : null}
                </Line>
              );
            })}
            <div className="mct__sep" />
          </>
        ) : null}

        {lore.length ? (
          <div className="mct__lore">
            {lore.map((l, i) => (
              <div
                key={i}
                className={[
                  "mct__loreLine",
                  l.italic ? "is-italic" : "",
                  l.muted ? "is-muted" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {l.text}
              </div>
            ))}
            <div className="mct__sep" />
          </div>
        ) : null}

        {attrsObj ? (
          <div className="mct__attrs">
            {attrsObj.header ? <div className="mct__attrHeader">{attrsObj.header}</div> : null}

            {Array.isArray(attrsObj.rows)
              ? attrsObj.rows.map((r, i) => (
                  <div className="mct__attr" key={i}>
                    <span
                      className={["mct__attrLeft", r?.leftColor ? `is-${r.leftColor}` : ""]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {r?.left}
                    </span>
                    <span className="mct__attrRight">{r?.right}</span>
                  </div>
                ))
              : null}

            {attrsObj.itemId ? <div className="mct__id">{attrsObj.itemId}</div> : null}
          </div>
        ) : null}

        {!attrsObj && attrsArray.length ? (
          <div className="mct__attrs">
            {attrsArray.map((a, i) => {
              if (a?.type === "header") return <div className="mct__attrHeader" key={i}>{a.left}</div>;
              if (a?.type === "id") return <div className="mct__id" key={i}>{a.left}</div>;
              return (
                <div className="mct__attr" key={i}>
                  <span className={`mct__attrLeft ${a?.color ? `is-${a.color}` : ""}`}>{a?.left}</span>
                  <span className="mct__attrRight">{a?.right}</span>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
