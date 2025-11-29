import React from "react";
import "../../styles/components/Landpage/_sectiondivider2.scss";

const SectionDivider2 = () => {
  return (
    <div className="section-divider2" aria-hidden="true">
      {/* Barra completa */}
      <img
        className="section-divider2__bar"
        src="/assets/dividerbattle.webp"
        alt=""
      />

      {/* Medalla centrada encima */}
      <img
        className="section-divider2__medal"
        src="/assets/medalladivider.webp"
        alt=""
      />
    </div>
  );
};

export default SectionDivider2;
