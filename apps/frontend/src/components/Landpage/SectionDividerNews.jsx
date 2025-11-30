// src/components/Landpage/SectionDividerNews.jsx
import React from "react";
import "../../styles/components/Landpage/_sectiondivider-news.scss";

const SectionDividerNews = () => {
  return (
    <div className="section-news-divider" aria-hidden="true">
      <img className="snews-divider" src="/assets/Divider.png" alt="" />

      <div className="snews-rune">
        <img className="snews-rune-base" src="/assets/runa.webp" alt="" />

        <div className="snews-glyph">
          {/* logo “normal” */}
          <img
            className="snews-glyph-base"
            src="/assets/runanoticia.webp"
            alt=""
          />
          {/* misma imagen, pero solo para el glow */}
          <img
            className="snews-glyph-glow"
            src="/assets/runanoticia.webp"
            alt=""
          />
        </div>
      </div>
    </div>
  );
};

export default SectionDividerNews;
