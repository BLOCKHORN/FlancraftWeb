// apps/frontend/src/components/Tienda/data/productos.js
// SOLO INMORTAL — estilo “Minecraft cartoon + texturepack + shaders” (SVG inline)

const SVG = {
  chest: `
<svg class="mcx-svg" viewBox="0 0 64 64" aria-hidden="true">
  <defs>
    <linearGradient id="gChest" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="#ffcf66"/>
      <stop offset="1" stop-color="#d8842f"/>
    </linearGradient>
    <linearGradient id="gChestWood" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="#8a5a2b"/>
      <stop offset="1" stop-color="#5b3516"/>
    </linearGradient>
  </defs>
  <rect x="10" y="18" width="44" height="34" rx="6" fill="url(#gChestWood)" stroke="#2b1507" stroke-width="3"/>
  <rect x="12" y="20" width="40" height="12" rx="5" fill="#6a3f18" opacity=".65"/>
  <rect x="10" y="30" width="44" height="22" rx="6" fill="#7b4a20" opacity=".85"/>
  <rect x="28" y="28" width="8" height="20" rx="4" fill="url(#gChest)" stroke="#2b1507" stroke-width="3"/>
  <rect x="23" y="30" width="18" height="10" rx="5" fill="url(#gChest)" stroke="#2b1507" stroke-width="3"/>
  <circle cx="32" cy="36" r="3" fill="#2b1507" opacity=".7"/>
  <path d="M14 40c7-8 29-8 36 0" fill="none" stroke="#ffffff" stroke-opacity=".18" stroke-width="3" stroke-linecap="round"/>
</svg>`,
  star: `
<svg class="mcx-svg" viewBox="0 0 64 64" aria-hidden="true">
  <defs>
    <linearGradient id="gStar" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="#ffeaa6"/>
      <stop offset="1" stop-color="#f2b33a"/>
    </linearGradient>
  </defs>
  <path d="M32 6l7 16 18 2-13 12 4 18-16-9-16 9 4-18L7 24l18-2z"
        fill="url(#gStar)" stroke="#6a3a05" stroke-width="3" stroke-linejoin="round"/>
  <path d="M20 28c8-7 16-7 24 0" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="3" stroke-linecap="round"/>
</svg>`,
  pick: `
<svg class="mcx-svg" viewBox="0 0 64 64" aria-hidden="true">
  <defs>
    <linearGradient id="gPick" x1="0" x2="1">
      <stop offset="0" stop-color="#a7f0ff"/>
      <stop offset="1" stop-color="#2bc0ff"/>
    </linearGradient>
  </defs>
  <path d="M10 18c10-10 22-8 32 2l8-8 6 6-8 8c10 10 12 22 2 32l-6-6c6-7 4-16-4-24l-6 6-6-6 6-6c-8-8-17-10-24-4z"
        fill="url(#gPick)" stroke="#0e3a55" stroke-width="3" stroke-linejoin="round"/>
  <rect x="28" y="28" width="10" height="30" rx="5" fill="#7a4a20" stroke="#2a1608" stroke-width="3"/>
  <path d="M30 34h6" stroke="#fff" stroke-opacity=".25" stroke-width="3" stroke-linecap="round"/>
</svg>`,
  home: `
<svg class="mcx-svg" viewBox="0 0 64 64" aria-hidden="true">
  <defs>
    <linearGradient id="gHome" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="#bff6ff"/>
      <stop offset="1" stop-color="#3bd1ff"/>
    </linearGradient>
  </defs>
  <path d="M12 30L32 14l20 16v22a6 6 0 0 1-6 6H18a6 6 0 0 1-6-6V30z"
        fill="url(#gHome)" stroke="#0f3c52" stroke-width="3" stroke-linejoin="round"/>
  <rect x="26" y="38" width="12" height="20" rx="4" fill="#7a4a20" stroke="#2a1608" stroke-width="3"/>
  <path d="M20 34h24" stroke="#fff" stroke-opacity=".25" stroke-width="3" stroke-linecap="round"/>
</svg>`,
  wings: `
<svg class="mcx-svg" viewBox="0 0 64 64" aria-hidden="true">
  <defs>
    <linearGradient id="gWing" x1="0" x2="1">
      <stop offset="0" stop-color="#d7b6ff"/>
      <stop offset="1" stop-color="#7f57ff"/>
    </linearGradient>
  </defs>
  <path d="M32 30c-9-16-22-16-26-9 6 3 10 8 11 14-5 0-9 2-11 6 9 6 18 2 26-11z"
        fill="url(#gWing)" stroke="#2b1a55" stroke-width="3" stroke-linejoin="round"/>
  <path d="M32 30c9-16 22-16 26-9-6 3-10 8-11 14 5 0 9 2 11 6-9 6-18 2-26-11z"
        fill="url(#gWing)" stroke="#2b1a55" stroke-width="3" stroke-linejoin="round"/>
  <circle cx="32" cy="32" r="5" fill="#ffeaa6" stroke="#6a3a05" stroke-width="3"/>
</svg>`,
  coin: `
<svg class="mcx-svg" viewBox="0 0 64 64" aria-hidden="true">
  <defs>
    <linearGradient id="gCoin" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="#fff2b8"/>
      <stop offset="1" stop-color="#f0b13a"/>
    </linearGradient>
  </defs>
  <ellipse cx="32" cy="22" rx="18" ry="10" fill="url(#gCoin)" stroke="#6a3a05" stroke-width="3"/>
  <path d="M14 22v16c0 6 8 10 18 10s18-4 18-10V22"
        fill="url(#gCoin)" stroke="#6a3a05" stroke-width="3"/>
  <path d="M22 30c6-4 14-4 20 0" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="3" stroke-linecap="round"/>
</svg>`,
  heal: `
<svg class="mcx-svg" viewBox="0 0 64 64" aria-hidden="true">
  <defs>
    <linearGradient id="gHeal" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="#ffb6b6"/>
      <stop offset="1" stop-color="#ff4a4a"/>
    </linearGradient>
  </defs>
  <path d="M32 56s-22-12-22-28c0-8 6-14 14-14 5 0 8 2 8 2s3-2 8-2c8 0 14 6 14 14 0 16-22 28-22 28z"
        fill="url(#gHeal)" stroke="#5a0f0f" stroke-width="3" stroke-linejoin="round"/>
  <path d="M22 30h20M32 20v20" stroke="#fff" stroke-opacity=".35" stroke-width="6" stroke-linecap="round"/>
</svg>`,
  anvil: `
<svg class="mcx-svg" viewBox="0 0 64 64" aria-hidden="true">
  <defs>
    <linearGradient id="gAnvil" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="#cfd6db"/>
      <stop offset="1" stop-color="#6a717a"/>
    </linearGradient>
  </defs>
  <path d="M10 24c2-10 14-16 22-16s20 6 22 16H10z"
        fill="url(#gAnvil)" stroke="#1c232b" stroke-width="3" stroke-linejoin="round"/>
  <path d="M18 24h28l-4 14H22l-4-14z"
        fill="#8e97a1" stroke="#1c232b" stroke-width="3" stroke-linejoin="round"/>
  <path d="M16 38h32v6c0 3-3 6-6 6H22c-3 0-6-3-6-6v-6z"
        fill="#737c86" stroke="#1c232b" stroke-width="3" stroke-linejoin="round"/>
</svg>`,
  portal: `
<svg class="mcx-svg" viewBox="0 0 64 64" aria-hidden="true">
  <defs>
    <linearGradient id="gPortal" x1="0" x2="1">
      <stop offset="0" stop-color="#61e6ff"/>
      <stop offset="1" stop-color="#2b65ff"/>
    </linearGradient>
  </defs>
  <rect x="18" y="10" width="28" height="44" rx="8" fill="url(#gPortal)" stroke="#0b1e4a" stroke-width="3"/>
  <path d="M26 18c10-6 18 2 12 10-6 8-2 16 10 18"
        fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="4" stroke-linecap="round"/>
  <circle cx="24" cy="48" r="3" fill="#ffeaa6" stroke="#6a3a05" stroke-width="2"/>
</svg>`,
  dupe: `
<svg class="mcx-svg" viewBox="0 0 64 64" aria-hidden="true">
  <defs>
    <linearGradient id="gDupe" x1="0" x2="1">
      <stop offset="0" stop-color="#ff6b6b"/>
      <stop offset="1" stop-color="#ff2d2d"/>
    </linearGradient>
  </defs>
  <rect x="14" y="18" width="24" height="26" rx="6" fill="url(#gDupe)" stroke="#4a0b0b" stroke-width="3"/>
  <rect x="26" y="26" width="24" height="26" rx="6" fill="url(#gDupe)" opacity=".85" stroke="#4a0b0b" stroke-width="3"/>
  <path d="M22 31h10M27 26v10" stroke="#fff" stroke-opacity=".35" stroke-width="5" stroke-linecap="round"/>
</svg>`,
};

const subscriptionBlock = (cancelUrl = "#") => `
  <div class="mcx-note" role="note" aria-label="Suscripción">
    <div class="mcx-note__row">
      <span class="mcx-note__dot"></span>
      <strong>30 días</strong> · Renovación opcional en modo suscripción
    </div>
    <a class="mcx-note__link" href="${cancelUrl}" target="_blank" rel="noreferrer">Cancelar suscripción</a>
  </div>
`;

const legalBlock = () => `
  <div class="mcx-legal" role="note" aria-label="Avisos">
    <div class="mcx-legal__line"><strong>Importante:</strong> necesitas slots libres y estar dentro del servidor para recibir el paquete.</div>
    <div class="mcx-legal__line mcx-legal__danger"><strong>Único uso:</strong> si se pierde el beneficio/ítem, no se reentrega.</div>
    <div class="mcx-legal__fine">FlanCraft no está afiliado ni respaldado por Mojang AB.</div>
  </div>
`;

const INMORTAL_HTML = `
<div class="mcx mcx--inmortal">

  ${subscriptionBlock("#")}

  <div class="mcx-modal" role="region" aria-label="Detalle del rango Inmortal">
    <div class="mcx-skyGlow" aria-hidden="true"></div>

    <header class="mcx-header">
      <div class="mcx-ribbon">
        <div class="mcx-ribbon__chest">${SVG.chest}</div>
        <div class="mcx-ribbon__text">LOBBY</div>
        <div class="mcx-ribbon__chest">${SVG.chest}</div>
      </div>

      <div class="mcx-rankCard">
        <div class="mcx-rankCard__tag">${SVG.star}<span>MÁXIMO TIER</span></div>
        <div class="mcx-rankCard__title">INMORTAL</div>
        <div class="mcx-rankCard__sub">30 DÍAS</div>

        <div class="mcx-rankCard__lead">
          Prefijo <span class="mcx-badgeWord">INMORTAL</span> en chat y TAB ·
          Vuelo, curación, reparación total, kit recurrente y ventajas por modalidad.
        </div>
      </div>

      <div class="mcx-quick">
        <div class="mcx-q">${SVG.pick}<div class="mcx-q__k">TRABAJOS</div><div class="mcx-q__v">6</div><div class="mcx-q__d">Más farmeo</div></div>
        <div class="mcx-q">${SVG.home}<div class="mcx-q__k">SETHOMES</div><div class="mcx-q__v">50</div><div class="mcx-q__d">Movilidad</div></div>
        <div class="mcx-q">${SVG.wings}<div class="mcx-q__k">VUELO</div><div class="mcx-q__v">/fly</div><div class="mcx-q__d">Sin límites</div></div>
        <div class="mcx-q">${SVG.coin}<div class="mcx-q__k">DINERO</div><div class="mcx-q__v">+20k</div><div class="mcx-q__d">Impulso</div></div>
        <div class="mcx-q">${SVG.chest}<div class="mcx-q__k">KIT</div><div class="mcx-q__v">6h</div><div class="mcx-q__d">Recurrente</div></div>
        <div class="mcx-q mcx-q--danger">${SVG.dupe}<div class="mcx-q__k">ANÁRQUICO</div><div class="mcx-q__v">x10</div><div class="mcx-q__d">/dupe</div></div>
      </div>

      <nav class="mcx-tabs" aria-label="Secciones">
        <a class="mcx-tab" href="#mcx-info">${SVG.star}<span>INFO</span></a>
        <a class="mcx-tab" href="#mcx-utilidades">${SVG.heal}<span>UTILIDADES</span></a>
        <a class="mcx-tab" href="#mcx-kit">${SVG.chest}<span>KIT</span></a>
        <a class="mcx-tab mcx-tab--accent" href="#mcx-modalidades">${SVG.portal}<span>MODALIDADES</span></a>
      </nav>
    </header>

    <div class="mcx-body">

      <section id="mcx-info" class="mcx-section">
        <h3 class="mcx-h3">Resumen rápido</h3>
        <div class="mcx-cards">
          <div class="mcx-card">
            <div class="mcx-card__top">${SVG.star}<div><div class="mcx-card__k">TIER</div><div class="mcx-card__v">Máximo</div></div></div>
            <div class="mcx-card__d">Acceso a ventajas “élite”.</div>
          </div>
          <div class="mcx-card">
            <div class="mcx-card__top">${SVG.wings}<div><div class="mcx-card__k">COMODIDAD</div><div class="mcx-card__v">Alta</div></div></div>
            <div class="mcx-card__d">Vuelo, curación y reparación total.</div>
          </div>
          <div class="mcx-card mcx-card--danger">
            <div class="mcx-card__top">${SVG.dupe}<div><div class="mcx-card__k">ANÁRQUICO</div><div class="mcx-card__v">/dupe x10</div></div></div>
            <div class="mcx-card__d">Ventaja exclusiva por modalidad.</div>
          </div>
        </div>

        <ul class="mcx-list">
          <li><span class="mcx-check" aria-hidden="true"></span> Acceso a beneficios de rangos anteriores.</li>
          <li><span class="mcx-check" aria-hidden="true"></span> Entra aunque el servidor esté lleno.</li>
          <li><span class="mcx-check" aria-hidden="true"></span> Kit recurrente cada 6 horas + dinero inicial.</li>
          <li><span class="mcx-check" aria-hidden="true"></span> Ventajas separadas por modalidad (abajo).</li>
        </ul>
      </section>

      <section id="mcx-utilidades" class="mcx-section">
        <h3 class="mcx-h3">Hechizos y utilidades</h3>

        <div class="mcx-cmdGrid">
          <article class="mcx-cmd">
            <div class="mcx-cmd__head">${SVG.heal}<div><code>/heal</code><span class="mcx-pill">5 min</span></div></div>
            <div class="mcx-cmd__txt">Cura tu vida al instante.</div>
          </article>

          <article class="mcx-cmd">
            <div class="mcx-cmd__head">${SVG.pick}<div><code>/repairall</code><span class="mcx-pill mcx-pill--cyan">30 s</span></div></div>
            <div class="mcx-cmd__txt">Repara todo tu inventario.</div>
          </article>

          <article class="mcx-cmd">
            <div class="mcx-cmd__head">${SVG.wings}<div><code>/fly</code><span class="mcx-pill mcx-pill--free">libre</span></div></div>
            <div class="mcx-cmd__txt">Vuelo donde esté permitido.</div>
          </article>

          <article class="mcx-cmd">
            <div class="mcx-cmd__head">${SVG.anvil}<div><code>/anvil</code><span class="mcx-pill mcx-pill--free">libre</span></div></div>
            <div class="mcx-cmd__txt">Abre el yunque donde estés.</div>
          </article>

          <article class="mcx-cmd">
            <div class="mcx-cmd__head">${SVG.star}<div><code>/kittycannon</code><span class="mcx-pill">3 min</span></div></div>
            <div class="mcx-cmd__txt">Efecto divertido.</div>
          </article>

          <article class="mcx-cmd">
            <div class="mcx-cmd__head">${SVG.portal}<div><code>/respirar</code><span class="mcx-pill mcx-pill--free">libre</span></div></div>
            <div class="mcx-cmd__txt">Respira bajo el agua.</div>
          </article>

          <article class="mcx-cmd">
            <div class="mcx-cmd__head">${SVG.portal}<div><code>/canal</code> <span class="mcx-or">o</span> <code>/canalizador</code><span class="mcx-pill mcx-pill--free">libre</span></div></div>
            <div class="mcx-cmd__txt">Visión submarina tipo conduit.</div>
          </article>
        </div>
      </section>

      <section id="mcx-kit" class="mcx-section">
        <h3 class="mcx-h3">Kit INMORTAL</h3>

        <div class="mcx-kitMeta">
          <div class="mcx-bubble">${SVG.coin}<div><div class="mcx-bubble__k">DINERO</div><div class="mcx-bubble__v">+20.000$</div></div></div>
          <div class="mcx-bubble">${SVG.chest}<div><div class="mcx-bubble__k">COOLDOWN</div><div class="mcx-bubble__v">6 horas</div></div></div>
        </div>

        <ul class="mcx-list mcx-list--dense">
          <li><span class="mcx-check" aria-hidden="true"></span> Casco Netherita (Resp. 6, Prot. 6, Irromp. 6, Reparación 1, Espinas 6)</li>
          <li><span class="mcx-check" aria-hidden="true"></span> Pechera Netherita (Prot. 6, Irromp. 6, Reparación 1, Espinas 6)</li>
          <li><span class="mcx-check" aria-hidden="true"></span> Pantalones Netherita (Prot. 6, Irromp. 6, Reparación 1, Espinas 6)</li>
          <li><span class="mcx-check" aria-hidden="true"></span> Botas Netherita (Prot. 6, Irromp. 6, Reparación 1, Espinas 6)</li>
          <li><span class="mcx-check" aria-hidden="true"></span> Espada Netherita (Filo 6, Barrido 3, Aspecto Ígneo 3, Botín 6, Irromp. 6, Reparación 1)</li>
          <li><span class="mcx-check" aria-hidden="true"></span> Pico Netherita (Eficiencia 6, Fortuna 6, Irromp. 6, Reparación 1)</li>
          <li><span class="mcx-check" aria-hidden="true"></span> Pico Netherita (Eficiencia 6, Toque de Seda 1, Irromp. 6, Reparación 1)</li>
          <li><span class="mcx-check" aria-hidden="true"></span> Hacha Netherita (Eficiencia 6, Irromp. 6, Reparación 1)</li>
          <li><span class="mcx-check" aria-hidden="true"></span> Pala Netherita (Eficiencia 6, Irromp. 6, Reparación 1)</li>
          <li><span class="mcx-check" aria-hidden="true"></span> Azada Netherita (Eficiencia 6, Irromp. 6, Reparación 1)</li>
          <li><span class="mcx-check" aria-hidden="true"></span> 16 Manzanas encantadas</li>
        </ul>
      </section>

      <section id="mcx-modalidades" class="mcx-section">
        <h3 class="mcx-h3">Beneficios por modalidad</h3>

        <div class="mcx-servers">

          <details class="mcx-server" open>
            <summary class="mcx-server__sum"><span class="mcx-server__tag">LOBBY</span><span class="mcx-server__mini">Base del rango</span></summary>
            <ul class="mcx-list">
              <li><span class="mcx-check" aria-hidden="true"></span> Acceso a beneficios de rangos anteriores.</li>
              <li><span class="mcx-check" aria-hidden="true"></span> Entrada aunque el servidor esté lleno.</li>
            </ul>
          </details>

          <details class="mcx-server">
            <summary class="mcx-server__sum"><span class="mcx-server__tag mcx-server__tag--blue">CHUNKLOCK</span><span class="mcx-server__mini">Utilidad + economía</span></summary>
            <ul class="mcx-list">
              <li><span class="mcx-check" aria-hidden="true"></span> 6 trabajos simultáneos.</li>
              <li><span class="mcx-check" aria-hidden="true"></span> Cambiar mob del spawner con huevo.</li>
              <li><span class="mcx-check" aria-hidden="true"></span> Modo AFK automático.</li>
              <li><span class="mcx-check" aria-hidden="true"></span> 50 sethome.</li>
              <li><span class="mcx-check" aria-hidden="true"></span> +20.000$ dinero del servidor.</li>
            </ul>
          </details>

          <details class="mcx-server">
            <summary class="mcx-server__sum"><span class="mcx-server__tag mcx-server__tag--green">SURVIVAL CLÁSICO</span><span class="mcx-server__mini">Progreso sin fricción</span></summary>
            <ul class="mcx-list">
              <li><span class="mcx-check" aria-hidden="true"></span> 6 trabajos simultáneos.</li>
              <li><span class="mcx-check" aria-hidden="true"></span> Cambiar mob del spawner con huevo.</li>
              <li><span class="mcx-check" aria-hidden="true"></span> Modo AFK automático.</li>
              <li><span class="mcx-check" aria-hidden="true"></span> 50 sethome.</li>
            </ul>
          </details>

          <details class="mcx-server">
            <summary class="mcx-server__sum"><span class="mcx-server__tag mcx-server__tag--amber">ONEBLOCK</span><span class="mcx-server__mini">Comercio + subastas</span></summary>
            <ul class="mcx-list">
              <li><span class="mcx-check" aria-hidden="true"></span> Hasta 45 subastas.</li>
              <li><span class="mcx-check" aria-hidden="true"></span> Cambiar mob del spawner con huevo.</li>
              <li><span class="mcx-check" aria-hidden="true"></span> Entrada aunque el servidor esté lleno.</li>
            </ul>
          </details>

          <details class="mcx-server">
            <summary class="mcx-server__sum"><span class="mcx-server__tag mcx-server__tag--gray">SURVIVAL HARD</span><span class="mcx-server__mini">Comodidad total</span></summary>
            <ul class="mcx-list">
              <li><span class="mcx-check" aria-hidden="true"></span> Acceso a <code>/afk</code>, <code>/compass</code>, <code>/feed</code>, <code>/hat</code>.</li>
            </ul>
          </details>

          <details class="mcx-server mcx-server--danger">
            <summary class="mcx-server__sum"><span class="mcx-server__tag mcx-server__tag--red">SURVIVAL ANÁRQUICO</span><span class="mcx-server__mini">Exclusivo</span></summary>
            <ul class="mcx-list">
              <li><span class="mcx-check" aria-hidden="true"></span> <strong>/dupe x10</strong> multiplica el ítem en mano.</li>
            </ul>
            <div class="mcx-warn">
              <div class="mcx-warn__t">Aviso</div>
              <div class="mcx-warn__p">Solo aplica dentro de la modalidad anárquica.</div>
            </div>
          </details>

        </div>
      </section>

      ${legalBlock()}

    </div>
  </div>
</div>
`;

const PRODUCT_DATA = {
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
