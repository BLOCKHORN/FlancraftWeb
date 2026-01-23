import { cn } from "../leaderboards.utils";
import { SERVIDORES } from "../leaderboards.constants";
import "./LeaderboardsServers.scss";
export default function LeaderboardsServers({ servidor, setServidor }) {
  return (
    <section className="lb-servers">
      <div className="server-rail">
        <div className="server-grid" role="tablist" aria-label="Servidores">
          {SERVIDORES.map((s) => (
            <button
              key={s.id}
              type="button"
              className={cn("server-pill", { active: servidor === s.id })}
              onClick={() => setServidor(s.id)}
              role="tab"
              aria-selected={servidor === s.id}
            >
              <div className="server-pill__iconWrap">
                <img className="server-pill__icon" src={s.imagen} alt="" />
              </div>

              <div className="server-pill__label">{s.nombre}</div>
              <div className="server-pill__underline" />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
