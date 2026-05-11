import React, { useState } from "react";
import enchantsData from "../../data/enchants.json";

const blockUrl = "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20.4/assets/minecraft/textures/block/";
const itemUrl = "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20.4/assets/minecraft/textures/item/";

const EnchantmentList = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("Todos");

  const filters = [
    { label: "Todos", icon: blockUrl + "bookshelf.png" },
    { label: "Espadas", icon: itemUrl + "diamond_sword.png" },
    { label: "Arcos", icon: itemUrl + "bow_pulling_0.png" },
    { label: "Herramientas", icon: itemUrl + "diamond_pickaxe.png" },
    { label: "Armadura", icon: itemUrl + "diamond_chestplate.png" },
    { label: "Pesca", icon: itemUrl + "fishing_rod.png" },
    { label: "Varios", icon: itemUrl + "enchanted_book.png" },
  ];

  const filteredEnchants = enchantsData.filter(ench => {
    const matchesSearch = ench.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        ench.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = activeFilter === "Todos" || ench.applicableTo === activeFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="wiki-enchantments-container">
      <div className="wiki-filter-bar">
        {filters.map(filter => (
          <button 
            key={filter.label}
            className={`filter-btn ${activeFilter === filter.label ? 'active' : ''}`}
            onClick={() => setActiveFilter(filter.label)}
          >
            <img src={filter.icon} alt={filter.label} className="mc-pixelated" />
            <span>{filter.label}</span>
          </button>
        ))}
      </div>

      <div className="wiki-search-bar">
        <input 
          type="text" 
          placeholder="Buscar por nombre o efecto..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="enchantments-grid">
        {filteredEnchants.map(ench => (
          <div key={ench.id} className={`mc-tooltip-card ${ench.rarityClass || 'rarity-common'}`}>
            <div className="tooltip-inner">
              <div className="tooltip-header">
                <img src={itemUrl + "enchanted_book.png"} alt="Book" className="mc-pixelated" />
                <h4 className="enchant-name">{ench.name} {ench.maxLevel > 1 ? `I-${romanize(ench.maxLevel)}` : ''}</h4>
              </div>
              
              <div className="tooltip-content">
                <p className="enchant-description">{ench.description}</p>
                
                <div className="tooltip-lore">
                  <div className="lore-row">
                    <span className="lore-label">Aplicable a:</span>
                    <span className="lore-value text-material">{ench.applicableTo}</span>
                  </div>
                  <div className="lore-row">
                    <span className="lore-label">Rareza de aparición:</span>
                    <span className="lore-value text-highlight">{ench.weight}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Función auxiliar para números romanos
function romanize(num) {
  if (isNaN(num)) return num;
  const lookup = { M: 1000, CM: 900, D: 500, CD: 400, C: 100, XC: 90, L: 50, XL: 40, X: 10, IX: 9, V: 5, IV: 4, I: 1 };
  let roman = '';
  for (let i in lookup) {
    while (num >= lookup[i]) {
      roman += i;
      num -= lookup[i];
    }
  }
  return roman;
}

export default EnchantmentList;
