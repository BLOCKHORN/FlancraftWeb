import { Link } from "react-router-dom";
import Seo from "../SEO/Seo";
import {
  buildBreadcrumbJsonLd,
  buildCanonical,
  buildFaqJsonLd,
  buildOrganizationJsonLd,
  buildTitle,
} from "../../lib/seo/siteSeo";
import "../../styles/components/Landpage/_server-landing.scss";

const faqItems = [
  {
    question: "¿FlanCraft es compatible con Java y Bedrock?",
    answer:
      "Sí. FlanCraft está planteado para dar soporte tanto a jugadores de Java como de Bedrock, facilitando una comunidad más grande y conectada.",
  },
  {
    question: "¿Qué ofrece FlanCraft además de un Survival normal?",
    answer:
      "Además del modo Survival, FlanCraft trabaja sistemas de economía, progresión, logros, rangos, recompensas web y eventos para que el avance tenga más profundidad.",
  },
  {
    question: "¿Dónde puedo ver noticias, rankings y sanciones?",
    answer:
      "Dentro de la propia web puedes consultar noticias, leaderboards, el tribunal público y el perfil de jugadores para tener una visión más completa de la comunidad.",
  },
];

const pillars = [
  {
    title: "Survival con progreso real",
    text: "Economía, niveles, objetivos, recompensas y sensación de avance constante en una experiencia enfocada a largo plazo.",
  },
  {
    title: "Comunidad española activa",
    text: "Un entorno en español pensado para jugadores que quieren una comunidad cercana, eventos y una identidad clara del servidor.",
  },
  {
    title: "Web conectada con el juego",
    text: "Perfiles, noticias, rankings, voto, tienda y sistemas de progreso sincronizados para que el jugador sienta continuidad dentro y fuera del servidor.",
  },
];

const sections = [
  {
    title: "Qué hace diferente a FlanCraft",
    text: "Muchos proyectos se quedan solo en una lista de plugins o en un mapa bonito. FlanCraft busca una experiencia más cohesionada: progresión visible, economía con peso, sistemas web enlazados al juego y una capa de comunidad que da más contexto al servidor.",
  },
  {
    title: "Ideal si buscas un servidor de Minecraft español estable",
    text: "Si tu intención es entrar a un servidor donde puedas quedarte, crecer y tener objetivos claros, esta propuesta está pensada para eso. No se trata solo de conectarte un rato, sino de construir una trayectoria dentro del servidor.",
  },
  {
    title: "Un ecosistema más completo que la típica home",
    text: "La web pública enseña noticias, leaderboards, perfiles y sanciones para que el proyecto transmita transparencia, actividad y continuidad. Eso también mejora la percepción del jugador antes incluso de entrar al servidor.",
  },
];

export default function ServerMinecraftLanding() {
  const canonical = buildCanonical("/servidor-minecraft-espanol");

  return (
    <>
      <Seo
        title={buildTitle("Servidor Minecraft Español")}
        description="Descubre FlanCraft, servidor de Minecraft español compatible con Java y Bedrock, con Survival, economía, eventos, progreso y comunidad activa."
        canonical={canonical}
        jsonLd={[
          buildOrganizationJsonLd(),
          buildBreadcrumbJsonLd([
            { name: "Inicio", item: buildCanonical("/") },
            { name: "Servidor Minecraft Español", item: canonical },
          ]),
          buildFaqJsonLd(faqItems),
        ]}
      />

      <main className="server-landing">
        <section className="server-landing__hero">
          <div className="server-landing__heroContent">
            <p className="server-landing__eyebrow">FlanCraft • Comunidad española de Minecraft</p>
            <h1>Servidor Minecraft español para Java y Bedrock</h1>
            <p className="server-landing__lead">
              FlanCraft es un servidor de Minecraft español orientado a Survival, economía,
              progreso y comunidad. Está pensado para jugadores que buscan una experiencia con
              más recorrido, objetivos claros y una web conectada al juego.
            </p>
            <div className="server-landing__actions">
              <Link to="/" className="server-landing__button server-landing__button--primary">
                Ir a la portada
              </Link>
              <Link to="/tienda" className="server-landing__button">
                Ver tienda
              </Link>
              <Link to="/voto" className="server-landing__button">
                Votar y conseguir recompensas
              </Link>
            </div>
          </div>
        </section>

        <section className="server-landing__grid" aria-label="Pilares principales del servidor">
          {pillars.map((item) => (
            <article key={item.title} className="server-landing__card">
              <h2>{item.title}</h2>
              <p>{item.text}</p>
            </article>
          ))}
        </section>

        <section className="server-landing__content">
          {sections.map((section) => (
            <article key={section.title} className="server-landing__contentBlock">
              <h2>{section.title}</h2>
              <p>{section.text}</p>
            </article>
          ))}
        </section>

        <section className="server-landing__faq" aria-labelledby="landing-faq-title">
          <h2 id="landing-faq-title">Preguntas frecuentes</h2>
          <div className="server-landing__faqList">
            {faqItems.map((faq) => (
              <article key={faq.question} className="server-landing__faqItem">
                <h3>{faq.question}</h3>
                <p>{faq.answer}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="server-landing__links" aria-labelledby="landing-links-title">
          <h2 id="landing-links-title">Explora más de FlanCraft</h2>
          <div className="server-landing__linkGrid">
            <Link to="/leaderboards">Leaderboards del servidor</Link>
            <Link to="/news">Noticias y actualizaciones</Link>
            <Link to="/tribunal">Tribunal público</Link>
            <Link to="/tienda">Tienda oficial</Link>
          </div>
        </section>
      </main>
    </>
  );
}
