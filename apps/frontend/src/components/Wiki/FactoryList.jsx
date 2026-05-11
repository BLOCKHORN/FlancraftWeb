import React, { useState } from "react";
import factoriesData from "../../data/factories.json";
import CopyCommand from "./Shared/CopyCommand";
import WikiMarkdown from "./WikiMarkdown";

const blockUrl = "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20.4/assets/minecraft/textures/block/";
const itemUrl = "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20.4/assets/minecraft/textures/item/";

const FactoryList = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredFactories = factoriesData.filter(f => 
    f.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="wiki-factories-container">
      <WikiMarkdown fileName="factorias" />
      
      <div className="wiki-search-bar" style={{ marginTop: '2rem' }}>
        <input 
          type="text" 
          placeholder="Buscar unidad industrial por nombre..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="factories-grid">
        {filteredFactories.map(factory => (
          <div key={factory.id} className="factory-card">
            <div className="factory-header">
              <div className="factory-icon-box">
                <img 
                  src={blockUrl + factory.material.toLowerCase() + ".png"} 
                  alt={factory.name}
                  onError={(e) => { e.target.src = itemUrl + factory.material.toLowerCase() + ".png"; }}
                />
              </div>
              <div className="factory-title-group">
                <h4>{factory.name}</h4>
                <span className="id-tag">REF: {factory.id.toUpperCase()}</span>
              </div>
            </div>
            <div className="factory-body">
              <div className="production-data">
                <span className="label">SALIDA DE CICLO:</span>
                <span className="value">{factory.production}</span>
              </div>
              <div className="factory-command-group">
                <span className="label">PROTOCOL:</span>
                <CopyCommand command={`/${factory.command}`} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FactoryList;
