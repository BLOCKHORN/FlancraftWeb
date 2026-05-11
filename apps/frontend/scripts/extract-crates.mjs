import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

const CRATES_DIR = 'C:/Users/Crystalchemist/Desktop/workspasce1/ExcellentCrates/crates';
const OUTPUT_FILE = './src/data/crates.json';

async function extractCrates() {
  try {
    const files = fs.readdirSync(CRATES_DIR).filter(file => file.endsWith('.yml') && file !== 'caja_keyall.yml');
    const crates = [];

    for (const file of files) {
      const filePath = path.join(CRATES_DIR, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const data = yaml.load(content);

      if (data && data.Rewards && data.Rewards.List) {
        const rewardList = data.Rewards.List;
        const totalWeight = Object.values(rewardList).reduce((sum, r) => sum + (r.Weight || 0), 0);
        
        const rewards = Object.entries(rewardList).map(([id, r]) => {
          const rawName = r.Name || id;
          const cleanName = rawName.replace(/<[^>]*>/g, '').replace(/&[0-9a-fk-or]/g, '').trim();
          const chance = ((r.Weight / totalWeight) * 100).toFixed(2);
          
          return {
            id,
            name: cleanName,
            chance: parseFloat(chance),
            rarity: r.Rarity || 'common'
          };
        }).sort((a, b) => b.chance - a.chance).slice(0, 10); // Top 10 premios

        crates.push({
          id: file.replace('.yml', ''),
          name: data.Name ? data.Name.replace(/&[0-9a-fk-or]/g, '') : file.replace('.yml', ''),
          rewards
        });
      }
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(crates, null, 2));
    console.log(`✅ Extraídas ${crates.length} cajas en ${OUTPUT_FILE}`);
  } catch (error) {
    console.error('❌ Error extrayendo cajas:', error);
  }
}

extractCrates();
