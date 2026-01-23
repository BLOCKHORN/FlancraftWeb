import "./LeaderboardsPagination.scss";
export default function LeaderboardsPagination({ paginasTotales, paginaActual, onGo }) {
  return (
    <div className="lb-pagination">
      {[...Array(paginasTotales)].map((_, idx) => (
        <button
          key={idx}
          className={paginaActual === idx + 1 ? "active" : ""}
          onClick={() => onGo(idx)}
          aria-label={`Página ${idx + 1}`}
        >
          {idx + 1}
        </button>
      ))}
    </div>
  );
}
