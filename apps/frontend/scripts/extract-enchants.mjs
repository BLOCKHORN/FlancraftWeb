import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

const ENCHANTS_DIR = 'C:/Users/Crystalchemist/Desktop/workspasce1/ExcellentEnchants/enchants';
const OUTPUT_FILE = './src/data/enchants.json';

// Función para limpiar y HUMANIZAR texto eliminando marcadores de plugin
function cleanMinecraftText(text) {
  if (!text) return 'Sin descripción';
  
  let clean = text
    .replace(/<[^>]*>/g, '') // Elimina tags tipo <gray>
    .replace(/&[0-9a-fk-or]/g, '') // Elimina códigos &7
    .replace(/aplciar/g, 'aplicar') // Corregir errata común
    .trim();

  // ELIMINAR CUALQUIER MARCADOR ENTRE % (ej: %enchantment_trigger_chance%)
  // Reemplazamos patrones específicos por palabras legibles
  clean = clean.replace(/%[a-z_]*chance%/gi, 'Probabilidad');
  clean = clean.replace(/%[a-z_]*duration%/gi, 'unos segundos');
  clean = clean.replace(/%[a-z_]*level%/gi, '');
  clean = clean.replace(/%[a-z_]*type%/gi, 'efecto');
  
  // Limpieza genérica de cualquier marcador restante %...%
  clean = clean.replace(/%[a-z0-9_]+%/gi, 'X');
  
  // Limpieza de dobles espacios y símbolos huérfanos
  clean = clean
    .replace(/\(s\.\)/g, 'segundos')
    .replace(/\(\)/g, '')
    .replace(/\s+/g, ' ')
    .replace(/XX%/g, 'Probabilidad')
    .trim();

  // Traducción final para que suene natural
  clean = clean
    .replace(/Probabilidad% de aplicar/gi, 'Probabilidad de aplicar')
    .replace(/Probabilidad% de/gi, 'Probabilidad de')
    .replace(/X❤/gi, 'daño extra')
    .replace(/X%/gi, 'un porcentaje');

  return clean;
}

async function extractEnchants() {
  try {
    const files = fs.readdirSync(ENCHANTS_DIR).filter(file => file.endsWith('.yml'));
    const enchants = [];

    for (const file of files) {
      const filePath = path.join(ENCHANTS_DIR, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const data = yaml.load(content);

      if (data && data.Definition) {
        const def = data.Definition;
        
        let applicableTo = "Varios";
        const id = file.toLowerCase();
        if (id.includes('bow') || id.includes('arrow')) applicableTo = "Arcos";
        else if (id.includes('miner') || id.includes('mining') || id.includes('digger') || id.includes('pickaxe')) applicableTo = "Herramientas";
        else if (id.includes('sword') || id.includes('strike') || id.includes('confusion') || id.includes('vampire')) applicableTo = "Espadas";
        else if (id.includes('protection') || id.includes('hardened') || id.includes('shield')) applicableTo = "Armadura";
        else if (id.includes('angler') || id.includes('river') || id.includes('catch')) applicableTo = "Pesca";

        const weight = def.Weight || 10;
        let rarityClass = "rarity-common"; // verde
        if (weight <= 2) rarityClass = "rarity-legendary"; // naranja o morado muy fuerte
        else if (weight <= 5) rarityClass = "rarity-epic"; // morado
        else if (weight <= 8) rarityClass = "rarity-rare"; // azul

        enchants.push({
          id: file.replace('.yml', ''),
          name: cleanMinecraftText(def.DisplayName || file.replace('.yml', '')),
          description: Array.isArray(def.Description) 
            ? def.Description.map(line => cleanMinecraftText(line)).join(' ') 
            : cleanMinecraftText(def.Description),
          maxLevel: def.MaxLevel || 1,
          weight: weight,
          applicableTo: applicableTo,
          rarityClass: rarityClass
        });
      }
    }

    enchants.sort((a, b) => a.name.localeCompare(b.name));
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(enchants, null, 2));
    console.log(`✅ Marcadores técnicos eliminados de ${enchants.length} encantamientos.`);
  } catch (error) {
    console.error('❌ Error limpiando marcadores:', error);
  }
}

extractEnchants();
