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

export default function DashboardPage() {
  const { user: sessionUser, setUser: setSessionUser, logout } = useContext(UserContext);
  const [user, setUser] = useState(null);
  const [xpData, setXpData] = useState(null);
  const [skinUrl, setSkinUrl] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [avatarErrorIndex, setAvatarErrorIndex] = useState(0);

  const [displayXpTotal, setDisplayXpTotal] = useState(0);
  const lastDisplayXpRef = useRef(0);

  const navigate = useNavigate();

  const sessionUuid = sessionUser?.uuid;
  const sessionLoggedIn = sessionUser?.loggedIn;

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
          fetch(apiUrl(`/api/usuarios/${sessionUuid}/xp`)),
          fetch(apiUrl(`/api/usuarios/${sessionUuid}/skin`)),
        ];

        const [usuarioRes, xpRes, skinRes] = await Promise.all(reqs);

        if (!usuarioRes?.ok) {
          const body = await safeJson(usuarioRes, null);
          throw new Error(body?.error || "Error al cargar datos del usuario");
        }

        const usuario = await safeJson(usuarioRes, {});

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

        setSkinUrl(skin?.skin_url || null);
        setDisplayXpTotal(xpDerived.xpTotalActual);
        lastDisplayXpRef.current = xpDerived.xpTotalActual;

        const hydratedUser = {
          ...usuario,
          rol_admin,
          rango_usuario,
          rango_staff,
          rango_real,
          es_premium,
          nivel: xpDerived.nivel,
          xp_actual: xpDerived.xpActualNivel,
        };

        setUser(hydratedUser);
        setXpData(xp);

        setSessionUser(
          {
            loggedIn: true,
            uuid: sessionUuid,
            uid: usuario?.uid,
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

                  {/* NUEVO PANEL DE FLANITE (EL NEXO) - DESBLOQUEADO */}
                  <div className="nexo-premium-card">
                    <div className="nexo-bg" />
                    <div className="nexo-content">
                      <div className="nexo-crystal-wrap">
                        <img src="/tienda/assets/flanite.webp" className="nexo-crystal" alt="Flanite" draggable="false" />
                      </div>
                      <div className="nexo-info">
                        <h3>EL NEXO</h3>
                        <div className="nexo-balance">
                          <span>{user.flanpoints || 0}</span> FLT
                        </div>
                      </div>
                      <button 
                        className="mc-btn mc-btn--nexo" 
                        onClick={() => navigate("/nexo")}
                      >
                        ENTRAR AL NEXO
                      </button>
                    </div>
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
              <RewardList user={user} xpData={xpData} />
              <LogroList user={user} onXpClaimed={handleXpClaimed} />
            </div>
          </div>
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