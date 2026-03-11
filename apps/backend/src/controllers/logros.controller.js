const crypto = require("crypto");
const db = require("../models/db");
const { evaluateWebAchievementsForUser } = require("../services/webLogros.service");

const DAILY_MISSIONS_PER_SERVER = 5;
const WEEKLY_MISSIONS_PER_SERVER = 8;

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

function inicioDeSemanaISO() {
  const ahora = new Date();
  const dia = ahora.getUTCDay();
  const ajuste = dia === 0 ? -6 : 1 - dia;
  const inicio = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate()));
  inicio.setUTCDate(inicio.getUTCDate() + ajuste);
  return inicio.toISOString().slice(0, 10);
}

function finDeSemanaISO(inicioISO) {
  const inicio = new Date(`${inicioISO}T00:00:00.000Z`);
  inicio.setUTCDate(inicio.getUTCDate() + 6);
  return inicio.toISOString().slice(0, 10);
}

function generarUuid() {
  return crypto.randomUUID();
}

function clampInt(valor, fallback = 0) {
  const n = Number(valor);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

function elegirPonderado(lista) {
  const total = lista.reduce((acc, item) => acc + Math.max(1, clampInt(item.peso_rotacion, 1)), 0);
  let cursor = Math.random() * total;
  for (const item of lista) {
    cursor -= Math.max(1, clampInt(item.peso_rotacion, 1));
    if (cursor <= 0) return item;
  }
  return lista[lista.length - 1];
}

function descripcionObjetivoFallback(tipoEvento, objetivo) {
  const n = clampInt(objetivo);

  switch (tipoEvento) {
    case "troncos_talados":
      return `Tala ${n} troncos.`;
    case "tablas_crafteadas":
      return `Craftea ${n} tablas.`;
    case "pan_crafteado":
      return `Hornea ${n} ${n === 1 ? "pan" : "panes"}.`;
    case "camas_crafteadas":
      return `Craftea ${n} ${n === 1 ? "cama" : "camas"}.`;
    case "hornos_crafteados":
      return `Craftea ${n} ${n === 1 ? "horno" : "hornos"}.`;
    case "cubo_crafteado":
      return `Craftea ${n} ${n === 1 ? "cubo" : "cubos"}.`;
    case "pico_hierro_crafteado":
      return `Craftea ${n} ${n === 1 ? "pico de hierro" : "picos de hierro"}.`;
    case "semillas_plantadas":
      return `Planta ${n} ${n === 1 ? "semilla" : "semillas"}.`;
    case "cultivos_recolectados":
      return `Recolecta ${n} ${n === 1 ? "cultivo" : "cultivos"}.`;
    case "trigo_recolectado":
      return `Recolecta ${n} unidades de trigo.`;
    case "zanahorias_patatas_recolectadas":
      return `Recolecta ${n} zanahorias o patatas.`;
    case "nether_wart_recolectada":
      return `Recolecta ${n} nether wart.`;
    case "ovejas_esquiladas":
      return `Esquila ${n} ${n === 1 ? "oveja" : "ovejas"}.`;
    case "animales_criados":
      return `Cría ${n} ${n === 1 ? "animal" : "animales"}.`;
    case "alimentos_cocinados":
      return `Cocina ${n} ${n === 1 ? "alimento" : "alimentos"}.`;
    case "veces_pescadas":
      return `Lanza la caña ${n} ${n === 1 ? "vez" : "veces"}.`;
    case "peces_pescados":
      return `Pesca ${n} ${n === 1 ? "pez" : "peces"}.`;
    case "bloques_colocados_total":
      return `Coloca ${n} ${n === 1 ? "bloque" : "bloques"}.`;
    case "madera_colocada":
      return `Coloca ${n} bloques de madera.`;
    case "piedra_procesada_colocada":
      return `Coloca ${n} bloques de piedra procesada.`;
    case "cofres_colocados":
      return `Coloca ${n} ${n === 1 ? "cofre" : "cofres"}.`;
    case "antorchas_colocadas":
      return `Coloca ${n} ${n === 1 ? "antorcha" : "antorchas"}.`;
    case "fuentes_luz_colocadas":
      return `Coloca ${n} fuentes de luz potentes.`;
    case "mesa_encantamientos_colocada":
      return `Coloca ${n} ${n === 1 ? "mesa de encantamientos" : "mesas de encantamientos"}.`;
    case "bloques_rotos_total":
      return `Rompe ${n} ${n === 1 ? "bloque" : "bloques"}.`;
    case "bloques_bajo_y32_minados":
      return `Mina ${n} bloques por debajo de Y32.`;
    case "tierra_rotas":
      return `Rompe ${n} bloques de tierra o césped.`;
    case "arena_recogida":
      return `Recoge ${n} bloques de arena.`;
    case "grava_recogida":
      return `Recoge ${n} bloques de grava.`;
    case "menas_extraidas_total":
      return `Extrae ${n} menas.`;
    case "carbon_mena_extraida":
      return `Extrae ${n} menas de carbón.`;
    case "cobre_mena_extraida":
      return `Extrae ${n} menas de cobre.`;
    case "hierro_mena_extraida":
      return `Extrae ${n} menas de hierro.`;
    case "redstone_mena_extraida":
      return `Extrae ${n} menas de redstone.`;
    case "lapis_mena_extraida":
      return `Extrae ${n} menas de lapislázuli.`;
    case "oro_mena_extraida":
      return `Extrae ${n} menas de oro.`;
    case "esmeralda_mena_extraida":
      return `Extrae ${n} menas de esmeralda.`;
    case "diamantes_extraidos":
      return `Extrae ${n} ${n === 1 ? "diamante" : "diamantes"}.`;
    case "cuarzo_nether_extraido":
      return `Extrae ${n} menas de cuarzo del Nether.`;
    case "hierro_lingotes_fundidos":
      return `Funde ${n} ${n === 1 ? "lingote de hierro" : "lingotes de hierro"}.`;
    case "hostiles_matados":
      return `Derrota ${n} criaturas hostiles.`;
    case "zombis_matados":
      return `Derrota ${n} ${n === 1 ? "zombi" : "zombis"}.`;
    case "esqueletos_matados":
      return `Derrota ${n} ${n === 1 ? "esqueleto" : "esqueletos"}.`;
    case "creepers_matados":
      return `Derrota ${n} ${n === 1 ? "creeper" : "creepers"}.`;
    case "aranas_matadas":
      return `Derrota ${n} ${n === 1 ? "araña" : "arañas"}.`;
    case "endermen_matados":
      return `Derrota ${n} ${n === 1 ? "enderman" : "endermen"}.`;
    case "blazes_matados":
      return `Derrota ${n} ${n === 1 ? "blaze" : "blazes"}.`;
    case "ghasts_matados":
      return `Derrota ${n} ${n === 1 ? "ghast" : "ghasts"}.`;
    case "shulkers_matados":
      return `Derrota ${n} ${n === 1 ? "shulker" : "shulkers"}.`;
    case "mobs_nether_matados":
      return `Derrota ${n} criaturas hostiles en el Nether.`;
    case "mobs_end_matados":
      return `Derrota ${n} criaturas hostiles en el End.`;
    case "kills_con_arco":
      return `Consigue ${n} bajas con arco.`;
    case "minutos_jugados":
      return `Juega ${n} minutos en Survival.`;
    case "bloques_recorridos_total":
      return `Recorre ${n} bloques.`;
    case "visitas_bajo_y0":
      return `Desciende por debajo de Y0 ${n} ${n === 1 ? "vez" : "veces"}.`;
    case "minutos_bajo_y32":
      return `Pasa ${n} minutos por debajo de Y32.`;
    case "entradas_nether":
      return `Entra al Nether ${n} ${n === 1 ? "vez" : "veces"}.`;
    case "entradas_end":
      return `Entra al End ${n} ${n === 1 ? "vez" : "veces"}.`;
    case "bloques_recorridos_nether":
      return `Recorre ${n} bloques en el Nether.`;
    case "bloques_recorridos_end":
      return `Recorre ${n} bloques en el End.`;
    case "usos_portal":
      return `Usa portales ${n} ${n === 1 ? "vez" : "veces"}.`;
    case "visito_tres_dimensiones":
      return "Visita Overworld, Nether y End con el mismo personaje durante el ciclo activo.";
    case "withers_derrotados":
      return `Derrota ${n} ${n === 1 ? "Wither" : "Withers"}.`;
    case "dragones_derrotados":
      return `Derrota ${n} ${n === 1 ? "Dragón del End" : "Dragones del End"}.`;
    case "objetos_encantados":
      return `Encanta ${n} ${n === 1 ? "objeto" : "objetos"}.`;
    case "pociones_preparadas":
      return `Prepara ${n} ${n === 1 ? "poción" : "pociones"}.`;
    case "usos_cama":
      return `Usa una cama ${n} ${n === 1 ? "vez" : "veces"}.`;
    default:
      return `Completa ${n} de progreso en este encargo.`;
  }
}

function normalizarTextos(definicion) {
  const lore = String(definicion?.descripcion || "").trim();
  const objetivo =
    String(definicion?.descripcion_objetivo || "").trim() ||
    descripcionObjetivoFallback(definicion?.tipo_evento, definicion?.objetivo);

  return {
    descripcion: lore,
    descripcion_lore: lore,
    descripcion_objetivo: objetivo,
  };
}

function normalizarMisionBase(mision) {
  const textos = normalizarTextos(mision);

  return {
    id: mision.id,
    claim_scope_id: mision.id,
    nombre: mision.nombre,
    descripcion: textos.descripcion,
    descripcion_lore: textos.descripcion_lore,
    descripcion_objetivo: textos.descripcion_objetivo,
    tipo: mision.tipo_evento,
    objetivo: clampInt(mision.objetivo),
    xp_otorgada: clampInt(mision.xp_otorgada),
    servidor: mision.servidor,
    categoria: mision.categoria,
    familia: mision.familia,
    orden: clampInt(mision.orden),
    activa: !!mision.activa,
    progreso_actual: clampInt(mision.progreso_actual),
    completado: !!mision.completado || clampInt(mision.progreso_actual) >= clampInt(mision.objetivo),
    reclamado: !!mision.reclamado,
    tipo_mision: "permanente",
    fecha_inicio: null,
    fecha_fin: null,
  };
}

function normalizarMisionRotada(row, tablaRelacion, progreso, tipoMision) {
  const definicion = row?.[tablaRelacion] || {};
  const textos = normalizarTextos(definicion);
  const objetivo = clampInt(progreso?.objetivo_snapshot ?? definicion.objetivo);
  const progresoActual = clampInt(progreso?.progreso_actual);

  return {
    id: definicion.id,
    claim_scope_id: row.id,
    nombre: definicion.nombre,
    descripcion: textos.descripcion,
    descripcion_lore: textos.descripcion_lore,
    descripcion_objetivo: textos.descripcion_objetivo,
    tipo: definicion.tipo_evento,
    objetivo,
    xp_otorgada: clampInt(definicion.xp_otorgada),
    servidor: row.servidor || definicion.servidor,
    categoria: definicion.categoria,
    familia: definicion.familia,
    orden: clampInt(definicion.orden),
    activa: !!row.activa,
    progreso_actual: progresoActual,
    completado: !!progreso?.completado || progresoActual >= objetivo,
    reclamado: !!progreso?.reclamado,
    tipo_mision: tipoMision,
    fecha_inicio: row.fecha_inicio,
    fecha_fin: row.fecha_fin,
  };
}

async function existeUsuarioVinculado(uuid) {
  const { count, error } = await db
    .from("usuarios")
    .select("uuid", { count: "exact", head: true })
    .eq("uuid", uuid);

  if (error) throw error;
  return (count || 0) > 0;
}

async function obtenerUsuarioXP(uuid) {
  const { data, error } = await db
    .from("usuarios")
    .select("xp_actual, nivel")
    .eq("uuid", uuid)
    .maybeSingle();

  if (error) throw error;

  return {
    xp_actual: clampInt(data?.xp_actual),
    nivel: Math.max(1, clampInt(data?.nivel, 1)),
  };
}

async function obtenerNivelDesdeXP(xpTotal) {
  const { data, error } = await db
    .from("niveles")
    .select("nivel, xp_total_acumulada")
    .lte("xp_total_acumulada", clampInt(xpTotal))
    .order("xp_total_acumulada", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return Math.max(1, clampInt(data?.nivel, 1));
}

async function sumarXpUsuario(uuid, xp) {
  const base = await obtenerUsuarioXP(uuid);
  const nuevaXP = Math.max(0, base.xp_actual + clampInt(xp));
  const nuevoNivel = await obtenerNivelDesdeXP(nuevaXP);

  const { error } = await db
    .from("usuarios")
    .update({
      xp_actual: nuevaXP,
      nivel: nuevoNivel,
    })
    .eq("uuid", uuid);

  if (error) throw error;

  try {
    await evaluateWebAchievementsForUser(uuid, {
      types: ["first_level", "top_rank"],
      context: {
        previousLevel: base.nivel,
        currentLevel: nuevoNivel,
      },
    });
  } catch (webAchievementError) {
    console.error("[WEB LOGROS XP EVAL ERROR]", {
      uuid,
      message: webAchievementError?.message || String(webAchievementError),
    });
  }

  return {
    xp_actual: nuevaXP,
    nivel: nuevoNivel,
    subio_nivel: nuevoNivel > base.nivel,
  };
}

async function registrarHistorialEvento(uuid, servidor, tipoEvento, cantidad, fuente = "plugin") {
  const { error } = await db.from("logros_historial").insert({
    uuid_jugador: uuid,
    tipo_evento: tipoEvento,
    cantidad: clampInt(cantidad),
    servidor,
    fuente,
  });

  if (error) throw error;
}

async function cargarLogrosActivos(servidor) {
  const { data, error } = await db
    .from("logros")
    .select("id, codigo, nombre, descripcion, descripcion_objetivo, tipo_evento, objetivo, xp_otorgada, servidor, categoria, familia, orden, activa")
    .in("servidor", [servidor, "global"])
    .eq("activa", true)
    .order("categoria", { ascending: true })
    .order("orden", { ascending: true });

  if (error) throw error;
  return data || [];
}

async function cargarRotacionActivaDiaria(servidor, hoy) {
  const { data, error } = await db
    .from("misiones_diarias_rotacion")
    .select(`
      id,
      id_mision,
      servidor,
      fecha_inicio,
      fecha_fin,
      orden_rotacion,
      lote_rotacion,
      activa,
      misiones_diarias!inner(
        id,
        codigo,
        nombre,
        descripcion,
        descripcion_objetivo,
        tipo_evento,
        objetivo,
        xp_otorgada,
        servidor,
        categoria,
        familia,
        orden,
        activa,
        peso_rotacion,
        cooldown_rotaciones
      )
    `)
    .eq("servidor", servidor)
    .eq("activa", true)
    .lte("fecha_inicio", hoy)
    .gte("fecha_fin", hoy)
    .order("orden_rotacion", { ascending: true });

  if (error) throw error;
  return data || [];
}

async function cargarRotacionActivaSemanal(servidor, hoy) {
  const { data, error } = await db
    .from("misiones_semanales_rotacion")
    .select(`
      id,
      id_mision,
      servidor,
      fecha_inicio,
      fecha_fin,
      orden_rotacion,
      lote_rotacion,
      activa,
      misiones_semanales!inner(
        id,
        codigo,
        nombre,
        descripcion,
        descripcion_objetivo,
        tipo_evento,
        objetivo,
        xp_otorgada,
        servidor,
        categoria,
        familia,
        orden,
        activa,
        peso_rotacion,
        cooldown_rotaciones
      )
    `)
    .eq("servidor", servidor)
    .eq("activa", true)
    .lte("fecha_inicio", hoy)
    .gte("fecha_fin", hoy)
    .order("orden_rotacion", { ascending: true });

  if (error) throw error;
  return data || [];
}

async function cargarProgresoLogros(uuid, ids) {
  if (!ids.length) return new Map();

  const { data, error } = await db
    .from("logros_progreso")
    .select("id_logro, progreso_actual, objetivo_snapshot, completado, reclamado")
    .eq("uuid_jugador", uuid)
    .in("id_logro", ids);

  if (error) throw error;

  const mapa = new Map();
  for (const row of data || []) {
    mapa.set(String(row.id_logro), row);
  }
  return mapa;
}

async function cargarProgresoRotaciones(uuid, tabla, campo, ids) {
  if (!ids.length) return new Map();

  const { data, error } = await db
    .from(tabla)
    .select(`${campo}, progreso_actual, objetivo_snapshot, completado, reclamado`)
    .eq("uuid_jugador", uuid)
    .in(campo, ids);

  if (error) throw error;

  const mapa = new Map();
  for (const row of data || []) {
    mapa.set(String(row[campo]), row);
  }
  return mapa;
}

async function insertarProgresoSiNoExiste(tabla, payload, campoClave, valorClave) {
  const { data, error } = await db
    .from(tabla)
    .select(`${campoClave}, progreso_actual, objetivo_snapshot, completado, reclamado`)
    .eq("uuid_jugador", payload.uuid_jugador)
    .eq(campoClave, valorClave)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    const { error: insertError } = await db.from(tabla).insert(payload);
    if (insertError) throw insertError;

    return {
      progreso_actual: clampInt(payload.progreso_actual),
      objetivo_snapshot: clampInt(payload.objetivo_snapshot),
      completado: !!payload.completado,
      reclamado: !!payload.reclamado,
      creado: true,
      actualizado: false,
      completadoAhora: !!payload.completado,
    };
  }

  if (data.completado) {
    return {
      progreso_actual: clampInt(data.progreso_actual),
      objetivo_snapshot: clampInt(data.objetivo_snapshot),
      completado: !!data.completado,
      reclamado: !!data.reclamado,
      creado: false,
      actualizado: false,
      completadoAhora: false,
    };
  }

  const nuevo = clampInt(data.progreso_actual) + clampInt(payload.progreso_actual);
  const objetivo = clampInt(data.objetivo_snapshot || payload.objetivo_snapshot);
  const progresoActual = objetivo > 0 ? Math.min(nuevo, objetivo) : nuevo;
  const completado = objetivo > 0 ? progresoActual >= objetivo : false;

  const { error: updateError } = await db
    .from(tabla)
    .update({
      progreso_actual: progresoActual,
      completado,
      fecha_completado: completado ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("uuid_jugador", payload.uuid_jugador)
    .eq(campoClave, valorClave);

  if (updateError) throw updateError;

  return {
    progreso_actual: progresoActual,
    objetivo_snapshot: objetivo,
    completado,
    reclamado: !!data.reclamado,
    creado: false,
    actualizado: true,
    completadoAhora: completado && !data.completado,
  };
}

async function aplicarProgresoLogros(uuid, servidor, progresos) {
  const logros = await cargarLogrosActivos(servidor);
  const eventos = Object.keys(progresos);
  const activos = logros.filter((item) => eventos.includes(item.tipo_evento));

  const resumen = {
    permanentes: {
      totales: activos.length,
      insertados: 0,
      actualizados: 0,
      completados: 0,
    },
  };

  const completadosAhora = [];

  for (const logro of activos) {
    const cantidad = clampInt(progresos[logro.tipo_evento]);
    if (cantidad <= 0) continue;

    const resultado = await insertarProgresoSiNoExiste(
      "logros_progreso",
      {
        uuid_jugador: uuid,
        id_logro: logro.id,
        progreso_actual: cantidad,
        objetivo_snapshot: clampInt(logro.objetivo),
        completado: cantidad >= clampInt(logro.objetivo),
        reclamado: false,
        fecha_completado: cantidad >= clampInt(logro.objetivo) ? new Date().toISOString() : null,
      },
      "id_logro",
      logro.id
    );

    if (resultado.creado) resumen.permanentes.insertados += 1;
    if (resultado.actualizado) resumen.permanentes.actualizados += 1;
    if (resultado.completadoAhora) {
      resumen.permanentes.completados += 1;
      completadosAhora.push({
        id: logro.id,
        claim_scope_id: logro.id,
        tipo_mision: "permanente",
        nombre: logro.nombre,
      });
    }
  }

  return { resumen, completadosAhora };
}

async function aplicarProgresoRotado(uuid, servidor, progresos, tipoMision) {
  const hoy = hoyISO();
  const config =
    tipoMision === "diaria"
      ? {
          tablaProgreso: "misiones_diarias_progreso",
          campoProgreso: "id_rotacion_diaria",
          relacion: "misiones_diarias",
          etiqueta: "diarias",
        }
      : {
          tablaProgreso: "misiones_semanales_progreso",
          campoProgreso: "id_rotacion_semanal",
          relacion: "misiones_semanales",
          etiqueta: "semanales",
        };

  const rotaciones =
    tipoMision === "diaria"
      ? await cargarRotacionActivaDiaria(servidor, hoy)
      : await cargarRotacionActivaSemanal(servidor, hoy);

  const eventos = Object.keys(progresos);
  const activas = rotaciones.filter((item) => {
    const definicion = item[config.relacion];
    return definicion && eventos.includes(definicion.tipo_evento);
  });

  const resumen = {
    [config.etiqueta]: {
      totales: activas.length,
      insertados: 0,
      actualizados: 0,
      completados: 0,
    },
  };

  const completadosAhora = [];

  for (const row of activas) {
    const definicion = row[config.relacion];
    const cantidad = clampInt(progresos[definicion.tipo_evento]);
    if (cantidad <= 0) continue;

    const resultado = await insertarProgresoSiNoExiste(
      config.tablaProgreso,
      {
        uuid_jugador: uuid,
        [config.campoProgreso]: row.id,
        progreso_actual: cantidad,
        objetivo_snapshot: clampInt(definicion.objetivo),
        completado: cantidad >= clampInt(definicion.objetivo),
        reclamado: false,
        fecha_completado: cantidad >= clampInt(definicion.objetivo) ? new Date().toISOString() : null,
      },
      config.campoProgreso,
      row.id
    );

    if (resultado.creado) resumen[config.etiqueta].insertados += 1;
    if (resultado.actualizado) resumen[config.etiqueta].actualizados += 1;
    if (resultado.completadoAhora) {
      resumen[config.etiqueta].completados += 1;
      completadosAhora.push({
        id: definicion.id,
        claim_scope_id: row.id,
        tipo_mision: tipoMision,
        nombre: definicion.nombre,
      });
    }
  }

  return { resumen, completadosAhora };
}

async function registrarProgreso(req, res) {
  const { uuid, tipo, cantidad, servidor } = req.body || {};

  if (!uuid || !tipo || cantidad == null || !servidor) {
    return res.status(400).json({ error: "Faltan datos obligatorios." });
  }

  const cantidadReal = clampInt(cantidad);
  if (cantidadReal <= 0) {
    return res.status(400).json({ error: "Cantidad inválida." });
  }

  try {
    const vinculado = await existeUsuarioVinculado(uuid);
    if (!vinculado) {
      return res.status(200).json({ message: "Jugador no vinculado. Progreso ignorado." });
    }

    const payload = { [tipo]: cantidadReal };
    const permanentes = await aplicarProgresoLogros(uuid, servidor, payload);
    const diarias = await aplicarProgresoRotado(uuid, servidor, payload, "diaria");
    const semanales = await aplicarProgresoRotado(uuid, servidor, payload, "semanal");

    await registrarHistorialEvento(uuid, servidor, tipo, cantidadReal);

    return res.status(200).json({
      message: "Progreso actualizado.",
      resumen: {
        tipo_evento: tipo,
        cantidad_recibida: cantidadReal,
        ...permanentes.resumen,
        ...diarias.resumen,
        ...semanales.resumen,
      },
      completados: [
        ...permanentes.completadosAhora,
        ...diarias.completadosAhora,
        ...semanales.completadosAhora,
      ],
    });
  } catch (error) {
    console.error("[MISIONES PROGRESO ERROR]", error);
    return res.status(500).json({ error: "Error interno al registrar progreso." });
  }
}

async function registrarProgresoMultiple(req, res) {
  const { uuid, servidor, progresos } = req.body || {};

  if (!uuid || !servidor || !progresos || typeof progresos !== "object") {
    return res.status(400).json({ error: "Faltan datos obligatorios." });
  }

  const entradas = Object.entries(progresos)
    .map(([tipo, cantidad]) => [tipo, clampInt(cantidad)])
    .filter(([, cantidad]) => cantidad > 0);

  if (!entradas.length) {
    return res.status(400).json({ error: "No hay progresos válidos." });
  }

  try {
    const vinculado = await existeUsuarioVinculado(uuid);
    if (!vinculado) {
      return res.status(200).json({ message: "Jugador no vinculado. Progreso ignorado." });
    }

    const payload = Object.fromEntries(entradas);
    const permanentes = await aplicarProgresoLogros(uuid, servidor, payload);
    const diarias = await aplicarProgresoRotado(uuid, servidor, payload, "diaria");
    const semanales = await aplicarProgresoRotado(uuid, servidor, payload, "semanal");

    for (const [tipoEvento, cantidad] of entradas) {
      await registrarHistorialEvento(uuid, servidor, tipoEvento, cantidad);
    }

    return res.status(200).json({
      message: "Progresos múltiples actualizados.",
      resumen: {
        eventos: entradas.length,
        ...permanentes.resumen,
        ...diarias.resumen,
        ...semanales.resumen,
      },
      completados: [
        ...permanentes.completadosAhora,
        ...diarias.completadosAhora,
        ...semanales.completadosAhora,
      ],
    });
  } catch (error) {
    console.error("[MISIONES MULTIPLES ERROR]", error);
    return res.status(500).json({ error: "Error interno al registrar múltiples progresos." });
  }
}

async function obtenerLogrosJugador(req, res) {
  const uuid = req.params.uuid;
  const servidor = req.query.servidor || null;

  try {
    let query = db
      .from("logros")
      .select("id, codigo, nombre, descripcion, descripcion_objetivo, tipo_evento, objetivo, xp_otorgada, servidor, categoria, familia, orden, activa")
      .eq("activa", true)
      .order("categoria", { ascending: true })
      .order("orden", { ascending: true });

    if (servidor) {
      query = query.in("servidor", [servidor, "global"]);
    }

    const { data: logros, error } = await query;
    if (error) throw error;

    const progreso = await cargarProgresoLogros(
      uuid,
      (logros || []).map((item) => item.id)
    );

    const rows = (logros || []).map((item) =>
      normalizarMisionBase({
        ...item,
        ...(progreso.get(String(item.id)) || {}),
      })
    );

    return res.status(200).json(rows);
  } catch (error) {
    console.error("[LOGROS GET ERROR]", error);
    return res.status(500).json({ error: "Error al obtener logros." });
  }
}

async function obtenerMisionesDiariasJugador(req, res) {
  const uuid = req.params.uuid;
  const servidor = req.query.servidor || "survival";
  const hoy = hoyISO();

  try {
    const rotacion = await cargarRotacionActivaDiaria(servidor, hoy);
    const mapa = await cargarProgresoRotaciones(
      uuid,
      "misiones_diarias_progreso",
      "id_rotacion_diaria",
      rotacion.map((item) => item.id)
    );

    const misiones = rotacion.map((item) =>
      normalizarMisionRotada(item, "misiones_diarias", mapa.get(String(item.id)), "diaria")
    );

    const fechaInicio = rotacion[0]?.fecha_inicio || null;
    const fechaFin = rotacion[0]?.fecha_fin || null;

    return res.status(200).json({
      misiones,
      meta: {
        servidor,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
      },
    });
  } catch (error) {
    console.error("[DIARIAS GET ERROR]", error);
    return res.status(500).json({ error: "Error al obtener misiones diarias." });
  }
}

async function obtenerMisionesSemanalesJugador(req, res) {
  const uuid = req.params.uuid;
  const servidor = req.query.servidor || "survival";
  const hoy = hoyISO();

  try {
    const rotacion = await cargarRotacionActivaSemanal(servidor, hoy);
    const mapa = await cargarProgresoRotaciones(
      uuid,
      "misiones_semanales_progreso",
      "id_rotacion_semanal",
      rotacion.map((item) => item.id)
    );

    const misiones = rotacion.map((item) =>
      normalizarMisionRotada(item, "misiones_semanales", mapa.get(String(item.id)), "semanal")
    );

    const fechaInicio = rotacion[0]?.fecha_inicio || null;
    const fechaFin = rotacion[0]?.fecha_fin || null;

    return res.status(200).json({
      misiones,
      meta: {
        servidor,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
      },
    });
  } catch (error) {
    console.error("[SEMANALES GET ERROR]", error);
    return res.status(500).json({ error: "Error al obtener misiones semanales." });
  }
}

async function reclamarMision(req, res) {
  const uuid = req.usuario?.uuid || req.body?.uuid;
  const tipoMision = String(req.params.tipoMision || "").toLowerCase();
  const claimId = req.params.id;

  if (!uuid || !claimId || !["permanente", "diaria", "semanal"].includes(tipoMision)) {
    return res.status(400).json({ error: "Parámetros inválidos." });
  }

  try {
    let progreso = null;
    let xp = 0;
    let whereField = null;
    let progressTable = null;

    if (tipoMision === "permanente") {
      progressTable = "logros_progreso";
      whereField = "id_logro";

      const { data: row, error } = await db
        .from("logros_progreso")
        .select("id_logro, progreso_actual, objetivo_snapshot, completado, reclamado")
        .eq("uuid_jugador", uuid)
        .eq("id_logro", claimId)
        .maybeSingle();

      if (error) throw error;
      progreso = row;

      const { data: logro, error: logroError } = await db
        .from("logros")
        .select("xp_otorgada")
        .eq("id", claimId)
        .maybeSingle();

      if (logroError) throw logroError;
      xp = clampInt(logro?.xp_otorgada);
    }

    if (tipoMision === "diaria") {
      progressTable = "misiones_diarias_progreso";
      whereField = "id_rotacion_diaria";

      const { data: row, error } = await db
        .from("misiones_diarias_progreso")
        .select("id_rotacion_diaria, progreso_actual, objetivo_snapshot, completado, reclamado")
        .eq("uuid_jugador", uuid)
        .eq("id_rotacion_diaria", claimId)
        .maybeSingle();

      if (error) throw error;
      progreso = row;

      const { data: rotacion, error: rotacionError } = await db
        .from("misiones_diarias_rotacion")
        .select("misiones_diarias!inner(xp_otorgada)")
        .eq("id", claimId)
        .maybeSingle();

      if (rotacionError) throw rotacionError;
      xp = clampInt(rotacion?.misiones_diarias?.xp_otorgada);
    }

    if (tipoMision === "semanal") {
      progressTable = "misiones_semanales_progreso";
      whereField = "id_rotacion_semanal";

      const { data: row, error } = await db
        .from("misiones_semanales_progreso")
        .select("id_rotacion_semanal, progreso_actual, objetivo_snapshot, completado, reclamado")
        .eq("uuid_jugador", uuid)
        .eq("id_rotacion_semanal", claimId)
        .maybeSingle();

      if (error) throw error;
      progreso = row;

      const { data: rotacion, error: rotacionError } = await db
        .from("misiones_semanales_rotacion")
        .select("misiones_semanales!inner(xp_otorgada)")
        .eq("id", claimId)
        .maybeSingle();

      if (rotacionError) throw rotacionError;
      xp = clampInt(rotacion?.misiones_semanales?.xp_otorgada);
    }

    const objetivo = clampInt(progreso?.objetivo_snapshot);
    const progresoActual = clampInt(progreso?.progreso_actual);
    const completado = !!progreso?.completado || (objetivo > 0 && progresoActual >= objetivo);

    if (!progreso || !completado || progreso.reclamado) {
      return res.status(400).json({ error: "La misión no puede reclamarse." });
    }

    const usuario = await sumarXpUsuario(uuid, xp);

    const { error: updateError } = await db
      .from(progressTable)
      .update({
        reclamado: true,
        fecha_reclamado: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("uuid_jugador", uuid)
      .eq(whereField, claimId);

    if (updateError) throw updateError;

    return res.status(200).json({
      message: "Recompensa reclamada.",
      xp_otorgada: xp,
      xp_actual: usuario.xp_actual,
      nivel: usuario.nivel,
    });
  } catch (error) {
    console.error("[RECLAMAR MISION ERROR]", error);
    return res.status(500).json({ error: "Error interno al reclamar misión." });
  }
}

async function obtenerServidoresActivos() {
  const { data, error } = await db
    .from("servidores")
    .select("nombre")
    .eq("activo", true)
    .order("nombre", { ascending: true });

  if (error) throw error;
  return (data || []).map((item) => item.nombre);
}

async function cargarDefinicionesRotables(tabla, servidor) {
  const { data, error } = await db
    .from(tabla)
    .select("id, codigo, nombre, descripcion, descripcion_objetivo, tipo_evento, objetivo, xp_otorgada, servidor, categoria, familia, orden, activa, peso_rotacion, cooldown_rotaciones")
    .eq("servidor", servidor)
    .eq("activa", true)
    .order("orden", { ascending: true });

  if (error) throw error;
  return data || [];
}

async function cargarPoolEstado(tabla, servidor) {
  const { data, error } = await db
    .from(tabla)
    .select("id_mision, servidor, ultima_rotacion, veces_seleccionada, cooldown_restante")
    .eq("servidor", servidor);

  if (error) throw error;

  const mapa = new Map();
  for (const item of data || []) {
    mapa.set(String(item.id_mision), item);
  }
  return mapa;
}

function seleccionarMisiones(definiciones, estados, cantidadObjetivo) {
  const normalizadas = definiciones.map((item) => {
    const estado = estados.get(String(item.id));
    const cooldownActual = Math.max(0, clampInt(estado?.cooldown_restante) - 1);

    return {
      ...item,
      cooldown_actual: cooldownActual,
      veces_seleccionada: clampInt(estado?.veces_seleccionada),
    };
  });

  const favoritas = normalizadas.filter((item) => item.cooldown_actual === 0);
  const seleccionadas = [];
  const familias = new Set();
  const tipos = new Set();

  const intentarRonda = (fuente, exigirFamilia = true, exigirTipo = true) => {
    let candidatas = fuente.filter((item) => !seleccionadas.some((pick) => pick.id === item.id));

    if (exigirFamilia) candidatas = candidatas.filter((item) => !familias.has(item.familia));
    if (exigirTipo) candidatas = candidatas.filter((item) => !tipos.has(item.tipo_evento));

    while (candidatas.length && seleccionadas.length < cantidadObjetivo) {
      const pick = elegirPonderado(candidatas);
      seleccionadas.push(pick);
      familias.add(pick.familia);
      tipos.add(pick.tipo_evento);

      candidatas = candidatas.filter((item) => item.id !== pick.id);
      if (exigirFamilia) candidatas = candidatas.filter((item) => !familias.has(item.familia));
      if (exigirTipo) candidatas = candidatas.filter((item) => !tipos.has(item.tipo_evento));
    }
  };

  intentarRonda(favoritas, true, true);
  if (seleccionadas.length < cantidadObjetivo) intentarRonda(favoritas, false, true);
  if (seleccionadas.length < cantidadObjetivo) intentarRonda(favoritas, false, false);
  if (seleccionadas.length < cantidadObjetivo) intentarRonda(normalizadas, false, false);

  return seleccionadas.slice(0, cantidadObjetivo);
}

async function actualizarPoolEstado(tabla, servidor, definiciones, estados, seleccionadas, fechaInicio) {
  const seleccionIds = new Set(seleccionadas.map((item) => String(item.id)));
  const cambios = [];

  for (const item of definiciones) {
    const previo = estados.get(String(item.id));
    const cooldownBase = Math.max(0, clampInt(previo?.cooldown_restante) - 1);

    if (seleccionIds.has(String(item.id))) {
      cambios.push({
        id_mision: item.id,
        servidor,
        ultima_rotacion: fechaInicio,
        veces_seleccionada: clampInt(previo?.veces_seleccionada) + 1,
        cooldown_restante: Math.max(0, clampInt(item.cooldown_rotaciones)),
        updated_at: new Date().toISOString(),
      });
    } else if (previo) {
      cambios.push({
        id_mision: item.id,
        servidor,
        ultima_rotacion: previo.ultima_rotacion,
        veces_seleccionada: clampInt(previo.veces_seleccionada),
        cooldown_restante: cooldownBase,
        updated_at: new Date().toISOString(),
      });
    }
  }

  if (!cambios.length) return;

  const { error } = await db.from(tabla).upsert(cambios, { onConflict: "id_mision,servidor" });
  if (error) throw error;
}

async function desactivarRotacionesPasadas(tabla, servidor, fechaInicio) {
  const { error } = await db
    .from(tabla)
    .update({ activa: false })
    .eq("servidor", servidor)
    .lt("fecha_fin", fechaInicio)
    .eq("activa", true);

  if (error) throw error;
}

async function existeRotacionActual(tabla, servidor, fechaInicio, fechaFin) {
  const { count, error } = await db
    .from(tabla)
    .select("id", { count: "exact", head: true })
    .eq("servidor", servidor)
    .eq("fecha_inicio", fechaInicio)
    .eq("fecha_fin", fechaFin);

  if (error) throw error;
  return (count || 0) > 0;
}

async function crearRotacion(tablaRotacion, servidor, fechaInicio, fechaFin, seleccionadas) {
  const lote = generarUuid();
  const payload = seleccionadas.map((item, index) => ({
    id: generarUuid(),
    id_mision: item.id,
    servidor,
    fecha_inicio: fechaInicio,
    fecha_fin: fechaFin,
    orden_rotacion: index + 1,
    lote_rotacion: lote,
    activa: true,
  }));

  if (!payload.length) return [];

  const { data, error } = await db
    .from(tablaRotacion)
    .insert(payload)
    .select("id, id_mision, lote_rotacion, fecha_inicio, fecha_fin, orden_rotacion");

  if (error) throw error;
  return data || [];
}

async function rotarTabla(config, fechaInicio, fechaFin, cantidadObjetivo) {
  const servidores = await obtenerServidoresActivos();

  for (const servidor of servidores) {
    const yaExiste = await existeRotacionActual(config.tablaRotacion, servidor, fechaInicio, fechaFin);
    if (yaExiste) continue;

    const definiciones = await cargarDefinicionesRotables(config.tablaDef, servidor);
    const estados = await cargarPoolEstado(config.tablaPool, servidor);
    const seleccionadas = seleccionarMisiones(definiciones, estados, Math.min(cantidadObjetivo, definiciones.length));

    await desactivarRotacionesPasadas(config.tablaRotacion, servidor, fechaInicio);
    await crearRotacion(config.tablaRotacion, servidor, fechaInicio, fechaFin, seleccionadas);
    await actualizarPoolEstado(config.tablaPool, servidor, definiciones, estados, seleccionadas, fechaInicio);
  }
}

async function rotarMisionesDiarias(req, res) {
  try {
    const inicio = hoyISO();
    const fin = inicio;

    await rotarTabla(
      {
        tablaDef: "misiones_diarias",
        tablaRotacion: "misiones_diarias_rotacion",
        tablaPool: "misiones_diarias_pool_estado",
      },
      inicio,
      fin,
      DAILY_MISSIONS_PER_SERVER
    );

    return res.status(200).json({ message: "Misiones diarias rotadas correctamente." });
  } catch (error) {
    console.error("[ROTAR DIARIAS ERROR]", error);
    return res.status(500).json({ error: "Error interno al rotar misiones diarias." });
  }
}

async function rotarMisionesSemanales(req, res) {
  try {
    const inicio = inicioDeSemanaISO();
    const fin = finDeSemanaISO(inicio);

    await rotarTabla(
      {
        tablaDef: "misiones_semanales",
        tablaRotacion: "misiones_semanales_rotacion",
        tablaPool: "misiones_semanales_pool_estado",
      },
      inicio,
      fin,
      WEEKLY_MISSIONS_PER_SERVER
    );

    return res.status(200).json({ message: "Misiones semanales rotadas correctamente." });
  } catch (error) {
    console.error("[ROTAR SEMANALES ERROR]", error);
    return res.status(500).json({ error: "Error interno al rotar misiones semanales." });
  }
}

module.exports = {
  registrarProgreso,
  registrarProgresoMultiple,
  obtenerLogrosJugador,
  obtenerMisionesDiariasJugador,
  obtenerMisionesSemanalesJugador,
  reclamarMision,
  rotarMisionesDiarias,
  rotarMisionesSemanales,
};