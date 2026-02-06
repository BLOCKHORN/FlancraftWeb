import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

const ROOT = process.cwd();

// Carpeta donde has metido los YML
const YML_DIR = path.join(ROOT, "public", "coinshop-yml");
// Archivo final que consumirá la web
const OUT_FILE = path.join(ROOT, "public", "coinshop-data.json");

function readText(p) {
  return fs.readFileSync(p, "utf8");
}
function safeArray(v) {
  if (!v) return [];
  return Array.isArray(v) ? v.map(String) : [String(v)];
}

/**
 * DeluxeMenus: items: { 'id': { material, slot, display_name, lore, left_click_commands... } }
 */
function normalizeMenu(fileName, obj) {
  const itemsObj = obj?.items || {};
  const items = [];

  for (const [key, it] of Object.entries(itemsObj)) {
    const slot = Number(it?.slot);
    if (!Number.isFinite(slot)) continue;

    items.push({
      key,
      slot,
      material: it?.material ?? it?.type ?? "PAPER",
      model_data: it?.model_data ?? it?.modelData ?? it?.custom_model_data ?? null,
      amount: it?.amount ?? 1,
      display_name: it?.display_name ?? it?.name ?? key,
      lore: safeArray(it?.lore),
      left_click_commands: safeArray(it?.left_click_commands),
      right_click_commands: safeArray(it?.right_click_commands),
      // guardamos extras por si luego quieres tooltip más rico
      _raw: undefined,
    });
  }

  return {
    file: fileName,
    menu_title: obj?.menu_title ?? null,
    size: obj?.size ?? null,
    open_command: obj?.open_command ?? null,
    update_interval: obj?.update_interval ?? null,
    items,
  };
}

function extractOpenGuiTarget(item) {
  const all = [...safeArray(item.left_click_commands), ...safeArray(item.right_click_commands)].join(" ");
  // Ej: [openguimenu] coinshop_keys
  const m = all.match(/\[openguimenu\]\s*([a-z0-9_\-]+)/i);
  return m ? m[1] : null;
}

/**
 * El menú principal es coinshop_menu.yml y dentro tiene los botones a submenús.
 * Construimos categorías automáticamente.
 */
function buildCategoriesFromMain(mainMenu, allMenusByFile) {
  const categories = [];

  for (const it of mainMenu.items) {
    const target = extractOpenGuiTarget(it);
    if (!target) continue;

    // target viene como "coinshop_keys", tus archivos están como "coinshop_keys.yml"
    const fileWithExt = `${target}.yml`;
    const exists =
      allMenusByFile.has(fileWithExt) || allMenusByFile.has(target) || allMenusByFile.has(`${target}.yaml`);

    // Si por lo que sea no existe, igual lo metemos (pero marcado)
    categories.push({
      id: target.replace(/^coinshop_/, ""),   // "keys"
      target,                                // "coinshop_keys"
      file: allMenusByFile.has(fileWithExt) ? fileWithExt : (allMenusByFile.has(target) ? target : fileWithExt),
      slot: it.slot,
      title: it.display_name,
      description: it.lore,
      icon: {
        material: it.material,
        model_data: it.model_data,
        amount: it.amount ?? 1,
      },
      valid: Boolean(exists),
    });
  }

  // orden: por slot de inventario
  categories.sort((a, b) => (a.slot ?? 999) - (b.slot ?? 999));
  return categories;
}

function main() {
  if (!fs.existsSync(YML_DIR)) {
    console.error(`No existe la carpeta: ${YML_DIR}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(YML_DIR)
    .filter((f) => f.toLowerCase().endsWith(".yml") || f.toLowerCase().endsWith(".yaml"));

  if (!files.length) {
    console.error(`No hay .yml en: ${YML_DIR}`);
    process.exit(1);
  }

  // Parseamos todos los yml
  const menusByFile = new Map();

  for (const file of files) {
    const full = path.join(YML_DIR, file);
    const raw = readText(full);
    const obj = yaml.load(raw);
    menusByFile.set(file, normalizeMenu(file, obj));
  }

  // Main menu
  const mainMenu =
    menusByFile.get("coinshop_menu.yml") ||
    menusByFile.get("coinshop_menu.yaml") ||
    null;

  if (!mainMenu) {
    console.error("No encuentro coinshop_menu.yml dentro de public/coinshop-yml/");
    process.exit(1);
  }

  const categories = buildCategoriesFromMain(mainMenu, menusByFile);

  // Construimos data final: categories + itemsByCategory
  const itemsByCategory = {};
  for (const cat of categories) {
    const menu = menusByFile.get(cat.file);
    // si existe, guardamos items; si no, vacío
    itemsByCategory[cat.id] = menu?.items ?? [];
  }

  const out = {
    generatedAt: new Date().toISOString(),
    sourceDir: "public/coinshop-yml",
    main: {
      file: mainMenu.file,
      menu_title: mainMenu.menu_title,
      size: mainMenu.size,
      open_command: mainMenu.open_command,
    },
    categories,
    itemsByCategory,
  };

  fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2), "utf8");
  console.log(`✅ Generado: ${OUT_FILE}`);
  console.log(`✅ Categorías detectadas: ${categories.length}`);
  const invalid = categories.filter((c) => !c.valid);
  if (invalid.length) {
    console.log("⚠️ Categorías con archivo no encontrado:", invalid.map((c) => `${c.id} -> ${c.file}`).join(", "));
  }
}

main();
