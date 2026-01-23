// src/components/Estadisticas/parts/LeaderboardsPodium.jsx

import { cn, formatInt, safeNum } from "../leaderboards.utils";
import { MEDALLAS } from "../leaderboards.constants";
import { computeGensScore } from "../leaderboards.gens";
import NameLink from "../ui/NameLink";
import "./LeaderboardsPodium.scss";

/**
 * ✅ Network Points:
 * - Ideal: que el backend mande `network_points`.
 * - Mientras tanto, fallback:
 *   - suma cualquier clave que acabe en `_points` (ej: survival_points, oneblock_points, parkour_points...)
 *   - y si no hay ninguna, usa `genpoints` (o computeGensScore) como fallback temporal.
 *
 * Nota: en cuanto tengas puntos reales por modalidad, manda `network_points` y listo.
 */
function getNetworkPoints(p) {
  if (!p) return 0;

  // 1) preferido (backend)
  const direct = safeNum(p?.network_points);
  if (direct > 0) return direct;

  // 2) suma de * _points (por modalidad)
  let sum = 0;
  let foundAny = false;

  for (const [k, v] of Object.entries(p)) {
    if (!k) continue;
    if (!k.endsWith("_points")) continue;
    if (k === "network_points") continue;

    const n = safeNum(v);
    if (n > 0) {
      sum += n;
      foundAny = true;
    }
  }

  if (foundAny) return sum;

  // 3) fallback temporal (mientras solo existe gens)
  const gp = safeNum(p?.genpoints) || computeGensScore(p);
  return safeNum(gp);
}

export default function LeaderboardsPodium({
  top3,
  getMeta,
  onOpenPerfil,
}) {
  return (
    <section className="lb-podium">
      {(top3 || []).map((p, idx) => {
        const absPos = idx + 1;
        const medal = MEDALLAS[absPos];
        const meta = getMeta?.(p?.uuid);
        const name = p?.nombre_minecraft;

        const platform = (p?.plataforma || p?.platform || "")
          .toString()
          .toLowerCase();

        const points = getNetworkPoints(p);

        return (
          <div
            key={`${p?.uuid || "x"}-${idx}`}
            className={cn("pod-card", `pod-card--${absPos}`)}
          >
            {/* Trofeo (top1/top2/top3) */}
            <div className="pod-card__medal" aria-hidden="true">
              {medal ? <img src={medal} alt="" /> : null}
            </div>

            {/* Cabeza centrada arriba */}
            <div className="pod-top">
              <img
                className="pod-head"
                src={`https://mc-heads.net/avatar/${name}/72`}
                alt=""
                loading="lazy"
                onError={(e) => (e.currentTarget.src = "/assets/default-head.png")}
              />
            </div>

            {/* Nombre */}
            <div className="pod-nameLine">
              <NameLink player={p} className="pod-name" onOpen={onOpenPerfil} />
            </div>

            {/* Badges: platform + rango */}
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
                />
              )}
            </div>

            {/* Network Points */}
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
