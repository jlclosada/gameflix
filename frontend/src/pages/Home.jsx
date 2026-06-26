import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div>
      <section className="hero">
        <h1>Crea tier lists de videojuegos</h1>
        <p>
          Arrastra portadas de juegos a tus tiers S, A, B, C, D, publícalas y
          descubre qué juegos son los más queridos por la comunidad.
        </p>
        <div className="hero-actions">
          <Link to="/create" className="btn">
            Crear tier list
          </Link>
          <Link to="/browse" className="btn secondary">
            Explorar publicadas
          </Link>
        </div>
      </section>

      <section className="card-grid">
        <div className="card">
          <h3>1. Arrastra y ordena</h3>
          <p className="meta">
            Elige juegos del catálogo y colócalos en cada tier según tu gusto.
          </p>
        </div>
        <div className="card">
          <h3>2. Publica</h3>
          <p className="meta">
            Comparte tu tier list con un título y categoría para que otros la
            vean.
          </p>
        </div>
        <div className="card">
          <h3>3. Estadísticas</h3>
          <p className="meta">
            Cada publicación alimenta el ranking global de juegos más queridos.
          </p>
        </div>
      </section>
    </div>
  );
}
