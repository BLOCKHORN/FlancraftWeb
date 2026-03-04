import { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import RewardList from "./RewardList";
import LogroList from "./LogroList";
import "../../styles/components/Dashboard/_dashboardpage.scss";

const API_BASE = (import.meta.env.VITE_BACKEND_URL || "https://flancraft-backend.onrender.com")
  .trim()
  .replace(/\/$/, "");
const apiUrl = (path) => (API_BASE ? `${API_BASE}${path}` : path);

const SERVER_KEY = "survival";
const SERVER_LABEL = "SURVIVAL";
const SERVER_ICON = "/assets/reinos/survival-clasico.webp";

const toInt = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
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

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [xpData, setXpData] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [transferAmount, setTransferAmount] = useState("");
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferError, setTransferError] = useState(null);

  const [walletInfoOpen, setWalletInfoOpen] = useState(false);
  const walletInfoRef = useRef(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingTransfer, setPendingTransfer] = useState(null);

  const walletRef = useRef(null);
  const navigate = useNavigate();

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
    const stored = localStorage.getItem("flan_user");
    if (!stored) return navigate("/");

    let parsed = null;

    try {
      parsed = JSON.parse(stored);
    } catch {
      return navigate("/");
    }

    if (!parsed?.uuid || !parsed?.loggedIn) return navigate("/");

    const token = localStorage.getItem("token");
    const rolAdminLS = (localStorage.getItem("rol_admin") || "").trim();

    const cargarDatos = async () => {
      try {
        setError(null);

        const reqs = [
          fetch(apiUrl(`/api/usuarios/${parsed.uuid}`)),
          fetch(apiUrl(`/api/monedas/${parsed.uuid}`)),
          fetch(apiUrl(`/api/usuarios/${parsed.uuid}/xp`)),
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

        const [usuarioRes, monedasRes, xpRes, walletRes] = await Promise.all(reqs);

        if (!usuarioRes?.ok) {
          const body = await safeJson(usuarioRes, null);
          throw new Error(body?.error || "Error al cargar datos del usuario");
        }

        const usuario = await safeJson(usuarioRes, {});

        let monedasRaw = { balances: [], byServer: {} };
        if (monedasRes?.ok) {
          monedasRaw = (await safeJson(monedasRes, { balances: [], byServer: {} })) || { balances: [], byServer: {} };
        }

        let xp = null;
        if (xpRes?.ok) {
          xp = await safeJson(xpRes, null);
        }

        if (!xp || !Array.isArray(xp?.niveles)) {
          xp = {
            nivel: toInt(usuario?.nivel || 1),
            xp_actual: toInt(usuario?.xp_actual || 0),
            xp_total_actual: toInt(usuario?.xp_actual || 0),
            xp_total_maxima: 0,
            niveles: [],
          };
        }

        const coinsByServerParsed = parseCoinsPayload(monedasRaw);

        const rango_usuario = usuario?.rango_usuario || null;
        const es_premium = usuario?.es_premium === true;

        let wallet = toInt(usuario?.wallet_coins ?? 0);

        if (walletRes) {
          if (walletRes.status === 401) {
            localStorage.removeItem("token");
          } else if (walletRes.ok) {
            const w = await safeJson(walletRes, null);
            wallet = toInt(w?.walletBalance ?? w?.wallet_balance ?? wallet);
          }
        }

        setWalletBalance(wallet);

        setUser({
          ...usuario,
          rol_admin: usuario?.rol_admin || (rolAdminLS || null),
          monedas: monedasRaw,
          coinsByServer: coinsByServerParsed,
          rango_usuario,
          es_premium,
          wallet_coins: wallet,
        });

        setXpData(xp);

        emitBalances({ walletCoins: wallet, coinsByServer: coinsByServerParsed });
      } catch (err) {
        setError(err.message || "Error");
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, [navigate]);

  const actualizarMonedas = async () => {
    if (!user) return;

    try {
      const token = localStorage.getItem("token");

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
          (await safeJson(monedasRes, { balances: [], byServer: {} })) || { balances: [], byServer: {} };
      }

      const coinsByServerParsed = parseCoinsPayload(monedasActualizadas);

      let wallet = toInt(user?.wallet_coins ?? walletBalance ?? 0);

      if (walletRes) {
        if (walletRes.status === 401) {
          localStorage.removeItem("token");
          wallet = 0;
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
    } catch (err) {
      console.error("[BALANCES]", err.message);
    }
  };

  const avatarName = useMemo(() => {
    const raw = String(user?.uid || "").trim();
    return raw.replace(/^\.+/, "");
  }, [user?.uid]);

  const avatarUrl = avatarName ? `https://minotar.net/armor/body/${encodeURIComponent(avatarName)}/160.png` : null;

  const nivelInfo = xpData?.niveles?.find((n) => Number(n?.nivel) === Number(user?.nivel));
  const xpDelNivelActual = Math.max(1, toInt(nivelInfo?.xp_requerida || 1));
  const porcentajeNivel = user ? Math.min(100, (toInt(user.xp_actual) / xpDelNivelActual) * 100) : 0;

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

  const openConfirm = () => {
    setTransferError(null);
    const amt = toInt(transferAmount);
    if (amt <= 0) return setTransferError("Introduce una cantidad válida.");
    if (amt > totalCoins) return setTransferError("No tienes suficiente saldo en la wallet.");
    setPendingTransfer({ amt, server: SERVER_KEY });
    setConfirmOpen(true);
  };

  const doTransfer = async () => {
    if (!user?.uuid || !pendingTransfer) return;

    setTransferError(null);
    setTransferLoading(true);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(apiUrl(`/api/wallet/transfer`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          uuid: user.uuid,
          servidor: SERVER_KEY,
          amount: pendingTransfer.amt,
        }),
      });

      const data = await safeJson(res, null);

      if (!res.ok) {
        throw new Error(data?.error || "Error al transferir coins");
      }

      const newWallet = toInt(data?.wallet_balance);

      setWalletBalance(newWallet);
      setUser((prev) => ({ ...prev, wallet_coins: newWallet }));

      if (walletRef?.current) walletRef.current.textContent = String(newWallet);

      emitBalances({ walletCoins: newWallet });

      setTransferAmount("");
      setConfirmOpen(false);
      setPendingTransfer(null);

      await actualizarMonedas();
    } catch (e) {
      setTransferError(e.message || "Error");
      setConfirmOpen(false);
      setPendingTransfer(null);
    } finally {
      setTransferLoading(false);
    }
  };

  return (
    <section className="dashboard-epic">
      {!loading && !error && user && (
        <div className="dashboard-shell">
          <header className="dash-hero-title">
            <h1 className="dash-title">LA POSADA</h1>
          </header>

          <div className="dash-hero">
            <div className="dash-card">
              <div className="dash-grid">
                <aside className="dash-avatar">
                  <div className={`avatar-frame avatar-frame--${rangoKey}`}>
                    <div className="avatar-inner">
                      <img src={avatarBg} alt="Fondo del rango" className="avatar-bg" loading="eager" decoding="async" />
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
                </aside>

                <main className="dash-main">
                  <div className="dash-topline">
                    <div className="dash-name">
                      <h2 className="player-nombre">{user.uid}</h2>

                      <div className="player-badges">
                        {user.rol_admin && <span className={`badge-staff badge-${user.rol_admin.toLowerCase()}`}>{user.rol_admin.toUpperCase()}</span>}

                        {user.es_premium && (
                          <img src="/assets/premium.webp" alt="Cuenta premium" className="badge-premium" loading="eager" decoding="async" />
                        )}
                      </div>
                    </div>

                    <a href="/tienda" className="tsf-btn tsf-btn--shop">
                      <span className="tsf-btnFace">Ir a la tienda</span>
                      <span className="tsf-btnDepth" />
                    </a>
                  </div>

                  <div className="dash-wallet">
                    <div className="wallet-head">
                      <div className="wallet-pill" ref={walletInfoRef}>
                        <span className="wallet-pillLabel">Wallet Coins</span>

                        <button
                          type="button"
                          className="wallet-pillInfo"
                          onClick={() => setWalletInfoOpen((v) => !v)}
                          aria-label="Información sobre Wallet COINS"
                          aria-expanded={walletInfoOpen}
                        >
                          i
                        </button>

                        <span className="wallet-pillDivider" />

                        <span className="wallet-pillAmount" ref={walletRef} id="contador-coins">
                          {totalCoins}
                        </span>

                        <img src="/tienda/assets/coin.png" alt="Coins" className="wallet-pillCoin" loading="eager" decoding="async" draggable="false" />

                        {walletInfoOpen && (
                          <div className="wallet-tooltip" role="dialog" aria-label="Wallet COINS">
                            <div className="wallet-tooltip-title">¿Qué son las Wallet COINS?</div>
                            <div className="wallet-tooltip-text">
                              Son COINS que consigues en la web: claim diario, voto y logros. Puedes enviarlas al servidor y la cantidad que decidas.
                            </div>
                            <div className="wallet-tooltip-note">Pon cantidad y confirma.</div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="wallet-transfer">
                      <div className="transfer-head">
                        <div className="transfer-title">Enviar a Survival</div>
                        <div className="transfer-sub">Introduce la cantidad y confirma.</div>
                      </div>

                      <div className="transfer-singleServer" aria-label="Servidor destino">
                        <div className="server-cardBtn server-cardBtn--survival is-active">
                          <div className="server-cardBtnFace">
                            <div className="server-cardBtnLeft">
                              <img src={SERVER_ICON} alt="" className="server-icon" loading="eager" decoding="async" draggable="false" />
                              <span className="server-name">{SERVER_LABEL}</span>
                            </div>

                            <span className="server-balance" title="Saldo actual en el servidor">
                              <img src="/tienda/assets/coin.png" alt="" className="coin-mini" draggable="false" />
                              {serverCoins}
                            </span>
                          </div>
                          <div className="server-cardBtnDepth" />
                        </div>
                      </div>

                      <div className="transfer-row">
                        <div className="amount-wrap">
                          <img src="/tienda/assets/coin.png" alt="" className="coin-in-input" draggable="false" />
                          <input
                            type="number"
                            min="0"
                            inputMode="numeric"
                            placeholder="Cantidad"
                            value={transferAmount}
                            onChange={(e) => {
                              setTransferError(null);
                              setTransferAmount(e.target.value);
                            }}
                            disabled={transferLoading}
                          />

                          <button
                            type="button"
                            className="tsf-btn tsf-btn--ghost tsf-btn--small"
                            onClick={() => {
                              setTransferError(null);
                              setTransferAmount(String(totalCoins));
                            }}
                            disabled={transferLoading}
                          >
                            <span className="tsf-btnFace">Max</span>
                            <span className="tsf-btnDepth" />
                          </button>
                        </div>

                        <button type="button" className="tsf-btn tsf-btn--send" onClick={openConfirm} disabled={transferLoading}>
                          <span className="tsf-btnFace">{transferLoading ? "Enviando..." : "Enviar"}</span>
                          <span className="tsf-btnDepth" />
                        </button>
                      </div>

                      {transferError && <div className="transfer-msg is-error">{transferError}</div>}
                    </div>
                  </div>
                </main>
              </div>

              <div className="dash-level">
                <div className="level-top">
                  <span className="level-label">Nivel</span>
                  <span className="level-badge">{user.nivel}</span>
                </div>

                <div className="level-bar">
                  <div className="level-fill" style={{ width: `${porcentajeNivel}%` }} />
                  <div className="level-spark" />
                </div>

                <div className="level-text">
                  <span className="level-now">{toInt(user.xp_actual)}</span>
                  <span className="level-sep">/</span>
                  <span className="level-total">{toInt(xpDelNivelActual)} XP</span>
                </div>
              </div>

              {user.rol_admin && (
                <div className="dash-admin">
                  <div className="admin-head">
                    <div className="admin-title">Panel del control</div>
                    <div className="admin-sub">Accesos rápidos.</div>
                  </div>

                  <div className="admin-actions">
                    <button className="tsf-btn tsf-btn--pink" onClick={() => navigate("/tribunal/admin")}>
                      <span className="tsf-btnFace">Tribunal</span>
                      <span className="tsf-btnDepth" />
                    </button>

                    {String(user.rol_admin || "").toLowerCase() === "owner" && (
                      <>
                        <button className="tsf-btn tsf-btn--green" onClick={() => navigate("/admin")}>
                          <span className="tsf-btnFace">Gestión de staff</span>
                          <span className="tsf-btnDepth" />
                        </button>
                        <button className="tsf-btn tsf-btn--blue" onClick={() => navigate("/admin/noticias")}>
                          <span className="tsf-btnFace">Crear noticia</span>
                          <span className="tsf-btnDepth" />
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
              <LogroList user={user} />
            </div>
          </div>

          {confirmOpen && pendingTransfer && (
            <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Confirmar envío">
              <div className="modal-card">
                <div className="modal-title">Confirmar envío</div>

                <div className="modal-line">
                  Vas a enviar <b>{pendingTransfer.amt}</b> COINS a <b>{SERVER_LABEL}</b>.
                </div>

                <div className="modal-sub">Se descontarán de tu wallet y se sumarán al saldo del servidor.</div>

                <div className="modal-actions">
                  <button
                    className="tsf-btn tsf-btn--ghost tsf-btn--small"
                    type="button"
                    onClick={() => {
                      setConfirmOpen(false);
                      setPendingTransfer(null);
                    }}
                    disabled={transferLoading}
                  >
                    <span className="tsf-btnFace">Cancelar</span>
                    <span className="tsf-btnDepth" />
                  </button>

                  <button className="tsf-btn tsf-btn--send" type="button" onClick={doTransfer} disabled={transferLoading}>
                    <span className="tsf-btnFace">{transferLoading ? "Enviando..." : "Sí, enviar"}</span>
                    <span className="tsf-btnDepth" />
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
            <div className="loading-orbit loading-orbit-1" />
            <div className="loading-orbit loading-orbit-2" />
          </div>

          <div className="loading-text-block">
            <p className="loading-title">Cargando tu posada...</p>
            <p className="loading-subtitle">Preparando el panel</p>
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