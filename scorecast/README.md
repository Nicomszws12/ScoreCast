# ScoreCast — Documentación Operativa y Guía de Configuración

> **Proyecto Integrador (PICS) — ETITC**  
> Autores: **Nicolás Nieto Daza**, **Alejandro Rodríguez Rubio**, **Angie Marcela Pinzón Moncada** y **Catalina Alarcón Medina**  
> Para la descripción integral de arquitectura y módulos vigentes consulta el [`README.md` principal en la raíz del repositorio](../README.md).

---

## Probar en modo Demo (0 minutos de configuración)

1. En `js/config.js` ajusta `MODO: 'demo'` y sirve la carpeta con `npx serve .` (desde `scorecast/`).
2. Registra una cuenta usando un correo incluido en `CONFIG.ADMINS` para habilitar el enlace a **`admin.html`**.
3. En **Admin → Zona de Control → Cargar datos de ejemplo (demo)** poblarás usuarios y pronósticos de prueba, con simulador minuto a minuto y la pestaña **Salud y Métricas** operativa en memoria.

---

## Estructura vigente de `scorecast/`

```text
scorecast/
├─ index.html               Registro e inicio de sesión (Correo y Google)
├─ app.html                 Partidos, goles/tarjetas en vivo, alineaciones XI, tablas y campeón
├─ tabla.html               Ranking general, podio y tarjetas compartibles PNG
├─ lobby.html               Salas privadas con código de invitación
├─ cuentas.html             Bote multimoneda y liquidación de pagos
├─ reglas.html              Reglamento de puntuación y desempates
├─ creditos.html            Créditos académicos PICS — ETITC
├─ admin.html               Panel Admin (API-Football, IA, Correos y Salud/Métricas)
├─ sw.js                    Service Worker PWA (scorecast-cache-v33)
├─ css/estilos.css          Sistema de diseño oscuro deportivo
├─ js/
│  ├─ config.js             Configuración de entorno y reglas
│  ├─ store.js              Capa dual Cloud Firestore / localStorage
│  ├─ fixture.js            Calendario y clubes de las 7 competiciones
│  ├─ puntos.js             Motor de calificación, desempates y bote
│  ├─ utils.js              Sanitización anti-XSS (U.esc), fechas UTC y cierres
│  ├─ api-futbol.js         Marcadores en vivo, eventos y alineaciones (modo ahorro)
│  ├─ tablas-cuadros.js     Tablas, llaves KO y simulador "¿Qué pasa si...?"
│  ├─ compartir-card.js     Tarjetas PNG en <canvas>
│  ├─ ia.js                 Motor estadístico Poisson + Dixon-Coles
│  ├─ auditoria-pics.js     Telemetría en vivo y suite de pruebas PICS
│  ├─ tribuna-social.js     Chat y encuestas en tiempo real
│  ├─ en-vivo-beta.js        Match center interactivo
│  ├─ notificaciones.js     Alertas de goles, tarjetas rojas y cierres
│  └─ email.js              Comunicaciones vía EmailJS
└─ proxy/cloudflare-worker.js Proxy para resguardar llaves externas
```

---

## 🏭 Puesta en producción (multiusuario real) — ~30 minutos

La app usa **Firebase** (gratis en estos volúmenes) para cuentas y datos compartidos,
**EmailJS** para correos y un **Cloudflare Worker** para los marcadores en vivo.
Todo tiene plan gratuito suficiente para cientos de participantes.

### 1) Crear el proyecto Firebase (10 min)

1. Entra a <https://console.firebase.google.com> → **Agregar proyecto** → nombre
   `scorecast` (la analítica es opcional).
2. **Authentication → Comenzar → Correo electrónico/contraseña → Habilitar**.
3. **Firestore Database → Crear base de datos → Producción**.
4. **Reglas** de Firestore: pega el contenido completo de `firestore.rules`
   y **Publica**.
5. En Firestore crea a mano la colección/documento de administradores:
   - Colección: `configuracion` → Documento: `admins`
   - Campo `correos` (tipo *array*): `nicolasnieto191213@gmail.com`
   - ⚠ En **minúsculas** y idénticos a `CONFIG.ADMINS` de `js/config.js`.
6. **Configuración del proyecto → Tus apps → Web (`</>`)** → registra la app y copia el
   bloque `firebaseConfig`.

### 2) Conectar la app (2 min)

En `js/config.js`:

```js
MODO: 'firebase',
FIREBASE: { apiKey: '...', authDomain: '...', projectId: '...', ... } // lo copiado
```

> La `apiKey` de Firebase **no es secreta**: identifica el proyecto; la seguridad
> real la dan las reglas de Firestore y Authentication.

### 3) Publicar el sitio con Firebase Hosting (5 min)

```bash
npm i -g firebase-tools
firebase login
cd scorecast
firebase deploy
```

Quedará en `https://scorecast-c5e9e.web.app`. Puedes agregar tu propio dominio personalizado en **Hosting → Agregar dominio personalizado**. Actualiza `URL_PUBLICA` en `js/config.js` y vuelve a desplegar.

### 4) Correos con EmailJS (8 min)

1. Cuenta gratis en <https://www.emailjs.com> (200 correos/mes).
2. **Email Services → Add New Service** → conecta el Gmail/Outlook que enviará.
3. **Email Templates** → crea 3 plantillas con estos campos (To Email = `{{correo}}`):

   | Plantilla     | Variables disponibles                                            |
   |---------------|------------------------------------------------------------------|
   | bienvenida    | `{{nombre}}`, `{{correo}}`, `{{url}}`                              |
   | recordatorio  | `{{nombre}}`, `{{correo}}`, `{{partidos}}`, `{{url}}`              |
   | resumen       | `{{nombre}}`, `{{correo}}`, `{{resultados}}`, `{{posicion}}`, `{{puntos}}`, `{{url}}` |

4. Copia en `js/config.js → EMAILJS`: la **Public Key** (Account → API Keys), el
   **Service ID** y los 3 **Template IDs**.
5. En EmailJS → Account → Security, restringe el uso a tu dominio (`scorecast-c5e9e.web.app`).

> ¿Más de 200 correos/mes? Alternativa gratuita: Brevo (300/día) vía su API, o enviar
> recordatorios solo a quienes tienen pronósticos pendientes (el panel ya genera la lista).

### 5) Marcadores en vivo (5 min)

1. Cuenta gratis en <https://www.api-football.com> (plan free: **100 peticiones/día**)
   → copia tu **API Key**.
2. Despliega el proxy (protege la llave y cachea 30 s):

```bash
npm i -g wrangler
wrangler login
wrangler deploy proxy/cloudflare-worker.js --name scorecast-proxy
wrangler secret put API_FOOTBALL_KEY      # pega aquí la llave
wrangler secret put ORIGEN_PERMITIDO      # ej: https://scorecast-c5e9e.web.app
```

3. Copia la URL del Worker (p. ej. `https://polla-proxy.TUCUENTA.workers.dev`) en
   `js/config.js → API_FUTBOL.proxyUrl`.

**Cómo se usa la cuota de 100 peticiones/día:** los espectadores **no** consultan la
API; solo el **admin** con el panel abierto y "📡 Marcador automático" encendido
sincroniza cada 60 s y escribe en Firestore, y todos los demás reciben los cambios en
tiempo real. Con `intervaloSegundos: 60` y ~90 min de partido, una jornada de 4–6
partidos cabe en la cuota. Si un día hay muchos partidos, sube el intervalo a 120 s
o sincroniza manualmente al medio tiempo y al final.

### 6) Lista de verificación de seguridad

- [x] Contraseñas gestionadas por **Firebase Authentication** (verificación de correo incluida).
- [x] **Reglas de Firestore**: cada quien edita solo su perfil y sus pronósticos; los
      pronósticos se bloquean en el servidor apenas el partido tiene marcador; el bono
      de campeón se cierra el 11-jun a las 19:00 UTC; resultados/calendario solo admins.
- [x] Llave de la API de fútbol **solo** en el Worker (secreto), nunca en el navegador.
- [x] Todo texto de usuario se escapa con `U.esc()` antes de pintarse (anti-XSS).
- [x] Cabeceras de seguridad en Hosting (`nosniff`, `DENY frames`, referrer policy).
- [x] Externos entran en estado **pendiente** hasta aprobación del admin.
- [ ] Restringir la API key de Firebase por dominio (Google Cloud → Credenciales) — opcional.
- [ ] Habilitar **App Check** si se quiere blindaje extra — opcional.

---

## 🛠 Operación durante el torneo (guía rápida del admin)

| Cuándo | Qué hacer |
|---|---|
| Hoy | Cargar la app, registrar admins, enviar el enlace por Slack/Teams. |
| Al confirmar FIFA horarios | **Admin → Calendario** → "🔄 Sincronizar con API" (o editar a mano). |
| Antes de cada jornada | **Admin → Comunicaciones → Enviar recordatorio**. |
| Durante los partidos | Dejar abierto el panel con **📡 Marcador automático ON** (o cargar marcadores a mano). |
| Al cerrar grupos | **Admin → Calendario → Eliminatorias**: asignar los clasificados (o sincronizar). |
| Tras cada jornada | **Publicar tabla oficial** y, si quieres, enviar el resumen. |
| Pagos | **Admin → Participantes**: marcar ✅ cuando alguien entregue su cuota. |

## ⚠ Límites conocidos

- **Modo demo** = un solo navegador (es para probar, no para competir).
- EmailJS gratis: 200 correos/mes → priorizar recordatorios de jornadas clave.
- API-Football gratis: 100 peticiones/día → patrón "solo el admin sincroniza" ya implementado.
- Los marcadores de la API se emparejan por pareja de equipos y fecha; si FIFA cambia un
  cruce a última hora, el panel permite corregirlo a mano en segundos.
- La hora de los partidos aún no confirmados cierra pronósticos a las 11:00 a. m. de
  Colombia de ese día (criterio conservador, ajustable al confirmar la hora real).

¡Que gane el que más sepa (o el que más suerte tenga)! 🏆
