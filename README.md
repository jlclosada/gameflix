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

## 4. Despliegue gratuito (Render + Supabase)

Coste **0€**: la API y el frontend van en **Render** (plan free) y la base de
datos PostgreSQL en **Supabase** (gratis y sin caducidad). El archivo
[`render.yaml`](render.yaml) define la API y el frontend como un _Blueprint_.

### 4.1. Base de datos en Supabase

1. Crea una cuenta en [supabase.com](https://supabase.com) y un nuevo proyecto
   (elige una contraseña para la base de datos y guárdala).
2. Ve a **Project Settings → Database → Connection string → URI**.
3. Copia la cadena de **Session pooler** (puerto `5432`). Tendrá esta forma:

   ```
   postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-eu-...pooler.supabase.com:5432/postgres
   ```

   Sustituye `[YOUR-PASSWORD]` por la contraseña de tu proyecto. Esta es tu
   `DATABASE_URL`.

### 4.2. Backend + frontend en Render

1. En [Render](https://render.com): **New → Blueprint** y selecciona el repo.
2. Render leerá `render.yaml` y creará `tierlist-api` y `tierlist-web`.
3. En `tierlist-api` → **Environment**, pega tu `DATABASE_URL` de Supabase
   (la variable ya aparece como `sync: false`). Deja `PGSSL=true`.
4. Cuando la API esté _Live_, en `tierlist-web` → **Environment** pon
   `VITE_API_URL` con la URL de la API (p. ej.
   `https://tierlist-api.onrender.com`) y vuelve a desplegar el frontend.

### 4.3. Cargar los juegos en producción (una vez)

```bash
cd downloader && python steam_downloader.py --limit 200   # genera games.json
cd ../backend
DATABASE_URL="<TU_DATABASE_URL_DE_SUPABASE>" PGSSL=true npm run seed
```

> El plan gratuito de Render duerme los servicios tras ~15 min de inactividad;
> el primer acceso luego tarda unos segundos en despertar. Supabase no caduca.

### Alternativas

- **Base de datos**: [Neon](https://neon.tech) también ofrece Postgres gratis
  sin caducidad → usa su `DATABASE_URL` igual que con Supabase.
- **Frontend**: Vercel o Netlify (`build` = `npm run build`, salida = `dist`).
