/* ============================================================
   SCORECAST — CORREOS (EmailJS)
   ------------------------------------------------------------
   Envía: bienvenida al registrarse, recordatorios de jornada y
   resumen de resultados. Usa EmailJS (plan gratuito 200/mes).
   Mapea automáticamente todas las variables (to_name, to_email,
   correo, nombre, etc.) para máxima compatibilidad con las
   plantillas de EmailJS.
   ============================================================ */
import { CONFIG } from './config.js';

const Email = {

  _sdk: null,

  configurado() {
    const e = CONFIG.EMAILJS;
    return !!(e && e.publicKey && e.serviceId);
  },

  /* Carga el SDK oficial @emailjs/browser solo la primera vez. */
  async _cargar() {
    if (this._sdk) return this._sdk;
    if (!this.configurado()) return null;
    await new Promise((ok, mal) => {
      if (window.emailjs) {
        ok();
        return;
      }
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
      s.onload = ok;
      s.onerror = () => mal(new Error('No se pudo cargar el SDK de EmailJS desde el CDN.'));
      document.head.appendChild(s);
    });
    window.emailjs.init({ publicKey: CONFIG.EMAILJS.publicKey });
    this._sdk = window.emailjs;
    return this._sdk;
  },

  /* Envío genérico con mapeo inteligente de variables. Devuelve {enviado, preview, error}. */
  async _enviar(plantillaId, variables) {
    // Normalizar variables para que coincidan con cualquier nombre de campo en EmailJS
    const nombre = String(variables.nombre || variables.to_name || 'Participante');
    const correo = String(variables.correo || variables.to_email || variables.email || '');
    const url = String(variables.url || CONFIG.URL_PUBLICA || 'https://scorecast-c5e9e.web.app');

    const params = {
      // Nombres
      nombre: nombre,
      to_name: nombre,
      user_name: nombre,
      name: nombre,
      // Correos
      correo: correo,
      to_email: correo,
      email: correo,
      user_email: correo,
      recipient_email: correo,
      // Enlace
      url: url,
      link: url,
      // Cualquier variable extra (partidos, posicion, puntos, etc.)
      ...variables
    };

    const preview = { plantilla: plantillaId || '(sin plantilla)', ...params };

    if (!this.configurado() || !plantillaId) {
      console.info('✉ Vista previa de correo (EmailJS no configurado o plantilla vacía):', preview);
      return { enviado: false, preview, razon: 'EmailJS no configurado' };
    }

    try {
      const sdk = await this._cargar();
      if (!sdk) throw new Error('No se pudo inicializar EmailJS.');
      const res = await sdk.send(CONFIG.EMAILJS.serviceId, plantillaId, params);
      console.info('✅ Correo enviado con éxito vía EmailJS:', res.status, res.text);
      return { enviado: true, status: res.status, preview };
    } catch (err) {
      console.error('🔥 Error enviando correo vía EmailJS:', err);
      return { enviado: false, error: err.text || err.message || String(err), preview };
    }
  },

  /* --- Correo de bienvenida tras registrarse ----------------- */
  async bienvenida(usuario) {
    const plantilla = CONFIG.EMAILJS?.plantillas?.bienvenida;
    return this._enviar(plantilla, {
      nombre: String(usuario?.nombre || ''),
      correo: String(usuario?.correo || ''),
      url: CONFIG.URL_PUBLICA
    });
  },

  /* --- Recordatorio de jornada (lo dispara el admin) ---------- */
  async recordatorio(usuarios, partidosTexto = null, alAvanzar) {
    let enviados = 0, simulados = 0;
    const errores = [];
    const plantilla = CONFIG.EMAILJS?.plantillas?.recordatorio;

    for (const u of usuarios) {
      const r = await this._enviar(plantilla, {
        nombre: u.nombre,
        correo: u.correo,
        asunto: '⚽ ¡No te quedes sin pronosticar! Partidos próximos en ScoreCast',
        titulo: '⏰ ¡Partidos próximos en juego!',
        partidos: partidosTexto || 'Revisa los partidos abiertos en la aplicación.',
        resultados: 'Los marcadores se actualizarán automáticamente al finalizar cada partido.',
        posicion: 'En disputa',
        puntos: 'En disputa',
        url: CONFIG.URL_PUBLICA
      });
      if (r.enviado) {
        enviados++;
      } else {
        simulados++;
        if (r.error) errores.push(`${u.correo}: ${r.error}`);
      }
      alAvanzar && alAvanzar(enviados + simulados, usuarios.length);
      if (r.enviado) await new Promise(ok => setTimeout(ok, 700));
    }
    return { enviados, simulados, errores };
  },

  /* --- Resumen de resultados y posición ----------------------- */
  async resumen(usuarios, resultadosTexto, filasTabla, alAvanzar) {
    let enviados = 0, simulados = 0;
    const errores = [];
    const plantilla = CONFIG.EMAILJS?.plantillas?.resumen;

    for (const u of usuarios) {
      const fila = filasTabla.find(f => f.uid === u.uid);
      const r = await this._enviar(plantilla, {
        nombre: u.nombre,
        correo: u.correo,
        asunto: '📊 Resumen de jornada y tu posición en la tabla — ScoreCast',
        titulo: '📈 ¡Resultados oficiales y tabla de posiciones!',
        partidos: 'Revisa la aplicación para conocer las próximas fechas y partidos.',
        resultados: resultadosTexto || 'Revisa los marcadores oficiales en la app.',
        posicion: fila ? `${fila.pos}.º de ${filasTabla.length} participantes` : '—',
        puntos: fila ? `${fila.pts} pts (${fila.exactos} marcadores exactos)` : '0 pts',
        url: CONFIG.URL_PUBLICA
      });
      if (r.enviado) {
        enviados++;
      } else {
        simulados++;
        if (r.error) errores.push(`${u.correo}: ${r.error}`);
      }
      alAvanzar && alAvanzar(enviados + simulados, usuarios.length);
      if (r.enviado) await new Promise(ok => setTimeout(ok, 700));
    }
    return { enviados, simulados, errores };
  },

  /* --- Envío de prueba desde el Panel Admin -------------------- */
  async probar(tipoPlantilla, correoDestino) {
    const plantillaId = CONFIG.EMAILJS?.plantillas?.[tipoPlantilla] || CONFIG.EMAILJS?.plantillas?.bienvenida;
    return this._enviar(plantillaId, {
      nombre: 'Nicolás Nieto (Admin)',
      correo: correoDestino || CONFIG.ADMINS[0],
      partidos: '• Millonarios vs Deportivo Cali (Hoy 7:00 PM)\n• Arsenal vs Tottenham (Sábado 11:30 AM)',
      resultados: '• Real Madrid 3–1 Barcelona\n• Manchester City 2–1 Liverpool',
      posicion: '1.º de 25 participantes',
      puntos: '42 pts',
      url: CONFIG.URL_PUBLICA
    });
  },

  /* Texto listo para la plantilla de recordatorio: partidos que
     aún están abiertos en las próximas `horas`. */
  textoProximosPartidos(ajustes, resultados, horas = 30) {
    const limite = Date.now() + horas * 36e5;
    return (window.FIXTURE?.partidos || [])
      .map(p => window.Puntos ? window.Puntos.conAjustes(p, ajustes) : p)
      .filter(p => p.utc && (window.U ? window.U.abierto(p, resultados[p.id]) : true) && new Date(p.utc) <= limite)
      .map(p => {
        const L = window.FIXTURE ? window.FIXTURE.equipo(p.local) : { n: p.local };
        const V = window.FIXTURE ? window.FIXTURE.equipo(p.visitante) : { n: p.visitante };
        const dia = window.U ? window.U.diaLocal(p.utc) : p.utc;
        const hora = window.U ? window.U.horaLocal(p.utc) : '';
        return `• ${L.n} vs ${V.n} — ${dia} ${hora}`;
      })
      .join('\n');
  }
};

if (typeof window !== 'undefined') window.Email = Email;
export { Email };
export default Email;
