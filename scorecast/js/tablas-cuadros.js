/* ============================================================
   SCORECAST — TABLAS DE POSICIONES, GRUPOS Y CUADROS DE ELIMINATORIAS
   ------------------------------------------------------------
   Cálculo y renderizado dinámico para las 7 competiciones:
     - Liga BetPlay (🇨🇴)
     - Premier League (🏴󠁧󠁢󠁥󠁮󠁧󠁿)
     - LaLiga (🇪🇸)
     - Bundesliga (🇩🇪)
     - Champions League (🏆)
     - Copa Libertadores (🌎)
     - Copa Sudamericana (🥈)
   ============================================================ */

import { FIXTURE, COMPETICIONES } from './fixture.js?v=30';
import { U } from './utils.js?v=30';
import { EquiposInfo } from './equipos-info.js?v=30';
import { CompeticionesInfo } from './competiciones-info.js?v=30';

export const TablasCuadros = {
  competicionActiva: 'betplay',
  subVistaCONMEBOL: 'cuadro', // 'cuadro' | 'grupos'
  subVistaUCL: 'liga',        // 'liga' | 'cuadro'
  subVistaBetPlay: 'cuadrangulares', // 'cuadrangulares' | 'liga'

  /* Calcula la tabla de posiciones a partir de los partidos y resultados registrados */
  calcularTabla(competicion, filtroFase = null, filtroGrupo = null, resultados = {}) {
    const todosPartidos = FIXTURE.partidos.filter(p => p.competicion === competicion);
    let partidos = todosPartidos;

    if (filtroFase) {
      partidos = partidos.filter(p => p.fase === filtroFase);
    }
    if (filtroGrupo) {
      partidos = partidos.filter(p => p.grupo === filtroGrupo);
    }

    // Identificar todos los equipos participantes
    const equiposMap = {};
    partidos.forEach(p => {
      if (p.local && !equiposMap[p.local]) {
        const eq = FIXTURE.equipo(p.local);
        equiposMap[p.local] = {
          code: p.local,
          nombre: eq.n || p.local,
          escudo: eq.b,
          escudoSrc: eq.escudoSrc,
          pj: 0, pg: 0, pe: 0, pp: 0,
          gf: 0, gc: 0, dg: 0, pts: 0,
          racha: []
        };
      }
      if (p.visitante && !equiposMap[p.visitante]) {
        const eq = FIXTURE.equipo(p.visitante);
        equiposMap[p.visitante] = {
          code: p.visitante,
          nombre: eq.n || p.visitante,
          escudo: eq.b,
          escudoSrc: eq.escudoSrc,
          pj: 0, pg: 0, pe: 0, pp: 0,
          gf: 0, gc: 0, dg: 0, pts: 0,
          racha: []
        };
      }
    });

    // Procesar resultados de los partidos jugados
    partidos.forEach(p => {
      const res = resultados[p.id] || p.resultado || FIXTURE.resultadosIniciales[p.id];
      if (!res || (res.gl === undefined || res.gv === undefined)) return;
      if (res.estado !== 'finalizado' && res.gl === undefined) return;

      const L = equiposMap[p.local];
      const V = equiposMap[p.visitante];
      if (!L || !V) return;

      const gl = Number(res.gl);
      const gv = Number(res.gv);

      L.pj++; V.pj++;
      L.gf += gl; L.gc += gv;
      V.gf += gv; V.gc += gl;

      if (gl > gv) {
        L.pg++; V.pp++;
        L.pts += 3;
        L.racha.push('V');
        V.racha.push('D');
      } else if (gl < gv) {
        V.pg++; L.pp++;
        V.pts += 3;
        V.racha.push('V');
        L.racha.push('D');
      } else {
        L.pe++; V.pe++;
        L.pts += 1; V.pts += 1;
        L.racha.push('E');
        V.racha.push('E');
      }
    });

    // Calcular diferencia de gol y ordenar
    const filas = Object.values(equiposMap).map(eq => ({
      ...eq,
      dg: eq.gf - eq.gc,
      ultimos5: eq.racha.slice(-5)
    }));

    filas.sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.dg !== a.dg) return b.dg - a.dg;
      if (b.gf !== a.gf) return b.gf - a.gf;
      return a.nombre.localeCompare(b.nombre);
    });

    return filas.map((f, i) => ({ ...f, pos: i + 1 }));
  },

  /* Renderiza la vista principal de tablas y cuadros según la competición seleccionada */
  render(contenedor, resultados = {}, misPred = {}) {
    if (!contenedor) return;

    const comp = this.competicionActiva;
    const infoComp = COMPETICIONES[comp] || { nombre: comp, icono: '⚽' };

    let html = `
      <div class="tc-header-comp">
        <div class="tc-chips-comp" role="tablist">
          <button class="tc-chip ${comp === 'betplay' ? 'activo' : ''}" data-comp="betplay" type="button"><img src="img/escudos/betplay/dimayor.png" class="chip-logo" alt="Liga BetPlay"> Liga BetPlay</button>
          <button class="tc-chip ${comp === 'premier' ? 'activo' : ''}" data-comp="premier" type="button"><img src="img/escudos/premier/epl.png" class="chip-logo" alt="Premier League"> Premier League</button>
          <button class="tc-chip ${comp === 'laliga' ? 'activo' : ''}" data-comp="laliga" type="button"><img src="img/escudos/laliga/laliga.png" class="chip-logo" alt="LaLiga"> LaLiga</button>
          <button class="tc-chip ${comp === 'bundesliga' ? 'activo' : ''}" data-comp="bundesliga" type="button"><img src="img/escudos/bundesliga/bundesliga.png" class="chip-logo" alt="Bundesliga"> Bundesliga</button>
          <button class="tc-chip ${comp === 'ucl' ? 'activo' : ''}" data-comp="ucl" type="button"><img src="img/escudos/champions/ucl.png" class="chip-logo" alt="Champions League"> Champions League</button>
          <button class="tc-chip ${comp === 'libertadores' ? 'activo' : ''}" data-comp="libertadores" type="button"><img src="img/escudos/libertadores/libertadores.png" class="chip-logo" alt="Copa Libertadores"> Libertadores</button>
          <button class="tc-chip ${comp === 'sudamericana' ? 'activo' : ''}" data-comp="sudamericana" type="button"><img src="img/escudos/sudamericana/sudamericana.png" class="chip-logo" alt="Copa Sudamericana"> Sudamericana</button>
        </div>
      </div>
    `;

    // Sub-selectores para competiciones con fase de grupos o eliminatorias
    if (comp === 'libertadores' || comp === 'sudamericana') {
      html += `
        <div class="tc-subvista-barra">
          <button class="tc-sub-btn ${this.subVistaCONMEBOL === 'cuadro' ? 'activo' : ''}" data-sub="cuadro" type="button">🔥 Cuadro de Eliminatorias</button>
          <button class="tc-sub-btn ${this.subVistaCONMEBOL === 'grupos' ? 'activo' : ''}" data-sub="grupos" type="button">🗂 Fase de Grupos (A–H)</button>
        </div>
      `;
    } else if (comp === 'ucl') {
      html += `
        <div class="tc-subvista-barra">
          <button class="tc-sub-btn ${this.subVistaUCL === 'liga' ? 'activo' : ''}" data-sub="liga" type="button">📊 Fase de Liga (36 Clubes)</button>
          <button class="tc-sub-btn ${this.subVistaUCL === 'cuadro' ? 'activo' : ''}" data-sub="cuadro" type="button">⚡ Eliminatorias y Play-offs</button>
        </div>
      `;
    } else if (comp === 'betplay') {
      html += `
        <div class="tc-subvista-barra">
          <button class="tc-sub-btn ${this.subVistaBetPlay === 'cuadrangulares' ? 'activo' : ''}" data-sub="cuadrangulares" type="button">🔥 Cuadrangulares Semifinales</button>
          <button class="tc-sub-btn ${this.subVistaBetPlay === 'liga' ? 'activo' : ''}" data-sub="liga" type="button">📊 Todos contra Todos (Fechas 1–19)</button>
        </div>
      `;
    }

    html += CompeticionesInfo.renderBanner(comp, false);

    html += `<div class="tc-contenido-vista" id="tc-vista-cuerpo">`;

    if (comp === 'libertadores' || comp === 'sudamericana') {
      if (this.subVistaCONMEBOL === 'cuadro') {
        html += this.renderCuadroCONMEBOL(comp, resultados);
      } else {
        html += this.renderGruposCONMEBOL(comp, resultados);
      }
    } else if (comp === 'ucl') {
      if (this.subVistaUCL === 'liga') {
        html += this.renderTablaLiga(comp, resultados);
      } else {
        html += this.renderCuadroUCL(resultados);
      }
    } else if (comp === 'betplay' && this.subVistaBetPlay === 'cuadrangulares') {
      html += this.renderCuadrangularesBetPlay(resultados);
    } else {
      // betplay, premier, laliga, bundesliga
      html += this.renderTablaLiga(comp, resultados);
    }

    html += `</div>`;
    contenedor.innerHTML = html;

    // Vincular eventos de selección de competición
    contenedor.querySelectorAll('.tc-chip').forEach(btn => {
      btn.onclick = () => {
        this.competicionActiva = btn.dataset.comp;
        this.render(contenedor, resultados, misPred);
      };
    });

    // Vincular eventos de subvista
    contenedor.querySelectorAll('.tc-sub-btn').forEach(btn => {
      btn.onclick = () => {
        const sub = btn.dataset.sub;
        if (this.competicionActiva === 'ucl') {
          this.subVistaUCL = sub;
        } else if (this.competicionActiva === 'betplay') {
          this.subVistaBetPlay = sub;
        } else {
          this.subVistaCONMEBOL = sub;
        }
        this.render(contenedor, resultados, misPred);
      };
    });

    // Delegar clics en cualquier escudo o nombre de equipo dentro de la vista
    contenedor.querySelectorAll('[data-equipo]').forEach(elem => {
      elem.onclick = (e) => {
        e.stopPropagation();
        const code = elem.dataset.equipo;
        if (code) EquiposInfo.abrir(code, resultados, misPred);
      };
    });

    // Botón para abrir historia y perfil de la competición
    contenedor.querySelectorAll('[data-ver-comp]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const cid = btn.dataset.verComp;
        if (cid) CompeticionesInfo.abrir(cid, resultados);
      };
    });
  },

  /* Renderiza tabla de posiciones estándar para ligas y UCL Fase de Liga */
  renderTablaLiga(comp, resultados) {
    const faseFiltro = (comp === 'ucl' || comp === 'betplay') ? 'liga' : null;
    const filas = this.calcularTabla(comp, faseFiltro, null, resultados);
    const info = COMPETICIONES[comp] || {};

    let leyendaHtml = '';
    if (comp === 'betplay') {
      leyendaHtml = `
        <div class="tc-leyenda">
          <span><span class="tc-dot tc-dot--verde"></span> 1º - 8º Clasifican a Cuadrangulares Semifinales</span>
        </div>`;
    } else if (comp === 'premier' || comp === 'laliga') {
      leyendaHtml = `
        <div class="tc-leyenda">
          <span><span class="tc-dot tc-dot--verde"></span> 1º - 4º Champions League</span>
          <span><span class="tc-dot tc-dot--naranja"></span> 5º Europa League</span>
          <span><span class="tc-dot tc-dot--cyan"></span> 6º Conference League</span>
          <span><span class="tc-dot tc-dot--rojo"></span> 18º - 20º Descenso</span>
        </div>`;
    } else if (comp === 'bundesliga') {
      leyendaHtml = `
        <div class="tc-leyenda">
          <span><span class="tc-dot tc-dot--verde"></span> 1º - 4º Champions League</span>
          <span><span class="tc-dot tc-dot--naranja"></span> 5º Europa League</span>
          <span><span class="tc-dot tc-dot--cyan"></span> 6º Conference League</span>
          <span><span class="tc-dot tc-dot--amarillo"></span> 16º Play-off de permanencia</span>
          <span><span class="tc-dot tc-dot--rojo"></span> 17º - 18º Descenso</span>
        </div>`;
    } else if (comp === 'ucl') {
      leyendaHtml = `
        <div class="tc-leyenda">
          <span><span class="tc-dot tc-dot--verde"></span> 1º - 8º Clasificación directa a Octavos de Final</span>
          <span><span class="tc-dot tc-dot--azul"></span> 9º - 24º Ronda Play-offs de dieciseisavos</span>
          <span><span class="tc-dot tc-dot--rojo"></span> 25º - 36º Eliminados</span>
        </div>`;
    }

    const totalJugados = filas.reduce((acc, f) => acc + f.pj, 0) / 2;

    return `
      <div class="tc-tabla-bloque">
        <div class="tc-tabla-header">
          <div class="tc-th-meta">
            <h2 style="margin:0;font-size:22px;display:flex;align-items:center;gap:10px;">
              ${info.badge ? `<img src="${info.badge}" class="tc-comp-logo" alt="${info.nombre}" onerror="this.style.display='none'">` : ''}
              ${U.esc(info.nombreCompleto || info.nombre)}
            </h2>
            <p class="sub" style="margin:4px 0 0;font-size:12.5px;">
              Posiciones calculadas en tiempo real · ${filas.length} equipos · ${totalJugados} partidos disputados
            </p>
          </div>
          ${leyendaHtml}
        </div>

        <div class="tc-tabla-responsive">
          <table class="tc-tabla">
            <thead>
              <tr>
                <th class="tc-col-pos">#</th>
                <th class="tc-col-eq">Club</th>
                <th>PJ</th>
                <th>G</th>
                <th>E</th>
                <th>P</th>
                <th class="tc-col-goles">GF</th>
                <th class="tc-col-goles">GC</th>
                <th>DG</th>
                <th class="tc-col-pts">PTS</th>
                <th class="tc-col-racha">Últimos 5</th>
              </tr>
            </thead>
            <tbody>
              ${filas.map(f => {
                let zonaCls = '';
                if (comp === 'betplay') {
                  if (f.pos <= 8) zonaCls = 'zona-cuadrangulares';
                } else if (comp === 'premier' || comp === 'laliga') {
                  if (f.pos <= 4) zonaCls = 'zona-champions';
                  else if (f.pos === 5) zonaCls = 'zona-europa';
                  else if (f.pos === 6) zonaCls = 'zona-conference';
                  else if (f.pos >= filas.length - 2) zonaCls = 'zona-descenso';
                } else if (comp === 'bundesliga') {
                  if (f.pos <= 4) zonaCls = 'zona-champions';
                  else if (f.pos === 5) zonaCls = 'zona-europa';
                  else if (f.pos === 6) zonaCls = 'zona-conference';
                  else if (f.pos === 16) zonaCls = 'zona-playoff-descenso';
                  else if (f.pos >= 17) zonaCls = 'zona-descenso';
                } else if (comp === 'ucl') {
                  if (f.pos <= 8) zonaCls = 'zona-octavos-directo';
                  else if (f.pos <= 24) zonaCls = 'zona-playoff-ucl';
                  else zonaCls = 'zona-eliminado-ucl';
                }

                const dgStr = f.dg > 0 ? `+${f.dg}` : String(f.dg);
                const dgCls = f.dg > 0 ? 'dg-pos' : f.dg < 0 ? 'dg-neg' : '';

                return `
                  <tr class="${zonaCls}">
                    <td class="tc-pos-num">${f.pos}</td>
                    <td>
                      <div class="tc-equipo-celda" data-equipo="${f.code}" title="Ver perfil de ${U.esc(f.nombre)}">
                        ${f.escudo}
                        <span class="tc-nombre-club">${U.esc(f.nombre)}</span>
                      </div>
                    </td>
                    <td>${f.pj}</td>
                    <td>${f.pg}</td>
                    <td>${f.pe}</td>
                    <td>${f.pp}</td>
                    <td class="tc-col-goles">${f.gf}</td>
                    <td class="tc-col-goles">${f.gc}</td>
                    <td class="${dgCls} tc-dg-val">${dgStr}</td>
                    <td class="tc-pts-val">${f.pts}</td>
                    <td class="tc-col-racha">
                      <div class="racha-dots racha-dots--mini">
                        ${f.ultimos5.length > 0 
                          ? f.ultimos5.map(r => `<span class="racha-dot racha-dot--${r}">${r}</span>`).join('') 
                          : '<span style="font-size:11px;color:var(--tinta-3)">-</span>'}
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  /* Cuadrangulares semifinales de la Liga BetPlay (Grupos A y B + Gran Final) */
  renderCuadrangularesBetPlay(resultados) {
    const getRes = (p) => resultados[p.id] || p.resultado || FIXTURE.resultadosIniciales[p.id];
    const tablaRegular = this.calcularTabla('betplay', 'liga', null, resultados);
    const posRegular = {};
    tablaRegular.forEach(f => { posRegular[f.code] = f.pos; });

    const partidosCua = FIXTURE.partidos.filter(p => p.competicion === 'betplay' && p.fase === 'cuadrangulares');
    const finales = FIXTURE.partidos.filter(p => p.competicion === 'betplay' && p.fase === 'final');

    const fechaCorta = (p) => {
      if (!p.fecha) return '';
      const [, mo, d] = p.fecha.split('-').map(Number);
      const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
      const hora = (p.horaOk && p.horaStr) ? ` · ${p.horaStr.replace(' COT', '')}` : '';
      return `${d} ${meses[mo - 1] || ''}${hora}`;
    };

    const bloqueGrupo = (g) => {
      const filas = this.calcularTabla('betplay', 'cuadrangulares', g, resultados)
        .sort((a, b) => (b.pts - a.pts) || (b.dg - a.dg) || (b.gf - a.gf) || ((posRegular[a.code] || 99) - (posRegular[b.code] || 99)))
        .map((f, i) => ({ ...f, pos: i + 1 }));
      const jugados = partidosCua.filter(p => p.grupo === g && getRes(p)?.estado === 'finalizado').length;
      const partidosG = partidosCua.filter(p => p.grupo === g).sort((a, b) => (a.utc || '').localeCompare(b.utc || ''));

      return `
        <div class="panel grupo-card cua-card">
          <div class="grupo-header">
            <h3 style="margin:0;font-size:15px;color:var(--dorado);display:flex;align-items:center;gap:8px;">
              <span class="cua-grupo-pill">${g}</span> CUADRANGULAR ${g}
            </h3>
            <span class="cua-conteo">${jugados}/12 jugados</span>
          </div>
          <div class="grupo-tabla-wrap">
            <table class="grupo-tabla cua-tabla">
              <thead>
                <tr>
                  <th style="text-align:left">Club</th>
                  <th>PJ</th><th>G</th><th>E</th><th>P</th><th>DG</th><th>PTS</th>
                </tr>
              </thead>
              <tbody>
                ${filas.map((f, idx) => {
                  const tieneVentaja = posRegular[f.code] === 1 || posRegular[f.code] === 2;
                  return `
                  <tr class="${idx === 0 ? 'clasifica' : ''}">
                    <td>
                      <div class="td-equipo cua-td-equipo" data-equipo="${f.code}" title="Ver perfil de ${U.esc(f.nombre)}">
                        ${f.escudo}
                        <span class="cua-club-nom">${U.esc(f.nombre)}</span>
                        <span class="cua-pos-tag">${posRegular[f.code] || '-'}º</span>
                        ${tieneVentaja ? '<span class="cua-ventaja-star" title="Cabeza de serie · Punto invisible (ventaja deportiva)">★</span>' : ''}
                        ${idx === 0 ? '<span class="badge-avanza" title="Clasificaría a la Gran Final">✓</span>' : ''}
                      </div>
                    </td>
                    <td>${f.pj}</td><td>${f.pg}</td><td>${f.pe}</td><td>${f.pp}</td>
                    <td class="cua-dg">${f.dg > 0 ? '+' + f.dg : f.dg}</td>
                    <td class="cua-pts">${f.pts}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
          <div class="cua-partidos-lista">
            ${partidosG.map(p => {
              const r = getRes(p);
              const fin = r?.estado === 'finalizado';
              const L = FIXTURE.equipo(p.local), V = FIXTURE.equipo(p.visitante);
              const fechaN = p.jornada - 19;
              return `
                <div class="cua-match-row">
                  <span class="cua-f-badge">F${fechaN}</span>
                  <div class="cua-team cua-team--l" data-equipo="${p.local}" title="Ver perfil de ${U.esc(L.n)}">
                    <span class="cua-team-txt">${U.esc(L.n)}</span>
                    ${L.b}
                  </div>
                  <span class="cua-score-pill ${fin ? 'cua-score-pill--fin' : ''}">${fin ? `${r.gl} - ${r.gv}` : 'vs'}</span>
                  <div class="cua-team cua-team--v" data-equipo="${p.visitante}" title="Ver perfil de ${U.esc(V.n)}">
                    ${V.b}
                    <span class="cua-team-txt">${U.esc(V.n)}</span>
                  </div>
                  <span class="cua-fecha-tag">${fin ? 'Final' : U.esc(fechaCorta(p))}</span>
                </div>`;
            }).join('')}
          </div>
        </div>`;
    };

    const finalHtml = finales.map(p => `
      <div class="bracket-card bracket-card--gran-final cua-final-card">
        <div class="bracket-card-header">
          <span class="bc-etapa">${U.esc(p.etapa.replace('Liga BetPlay · ', ''))}</span>
          <span class="bc-status trofeo">${U.esc(p.fechaStr || p.fecha)}</span>
        </div>
        <div class="bracket-team-row"><span class="escudo-placeholder">🥇</span><span class="bc-team-name" style="color:var(--tinta)">${U.esc(p.etiqL || 'Por definir')}</span><span class="bc-score">-</span></div>
        <div class="bracket-team-row"><span class="escudo-placeholder">🥈</span><span class="bc-team-name" style="color:var(--tinta)">${U.esc(p.etiqV || 'Por definir')}</span><span class="bc-score">-</span></div>
      </div>`).join('');

    return `
      <div class="tc-grupos-bloque">
        <div class="tc-tabla-header" style="margin-bottom:16px;">
          <h2 style="margin:0;font-size:21px;display:flex;align-items:center;gap:10px;">
            <span class="logo-halo"><img src="img/escudos/betplay/dimayor.png" class="tc-comp-logo" alt="Liga BetPlay" onerror="this.style.display='none'"></span>
            Liga BetPlay 2026-II · Cuadrangulares Semifinales
          </h2>
          <div class="tc-leyenda" style="margin-top:8px;">
            <span><span class="tc-dot tc-dot--verde"></span> 1.º de cada grupo avanza a la Gran Final</span>
            <span><span class="cua-ventaja-star" style="margin:0">★</span> Punto invisible (cabezas de serie: 1.º y 2.º del Todos contra Todos)</span>
          </div>
        </div>
        <div class="cua-grid">
          ${bloqueGrupo('A')}
          ${bloqueGrupo('B')}
        </div>
        <h3 style="margin:24px 0 12px;font-size:15px;color:var(--dorado);letter-spacing:0.5px;">🏆 GRAN FINAL LIGA BETPLAY 2026-II</h3>
        <div class="cua-final-grid">${finalHtml}</div>
      </div>
    `;
  },

  /* Renderiza las tablas de grupos A a H para Libertadores y Sudamericana */
  renderGruposCONMEBOL(comp, resultados) {
    const gruposClaves = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const info = COMPETICIONES[comp] || {};

    return `
      <div class="tc-grupos-bloque">
        <div class="tc-tabla-header" style="margin-bottom:16px;">
          <h2 style="margin:0;font-size:22px;display:flex;align-items:center;gap:10px;">
            ${info.badge ? `<img src="${info.badge}" class="tc-comp-logo" alt="${info.nombre}" onerror="this.style.display='none'">` : ''}
            ${U.esc(info.nombreCompleto)} · Fase de Grupos
          </h2>
          <div class="tc-leyenda" style="margin-top:6px;">
            <span><span class="tc-dot tc-dot--verde"></span> 1º y 2º Clasifican a Octavos / Play-offs</span>
            <span><span class="tc-dot tc-dot--naranja"></span> 3º Pasa a Sudamericana / Play-off</span>
            <span><span class="tc-dot tc-dot--rojo"></span> 4º Eliminado de competencias continentales</span>
          </div>
        </div>

        <div class="grupos-grid">
          ${gruposClaves.map(g => {
            const filas = this.calcularTabla(comp, 'grupos', g, resultados);
            return `
              <div class="panel grupo-card">
                <div class="grupo-header">
                  <h3 style="margin:0;font-size:15px;color:var(--dorado)">GRUPO ${g}</h3>
                  <span style="font-size:11px;color:var(--tinta-3)">${filas[0]?.pj || 0}/6 partidos</span>
                </div>
                <div class="grupo-tabla-wrap">
                <table class="grupo-tabla">
                  <thead>
                    <tr>
                      <th style="text-align:left">Club</th>
                      <th>PJ</th><th>G</th><th>E</th><th>P</th>
                      <th>DG</th><th>PTS</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${filas.map((f, idx) => {
                      const clasifica = idx < 2;
                      const pasaSud = idx === 2;
                      const clsRow = clasifica ? 'clasifica' : pasaSud ? 'posible-3ro' : '';
                      const badgeTag = clasifica 
                        ? `<span class="badge-avanza" title="Clasificado">✓</span>` 
                        : pasaSud ? `<span class="badge-3ro" title="Tercer lugar">3</span>` : '';
                      const dgStr = f.dg > 0 ? `+${f.dg}` : String(f.dg);
                      return `
                        <tr class="${clsRow}">
                          <td>
                            <div class="td-equipo" data-equipo="${f.code}" title="Ver perfil de ${U.esc(f.nombre)}">
                              ${f.escudo}
                              <span class="td-nombre">${U.esc(f.nombre)}</span>
                              ${badgeTag}
                            </div>
                          </td>
                          <td>${f.pj}</td><td>${f.pg}</td><td>${f.pe}</td><td>${f.pp}</td>
                          <td style="font-family:var(--fuente-marcador);font-size:12px">${dgStr}</td>
                          <td style="font-family:var(--fuente-marcador);font-weight:700;color:var(--dorado)">${f.pts}</td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  },

  /* Resuelve una serie de ida y vuelta a partir de los partidos del fixture y resultados */
  _resolverLlaveIdaVuelta(ida, vuelta, resultados) {
    const getRes = (p) => p ? (resultados[p.id] || p.resultado || FIXTURE.resultadosIniciales[p.id]) : null;
    const resIda = getRes(ida);
    const resVta = getRes(vuelta);

    // El equipo 1 es el local en la vuelta (mejor sembrado); si no hay vuelta, el local de la ida
    const t1 = vuelta ? vuelta.local : ida.local;
    const t2 = vuelta ? vuelta.visitante : ida.visitante;

    const idaJugada = resIda && resIda.estado === 'finalizado' && resIda.gl !== undefined && resIda.gv !== undefined;
    const vtaJugada = resVta && resVta.estado === 'finalizado' && resVta.gl !== undefined && resVta.gv !== undefined;

    let g1Ida = 0, g2Ida = 0;
    if (idaJugada) {
      if (ida.local === t1) {
        g1Ida = Number(resIda.gl);
        g2Ida = Number(resIda.gv);
      } else {
        g1Ida = Number(resIda.gv);
        g2Ida = Number(resIda.gl);
      }
    }

    let g1Vta = 0, g2Vta = 0;
    if (vtaJugada && vuelta) {
      if (vuelta.local === t1) {
        g1Vta = Number(resVta.gl);
        g2Vta = Number(resVta.gv);
      } else {
        g1Vta = Number(resVta.gv);
        g2Vta = Number(resVta.gl);
      }
    }

    const tieneMarcador = idaJugada || vtaJugada;
    const s1 = tieneMarcador ? (g1Ida + g1Vta) : '-';
    const s2 = tieneMarcador ? (g2Ida + g2Vta) : '-';

    let ganador = null;
    if (vtaJugada) {
      if (resVta.ganador) ganador = resVta.ganador;
      else if (s1 > s2) ganador = t1;
      else if (s2 > s1) ganador = t2;
      else if (resVta.penGanador) ganador = resVta.penGanador;
    }

    const pen = resVta?.pen || vuelta?.pen || null;
    let statusTexto = 'PROGRAMADO';
    let statusCls = 'futuro';
    if (vtaJugada) {
      statusTexto = `FINAL${pen ? ` (Pen ${pen})` : ''}`;
      statusCls = 'final';
    } else if (idaJugada) {
      statusTexto = `Ida: ${g1Ida}-${g2Ida}`;
      statusCls = 'ida';
    } else if (ida?.fecha) {
      statusTexto = ida.fechaStr || ida.fecha;
    }

    return {
      t1, t2, s1, s2, ganador, pen,
      idaJugada, vtaJugada,
      statusTexto, statusCls,
      fechaVta: vuelta?.fechaStr || vuelta?.fecha || '',
      fechaIda: ida?.fechaStr || ida?.fecha || ''
    };
  },

  /* Renderiza el Cuadro de Eliminatorias interactivo (Octavos, Cuartos, Semis, Final) */
  renderCuadroCONMEBOL(comp, resultados) {
    const info = COMPETICIONES[comp] || {};
    const partidosComp = FIXTURE.partidos.filter(p => p.competicion === comp && p.fase === 'eliminatorias');

    const octIda = partidosComp.filter(p => p.etapa.includes('Octavos de Final (Ida)'));
    const octVta = partidosComp.filter(p => p.etapa.includes('Octavos de Final (Vuelta)'));
    const cuaIda = partidosComp.filter(p => p.etapa.includes('Cuartos de Final (Ida)'));
    const cuaVta = partidosComp.filter(p => p.etapa.includes('Cuartos de Final (Vuelta)'));
    const semIda = partidosComp.filter(p => p.etapa.includes('Semifinales (Ida)'));
    const semVta = partidosComp.filter(p => p.etapa.includes('Semifinales (Vuelta)'));
    const finalMatch = partidosComp.find(p => p.etapa.includes('Gran Final'));

    const emparejar = (idas, vueltas) => idas.map((ida, idx) => {
      const vta = vueltas.find(v =>
        (v.local === ida.visitante && v.visitante === ida.local) ||
        (v.local === ida.local && v.visitante === ida.visitante)
      ) || vueltas[idx] || null;
      return this._resolverLlaveIdaVuelta(ida, vta, resultados);
    });

    const octavosSeries = emparejar(octIda, octVta);
    const cuartosSeries = emparejar(cuaIda, cuaVta);
    const semisSeries = emparejar(semIda, semVta);

    const renderTeamRow = (code, score, esGanador, fallbackLabel) => {
      const esValido = code && FIXTURE.equipos[code];
      if (!esValido) {
        return `
          <div class="bracket-team-row">
            <span class="escudo-placeholder">?</span>
            <span class="bc-team-name" style="color:var(--tinta-3)">${U.esc(fallbackLabel || code || 'Por definir')}</span>
            <span class="bc-score">-</span>
          </div>`;
      }
      const eq = FIXTURE.equipo(code);
      return `
        <div class="bracket-team-row ${esGanador ? 'ganador' : ''}" data-equipo="${code}">
          ${eq.b}
          <span class="bc-team-name">${U.esc(eq.n)}</span>
          <span class="bc-score">${score}</span>
        </div>`;
    };

    const resFinal = finalMatch ? (resultados[finalMatch.id] || finalMatch.resultado || FIXTURE.resultadosIniciales[finalMatch.id]) : null;
    const finalJugada = resFinal && resFinal.estado === 'finalizado' && resFinal.gl !== undefined && resFinal.gv !== undefined;
    let finalGanador = null;
    if (finalJugada) {
      if (resFinal.ganador) finalGanador = resFinal.ganador;
      else if (Number(resFinal.gl) > Number(resFinal.gv)) finalGanador = finalMatch.local;
      else if (Number(resFinal.gv) > Number(resFinal.gl)) finalGanador = finalMatch.visitante;
      else if (resFinal.penGanador) finalGanador = resFinal.penGanador;
    }

    const finalFecha = finalMatch?.fechaStr || (comp === 'libertadores' ? '28 de Noviembre 2026' : '21 de Noviembre 2026');
    const finalEstadio = finalMatch?.estadio || (comp === 'libertadores'
      ? 'Estadio Centenario, Montevideo'
      : 'Estadio Metropolitano Roberto Meléndez, Barranquilla');
    const finalTrofeo = comp === 'libertadores' ? '🏆 GLORIA ETERNA' : '🥈 LA GRAN CONQUISTA';

    return `
      <div class="tc-bracket-bloque">
        <div class="tc-tabla-header" style="margin-bottom:20px;">
          <h2 style="margin:0;font-size:22px;display:flex;align-items:center;gap:10px;">
            ${info.badge ? `<img src="${info.badge}" class="tc-comp-logo" alt="${info.nombre}" onerror="this.style.display='none'">` : ''}
            ${U.esc(info.nombreCompleto)} · Cuadro de Eliminatorias
          </h2>
          <p class="sub" style="margin:4px 0 0;font-size:12.5px;">
            Ruta hacia la Gran Final Única · Clic en cualquier club para abrir su perfil
          </p>
        </div>

        <div class="bracket-scroll-container">
          <div class="bracket-wrapper">

            <!-- COLUMNA 1: OCTAVOS DE FINAL -->
            <div class="bracket-columna">
              <div class="bracket-col-titulo">OCTAVOS DE FINAL</div>
              <div class="bracket-series-lista">
                ${octavosSeries.map((s, idx) => `
                  <div class="bracket-card" data-serie="oct-${idx}">
                    <div class="bracket-card-header">
                      <span class="bc-etapa">Serie ${idx + 1}</span>
                      <span class="bc-status ${s.statusCls}">${U.esc(s.statusTexto)}</span>
                    </div>
                    ${renderTeamRow(s.t1, s.s1, s.ganador === s.t1)}
                    ${renderTeamRow(s.t2, s.s2, s.ganador === s.t2)}
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- COLUMNA 2: CUARTOS DE FINAL -->
            <div class="bracket-columna">
              <div class="bracket-col-titulo">CUARTOS DE FINAL</div>
              <div class="bracket-series-lista bracket-series-lista--cuartos">
                ${cuartosSeries.map((s, idx) => `
                  <div class="bracket-card">
                    <div class="bracket-card-header">
                      <span class="bc-etapa">Llave C${idx + 1}</span>
                      <span class="bc-status ${s.statusCls}">${U.esc(s.statusTexto)}</span>
                    </div>
                    ${renderTeamRow(s.t1, s.s1, s.ganador === s.t1)}
                    ${renderTeamRow(s.t2, s.s2, s.ganador === s.t2)}
                    ${!s.vtaJugada && s.fechaVta ? `<div class="bc-footer"><small>Vuelta: ${U.esc(s.fechaVta)}</small></div>` : ''}
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- COLUMNA 3: SEMIFINALES -->
            <div class="bracket-columna">
              <div class="bracket-col-titulo">SEMIFINALES</div>
              <div class="bracket-series-lista bracket-series-lista--semis">
                ${semisSeries.map((s, idx) => `
                  <div class="bracket-card">
                    <div class="bracket-card-header">
                      <span class="bc-etapa">Semifinal ${idx + 1}</span>
                      <span class="bc-status ${s.statusCls}">${U.esc(s.statusTexto)}</span>
                    </div>
                    ${renderTeamRow(s.t1, s.s1, s.ganador === s.t1, `Ganador C${idx * 2 + 1}`)}
                    ${renderTeamRow(s.t2, s.s2, s.ganador === s.t2, `Ganador C${idx * 2 + 2}`)}
                    ${!s.vtaJugada && s.fechaVta ? `<div class="bc-footer"><small>Vuelta: ${U.esc(s.fechaVta)}</small></div>` : ''}
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- COLUMNA 4: GRAN FINAL ÚNICA -->
            <div class="bracket-columna bracket-columna--final">
              <div class="bracket-col-titulo">🏆 GRAN FINAL ÚNICA</div>
              <div class="bracket-series-lista bracket-series-lista--final">
                <div class="bracket-card bracket-card--gran-final">
                  <div class="bracket-card-header">
                    <span class="bc-etapa">${U.esc(finalFecha)}</span>
                    <span class="bc-status ${finalJugada ? 'final' : 'trofeo'}">${finalJugada ? `FINAL${resFinal.pen ? ` (Pen ${resFinal.pen})` : ''}` : finalTrofeo}</span>
                  </div>
                  ${renderTeamRow(finalMatch?.local, finalJugada ? resFinal.gl : '-', finalGanador === finalMatch?.local, 'Finalista 1')}
                  ${renderTeamRow(finalMatch?.visitante, finalJugada ? resFinal.gv : '-', finalGanador === finalMatch?.visitante, 'Finalista 2')}
                  <div class="bc-footer" style="text-align:center;">
                    <small>🏟 ${U.esc(finalEstadio)}</small>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    `;
  },

  /* Renderiza el cuadro de Champions League (Fase Eliminatoria y Play-off Previo) */
  renderCuadroUCL(resultados) {
    const elimMatches = FIXTURE.partidos.filter(p => p.competicion === 'ucl' && p.fase === 'eliminatoria');
    const poMatches = FIXTURE.partidos.filter(p => p.competicion === 'ucl' && p.fase === 'playoff');

    const renderMatchCard = (p) => {
      const res = resultados[p.id] || p.resultado || FIXTURE.resultadosIniciales[p.id];
      const lValid = p.local && FIXTURE.equipos[p.local];
      const vValid = p.visitante && FIXTURE.equipos[p.visitante];
      const eqL = lValid ? FIXTURE.equipo(p.local) : { n: p.local || 'Por definir', b: '<span class="escudo-placeholder">?</span>' };
      const eqV = vValid ? FIXTURE.equipo(p.visitante) : { n: p.visitante || 'Por definir', b: '<span class="escudo-placeholder">?</span>' };
      const scoreL = res?.gl !== undefined ? res.gl : '-';
      const scoreV = res?.gv !== undefined ? res.gv : '-';
      const esFinal = res?.estado === 'finalizado';
      return `
        <div class="panel tc-card-match">
          <div class="tc-cm-header">
            <span>${U.esc(p.etapa)}</span>
            <span class="bc-status ${esFinal ? 'final' : 'futuro'}">${esFinal ? 'FINAL' : U.esc(p.fechaStr || p.fecha || 'Programado')}</span>
          </div>
          <div class="tc-cm-teams">
            <div class="tc-cm-row" ${lValid ? `data-equipo="${p.local}" title="Ver perfil de ${U.esc(eqL.n)}"` : ''}>
              ${eqL.b}
              <span class="tc-cm-name">${U.esc(eqL.n)}</span>
              <span class="tc-cm-score">${scoreL}</span>
            </div>
            <div class="tc-cm-row" ${vValid ? `data-equipo="${p.visitante}" title="Ver perfil de ${U.esc(eqV.n)}"` : ''}>
              ${eqV.b}
              <span class="tc-cm-name">${U.esc(eqV.n)}</span>
              <span class="tc-cm-score">${scoreV}</span>
            </div>
          </div>
          <div class="tc-cm-footer">
            <small>🏟 ${U.esc(p.estadio || 'Estadio por definir')}</small>
          </div>
        </div>
      `;
    };

    return `
      <div class="tc-bracket-bloque">
        <div class="tc-tabla-header" style="margin-bottom:16px;">
          <h2 style="margin:0;font-size:22px;display:flex;align-items:center;gap:10px;">
            <img src="img/escudos/champions/ucl.png" class="tc-comp-logo" alt="UCL">
            UEFA Champions League · Cruces y Play-offs
          </h2>
          <p class="sub" style="margin:4px 0 0;font-size:12.5px;">
            Fase Eliminatoria 2026/27 (Dieciseisavos, Octavos, Cuartos, Semifinales y Final) y Play-off Previo
          </p>
        </div>

        ${elimMatches.length ? `
          <h3 style="margin:18px 0 10px;font-size:15px;color:var(--dorado);">⚡ Fase Eliminatoria 2026/27</h3>
          <div class="tc-partidos-grid-po">
            ${elimMatches.map(renderMatchCard).join('')}
          </div>
        ` : ''}

        <h3 style="margin:24px 0 10px;font-size:15px;color:var(--tinta-2);">🎟 Play-off Previo (Agosto 2026)</h3>
        <div class="tc-partidos-grid-po">
          ${poMatches.map(renderMatchCard).join('')}
        </div>
      </div>
    `;
  }
};

window.TablasCuadros = TablasCuadros;

