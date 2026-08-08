# TecRural

Aplicación web / PWA para mostrar **información local de clima y riego orientativo**
a agricultores del **Altiplano de Granada** y la **Costa Tropical**, captar contactos
interesados y facilitar el contacto por WhatsApp con TecRural.

Objetivo: una herramienta sencilla, rápida y profesional que sirva para **validar el
interés real** antes de invertir más en el proyecto.

## Características

- Selección de zona y municipio (Altiplano: Huéscar, Baza, Puebla de Don Fadrique,
  Castril, Orce, Galera, Cúllar… / Costa Tropical: Almuñécar, La Herradura,
  Salobreña, Motril…).
- Selección de cultivo (olivar, almendro, pistacho, hortícolas, aguacate,
  chirimoyo, mango, viñedo, otros).
- **Tiempo actual y previsión a 3 días** con estrategia híbrida: **AEMET**
  (predicción oficial por municipio) para hoy y condiciones actuales, y
  **Open-Meteo** (sin API key) para la tendencia de los próximos días, los mm
  de lluvia y como respaldo.
- **Riego calculado**: cantidad de agua (litros) según evapotranspiración
  (ET0 FAO-56 de Open-Meteo × coeficiente de cultivo Kc por etapa fenológica)
  menos la lluvia prevista, y **mejores horas** para regar según el clima
  horario (calor, viento y lluvia).
- Indicadores de **riesgo de calor, viento y sequedad**.
- **Recomendación orientativa de riego** adaptada al cultivo:
  - "No parece necesario regar hoy".
  - "Conviene revisar humedad del suelo".
  - "Riego recomendado si el suelo está seco".
  - "Evitar riego por viento/calor extremo".
- Formulario de captación de contactos (nombre, teléfono, municipio, cultivo,
  tamaño de finca y problema principal) con validación y protección anti-spam.
- Botón de **WhatsApp** configurable por variable de entorno.
- Sección de **servicios y precios orientativos**.
- **Panel de administración** (`/admin`) para consultar y exportar los contactos.
- **PWA** instalable en el móvil.
- Datos de respaldo (*mock*) si la API meteorológica no responde.
- Diseño responsive, pensado para móvil y lenguaje sencillo para agricultores.

## Stack

- **Next.js 14** (App Router) + **React 18** + **TypeScript**.
- **Neon (PostgreSQL)** como base de datos de contactos, con **SQLite**
  (`data/tecrural.db`) como respaldo local si no hay `DATABASE_URL`.
- **AEMET OpenData** (datos oficiales por municipio, API key gratuita) +
  **Open-Meteo** como respaldo y para la previsión a varios días.
- CSS propio limpio, sin framework de UI.
- PWA manual (manifest + service worker + iconos generados sin dependencias).

## Estructura

```
tecrural/
├── public/
│   ├── manifest.webmanifest   # manifest PWA
│   ├── sw.js                  # service worker (caché offline básica)
│   ├── favicon.svg
│   └── icons/                 # iconos generados (npm run icons)
├── scripts/
│   └── generate-icons.mjs     # genera los PNG del PWA sin dependencias
├── data/                      # SQLite local (solo respaldo sin DATABASE_URL)
├── src/
│   ├── app/
│   │   ├── layout.tsx         # layout, metadatos, registro del SW
│   │   ├── page.tsx           # página principal
│   │   ├── globals.css        # estilos
│   │   ├── admin/page.tsx     # panel de administración
│   │   └── api/
│   │       ├── weather/       # proxy del tiempo (caché 15 min)
│   │       ├── leads/         # guardar contactos (POST)
│   │       └── admin/         # sesión y listado de contactos
│   ├── components/            # Header, WeatherWidget, LeadForm, Services…
│   ├── lib/
│   │   ├── db.ts              # Neon (PostgreSQL) o SQLite (respaldo local)
│   │   ├── weather.ts         # Open-Meteo + mock de respaldo
│   │   ├── recommendations.ts # riesgos y recomendación de riego
│   │   ├── municipalities.ts  # zonas y municipios con coordenadas
│   │   ├── crops.ts           # cultivos, tamaños y problemas
│   │   └── wa.ts              # enlaces de WhatsApp y nombre del negocio
│   └── types.ts
├── .env.example
└── README.md
```

## Instalación en local

Requisitos: **Node.js ≥ 18.18**.

```bash
git clone <tu-repo> tecrural && cd tecrural
npm install

# Configura tus variables (número de WhatsApp, contraseña del panel…)
cp .env.example .env.local
#   edita .env.local y cambia WHATSAPP_NUMBER y ADMIN_PASSWORD
#   (opcional) define DATABASE_URL para usar Neon en vez de SQLite local

npm run dev
```

Abre <http://localhost:3000>.

> Nota: si `npm install` no compila `better-sqlite3` (instaladores bloqueados en npm ≥ 10),
> ejecuta: `npm install-scripts approve better-sqlite3 && npm rebuild better-sqlite3`.
>
> `better-sqlite3` solo es necesario para el respaldo local sin `DATABASE_URL`;
> si siempre usas Neon puedes quitarlo de `package.json`.

## Configurar el número de WhatsApp

En `.env.local` (o en las variables de entorno del VPS):

```ini
WHATSAPP_NUMBER=34600123456   # +34 600 123 456, sin "+", espacios ni guiones
BUSINESS_NAME=TecRural
```

El botón "Hablar con TecRural" y los mensajes precargados se generan a partir de
este número mediante enlaces `wa.me`.

## Dónde se guardan los contactos

En **Neon (PostgreSQL)**: la app lee `DATABASE_URL` (el driver crea la tabla
`leads` automáticamente en la primera consulta). Es la base de datos de
producción: está en la nube, es gestionada y con **backups automáticos**.

Si `DATABASE_URL` no está definida, la app usa como respaldo una **SQLite**
local en:

```
data/tecrural.db
```

Ese archivo se crea solo y está en `.gitignore` (no lo subas a Git). La tabla
y los datos son equivalentes en ambos motores, así que cambiar entre uno y
otro solo requiere definir o quitar `DATABASE_URL`.

## Panel de administración

- Entra en `/admin` con la contraseña de `ADMIN_PASSWORD`.
- Verás todos los contactos recibidos, podrás **eliminarlos** y **exportarlos a CSV**.
- La sesión dura 12 horas. Cambia `ADMIN_PASSWORD` antes de desplegar.

## Despliegue en un VPS

Suponiendo un VPS con Ubuntu, Node 20/22 y Nginx:

### 1. Preparar la máquina

```bash
sudo apt update && sudo apt install -y nginx
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

### 2. Subir la app y compilar

```bash
cd /var/www
git clone <tu-repo> tecrural
cd tecrural

npm install
# si hace falta: npm install-scripts approve better-sqlite3 && npm rebuild better-sqlite3

# variables de producción
cp .env.example .env.local
nano .env.local
#   DATABASE_URL=postgresql://... (Neon, recomendado)
#   WHATSAPP_NUMBER=...
#   ADMIN_PASSWORD=una-clave-fuerte
#   NEXT_PUBLIC_SITE_URL=https://tu-dominio.com

npm run build
npm start          # comprueba que arranca en el puerto 3000 (Ctrl+C)
```

### 3. Gestión con pm2

```bash
pm2 start npm --name tecrural -- start
pm2 save
pm2 startup       # ejecuta el comando que te indique para iniciar en el arranque
```

### 4. Nginx como proxy inverso

Crea `/etc/nginx/sites-available/tecrural`:

```nginx
server {
    listen 80;
    server_name tu-dominio.com www.tu-dominio.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/tecrural /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Para HTTPS usa **Certbot**:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d tu-dominio.com -d www.tu-dominio.com
```

### Actualizar la app

```bash
cd /var/www/tecrural
git pull
npm install
npm run build
pm2 restart tecrural
```

## API meteorológica

La app usa una **estrategia híbrida**: cada fuente aporta lo que hace mejor y
nunca se queda sin datos.

| Dato | Fuente |
| --- | --- |
| Condiciones actuales (temp, humedad, viento) | **AEMET** (oficial) → Open-Meteo |
| Previsión de hoy (máx/mín, probabilidad, cielo) | **AEMET** (oficial) → Open-Meteo |
| Previsión días 2 y 3 (tendencia) | **Open-Meteo** |
| Lluvia en mm (hoy y próximos días) | **Open-Meteo** (+ suma horaria AEMET) |

Cómo funciona en la práctica:

1. **Open-Meteo** se consulta siempre (fiable, sin API key): es la columna
   vertebral de la previsión a varios días y de los mm de lluvia.
2. **AEMET** se consulta en paralelo (si hay `AEMET_API_KEY`): aporta la
   predicción oficial del municipio para hoy y las condiciones actuales. Como
   AEMET tiene límites de peticiones, si no responde (p. ej. HTTP 429) la app
   usa sin problema los datos de Open-Meteo.
3. Si ninguna API responde, se muestran **datos orientativos** (mock) con la
   etiqueta "Datos orientativos".

La UI indica siempre la fuente: "Datos oficiales AEMET", "Open-Meteo",
"AEMET + Open-Meteo" o "Datos orientativos".

Notas:
- La caché en memoria es de 15 minutos (configurable en `src/lib/weather.ts`).
- AEMET requiere API key gratuita (<https://opendata.aemet.es/centrodedescargas/altaUsuario>)
  y usa el código oficial de cada municipio (`src/lib/municipalities.ts`).
- AEMET limita el número de peticiones (~30/min y cupo diario); la caché y el
  respaldo evitan que se note. Para cambiar el comportamiento edita
  `src/lib/weather.ts` y `src/lib/aemet.ts`.

## Idiomas y textos

Los textos de la app están en español. Las frases clave ("ayuda a decidir",
"orientativo", "seguimiento", "mejor información local", "detección temprana de
riesgos") se usan deliberadamente para no prometer ahorros ni rendimientos
garantizados. El aviso legal aparece de forma visible en la web.

## Seguridad y límites (MVP)

- Validación de formulario en cliente y servidor.
- Protección anti-spam: campo oculto *honeypot* y límite de 10 envíos/hora por IP.
- Sesión de administración con cookie `HttpOnly` y HMAC.
- Cabeceras de seguridad básicas en `next.config.mjs`.

## Mejoras recomendadas (siguiente versión)

1. **Login de agricultores** y guardado de sus fincas/municipios favoritos.
2. **Avisos por WhatsApp** reales (WhatsApp Business API) o por SMS/e-mail.
3. **Conexión de sensores** reales (humedad de suelo, estación local) por parcela.
4. **Recomendación con datos del suelo** (textura, retención, pendiente) y del riego
   (goteo, aspersión, superficie regable).
5. **Diagnóstico por imagen** con IA (plagas y carencias).
6. **Histórico y gráficos** de clima y humedad de la parcela.
7. **CRUD completo de leads** con notas y estados de seguimiento.
8. **Backups automáticos** de la base de datos.
9. **Multilenguaje** (español e inglés) para captar mercado internacional.
10. **HTTPS + registro de servicio** (opcional): instalación PWA más completa.

## Comandos útiles

```bash
npm run dev       # desarrollo (http://localhost:3000)
npm run build     # compilación de producción
npm start         # servir la build (puerto 3000)
npm run lint      # eslint
npm run icons     # regenerar los iconos del PWA
```
