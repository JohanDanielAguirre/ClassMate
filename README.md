# ClassMate

Una aplicación web básica con Express.js que ahora incluye persistencia en MongoDB, autenticación con JWT y manejo de roles (monitor y estudiante).

## Novedades

- Persistencia real en MongoDB usando Mongoose
- Autenticación con JWT (token en cookie httpOnly)
- Dos roles de usuario: monitor y estudiante
- Selección de rol al registrarse (desde la UI o querystring)
- Preparado para Docker y Docker Compose (app + MongoDB)

## Características existentes

- Registro de usuarios con confirmación de contraseña
- Inicio de sesión con autenticación
- UI moderna con fondos en gradiente
- Validación básica de formularios
- Diseño responsive

## Screenshots

- Ver imágenes en la versión anterior de este archivo.

## Requisitos

- Node.js 18+
- MongoDB 6+ (local o via Docker)

## Variables de entorno

Copia `.env.example` a `.env` y ajusta según necesites:

- `PORT` (default 3000)
- `MONGO_URI` (local: `mongodb://localhost:27017/classmate` | Docker Compose: `mongodb://mongo:27017/classmate`)
- `JWT_SECRET` (cámbialo por un secreto fuerte en producción)
- `JWT_EXPIRES_IN` (por ejemplo `1d`)
- `NODE_ENV` (`production` en contenedores)

## Instalación local

```bash
npm install
npm start
```

Por defecto, el servidor arranca en `http://localhost:3000`. Asegúrate de tener MongoDB corriendo localmente (puerto 27017) o ajusta `MONGO_URI`.

## Uso

- Página de login: `GET /` (sirve `public/login.html`)
- Página de registro: `GET /register` (sirve `public/register.html`)
- Seleccionar rol desde login: botones "Estudiante" y "Monitor" te llevan a `/register?role=...`
- Registro: `POST /register` (campos: `username`, `password`, `confirmPassword`, `role`)
- Login: `POST /login` (campos: `username`, `password`)
- Dashboard protegido: `GET /dashboard` (requiere cookie `token`)
- Usuario actual (JSON): `GET /me` (requiere cookie `token`)
- Logout: `GET /logout`

Notas:
- Las contraseñas se almacenan con hashing usando `bcrypt`.
- El token JWT se envía en una cookie `httpOnly` llamada `token`.
- Las rutas protegidas validan el token con `jsonwebtoken`.

## Docker

Build de la imagen y arranque manual de la app:

```bash
docker build -t classmate .
docker run -p 3000:3000 --env-file .env classmate
```

## Docker Compose (recomendado)

Levanta aplicación + MongoDB con un solo comando:

```bash
docker compose up --build
```

- App: `http://localhost:3000`
- MongoDB: expuesto en `localhost:27017` (volumen `mongodata` para persistencia)

Para detener:

```bash
docker compose down
```

## CI con GitHub Actions

Este repo incluye un workflow de CI que levanta el stack con Docker Compose y ejecuta un smoke test end-to-end:

- Archivo: `.github/workflows/ci.yml`
- Disparadores: push a `main`/`master`, Pull Requests y ejecución manual (Actions > CI - Docker Compose Smoke Test > Run workflow)
- Pasos principales:
  - `docker compose up -d --build` (app + MongoDB)
  - Espera a que `GET /` responda `200`
  - Registra un usuario aleatorio
  - Hace login y verifica que se reciba la cookie JWT
  - Accede a `/dashboard` y espera `200`
  - En caso de fallo, muestra logs de `app` y `mongo`
  - Siempre hace `docker compose down -v`

Personalización:
- Ajusta ramas en `on.push.branches`.
- Si quieres usar secretos en lugar de variables in-file, define `JWT_SECRET` como Secret de repo y pásalo vía `env:` o un compose override.
- Para acelerar builds, puedes agregar cache de Docker buildx.

## Estructura del proyecto

```
ClassMate/
├── server.js                 # Servidor Express, rutas, JWT y conexión Mongo
├── public/
│   ├── login.html            # Login con enlaces para registro por rol
│   ├── register.html         # Registro con selector de rol (monitor/estudiante)
│   └── css/
│       └── style.css         # Estilos
├── Dockerfile                # Imagen de la app
├── docker-compose.yml        # App + MongoDB
├── .dockerignore
├── .env.example              # Ejemplo de variables de entorno
├── package.json              # Dependencias
└── README.md                 # Documentación
```

## Seguridad y siguientes pasos

Para producción considera:
- Usar HTTPS y `secure: true` en la cookie (ya se habilita con `NODE_ENV=production`)
- Rotación y almacenamiento seguro del `JWT_SECRET`
- Validación más estricta (tamaño de password, política de usuarios)
- Rate limiting y protección CSRF según el flujo
- Integrar una base de datos gestionada (Atlas/Azure/etc.)
