import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

const FACTORIES_DIR = 'C:/Users/Crystalchemist/Desktop/workspasce1/DeluxeMenus/gui_menus/factories';
const OUTPUT_FILE = './src/data/factories.json';

async function extractFactories() {
  try {
    const files = fs.readdirSync(FACTORIES_DIR).filter(file => 
      file.endsWith('.yml') && 
      !file.includes('menu_') && 
      !file.includes('all') &&
      !file.includes('research') &&
      file !== 'factories_rewards.yml'
    );
    
    const factories = [];

    for (const file of files) {
      const filePath = path.join(FACTORIES_DIR, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const data = yaml.load(content);

      if (data && data.items) {
        // Buscamos el item que representa la producción del Tier 1 (por ejemplo)
        const ongoingItem = data.items.factories_1_ongoing;
        const completedItem = data.items.factories_1_completed;

        if (ongoingItem && completedItem) {
          const name = ongoingItem.display_name.replace(/&[0-9a-fk-or]/g, '').replace(/ᴘʀᴏᴅᴜᴄᴄɪᴏɴ ᴇɴ ᴄᴜʀsᴏ|/g, '').trim();
          
          // Intentar extraer la cantidad del lore
          let production = "Desconocida";
          if (ongoingItem.lore) {
            const prodLine = ongoingItem.lore.find(line => line.includes('Producción:'));
            if (prodLine) production = prodLine.replace(/&[0-9a-fk-or]/g, '').replace('Producción:', '').trim();
          }

          factories.push({
            id: file.replace('factories_', '').replace('.yml', ''),
            name: name || file.replace('factories_', '').replace('.yml', ''),
            material: ongoingItem.material,
            production: production,
            command: data.open_command
          });
        }
      }
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(factories, null, 2));
    console.log(`✅ Extraídas ${factories.length} factorías en ${OUTPUT_FILE}`);
  } catch (error) {
    console.error('❌ Error extrayendo factorías:', error);
  }
}

extractFactories();
