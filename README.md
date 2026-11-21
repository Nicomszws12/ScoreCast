# ScoreCast — Plataforma Web de Pronósticos Deportivos y Marcadores en Tiempo Real

**Proyecto Integrador (PICS)** — **Escuela Tecnológica Instituto Técnico Central (ETITC)**  
**Producción en vivo:** [https://scorecast-c5e9e.web.app](https://scorecast-c5e9e.web.app)

### Equipo de Autores
- **Nicolás Nieto Daza**
- **Alejandro Rodríguez Rubio**
- **Angie Marcela Pinzón Moncada**
- **Catalina Alarcón Medina**

---

## Descripción General

**ScoreCast** es una aplicación web progresiva (**PWA**) multiusuario de pronósticos deportivos, analítica estadística y seguimiento de fútbol en tiempo real construida nativamente con **HTML5, CSS3 y JavaScript ES Modules** (sin frameworks pesados ni pasos de transpilación), respaldada en la nube por **Firebase Authentication, Cloud Firestore y Firebase Hosting**.

Permite gestionar quinielas/pollas globales y **salas privadas** sobre **7 competiciones oficiales simultáneas**, combinando sincronización eficiente de datos oficiales (**API-Football v3** en modo ahorro), un motor predictivo propio basado en distribución de **Poisson + corrección Dixon-Coles**, simuladores interactivos de clasificación y herramientas de auditoría técnica en vivo para su sustentación académica.

---

## Funcionalidades Vigentes

1. **Cobertura Multicompetición (7 Torneos Oficiales):**
   - Liga BetPlay Dimayor (Todos contra Todos, Cuadrangulares y Final), Premier League, LaLiga EA Sports, Bundesliga, UEFA Champions League, CONMEBOL Libertadores y CONMEBOL Sudamericana.
2. **Sistema de Diseño Deportivo Broadcast + PWA Instalable:**
   - Tema oscuro editorial de alto contraste (`#0B0E11`, `#12171D`, `#181F27`), tipografía deportiva `Barlow Condensed` + `Plus Jakarta Sans` con cifras `tabular-nums`, iconografía vectorial SVG propia y Service Worker `network-first` (`sw.js`) con soporte offline e instalación móvil/escritorio.
3. **Pronósticos en Vivo, Goles/Tarjetas en Tiempo Real y Alineaciones Confirmadas:**
   - Cierre automático estricto antes del pitazo inicial (`U.estadoPartido`) con registro anti-trampa en servidor y cliente.
   - **Franja broadcast `.live-events`** visible directamente en cada tarjeta de partido (`en_juego` y `finalizado`): goles con minuto exacto (`45+2'`), penal `(P)` o autogol `(AG)`, tarjetas amarillas, rojas y doble amarilla sincronizadas en tiempo real vía `onSnapshot` de Cloud Firestore.
   - **Alineaciones públicas (`resultados[pid].alineaciones`):** badge de confirmación, formación táctica (`4-2-3-1`), 11 titulares con dorsal, director técnico y banca desplegable de suplentes (consultadas 1 sola vez por partido para proteger la cuota diaria).
4. **Motor de Puntuación, Desempates y Bono Multicampeón:**
   - Fase regular/grupos: `+3 pts` marcador exacto, `+1 pt` tendencia `1X2`.
   - Eliminatorias directas: `+5 pts` marcador exacto, `+2 pts` tendencia `1X2`.
   - Bono **"Mi Campeón"** independiente en los 7 torneos (`+10 pts` por campeón acertado) y criterio determinista de desempate (puntos → exactos → resultados `1X2` → antigüedad de registro).
5. **Simulador Interactivo "¿Qué pasa si...?" en Tablas y Cuadros:**
   - En la pestaña **Tablas y Cuadros**, permite proyectar en tiempo real cómo cambiarían las tablas de posiciones, zonas de clasificación UEFA/CONMEBOL, cuadrangulares y cuadros eliminatorios combinando resultados oficiales con los pronósticos del usuario o marcadores editados al vuelo.
6. **Tarjetas Compartibles PNG (`<canvas>` nativo):**
   - Generador gráfico `1080 × 1350 px` (`js/compartir-card.js`) para descargar o compartir por Web Share API los pronósticos de la jornada y la tarjeta de posición/podio en el ranking.
7. **Motor Estadístico Poisson & Análisis Táctico IA:**
   - Cálculo instantáneo de goles esperados (`xG`), probabilidades `1X2`, `Over 2.5`, `BTTS`, Top 3 marcadores más probables, Radar de la Jornada e informes tácticos híbridos publicables en cada partido (`js/ia.js`).
8. **Salas Privadas, Cuentas Multimoneda y Tribuna Social:**
   - Creación y unión a salas privadas mediante código de 6 caracteres (`lobby.html`), control de recaudo multimoneda (`COP`, `MXN`, `USD`, `CLP`, `UYU`, `VES`) con algoritmo de liquidación mínima de transferencias (`cuentas.html`), chat en vivo y encuestas (`js/tribuna-social.js`).
9. **Panel de Administración y Pestaña "Salud y Métricas" (Sustentación PICS):**
   - Centro de Control API-Football optimizado para Plan Free (`100 req/día`), gestión de usuarios/calendario/llaves, envíos transaccionales con **EmailJS** y módulo **`js/auditoria-pics.js`** con:
     - Telemetría en vivo (Service Worker/caché PWA, latencia RTT real a Firestore en `ms`, volumen operativo y cuota API en `0 req`).
     - Suite de 5 pruebas funcionales y de seguridad 100% en memoria (`PASS`/`FAIL`) + exportación de evidencia académica en texto y JSON.
---

## Arquitectura Técnica

| Capa | Tecnología / Patrón |
| --- | --- |
| **Frontend & UI** | HTML5 semántico, CSS3 con tokens nativos (`estilos.css`), JavaScript **ES Modules** sin dependencias de build, Canvas 2D API. |
| **PWA & Caché** | `manifest.json` + Service Worker (`sw.js`, caché `scorecast-cache-v33`) con estrategia *Network-First* y respaldo offline. |
| **Autenticación y Datos** | **Firebase Authentication** (Correo/Contraseña y Google OAuth) + **Cloud Firestore** en tiempo real (`onSnapshot`) + motor dual **`demo` (`localStorage`) / `firebase`** encapsulado en `js/store.js`. |
| **Datos Deportivos en Vivo** | **API-Football v3** (`js/api-futbol.js`) + **Cloudflare Workers** (`proxy/`): emparejamiento en 4 niveles, bloqueo distribuido en Firestore (`sincronizacion/live`) y consulta única de alineaciones por partido para operar dentro del plan gratuito (`100 req/día`). |
| **Analítica & IA** | Modelo estadístico local **Poisson + Dixon-Coles** (`js/ia.js`, `$0` costo operativo) con enriquecimiento redaccional opcional vía Worker LLM. |
| **Notificaciones & Correo** | **EmailJS** (`js/email.js`) para bienvenida, recordatorios y resúmenes + notificaciones en navegador y alerta sonora de gol (`js/notificaciones.js`). |
| **Seguridad** | Sanitización estricta anti-XSS (`U.esc()`), reglas declarativas en `firestore.rules` (bloqueo de escritura tras inicio del partido y control de rol administrador) y cabeceras HTTP en `firebase.json`. |

---

## Estructura Principal del Repositorio

```text
SCORECAST/
├─ firebase.json                 Configuración de Firebase Hosting y cabeceras HTTP
├─ firestore.rules               Reglas de seguridad de Cloud Firestore
├─ scripts/
│  └─ check-syntax.mjs           Verificador sintáctico automatizado (HTML + ES Modules)
└─ scorecast/                    Directorio público desplegado en Firebase Hosting
   ├─ index.html                 Portada de acceso, registro e inicio con Google
   ├─ app.html                   Partidos, eventos en vivo, alineaciones, tablas, tribuna y campeón
   ├─ tabla.html                 Clasificación general, podio, racha y tarjetas compartibles
   ├─ lobby.html                 Gestión y acceso a salas privadas por código
   ├─ cuentas.html               Bote multimoneda y liquidación óptima de pagos
   ├─ reglas.html                Reglamento oficial del sistema de puntos
   ├─ creditos.html              Créditos académicos y atribuciones técnicas
   ├─ admin.html                 Panel de administración, API-Football, IA y Salud/Métricas PICS
   ├─ sw.js                      Service Worker PWA (v33)
   ├─ manifest.json              Manifiesto Web App instalable
   ├─ css/estilos.css            Sistema de diseño oscuro deportivo unificado
   ├─ js/
   │  ├─ config.js               Configuración de entorno (Firebase / Demo, cuotas y reglas)
   │  ├─ store.js                Capa de persistencia dual (Cloud Firestore / localStorage)
   │  ├─ fixture.js              Calendario maestro, clubes y resultados base de las 7 ligas
   │  ├─ puntos.js               Motor de calificación, desempates, grupos y bote
   │  ├─ utils.js                Seguridad anti-XSS (U.esc), fechas UTC/locales y estado de partido
   │  ├─ api-futbol.js           Sincronización inteligente de marcadores, goles, tarjetas y XI
   │  ├─ tablas-cuadros.js       Tablas de posiciones, cuadros KO y simulador "¿Qué pasa si...?"
   │  ├─ compartir-card.js       Generador de tarjetas PNG en <canvas> para compartir
   │  ├─ ia.js                   Motor estadístico Poisson + Dixon-Coles e informes tácticos
   │  ├─ auditoria-pics.js       Telemetría en vivo y suite de validación en memoria (PICS)
   │  ├─ equipos-info.js         Modal de perfil estadístico por club
   │  ├─ competiciones-info.js   Banners y fichas técnicas de las 7 competiciones
   │  ├─ tribuna-social.js       Chat en tiempo real y encuestas por sala
   │  ├─ en-vivo-beta.js         Centro interactivo de partido en vivo y reacciones
   │  ├─ notificaciones.js       Alertas visuales/sonoras de goles, rojas y cierres
   │  └─ email.js                Integración con EmailJS para comunicaciones masivas
   └─ proxy/cloudflare-worker.js Proxy serverless para resguardar credenciales de API
```

---

## Ejecución Local, Validación y Despliegue

### 1. Ejecución local rápida
```bash
# Servir la carpeta pública desde la raíz del proyecto
npx serve scorecast
```
- En `scorecast/js/config.js` puedes alternar `MODO: 'demo'` (pruebas aisladas en `localStorage`) o `MODO: 'firebase'` (conectado a Cloud Firestore en tiempo real).

### 2. Verificación sintáctica automatizada (QA)
```bash
node scripts/check-syntax.mjs
```
 además, desde **`admin.html` → pestaña `Salud y Métricas`**, puedes ejecutar en 1 clic la **Suite de Validación Funcional y Seguridad** en memoria y exportar el reporte técnico JSON/TXT para sustentación.

### 3. Despliegue a producción (Firebase Hosting)
```bash
firebase deploy --only hosting
```

---

*Desarrollado como Proyecto Integrador (PICS) en la Escuela Tecnológica Instituto Técnico Central (ETITC) — Bogotá D.C., Colombia.*

