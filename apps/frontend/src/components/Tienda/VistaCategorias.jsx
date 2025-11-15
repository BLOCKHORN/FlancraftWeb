import React from "react";
import { useNavigate } from "react-router-dom";

const VistaCategorias = ({ categoriasAgrupadas = [] }) => {
  const navigate = useNavigate();

  return (
    <div className="categorias-grid">
      {categoriasAgrupadas
        .filter((cat) => Array.isArray(cat.subcategorias) && cat.subcategorias.length > 0)
        .map((cat) => {
          const slug = cat.name.toLowerCase().replace(/ /g, "-");
          return (
            <div
              key={cat.id}
              className="categoria-card"
              onClick={() => navigate(`/tienda/categoria/${slug}`)}
            >
              <img src={cat.image} alt={cat.name} />
              <h2>{cat.name}</h2>
              <button>Ver productos</button>
            </div>
          );
        })}
    </div>
  );
};

export default VistaCategorias;
