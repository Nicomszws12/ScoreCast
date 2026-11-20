/* ============================================================
   SCORECAST — CENTRO EN VIVO (VERSIÓN BETA) & RADAR TÁCTICO 2D
   ------------------------------------------------------------
   • Radar Táctico 2D animado (22 jugadores + balón + zonas)
   • Estadísticas en tiempo real (API-Football / Firestore)
   • Comparativa real de temporada 2026/27 en partidos previos
   • Gráfico de Momentum + Línea de tiempo minuto a minuto
   • Alineaciones tácticas + Consenso de la Comunidad & H2H
   • Simulador Live Demo (BETA) para pruebas y presentaciones
   • Reproductor Watch Party (solo enlaces legales/oficiales)
   ============================================================ */

import { FIXTURE, COMPETICIONES } from './fixture.js?v=30';
import { U } from './utils.js?v=30';

const CANALES_GUIA = {
  betplay: { tv: 'Win Sports+ / Win Play', yt: 'https://www.youtube.com/@WinSportsTV/streams', label: 'Win Sports Oficial' },
  libertadores: { tv: 'ESPN / Disney+ / Telefe', yt: 'https://www.youtube.com/@Libertadores/streams', label: 'CONMEBOL Libertadores' },
  sudamericana: { tv: 'ESPN / Disney+ / DSports', yt: 'https://www.youtube.com/@Sudamericana/streams', label: 'CONMEBOL Sudamericana' },
  ucl: { tv: 'ESPN / Disney+ / Max', yt: 'https://www.youtube.com/@UEFA/streams', label: 'UEFA Oficial' },
  premier: { tv: 'ESPN / Disney+', yt: 'https://www.youtube.com/@premierleague/streams', label: 'Premier League Oficial' },
  laliga: { tv: 'ESPN / DSports', yt: 'https://www.youtube.com/@LaLiga/streams', label: 'LaLiga Oficial' },
  bundesliga: { tv: 'ESPN / Disney+', yt: 'https://www.youtube.com/@bundesliga/streams', label: 'Bundesliga Oficial' }
};

const STREAMS_PRUEBA_LEGALES = [
  { label: '📡 Probar Stream HLS (.m3u8) · Mux Demo', url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' },
  { label: '🎬 Probar Stream HLS HD · Apple Demo', url: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8' }
];

const REACCIONES = [
  { key: 'gol', emoji: '⚽', label: '¡GOOOL!' },
  { key: 'fuego', emoji: '🔥', label: 'Partidazo' },
  { key: 'aplauso', emoji: '👏', label: 'Crack' },
  { key: 'asombro', emoji: '😱', label: '¡Qué jugada!' },
  { key: 'tarjeta', emoji: '🟨', label: 'Tarjeta' },
  { key: 'copa', emoji: '🏆', label: 'Campeón' }
];

// Posiciones base (%) para 11 jugadores locales (4-3-3) y 11 visitantes (4-2-3-1)
const FORM_LOCAL = [
  [7, 50], [21, 18], [19, 39], [19, 61], [21, 82],
  [35, 28], [33, 50], [35, 72], [47, 20], [49, 50], [47, 80]
];
const FORM_VISIT = [
  [93, 50], [79, 18], [81, 39], [81, 61], [79, 82],
  [67, 36], [67, 64], [58, 20], [57, 50], [58, 80], [51, 50]
];

function parseEmbedUrl(raw) {
  const url = String(raw || '').trim();
  if (!url || !/^https?:\/\//i.test(url)) return null;
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|live\/|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return { tipo: 'iframe', src: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0`, fuente: 'YouTube' };
  const twMatch = url.match(/twitch\.tv\/([a-zA-Z0-9_]+)/i);
  if (twMatch && !['videos', 'directory'].includes(twMatch[1].toLowerCase())) {
    const host = (typeof location !== 'undefined' && location.hostname) ? location.hostname : 'scorecast-c5e9e.web.app';
    return { tipo: 'iframe', src: `https://player.twitch.tv/?channel=${twMatch[1]}&parent=${host}&muted=false`, fuente: 'Twitch' };
  }
  const vmMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vmMatch) return { tipo: 'iframe', src: `https://player.vimeo.com/video/${vmMatch[1]}?autoplay=1`, fuente: 'Vimeo' };
  if (/\.(m3u8|mp4|webm)(\?|$)/i.test(url)) return { tipo: url.toLowerCase().includes('.m3u8') ? 'hls' : 'video', src: url, fuente: 'Video Stream' };
  return { tipo: 'iframe', src: url, fuente: 'Señal Web Embebida' };
}

function statsTemporadaClub(code, resultados) {
  const st = { pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, pts: 0, racha: [] };
  for (const p of FIXTURE.partidos) {
    if (p.local !== code && p.visitante !== code) continue;
    const r = resultados[p.id] || p.resultado || FIXTURE.resultadosIniciales[p.id];
    if (!r || r.estado !== 'finalizado' || r.gl === undefined || r.gv === undefined) continue;
    const esL = p.local === code;
    const gMio = Number(esL ? r.gl : r.gv);
    const gRiv = Number(esL ? r.gv : r.gl);
    st.pj++; st.gf += gMio; st.gc += gRiv;
    if (gMio > gRiv) { st.pg++; st.pts += 3; st.racha.push('V'); }
    else if (gMio < gRiv) { st.pp++; st.racha.push('D'); }
    else { st.pe++; st.pts += 1; st.racha.push('E'); }
  }
  st.dg = st.gf - st.gc;
  st.gfProm = st.pj ? (st.gf / st.pj).toFixed(2) : '0.00';
  st.gcProm = st.pj ? (st.gc / st.pj).toFixed(2) : '0.00';
  st.ultimos5 = st.racha.slice(-5);
  return st;
}

function barraStat(label, valL, valV, sufijo = '') {
  const nL = parseFloat(String(valL).replace('%', '')) || 0;
  const nV = parseFloat(String(valV).replace('%', '')) || 0;
  const sum = (nL + nV) || 1;
  const pL = Math.round((nL / sum) * 100);
  const pV = 100 - pL;
  const winL = nL > nV;
  const winV = nV > nL;
  return `
    <div class="ev-stat-row">
      <div class="ev-stat-vals">
        <span class="ev-sv ${winL ? 'ev-sv--l' : ''}">${valL}${sufijo}</span>
        <span class="ev-stat-lbl">${label}</span>
        <span class="ev-sv ${winV ? 'ev-sv--v' : ''}">${valV}${sufijo}</span>
      </div>
      <div class="ev-stat-track">
        <div class="ev-stat-fill ev-stat-fill--l" style="width:${pL}%"></div>
        <div class="ev-stat-fill ev-stat-fill--v" style="width:${pV}%"></div>
      </div>
    </div>`;
}

export const EnVivoBeta = {
  partidoActivoId: null,
  modoVista: 'radar', // 'radar' | 'player'
  subTabStats: 'stats', // 'stats' | 'timeline' | 'lineups' | 'comunidad'
  streamActual: null,
  simActivo: false,
  simData: null,
  _unsubReacc: null,
  _unsubChat: null,
  _timerRadar: null,
  _timerSim: null,
  _lastCtx: null,
  _lastCont: null,

  _obtenerCartelera(resultados = {}) {
    const todos = FIXTURE.partidos.filter(p => p.local && p.visitante && FIXTURE.equipos[p.local] && FIXTURE.equipos[p.visitante]);
    const enJuego = todos.filter(p => (resultados[p.id] || p.resultado)?.estado === 'en_juego');
    const destacadosIds = ['sud-157', 'lib-155', 'bp-cua-f1-01', 'bp-cua-f1-02', 'bp-cua-f1-03', 'bp-cua-f1-04'];
    const destacados = destacadosIds.map(id => FIXTURE.porId(id)).filter(Boolean);
    const proximos = todos
      .filter(p => {
        const est = U.estadoPartido(p, resultados[p.id] || p.resultado);
        return est === 'programado' && !destacadosIds.includes(p.id);
      })
      .sort((a, b) => (a.utc || 'z').localeCompare(b.utc || 'z'))
      .slice(0, 8);

    const mapa = new Map();
    [...enJuego, ...destacados, ...proximos].forEach(p => { if (!mapa.has(p.id)) mapa.set(p.id, p); });
    return Array.from(mapa.values());
  },

  _iniciarSimulador(partido) {
    const L = FIXTURE.equipo(partido.local), V = FIXTURE.equipo(partido.visitante);
    this.simActivo = true;
    this.modoVista = 'radar';
    this.simData = {
      pid: partido.id,
      minuto: 1,
      gl: 0, gv: 0,
      posL: 52, posV: 48,
      xgL: 0.08, xgV: 0.05,
      tirosL: 1, tirosV: 0,
      arcoL: 0, arcoV: 0,
      cornersL: 0, cornersV: 0,
      pasesL: 86, pasesV: 82,
      paradasL: 0, paradasV: 0,
      faltasL: 1, faltasV: 1,
      amarL: 0, amarV: 0,
      rojasL: 0, rojasV: 0,
      ballX: 50, ballY: 50,
      accion: `Pitazo inicial · ${L.n} mueve el balón en el centro`,
      momentum: [6],
      eventos: [{ m: 1, t: 'inicio', eq: partido.local, txt: `Inicio del partido entre ${L.n} y ${V.n}` }]
    };

    if (this._timerSim) clearInterval(this._timerSim);
    this._timerSim = setInterval(() => {
      if (!this.simActivo || !this.simData || this.simData.pid !== this.partidoActivoId) {
        this._detenerSimulador();
        return;
      }
      const s = this.simData;
      if (s.minuto >= 90) {
        s.accion = `🏁 Final del partido simulado (${L.n} ${s.gl} – ${s.gv} ${V.n})`;
        this._detenerSimulador(false);
        this._actualizarSoloDinamico();
        return;
      }
      s.minuto += 2;
      const r = Math.random();
      const atacaL = Math.random() < 0.52;
      const equipo = atacaL ? L.n : V.n;
      const codEq = atacaL ? partido.local : partido.visitante;

      // Posición balón y momentum
      s.ballX = atacaL ? (55 + Math.random() * 35) : (10 + Math.random() * 35);
      s.ballY = 16 + Math.random() * 68;
      s.posL = Math.max(34, Math.min(68, Math.round(s.posL + (atacaL ? 1 : -1) * (Math.random() * 2))));
      s.posV = 100 - s.posL;
      const momVal = Math.round((atacaL ? 1 : -1) * (12 + Math.random() * 48));
      s.momentum.push(momVal);
      if (s.momentum.length > 36) s.momentum.shift();

      if (r < 0.095) {
        // ¡GOOOL!
        if (atacaL) { s.gl++; s.tirosL++; s.arcoL++; s.xgL = +(s.xgL + 0.34 + Math.random() * 0.25).toFixed(2); }
        else { s.gv++; s.tirosV++; s.arcoV++; s.xgV = +(s.xgV + 0.34 + Math.random() * 0.25).toFixed(2); }
        s.ballX = atacaL ? 94 : 6; s.ballY = 50;
        s.accion = `⚽ ¡GOOOOL de ${equipo}! (${s.minuto}′)`;
        s.eventos.unshift({ m: s.minuto, t: 'gol', eq: codEq, txt: `¡Gol de ${equipo}! Remate cruzado dentro del área` });
      } else if (r < 0.30) {
        // Remate al arco / atajada
        if (atacaL) { s.tirosL++; s.arcoL++; s.paradasV++; s.xgL = +(s.xgL + 0.14).toFixed(2); }
        else { s.tirosV++; s.arcoV++; s.paradasL++; s.xgV = +(s.xgV + 0.14).toFixed(2); }
        s.accion = `🧤 ¡Atajadón! Remate peligroso de ${equipo} (${s.minuto}′)`;
      } else if (r < 0.48) {
        // Tiro desviado o córner
        if (atacaL) { s.tirosL++; s.cornersL++; s.xgL = +(s.xgL + 0.07).toFixed(2); }
        else { s.tirosV++; s.cornersV++; s.xgV = +(s.xgV + 0.07).toFixed(2); }
        s.accion = `🚩 Tiro de esquina a favor de ${equipo} (${s.minuto}′)`;
      } else if (r < 0.58) {
        // Falta / tarjeta amarilla
        if (atacaL) s.faltasV++; else s.faltasL++;
        if (Math.random() < 0.45) {
          if (atacaL) s.amarV++; else s.amarL++;
          const amEq = atacaL ? V.n : L.n;
          const amCod = atacaL ? partido.visitante : partido.local;
          s.accion = `🟨 Tarjeta amarilla para ${amEq} (${s.minuto}′)`;
          s.eventos.unshift({ m: s.minuto, t: 'amarilla', eq: amCod, txt: `Tarjeta amarilla para ${amEq} por falta táctica` });
        } else {
          s.accion = `📣 Tiro libre peligroso para ${equipo} (${s.minuto}′)`;
        }
      } else {
        s.pasesL = Math.max(74, Math.min(93, s.pasesL + (Math.random() < 0.5 ? 1 : -1)));
        s.pasesV = Math.max(72, Math.min(92, s.pasesV + (Math.random() < 0.5 ? 1 : -1)));
        s.accion = atacaL
          ? `⚡ ${L.n} construye ataque por la banda (${s.minuto}′)`
          : `⚡ ${V.n} presiona alto en campo rival (${s.minuto}′)`;
      }
      this._actualizarSoloDinamico();
    }, 1300);
  },

  _detenerSimulador(limpiarData = true) {
    if (this._timerSim) { clearInterval(this._timerSim); this._timerSim = null; }
    if (limpiarData) { this.simActivo = false; this.simData = null; }
  },

  _actualizarSoloDinamico() {
    if (!this._lastCont || !this._lastCtx) return;
    const partido = FIXTURE.porId(this.partidoActivoId);
    if (!partido) return;
    const s = this.simData;
    const ball = this._lastCont.querySelector('#ev-radar-ball');
    if (ball && s) {
      ball.style.left = s.ballX + '%';
      ball.style.top = s.ballY + '%';
    }
    const ticker = this._lastCont.querySelector('#ev-radar-ticker');
    if (ticker && s) ticker.textContent = s.accion;
    const scoreBox = this._lastCont.querySelector('#ev-radar-score-box');
    if (scoreBox && s) scoreBox.innerHTML = `<div class="ev-score-num">${s.gl} <span>–</span> ${s.gv}</div>`;
    const timeBox = this._lastCont.querySelector('#ev-countdown-txt');
    if (timeBox && s) timeBox.textContent = `● SIM DEMO ${s.minuto}′ · ${s.minuto <= 45 ? '1ª Parte' : '2ª Parte'}`;
    // Desplazar sutilmente jugadores hacia donde está el balón
    const shift = s ? ((s.ballX - 50) * 0.22) : 0;
    this._lastCont.querySelectorAll('.ev-player-dot').forEach(dot => {
      const bx = Number(dot.dataset.bx || 50);
      dot.style.left = Math.max(5, Math.min(95, bx + shift)) + '%';
    });
    const statsPanel = this._lastCont.querySelector('#ev-stats-hub-body');
    if (statsPanel) {
      statsPanel.innerHTML = this._renderStatsHubBody(partido, this._lastCtx);
    }
  },

  _renderStatsHubBody(partido, ctx) {
    const { resultados = {}, misPred = {}, predsByPartido = {} } = ctx;
    const res = resultados[partido.id] || partido.resultado || null;
    const L = FIXTURE.equipo(partido.local);
    const V = FIXTURE.equipo(partido.visitante);
    const stL = statsTemporadaClub(partido.local, resultados);
    const stV = statsTemporadaClub(partido.visitante, resultados);

    const apiStatsL = res?.tarjetas?.[partido.local] || null;
    const apiStatsV = res?.tarjetas?.[partido.visitante] || null;
    const usaSim = this.simActivo && this.simData && this.simData.pid === partido.id;
    const tieneVivo = usaSim || !!(apiStatsL && apiStatsV);

    if (this.subTabStats === 'stats') {
      if (tieneVivo) {
        const s = usaSim ? this.simData : null;
        const posL = s ? s.posL : parseInt(apiStatsL.posesion) || 50;
        const posV = s ? s.posV : parseInt(apiStatsV.posesion) || 50;
        const xgL = s ? s.xgL.toFixed(2) : ((apiStatsL.tirosArc || 0) * 0.28 + 0.15).toFixed(2);
        const xgV = s ? s.xgV.toFixed(2) : ((apiStatsV.tirosArc || 0) * 0.28 + 0.12).toFixed(2);
        return `
          <div class="ev-stats-head-clubs">
            <span class="ev-shc">${L.b} <b>${U.esc(L.n)}</b></span>
            <span class="ev-shc-tag">${usaSim ? '🧪 EN VIVO (DEMO)' : '📡 EN TIEMPO REAL'}</span>
            <span class="ev-shc ev-shc--v"><b>${U.esc(V.n)}</b> ${V.b}</span>
          </div>
          ${barraStat('Posesión del balón', posL, posV, '%')}
          ${barraStat('Goles esperados (xG)', xgL, xgV)}
          ${barraStat('Tiros totales', s ? s.tirosL : (apiStatsL.tirosTot ?? 0), s ? s.tirosV : (apiStatsV.tirosTot ?? 0))}
          ${barraStat('Tiros al arco', s ? s.arcoL : (apiStatsL.tirosArc ?? 0), s ? s.arcoV : (apiStatsV.tirosArc ?? 0))}
          ${barraStat('Córners', s ? s.cornersL : (apiStatsL.corners ?? 0), s ? s.cornersV : (apiStatsV.corners ?? 0))}
          ${barraStat('Precisión de pases', s ? s.pasesL : (parseInt(apiStatsL.precisionPases) || 82), s ? s.pasesV : (parseInt(apiStatsV.precisionPases) || 80), '%')}
          ${barraStat('Atajadas del arquero', s ? s.paradasL : (apiStatsL.paradas ?? 0), s ? s.paradasV : (apiStatsV.paradas ?? 0))}
          ${barraStat('Faltas cometidas', s ? s.faltasL : (apiStatsL.faltas ?? 0), s ? s.faltasV : (apiStatsV.faltas ?? 0))}
          ${barraStat('Tarjetas amarillas 🟨', s ? s.amarL : (apiStatsL.amarillas ?? 0), s ? s.amarV : (apiStatsV.amarillas ?? 0))}
        `;
      }

      // Pre-partido: comparativa REAL calculada de la temporada 2026/27 + probabilidad estimada
      const poderL = Math.max(10, (stL.pj ? (stL.pts / stL.pj) * 30 : 35) + 8);
      const poderV = Math.max(10, (stV.pj ? (stV.pts / stV.pj) * 30 : 35));
      const baseEmp = 24;
      const totP = poderL + poderV;
      const probL = Math.round(((100 - baseEmp) * poderL) / totP);
      const probV = 100 - baseEmp - probL;

      return `
        <div class="ev-stats-head-clubs">
          <span class="ev-shc">${L.b} <b>${U.esc(L.n)}</b></span>
          <span class="ev-shc-tag">📊 COMPARATIVA TEMPORADA 2026/27</span>
          <span class="ev-shc ev-shc--v"><b>${U.esc(V.n)}</b> ${V.b}</span>
        </div>
        <div class="ev-prob-box">
          <div class="ev-prob-lbls">
            <span style="color:var(--azul-claro)">Local <b>${probL}%</b></span>
            <span>Empate <b>${baseEmp}%</b></span>
            <span style="color:var(--dorado)">Visitante <b>${probV}%</b></span>
          </div>
          <div class="ev-prob-bar">
            <div style="width:${probL}%;background:var(--azul)"></div>
            <div style="width:${baseEmp}%;background:rgba(255,255,255,0.22)"></div>
            <div style="width:${probV}%;background:var(--dorado)"></div>
          </div>
        </div>
        ${barraStat('Puntos en temporada', stL.pts, stV.pts)}
        ${barraStat('Partidos ganados', stL.pg, stV.pg)}
        ${barraStat('Goles a favor', stL.gf, stV.gf)}
        ${barraStat('Promedio goles / partido', stL.gfProm, stV.gfProm)}
        ${barraStat('Goles recibidos / partido', stL.gcProm, stV.gcProm)}
        <div class="ev-rachas-comp">
          <div class="racha-dots racha-dots--mini">${stL.ultimos5.map(x => `<span class="racha-dot racha-dot--${x}">${x}</span>`).join('') || '-'}</div>
          <span class="ev-stat-lbl">Últimos 5 partidos</span>
          <div class="racha-dots racha-dots--mini">${stV.ultimos5.map(x => `<span class="racha-dot racha-dot--${x}">${x}</span>`).join('') || '-'}</div>
        </div>
        <p class="ev-stats-hint">💡 Al iniciar el encuentro, aquí se cargarán automáticamente la posesión, xG, tiros y tarjetas en tiempo real. Puedes pulsar <b>⚡ Simulador Live Demo</b> arriba para verlo en acción.</p>
      `;
    }

    if (this.subTabStats === 'timeline') {
      const mom = usaSim ? this.simData.momentum : [18, 25, -14, 30, 12, -22, -35, 16, 40, -18, 22, -12, 28, 10, -26, 32];
      const evs = usaSim
        ? this.simData.eventos
        : (res?.eventos || []).map(e => ({
            m: e.m,
            t: e.t,
            eq: e.eq,
            txt: `${e.j || 'Jugador'} (${e.detail || e.t})`
          }));

      return `
        <div class="ev-mom-wrap">
          <div class="ev-mom-head">
            <span>📈 Gráfico de Momentum (${usaSim ? 'En Vivo Demo' : 'Referencia Táctica'})</span>
            <span style="font-size:11px;color:var(--tinta-3)"><b style="color:var(--azul-claro)">▲ ${U.esc(L.n)}</b> · <b style="color:var(--dorado)">▼ ${U.esc(V.n)}</b></span>
          </div>
          <div class="ev-mom-chart">
            <div class="ev-mom-axis"></div>
            ${mom.map(v => {
              const h = Math.min(46, Math.max(6, Math.abs(v)));
              const pos = v >= 0;
              return `<div class="ev-mom-col"><span class="ev-mom-bar ${pos ? 'ev-mom-bar--l' : 'ev-mom-bar--v'}" style="height:${h}px"></span></div>`;
            }).join('')}
          </div>
        </div>
        <h4 style="margin:14px 0 8px;font-size:13px;color:var(--dorado);">⏱ Incidencias Minuto a Minuto</h4>
        <div class="ev-timeline-list">
          ${evs.length ? evs.map(e => {
            const ico = e.t === 'gol' ? '⚽' : e.t === 'amarilla' ? '🟨' : e.t === 'roja' ? '🟥' : e.t === 'cambio' ? '🔄' : '📣';
            return `
              <div class="ev-tl-item ${e.eq === partido.local ? 'ev-tl-item--l' : 'ev-tl-item--v'}">
                <span class="ev-tl-min">${e.m}′</span>
                <span class="ev-tl-ico">${ico}</span>
                <span class="ev-tl-txt">${U.esc(e.txt)}</span>
              </div>`;
          }).join('') : '<div class="sub centro" style="padding:16px;font-size:12.5px;">Aún no hay incidencias registradas. Activa <b>⚡ Simulador Live Demo</b> para previsualizar el minuto a minuto en vivo.</div>'}
        </div>`;
    }

    if (this.subTabStats === 'lineups') {
      const alin = res?.alineacion;
      if (alin && alin.length === 2) {
        const [eqL, eqV] = alin[0].cod === partido.local ? [alin[0], alin[1]] : [alin[1], alin[0]];
        return `
          <div class="ev-lineups-grid">
            <div class="ev-lu-col">
              <div class="ev-lu-head">${L.b} <b>${U.esc(L.n)}</b> <span class="etiqueta">${U.esc(eqL.f || '4-3-3')}</span></div>
              ${(eqL.xi || []).map(j => `<div class="ev-lu-row"><span>#${j.num}</span><b>${U.esc(j.n)}</b><small>${j.pos}</small></div>`).join('')}
            </div>
            <div class="ev-lu-col">
              <div class="ev-lu-head">${V.b} <b>${U.esc(V.n)}</b> <span class="etiqueta">${U.esc(eqV.f || '4-2-3-1')}</span></div>
              ${(eqV.xi || []).map(j => `<div class="ev-lu-row"><span>#${j.num}</span><b>${U.esc(j.n)}</b><small>${j.pos}</small></div>`).join('')}
            </div>
          </div>`;
      }
      return `
        <div class="ev-lineups-grid">
          <div class="ev-lu-col">
            <div class="ev-lu-head">${L.b} <b>${U.esc(L.n)}</b> <span class="etiqueta etiqueta--dorada">Esquema 4-3-3</span></div>
            <p class="sub" style="font-size:12.5px;margin:8px 0;">Alineación oficial disponible ~1 hora antes del pitazo inicial.</p>
            <div class="ev-lu-stat">🏟 Localía · ${stL.pj} PJ · ${stL.pts} pts (${stL.pg}G-${stL.pe}E-${stL.pp}P)</div>
          </div>
          <div class="ev-lu-col">
            <div class="ev-lu-head">${V.b} <b>${U.esc(V.n)}</b> <span class="etiqueta">Esquema 4-2-3-1</span></div>
            <p class="sub" style="font-size:12.5px;margin:8px 0;">Alineación oficial disponible ~1 hora antes del pitazo inicial.</p>
            <div class="ev-lu-stat">✈ Visita · ${stV.pj} PJ · ${stV.pts} pts (${stV.pg}G-${stV.pe}E-${stV.pp}P)</div>
          </div>
        </div>`;
    }

    // Tab 4: Comunidad & H2H
    const preds = predsByPartido[partido.id] || [];
    const miP = misPred[partido.id];
    let pL = 0, pE = 0, pV = 0;
    const exacts = {};
    preds.forEach(pr => {
      const gl = Number(pr.gl), gv = Number(pr.gv);
      if (isNaN(gl) || isNaN(gv)) return;
      if (gl > gv) pL++; else if (gl === gv) pE++; else pV++;
      const k = `${gl} – ${gv}`;
      exacts[k] = (exacts[k] || 0) + 1;
    });
    const tot = Math.max(1, pL + pE + pV);
    const pctL = Math.round((pL / tot) * 100);
    const pctE = Math.round((pE / tot) * 100);
    const pctV = preds.length ? (100 - pctL - pctE) : 0;
    const topExact = Object.entries(exacts).sort((a, b) => b[1] - a[1])[0];

    const h2h = FIXTURE.partidos.filter(p =>
      ((p.local === partido.local && p.visitante === partido.visitante) ||
       (p.local === partido.visitante && p.visitante === partido.local)) &&
      (resultados[p.id] || p.resultado || FIXTURE.resultadosIniciales[p.id])?.estado === 'finalizado'
    );

    return `
      <div class="ev-com-block">
        <h4 style="margin:0 0 8px;font-size:13.5px;color:var(--dorado);">🔮 Consenso de tu Sala (${preds.length} pronóstico${preds.length === 1 ? '' : 's'})</h4>
        ${preds.length ? `
          <div class="ev-prob-lbls">
            <span style="color:var(--azul-claro)">🏠 ${U.esc(L.n)}: <b>${pctL}%</b></span>
            <span>🤝 Empate: <b>${pctE}%</b></span>
            <span style="color:var(--dorado)">✈ ${U.esc(V.n)}: <b>${pctV}%</b></span>
          </div>
          <div class="ev-prob-bar" style="margin-bottom:10px;">
            <div style="width:${pctL}%;background:var(--azul)"></div>
            <div style="width:${pctE}%;background:rgba(255,255,255,0.22)"></div>
            <div style="width:${pctV}%;background:var(--dorado)"></div>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;font-size:12px;color:var(--tinta-2);">
            ${miP ? `<span>🎯 Tu pronóstico: <b style="color:var(--dorado)">${miP.gl} – ${miP.gv}</b></span>` : '<span>⏳ Aún no pronosticas este cruce</span>'}
            ${topExact && U.abierto(partido, res) !== true ? `<span>🔥 Marcador más votado: <b>${topExact[0]}</b></span>` : ''}
          </div>
        ` : '<div class="sub" style="font-size:12.5px;">Todavía no hay pronósticos de la sala para este partido. ¡Sé el primero en pronosticar!</div>'}

        <h4 style="margin:16px 0 8px;font-size:13.5px;color:var(--dorado);">⚔️ Enfrentamientos Previos en Temporada (H2H)</h4>
        ${h2h.length ? h2h.map(m => {
          const r = resultados[m.id] || m.resultado || FIXTURE.resultadosIniciales[m.id];
          return `<div class="ev-h2h-row"><span>${U.esc(m.etapa)}</span><b>${U.esc(FIXTURE.equipo(m.local).n)} ${r.gl} – ${r.gv} ${U.esc(FIXTURE.equipo(m.visitante).n)}</b><span>${U.esc(m.fecha)}</span></div>`;
        }).join('') : '<div class="sub" style="font-size:12.5px;">Primer duelo directo registrado en la temporada 2026/27.</div>'}
      </div>`;
  },

  async render(contenedor, ctx) {
    if (!contenedor) return;
    this._lastCont = contenedor;
    this._lastCtx = ctx;
    const { yo, salaId, resultados = {}, misPred = {}, irAPartido } = ctx;
    const cartelera = this._obtenerCartelera(resultados);
    if (!this.partidoActivoId || !cartelera.some(p => p.id === this.partidoActivoId)) {
      this.partidoActivoId = cartelera[0]?.id || null;
    }
    const partido = cartelera.find(p => p.id === this.partidoActivoId) || cartelera[0];
    if (!partido) {
      contenedor.innerHTML = '<div class="aviso">No hay partidos disponibles en la cartelera en este momento.</div>';
      return;
    }
    if (this.simData && this.simData.pid !== partido.id) this._detenerSimulador();

    let streamGuardado = null;
    try { streamGuardado = await Store.obtenerTransmisionBeta(salaId, partido.id); } catch (_) {}
    if (streamGuardado && streamGuardado.url && !this.streamActual) {
      this.streamActual = streamGuardado;
    }

    const res = resultados[partido.id] || partido.resultado || null;
    const est = U.estadoPartido(partido, res);
    const L = FIXTURE.equipo(partido.local);
    const V = FIXTURE.equipo(partido.visitante);
    const comp = COMPETICIONES[partido.competicion] || { nombre: partido.competicion, badge: '' };
    const guia = CANALES_GUIA[partido.competicion] || { tv: 'Señal oficial del torneo', yt: 'https://www.youtube.com', label: 'YouTube Oficial' };
    const miP = misPred[partido.id];
    const usaSim = this.simActivo && this.simData && this.simData.pid === partido.id;
    const esVivo = est === 'en_juego' || usaSim;

    let estadoChip = '<span class="live-pill live-pill--prox">📅 PRÓXIMO PARTIDO</span>';
    if (usaSim) estadoChip = '<span class="live-pill live-pill--on">🧪 SIMULACIÓN DEMO EN VIVO</span>';
    else if (est === 'en_juego') estadoChip = `<span class="live-pill live-pill--on">● EN VIVO ${res?.minuto ? res.minuto + '′' : ''}</span>`;
    else if (est === 'finalizado') estadoChip = '<span class="live-pill live-pill--fin">🏁 FINALIZADO</span>';

    const marcadorCentro = usaSim
      ? `<div class="ev-score-num">${this.simData.gl} <span>–</span> ${this.simData.gv}</div>`
      : (res && (est === 'en_juego' || est === 'finalizado'))
        ? `<div class="ev-score-num">${res.gl} <span>–</span> ${res.gv}</div>`
        : `<div class="ev-score-vs">VS</div>`;

    const tiempoSub = usaSim
      ? `● SIM DEMO ${this.simData.minuto}′ · ${this.simData.minuto <= 45 ? '1ª Parte' : '2ª Parte'}`
      : esVivo
        ? `${res?.periodo || 'En Juego'} · Actualización en tiempo real`
        : partido.utc
          ? `🕐 ${U.diaLocal(partido.utc)} · ${U.horaLocal(partido.utc)} (tu hora)`
          : (partido.fechaStr || partido.fecha);

    const parsed = this.streamActual?.url ? parseEmbedUrl(this.streamActual.url) : null;
    const playersDots = [
      ...FORM_LOCAL.map(([x, y], i) => `<span class="ev-player-dot ev-player-dot--l" data-bx="${x}" style="left:${x}%;top:${y}%" title="${U.esc(L.n)} #${i + 1}">${i + 1}</span>`),
      ...FORM_VISIT.map(([x, y], i) => `<span class="ev-player-dot ev-player-dot--v" data-bx="${x}" style="left:${x}%;top:${y}%" title="${U.esc(V.n)} #${i + 1}">${i + 1}</span>`)
    ].join('');

    const viewportHtml = (this.modoVista === 'player')
      ? (parsed
          ? (parsed.tipo === 'iframe'
              ? `<iframe id="ev-iframe" class="ev-video-frame" src="${U.esc(parsed.src)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`
              : `<video id="ev-video" class="ev-video-frame" controls autoplay playsinline src="${parsed.tipo === 'video' ? U.esc(parsed.src) : ''}"></video>`)
          : `<div class="ev-empty-player">
               <div class="ev-empty-icon">📺</div>
               <h3>Reproductor Watch Party · Versión BETA</h3>
               <p>Pega abajo un enlace oficial embebible (<b>YouTube Live</b>, <b>Twitch</b>, previa oficial o stream <code>.m3u8</code> / <code>.mp4</code>) para ver el partido aquí mismo con tu sala.</p>
               <div class="ev-empty-actions">
                 <button type="button" class="boton boton--verde" id="ev-btn-enfocar-url">🔗 Cargar enlace</button>
                 <button type="button" class="boton boton--fantasma" data-preset-url="${U.esc(STREAMS_PRUEBA_LEGALES[0].url)}">${U.esc(STREAMS_PRUEBA_LEGALES[0].label)}</button>
                 <a class="boton boton--fantasma" href="${U.esc(guia.yt)}" target="_blank" rel="noopener">▶ Canal ${U.esc(guia.label)} ↗</a>
               </div>
               <small style="color:var(--tinta-3);margin-top:8px;">📡 Señal oficial TV/Streaming: <b style="color:var(--tinta-2)">${U.esc(guia.tv)}</b></small>
             </div>`)
      : `<div class="ev-radar-pitch">
           <div class="ev-radar-field">
             <div class="ev-radar-lines">
               <div class="ev-rf-half"></div>
               <div class="ev-rf-circle"></div>
               <div class="ev-rf-box-l"></div>
               <div class="ev-rf-box-r"></div>
               ${playersDots}
               <div class="ev-rf-ball" id="ev-radar-ball" style="left:${usaSim ? this.simData.ballX : 50}%;top:${usaSim ? this.simData.ballY : 50}%" title="Balón en vivo">⚽</div>
             </div>
             <div class="ev-radar-overlay">
               <div class="ev-radar-comp">
                 ${comp.badge ? `<img src="${comp.badge}" class="chip-logo" alt="">` : ''}
                 <span>${U.esc(partido.etapa)}</span>
                 ${estadoChip}
               </div>
               <div class="ev-radar-duelo">
                 <div class="ev-radar-club" data-equipo="${partido.local}">
                   <div class="ev-radar-crest">${L.b}</div>
                   <div class="ev-radar-name">${U.esc(L.n)}</div>
                 </div>
                 <div class="ev-radar-center">
                   <div id="ev-radar-score-box">${marcadorCentro}</div>
                   <div class="ev-radar-time" id="ev-countdown-txt">${U.esc(tiempoSub)}</div>
                 </div>
                 <div class="ev-radar-club" data-equipo="${partido.visitante}">
                   <div class="ev-radar-crest">${V.b}</div>
                   <div class="ev-radar-name">${U.esc(V.n)}</div>
                 </div>
               </div>
               <div class="ev-radar-foot">
                 <span id="ev-radar-ticker">🏟 ${U.esc(usaSim ? this.simData.accion : (partido.estadio || 'Estadio oficial'))}</span>
                 <span>📡 ${U.esc(guia.tv)}</span>
               </div>
             </div>
           </div>
         </div>`;

    contenedor.innerHTML = `
      <div class="beta-banner">
        <div class="beta-banner-left">
          <span class="beta-tag-pulse">🧪 VERSIÓN BETA</span>
          <div>
            <strong>Radar Táctico 2D, Estadísticas en Tiempo Real & Watch Party</strong>
            <p>Sigue el partido con radar 2D interactivo, estadísticas al instante, gráfico de momentum y Watch Party embebible (YouTube Live / Twitch / señales legales). ScoreCast respeta derechos de transmisión y no enlaza señales no autorizadas.</p>
          </div>
        </div>
        ${miP
          ? `<div class="ev-mipred-badge">🎯 Tu pronóstico: <b>${miP.gl} – ${miP.gv}</b></div>`
          : `<button type="button" class="boton boton--verde boton--mini" id="ev-btn-ir-pron">🔮 Pronosticar partido</button>`}
      </div>

      <div class="ev-stage-grid">
        <div class="ev-main-col">
          <div class="ev-mode-bar">
            <div class="ev-mode-tabs">
              <button type="button" class="ev-mode-btn ${this.modoVista === 'radar' ? 'activo' : ''}" data-ev-modo="radar">
                🏟 Radar Táctico 2D
              </button>
              <button type="button" class="ev-mode-btn ${this.modoVista === 'player' ? 'activo' : ''}" data-ev-modo="player">
                🎥 Ver Transmisión <span class="mini-beta">BETA</span>
              </button>
            </div>
            <div class="ev-mode-right" style="display:flex;gap:6px;flex-wrap:wrap;">
              <button type="button" class="boton ${usaSim ? 'boton--peligro' : 'boton--verde'} boton--mini" id="ev-btn-sim">
                ${usaSim ? '⏹ Detener Simulador Demo' : '⚡ Simulador Live Demo'}
              </button>
              <button type="button" class="boton boton--fantasma boton--mini" id="ev-btn-fs" title="Pantalla completa">⛶</button>
            </div>
          </div>

          <div class="ev-viewport" id="ev-viewport">
            ${viewportHtml}
            <div class="ev-float-layer" id="ev-float-layer"></div>
          </div>

          <form class="ev-stream-form" id="ev-stream-form" autocomplete="off">
            <input type="url" id="ev-stream-url" class="ev-stream-input"
                   placeholder="Pega enlace de YouTube Live, Twitch, embed o .m3u8/.mp4 para ver aquí..."
                   value="${U.esc(this.streamActual?.url || '')}">
            <button type="submit" class="boton boton--verde boton--mini">▶ Reproducir</button>
            <button type="button" class="boton boton--fantasma boton--mini" id="ev-btn-compartir-sala">📡 Compartir a sala</button>
            ${this.streamActual?.url ? '<button type="button" class="boton boton--fantasma boton--mini" id="ev-btn-limpiar-url" title="Detener señal">⏹</button>' : ''}
          </form>
          <div class="ev-presets-bar">
            <span style="font-size:11px;color:var(--tinta-3);font-weight:700;">🧪 Pruebas rápidas (libres de derechos):</span>
            ${STREAMS_PRUEBA_LEGALES.map(sp => `<button type="button" class="ev-qchip" data-preset-url="${U.esc(sp.url)}">${U.esc(sp.label)}</button>`).join('')}
            <a class="ev-qchip" href="${U.esc(guia.yt)}" target="_blank" rel="noopener" style="text-decoration:none;">▶ YouTube ${U.esc(guia.label)} ↗</a>
          </div>

          <div class="ev-reacc-bar">
            <span class="ev-reacc-tit">⚡ Reacciones en vivo:</span>
            <div class="ev-reacc-btns" id="ev-reacc-btns">
              ${REACCIONES.map(r => `
                <button type="button" class="ev-reacc-btn" data-reacc="${r.key}" data-emoji="${r.emoji}" title="${r.label}">
                  <span>${r.emoji}</span>
                  <span class="ev-reacc-cnt" data-cnt="${r.key}">0</span>
                </button>`).join('')}
            </div>
          </div>

          <!-- CENTRO DE ESTADÍSTICAS EN TIEMPO REAL -->
          <div class="panel ev-stats-hub">
            <div class="ev-stats-tabs">
              <button type="button" class="ev-stab ${this.subTabStats === 'stats' ? 'activo' : ''}" data-stab="stats">📊 Estadísticas</button>
              <button type="button" class="ev-stab ${this.subTabStats === 'timeline' ? 'activo' : ''}" data-stab="timeline">⏱ Momentum & Minuto</button>
              <button type="button" class="ev-stab ${this.subTabStats === 'lineups' ? 'activo' : ''}" data-stab="lineups">👕 Alineaciones</button>
              <button type="button" class="ev-stab ${this.subTabStats === 'comunidad' ? 'activo' : ''}" data-stab="comunidad">🔮 Comunidad & H2H</button>
            </div>
            <div class="ev-stats-hub-body" id="ev-stats-hub-body">
              ${this._renderStatsHubBody(partido, ctx)}
            </div>
          </div>
        </div>

        <!-- CHAT WATCH PARTY LATERAL -->
        <aside class="ev-chat-col panel">
          <div class="ev-chat-head">
            <div>
              <h3 style="margin:0;font-size:14.5px;display:flex;align-items:center;gap:6px;">
                💬 Watch Party · Chat en Vivo
              </h3>
              <small style="color:var(--tinta-3);font-size:11px;">Comenta el partido con tu sala en tiempo real</small>
            </div>
            <span class="live-dot-mini"></span>
          </div>
          <div class="ev-chat-msgs" id="ev-chat-msgs">
            <div class="sub centro" style="padding:20px;font-size:12px;">Cargando tribuna en vivo...</div>
          </div>
          <div class="ev-quick-chips">
            <button type="button" class="ev-qchip" data-qmsg="⚽ ¡GOOOOL! 🔥">⚽ ¡GOOOL!</button>
            <button type="button" class="ev-qchip" data-qmsg="🎯 ¡Así queda mi marcador exacto!">🎯 Mi exacto</button>
            <button type="button" class="ev-qchip" data-qmsg="😱 ¡Qué jugadón!">😱 Jugadón</button>
          </div>
          <form class="ev-chat-form" id="ev-chat-form" autocomplete="off">
            <input type="text" id="ev-chat-in" maxlength="400" placeholder="Escribe en el Watch Party..." required>
            <button type="submit" class="boton boton--verde boton--mini">Enviar</button>
          </form>
        </aside>
      </div>

      <div class="ev-cartelera-wrap">
        <div class="ev-cartelera-head">
          <h3 style="margin:0;font-size:16px;color:var(--dorado);">🎬 Cartelera de Partidos · Selecciona cuál seguir</h3>
          <span style="font-size:12px;color:var(--tinta-3)">${cartelera.length} encuentros destacados</span>
        </div>
        <div class="ev-cartelera-grid">
          ${cartelera.map(p => {
            const r = resultados[p.id] || p.resultado;
            const e = U.estadoPartido(p, r);
            const eqL = FIXTURE.equipo(p.local), eqV = FIXTURE.equipo(p.visitante);
            const activo = p.id === partido.id;
            const vivo = e === 'en_juego';
            return `
              <button type="button" class="ev-card-pick ${activo ? 'activo' : ''} ${vivo ? 'vivo' : ''}" data-pick-pid="${p.id}">
                <div class="ev-cp-top">
                  <span>${U.esc(p.etapa)}</span>
                  ${vivo ? '<span class="ev-cp-live">● VIVO</span>' : `<span>${U.esc(p.fechaStr || p.fecha)}</span>`}
                </div>
                <div class="ev-cp-teams">
                  <span class="ev-cp-t">${eqL.b} <span>${U.esc(eqL.n)}</span></span>
                  <b class="ev-cp-vs">${vivo ? `${r.gl}-${r.gv}` : 'VS'}</b>
                  <span class="ev-cp-t ev-cp-t--v"><span>${U.esc(eqV.n)}</span> ${eqV.b}</span>
                </div>
              </button>`;
          }).join('')}
        </div>
      </div>
    `;

    if (this.modoVista === 'player' && parsed?.tipo === 'hls') {
      this._initHls(contenedor.querySelector('#ev-video'), parsed.src);
    }

    contenedor.querySelectorAll('[data-ev-modo]').forEach(btn => {
      btn.onclick = () => { this.modoVista = btn.dataset.evModo; this.render(contenedor, ctx); };
    });

    contenedor.querySelectorAll('[data-stab]').forEach(btn => {
      btn.onclick = () => {
        this.subTabStats = btn.dataset.stab;
        contenedor.querySelectorAll('[data-stab]').forEach(b => b.classList.toggle('activo', b === btn));
        const body = contenedor.querySelector('#ev-stats-hub-body');
        if (body) body.innerHTML = this._renderStatsHubBody(partido, ctx);
      };
    });

    const btnSim = contenedor.querySelector('#ev-btn-sim');
    if (btnSim) {
      btnSim.onclick = () => {
        if (this.simActivo) {
          this._detenerSimulador();
          U.toast('Simulador Demo detenido.', 'info');
        } else {
          this._iniciarSimulador(partido);
          U.toast('⚡ Simulador Live Demo activado (no altera datos reales)', 'ok');
        }
        this.render(contenedor, ctx);
      };
    }

    const btnPron = contenedor.querySelector('#ev-btn-ir-pron');
    if (btnPron && typeof irAPartido === 'function') btnPron.onclick = () => irAPartido(partido.id);

    const btnFocus = contenedor.querySelector('#ev-btn-enfocar-url');
    if (btnFocus) btnFocus.onclick = () => contenedor.querySelector('#ev-stream-url')?.focus();

    contenedor.querySelectorAll('[data-preset-url]').forEach(btn => {
      btn.onclick = () => {
        const url = btn.dataset.presetUrl;
        const p = parseEmbedUrl(url);
        if (!p) return;
        this.streamActual = { url, titulo: btn.textContent.trim() };
        this.modoVista = 'player';
        U.toast(`Reproduciendo prueba legal (${p.fuente}) 📺`, 'ok');
        this.render(contenedor, ctx);
      };
    });

    const btnLimpiar = contenedor.querySelector('#ev-btn-limpiar-url');
    if (btnLimpiar) {
      btnLimpiar.onclick = () => {
        this.streamActual = null;
        U.toast('Señal detenida.', 'info');
        this.render(contenedor, ctx);
      };
    }

    const btnFs = contenedor.querySelector('#ev-btn-fs');
    if (btnFs) btnFs.onclick = () => {
      const vp = contenedor.querySelector('#ev-viewport');
      if (vp && vp.requestFullscreen) vp.requestFullscreen().catch(() => {});
    };

    const formStream = contenedor.querySelector('#ev-stream-form');
    if (formStream) {
      formStream.onsubmit = (e) => {
        e.preventDefault();
        const url = contenedor.querySelector('#ev-stream-url').value.trim();
        const p = parseEmbedUrl(url);
        if (!p) { U.toast('Ingresa una URL HTTPS válida (YouTube Live, Twitch o .m3u8/.mp4).', 'error'); return; }
        this.streamActual = { url, titulo: partido.etapa };
        this.modoVista = 'player';
        U.toast(`Señal cargada (${p.fuente}) en modo BETA 📺`, 'ok');
        this.render(contenedor, ctx);
      };
    }

    const btnCompSala = contenedor.querySelector('#ev-btn-compartir-sala');
    if (btnCompSala) {
      btnCompSala.onclick = async () => {
        const url = contenedor.querySelector('#ev-stream-url').value.trim();
        const p = parseEmbedUrl(url);
        if (!p) { U.toast('Primero pega un enlace válido para compartirlo con la sala.', 'error'); return; }
        try {
          await Store.guardarTransmisionBeta(salaId, partido.id, url, partido.etapa, yo.uid);
          this.streamActual = { url, titulo: partido.etapa };
          this.modoVista = 'player';
          U.toast('📡 ¡Señal compartida con toda tu sala!', 'ok');
          this.render(contenedor, ctx);
        } catch (err) { U.toast('No se pudo compartir la señal: ' + err.message, 'error'); }
      };
    }

    contenedor.querySelectorAll('[data-pick-pid]').forEach(btn => {
      btn.onclick = () => {
        this._detenerSimulador();
        this.partidoActivoId = btn.dataset.pickPid;
        this.streamActual = null;
        this.render(contenedor, ctx);
      };
    });

    const floatLayer = contenedor.querySelector('#ev-float-layer');
    const lanzarEmoji = (emoji) => {
      if (!floatLayer) return;
      const span = document.createElement('span');
      span.className = 'ev-float-emoji';
      span.textContent = emoji;
      span.style.left = (15 + Math.random() * 70) + '%';
      floatLayer.appendChild(span);
      setTimeout(() => span.remove(), 1700);
    };

    contenedor.querySelectorAll('[data-reacc]').forEach(btn => {
      btn.onclick = async () => {
        lanzarEmoji(btn.dataset.emoji);
        try { await Store.enviarReaccionVivo(salaId, partido.id, btn.dataset.reacc); } catch (_) {}
      };
    });

    if (this._unsubReacc) { try { this._unsubReacc(); } catch (_) {} }
    this._unsubReacc = Store.escucharReaccionesVivo(salaId, partido.id, (data) => {
      REACCIONES.forEach(r => {
        const el = contenedor.querySelector(`[data-cnt="${r.key}"]`);
        if (el) el.textContent = Number(data?.[r.key] || 0);
      });
    });

    const msgsBox = contenedor.querySelector('#ev-chat-msgs');
    if (this._unsubChat) { try { this._unsubChat(); } catch (_) {} }
    this._unsubChat = Store.escucharChat(salaId, (lista) => {
      if (!msgsBox) return;
      if (!lista || !lista.length) {
        msgsBox.innerHTML = '<div class="sub centro" style="padding:24px 10px;font-size:12px;">Sé el primero en comentar este partido en el Watch Party ⚽</div>';
        return;
      }
      msgsBox.innerHTML = lista.slice(-30).map(m => {
        const esYo = m.uid === yo.uid;
        const hora = m.t ? new Date(m.t).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : '';
        return `
          <div class="ev-msg ${esYo ? 'ev-msg--yo' : ''}">
            <div class="ev-msg-meta"><b>${U.esc(m.nombre?.split(' ')[0] || 'Jugador')}</b><span>${hora}</span></div>
            <div class="ev-msg-txt">${U.esc(m.texto)}</div>
          </div>`;
      }).join('');
      msgsBox.scrollTop = msgsBox.scrollHeight;
    });

    const enviar = async (texto) => {
      if (!texto.trim()) return;
      try { await Store.enviarMensajeChat(salaId, yo, texto, partido.id); }
      catch (err) { U.toast('No se pudo enviar el mensaje: ' + err.message, 'error'); }
    };

    const formChat = contenedor.querySelector('#ev-chat-form');
    if (formChat) {
      formChat.onsubmit = async (e) => {
        e.preventDefault();
        const inp = contenedor.querySelector('#ev-chat-in');
        const txt = inp.value.trim();
        if (!txt) return;
        inp.value = '';
        await enviar(txt);
      };
    }

    contenedor.querySelectorAll('[data-qmsg]').forEach(btn => { btn.onclick = () => enviar(btn.dataset.qmsg); });

    if (this._timerRadar) clearInterval(this._timerRadar);
    if (this.modoVista === 'radar' && !usaSim) {
      const ball = contenedor.querySelector('#ev-radar-ball');
      if (ball) {
        this._timerRadar = setInterval(() => {
          const bx = 22 + Math.random() * 56;
          ball.style.left = bx + '%';
          ball.style.top = (22 + Math.random() * 56) + '%';
          const shift = (bx - 50) * 0.16;
          contenedor.querySelectorAll('.ev-player-dot').forEach(dot => {
            dot.style.left = Math.max(5, Math.min(95, Number(dot.dataset.bx) + shift)) + '%';
          });
        }, 2800);
      }
    }
  },

  _initHls(videoEl, src) {
    if (!videoEl || !src) return;
    if (videoEl.canPlayType('application/vnd.apple.mpegurl')) { videoEl.src = src; return; }
    const attach = () => {
      if (window.Hls && window.Hls.isSupported()) {
        const hls = new window.Hls();
        hls.loadSource(src);
        hls.attachMedia(videoEl);
      }
    };
    if (window.Hls) return attach();
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.15/dist/hls.min.js';
    s.onload = attach;
    document.head.appendChild(s);
  },

  destruir() {
    this._detenerSimulador();
    if (this._unsubReacc) { try { this._unsubReacc(); } catch (_) {} this._unsubReacc = null; }
    if (this._unsubChat) { try { this._unsubChat(); } catch (_) {} this._unsubChat = null; }
    if (this._timerRadar) { clearInterval(this._timerRadar); this._timerRadar = null; }
  }
};

window.EnVivoBeta = EnVivoBeta;
