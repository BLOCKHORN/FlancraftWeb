// src/components/Estadisticas/parts/LeaderboardsToolbar.jsx
import { useEffect, useRef } from "react";
import { Search, SlidersHorizontal, X, ChevronDown } from "lucide-react";
import { cn } from "../leaderboards.utils";
import { LABELS, STAT_HELP } from "../leaderboards.constants";
import "./LeaderboardsToolbar.scss";

export default function LeaderboardsToolbar({
  query,
  setQuery,
  filtersOpen,
  setFiltersOpen,
  soloVinculados,
  setSoloVinculados,
  servidorApi,
  orden,
  setOrden,
  setOrdenAsc,
  setOffset,
  STATS,
  datosFiltradosLen,

  totalRows,
  limit,
  offset,
  onSearch,
}) {
  const lastQueryRef = useRef(query);

  useEffect(() => {
    const q = (query || "").trim();

    if (q.length >= 2) {
      onSearch?.(q);
      if (lastQueryRef.current !== q) setOffset(0);
    } else {
      if (lastQueryRef.current && !q) onSearch?.("");
    }

    lastQueryRef.current = q;
  }, [query, onSearch, setOffset]);

  const resultsLabel = Number.isFinite(totalRows)
    ? totalRows
    : datosFiltradosLen;

  const pageLabel = Number.isFinite(totalRows)
    ? `${Math.floor((offset || 0) / (limit || 1)) + 1}/${Math.max(
        1,
        Math.ceil((totalRows || 0) / (limit || 1))
      )}`
    : null;

  return (
    <section className="lb-toolbar">
      <div className="lb-search">
        <Search size={18} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar jugador…"
          spellCheck={false}
        />
        {query && (
          <button
            className="lb-clear"
            onClick={() => setQuery("")}
            type="button"
            aria-label="Limpiar"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <button
        type="button"
        className={cn("lb-filterBtn", { active: filtersOpen })}
        onClick={() => setFiltersOpen((v) => !v)}
        title="Filtros"
      >
        <SlidersHorizontal size={18} />
        <span>Filtros</span>
      </button>

      <div className="lb-mobileOrder">
        <div className="lb-select">
          <span className="lb-select__k">Orden</span>
          <select
            value={servidorApi === "gens" ? "genpoints" : orden}
            onChange={(e) => {
              const v = e.target.value;
              if (servidorApi === "gens") return;
              setOrden(v);
              setOrdenAsc(v === "mejor_tiempo");
              setOffset(0);
            }}
            disabled={servidorApi === "gens"}
          >
            {(servidorApi === "gens" ? ["genpoints"] : STATS).map((st) => (
              <option key={st} value={st}>
                {LABELS[st] || st}
              </option>
            ))}
          </select>
          <ChevronDown size={16} />
        </div>

        {servidorApi === "gens" ? (
          <div className="lb-orderHint">{STAT_HELP.genpoints}</div>
        ) : (
          STAT_HELP[orden] && <div className="lb-orderHint">{STAT_HELP[orden]}</div>
        )}
      </div>

      {filtersOpen && (
        <div className="lb-filtersPanel">
          <label className={cn("lb-toggle", { on: soloVinculados })}>
            <input
              type="checkbox"
              checked={soloVinculados}
              onChange={(e) => {
                setSoloVinculados(e.target.checked);
                setOffset(0);
              }}
            />
            <span>Solo vinculados</span>
          </label>

          <button
            type="button"
            className="lb-reset"
            onClick={() => {
              setQuery("");
              setSoloVinculados(false);
              setOffset(0);
              onSearch?.("");
            }}
          >
            Reset
          </button>

          <div className="lb-count">
            <span className="lb-count__k">Resultados</span>
            <span className="lb-count__v">{resultsLabel}</span>
          </div>

          {pageLabel && (
            <div className="lb-count lb-count--page">
              <span className="lb-count__k">Página</span>
              <span className="lb-count__v">{pageLabel}</span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
