import React from "react";
import AuraSkillsList from "../components/Wiki/AuraSkillsList";

const blockUrl = "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20.4/assets/minecraft/textures/block/";
const itemUrl = "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20.4/assets/minecraft/textures/item/";
const coinIcon = "/tienda/assets/coin.png";
const flaniteIcon = "/tienda/assets/flanite.webp";

const InlineIcon = ({ src, alt, className = "" }) => (
  <img src={src} alt={alt} className={`inline-icon ${className}`} />
);

export const wikiData = {
  inicio: {
    title: "GUÍA DE INICIO RÁPIDO",
    type: "markdown",
    fileName: "inicio"
  },
  trabajos: {
    title: "SISTEMA DE EMPLEOS",
    type: "component",
    component: "JobList"
  },
  factorias: {
    title: "ERA INDUSTRIAL",
    type: "component",
    component: "FactoryList"
  },
  economia: {
    title: "ECONOMÍA Y BLOCKSTREET",
    content: (
      <>
        <div className="wiki-section-intro">
          <p>La economía de Flancraft es un organismo vivo basado en un sistema **Automated Market Maker (AMM)**. El valor de cada activo es un reflejo directo de la liquidez depositada por los jugadores.</p>
        </div>

        <div className="wiki-infobox">
            <div className="infobox-title">Block Street Index</div>
            <div className="infobox-image">
                <img src={itemUrl + "emerald.png"} alt="Market" className="mc-pixelated" />
            </div>
            <div className="infobox-data">
                <div className="data-row"><span className="label">Ecosistema</span><span className="value">BlockStreet v1.7.5</span></div>
                <div className="data-row"><span className="label">Modelo</span><span className="value">Algoritmo AMM (x*y=k)</span></div>
                <div className="data-row"><span className="label">Sincronización</span><span className="value">Cada 10s</span></div>
            </div>
        </div>

        <h2>BENEFICIOS POR HOLDING</h2>
        <p>Mantener activos en tu portfolio otorga beneficios pasivos permanentes según el valor total de tu inversión:</p>
        <ul>
            <li><strong>Tier I: Accionista (&gt; 300 ⛃):</strong> Otorga <strong>Prisa Minera I</strong>.</li>
            <li><strong>Tier II: Inversor (&gt; 1,500 ⛃):</strong> Otorga <strong>Prisa Minera II</strong>.</li>
            <li><strong>Tier III: Magnate (&gt; 5,000 ⛃):</strong> Otorga <strong>Prisa Minera II + Suerte</strong>.</li>
        </ul>

        <h2>CLIMA DE MERCADO GLOBAL</h2>
        <p>El sistema analiza la tendencia financiera cada 15 minutos, alterando el entorno de juego según el sentimiento del mercado:</p>
        <div className="visual-ref-row">
            <img src={itemUrl + "firework_rocket.png"} alt="Bull" />
            <p><strong>🚀 MERCADO ALCISTA (BULL):</strong> Crecimiento superior al 15%. Cultivos y granjas x3 veces más rápidas. Activación de Double XP y Double Drops en todo el servidor.</p>
        </div>
        <div className="visual-ref-row">
            <img src={itemUrl + "barrier.png"} alt="Bear" />
            <p><strong>📉 MERCADO BAJISTA (BEAR):</strong> Caída superior al 10%. Mobs +20% de daño. **Botín de Pánico:** 5% de probabilidad de que cualquier mob suelte Esmeraldas, Oro o Diamantes.</p>
        </div>

        <h2>EVENTOS ESPECIALES</h2>
        <p><strong>El Lobo de BlockStreet:</strong> Cada Domingo a las 20:00 ES, el jugador con mayor beneficio neto semanal gana el **50% de todas las comisiones** acumuladas.</p>
        <p><strong>Bote de Diamante:</strong> Cada hora se reparte un airdrop de Coins. Tu probabilidad de ganar aumenta según la cantidad de shares de DIAMANTE que poseas.</p>
      </>
    )
  },
  forja: {
    title: "LA FORJA",
    content: (
      <>
        <div className="wiki-section-intro">
          <p>La Forja Ancestral es el sistema de prestigio supremo del servidor. Aquí es donde transformas tus <strong>FLANITES</strong> <InlineIcon src={flaniteIcon} className="flanite-icon" /> en artefactos que rompen las leyes fundamentales de Minecraft.</p>
        </div>

        <div className="wiki-infobox">
            <div className="infobox-title">Catálogo de Prestigio</div>
            <div className="infobox-image">
                <img src={flaniteIcon} alt="Flanite" className="mc-pixelated" />
            </div>
            <div className="infobox-data">
                <div className="data-row"><span className="label">Moneda de Élite</span><span className="value">FLANITES</span></div>
                <div className="data-row"><span className="label">Obtención</span><span className="value">Quema de Netherite</span></div>
                <div className="data-row"><span className="label">Categoría</span><span className="value">Mejoras Eternas</span></div>
            </div>
        </div>

        <h2>SISTEMA DE FLANITES <InlineIcon src={flaniteIcon} className="flanite-icon" /></h2>
        <p>Los <strong>FLANITES</strong> son la representación física de tu prestigio en el Nexo. Se obtienen mediante la <strong>Quema de Netherite</strong> en la bolsa de valores. Al quemar tus acciones, las eliminas permanentemente del mercado, reduciendo el supply y disparando el valor del mineral para el resto de la comunidad.</p>

        <h2>CATÁLOGO DE ARTEFACTOS</h2>
        <p>Puedes forjar los siguientes beneficios desde el dashboard web utilizando tus <strong>FLANITES</strong> <InlineIcon src={flaniteIcon} className="flanite-icon" />:</p>

        <h3>MEJORAS PERMANENTES (ETERNAS)</h3>
        <div className="visual-ref-row">
            <img src={itemUrl + "totem_of_undying.png"} alt="Soul" />
            <p><strong>El <span className="text-highlight">Vínculo del Alma</span> (3500 <InlineIcon src={flaniteIcon} className="flanite-icon" />):</strong> Te otorga el <code>KeepInventory</code> perpetuo. Tu inventario jamás volverá a caer al suelo ni podrá ser saqueado al morir.</p>
        </div>
        <div className="visual-ref-row">
            <img src={itemUrl + "experience_bottle.png"} alt="XP" />
            <p><strong>La <span className="text-highlight">Corona del Erudito</span> (2500 <InlineIcon src={flaniteIcon} className="flanite-icon" />):</strong> Activa el <code>KeepXP</code> permanente. Conserva todos tus niveles de experiencia intactos tras una derrota.</p>
        </div>

        <h3>CRISTALES DE ASCENSIÓN (XP GLOBAL)</h3>
        <p>Inyectan niveles instantáneos en tu cuenta global para maxear tus AuraSkills rápidamente:</p>
        <div className="loot-grid">
            <div className="loot-card">
                <img src={itemUrl + "end_crystal.png"} alt="Minor" />
                <div className="loot-content">
                    <h5>Cristal Menor</h5>
                    <span>+100 niveles. Coste: 300 <InlineIcon src={flaniteIcon} className="flanite-icon" />.</span>
                </div>
            </div>
            <div className="loot-card">
                <img src={itemUrl + "end_crystal.png"} alt="Major" />
                <div className="loot-content">
                    <h5>Cristal Mayor</h5>
                    <span>+300 niveles. Coste: 800 <InlineIcon src={flaniteIcon} className="flanite-icon" />.</span>
                </div>
            </div>
            <div className="loot-card">
                <img src={itemUrl + "end_crystal.png"} alt="Supreme" />
                <div className="loot-content">
                    <h5>Cristal Supremo</h5>
                    <span>+700 niveles. Coste: 1800 <InlineIcon src={flaniteIcon} className="flanite-icon" />.</span>
                </div>
            </div>
        </div>

        <h3>SUMINISTROS TÉCNICOS Y TEMPORALES</h3>
        <ul>
            <li><strong>Códice de Fábrica Maestro (400 <InlineIcon src={flaniteIcon} className="flanite-icon" />):</strong> Otorga 25 <span className="text-highlight">Puntos de Investigación</span> <InlineIcon src={itemUrl + "writable_book.png"} /> de forma instantánea.</li>
            <li><strong>Bolsa de Contrabandista (500 <InlineIcon src={flaniteIcon} className="flanite-icon" />):</strong> Inyecta un fardo de <span className="text-coin">10,000 Coins</span> <InlineIcon src={coinIcon} /> en tu cuenta del Survival.</li>
            <li><strong>Frasco de Retorno (300 <InlineIcon src={flaniteIcon} className="flanite-icon" />):</strong> Otorga <code>KeepInventory</code> temporal por 24 horas reales.</li>
            <li><strong>Frasco de Memoria (200 <InlineIcon src={flaniteIcon} className="flanite-icon" />):</strong> Otorga <code>KeepXP</code> temporal por 24 horas reales.</li>
        </ul>
      </>
    )
  },
  crates: {
    title: "CAJAS Y VOTOS",
    type: "component",
    component: "CrateList"
  },
  rpg: {
    title: "RPG Y COMBATE",
    content: (
      <>
        <div className="wiki-section-intro">
          <p>Tu personaje evoluciona asimétricamente. Dominar las AuraSkills permite enfrentarse a entidades que rompen las leyes fundamentales de Minecraft. Aquí, el entrenamiento constante se traduce en un poder bruto capaz de doblegar a cualquier boss de raid.</p>
        </div>

        <div className="wiki-infobox">
            <div className="infobox-title">Oso Bajista</div>
            <div className="infobox-image">
                <img src="https://minecraft.wiki/images/Polar_Bear_JE2_BE2.png" alt="Boss" className="mc-pixelated" />
            </div>
            <div className="infobox-data">
                <div className="data-row"><span className="label">Vida Total</span><span className="value">4,500 HP</span></div>
                <div className="data-row"><span className="label">Daño Base</span><span className="value">50 HP</span></div>
                <div className="data-row"><span className="label">Ubicación</span><span className="value">Mercado Negro</span></div>
                <div className="data-row"><span className="label">Tipo</span><span className="value">Raid Global</span></div>
            </div>
        </div>

        <h2>EVENTO: EL OSO BAJISTA</h2>
        <p>Este desafío global se dispara automáticamente ante un colapso económico masivo (Caída del mercado superior al 15%). El Oso tiene una salud inmensa de 4500 HP y la capacidad de invocar esbirros que congelan a sus víctimas.</p>
        <div className="visual-ref-row">
            <img src={blockUrl + "ice.png"} alt="Freeze" />
            <p><strong>Mecánica de Combate:</strong> Todos los participantes que registren más de un 5% de actividad (daño infligido o daño recibido como tanque) obtienen el <strong>mismo Cofre Épico</strong> con <span className="text-material">Netherite</span>, <span className="text-material">Diamantes</span> y <span className="text-coin">Oro</span>. Es un evento de cooperación absoluta.</p>
        </div>

        <h2>AURASKILLS: MAESTRÍA</h2>
        <p>Alcanzar el nivel 100 en una rama de habilidad te otorga estadísticas permanentes que te sitúan por encima de cualquier superviviente común:</p>
        <ul>
          <li><strong>Fuerza <InlineIcon src={itemUrl + "netherite_sword.png"} />:</strong> Incrementa tu daño final en un <strong>+40%</strong>. Rompe defensas pesadas con facilidad.</li>
          <li><strong>Salud <InlineIcon src={itemUrl + "apple.png"} />:</strong> Añade un total de <strong>+42 corazones</strong> de vida adicionales (2 barras de vida completas).</li>
          <li><strong>Toughness <InlineIcon src={itemUrl + "netherite_chestplate.png"} />:</strong> Reduce todo el daño recibido in un <strong>30%</strong>. Esencial para sobrevivir a los impactos del Oso.</li>
        </ul>

        <h2>ARSENAL CHAOS</h2>
        <p>Armas de grado militar con encantamientos que superan el límite permitido por el juego base:</p>
        <div className="visual-ref-row">
            <img src={itemUrl + "trident.png"} alt="Trident" />
            <p><strong>Tridente Caos:</strong> Empalamiento Nv. XV. El arma definitiva diseñada para aniquilar cualquier entidad acuática de un solo impacto. Posee Lealtad IX para un retorno instantáneo.</p>
        </div>
        <div className="visual-ref-row">
            <img src={itemUrl + "mace.png"} alt="Mace" />
            <p><strong>Maza Caos:</strong> Fisura Nv. VIII. Su impacto ignora por completo el blindaje pesado de los World Bosses, convirtiendo la netherite enemiga en papel.</p>
        </div>

        <AuraSkillsList />
      </>
    )
  },
  encantamientos: {
    title: "ENCICLOPEDIA DE ENCANTAMIENTOS",
    type: "component",
    component: "EnchantmentList"
  },
  protecciones: {
    title: "SEGURIDAD Y CLAIMS",
    content: (
      <>
        <div className="wiki-section-intro">
          <p>Tu territorio es sagrado. En Flancraft, utilizamos el sistema de <strong>ProtectionStones</strong> para garantizar que tus construcciones y cofres estén blindados contra cualquier intrusión o sabotaje.</p>
        </div>

        <div className="wiki-infobox">
            <div className="infobox-title">Fortaleza Suprema</div>
            <div className="infobox-image">
                <img src={blockUrl + "red_wool.png"} alt="Protection" className="mc-pixelated" />
            </div>
            <div className="infobox-data">
                <div className="data-row"><span className="label">Radio Máximo</span><span className="value">200 Bloques</span></div>
                <div className="data-row"><span className="label">Área Total</span><span className="value">401x401</span></div>
                <div className="data-row"><span className="label">Impuestos</span><span className="value">Solo Nvl. 5</span></div>
                <div className="data-row"><span className="label">Flags</span><span className="value">Personalizables</span></div>
            </div>
        </div>

        <h2>CATÁLOGO DE PROTECCIONES</h2>
        <p>Puedes adquirir tus piedras de protección en el menú <code>/coinshop</code> utilizando tus <InlineIcon src={coinIcon} /> <strong>Coins</strong>. Cada nivel aumenta drásticamente el área de cobertura:</p>
        
        <div className="wiki-protection-list">
            <div className="protection-row tier-common">
                <img src={blockUrl + "white_wool.png"} alt="L1" className="protection-icon" />
                <div className="protection-details">
                    <h4 style={{ color: '#ffffff' }}>Nivel 1 (Inicial)</h4>
                    <p>Radio <span className="text-highlight">25</span> bloques. Cubre un área de 51x51.</p>
                </div>
                <div className="protection-cost">
                    <span className="text-coin">Gratuito</span>
                </div>
            </div>

            <div className="protection-row tier-uncommon">
                <img src={blockUrl + "lime_wool.png"} alt="L2" className="protection-icon" />
                <div className="protection-details">
                    <h4 style={{ color: '#2ecc71' }}>Nivel 2 (Bronce)</h4>
                    <p>Radio <span className="text-highlight">75</span> bloques. Cubre un área de 151x151.</p>
                </div>
                <div className="protection-cost">
                    <span className="text-coin"><InlineIcon src={coinIcon} /> 600 Coins</span>
                </div>
            </div>

            <div className="protection-row tier-rare">
                <img src={blockUrl + "light_blue_wool.png"} alt="L3" className="protection-icon" />
                <div className="protection-details">
                    <h4 style={{ color: '#3498db' }}>Nivel 3 (Plata)</h4>
                    <p>Radio <span className="text-highlight">100</span> bloques. Cubre un área de 201x201.</p>
                </div>
                <div className="protection-cost">
                    <span className="text-coin"><InlineIcon src={coinIcon} /> 1,000 Coins</span>
                </div>
            </div>

            <div className="protection-row tier-epic">
                <img src={blockUrl + "purple_wool.png"} alt="L4" className="protection-icon" />
                <div className="protection-details">
                    <h4 style={{ color: '#9b59b6' }}>Nivel 4 (Oro)</h4>
                    <p>Radio <span className="text-highlight">150</span> bloques. Cubre un área de 301x301.</p>
                </div>
                <div className="protection-cost">
                    <span className="text-coin"><InlineIcon src={coinIcon} /> 1,900 Coins</span>
                </div>
            </div>

            <div className="protection-row tier-legendary">
                <img src={blockUrl + "red_wool.png"} alt="L5" className="protection-icon" />
                <div className="protection-details">
                    <h4 style={{ color: '#e74c3c' }}>Nivel 5 (Platino)</h4>
                    <p>Radio <span className="text-highlight">200</span> bloques. Cubre un área de 401x401.</p>
                </div>
                <div className="protection-cost">
                    <span className="text-coin"><InlineIcon src={coinIcon} /> 2,900 Coins</span>
                </div>
            </div>
        </div>

        <h2>COMANDOS ESENCIALES</h2>
        <p>Gestiona tu terreno directamente con estos comandos o a través de <code>/ps menu</code>:</p>
        <ul>
          <li><strong>/ps add [jugador]:</strong> Invita a un amigo a construir en tu zona.</li>
          <li><strong>/ps remove [jugador]:</strong> Revoca los permisos de un miembro.</li>
          <li><strong>/ps sethome:</strong> Define el punto de teletransporte de tu claim.</li>
          <li><strong>/ps home [nombre]:</strong> Viaja instantáneamente a tus tierras.</li>
          <li><strong>/ps info:</strong> Muestra el ID, dueños y flags activas de la zona.</li>
          <li><strong>/ps view:</strong> Materializa los bordes visuales de tu protección.</li>
          <li><strong>/ps name [nombre]:</strong> Ponle un nombre personalizado a tu claim.</li>
          <li><strong>/ps hide / unhide:</strong> Oculta o muestra el bloque físico de protección.</li>
        </ul>

        <h2>BANDERAS (FLAGS) Y SEGURIDAD</h2>
        <p>Las flags te permiten definir qué sucede dentro de tu propiedad. Usa <code>/ps flag [nombre] [allow/deny]</code>:</p>
        <div className="visual-ref-row">
            <img src={itemUrl + "diamond_sword.png"} alt="PVP" />
            <p><strong>pvp deny:</strong> Desactiva el combate entre jugadores. Tu base será una zona de paz absoluta.</p>
        </div>
        <div className="visual-ref-row">
            <img src={itemUrl + "chest_minecart.png"} alt="Chests" />
            <p><strong>chest-access deny:</strong> Nadie (excepto dueños/miembros) podrá abrir cofres, hornos o barriles.</p>
        </div>
        <div className="visual-ref-row">
            <img src={blockUrl + "tnt_side.png"} alt="TNT" />
            <p><strong>tnt deny:</strong> Bloquea por completo las explosiones de dinamita en tu terreno.</p>
        </div>
        <div className="visual-ref-row">
            <img src={blockUrl + "creeper_head.png"} alt="Creeper" />
            <p><strong>creeper-explosion deny:</strong> Evita que los creepers destruyan tus estructuras.</p>
        </div>

        <h2>MANTENIMIENTO E IMPUESTOS</h2>
        <p>Para mantener la economía saludable y evitar el "land-claiming" masivo de bases abandonadas:</p>
        <ul>
          <li><strong>Impuesto de Prestigio:</strong> Las protecciones de Nivel 5 (Radio 200) tienen un coste de mantenimiento semanal. Asegúrate de tener saldo en tu cuenta o el claim podría expirar.</li>
          <li><strong>Auto-limpieza:</strong> Las protecciones de jugadores que no se conecten en más de 30 días podrán ser eliminadas automáticamente por el sistema.</li>
        </ul>
      </>
    )
  }
};
