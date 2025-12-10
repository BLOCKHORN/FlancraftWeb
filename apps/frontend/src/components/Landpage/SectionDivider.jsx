// src/components/Landpage/SectionDivider.jsx
import React from "react";
import "../../styles/components/Landpage/_sectiondivider.scss";

const SectionDivider = () => {
  return (
    <div className="section-divider" aria-hidden="true">
      <img
        className="section-divider__image"
        src="/assets/Divider.webp"
        alt=""
      />
    </div>
  );
};

export default SectionDivider;
