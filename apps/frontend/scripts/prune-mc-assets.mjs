import fs from "fs";
import path from "path";

const ROOT = process.cwd();

const JSON_PATH = process.env.JSON_PATH || path.join(ROOT, "public", "coinshop-data.json");
const PUBLIC_DIR = process.env.PUBLIC_DIR || path.join(ROOT, "public");

const MC_DIRS = [
  path.join(PUBLIC_DIR, "mc", "textures", "item"),
  path.join(PUBLIC_DIR, "mc", "textures", "block"),
  path.join(PUBLIC_DIR, "mc", "custom"),
];

const EXTRA_DIRS = [path.join(PUBLIC_DIR, "coinshop-icons")];

const PLACEHOLDER = "/coinshop-icons/placeholder.png";

function materialToFile(material) {
  const base = String(material || "")
    .toLowerCase()
    .replace(/^minecraft:/, "")
    .replace(/ /g, "_");

  const OVERRIDES = {
    snow: "snow",
    enchanted_golden_apple: "enchanted_golden_apple",
  };

  return OVERRIDES[base] || base;
}

function getCustomIconUrl(material, modelData, ctx) {
  if (ctx?.type === "category" && ctx?.id) {
    const id = String(ctx.id).toLowerCase();
    const byId = {
      backpacks: "/mc/custom/item__coinshop__backpacks.png",
      furniture: "/mc/custom/item__coinshop__furniture.png",
      pets: "/mc/custom/item__coinshop__pets.png",
      emotes: "/mc/custom/item__coinshop__emotes.png",
    };
    if (byId[id]) return byId[id];
  }

  if (material && String(material).toUpperCase() === "PAPER" && Number.isFinite(Number(modelData))) {
    const md = Number(modelData);
    const byMd = {
      5980: "/mc/custom/item__coinshop__furniture.png",
      5972: "/mc/custom/item__coinshop__leatherbackpack.png",
      5975: "/mc/custom/item__coinshop__copperbackpack.png",
      5976: "/mc/custom/item__coinshop__silverbackpack.png",
      5977: "/mc/custom/item__coinshop__goldbackpack.png",
      5978: "/mc/custom/item__coinshop__diamondbackpack.png",
      5979: "/mc/custom/item__coinshop__netheritebackpack.png",
      5974: "/mc/custom/item__coinshop__pets.png",
    };
    if (byMd[md]) return byMd[md];
  }

  if (String(material).toUpperCase() === "DIAMOND_PICKAXE" && Number(modelData) === 50001) {
    return "/mc/custom/item__toolskins__atlantis__pickaxe.png";
  }

  return null;
}

function toAbs(publicPath) {
  const p = publicPath.startsWith("/") ? publicPath.slice(1) : publicPath;
  return path.join(PUBLIC_DIR, p);
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function norm(p) {
  return path.normalize(p);
}

function addIfExists(set, absPath) {
  set.add(norm(absPath));
}

function addCandidatesForItem(keep, material, modelData, ctx) {
  const file = materialToFile(material);
  const custom = getCustomIconUrl(material, modelData, ctx);

  if (custom) addIfExists(keep, toAbs(custom));

  addIfExists(keep, path.join(PUBLIC_DIR, "mc", "textures", "item", `${file}.png`));
  addIfExists(keep, path.join(PUBLIC_DIR, "mc", "textures", "block", `${file}.png`));

  if (String(material || "").toUpperCase() === "TNT") {
    addIfExists(keep, path.join(PUBLIC_DIR, "mc", "textures", "item", "tnt.png"));
    addIfExists(keep, path.join(PUBLIC_DIR, "mc", "textures", "block", "tnt.png"));
    addIfExists(keep, path.join(PUBLIC_DIR, "mc", "textures", "block", "tnt_side.png"));
    addIfExists(keep, path.join(PUBLIC_DIR, "mc", "textures", "block", "tnt_top.png"));
  }

  if (String(material || "").toUpperCase() === "DAYLIGHT_DETECTOR") {
    addIfExists(keep, path.join(PUBLIC_DIR, "mc", "textures", "item", "daylight_detector.png"));
    addIfExists(keep, path.join(PUBLIC_DIR, "mc", "textures", "block", "daylight_detector.png"));
    addIfExists(keep, path.join(PUBLIC_DIR, "mc", "textures", "block", "daylight_detector_top.png"));
    addIfExists(keep, path.join(PUBLIC_DIR, "mc", "textures", "block", "daylight_detector_side.png"));
    addIfExists(keep, path.join(PUBLIC_DIR, "mc", "textures", "block", "daylight_detector_inverted_top.png"));
    addIfExists(keep, path.join(PUBLIC_DIR, "mc", "textures", "block", "daylight_detector_inverted_side.png"));
  }
}

function safeParseJson(fp) {
  const raw = fs.readFileSync(fp, "utf8");
  return JSON.parse(raw);
}

const data = safeParseJson(JSON_PATH);

const keep = new Set();
addIfExists(keep, toAbs(PLACEHOLDER));

for (const cat of data.categories || []) {
  const ctx = { type: "category", id: cat.id };
  const icon = cat.icon || {};
  addCandidatesForItem(keep, icon.material, icon.model_data, ctx);
}

const itemsByCategory = data.itemsByCategory || {};
for (const [catId, items] of Object.entries(itemsByCategory)) {
  const ctx = { type: "item", category: catId };
  for (const it of items || []) {
    addCandidatesForItem(keep, it.material, it.model_data, ctx);
  }
}

const filesToConsider = [...MC_DIRS.flatMap(walk), ...EXTRA_DIRS.flatMap(walk)].map(norm);

const keepExisting = new Set();
for (const f of filesToConsider) {
  if (keep.has(f)) keepExisting.add(f);
}

const toDelete = filesToConsider.filter((f) => !keepExisting.has(f));

const mode = (process.env.MODE || "dry").toLowerCase();
const protect = new Set(
  (process.env.PROTECT || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((p) => norm(path.join(PUBLIC_DIR, p)))
);

const finalDelete = toDelete.filter((f) => !protect.has(f));

console.log(`JSON: ${JSON_PATH}`);
console.log(`Considerando archivos: ${filesToConsider.length}`);
console.log(`Mantener (existentes): ${keepExisting.size}`);
console.log(`Borrar: ${finalDelete.length}`);
console.log(`Modo: ${mode}`);

if (mode === "apply") {
  for (const f of finalDelete) {
    fs.rmSync(f);
  }
  console.log("✅ Borrado completado.");
} else {
  console.log("---- PREVIEW BORRAR (primeros 200) ----");
  finalDelete.slice(0, 200).forEach((f) => console.log(f.replace(PUBLIC_DIR + path.sep, "")));
  if (finalDelete.length > 200) console.log(`... +${finalDelete.length - 200} más`);
  console.log("✅ Dry-run. Para borrar de verdad: MODE=apply");
}
