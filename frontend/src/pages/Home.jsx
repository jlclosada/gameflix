import { Link } from "react-router-dom";
import { Icon } from "../components/Icons.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function Home({ onAuth }) {
  const { user } = useAuth();

  return (
    <div>
      <section className="hero">
        <span className="eyebrow">
          <span className="dot" />
          Tier lists de videojuegos
        </span>
        <h1>
          Ordena tus juegos.
          <br />
          Descubre los <span className="grad">más queridos</span>.
        </h1>
        <p>
          Arrastra portadas a tus tiers S, A, B, C, D, publica tu ranking y deja
          que la comunidad revele qué juegos son leyenda.
        </p>
        <div className="hero-actions">
          <Link to="/create" className="btn">
            <Icon.Sparkles style={{ width: 18, height: 18 }} />
            Crear tier list
          </Link>
          <Link to="/games" className="btn secondary">
            <Icon.Search style={{ width: 18, height: 18 }} />
            Explorar juegos
          </Link>
          {!user && (
            <button className="ghost" onClick={() => onAuth?.("register")}>
              Crear cuenta gratis
            </button>
          )}
        </div>
      </section>

      <section className="features">
        <Feature
          icon={<Icon.Layers />}
          title="Arrastra y ordena"
          text="Elige juegos del catálogo y colócalos en cada tier con un diseño fluido y táctil."
          delay={0.05}
        />
        <Feature
          icon={<Icon.Sparkles />}
          title="Publica con tu nombre"
          text="Inicia sesión y comparte tu tier list. Quedará registrada con tu usuario."
          delay={0.12}
        />
        <Feature
          icon={<Icon.Trophy />}
          title="Ranking global"
          text="Cada publicación alimenta las estadísticas de los juegos más amados de la comunidad."
          delay={0.19}
        />
      </section>
    </div>
  );
}

function Feature({ icon, title, text, delay }) {
  return (
    <div className="feature" style={{ animationDelay: `${delay}s` }}>
      <div className="ficon">{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
