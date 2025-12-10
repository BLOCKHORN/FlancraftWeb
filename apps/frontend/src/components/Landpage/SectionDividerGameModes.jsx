// src/components/Landpage/SectionDividerGameModes.jsx
import React from "react";
import "../../styles/components/Landpage/_sectiondivider-gamemodes.scss";

const SectionDividerGameModes = () => {
  return (
    <div className="section-gamemodes-frame" aria-hidden="true">
      {/* Barras superior e inferior */}
      <img
        className="sgm-divider sgm-divider--top"
        src="/assets/dividergame.webp"
        alt=""
      />
      <img
        className="sgm-divider sgm-divider--bottom"
        src="/assets/dividergame.webp"
        alt=""
      />

      {/* Icono central superior */}
      <img
        className="sgm-icon sgm-icon--top"
        src="/assets/iconoborde.webp"
        alt=""
      />

      {/* Esquinas */}
      <img
        className="sgm-corner sgm-corner--tl"
        src="/assets/bordetopleft.webp"
        alt=""
      />
      <img
        className="sgm-corner sgm-corner--tr"
        src="/assets/bordetopright.webp"
        alt=""
      />
      <img
        className="sgm-corner sgm-corner--bl"
        src="/assets/bordebotleft.webp"
        alt=""
      />
      <img
        className="sgm-corner sgm-corner--br"
        src="/assets/bordebotright.webp"
        alt=""
      />
    </div>
  );
};

export default SectionDividerGameModes;
