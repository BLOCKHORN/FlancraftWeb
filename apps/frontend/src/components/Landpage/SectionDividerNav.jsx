// src/components/Landpage/SectionDividerNav.jsx
import React from "react";
import "../../styles/components/Landpage/_sectiondivider-nav.scss";

const SectionDividerNav = () => {
  return (
    <div className="nav-divider-frame" aria-hidden="true">
      {/* Barra central (Divider) */}
      <img
        className="nav-divider"
        src="/assets/Divider.webp"
        alt=""
      />

      {/* Esquina izquierda */}
      <img
        className="nav-corner nav-corner--left"
        src="/assets/bordeleftnav.webp"
        alt=""
      />

      {/* Esquina derecha */}
      <img
        className="nav-corner nav-corner--right"
        src="/assets/borderightnav.webp"
        alt=""
      />
    </div>
  );
};

export default SectionDividerNav;
