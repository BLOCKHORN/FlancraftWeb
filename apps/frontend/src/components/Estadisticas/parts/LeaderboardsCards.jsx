import { ChevronRight } from "lucide-react";
import { cn, formatInt, formatMoney, safeNum } from "../leaderboards.utils";
import { MEDALLAS, LABELS, STAT_HELP } from "../leaderboards.constants";
import { computeGensScore, getGensValorTierInfo } from "../leaderboards.gens";
import Tooltip from "../ui/Tooltip";
import NameLink from "../ui/NameLink";
import { DualMoneyTooltip, GensValorTooltip } from "./GensTooltips";
import "./LeaderboardsCards.scss";

export default function LeaderboardsCards({
  loading,
  datosFiltrados,
  offset,
  servidorApi,
  STATS,
  orden,
  openCard,
  setOpenCard,
  getMeta,
  getPlatform,
  onOpenPerfil,
  formatearTiempo,
  formatValueNonGens,
  getIslandLevelLocal,
}) {
  return (
    <div className="lb-cards">
      {!loading &&
        datosFiltrados.map((p, i) => {
          const absPos = offset + i + 1;
          const meta = getMeta(p.uuid);
          const name = p?.nombre_minecraft;
          const medal = MEDALLAS[absPos] || null;
          const platform = getPlatform(p);

          const isOpen = openCard === `${p.uuid}-${absPos}`;
          const genpoints = servidorApi === "gens" ? safeNum(p?.genpoints) || computeGensScore(p) : null;
          const valorInfo = servidorApi === "gens" ? getGensValorTierInfo(p?.gens_value_total) : null;

          return (
            <div
              key={`m-${p.uuid}-${absPos}`}
              className={cn("lb-card", { top1: absPos === 1, top2: absPos === 2, top3: absPos === 3, open: isOpen })}
            >
              <div className="lb-card__top">
                <div className="lb-card__pos">{medal ? <img src={medal} alt="" /> : <span>#{absPos}</span>}</div>

                <img
                  className="lb-card__head"
                  src={`https://mc-heads.net/avatar/${name}/40`}
                  alt=""
                  loading="lazy"
                  onError={(e) => (e.currentTarget.src = "/assets/default-head.png")}
                />

                <div className="lb-card__who">
                  <div className="lb-nameRow">
                    <NameLink player={p} className="lb-name" onOpen={onOpenPerfil} />
                    <span className="lb-badges">
                      {platform && (
                        <span className={cn("lb-badge-platform", { bedrock: platform === "bedrock", java: platform === "java" })}>
                          {platform === "bedrock" ? "BEDROCK" : "JAVA"}
                        </span>
                      )}
                      {meta?.rango && <img src={`/assets/rangos/${meta.rango}.webp`} alt="" className="lb-badge-rango" loading="lazy" />}
                    </span>
                  </div>

                  <div className="lb-card__sub">{meta?.rango ? meta.rango : "—"}</div>
                </div>

                {servidorApi === "gens" && (
                  <button
                    type="button"
                    className="lb-card__detailsBtn"
                    onClick={(e) => {
                      e.stopPropagation();
                      const key = `${p.uuid}-${absPos}`;
                      setOpenCard((cur) => (cur === key ? null : key));
                    }}
                    aria-label="Ver detalles"
                  >
                    <span>Detalles</span>
                    <ChevronRight size={16} />
                  </button>
                )}
              </div>

              {servidorApi === "gens" ? (
                <>
                  <div className="lb-card__scoreRow">
                    <div className="lb-card__score">
                      <span className="k">
                        <Tooltip theme="header" content={<div className="tt-simple">{STAT_HELP.genpoints}</div>}>
                          <span className="k__tt">GENPOINTS</span>
                        </Tooltip>
                      </span>
                      <span className="v">{formatInt(genpoints)}</span>
                    </div>
                  </div>

                  <div className="lb-card__grid lb-card__grid--gens">
                    <div className="lb-card__stat">
                      <span className="k">
                        <Tooltip
                          theme={`tier-${valorInfo?.idx ?? 0}`}
                          content={<GensValorTooltip info={valorInfo} incomeH={p?.gens_income_h} tierMax={p?.gens_highest_tier} />}
                          maxWidth={380}
                        >
                          <span className="k__tt">Valor Isla</span>
                        </Tooltip>
                      </span>
                      <span className={cn("v", "v--pill", `gens-tier-${valorInfo?.idx ?? 0}`)}>
                        {valorInfo?.name}
                        {valorInfo?.nextMin != null ? ` • ${valorInfo.pct}%` : ""}
                      </span>
                      {valorInfo?.nextMin != null ? <span className="sub">Siguiente: {valorInfo.nextName}</span> : <span className="sub">Máximo</span>}
                    </div>

                    <div className="lb-card__stat">
                      <span className="k">
                        <Tooltip
                          theme="coins"
                          content={
                            <DualMoneyTooltip title="Coins" actual={safeNum(p?.coins_balance)} total={safeNum(p?.coins_ganadas_total)} kind="coins" />
                          }
                        >
                          <span className="k__tt">Coins</span>
                        </Tooltip>
                      </span>
                      <span className="v v--pill v--coins">{formatInt(p?.coins_balance)}</span>
                      <span className="sub">Total: {formatInt(p?.coins_ganadas_total)}</span>
                    </div>

                    <div className="lb-card__stat">
                      <span className="k">Nivel</span>
                      <span className="v v--pill v--lvl">{formatInt(p?.nivel)}</span>
                    </div>

                    <div className="lb-card__stat">
                      <span className="k">
                        <Tooltip
                          theme="money"
                          content={<DualMoneyTooltip title="Dinero" actual={safeNum(p?.dinero)} total={safeNum(p?.dinero_ganado_total)} kind="money" />}
                        >
                          <span className="k__tt">Dinero</span>
                        </Tooltip>
                      </span>
                      <span className="v v--pill v--money">{formatMoney(p?.dinero)}</span>
                      <span className="sub">Total: {formatMoney(p?.dinero_ganado_total)}</span>
                    </div>

                    <div className="lb-card__stat">
                      <span className="k">Tiempo</span>
                      <span className="v">{formatearTiempo(p?.tiempo_jugado)}</span>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="lb-card__details">
                      <div className="lb-card__grid lb-card__grid--gens">
                        <div className="lb-card__stat">
                          <span className="k">Valor exacto</span>
                          <span className="v">{formatMoney(p?.gens_value_total)}</span>
                          {valorInfo?.nextMin != null ? <span className="sub">Te faltan: {formatMoney(valorInfo.left)}</span> : <span className="sub">Máximo alcanzado</span>}
                        </div>

                        <div className="lb-card__stat">
                          <span className="k">Income/h</span>
                          <span className="v">{formatMoney(p?.gens_income_h)}</span>
                        </div>

                        <div className="lb-card__stat">
                          <span className="k">Tier Máx</span>
                          <span className="v">{formatInt(p?.gens_highest_tier)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="lb-card__grid">
                  {STATS.slice(0, 6).map((st) => {
                    const rawValue =
                      st === "phase_actual"
                        ? p?.phase_nombre || "—"
                        : st === "island_level"
                        ? getIslandLevelLocal(p)
                        : p?.[st];

                    return (
                      <div key={st} className={cn("lb-card__stat", { active: orden === st })}>
                        <span className="k">
                          <Tooltip theme="header" content={<div className="tt-simple">{STAT_HELP[st] || ""}</div>}>
                            <span className="k__tt">{LABELS[st] || st}</span>
                          </Tooltip>
                        </span>
                        <span className="v">{st === "phase_actual" ? rawValue : formatValueNonGens(st, rawValue)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
}
