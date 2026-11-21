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

import { FIXTURE, COMPETICIONES } from './fixture.js?v=31';
import { U } from './utils.js?v=31';
import { EquiposInfo } from './equipos-info.js?v=31';
import { CompeticionesInfo } from './competiciones-info.js?v=31';

/* Íconos SVG minimalistas (stroke-width="1.75", cero emojis) para el Simulador */
const SIM_ICO = {
  sliders: `<svg class="ico ico--sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="2" y1="14" x2="6" y2="14"/><line x1="10" y1="8" x2="14" y2="8"/><line x1="18" y1="16" x2="22" y2="16"/></svg>`,
  reset: `<svg class="ico ico--sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>`,
  close: `<svg class="ico ico--sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`,
  chevL: `<svg class="ico ico--sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>`,
  chevR: `<svg class="ico ico--sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>`,
  chevD: `<svg class="ico ico--sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>`,
  trophy: `<svg class="ico ico--sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>`
};

export const TablasCuadros = {
  competicionActiva: 'betplay',
  subVistaCONMEBOL: 'cuadro', // 'cuadro' | 'grupos'
  subVistaUCL: 'liga',        // 'liga' | 'cuadro'
  subVistaBetPlay: 'cuadrangulares', // 'cuadrangulares' | 'liga'

  /* Estado 100% en memoria local del navegador (NUNCA toca Store / Firestore / FIXTURE) */
  simActivo: false,
  simResultados: {},       // { [pid]: { gl: Number, gv: Number, estado: 'finalizado', _sim: true } }
  simFiltroJornada: {},    // { [vistaKey]: string }
  simFiltroGrupo: {},      // { [vistaKey]: string }
  simColapsadoMovil: false,
  _ultimosResultados: {},
  _ultimasPred: {},

  /* Fusiona resultados reales con el overlay simulado sin mutar los originales */
  _fusionarResultados(resultadosReales = {}) {
    if (!this.simActivo || !Object.keys(this.simResultados).length) return resultadosReales;
    return { ...resultadosReales, ...this.simResultados };
  },

  _getResReal(p, resultadosReales = {}) {
    return resultadosReales[p.id] || p.resultado || FIXTURE.resultadosIniciales[p.id] || null;
  },

  _esFinalizadoReal(p, resultadosReales = {}) {
    const r = this._getResReal(p, resultadosReales);
    return Boolean((r && r.estado === 'finalizado') || p.estado === 'finalizado');
  },

  _tieneClubesValidos(p) {
    return Boolean(p && p.local && p.visitante && FIXTURE.equipos && FIXTURE.equipos[p.local] && FIXTURE.equipos[p.visitante]);
  },

  _vistaKey(comp = this.competicionActiva) {
    if (comp === 'betplay') return `betplay_${this.subVistaBetPlay}`;
    if (comp === 'ucl') return `ucl_${this.subVistaUCL}`;
    if (comp === 'libertadores' || comp === 'sudamericana') return `${comp}_${this.subVistaCONMEBOL}`;
    return comp;
  },

  /* Indicador discreto de variación de puesto respecto a la tabla real */
  _renderDeltaPos(delta) {
    if (!this.simActivo || !delta) return '<span class="sim-delta sim-delta--eq" aria-hidden="true"></span>';
    if (delta > 0) {
      return `<span class="sim-delta sim-delta--up" title="Sube ${delta} ${delta === 1 ? 'posición' : 'posiciones'}">▲ +${delta}</span>`;
    }
    return `<span class="sim-delta sim-delta--down" title="Baja ${Math.abs(delta)} ${Math.abs(delta) === 1 ? 'posición' : 'posiciones'}">▼ ${delta}</span>`;
  },

  /* Obtiene los partidos pendientes (no finalizados) y simulables para la competición/subvista activa */
  _obtenerPartidosSimulables(comp, resultadosReales = {}) {
    const lista = FIXTURE.partidos.filter(p => {
      if (p.competicion !== comp) return false;
      if (comp === 'betplay') {
        if (this.subVistaBetPlay === 'cuadrangulares' && p.fase !== 'cuadrangulares') return false;
        if (this.subVistaBetPlay === 'liga' && p.fase !== 'liga') return false;
      } else if (comp === 'ucl') {
        if (this.subVistaUCL === 'liga' && p.fase !== 'liga') return false;
        if (this.subVistaUCL === 'cuadro' && p.fase !== 'eliminatoria' && p.fase !== 'playoff') return false;
      } else if (comp === 'libertadores' || comp === 'sudamericana') {
        if (this.subVistaCONMEBOL === 'grupos' && p.fase !== 'grupos') return false;
        if (this.subVistaCONMEBOL === 'cuadro' && p.fase !== 'eliminatorias') return false;
      }
      if (this._esFinalizadoReal(p, resultadosReales)) return false;
      if (!this._tieneClubesValidos(p)) return false;
      return true;
    });

    return lista.sort((a, b) => {
      const ja = Number(a.jornada) || 999;
      const jb = Number(b.jornada) || 999;
      if (ja !== jb) return ja - jb;
      if (a.grupo && b.grupo && a.grupo !== b.grupo) return a.grupo.localeCompare(b.grupo);
      return (a.utc || a.fecha || 'z').localeCompare(b.utc || b.fecha || 'z');
    });
  },

  /* Agrupa los partidos pendientes por jornada/fecha/etapa dando prioridad a la más próxima */
  _agruparJornadasSim(partidos, comp) {
    const mapa = new Map();
    partidos.forEach(p => {
      let key = 'prox';
      let label = 'Próximos partidos';
      if (comp === 'betplay' && p.fase === 'cuadrangulares') {
        const fn = (Number(p.jornada) || 20) - 19;
        key = `f${fn}`;
        label = `Cuadrangulares · Fecha ${fn}`;
      } else if (comp === 'betplay' && p.jornada) {
        key = `f${p.jornada}`;
        label = `Fecha ${p.jornada}`;
      } else if (comp === 'ucl' && p.fase === 'liga') {
        const mJ = String(p.etapa || '').match(/Jornada\s*(\d+)/i);
        const jn = p.jornada || (mJ ? Number(mJ[1]) : null);
        key = jn ? `j${jn}` : (p.etapa || 'ucl_liga');
        label = jn ? `Fase de Liga · Jornada ${jn}` : (p.etapa || 'Fase de Liga');
      } else if (p.jornada && (comp === 'premier' || comp === 'laliga' || comp === 'bundesliga')) {
        key = `j${p.jornada}`;
        label = `Jornada ${p.jornada}`;
      } else if (p.etapa) {
        const limpia = String(p.etapa).replace(/^.*·\s*/, '').trim();
        key = limpia || 'etapa';
        label = limpia || 'Próximos';
      } else if (p.jornada) {
        key = `j${p.jornada}`;
        label = `Jornada ${p.jornada}`;
      }
      if (!mapa.has(key)) mapa.set(key, { key, label, partidos: [] });
      mapa.get(key).partidos.push(p);
    });
    return Array.from(mapa.values());
  },

  _fechaCortaSim(p) {
    if (!p.fecha) return p.fechaStr || '';
    const partes = p.fecha.split('-').map(Number);
    if (partes.length < 3) return p.fechaStr || p.fecha;
    const [, mo, d] = partes;
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const hora = (p.horaOk && p.horaStr) ? ` · ${p.horaStr.replace(' COT', '')}` : '';
    return `${d} ${meses[mo - 1] || ''}${hora}`;
  },

  /* Si la subvista actual ya finalizó, verifica si otra fase de la misma competición tiene pendientes */
  _detectarFaseAlternativaSim(comp, resultadosReales = {}) {
    if (comp === 'betplay' && this.subVistaBetPlay === 'liga') {
      const hayCua = FIXTURE.partidos.some(p => p.competicion === 'betplay' && p.fase === 'cuadrangulares' && !this._esFinalizadoReal(p, resultadosReales) && this._tieneClubesValidos(p));
      if (hayCua) return { sub: 'cuadrangulares', texto: 'Ir a Cuadrangulares Semifinales' };
    } else if (comp === 'ucl' && this.subVistaUCL === 'cuadro') {
      const hayLiga = FIXTURE.partidos.some(p => p.competicion === 'ucl' && p.fase === 'liga' && !this._esFinalizadoReal(p, resultadosReales) && this._tieneClubesValidos(p));
      if (hayLiga) return { sub: 'liga', texto: 'Ir a Fase de Liga (36 Clubes)' };
    } else if ((comp === 'libertadores' || comp === 'sudamericana') && this.subVistaCONMEBOL === 'grupos') {
      const hayKo = FIXTURE.partidos.some(p => p.competicion === comp && p.fase === 'eliminatorias' && !this._esFinalizadoReal(p, resultadosReales) && this._tieneClubesValidos(p));
      if (hayKo) return { sub: 'cuadro', texto: 'Ir al Cuadro de Eliminatorias' };
    }
    return null;
  },

  _renderSimStatusbar() {
    const totalSim = Object.keys(this.simResultados).length;
    const txtConteo = `${totalSim} ${totalSim === 1 ? 'partido simulado' : 'partidos simulados'}`;
    return `
      <div class="sim-statusbar" id="tc-sim-statusbar" role="status" aria-live="polite">
        <div class="sim-status-info">
          <span class="sim-status-dot" aria-hidden="true"></span>
          <span id="tc-sim-conteo-txt">Modo Simulador · ${txtConteo}</span>
          <span class="sim-status-sub">Solo en memoria · No altera datos oficiales</span>
        </div>
        <div class="sim-status-actions">
          <button class="sim-btn" id="btn-sim-reset" type="button" ${totalSim === 0 ? 'disabled' : ''}>
            ${SIM_ICO.reset} Reiniciar simulación
          </button>
          <button class="sim-btn sim-btn--salir" id="btn-sim-salir" type="button">
            ${SIM_ICO.close} Salir
          </button>
        </div>
      </div>
    `;
  },

  _renderSimFilaPartido(p, resultadosReales = {}, mostrarTagGrupo = false) {
    const L = FIXTURE.equipo(p.local);
    const V = FIXTURE.equipo(p.visitante);
    const sim = this.simResultados[p.id];
    const rReal = this._getResReal(p, resultadosReales);
    const enJuego = rReal && rReal.estado === 'en_juego';
    const activo = Boolean(sim && sim.gl !== undefined && sim.gv !== undefined);
    const glVal = activo ? String(sim.gl) : '';
    const gvVal = activo ? String(sim.gv) : '';

    let tagIzq = '';
    if (p.competicion === 'betplay' && p.fase === 'cuadrangulares') {
      const fn = (Number(p.jornada) || 20) - 19;
      tagIzq = mostrarTagGrupo ? `Grupo ${p.grupo} · F${fn}` : `F${fn}`;
    } else if (p.grupo) {
      tagIzq = `Grupo ${p.grupo}`;
    } else if (p.jornada && (p.competicion === 'premier' || p.competicion === 'laliga' || p.competicion === 'bundesliga')) {
      tagIzq = `J${p.jornada}`;
    } else if (p.etapa) {
      tagIzq = p.etapa.replace(/^.*·\s*/, '');
    }

    const metaDer = enJuego
      ? `<span class="sim-row-live">En juego (${rReal.gl ?? 0}-${rReal.gv ?? 0})</span>`
      : `<span>${U.esc(this._fechaCortaSim(p))}</span>`;

    return `
      <div class="sim-row ${activo ? 'sim-row--activo' : ''}" data-sim-pid="${U.esc(p.id)}">
        <div class="sim-row-meta">
          <span class="sim-row-tag">${U.esc(tagIzq)}</span>
          ${metaDer}
        </div>
        <div class="sim-row-main">
          <div class="sim-team sim-team--l" title="${U.esc(L.n)}">
            ${L.b}
            <span class="sim-team-nom">${U.esc(L.n)}</span>
          </div>
          <div class="sim-controls" role="group" aria-label="Marcador simulado ${U.esc(L.n)} vs ${U.esc(V.n)}">
            <div class="sim-side">
              <button class="sim-step" type="button" data-sim-step="l-" aria-label="Restar gol a ${U.esc(L.n)}">−</button>
              <input class="sim-input" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="2" placeholder="-" value="${glVal}" data-sim-in="l" aria-label="Goles ${U.esc(L.n)}">
              <button class="sim-step" type="button" data-sim-step="l+" aria-label="Sumar gol a ${U.esc(L.n)}">+</button>
            </div>
            <span class="sim-sep">:</span>
            <div class="sim-side">
              <button class="sim-step" type="button" data-sim-step="v-" aria-label="Restar gol a ${U.esc(V.n)}">−</button>
              <input class="sim-input" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="2" placeholder="-" value="${gvVal}" data-sim-in="v" aria-label="Goles ${U.esc(V.n)}">
              <button class="sim-step" type="button" data-sim-step="v+" aria-label="Sumar gol a ${U.esc(V.n)}">+</button>
            </div>
          </div>
          <div class="sim-team sim-team--v" title="${U.esc(V.n)}">
            <span class="sim-team-nom">${U.esc(V.n)}</span>
            ${V.b}
          </div>
          <button class="sim-clear ${activo ? 'sim-visible' : ''}" type="button" data-sim-clear="${U.esc(p.id)}" title="Limpiar este partido" aria-label="Limpiar marcador simulado">
            ${SIM_ICO.close}
          </button>
        </div>
      </div>
    `;
  },

  _renderSimPanel(comp, resultadosReales = {}) {
    const pendientes = this._obtenerPartidosSimulables(comp, resultadosReales);
    const vKey = this._vistaKey(comp);
    const colapsadoCls = this.simColapsadoMovil ? 'sim-panel--colapsado' : '';

    if (!pendientes.length) {
      const alt = this._detectarFaseAlternativaSim(comp, resultadosReales);
      return `
        <aside class="sim-panel ${colapsadoCls}" id="tc-sim-panel">
          <div class="sim-panel-head">
            <h3 class="sim-panel-titulo">${SIM_ICO.sliders} Partidos simulables</h3>
            <span class="sim-panel-sub">0 pendientes</span>
          </div>
          <div class="sim-vacio">
            <div>Esta fase no tiene partidos pendientes por disputar.</div>
            ${alt ? `<button class="sim-vacio-cta" type="button" data-sim-ir-sub="${U.esc(alt.sub)}">${U.esc(alt.texto)}</button>` : ''}
          </div>
        </aside>
      `;
    }

    const jornadas = this._agruparJornadasSim(pendientes, comp);
    const opciones = jornadas.map(j => ({ key: j.key, label: `${j.label} (${j.partidos.length})`, partidos: j.partidos }));

    if (jornadas.length > 1) {
      if (pendientes.length <= 60) {
        opciones.push({ key: '__all__', label: `Todos los pendientes (${pendientes.length})`, partidos: pendientes });
      } else {
        const proxDos = [...(jornadas[0]?.partidos || []), ...(jornadas[1]?.partidos || [])];
        opciones.push({ key: '__prox2__', label: `Próximas 2 jornadas (${proxDos.length})`, partidos: proxDos });
      }
    }

    let selKey = this.simFiltroJornada[vKey];
    if (!selKey || !opciones.some(o => o.key === selKey)) {
      selKey = opciones[0].key;
      this.simFiltroJornada[vKey] = selKey;
    }
    const idxActual = opciones.findIndex(o => o.key === selKey);
    const bloqueSel = opciones[idxActual] || opciones[0];

    // Filtro por grupo (Cuadrangulares BetPlay A/B o Fase de Grupos CONMEBOL A-H)
    const gruposDisp = Array.from(new Set(bloqueSel.partidos.map(p => p.grupo).filter(Boolean))).sort();
    let grupoSel = this.simFiltroGrupo[vKey] || 'todos';
    if (grupoSel !== 'todos' && !gruposDisp.includes(grupoSel)) {
      grupoSel = 'todos';
      this.simFiltroGrupo[vKey] = 'todos';
    }

    const listaFiltrada = grupoSel === 'todos'
      ? bloqueSel.partidos
      : bloqueSel.partidos.filter(p => p.grupo === grupoSel);

    let filasHtml = '';
    if (comp === 'betplay' && this.subVistaBetPlay === 'cuadrangulares' && grupoSel === 'todos' && gruposDisp.length > 1) {
      gruposDisp.forEach(g => {
        const sub = listaFiltrada.filter(p => p.grupo === g);
        if (sub.length) {
          filasHtml += `<div class="sim-grupo-sep"><span>Cuadrangular ${U.esc(g)}</span><span>${sub.length} ${sub.length === 1 ? 'partido' : 'partidos'}</span></div>`;
          filasHtml += sub.map(p => this._renderSimFilaPartido(p, resultadosReales, false)).join('');
        }
      });
    } else {
      filasHtml = listaFiltrada.map(p => this._renderSimFilaPartido(p, resultadosReales, gruposDisp.length > 1)).join('');
    }

    return `
      <aside class="sim-panel ${colapsadoCls}" id="tc-sim-panel">
        <div class="sim-panel-head">
          <div>
            <h3 class="sim-panel-titulo">${SIM_ICO.sliders} Próximos partidos</h3>
            <span class="sim-panel-sub">${pendientes.length} pendientes en esta vista</span>
          </div>
          <button class="sim-collapse-btn" type="button" id="btn-sim-colapsar">
            <span>${this.simColapsadoMovil ? 'Mostrar' : 'Ocultar'}</span> ${SIM_ICO.chevD}
          </button>
        </div>

        <div class="sim-filtros">
          ${opciones.length > 1 ? `
            <div class="sim-nav-jornada">
              <button class="sim-nav-btn" type="button" id="btn-sim-prev" ${idxActual <= 0 ? 'disabled' : ''} aria-label="Jornada anterior">${SIM_ICO.chevL}</button>
              <select class="sim-select" id="sel-sim-jornada" aria-label="Seleccionar jornada o fecha">
                ${opciones.map(o => `<option value="${U.esc(o.key)}" ${o.key === selKey ? 'selected' : ''}>${U.esc(o.label)}</option>`).join('')}
              </select>
              <button class="sim-nav-btn" type="button" id="btn-sim-next" ${idxActual >= opciones.length - 1 ? 'disabled' : ''} aria-label="Siguiente jornada">${SIM_ICO.chevR}</button>
            </div>
          ` : ''}

          ${gruposDisp.length > 1 ? `
            <div class="sim-grupos-pills" role="tablist" aria-label="Filtrar por grupo">
              <button class="sim-gpill ${grupoSel === 'todos' ? 'sim-activo' : ''}" type="button" data-sim-grupo="todos">Todos</button>
              ${gruposDisp.map(g => `<button class="sim-gpill ${grupoSel === g ? 'sim-activo' : ''}" type="button" data-sim-grupo="${U.esc(g)}">Grupo ${U.esc(g)}</button>`).join('')}
            </div>
          ` : ''}
        </div>

        <div class="sim-lista" id="tc-sim-lista">
          ${filasHtml}
        </div>
      </aside>
    `;
  },

  _renderVistaActiva(comp, resultadosEfectivos, resultadosReales) {
    if (comp === 'libertadores' || comp === 'sudamericana') {
      return this.subVistaCONMEBOL === 'cuadro'
        ? this.renderCuadroCONMEBOL(comp, resultadosEfectivos, resultadosReales)
        : this.renderGruposCONMEBOL(comp, resultadosEfectivos, resultadosReales);
    }
    if (comp === 'ucl') {
      return this.subVistaUCL === 'liga'
        ? this.renderTablaLiga(comp, resultadosEfectivos, resultadosReales)
        : this.renderCuadroUCL(resultadosEfectivos, resultadosReales);
    }
    if (comp === 'betplay' && this.subVistaBetPlay === 'cuadrangulares') {
      return this.renderCuadrangularesBetPlay(resultadosEfectivos, resultadosReales);
    }
    return this.renderTablaLiga(comp, resultadosEfectivos, resultadosReales);
  },

  _vincularEventosVista(raiz, resultadosReales, misPred) {
    if (!raiz) return;
    raiz.querySelectorAll('[data-equipo]').forEach(elem => {
      elem.onclick = (e) => {
        e.stopPropagation();
        const code = elem.dataset.equipo;
        if (code) EquiposInfo.abrir(code, resultadosReales, misPred);
      };
    });
    raiz.querySelectorAll('[data-ver-comp]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const cid = btn.dataset.verComp;
        if (cid) CompeticionesInfo.abrir(cid, resultadosReales);
      };
    });
  },

  /* Recalcula tablas, zonas y clasificados al instante sin parpadeo ni pérdida de foco/scroll */
  _recalcularEnVivo(contenedor) {
    if (!contenedor) return;
    const totalSim = Object.keys(this.simResultados).length;
    const txtConteo = `${totalSim} ${totalSim === 1 ? 'partido simulado' : 'partidos simulados'}`;

    const lblConteo = contenedor.querySelector('#tc-sim-conteo-txt');
    if (lblConteo) lblConteo.textContent = `Modo Simulador · ${txtConteo}`;

    const btnReset = contenedor.querySelector('#btn-sim-reset');
    if (btnReset) btnReset.disabled = totalSim === 0;

    const badgeToggle = contenedor.querySelector('#tc-sim-toggle-badge');
    if (badgeToggle) {
      badgeToggle.textContent = String(totalSim);
      badgeToggle.style.display = totalSim > 0 ? 'inline-flex' : 'none';
    }

    const vistaEl = contenedor.querySelector('#tc-vista-cuerpo');
    if (!vistaEl) return;

    const scrollTabla = vistaEl.querySelector('.tc-tabla-responsive')?.scrollLeft || 0;
    const scrollBracket = vistaEl.querySelector('.bracket-scroll-container')?.scrollLeft || 0;

    const resEf = this._fusionarResultados(this._ultimosResultados);
    vistaEl.innerHTML = this._renderVistaActiva(this.competicionActiva, resEf, this._ultimosResultados);

    if (scrollTabla > 0) {
      const nuevaTabla = vistaEl.querySelector('.tc-tabla-responsive');
      if (nuevaTabla) nuevaTabla.scrollLeft = scrollTabla;
    }
    if (scrollBracket > 0) {
      const nuevoBracket = vistaEl.querySelector('.bracket-scroll-container');
      if (nuevoBracket) nuevoBracket.scrollLeft = scrollBracket;
    }

    this._vincularEventosVista(vistaEl, this._ultimosResultados, this._ultimasPred);
  },

  _vincularEventosPanelSim(contenedor) {
    const slot = contenedor.querySelector('#tc-sim-panel-slot');
    if (!slot) return;

    const refrescarPanel = () => {
      slot.innerHTML = this._renderSimPanel(this.competicionActiva, this._ultimosResultados);
      this._vincularEventosPanelSim(contenedor);
    };

    const panel = slot.querySelector('#tc-sim-panel');
    if (panel) panel.addEventListener('click', e => e.stopPropagation());

    const btnColapsar = slot.querySelector('#btn-sim-colapsar');
    if (btnColapsar && panel) {
      btnColapsar.onclick = () => {
        this.simColapsadoMovil = !this.simColapsadoMovil;
        panel.classList.toggle('sim-panel--colapsado', this.simColapsadoMovil);
        const sp = btnColapsar.querySelector('span');
        if (sp) sp.textContent = this.simColapsadoMovil ? 'Mostrar' : 'Ocultar';
      };
    }

    const vKey = this._vistaKey(this.competicionActiva);
    const selJornada = slot.querySelector('#sel-sim-jornada');
    if (selJornada) {
      selJornada.onchange = () => {
        this.simFiltroJornada[vKey] = selJornada.value;
        refrescarPanel();
      };
      const btnPrev = slot.querySelector('#btn-sim-prev');
      const btnNext = slot.querySelector('#btn-sim-next');
      if (btnPrev) {
        btnPrev.onclick = () => {
          if (selJornada.selectedIndex > 0) {
            selJornada.selectedIndex -= 1;
            this.simFiltroJornada[vKey] = selJornada.value;
            refrescarPanel();
          }
        };
      }
      if (btnNext) {
        btnNext.onclick = () => {
          if (selJornada.selectedIndex < selJornada.options.length - 1) {
            selJornada.selectedIndex += 1;
            this.simFiltroJornada[vKey] = selJornada.value;
            refrescarPanel();
          }
        };
      }
    }

    slot.querySelectorAll('[data-sim-grupo]').forEach(btn => {
      btn.onclick = () => {
        this.simFiltroGrupo[vKey] = btn.dataset.simGrupo;
        refrescarPanel();
      };
    });

    slot.querySelectorAll('[data-sim-ir-sub]').forEach(btn => {
      btn.onclick = () => {
        const sub = btn.dataset.simIrSub;
        if (this.competicionActiva === 'betplay') this.subVistaBetPlay = sub;
        else if (this.competicionActiva === 'ucl') this.subVistaUCL = sub;
        else this.subVistaCONMEBOL = sub;
        this.render(contenedor, this._ultimosResultados, this._ultimasPred);
      };
    });

    const listaEl = slot.querySelector('#tc-sim-lista');
    if (listaEl) this._vincularInputsListaSim(listaEl, contenedor);
  },

  _vincularInputsListaSim(listaEl, contenedor) {
    const syncFila = (rowEl, activo) => {
      rowEl.classList.toggle('sim-row--activo', activo);
      const btnClr = rowEl.querySelector('.sim-clear');
      if (btnClr) btnClr.classList.toggle('sim-visible', activo);
    };

    listaEl.addEventListener('click', e => {
      const btnClr = e.target.closest('[data-sim-clear]');
      if (btnClr) {
        const pid = btnClr.dataset.simClear;
        delete this.simResultados[pid];
        const rowEl = btnClr.closest('.sim-row');
        if (rowEl) {
          const inL = rowEl.querySelector('[data-sim-in="l"]');
          const inV = rowEl.querySelector('[data-sim-in="v"]');
          if (inL) inL.value = '';
          if (inV) inV.value = '';
          syncFila(rowEl, false);
        }
        this._recalcularEnVivo(contenedor);
        return;
      }

      const btnStep = e.target.closest('[data-sim-step]');
      if (!btnStep) return;
      const rowEl = btnStep.closest('.sim-row');
      if (!rowEl) return;
      const pid = rowEl.dataset.simPid;
      const side = btnStep.dataset.simStep[0];
      const dir = btnStep.dataset.simStep[1] === '+' ? 1 : -1;

      let gl = 0, gv = 0;
      const actual = this.simResultados[pid];
      if (actual && actual.gl !== undefined && actual.gv !== undefined) {
        gl = Number(actual.gl);
        gv = Number(actual.gv);
      } else {
        const pObj = FIXTURE.partidos.find(x => x.id === pid);
        const rReal = pObj ? this._getResReal(pObj, this._ultimosResultados) : null;
        if (rReal && rReal.gl !== undefined && rReal.gv !== undefined && rReal.estado !== 'finalizado') {
          gl = Number(rReal.gl) || 0;
          gv = Number(rReal.gv) || 0;
        }
      }

      if (side === 'l') gl = Math.max(0, Math.min(20, gl + dir));
      else gv = Math.max(0, Math.min(20, gv + dir));

      this.simResultados[pid] = { gl, gv, estado: 'finalizado', _sim: true };
      const inL = rowEl.querySelector('[data-sim-in="l"]');
      const inV = rowEl.querySelector('[data-sim-in="v"]');
      if (inL) inL.value = String(gl);
      if (inV) inV.value = String(gv);
      syncFila(rowEl, true);
      this._recalcularEnVivo(contenedor);
    });

    listaEl.addEventListener('focusin', e => {
      if (e.target.matches('.sim-input')) e.target.select();
    });

    listaEl.addEventListener('input', e => {
      if (!e.target.matches('.sim-input')) return;
      const rowEl = e.target.closest('.sim-row');
      if (!rowEl) return;
      const pid = rowEl.dataset.simPid;
      const limpio = e.target.value.replace(/\D+/g, '').slice(0, 2);
      if (e.target.value !== limpio) e.target.value = limpio;

      const inL = rowEl.querySelector('[data-sim-in="l"]');
      const inV = rowEl.querySelector('[data-sim-in="v"]');
      if (!inL || !inV) return;

      if (inL.value === '' && inV.value === '') {
        delete this.simResultados[pid];
        syncFila(rowEl, false);
        this._recalcularEnVivo(contenedor);
        return;
      }

      if (e.target.value !== '') {
        const num = Math.min(20, Math.max(0, parseInt(e.target.value, 10)));
        e.target.value = String(num);
        const otro = e.target === inL ? inV : inL;
        if (otro.value === '') otro.value = '0';
        const gl = Math.min(20, Math.max(0, parseInt(inL.value, 10) || 0));
        const gv = Math.min(20, Math.max(0, parseInt(inV.value, 10) || 0));
        this.simResultados[pid] = { gl, gv, estado: 'finalizado', _sim: true };
        syncFila(rowEl, true);
        this._recalcularEnVivo(contenedor);
      }
    });

    listaEl.addEventListener('focusout', e => {
      if (!e.target.matches('.sim-input')) return;
      const rowEl = e.target.closest('.sim-row');
      if (!rowEl) return;
      const pid = rowEl.dataset.simPid;
      const inL = rowEl.querySelector('[data-sim-in="l"]');
      const inV = rowEl.querySelector('[data-sim-in="v"]');
      if (!inL || !inV) return;
      if ((inL.value === '' && inV.value !== '') || (inV.value === '' && inL.value !== '')) {
        if (inL.value === '') inL.value = '0';
        if (inV.value === '') inV.value = '0';
        const gl = Math.min(20, Math.max(0, parseInt(inL.value, 10) || 0));
        const gv = Math.min(20, Math.max(0, parseInt(inV.value, 10) || 0));
        this.simResultados[pid] = { gl, gv, estado: 'finalizado', _sim: true };
        syncFila(rowEl, true);
        this._recalcularEnVivo(contenedor);
      }
    });
  },

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

    this._ultimosResultados = resultados;
    this._ultimasPred = misPred;

    Object.keys(this.simResultados).forEach(pid => {
      if (resultados[pid] && resultados[pid].estado === 'finalizado') {
        delete this.simResultados[pid];
      }
    });

    if (this.simActivo && contenedor.querySelector('#tc-vista-cuerpo') && contenedor.contains(document.activeElement) && document.activeElement?.classList?.contains('sim-input')) {
      this._recalcularEnVivo(contenedor);
      return;
    }

    const comp = this.competicionActiva;
    const resEf = this._fusionarResultados(resultados);
    const totalSim = Object.keys(this.simResultados).length;

    let subvistaHtml = '';
    if (comp === 'libertadores' || comp === 'sudamericana') {
      subvistaHtml = `
        <div class="tc-subvista-barra">
          <button class="tc-sub-btn ${this.subVistaCONMEBOL === 'cuadro' ? 'activo' : ''}" data-sub="cuadro" type="button">🔥 Cuadro de Eliminatorias</button>
          <button class="tc-sub-btn ${this.subVistaCONMEBOL === 'grupos' ? 'activo' : ''}" data-sub="grupos" type="button">🗂 Fase de Grupos (A–H)</button>
        </div>`;
    } else if (comp === 'ucl') {
      subvistaHtml = `
        <div class="tc-subvista-barra">
          <button class="tc-sub-btn ${this.subVistaUCL === 'liga' ? 'activo' : ''}" data-sub="liga" type="button">📊 Fase de Liga (36 Clubes)</button>
          <button class="tc-sub-btn ${this.subVistaUCL === 'cuadro' ? 'activo' : ''}" data-sub="cuadro" type="button">⚡ Eliminatorias y Play-offs</button>
        </div>`;
    } else if (comp === 'betplay') {
      subvistaHtml = `
        <div class="tc-subvista-barra">
          <button class="tc-sub-btn ${this.subVistaBetPlay === 'cuadrangulares' ? 'activo' : ''}" data-sub="cuadrangulares" type="button">🔥 Cuadrangulares Semifinales</button>
          <button class="tc-sub-btn ${this.subVistaBetPlay === 'liga' ? 'activo' : ''}" data-sub="liga" type="button">📊 Todos contra Todos (Fechas 1–19)</button>
        </div>`;
    }

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

      <div class="sim-header-acciones">
        <div class="sim-subvista-slot">${subvistaHtml}</div>
        <button class="sim-toggle-btn ${this.simActivo ? 'sim-activo' : ''}" id="btn-toggle-simulador" type="button" aria-pressed="${this.simActivo ? 'true' : 'false'}">
          ${SIM_ICO.sliders}
          <span>Simulador "¿Qué pasa si...?"</span>
          <span class="sim-toggle-count" id="tc-sim-toggle-badge" style="display:${this.simActivo && totalSim > 0 ? 'inline-flex' : 'none'}">${totalSim}</span>
        </button>
      </div>
    `;

    if (this.simActivo) {
      html += this._renderSimStatusbar();
      html += `
        <div class="sim-workspace sim-workspace--activo">
          <div id="tc-sim-panel-slot">${this._renderSimPanel(comp, resultados)}</div>
          <div class="tc-contenido-vista sim-vista-wrap" id="tc-vista-cuerpo">${this._renderVistaActiva(comp, resEf, resultados)}</div>
        </div>`;
    } else {
      html += CompeticionesInfo.renderBanner(comp, false);
      html += `<div class="tc-contenido-vista" id="tc-vista-cuerpo">${this._renderVistaActiva(comp, resultados, resultados)}</div>`;
    }

    contenedor.innerHTML = html;

    // Vincular eventos de selección de competición
    contenedor.querySelectorAll('.tc-chip').forEach(btn => {
      btn.onclick = () => {
        this.competicionActiva = btn.dataset.comp;
        this.render(contenedor, this._ultimosResultados, this._ultimasPred);
      };
    });

    // Vincular eventos de subvista
    contenedor.querySelectorAll('.tc-sub-btn').forEach(btn => {
      btn.onclick = () => {
        const sub = btn.dataset.sub;
        if (this.competicionActiva === 'ucl') this.subVistaUCL = sub;
        else if (this.competicionActiva === 'betplay') this.subVistaBetPlay = sub;
        else this.subVistaCONMEBOL = sub;
        this.render(contenedor, this._ultimosResultados, this._ultimasPred);
      };
    });

    // Toggle principal del simulador "¿Qué pasa si...?"
    const btnToggleSim = contenedor.querySelector('#btn-toggle-simulador');
    if (btnToggleSim) {
      btnToggleSim.onclick = () => {
        this.simActivo = !this.simActivo;
        if (!this.simActivo) this.simResultados = {};
        this.render(contenedor, this._ultimosResultados, this._ultimasPred);
      };
    }

    if (this.simActivo) {
      const btnReset = contenedor.querySelector('#btn-sim-reset');
      if (btnReset) {
        btnReset.onclick = () => {
          this.simResultados = {};
          contenedor.querySelectorAll('#tc-sim-panel .sim-row').forEach(rowEl => {
            rowEl.classList.remove('sim-row--activo');
            rowEl.querySelectorAll('.sim-input').forEach(inp => { inp.value = ''; });
            rowEl.querySelector('.sim-clear')?.classList.remove('sim-visible');
          });
          this._recalcularEnVivo(contenedor);
        };
      }
      const btnSalir = contenedor.querySelector('#btn-sim-salir');
      if (btnSalir) {
        btnSalir.onclick = () => {
          this.simActivo = false;
          this.simResultados = {};
          this.render(contenedor, this._ultimosResultados, this._ultimasPred);
        };
      }
      this._vincularEventosPanelSim(contenedor);
    }

    this._vincularEventosVista(contenedor, resultados, misPred);
  },

  /* Renderiza tabla de posiciones estándar para ligas y UCL Fase de Liga */
  renderTablaLiga(comp, resultados, resultadosReales = resultados) {
    const faseFiltro = (comp === 'ucl' || comp === 'betplay') ? 'liga' : null;
    const filas = this.calcularTabla(comp, faseFiltro, null, resultados);
    const info = COMPETICIONES[comp] || {};

    const posRealMap = {};
    const pjRealMap = {};
    if (this.simActivo) {
      this.calcularTabla(comp, faseFiltro, null, resultadosReales).forEach(fr => {
        posRealMap[fr.code] = fr.pos;
        pjRealMap[fr.code] = fr.pj;
      });
    }

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
                const delta = this.simActivo ? ((posRealMap[f.code] || f.pos) - f.pos) : 0;
                const modSim = this.simActivo && pjRealMap[f.code] !== undefined && f.pj !== pjRealMap[f.code];
                const posCellHtml = this.simActivo
                  ? `<td class="tc-pos-num sim-pos-cell"><span class="sim-pos-wrap"><span>${f.pos}</span>${this._renderDeltaPos(delta)}</span></td>`
                  : `<td class="tc-pos-num">${f.pos}</td>`;

                return `
                  <tr class="${zonaCls}">
                    ${posCellHtml}
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
                    <td class="tc-pts-val ${modSim ? 'sim-pts-mod' : ''}">${f.pts}</td>
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
  renderCuadrangularesBetPlay(resultados, resultadosReales = resultados) {
    const getRes = (p) => resultados[p.id] || p.resultado || FIXTURE.resultadosIniciales[p.id];
    const tablaRegular = this.calcularTabla('betplay', 'liga', null, resultados);
    const posRegular = {};
    tablaRegular.forEach(f => { posRegular[f.code] = f.pos; });

    const posRegularReal = {};
    if (this.simActivo) {
      this.calcularTabla('betplay', 'liga', null, resultadosReales).forEach(fr => {
        posRegularReal[fr.code] = fr.pos;
      });
    }

    const ordenarCuad = (g, resObj, posRegObj) => this.calcularTabla('betplay', 'cuadrangulares', g, resObj)
      .sort((a, b) => (b.pts - a.pts) || (b.dg - a.dg) || (b.gf - a.gf) || ((posRegObj[a.code] || 99) - (posRegObj[b.code] || 99)))
      .map((f, i) => ({ ...f, pos: i + 1 }));

    const filasPorGrupo = {
      A: ordenarCuad('A', resultados, posRegular),
      B: ordenarCuad('B', resultados, posRegular)
    };
    const realPorGrupo = this.simActivo ? {
      A: ordenarCuad('A', resultadosReales, posRegularReal),
      B: ordenarCuad('B', resultadosReales, posRegularReal)
    } : {};

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
      const filas = filasPorGrupo[g] || [];
      const posRealG = {};
      const pjRealG = {};
      if (this.simActivo && realPorGrupo[g]) {
        realPorGrupo[g].forEach(fr => {
          posRealG[fr.code] = fr.pos;
          pjRealG[fr.code] = fr.pj;
        });
      }
      const jugados = partidosCua.filter(p => p.grupo === g && getRes(p)?.estado === 'finalizado').length;
      const partidosG = partidosCua.filter(p => p.grupo === g).sort((a, b) => (a.utc || '').localeCompare(b.utc || ''));

      return `
        <div class="panel grupo-card cua-card">
          <div class="grupo-header">
            <h3 style="margin:0;font-size:15px;color:var(--dorado);display:flex;align-items:center;gap:8px;">
              <span class="cua-grupo-pill">${g}</span> CUADRANGULAR ${g}
            </h3>
            <span class="cua-conteo">${jugados}/12 ${this.simActivo ? 'computados' : 'jugados'}</span>
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
                  const delta = this.simActivo ? ((posRealG[f.code] || f.pos) - f.pos) : 0;
                  const modSim = this.simActivo && pjRealG[f.code] !== undefined && f.pj !== pjRealG[f.code];
                  const tagAvanza = idx === 0
                    ? (this.simActivo
                        ? '<span class="sim-badge-finalista" title="Clasificando a la Gran Final">Final</span>'
                        : '<span class="badge-avanza" title="Clasificaría a la Gran Final">✓</span>')
                    : '';
                  return `
                  <tr class="${idx === 0 ? 'clasifica' : ''}">
                    <td>
                      <div class="td-equipo cua-td-equipo" data-equipo="${f.code}" title="Ver perfil de ${U.esc(f.nombre)}">
                        ${this.simActivo ? `<span class="sim-pos-num-inline">${f.pos}</span>${this._renderDeltaPos(delta)}` : ''}
                        ${f.escudo}
                        <span class="cua-club-nom">${U.esc(f.nombre)}</span>
                        <span class="cua-pos-tag">${posRegular[f.code] || '-'}º</span>
                        ${tieneVentaja ? '<span class="cua-ventaja-star" title="Cabeza de serie · Punto invisible (ventaja deportiva)">★</span>' : ''}
                        ${tagAvanza}
                      </div>
                    </td>
                    <td>${f.pj}</td><td>${f.pg}</td><td>${f.pe}</td><td>${f.pp}</td>
                    <td class="cua-dg">${f.dg > 0 ? '+' + f.dg : f.dg}</td>
                    <td class="cua-pts ${modSim ? 'sim-pts-mod' : ''}">${f.pts}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
          <div class="cua-partidos-lista">
            ${partidosG.map(p => {
              const r = getRes(p);
              const fin = r?.estado === 'finalizado';
              const esSim = Boolean(r?._sim);
              const L = FIXTURE.equipo(p.local), V = FIXTURE.equipo(p.visitante);
              const fechaN = p.jornada - 19;
              return `
                <div class="cua-match-row">
                  <span class="cua-f-badge">F${fechaN}</span>
                  <div class="cua-team cua-team--l" data-equipo="${p.local}" title="Ver perfil de ${U.esc(L.n)}">
                    <span class="cua-team-txt">${U.esc(L.n)}</span>
                    ${L.b}
                  </div>
                  <span class="cua-score-pill ${fin ? 'cua-score-pill--fin' : ''} ${esSim ? 'sim-pill-score' : ''}">${fin ? `${r.gl} - ${r.gv}` : 'vs'}</span>
                  <div class="cua-team cua-team--v" data-equipo="${p.visitante}" title="Ver perfil de ${U.esc(V.n)}">
                    ${V.b}
                    <span class="cua-team-txt">${U.esc(V.n)}</span>
                  </div>
                  <span class="cua-fecha-tag ${esSim ? 'sim-tag-estado' : ''}">${esSim ? 'Simulado' : (fin ? 'Final' : U.esc(fechaCorta(p)))}</span>
                </div>`;
            }).join('')}
          </div>
        </div>`;
    };

    const liderA = filasPorGrupo.A[0] || null;
    const liderB = filasPorGrupo.B[0] || null;

    const metaFinalista = (filas) => {
      const f1 = filas[0], f2 = filas[1];
      if (!f1) return '';
      const dgTxt = f1.dg > 0 ? `+${f1.dg}` : String(f1.dg);
      const esCabeza = posRegular[f1.code] === 1 || posRegular[f1.code] === 2;
      if (f2 && f1.pts === f2.pts) {
        if (f1.dg !== f2.dg) return `${f1.pts} pts · Desempate DG (${dgTxt})`;
        if (f1.gf !== f2.gf) return `${f1.pts} pts · Desempate GF (${f1.gf})`;
        return esCabeza ? `${f1.pts} pts · ★ Punto invisible` : `${f1.pts} pts · Pos. Liga (${posRegular[f1.code]}º)`;
      }
      return `${f1.pts} pts · DG ${dgTxt}${esCabeza ? ' · ★ Cabeza de serie' : ''}`;
    };

    const bannerProyeccionFinal = (this.simActivo && liderA && liderB) ? `
      <div class="sim-final-banner">
        <div class="sim-final-kicker">
          <span style="display:inline-flex;align-items:center;gap:6px">${SIM_ICO.trophy} Clasificados a la Gran Final (Simulación)</span>
          <span class="sim-final-kicker-sub">1.º Grupo A vs 1.º Grupo B</span>
        </div>
        <div class="sim-final-duelo">
          <div class="sim-final-club" data-equipo="${liderA.code}" title="Ver perfil de ${U.esc(liderA.nombre)}">
            ${liderA.escudo}
            <div class="sim-final-info">
              <span class="sim-final-grupo">Grupo A · Clasificado</span>
              <span class="sim-final-nom">${U.esc(liderA.nombre)}</span>
              <span class="sim-final-meta">${metaFinalista(filasPorGrupo.A)}</span>
            </div>
          </div>
          <span class="sim-final-vs">VS</span>
          <div class="sim-final-club sim-final-club--b" data-equipo="${liderB.code}" title="Ver perfil de ${U.esc(liderB.nombre)}">
            ${liderB.escudo}
            <div class="sim-final-info">
              <span class="sim-final-grupo">Grupo B · Clasificado</span>
              <span class="sim-final-nom">${U.esc(liderB.nombre)}</span>
              <span class="sim-final-meta">${metaFinalista(filasPorGrupo.B)}</span>
            </div>
          </div>
        </div>
      </div>` : '';

    const finalHtml = finales.map((p, idxF) => {
      if (this.simActivo && liderA && liderB) {
        const etL = String(p.etiqL || '');
        let eqL = idxF === 0 ? liderA : liderB;
        let eqV = idxF === 0 ? liderB : liderA;
        if (etL.includes('Grupo B') || etL.includes('Cuadrangular B')) { eqL = liderB; eqV = liderA; }
        else if (etL.includes('Grupo A') || etL.includes('Cuadrangular A')) { eqL = liderA; eqV = liderB; }
        return `
          <div class="bracket-card bracket-card--gran-final cua-final-card">
            <div class="bracket-card-header">
              <span class="bc-etapa">${U.esc(p.etapa.replace('Liga BetPlay · ', ''))}</span>
              <span class="bc-status trofeo">Proyección · ${U.esc(p.fechaStr || p.fecha)}</span>
            </div>
            <div class="bracket-team-row" data-equipo="${eqL.code}">${eqL.escudo}<span class="bc-team-name" style="color:var(--tinta)">${U.esc(eqL.nombre)}</span><span class="bc-score">-</span></div>
            <div class="bracket-team-row" data-equipo="${eqV.code}">${eqV.escudo}<span class="bc-team-name" style="color:var(--tinta)">${U.esc(eqV.nombre)}</span><span class="bc-score">-</span></div>
          </div>`;
      }
      return `
      <div class="bracket-card bracket-card--gran-final cua-final-card">
        <div class="bracket-card-header">
          <span class="bc-etapa">${U.esc(p.etapa.replace('Liga BetPlay · ', ''))}</span>
          <span class="bc-status trofeo">${U.esc(p.fechaStr || p.fecha)}</span>
        </div>
        <div class="bracket-team-row"><span class="escudo-placeholder">🥇</span><span class="bc-team-name" style="color:var(--tinta)">${U.esc(p.etiqL || 'Por definir')}</span><span class="bc-score">-</span></div>
        <div class="bracket-team-row"><span class="escudo-placeholder">🥈</span><span class="bc-team-name" style="color:var(--tinta)">${U.esc(p.etiqV || 'Por definir')}</span><span class="bc-score">-</span></div>
      </div>`;
    }).join('');

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
        ${bannerProyeccionFinal}
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
  renderGruposCONMEBOL(comp, resultados, resultadosReales = resultados) {
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
            const posRealG = {};
            const pjRealG = {};
            if (this.simActivo) {
              this.calcularTabla(comp, 'grupos', g, resultadosReales).forEach(fr => {
                posRealG[fr.code] = fr.pos;
                pjRealG[fr.code] = fr.pj;
              });
            }
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
                      const delta = this.simActivo ? ((posRealG[f.code] || f.pos) - f.pos) : 0;
                      const modSim = this.simActivo && pjRealG[f.code] !== undefined && f.pj !== pjRealG[f.code];
                      return `
                        <tr class="${clsRow}">
                          <td>
                            <div class="td-equipo" data-equipo="${f.code}" title="Ver perfil de ${U.esc(f.nombre)}">
                              ${this.simActivo ? `<span class="sim-pos-num-inline">${f.pos}</span>${this._renderDeltaPos(delta)}` : ''}
                              ${f.escudo}
                              <span class="td-nombre">${U.esc(f.nombre)}</span>
                              ${badgeTag}
                            </div>
                          </td>
                          <td>${f.pj}</td><td>${f.pg}</td><td>${f.pe}</td><td>${f.pp}</td>
                          <td style="font-family:var(--fuente-marcador);font-size:12px">${dgStr}</td>
                          <td class="${modSim ? 'sim-pts-mod' : ''}" style="font-family:var(--fuente-marcador);font-weight:700;color:var(--dorado)">${f.pts}</td>
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
    const esSimSerie = Boolean(resIda?._sim || resVta?._sim);
    let statusTexto = 'PROGRAMADO';
    let statusCls = 'futuro';
    if (vtaJugada) {
      statusTexto = esSimSerie ? 'SIMULADO' : `FINAL${pen ? ` (Pen ${pen})` : ''}`;
      statusCls = 'final';
    } else if (idaJugada) {
      statusTexto = `${esSimSerie ? 'Sim. ' : ''}Ida: ${g1Ida}-${g2Ida}`;
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
                    <span class="bc-status ${finalJugada ? 'final' : 'trofeo'}">${finalJugada ? (resFinal._sim ? 'SIMULADO' : `FINAL${resFinal.pen ? ` (Pen ${resFinal.pen})` : ''}`) : finalTrofeo}</span>
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
      const esSim = Boolean(res?._sim);
      return `
        <div class="panel tc-card-match">
          <div class="tc-cm-header">
            <span>${U.esc(p.etapa)}</span>
            <span class="bc-status ${esFinal ? 'final' : 'futuro'}">${esSim ? 'SIMULADO' : (esFinal ? 'FINAL' : U.esc(p.fechaStr || p.fecha || 'Programado'))}</span>
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

