import React, { useEffect } from "react";
import { useParams, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { wikiData } from "../../data/wiki-data.jsx";
import EnchantmentList from "./EnchantmentList";
import JobList from "./JobList";
import FactoryList from "./FactoryList";
import CrateList from "./CrateList";
import WikiMarkdown from "./WikiMarkdown";

const WikiSection = () => {
  const { section } = useParams();
  const data = wikiData[section];

  useEffect(() => {
    if (data) {
      document.title = `${data.title} | Flancraft Wiki`;
      
      let metaDescription = document.querySelector('meta[name="description"]');
      if (!metaDescription) {
        metaDescription = document.createElement('meta');
        metaDescription.name = "description";
        document.head.appendChild(metaDescription);
      }
      metaDescription.content = `Aprende todo sobre ${data.title} en la Wiki Oficial de Flancraft.`;
      
      let ogTitle = document.querySelector('meta[property="og:title"]');
      if (!ogTitle) {
        ogTitle = document.createElement('meta');
        ogTitle.setAttribute("property", "og:title");
        document.head.appendChild(ogTitle);
      }
      ogTitle.content = `${data.title} | Flancraft Wiki`;
    }
  }, [data]);

  if (!data) return <Navigate to="/wiki" replace />;

  const renderContent = () => {
    if (data.type === "component") {
      switch (data.component) {
        case "EnchantmentList": return <EnchantmentList />;
        case "JobList": return <JobList />;
        case "FactoryList": return <FactoryList />;
        case "CrateList": return <CrateList />;
        default: return null;
      }
    }
    
    if (data.type === "markdown") {
      return <WikiMarkdown fileName={data.fileName} />;
    }

    return data.content;
  };

  return (
    <motion.div 
      className="wiki-section-detail"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <h1>{data.title}</h1>
      <div className="wiki-content">
        {renderContent()}
      </div>
    </motion.div>
  );
};

export default WikiSection;
