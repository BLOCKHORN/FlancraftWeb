import { cn, formatInt, formatMoney, safeNum } from "../leaderboards.utils";
import "./GensTooltips.scss";

function pad2(n) {
  return String(n).padStart(2, "0");
}

export function GensValorTooltip({ info, incomeH, tierMax }) {
  const idx = info?.idx ?? 0;
  const tierLabel = `TIER ${pad2(idx + 1)}`;

  const hasNext = info?.nextMin != null;
  const pct = hasNext ? Math.max(0, Math.min(100, info?.pct ?? 0)) : 100;

  const valueReal = info?.value ?? 0;
  const left = info?.left ?? 0;

  const nextName = info?.nextName ?? "—";
  const curName = info?.name ?? "—";

  const incomeTxt = safeNum(incomeH) > 0 ? formatMoney(incomeH) : "—";
  const tierMaxTxt = safeNum(tierMax) > 0 ? formatInt(tierMax) : "—";

  return (
    <div className={cn("ttg", `ttg--t${idx}`, { "ttg--cap": !hasNext })}>
      <div className="ttg__head">
        <div className="ttg__headL">
          <span className="ttg__badge">{tierLabel}</span>
          <div className="ttg__nameBlock">
            <span className="ttg__label">Etapa</span>
            <span className="ttg__name">{curName}</span>
          </div>
        </div>

        <div className="ttg__headR">
          <span className="ttg__label">Valor isla</span>
          <span className="ttg__value">{formatMoney(valueReal)}</span>
        </div>
      </div>

      <div className="ttg__body">
        {hasNext ? (
          <div className="ttg__row ttg__row--split">
            <div className="ttg__kv">
              <span className="k">Siguiente</span>
              <span className="v">{nextName}</span>
            </div>
            <div className="ttg__kv ttg__kv--neg">
              <span className="k">Falta</span>
              <span className="v">{formatMoney(left)}</span>
            </div>
          </div>
        ) : (
          <div className="ttg__row ttg__row--cap">
            <div className="ttg__capTitle">Máximo alcanzado</div>
            <div className="ttg__capSub">Has llegado al límite real del modo.</div>
          </div>
        )}

        <div className="ttg__progress">
          <div className="ttg__progressTop">
            <span className="ttg__label">Progreso</span>
            <span className="ttg__pct">{pct}%</span>
          </div>

          <div className="ttg__bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
            <span className="ttg__barFill" style={{ width: `${pct}%` }} />
            <span className="ttg__barGrid" aria-hidden="true" />
          </div>

          <div className="ttg__hint">
            {hasNext ? (
              <span>
                Actual: <b>{curName}</b> <span className="dot">•</span> Objetivo: <b>{nextName}</b>
              </span>
            ) : (
              <span>
                Cap real: <b>{formatMoney(info?.max ?? 0)}</b>
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="ttg__metaBar">
        <div className="ttg__metaItem">
          <span className="k">Income/h</span>
          <span className="v">{incomeTxt}</span>
        </div>
        <span className="ttg__sep" aria-hidden="true" />
        <div className="ttg__metaItem">
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
      <div className="ttd__head">
        <div className="ttd__title">{title}</div>
        <div className="ttd__badge">Balance</div>
      </div>

      <div className="ttd__rows">
        <div className="ttd__row">
          <span className="k">Actual</span>
          <span className="v">{a}</span>
        </div>
        <div className="ttd__row">
          <span className="k">Total ganado</span>
          <span className="v">{t}</span>
        </div>
      </div>

      <div className="ttd__note">El total acumulado no baja al gastar.</div>
    </div>
  );
}
