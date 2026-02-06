import React, { useEffect, useMemo, useState } from "react";
import { getCustomIconUrl, materialToFile } from "../utils/iconResolver";

const VANILLA_BASE = "/mc/textures";

const SPECIAL_FALLBACKS = {
  TNT: [
    `${VANILLA_BASE}/item/tnt.png`,
    `${VANILLA_BASE}/block/tnt.png`,
    `${VANILLA_BASE}/block/tnt_side.png`,
    `${VANILLA_BASE}/block/tnt_top.png`,
  ],
  DAYLIGHT_DETECTOR: [
    `${VANILLA_BASE}/item/daylight_detector.png`,
    `${VANILLA_BASE}/block/daylight_detector.png`,
    `${VANILLA_BASE}/block/daylight_detector_top.png`,
    `${VANILLA_BASE}/block/daylight_detector_side.png`,
    `${VANILLA_BASE}/block/daylight_detector_inverted_top.png`,
    `${VANILLA_BASE}/block/daylight_detector_inverted_side.png`,
  ],
  SNOW: [
    `${VANILLA_BASE}/item/snow.png`,
    `${VANILLA_BASE}/block/snow.png`,
    `${VANILLA_BASE}/item/snowball.png`,
    `${VANILLA_BASE}/block/snow_block.png`,
  ],
  ENCHANTED_GOLDEN_APPLE: [
    `${VANILLA_BASE}/item/enchanted_golden_apple.png`,
    `${VANILLA_BASE}/item/golden_apple.png`,
  ],
};

function buildCandidates({ material, file, custom }) {
  const mat = String(material || "").toUpperCase();

  const list = [];
  if (custom) list.push(custom);

  list.push(`${VANILLA_BASE}/item/${file}.png`);
  list.push(`${VANILLA_BASE}/block/${file}.png`);

  const special = SPECIAL_FALLBACKS[mat];
  if (Array.isArray(special)) list.push(...special);

  const out = [];
  const seen = new Set();
  for (const p of list) {
    if (!p) continue;
    const key = String(p);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

export default function ItemIcon({
  material,
  model_data,
  alt = "",
  className,
  placeholder = "/coinshop-icons/placeholder.png",
  ctx,
  srcOverride,
}) {
  const matStr = String(material || "");
  const isBasehead = matStr.toLowerCase().startsWith("basehead-");

  const file = useMemo(() => materialToFile(material), [material]);

  const custom = useMemo(
    () => (srcOverride ? srcOverride : getCustomIconUrl(material, model_data, ctx)),
    [material, model_data, ctx, srcOverride]
  );

  const candidates = useMemo(
    () => buildCandidates({ material, file, custom }),
    [material, file, custom]
  );

  const [idx, setIdx] = useState(0);
  const [src, setSrc] = useState(candidates[0] || placeholder);

  useEffect(() => {
    setIdx(0);
    setSrc(candidates[0] || placeholder);
  }, [candidates, placeholder]);

  return (
    <img
      className={className}
      src={src}
      alt={alt}
      draggable={false}
      onError={() => {
        if (isBasehead) {
          setSrc(placeholder);
          return;
        }

        setIdx((prev) => {
          const next = prev + 1;
          if (next < candidates.length) {
            setSrc(candidates[next]);
            return next;
          }
          setSrc(placeholder);
          return prev;
        });
      }}
    />
  );
}
