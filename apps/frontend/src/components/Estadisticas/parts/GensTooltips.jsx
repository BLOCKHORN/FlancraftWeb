import { cn, formatInt, formatMoney, safeNum } from "../leaderboards.utils";
import "./GensTooltips.scss";

function pad2(n) {
  return String(n).padStart(2, "0");
}

export function GensValorTooltip({ info, incomeH, tierMax }) {
  const idx = info?.idx ?? 0;
  const tierLabel = `TIER ${pad2(idx + 1)}`;

  const hasNext = info?.nextMin != null;
  const pct = hasNext ? Math.max(0, Math.min(100, info.pct)) : 100;

  const valueReal = info?.value ?? 0;
  const left = info?.left ?? 0;

  const nextName = info?.nextName ?? null;

  const incomeTxt = safeNum(incomeH) > 0 ? formatMoney(incomeH) : "—";
  const tierMaxTxt = safeNum(tierMax) > 0 ? formatInt(tierMax) : "—";

  return (
    <div className={cn("ttg", `ttg--t${idx}`, { "ttg--cap": !hasNext })}>
      <div className="ttg__top">
        <div className="ttg__meta">
          <div className="ttg__tier">{tierLabel}</div>
          <div className="ttg__stage">
            <span className="ttg__stageLabel">Etapa</span>
            <span className="ttg__stageName">{info?.name || "—"}</span>
          </div>
        </div>

        <div className="ttg__score">
          <div className="ttg__scoreLabel">Valor isla</div>
          <div className="ttg__scoreValue">{formatMoney(valueReal)}</div>
        </div>
      </div>

      <div className="ttg__mid">
        {hasNext ? (
          <div className="ttg__targets">
            <div className="ttg__target">
              <span className="k">Siguiente</span>
              <span className="v">{nextName}</span>
            </div>
            <div className="ttg__target">
              <span className="k">Falta</span>
              <span className="v v--neg">{formatMoney(left)}</span>
            </div>
          </div>
        ) : (
          <div className="ttg__capNote">
            <div className="ttg__capTitle">Máximo alcanzado</div>
            <div className="ttg__capSub">Has llegado al límite real del modo.</div>
          </div>
        )}

        <div className="ttg__progress">
          <div className="ttg__progressHead">
            <span className="ttg__progressTitle">Progreso</span>
            <span className="ttg__progressPct">{pct}%</span>
          </div>

          <div className="ttg__bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
            <span className="ttg__barFill" style={{ width: `${pct}%` }} />
            <span className="ttg__barTicks" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
              <span />
            </span>
          </div>

          {hasNext ? (
            <div className="ttg__milestones">
              <span className="ttg__chip">Actual: {info?.name}</span>
              <span className="ttg__chip ttg__chip--next">Objetivo: {nextName}</span>
            </div>
          ) : (
            <div className="ttg__milestones">
              <span className="ttg__chip ttg__chip--cap">Cap real: {formatMoney(info?.max ?? 0)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="ttg__bot">
        <div className="ttg__stat">
          <span className="k">Income/h</span>
          <span className="v">{incomeTxt}</span>
        </div>
        <div className="ttg__stat">
          <span className="k">Tier máx</span>
          <span className="v">{tierMaxTxt}</span>
        </div>
      </div>
    </div>
  );
}

export function DualMoneyTooltip({ title, actual, total, kind = "money" }) {
  const isMoney = kind === "money";
  const a = isMoney ? formatMoney(actual) : formatInt(actual);
  const t = isMoney ? formatMoney(total) : formatInt(total);

  return (
    <div className={cn("ttd", `ttd--${kind}`)}>
      <div className="ttd__top">
        <div className="ttd__title">{title}</div>
        <div className="ttd__tag">Balance</div>
      </div>

      <div className="ttd__grid">
        <div className="ttd__row">
          <span className="k">Actual</span>
          <span className="v">{a}</span>
        </div>
        <div className="ttd__row">
          <span className="k">Total ganado</span>
          <span className="v">{t}</span>
        </div>
      </div>

      <div className="ttd__foot">El total acumulado no baja al gastar.</div>
    </div>
  );
}
