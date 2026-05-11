import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

const MESSAGES_FILE = 'C:/Users/Crystalchemist/Desktop/workspasce1/AuraSkills/messages/messages_es.yml';
const OUTPUT_FILE = './src/data/auraskills.json';

async function extractAuraSkills() {
  try {
    const content = fs.readFileSync(MESSAGES_FILE, 'utf8');
    const data = yaml.load(content);

    const skillsData = data.skills;
    const statsData = data.stats;
    
    if (!skillsData) {
        throw new Error("No skills found in messages_es.yml");
    }

    const skills = Object.entries(skillsData).map(([key, value]) => {
      // Filtrar aquellos que no tengan name
      if(!value || !value.name) return null;
      return {
        id: key,
        name: value.name,
        description: value.desc ? value.desc.replace('{xp_unit}', '').trim() : ''
      };
    }).filter(s => s !== null);

    const stats = statsData ? Object.entries(statsData).map(([key, value]) => {
        if(!value || !value.name) return null;
        return {
          id: key,
          name: value.name,
          description: value.desc || ''
        };
    }).filter(s => s !== null) : [];

    const finalData = {
        skills,
        stats
    };

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(finalData, null, 2));
    console.log(`✅ Extraídas ${skills.length} habilidades y ${stats.length} estadísticas en ${OUTPUT_FILE}`);
  } catch (error) {
    console.error('❌ Error extrayendo AuraSkills:', error);
  }
}

extractAuraSkills();
