// apps/frontend/src/components/Rangos/dataRangos.js

// Orden en el que se muestran los rangos (columnas)
export const RANGOS_ORDENADOS = ["nova", "alpha", "inmortal"];

// Filas de la tabla de comparación
export const FILAS = [
  { clave: "prefijo", label: "Prefijo en chat y TAB" },
  { clave: "acceso_lleno", label: "Acceso cuando el servidor está lleno" },
  { clave: "trabajos", label: "Trabajos simultáneos" },
  { clave: "dinero", label: "Dinero del servidor" },
  { clave: "kit_cooldown", label: "Cooldown del kit" },
  { clave: "subastas", label: "Subastas permitidas" },
  { clave: "warps", label: "Warps personales" },
  { clave: "tiendas", label: "Tiendas personales" },
  { clave: "sethomes", label: "Puntos de /sethome" },
  { clave: "keys_survival", label: "Keys Survival (Voto / Leg / Mítica)" },
  { clave: "keys_oneblock", label: "Keys OneBlock (Básica / Épica / Leg)" },
  { clave: "materiales", label: "Materiales especiales" },
  { clave: "kit", label: "Kit de armadura & herramientas" },
  { clave: "comida", label: "Comida incluida" },
  { clave: "cambiar_spawner", label: "Cambiar mob del spawner" },
  {
    clave: "comandos_basicos",
    label: "Comandos básicos (/afk, /back, /feed...)",
  },
  {
    clave: "comandos_extra",
    label: "Comandos extra (/repair, /workbench, /enderchest...)",
  },
  {
    clave: "comandos_avanzados",
    label: "Comandos avanzados (/fly, /heal, /repairall...)",
  },
  { clave: "dupe", label: "Multiplicador /dupe" },
];

// Datos de los rangos
export const RANGOS = [
  // -------------------------------------------------
  // NOVA 30 DÍAS
  // -------------------------------------------------
  {
    id: "nova",
    tipo: "30d",
    nombre: "NOVA",
    imagen: "/assets/rangos/nova.webp",

    meta: {
      titulo: "NOVA 30 Días",
      duracion: "1 Mes",
      autoRenovacion: true,
      precioUSD: 2.75,
      descripcionCorta:
        "Rango inicial premium con acceso cuando el servidor está lleno, 4 trabajos, más homes y un kit completo de diamante.",
      notas: [
        "📆 Duración: 1 mes.",
        "🔁 Este paquete se renovará automáticamente cada 30 días (solo si eliges la opción de suscripción).",
        "🔗 Para cancelar la suscripción, hazlo desde la tienda.",
        "Debes disponer de espacio en el inventario y estar conectado al servidor para recibir el paquete.",
        "Esta compra es de un único uso: si pierdes la protección o los objetos, no se volverán a entregar.",
        "FlanCraft no está afiliado con Mojang AB ni debe considerarse respaldado por Mojang AB.",
      ],
    },

    // Beneficios resumidos para la tabla de comparación
    beneficios_30d: {
      // Accesos
      prefijo: true,
      acceso_lleno: true,

      // Progresión
      trabajos: 4, // Acceso a tener 4 trabajos al mismo tiempo
      subastas: 30, // Podrás añadir hasta 30 Subastas
      warps: 15, // Podrás añadir hasta 15 Warps Personales
      tiendas: 20, // Acceso a crear hasta 20 Tiendas Personales
      sethomes: 10, // Establece hasta 10 puntos de inicio (sethome)

      // Economía
      // En el HTML hay x5.000 y luego x50.000; se toma el valor final (50.000 $)
      dinero: "50.000 $",
      keys_survival: "8 Voto / 3 Legendaria / 0 Mítica",
      keys_oneblock: "8 Básica / 3 Épica / 0 Legendaria",
      materiales: true,

      // Kit & comida
      kit: "Diamante encantado",
      comida: "16 Zanahorias Doradas",
      kit_cooldown: "6h",

      // Sistemas extra
      cambiar_spawner: false,

      // Comandos (agrupados)
      comandos_basicos: true, // /afk, /back, /feed, /hat…
      comandos_extra: true, // /disposal, /loom, /smithtable, /near, /tpahere…
      comandos_avanzados: false,

      // Dupe
      dupe: "x6",
    },

    // Imágenes relevantes del modal NOVA (adaptadas a ModalNovaDetalle)
    imagenes: {
      // Icono del prefijo NOVA
      prefijo:
        "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/4e8cee61a009cdc018aec05c200032ead64e0098.png",

      // Check dorado que se usa en todos los bullets
      check:
        "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1017961/bff0f71f471bacf2e7be369dac44ebee7edd8fa2.png",

      // 1er banner: 158e00...
      bannerDuracion1:
        "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/158e00eb0695d0f283aa45b85921365a539e0016.png",

      // 2º bloque de banner de duración: f041ac...
      bannerDuracion2:
        "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/f041acb0ce25a5ba83dc8057bae74a75e43218d4.png",

      // Logos / cabeceras del kit NOVA
      logo1:
        "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/f70d275ebc3b3adf9f3a17efb9ad1c98410340d0.png",
      logo2:
        "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/b8240eff1d73b6495dc2b281bf023eb89e16ccea.png",

      // Imágenes grandes del kit
      logo3:
        "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/5eef21b50deeb7ad98916ea344f46dedb7428b86.png",
      logo4:
        "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/9af3397a1a76237cc99d58d35e050ff81c9e3c74.png",

      // Banner de comandos con color (539a37…)
      comandosColorBanner:
        "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/539a379082120787e5261329ad578e435837a1a7.png",

      // Banner de AFK / comandos básicos (627d52…)
      afkBanner:
        "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/627d52c34624dd7f384c12412a33677edd28b545.png",

      // Banner de /dupe (a7607d…)
      dupeBanner:
        "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/a7607d4fd694f11bfac9f6d285bbfd13c36743d4.png",

      // Imagen del bloque de materiales especiales
      materiales:
        "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/ca699e98b122732957a1eebc9cbe8d71acd2907a.png",

      // ---- Claves "genéricas" para el modal estándar (por compatibilidad) ----
      topBanner:
        "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/158e00eb0695d0f283aa45b85921365a539e0016.png",
      secciones: [
        "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/f041acb0ce25a5ba83dc8057bae74a75e43218d4.png",
        "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/539a379082120787e5261329ad578e435837a1a7.png",
        "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/627d52c34624dd7f384c12412a33677edd28b545.png",
        "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/a7607d4fd694f11bfac9f6d285bbfd13c36743d4.png",
      ],
      kitLogos: [
        "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/f70d275ebc3b3adf9f3a17efb9ad1c98410340d0.png",
        "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/b8240eff1d73b6495dc2b281bf023eb89e16ccea.png",
      ],
      kitItems: [
        "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/5eef21b50deeb7ad98916ea344f46dedb7428b86.png",
        "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/9af3397a1a76237cc99d58d35e050ff81c9e3c74.png",
      ],
    },

    // Detalle exacto del kit (coincidiendo con el HTML de la tienda)
    kit_detallado: [
      "Casco de Diamante (Respiración 3, Protección 3, Irrompibilidad 3, Reparación 1)",
      "Pechera de Diamante (Protección 3, Irrompibilidad 3, Reparación 1)",
      "Pantalones de Diamante (Protección 3, Irrompibilidad 3, Reparación 1)",
      "Botas de Diamante (Protección 3, Irrompibilidad 3, Reparación 1)",
      "Espada de Diamante (Filo 3, Botín 3, Irrompibilidad 3, Reparación 1)",
      "Pico de Diamante (Eficiencia 2, Fortuna 2, Irrompibilidad 2, Reparación 2)",
      "Hacha de Diamante (Eficiencia 2, Irrompibilidad 2, Reparación 1)",
      "Pala de Diamante (Eficiencia 2, Irrompibilidad 2, Reparación 1)",
      "Azada de Diamante (Eficiencia 2, Irrompibilidad 2, Reparación 1)",
      "16 Zanahorias Doradas",
    ],

    // Comandos detallados (coincidiendo con la lista del HTML real)
    comandos_detallados: [
      { comando: "/back", descripcion: "Vuelve a tu última posición.", cooldown: null },
      {
        comando: "/compass",
        descripcion: "Muestra hacia dónde estás mirando.",
        cooldown: null,
      },
      {
        comando: "/disposal",
        alias: ["/trash"],
        descripcion: "Basura portátil.",
        cooldown: null,
      },
      { comando: "/loom", descripcion: "Abre el telar.", cooldown: null },
      {
        comando: "/tpahere",
        descripcion: "Envía una solicitud de teleportación hacia ti.",
        cooldown: null,
      },
      {
        comando: "/hat",
        descripcion: "Coloca cualquier objeto en tu cabeza.",
        cooldown: null,
      },
      {
        comando: "/smithtable",
        descripcion: "Abre la mesa de herrería.",
        cooldown: null,
      },
      {
        comando: "/near",
        descripcion: "Muestra jugadores cercanos.",
        cooldown: "30s",
      },
      { comando: "/afk", descripcion: "Marca tu estado como ausente.", cooldown: null },
      { comando: "/feed", descripcion: "Rellena tu barra de comida.", cooldown: null },
      {
        comando: "/dupe",
        descripcion: "Multiplica x6 el ítem que tengas en la mano.",
        cooldown: null,
      },
    ],
  },

  // -------------------------------------------------
  // ALPHA 30 DÍAS
  // -------------------------------------------------
  {
    id: "alpha",
    tipo: "30d",
    nombre: "ALPHA",
    imagen: "/assets/rangos/alpha.webp",

    meta: {
      titulo: "ALPHA 30 Días",
      duracion: "1 Mes",
      autoRenovacion: true,
      precioUSD: 3.85,
      descripcionCorta:
        "Rango intermedio con más trabajos, más tiendas, acceso a cambiar spawners y un kit full Netherita ALPHA.",
      notas: [
        "📆 Duración: 1 mes.",
        "🔁 Renovación automática cada 30 días si eliges la opción de suscripción.",
        "Para cancelar la suscripción, hazlo desde la tienda.",
        "Debes estar conectado y con espacio disponible en el inventario para recibir el paquete.",
        "Compra de único uso. Si pierdes la protección o el kit, no se volverá a entregar.",
        "FlanCraft no está afiliado con Mojang AB ni debe considerarse respaldado por Mojang AB.",
      ],
    },

    beneficios_30d: {
      // Accesos
      prefijo: true,
      acceso_lleno: true,

      // Progresión
      trabajos: 5,
      subastas: 40,
      warps: 20,
      tiendas: 30,
      sethomes: 20,

      // Extras
      cambiar_spawner: true,

      // Economía
      dinero: "110.000 $",
      keys_survival: "20 Voto / 8 Legendaria / 0 Mítica",
      keys_oneblock: "20 Básica / 8 Épica / 0 Legendaria",
      materiales: true,

      // Kit & comida
      kit: "Netherita ALPHA",
      comida: "64 Manzanas Doradas",
      kit_cooldown: "6h",

      // Comandos
      comandos_basicos: true,
      comandos_extra: true,
      comandos_avanzados: false,

      // Dupe
      dupe: "x8",
    },

    imagenes: {
      topBanner:
        "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/158e00eb0695d0f283aa45b85921365a539e0016.png",
      prefijo:
        "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/ff375cc6fdecaa80b083b2ccc8b79ac903b1d000.png",
      check:
        "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1017961/bff0f71f471bacf2e7be369dac44ebee7edd8fa2.png",
      secciones: [
        "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/f041acb0ce25a5ba83dc8057bae74a75e43218d4.png",
        "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/539a379082120787e5261329ad578e435837a1a7.png",
        "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/627d52c34624dd7f384c12412a33677edd28b545.png",
        "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/a7607d4fd694f11bfac9f6d285bbfd13c36743d4.png",
      ],
      kitLogos: [
        "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/b71767b84247a0c2087b792234ce842eee7449e2.png",
        "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/dab85a8e96067c6287b302908ec11cda42679284.png",
      ],
      kitItems: [
        "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/80a3c3d60c42a37fc3c9775c8a64fbc7066b036a.png",
        "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/a01c26eb07fff1d04d39334448cacf8667b9a037.png",
      ],
      materiales:
        "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/f28a9986700cb79ba31e9903612fa8d7d6b8e0dc.png",
    },

    kit_detallado: [
      "Casco de Netherita (Respiración 5, Protección 5, Irrompibilidad 5, Reparación 1, Espinas 3)",
      "Pechera de Netherita (Protección 5, Irrompibilidad 5, Reparación 1, Espinas 3)",
      "Pantalones de Netherita (Protección 5, Irrompibilidad 5, Reparación 1, Espinas 3)",
      "Botas de Netherita (Protección 5, Irrompibilidad 5, Reparación 1, Espinas 3)",
      "Espada de Netherita (Filo 5, Barrido 2, Aspecto Ígneo 2, Botín 5, Irrompibilidad 5, Reparación 1)",
      "Pico de Netherita (Eficiencia 5, Fortuna 5, Irrompibilidad 5, Reparación 1)",
      "Pico de Netherita (Eficiencia 5, Toque de Seda 1, Irrompibilidad 5, Reparación 1)",
      "Hacha de Netherita (Eficiencia 5, Irrompibilidad 5, Reparación 1)",
      "Pala de Netherita (Eficiencia 5, Irrompibilidad 5, Reparación 1)",
      "Azada de Netherita (Eficiencia 5, Irrompibilidad 5, Reparación 1)",
      "64 Manzanas Doradas",
    ],

    comandos_detallados: [
      { comando: "/repair", descripcion: "Repara el objeto en tu mano.", cooldown: "30s" },
      { comando: "/feed", descripcion: "Rellena tu barra de comida.", cooldown: "5min" },
      {
        comando: "/workbench",
        alias: ["/craft"],
        descripcion: "Abre la mesa de crafteo.",
        cooldown: null,
      },
      { comando: "/stonecutter", descripcion: "Abre el cortapiedras.", cooldown: null },
      { comando: "/enderchest", descripcion: "Accede a tu cofre del End.", cooldown: null },
      {
        comando: "/condense",
        descripcion: "Convierte minerales en bloques automáticamente.",
        cooldown: null,
      },
      {
        comando: "/vision",
        descripcion: "Activa o desactiva la visión nocturna.",
        cooldown: null,
      },
      { comando: "/afk", descripcion: "Marca tu estado como ausente.", cooldown: null },
      {
        comando: "/compass",
        descripcion: "Muestra hacia dónde estás mirando.",
        cooldown: null,
      },
      { comando: "/hat", descripcion: "Coloca cualquier objeto en tu cabeza.", cooldown: null },
      {
        comando: "/dupe",
        descripcion: "Multiplica x8 el ítem que tengas en la mano.",
        cooldown: null,
      },
    ],
  },

  // -------------------------------------------------
  // INMORTAL 30 DÍAS
  // -------------------------------------------------
  {
    id: "inmortal",
    tipo: "30d",
    nombre: "INMORTAL",
    imagen: "/assets/rangos/inmortal.webp",

    meta: {
      titulo: "INMORTAL 30 Días",
      duracion: "1 Mes",
      autoRenovacion: true,
      precioUSD: 6.6,
      descripcionCorta:
        "Rango máximo con 6 trabajos, 50 homes, mejor kit full Netherita INMORTAL, comandos avanzados y dupe x10.",
      notas: [
        "📆 Duración: 1 mes.",
        "🔁 Renovación automática cada 30 días si eliges la opción de suscripción.",
        "Para cancelar la suscripción, hazlo desde la tienda.",
        "Debes tener espacio en el inventario y estar conectado al servidor.",
        "Compra de único uso, los objetos no se reponen si se pierden.",
        "FlanCraft no está afiliado con Mojang AB ni debe considerarse respaldado por Mojang AB.",
      ],
    },

    beneficios_30d: {
      // Accesos
      prefijo: true,
      acceso_lleno: true,

      // Progresión
      trabajos: 6,
      subastas: 45,
      warps: 30,
      tiendas: 40,
      sethomes: 50,

      // Extras
      cambiar_spawner: true,

      // Economía
      dinero: "230.000 $",
      keys_survival: "35 Voto / 18 Legendaria / 5 Mítica",
      keys_oneblock: "35 Básica / 18 Épica / 5 Legendaria",
      materiales: true,

      // Kit & comida
      kit: "Netherita INMORTAL",
      comida: "16 Manzanas Encantadas",
      kit_cooldown: "6h",

      // Comandos
      comandos_basicos: true,
      comandos_extra: true,
      comandos_avanzados: true,

      // Dupe
      dupe: "x10",
    },

    imagenes: {
      topBanner:
        "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/158e00eb0695d0f283aa45b85921365a539e0016.png",
      prefijo:
        "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/42ca6ec9013c283d6265fb583b6d8c9bd88cc051.png",
      check:
        "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1017961/bff0f71f471bacf2e7be369dac44ebee7edd8fa2.png",
      secciones: [
        "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/f041acb0ce25a5ba83dc8057bae74a75e43218d4.png",
        "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/539a379082120787e5261329ad578e435837a1a7.png",
        "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/627d52c34624dd7f384c12412a33677edd28b545.png",
        "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/a7607d4fd694f11bfac9f6d285bbfd13c36743d4.png",
      ],
      kitLogos: [
        "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/51aa8afc6ee8888b19024dab7963c2e58a40ac2e.png",
        "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/43f8396348290da1bbc4c02d05b5bbb5082d391c.png",
      ],
      kitItems: [
        "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/05ad88fecd7016bd6bb372b20aac183ed1c88523.png",
        "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/daf3d9c42c7bd5883d9c00f3767229bc0a4afe19.png",
      ],
      materiales:
        "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/7ed282c4e00ffc53c24047ca9dfd319948d47046.png",
    },

    kit_detallado: [
      "Casco de Netherita (Respiración 6, Protección 6, Irrompibilidad 6, Reparación 1, Espinas 6)",
      "Pechera de Netherita (Protección 6, Irrompibilidad 6, Reparación 1, Espinas 6)",
      "Pantalones de Netherita (Protección 6, Irrompibilidad 6, Reparación 1, Espinas 6)",
      "Botas de Netherita (Protección 6, Irrompibilidad 6, Reparación 1, Espinas 6)",
      "Espada de Netherita (Filo 6, Barrido 3, Aspecto Ígneo 3, Botín 6, Irrompibilidad 6, Reparación 1)",
      "Pico de Netherita (Eficiencia 6, Fortuna 6, Irrompibilidad 6, Reparación 1)",
      "Pico de Netherita (Eficiencia 6, Toque de Seda 1, Irrompibilidad 6, Reparación 1)",
      "Hacha de Netherita (Eficiencia 6, Irrompibilidad 6, Reparación 1)",
      "Pala de Netherita (Eficiencia 6, Irrompibilidad 6, Reparación 1)",
      "Azada de Netherita (Eficiencia 6, Irrompibilidad 6, Reparación 1)",
      "16 Manzanas Encantadas",
    ],

    comandos_detallados: [
      { comando: "/heal", descripcion: "Cura toda tu vida.", cooldown: "5min" },
      {
        comando: "/repairall",
        descripcion: "Repara todo tu inventario.",
        cooldown: "30s",
      },
      { comando: "/fly", descripcion: "Habilita el vuelo.", cooldown: null },
      { comando: "/anvil", descripcion: "Abre el yunque.", cooldown: null },
      {
        comando: "/kittycannon",
        descripcion: "Lanza gatos explosivos.",
        cooldown: "3min",
      },
      {
        comando: "/respirar",
        descripcion: "Permite respirar bajo el agua.",
        cooldown: null,
      },
      {
        comando: "/canal",
        alias: ["/canalizador"],
        descripcion: "Visión submarina.",
        cooldown: null,
      },
      {
        comando: "/afk",
        descripcion: "Modo AFK (incluye modo automático).",
        cooldown: null,
      },
      {
        comando: "/compass",
        descripcion: "Muestra hacia dónde estás mirando.",
        cooldown: null,
      },
      { comando: "/feed", descripcion: "Rellena tu barra de comida.", cooldown: null },
      { comando: "/hat", descripcion: "Coloca cualquier objeto en tu cabeza.", cooldown: null },
      {
        comando: "/dupe",
        descripcion: "Multiplica x10 el ítem que tengas en la mano.",
        cooldown: null,
      },
    ],
  },
];
