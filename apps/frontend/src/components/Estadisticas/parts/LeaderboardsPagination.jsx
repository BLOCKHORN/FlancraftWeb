// src/components/Estadisticas/parts/LeaderboardsPagination.jsx
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "../leaderboards.utils"; // si no quieres cn, te lo quito
import "./LeaderboardsPagination.scss";

function buildPagination(totalPages, currentPage, siblingCount = 2) {
  // Devuelve array de items: número o "..."
  if (totalPages <= 1) return [1];

  const firstPage = 1;
  const lastPage = totalPages;

  const leftSibling = Math.max(currentPage - siblingCount, firstPage);
  const rightSibling = Math.min(currentPage + siblingCount, lastPage);

  const showLeftEllipsis = leftSibling > firstPage + 1;
  const showRightEllipsis = rightSibling < lastPage - 1;

  const pages = [];

  // Siempre mostramos la primera
  pages.push(firstPage);

  // Izquierda: ellipsis o rango directo
  if (showLeftEllipsis) {
    pages.push("...");
  } else {
    for (let p = firstPage + 1; p < leftSibling; p++) pages.push(p);
  }

  // Centro
  for (let p = leftSibling; p <= rightSibling; p++) {
    if (p !== firstPage && p !== lastPage) pages.push(p);
  }

  // Derecha
  if (showRightEllipsis) {
    pages.push("...");
  } else {
    for (let p = rightSibling + 1; p < lastPage; p++) pages.push(p);
  }

  // Siempre mostramos la última (si no es la primera)
  if (lastPage !== firstPage) pages.push(lastPage);

  // Limpieza de duplicados por si acaso
  return pages.filter((v, i, arr) => (v === "..." ? true : arr.indexOf(v) === i));
}

export default function LeaderboardsPagination({
  paginasTotales,
  paginaActual, // 1-based
  onGo, // recibe página 1-based
  siblingCount = 2,
}) {
  const total = Math.max(1, Number(paginasTotales || 1));
  const current = Math.min(Math.max(1, Number(paginaActual || 1)), total);

  const items = buildPagination(total, current, siblingCount);

  const canPrev = current > 1;
  const canNext = current < total;

  const go = (p) => {
    const page = Math.min(Math.max(1, p), total);
    if (page === current) return;
    onGo?.(page);
  };

  return (
    <nav className="lb-pagination" aria-label="Paginación">
      <div className="lb-pagination__inner">
        <button
          className="lb-pageBtn lb-pageBtn--nav"
          onClick={() => go(1)}
          disabled={!canPrev}
          aria-label="Primera página"
          title="Primera"
          type="button"
        >
          <ChevronsLeft size={16} />
        </button>

        <button
          className="lb-pageBtn lb-pageBtn--nav"
          onClick={() => go(current - 1)}
          disabled={!canPrev}
          aria-label="Página anterior"
          title="Anterior"
          type="button"
        >
          <ChevronLeft size={16} />
        </button>

        <div className="lb-pages" role="list">
          {items.map((it, idx) => {
            if (it === "...") {
              return (
                <span key={`dots-${idx}`} className="lb-ellipsis" aria-hidden="true">
                  …
                </span>
              );
            }

            const page = it;
            const isActive = page === current;

            return (
              <button
                key={page}
                type="button"
                role="listitem"
                className={cn("lb-pageBtn", { active: isActive })}
                onClick={() => go(page)}
                aria-label={`Página ${page}`}
                aria-current={isActive ? "page" : undefined}
              >
                {page}
              </button>
            );
          })}
        </div>

        <button
          className="lb-pageBtn lb-pageBtn--nav"
          onClick={() => go(current + 1)}
          disabled={!canNext}
          aria-label="Página siguiente"
          title="Siguiente"
          type="button"
        >
          <ChevronRight size={16} />
        </button>

        <button
          className="lb-pageBtn lb-pageBtn--nav"
          onClick={() => go(total)}
          disabled={!canNext}
          aria-label="Última página"
          title="Última"
          type="button"
        >
          <ChevronsRight size={16} />
        </button>

        <div className="lb-pagination__meta" aria-label="Estado paginación">
          <span className="lb-metaText">
            Página <b>{current}</b> / <b>{total}</b>
          </span>
        </div>
      </div>
    </nav>
  );
}
