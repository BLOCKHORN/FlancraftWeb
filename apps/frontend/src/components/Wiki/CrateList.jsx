import React from "react";
import cratesData from "../../data/crates.json";

const blockUrl = "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20.4/assets/minecraft/textures/block/";

const CrateList = () => {
  return (
    <div className="wiki-crates-container">
      <div className="crates-grid">
        {cratesData.map(crate => (
          <div key={crate.id} className="crate-card">
            <div className="crate-header">
              <img src={blockUrl + "chest.png"} alt={crate.name} />
              <h4>{crate.name}</h4>
            </div>
            <div className="crate-body">
              <h5>Premios Destacados:</h5>
              <ul className="reward-list">
                {crate.rewards.map((reward, idx) => (
                  <li key={idx} className={`rarity-${reward.rarity}`}>
                    <span className="reward-name">{reward.name}</span>
                    <span className="reward-chance">{reward.chance}%</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CrateList;
