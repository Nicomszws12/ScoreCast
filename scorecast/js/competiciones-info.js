/* ============================================================
   SCORECAST — PERFILES E HISTORIA DE COMPETICIONES
   ------------------------------------------------------------
   Información histórica, palmarés, récords y formato oficial
   de las 7 competiciones disponibles en la plataforma.
   ============================================================ */

import { FIXTURE, COMPETICIONES } from './fixture.js?v=35';
import { U } from './utils.js?v=35';

const COMPETICIONES_DATA = {
  betplay: {
    nombre: 'Liga BetPlay Dimayor',
    lema: 'El Fútbol Profesional Colombiano',
    organizador: 'DIMAYOR (Colombia)',
    fundacion: 1948,
    edicionActual: '2026-II (Finalización)',
    equipos: 20,
    trofeo: 'Estrella de Primera División',
    maxCampeon: 'Atlético Nacional (17 títulos)',
    color: '#10b981',
    resumenCorto: 'Máxima categoría del fútbol colombiano desde 1948. Se define en dos semestres anuales con Todos contra Todos, Cuadrangulares Semifinales y Gran Final.',
    historia: 'El Campeonato Profesional Colombiano nació en 1948 con Independiente Santa Fe como primer campeón histórico. Poco después vivió la legendaria época de "El Dorado" (1949-1953), cuando figuras mundiales como Alfredo Di Stéfano, Adolfo Pedernera y Heleno de Freitas convirtieron a la liga en una de las más competitivas del planeta. Desde 2002 adopta el formato de dos torneos cortos por año (Apertura y Finalización), entregando dos estrellas por temporada y manteniendo viva la emoción de los tradicionales cuadrangulares semifinales.',
    formato: 'Fase 1: Todos contra Todos a 19 fechas (20 clubes). Los 8 mejores clasifican a los Cuadrangulares Semifinales (Grupos A y B, 6 fechas ida y vuelta). El 1.º y 2.º del Todos contra Todos son cabezas de serie y cuentan con el "punto invisible" (ventaja deportiva en caso de empate en puntos). El ganador de cada cuadrangular disputa la Gran Final a partidos de ida y vuelta.',
    palmares: [
      { club: 'Atlético Nacional', titulos: 17, icono: '🏆' },
      { club: 'Millonarios FC', titulos: 16, icono: '🏆' },
      { club: 'América de Cali', titulos: 15, icono: '🏆' },
      { club: 'Deportivo Cali', titulos: 10, icono: '🥇' },
      { club: 'Junior de Barranquilla', titulos: 10, icono: '🥇' },
      { club: 'Independiente Santa Fe', titulos: 9, icono: '🥇' },
      { club: 'Independiente Medellín', titulos: 6, icono: '⭐' },
      { club: 'Once Caldas', titulos: 4, icono: '⭐' }
    ],
    datosClave: [
      'Primer campeón oficial: Independiente Santa Fe (1948).',
      'Pentacampeonato récord consecutivo: América de Cali (1982–1986).',
      'Máximo goleador histórico de la liga: Dayro Moreno (más de 225 goles en FPC).',
      'Clásicos icónicos: Capitalino (Millonarios vs Santa Fe), Paisa (Nacional vs DIM) y Vallecaucano (América vs Cali).'
    ]
  },

  premier: {
    nombre: 'Premier League',
    lema: 'La liga más vista y competitiva del mundo',
    organizador: 'The Football Association (Inglaterra)',
    fundacion: 1992,
    edicionActual: 'Temporada 2026/27',
    equipos: 20,
    trofeo: 'Premier League Trophy',
    maxCampeon: 'Manchester United y Liverpool (20 ligas)',
    color: '#8b5cf6',
    resumenCorto: 'Máxima división inglesa fundada en su formato moderno en 1992 (continuando la Football League de 1888). 20 clubes, 38 jornadas de intensidad total.',
    historia: 'Aunque el campeonato inglés es el más antiguo del mundo (iniciado en 1888 como Football League), en 1992 los 20 clubes de élite fundaron la Premier League para revolucionar la televisión, los estadios y el espectáculo global. Desde el dominio de Sir Alex Ferguson con el Manchester United y "Los Invencibles" del Arsenal (2003/04), pasando por el milagro del Leicester City (2015/16) y la era moderna de Pep Guardiola y Jürgen Klopp, es hoy la liga doméstica con mayor audiencia internacional.',
    formato: 'Sistema de liga regular a doble vuelta (38 jornadas, 380 partidos). Los 4 primeros clasifican a la UEFA Champions League, el 5.º accede a la Europa League y el 6.º a la Conference League. Los 3 últimos (18.º al 20.º) descienden al EFL Championship.',
    palmares: [
      { club: 'Manchester United', titulos: 20, icono: '🏆' },
      { club: 'Liverpool FC', titulos: 20, icono: '🏆' },
      { club: 'Arsenal FC', titulos: 13, icono: '🥇' },
      { club: 'Manchester City', titulos: 10, icono: '🥇' },
      { club: 'Everton FC', titulos: 9, icono: '⭐' },
      { club: 'Aston Villa', titulos: 7, icono: '⭐' },
      { club: 'Chelsea FC', titulos: 6, icono: '⭐' }
    ],
    datosClave: [
      'Único campeón invicto en la era Premier: Arsenal 2003/04 (26G, 12E, 0P).',
      'Récord de puntos en una sola temporada: Manchester City (100 pts en 2017/18).',
      'Máximo goleador histórico era Premier: Alan Shearer (260 goles).',
      'Transmisión en más de 185 países cada fin de semana.'
    ]
  },

  laliga: {
    nombre: 'LaLiga EA Sports',
    lema: 'El hogar del fútbol técnico y El Clásico',
    organizador: 'LaLiga / RFEF (España)',
    fundacion: 1929,
    edicionActual: 'Temporada 2026/27',
    equipos: 20,
    trofeo: 'Trofeo de Liga',
    maxCampeon: 'Real Madrid (36 títulos)',
    color: '#ef4444',
    resumenCorto: 'Primera División de España desde 1929. Cuna de El Clásico y de la liga que más Balones de Oro y títulos europeos ha concentrado en la historia.',
    historia: 'Inaugurada en febrero de 1929 con 10 equipos y el FC Barcelona como primer campeón, LaLiga española se consolidó como referente mundial del juego asociativo y el talento individual. Solo tres clubes han disputado absolutamente todas las temporadas en Primera División sin descender jamás: Real Madrid, FC Barcelona y Athletic Club. La rivalidad de El Clásico y el pulso táctico con el Atlético de Madrid, Sevilla, Betis y Real Sociedad marcan el ritmo del fútbol europeo.',
    formato: 'Liga regular de 20 clubes a 38 jornadas (380 partidos). Desempate principal: enfrentamiento directo (gol average particular) antes que la diferencia general de goles. Top 4 clasifica a Champions League, 5.º a Europa League, 6.º a Conference League y los últimos 3 descienden a Segunda División.',
    palmares: [
      { club: 'Real Madrid', titulos: 36, icono: '🏆' },
      { club: 'FC Barcelona', titulos: 28, icono: '🏆' },
      { club: 'Atlético de Madrid', titulos: 11, icono: '🥇' },
      { club: 'Athletic Club', titulos: 8, icono: '🥇' },
      { club: 'Valencia CF', titulos: 6, icono: '⭐' },
      { club: 'Real Sociedad', titulos: 2, icono: '⭐' },
      { club: 'RC Deportivo / Sevilla / Betis', titulos: 1, icono: '⭐' }
    ],
    datosClave: [
      'Clubes que nunca han descendido: Real Madrid, FC Barcelona y Athletic Club.',
      'Máximo goleador histórico de LaLiga: Lionel Messi (474 goles).',
      'Récord de puntos en una campaña: 100 puntos (Real Madrid 2011/12 y Barcelona 2012/13).',
      'España es el país con más títulos combinados de Champions League y Europa League.'
    ]
  },

  bundesliga: {
    nombre: 'Bundesliga',
    lema: 'Pasión en las gradas, fútbol vertical y regla 50+1',
    organizador: 'DFL (Alemania)',
    fundacion: 1963,
    edicionActual: 'Temporada 2026/27',
    equipos: 18,
    trofeo: 'Meisterschale (Ensaladera de Plata)',
    maxCampeon: 'Bayern München (33 títulos)',
    color: '#dc2626',
    resumenCorto: 'Primera división alemana desde 1963. Reconocida por tener el mayor promedio de asistencia en estadios del mundo, altísimo promedio de goles y la regla 50+1.',
    historia: 'Creada en 1963 para unificar el fútbol profesional de Alemania Federal con el 1. FC Köln como primer campeón, la Bundesliga destaca mundialmente por su modelo sostenible de propiedad (la regla 50+1 que protege el poder de voto de los socios), entradas accesibles y estadios abarrotados como el Signal Iduna Park y el Allianz Arena. Su estilo de presión alta (Gegenpressing) y fútbol vertical ha formado a los entrenadores más influyentes del siglo XXI.',
    formato: '18 equipos en formato todos contra todos a 34 jornadas (306 partidos). Los 4 primeros van a Champions League, 5.º a Europa League y 6.º a Conference League. Los puestos 17.º y 18.º descienden directamente, mientras el 16.º juega un Play-off de permanencia (Relegation) ante el 3.º de la 2. Bundesliga.',
    palmares: [
      { club: 'Bayern München', titulos: 33, icono: '🏆' },
      { club: 'Borussia Dortmund', titulos: 5, icono: '🥇' },
      { club: 'Borussia M’gladbach', titulos: 5, icono: '🥇' },
      { club: 'Werder Bremen', titulos: 4, icono: '⭐' },
      { club: 'Hamburger SV', titulos: 3, icono: '⭐' },
      { club: 'VfB Stuttgart', titulos: 3, icono: '⭐' },
      { club: '1. FC Köln', titulos: 2, icono: '⭐' },
      { club: 'Bayer Leverkusen', titulos: 1, icono: '⭐' }
    ],
    datosClave: [
      'Mayor promedio de espectadores por partido en el fútbol mundial (+40.000 de media).',
      'Único campeón invicto en la historia de la Bundesliga: Bayer Leverkusen (2023/24).',
      'Máximo goleador histórico: Gerd Müller (365 goles).',
      'Récord de goles en una sola temporada: Robert Lewandowski (41 goles en 2020/21).'
    ]
  },

  ucl: {
    nombre: 'UEFA Champions League',
    lema: 'La cumbre del fútbol de clubes europeo',
    organizador: 'UEFA (Europa)',
    fundacion: 1955,
    edicionActual: 'Temporada 2026/27',
    equipos: 36,
    trofeo: 'La Orejona',
    maxCampeon: 'Real Madrid (15 títulos)',
    color: '#3b82f6',
    resumenCorto: 'El torneo de clubes más prestigioso del planeta desde 1955. Desde 2024/25 estrena su emocionante Fase de Liga con 36 clubes en tabla única.',
    historia: 'Nacida en 1955 como la Copa de Campeones de Europa e impulsada por el diario L’Équipe, fue rebautizada como UEFA Champions League en 1992 con su inconfundible himno y balón de estrellas. En sus noches mágicas se han forjado las mayores dinastías del deporte: el Real Madrid pentacampeón inicial y rey absoluto con 15 coronas, el Milan de Sacchi, el Ajax de Cruyff, el Barcelona de Guardiola y el Bayern y Liverpool históricos.',
    formato: 'Nuevo formato suizo (Fase de Liga): 36 clubes en una sola tabla general; cada equipo disputa 8 partidos ante 8 rivales distintos (4 de local y 4 de visitante). Los 8 primeros avanzan directo a Octavos de Final; del 9.º al 24.º disputan un Play-off eliminatorio a ida y vuelta; del 25.º al 36.º quedan eliminados. Desde Octavos hasta Semifinales se juega a ida y vuelta, cerrando con la Gran Final a partido único.',
    palmares: [
      { club: 'Real Madrid', titulos: 15, icono: '🏆' },
      { club: 'AC Milan', titulos: 7, icono: '🏆' },
      { club: 'Bayern München', titulos: 6, icono: '🥇' },
      { club: 'Liverpool FC', titulos: 6, icono: '🥇' },
      { club: 'FC Barcelona', titulos: 5, icono: '🥇' },
      { club: 'Ajax', titulos: 4, icono: '⭐' },
      { club: 'Inter de Milán', titulos: 3, icono: '⭐' },
      { club: 'Manchester United', titulos: 3, icono: '⭐' }
    ],
    datosClave: [
      'Máximo goleador histórico del torneo: Cristiano Ronaldo (140 goles).',
      'Final 2026/27 programada para el 29 de mayo de 2027 en el Estadio Metropolitano (Madrid).',
      'Solo un club ha ganado 5 ediciones consecutivas (Real Madrid, 1956–1960).',
      'El himno oficial está basado en "Zadok the Priest" de Georg Friedrich Händel.'
    ]
  },

  libertadores: {
    nombre: 'Copa CONMEBOL Libertadores',
    lema: 'La Gloria Eterna de América',
    organizador: 'CONMEBOL (Sudamérica)',
    fundacion: 1960,
    edicionActual: 'Edición 2026 (67.ª)',
    equipos: 47,
    trofeo: 'Copa Libertadores de América',
    maxCampeon: 'Independiente (7 títulos)',
    color: '#f5b800',
    resumenCorto: 'El torneo continental más apasionante de Sudamérica desde 1960. La edición 2026 se define en la Gran Final Única el 28 de noviembre en el Estadio Centenario de Montevideo.',
    historia: 'Creada en 1960 en homenaje a los próceres de la independencia sudamericana, la Copa Libertadores es sinónimo de mística, estadios hirvientes, altura andina y hazañas inolvidables. Peñarol estrenó el palmarés, Independiente se erigió como el "Rey de Copas" con 7 coronas invicto en finales, Boca Juniors y River Plate inmortalizaron el continente y los clubes brasileños han protagonizado una hegemonía reciente. Desde 2019 se corona con una Gran Final Única en sede neutral.',
    formato: 'Tres fases preliminares clasificatorias dan paso a la Fase de Grupos (32 equipos en 8 grupos A–H). Los 2 primeros de cada grupo pasan a Octavos de Final, los 3.º pasan a Play-offs de Sudamericana. Octavos, Cuartos y Semifinales se disputan a ida y vuelta (sin gol de visitante, definiendo por penales en caso de igualdad global) hasta la Gran Final Única.',
    palmares: [
      { club: 'Independiente (ARG)', titulos: 7, icono: '🏆' },
      { club: 'Boca Juniors (ARG)', titulos: 6, icono: '🏆' },
      { club: 'Peñarol (URU)', titulos: 5, icono: '🥇' },
      { club: 'River Plate (ARG)', titulos: 4, icono: '🥇' },
      { club: 'Estudiantes LP (ARG)', titulos: 4, icono: '🥇' },
      { club: 'Flamengo (BRA)', titulos: 4, icono: '⭐' },
      { club: 'Palmeiras / São Paulo / Santos / Grêmio / Nacional / Olimpia', titulos: 3, icono: '⭐' },
      { club: 'Atlético Nacional (COL)', titulos: 2, icono: '🇨🇴' }
    ],
    datosClave: [
      'Gran Final 2026: Estudiantes de La Plata vs Palmeiras · 28 de noviembre en el Estadio Centenario, Montevideo.',
      'Estudiantes (4 títulos) y Palmeiras (3 títulos) chocan por sumar una nueva estrella continental.',
      'Clubes colombianos campeones: Atlético Nacional (1989, 2016) y Once Caldas (2004).',
      'El campeón obtiene cupo directo a la Copa Intercontinental, Mundial de Clubes y Recopa Sudamericana.'
    ]
  },

  sudamericana: {
    nombre: 'Copa CONMEBOL Sudamericana',
    lema: 'La Gran Conquista del Continente',
    organizador: 'CONMEBOL (Sudamérica)',
    fundacion: 2002,
    edicionActual: 'Edición 2026 (25.ª)',
    equipos: 56,
    trofeo: 'Copa Sudamericana',
    maxCampeon: 'LDU Quito, Boca, Independiente, Paranaense e IDV (2 títulos)',
    color: '#38bdf8',
    resumenCorto: 'Segunda gran competencia continental de Sudamérica desde 2002. La Gran Final 2026 se juega el 21 de noviembre en Barranquilla entre Boca Juniors y Atlético Mineiro.',
    historia: 'Inaugurada en 2002 tras unificar las antiguas copas Merconorte y Mercosur, la Copa Sudamericana se consolidó como el gran escaparate competitivo del continente. San Lorenzo ganó la primera edición, Cienciano protagonizó la gesta peruana en 2003, Independiente Santa Fe le dio a Colombia su primera y única conquista en 2015, y proyectos modelo como Independiente del Valle, Liga de Quito y Defensa y Justicia escribieron páginas memorables.',
    formato: 'Fase preliminar nacional a partido único para clasificar a la Fase de Grupos (32 equipos en 8 grupos A–H). El 1.º de cada grupo avanza directo a Octavos de Final, mientras que los 2.º disputan un Play-off de Octavos contra los 3.º procedentes de la Copa Libertadores. Desde Octavos hasta Semifinales se juega ida y vuelta, culminando en una Gran Final Única.',
    palmares: [
      { club: 'Boca Juniors (ARG)', titulos: 2, icono: '🏆' },
      { club: 'LDU Quito (ECU)', titulos: 2, icono: '🏆' },
      { club: 'Independiente (ARG)', titulos: 2, icono: '🏆' },
      { club: 'Independiente del Valle (ECU)', titulos: 2, icono: '🏆' },
      { club: 'Athletico Paranaense (BRA)', titulos: 2, icono: '🏆' },
      { club: 'Independiente Santa Fe (COL)', titulos: 1, icono: '🇨🇴' },
      { club: 'River Plate / Racing / São Paulo / Lanús', titulos: 1, icono: '⭐' }
    ],
    datosClave: [
      'Gran Final 2026: Boca Juniors vs Atlético Mineiro · 21 de noviembre en el Estadio Metropolitano Roberto Meléndez, Barranquilla.',
      'Si Boca Juniors gana en Barranquilla se convertirá en el primer tricampeón histórico del torneo.',
      'El campeón clasifica automáticamente a la Fase de Grupos de la próxima Copa Libertadores y a la Recopa Sudamericana.',
      'Único campeón colombiano hasta la fecha: Independiente Santa Fe (2015).'
    ]
  }
};

export const CompeticionesInfo = {
  obtener(compId) {
    const base = COMPETICIONES[compId] || { id: compId, nombre: compId, nombreCompleto: compId, badge: '' };
    const det = COMPETICIONES_DATA[compId] || {
      nombre: base.nombreCompleto || base.nombre,
      lema: 'Competición oficial',
      organizador: 'Asociación Oficial',
      fundacion: '—',
      edicionActual: '2026',
      equipos: 20,
      trofeo: 'Trofeo Oficial',
      maxCampeon: 'Por definir',
      color: '#10b981',
      resumenCorto: 'Competición oficial disponible en ScoreCast.',
      historia: 'Información histórica en actualización.',
      formato: 'Formato oficial de la temporada 2026/27.',
      palmares: [],
      datosClave: []
    };
    return { ...base, ...det, id: compId };
  },

  /* Banner compacto reutilizable (Tablas y Cuadros + filtro por torneo en Partidos) */
  renderBanner(compId, compacto = false) {
    const info = this.obtener(compId);
    return `
      <div class="comp-hero-card ${compacto ? 'comp-hero-card--compacto' : ''}" style="--comp-accent:${info.color}">
        <div class="comp-hero-main">
          <div class="comp-hero-logo-box">
            <img src="${info.badge}" alt="${U.esc(info.nombre)}" onerror="this.style.display='none'">
          </div>
          <div class="comp-hero-text">
            <div class="comp-hero-top">
              <span class="comp-hero-tag">${U.esc(info.organizador)} · Desde ${info.fundacion}</span>
              <span class="comp-hero-ed">${U.esc(info.edicionActual)}</span>
            </div>
            <h3 class="comp-hero-title">${U.esc(info.nombre)}</h3>
            <p class="comp-hero-desc">${U.esc(info.resumenCorto)}</p>
            <div class="comp-hero-pills">
              <span>👑 <b>Más títulos:</b> ${U.esc(info.maxCampeon)}</span>
              <span>⚽ <b>Clubes:</b> ${info.equipos}</span>
            </div>
          </div>
        </div>
        <div class="comp-hero-actions">
          <button type="button" class="boton boton--dorado-outline comp-btn-historia" data-ver-comp="${compId}">
            📖 Historia, palmarés y formato
          </button>
        </div>
      </div>
    `;
  },

  /* Abre el modal completo de historia, palmarés y formato de la competición */
  abrir(compId, resultados = {}) {
    const info = this.obtener(compId);
    const modal = document.getElementById('modal-equipo-perfil');
    if (!modal) return;

    const partidosComp = FIXTURE.partidos.filter(p => p.competicion === compId);
    const jugados = partidosComp.filter(p => {
      const r = resultados[p.id] || p.resultado || FIXTURE.resultadosIniciales[p.id];
      return r && r.estado === 'finalizado';
    }).length;
    const pendientes = partidosComp.length - jugados;

    const cuerpo = modal.querySelector('#perfil-cuerpo');
    cuerpo.innerHTML = `
      <div class="perfil-cabecera comp-modal-cabecera" style="--comp-accent:${info.color}">
        <div class="perfil-badge-wrap comp-modal-badge">
          <img src="${info.badge}" class="perfil-escudo-img" alt="${U.esc(info.nombre)}" onerror="this.outerHTML='🏆'">
        </div>
        <div class="perfil-titulares">
          <span class="perfil-pais-tag">🌍 ${U.esc(info.organizador)} · Fundada en ${info.fundacion}</span>
          <h2 class="perfil-nombre">${U.esc(info.nombre)}</h2>
          <p class="perfil-apodo">«${U.esc(info.lema)}»</p>
          <div class="perfil-racha-fila" style="gap:8px;flex-wrap:wrap;">
            <span class="etiqueta etiqueta--dorada">${U.esc(info.edicionActual)}</span>
            <span class="etiqueta">${jugados} jugados · ${pendientes} por disputar</span>
          </div>
        </div>
      </div>

      <div class="perfil-nav-tabs" role="tablist">
        <button class="perfil-tab-btn activo" data-ctab="historia" type="button">📖 Historia & Datos</button>
        <button class="perfil-tab-btn" data-ctab="palmares" type="button">👑 Palmarés Histórico</button>
        <button class="perfil-tab-btn" data-ctab="formato" type="button">📋 Formato 2026/27</button>
      </div>

      <div class="perfil-sec" id="csec-historia">
        <div class="perfil-grid-info">
          <div class="perfil-dato-item">
            <span class="dato-label">🏆 Trofeo</span>
            <span class="dato-val">${U.esc(info.trofeo)}</span>
          </div>
          <div class="perfil-dato-item">
            <span class="dato-label">👑 Máximo Campeón</span>
            <span class="dato-val" style="color:var(--dorado)">${U.esc(info.maxCampeon)}</span>
          </div>
          <div class="perfil-dato-item">
            <span class="dato-label">🎂 Año de creación</span>
            <span class="dato-val">${info.fundacion}</span>
          </div>
          <div class="perfil-dato-item">
            <span class="dato-label">🏟 Clubes en edición</span>
            <span class="dato-val">${info.equipos} equipos</span>
          </div>
        </div>

        <h3 class="perfil-subtitulo">Historia y Prestigio</h3>
        <div class="perfil-historia-caja">
          <p style="margin:0">${U.esc(info.historia)}</p>
        </div>

        ${info.datosClave.length ? `
          <h3 class="perfil-subtitulo" style="margin-top:20px;">⚡ Datos Clave y Récords</h3>
          <ul class="comp-datos-lista">
            ${info.datosClave.map(d => `<li>${U.esc(d)}</li>`).join('')}
          </ul>
        ` : ''}
      </div>

      <div class="perfil-sec oculto" id="csec-palmares">
        <h3 class="perfil-subtitulo">Clubes más laureados</h3>
        <div class="perfil-trofeos-grid">
          ${info.palmares.map(p => `
            <div class="trofeo-card">
              <span class="trofeo-icono">${p.icono}</span>
              <div class="trofeo-info">
                <span class="trofeo-cantidad">${p.titulos}</span>
                <span class="trofeo-nombre">${U.esc(p.club)}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="perfil-sec oculto" id="csec-formato">
        <h3 class="perfil-subtitulo">Sistema de Competición (${U.esc(info.edicionActual)})</h3>
        <div class="perfil-historia-caja">
          <p style="margin:0">${U.esc(info.formato)}</p>
        </div>
        <div class="perfil-grid-info" style="margin-top:16px;">
          <div class="perfil-dato-item">
            <span class="dato-label">📊 Partidos en fixture</span>
            <span class="dato-val">${partidosComp.length}</span>
          </div>
          <div class="perfil-dato-item">
            <span class="dato-label">✅ Finalizados al 19/11/2026</span>
            <span class="dato-val" style="color:var(--verde-claro)">${jugados}</span>
          </div>
          <div class="perfil-dato-item">
            <span class="dato-label">⏳ Por jugar</span>
            <span class="dato-val" style="color:var(--dorado)">${pendientes}</span>
          </div>
        </div>
      </div>
    `;

    modal.querySelectorAll('.perfil-tab-btn').forEach(btn => {
      btn.onclick = () => {
        modal.querySelectorAll('.perfil-tab-btn').forEach(b => b.classList.remove('activo'));
        btn.classList.add('activo');
        modal.querySelectorAll('.perfil-sec').forEach(sec => sec.classList.add('oculto'));
        const target = modal.querySelector('#csec-' + btn.dataset.ctab);
        if (target) target.classList.remove('oculto');
      };
    });

    modal.classList.add('activo');
  }
};

window.CompeticionesInfo = CompeticionesInfo;
