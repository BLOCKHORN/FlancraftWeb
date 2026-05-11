import React from "react";
import jobsData from "../../data/jobs.json";

const blockUrl = "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20.4/assets/minecraft/textures/block/";
const itemUrl = "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20.4/assets/minecraft/textures/item/";

const JobList = () => {
  return (
    <div className="wiki-jobs-container">
      <div className="jobs-grid">
        {jobsData.map(job => (
          <div key={job.id} className="job-card">
            <div className="job-header">
              <h4>{job.name}</h4>
              <span className="job-level">Max Lvl: {job.maxLevel}</span>
            </div>
            <p className="job-desc">{job.description}</p>
            <div className="job-actions">
              <h5>Mejores ingresos:</h5>
              <ul>
                {job.topActions.map((action, idx) => (
                  <li key={idx}>
                    <code>{action.item.replace(/_/g, ' ')}</code>: <span className="income">${action.income}</span>
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

export default JobList;
