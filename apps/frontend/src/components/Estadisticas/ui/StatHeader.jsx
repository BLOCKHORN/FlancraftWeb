import { cn } from "../leaderboards.utils";
import { LABELS, STAT_HELP } from "../leaderboards.constants";
import Tooltip from "./Tooltip";
import FitText from "./FitText";
import "./StatHeader.scss";

const STAT_ICONS = {
  genpoints: "/assets/statsperfil/genpoints.png",
  svpoints: "/assets/statsperfil/svpoints.png",
  obpoints: "/assets/statsperfil/obpoints.png",

  gens_value_total: "/assets/statsperfil/valorisla.png",
  island_level: "/assets/statsperfil/valorisla.png",
  coins_balance: "/assets/statsperfil/coins.png",
  nivel: "/assets/statsperfil/nivel.png",
  dinero: "/assets/statsperfil/dinero.png",
  tiempo_jugado: "/assets/statsperfil/playtime.webp",

  mobs_matados: "/assets/statsperfil/mobs.webp",
  bloques_minados: "/assets/statsperfil/mining.webp",
  muertes: "/assets/statsperfil/deaths.webp",
  kills_pvp: "/assets/statsperfil/pvp.webp",

  oneblock_blocks_broken: "/assets/statsperfil/bloqueinfinito.png",
  phase_actual: "/assets/statsperfil/bioma.png",
};

export default function StatHeader({
  stat,
  active,
  ordenAsc,
  onClick,
  sortable,
  helpOverride,
  iconSrc,
  servidorApi,
}) {
  const label = LABELS[stat] || stat;
  const help = helpOverride || STAT_HELP[stat] || label;

  const resolvedIcon = iconSrc || STAT_ICONS[stat] || null;
  const isClickable = !!sortable && typeof onClick === "function";
  const isOneBlock = servidorApi === "oneblock";

  return (
    <th
      className={cn("th-sort", {
        active,
        "is-locked": !sortable,
        "is-clickable": isClickable,
        "has-icon": !!resolvedIcon,
        "is-oneblock": isOneBlock,
      })}
      data-stat={stat}
      onClick={isClickable ? onClick : undefined}
      role="columnheader"
      aria-sort={active ? (ordenAsc ? "ascending" : "descending") : "none"}
      title={label}
    >
      <span className="th-sort__label">
        <Tooltip
          theme={sortable ? "header" : "headerLocked"}
          content={<div className="tt-simple">{help}</div>}
          maxWidth={360}
        >
          <span className="th-sort__text">
            {resolvedIcon && (
              <img
                className="th-sort__icon"
                src={resolvedIcon}
                alt=""
                aria-hidden="true"
                loading="lazy"
                draggable={false}
              />
            )}

            <span className="th-sort__textInner">
              <FitText
                text={label}
                className="fitText--header"
                maxPx={15}
                minPx={12}
                mobileMaxPx={14}
                mobileMinPx={11}
                tabletMaxPx={15}
                tabletMinPx={11}
                extraPadding={6}
                noShrinkUnder={10}
                step={0.5}
              />
            </span>
          </span>
        </Tooltip>

        <span className="th-sort__arrowSlot" aria-hidden="true">
          {active && sortable && (
            <i className="th-sort__arrow">{ordenAsc ? "▲" : "▼"}</i>
          )}
        </span>
      </span>
    </th>
  );
}
