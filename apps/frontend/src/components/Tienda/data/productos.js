// apps/frontend/src/components/Tienda/data/productos.js

// Icono check (el que usabas en Tebex)
const CHECK_ICON =
  "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1017961/bff0f71f471bacf2e7be369dac44ebee7edd8fa2.png";

// Banners / imágenes (CloudFront Tebex)
const IMG = {
  COMMON_HEADER:
    "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/158e00eb0695d0f283aa45b85921365a539e0016.png",

  // Nova / Alpha (banners principales)
  NOVA_BANNER:
    "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/445b6490887da0bc017009f863e124bd77182526.png",
  ALPHA_BANNER:
    "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/1b2adc73bf0c086c8b9f9cc12042c55da07964c6.png",

  // Prefix images
  PREFIX_NOVA_INM:
    "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/42ca6ec9013c283d6265fb583b6d8c9bd88cc051.png",
  PREFIX_ALPHA:
    "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/ff375cc6fdecaa80b083b2ccc8b79ac903b1d000.png",

  // “Separadores”/banners extra (los que salen en tu HTML viejo)
  BANNER_MID_1:
    "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/f041acb0ce25a5ba83dc8057bae74a75e43218d4.png",
  BANNER_MID_2:
    "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/539a379082120787e5261329ad578e435837a1a7.png",
  BANNER_MID_3:
    "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/627d52c34624dd7f384c12412a33677edd28b545.png",
  BANNER_DUPE:
    "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/a7607d4fd694f11bfac9f6d285bbfd13c36743d4.png",

  // Materiales
  MATERIALS_ALPHA:
    "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/f28a9986700cb79ba31e9903612fa8d7d6b8e0dc.png",
  MATERIALS_INM:
    "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/7ed282c4e00ffc53c24047ca9dfd319948d47046.png",

  // Kit/Galería Alpha
  ALPHA_KIT_HEAD_1:
    "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/b71767b84247a0c2087b792234ce842eee7449e2.png",
  ALPHA_KIT_HEAD_2:
    "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/dab85a8e96067c6287b302908ec11cda42679284.png",
  ALPHA_KIT_IMG_1:
    "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/80a3c3d60c42a37fc3c9775c8a64fbc7066b036a.png",
  ALPHA_KIT_IMG_2:
    "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/a01c26eb07fff1d04d39334448cacf8667b9a037.png",

  // Kit/Galería Inmortal
  INM_KIT_HEAD_1:
    "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/51aa8afc6ee8888b19024dab7963c2e58a40ac2e.png",
  INM_KIT_HEAD_2:
    "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/43f8396348290da1bbc4c02d05b5bbb5082d391c.png",
  INM_KIT_IMG_1:
    "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/05ad88fecd7016bd6bb372b20aac183ed1c88523.png",
  INM_KIT_IMG_2:
    "https://dunb17ur4ymx4.cloudfront.net/wysiwyg/1447273/daf3d9c42c7bd5883d9c00f3767229bc0a4afe19.png",
};

const subscriptionBlock = (cancelUrl = "#") => `
  <div class="prod-subscription">
    <div class="prod-subscription__row">📆 <strong>Duración: 1 Mes</strong></div>
    <div class="prod-subscription__row">🔁 <em>Este paquete se renovará automáticamente cada 30 días (solo si eliges suscripción)</em></div>
    <div class="prod-subscription__row">🔗 <a class="prod-link" href="${cancelUrl}" target="_blank" rel="noreferrer">Haz clic aquí para cancelar la suscripción</a></div>
  </div>
`;

const legalBlock = () => `
  <div class="prod-legal">
    <p class="prod-legal__warn"><strong>Para poder obtener el paquete debes disponer de slots disponibles en tu inventario y estar dentro del servidor.</strong></p>
    <p class="prod-legal__warn prod-legal__warn--red"><strong>¡Esta compra es de un único uso, así que si pierdes esta protección de cualquier modo, no podrá volver a ser entregada!</strong></p>
    <p class="prod-legal__fine prod-legal__warn--red"><strong>FlanCraft no está afiliado de ninguna forma con Mojang, AB. Tampoco debe considerarse respaldado por Mojang, AB.</strong></p>
  </div>
`;

/* =========================
   NOVA
========================= */

const NOVA_HTML = `
<div class="prod-desc prod-desc--rango prod-desc--nova" data-check-icon="${CHECK_ICON}">
  ${subscriptionBlock("#")}

  <header class="prod-hero">
    <div class="prod-hero__head">
      <img class="prod-banner" src="${IMG.COMMON_HEADER}" alt="Rangos" loading="lazy"/>
      <div class="prod-hero__titleRow">
        <img class="prod-banner prod-banner--rank" src="${IMG.NOVA_BANNER}" alt="NOVA" loading="lazy"/>
      </div>
      <p class="prod-prefix">
        Prefijo <img class="prod-prefix__img" src="${IMG.PREFIX_NOVA_INM}" alt="Prefijo" loading="lazy"/> en el chat y en Tab
      </p>
    </div>

    <div class="prod-kpis">
      <div class="prod-kpi"><div class="prod-kpi__label">Trabajos</div><div class="prod-kpi__value">4</div></div>
      <div class="prod-kpi"><div class="prod-kpi__label">Sethomes</div><div class="prod-kpi__value">10</div></div>
      <div class="prod-kpi"><div class="prod-kpi__label">Dinero</div><div class="prod-kpi__value">+5.000$</div></div>
      <div class="prod-kpi"><div class="prod-kpi__label">Kit</div><div class="prod-kpi__value">Cada 6h</div></div>
    </div>

    <p class="prod-hero__subtitle">
      La entrada al mundo premium: utilidades clave, kit recurrente y ventajas pensadas para farmear y avanzar más rápido.
    </p>
  </header>

  <div class="prod-grid">
    <section class="prod-section">
      <h3 class="prod-section__title">Beneficios principales</h3>
      <ul class="prod-list">
        <li>Acceso a los beneficios de rangos anteriores.</li>
        <li>¡Podrás acceder al servidor cuando esté lleno!</li>
        <li>Acceso a tener <strong>4 trabajos</strong> al mismo tiempo.</li>
        <li>Establece hasta <strong>10 sethome</strong>.</li>
        <li>Incluye <strong>+5.000$</strong> del servidor.</li>
      </ul>
    </section>

    <section class="prod-section">
      <h3 class="prod-section__title">Comandos incluidos</h3>
      <ul class="prod-cmds">
        <li><code>/back</code> <span class="prod-cmds__sep">→</span> Vuelve a tu última posición.</li>
        <li><code>/compass</code> <span class="prod-cmds__sep">→</span> Muestra hacia dónde estás mirando.</li>
        <li><code>/disposal</code> / <code>/trash</code> <span class="prod-cmds__sep">→</span> Basura portátil.</li>
        <li><code>/loom</code> <span class="prod-cmds__sep">→</span> Abre el telar.</li>
        <li><code>/tpahere</code> <span class="prod-cmds__sep">→</span> Solicitud de teleport hacia ti.</li>
        <li><code>/hat</code> <span class="prod-cmds__sep">→</span> Coloca un objeto en tu cabeza.</li>
        <li><code>/smithtable</code> <span class="prod-cmds__sep">→</span> Abre la mesa de herrería.</li>
        <li><code>/near</code> <em class="prod-cooldown">(30s)</em> <span class="prod-cmds__sep">→</span> Jugadores cercanos.</li>
      </ul>
    </section>
  </div>

  <details class="prod-details" open>
    <summary class="prod-details__summary">
      <span>Kit NOVA <em class="prod-muted">(cada 6 horas)</em></span>
      <span class="prod-details__meta">ver contenido</span>
    </summary>
    <div class="prod-details__content">
      <ul class="prod-kit">
        <li>Casco de Diamante (Respiración 3, Protección 3, Irrompibilidad 3, Reparación 1)</li>
        <li>Pechera de Diamante (Protección 3, Irrompibilidad 3, Reparación 1)</li>
        <li>Pantalones de Diamante (Protección 3, Irrompibilidad 3, Reparación 1)</li>
        <li>Botas de Diamante (Protección 3, Irrompibilidad 3, Reparación 1)</li>
        <li>Espada de Diamante (Filo 3, Botín 3, Irrompibilidad 3, Reparación 1)</li>
        <li>Pico de Diamante (Eficiencia 2, Fortuna 2, Irrompibilidad 2, Reparación 2)</li>
        <li>Hacha de Diamante (Eficiencia 2, Irrompibilidad 2, Reparación 1)</li>
        <li>Pala de Diamante (Eficiencia 2, Irrompibilidad 2, Reparación 1)</li>
        <li>Azada de Diamante (Eficiencia 2, Irrompibilidad 2, Reparación 1)</li>
        <li>16 Zanahorias Doradas</li>
      </ul>
    </div>
  </details>

  <details class="prod-details">
    <summary class="prod-details__summary">
      <span>Extras y ventajas avanzadas</span>
      <span class="prod-details__meta">ver extras</span>
    </summary>
    <div class="prod-details__content">
      <ul class="prod-list">
        <li>Hasta <strong>30 subastas</strong> y <strong>15 warps personales</strong>.</li>
        <li>Hasta <strong>20 tiendas personales</strong>.</li>
        <li>Incluye <strong>+50.000$</strong> (según modalidad/servidor).</li>
        <li><strong>Keys OneBlock:</strong> x8 Básica, x3 Épica.</li>
        <li><strong>/dupe</strong>: multiplica x6 el ítem en mano.</li>
      </ul>
    </div>
  </details>

  ${legalBlock()}
</div>
`;

/* =========================
   ALPHA
========================= */

const ALPHA_HTML = `
<div class="prod-desc prod-desc--rango prod-desc--alpha" data-check-icon="${CHECK_ICON}">
  ${subscriptionBlock("#")}

  <header class="prod-hero">
    <div class="prod-hero__head">
      <img class="prod-banner" src="${IMG.COMMON_HEADER}" alt="Rangos" loading="lazy"/>
      <div class="prod-hero__titleRow">
        <img class="prod-banner prod-banner--rank" src="${IMG.ALPHA_BANNER}" alt="ALPHA" loading="lazy"/>
      </div>
      <p class="prod-prefix">
        Prefijo <img class="prod-prefix__img" src="${IMG.PREFIX_ALPHA}" alt="Prefijo" loading="lazy"/> en el chat y en Tab
      </p>
    </div>

    <div class="prod-kpis">
      <div class="prod-kpi"><div class="prod-kpi__label">Trabajos</div><div class="prod-kpi__value">5</div></div>
      <div class="prod-kpi"><div class="prod-kpi__label">Sethomes</div><div class="prod-kpi__value">20</div></div>
      <div class="prod-kpi"><div class="prod-kpi__label">Dinero</div><div class="prod-kpi__value">+15.000$</div></div>
      <div class="prod-kpi"><div class="prod-kpi__label">Kit</div><div class="prod-kpi__value">Cada 6h</div></div>
    </div>

    <p class="prod-hero__subtitle">
      Una mejora seria: más utilidades, kit Netherita recurrente y ventajas de economía/tiendas para dominar el mid-game.
    </p>
  </header>

  <div class="prod-grid">
    <section class="prod-section">
      <h3 class="prod-section__title">Beneficios principales</h3>
      <ul class="prod-list">
        <li>Acceso a beneficios de rangos anteriores.</li>
        <li>¡Podrás acceder al servidor cuando esté lleno!</li>
        <li>Acceso a tener <strong>5 trabajos</strong> al mismo tiempo.</li>
        <li>Incluye <strong>+15.000$</strong> del servidor.</li>
      </ul>
    </section>

    <section class="prod-section">
      <h3 class="prod-section__title">Comandos incluidos</h3>
      <ul class="prod-cmds">
        <li><code>/repair</code> <em class="prod-cooldown">(30s)</em> <span class="prod-cmds__sep">→</span> Repara el objeto en tu mano.</li>
        <li><code>/feed</code> <em class="prod-cooldown">(5min)</em> <span class="prod-cmds__sep">→</span> Rellena tu barra de comida.</li>
        <li><code>/workbench</code> / <code>/craft</code> <span class="prod-cmds__sep">→</span> Abre la mesa de crafteo.</li>
        <li><code>/stonecutter</code> <span class="prod-cmds__sep">→</span> Abre el cortapiedras.</li>
        <li><code>/enderchest</code> <span class="prod-cmds__sep">→</span> Accede a tu cofre del End.</li>
        <li><code>/condense</code> <span class="prod-cmds__sep">→</span> Convierte minerales en bloques automáticamente.</li>
        <li><code>/vision</code> <span class="prod-cmds__sep">→</span> Activa/desactiva visión nocturna.</li>
      </ul>
    </section>
  </div>

  <details class="prod-details" open>
    <summary class="prod-details__summary">
      <span>Kit ALPHA <em class="prod-muted">(cada 6 horas)</em></span>
      <span class="prod-details__meta">ver kit</span>
    </summary>
    <div class="prod-details__content">
      <div class="prod-gallery">
        <img src="${IMG.ALPHA_KIT_HEAD_1}" alt="Kit Alpha" loading="lazy"/>
        <img src="${IMG.ALPHA_KIT_HEAD_2}" alt="Kit Alpha" loading="lazy"/>
        <img src="${IMG.ALPHA_KIT_IMG_1}" alt="Kit Alpha" loading="lazy"/>
        <img src="${IMG.ALPHA_KIT_IMG_2}" alt="Kit Alpha" loading="lazy"/>
      </div>

      <ul class="prod-kit">
        <li>Casco de Netherita (Respiración 5, Protección 5, Irrompibilidad 5, Reparación 1, Espinas 3)</li>
        <li>Pechera de Netherita (Protección 5, Irrompibilidad 5, Reparación 1, Espinas 3)</li>
        <li>Pantalones de Netherita (Protección 5, Irrompibilidad 5, Reparación 1, Espinas 3)</li>
        <li>Botas de Netherita (Protección 5, Irrompibilidad 5, Reparación 1, Espinas 3)</li>
        <li>Espada de Netherita (Filo 5, Barrido 2, Aspecto Ígneo 2, Botín 5, Irrompibilidad 5, Reparación 1)</li>
        <li>Pico de Netherita (Eficiencia 5, Fortuna 5, Irrompibilidad 5, Reparación 1)</li>
        <li>Pico de Netherita (Eficiencia 5, Toque de Seda 1, Irrompibilidad 5, Reparación 1)</li>
        <li>Hacha de Netherita (Eficiencia 5, Irrompibilidad 5, Reparación 1)</li>
        <li>Pala de Netherita (Eficiencia 5, Irrompibilidad 5, Reparación 1)</li>
        <li>Azada de Netherita (Eficiencia 5, Irrompibilidad 5, Reparación 1)</li>
        <li>64 Manzanas Doradas</li>
      </ul>
    </div>
  </details>

  <details class="prod-details">
    <summary class="prod-details__summary">
      <span>Economía, keys y utilidades</span>
      <span class="prod-details__meta">ver extras</span>
    </summary>
    <div class="prod-details__content">
      <div class="prod-inlineImg">
        <img src="${IMG.MATERIALS_ALPHA}" alt="Materiales Alpha" loading="lazy"/>
      </div>

      <ul class="prod-list">
        <li>Hasta <strong>40 subastas</strong>, <strong>20 warps personales</strong> y <strong>30 tiendas personales</strong>.</li>
        <li>Hasta <strong>20 sethome</strong>.</li>
        <li>Incluye <strong>+110.000$</strong> (según modalidad/servidor).</li>
        <li><strong>Keys:</strong> x20 Básica, x8 Épica.</li>
        <li>Acceso a utilidades: <code>/afk</code>, <code>/compass</code>, <code>/feed</code>, <code>/hat</code>.</li>
        <li><strong>/dupe</strong>: multiplica x8 el ítem en mano.</li>
      </ul>
    </div>
  </details>

  ${legalBlock()}
</div>
`;

/* =========================
   INMORTAL
========================= */

const INMORTAL_HTML = `
<div class="prod-desc prod-desc--rango prod-desc--inmortal" data-check-icon="${CHECK_ICON}">
  ${subscriptionBlock("#")}

  <header class="prod-hero">
    <div class="prod-hero__head">
      <img class="prod-banner" src="${IMG.COMMON_HEADER}" alt="Rangos" loading="lazy"/>
      <div class="prod-hero__titleRow">
        <div class="prod-rankTitle">
          <span class="prod-rankTitle__pill">MÁXIMO TIER</span>
          <h2 class="prod-rankTitle__text">INMORTAL</h2>
        </div>
      </div>

      <p class="prod-prefix">
        Prefijo <img class="prod-prefix__img" src="${IMG.PREFIX_NOVA_INM}" alt="Prefijo" loading="lazy"/> en el chat y en Tab
      </p>
    </div>

    <div class="prod-kpis">
      <div class="prod-kpi"><div class="prod-kpi__label">Trabajos</div><div class="prod-kpi__value">6</div></div>
      <div class="prod-kpi"><div class="prod-kpi__label">Sethomes</div><div class="prod-kpi__value">50</div></div>
      <div class="prod-kpi"><div class="prod-kpi__label">Kit</div><div class="prod-kpi__value">Cada 6h</div></div>
      <div class="prod-kpi"><div class="prod-kpi__label">Keys</div><div class="prod-kpi__value">B/E/L</div></div>
    </div>

    <p class="prod-hero__subtitle">
      El rango definitivo: vuelo, utilidades avanzadas, kit top recurrente, keys y economía para jugar sin freno.
    </p>
  </header>

  <div class="prod-grid">
    <section class="prod-section">
      <h3 class="prod-section__title">Beneficios principales</h3>
      <ul class="prod-list">
        <li>Acceso a beneficios de rangos anteriores.</li>
        <li>¡Podrás acceder al servidor cuando esté lleno!</li>
        <li>Acceso a tener <strong>6 trabajos</strong> al mismo tiempo.</li>
        <li>Cambiar el mob del Spawner con un <strong>Huevo de Mob</strong>.</li>
        <li>Acceso al modo automático de <strong>AFK</strong>.</li>
        <li>Establece hasta <strong>50 sethome</strong>.</li>
      </ul>
    </section>

    <section class="prod-section">
      <h3 class="prod-section__title">Comandos incluidos</h3>
      <ul class="prod-cmds">
        <li><code>/heal</code> <em class="prod-cooldown">(5min)</em> <span class="prod-cmds__sep">→</span> Cura toda tu vida.</li>
        <li><code>/repairall</code> <em class="prod-cooldown">(30s)</em> <span class="prod-cmds__sep">→</span> Repara todo tu inventario.</li>
        <li><code>/fly</code> <span class="prod-cmds__sep">→</span> Habilita el vuelo.</li>
        <li><code>/anvil</code> <span class="prod-cmds__sep">→</span> Abre el yunque.</li>
        <li><code>/kittycannon</code> <em class="prod-cooldown">(3min)</em> <span class="prod-cmds__sep">→</span> ¡Lanza gatos explosivos!</li>
        <li><code>/respirar</code> <span class="prod-cmds__sep">→</span> Permite respirar bajo el agua.</li>
        <li><code>/canal</code> / <code>/canalizador</code> <span class="prod-cmds__sep">→</span> Visión submarina.</li>
      </ul>
    </section>
  </div>

  <details class="prod-details" open>
    <summary class="prod-details__summary">
      <span>Kit INMORTAL <em class="prod-muted">(cada 6 horas)</em></span>
      <span class="prod-details__meta">ver kit</span>
    </summary>
    <div class="prod-details__content">
      <div class="prod-gallery">
        <img src="${IMG.INM_KIT_HEAD_1}" alt="Kit Inmortal" loading="lazy"/>
        <img src="${IMG.INM_KIT_HEAD_2}" alt="Kit Inmortal" loading="lazy"/>
        <img src="${IMG.INM_KIT_IMG_1}" alt="Kit Inmortal" loading="lazy"/>
        <img src="${IMG.INM_KIT_IMG_2}" alt="Kit Inmortal" loading="lazy"/>
      </div>

      <ul class="prod-kit">
        <li>Casco de Netherita (Respiración 6, Protección 6, Irrompibilidad 6, Reparación 1, Espinas 6)</li>
        <li>Pechera de Netherita (Protección 6, Irrompibilidad 6, Reparación 1, Espinas 6)</li>
        <li>Pantalones de Netherita (Protección 6, Irrompibilidad 6, Reparación 1, Espinas 6)</li>
        <li>Botas de Netherita (Protección 6, Irrompibilidad 6, Reparación 1, Espinas 6)</li>
        <li>Espada de Netherita (Filo 6, Barrido 3, Aspecto Ígneo 3, Botín 6, Irrompibilidad 6, Reparación 1)</li>
        <li>Pico de Netherita (Eficiencia 6, Fortuna 6, Irrompibilidad 6, Reparación 1)</li>
        <li>Pico de Netherita (Eficiencia 6, Toque de Seda 1, Irrompibilidad 6, Reparación 1)</li>
        <li>Hacha de Netherita (Eficiencia 6, Irrompibilidad 6, Reparación 1)</li>
        <li>Pala de Netherita (Eficiencia 6, Irrompibilidad 6, Reparación 1)</li>
        <li>Azada de Netherita (Eficiencia 6, Irrompibilidad 6, Reparación 1)</li>
        <li>16 Manzanas Encantadas</li>
      </ul>
    </div>
  </details>

  <details class="prod-details">
    <summary class="prod-details__summary">
      <span>Economía, keys y ventajas top</span>
      <span class="prod-details__meta">ver extras</span>
    </summary>
    <div class="prod-details__content">
      <div class="prod-inlineImg">
        <img src="${IMG.MATERIALS_INM}" alt="Materiales Inmortal" loading="lazy"/>
      </div>

      <ul class="prod-list">
        <li>Incluye <strong>+230.000$</strong> (según modalidad/servidor).</li>
        <li><strong>Keys:</strong> x35 Básica, x18 Épica, x5 Legendaria.</li>
        <li>Hasta <strong>45 subastas</strong> y <strong>30 warps personales</strong>.</li>
        <li>Hasta <strong>40 tiendas personales</strong>.</li>
      </ul>

      <div class="prod-dividerImg">
        <img class="prod-banner prod-banner--mid" src="${IMG.BANNER_DUPE}" alt="Dupe" loading="lazy"/>
      </div>

      <ul class="prod-list">
        <li><strong>/dupe</strong>: multiplica x10 el ítem que tengas en la mano.</li>
      </ul>
    </div>
  </details>

  ${legalBlock()}
</div>
`;

const PRODUCT_DATA = {
  // --- NOVA
  nova: { descripcion: NOVA_HTML, titulo: "NOVA" },
  "rango-nova": { descripcion: NOVA_HTML, titulo: "NOVA" },
  "rangos/nova": { descripcion: NOVA_HTML, titulo: "NOVA" },
  "nova-30d": { descripcion: NOVA_HTML, titulo: "NOVA" },
  "rango-nova-30d": { descripcion: NOVA_HTML, titulo: "NOVA" },
  "nova-30-dias": { descripcion: NOVA_HTML, titulo: "NOVA" },
  "rango-nova-30-dias": { descripcion: NOVA_HTML, titulo: "NOVA" },
  "rangos/nova-30-dias": { descripcion: NOVA_HTML, titulo: "NOVA" },
  "rangos/nova-30d": { descripcion: NOVA_HTML, titulo: "NOVA" },

  // --- ALPHA
  alpha: { descripcion: ALPHA_HTML, titulo: "ALPHA" },
  "rango-alpha": { descripcion: ALPHA_HTML, titulo: "ALPHA" },
  "rangos/alpha": { descripcion: ALPHA_HTML, titulo: "ALPHA" },
  "alpha-30d": { descripcion: ALPHA_HTML, titulo: "ALPHA" },
  "rango-alpha-30d": { descripcion: ALPHA_HTML, titulo: "ALPHA" },
  "alpha-30-dias": { descripcion: ALPHA_HTML, titulo: "ALPHA" },
  "rango-alpha-30-dias": { descripcion: ALPHA_HTML, titulo: "ALPHA" },
  "rangos/alpha-30-dias": { descripcion: ALPHA_HTML, titulo: "ALPHA" },
  "rangos/alpha-30d": { descripcion: ALPHA_HTML, titulo: "ALPHA" },

  // --- INMORTAL
  inmortal: { descripcion: INMORTAL_HTML, titulo: "INMORTAL" },
  "rango-inmortal": { descripcion: INMORTAL_HTML, titulo: "INMORTAL" },
  "rangos/inmortal": { descripcion: INMORTAL_HTML, titulo: "INMORTAL" },
  "inmortal-30d": { descripcion: INMORTAL_HTML, titulo: "INMORTAL" },
  "rango-inmortal-30d": { descripcion: INMORTAL_HTML, titulo: "INMORTAL" },
  "inmortal-30-dias": { descripcion: INMORTAL_HTML, titulo: "INMORTAL" },
  "rango-inmortal-30-dias": { descripcion: INMORTAL_HTML, titulo: "INMORTAL" },
  "rangos/inmortal-30-dias": { descripcion: INMORTAL_HTML, titulo: "INMORTAL" },
  "rangos/inmortal-30d": { descripcion: INMORTAL_HTML, titulo: "INMORTAL" },
};

export default PRODUCT_DATA;
