import { useEffect, useMemo, useState } from "react";
import { apiUrl } from "../../lib/env";
import {
  getPlatform,
  isNombreValido,
  safeNum,
  formatearTiempo,
  formatInt,
} from "./leaderboards.utils";

export const SERVER_ID = "survival";
export const LIMIT = 10;
export const FETCH_LIMIT = 700;
export const EXIT_DELAY_MS = 520;
export const SKELETON_ITEMS = Array.from({ length: LIMIT });

export const COIN_SRC = "/tienda/assets/coin.png";
export const ICON_POINTS = "/assets/points.png";
export const ICON_TIME = "/assets/statsperfil/playtime.webp";
export const ICON_WALLET = "/assets/wallet.png";

export const PLATFORM_ICON = {
  java: "/assets/platform/java.png",
  bedrock: "/assets/platform/bedrock.png",
  other: "",
};

export const RANGO_LOCAL = {
  nova: "/assets/nova.png",
  alpha: "/assets/alpha.png",
  inmortal: "/assets/inmortal.png",
};

export const RANGO_REMOTE = {
  nova: "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/2de18b63a83cb0b8df9197a4eab9ca575906152d.png",
  alpha: "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/9c1a0dd33eb6327f1ceb179080f232bc842e8225.png",
  inmortal:
    "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/1aaaa34593db3f2dea9d09a7bd4d985500d69de6.png",
};

export const POINTS_GUIDE = [
  {
    step: "01",
    title: "Pica, mata y progresa",
    text: "Minar, farmear mobs y avanzar de verdad te da la base más fuerte de puntos.",
  },
  {
    step: "02",
    title: "El PvP sí cuenta",
    text: "Ganar peleas suma bastante. Si eres bueno peleando, lo vas a notar rápido.",
  },
  {
    step: "03",
    title: "Morir te frena",
    text: "Las muertes restan. Subir al top no es solo grindear: también importa sobrevivir.",
  },
  {
    step: "04",
    title: "El tiempo ayuda",
    text: "Jugar más suma, pero no vale con estar AFK toda la vida. El progreso real pesa más.",
  },
  {
    step: "05",
    title: "La economía empuja",
    text: "Tener una economía fuerte también suma, pero no regala el top por sí sola.",
  },
  {
    step: "06",
    title: "Para ser top hay que ser completo",
    text: "El ranking premia al jugador que hace de todo bien: progreso, constancia, PvP y cabeza.",
  },
];

export const skinUrlCache = new Map();
export const skinPromiseCache = new Map();

export const hideImg = (e) => {
  e.currentTarget.style.display = "none";
};

export const fallbackRankImg = (key) => (e) => {
  const el = e.currentTarget;
  if (el?.dataset?.didFallback === "1") {
    el.style.display = "none";
    return;
  }
  el.dataset.didFallback = "1";
  el.src = RANGO_REMOTE[key] || "";
};

export const cleanPlayerName = (value) => String(value || "").trim().replace(/^\.+/, "");

export const looksLikeBedrockName = (value) => String(value || "").trim().startsWith(".");

export const pickWallet = (source) => {
  const value =
    source?.wallet_coins ??
    source?.walletCoins ??
    source?.coins_wallet ??
    source?.coins_web ??
    source?.wallet;

  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

export const normalizePlatform = (platform) => {
  const value = String(platform || "").toLowerCase();
  if (value.includes("bedrock")) return "bedrock";
  if (value.includes("java")) return "java";
  return "other";
};

export const normalizeRango = (rango) => {
  const value = String(rango || "").toLowerCase().trim();
  if (!value) return null;
  if (value.includes("nova")) return "nova";
  if (value.includes("alpha")) return "alpha";
  if (value.includes("inmortal") || value.includes("immortal")) return "inmortal";
  return null;
};

export const getMetaRango = (meta) =>
  meta?.rango || meta?.rango_usuario || meta?.rank || null;

export const fetchPlayerSkinUrl = async (uuid, signal) => {
  if (!uuid) return null;

  if (skinUrlCache.has(uuid)) {
    return skinUrlCache.get(uuid) || null;
  }

  if (skinPromiseCache.has(uuid)) {
    return skinPromiseCache.get(uuid);
  }

  const promise = fetch(apiUrl(`/api/usuarios/${uuid}/skin`), { signal })
    .then(async (res) => {
      if (!res.ok) return null;
      const data = await res.json().catch(() => null);
      const skinUrl = String(data?.skin_url || "").trim() || null;
      skinUrlCache.set(uuid, skinUrl);
      return skinUrl;
    })
    .catch(() => null)
    .finally(() => {
      skinPromiseCache.delete(uuid);
    });

  skinPromiseCache.set(uuid, promise);
  return promise;
};

export const buildHeadSources = ({ uuid, nombre, platKey, remoteSkinUrl }) => {
  const cleanName = cleanPlayerName(nombre);
  const isBedrock = platKey === "bedrock" || looksLikeBedrockName(nombre);
  const list = [];

  if (remoteSkinUrl) {
    list.push(remoteSkinUrl);
  }

  if (!isBedrock && cleanName) {
    list.push(`https://minotar.net/helm/${encodeURIComponent(cleanName)}/64`);
  }

  if (isBedrock) {
    list.push("/assets/skins/bedrock-default.webp");
  }

  list.push("/assets/skins/default-steve.webp");

  return Array.from(new Set(list.filter(Boolean)));
};

export const pickExitSkin = (nombre, platKey, uuid) => {
  const cleanName = cleanPlayerName(nombre);
  const isBedrock = platKey === "bedrock" || looksLikeBedrockName(nombre);
  const cached = uuid ? skinUrlCache.get(uuid) : null;

  if (cached) return cached;
  if (!isBedrock && cleanName) {
    return `https://minotar.net/helm/${encodeURIComponent(cleanName)}/128`;
  }
  if (isBedrock) {
    return "/assets/skins/bedrock-default.webp";
  }
  return "/assets/skins/default-steve.webp";
};

export const buildFxPayload = (player, meta) => {
  const nombre = player?.nombre_minecraft || "";
  const platKey = normalizePlatform(player?.platform || getPlatform(player));
  const rangoKey = normalizeRango(getMetaRango(meta));

  return {
    nombre,
    platKey,
    rangoKey,
    skin: pickExitSkin(nombre, platKey, player?.uuid),
  };
};

export const normalizeLeaderboardItem = (player) => {
  if (!isNombreValido(player?.nombre_minecraft)) return null;

  const uuid = player?.uuid || null;
  const nombre = player?.nombre_minecraft || "";
  const id = String(uuid || nombre.toLowerCase()).trim();

  if (!id) return null;

  const totalPoints = safeNum(
    player?.svpoints ??
      player?.points ??
      player?.puntos ??
      player?.puntos_sv ??
      player?.survival_points ??
      0
  );

  const tiempoTotal = Math.max(0, safeNum(player?.tiempo_jugado));
  const wallet = pickWallet(player);

  return {
    id,
    uuid,
    nombre_minecraft: nombre,
    platform: getPlatform(player),
    wallet,
    tiempo_total: tiempoTotal,
    total_points: totalPoints,
  };
};

export const decoratePlayer = (player, meta) => {
  const rangoRaw = getMetaRango(meta);
  const rangoKey = normalizeRango(rangoRaw);
  const platKey = normalizePlatform(player?.platform);
  const wallet = player?.wallet ?? pickWallet(meta);
  const walletTxt = wallet == null ? "—" : formatInt(wallet);
  const tiempoTxt = formatearTiempo(safeNum(player?.tiempo_total));

  return {
    ...player,
    meta,
    rangoRaw,
    rangoKey,
    platKey,
    wallet,
    walletTxt,
    tiempoTxt,
    platformIcon: PLATFORM_ICON[platKey] || "",
  };
};

export const HeadLabel = ({ icon, children }) => (
  <span className="lb-th">
    {icon ? (
      <img
        className="lb-thIcon"
        src={icon}
        alt=""
        loading="lazy"
        onError={hideImg}
      />
    ) : null}
    <span className="lb-thTxt">{children}</span>
  </span>
);

export function LeaderboardSkin({ uuid, nombre, platKey }) {
  const [remoteSkinUrl, setRemoteSkinUrl] = useState(() => {
    if (!uuid) return "";
    return skinUrlCache.get(uuid) || "";
  });
  const [errorIndex, setErrorIndex] = useState(0);

  const isBedrock = platKey === "bedrock" || looksLikeBedrockName(nombre);
  const sources = useMemo(
    () =>
      buildHeadSources({
        uuid,
        nombre,
        platKey,
        remoteSkinUrl,
      }),
    [uuid, nombre, platKey, remoteSkinUrl]
  );

  useEffect(() => {
    setErrorIndex(0);
  }, [uuid, nombre, platKey, remoteSkinUrl]);

  useEffect(() => {
    if (!uuid || !isBedrock) return;

    let active = true;
    const controller = new AbortController();

    fetchPlayerSkinUrl(uuid, controller.signal).then((url) => {
      if (!active || !url) return;
      setRemoteSkinUrl(url);
    });

    return () => {
      active = false;
      controller.abort();
    };
  }, [uuid, isBedrock]);

  const currentSrc = sources[Math.min(errorIndex, Math.max(sources.length - 1, 0))] || "/assets/skins/default-steve.webp";

  return (
    <img
      src={currentSrc}
      alt=""
      loading="lazy"
      onError={() => {
        setErrorIndex((prev) => (prev < sources.length - 1 ? prev + 1 : prev));
      }}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        objectPosition: "center top",
        imageRendering: "pixelated",
        display: "block",
      }}
    />
  );
}

export const PlayerIdentity = ({ player, mobile = false }) => {
  const { nombre_minecraft, rangoKey, rangoRaw, platKey, platformIcon } = player;

  return (
    <div className="lb-player">
      <div className="lb-skin">
        <LeaderboardSkin
          uuid={player?.uuid}
          nombre={nombre_minecraft}
          platKey={platKey}
        />
      </div>

      <div className="lb-nameWrap">
        <div className={`lb-name ${rangoKey ? `is-${rangoKey}` : ""}`}>
          {nombre_minecraft}
        </div>

        <div className="lb-meta">
          {mobile ? (
            platKey === "java" || platKey === "bedrock" ? (
              <span
                className={`lb-platform lb-platform--${platKey}`}
                title={platKey}
                aria-label={platKey}
              >
                {platformIcon ? (
                  <img
                    className="lb-platformIcon"
                    src={platformIcon}
                    alt=""
                    loading="lazy"
                    onError={hideImg}
                  />
                ) : null}
                <span className="lb-platformDot" />
              </span>
            ) : null
          ) : platKey === "java" || platKey === "bedrock" ? (
            <span className={`lb-platformPill lb-platformPill--${platKey}`}>
              {platKey === "bedrock" ? "BEDROCK" : "JAVA"}
            </span>
          ) : null}

          {rangoKey ? (
            <span
              className={`lb-rango lb-rango--${rangoKey}`}
              title={String(rangoRaw || "")}
            >
              <img
                className="lb-rangoIcon"
                src={RANGO_LOCAL[rangoKey]}
                alt=""
                loading="lazy"
                onError={fallbackRankImg(rangoKey)}
              />
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
};
