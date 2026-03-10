import { useEffect, useMemo, useRef, useState } from "react";
import { Filter, Clock, TriangleAlert } from "lucide-react";
import { apiUrl } from "../../lib/env";
import { getAuthToken } from "../../lib/auth/storage";
import "../../styles/components/Dashboard/_logrolist.scss";

const PAGE_SIZE = 10;
const LOGROS_PROXIMAMENTE = false;
const NF = new Intl.NumberFormat("es-ES");
const MISIONES_MODO_PRUEBAS = String(import.meta.env.VITE_MISIONES_MODO_PRUEBAS || "false").toLowerCase() === "true";

const TABS_MISION = [
  { id: "permanente", label: "Logros permanentes", imagen: "/assets/logros/tab-permanentes.webp" },
  { id: "diaria", label: "Misiones diarias", imagen: "/assets/logros/tab-diarias.webp" },
  { id: "semanal", label: "Retos semanales", imagen: "/assets/logros/tab-semanales.webp" },
];

const CRITERIOS = [
  { nombre: "Listas para reclamar", valor: "claimable" },
  { nombre: "Completadas primero", valor: "completado" },
  { nombre: "XP descendente", valor: "xp-desc" },
  { nombre: "XP ascendente", valor: "xp-asc" },
  { nombre: "Progreso descendente", valor: "progreso-desc" },
  { nombre: "Progreso ascendente", valor: "progreso-asc" },
];

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
    return `${formatNumber(dias)} ${dias === 1 ? "día" : "días"}`;
  }

  if (total >= 60) {
    const horas = Math.floor(total / 60);
    const mins = total % 60;
    if (!mins) {
      return `${formatNumber(horas)} ${horas === 1 ? "hora" : "horas"}`;
    }
    return `${formatNumber(horas)} h ${formatNumber(mins)} min`;
  }

  return `${formatNumber(total)} min`;
}

function formatGoalValue(tipo, value) {
  if (["minutos_jugados", "minutos_bajo_y32"].includes(tipo)) {
    return formatDurationFromMinutes(value);
  }
  return formatNumber(value);
}

function plural(base, amount, pluralForm) {
  return clampNumber(amount) === 1 ? base : pluralForm;
}

function buildObjectiveText(tipo, objetivo) {
  const amount = clampNumber(objetivo);

  switch (tipo) {
    case "troncos_talados":
      return `Tala ${formatNumber(amount)} ${plural("tronco", amount, "troncos")}.`;
    case "tablas_crafteadas":
      return `Craftea ${formatNumber(amount)} ${plural("tabla", amount, "tablas")}.`;
    case "pan_crafteado":
      return `Hornea ${formatNumber(amount)} ${plural("pan", amount, "panes")}.`;
    case "camas_crafteadas":
      return `Craftea ${formatNumber(amount)} ${plural("cama", amount, "camas")}.`;
    case "hornos_crafteados":
      return `Craftea ${formatNumber(amount)} ${plural("horno", amount, "hornos")}.`;
    case "cubo_crafteado":
      return `Craftea ${formatNumber(amount)} ${plural("cubo", amount, "cubos")}.`;
    case "pico_hierro_crafteado":
      return `Craftea ${formatNumber(amount)} ${plural("pico de hierro", amount, "picos de hierro")}.`;
    case "semillas_plantadas":
      return `Planta ${formatNumber(amount)} ${plural("semilla", amount, "semillas")}.`;
    case "cultivos_recolectados":
      return `Recolecta ${formatNumber(amount)} ${plural("cultivo", amount, "cultivos")}.`;
    case "trigo_recolectado":
      return `Recolecta ${formatNumber(amount)} ${plural("unidad de trigo", amount, "unidades de trigo")}.`;
    case "zanahorias_patatas_recolectadas":
      return `Recolecta ${formatNumber(amount)} zanahorias o patatas.`;
    case "nether_wart_recolectada":
      return `Recolecta ${formatNumber(amount)} nether wart.`;
    case "ovejas_esquiladas":
      return `Esquila ${formatNumber(amount)} ${plural("oveja", amount, "ovejas")}.`;
    case "animales_criados":
      return `Cría ${formatNumber(amount)} ${plural("animal", amount, "animales")}.`;
    case "alimentos_cocinados":
      return `Cocina ${formatNumber(amount)} ${plural("alimento", amount, "alimentos")}.`;
    case "veces_pescadas":
      return `Lanza la caña ${formatNumber(amount)} ${plural("vez", amount, "veces")}.`;
    case "peces_pescados":
      return `Pesca ${formatNumber(amount)} ${plural("pez", amount, "peces")}.`;
    case "bloques_colocados_total":
      return `Coloca ${formatNumber(amount)} ${plural("bloque", amount, "bloques")}.`;
    case "madera_colocada":
      return `Coloca ${formatNumber(amount)} bloques de madera.`;
    case "piedra_procesada_colocada":
      return `Coloca ${formatNumber(amount)} bloques de piedra procesada.`;
    case "cofres_colocados":
      return `Coloca ${formatNumber(amount)} ${plural("cofre", amount, "cofres")}.`;
    case "antorchas_colocadas":
      return `Coloca ${formatNumber(amount)} ${plural("antorcha", amount, "antorchas")}.`;
    case "fuentes_luz_colocadas":
      return `Coloca ${formatNumber(amount)} fuentes de luz potentes.`;
    case "mesa_encantamientos_colocada":
      return `Coloca ${formatNumber(amount)} ${plural("mesa de encantamientos", amount, "mesas de encantamientos")}.`;
    case "bloques_rotos_total":
      return `Rompe ${formatNumber(amount)} ${plural("bloque", amount, "bloques")}.`;
    case "bloques_bajo_y32_minados":
      return `Mina ${formatNumber(amount)} bloques por debajo de Y32.`;
    case "tierra_rotas":
      return `Rompe ${formatNumber(amount)} bloques de tierra o césped.`;
    case "arena_recogida":
      return `Recoge ${formatNumber(amount)} bloques de arena.`;
    case "grava_recogida":
      return `Recoge ${formatNumber(amount)} bloques de grava.`;
    case "menas_extraidas_total":
      return `Extrae ${formatNumber(amount)} menas.`;
    case "carbon_mena_extraida":
      return `Extrae ${formatNumber(amount)} menas de carbón.`;
    case "cobre_mena_extraida":
      return `Extrae ${formatNumber(amount)} menas de cobre.`;
    case "hierro_mena_extraida":
      return `Extrae ${formatNumber(amount)} menas de hierro.`;
    case "redstone_mena_extraida":
      return `Extrae ${formatNumber(amount)} menas de redstone.`;
    case "lapis_mena_extraida":
      return `Extrae ${formatNumber(amount)} menas de lapislázuli.`;
    case "oro_mena_extraida":
      return `Extrae ${formatNumber(amount)} menas de oro.`;
    case "esmeralda_mena_extraida":
      return `Extrae ${formatNumber(amount)} menas de esmeralda.`;
    case "diamantes_extraidos":
      return `Extrae ${formatNumber(amount)} ${plural("diamante", amount, "diamantes")}.`;
    case "cuarzo_nether_extraido":
      return `Extrae ${formatNumber(amount)} menas de cuarzo del Nether.`;
    case "hierro_lingotes_fundidos":
      return `Funde ${formatNumber(amount)} ${plural("lingote de hierro", amount, "lingotes de hierro")}.`;
    case "hostiles_matados":
      return `Derrota ${formatNumber(amount)} criaturas hostiles.`;
    case "zombis_matados":
      return `Derrota ${formatNumber(amount)} ${plural("zombi", amount, "zombis")}.`;
    case "esqueletos_matados":
      return `Derrota ${formatNumber(amount)} ${plural("esqueleto", amount, "esqueletos")}.`;
    case "creepers_matados":
      return `Derrota ${formatNumber(amount)} ${plural("creeper", amount, "creepers")}.`;
    case "aranas_matadas":
      return `Derrota ${formatNumber(amount)} ${plural("araña", amount, "arañas")}.`;
    case "endermen_matados":
      return `Derrota ${formatNumber(amount)} endermen.`;
    case "blazes_matados":
      return `Derrota ${formatNumber(amount)} blazes.`;
    case "ghasts_matados":
      return `Derrota ${formatNumber(amount)} ghasts.`;
    case "shulkers_matados":
      return `Derrota ${formatNumber(amount)} shulkers.`;
    case "mobs_nether_matados":
      return `Derrota ${formatNumber(amount)} criaturas hostiles en el Nether.`;
    case "mobs_end_matados":
      return `Derrota ${formatNumber(amount)} criaturas hostiles en el End.`;
    case "kills_con_arco":
      return `Consigue ${formatNumber(amount)} bajas con arco.`;
    case "minutos_jugados":
      return `Juega ${formatDurationFromMinutes(amount)} en Survival.`;
    case "bloques_recorridos_total":
      return `Recorre ${formatNumber(amount)} bloques.`;
    case "visitas_bajo_y0":
      return `Desciende por debajo de Y0 ${formatNumber(amount)} ${plural("vez", amount, "veces")}.`;
    case "minutos_bajo_y32":
      return `Pasa ${formatDurationFromMinutes(amount)} por debajo de Y32.`;
    case "entradas_nether":
      return `Entra al Nether ${formatNumber(amount)} ${plural("vez", amount, "veces")}.`;
    case "entradas_end":
      return `Entra al End ${formatNumber(amount)} ${plural("vez", amount, "veces")}.`;
    case "bloques_recorridos_nether":
      return `Recorre ${formatNumber(amount)} bloques en el Nether.`;
    case "bloques_recorridos_end":
      return `Recorre ${formatNumber(amount)} bloques en el End.`;
    case "usos_portal":
      return `Usa portales ${formatNumber(amount)} ${plural("vez", amount, "veces")}.`;
    case "visito_tres_dimensiones":
      return "Visita Overworld, Nether y End con el mismo personaje durante el ciclo activo.";
    case "withers_derrotados":
      return `Derrota ${formatNumber(amount)} ${plural("Wither", amount, "Withers")}.`;
    case "dragones_derrotados":
      return `Derrota ${formatNumber(amount)} ${plural("Dragón del End", amount, "Dragones del End")}.`;
    case "objetos_encantados":
      return `Encanta ${formatNumber(amount)} ${plural("objeto", amount, "objetos")}.`;
    case "pociones_preparadas":
      return `Prepara ${formatNumber(amount)} ${plural("poción", amount, "pociones")}.`;
    case "usos_cama":
      return `Usa una cama ${formatNumber(amount)} ${plural("vez", amount, "veces")}.`;
    default:
      return `Completa ${formatGoalValue(tipo, amount)} de progreso en este encargo.`;
  }
}

function getDifficulty(logro) {
  const xp = clampNumber(logro?.xp_otorgada);
  const objetivo = clampNumber(logro?.objetivo);
  const tipoMision = String(logro?.tipo_mision || "permanente").toLowerCase();
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

  if (categoria === "jefes" || categoria === "endgame" || xp >= 420 || objetivo >= 4000) {
    return { label: "Legendaria", tone: "legendaria" };
  }

  if (xp >= 220 || objetivo >= 1000) return { label: "Épica", tone: "epica" };
  if (xp >= 100 || objetivo >= 200) return { label: "Veterana", tone: "veterana" };
  return { label: "Base", tone: "base" };
}

function getStateLabel(logro, claimable) {
  if (logro?.reclamado) return { label: "Reclamada", tone: "reclamada" };
  if (claimable) return { label: "Lista", tone: "lista" };
  if (logro?.completado) return { label: "Completa", tone: "completa" };
  return { label: "En progreso", tone: "progreso" };
}

function getCycleLabel(tipoMision) {
  if (tipoMision === "diaria") return "Diaria";
  if (tipoMision === "semanal") return "Semanal";
  return "Permanente";
}

function calcularTargetDesdeFecha(fechaISO) {
  if (!fechaISO) return null;
  return new Date(`${fechaISO}T23:59:59.999`);
}

function desglosarDiferencia(target) {
  const ahora = new Date();
  const totalMs = target - ahora;

  if (totalMs <= 0) {
    return { totalMs, dias: 0, horas: 0, minutos: 0, segundos: 0 };
  }

  let resto = Math.floor(totalMs / 1000);
  const dias = Math.floor(resto / 86400);
  resto %= 86400;
  const horas = Math.floor(resto / 3600);
  resto %= 3600;
  const minutos = Math.floor(resto / 60);
  const segundos = resto % 60;

  return { totalMs, dias, horas, minutos, segundos };
}

function buildMetaLine(logro) {
  return [getCycleLabel(logro?.tipo_mision), logro?.categoria, logro?.familia].filter(Boolean).join(" · ");
}

function LogroList({ user, onXpClaimed }) {
  const [logros, setLogros] = useState([]);
  const [error, setError] = useState(null);
  const [reclamadoId, setReclamadoId] = useState(null);
  const [cargandoId, setCargandoId] = useState(null);
  const [tipoMision, setTipoMision] = useState("permanente");
  const [servidorActivo, setServidorActivo] = useState("survival");
  const [criterio, setCriterio] = useState("claimable");
  const [cargando, setCargando] = useState(true);
  const [tiempoRestante, setTiempoRestante] = useState(null);
  const [resetAt, setResetAt] = useState(null);
  const [pagina, setPagina] = useState(1);

  const buttonRefs = useRef({});
  const listaTopRef = useRef(null);

  const manejarCambioTipoMision = (nuevoTipo) => {
    if (LOGROS_PROXIMAMENTE) return;
    if (nuevoTipo === tipoMision) return;
    setTipoMision(nuevoTipo);
    setPagina(1);
  };

  useEffect(() => {
    const fetchLogros = async () => {
      if (!user?.uuid) return;

      try {
        setCargando(true);
        setError(null);

        if (tipoMision === "permanente") {
          const params = new URLSearchParams();
          if (servidorActivo) params.append("servidor", servidorActivo);
          const res = await fetch(apiUrl(`/api/logros/${user.uuid}?${params.toString()}`));
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          setLogros(Array.isArray(data) ? data : []);
          setResetAt(null);
          return;
        }

        const endpoint = tipoMision === "diaria" ? "diarias" : "semanales";
        const params = new URLSearchParams();
        params.append("servidor", servidorActivo || "survival");

        const res = await fetch(apiUrl(`/api/misiones/${endpoint}/${user.uuid}?${params.toString()}`));
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        const misiones = Array.isArray(data) ? data : Array.isArray(data.misiones) ? data.misiones : [];

        setLogros(misiones);
        setResetAt(calcularTargetDesdeFecha(data?.meta?.fecha_fin));
      } catch (err) {
        console.error("[MISIONES FETCH ERROR]", err);
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
  }, [user?.uuid, tipoMision, servidorActivo]);

  useEffect(() => {
    if (!resetAt || tipoMision === "permanente") {
      setTiempoRestante(null);
      return;
    }

    const actualizar = () => {
      const diff = desglosarDiferencia(resetAt);
      setTiempoRestante(diff);
    };

    actualizar();
    const id = setInterval(actualizar, 1000);
    return () => clearInterval(id);
  }, [resetAt, tipoMision]);

  const reclamarMision = async (logro) => {
    try {
      const claimId = logro.claim_scope_id || logro.id;
      setCargandoId(claimId);

      const res = await fetch(apiUrl(`/api/misiones/reclamar/${logro.tipo_mision}/${claimId}`), {
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

      const sourceButton = buttonRefs.current[claimId];
      if (onXpClaimed) onXpClaimed(data.xp_otorgada || logro.xp_otorgada || 0, sourceButton);
    } catch (err) {
      alert(err.message || "No se pudo reclamar la misión");
    } finally {
      setCargandoId(null);
    }
  };

  const esClaimable = (logro) => {
    if (!logro) return false;
    const claimId = logro.claim_scope_id || logro.id;
    const reclamado = !!logro.reclamado || String(claimId) === String(reclamadoId);
    return !!logro.completado && !reclamado;
  };

  const ordenarLogros = (lista) => {
    const progresoSeguro = (item) => {
      const objetivo = clampNumber(item?.objetivo);
      const progreso = clampNumber(item?.progreso_actual);
      if (objetivo <= 0) return 0;
      return progreso / objetivo;
    };

    switch (criterio) {
      case "xp-desc":
        return [...lista].sort((a, b) => clampNumber(b.xp_otorgada) - clampNumber(a.xp_otorgada));
      case "xp-asc":
        return [...lista].sort((a, b) => clampNumber(a.xp_otorgada) - clampNumber(b.xp_otorgada));
      case "progreso-desc":
        return [...lista].sort((a, b) => progresoSeguro(b) - progresoSeguro(a));
      case "progreso-asc":
        return [...lista].sort((a, b) => progresoSeguro(a) - progresoSeguro(b));
      case "completado":
        return [...lista].sort((a, b) => {
          if (!!a.completado === !!b.completado) return 0;
          return a.completado ? -1 : 1;
        });
      case "claimable":
      default:
        return [...lista].sort((a, b) => {
          const aClaim = esClaimable(a);
          const bClaim = esClaimable(b);
          if (aClaim !== bClaim) return aClaim ? -1 : 1;
          if (!!a.completado !== !!b.completado) return a.completado ? -1 : 1;
          return clampNumber(b.xp_otorgada) - clampNumber(a.xp_otorgada);
        });
    }
  };

  const logrosFiltrados = useMemo(() => {
    const base = Array.isArray(logros) ? [...logros] : [];
    if (tipoMision === "permanente" && servidorActivo) {
      return base.filter((item) => item.servidor === servidorActivo || item.servidor === "global");
    }
    return base;
  }, [logros, tipoMision, servidorActivo]);

  const logrosOrdenados = useMemo(() => ordenarLogros(logrosFiltrados), [logrosFiltrados, criterio]);
  const hayLogros = logrosOrdenados.length > 0;
  const hayClaimables = logrosOrdenados.some((item) => esClaimable(item));

  const subtituloTab =
    tipoMision === "permanente"
      ? "Haz historia con metas que no caducan"
      : tipoMision === "diaria"
      ? "Encargos del día con objetivo claro y botín inmediato"
      : "Retos largos para una semana que deje huella";

  const totalPaginas = Math.max(1, Math.ceil(logrosOrdenados.length / PAGE_SIZE));

  useEffect(() => {
    setPagina(1);
  }, [tipoMision, servidorActivo, criterio, user?.uuid]);

  useEffect(() => {
    setPagina((valor) => Math.min(valor, totalPaginas));
  }, [totalPaginas]);

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
    requestAnimationFrame(() => {
      listaTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <section className={["logros-epic", LOGROS_PROXIMAMENTE ? "logros-proximamente-mode" : "", MISIONES_MODO_PRUEBAS ? "logros-modo-pruebas" : ""].filter(Boolean).join(" ")}>
      <header className="logros-header">
        <h2 className="logros-titulo">Misiones y logros de FlanCraft</h2>

        <div className="logros-tabs-tipo">
          {TABS_MISION.map((tab) => (
            <button
              key={tab.id}
              type="button"
              disabled={LOGROS_PROXIMAMENTE}
              className={["logros-tab-tipo", tipoMision === tab.id ? "activo" : "", LOGROS_PROXIMAMENTE ? "bloqueado" : ""].filter(Boolean).join(" ")}
              onClick={() => manejarCambioTipoMision(tab.id)}
            >
              <div className="logros-tab-icon-wrap">
                <img src={tab.imagen} alt={tab.label} className="logros-tab-icon" />
              </div>
              <span className="logros-tab-label">{tab.label}</span>
            </button>
          ))}
        </div>

        <p className="logros-subtitulo-secundario">{LOGROS_PROXIMAMENTE ? "Sistema en preparación" : subtituloTab}</p>

        {MISIONES_MODO_PRUEBAS && (
          <div className="logros-dev-banner" role="status" aria-live="polite">
            <div className="logros-dev-banner__icon">
              <TriangleAlert size={18} />
            </div>

            <div className="logros-dev-banner__copy">
              <span className="logros-dev-banner__eyebrow">Versión de desarrollo y pruebas</span>
              <p className="logros-dev-banner__text">
                Temporalmente esta sección es visual. Los valores, reinicios, progresos y reclamaciones pueden no reflejar el sistema definitivo mientras terminamos las pruebas.
              </p>
            </div>
          </div>
        )}

        {!LOGROS_PROXIMAMENTE && tipoMision !== "permanente" && tiempoRestante && (
          <div className={`logros-countdown logros-countdown-${tipoMision}`}>
            <span className="countdown-label">{tipoMision === "diaria" ? "La rotación diaria termina en" : "Este ciclo semanal termina en"}</span>

            <div className="countdown-digits">
              {tipoMision === "semanal" && (
                <>
                  <div className="countdown-block">
                    <span className="countdown-number">{tiempoRestante.dias}</span>
                    <span className="countdown-unit">{tiempoRestante.dias === 1 ? "día" : "días"}</span>
                  </div>
                  <span className="countdown-sep">•</span>
                </>
              )}

              <div className="countdown-block">
                <span className="countdown-number">{String(tiempoRestante.horas).padStart(2, "0")}</span>
                <span className="countdown-unit">horas</span>
              </div>
              <span className="countdown-sep">:</span>
              <div className="countdown-block">
                <span className="countdown-number">{String(tiempoRestante.minutos).padStart(2, "0")}</span>
                <span className="countdown-unit">min</span>
              </div>
              <span className="countdown-sep">:</span>
              <div className="countdown-block">
                <span className="countdown-number">{String(tiempoRestante.segundos).padStart(2, "0")}</span>
                <span className="countdown-unit">seg</span>
              </div>
            </div>
          </div>
        )}
      </header>

      {LOGROS_PROXIMAMENTE ? (
        <div className="logros-soon-wrap">
          <div className="logros-soon-card">
            <div className="logros-soon-icon">
              <Clock size={22} className="logros-soon-clock" />
            </div>
            <div className="logros-soon-text">
              <h3 className="logros-soon-title">En mantenimiento</h3>
              <p className="logros-soon-desc">Estamos puliendo el tablero de desafíos.</p>
              <p className="logros-soon-desc2">Vuelve en breve para seguir progresando.</p>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="logros-toolbar">
            {tipoMision === "permanente" && (
              <div className="logros-reinos-wrapper">
                <button type="button" className={["reino-card", servidorActivo === "survival" ? "activo" : ""].filter(Boolean).join(" ")} onClick={() => setServidorActivo("survival")}>
                  <div className="reino-img-wrap">
                    <img src="/assets/reinos/survival-clasico.webp" alt="Survival" className="reino-img" />
                  </div>
                  <span className="reino-nombre">Survival</span>
                </button>
              </div>
            )}

            <div className="logros-filtros-orden">
              <span className="orden-label">
                <Filter size={15} /> Ordenar por
              </span>
              <select className="orden-select" value={criterio} onChange={(e) => setCriterio(e.target.value)}>
                {CRITERIOS.map((item) => (
                  <option key={item.valor} value={item.valor}>
                    {item.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && <p className="logros-estado logros-estado-error">Error al cargar misiones: {error}</p>}

          {!error && !cargando && !hayLogros && (
            <p className="logros-estado">
              {tipoMision === "permanente"
                ? "Aún no hay logros visibles en esta modalidad."
                : tipoMision === "diaria"
                ? "No hay misiones diarias activas ahora mismo."
                : "No hay retos semanales activos ahora mismo."}
            </p>
          )}

          <div className="logros-list-wrapper">
            <div ref={listaTopRef} />

            {!error && hayLogros && (
              <>
                <ul className={["logros-lista", cargando ? "logros-lista-saliente" : "logros-lista-entrante"].filter(Boolean).join(" ")}>
                  {logrosPagina.map((logro, index) => {
                    const objetivo = clampNumber(logro.objetivo);
                    const progreso = clampNumber(logro.progreso_actual);
                    const progresoPercent = objetivo > 0 ? Math.min(100, (progreso / objetivo) * 100) : 0;
                    const claimable = esClaimable(logro);
                    const state = getStateLabel(logro, claimable);
                    const difficulty = getDifficulty(logro);
                    const claimId = logro.claim_scope_id || logro.id;
                    const objectiveText = logro.descripcion_objetivo || buildObjectiveText(logro.tipo, objetivo);

                    return (
                      <li
                        key={`${logro.tipo_mision}-${claimId}`}
                        className={[
                          "logro-row",
                          `logro-row--${difficulty.tone}`,
                          claimable ? "logro-claimable" : "",
                          logro.completado ? "logro-completado" : "",
                          logro.reclamado ? "logro-reclamado" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        style={{ "--delay": `${index * 45}ms` }}
                      >
                        <span className="logro-acento" />

                        <div className="logro-main">
                          <div className="logro-top">
                            <div className="logro-copy">
                              <p className="logro-meta-line">{buildMetaLine(logro)}</p>
                              <h3 className="logro-nombre">{logro.nombre || logro.tipo || "Misión"}</h3>
                              <div className="logro-submeta">
                                <span className="logro-rareza-text">{difficulty.label}</span>
                                <span className="logro-submeta-dot">•</span>
                                <span className={`logro-state-text logro-state-text--${state.tone}`}>{state.label}</span>
                              </div>
                              <p className="logro-descripcion">{logro.descripcion || "Sigue el objetivo exacto y reclama la experiencia al completarlo."}</p>
                            </div>

                            <div className="logro-side">
                              <span className="logro-xp-chip">{formatNumber(logro.xp_otorgada)} XP</span>
                            </div>
                          </div>

                          <div className="logro-objective-box">
                            <span className="logro-block-label">Encargo</span>
                            <p className="logro-objetivo-texto">{objectiveText}</p>
                          </div>

                          <div className="logro-progress">
                            <div className="logro-progress-head">
                              <span className="logro-progress-label">Progreso</span>
                              <span className="logro-progress-percentage">{Math.round(progresoPercent)}%</span>
                            </div>

                            <div className="logro-progress-track">
                              <div className="logro-progress-fill" style={{ width: `${progresoPercent}%` }} />
                            </div>

                            <div className="logro-progress-meta">
                              <span className="logro-progress-current">{formatGoalValue(logro.tipo, progreso)}</span>
                              <span className="logro-progress-divider">/</span>
                              <span className="logro-progress-target">{formatGoalValue(logro.tipo, objetivo)}</span>
                            </div>
                          </div>

                          {claimable && (
                            <div className="logro-footer">
                              <button
                                ref={(el) => {
                                  buttonRefs.current[claimId] = el;
                                }}
                                type="button"
                                className="tsf-btn"
                                onClick={() => reclamarMision(logro)}
                                disabled={cargandoId === claimId}
                              >
                                <span className="tsf-btnDepth" aria-hidden="true" />
                                <span className="tsf-btnFace">
                                  <span className="tsf-btnLabel">{cargandoId === claimId ? "Reclamando..." : "Reclamar XP"}</span>
                                </span>
                              </button>
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {!cargando && totalPaginas > 1 && (
                  <nav className="logros-paginacion" aria-label="Paginación de misiones">
                    <button type="button" className="logros-pag-btn" onClick={() => irPagina(pagina - 1)} disabled={pagina === 1}>
                      Anterior
                    </button>

                    <div className="logros-pag-numeros">
                      {paginasVisibles.map((n) => (
                        <button key={n} type="button" className={["logros-pag-num", n === pagina ? "activo" : ""].filter(Boolean).join(" ")} onClick={() => irPagina(n)}>
                          {n}
                        </button>
                      ))}
                    </div>

                    <button type="button" className="logros-pag-btn" onClick={() => irPagina(pagina + 1)} disabled={pagina === totalPaginas}>
                      Siguiente
                    </button>

                    <span className="logros-pag-info">
                      Página {pagina} / {totalPaginas}
                    </span>
                  </nav>
                )}
              </>
            )}

            {cargando && (
              <div className="logros-loading-overlay">
                <div className="logros-loading-inner">
                  <img src="/assets/eco.webp" alt="Cargando misiones" className="logros-loading-gem" />
                  <p className="logros-loading-text">Invocando nuevos desafíos...</p>
                </div>
              </div>
            )}
          </div>

          {!cargando && hayClaimables && tipoMision === "permanente" && <p className="logros-estado">Tienes recompensas listas para reclamar en esta modalidad.</p>}
        </>
      )}
    </section>
  );
}

export default LogroList;