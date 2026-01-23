import { LABELS } from "../leaderboards.constants";
import "./LeaderboardsHeader.scss";
export default function LeaderboardsHeader({ servidorSeleccionado, servidorApi, orden, ordenAsc, paginaActual, paginasTotales }) {
  return (
    <div className="lb-topHeader">
      <header className="lb-header">
        <div className="lb-header__center">
          <h1 className="lb-title">Ranking Flancraft</h1>
          <h2 className="lb-subtitle">
            <span className="lb-subtitle__server">{servidorSeleccionado?.nombre}</span>
            <span className="lb-dot">•</span>
            <span className="lb-subtitle__order">
              {servidorApi === "gens" ? "GENPOINTS ▼" : `${LABELS[orden] || orden} ${ordenAsc ? "▲" : "▼"}`}
            </span>
          </h2>
        </div>

        <div className="lb-header__right">
          <div className="lb-pagePill">
            <span>Página</span>
            <b>
              {paginaActual}/{paginasTotales}
            </b>
          </div>
        </div>
      </header>
    </div>
  );
}
