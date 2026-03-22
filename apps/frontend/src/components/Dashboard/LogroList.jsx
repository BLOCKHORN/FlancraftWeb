import { useEffect, useMemo, useRef, useState } from "react";
import { Filter, Clock, TriangleAlert, Search, CheckCircle } from "lucide-react";
import { apiUrl } from "../../lib/env";
import { getAuthToken } from "../../lib/auth/storage";
import "../../styles/components/Dashboard/_logrolist.scss";

const PAGE_SIZE = 12;
const LOGROS_PROXIMAMENTE = false;
const NF = new Intl.NumberFormat("es-ES");
const MISIONES_MODO_PRUEBAS = String(import.meta.env.VITE_MISIONES_MODO_PRUEBAS || "false").toLowerCase() === "true";

const TABS_MISION = [
  { id: "permanente", label: "Permanentes", imagen: "/assets/logros/tab-permanentes.webp" },
  { id: "diaria", label: "Diarias", imagen: "/assets/logros/tab-diarias.webp" },
  { id: "semanal", label: "Semanales", imagen: "/assets/logros/tab-semanales.webp" }
];

const CRITERIOS = [
  { nombre: "Sugerido para ti", valor: "smart" },
  { nombre: "Completadas primero", valor: "completado" },
  { nombre: "XP descendente", valor: "xp-desc" },
  { nombre: "XP ascendente", valor: "xp-asc" },
  { nombre: "Progreso descendente", valor: "progreso-desc" },
  { nombre: "Progreso ascendente", valor: "progreso-asc" },
];

const CRITERIOS_WEB = [
  { nombre: "Sugerido para ti", valor: "smart" },
  { nombre: "Recompensa descendente", valor: "reward-desc" },
  { nombre: "Recompensa ascendente", valor: "reward-asc" },
];

const CATEGORY_ICONS = {
  mineria: "/assets/icons/mining.png",
  combate: "/assets/icons/combat.png",
  agricultura: "/assets/icons/farming.png",
  exploracion: "/assets/icons/exploration.png",
  construccion: "/assets/icons/building.png",
  crafteo: "/assets/icons/crafting.png",
  social: "/assets/icons/social.png",
  eventos: "/assets/icons/event.png",
  default: "/tienda/assets/coin.png",
};

function getCategoryIcon(categoria, familia, tipo) {
  const check = String(categoria || familia || tipo || "").toLowerCase();
  if (check.includes("min") || check.includes("pic") || check.includes("mena") || check.includes("ore")) return CATEGORY_ICONS.mineria;
  if (check.includes("comb") || check.includes("matar") || check.includes("kill") || check.includes("espada") || check.includes("hostil")) return CATEGORY_ICONS.combate;
  if (check.includes("agri") || check.includes("granja") || check.includes("cultiv") || check.includes("semilla") || check.includes("animal") || check.includes("oveja") || check.includes("trigo")) return CATEGORY_ICONS.agricultura;
  if (check.includes("expl") || check.includes("viaj") || check.includes("visit") || check.includes("camin") || check.includes("nether") || check.includes("end")) return CATEGORY_ICONS.exploracion;
  if (check.includes("const") || check.includes("coloc") || check.includes("pon")) return CATEGORY_ICONS.construccion;
  if (check.includes("craft") || check.includes("mes") || check.includes("horn") || check.includes("fund") || check.includes("cocin") || check.includes("prepar") || check.includes("pocion") || check.includes("tabla")) return CATEGORY_ICONS.crafteo;
  if (check.includes("soc") || check.includes("vot") || check.includes("amig") || check.includes("party")) return CATEGORY_ICONS.social;
  if (check.includes("eve") || check.includes("boss") || check.includes("jefe") || check.includes("dragon") || check.includes("wither")) return CATEGORY_ICONS.eventos;
  return CATEGORY_ICONS.default;
}

function clampNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function formatNumber(value) {
  return NF.format(clampNumber(value));
}

function formatDurationFromMinutes(minutes) {
  const total = clampNumber(minutes);
  if (total % 1440 === 0) {
    const dias = total / 1440;
    return `${formatNumber(dias)} ${dias === 1 ? "d" : "d"}`;
  }
  if (total >= 60) {
    const horas = Math.floor(total / 60);
    const mins = total % 60;
    if (!mins) return `${formatNumber(horas)} h`;
    return `${formatNumber(horas)}h ${formatNumber(mins)}m`;
  }
  return `${formatNumber(total)} m`;
}

function formatGoalValue(tipo, value) {
  if (["minutos_jugados", "minutos_bajo_y32"].includes(tipo)) return formatDurationFromMinutes(value);
  return formatNumber(value);
}

function plural(base, amount, pluralForm) {
  return clampNumber(amount) === 1 ? base : pluralForm;
}

function normalizeRoleValue(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeText(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

function isOwnerUser(user) {
  const rolAdmin = normalizeRoleValue(user?.rol_admin);
  const rangoStaff = normalizeRoleValue(user?.rango_staff);
  if (rolAdmin) return rolAdmin === "owner";
  return rangoStaff === "owner";
}

function buildObjectiveText(tipo, objetivo) {
  const amount = clampNumber(objetivo);
  switch (tipo) {
    case "troncos_talados": return `¡Arrasa con ${formatNumber(amount)} ${plural("tronco", amount, "troncos")} a puro hachazo!`;
    case "tablas_crafteadas": return `Procesa ${formatNumber(amount)} ${plural("tabla", amount, "tablas")} y asegura material.`;
    case "pan_crafteado": return `Hornea ${formatNumber(amount)} ${plural("pan", amount, "panes")} para el viaje.`;
    case "camas_crafteadas": return `Fabrica ${formatNumber(amount)} ${plural("cama", amount, "camas")} para tu base.`;
    case "hornos_crafteados": return `Craftea ${formatNumber(amount)} ${plural("horno", amount, "hornos")} operativos.`;
    case "cubo_crafteado": return `Fabrica ${formatNumber(amount)} ${plural("cubo", amount, "cubos")} de hierro.`;
    case "pico_hierro_crafteado": return `Forja ${formatNumber(amount)} ${plural("pico de hierro", amount, "picos de hierro")}.`;
    case "semillas_plantadas": return `Entierra ${formatNumber(amount)} ${plural("semilla", amount, "semillas")} en suelo fértil.`;
    case "cultivos_recolectados": return `Cosecha ${formatNumber(amount)} ${plural("cultivo", amount, "cultivos")} y llena la despensa.`;
    case "trigo_recolectado": return `Segar ${formatNumber(amount)} gavillas de trigo listas.`;
    case "zanahorias_patatas_recolectadas": return `Desentierra ${formatNumber(amount)} raíces (zanahorias/patatas).`;
    case "nether_wart_recolectada": return `Recolecta ${formatNumber(amount)} verrugas del inframundo.`;
    case "ovejas_esquiladas": return `Quítale la lana a ${formatNumber(amount)} ${plural("oveja", amount, "ovejas")}.`;
    case "animales_criados": return `Multiplica tu rebaño criando ${formatNumber(amount)} ${plural("animal", amount, "animales")}.`;
    case "alimentos_cocinados": return `Cocina ${formatNumber(amount)} ${plural("ración", amount, "raciones")} de comida en el horno.`;
    case "veces_pescadas": return `Echa la caña ${formatNumber(amount)} ${plural("vez", amount, "veces")} al agua.`;
    case "peces_pescados": return `Atrapa ${formatNumber(amount)} ${plural("pez", amount, "peces")} de las profundidades.`;
    case "bloques_colocados_total": return `Construye usando ${formatNumber(amount)} ${plural("bloque", amount, "bloques")}.`;
    case "madera_colocada": return `Coloca ${formatNumber(amount)} bloques de madera sólida.`;
    case "piedra_procesada_colocada": return `Levanta muros con ${formatNumber(amount)} bloques de piedra tratada.`;
    case "cofres_colocados": return `Planta ${formatNumber(amount)} ${plural("cofre", amount, "cofres")} para tu botín.`;
    case "antorchas_colocadas": return `Ilumina la oscuridad con ${formatNumber(amount)} ${plural("antorcha", amount, "antorchas")}.`;
    case "fuentes_luz_colocadas": return `Instala ${formatNumber(amount)} faroles o luz potente.`;
    case "mesa_encantamientos_colocada": return `Coloca ${formatNumber(amount)} ${plural("mesa arcana", amount, "mesas arcanas")}.`;
    case "bloques_rotos_total": return `Pulveriza ${formatNumber(amount)} ${plural("bloque", amount, "bloques")} del mundo.`;
    case "bloques_bajo_y32_minados": return `Pica ${formatNumber(amount)} bloques en las profundidades (Y < 32).`;
    case "tierra_rotas": return `Excava ${formatNumber(amount)} bloques de tierra o césped.`;
    case "arena_recogida": return `Palea ${formatNumber(amount)} bloques de arena del desierto o costa.`;
    case "grava_recogida": return `Despeja ${formatNumber(amount)} bloques de grava buscando pedernal.`;
    case "menas_extraidas_total": return `Pica y extrae ${formatNumber(amount)} minerales valiosos.`;
    case "carbon_mena_extraida": return `Extrae ${formatNumber(amount)} vetas de carbón.`;
    case "cobre_mena_extraida": return `Extrae ${formatNumber(amount)} vetas de cobre brillante.`;
    case "hierro_mena_extraida": return `Arranca ${formatNumber(amount)} vetas de hierro puro.`;
    case "redstone_mena_extraida": return `Extrae ${formatNumber(amount)} vetas de redstone chispeante.`;
    case "lapis_mena_extraida": return `Consigue ${formatNumber(amount)} vetas de lapislázuli.`;
    case "oro_mena_extraida": return `Pica ${formatNumber(amount)} vetas de oro resplandeciente.`;
    case "esmeralda_mena_extraida": return `Encuentra y extrae ${formatNumber(amount)} vetas de esmeralda.`;
    case "diamantes_extraidos": return `¡Extrae ${formatNumber(amount)} ${plural("diamante", amount, "diamantes")} de las profundidades!`;
    case "cuarzo_nether_extraido": return `Pica ${formatNumber(amount)} vetas de cuarzo en el infierno.`;
    case "hierro_lingotes_fundidos": return `Funde a fuego vivo ${formatNumber(amount)} ${plural("lingote de hierro", amount, "lingotes de hierro")}.`;
    case "hostiles_matados": return `¡Manda al otro barrio a ${formatNumber(amount)} monstruos hostiles!`;
    case "zombis_matados": return `¡Acaba con la vida de ${formatNumber(amount)} ${plural("zombi", amount, "zombis")}!`;
    case "esqueletos_matados": return `¡Haz añicos a ${formatNumber(amount)} ${plural("esqueleto", amount, "esqueletos")}!`;
    case "creepers_matados": return `¡Caza a ${formatNumber(amount)} ${plural("creeper", amount, "creepers")} antes de que exploten!`;
    case "aranas_matadas": return `¡Aplasta a ${formatNumber(amount)} ${plural("araña", amount, "arañas")} en su nido!`;
    case "endermen_matados": return `¡Aniquila a ${formatNumber(amount)} endermen y róbales las perlas!`;
    case "blazes_matados": return `¡Apaga a golpes a ${formatNumber(amount)} blazes!`;
    case "ghasts_matados": return `¡Derriba a ${formatNumber(amount)} ghasts del cielo infernal!`;
    case "shulkers_matados": return `¡Revienta a ${formatNumber(amount)} shulkers en sus ciudades!`;
    case "mobs_nether_matados": return `¡Despeja el Nether eliminando a ${formatNumber(amount)} aberraciones!`;
    case "mobs_end_matados": return `¡Sobrevive al vacío matando a ${formatNumber(amount)} criaturas del End!`;
    case "kills_con_arco": return `Acierta y abate a ${formatNumber(amount)} objetivos con el arco.`;
    case "minutos_jugados": return `Sobrevive ${formatDurationFromMinutes(amount)} activo en el reino.`;
    case "bloques_recorridos_total": return `Patea el mapa recorriendo ${formatNumber(amount)} bloques.`;
    case "visitas_bajo_y0": return `Adéntrate por debajo de Y0 ${formatNumber(amount)} ${plural("vez", amount, "veces")}.`;
    case "minutos_bajo_y32": return `Resiste ${formatDurationFromMinutes(amount)} trabajando bajo la cota Y32.`;
    case "entradas_nether": return `Cruza el portal del Nether ${formatNumber(amount)} ${plural("vez", amount, "veces")}.`;
    case "entradas_end": return `Lánzate al vacío del End ${formatNumber(amount)} ${plural("vez", amount, "veces")}.`;
    case "bloques_recorridos_nether": return `Avanza ${formatNumber(amount)} bloques sobre lava y basalto en el Nether.`;
    case "bloques_recorridos_end": return `Explora ${formatNumber(amount)} bloques entre islas de vacío en el End.`;
    case "usos_portal": return `Teletranspórtate por portales ${formatNumber(amount)} ${plural("vez", amount, "veces")}.`;
    case "visito_tres_dimensiones": return "Viaja por el Overworld, Nether y el End con un mismo personaje.";
    case "withers_derrotados": return `¡Invoca y destruye a ${formatNumber(amount)} ${plural("Wither", amount, "Withers")} sin piedad!`;
    case "dragones_derrotados": return `¡Derrota a ${formatNumber(amount)} ${plural("Dragón del End", amount, "Dragones del End")}!`;
    case "objetos_encantados": return `Imbuye con magia ${formatNumber(amount)} ${plural("objeto", amount, "objetos")}.`;
    case "pociones_preparadas": return `Destila ${formatNumber(amount)} ${plural("poción", amount, "pociones")} en la destilería.`;
    case "usos_cama": return `Descansa en una cama ${formatNumber(amount)} ${plural("vez", amount, "veces")} para fijar tu reaparición.`;
    default: return `Completa ${formatGoalValue(tipo, amount)} de progreso en este encargo.`;
  }
}

function getDifficulty(logro, tipoInyectado) {
  const xp = clampNumber(logro?.xp_otorgada);
  const objetivo = clampNumber(logro?.objetivo);
  const tipoMision = String(logro?.tipo_mision || tipoInyectado || "permanente").toLowerCase();
  const categoria = String(logro?.categoria || "").toLowerCase();

  if (tipoMision === "semanal") {
    if (categoria === "endgame" || xp >= 260 || objetivo >= 2500) return { label: "Élite", tone: "elite" };
    if (xp >= 190 || objetivo >= 800) return { label: "Dura", tone: "dura" };
    return { label: "Seria", tone: "seria" };
  }
  if (tipoMision === "diaria") {
    if (xp >= 70 || objetivo >= 500) return { label: "Alta", tone: "alta" };
    if (xp >= 45 || objetivo >= 80) return { label: "Media", tone: "media" };
    return { label: "Ágil", tone: "agil" };
  }
  if (categoria === "jefes" || categoria === "endgame" || xp >= 420 || objetivo >= 4000) return { label: "Mítica", tone: "legendaria" };
  if (xp >= 220 || objetivo >= 1000) return { label: "Épica", tone: "epica" };
  if (xp >= 100 || objetivo >= 200) return { label: "Veterana", tone: "veterana" };
  return { label: "Base", tone: "base" };
}

function getCycleLabel(tipoMision) {
  if (tipoMision === "diaria") return "Diaria";
  if (tipoMision === "semanal") return "Semanal";
  if (tipoMision === "web") return "Web";
  return "Permanente";
}

function calcularTargetDesdeFecha(fechaISO) {
  if (!fechaISO) return null;
  return new Date(`${fechaISO}T23:59:59.999Z`);
}

function desglosarDiferencia(target) {
  const ahora = new Date();
  const totalMs = target - ahora;
  if (totalMs <= 0) return { totalMs, dias: 0, horas: 0, minutos: 0, segundos: 0 };
  let resto = Math.floor(totalMs / 1000);
  const dias = Math.floor(resto / 86400);
  resto %= 86400;
  const horas = Math.floor(resto / 3600);
  resto %= 3600;
  const minutos = Math.floor(resto / 60);
  const segundos = resto % 60;
  return { totalMs, dias, horas, minutos, segundos };
}

function getWebMetaNumber(logro, key) {
  const a = Number(logro?.meta_definicion?.[key]);
  if (Number.isFinite(a)) return a;
  const b = Number(logro?.meta_otorgado?.[key]);
  if (Number.isFinite(b)) return b;
  return null;
}

function buildWebObjectiveText(logro) {
  const codigo = String(logro?.codigo || "").toLowerCase();
  const tipo = String(logro?.tipo || "").toLowerCase();
  if (codigo.startsWith("primero_nivel_")) {
    const level = getWebMetaNumber(logro, "level_target");
    return `Sé el primer jugador en alcanzar el nivel ${formatNumber(level || 0)} de la cuenta web.`;
  }
  if (tipo === "top_rank") {
    const maxRank = getWebMetaNumber(logro, "max_rank");
    if (maxRank === 1) return "¡Domina la cima! Entra por primera vez en el puesto #1 global por SVPoints.";
    return `¡Hazte hueco! Entra por primera vez en el Top ${formatNumber(maxRank || 10)} global por SVPoints.`;
  }
  if (tipo === "daily_claim_count") return `Reclama tu recompensa diaria ${formatNumber(getWebMetaNumber(logro, "claims_required") || 0)} veces.`;
  if (tipo === "vote_count") return `Vota por FlanCraft ${formatNumber(getWebMetaNumber(logro, "votes_required") || 0)} veces y apoya la red.`;
  if (tipo === "vote_streak") return `Mantén viva la racha: Vota al menos una vez durante ${formatNumber(getWebMetaNumber(logro, "streak_required") || 0)} días seguidos.`;
  if (tipo === "account_age_days") return `Mantén tu perfil web vivo durante ${formatNumber(getWebMetaNumber(logro, "days_required") || 0)} días.`;
  return logro?.descripcion || "Cumple la condición secreta de esta insignia web.";
}

function getWebDifficulty(logro) {
  const codigo = String(logro?.codigo || "").toLowerCase();
  const tipo = String(logro?.tipo || "").toLowerCase();
  if (codigo.startsWith("primero_nivel_")) return { label: "Mítica", tone: "legendaria" };
  if (tipo === "top_rank") return { label: "Élite", tone: "elite" };
  if (tipo === "vote_streak") {
    const streak = getWebMetaNumber(logro, "streak_required");
    if (streak >= 100) return { label: "Élite", tone: "elite" };
    if (streak >= 30) return { label: "Épica", tone: "epica" };
    return { label: "Honor", tone: "veterana" };
  }
  if (tipo === "account_age_days") return { label: "Veterana", tone: "veterana" };
  if (tipo === "vote_count") return { label: "Honor", tone: "epica" };
  return { label: "Especial", tone: "base" };
}

function formatWebReward(logro) {
  const amount = clampNumber(logro?.recompensa_wallet);
  if (amount > 0) return `${formatNumber(amount)} WC`;
  return "Visual";
}

const getProgresoSeguro = (item) => {
  const objetivo = clampNumber(item?.objetivo);
  if (objetivo <= 0) return 0;
  return clampNumber(item?.progreso_actual) / objetivo;
};

export default function LogroList({ user, onXpClaimed }) {
  const [logros, setLogros] = useState([]);
  const [error, setError] = useState(null);
  const [reclamadoId, setReclamadoId] = useState(null);
  const [cargandoId, setCargandoId] = useState(null);
  const [tipoMision, setTipoMision] = useState("permanente");
  const [criterio, setCriterio] = useState("smart");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroRareza, setFiltroRareza] = useState("todas");
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [tiempoRestante, setTiempoRestante] = useState(null);
  const [resetAt, setResetAt] = useState(null);
  const [pagina, setPagina] = useState(1);

  const listaTopRef = useRef(null);

  const esOwner = useMemo(() => isOwnerUser(user), [user]);

  const criteriosDisponibles = useMemo(() => (tipoMision === "web" ? CRITERIOS_WEB : CRITERIOS), [tipoMision]);

  const manejarCambioTipoMision = (nuevoTipo) => {
    if (LOGROS_PROXIMAMENTE || nuevoTipo === tipoMision) return;
    setTipoMision(nuevoTipo);
    setPagina(1);
    setFiltroTipo("todos");
    setFiltroRareza("todas");
    setBusqueda("");
    setCriterio("smart");
  };

  useEffect(() => {
    const fetchLogros = async () => {
      if (!user?.uuid || !esOwner) {
        setLogros([]);
        setError(null);
        setResetAt(null);
        setCargando(false);
        return;
      }
      try {
        setCargando(true);
        setError(null);

        if (tipoMision === "web") {
          const res = await fetch(apiUrl(`/api/web-logros/${user.uuid}`), {
            headers: { ...(getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {}) },
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          const items = Array.isArray(data) ? data : [];
          setLogros(items.map(m => ({ ...m, tipo_mision: "web" })));
          setResetAt(null);
          return;
        }

        if (tipoMision === "permanente") {
          const res = await fetch(apiUrl(`/api/logros/${user.uuid}?servidor=survival`));
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          const items = Array.isArray(data) ? data : [];
          setLogros(items.map(m => ({ ...m, tipo_mision: "permanente" })));
          setResetAt(null);
          return;
        }

        const endpoint = tipoMision === "diaria" ? "diarias" : "semanales";
        const res = await fetch(apiUrl(`/api/misiones/${endpoint}/${user.uuid}?servidor=survival`));
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        
        let misionesBruto = Array.isArray(data) ? data : Array.isArray(data.misiones) ? data.misiones : [];
        
        const misionesInyectadas = misionesBruto.map(m => ({
          ...m,
          tipo_mision: tipoMision 
        }));

        setLogros(misionesInyectadas);
        
        const fechaFinRaw = data?.meta?.fecha_fin;
        if (fechaFinRaw) {
          setResetAt(calcularTargetDesdeFecha(fechaFinRaw));
        } else {
          setResetAt(null);
        }
      } catch (err) {
        setError(err.message || "Error al cargar misiones.");
        setLogros([]);
        setResetAt(null);
      } finally {
        setCargando(false);
      }
    };

    if (LOGROS_PROXIMAMENTE) {
      setLogros([]);
      setError(null);
      setCargando(false);
      return;
    }
    fetchLogros();
  }, [user?.uuid, esOwner, tipoMision]);

  useEffect(() => {
    if (!resetAt || tipoMision === "permanente" || tipoMision === "web" || !esOwner) {
      setTiempoRestante(null);
      return;
    }
    const actualizar = () => setTiempoRestante(desglosarDiferencia(resetAt));
    actualizar();
    const id = setInterval(actualizar, 1000);
    return () => clearInterval(id);
  }, [resetAt, tipoMision, esOwner]);

  const reclamarMision = async (logro) => {
    try {
      const claimId = logro.claim_scope_id || logro.id;
      const tMision = logro.tipo_mision || tipoMision;
      setCargandoId(claimId);

      const res = await fetch(apiUrl(`/api/misiones/reclamar/${tMision}/${claimId}`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {}),
        },
        body: JSON.stringify({ uuid: user.uuid }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al reclamar");

      setReclamadoId(claimId);
      setLogros((prev) => prev.map((item) => (String(item.claim_scope_id || item.id) === String(claimId) ? { ...item, reclamado: true } : item)));

      try {
        const xpSound = new Audio("/assets/sounds/success.mp3");
        xpSound.volume = 0.5;
        xpSound.play();
      } catch {}

      if (onXpClaimed) {
        onXpClaimed(data?.xp_otorgada || logro?.xp_otorgada || 0);
      }
    } catch (err) {
      alert(err.message || "No se pudo reclamar la misión");
    } finally {
      setCargandoId(null);
    }
  };

  const esClaimable = (logro) => {
    if (!logro || tipoMision === "web") return false;
    const claimId = logro.claim_scope_id || logro.id;
    const reclamado = !!logro.reclamado || String(claimId) === String(reclamadoId);
    return !!logro.completado && !reclamado;
  };

  const ordenarLogros = (lista) => {
    if (tipoMision === "web") {
      switch (criterio) {
        case "reward-desc": return [...lista].sort((a, b) => clampNumber(b.recompensa_wallet) - clampNumber(a.recompensa_wallet));
        case "reward-asc": return [...lista].sort((a, b) => clampNumber(a.recompensa_wallet) - clampNumber(b.recompensa_wallet));
        case "orden": return [...lista].sort((a, b) => clampNumber(a.orden, 9999) - clampNumber(b.orden, 9999));
        case "smart":
        case "unlocked":
        default:
          return [...lista].sort((a, b) => {
            if (!!a.desbloqueado !== !!b.desbloqueado) return a.desbloqueado ? -1 : 1;
            if (!!a.actual_en_ranking !== !!b.actual_en_ranking) return a.actual_en_ranking ? -1 : 1;
            return clampNumber(a.orden, 9999) - clampNumber(b.orden, 9999);
          });
      }
    }

    switch (criterio) {
      case "xp-desc": return [...lista].sort((a, b) => clampNumber(b.xp_otorgada) - clampNumber(a.xp_otorgada));
      case "xp-asc": return [...lista].sort((a, b) => clampNumber(a.xp_otorgada) - clampNumber(b.xp_otorgada));
      case "progreso-desc": return [...lista].sort((a, b) => getProgresoSeguro(b) - getProgresoSeguro(a));
      case "progreso-asc": return [...lista].sort((a, b) => getProgresoSeguro(a) - getProgresoSeguro(b));
      case "completado": return [...lista].sort((a, b) => { if (!!a.completado === !!b.completado) return 0; return a.completado ? -1 : 1; });
      case "smart":
      default:
        return [...lista].sort((a, b) => {
          const aClaim = esClaimable(a);
          const bClaim = esClaimable(b);
          if (aClaim !== bClaim) return aClaim ? -1 : 1;

          const aRec = !!a.reclamado;
          const bRec = !!b.reclamado;
          if (aRec !== bRec) return aRec ? 1 : -1;

          const aComp = !!a.completado;
          const bComp = !!b.completado;
          if (aComp !== bComp) return aComp ? 1 : -1;

          const aProg = getProgresoSeguro(a);
          const bProg = getProgresoSeguro(b);
          if (Math.abs(aProg - bProg) > 0.01) return bProg - aProg;

          return clampNumber(b.xp_otorgada) - clampNumber(a.xp_otorgada);
        });
    }
  };

  const logrosFiltrados = useMemo(() => {
    const base = Array.isArray(logros) ? [...logros] : [];
    const busquedaNormalizada = normalizeText(busqueda);

    return base.filter((item) => {
      const difficulty = tipoMision === "web" ? getWebDifficulty(item) : getDifficulty(item, tipoMision);
      const tipoNormalizado = normalizeText(item?.categoria || item?.familia || item?.tipo || item?.tipo_evento || "sin tipo");
      const rarezaNormalizada = normalizeText(difficulty.label);

      const coincideTipo = filtroTipo === "todos" ? true : tipoNormalizado === normalizeText(filtroTipo);
      const coincideRareza = filtroRareza === "todas" ? true : rarezaNormalizada === normalizeText(filtroRareza);
      
      const searchable = normalizeText([item?.nombre, item?.descripcion_lore, item?.descripcion, item?.categoria, item?.familia, item?.tipo, item?.tipo_evento, item?.descripcion_objetivo, item?.codigo].filter(Boolean).join(" "));
      const coincideBusqueda = !busquedaNormalizada || searchable.includes(busquedaNormalizada);

      return coincideTipo && coincideRareza && coincideBusqueda;
    });
  }, [logros, tipoMision, filtroTipo, filtroRareza, busqueda]);

  const opcionesTipo = useMemo(() => {
    const base = Array.isArray(logros) ? [...logros] : [];
    return Array.from(new Set(base.map((item) => String(item?.categoria || item?.familia || item?.tipo || item?.tipo_evento || "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, "es"));
  }, [logros]);

  const opcionesRareza = useMemo(() => {
    const base = Array.isArray(logros) ? [...logros] : [];
    return Array.from(new Set(base.map((item) => (tipoMision === "web" ? getWebDifficulty(item).label : getDifficulty(item, tipoMision).label)).filter(Boolean))).sort((a, b) => a.localeCompare(b, "es"));
  }, [logros, tipoMision]);

  const logrosOrdenados = useMemo(() => ordenarLogros(logrosFiltrados), [logrosFiltrados, criterio, tipoMision]);
  const hayLogros = logrosOrdenados.length > 0;
  const totalPaginas = Math.max(1, Math.ceil(logrosOrdenados.length / PAGE_SIZE));

  useEffect(() => { setPagina(1); }, [tipoMision, criterio, filtroTipo, filtroRareza, busqueda, user?.uuid]);
  useEffect(() => { setPagina((valor) => Math.min(valor, totalPaginas)); }, [totalPaginas]);

  const inicio = (pagina - 1) * PAGE_SIZE;
  const logrosPagina = logrosOrdenados.slice(inicio, inicio + PAGE_SIZE);

  const paginasVisibles = (() => {
    const max = 5;
    let start = Math.max(1, pagina - 2);
    let end = Math.min(totalPaginas, start + max - 1);
    start = Math.max(1, end - max + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  })();

  const irPagina = (destino) => {
    const siguiente = Math.min(totalPaginas, Math.max(1, destino));
    if (siguiente === pagina) return;
    setPagina(siguiente);
    requestAnimationFrame(() => { listaTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); });
  };

  return (
    <section className={["logros-epic", LOGROS_PROXIMAMENTE ? "logros-proximamente-mode" : "", MISIONES_MODO_PRUEBAS ? "logros-modo-pruebas" : ""].filter(Boolean).join(" ")}>
      <header className="logros-header">
        <h2 className="logros-titulo">TABLÓN DE AVENTURAS</h2>

        <div className="logros-tabs-tipo">
          {TABS_MISION.map((tab) => (
            <button
              key={tab.id}
              type="button"
              disabled={LOGROS_PROXIMAMENTE || !esOwner}
              className={["logros-tab-tipo", tipoMision === tab.id ? "activo" : "", LOGROS_PROXIMAMENTE || !esOwner ? "bloqueado" : ""].filter(Boolean).join(" ")}
              onClick={() => manejarCambioTipoMision(tab.id)}
            >
              <div className="logros-tab-icon-wrap">
                <img src={tab.imagen} alt={tab.label} className="logros-tab-icon mc-pixelated" />
              </div>
              <span className="logros-tab-label">{tab.label}</span>
            </button>
          ))}
        </div>

        {MISIONES_MODO_PRUEBAS && esOwner && (
          <div className="logros-dev-banner" role="status" aria-live="polite">
            <TriangleAlert size={18} className="logros-dev-banner__icon" />
            <div className="logros-dev-banner__copy">
              <span className="logros-dev-banner__eyebrow">Versión de pruebas</span>
              <p className="logros-dev-banner__text">Los valores pueden no reflejar el sistema definitivo.</p>
            </div>
          </div>
        )}

        {!LOGROS_PROXIMAMENTE && esOwner && tipoMision !== "permanente" && tipoMision !== "web" && tiempoRestante && (
          <div className={`logros-countdown logros-countdown-${tipoMision}`}>
            <span className="countdown-label">{tipoMision === "diaria" ? "ROTACIÓN DIARIA EN" : "CICLO SEMANAL EN"}</span>
            <div className="countdown-digits">
              {tipoMision === "semanal" && (
                <><div className="countdown-block"><span className="countdown-number">{tiempoRestante.dias}</span><span className="countdown-unit">{tiempoRestante.dias === 1 ? "DÍA" : "DÍAS"}</span></div><span className="countdown-sep">•</span></>
              )}
              <div className="countdown-block"><span className="countdown-number">{String(tiempoRestante.horas).padStart(2, "0")}</span><span className="countdown-unit">HORAS</span></div>
              <span className="countdown-sep">:</span>
              <div className="countdown-block"><span className="countdown-number">{String(tiempoRestante.minutos).padStart(2, "0")}</span><span className="countdown-unit">MIN</span></div>
              <span className="countdown-sep">:</span>
              <div className="countdown-block"><span className="countdown-number">{String(tiempoRestante.segundos).padStart(2, "0")}</span><span className="countdown-unit">SEG</span></div>
            </div>
          </div>
        )}
      </header>

      {LOGROS_PROXIMAMENTE ? (
        <div className="logros-soon-wrap"><div className="logros-soon-card mc-block"><Clock size={22} className="logros-soon-clock" /><div className="logros-soon-text"><h3 className="logros-soon-title">En mantenimiento</h3><p className="logros-soon-desc2">Vuelve en breve para seguir progresando.</p></div></div></div>
      ) : !esOwner ? (
        <div className="logros-soon-wrap"><div className="logros-soon-card mc-block"><TriangleAlert size={22} className="logros-soon-clock" /><div className="logros-soon-text"><h3 className="logros-soon-title">Acceso restringido</h3><p className="logros-soon-desc2">Pronto se abrirán al resto de usuarios.</p></div></div></div>
      ) : (
        <>
          <div className="logros-toolbar logros-toolbar-secundario mc-block">
            <div className="logros-filtros-orden">
              <span className="orden-label"><Filter size={15} /> ORDENAR POR</span>
              <select className="orden-select mc-input" value={criterio} onChange={(e) => setCriterio(e.target.value)}>
                {criteriosDisponibles.map((item) => <option key={item.valor} value={item.valor}>{item.nombre}</option>)}
              </select>
            </div>
            <div className="logros-filtros-orden">
              <span className="orden-label">TIPO</span>
              <select className="orden-select mc-input" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
                <option value="todos">Todos</option>
                {opcionesTipo.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
              </select>
            </div>
            <div className="logros-filtros-orden">
              <span className="orden-label">RAREZA</span>
              <select className="orden-select mc-input" value={filtroRareza} onChange={(e) => setFiltroRareza(e.target.value)}>
                <option value="todas">Todas</option>
                {opcionesRareza.map((rareza) => <option key={rareza} value={rareza}>{rareza}</option>)}
              </select>
            </div>
            <div className="logros-searchbox">
              <span className="logros-searchbox__icon"><Search size={16} /></span>
              <input type="text" className="logros-searchbox__input mc-input" placeholder="Buscar misión..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
            </div>
          </div>

          <div className="logros-list-wrapper">
            <div ref={listaTopRef} />

            {!error && hayLogros && (
              <>
                <div className={["logros-grid", cargando ? "logros-lista-saliente" : "logros-lista-entrante"].filter(Boolean).join(" ")}>
                  {logrosPagina.map((logro, index) => {
                    const webMode = tipoMision === "web";
                    const objetivo = clampNumber(logro.objetivo);
                    const progreso = clampNumber(logro.progreso_actual);
                    const progresoPercent = objetivo > 0 ? Math.min(100, (progreso / objetivo) * 100) : 0;
                    const claimable = esClaimable(logro);
                    const difficulty = webMode ? getWebDifficulty(logro) : getDifficulty(logro, tipoMision);
                    const claimId = logro.claim_scope_id || logro.id || logro.codigo;
                    const objectiveText = webMode ? buildWebObjectiveText(logro) : logro.descripcion_objetivo || buildObjectiveText(logro.tipo, objetivo);
                    const rewardText = webMode ? formatWebReward(logro) : `${formatNumber(logro.xp_otorgada)} XP`;
                    const iconSrc = getCategoryIcon(logro?.categoria, logro?.familia, logro?.tipo);
                    
                    const isAlmostDone = !claimable && !logro.reclamado && progresoPercent >= 80 && progresoPercent < 100;

                    return (
                      <div
                        key={`${tipoMision}-${claimId}`}
                        className={[
                          "gacha-card",
                          `rarity-${difficulty.tone}`,
                          claimable ? "state-claimable" : "",
                          logro.reclamado ? "state-claimed" : "",
                          !claimable && !logro.reclamado && !logro.completado ? "state-progress" : "",
                          isAlmostDone ? "state-hype" : ""
                        ].filter(Boolean).join(" ")}
                        style={{ "--delay": `${index * 45}ms` }}
                      >
                        {claimable && <div className="gacha-shine-layer" />}
                        
                        <div className="gacha-card__header">
                          <div className="gacha-icon-slot">
                            <img src={iconSrc} alt="Icono" className="mc-pixelated" />
                          </div>
                          <div className="gacha-card__title-area">
                            <span className="gacha-category">{logro?.categoria || getCycleLabel(logro?.tipo_mision || tipoMision)}</span>
                            <h3 className="gacha-title">{logro.nombre || logro.tipo || "Misión"}</h3>
                            <span className={`gacha-rarity-badge badge-${difficulty.tone}`}>{difficulty.label}</span>
                          </div>
                        </div>

                        <div className="gacha-card__body">
                          <div className="gacha-objective-scroll">
                            {logro.descripcion_lore && <p className="gacha-lore">"{logro.descripcion_lore}"</p>}
                            <p className="gacha-desc">{objectiveText}</p>
                          </div>
                        </div>

                        <div className="gacha-card__footer">
                          {!webMode && !logro.reclamado && (
                            <div className="gacha-progress-wrap">
                              <div className="gacha-progress-text">
                                <span>PROGRESO</span>
                                <span>{formatGoalValue(logro.tipo, progreso)} / {formatGoalValue(logro.tipo, objetivo)}</span>
                              </div>
                              <div className="gacha-progress-bar">
                                <div className="gacha-progress-fill" style={{ width: `${progresoPercent}%` }} />
                              </div>
                            </div>
                          )}

                          <div className="gacha-reward-row">
                            <div className="gacha-reward-tag">
                              {webMode ? <img src="/tienda/assets/coin.png" alt="WC" className="mc-pixelated" /> : <span className="xp-icon">XP</span>}
                              {rewardText}
                            </div>

                            {claimable && !webMode && (
                              <button
                                type="button"
                                className="mc-btn mc-btn--gold gacha-claim-btn"
                                onClick={() => reclamarMision(logro)}
                                disabled={cargandoId === claimId}
                              >
                                {cargandoId === claimId ? "..." : "COBRAR"}
                              </button>
                            )}
                          </div>
                        </div>

                        {logro.reclamado && <div className="gacha-stamp stamp-claimed">RECLAMADA</div>}
                        {webMode && logro.desbloqueado && <div className="gacha-stamp stamp-claimed">DESBLOQUEADO</div>}
                      </div>
                    );
                  })}
                </div>

                {!cargando && totalPaginas > 1 && (
                  <nav className="logros-paginacion mc-block" aria-label="Paginación">
                    <button type="button" className="mc-btn mc-btn--ghost" onClick={() => irPagina(pagina - 1)} disabled={pagina === 1}>ANTERIOR</button>
                    <div className="logros-pag-numeros">
                      {paginasVisibles.map((n) => (
                        <button key={n} type="button" className={["mc-btn mc-btn--ghost", n === pagina ? "activo" : ""].filter(Boolean).join(" ")} onClick={() => irPagina(n)}>{n}</button>
                      ))}
                    </div>
                    <button type="button" className="mc-btn mc-btn--ghost" onClick={() => irPagina(pagina + 1)} disabled={pagina === totalPaginas}>SIGUIENTE</button>
                  </nav>
                )}
              </>
            )}

            {!error && !cargando && !hayLogros && (
              <div className="logros-empty-state">
                <CheckCircle size={48} className="logros-empty-icon" />
                <h3 className="logros-empty-title">Todo completado o sin asignar</h3>
                <p className="logros-empty-desc">No hay misiones disponibles en esta categoría en este momento. Vuelve más tarde.</p>
              </div>
            )}

            {cargando && (
              <div className="logros-loading-overlay">
                <div className="logros-loading-inner">
                  <img src="/assets/eco.webp" alt="Cargando" className="logros-loading-gem mc-pixelated" />
                  <p className="logros-loading-text">{tipoMision === "web" ? "INVOCANDO INSIGNIAS..." : "INVOCANDO DESAFÍOS..."}</p>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}