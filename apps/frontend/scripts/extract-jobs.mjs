import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

const JOBS_DIR = 'C:/Users/Crystalchemist/Desktop/workspasce1/Jobs/jobs';
const OUTPUT_FILE = './src/data/jobs.json';

async function extractJobs() {
  try {
    const files = fs.readdirSync(JOBS_DIR).filter(file => file.endsWith('.yml') && file !== '_EXAMPLE.yml');
    const jobs = [];

    for (const file of files) {
      const filePath = path.join(JOBS_DIR, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const data = yaml.load(content);

      const jobKey = Object.keys(data)[0];
      const jobData = data[jobKey];

      if (jobData) {
        // Extraer algunas acciones de ejemplo (las que más pagan)
        const breakActions = jobData.Break || {};
        const topActions = Object.entries(breakActions)
          .map(([item, values]) => ({ item, income: values.income }))
          .sort((a, b) => b.income - a.income)
          .slice(0, 5);

        jobs.push({
          id: file.replace('.yml', ''),
          name: jobData.fullname || jobKey,
          description: Array.isArray(jobData.FullDescription) 
            ? jobData.FullDescription.join(' ') 
            : (jobData.FullDescription || 'Sin descripción'),
          maxLevel: jobData['max-level'] || 100,
          topActions
        });
      }
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(jobs, null, 2));
    console.log(`✅ Extraídos ${jobs.length} trabajos en ${OUTPUT_FILE}`);
  } catch (error) {
    console.error('❌ Error extrayendo trabajos:', error);
  }
}

extractJobs();
