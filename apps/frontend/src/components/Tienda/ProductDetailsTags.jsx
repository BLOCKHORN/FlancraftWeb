// apps/frontend/src/components/Tienda/ProductDetailsTags.jsx
import React, { useEffect, useMemo, useState } from "react";
import "../../styles/components/Tienda/details/tagsDetails.scss";

/* =========================================================
   Minecraft formatting parser (React)
   - soporta: &0-9a-f, &l &o &n &m &k &r
   - soporta hex: #A01DFF y &#A01DFF
   ========================================================= */

const MC_COLORS = {
  "0": "#000000",
  "1": "#0000AA",
  "2": "#00AA00",
  "3": "#00AAAA",
  "4": "#AA0000",
  "5": "#AA00AA",
  "6": "#FFAA00",
  "7": "#AAAAAA",
  "8": "#555555",
  "9": "#5555FF",
  a: "#55FF55",
  b: "#55FFFF",
  c: "#FF5555",
  d: "#FF55FF",
  e: "#FFFF55",
  f: "#FFFFFF",
};

function isHex6(s) {
  return /^[0-9a-fA-F]{6}$/.test(s);
}

function normalizeInputName(s) {
  const v = (s || "").toString();
  return v.length > 16 ? v.slice(0, 16) : v;
}

function applyPlaceholders(str, { playerName = "Jugador", samples = {} } = {}) {
  let out = (str || "").toString();
  out = out.replaceAll("%player%", playerName);
  out = out.replaceAll("%statistic_player_kills%", String(samples.kills ?? 123));
  out = out.replaceAll("%tag%", String(samples.tag ?? ""));
  return out;
}

function parseMinecraftToSegments(inputRaw) {
  const raw = (inputRaw || "").toString();
  const segments = [];
  let buf = "";

  let state = {
    color: null,
    bold: false,
    italic: false,
    under: false,
    strike: false,
    obf: false,
  };

  const flush = () => {
    if (!buf) return;
    segments.push({ text: buf, ...state });
    buf = "";
  };

  const setColor = (hex) => {
    flush();
    state = { ...state, color: hex };
  };

  const setFlag = (k, v) => {
    flush();
    state = { ...state, [k]: v };
  };

  const reset = () => {
    flush();
    state = {
      color: null,
      bold: false,
      italic: false,
      under: false,
      strike: false,
      obf: false,
    };
  };

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];

    // HEX: "&#A01DFF"
    if (ch === "&" && raw[i + 1] === "#" && isHex6(raw.slice(i + 2, i + 8))) {
      setColor(`#${raw.slice(i + 2, i + 8)}`);
      i += 7;
      continue;
    }

    // HEX: "#A01DFF"
    if (ch === "#" && isHex6(raw.slice(i + 1, i + 7))) {
      setColor(`#${raw.slice(i + 1, i + 7)}`);
      i += 6;
      continue;
    }

    // Códigos "&a", "&l", "&r"...
    if (ch === "&" && i + 1 < raw.length) {
      const code = raw[i + 1].toLowerCase();

      if (MC_COLORS[code]) {
        setColor(MC_COLORS[code]);
        i += 1;
        continue;
      }

      if (code === "l") {
        setFlag("bold", true);
        i += 1;
        continue;
      }
      if (code === "o") {
        setFlag("italic", true);
        i += 1;
        continue;
      }
      if (code === "n") {
        setFlag("under", true);
        i += 1;
        continue;
      }
      if (code === "m") {
        setFlag("strike", true);
        i += 1;
        continue;
      }
      if (code === "k") {
        setFlag("obf", true);
        i += 1;
        continue;
      }
      if (code === "r") {
        reset();
        i += 1;
        continue;
      }
    }

    buf += ch;
  }

  flush();
  return segments;
}

function McText({ text }) {
  const segs = useMemo(() => parseMinecraftToSegments(text), [text]);

  return (
    <span className="mc-text">
      {segs.map((s, idx) => {
        const style = {
          color: s.color || undefined,
          fontWeight: s.bold ? 900 : undefined,
          fontStyle: s.italic ? "italic" : undefined,
          textDecoration: [s.under ? "underline" : "", s.strike ? "line-through" : ""]
            .filter(Boolean)
            .join(" "),
        };

        const cls = s.obf ? "mc-text__seg mc-text__seg--obf" : "mc-text__seg";

        return (
          <span className={cls} style={style} key={idx}>
            {s.text}
          </span>
        );
      })}
    </span>
  );
}

/* ========================================================= */

export default function ProductDetailsTags({ data }) {
  const items = Array.isArray(data?.items) ? data.items : [];

  const [selectedKey, setSelectedKey] = useState(() => items[0]?.key || "");
  useEffect(() => {
    setSelectedKey(items[0]?.key || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.id]);

  const selected = useMemo(
    () => items.find((x) => x.key === selectedKey) || items[0] || null,
    [items, selectedKey]
  );

  const [playerName, setPlayerName] = useState("Steve");
  const [message, setMessage] = useState("hola");

  const safeName = normalizeInputName(playerName);
  const command = data?.command || "/tags";

  const tagLineRaw = (selected?.tag?.[0] || "").toString();
  const descLinesRaw = Array.isArray(selected?.description) ? selected.description : [];

  const tagLineResolved = useMemo(() => {
    return applyPlaceholders(tagLineRaw, {
      playerName: safeName,
      samples: { kills: 123, tag: "" },
    });
  }, [tagLineRaw, safeName]);

  return (
    <div className="pd pd--tags-live">
      <div className="tgx">
        <div className="tgx__top">
          <div className="tgx__titleRow">
            <div className="tgx__title">{data?.title || data?.name || "PACK TAGS"}</div>
            <div className="tgx__meta">
              <span className="tgx__pill">
                <span className="tgx__pillLabel">Comando</span>
                <code>{command}</code>
              </span>
            </div>
          </div>

          <div className="tgx__sub">
            {data?.subtitle || "Previsualiza el tag antes de comprar. Se aplica en chat/perfil."}
          </div>
        </div>

        <div className="tgx__grid">
          <div className="tgx__panel">
            <div className="tgx__h">Vista previa</div>

            <div className="tgx__inputs">
              <label className="tgx__field">
                <span className="k">Nombre</span>
                <input
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Tu nombre ingame"
                  maxLength={16}
                />
              </label>

              <label className="tgx__field">
                <span className="k">Mensaje</span>
                <input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Texto de ejemplo"
                  maxLength={64}
                />
              </label>
            </div>

            <div className="tgx__chat">
              <div className="tgx__chatHead">
                <div className="tgx__chatTitle">Chat</div>
                <div className="tgx__legend">
                  <span className="tgx__chip">Sin tag</span>
                  <span className="tgx__chip tgx__chip--gold">Con tag</span>
                </div>
              </div>

              <div className="tgx__line tgx__line--before">
                <span className="tgx__name">{safeName}</span>
                <span className="tgx__sep">:</span>
                <span className="tgx__msg">{message}</span>
              </div>

              <div className="tgx__line tgx__line--after">
                <span className="tgx__tag">
                  <McText text={tagLineResolved} />
                </span>
                <span className="tgx__name">{safeName}</span>
                <span className="tgx__sep">:</span>
                <span className="tgx__msg">{message}</span>
              </div>
            </div>

            {descLinesRaw.length ? (
              <div className="tgx__descBox">
                <div className="tgx__h2">Descripción</div>
                <div className="tgx__descLines">
                  {descLinesRaw.map((l, i) => (
                    <div className="tgx__descLine" key={i}>
                      <McText text={applyPlaceholders(l, { playerName: safeName })} />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="tgx__panel">
            <div className="tgx__h">Tags incluidos</div>
            <div className="tgx__muted">Clic para previsualizar. Se respeta el color real del tag.</div>

            <div className="tgx__tagGrid">
              {items.map((it) => {
                const active = it.key === selectedKey;
                const raw = (it.tag?.[0] || "").toString();
                const resolvedText = applyPlaceholders(raw, { playerName: safeName });

                return (
                  <button
                    key={it.key}
                    type="button"
                    className={`tgx__tagBtn hasTip ${active ? "is-active" : ""}`}
                    onClick={() => setSelectedKey(it.key)}
                    aria-label={`Seleccionar ${it.key}`}
                    data-tooltip={it.key} // ✅ tooltip custom (sin title nativo)
                  >
                    <span className="tgx__tagBtnInner">
                      <McText text={resolvedText} />
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="tgx__how">
              <div className="tgx__h2">Uso</div>
              <div className="tgx__howLine">
                Abre <code>{command}</code>, entra en el pack y selecciona el tag. Puedes cambiarlo cuando quieras.
              </div>
            </div>

            <div className="tgx__foot">Producto cosmético: no da ventaja, solo estilo.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
