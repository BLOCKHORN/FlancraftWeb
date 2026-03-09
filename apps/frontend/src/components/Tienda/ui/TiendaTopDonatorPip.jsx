import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useLayoutEffect,
} from "react";
import { apiUrl } from "../../../lib/env";
import "../../../styles/components/Tienda/tienda-topdonator-pip.scss";

const TTL_MS = 5 * 60 * 1000;

function getSkinHeadUrl({ uuid, username, size = 40 }) {
  const safeUser = encodeURIComponent(String(username || "").trim());
  const safeUuid = String(uuid || "").trim();

  if (safeUuid)
    return `https://crafatar.com/avatars/${safeUuid}?size=${size}&overlay`;
  if (safeUser) return `https://mc-heads.net/avatar/${safeUser}/${size}`;
  return `https://mc-heads.net/avatar/Steve/${size}`;
}

function formatMoney(amount, currency = "EUR") {
  const n = Number(amount);
  if (!Number.isFinite(n)) return null;
  try {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${n.toFixed(2)} ${currency}`;
  }
}

async function fetchJson(url) {
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

function CrownIcon({ className = "" }) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M4 9.2l3.2 3.1L12 6l4.8 6.3L20 9.2V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9.2Z"
        fill="currentColor"
        opacity="0.92"
      />
      <path
        d="M7.2 12.3 4 9.2V18c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V9.2l-3.2 3.1L12 6 7.2 12.3Z"
        fill="none"
        stroke="rgba(0,0,0,0.55)"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M6.2 18h11.6"
        stroke="rgba(255,255,255,0.22)"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function TiendaTopDonatorPip({ server = "global" }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [top, setTop] = useState(null);

  const rootRef = useRef(null);
  const btnRef = useRef(null);
  const bubbleRef = useRef(null);

  const cacheKey = useMemo(
    () => `tienda_topdonator_pip_v2_${String(server || "global").toLowerCase()}`,
    [server]
  );

  // Cierra con ESC y click fuera
  useEffect(() => {
    if (!open) return;

    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus?.();
      }
    };

    const onDown = (e) => {
      const root = rootRef.current;
      if (!root) return;
      if (!root.contains(e.target)) setOpen(false);
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);

    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [open]);

  // Cargar datos solo cuando abres (y con cache)
  useEffect(() => {
    let alive = true;
    if (!open) return;

    const isDev = import.meta.env.DEV;

    const readCache = () => {
      try {
        const raw = sessionStorage.getItem(cacheKey);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed?.ts || !parsed?.data) return null;
        if (Date.now() - parsed.ts > TTL_MS) return null;
        return parsed.data;
      } catch {
        return null;
      }
    };

    const writeCache = (data) => {
      try {
        sessionStorage.setItem(
          cacheKey,
          JSON.stringify({ ts: Date.now(), data })
        );
      } catch {}
    };

    const load = async () => {
      setLoading(true);

      const cached = isDev ? null : readCache();
      if (cached) {
        if (!alive) return;
        setTop(cached);
        setLoading(false);
        return;
      }

      try {
        const refresh = isDev ? "?refresh=1" : "";
        const data = await fetchJson(
          apiUrl(`/api/tebex/top-donator${refresh}`)
        );
        if (!data?.ok) throw new Error("TopDonator inválido");
        if (!alive) return;

        if (!isDev) writeCache(data);
        setTop(data);
        setLoading(false);
      } catch {
        if (!alive) return;
        setTop({
          username: "Guest",
          uuid: "",
          amount: null,
          currency: "EUR",
          periodLabel: "TOP DONADOR",
          _isFallback: true,
        });
        setLoading(false);
      }
    };

    load();
    return () => {
      alive = false;
    };
  }, [open, cacheKey]);

  const headUrl = useMemo(
    () => getSkinHeadUrl({ uuid: top?.uuid, username: top?.username, size: 44 }),
    [top?.uuid, top?.username]
  );

  const amountText = useMemo(() => {
    return (
      top?.amountFormatted ||
      formatMoney(top?.amount, top?.currency || "EUR") ||
      "—"
    );
  }, [top?.amount, top?.amountFormatted, top?.currency]);

  const periodText = useMemo(() => {
    const p = String(top?.periodLabel || "TOP DONADOR").trim();
    return p || "TOP DONADOR";
  }, [top?.periodLabel]);

  // ✅ medir en runtime: centro del botón -> X dentro de la burbuja
  const updateArrowX = () => {
    const btn = btnRef.current;
    const bubble = bubbleRef.current;
    if (!btn || !bubble) return;

    const btnRect = btn.getBoundingClientRect();
    const bubbleRect = bubble.getBoundingClientRect();

    const btnCenterX = btnRect.left + btnRect.width / 2;
    let x = btnCenterX - bubbleRect.left; // coords locales de bubble

    // clamp para que no se salga por los bordes
    const arrowHalf = 7; // colita 14px
    const min = arrowHalf + 6;
    const max = bubbleRect.width - arrowHalf - 6;
    x = Math.max(min, Math.min(max, x));

    bubble.style.setProperty("--tdp-arrow-x", `${x}px`);
  };

  useLayoutEffect(() => {
    if (!open) return;

    updateArrowX();
    const raf = requestAnimationFrame(updateArrowX);

    const bubble = bubbleRef.current;
    const ro = bubble ? new ResizeObserver(() => updateArrowX()) : null;
    if (bubble && ro) ro.observe(bubble);

    const onWin = () => updateArrowX();
    window.addEventListener("resize", onWin, { passive: true });
    window.addEventListener("scroll", onWin, { passive: true, capture: true });

    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener("resize", onWin, { passive: true });
      vv.addEventListener("scroll", onWin, { passive: true });
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onWin);
      window.removeEventListener("scroll", onWin, true);
      if (vv) {
        vv.removeEventListener("resize", onWin);
        vv.removeEventListener("scroll", onWin);
      }
      if (ro) ro.disconnect();
    };
  }, [open]);

  return (
    <div className={["tdp-pip", open ? "is-open" : ""].join(" ")} ref={rootRef}>
      <button
        ref={btnRef}
        type="button"
        className="tdp-pip__dot"
        onClick={() => setOpen((v) => !v)}
        aria-label="Top donador"
        aria-expanded={open}
        title="Top donador"
      >
        <CrownIcon className="tdp-pip__icon" />
      </button>

      {open && (
        <div
          ref={bubbleRef}
          className="tdp-pip__bubble"
          role="dialog"
          aria-label="Top donador"
        >
          <div className="tdp-pip__bubbleHead">
            <div className="tdp-pip__title">{periodText}</div>
            <button
              className="tdp-pip__x"
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>

          <div className="tdp-pip__body">
            <div className="tdp-pip__avatarWrap" aria-hidden="true">
              <img
                className="tdp-pip__avatar"
                src={headUrl}
                alt=""
                draggable="false"
                onError={(e) => {
                  e.currentTarget.src = "https://mc-heads.net/avatar/Steve/44";
                }}
              />
            </div>

            <div className="tdp-pip__info">
              <div className="tdp-pip__name">
                {loading ? "Cargando…" : top?.username || "—"}
              </div>
              <div className="tdp-pip__amount">{amountText}</div>
            </div>
          </div>

          <div className="tdp-pip__hint">
            Click fuera o <kbd>ESC</kbd> para cerrar
          </div>
        </div>
      )}
    </div>
  );
}
