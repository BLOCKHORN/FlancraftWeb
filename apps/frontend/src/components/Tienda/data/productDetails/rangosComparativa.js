// src/components/Tienda/data/rangosComparativa.js

/**
 * Estructura:
 * RANGOS_COMPARATIVA[mode][server] = [
 *   { key, label, values: { nova, alpha, inmortal }, hint? }
 * ]
 *
 * values puede ser:
 * - boolean (check/cross)
 * - string/number
 * - array (se renderiza compacto)
 * - object action: { kind:'kit'|'cmds', id, rank, label }
 *
 * RANGOS_MODAL: contenido de modales para kits y comandos
 */

const A = (kind, id, rank, label) => ({ kind, id, rank, label });

export const RANGOS_MODAL = {
  kits: {
    nova: {
      title: "Kit NOVA",
      subtitle: "Disponible en Survival Clásico y OneBlock",
      cooldown: "Cada 6 horas",
      armor: [
        {
          slot: "helmet",
          name: "Casco de diamante Nova",
          ench: ["Protección IV", "Irrompibilidad III", "Se liga al obtenerlo"],
        },
        {
          slot: "chest",
          name: "Pechera de diamante Nova",
          ench: ["Protección IV", "Irrompibilidad III", "Se liga al obtenerlo"],
          extra: ["Al equiparla en el pecho:", "+8 Armadura", "+2 Dureza de armadura"],
        },
        {
          slot: "legs",
          name: "Pantalones de diamante Nova",
          ench: ["Protección IV", "Irrompibilidad III", "Se liga al obtenerlo"],
        },
        {
          slot: "boots",
          name: "Botas de diamante Nova",
          ench: ["Protección IV", "Irrompibilidad III", "Se liga al obtenerlo"],
        },
      ],
      tools: [
        {
          slot: "sword",
          name: "Espada Nova",
          ench: ["Filo IV", "Irrompibilidad III", "Se liga al obtenerlo"],
          extra: ["En mano principal:", "7 de daño de ataque", "1.6 de velocidad de ataque"],
        },
        {
          slot: "pickaxe",
          name: "Pico Nova",
          ench: ["Eficiencia IV", "Irrompibilidad III", "Se liga al obtenerlo"],
          extra: [
            "En mano principal:",
            "5 de daño de ataque",
            "1.2 de velocidad de ataque",
            "+17 Eficiencia de minado",
          ],
        },
        { slot: "axe", name: "Hacha Nova", ench: ["Eficiencia IV", "Irrompibilidad III", "Se liga al obtenerlo"] },
        { slot: "shovel", name: "Pala Nova", ench: ["Eficiencia IV", "Irrompibilidad III", "Se liga al obtenerlo"] },
      ],
      resources: [
        "Lingotes de hierro x24",
        "Troncos de madera x64",
        "Lingotes de oro x12",
        "Esmeraldas x2",
        "Filetes x64",
        "Diamantes x3",
      ],
    },

    alpha: {
      title: "Kit ALPHA",
      subtitle: "Disponible en Survival Clásico y OneBlock",
      cooldown: "Cada 6 horas",
      armor: [
        {
          slot: "helmet",
          name: "Casco de netherite Alpha",
          ench: ["Protección III", "Irrompibilidad III", "Se liga al obtenerlo"],
          extra: [
            "Al equiparlo en la cabeza:",
            "+3 Armadura",
            "+3 Dureza de armadura",
            "+1 Resistencia al retroceso",
          ],
        },
        { slot: "chest", name: "Pechera de netherite Alpha", ench: ["Protección III", "Irrompibilidad III", "Se liga al obtenerlo"] },
        { slot: "legs", name: "Pantalones de netherite Alpha", ench: ["Protección III", "Irrompibilidad III", "Se liga al obtenerlo"] },
        { slot: "boots", name: "Botas de netherite Alpha", ench: ["Protección III", "Irrompibilidad III", "Se liga al obtenerlo"] },
      ],
      tools: [
        {
          slot: "sword",
          name: "Espada de diamante Alpha",
          ench: ["Filo V", "Irrompibilidad III", "Se liga al obtenerlo"],
          extra: ["En mano principal:", "7 de daño de ataque", "1.6 de velocidad de ataque"],
        },
        {
          slot: "axe",
          name: "Hacha de diamante Alpha",
          ench: ["Eficiencia V", "Irrompibilidad III", "Se liga al obtenerlo"],
          extra: ["En mano principal:", "9 de daño de ataque", "1 de velocidad de ataque", "+26 Eficiencia de minado"],
        },
        { slot: "pickaxe", name: "Pico de diamante Alpha", ench: ["Eficiencia V", "Irrompibilidad III", "Se liga al obtenerlo"] },
        { slot: "shovel", name: "Pala de diamante Alpha", ench: ["Eficiencia V", "Irrompibilidad III", "Se liga al obtenerlo"] },
      ],
      resources: [
        "Troncos de madera x64",
        "Lingotes de hierro x32",
        "Lingotes de oro x24",
        "Filetes x64",
        "Esmeraldas x2",
        "Diamantes x6",
      ],
    },

    inmortal: {
      title: "Kit INMORTAL",
      subtitle: "Disponible en Survival Clásico y OneBlock",
      cooldown: "Cada 6 horas",
      armor: [
        {
          slot: "helmet",
          name: "Casco de netherite Inmortal",
          ench: ["Protección IV", "Irrompibilidad III", "Se liga al obtenerlo"],
          extra: [
            "Al equiparlo en la cabeza:",
            "+3 Armadura",
            "+3 Dureza de armadura",
            "+1 Resistencia al retroceso",
          ],
        },
        {
          slot: "chest",
          name: "Pechera de netherite Inmortal",
          ench: ["Protección IV", "Irrompibilidad III", "Se liga al obtenerlo"],
          extra: ["Al equiparla en el pecho:", "+8 Armadura", "+3 Dureza de armadura", "+1 Resistencia al retroceso"],
        },
        {
          slot: "legs",
          name: "Pantalones de netherite Inmortal",
          ench: ["Protección IV", "Irrompibilidad III", "Se liga al obtenerlo"],
          extra: ["Al equiparlos:", "+6 Armadura", "+3 Dureza de armadura", "+1 Resistencia al retroceso"],
        },
        {
          slot: "boots",
          name: "Botas de netherite Inmortal",
          ench: ["Protección IV", "Irrompibilidad III", "Se liga al obtenerlo"],
          extra: ["Al equiparlas:", "+3 Armadura", "+3 Dureza de armadura", "+1 Resistencia al retroceso"],
        },
      ],
      tools: [
        {
          slot: "sword",
          name: "Espada de netherite Inmortal",
          ench: ["Filo IV", "Irrompibilidad III", "Se liga al obtenerlo"],
          extra: ["En mano principal:", "8 de daño de ataque", "1.6 de velocidad de ataque"],
        },
        {
          slot: "axe",
          name: "Hacha de netherite Inmortal",
          ench: ["Eficiencia IV", "Irrompibilidad III", "Se liga al obtenerlo"],
          extra: ["En mano principal:", "10 de daño de ataque", "1 de velocidad de ataque", "+17 Eficiencia de minado"],
        },
        { slot: "pickaxe", name: "Pico de netherite Inmortal", ench: ["Eficiencia IV", "Irrompibilidad III", "Se liga al obtenerlo"] },
        { slot: "shovel", name: "Pala de netherite Inmortal", ench: ["Eficiencia IV", "Irrompibilidad III", "Se liga al obtenerlo"] },
      ],
      resources: [
        "Bloques de hierro x16",
        "Troncos de madera x64",
        "Troncos de madera x64",
        "Manzanas doradas encantadas x2",
        "Diamantes x16",
        "Filetes x64",
        "Bloques de oro x8",
        "Esmeraldas x8",
      ],
    },
  },

  cmds: {
    lobby: {
      nova: [],
      alpha: [],
      inmortal: [],
    },

    chunklock: {
      nova: [
        "/back — Vuelve a tu última posición",
        "/compass — Muestra hacia dónde estás mirando",
        "/disposal o /trash — Basura portátil",
        "/loom — Abre el telar",
        "/hat — Coloca cualquier objeto en tu cabeza",
        "/smithtable — Abre la mesa de herrería",
        "/near (30s cooldown) — Muestra jugadores cercanos",
      ],
      alpha: [
        "/repair (30s cooldown) — Repara el objeto en tu mano",
        "/feed (5min cooldown) — Rellena tu barra de comida",
        "/workbench o /craft — Abre la mesa de crafteo",
        "/stonecutter — Abre el cortapiedras",
        "/enderchest — Accede a tu cofre del End",
        "/condense — Convierte minerales en bloques automáticamente",
      ],
      inmortal: [
        "/heal (5min cooldown) — Cura toda tu vida",
        "/repairall (30s cooldown) — Repara todo tu inventario",
        "/fly — Habilita el vuelo",
        "/anvil — Abre el yunque",
        "/kittycannon (3min cooldown) — Lanza gatos explosivos",
      ],
    },

    survival: {
      nova: [
        "/back — Vuelve a tu última posición",
        "/compass — Muestra hacia dónde estás mirando",
        "/disposal o /trash — Basura portátil",
        "/loom — Abre el telar",
        "/tpahere — Envía una solicitud de teleportación hacia ti",
        "/hat — Coloca cualquier objeto en tu cabeza",
        "/smithtable — Abre la mesa de herrería",
        "/near (30s cooldown) — Muestra jugadores cercanos",
      ],
      alpha: [
        "/repair (30s cooldown) — Repara el objeto en tu mano",
        "/feed (5min cooldown) — Rellena tu barra de comida",
        "/workbench o /craft — Abre la mesa de crafteo",
        "/stonecutter — Abre el cortapiedras",
        "/enderchest — Accede a tu cofre del End",
        "/condense — Convierte minerales en bloques automáticamente",
        "/vision — Activa o desactiva la visión nocturna",
      ],
      inmortal: [
        "/heal (5min cooldown) — Cura toda tu vida",
        "/repairall (30s cooldown) — Repara todo tu inventario",
        "/fly — Habilita el vuelo",
        "/anvil — Abre el yunque",
        "/kittycannon (3min cooldown) — Lanza gatos explosivos",
        "/respirar — Permite respirar bajo el agua",
        "/canal o /canalizador — Visión submarina",
      ],
    },

    oneblock: {
      nova: [
        "/back — Vuelve a tu última posición",
        "/compass — Muestra hacia dónde estás mirando",
        "/disposal o /trash — Basura portátil",
        "/loom — Abre el telar",
        "/tpahere — Envía una solicitud de teleportación hacia ti",
        "/hat — Coloca cualquier objeto en tu cabeza",
        "/smithtable — Abre la mesa de herrería",
        "/near (30s cooldown) — Muestra jugadores cercanos",
      ],
      alpha: [
        "/repair (30s cooldown) — Repara el objeto en tu mano",
        "/feed (5min cooldown) — Rellena tu barra de comida",
        "/workbench o /craft — Abre la mesa de crafteo",
        "/stonecutter — Abre el cortapiedras",
        "/enderchest — Accede a tu cofre del End",
        "/condense — Convierte minerales en bloques automáticamente",
        "/vision — Activa o desactiva la visión nocturna",
      ],
      inmortal: [
        "/heal (5min cooldown) — Cura toda tu vida",
        "/repairall (30s cooldown) — Repara todo tu inventario",
        "/fly — Habilita el vuelo",
        "/anvil — Abre el yunque",
        "/kittycannon (3min cooldown) — Lanza gatos explosivos",
        "/respirar — Permite respirar bajo el agua",
        "/canal o /canalizador — Visión submarina",
      ],
    },

    hardcore: {
      nova: ["/afk", "/compass", "/feed", "/hat"],
      alpha: ["/afk", "/compass", "/feed", "/hat"],
      inmortal: ["/afk", "/compass", "/feed", "/hat"],
    },

    anarq: {
      nova: ["/dupe — Multiplica x6 el item en tu mano"],
      alpha: ["/dupe — Multiplica x8 el item en tu mano"],
      inmortal: ["/dupe — Multiplica x10 el item en tu mano"],
    },
  },
};

export const RANGOS_COMPARATIVA = {
  "30d": {
    lobby: [
      {
        key: "prefijo",
        label: "Prefijo en chat y TAB",
        values: { nova: true, alpha: true, inmortal: true },
      },
      {
        key: "hereda",
        label: "Acceso a beneficios de rangos anteriores",
        values: { nova: false, alpha: true, inmortal: true },
        hint: "Los rangos superiores incluyen perks acumulados.",
      },
      {
        key: "full",
        label: "Acceso con servidor lleno",
        values: { nova: true, alpha: true, inmortal: true },
      },
    ],

    chunklock: [
      {
        key: "prefijo",
        label: "Prefijo en chat y TAB",
        values: { nova: true, alpha: true, inmortal: true },
      },
      {
        key: "hereda",
        label: "Acceso a beneficios de rangos anteriores",
        values: { nova: false, alpha: true, inmortal: true },
      },
      {
        key: "full",
        label: "Acceso con servidor lleno",
        values: { nova: true, alpha: true, inmortal: true },
      },
      {
        key: "jobs",
        label: "Trabajos simultáneos",
        values: { nova: 4, alpha: 5, inmortal: 6 },
      },
      {
        key: "homes",
        label: "Puntos de inicio (sethome)",
        values: { nova: 10, alpha: 10, inmortal: 50 },
        hint: "Si ajustas esto en tu config real, cámbialo aquí (Alpha hereda Nova).",
      },
      {
        key: "money",
        label: "Dinero del servidor",
        values: { nova: "5.000 $", alpha: "15.000 $", inmortal: "20.000 $" },
      },
      {
        key: "spawner",
        label: "Cambiar mob del spawner con Huevo de Mob",
        values: { nova: false, alpha: false, inmortal: true },
      },
      {
        key: "afkauto",
        label: "Modo automático de AFK",
        values: { nova: false, alpha: false, inmortal: true },
      },
      {
        key: "cmds",
        label: "Comandos del rango",
        values: {
          nova: A("cmds", "chunklock", "nova", "Ver comandos"),
          alpha: A("cmds", "chunklock", "alpha", "Ver comandos"),
          inmortal: A("cmds", "chunklock", "inmortal", "Ver comandos"),
        },
      },
    ],

    survival: [
      {
        key: "prefijo",
        label: "Prefijo en chat y TAB",
        values: { nova: true, alpha: true, inmortal: true },
      },
      {
        key: "hereda",
        label: "Acceso a beneficios de rangos anteriores",
        values: { nova: false, alpha: true, inmortal: true },
      },
      {
        key: "full",
        label: "Acceso con servidor lleno",
        values: { nova: true, alpha: true, inmortal: true },
      },
      {
        key: "jobs",
        label: "Trabajos simultáneos",
        values: { nova: 4, alpha: 5, inmortal: 6 },
      },
      {
        key: "homes",
        label: "Puntos de inicio (sethome)",
        values: { nova: 10, alpha: 10, inmortal: 50 },
      },
      {
        key: "money",
        label: "Dinero del servidor",
        values: { nova: "5.000 $", alpha: "15.000 $", inmortal: "20.000 $" },
      },
      {
        key: "kit_cd",
        label: "Kit del rango",
        values: {
          nova: A("kit", "nova", "nova", "Abrir armory"),
          alpha: A("kit", "alpha", "alpha", "Abrir armory"),
          inmortal: A("kit", "inmortal", "inmortal", "Abrir armory"),
        },
        hint: "Se abre en un modal tipo armory (no en texto largo).",
      },
      {
        key: "cmds",
        label: "Comandos del rango",
        values: {
          nova: A("cmds", "survival", "nova", "Ver comandos"),
          alpha: A("cmds", "survival", "alpha", "Ver comandos"),
          inmortal: A("cmds", "survival", "inmortal", "Ver comandos"),
        },
      },
    ],

    oneblock: [
      {
        key: "prefijo",
        label: "Prefijo en chat y TAB",
        values: { nova: true, alpha: true, inmortal: true },
      },
      {
        key: "hereda",
        label: "Acceso a beneficios de rangos anteriores",
        values: { nova: false, alpha: true, inmortal: true },
      },
      {
        key: "full",
        label: "Acceso con servidor lleno",
        values: { nova: true, alpha: true, inmortal: true },
      },
      {
        key: "subastas",
        label: "Subastas máximas",
        values: { nova: 30, alpha: 40, inmortal: 45 },
      },
      {
        key: "warps",
        label: "Warps personales",
        values: { nova: 15, alpha: 20, inmortal: 20 },
        hint: "Inmortal no lo indica explícito, aquí está por herencia (ajústalo si aplica).",
      },
      {
        key: "shops",
        label: "Tiendas personales",
        values: { nova: 20, alpha: 30, inmortal: 30 },
        hint: "Inmortal no lo indica explícito, aquí está por herencia (ajústalo si aplica).",
      },
      {
        key: "homes",
        label: "Puntos de inicio (sethome)",
        values: { nova: 10, alpha: 20, inmortal: 50 },
      },
      {
        key: "money",
        label: "Dinero del servidor",
        values: { nova: "50.000 $", alpha: "110.000 $", inmortal: "—" },
        hint: "Inmortal (OneBlock) no trae cifra en tu texto. Si existe, ponla aquí.",
      },
      {
        key: "keys_basic",
        label: "Keys Básica",
        values: { nova: 8, alpha: 20, inmortal: "—" },
        hint: "Inmortal (OneBlock) no indica keys en tu texto.",
      },
      {
        key: "keys_epic",
        label: "Keys Épica",
        values: { nova: 3, alpha: 8, inmortal: "—" },
      },
      {
        key: "spawner",
        label: "Cambiar mob del spawner con Huevo de Mob",
        values: { nova: false, alpha: true, inmortal: true },
      },
      {
        key: "kit_cd",
        label: "Kit del rango",
        values: {
          nova: A("kit", "nova", "nova", "Abrir armory"),
          alpha: A("kit", "alpha", "alpha", "Abrir armory"),
          inmortal: A("kit", "inmortal", "inmortal", "Abrir armory"),
        },
      },
      {
        key: "cmds",
        label: "Comandos del rango",
        values: {
          nova: A("cmds", "oneblock", "nova", "Ver comandos"),
          alpha: A("cmds", "oneblock", "alpha", "Ver comandos"),
          inmortal: A("cmds", "oneblock", "inmortal", "Ver comandos"),
        },
      },
    ],

    hardcore: [
      {
        key: "prefijo",
        label: "Prefijo en chat y TAB",
        values: { nova: true, alpha: true, inmortal: true },
      },
      {
        key: "hereda",
        label: "Acceso a beneficios de rangos anteriores",
        values: { nova: false, alpha: true, inmortal: true },
      },
      {
        key: "full",
        label: "Acceso con servidor lleno",
        values: { nova: true, alpha: true, inmortal: true },
      },
      {
        key: "cmds",
        label: "Comandos disponibles",
        values: {
          nova: A("cmds", "hardcore", "nova", "Ver comandos"),
          alpha: A("cmds", "hardcore", "alpha", "Ver comandos"),
          inmortal: A("cmds", "hardcore", "inmortal", "Ver comandos"),
        },
      },
    ],

    anarq: [
      {
        key: "prefijo",
        label: "Prefijo en chat y TAB",
        values: { nova: true, alpha: true, inmortal: true },
      },
      {
        key: "hereda",
        label: "Acceso a beneficios de rangos anteriores",
        values: { nova: false, alpha: true, inmortal: true },
      },
      {
        key: "full",
        label: "Acceso con servidor lleno",
        values: { nova: true, alpha: true, inmortal: true },
      },
      {
        key: "dupe",
        label: "Duplicación (/dupe)",
        values: { nova: "x6", alpha: "x8", inmortal: "x10" },
      },
      {
        key: "cmds",
        label: "Comando del rango",
        values: {
          nova: A("cmds", "anarq", "nova", "Ver detalle"),
          alpha: A("cmds", "anarq", "alpha", "Ver detalle"),
          inmortal: A("cmds", "anarq", "inmortal", "Ver detalle"),
        },
      },
    ],
  },

  // perma: lo dejamos preparado (si aún no tienes datos, lo puedes clonar luego)
  perma: {
    lobby: [],
    chunklock: [],
    survival: [],
    oneblock: [],
    hardcore: [],
    anarq: [],
  },
};
