import React from "react";
import auraSkillsData from "../../data/auraskills.json";

const itemUrl = "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20.4/assets/minecraft/textures/item/";

const AuraSkillsList = () => {
  return (
    <div className="wiki-auraskills-container" style={{ marginTop: '2rem' }}>
      <h2>ÁRBOLES DE HABILIDADES</h2>
      <p>Progresa en estas ramas para ganar experiencia y potenciar tus atributos pasivos de AuraSkills.</p>
      
      <div className="jobs-grid">
        {auraSkillsData.skills.map(skill => (
          <div key={skill.id} className="job-card">
            <div className="job-header">
              <h4>{skill.name}</h4>
              <span className="job-level">Max Lvl: 100</span>
            </div>
            <p className="job-desc">{skill.description}</p>
          </div>
        ))}
      </div>

      <h2 style={{ marginTop: '2rem' }}>ATRIBUTOS Y ESTADÍSTICAS</h2>
      <p>Aumentar tus habilidades te otorga puntos pasivos en las siguientes estadísticas globales:</p>

      <div className="jobs-grid">
        {auraSkillsData.stats.map(stat => (
          <div key={stat.id} className="job-card" style={{ borderColor: 'var(--color-highlight)' }}>
            <div className="job-header">
              <h4>{stat.name}</h4>
            </div>
            <p className="job-desc">{stat.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AuraSkillsList;
