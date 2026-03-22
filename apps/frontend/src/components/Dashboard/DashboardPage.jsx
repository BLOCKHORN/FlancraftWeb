import { useContext, useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import RewardList from "./RewardList";
import LogroList from "./LogroList";
import { UserContext } from "../../context/UserContext";
import { apiUrl } from "../../lib/env";
import { clearSessionStorage, getAuthToken } from "../../lib/auth/storage";
import Seo from "../SEO/Seo";
import "../../styles/components/Dashboard/_dashboardpage.scss";

const SERVER_KEY = "survival";
const SERVER_LABEL = "SURVIVAL";
const SERVER_ICON = "/assets/reinos/survival-clasico.webp";

const DISPLAY_RANK_ORDER = ["usuario", "nova", "alpha", "inmortal", "builder", "helper", "srhelper", "mod", "srmod", "admin", "owner"];
const USER_RANKS = new Set(["nova", "alpha", "inmortal"]);
const STAFF_PANEL_RANKS = new Set(["mod", "srmod", "admin", "owner"]);
const DISPLAY_RANK_LABELS = {
  usuario: "USUARIO",
  nova: "NOVA",
  alpha: "ALPHA",
  inmortal: "INMORTAL",
  builder: "BUILDER",
  helper: "HELPER",
  srhelper: "SRHELPER",
  mod: "MOD",
  srmod: "SRMOD",
  admin: "ADMIN",
  owner: "OWNER",
};

const toInt = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
};

const normalizeRank = (value) => {
  if (value === null || value === undefined) return null;
  const rank = String(value).trim().toLowerCase().replace(/[\s_-]+/g, "");
  return DISPLAY_RANK_ORDER.includes(rank) ? rank : null;
};

const resolveDisplayRankFromUser = (user) => {
  const explicit = normalizeRank(user?.rango_real);
  if (explicit) return explicit;

  const ranks = [
    normalizeRank(user?.rango_usuario),
    normalizeRank(user?.rango_staff),
    normalizeRank(user?.rol_admin),
  ].filter(Boolean);

  if (!ranks.length) return "usuario";

  let best = "usuario";
  let bestIndex = 0;

  for (const rank of ranks) {
    const index = DISPLAY_RANK_ORDER.indexOf(rank);
    if (index > bestIndex) {
      best = rank;
      bestIndex = index;
    }
  }

  return best;
};

const resolveStaffPanelRole = (user) => {
  const direct = normalizeRank(user?.rol_admin);
  if (direct && STAFF_PANEL_RANKS.has(direct)) return direct;

  const staff = normalizeRank(user?.rango_staff);
  if (staff && STAFF_PANEL_RANKS.has(staff)) return staff;

  return null;
};

const safeJson = async (res, fallback = null) => {
  if (!res) return fallback;
  try {
    return await res.json();
  } catch {
    return fallback;
  }
};

const parseCoinsPayload = (m) => {
  if (m?.byServer && typeof m.byServer === "object") {
    const out = {};
    for (const [k, v] of Object.entries(m.byServer)) out[String(k)] = toInt(v);
    return out;
  }

  if (Array.isArray(m?.balances)) {
    const out = {};
    for (const row of m.balances) {
      const key = String(row?.servidor || row?.server || "").trim().toLowerCase();
      if (!key) continue;
      out[key] = toInt(row?.coins);
    }
    return out;
  }

  if (Array.isArray(m)) {
    const out = {};
    for (const row of m) {
      const key = String(row?.servidor || row?.server || "").trim().toLowerCase();
      if (!key) continue;
      out[key] = toInt(row?.coins);
    }
    return out;
  }

  if (m?.coins != null) return { global: toInt(m.coins) };
  if (m?.ecos != null) return { global: toInt(m.ecos) };

  return {};
};

const deriveXpStateFromTotal = (xpTotal, niveles) => {
  const total = toInt(xpTotal);
  const rows = Array.isArray(niveles) ? [...niveles].sort((a, b) => Number(a?.nivel) - Number(b?.nivel)) : [];

  if (!rows.length) {
    return {
      nivel: 1,
      xpActualNivel: 0,
      xpRequeridaNivel: 1,
      xpTotalActual: total,
      porcentaje: 0,
    };
  }

  let current = rows[0];

  for (const row of rows) {
    const threshold = toInt(row?.xp_total_acumulada);
    if (total >= threshold) current = row;
    else break;
  }

  const currentThreshold = toInt(current?.xp_total_acumulada);
  const xpRequired = Math.max(1, toInt(current?.xp_requerida || 1));
  const xpInLevel = Math.min(Math.max(0, total - currentThreshold), xpRequired);
  const porcentaje = Math.min(100, (xpInLevel / xpRequired) * 100);

  return {
    nivel: Math.max(1, toInt(current?.nivel || 1)),
    xpActualNivel: xpInLevel,
    xpRequeridaNivel: xpRequired,
    xpTotalActual: total,
    porcentaje,
  };
};

const animateNumber = (from, to, onUpdate, onDone, duration = 900) => {
  const start = performance.now();
  const diff = to - from;

  const tick = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = Math.round(from + diff * eased);
    onUpdate(value);
    if (progress < 1) {
      requestAnimationFrame(tick);
      return;
    }
    if (onDone) onDone();
  };

  requestAnimationFrame(tick);
};

let sharedAudioCtx = null;

const playLevelUpSound = async (levelsGained = 1) => {
  try {
    if (!sharedAudioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      sharedAudioCtx = new AudioCtx();
    }

    if (sharedAudioCtx.state === "suspended") {
      await sharedAudioCtx.resume();
    }

    const now = sharedAudioCtx.currentTime;
    const master = sharedAudioCtx.createGain();
    master.gain.value = 0.12;
    master.connect(sharedAudioCtx.destination);

    const notes = levelsGained > 1
      ? [523.25, 659.25, 783.99, 1046.5, 1318.51]
      : [523.25, 659.25, 783.99, 1046.5];

    notes.forEach((freq, i) => {
      const osc = sharedAudioCtx.createOscillator();
      const gain = sharedAudioCtx.createGain();
      const filter = sharedAudioCtx.createBiquadFilter();

      osc.type = i >= notes.length - 1 ? "triangle" : "sine";
      osc.frequency.setValueAtTime(freq, now + i * 0.085);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.012, now + i * 0.085 + 0.18);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(2400, now + i * 0.085);

      gain.gain.setValueAtTime(0.0001, now + i * 0.085);
      gain.gain.exponentialRampToValueAtTime(i >= notes.length - 1 ? 0.32 : 0.18, now + i * 0.085 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.085 + 0.28);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(master);

      osc.start(now + i * 0.085);
      osc.stop(now + i * 0.085 + 0.32);
    });

    for (let i = 0; i < 10; i++) {
      const osc = sharedAudioCtx.createOscillator();
      const gain = sharedAudioCtx.createGain();
      const hp = sharedAudioCtx.createBiquadFilter();

      hp.type = "highpass";
      hp.frequency.value = 1800 + i * 120;

      osc.type = "square";
      osc.frequency.setValueAtTime(1400 + Math.random() * 900, now + 0.12 + i * 0.018);

      gain.gain.setValueAtTime(0.0001, now + 0.12 + i * 0.018);
      gain.gain.exponentialRampToValueAtTime(0.03, now + 0.125 + i * 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.19 + i * 0.018);

      osc.connect(hp);
      hp.connect(gain);
      gain.connect(master);

      osc.start(now + 0.12 + i * 0.018);
      osc.stop(now + 0.21 + i * 0.018);
    }
  } catch {}
};

export default function DashboardPage() {
  const { user: sessionUser, setUser: setSessionUser, logout } = useContext(UserContext);
  const [user, setUser] = useState(null);
  const [xpData, setXpData] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [skinUrl, setSkinUrl] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [transferAmount, setTransferAmount] = useState("");
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferError, setTransferError] = useState(null);
  const [transferPhase, setTransferPhase] = useState("idle");
  const [transferSuccess, setTransferSuccess] = useState(null);

  const [walletInfoOpen, setWalletInfoOpen] = useState(false);
  const walletInfoRef = useRef(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingTransfer, setPendingTransfer] = useState(null);

  const [avatarErrorIndex, setAvatarErrorIndex] = useState(0);

  const [displayXpTotal, setDisplayXpTotal] = useState(0);
  const lastDisplayXpRef = useRef(0);

  const walletRef = useRef(null);
  const navigate = useNavigate();

  const sessionUuid = sessionUser?.uuid;
  const sessionLoggedIn = sessionUser?.loggedIn;

  const emitBalances = (detail) => {
    try {
      window.dispatchEvent(new CustomEvent("fc:balances", { detail: detail || {} }));
    } catch {}
  };

  useEffect(() => {
    const onDocDown = (e) => {
      if (!walletInfoRef.current) return;
      if (!walletInfoRef.current.contains(e.target)) setWalletInfoOpen(false);
    };
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, []);

  useEffect(() => {
    if (!transferSuccess) return;
    const timer = window.setTimeout(() => {
      setTransferSuccess(null);
    }, 4200);
    return () => window.clearTimeout(timer);
  }, [transferSuccess]);

  useEffect(() => {
    if (!sessionUuid || !sessionLoggedIn) {
      navigate("/");
      return;
    }

    const token = getAuthToken();

    const cargarDatos = async () => {
      try {
        setLoading(true);
        setError(null);

        const reqs = [
          fetch(apiUrl(`/api/usuarios/${sessionUuid}`)),
          fetch(apiUrl(`/api/monedas/${sessionUuid}`)),
          fetch(apiUrl(`/api/usuarios/${sessionUuid}/xp`)),
          fetch(apiUrl(`/api/usuarios/${sessionUuid}/skin`)),
        ];

        if (token) {
          reqs.push(
            fetch(apiUrl(`/api/daily-claim/status`), {
              headers: { Authorization: `Bearer ${token}` },
            })
          );
        } else {
          reqs.push(Promise.resolve(null));
        }

        const [usuarioRes, monedasRes, xpRes, skinRes, walletRes] = await Promise.all(reqs);

        if (!usuarioRes?.ok) {
          const body = await safeJson(usuarioRes, null);
          throw new Error(body?.error || "Error al cargar datos del usuario");
        }

        const usuario = await safeJson(usuarioRes, {});

        let monedasRaw = { balances: [], byServer: {} };
        if (monedasRes?.ok) {
          monedasRaw =
            (await safeJson(monedasRes, { balances: [], byServer: {} })) || {
              balances: [],
              byServer: {},
            };
        }

        let xp = null;
        if (xpRes?.ok) {
          xp = await safeJson(xpRes, null);
        }

        const trueTotalXp = toInt(usuario?.xp_actual || 0);

        if (!xp || !Array.isArray(xp?.niveles)) {
          xp = {
            nivel: toInt(usuario?.nivel || 1),
            xp_actual: trueTotalXp,
            xp_total_actual: trueTotalXp,
            xp_total_maxima: 0,
            niveles: [],
          };
        } else {
          xp.xp_actual = trueTotalXp;
          xp.xp_total_actual = trueTotalXp;
        }

        const xpDerived = deriveXpStateFromTotal(trueTotalXp, xp?.niveles || []);

        let skin = null;
        if (skinRes?.ok) {
          skin = await safeJson(skinRes, null);
        }

        const coinsByServerParsed = parseCoinsPayload(monedasRaw);

        const rol_admin = normalizeRank(usuario?.rol_admin);
        const rango_usuario = normalizeRank(usuario?.rango_usuario);
        const rango_staff = normalizeRank(usuario?.rango_staff);
        const rango_real = resolveDisplayRankFromUser({
          ...usuario,
          rol_admin,
          rango_usuario,
          rango_staff,
        });
        const es_premium = usuario?.es_premium === true;

        let wallet = toInt(usuario?.wallet_coins ?? 0);

        if (walletRes) {
          if (walletRes.status === 401) {
            clearSessionStorage();
            logout();
            return;
          }

          if (walletRes.ok) {
            const w = await safeJson(walletRes, null);
            wallet = toInt(w?.walletBalance ?? w?.wallet_balance ?? wallet);
          }
        }

        setSkinUrl(skin?.skin_url || null);
        setWalletBalance(wallet);
        setDisplayXpTotal(xpDerived.xpTotalActual);
        lastDisplayXpRef.current = xpDerived.xpTotalActual;

        const hydratedUser = {
          ...usuario,
          rol_admin,
          monedas: monedasRaw,
          coinsByServer: coinsByServerParsed,
          rango_usuario,
          rango_staff,
          rango_real,
          es_premium,
          wallet_coins: wallet,
          nivel: xpDerived.nivel,
          xp_actual: xpDerived.xpActualNivel,
        };

        setUser(hydratedUser);
        setXpData(xp);

        emitBalances({ walletCoins: wallet, coinsByServer: coinsByServerParsed });

        setSessionUser(
          {
            loggedIn: true,
            uuid: sessionUuid,
            uid: usuario?.uid,
            wallet_coins: wallet,
            rol_admin,
            rango_usuario,
            rango_staff,
            rango_real,
            nivel: xpDerived.nivel,
            xp_actual: xpDerived.xpActualNivel,
            es_premium,
          },
          token
        );
      } catch (err) {
        setError(err.message || "Error");
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, [navigate, sessionUuid, sessionLoggedIn, logout, setSessionUser]);

  useEffect(() => {
    const nextTotal = toInt(xpData?.xp_total_actual || 0);
    const prevTotal = lastDisplayXpRef.current;

    if (nextTotal === prevTotal) {
      setDisplayXpTotal(nextTotal);
      return;
    }

    animateNumber(
      prevTotal,
      nextTotal,
      (value) => {
        setDisplayXpTotal(value);
      },
      () => {
        lastDisplayXpRef.current = nextTotal;
        setDisplayXpTotal(nextTotal);
      },
      950
    );
  }, [xpData?.xp_total_actual]);

  const actualizarMonedas = useCallback(async () => {
    if (!user) return false;

    try {
      const token = getAuthToken();

      const reqs = [
        fetch(apiUrl(`/api/monedas/${user.uuid}`)),
        token
          ? fetch(apiUrl(`/api/daily-claim/status`), {
              headers: { Authorization: `Bearer ${token}` },
            })
          : Promise.resolve(null),
      ];

      const [monedasRes, walletRes] = await Promise.all(reqs);

      let monedasActualizadas = { balances: [], byServer: {} };

      if (monedasRes?.ok) {
        monedasActualizadas =
          (await safeJson(monedasRes, { balances: [], byServer: {} })) || {
            balances: [],
            byServer: {},
          };
      }

      const coinsByServerParsed = parseCoinsPayload(monedasActualizadas);

      let wallet = toInt(user?.wallet_coins ?? walletBalance ?? 0);

      if (walletRes) {
        if (walletRes.status === 401) {
          clearSessionStorage();
          logout();
          return false;
        } else if (walletRes.ok) {
          const w = await safeJson(walletRes, null);
          wallet = toInt(w?.walletBalance ?? w?.wallet_balance ?? wallet);
        }
      }

      setWalletBalance(wallet);
      setUser((prev) => ({
        ...prev,
        monedas: monedasActualizadas,
        coinsByServer: coinsByServerParsed,
        wallet_coins: wallet,
      }));

      emitBalances({ walletCoins: wallet, coinsByServer: coinsByServerParsed });

      setSessionUser(
        {
          loggedIn: true,
          uuid: user.uuid,
          uid: user?.uid,
          wallet_coins: wallet,
          rol_admin: user?.rol_admin ?? null,
          rango_usuario: user?.rango_usuario ?? null,
          rango_staff: user?.rango_staff ?? null,
          rango_real: user?.rango_real ?? null,
          nivel: user?.nivel ?? 1,
          xp_actual: user?.xp_actual ?? 0,
          es_premium: !!user?.es_premium,
        },
        token
      );

      return true;
    } catch (err) {
      return false;
    }
  }, [user, walletBalance, logout, setSessionUser]);

  const handleXpClaimed = useCallback(
    (xpGained) => {
      const gained = toInt(xpGained);
      if (!gained) return;

      setXpData((prevXp) => {
        if (!prevXp) return prevXp;

        const niveles = Array.isArray(prevXp?.niveles) ? prevXp.niveles : [];
        const prevTotal = toInt(prevXp?.xp_actual || 0);
        const nextTotal = prevTotal + gained;

        const prevDerived = deriveXpStateFromTotal(prevTotal, niveles);
        const nextDerived = deriveXpStateFromTotal(nextTotal, niveles);
        const levelsGained = Math.max(0, nextDerived.nivel - prevDerived.nivel);
        const token = getAuthToken();

        setUser((prevUser) => {
          if (!prevUser) return prevUser;

          const updatedUser = {
            ...prevUser,
            nivel: nextDerived.nivel,
            xp_actual: nextDerived.xpActualNivel,
          };

          setSessionUser(
            {
              loggedIn: true,
              uuid: updatedUser.uuid,
              uid: updatedUser?.uid,
              wallet_coins: updatedUser?.wallet_coins ?? 0,
              rol_admin: updatedUser?.rol_admin ?? null,
              rango_usuario: updatedUser?.rango_usuario ?? null,
              rango_staff: updatedUser?.rango_staff ?? null,
              rango_real: updatedUser?.rango_real ?? null,
              nivel: nextDerived.nivel,
              xp_actual: nextDerived.xpActualNivel,
              es_premium: !!updatedUser?.es_premium,
            },
            token
          );

          return updatedUser;
        });

        if (levelsGained > 0) {
          playLevelUpSound(levelsGained);
        }

        return {
          ...prevXp,
          nivel: nextDerived.nivel,
          xp_actual: nextTotal,
          xp_total_actual: nextTotal,
        };
      });
    },
    [setSessionUser]
  );

  const rawUid = useMemo(() => String(user?.uid || "").trim(), [user?.uid]);
  const avatarName = useMemo(() => rawUid.replace(/^\.+/, ""), [rawUid]);
  const isLikelyBedrock = useMemo(() => rawUid.startsWith("."), [rawUid]);

  const avatarSources = useMemo(() => {
    const out = [];

    if (!isLikelyBedrock && avatarName) {
      out.push(`https://mc-heads.net/body/${encodeURIComponent(avatarName)}/260`);
    }

    if (skinUrl) out.push(String(skinUrl).trim());

    if (isLikelyBedrock) {
      out.push("/assets/skins/bedrock-default.webp");
    }

    out.push("/assets/skins/default-steve.webp");

    return out.filter(Boolean);
  }, [skinUrl, isLikelyBedrock, avatarName]);

  useEffect(() => {
    setAvatarErrorIndex(0);
  }, [skinUrl, rawUid]);

  const avatarUrl = avatarSources[avatarErrorIndex] || "/assets/skins/default-steve.webp";

  const derivedDisplayXp = useMemo(
    () => deriveXpStateFromTotal(displayXpTotal, xpData?.niveles || []),
    [displayXpTotal, xpData?.niveles]
  );

  const xpDelNivelActual = derivedDisplayXp.xpRequeridaNivel;
  const porcentajeNivel = derivedDisplayXp.porcentaje;

  const displayRankKey = useMemo(() => resolveDisplayRankFromUser(user), [user]);
  const displayRankLabel = useMemo(() => DISPLAY_RANK_LABELS[displayRankKey] || "USUARIO", [displayRankKey]);
  const adminRoleKey = useMemo(() => resolveStaffPanelRole(user), [user]);

  const rangoKey = useMemo(() => {
    const r = normalizeRank(user?.rango_usuario);
    if (!r || !USER_RANKS.has(r)) return "none";
    return r;
  }, [user?.rango_usuario]);

  const avatarBg = useMemo(() => {
    switch (rangoKey) {
      case "nova": return "/assets/backnova.webp";
      case "alpha": return "/assets/backalpha.webp";
      case "inmortal": return "/assets/backinmortal.webp";
      default: return "/assets/backunrank.webp";
    }
  }, [rangoKey]);

  const coinsByServer = useMemo(() => {
    if (user?.coinsByServer && typeof user.coinsByServer === "object") return user.coinsByServer;
    return parseCoinsPayload(user?.monedas);
  }, [user?.coinsByServer, user?.monedas]);

  const totalCoins = useMemo(() => {
    if (user?.wallet_coins != null) return toInt(user.wallet_coins);
    return toInt(walletBalance);
  }, [user?.wallet_coins, walletBalance]);

  const serverCoins = useMemo(() => {
    const by = coinsByServer || {};
    if (SERVER_KEY in by) return toInt(by[SERVER_KEY]);
    if ("global" in by) return toInt(by.global);
    return 0;
  }, [coinsByServer]);

  const transferLoadingTitle = transferPhase === "syncing" ? "Confirmando envío" : "Procesando envío";
  const transferLoadingText =
    transferPhase === "syncing"
      ? "Esperando la confirmación del servidor y actualizando tus saldos."
      : "Estamos enviando tu solicitud al servidor.";

  const addAmount = (val) => {
    setTransferError(null);
    setTransferSuccess(null);
    const current = toInt(transferAmount);
    const next = current + val;
    setTransferAmount(String(next > totalCoins ? totalCoins : next));
  };

  const openConfirm = () => {
    setTransferError(null);
    setTransferSuccess(null);

    const amt = toInt(transferAmount);
    if (amt <= 0) return setTransferError("Introduce una cantidad válida.");
    if (amt > totalCoins) return setTransferError("No tienes suficiente saldo en la wallet.");

    setPendingTransfer({ amt, server: SERVER_KEY });
    setConfirmOpen(true);
  };

  const doTransfer = async () => {
    if (!user?.uuid || !pendingTransfer || transferLoading) return;

    const requestedAmount = pendingTransfer.amt;

    setTransferError(null);
    setTransferSuccess(null);
    setTransferLoading(true);
    setTransferPhase("sending");

    try {
      const token = getAuthToken();

      const res = await fetch(apiUrl(`/api/wallet/transfer`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          uuid: user.uuid,
          servidor: SERVER_KEY,
          amount: requestedAmount,
        }),
      });

      const data = await safeJson(res, null);

      if (!res.ok) {
        throw new Error(data?.error || "Error al transferir coins");
      }

      const newWallet = toInt(data?.wallet_balance);

      setWalletBalance(newWallet);
      setUser((prev) => ({ ...prev, wallet_coins: newWallet }));

      if (walletRef?.current) {
        walletRef.current.textContent = String(newWallet);
      }

      emitBalances({ walletCoins: newWallet });

      setTransferPhase("syncing");

      const synced = await actualizarMonedas();

      setTransferAmount("");
      setConfirmOpen(false);
      setPendingTransfer(null);

      setTransferSuccess({
        amount: requestedAmount,
        synced,
      });
    } catch (e) {
      setTransferError(e.message || "Error");
      setConfirmOpen(false);
      setPendingTransfer(null);
    } finally {
      setTransferLoading(false);
      setTransferPhase("idle");
    }
  };

  return (
    <section className="dashboard-epic no-tap-highlight">
      <div className="dash-backgroundWrap" />
      <Seo title="Dashboard | FlanCraft" noindex />
      {!loading && !error && user && (
        <div className="dashboard-shell">
          <header className="dash-hero-title">
            <h1 className="dash-title">LA POSADA</h1>
          </header>

          <div className="dash-hero">
            <div className="dash-card">
              <div className="dash-grid">
                <aside className="dash-avatar-wrapper">
                  <div className="dash-avatar-box">
                    <img src={avatarBg} alt="" className="avatar-bg" draggable="false" />
                    {avatarUrl && (
                      <img
                        src={avatarUrl}
                        alt={`Skin de ${user.uid}`}
                        className="skin-jugador"
                        loading="eager"
                        decoding="async"
                        onError={() => {
                          setAvatarErrorIndex((prev) => {
                            const next = prev + 1;
                            return next < avatarSources.length ? next : prev;
                          });
                        }}
                      />
                    )}
                  </div>
                </aside>

                <main className="dash-main">
                  <div className="dash-topline">
                    <div className="dash-name">
                      <h2 className={`player-nombre is-${displayRankKey}`}>{user.uid}</h2>

                      <div className="player-badges">
                        {displayRankKey !== "usuario" && (
                          <span className={`badge-staff badge-${displayRankKey}`}>
                            {displayRankLabel}
                          </span>
                        )}

                        {user.es_premium && (
                          <img
                            src="/assets/premium.webp"
                            alt="Cuenta premium"
                            className="badge-premium"
                            loading="eager"
                            decoding="async"
                          />
                        )}
                      </div>
                    </div>

                    <a href="/tienda" className="mc-btn mc-btn--shop">
                      Ir a la tienda
                    </a>
                  </div>

                  <div className="dash-wallet-row">
                    <div className="wallet-pill" ref={walletInfoRef}>
                      <span className="wallet-pillLabel">WALLET COINS</span>

                      <button
                        type="button"
                        className="wallet-pillInfo"
                        onClick={() => setWalletInfoOpen((v) => !v)}
                        aria-label="Información sobre Wallet COINS"
                        aria-expanded={walletInfoOpen}
                      >
                        i
                      </button>

                      <span className="wallet-pillAmount" ref={walletRef} id="contador-coins">
                        {totalCoins}
                      </span>

                      <img
                        src="/tienda/assets/coin.png"
                        alt="Coins"
                        className="wallet-pillCoin"
                        loading="eager"
                        decoding="async"
                        draggable="false"
                      />

                      {walletInfoOpen && (
                        <div className="wallet-tooltip mc-element" role="dialog" aria-label="Wallet COINS">
                          <div className="wallet-tooltip-title">¿Qué son las Wallet COINS?</div>
                          <div className="wallet-tooltip-text">
                            Son COINS que consigues en la web: claim diario, voto y logros. Puedes enviarlas al servidor y la cantidad que decidas.
                          </div>
                          <div className="wallet-tooltip-note">Pon cantidad y confirma.</div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="wallet-transfer-panel">
                    <div className="transfer-head">
                      <div className="transfer-title">TRANSFERENCIA DE COINS</div>
                    </div>

                    <div className="transfer-visual-flow">
                      <div className="flow-node origin">
                        <div className="flow-icon-wrap">
                          <img src="/tienda/assets/coin.png" alt="Wallet" draggable="false" />
                        </div>
                        <div className="flow-info">
                          <span className="flow-label">TU WALLET</span>
                          <span className="flow-val">{totalCoins}</span>
                        </div>
                      </div>

                      <div className="flow-divider">
                        <div className="flow-arrow" />
                      </div>

                      <div className="flow-node dest">
                        <div className="flow-icon-wrap">
                          <img src={SERVER_ICON} alt="Survival" draggable="false" />
                        </div>
                        <div className="flow-info">
                          <span className="flow-label">{SERVER_LABEL}</span>
                          <span className="flow-val">{serverCoins}</span>
                        </div>
                      </div>
                    </div>

                    <div className="transfer-input-section">
                      <div className="amount-wrap">
                        <img src="/tienda/assets/coin.png" alt="" className="coin-in-input" draggable="false" />
                        <input
                          type="number"
                          min="0"
                          inputMode="numeric"
                          placeholder="0"
                          className="mc-input massive-input"
                          value={transferAmount}
                          onChange={(e) => {
                            setTransferError(null);
                            setTransferSuccess(null);
                            setTransferAmount(e.target.value);
                          }}
                          disabled={transferLoading}
                        />
                      </div>

                      <div className="quick-add-buttons">
                        <button type="button" onClick={() => addAmount(50)} disabled={transferLoading}>+50</button>
                        <button type="button" onClick={() => addAmount(100)} disabled={transferLoading}>+100</button>
                        <button type="button" onClick={() => addAmount(500)} disabled={transferLoading}>+500</button>
                        <button type="button" className="is-max" onClick={() => setTransferAmount(String(totalCoins))} disabled={transferLoading}>MAX</button>
                      </div>
                    </div>

                    <button
                      type="button"
                      className={`mc-btn mc-btn--send massive-send-btn ${transferLoading ? "is-loading" : ""}`}
                      onClick={openConfirm}
                      disabled={transferLoading}
                    >
                      {transferLoading && <span className="btn-spinner" aria-hidden="true" />}
                      {transferLoading ? "PROCESANDO..." : "¡ENVIAR AL SERVIDOR!"}
                    </button>

                    {transferLoading && (
                      <div className="transfer-status is-loading" aria-live="polite">
                        <span className="transfer-statusSpinner" aria-hidden="true" />
                        <div className="transfer-statusCopy">
                          <div className="transfer-statusTitle">{transferLoadingTitle}</div>
                          <div className="transfer-statusText">{transferLoadingText}</div>
                        </div>
                      </div>
                    )}

                    {!transferLoading && transferSuccess && (
                      <div className="transfer-status is-success" aria-live="polite">
                        <span className="transfer-statusIcon" aria-hidden="true">✓</span>
                        <div className="transfer-statusCopy">
                          <div className="transfer-statusTitle">Coins enviadas correctamente</div>
                          <div className="transfer-statusText">
                            Se han enviado {transferSuccess.amount} COINS a {SERVER_LABEL}
                            {transferSuccess.synced ? "." : ". El saldo puede tardar un instante en reflejarse."}
                          </div>
                        </div>
                      </div>
                    )}

                    {transferError && <div className="transfer-msg is-error">{transferError}</div>}
                  </div>
                </main>
              </div>

              <div className="dash-level">
                <div className="level-top">
                  <span className="level-label">NIVEL</span>
                  <span className="level-badge">{derivedDisplayXp.nivel}</span>
                </div>

                <div className="level-bar-wrap">
                  <div className="level-bar">
                    <div className="level-fill" style={{ width: `${porcentajeNivel}%` }} />
                  </div>
                </div>

                <div className="level-text">
                  <span className="level-now">{toInt(derivedDisplayXp.xpActualNivel)}</span>
                  <span className="level-sep">/</span>
                  <span className="level-total">{toInt(xpDelNivelActual)} XP</span>
                </div>
              </div>

              {adminRoleKey && (
                <div className="dash-admin">
                  <div className="admin-head">
                    <div className="admin-title">PANEL DEL CONTROL</div>
                    <div className="admin-sub">Accesos rápidos.</div>
                  </div>

                  <div className="admin-actions">
                    <button className="mc-btn mc-btn--pink" onClick={() => navigate("/tribunal/admin")}>
                      TRIBUNAL
                    </button>

                    {adminRoleKey === "owner" && (
                      <>
                        <button className="mc-btn mc-btn--green" onClick={() => navigate("/admin")}>
                          GESTIÓN DE STAFF
                        </button>
                        <button className="mc-btn mc-btn--blue" onClick={() => navigate("/admin/noticias")}>
                          CREAR NOTICIA
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="dashboard-epic-body">
            <div className="dashboard-secciones">
              <RewardList user={user} xpData={xpData} ecosRef={walletRef} onActualizarMonedas={actualizarMonedas} />
              <LogroList user={user} onXpClaimed={handleXpClaimed} />
            </div>
          </div>

          {confirmOpen && pendingTransfer && (
            <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Confirmar envío">
              <div className={`modal-card mc-block ${transferLoading ? "is-loading" : ""}`}>
                <div className="modal-title">CONFIRMAR ENVÍO</div>

                <div className="modal-line">
                  Vas a enviar <strong style={{color: '#fbbf24'}}>{pendingTransfer.amt}</strong> COINS a <strong style={{color: '#fbbf24'}}>{SERVER_LABEL}</strong>.
                </div>

                <div className="modal-sub">Se descontarán de tu wallet y se sumarán al saldo del servidor.</div>

                {transferLoading && (
                  <div className="modal-progress" aria-live="polite">
                    <span className="modal-progressSpinner" aria-hidden="true" />
                    <div className="modal-progressCopy">
                      <div className="modal-progressTitle">{transferLoadingTitle}</div>
                      <div className="modal-progressText">{transferLoadingText}</div>
                    </div>
                  </div>
                )}

                <div className="modal-actions">
                  <button
                    className="mc-btn mc-btn--ghost"
                    type="button"
                    onClick={() => {
                      setConfirmOpen(false);
                      setPendingTransfer(null);
                    }}
                    disabled={transferLoading}
                  >
                    CANCELAR
                  </button>

                  <button
                    className={`mc-btn mc-btn--send ${transferLoading ? "is-loading" : ""}`}
                    type="button"
                    onClick={doTransfer}
                    disabled={transferLoading}
                  >
                    {transferLoading && <span className="btn-spinner" aria-hidden="true" />}
                    {transferLoading ? "..." : "SÍ, ENVIAR"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className="loading-overlay">
          <div className="loading-orbital">
            <div className="loading-ring" />
            <div className="loading-gem-wrapper">
              <img src="/tienda/assets/coin.png" alt="Cargando perfil" className="loading-gem" draggable="false" />
            </div>
          </div>
          <div className="loading-text-block">
            <p className="loading-title">CARGANDO...</p>
          </div>
        </div>
      )}

      {!loading && error && (
        <div className="dashboard-shell">
          <div className="error-msg">Error al cargar perfil: {error}</div>
        </div>
      )}
    </section>
  );
}