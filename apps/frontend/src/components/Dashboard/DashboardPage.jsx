// src/pages/Dashboard/DashboardPage.jsx
import { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import RewardList from "./RewardList";
import LogroList from "./LogroList";
import "../../styles/components/Dashboard/_dashboardpage.scss";

const API_BASE =
  import.meta.env.VITE_BACKEND_URL || "https://flancraft-backend.onrender.com";

const SERVERS_COINS = [
  { key: "gens", label: "GENS" },
  { key: "oneblock", label: "ONEBLOCK" },
  { key: "survival", label: "SURVIVAL" },
];

const toInt = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
};

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [xpData, setXpData] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Transfer UI
  const [serverSelected, setServerSelected] = useState("gens");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferError, setTransferError] = useState(null);
  const [transferOk, setTransferOk] = useState(null);

  // contador principal (wallet)
  const walletRef = useRef(null);

  const navigate = useNavigate();

  // =========================
  // LOAD INICIAL
  // =========================
  useEffect(() => {
    const stored = localStorage.getItem("flan_user");
    if (!stored) return navigate("/");

    const parsed = JSON.parse(stored);
    if (!parsed.uuid || !parsed.loggedIn) return navigate("/");

    const token = localStorage.getItem("token");

    const cargarDatos = async () => {
      try {
        const reqs = [
          fetch(`${API_BASE}/api/usuarios/${parsed.uuid}`),
          fetch(`${API_BASE}/api/monedas/${parsed.uuid}`),
          fetch(`${API_BASE}/api/usuarios/${parsed.uuid}/xp`),
          fetch(`${API_BASE}/api/usuarios`),
        ];

        if (token) {
          reqs.push(
            fetch(`${API_BASE}/api/daily-claim/status`, {
              headers: { Authorization: `Bearer ${token}` },
            })
          );
        } else {
          reqs.push(Promise.resolve(null));
        }

        const [usuarioRes, monedasRes, xpRes, usuariosRes, walletRes] = await Promise.all(reqs);

        if (!usuarioRes?.ok || !monedasRes?.ok || !xpRes?.ok || !usuariosRes?.ok) {
          throw new Error("Error al cargar datos");
        }

        const usuario = await usuarioRes.json();
        const monedas = await monedasRes.json();
        const xp = await xpRes.json();
        const usuarios = await usuariosRes.json();

        const actual = usuarios.find((u) => u.uuid === parsed.uuid);
        const rango_usuario = actual?.rango_usuario || null;
        const es_premium = actual?.es_premium || false;

        let wallet = 0;
        if (walletRes) {
          if (walletRes.status === 401) {
            localStorage.removeItem("token");
          } else if (walletRes.ok) {
            const w = await walletRes.json();
            wallet = toInt(w?.walletBalance);
          }
        }

        setWalletBalance(wallet);

        setUser({
          ...usuario,
          monedas,
          rango_usuario,
          es_premium,
          wallet_coins: wallet,
        });

        setXpData(xp);
      } catch (err) {
        setError(err.message || "Error");
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, [navigate]);

  // =========================
  // REFRESH BALANCES
  // =========================
  const actualizarMonedas = async () => {
    if (!user) return;
    try {
      const token = localStorage.getItem("token");

      const reqs = [
        fetch(`${API_BASE}/api/monedas/${user.uuid}`),
        token
          ? fetch(`${API_BASE}/api/daily-claim/status`, {
              headers: { Authorization: `Bearer ${token}` },
            })
          : Promise.resolve(null),
      ];

      const [monedasRes, walletRes] = await Promise.all(reqs);

      if (!monedasRes.ok) throw new Error("Error al actualizar monedas");

      const monedasActualizadas = await monedasRes.json();

      let wallet = walletBalance;
      if (walletRes) {
        if (walletRes.status === 401) {
          localStorage.removeItem("token");
          wallet = 0;
        } else if (walletRes.ok) {
          const w = await walletRes.json();
          wallet = toInt(w?.walletBalance);
        }
      }

      setWalletBalance(wallet);
      setUser((prev) => ({
        ...prev,
        monedas: monedasActualizadas,
        wallet_coins: wallet,
      }));
    } catch (err) {
      console.error("[BALANCES]", err.message);
    }
  };

  const avatarUrl = user ? `https://minotar.net/armor/body/${user.uid}/160.png` : null;

  const nivelInfo = xpData?.niveles?.find((n) => n.nivel === user?.nivel);
  const xpDelNivelActual = nivelInfo?.xp_requerida || 1;
  const porcentajeNivel = user
    ? Math.min(100, (user.xp_actual / xpDelNivelActual) * 100)
    : 0;

  const rangoKey = useMemo(() => {
    const r = (user?.rango_usuario || "").toString().trim().toLowerCase();
    if (!r) return "none";
    if (r.includes("nova")) return "nova";
    if (r.includes("alpha")) return "alpha";
    if (r.includes("inmortal")) return "inmortal";
    return "none";
  }, [user?.rango_usuario]);

  const avatarBg = useMemo(() => {
    switch (rangoKey) {
      case "nova":
        return "/assets/backnova.webp";
      case "alpha":
        return "/assets/backalpha.webp";
      case "inmortal":
        return "/assets/backinmortal.webp";
      default:
        return "/assets/backunrank.webp";
    }
  }, [rangoKey]);

  // =========================
  // COINS POR SERVIDOR (monedas_actuales)
  // =========================
  const coinsByServer = useMemo(() => {
    const m = user?.monedas;
    if (!m) return {};

    if (m.byServer && typeof m.byServer === "object") {
      const out = {};
      for (const [k, v] of Object.entries(m.byServer)) out[String(k)] = toInt(v);
      return out;
    }

    if (Array.isArray(m.balances)) {
      const out = {};
      for (const row of m.balances) {
        const key = String(row?.servidor || "").trim().toLowerCase();
        if (!key) continue;
        out[key] = toInt(row?.coins);
      }
      return out;
    }

    if (m.coins != null) return { global: toInt(m.coins) };
    if (m.ecos != null) return { global: toInt(m.ecos) };

    return {};
  }, [user?.monedas]);

  // =========================
  // WALLET (saldo principal)
  // =========================
  const totalCoins = useMemo(() => {
    if (user?.wallet_coins != null) return toInt(user.wallet_coins);
    return toInt(walletBalance);
  }, [user?.wallet_coins, walletBalance]);

  // =========================
  // TRANSFER WALLET -> SERVER
  // =========================
  const handleMax = () => {
    setTransferOk(null);
    setTransferError(null);
    setTransferAmount(String(totalCoins));
  };

  const handleTransfer = async () => {
    if (!user?.uuid) return;

    setTransferOk(null);
    setTransferError(null);

    const amt = toInt(transferAmount);
    if (amt <= 0) {
      setTransferError("Introduce una cantidad válida.");
      return;
    }

    if (amt > totalCoins) {
      setTransferError("No tienes suficiente saldo en la wallet.");
      return;
    }

    setTransferLoading(true);

    try {
      const token = localStorage.getItem("token");
      // Si quieres forzar auth real, exige token aquí:
      // if (!token) throw new Error("Sesión caducada. Vuelve a iniciar sesión.");

      const res = await fetch(`${API_BASE}/api/wallet/transfer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          uuid: user.uuid,
          servidor: serverSelected,
          amount: amt,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Error al transferir coins");

      const newWallet = toInt(data?.wallet_balance);
      const newServerBalance = toInt(data?.server_balance);

      // Actualización inmediata UI
      setWalletBalance(newWallet);
      setUser((prev) => ({
        ...prev,
        wallet_coins: newWallet,
        monedas: prev?.monedas, // lo refrescamos abajo igual
      }));

      // También animamos el contador grande si existe
      if (walletRef?.current) walletRef.current.textContent = String(newWallet);

      // Refresco “oficial” (por si tu /monedas agrega forma distinta)
      await actualizarMonedas();

      setTransferOk(
        `Enviado: ${amt} COINS a ${String(data?.servidor || serverSelected).toUpperCase()}`
      );
      setTransferAmount("");
    } catch (e) {
      setTransferError(e.message || "Error");
    } finally {
      setTransferLoading(false);
    }
  };

  return (
    <section className="dashboard-epic">
      {!loading && !error && user && (
        <div className="dashboard-wrap fade-slide-in">
          <div className="dashboard-frame">
            <header className="epic-header-dashboard">
              <div className="epic-header-text">
                <h1 className="epic-title">Tu Posada</h1>
                <p className="epic-subtitle">
                  Explora tu progreso, logros y riquezas acumuladas en el mundo de FlanCraft.
                </p>
              </div>
            </header>

            <div className="dashboard-player-card">
              <div className="player-card-banner" aria-hidden="true">
                <div className="player-card-banner-bg" />
                <div className="player-card-banner-overlay" />
              </div>

              <div className="player-main-layout">
                <div className="player-avatar-column">
                  <div className={`avatar-frame avatar-frame--${rangoKey}`}>
                    <div className="avatar-inner">
                      <img
                        src={avatarBg}
                        alt="Fondo del rango"
                        className="avatar-bg"
                        loading="eager"
                        decoding="async"
                      />

                      {avatarUrl && (
                        <img
                          src={avatarUrl}
                          alt={`Skin de ${user.uid}`}
                          className="skin-jugador"
                          loading="eager"
                          decoding="async"
                        />
                      )}
                    </div>

                    {user.rango_usuario && (
                      <img
                        src={`/assets/etiquetas/${user.rango_usuario.toLowerCase().trim()}.webp`}
                        alt={user.rango_usuario}
                        className="avatar-rango-badge"
                        loading="eager"
                        decoding="async"
                      />
                    )}
                  </div>
                </div>

                <div className="player-info-column">
                  <div className="player-identidad">
                    <div className="player-nombre-row">
                      <h2 className="player-nombre">{user.uid}</h2>

                      <div className="player-badges">
                        {user.rol_admin && (
                          <span className={`badge-staff badge-${user.rol_admin.toLowerCase()}`}>
                            {user.rol_admin.toUpperCase()}
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

                    <p className="player-tagline">
                      Aventura en curso. Tu leyenda en FlanCraft sigue escribiéndose.
                    </p>
                  </div>

                  <div className="player-stats-row">
                    <div className="stat-block saldo-block">
                      <p className="stat-label">Wallet de FlanCraft</p>

                      <div className="stat-saldo">
                        <div className="saldo-top">
                          <div className="saldo-info">
                            <span className="saldo-cantidad" ref={walletRef} id="contador-coins">
                              {totalCoins}
                            </span>

                            <img
                              src="/tienda/assets/coin.png"
                              alt="Coins"
                              className="icono-eco pulse"
                              loading="eager"
                              decoding="async"
                              draggable="false"
                            />
                          </div>

                          <a href="/tienda" className="btn-primario">
                            Ir a la tienda
                          </a>
                        </div>

                        <div className="saldo-servidores" aria-label="Saldos por servidor">
                          {SERVERS_COINS.map((s) => (
                            <div key={s.key} className={`saldo-server saldo-server--${s.key}`}>
                              <span className="saldo-server-nombre">{s.label}</span>
                              <span className="saldo-server-valor">{toInt(coinsByServer[s.key])}</span>
                            </div>
                          ))}
                        </div>

                        {/* NUEVO: transfer */}
                        <div className="wallet-transfer">
                          <div className="wallet-transfer-head">
                            <div className="wallet-transfer-title">Enviar COINS al servidor</div>
                            <div className="wallet-transfer-sub">
                              Mueves COINS de la wallet a tu saldo del servidor elegido.
                            </div>
                          </div>

                          <div className="wallet-transfer-grid">
                            <div className="wallet-transfer-servers">
                              {SERVERS_COINS.map((s) => (
                                <button
                                  key={s.key}
                                  type="button"
                                  className={[
                                    "wallet-server-btn",
                                    serverSelected === s.key ? "is-active" : "",
                                  ].join(" ")}
                                  onClick={() => {
                                    setTransferOk(null);
                                    setTransferError(null);
                                    setServerSelected(s.key);
                                  }}
                                  disabled={transferLoading}
                                >
                                  {s.label}
                                </button>
                              ))}
                            </div>

                            <div className="wallet-transfer-amount">
                              <input
                                type="number"
                                min="0"
                                inputMode="numeric"
                                placeholder="Cantidad"
                                value={transferAmount}
                                onChange={(e) => {
                                  setTransferOk(null);
                                  setTransferError(null);
                                  setTransferAmount(e.target.value);
                                }}
                                disabled={transferLoading}
                              />

                              <button
                                type="button"
                                className="wallet-max-btn"
                                onClick={handleMax}
                                disabled={transferLoading}
                              >
                                Max
                              </button>
                            </div>

                            <div className="wallet-transfer-actions">
                              <button
                                type="button"
                                className="wallet-send-btn"
                                onClick={handleTransfer}
                                disabled={transferLoading}
                              >
                                {transferLoading ? "Enviando..." : "Enviar"}
                              </button>
                            </div>
                          </div>

                          {transferError && <div className="wallet-transfer-msg is-error">{transferError}</div>}
                          {transferOk && <div className="wallet-transfer-msg is-ok">{transferOk}</div>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="nivel-global-wrapper">
                <div className="nivel-global-header">
                  <span className="nivel-global-label">Nivel</span>
                  <span className="nivel-global-valor">{user.nivel}</span>
                </div>

                <div className="nivel-global-bar">
                  <div className="nivel-global-fill" style={{ width: `${porcentajeNivel}%` }} />
                </div>

                <div className="nivel-global-text">
                  <span className="nivel-global-actual">{user.xp_actual}</span>
                  <span className="nivel-global-separador">/</span>
                  <span className="nivel-global-total">{xpDelNivelActual} XP</span>
                </div>
              </div>

              {user.rol_admin && (
                <>
                  <div className="player-card-separator" />
                  <div className="player-admin-panel">
                    <h3 className="panel-title">Panel del Control</h3>
                    <p className="panel-desc">Accesos rápidos a las salas de gestión del reino.</p>

                    <div className="player-admin-actions">
                      <button className="admin-btn" onClick={() => navigate("/tribunal/admin")}>
                        Tribunal
                      </button>

                      {user.rol_admin.toLowerCase() === "owner" && (
                        <>
                          <button className="admin-btn" onClick={() => navigate("/admin")}>
                            Gestión de staff
                          </button>
                          <button className="admin-btn" onClick={() => navigate("/admin/noticias")}>
                            Crear noticia
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="dashboard-epic-body">
              <div className="dashboard-secciones">
                <RewardList
                  user={user}
                  xpData={xpData}
                  ecosRef={walletRef}
                  onActualizarMonedas={actualizarMonedas}
                />

                <LogroList user={user} />
              </div>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="loading-overlay">
          <div className="loading-orbital">
            <div className="loading-ring" />
            <div className="loading-gem-wrapper">
              <img
                src="/tienda/assets/coin.png"
                alt="Cargando perfil"
                className="loading-gem"
                draggable="false"
              />
            </div>
            <div className="loading-orbit loading-orbit-1" />
            <div className="loading-orbit loading-orbit-2" />
          </div>

          <div className="loading-text-block">
            <p className="loading-title">Invocando tu posada...</p>
            <p className="loading-subtitle">Cargando perfil de aventurero</p>
          </div>
        </div>
      )}

      {!loading && error && (
        <div className="dashboard-epic-body">
          <p className="error-msg">Error al cargar perfil: {error}</p>
        </div>
      )}
    </section>
  );
}
