// src/components/Estadisticas/parts/LeaderboardsPodium.jsx
import { cn, formatInt, safeNum } from "../leaderboards.utils";
import { MEDALLAS } from "../leaderboards.constants";
import NameLink from "../ui/NameLink";
import "./LeaderboardsPodium.scss";

function getNetworkPointsStrict(p) {
  const n = safeNum(p?.network_points);
  return Number.isFinite(n) ? n : 0;
}

export default function LeaderboardsPodium({ top3, getMeta, onOpenPerfil }) {
  const list = Array.isArray(top3) ? top3 : [];
  if (list.length !== 3) return null;

  return (
    <section className="lb-podium">
      {list.map((p, idx) => {
        const absPos = idx + 1;
        const medal = MEDALLAS[absPos];
        const meta = getMeta?.(p?.uuid);
        const name = p?.nombre_minecraft;

        const platform = (p?.plataforma || p?.platform || "")
          .toString()
          .toLowerCase();

        const points = getNetworkPointsStrict(p);

        return (
          <div
            key={`${p?.uuid || "x"}-${idx}`}
            className={cn("pod-card", `pod-card--${absPos}`)}
          >
            <div className="pod-card__medal" aria-hidden="true">
              {medal ? <img src={medal} alt="" /> : null}
            </div>

            <div className="pod-top">
              <img
                className="pod-head"
                src={`https://mc-heads.net/avatar/${name}/72`}
                alt=""
                loading="lazy"
                onError={(e) => (e.currentTarget.src = "/assets/default-head.png")}
                draggable={false}
              />
            </div>

            <div className="pod-nameLine">
              <NameLink player={p} className="pod-name" onOpen={onOpenPerfil} />
            </div>

            <div className="pod-badges">
              {(platform === "bedrock" || platform === "java") && (
                <span
                  className={cn("lb-badge-platform", {
                    bedrock: platform === "bedrock",
                    java: platform === "java",
                  })}
                >
                  {platform === "bedrock" ? "BEDROCK" : "JAVA"}
                </span>
              )}

              {meta?.rango && (
                <img
                  src={`/assets/rangos/${meta.rango}.webp`}
                  alt={`Rango ${meta.rango}`}
                  className="lb-badge-rango"
                  loading="lazy"
                  draggable={false}
                />
              )}
            </div>

            <div className="pod-stat">
              <span className="pod-stat__k">NETWORK POINTS</span>
              <span className="pod-stat__v">{formatInt(points)}</span>
            </div>
          </div>
        );
      })}
    </section>
  );
}
