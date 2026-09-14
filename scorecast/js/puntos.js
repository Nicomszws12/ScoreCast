/* ============================================================
   SCORECAST — MOTOR DE PUNTUACIÓN
   ------------------------------------------------------------
   Reglas (CONFIG.REGLAS):
     Fase de grupos      → exacto 3 pts · acertar 1X2 1 pt
     Eliminatorias       → exacto 5 pts · acertar 1X2 2 pts
     Bono campeón        → 10 pts (elegido antes del 1.er partido)
   Desempates: 1) puntos  2) exactos  3) aciertos de resultado
               4) quien se registró primero.
   ============================================================ */

import { CONFIG } from './config.js';
import { FIXTURE } from './fixture.js';

const Puntos = {

  /* Aplica los ajustes del admin (hora real, sede, equipos de
     eliminatorias) sobre un partido del fixture. */
  conAjustes(p, ajustes) {
    if (!p) return null;
    const a = (ajustes || {})[p.id];
    return a ? { ...p, ...a, horaOk: a.utc ? true : p.horaOk } : p;
  },

  signo(gl, gv) { return gl > gv ? 'L' : gl < gv ? 'V' : 'E'; },

  /* Califica un pronóstico contra un resultado FINALIZADO. */
  calificar(pred, res, fase) {
    if (!pred || !res || res.estado !== 'finalizado') return { pts: 0, tipo: null };
    const configRef = (typeof CONFIG !== 'undefined' && CONFIG.REGLAS) 
      ? CONFIG.REGLAS 
      : (globalThis.CONFIG?.REGLAS || { grupos: { exacto: 3, resultado: 1 }, eliminatorias: { exacto: 5, resultado: 2 } });
    const esKO = fase === 'eliminatorias' || fase === 'eliminatoria' || fase === 'playoff';
    const r = configRef[esKO ? 'eliminatorias' : 'grupos'];
    const pGl = Number(pred.gl);
    const pGv = Number(pred.gv);
    const rGl = Number(res.gl);
    const rGv = Number(res.gv);
    if (pGl === rGl && pGv === rGv) return { pts: r.exacto, tipo: 'exacto' };
    if (this.signo(pGl, pGv) === this.signo(rGl, rGv)) return { pts: r.resultado, tipo: 'resultado' };
    return { pts: 0, tipo: 'fallo' };
  },

  /* Campeón del torneo (si la final ya terminó). */
  campeon(resultados, ajustes) {
    const fixtureRef = typeof FIXTURE !== 'undefined' ? FIXTURE : globalThis.FIXTURE;
    if (!fixtureRef) return null;
    const finalPart = fixtureRef.porId('ko-104') || fixtureRef.porId('ucl-final') || fixtureRef.porId('lib-final');
    if (!finalPart) return null;
    const final = this.conAjustes(finalPart, ajustes);
    const res = (resultados || {})[finalPart.id];
    if (!res || res.estado !== 'finalizado' || !final || !final.local || !final.visitante) return null;
    if (res.gl === res.gv) return res.ganadorPenales || null;
    return res.gl > res.gv ? final.local : final.visitante;
  },

  /* Mapa de campeones oficiales por competición (definidos por admin o finales concluidas) */
  campeonesReales(resultados, ajustes) {
    const reales = {};
    const cfg = (ajustes && (ajustes.CAMPEONES || ajustes.GLOBAL?.campeonesConfig)) || {};
    for (const [comp, c] of Object.entries(cfg)) {
      if (c && c.campeonOficial) reales[comp] = c.campeonOficial;
    }
    const single = this.campeon(resultados, ajustes);
    if (single) {
      const fixtureRef = typeof FIXTURE !== 'undefined' ? FIXTURE : globalThis.FIXTURE;
      const eq = fixtureRef ? fixtureRef.equipo(single) : null;
      const comp = eq?.comp || 'libertadores';
      if (!reales[comp]) reales[comp] = single;
    }
    return reales;
  },

  /* Tabla de posiciones de la polla.
     puntosManuales: array de { uid, pid, pts, razon } que se suman al total. */
  tabla(usuarios, todasPred, resultados, ajustes, puntosManuales) {
    const fixtureRef = typeof FIXTURE !== 'undefined' ? FIXTURE : globalThis.FIXTURE;
    const configRef = typeof CONFIG !== 'undefined' ? CONFIG : globalThis.CONFIG;
    const campeonesDefinidos = this.campeonesReales(resultados, ajustes);
    const bonusPorTorneo = (configRef && configRef.REGLAS && configRef.REGLAS.bonusCampeon) || 10;
    const manualPorUid = {};
    (puntosManuales || []).forEach(pm => {
      manualPorUid[pm.uid] = (manualPorUid[pm.uid] || 0) + (Number(pm.pts) || 0);
    });
    const partidos = (fixtureRef && fixtureRef.partidos) ? fixtureRef.partidos : [];
    const resMap = resultados || {};

    const filas = (usuarios || [])
      .filter(u => u.estado === 'activo')
      .map(u => {
        const preds = (todasPred || {})[u.uid] || {};
        let pts = 0, exactos = 0, aciertos = 0, jugadas = 0;
        partidos.forEach(p => {
          const res = resMap[p.id] || p.resultado;
          const pr = preds[p.id];
          if (pr) jugadas++;
          const c = this.calificar(pr, res, p.fase);
          pts += c.pts;
          if (c.tipo === 'exacto') exactos++;
          if (c.tipo === 'resultado') aciertos++;
        });

        // Bonos de campeones por torneo
        let bono = 0;
        const uCamps = u.campeones || (u.campeon ? { betplay: u.campeon } : {});
        for (const [comp, eqReal] of Object.entries(campeonesDefinidos)) {
          if (uCamps[comp] === eqReal || u.campeon === eqReal) {
            bono += bonusPorTorneo;
          }
        }
        pts += bono;

        // Sumar puntos manuales (ajustes del admin)
        const ptsManual = manualPorUid[u.uid] || 0;
        pts += ptsManual;

        // Racha: partidos finalizados consecutivos (más reciente primero) con pts > 0
        const finalizados = partidos
          .filter(p => p.local && p.visitante && (resMap[p.id]?.estado === 'finalizado' || p.resultado?.estado === 'finalizado'))
          .sort((a, b) => (b.utc || b.fecha + 'Z').localeCompare(a.utc || a.fecha + 'Z'));
        let racha = 0;
        for (const p of finalizados) {
          const pr = preds[p.id];
          if (!pr) break;
          const res = resMap[p.id] || p.resultado;
          const c = this.calificar(pr, res, p.fase);
          if (c.pts > 0) racha++; else break;
        }

        return {
          uid: u.uid, nombre: u.nombre,
          moneda: u.moneda, pagado: !!u.pagado, campeon: u.campeon,
          campeones: u.campeones || (u.campeon ? { betplay: u.campeon } : {}),
          pts, exactos, aciertos, jugadas, bono, racha, creado: u.creado || 0
        };
      })
      .sort((a, b) =>
        b.pts - a.pts || b.exactos - a.exactos || b.aciertos - a.aciertos || a.creado - b.creado
      );
    filas.forEach((f, i) => f.pos = i + 1);
    return filas;
  },

  /* Tablas de los grupos con los partidos finalizados. */
  gruposMundial(resultados) {
    const fixtureRef = typeof FIXTURE !== 'undefined' ? FIXTURE : globalThis.FIXTURE;
    if (!fixtureRef) return {};
    const tablas = {};
    const resMap = resultados || {};
    Object.entries(fixtureRef.grupos || {}).forEach(([g, codes]) => {
      const f = {};
      codes.forEach(c => f[c] = { code: c, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0 });
      fixtureRef.partidos.filter(p => p.fase === 'grupos' && p.grupo === g).forEach(p => {
        const r = resMap[p.id] || p.resultado;
        if (!r || r.estado !== 'finalizado') return;
        const L = f[p.local], V = f[p.visitante];
        if (!L || !V) return;
        L.pj++; V.pj++; L.gf += r.gl; L.gc += r.gv; V.gf += r.gv; V.gc += r.gl;
        if (r.gl > r.gv) { L.pg++; V.pp++; }
        else if (r.gl < r.gv) { V.pg++; L.pp++; }
        else { L.pe++; V.pe++; }
      });
      tablas[g] = Object.values(f)
        .map(t => ({ ...t, dg: t.gf - t.gc, pts: t.pg * 3 + t.pe }))
        .sort((a, b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf || a.code.localeCompare(b.code));
    });
    return tablas;
  },

  /* Bote y reparto por moneda (para la página de cuentas). */
  bote(usuarios, salaConfig) {
    const configRef = typeof CONFIG !== 'undefined' ? CONFIG : globalThis.CONFIG;
    const porMoneda = {};
    if (salaConfig && salaConfig.cuota > 0) {
      // Sala privada con cuota específica
      const m = porMoneda[salaConfig.moneda] = { total: 0, pagado: 0, personas: 0, alDia: 0 };
      const cuota = salaConfig.cuota;
      (usuarios || []).filter(u => u.estado === 'activo').forEach(u => {
        m.personas++;
        m.total += cuota;
        if (u.pagado) {
          m.pagado += cuota;
          m.alDia++;
        }
      });
    } else {
      // Sala principal, usa cuotas globales por moneda de usuario
      (usuarios || []).filter(u => u.estado === 'activo').forEach(u => {
        const m = porMoneda[u.moneda] = porMoneda[u.moneda] || { total: 0, pagado: 0, personas: 0, alDia: 0 };
        const cuota = (configRef?.CUOTAS?.[u.moneda] || { valor: 0 }).valor;
        m.personas++; m.total += cuota;
        if (u.pagado) { m.pagado += cuota; m.alDia++; }
      });
    }
    return porMoneda;
  }
};

if (typeof window !== 'undefined') window.Puntos = Puntos;
if (typeof globalThis !== 'undefined') globalThis.Puntos = Puntos;
export { Puntos };
export default Puntos;

