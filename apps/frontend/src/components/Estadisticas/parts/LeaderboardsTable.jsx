// src/components/Estadisticas/parts/LeaderboardsTable.jsx
import { cn, formatMoney, formatInt as fmtInt, safeNum } from "../leaderboards.utils";
import { MEDALLAS, STAT_HELP } from "../leaderboards.constants";
import { computeGensScore, getGensValorTierInfo } from "../leaderboards.gens";
import StatHeader from "../ui/StatHeader";
import Tooltip from "../ui/Tooltip";
import FitText from "../ui/FitText";
import NameLink from "../ui/NameLink";
import { DualMoneyTooltip, GensValorTooltip } from "./GensTooltips";
import "./LeaderboardsTable.scss";

function pad2(n) {
  const v = Math.max(0, Math.floor(Number(n || 0)));
  return v < 10 ? `0${v}` : String(v);
}

function RankDelta({ delta }) {
  const d = Number(delta);
  if (!Number.isFinite(d)) return <span className="lb-delta lb-delta--na">—</span>;
  if (d === 0) return <span className="lb-delta lb-delta--eq">•</span>;

  const up = d > 0;
  const val = Math.abs(d);

  return (
    <span className={cn("lb-delta", up ? "lb-delta--up" : "lb-delta--down")}>
      <span className="lb-delta__arrow" aria-hidden="true">
        {up ? "▲" : "▼"}
      </span>
      <span className="lb-delta__num">{val}</span>
    </span>
  );
}

function formatValue({ key, value, formatearTiempo, formatearTiempoParkour }) {
  if (value === null || value === undefined) return "—";

  if (key === "phase_actual") {
    if (typeof value === "string") {
      const s = value.trim();
      if (!s || s === "-" || s === "—") return "—";
      return s;
    }
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? `Fase ${fmtInt(n)}` : "—";
  }

  const n = Number(value);

  if (key === "genpoints") return Number.isFinite(n) ? fmtInt(n) : "—";
  if (key === "svpoints") return Number.isFinite(n) ? fmtInt(Math.round(n)) : "—";
  if (key === "obpoints") return Number.isFinite(n) ? fmtInt(Math.round(n)) : "—";
  if (key === "anpoints") return Number.isFinite(n) ? fmtInt(Math.round(n)) : "—";

  if (key === "tiempo_jugado") return formatearTiempo(n);
  if (key === "mejor_tiempo") return formatearTiempoParkour(n);

  if (key === "dinero") return formatMoney(n);
  if (key === "coins_balance") return fmtInt(n);
  if (key === "nivel") return fmtInt(n);

  if (key === "gens_value_total") {
    const info = getGensValorTierInfo(n);
    const suffix = info?.nextMin != null ? ` • ${info.pct}%` : "";
    return `${info.name}${suffix}`;
  }

  if (key === "kdr") return Number.isFinite(n) ? n.toFixed(2) : "—";
  return Number.isFinite(n) ? fmtInt(n) : "—";
}

const FT_BASE = {
  maxPx: 18,
  minPx: 13,
  mobileMaxPx: 16,
  mobileMinPx: 12,
  tabletMaxPx: 17,
  tabletMinPx: 12,
  noShrinkUnder: 8,
  step: 0.5,
};

const FT_CELL = { ...FT_BASE, extraPadding: 34 };
const FT_SCORE = { ...FT_BASE, extraPadding: 34 };
const FT_TIER = { ...FT_BASE, extraPadding: 30 };
const FT_MONEY = { ...FT_BASE, extraPadding: 22, minPx: 13, mobileMinPx: 12 };

function StatCell({ stat, p, value, servidorApi, formatearTiempo, formatearTiempoParkour }) {
  if (servidorApi !== "gens") {
    const txt = String(formatValue({ key: stat, value, formatearTiempo, formatearTiempoParkour }));
    return (
      <span className={cn("num", "num--full", `num--${stat}`)} data-stat={stat}>
        <FitText text={txt} {...FT_CELL} className="fitText--num" />
      </span>
    );
  }

  if (stat === "genpoints") {
    const txt = String(formatValue({ key: "genpoints", value, formatearTiempo, formatearTiempoParkour }));
    return (
      <Tooltip theme="score" content={<div className="tt-simple">{STAT_HELP.genpoints}</div>}>
        <span className="num num--full num--score" data-stat="genpoints">
          <FitText text={txt} {...FT_SCORE} className="fitText--num" />
        </span>
      </Tooltip>
    );
  }

  if (stat === "gens_value_total") {
    const info = getGensValorTierInfo(value);
    const display = String(formatValue({ key: "gens_value_total", value, formatearTiempo, formatearTiempoParkour }));

    return (
      <Tooltip
        theme={`tier-${info.idx}`}
        content={<GensValorTooltip info={info} incomeH={p?.gens_income_h} tierMax={p?.gens_highest_tier} />}
        maxWidth={380}
      >
        <span
          className={cn("num num--full num--pill num--tier", `gens-tier-${info.idx}`, `tier-text-${info.idx}`)}
          data-stat="gens_value_total"
          data-tier={info.idx}
        >
          <FitText text={display} {...FT_TIER} />
        </span>
      </Tooltip>
    );
  }

  if (stat === "coins_balance") {
    const display = String(formatValue({ key: "coins_balance", value, formatearTiempo, formatearTiempoParkour }));
    return (
      <Tooltip
        theme="coins"
        content={<DualMoneyTooltip title="Coins" actual={safeNum(p?.coins_balance)} total={safeNum(p?.coins_ganadas_total)} kind="coins" />}
        maxWidth={340}
      >
        <span className="num num--full num--pill num--coins" data-stat="coins_balance">
          <FitText text={display} {...FT_CELL} className="fitText--num" />
        </span>
      </Tooltip>
    );
  }

  if (stat === "dinero") {
    const display = String(formatValue({ key: "dinero", value, formatearTiempo, formatearTiempoParkour }));
    return (
      <Tooltip
        theme="money"
        content={<DualMoneyTooltip title="Dinero" actual={safeNum(p?.dinero)} total={safeNum(p?.dinero_ganado_total)} kind="money" />}
        maxWidth={360}
      >
        <span className="num num--full num--pill num--money" data-stat="dinero">
          <FitText text={display} {...FT_MONEY} className="fitText--num" />
        </span>
      </Tooltip>
    );
  }

  const txt = String(formatValue({ key: stat, value, formatearTiempo, formatearTiempoParkour }));
  return (
    <span className={cn("num", "num--full", `num--${stat}`)} data-stat={stat}>
      <FitText text={txt} {...FT_CELL} className="fitText--num" />
    </span>
  );
}

export default function LeaderboardsTable({
  errorTabla,
  loading,
  limit,
  STATS,
  wideCount,
  mediumCount,
  datosFiltrados,
  offset,
  totalRows,
  servidorApi,
  orden,
  ordenAsc,
  cambiarOrden,
  getMeta,
  getPlatform,
  onOpenPerfil,
  formatearTiempo,
  formatearTiempoParkour,
  getIslandLevelLocal,
}) {
  const safeFormatearTiempo =
    typeof formatearTiempo === "function"
      ? (sec) => {
          const total = Math.floor(Number(sec || 0));
          const h = Math.floor(total / 3600);
          const m = Math.floor((total % 3600) / 60);
          return `${pad2(h)}h ${pad2(m)}m`;
        }
      : (sec) => {
          const total = Math.floor(Number(sec || 0));
          const h = Math.floor(total / 3600);
          const m = Math.floor((total % 3600) / 60);
          return `${pad2(h)}h ${pad2(m)}m`;
        };

  const safeFormatearTiempoParkour =
    typeof formatearTiempoParkour === "function"
      ? formatearTiempoParkour
      : (v) => {
          const n = Number(v || 0);
          if (!Number.isFinite(n) || n <= 0) return "—";
          const totalMs = n > 10_000 ? n : n * 1000;
          const totalSec = Math.floor(totalMs / 1000);
          const m = Math.floor(totalSec / 60);
          const s = totalSec % 60;
          const ms = Math.floor((totalMs % 1000) / 10);
          return `${pad2(m)}:${pad2(s)}.${pad2(ms)}`;
        };

  if (errorTabla) {
    return (
      <div className="lb-error">
        <div className="lb-error__title">Error</div>
        <div className="lb-error__text">{errorTabla}</div>
      </div>
    );
  }

  const total = Math.max(0, Number(totalRows || 0));

  return (
    <div className="lb-tableWrap">
      <table className="lb-table" style={{ "--stats": STATS.length, "--wideCount": wideCount, "--mediumCount": mediumCount }}>
        <thead>
          <tr>
            <th className="col-pos">Top</th>
            <th className="col-player">Jugador</th>

            {STATS.map((st) => {
              const isGens = servidorApi === "gens";

              if (isGens && st !== "genpoints") {
                return (
                  <StatHeader
                    key={st}
                    stat={st}
                    servidorApi={servidorApi}
                    active={false}
                    ordenAsc={false}
                    sortable={false}
                    helpOverride={STAT_HELP[st]}
                  />
                );
              }

              if (isGens && st === "genpoints") {
                return (
                  <StatHeader
                    key={st}
                    stat={st}
                    servidorApi={servidorApi}
                    active={true}
                    ordenAsc={false}
                    sortable={false}
                    helpOverride={STAT_HELP.genpoints}
                  />
                );
              }

              return (
                <StatHeader
                  key={st}
                  stat={st}
                  servidorApi={servidorApi}
                  active={orden === st}
                  ordenAsc={ordenAsc}
                  sortable={true}
                  onClick={() => cambiarOrden(st)}
                />
              );
            })}
          </tr>
        </thead>

        <tbody>
          {loading &&
            [...Array(limit)].map((_, i) => (
              <tr key={`sk-${i}`} className="lb-row sk-row">
                <td>
                  <span className="sk sk--pos" />
                </td>
                <td>
                  <div className="lb-player">
                    <span className="sk sk--head" />
                    <div className="sk-col">
                      <span className="sk sk--name" />
                      <span className="sk sk--mini" />
                    </div>
                  </div>
                </td>
                {STATS.map((st) => (
                  <td key={st}>
                    <span className="sk sk--num" />
                  </td>
                ))}
              </tr>
            ))}

          {!loading && datosFiltrados.length === 0 && (
            <tr className="lb-row empty">
              <td colSpan={2 + STATS.length}>No hay resultados con los filtros actuales.</td>
            </tr>
          )}

          {!loading &&
            datosFiltrados.map((p, i) => {
              const baseIndex = offset + i;
              const absPos = ordenAsc && total > 0 ? total - baseIndex : baseIndex + 1;

              const meta = getMeta(p.uuid);
              const medal = MEDALLAS[absPos] || null;
              const name = p?.nombre_minecraft;
              const platform = getPlatform(p);
              const delta = p?.delta_pos_24h;

              return (
                <tr
                  key={`${p.uuid}-${absPos}`}
                  className={cn("lb-row", { top1: absPos === 1, top2: absPos === 2, top3: absPos === 3 })}
                >
                  <td className="td-pos">
                    <div className="lb-posWrap">
                      {medal ? (
                        <img src={medal} alt={`Top ${absPos}`} className="lb-medal" loading="lazy" />
                      ) : (
                        <span className="lb-rank">{absPos}</span>
                      )}
                      <RankDelta delta={delta} />
                    </div>
                  </td>

                  <td className="td-player">
                    <div className="lb-player">
                      <img
                        className="lb-head"
                        src={`https://mc-heads.net/avatar/${name}/32`}
                        alt=""
                        loading="lazy"
                        onError={(e) => (e.currentTarget.src = "/assets/default-head.png")}
                      />
                      <div className="lb-player__text">
                        <div className="lb-nameRow">
                          <NameLink player={p} className="lb-name" onOpen={onOpenPerfil} />
                          <span className="lb-badges">
                            {platform && (
                              <span className={cn("lb-badge-platform", { bedrock: platform === "bedrock", java: platform === "java" })}>
                                {platform === "bedrock" ? "BEDROCK" : "JAVA"}
                              </span>
                            )}
                            {meta?.rango && (
                              <img src={`/assets/rangos/${meta.rango}.webp`} alt="" className="lb-badge-rango" loading="lazy" />
                            )}
                          </span>
                        </div>
                        <div className="lb-player__sub">{meta?.rango ? meta.rango : "—"}</div>
                      </div>
                    </div>
                  </td>

                  {STATS.map((st) => {
                    const rawValue =
                      st === "phase_actual"
                        ? p?.phase_nombre || "—"
                        : st === "island_level"
                        ? getIslandLevelLocal(p)
                        : st === "genpoints"
                        ? safeNum(p?.genpoints) || computeGensScore(p)
                        : p?.[st];

                    return (
                      <td
                        key={st}
                        className={cn("td-stat", { active: servidorApi === "gens" ? st === "genpoints" : orden === st })}
                        data-stat={st}
                      >
                        <StatCell
                          stat={st}
                          p={p}
                          value={rawValue}
                          servidorApi={servidorApi}
                          formatearTiempo={safeFormatearTiempo}
                          formatearTiempoParkour={safeFormatearTiempoParkour}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}
