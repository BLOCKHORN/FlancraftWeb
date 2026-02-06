export function materialToFile(material) {
  const base = String(material || "")
    .toLowerCase()
    .replace(/^minecraft:/, "")
    .replace(/ /g, "_");

  const OVERRIDES = {
    snow: "snowball",
    enchanted_golden_apple: "golden_apple",
  };

  return OVERRIDES[base] || base;
}

export function getCustomIconUrl(material, modelData, ctx) {
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
