# 🎮 GameTier

Aplicación para crear **tier lists de videojuegos** (estilo tiermaker.com),
publicarlas y generar estadísticas de los juegos más queridos por la comunidad.

El proyecto tiene tres partes:

| Carpeta       | Qué es                              | Stack                     |
| ------------- | ----------------------------------- | ------------------------- |
| `downloader/` | Descarga portadas y datos de juegos | Python + Steam (sin key)  |
| `backend/`    | API REST + base de datos            | Node/Express + PostgreSQL |
| `frontend/`   | Editor de tier lists y estadísticas | React + Vite              |

---

## 1. Descargador de imágenes (`downloader/`)

Obtiene metadatos y portadas de videojuegos usando **endpoints públicos de
Steam** (Steam Charts, Steam Store appdetails y appreviews). **No requiere
registro ni API key.** Las portadas verticales (estilo carátula) son ideales
para tier lists.

```bash
cd downloader
python -m venv .venv && source .venv/bin/activate   # opcional
pip install -r requirements.txt

# Descargar ~150 juegos populares con sus portadas
python steam_downloader.py --limit 150

# Más opciones
python steam_downloader.py --limit 300 --sources mostplayed,topsellers,newreleases
python steam_downloader.py --limit 100 --no-reviews   # más rápido, sin rating
python steam_downloader.py --limit 100 --no-images    # solo metadatos
```

Fuentes disponibles (`--sources`): `mostplayed`, `topsellers`, `newreleases`,
`specials`.

Genera:

- `downloader/data/games.json` — manifiesto con todos los datos.
- `downloader/data/images/` — portadas descargadas.

> El backend usa la **URL** de la portada de Steam directamente, así que las
> imágenes locales son opcionales (útiles como respaldo/offline).
>
> El descargador usa el almacén de certificados del sistema operativo
> (`truststore`) para evitar errores de TLS con algunos builds de Python.

---

## 2. Backend (`backend/`)

API REST con PostgreSQL.

```bash
cd backend
npm install
cp .env.example .env          # configura DATABASE_URL

npm run init-db               # crea las tablas
npm run seed                  # carga ../downloader/data/games.json en la BBDD
npm run dev                   # arranca en http://localhost:4000
```

### Endpoints

| Método | Ruta                 | Descripción                                 |
| ------ | -------------------- | ------------------------------------------- |
| GET    | `/api/health`        | Estado del servicio                         |
| GET    | `/api/games`         | Catálogo (`?search=&genre=&limit=&offset=`) |
| GET    | `/api/games/genres`  | Géneros disponibles                         |
| POST   | `/api/tierlists`     | Publicar una tier list                      |
| GET    | `/api/tierlists`     | Listar tier lists publicadas                |
| GET    | `/api/tierlists/:id` | Ver una tier list con sus juegos            |
| GET    | `/api/stats`         | Estadísticas agregadas                      |

### Estadísticas

Cada juego colocado en un tier guarda una puntuación normalizada (0-100) según
la posición del tier. Con eso se calcula:

- **Más queridos** — mayor puntuación media.
- **Más populares** — aparecen en más listas.
- **Más divisivos** — mayor dispersión de opiniones.
- **Distribución por tier**.

---

## 3. Frontend (`frontend/`)

```bash
cd frontend
npm install
npm run dev                   # http://localhost:5173 (proxy a la API en :4000)
```

Páginas:

- **Crear** — editor con arrastrar y soltar para colocar juegos en tiers.
- **Explorar** — tier lists publicadas.
- **Estadísticas** — rankings de la comunidad.

Para producción, configura `VITE_API_URL` con la URL del backend desplegado.

---

## 4. Despliegue gratuito (Render + PostgreSQL)

El archivo [`render.yaml`](render.yaml) define la base de datos, la API y el
frontend como un único _Blueprint_.

1. Sube el repositorio a GitHub.
2. En [Render](https://render.com): **New → Blueprint** y selecciona el repo.
3. Render creará la base de datos, la API y el sitio estático.
4. En el servicio `tierlist-web`, pon la variable `VITE_API_URL` con la URL de
   `tierlist-api` (p. ej. `https://tierlist-api.onrender.com`) y vuelve a
   desplegar.
5. Carga los juegos en la base de datos de producción una vez:

   ```bash
   # con la DATABASE_URL externa de Render en tu .env local
   cd backend && npm run seed
   ```

> El plan gratuito de Render duerme los servicios tras inactividad; el primer
> acceso puede tardar unos segundos.

### Alternativas gratuitas

- **Base de datos**: Supabase o Neon (Postgres gratis) → usa su `DATABASE_URL`.
- **Frontend**: Vercel o Netlify (`build` = `npm run build`, salida = `dist`).
