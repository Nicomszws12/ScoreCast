// js/config.js
export const CONFIG = {
    MODO: 'firebase',
    URL_PUBLICA: 'https://scorecast-c5e9e.web.app',
    DOMINIO_EMPRESA: '',
    APROBAR_EXTERNOS_AUTO: true,
    
    // 👇 Ingresa aquí las credenciales de tu propio proyecto de Firebase
    FIREBASE: {
        apiKey: "AIzaSyDPLKMevTIYwToO27W6VApB_18QagDWMMY",
        authDomain: "scorecast-c5e9e.firebaseapp.com",
        projectId: "scorecast-c5e9e",
        storageBucket: "scorecast-c5e9e.firebasestorage.app",
        messagingSenderId: "673220772752",
        appId: "1:673220772752:web:de25b47b8f4eb5ed41e915",
        measurementId: "G-90M2Z5E6HE"
    },

    ADMINS: [
        'nicolasnieto191213@gmail.com'
    ],
    /* ----------------------------------------------------------
       4. CORREOS (EmailJS — https://www.emailjs.com)
       Plan gratuito: 200 correos/mes. Ver README para crear las
       3 plantillas. Si se deja vacío, la app simplemente no envía
       correos (no falla).
    ---------------------------------------------------------- */
  EMAILJS: {
    publicKey: 'eD6lwWlAfFkt2K63X',
    serviceId: 'service_5celmxb',
    plantillas: {
      bienvenida: 'template_oyk3r7u',
      recordatorio: 'template_n59ojqe',
      resumen: 'template_n59ojqe'
    }
  },

  /* ----------------------------------------------------------
     5. RESULTADOS EN VIVO
     La llave del proveedor de datos NUNCA va aquí (sería pública).
     Va en el proxy (proxy/cloudflare-worker.js). Aquí solo se
     pega la URL del Worker una vez desplegado.
     Proveedor recomendado: API-Football (api-sports.io),
     plan gratuito 100 peticiones/día.
  ---------------------------------------------------------- */
  API_FUTBOL: {
    apiKey: '56a4071402402681ba8fa228a7312084',
    proxyUrl: '',
    intervaloSegundos: 15,        // Frecuencia de refresco en vivo
    sincronizaCalendario: true    // Permite sincronizar fechas y horas
  },

  /* ----------------------------------------------------------
     6. REGLAS DE PUNTUACIÓN (editable antes del primer partido)
  ---------------------------------------------------------- */
  REGLAS: {
    grupos:        { exacto: 3, resultado: 1 },  // marcador exacto / acertar ganador o empate
    eliminatorias: { exacto: 5, resultado: 2 },  // se califica el marcador a los 90' (+prórroga si la hay, sin penales)
    bonusCampeon: 10,                            // por acertar el campeón (se elige antes del primer partido)
    cierreCampeonUTC: '2026-06-19T23:59:59Z',     // Extendido al 19 de junio 2026 (23:59 Colombia)
    verPronosticosAntesDeCierre: false           // Permite ver pronósticos de otros antes del cierre. Poner en `true` para permitirlo.
  },

  /* Desempates, en orden: 1) puntos, 2) marcadores exactos,
     3) aciertos de resultado, 4) registro más antiguo. */

  /* ----------------------------------------------------------
     7. LA PLATA — solo registro, NO se hacen transacciones aquí.
     Cada quien elige su moneda al registrarse y paga la cuota
     equivalente por fuera de la app (Nequi, transferencia, etc.)
     al tesorero. Valores editables.
  ---------------------------------------------------------- */
  CUOTAS: {
    COP: { valor: 20000, simbolo: '$',   nombre: 'Peso colombiano' },
    MXN: { valor: 220,   simbolo: '$',   nombre: 'Peso mexicano' },
    CLP: { valor: 11000, simbolo: '$',   nombre: 'Peso chileno' },
    UYU: { valor: 500,   simbolo: '$U',  nombre: 'Peso uruguayo' },
    VES: { valor: 1300,  simbolo: 'Bs.', nombre: 'Bolívar venezolano' },
    ARS: { valor: 16000, simbolo: '$',   nombre: 'Peso argentino' },
    PEN: { valor: 45,    simbolo: 'S/',  nombre: 'Sol peruano' },
    USD: { valor: 12,    simbolo: 'US$', nombre: 'Dólar' },
    EUR: { valor: 11,    simbolo: '€',   nombre: 'Euro' }
  },
  TESORERO: 'Nicolas Nieto Daza',

  /* Reparto de la vaca (acumulado) en porcentajes (deben sumar 100). */
  PREMIOS: [
    { puesto: '🥇 1.er lugar', pct: 60 },
    { puesto: '🥈 2.º lugar', pct: 25 },
    { puesto: '🥉 3.er lugar', pct: 10 },
    { puesto: '🐢 Último lugar (consuelo)', pct: 5 }
  ],

  /* ----------------------------------------------------------
     8. ANÁLISIS IA (vía Cloudflare Worker)
     Sigue las instrucciones en /proxy/ia-worker.js para desplegar
     el proxy que se conecta a un modelo como Claude de Anthropic.
  ---------------------------------------------------------- */
  IA: {
    proxyUrl: 'https://poya-siigo.vercel.app/api/ia', // 👈 URL del proxy de IA en Vercel
  },

  /* ----------------------------------------------------------
     9. VARIOS
  ---------------------------------------------------------- */
  MAX_GOLES: 15,                                // tope del marcador en un pronóstico
  VERSION: '1.0.0'
};

/* No editar debajo de esta línea -------------------------- */
Object.freeze(CONFIG.REGLAS);
if (typeof window !== 'undefined') window.CONFIG = CONFIG;
if (typeof globalThis !== 'undefined') globalThis.CONFIG = CONFIG;
