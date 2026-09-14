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

import { FIXTURE, COMPETICIONES } from './fixture.js';
import { U } from './utils.js';
import { EquiposInfo } from './equipos-info.js';

export const TablasCuadros = {
  competicionActiva: 'betplay',
  subVistaCONMEBOL: 'cuadro', // 'cuadro' | 'grupos'
  subVistaUCL: 'liga',        // 'liga' | 'cuadro'

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
    }

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
  },

  /* Renderiza tabla de posiciones estándar para ligas y UCL Fase de Liga */
  renderTablaLiga(comp, resultados) {
    const faseFiltro = comp === 'ucl' ? 'liga' : null;
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
            `;
          }).join('')}
        </div>
      </div>
    `;
  },

  /* Renderiza el Cuadro de Eliminatorias interactivo estilo Sofascore (Octavos, Cuartos, Semis, Final) */
  renderCuadroCONMEBOL(comp, resultados) {
    const info = COMPETICIONES[comp] || {};

    // Obtener series de Octavos, Cuartos, Semifinales y Final
    // Para Libertadores y Sudamericana se definen las 8 series de Octavos y 4 de Cuartos
    const octavosData = comp === 'libertadores' ? [
      { idVuelta: 'lib-135', l: 'elp', v: 'ucat_chi', gl: 3, gv: 1, ganador: 'elp', glIda: 2, gvIda: 1, resOk: true },
      { idVuelta: 'lib-136', l: 'cor', v: 'cen', gl: 0, gv: 0, ganador: 'cor', glIda: 2, gvIda: 1, resOk: true },
      { idVuelta: 'lib-137', l: 'idv', v: 'tol', gl: 2, gv: 0, ganador: 'idv', glIda: 1, gvIda: 0, resOk: true },
      { idVuelta: 'lib-138', l: 'fla', v: 'cru', gl: 2, gv: 1, ganador: 'fla', glIda: 2, gvIda: 0, resOk: true },
      { idVuelta: 'lib-139', l: 'ldu', v: 'mir', gl: 1, gv: 1, ganador: 'ldu', glIda: 1, gvIda: 1, pen: '5-4', resOk: true },
      { idVuelta: 'lib-140', l: 'pal', v: 'ccp', gl: 1, gv: 0, ganador: 'pal', glIda: 2, gvIda: 0, resOk: true },
      { idVuelta: 'lib-141', l: 'pla', v: 'coq', gl: 0, gv: 0, ganador: 'pla', glIda: 1, gvIda: 1, pen: '7-6', resOk: true },
      { idVuelta: 'lib-142', l: 'flu', v: 'irm', gl: 1, gv: 1, ganador: 'flu', glIda: 2, gvIda: 2, pen: '5-4', resOk: true }
    ] : [
      { idVuelta: 'sud-137', l: 'cabj', v: 'rec', gl: 5, gv: 1, ganador: 'cabj', glIda: 2, gvIda: 0, resOk: true },
      { idVuelta: 'sud-138', l: 'sao', v: 'bol', gl: 2, gv: 1, ganador: 'sao', glIda: 1, gvIda: 1, resOk: true },
      { idVuelta: 'sud-139', l: 'sfe', v: 'riv', gl: 1, gv: 1, ganador: 'sfe', glIda: 1, gvIda: 1, pen: '8-7', resOk: true },
      { idVuelta: 'sud-140', l: 'vas', v: 'oli', gl: 3, gv: 0, ganador: 'vas', glIda: 1, gvIda: 1, resOk: true },
      { idVuelta: 'sud-141', l: 'cam', v: 'bra', gl: 2, gv: 1, ganador: 'cam', glIda: 1, gvIda: 1, resOk: true },
      { idVuelta: 'sud-142', l: 'san_br', v: 'mcr', gl: 1, gv: 0, ganador: 'san_br', glIda: 2, gvIda: 1, resOk: true },
      { idVuelta: 'sud-143', l: 'tor', v: 'tig', gl: 2, gv: 1, ganador: 'tor', glIda: 1, gvIda: 0, resOk: true },
      { idVuelta: 'sud-144', l: 'cie', v: 'bot', gl: 4, gv: 1, ganador: 'cie', glIda: 1, gvIda: 0, resOk: true }
    ];

    const cuartosData = comp === 'libertadores' ? [
      { idIda: 'lib-143', idVta: 'lib-147', t1: 'elp', t2: 'cor', s1: 1, s2: 1, estado: 'finalizado', fechaVta: '16 Sep' },
      { idIda: 'lib-144', idVta: 'lib-148', t1: 'idv', t2: 'fla', s1: '-', s2: '-', estado: 'hoy_730', fechaIda: 'Hoy 7:30 PM', fechaVta: '17 Sep' },
      { idIda: 'lib-145', idVta: 'lib-149', t1: 'ldu', t2: 'pal', s1: 0, s2: 1, estado: 'finalizado', fechaVta: '17 Sep' },
      { idIda: 'lib-146', idVta: 'lib-150', t1: 'pla', t2: 'flu', s1: 0, s2: 2, estado: 'finalizado', fechaVta: '18 Sep' }
    ] : [
      { idIda: 'sud-145', idVta: 'sud-149', t1: 'cabj', t2: 'sao', s1: 1, s2: 0, estado: 'finalizado', fechaVta: '16 Sep' },
      { idIda: 'sud-146', idVta: 'sud-150', t1: 'sfe', t2: 'vas', s1: 0, s2: 0, estado: 'finalizado', fechaVta: '16 Sep' },
      { idIda: 'sud-147', idVta: 'sud-151', t1: 'cam', t2: 'san_br', s1: 0, s2: 2, estado: 'finalizado', fechaVta: '17 Sep' },
      { idIda: 'sud-148', idVta: 'sud-152', t1: 'tor', t2: 'cie', s1: '-', s2: '-', estado: 'hoy_730', fechaIda: 'Hoy 7:30 PM', fechaVta: '17 Sep' }
    ];

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
                ${octavosData.map((s, idx) => {
                  const eqL = FIXTURE.equipo(s.l);
                  const eqV = FIXTURE.equipo(s.v);
                  const gloL = (s.glIda || 0) + (s.gl || 0);
                  const gloV = (s.gvIda || 0) + (s.gv || 0);
                  const penStr = s.pen ? ` (Pen ${s.pen})` : '';
                  return `
                    <div class="bracket-card" data-serie="oct-${idx}">
                      <div class="bracket-card-header">
                        <span class="bc-etapa">Serie ${idx + 1}</span>
                        <span class="bc-status final">FINAL${penStr}</span>
                      </div>
                      <div class="bracket-team-row ${s.ganador === s.l ? 'ganador' : ''}" data-equipo="${s.l}">
                        ${eqL.b}
                        <span class="bc-team-name">${U.esc(eqL.n)}</span>
                        <span class="bc-score">${gloL}</span>
                      </div>
                      <div class="bracket-team-row ${s.ganador === s.v ? 'ganador' : ''}" data-equipo="${s.v}">
                        ${eqV.b}
                        <span class="bc-team-name">${U.esc(eqV.n)}</span>
                        <span class="bc-score">${gloV}</span>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- COLUMNA 2: CUARTOS DE FINAL -->
            <div class="bracket-columna">
              <div class="bracket-col-titulo">CUARTOS DE FINAL</div>
              <div class="bracket-series-lista bracket-series-lista--cuartos">
                ${cuartosData.map((c, idx) => {
                  const eq1 = FIXTURE.equipo(c.t1);
                  const eq2 = FIXTURE.equipo(c.t2);
                  const esHoy = c.estado === 'hoy_730';
                  const statusHtml = esHoy 
                    ? '<span class="bc-status hoy">🔥 HOY 7:30 PM</span>' 
                    : '<span class="bc-status ida">Ida: Finalizado</span>';

                  return `
                    <div class="bracket-card ${esHoy ? 'bracket-card--hoy' : ''}">
                      <div class="bracket-card-header">
                        <span class="bc-etapa">Llave C${idx + 1}</span>
                        ${statusHtml}
                      </div>
                      <div class="bracket-team-row" data-equipo="${c.t1}">
                        ${eq1.b}
                        <span class="bc-team-name">${U.esc(eq1.n)}</span>
                        <span class="bc-score">${c.s1}</span>
                      </div>
                      <div class="bracket-team-row" data-equipo="${c.t2}">
                        ${eq2.b}
                        <span class="bc-team-name">${U.esc(eq2.n)}</span>
                        <span class="bc-score">${c.s2}</span>
                      </div>
                      <div class="bc-footer">
                        <small>Vuelta: ${c.fechaVta}</small>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- COLUMNA 3: SEMIFINALES -->
            <div class="bracket-columna">
              <div class="bracket-col-titulo">SEMIFINALES</div>
              <div class="bracket-series-lista bracket-series-lista--semis">
                <div class="bracket-card">
                  <div class="bracket-card-header">
                    <span class="bc-etapa">Semifinal 1</span>
                    <span class="bc-status futuro">Octubre 2026</span>
                  </div>
                  <div class="bracket-team-row">
                    <span class="escudo-placeholder">?</span>
                    <span class="bc-team-name" style="color:var(--tinta-3)">Ganador C1</span>
                    <span class="bc-score">-</span>
                  </div>
                  <div class="bracket-team-row">
                    <span class="escudo-placeholder">?</span>
                    <span class="bc-team-name" style="color:var(--tinta-3)">Ganador C2</span>
                    <span class="bc-score">-</span>
                  </div>
                </div>

                <div class="bracket-card">
                  <div class="bracket-card-header">
                    <span class="bc-etapa">Semifinal 2</span>
                    <span class="bc-status futuro">Octubre 2026</span>
                  </div>
                  <div class="bracket-team-row">
                    <span class="escudo-placeholder">?</span>
                    <span class="bc-team-name" style="color:var(--tinta-3)">Ganador C3</span>
                    <span class="bc-score">-</span>
                  </div>
                  <div class="bracket-team-row">
                    <span class="escudo-placeholder">?</span>
                    <span class="bc-team-name" style="color:var(--tinta-3)">Ganador C4</span>
                    <span class="bc-score">-</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- COLUMNA 4: GRAN FINAL ÚNICA -->
            <div class="bracket-columna bracket-columna--final">
              <div class="bracket-col-titulo">🏆 GRAN FINAL ÚNICA</div>
              <div class="bracket-series-lista bracket-series-lista--final">
                <div class="bracket-card bracket-card--gran-final">
                  <div class="bracket-card-header">
                    <span class="bc-etapa">28 de Noviembre 2026</span>
                    <span class="bc-status trofeo">🏆 GLORIA ETERNA</span>
                  </div>
                  <div class="bracket-team-row">
                    <span class="escudo-placeholder">🥇</span>
                    <span class="bc-team-name" style="color:var(--dorado)">Finalista 1</span>
                    <span class="bc-score">-</span>
                  </div>
                  <div class="bracket-team-row">
                    <span class="escudo-placeholder">🥈</span>
                    <span class="bc-team-name" style="color:var(--dorado)">Finalista 2</span>
                    <span class="bc-score">-</span>
                  </div>
                  <div class="bc-footer" style="text-align:center;">
                    <small>🏟 Estadio Más Monumental, Buenos Aires</small>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    `;
  },

  /* Renderiza el cuadro de Champions League (Ronda Play-off y fases eliminatorias) */
  renderCuadroUCL(resultados) {
    const poMatches = FIXTURE.partidos.filter(p => p.competicion === 'ucl' && p.fase === 'playoff');
    return `
      <div class="tc-bracket-bloque">
        <div class="tc-tabla-header" style="margin-bottom:16px;">
          <h2 style="margin:0;font-size:22px;display:flex;align-items:center;gap:10px;">
            <img src="img/escudos/champions/ucl.png" class="tc-comp-logo" alt="UCL">
            UEFA Champions League · Cruces y Play-offs
          </h2>
          <p class="sub" style="margin:4px 0 0;font-size:12.5px;">
            Ronda eliminatoria de Play-off previo a la Fase de Liga (36 clubes)
          </p>
        </div>

        <div class="tc-partidos-grid-po">
          ${poMatches.map(p => {
            const res = resultados[p.id] || p.resultado || FIXTURE.resultadosIniciales[p.id];
            const eqL = FIXTURE.equipo(p.local);
            const eqV = FIXTURE.equipo(p.visitante);
            const scoreL = res?.gl !== undefined ? res.gl : '-';
            const scoreV = res?.gv !== undefined ? res.gv : '-';
            return `
              <div class="panel tc-card-match">
                <div class="tc-cm-header">
                  <span>${U.esc(p.etapa)}</span>
                  <span class="bc-status final">FINAL</span>
                </div>
                <div class="tc-cm-teams">
                  <div class="tc-cm-row" data-equipo="${p.local}" title="Ver perfil de ${U.esc(eqL.n)}">
                    ${eqL.b}
                    <span class="tc-cm-name">${U.esc(eqL.n)}</span>
                    <span class="tc-cm-score">${scoreL}</span>
                  </div>
                  <div class="tc-cm-row" data-equipo="${p.visitante}" title="Ver perfil de ${U.esc(eqV.n)}">
                    ${eqV.b}
                    <span class="tc-cm-name">${U.esc(eqV.n)}</span>
                    <span class="tc-cm-score">${scoreV}</span>
                  </div>
                </div>
                <div class="tc-cm-footer">
                  <small>🏟 ${U.esc(p.estadio || 'Estadio')}</small>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }
};

window.TablasCuadros = TablasCuadros;

