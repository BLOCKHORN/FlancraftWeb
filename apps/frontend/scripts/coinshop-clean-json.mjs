import fs from "node:fs";
import path from "node:path";

const inputPath = path.join(process.cwd(), "public", "coinshop-data.json");
const outputPath = path.join(process.cwd(), "public", "coinshop-data.clean.json");

if (!fs.existsSync(inputPath)) {
  console.error("❌ No encuentro:", inputPath);
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(inputPath, "utf8"));

function cleanLines(lines) {
  if (!Array.isArray(lines)) return [];
  const bad = [
    /➥/i,
    /\bclick\b/i,
    /\bclic\b/i,
    /coinshop item/i,
    /art[íi]culo de coinshop/i,
    /\bobjeto de la tienda\b/i,
  ];
  return lines
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter((x) => x.length > 0)
    .filter((x) => !bad.some((re) => re.test(x)));
}

function normalizeCoinsTypos(s) {
  return typeof s === "string" ? s.replace(/OOINS/gi, "COINS") : s;
}

function parsePriceFromLore(loreLines) {
  const joined = (loreLines || []).join(" ").replace(/OOINS/gi, "COINS");
  const m = joined.match(/Precio:\s*&?[0-9A-Fa-f]*\s*([0-9][0-9,.\s]*)\s*(COINS|Coins)\b/);
  if (!m) return null;
  const num = m[1].replace(/[.\s]/g, "").replace(/,/g, "");
  const price = Number(num);
  return Number.isFinite(price) ? price : null;
}

function removeBoughtTag(name) {
  if (typeof name !== "string") return name;
  return name
    .replace(/\s*&8&l▪\s*&a&lCOMPRADA\b/i, "")
    .replace(/\s*▪\s*COMPRADA\b/i, "")
    .trim();
}

function isCoinsInfoItem(item) {
  if (!item) return false;
  if (item.key === "coins") return true;
  const lore = (item.lore || []).join(" ");
  return /coinsengine_balance_coins/i.test(lore) || /Saldo:/i.test(lore);
}

function cleanItem(item) {
  const priceCoins = parsePriceFromLore(item.lore || []);
  const loreClean = cleanLines((item.lore || []).map(normalizeCoinsTypos));

  return {
    key: item.key,
    slot: item.slot,
    name: removeBoughtTag(normalizeCoinsTypos(item.display_name)),
    priceCoins,
    description: loreClean.filter((ln) => !/Precio:/i.test(ln)),
    icon: {
      material: item.material,
      model_data: item.model_data ?? null,
      amount: item.amount ?? 1,
    },
  };
}

function cleanCategory(cat) {
  return {
    id: cat.id,
    slot: cat.slot,
    title: cat.title,
    description: cleanLines(cat.description || []),
    icon: {
      material: cat.icon?.material,
      model_data: cat.icon?.model_data ?? null,
      amount: cat.icon?.amount ?? 1,
    },
  };
}

function dedupeBySlotKeepFirst(items) {
  const seen = new Set();
  const out = [];
  for (const it of items) {
    if (seen.has(it.slot)) continue;
    seen.add(it.slot);
    out.push(it);
  }
  return out;
}

const cleaned = {
  main: {
    title: raw.main?.menu_title ?? "",
    size: raw.main?.size ?? null,
    command: raw.main?.open_command ?? null,
  },
  currency: null,
  categories: (raw.categories || []).filter((c) => c && c.valid !== false).map(cleanCategory),
  itemsByCategory: {},
};

for (const [catId, items] of Object.entries(raw.itemsByCategory || {})) {
  const arr = Array.isArray(items) ? items : [];

  const coinItem = arr.find(isCoinsInfoItem);
  if (!cleaned.currency && coinItem) {
    const balanceLine = (coinItem.lore || []).find((l) => /coinsengine_balance_coins/i.test(l)) || null;

    cleaned.currency = {
      name: removeBoughtTag(normalizeCoinsTypos(coinItem.display_name)),
      description: cleanLines((coinItem.lore || []).map(normalizeCoinsTypos)).filter((ln) => !/Saldo:/i.test(ln)),
      balancePlaceholder: balanceLine ? "%coinsengine_balance_coins%" : null,
      icon: {
        material: coinItem.material,
        model_data: coinItem.model_data ?? null,
        amount: coinItem.amount ?? 1,
      },
    };
  }

  let cleanedItems = arr.filter((it) => !isCoinsInfoItem(it)).map(cleanItem);

  if (catId === "backpacks") {
    cleanedItems = dedupeBySlotKeepFirst(cleanedItems);
  }

  cleaned.itemsByCategory[catId] = cleanedItems;
}

if (!cleaned.currency) {
  cleaned.currency = {
    name: "COINS",
    description: [],
    balancePlaceholder: "%coinsengine_balance_coins%",
    icon: { material: "PAPER", model_data: 110007, amount: 1 },
  };
}

fs.writeFileSync(outputPath, JSON.stringify(cleaned, null, 2), "utf8");
console.log("✅ Generado:", outputPath);
