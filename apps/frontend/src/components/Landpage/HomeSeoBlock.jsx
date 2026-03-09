import { Link } from "react-router-dom";

const quickLinks = [
  { to: "/servidor-minecraft-espanol", label: "Servidor Minecraft español" },
  { to: "/leaderboards", label: "Leaderboards" },
  { to: "/news", label: "Noticias" },
  { to: "/tienda", label: "Tienda" },
];

export default function HomeSeoBlock() {
  return (
    <section className="home-seo-block" aria-labelledby="home-seo-title">
      <div className="home-seo-block__inner">
        <p className="home-seo-block__eyebrow">Comunidad • Survival • Java + Bedrock</p>
        <h2 id="home-seo-title">Servidor de Minecraft español para jugar en Java y Bedrock</h2>
        <p className="home-seo-block__text">
          FlanCraft es una comunidad de Minecraft en español centrada en Survival, progreso,
          economía, niveles, rangos, eventos y recompensas conectadas entre la web y el juego.
          Si estás buscando un servidor de Minecraft español activo y con identidad propia,
          aquí tienes una base sólida para empezar y seguir progresando.
        </p>
        <div className="home-seo-block__links">
          {quickLinks.map((link) => (
            <Link key={link.to} to={link.to} className="home-seo-block__chip">
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
