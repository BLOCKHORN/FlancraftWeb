import React, { useEffect, useMemo, useState, useContext, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserContext } from "../../context/UserContext";
import {
  Trash,
  FloppyDisk,
  ArrowLeft,
  CheckCircle,
  HourglassMedium,
  Skull,
  MagnifyingGlass,
  ArrowsClockwise,
  XCircle,
  Funnel,
  WarningCircle,
  NotePencil,
  ChartBar,
  Crown,
  Lightning,
  WarningOctagon
} from "phosphor-react";
import {
  parseTimestamp,
  obtenerFechaFin,
  calcularSituacion,
  situacionLabel,
  avatarUrl,
  buildStrikeTimelineMap,
  getStrikeFromMap,
  getStrikeFeedback,
  getResumenEscala,
  getDuracionVisible,
  debeMostrarFechaFin,
  esPerma,
  esSancionActiva,
  normalizarMotivo,
} from "./tribunalUtils";
import "../../styles/components/Tribunal/_tribunaladmin.scss";
import { getAuthToken } from "../../lib/auth/storage";
import { apiUrl } from "../../lib/env";
import Seo from "../SEO/Seo";

const MOTIVOS = [
  "hacks", "minar survival", "insultos", "tpakill", "granja de lag",
  "grif", "spam", "flood", "multicuenta", "usar bugs", "estafas", "otros",
];

const SITUACIONES = [
  { key: "todas", label: "Todas" },
  { key: "activa", label: "Activas" },
  { key: "finalizada", label: "Finalizadas" },
  { key: "perma", label: "Permaban" },
];

const MULTI_ESTADOS = [
  { key: "todos", label: "Todos" },
  { key: "pendiente", label: "Pendientes" },
  { key: "revisado", label: "Revisadas" },
  { key: "descartado", label: "Descartadas" },
];

const PRETTY_NAMES = {
  RAW_COPPER: "Cobre en Bruto",
  CHORUS_FRUIT: "Fruta del End",
  COOKIE: "Galletas",
  WATER_BUCKET: "Cubo de Agua",
  FLINT: "Pedernal",
  GLOW_BERRIES: "Bayas Resplandecientes",
  COOKED_BEEF: "Chuletón Cocinado",
  QUARTZ: "Cuarzo del Nether",
  ENCHANTED_GOLDEN_APPLE: "Manzana Notch",
  LAPIS_LAZULI: "Lapislázuli",
  OAK_LOG: "Madera de Roble",
  AMETHYST_SHARD: "Fragmento de Amatista",
  CHEST: "Cofre de Madera",
  RAW_IRON: "Hierro en Bruto"
};

const normalizar = (v) => (v || "").toString().trim().toLowerCase();
const normalizarRol = (v) => String(v || "").trim().toLowerCase().replace(/[\s_-]+/g, "");
const prettify = (id) => PRETTY_NAMES[id] || id.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, l => l.toUpperCase());

const buildSancionesUrl = (path = "") => apiUrl(`/api/sanciones${path}`);
const buildMulticuentasUrl = (path = "") => apiUrl(`/api/multicuentas${path}`);
const buildBolsaAdminUrl = (path = "") => apiUrl(`/api/bolsa/admin${path}`);

const buildAdminHeaders = (withJson = false) => {
  const headers = { Accept: "application/json" };
  if (withJson) headers["Content-Type"] = "application/json";
  const token = getAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

const pickArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.data)) return payload.data;
  if (payload && Array.isArray(payload.items)) return payload.items;
  if (payload && payload.data && Array.isArray(payload.data.data)) return payload.data.data;
  return [];
};

const iconoSituacion = (situacion) => {
  const props = { size: 18, weight: "bold" };
  if (situacion === "perma") return <Skull {...props} />;
  if (situacion === "activa") return <HourglassMedium {...props} />;
  return <CheckCircle {...props} />;
};

const parseRelatedAccounts = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }
  return [];
};

const getRelatedName = (item) => {
  if (!item) return "";
  if (typeof item === "string") return item;
  return String(item.name || item.nombre || item.nombre_jugador || item.playerName || item.player || item.uuid || "").trim();
};

const getMultiEstadoKey = (value) => {
  const raw = normalizar(value);
  if (raw === "revisada" || raw === "revisado") return "revisado";
  if (raw === "descartada" || raw === "descartado") return "descartado";
  return "pendiente";
};

const getMultiEstadoLabel = (value) => {
  const key = getMultiEstadoKey(value);
  if (key === "revisado") return "REVISADA";
  if (key === "descartado") return "DESCARTADA";
  return "PENDIENTE";
};

export default function TribunalAdminPanel() {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("sanciones");

  const [sanciones, setSanciones] = useState([]);
  const [multicuentas, setMulticuentas] = useState([]);
  const [marketStats, setMarketStats] = useState({ candidates: [], whales: [] });

  const [loadingSanciones, setLoadingSanciones] = useState(false);
  const [loadingMulticuentas, setLoadingMulticuentas] = useState(false);
  const [loadingMarket, setLoadingMarket] = useState(false);

  const [busyId, setBusyId] = useState(null);
  const [errorSanciones, setErrorSanciones] = useState("");
  const [errorMulticuentas, setErrorMulticuentas] = useState("");
  const [errorMarket, setErrorMarket] = useState("");
  const [notice, setNotice] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [observacion, setObservacion] = useState("");
  const [motivoEditado, setMotivoEditado] = useState("otros");

  const [editingMultiId, setEditingMultiId] = useState(null);
  const [multiObservacion, setMultiObservacion] = useState("");
  const [multiEstadoEditado, setMultiEstadoEditado] = useState("pendiente");

  const [q, setQ] = useState("");
  const [fSituacion, setFSituacion] = useState("todas");
  const [fMotivo, setFMotivo] = useState("todos");
  const [fMultiEstado, setFMultiEstado] = useState("todos");
  const [nowMs, setNowMs] = useState(() => Date.now());

  const currentRole = useMemo(() => normalizarRol(user?.rango_staff || user?.rol_admin), [user]);
  const canDelete = currentRole === "admin" || currentRole === "owner";
  const denied = user === null || !user?.loggedIn || !currentRole;

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(null), 3200);
    return () => clearTimeout(id);
  }, [notice]);

  const cargarSanciones = useCallback(async (withNotice = false) => {
    setLoadingSanciones(true); setErrorSanciones("");
    try {
      const res = await fetch(buildSancionesUrl(""), { headers: buildAdminHeaders(false) });
      const text = await res.text();
      let json = null;
      try { json = text ? JSON.parse(text) : null; } catch { json = null; }
      if (!res.ok) throw new Error((json && (json.error || json.message)) || `HTTP ${res.status}`);
      const arr = pickArray(json);
      setSanciones(arr);
      if (withNotice) setNotice({ type: "success", message: `Sanciones actualizadas. ${arr.length} cargadas.` });
    } catch (err) { setSanciones([]); setErrorSanciones(err?.message || "No se pudieron cargar las sanciones."); } finally { setLoadingSanciones(false); }
  }, []);

  const cargarMulticuentas = useCallback(async (withNotice = false) => {
    setLoadingMulticuentas(true); setErrorMulticuentas("");
    try {
      const res = await fetch(buildMulticuentasUrl("/detecciones"), { headers: buildAdminHeaders(false) });
      const text = await res.text();
      let json = null;
      try { json = text ? JSON.parse(text) : null; } catch { json = null; }
      if (!res.ok) throw new Error((json && (json.error || json.message)) || `HTTP ${res.status}`);
      const arr = pickArray(json);
      setMulticuentas(arr);
      if (withNotice) setNotice({ type: "success", message: `Multicuentas actualizadas. ${arr.length} registros cargados.` });
    } catch (err) { setMulticuentas([]); setErrorMulticuentas(err?.message || "No se pudieron cargar las multicuentas."); } finally { setLoadingMulticuentas(false); }
  }, []);

  const cargarMercado = useCallback(async (withNotice = false) => {
    setLoadingMarket(true); setErrorMarket("");
    try {
      const res = await fetch(buildBolsaAdminUrl("/analytics"), { headers: buildAdminHeaders(false) });
      const text = await res.text();
      let json = null;
      try { json = text ? JSON.parse(text) : null; } catch { json = null; }
      if (!res.ok) throw new Error((json && (json.error || json.message)) || `HTTP ${res.status}`);
      setMarketStats({ candidates: json.candidates || [], whales: json.whales || [] });
      if (withNotice) setNotice({ type: "success", message: `Datos de mercado actualizados.` });
    } catch (err) { setErrorMarket(err?.message || "No se pudo cargar la analítica del mercado."); } finally { setLoadingMarket(false); }
  }, []);

  useEffect(() => {
    if (denied) return;
    cargarSanciones();
    cargarMulticuentas();
    cargarMercado();
  }, [denied, cargarSanciones, cargarMulticuentas, cargarMercado]);

  const cerrarEdicion = () => { setEditingId(null); setObservacion(""); setMotivoEditado("otros"); };
  const cerrarEdicionMulti = () => { setEditingMultiId(null); setMultiObservacion(""); setMultiEstadoEditado("pendiente"); };

  const guardarCambios = async (sancion) => {
    try {
      setBusyId(sancion.id); setErrorSanciones("");
      const res = await fetch(buildSancionesUrl(`/${sancion.id}`), {
        method: "PATCH",
        headers: buildAdminHeaders(true),
        body: JSON.stringify({ observacion, type: motivoEditado, revisado_por: user?.uid || null }),
      });
      const text = await res.text();
      let json = null;
      try { json = text ? JSON.parse(text) : null; } catch { json = null; }
      if (!res.ok) throw new Error((json && (json.error || json.message)) || `HTTP ${res.status}`);
      await cargarSanciones();
      cerrarEdicion();
      setNotice({ type: "success", message: `Registro de ${sancion.name} actualizado.` });
    } catch (err) { setErrorSanciones(err?.message || "No se pudieron guardar los cambios."); } finally { setBusyId(null); }
  };

  const guardarCambiosMulti = async (item) => {
    try {
      setBusyId(item.id); setErrorMulticuentas("");
      const res = await fetch(buildMulticuentasUrl(`/detecciones/${item.id}`), {
        method: "PATCH",
        headers: buildAdminHeaders(true),
        body: JSON.stringify({ observacion: multiObservacion, estado: multiEstadoEditado, revisado_por: user?.uid || null }),
      });
      const text = await res.text();
      let json = null;
      try { json = text ? JSON.parse(text) : null; } catch { json = null; }
      if (!res.ok) throw new Error((json && (json.error || json.message)) || `HTTP ${res.status}`);
      await cargarMulticuentas();
      cerrarEdicionMulti();
      setNotice({ type: "success", message: `Detección de ${item.nombre_jugador} actualizada.` });
    } catch (err) { setErrorMulticuentas(err?.message || "No se pudieron guardar los cambios."); } finally { setBusyId(null); }
  };

  const eliminarSancion = async (id, nombre) => {
    if (!window.confirm(`¿Seguro que deseas eliminar la sanción de ${nombre}?`)) return;
    try {
      setBusyId(id); setErrorSanciones("");
      const res = await fetch(buildSancionesUrl(`/${id}`), { method: "DELETE", headers: buildAdminHeaders(false) });
      const text = await res.text();
      let json = null;
      try { json = text ? JSON.parse(text) : null; } catch { json = null; }
      if (!res.ok) throw new Error((json && (json.error || json.message)) || `HTTP ${res.status}`);
      await cargarSanciones();
      setNotice({ type: "success", message: `Registro de ${nombre} eliminado.` });
    } catch (err) { setErrorSanciones(err?.message || "No se pudo eliminar la sanción."); } finally { setBusyId(null); }
  };

  // --- FILTROS SANCIONES ---
  const sancionesConMeta = useMemo(() => sanciones.map((s, __rowIndex) => ({ ...s, __rowIndex })), [sanciones]);
  const strikesMap = useMemo(() => buildStrikeTimelineMap(sancionesConMeta), [sancionesConMeta]);
  const sancionesStats = useMemo(() => {
    let activas = 0, finalizadas = 0, permabans = 0;
    for (const s of sancionesConMeta) {
      const situacion = calcularSituacion(s, nowMs);
      if (situacion === "activa") activas++;
      if (situacion === "finalizada") finalizadas++;
      if (situacion === "perma") permabans++;
    }
    return { total: sancionesConMeta.length, activas, finalizadas, permabans };
  }, [sancionesConMeta, nowMs]);

  const sancionesFiltradas = useMemo(() => {
    const qq = normalizar(q);
    const sf = normalizar(fSituacion);
    const mf = normalizarMotivo(fMotivo);
    return sancionesConMeta.filter((s) => {
      const matchQ = !qq || normalizar(s.name).includes(qq) || normalizarMotivo(s.type).includes(normalizarMotivo(qq)) || normalizar(s.moderator).includes(qq) || normalizar(s.observacion).includes(qq);
      const matchSituacion = sf === "todas" ? true : calcularSituacion(s, nowMs) === sf;
      const matchMotivo = mf === "todos" ? true : normalizarMotivo(s.type) === mf;
      return matchQ && matchSituacion && matchMotivo;
    }).sort((a, b) => (parseTimestamp(b.timestamp) || 0) - (parseTimestamp(a.timestamp) || 0));
  }, [sancionesConMeta, q, fSituacion, fMotivo, nowMs]);

  // --- FILTROS MULTICUENTAS ---
  const multicuentasUnificadas = useMemo(() => {
    const map = new Map();
    for (const item of multicuentas) {
      const hash = item.ip_hash;
      if (!hash) {
         map.set(item.id, { ...item, _all_accounts: new Set([getRelatedName(item.nombre_jugador), ...parseRelatedAccounts(item.related_accounts).map(getRelatedName).filter(Boolean)]) });
         continue;
      }
      const related = parseRelatedAccounts(item.related_accounts).map(getRelatedName).filter(Boolean);
      const allAccounts = [getRelatedName(item.nombre_jugador), ...related].filter(Boolean);
      if (!map.has(hash)) {
        map.set(hash, { ...item, _all_accounts: new Set(allAccounts) });
      } else {
        const existing = map.get(hash);
        allAccounts.forEach(acc => existing._all_accounts.add(acc));
        const existingTs = parseTimestamp(existing.timestamp) || 0;
        const currentTs = parseTimestamp(item.timestamp) || 0;
        if (currentTs > existingTs) {
           existing.id = item.id; existing.timestamp = item.timestamp; existing.servidor = item.servidor; existing.estado = item.estado; existing.observacion = item.observacion; existing.nombre_jugador = item.nombre_jugador;
        } else if (currentTs === existingTs) {
           if (item.estado !== 'pendiente' && existing.estado === 'pendiente') { existing.estado = item.estado; existing.observacion = item.observacion; }
        }
      }
    }
    return Array.from(map.values()).map(group => {
      const uniqueAccounts = Array.from(group._all_accounts);
      const related = uniqueAccounts.filter(acc => normalizar(acc) !== normalizar(group.nombre_jugador));
      return { ...group, related_accounts: related, related_count: related.length };
    });
  }, [multicuentas]);

  const multicuentasStats = useMemo(() => {
    let pendientes = 0, revisadas = 0, descartadas = 0;
    for (const item of multicuentasUnificadas) {
      const estado = getMultiEstadoKey(item.estado);
      if (estado === "pendiente") pendientes++;
      if (estado === "revisado") revisadas++;
      if (estado === "descartado") descartadas++;
    }
    return { total: multicuentasUnificadas.length, pendientes, revisadas, descartadas };
  }, [multicuentasUnificadas]);

  const multicuentasFiltradas = useMemo(() => {
    const qq = normalizar(q);
    const ef = normalizar(fMultiEstado);
    return multicuentasUnificadas.filter((item) => {
      const relatedString = normalizar(parseRelatedAccounts(item.related_accounts).map(getRelatedName).filter(Boolean).join(" "));
      const matchQ = !qq || normalizar(item.nombre_jugador).includes(qq) || normalizar(item.servidor).includes(qq) || getMultiEstadoKey(item.estado).includes(qq) || normalizar(item.observacion).includes(qq) || normalizar(item.ip_hash).includes(qq) || relatedString.includes(qq);
      const matchEstado = ef === "todos" ? true : getMultiEstadoKey(item.estado) === ef;
      return matchQ && matchEstado;
    }).sort((a, b) => (parseTimestamp(b.timestamp) || 0) - (parseTimestamp(a.timestamp) || 0));
  }, [multicuentasUnificadas, q, fMultiEstado]);

  // --- FILTROS MERCADO ---
  const marketFilteredItems = useMemo(() => {
    const qq = normalizar(q);
    return marketStats.candidates.filter(item => !qq || normalizar(item.id).includes(qq));
  }, [marketStats.candidates, q]);


  const loadingActual = activeTab === "sanciones" ? loadingSanciones : activeTab === "multicuentas" ? loadingMulticuentas : loadingMarket;
  const errorActual = activeTab === "sanciones" ? errorSanciones : activeTab === "multicuentas" ? errorMulticuentas : errorMarket;
  const endpointActual = activeTab === "sanciones" ? buildSancionesUrl("") : activeTab === "multicuentas" ? buildMulticuentasUrl("/detecciones") : buildBolsaAdminUrl("/analytics");

  if (denied) {
    return (
      <section className="tribAdmin no-tap-highlight">
        <div className="tribAdmin__backgroundWrap" />
        <div className="tribAdmin__wrap tribAdmin__wrap--denied">
          <div className="tribAdmin__deniedCard mc-block">
            <img src="/assets/gandalf_minecraft.webp" alt="Acceso denegado" className="tribAdmin__deniedImg mc-pixelated" />
            <h2 className="tribAdmin__deniedTitle">ACCESO DENEGADO</h2>
            <p className="tribAdmin__deniedDesc">No tienes permisos para entrar al panel.</p>
            <button className="mc-btn mc-btn--green" onClick={() => navigate("/tribunal")}><ArrowLeft size={18} weight="bold" />VOLVER AL TRIBUNAL</button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <Seo title="Panel interno | FlanCraft" noindex />
      <section className="tribAdmin no-tap-highlight">
        <div className="tribAdmin__backgroundWrap" />

        <div className="tribAdmin__wrap">
          <div className="tribAdmin__topbar">
            <button className="mc-btn mc-btn--ghost" onClick={() => navigate("/tribunal")}>
              <ArrowLeft size={18} weight="bold" /> VOLVER AL TRIBUNAL
            </button>

            <div className="tribAdmin__session mc-element">
              <span className="tribAdmin__sessionTag">SESIÓN:</span>
              <span className={`tribAdmin__role tribAdmin__role--${currentRole || "none"}`}>
                {(user?.rango_staff || user?.rol_admin || "").toString().toUpperCase()}
              </span>
            </div>
          </div>

          <div className="folder-tabs">
            <button className={`folder-tab ${activeTab === "sanciones" ? "is-active" : ""}`} onClick={() => setActiveTab("sanciones")}>SANCIONES</button>
            <button className={`folder-tab ${activeTab === "multicuentas" ? "is-active" : ""}`} onClick={() => setActiveTab("multicuentas")}>MULTICUENTAS</button>
            <button className={`folder-tab ${activeTab === "mercado" ? "is-active" : ""}`} onClick={() => setActiveTab("mercado")} style={{color: activeTab === "mercado" ? '#00E676' : undefined}}>
              <ChartBar size={18} weight="bold" style={{marginRight: '6px', transform: 'translateY(3px)'}}/> RADAR MERCADO
            </button>
          </div>

          <div className={`tribAdmin__workspace mc-block ${activeTab === 'mercado' ? 'workspace--market' : ''}`}>
            <header className="tribAdmin__header">
              <div className="tribAdmin__titleWrap">
                <h1 className="tribAdmin__title" style={activeTab === "mercado" ? {color: '#00E676'} : {}}>
                  {activeTab === "mercado" ? "ANALÍTICA DE BLOCK STREET" : "PANEL DE TRIBUNAL"}
                </h1>
                <p className="tribAdmin__subtitle">
                  {activeTab === "sanciones" && "SURVIVAL · Audita sanciones, añade notas internas y corrige motivos."}
                  {activeTab === "multicuentas" && "SURVIVAL · Revisa detecciones de multicuentas por coincidencia de IP."}
                  {activeTab === "mercado" && "GLOBAL · Analiza el flujo de divisas e identifica candidatos para el Índice de Mercado."}
                </p>
                <div className="tribAdmin__explain">
                  {activeTab === "mercado" 
                    ? "Los ítems no indexados con alto volumen son excelentes candidatos para entrar en bolsa. Vigila las operaciones inusualmente altas para detectar posibles exploits de duplicación in-game."
                    : (activeTab === "sanciones" ? "La sanción ya ha sido aplicada por el sistema. Aquí se revisa el registro." : "Las detecciones se unifican por IP. Aquí no se sanciona automáticamente, se revisan coincidencias.")}
                </div>
              </div>

              {activeTab === "sanciones" && (
                <div className="tribAdmin__chips">
                  <div className="statChip statChip--pending">
                    <HourglassMedium size={24} weight="bold" />
                    <div><div className="statChip__value">{sancionesStats.activas}</div><div className="statChip__label">ACTIVAS</div></div>
                  </div>
                  <div className="statChip statChip--reviewed">
                    <CheckCircle size={24} weight="bold" />
                    <div><div className="statChip__value">{sancionesStats.finalizadas}</div><div className="statChip__label">FINALIZADAS</div></div>
                  </div>
                  <div className="statChip statChip--banned">
                    <Skull size={24} weight="bold" />
                    <div><div className="statChip__value">{sancionesStats.permabans}</div><div className="statChip__label">PERMABAN</div></div>
                  </div>
                  <div className="statChip statChip--total">
                    <Funnel size={24} weight="bold" />
                    <div><div className="statChip__value">{sancionesStats.total}</div><div className="statChip__label">TOTAL</div></div>
                  </div>
                </div>
              )}

              {activeTab === "multicuentas" && (
                <div className="tribAdmin__chips">
                  <div className="statChip statChip--pending">
                    <WarningCircle size={24} weight="bold" />
                    <div><div className="statChip__value">{multicuentasStats.pendientes}</div><div className="statChip__label">PENDIENTES</div></div>
                  </div>
                  <div className="statChip statChip--reviewed">
                    <CheckCircle size={24} weight="bold" />
                    <div><div className="statChip__value">{multicuentasStats.revisadas}</div><div className="statChip__label">REVISADAS</div></div>
                  </div>
                  <div className="statChip statChip--banned">
                    <XCircle size={24} weight="bold" />
                    <div><div className="statChip__value">{multicuentasStats.descartadas}</div><div className="statChip__label">DESCARTADAS</div></div>
                  </div>
                  <div className="statChip statChip--total">
                    <Funnel size={24} weight="bold" />
                    <div><div className="statChip__value">{multicuentasStats.total}</div><div className="statChip__label">GRUPOS IP</div></div>
                  </div>
                </div>
              )}
            </header>

            <div className="tribAdmin__controls mc-element">
              <div className="tribAdmin__search">
                <MagnifyingGlass size={20} weight="bold" className="search-icon" />
                <input
                  className="mc-input"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={
                    activeTab === "sanciones" ? "Buscar por jugador, moderador o motivo…" :
                    activeTab === "multicuentas" ? "Buscar por jugador, ip o relacionadas…" :
                    "Buscar por ID del mineral (ej: DIAMOND, COPPER)..."
                  }
                />
                {q?.trim() && <button className="clearBtn" onClick={() => setQ("")}><XCircle size={20} weight="fill" /></button>}
              </div>

              <div className="tribAdmin__filters">
                {activeTab === "sanciones" && (
                  <>
                    <div className="selectWrap">
                      <span className="selectWrap__label">SITUACIÓN</span>
                      <select className="mc-input" value={fSituacion} onChange={(e) => setFSituacion(e.target.value)}>
                        {SITUACIONES.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
                      </select>
                    </div>
                    <div className="selectWrap">
                      <span className="selectWrap__label">MOTIVO</span>
                      <select className="mc-input" value={fMotivo} onChange={(e) => setFMotivo(e.target.value)}>
                        <option value="todos">Todos</option>
                        {MOTIVOS.map((m) => <option key={m} value={m}>{m.toUpperCase()}</option>)}
                      </select>
                    </div>
                  </>
                )}

                {activeTab === "multicuentas" && (
                  <div className="selectWrap">
                    <span className="selectWrap__label">ESTADO</span>
                    <select className="mc-input" value={fMultiEstado} onChange={(e) => setFMultiEstado(e.target.value)}>
                      {MULTI_ESTADOS.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
                    </select>
                  </div>
                )}

                <button
                  className={`mc-btn ${activeTab === 'mercado' ? 'mc-btn--green' : 'mc-btn--ghost'}`}
                  style={activeTab === 'mercado' ? {background: '#00E676', color: '#000'} : {}}
                  onClick={() => {
                    if (activeTab === "sanciones") cargarSanciones(true);
                    else if (activeTab === "multicuentas") cargarMulticuentas(true);
                    else cargarMercado(true);
                  }}
                  disabled={loadingActual}
                >
                  <ArrowsClockwise size={18} weight="bold" className={loadingActual ? "spin" : ""} />
                  {loadingActual ? "CARGANDO…" : "ACTUALIZAR DATOS"}
                </button>
              </div>
            </div>

            {notice && (
              <div className={`tribAdmin__notice tribAdmin__notice--${notice.type} mc-element`}>
                <CheckCircle size={20} weight="bold" />
                <div>
                  <div className="tribAdmin__noticeTitle">HECHO</div>
                  <div className="tribAdmin__noticeDesc">{notice.message}</div>
                </div>
              </div>
            )}

            {errorActual && (
              <div className="tribAdmin__error mc-element">
                <WarningCircle size={20} weight="bold" />
                <div>
                  <div className="tribAdmin__errorTitle">HA OCURRIDO UN PROBLEMA</div>
                  <div className="tribAdmin__errorDesc">{errorActual}</div>
                  <div className="tribAdmin__errorHint">Endpoint: <span className="mono">{endpointActual}</span></div>
                </div>
              </div>
            )}

            <div className="tribAdmin__tableWrap">
              
              {activeTab === "mercado" && (
                <div className="market-intelligence-grid">
                  
                  {/* COLUMNA: ANALÍTICA DE ÍTEMS */}
                  <div className="market-section items-analysis">
                    <div className="market-header">
                      <Lightning size={24} weight="fill" color="#fbbf24"/>
                      <div>
                        <h3>CANDIDATOS AL ÍNDICE</h3>
                        <p>Items de la tienda con mayor movimiento que NO están en bolsa.</p>
                      </div>
                    </div>
                    
                    <div className="mc-table-responsive">
                      <table className="tribAdmin__table" style={{ margin: 0 }}>
                        <thead>
                          <tr>
                            <th>RECURSO</th>
                            <th>VOLUMEN SEMANAL</th>
                            <th>CAPITAL MOVIDO</th>
                          </tr>
                        </thead>
                        <tbody>
                          {marketFilteredItems.length === 0 ? (
                            <tr>
                              <td colSpan={3} className="tribAdmin__empty">
                                <div className="tribAdmin__emptyInner mc-element">
                                  <ChartBar size={32} weight="bold" />
                                  <div className="tribAdmin__emptyTitle">{loadingMarket ? "ANALIZANDO REGISTROS…" : "NO HAY CANDIDATOS"}</div>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            marketFilteredItems.map((c, i) => (
                              <tr key={i} className="mc-element-tr candidate-row">
                                <td className="font-bold">{prettify(c.id)}</td>
                                <td className="muted-text">{new Intl.NumberFormat('es-ES').format(c.vol)} uds.</td>
                                <td className="profit-text">{new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(c.cash)} ⛃</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* COLUMNA: BALLENAS (TRADERS) */}
                  <div className="market-section whales-radar">
                    <div className="market-header">
                      <Crown size={24} weight="fill" color="#00E676"/>
                      <div>
                        <h3>RADAR DE BALLENAS</h3>
                        <p>Traders con mayor beneficio neto en bolsa recientemente.</p>
                      </div>
                    </div>
                    
                    <div className="whales-stack">
                      {marketStats.whales.length === 0 ? (
                        <div className="mc-element empty-whale" style={{textAlign: 'center', color: '#94a3b8', padding: '2rem'}}>El radar está despejado.</div>
                      ) : (
                        marketStats.whales.map((w, i) => (
                          <div key={i} className="whale-card mc-element">
                            <div className="whale-main">
                              <img src={avatarUrl(w.name, 40)} className="mc-pixelated whale-avatar" alt="p" />
                              <div className="whale-meta">
                                <span className="whale-name">{w.name}</span>
                                <span className="whale-ops">{w.ops} movimientos en bolsa</span>
                              </div>
                            </div>
                            <div className="whale-benefit">
                              <span className="label">BENEFICIO</span>
                              <span className="value">+{new Intl.NumberFormat('es-ES').format(w.profit)} ⛃</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    
                    <div className="security-notice mc-element">
                      <WarningOctagon size={24} weight="bold" color="#ef4444" />
                      <p>Vigila beneficios de trader desproporcionados por posible uso de multicuentas para inflar precios artificialmente.</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "sanciones" && (
                <table className="tribAdmin__table">
                  <thead>
                    <tr>
                      <th className="colJugador">JUGADOR</th>
                      <th className="colModerador">MODERADOR</th>
                      <th className="colMotivo">MOTIVO</th>
                      <th className="colEscala">ESCALA</th>
                      <th className="colDuracion">DURACIÓN</th>
                      <th className="colSituacion">SITUACIÓN</th>
                      <th className="colNota">NOTA INTERNA</th>
                      <th className="colAccion">ACCIÓN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sancionesFiltradas.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="tribAdmin__empty">
                          <div className="tribAdmin__emptyInner mc-element">
                            <Funnel size={32} weight="bold" />
                            <div>
                              <div className="tribAdmin__emptyTitle">{loadingSanciones ? "CARGANDO…" : "NO HAY RESULTADOS"}</div>
                              <div className="tribAdmin__emptyDesc">{loadingSanciones ? "Obteniendo registros del backend." : "Prueba otra búsqueda o ajusta los filtros."}</div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      sancionesFiltradas.map((s) => {
                        const strike = getStrikeFromMap(strikesMap, s.__rowIndex);
                        const strikeFeedback = getStrikeFeedback(s.type, strike, s);
                        const resumenEscala = getResumenEscala(strike, strikeFeedback.accion, s);
                        const duracionVisible = getDuracionVisible(s.duration, strikeFeedback.accion, s);
                        const fechaFin = debeMostrarFechaFin(s.duration, strikeFeedback.accion, s) ? obtenerFechaFin(s.timestamp, s.duration) : null;
                        const situacion = calcularSituacion(s, nowMs);
                        const fechaMs = parseTimestamp(s.timestamp);
                        const fechaTexto = fechaMs ? new Date(fechaMs).toLocaleString("es-ES") : "-";
                        const motivoRow = (s.type || "otros").toString().trim();
                        const motivoKey = normalizarMotivo(motivoRow) || "otros";
                        const isBusy = busyId === s.id;
                        const isEditing = editingId === s.id;
                        const perma = esPerma(s);
                        const activa = esSancionActiva(s, nowMs);

                        return (
                          <tr key={s.id} className={`row row--${situacion} mc-element-tr`}>
                            <td data-label="JUGADOR">
                              <Link to={`/perfil/${s.name}`} className="playerLink">
                                <div className="playerCell">
                                  <div className="avatarFrame">
                                    <img src={avatarUrl(s.name, 32)} alt={s.name} className="avatar mc-pixelated" loading="lazy" decoding="async" />
                                  </div>
                                  <div className="playerMeta">
                                    <div className="playerName">{s.name}</div>
                                    <div className="playerSub" title={s.id}>ID: <span className="muted">{String(s.id || "").slice(0, 8)}…</span></div>
                                  </div>
                                </div>
                              </Link>
                            </td>
                            <td data-label="MODERADOR">
                              <div className="moderatorCell">
                                <div className="moderatorCell__name">{s.moderator || "Sistema"}</div>
                                <div className="moderatorCell__date">{fechaTexto}</div>
                              </div>
                            </td>
                            <td data-label="MOTIVO">
                              {isEditing ? (
                                <select className="inlineSelect mc-input" value={motivoEditado} onChange={(e) => setMotivoEditado(e.target.value)}>
                                  {MOTIVOS.map((m) => <option key={m} value={m}>{m.toUpperCase()}</option>)}
                                </select>
                              ) : (
                                <span className={`badge badge--motivo badge--${motivoKey}`} title={motivoRow}>{motivoRow.toUpperCase() || "OTROS"}</span>
                              )}
                            </td>
                            <td data-label="ESCALA">
                              {resumenEscala ? (
                                <div className={`strikeBadge ${/^ban\b/i.test(resumenEscala) ? "permaban" : ""}`}>
                                  <WarningCircle size={16} weight="bold" /><span>{resumenEscala}</span>
                                </div>
                              ) : <span className="muted">SIN ESCALA</span>}
                            </td>
                            <td data-label="DURACIÓN">
                              <div className="duration">
                                <div className="duration__main">{duracionVisible}</div>
                                {fechaFin && <div className="duration__sub">FIN: {fechaFin}</div>}
                                {!fechaFin && perma && <div className="duration__sub">SIN CADUCIDAD</div>}
                                {!fechaFin && !perma && !activa && <div className="duration__sub">YA CUMPLIDA</div>}
                              </div>
                            </td>
                            <td data-label="SITUACIÓN">
                              <span className={`badge badge--estado badge--${situacion}`}>
                                <span className="badge__icon">{iconoSituacion(situacion)}</span>{situacionLabel(situacion)}
                              </span>
                            </td>
                            <td data-label="NOTA INTERNA">
                              {isEditing ? (
                                <textarea className="inlineTextarea mc-input" value={observacion} onChange={(e) => setObservacion(e.target.value)} placeholder="Añade contexto interno..." />
                              ) : (
                                <div className={`obs ${s.observacion ? "" : "obs--empty"}`}>{s.observacion || "Sin nota interna"}</div>
                              )}
                            </td>
                            <td data-label="ACCIÓN">
                              {isEditing ? (
                                <div className="actions actions--edit">
                                  <button className="mc-btn mc-btn--green" onClick={() => guardarCambios(s)} disabled={isBusy}><FloppyDisk size={18} weight="bold" />{isBusy ? "GUARDANDO…" : "GUARDAR"}</button>
                                  <button className="mc-btn mc-btn--ghost" onClick={cerrarEdicion} disabled={isBusy}>CANCELAR</button>
                                </div>
                              ) : (
                                <div className="actions">
                                  <button className="mc-btn mc-btn--ghost" onClick={() => { setEditingId(s.id); setObservacion(s.observacion || ""); setMotivoEditado(normalizarMotivo(s.type) || "otros"); }} disabled={isBusy}><NotePencil size={18} weight="bold" />ANOTAR</button>
                                  {canDelete && <button className="mc-btn mc-btn--red" onClick={() => eliminarSancion(s.id, s.name)} disabled={isBusy}><Trash size={18} weight="bold" />{isBusy ? "ELIMINANDO…" : "ELIMINAR"}</button>}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              )}

              {activeTab === "multicuentas" && (
                <table className="tribAdmin__table">
                  <thead>
                    <tr>
                      <th className="colJugador">ÚLTIMA DETECCIÓN</th>
                      <th className="colColisiones">COLISIONES AGRUPADAS (IP)</th>
                      <th>ESTADO</th>
                      <th>NOTA INTERNA</th>
                      <th>ACCIÓN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {multicuentasFiltradas.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="tribAdmin__empty">
                          <div className="tribAdmin__emptyInner mc-element">
                            <Funnel size={32} weight="bold" />
                            <div>
                              <div className="tribAdmin__emptyTitle">{loadingMulticuentas ? "CARGANDO…" : "NO HAY RESULTADOS"}</div>
                              <div className="tribAdmin__emptyDesc">{loadingMulticuentas ? "Obteniendo detecciones del backend." : "Todavía no hay coincidencias registradas."}</div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      multicuentasFiltradas.map((item) => {
                        const isBusy = busyId === item.id;
                        const isEditing = editingMultiId === item.id;
                        const fechaMs = parseTimestamp(item.timestamp);
                        const fechaTexto = fechaMs ? new Date(fechaMs).toLocaleString("es-ES") : "-";
                        const estadoKey = getMultiEstadoKey(item.estado);
                        const ipHashShort = String(item.ip_hash || "").slice(0, 16);
                        const relatedArray = parseRelatedAccounts(item.related_accounts).map(getRelatedName).filter(Boolean);

                        return (
                          <tr key={item.id} className={`row row--multi-${estadoKey} mc-element-tr`}>
                            <td data-label="ÚLTIMA DETECCIÓN">
                              <Link to={`/perfil/${item.nombre_jugador}`} className="playerLink">
                                <div className="playerCell">
                                  <div className="avatarFrame">
                                    <img src={avatarUrl(item.nombre_jugador, 32)} alt={item.nombre_jugador} className="avatar mc-pixelated" loading="lazy" decoding="async" />
                                  </div>
                                  <div className="playerMeta">
                                    <div className="playerName">{item.nombre_jugador}</div>
                                    <div className="playerSub">
                                      <span className="badge badge--motivo badge--otros" style={{padding: '2px 4px', fontSize: '0.65rem'}}>{(item.servidor || "N/A").toUpperCase()}</span> • {fechaTexto}
                                    </div>
                                  </div>
                                </div>
                              </Link>
                            </td>
                            <td data-label="COLISIONES AGRUPADAS (IP)">
                              <div className="colisionCell">
                                <div className="colisionCell__header">
                                  <span className="colisionCell__hash">Hash IP: {ipHashShort}…</span>
                                  <span className="colisionCell__count">{relatedArray.length} RELACIONADAS</span>
                                </div>
                                <div className="colisionCell__tags">
                                  {relatedArray.length === 0 ? <span className="muted">Sin coincidencias adicionales</span> : (
                                    <>
                                      {relatedArray.slice(0, 6).map((relName, idx) => <Link key={idx} to={`/perfil/${relName}`} className="multi-tag">{relName}</Link>)}
                                      {relatedArray.length > 6 && <span className="multi-tag multi-tag--more">+{relatedArray.length - 6} más</span>}
                                    </>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td data-label="ESTADO">
                              {isEditing ? (
                                <select className="inlineSelect mc-input" value={multiEstadoEditado} onChange={(e) => setMultiEstadoEditado(e.target.value)}>
                                  <option value="pendiente">PENDIENTE</option>
                                  <option value="revisado">REVISADA</option>
                                  <option value="descartado">DESCARTADA</option>
                                </select>
                              ) : (
                                <span className={`badge badge--estado badge--multi-${estadoKey}`}>
                                  <span className="badge__icon">
                                    {estadoKey === "pendiente" && <WarningCircle size={18} weight="bold" />}
                                    {estadoKey === "revisado" && <CheckCircle size={18} weight="bold" />}
                                    {estadoKey === "descartado" && <XCircle size={18} weight="bold" />}
                                  </span>
                                  {getMultiEstadoLabel(item.estado)}
                                </span>
                              )}
                            </td>
                            <td data-label="NOTA INTERNA">
                              {isEditing ? (
                                <textarea className="inlineTextarea mc-input" value={multiObservacion} onChange={(e) => setMultiObservacion(e.target.value)} placeholder="Añade contexto sobre este grupo…" />
                              ) : (
                                <div className={`obs ${item.observacion ? "" : "obs--empty"}`}>{item.observacion || "Sin nota interna"}</div>
                              )}
                            </td>
                            <td data-label="ACCIÓN">
                              {isEditing ? (
                                <div className="actions actions--edit">
                                  <button className="mc-btn mc-btn--green" onClick={() => guardarCambiosMulti(item)} disabled={isBusy}><FloppyDisk size={18} weight="bold" />{isBusy ? "GUARDANDO…" : "GUARDAR"}</button>
                                  <button className="mc-btn mc-btn--ghost" onClick={cerrarEdicionMulti} disabled={isBusy}>CANCELAR</button>
                                </div>
                              ) : (
                                <div className="actions">
                                  <button className="mc-btn mc-btn--ghost" onClick={() => { setEditingMultiId(item.id); setMultiObservacion(item.observacion || ""); setMultiEstadoEditado(getMultiEstadoKey(item.estado)); }} disabled={isBusy}><NotePencil size={18} weight="bold" />REVISAR GRUPO</button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              )}
            </div>
            
            <div className="tribAdmin__foot mc-element">
              <div className="tribAdmin__footLeft">
                MOSTRANDO <strong style={{color: '#fbbf24'}}>
                  {activeTab === "sanciones" ? sancionesFiltradas.length : activeTab === "multicuentas" ? multicuentasFiltradas.length : marketFilteredItems.length}
                </strong> 
                {activeTab !== "mercado" && (
                   <> DE <strong style={{color: '#fbbf24'}}>{activeTab === "sanciones" ? sanciones.length : multicuentasUnificadas.length}</strong></>
                )}
              </div>
              <div className="tribAdmin__footRight">
                <span className="hint">
                  {activeTab === "sanciones"
                    ? "Uso recomendado: corregir motivo, añadir nota interna o borrar registros erróneos."
                    : activeTab === "multicuentas"
                    ? "Uso recomendado: revisar coincidencias de IP, añadir contexto y marcar el grupo entero como revisado o descartado."
                    : "Uso recomendado: Evalúa ítems con alta liquidez para incluirlos en el archivo config.yml del mercado."}
                </span>
              </div>
            </div>

          </div>
        </div>
      </section>
    </>
  );
}