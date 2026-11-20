/* ============================================================
   SCORECAST — MOTOR HÍBRIDO DE ANÁLISIS IA Y ESTADÍSTICA POISSON
   ------------------------------------------------------------
   • Funciona 100% gratis ($0 COP) en tiempo real usando los
     resultados reales de la temporada 2026/27 (887+ partidos),
     modelo matemático Poisson con ajuste Dixon-Coles y perfiles
     históricos de clubes (EquiposInfo).
   • Si el usuario activa el enriquecimiento externo y
     CONFIG.IA.proxyUrl responde, potencia el informe con LLM;
     ante cualquier fallo de red o cuota cae automáticamente al
     motor estadístico local sin mostrar errores.
   ============================================================ */

const _cfg = () => (typeof window !== 'undefined' && window.CONFIG) || globalThis.CONFIG || {};
const _fix = () => (typeof window !== 'undefined' && window.FIXTURE) || globalThis.FIXTURE || { equipos: {}, partidos: [], resultadosIniciales: {} };
const _eqInfo = () => (typeof window !== 'undefined' && window.EquiposInfo) || globalThis.EquiposInfo || null;

const COMP_NOMBRES_IA = {
  betplay:      'Liga BetPlay Dimayor 2026-II',
  premier:      'Premier League 2026/27',
  laliga:       'LaLiga EA Sports 2026/27',
  bundesliga:   'Bundesliga 2026/27',
  ucl:          'UEFA Champions League 2026/27',
  libertadores: 'Copa CONMEBOL Libertadores 2026',
  sudamericana: 'Copa CONMEBOL Sudamericana 2026'
};

function _poissonPmf(lambda, k) {
  let fact = 1;
  for (let i = 2; i <= k; i++) fact *= i;
  return Math.exp(-lambda) * Math.pow(lambda, k) / fact;
}

function _escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const IA = {

  COMP_NOMBRES: COMP_NOMBRES_IA,

  /* Siempre disponible gracias al motor estadístico Poisson local */
  disponible() {
    return true;
  },

  tieneProxyExterno() {
    return !!((_cfg().IA?.proxyUrl || '').trim());
  },

  /* Llamada opcional al proxy externo LLM con timeout seguro */
  async analizar(prompt, timeoutMs = 12000) {
    const proxyUrl = (_cfg().IA?.proxyUrl || '').trim();
    if (!proxyUrl) {
      throw new Error('Proxy externo IA no configurado (usando motor estadístico local).');
    }
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
    try {
      const resp = await fetch(proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: ctrl?.signal,
        body: JSON.stringify({
          prompt,
          sistema: 'Eres un analista táctico y estadístico de fútbol profesional para ScoreCast (temporada 2026/27). Responde siempre en español con formato Markdown limpio (encabezados ##, tablas, viñetas y negritas). No menciones casas de apuestas ni cuotas comerciales.'
        })
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` }));
        throw new Error(err.error || `HTTP ${resp.status}`);
      }
      const data = await resp.json();
      if (data.error) throw new Error(data.error);
      return data.texto || '';
    } finally {
      if (timer) clearTimeout(timer);
    }
  },

  /* Convierte Markdown a HTML seguro */
  mdAHtml(md) {
    if (!md) return '';
    let h = _escHtml(md)
      // Tablas
      .replace(/^\|(.+)\|\s*$/gm, '<tr>$1</tr>')
      .replace(/<tr>(.+)<\/tr>/g, m => {
        const celdas = m.slice(4, -5).split('|').map(c => c.trim()).filter((_, i, arr) => !(i === 0 && _ === '') && !(i === arr.length - 1 && _ === ''));
        if (celdas.length && celdas.every(c => /^[-:]+$/.test(c))) return '';
        return '<tr>' + celdas.map(c => `<td>${c}</td>`).join('') + '</tr>';
      })
      // Encabezados
      .replace(/^### (.+)$/gm, '<h4 style="color:var(--azul-claro);margin:14px 0 6px">$1</h4>')
      .replace(/^## (.+)$/gm, '<h3 style="color:var(--dorado);margin:18px 0 8px;font-size:16px">$1</h3>')
      .replace(/^# (.+)$/gm, '<h2 style="color:var(--dorado);margin:20px 0 10px">$1</h2>')
      // Negritas e itálicas
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      .replace(/\*(.+?)\*/g, '<i>$1</i>')
      // Viñetas
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/^• (.+)$/gm, '<li>$1</li>')
      // Separadores
      .replace(/^---+$/gm, '<hr style="border-color:var(--linea);margin:12px 0">')
      // Párrafos
      .replace(/\n{2,}/g, '</p><p>')
      .replace(/\n/g, '<br>');

    h = h.replace(/(<li>.*?<\/li>)+/gs, m => `<ul style="margin:8px 0 8px 20px;line-height:1.75">${m}</ul>`);
    h = h.replace(/(<tr>.*?<\/tr>)+/gs, m => {
      const primeraFila = m.replace(/<tr>(.*?)<\/tr>/, (_, inner) => `<thead><tr>${inner.replace(/<td>/g, '<th>').replace(/<\/td>/g, '</th>')}</tr></thead><tbody>`);
      return `<div class="tabla-envoltura" style="margin:10px 0"><table class="tabla" style="margin:0;min-width:0">${primeraFila}</tbody></table></div>`;
    });

    return `<p>${h}</p>`;
  },

  /* =========================================================
     MOTOR ESTADÍSTICO REAL (TEMPORADA 2026/27)
     ========================================================= */
  _resultadosBase(resultados) {
    const fix = _fix();
    return { ...(fix.resultadosIniciales || {}), ...(resultados || {}) };
  },

  /* Calcula métricas reales de la temporada 2026/27 para un club */
  estadisticasEquipo(codigo, resultados = {}, competicion = null) {
    const fix = _fix();
    const resMap = this._resultadosBase(resultados);
    const eq = fix.equipo ? fix.equipo(codigo) : (fix.equipos?.[codigo] || { n: codigo, comp: '' });

    const jugados = [];
    const proximos = [];
    const compsVistas = new Set();

    for (const p of (fix.partidos || [])) {
      if (p.local !== codigo && p.visitante !== codigo) continue;
      if (competicion && p.competicion !== competicion) continue;
      if (p.competicion) compsVistas.add(p.competicion);

      const r = resMap[p.id];
      const esLocal = p.local === codigo;
      const rival = esLocal ? p.visitante : p.local;
      const rivalObj = rival && fix.equipo ? fix.equipo(rival) : { n: rival || 'Por definir' };

      if (r && r.estado === 'finalizado' && r.gl !== null && r.gl !== undefined && r.gv !== null && r.gv !== undefined) {
        const gf = esLocal ? Number(r.gl) : Number(r.gv);
        const gc = esLocal ? Number(r.gv) : Number(r.gl);
        const res = gf > gc ? 'V' : gf === gc ? 'E' : 'D';
        jugados.push({
          id: p.id, comp: p.competicion, etapa: p.etapa || '', utc: p.utc || p.fecha || '',
          esLocal, rival, rivalNom: rivalObj.n, gf, gc, res
        });
      } else if (rival) {
        proximos.push({
          id: p.id, comp: p.competicion, etapa: p.etapa || '', utc: p.utc || p.fecha || '',
          esLocal, rival, rivalNom: rivalObj.n
        });
      }
    }

    jugados.sort((a, b) => String(a.utc).localeCompare(String(b.utc)));
    proximos.sort((a, b) => String(a.utc).localeCompare(String(b.utc)));

    const stats = {
      codigo,
      nombre: eq.n || codigo,
      compPrincipal: competicion || eq.comp || [...compsVistas][0] || '',
      competiciones: [...compsVistas],
      pj: jugados.length,
      g: 0, e: 0, p: 0, pts: 0, gf: 0, gc: 0, dg: 0,
      vallasInvictas: 0, btts: 0, over25: 0,
      local: { pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 },
      vis:   { pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 },
      ultimos5: jugados.slice(-5).reverse(),
      ultimos10: jugados.slice(-10),
      proximos: proximos.slice(0, 4)
    };

    for (const m of jugados) {
      stats.gf += m.gf;
      stats.gc += m.gc;
      if (m.gc === 0) stats.vallasInvictas++;
      if (m.gf > 0 && m.gc > 0) stats.btts++;
      if (m.gf + m.gc >= 3) stats.over25++;

      const split = m.esLocal ? stats.local : stats.vis;
      split.pj++;
      split.gf += m.gf;
      split.gc += m.gc;

      if (m.res === 'V') { stats.g++; stats.pts += 3; split.g++; split.pts += 3; }
      else if (m.res === 'E') { stats.e++; stats.pts += 1; split.e++; split.pts += 1; }
      else { stats.p++; split.p++; }
    }

    stats.dg = stats.gf - stats.gc;
    stats.ppg = stats.pj ? +(stats.pts / stats.pj).toFixed(2) : 1.35;
    stats.gfPj = stats.pj ? +(stats.gf / stats.pj).toFixed(2) : 1.30;
    stats.gcPj = stats.pj ? +(stats.gc / stats.pj).toFixed(2) : 1.25;
    stats.pctValla = stats.pj ? Math.round((stats.vallasInvictas / stats.pj) * 100) : 28;
    stats.pctBTTS = stats.pj ? Math.round((stats.btts / stats.pj) * 100) : 50;
    stats.pctOver25 = stats.pj ? Math.round((stats.over25 / stats.pj) * 100) : 48;

    // Forma reciente últimos 5 (PPG)
    const u5 = jugados.slice(-5);
    const pts5 = u5.reduce((s, m) => s + (m.res === 'V' ? 3 : m.res === 'E' ? 1 : 0), 0);
    stats.ppg5 = u5.length ? +(pts5 / u5.length).toFixed(2) : stats.ppg;
    stats.gf5 = u5.length ? +(u5.reduce((s, m) => s + m.gf, 0) / u5.length).toFixed(2) : stats.gfPj;
    stats.gc5 = u5.length ? +(u5.reduce((s, m) => s + m.gc, 0) / u5.length).toFixed(2) : stats.gcPj;

    return stats;
  },

  /* Promedio de goles por partido de la competición (para normalizar Poisson) */
  _mediaGolesLiga(comp, resultados = {}) {
    const fix = _fix();
    const resMap = this._resultadosBase(resultados);
    let totL = 0, totV = 0, n = 0;
    for (const p of (fix.partidos || [])) {
      if (comp && p.competicion !== comp) continue;
      const r = resMap[p.id];
      if (r && r.estado === 'finalizado' && r.gl !== null && r.gv !== null) {
        totL += Number(r.gl);
        totV += Number(r.gv);
        n++;
      }
    }
    if (n < 8) return { mediaL: 1.48, mediaV: 1.16, mediaTot: 2.64 };
    return {
      mediaL: +(totL / n).toFixed(2),
      mediaV: +(totV / n).toFixed(2),
      mediaTot: +((totL + totV) / n).toFixed(2)
    };
  },

  /* Enfrentamientos directos reales en el fixture 2026/27 */
  historialDirecto(codA, codB, resultados = {}) {
    const fix = _fix();
    const resMap = this._resultadosBase(resultados);
    const partidos = [];
    for (const p of (fix.partidos || [])) {
      const ok = (p.local === codA && p.visitante === codB) || (p.local === codB && p.visitante === codA);
      if (!ok) continue;
      const r = resMap[p.id];
      if (r && r.estado === 'finalizado' && r.gl !== null && r.gv !== null) {
        partidos.push({
          id: p.id, comp: p.competicion, etapa: p.etapa || '', utc: p.utc || p.fecha || '',
          local: p.local, visitante: p.visitante, gl: Number(r.gl), gv: Number(r.gv)
        });
      }
    }
    partidos.sort((a, b) => String(b.utc).localeCompare(String(a.utc)));
    let wA = 0, emp = 0, wB = 0;
    for (const m of partidos) {
      if (m.gl === m.gv) emp++;
      else if ((m.local === codA && m.gl > m.gv) || (m.visitante === codA && m.gv > m.gl)) wA++;
      else wB++;
    }
    return { wA, emp, wB, partidos };
  },

  /* Modelo matemático Poisson + Dixon-Coles para predecir probabilidades y marcador exacto */
  predecirPoisson(codLocal, codVisitante, resultados = {}, competicion = null) {
    const stL = this.estadisticasEquipo(codLocal, resultados, competicion);
    const stV = this.estadisticasEquipo(codVisitante, resultados, competicion);
    const compRef = competicion || (stL.compPrincipal === stV.compPrincipal ? stL.compPrincipal : null);
    const { mediaL, mediaV } = this._mediaGolesLiga(compRef, resultados);
    const mediaClub = (mediaL + mediaV) / 2;

    // Suavizado bayesiano (evita extremos cuando hay pocos partidos jugados)
    const prior = 4;
    const atkL = ((stL.gf + prior * mediaClub) / (stL.pj + prior)) / mediaClub;
    const defL = ((stL.gc + prior * mediaClub) / (stL.pj + prior)) / mediaClub;
    const atkV = ((stV.gf + prior * mediaClub) / (stV.pj + prior)) / mediaClub;
    const defV = ((stV.gc + prior * mediaClub) / (stV.pj + prior)) / mediaClub;

    // Ajuste de localía real + forma reciente (últimos 5 partidos = 25% peso)
    const splitAtkL = stL.local.pj >= 3 ? (stL.local.gf / stL.local.pj) / mediaL : atkL;
    const splitDefL = stL.local.pj >= 3 ? (stL.local.gc / stL.local.pj) / mediaV : defL;
    const splitAtkV = stV.vis.pj >= 3 ? (stV.vis.gf / stV.vis.pj) / mediaV : atkV;
    const splitDefV = stV.vis.pj >= 3 ? (stV.vis.gc / stV.vis.pj) / mediaL : defV;

    const formAtkL = stL.gf5 / mediaClub;
    const formDefL = stL.gc5 / mediaClub;
    const formAtkV = stV.gf5 / mediaClub;
    const formDefV = stV.gc5 / mediaClub;

    let xGL = mediaL * (0.45 * atkL + 0.30 * splitAtkL + 0.25 * formAtkL) * (0.45 * defV + 0.30 * splitDefV + 0.25 * formDefV);
    let xGV = mediaV * (0.45 * atkV + 0.30 * splitAtkV + 0.25 * formAtkV) * (0.45 * defL + 0.30 * splitDefL + 0.25 * formDefL);

    xGL = Math.min(3.55, Math.max(0.38, +xGL.toFixed(2)));
    xGV = Math.min(3.35, Math.max(0.32, +xGV.toFixed(2)));

    // Matriz Poisson 0..6 goles + corrección Dixon-Coles en marcadores cerrados
    const rho = -0.06;
    let pL = 0, pE = 0, pV = 0, pOver25 = 0, pBTTS = 0, totalProb = 0;
    const marcadores = [];

    for (let i = 0; i <= 6; i++) {
      for (let j = 0; j <= 6; j++) {
        let p = _poissonPmf(xGL, i) * _poissonPmf(xGV, j);
        if (i === 0 && j === 0) p *= (1 - xGL * xGV * rho);
        else if (i === 0 && j === 1) p *= (1 + xGL * rho);
        else if (i === 1 && j === 0) p *= (1 + xGV * rho);
        else if (i === 1 && j === 1) p *= (1 - rho);
        p = Math.max(0, p);
        totalProb += p;
        marcadores.push({ gl: i, gv: j, prob: p });
        if (i > j) pL += p;
        else if (i === j) pE += p;
        else pV += p;
        if (i + j >= 3) pOver25 += p;
        if (i > 0 && j > 0) pBTTS += p;
      }
    }

    const norm = totalProb || 1;
    const probLocal = Math.round((pL / norm) * 100);
    const probVisitante = Math.round((pV / norm) * 100);
    const probEmpate = Math.max(1, 100 - probLocal - probVisitante);

    marcadores.sort((a, b) => b.prob - a.prob);
    const marcadoresTop = marcadores.slice(0, 3).map(m => ({
      gl: m.gl,
      gv: m.gv,
      pct: Math.round((m.prob / norm) * 100)
    }));

    const brecha = Math.abs(probLocal - probVisitante);
    const confianza = brecha >= 28 && Math.min(stL.pj, stV.pj) >= 5 ? 'Alta'
                    : brecha >= 14 ? 'Media' : 'Cerrado';

    return {
      stL, stV,
      compRef,
      xGL, xGV,
      probLocal, probEmpate, probVisitante,
      probOver25: Math.round((pOver25 / norm) * 100),
      probBTTS: Math.round((pBTTS / norm) * 100),
      marcadoresTop,
      marcadorSugerido: marcadoresTop[0] || { gl: 1, gv: 1, pct: 12 },
      h2h: this.historialDirecto(codLocal, codVisitante, resultados),
      confianza
    };
  },

  /* =========================================================
     PROMPTS ACTUALIZADOS 2026/27 (para enriquecimiento LLM)
     ========================================================= */
  promptEquipo(codigo, resultados = {}) {
    const st = this.estadisticasEquipo(codigo, resultados);
    if (!st) return null;
    const compNom = COMP_NOMBRES_IA[st.compPrincipal] || 'Competición Oficial 2026/27';
    const rachaTxt = st.ultimos5.map(m => `${m.res} (${m.esLocal ? 'vs' : '@'} ${m.rivalNom} ${m.gf}-${m.gc})`).join(', ') || 'Sin registros recientes';
    const proxTxt = st.proximos.map(p => `- ${p.esLocal ? 'Local vs' : 'Visita a'} ${p.rivalNom} (${p.etapa || compNom})`).join('\n') || '- Calendario por definir';

    return `Analiza al club **${st.nombre}** en la temporada 2026/27 (${compNom}) usando EXCLUSIVAMENTE estos datos reales de ScoreCast:
- Balance 2026/27: ${st.pj} PJ · ${st.g}G-${st.e}E-${st.p}P · ${st.pts} pts (${st.ppg} pts/partido)
- Goles: ${st.gf} a favor (${st.gfPj}/PJ) · ${st.gc} en contra (${st.gcPj}/PJ) · DG ${st.dg >= 0 ? '+' : ''}${st.dg}
- Vallas invictas: ${st.pctValla}% · Ambos anotan: ${st.pctBTTS}% · Partidos +2.5 goles: ${st.pctOver25}%
- Local: ${st.local.pj} PJ (${st.local.g}G-${st.local.e}E-${st.local.p}P, ${st.local.gf} GF / ${st.local.gc} GC)
- Visitante: ${st.vis.pj} PJ (${st.vis.g}G-${st.vis.e}E-${st.vis.p}P, ${st.vis.gf} GF / ${st.vis.gc} GC)
- Últimos 5 partidos: ${rachaTxt}
- Próximos partidos:
${proxTxt}

Estructura el análisis en español con estas 4 secciones Markdown:
## 1. Radiografía Estadística 2026/27 (tabla breve)
## 2. Fortalezas y Puntos a Corregir
## 3. Lectura Local vs Visitante y Forma Reciente
## 4. Proyección de Temporada y Recomendación para Pronosticar`;
  },

  promptPartido(codigoLocal, codigoVisitante, fechaUtc = null, resultados = {}, competicion = null) {
    const pred = this.predecirPoisson(codigoLocal, codigoVisitante, resultados, competicion);
    const { stL, stV } = pred;
    const compNom = COMP_NOMBRES_IA[pred.compRef] || 'Temporada 2026/27';
    const fechaTxt = fechaUtc
      ? new Date(fechaUtc).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
      : 'próxima jornada';

    return `Analiza tácticamente el partido **${stL.nombre} vs ${stV.nombre}** (${compNom}, ${fechaTxt}) con base en estos datos reales de ScoreCast:
- ${stL.nombre} (Local): ${stL.pj} PJ, ${stL.pts} pts (${stL.ppg} PPG), ${stL.gfPj} GF/PJ, ${stL.gcPj} GC/PJ. En casa: ${stL.local.g}G-${stL.local.e}E-${stL.local.p}P.
- ${stV.nombre} (Visitante): ${stV.pj} PJ, ${stV.pts} pts (${stV.ppg} PPG), ${stV.gfPj} GF/PJ, ${stV.gcPj} GC/PJ. Fuera: ${stV.vis.g}G-${stV.vis.e}E-${stV.vis.p}P.
- Modelo Poisson ScoreCast: xG esperado ${pred.xGL} vs ${pred.xGV} · Probabilidades: ${stL.nombre} ${pred.probLocal}%, Empate ${pred.probEmpate}%, ${stV.nombre} ${pred.probVisitante}%.
- Over 2.5 goles: ${pred.probOver25}% · Ambos anotan: ${pred.probBTTS}%.
- Marcadores más probables: ${pred.marcadoresTop.map(m => `${m.gl}-${m.gv} (${m.pct}%)`).join(', ')}.

Entrega un informe táctico en español en Markdown con:
## 1. Comparativa de Rendimiento 2026/27 (tabla)
## 2. Claves Tácticas del Encuentro
## 3. Pronóstico Estadístico y Marcador Sugerido`;
  },

  /* =========================================================
     GENERADORES COMPLETOS (LOCAL INSTANTÁNEO + LLM OPCIONAL)
     ========================================================= */
  async generarInformeEquipo(codigo, resultados = {}, opciones = {}) {
    const st = this.estadisticasEquipo(codigo, resultados, opciones.competicion || null);
    const info = _eqInfo()?.obtener ? _eqInfo().obtener(codigo) : null;
    const compNom = COMP_NOMBRES_IA[st.compPrincipal] || 'Competiciones Oficiales 2026/27';

    // Proyecciones basadas en PPG real
    const ppgEff = st.pj ? (0.65 * st.ppg + 0.35 * st.ppg5) : 1.35;
    const pClas = Math.min(96, Math.max(8, Math.round(15 + ppgEff * 28)));
    const pPodio = Math.min(88, Math.max(5, Math.round(ppgEff * 26)));
    const pTitulo = Math.min(58, Math.max(2, Math.round(Math.pow(Math.max(0.2, ppgEff - 0.5), 2.1) * 12)));

    const estilo = st.gfPj >= 1.85 && st.gcPj <= 1.05 ? 'Dominante y equilibrado (alta eficacia en ambas áreas)'
      : st.gfPj >= 1.75 ? 'Ofensivo y vertical (genera alto volumen de gol)'
      : st.gcPj <= 0.95 ? 'Sólido defensivamente y ordenado en bloque medio-bajo'
      : st.ppg >= 1.5 ? 'Competitivo y pragmático en transiciones'
      : 'En fase de reconstrucción, dependiente de resultados en casa';

    const fortalezas = [];
    const debilidades = [];

    if (st.gfPj >= 1.6) fortalezas.push(`Capacidad goleadora destacada con **${st.gfPj} goles por partido** (${st.gf} anotados en ${st.pj} PJ).`);
    if (st.gcPj <= 1.05) fortalezas.push(`Solidez defensiva: concede apenas **${st.gcPj} goles/PJ** con **${st.pctValla}% de vallas invictas**.`);
    if (st.local.pj >= 2 && (st.local.pts / st.local.pj) >= 1.8) fortalezas.push(`Fuerte como local: **${st.local.g}G-${st.local.e}E-${st.local.p}P** (${st.local.gf} GF / ${st.local.gc} GC).`);
    if (st.ppg5 > st.ppg + 0.15) fortalezas.push(`Tendencia al alza en sus últimos 5 partidos (**${st.ppg5} pts/PJ** frente a ${st.ppg} en el torneo).`);
    if (!fortalezas.length) fortalezas.push(`Mantiene competitividad regular en ${compNom} (${st.g} victorias y ${st.e} empates).`);

    if (st.gcPj >= 1.45) debilidades.push(`Fragilidad defensiva: promedia **${st.gcPj} goles recibidos por partido**.`);
    if (st.gfPj <= 1.0) debilidades.push(`Baja producción ofensiva (**${st.gfPj} goles/PJ**), lo que dificulta cerrar partidos.`);
    if (st.vis.pj >= 2 && (st.vis.pts / st.vis.pj) <= 0.9) debilidades.push(`Rendimiento bajo como visitante (**${st.vis.g}G-${st.vis.e}E-${st.vis.p}P** fuera de casa).`);
    if (st.ppg5 < st.ppg - 0.25) debilidades.push(`Bache reciente de resultados (**${st.ppg5} pts/PJ** en los últimos 5 juegos).`);
    if (!debilidades.length) debilidades.push(`Riesgo de desgaste en calendario apretado con partidos cada 3–4 días.`);

    const ultimosTxt = st.ultimos5.length
      ? st.ultimos5.map(m => `- **${m.res === 'V' ? '🟢 Victoria' : m.res === 'E' ? '🟡 Empate' : '🔴 Derrota'}** ${m.esLocal ? 'vs' : '@'} **${m.rivalNom}** (${m.gf}–${m.gc})`).join('\n')
      : '- Aún sin partidos finalizados cargados en esta competición.';

    const proxTxt = st.proximos.length
      ? st.proximos.map(p => `- **${p.esLocal ? 'Local vs' : 'Visita a'} ${p.rivalNom}** · ${p.etapa || compNom} (${p.utc ? new Date(p.utc).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }) : 'fecha por confirmar'})`).join('\n')
      : '- Sin próximos partidos confirmados en calendario.';

    const bioClub = info
      ? `**Sede:** ${info.estadio} (${info.ciudad}, ${info.pais}) · **Fundación:** ${info.fundacion}. ${info.historia ? info.historia.slice(0, 220) + (info.historia.length > 220 ? '…' : '') : ''}`
      : `Compite actualmente en **${compNom}**.`;

    let md = `## 1. Métricas Reales Temporada 2026/27 — ${st.nombre}

| Métrica | Valor Real | Referencia |
|---|---|---|
| Competición principal | ${compNom} | Temporada activa |
| Balance general | **${st.pj} PJ** (${st.g}G – ${st.e}E – ${st.p}P) | **${st.pts} pts** (${st.ppg} pts/PJ) |
| Producción ofensiva | **${st.gf} GF** (${st.gfPj} / PJ) | Ambos anotan: ${st.pctBTTS}% |
| Solidez defensiva | **${st.gc} GC** (${st.gcPj} / PJ) | Vallas invictas: ${st.pctValla}% |
| Local / Visitante | Casa: ${st.local.g}G-${st.local.e}E-${st.local.p}P | Fuera: ${st.vis.g}G-${st.vis.e}E-${st.vis.p}P |
| Perfil táctico | ${estilo} | Partidos +2.5 goles: ${st.pctOver25}% |

## 2. Fortalezas y Puntos a Vigilar
${fortalezas.map(f => `- ✅ **Fortaleza:** ${f}`).join('\n')}
${debilidades.map(d => `- ⚠️ **Alerta:** ${d}`).join('\n')}

## 3. Forma Reciente (Últimos 5) y Próximo Calendario
${ultimosTxt}

### Próximos encuentros
${proxTxt}

## 4. Contexto Institucional e Histórico
${bioClub}

## 5. Proyección de Escenarios (Modelo ScoreCast)
| Escenario | Probabilidad Estimada | Sustento Estadístico |
|---|---|---|
| Zona de clasificación / fase final | **${pClas}%** | Ritmo ponderado de ${ppgEff.toFixed(2)} pts/PJ |
| Pelear podio / instancias decisivas | **${pPodio}%** | Diferencia de gol ${st.dg >= 0 ? '+' : ''}${st.dg} y rendimiento en casa |
| Campeón del certamen | **${pTitulo}%** | Consistencia ofensiva (${st.gfPj} GF/PJ) y defensiva (${st.gcPj} GC/PJ) |

**Veredicto ScoreCast:** ${st.nombre} muestra un rendimiento ${ppgEff >= 1.9 ? 'sobresaliente de candidato serio al título' : ppgEff >= 1.45 ? 'competitivo con buen margen para sumar en casa' : 'irregular que exige cautela al pronosticarlo como visitante'}.`;

    let motor = 'Motor Estadístico Poisson ScoreCast (datos reales 2026/27)';

    if (opciones.usarLLM && this.tieneProxyExterno()) {
      try {
        const llmTxt = await this.analizar(this.promptEquipo(codigo, resultados));
        if (llmTxt && llmTxt.trim().length > 80) {
          md = llmTxt;
          motor = 'IA Externa + Datos Reales ScoreCast 2026/27';
        }
      } catch (e) {
        console.warn('IA externa no disponible, usando motor local:', e.message);
      }
    }

    return {
      tipo: 'equipo',
      titulo: `🌍 Informe Táctico: ${st.nombre}`,
      motor,
      md,
      datos: { st, info, proyeccion: { pClas, pPodio, pTitulo } }
    };
  },

  async generarInformePartido(codLocal, codVisitante, resultados = {}, opciones = {}) {
    const pred = this.predecirPoisson(codLocal, codVisitante, resultados, opciones.competicion || null);
    const { stL, stV, xGL, xGV, probLocal, probEmpate, probVisitante, probOver25, probBTTS, marcadoresTop, h2h, confianza } = pred;
    const compNom = COMP_NOMBRES_IA[pred.compRef] || 'Temporada 2026/27';
    const infoL = _eqInfo()?.obtener ? _eqInfo().obtener(codLocal) : null;
    const fechaTxt = opciones.fechaUtc
      ? new Date(opciones.fechaUtc).toLocaleString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
      : 'Próximo encuentro';

    const favorito = probLocal >= probVisitante + 10 ? stL.nombre
      : probVisitante >= probLocal + 10 ? stV.nombre
      : 'Duelo muy parejo (sin favorito claro)';

    const rachaStr = (arr) => arr.length ? arr.map(m => m.res).join('-') : 'N/D';
    const h2hTxt = h2h.partidos.length
      ? `En ${h2h.partidos.length} cruce(s) reciente(s) de esta temporada: **${stL.nombre}** ganó ${h2h.wA}, empataron ${h2h.emp} y **${stV.nombre}** ganó ${h2h.wB}. Último: ${h2h.partidos[0].gl}–${h2h.partidos[0].gv}.`
      : `Sin enfrentamientos previos registrados en el calendario 2026/27 actual; el modelo pondera el desempeño general, factor localía y racha de últimos 5 juegos.`;

    const clave1 = xGL > xGV + 0.35
      ? `**Iniciativa local:** ${stL.nombre} proyecta ${xGL} goles esperados (xG) aprovechando su balance en casa (${stL.local.g}G-${stL.local.e}E-${stL.local.p}P).`
      : xGV > xGL + 0.35
        ? `**Peligro visitante:** ${stV.nombre} llega con mayor peso ofensivo (${xGV} xG) y mejor ritmo de puntos (${stV.ppg} vs ${stL.ppg} PPG).`
        : `**Equilibrio táctico:** Diferencia mínima de goles esperados (${xGL} vs ${xGV} xG); el balón parado y la eficacia en áreas definirán el marcador.`;

    const clave2 = probOver25 >= 58
      ? `**Ritmo abierto (+2.5 goles al ${probOver25}%):** Ambos equipos promedian partidos con llegadas frecuentes (BTTS ${probBTTS}%).`
      : probOver25 <= 42
        ? `**Partido cerrado (Under 2.5 al ${100 - probOver25}%):** Se anticipa un duelo táctico de pocas concesiones defensivas.`
        : `**Ritmo intermedio:** Probabilidad balanceada de goles (Over 2.5: ${probOver25}%, Ambos anotan: ${probBTTS}%).`;

    const top1 = marcadoresTop[0] || { gl: 1, gv: 1, pct: 12 };
    const top2 = marcadoresTop[1] || { gl: 1, gv: 0, pct: 11 };
    const top3 = marcadoresTop[2] || { gl: 2, gv: 1, pct: 9 };

    let md = `## 1. Comparativa Real 2026/27 — ${stL.nombre} vs ${stV.nombre}
**Competición:** ${compNom} · **Fecha:** ${fechaTxt}${infoL?.estadio ? ` · **Estadio:** ${infoL.estadio}` : ''}

| Métrica | ${stL.nombre} (Local) | ${stV.nombre} (Visitante) |
|---|---|---|
| Partidos / Puntos | ${stL.pj} PJ · **${stL.pts} pts** (${stL.ppg} PPG) | ${stV.pj} PJ · **${stV.pts} pts** (${stV.ppg} PPG) |
| Goles a favor / PJ | **${stL.gfPj}** (${stL.gf} totales) | **${stV.gfPj}** (${stV.gf} totales) |
| Goles en contra / PJ | **${stL.gcPj}** (${stL.gc} totales) | **${stV.gcPj}** (${stV.gc} totales) |
| Factor Local / Visitante | Casa: ${stL.local.g}G-${stL.local.e}E-${stL.local.p}P | Fuera: ${stV.vis.g}G-${stV.vis.e}E-${stV.vis.p}P |
| Racha últimos 5 | **${rachaStr(stL.ultimos5)}** (${stL.ppg5} PPG) | **${rachaStr(stV.ultimos5)}** (${stV.ppg5} PPG) |
| Goles esperados (xG Poisson) | **${xGL}** | **${xGV}** |

## 2. Claves Tácticas y Contexto
- ${clave1}
- ${clave2}
- **Antecedente directo:** ${h2hTxt}

## 3. Probabilidades del Modelo Poisson + Dixon-Coles
| Escenario | Probabilidad | Lectura |
|---|---|---|
| Victoria ${stL.nombre} | **${probLocal}%** | ${probLocal >= 50 ? 'Favorito principal' : probLocal >= 35 ? 'Opción competitiva' : 'Resultado sorpresivo'} |
| Empate | **${probEmpate}%** | ${probEmpate >= 29 ? 'Alta probabilidad de paridad' : 'Escenario secundario'} |
| Victoria ${stV.nombre} | **${probVisitante}%** | ${probVisitante >= 50 ? 'Favorito visitante' : probVisitante >= 35 ? 'Opción competitiva' : 'Resultado sorpresivo'} |

- **Marcador sugerido principal:** **${stL.nombre} ${top1.gl} – ${top1.gv} ${stV.nombre}** (${top1.pct}% probabilidad exacta)
- **Alternativas estadísticas:** **${top2.gl}–${top2.gv}** (${top2.pct}%) · **${top3.gl}–${top3.gv}** (${top3.pct}%)
- **Confianza del pronóstico:** **${confianza}** · **Favorito:** ${favorito}

**Conclusión táctica:** Para tu pronóstico en ScoreCast, el marcador **${top1.gl}–${top1.gv}** ofrece el mejor balance entre probabilidad exacta y tendencia 1X2 (${favorito}).`;

    let motor = 'Motor Estadístico Poisson ScoreCast (datos reales 2026/27)';

    if (opciones.usarLLM && this.tieneProxyExterno()) {
      try {
        const llmTxt = await this.analizar(this.promptPartido(codLocal, codVisitante, opciones.fechaUtc, resultados, opciones.competicion));
        if (llmTxt && llmTxt.trim().length > 80) {
          md = llmTxt;
          motor = 'IA Externa + Modelo Poisson ScoreCast 2026/27';
        }
      } catch (e) {
        console.warn('IA externa no disponible, usando motor local:', e.message);
      }
    }

    return {
      tipo: 'partido',
      titulo: `⚽ Predicción Táctica: ${stL.nombre} vs ${stV.nombre}`,
      motor,
      md,
      datos: pred
    };
  },

  /* Escanea los próximos partidos reales (72h o próximos 16) para el Radar de la Jornada */
  radarJornada(resultados = {}, ajustes = {}, horasVentana = 72) {
    const fix = _fix();
    const resMap = this._resultadosBase(resultados);
    const ahora = Date.now();
    const limite = ahora + horasVentana * 3600000;

    const candidatos = [];
    for (const p of (fix.partidos || [])) {
      if (!p.local || !p.visitante) continue;
      if (!fix.equipos?.[p.local] || !fix.equipos?.[p.visitante]) continue;
      const r = resMap[p.id];
      if (r && r.estado === 'finalizado') continue;
      const utc = ajustes?.[p.id]?.utc || p.utc;
      if (!utc) continue;
      const ms = new Date(utc).getTime();
      if (isNaN(ms) || ms < ahora - 3 * 3600000) continue;
      candidatos.push({ ...p, utc, ms });
    }

    candidatos.sort((a, b) => a.ms - b.ms);
    let seleccion = candidatos.filter(p => p.ms <= limite);
    if (seleccion.length < 4) seleccion = candidatos.slice(0, 12);
    else seleccion = seleccion.slice(0, 18);

    const analizados = seleccion.map(p => {
      const pred = this.predecirPoisson(p.local, p.visitante, resultados, p.competicion);
      return {
        pid: p.id,
        competicion: p.competicion,
        compNombre: COMP_NOMBRES_IA[p.competicion] || p.competicion,
        etapa: p.etapa || '',
        utc: p.utc,
        local: p.local,
        visitante: p.visitante,
        localNom: pred.stL.nombre,
        visNom: pred.stV.nombre,
        probLocal: pred.probLocal,
        probEmpate: pred.probEmpate,
        probVisitante: pred.probVisitante,
        probOver25: pred.probOver25,
        xGL: pred.xGL,
        xGV: pred.xGV,
        sugerido: pred.marcadorSugerido,
        calidad: +(pred.stL.ppg + pred.stV.ppg).toFixed(2),
        brecha: Math.abs(pred.probLocal - pred.probVisitante),
        maxProb: Math.max(pred.probLocal, pred.probVisitante)
      };
    });

    if (!analizados.length) {
      return { partidos: [], destacado: null, masGoles: null, masCerrado: null, favoritoSolido: null };
    }

    const destacado = [...analizados].sort((a, b) => (b.calidad - b.brecha * 0.02) - (a.calidad - a.brecha * 0.02))[0];
    const masGoles = [...analizados].sort((a, b) => (b.probOver25 + (b.xGL + b.xGV) * 5) - (a.probOver25 + (a.xGL + a.xGV) * 5))[0];
    const masCerrado = [...analizados].sort((a, b) => (a.brecha - a.probEmpate * 0.5) - (b.brecha - b.probEmpate * 0.5))[0];
    const favoritoSolido = [...analizados].sort((a, b) => b.maxProb - a.maxProb)[0];

    return { partidos: analizados, destacado, masGoles, masCerrado, favoritoSolido };
  }
};

if (typeof window !== 'undefined') window.IA = IA;
if (typeof globalThis !== 'undefined') globalThis.IA = IA;

export { IA };
export default IA;
