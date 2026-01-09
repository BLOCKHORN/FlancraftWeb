// apps/frontend/src/components/Tienda/details/ProductDetailsItemsOP.jsx
import React from "react";
import "../../../styles/components/Tienda/details/itemsopDetails.scss";
import ItemsOpTooltipCard from "./ItemsOpTooltipCard.jsx";

export default function ProductDetailsItemsOP({ data }) {
  const notes = Array.isArray(data?.notes) ? data.notes : [];

  return (
    <div className="pd pd--itemsop-single">
      <div className="itemsop__wrap">
        <div className="itemsop__tooltip">
          <ItemsOpTooltipCard data={data} />
        </div>

        {notes.length ? (
          <div className="itemsop__notes">
            <div className="itemsop__notesH">Importante</div>
            <ul className="itemsop__notesList">
              {notes.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
