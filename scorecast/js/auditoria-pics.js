/* ============================================================
   SCORECAST — SALUD, TELEMETRÍA Y AUDITORÍA TÉCNICA (PICS)
   ------------------------------------------------------------
   Módulo de sustentación académica (Proyecto Integrador PICS — ETITC):
   • Telemetría en vivo (PWA/SW/Caché, Latencia RTT Backend,
     Volumen real en Firestore/Local y Cuota API-Football en 0 req).
   • Suite de validación funcional y de seguridad 100% en memoria
     (NO destructiva, 0 escrituras en base de datos).
   • Exportación de evidencia técnica (Portapapeles y JSON).
   ============================================================ */

const ICO = {
  pulse: `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`,
  refresh: `<svg class="ico ico--sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>`,
  play: `<svg class="ico ico--sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="6 3 20 12 6 21 6 3"/></svg>`,
  copy: `<svg class="ico ico--sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
  download: `<svg class="ico ico--sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  pwa: `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>`,
  cloud: `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>`,
  db: `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/></svg>`,
  radio: `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49"/><path d="M7.76 16.24a6 6 0 0 1 0-8.49"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M4.93 19.07a10 10 0 0 1 0-14.14"/></svg>`,
  shield: `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>`,
  check: `<svg class="ico ico--sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`,
  alert: `<svg class="ico ico--sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
};

function _deps(custom = {}) {
  const g = typeof window !== 'undefined' ? window : globalThis;
  return {
    Store: custom.Store || g.Store,
    CONFIG: custom.CONFIG || g.CONFIG || {},
    FIXTURE: custom.FIXTURE || g.FIXTURE || { equipos: {}, partidos: [] },
    Puntos: custom.Puntos || g.Puntos,
    U: custom.U || g.U,
    ApiFutbol: custom.ApiFutbol || g.ApiFutbol
  };
}

function _esc(s, U) {
  if (U && typeof U.esc === 'function') return U.esc(s);
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const AuditoriaPICS = {
  _estado: {
    telemetria: null,
    suite: null,
    generadoEn: null
  },

  /* 1. TELEMETRÍA EN VIVO (lectura liviana, 0 escrituras, 0 req de cuota API) */
  async recolectarTelemetria(customDeps = {}) {
    const { Store, CONFIG, FIXTURE, Puntos, U, ApiFutbol } = _deps(customDeps);

    let swEstado = 'No soportado';
    let swActivo = false;
    try {
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        const ctrl = !!navigator.serviceWorker.controller;
        if (ctrl) {
          swEstado = 'Activo y controlando';
          swActivo = true;
        } else if (regs.length > 0) {
          const r = regs[0];
          swEstado = r.active ? 'Registrado (activo)' : r.installing ? 'Instalando' : 'Registrado';
          swActivo = !!r.active;
        } else {
          swEstado = 'Sin registrar';
        }
      }
    } catch {
      swEstado = 'Restringido';
    }
    let cacheVersion = 'Sin caché';
    let cacheItems = 0;
    try {
      if (typeof caches !== 'undefined') {
        const keys = await caches.keys();
        if (keys.length > 0) {
          cacheVersion = keys[keys.length - 1];
          const cacheObj = await caches.open(cacheVersion);
          const reqs = await cacheObj.keys();
          cacheItems = reqs.length;
        }
      }
    } catch { /* sin CacheStorage */ }

    const online = typeof navigator !== 'undefined' ? navigator.onLine !== false : true;
    const esStandalone = typeof window !== 'undefined' && (
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
      window.navigator?.standalone === true
    );
    const modoPwa = esStandalone ? 'PWA Instalada' : 'Navegador';

    const esFirebase = !(Store?.esDemo) && CONFIG.MODO === 'firebase';
    const modoBackend = esFirebase ? 'Cloud Firestore' : 'Demo Local';
    let latenciaMs = 0;
    let lecturaOk = true;
    try {
      const t0 = performance.now();
      if (Store && typeof Store.tablaPublicada === 'function') {
        await Store.tablaPublicada();
      }
      latenciaMs = Math.max(1, Math.round(performance.now() - t0));
    } catch {
      lecturaOk = false;
    }

    const nivelLatencia = !lecturaOk
      ? { nivel: 'alta', etiqueta: 'Error de lectura' }
      : latenciaMs < 250
        ? { nivel: 'optima', etiqueta: 'Óptima (< 250 ms)' }
        : latenciaMs <= 700
          ? { nivel: 'normal', etiqueta: 'Normal (250–700 ms)' }
          : { nivel: 'alta', etiqueta: 'Alta (> 700 ms)' };

    const [usuarios, todasPred, resultados, ajustes, estadoApi] = await Promise.all([
      Store?.usuarios ? Store.usuarios().catch(() => []) : Promise.resolve([]),
      Store?.todasPredicciones ? Store.todasPredicciones().catch(() => ({})) : Promise.resolve({}),
      Store?.resultados ? Store.resultados().catch(() => ({})) : Promise.resolve({}),
      Store?.ajustes ? Store.ajustes().catch(() => ({})) : Promise.resolve({}),
      ApiFutbol?.verificarEstado ? ApiFutbol.verificarEstado().catch(e => ({ ok: false, error: e.message })) : Promise.resolve({ ok: false, mensaje: 'No disponible' })
    ]);

    const usuariosActivos = (usuarios || []).filter(u => u.estado === 'activo').length;
    const usuariosPendientes = (usuarios || []).filter(u => u.estado === 'pendiente').length;

    let totalPronosticos = 0;
    Object.values(todasPred || {}).forEach(mapaU => {
      totalPronosticos += Object.keys(mapaU || {}).length;
    });

    const partidos = FIXTURE?.partidos || [];
    let partFinalizados = 0, partEnVivo = 0, partProgramados = 0;
    let analisisIaPublicados = 0, conEventos = 0, conAlineaciones = 0;

    partidos.forEach(rawP => {
      const p = Puntos?.conAjustes ? Puntos.conAjustes(rawP, ajustes) : rawP;
      const r = (resultados || {})[p.id] || p.resultado || null;
      const est = U?.estadoPartido ? U.estadoPartido(p, r) : (r?.estado || 'programado');
      if (est === 'finalizado') partFinalizados++;
      else if (est === 'en_juego' || est === 'iniciando') partEnVivo++;
      else partProgramados++;
    });

    Object.values(resultados || {}).forEach(r => {
      if (!r || typeof r !== 'object') return;
      if (r.analisisIA && String(r.analisisIA).trim()) analisisIaPublicados++;
      if (Array.isArray(r.eventos) && r.eventos.length > 0) conEventos++;
      if ((r.alineaciones && (r.alineaciones.local?.titulares?.length || r.alineaciones.visitante?.titulares?.length)) ||
          (Array.isArray(r.alineacion) && r.alineacion.length >= 2)) {
        conAlineaciones++;
      }
    });

    const limiteDiario = Number(estadoApi?.limiteDiario ?? ApiFutbol?._estadoCuenta?.limiteDiario ?? 100) || 100;
    const peticionesHoy = estadoApi?.ok
      ? Number(estadoApi.peticionesHoy ?? 0)
      : Number(ApiFutbol?._estadoCuenta?.peticionesHoy ?? 0);
    const disponiblesHoy = Math.max(0, limiteDiario - peticionesHoy);

    const telemetria = {
      timestamp: new Date().toISOString(),
      pwa: { swEstado, swActivo, cacheVersion, cacheItems, online, modo: modoPwa },
      backend: {
        modo: modoBackend,
        esFirebase,
        latenciaMs,
        lecturaOk,
        semaforo: nivelLatencia.nivel,
        semaforoTexto: nivelLatencia.etiqueta
      },
      volumen: {
        usuariosTotal: (usuarios || []).length,
        usuariosActivos,
        usuariosPendientes,
        pronosticosTotal: totalPronosticos,
        partidosTotal: partidos.length,
        partidosFinalizados: partFinalizados,
        partidosEnVivo: partEnVivo,
        partidosProgramados: partProgramados,
        competicionesTotal: Object.keys(FIXTURE?.competiciones || {}).length || 7,
        analisisIaPublicados,
        partidosConEventos: conEventos,
        partidosConAlineaciones: conAlineaciones
      },
      api: {
        conectada: !!estadoApi?.ok,
        plan: estadoApi?.plan || ApiFutbol?._estadoCuenta?.plan || 'Free',
        usuario: estadoApi?.usuario || ApiFutbol?._estadoCuenta?.usuario || 'Cuenta configurada',
        peticionesHoy,
        limiteDiario,
        disponiblesHoy,
        mensaje: estadoApi?.error || estadoApi?.mensaje || ''
      }
    };

    this._estado.telemetria = telemetria;
    this._estado.generadoEn = telemetria.timestamp;
    return telemetria;
  },

  /* 2. SUITE DE PRUEBAS FUNCIONALES Y SEGURIDAD (100% en memoria, NO destructiva) */
  ejecutarSuiteValidacion(customDeps = {}) {
    const { FIXTURE, Puntos, U } = _deps(customDeps);
    const casos = [];
    const tGlobal0 = performance.now();

    const correrCaso = (id, nombre, fn) => {
      const t0 = performance.now();
      try {
        const res = fn();
        const durMs = Number((performance.now() - t0).toFixed(2));
        casos.push({
          id,
          nombre,
          ok: !!res.ok,
          estado: res.ok ? 'PASS' : 'FAIL',
          tiempoMs: durMs,
          detalle: res.detalle || ''
        });
      } catch (err) {
        const durMs = Number((performance.now() - t0).toFixed(2));
        casos.push({
          id,
          nombre,
          ok: false,
          estado: 'FAIL',
          tiempoMs: durMs,
          detalle: `Excepción: ${err.message || String(err)}`
        });
      }
    };

    // 1. Cierre estricto de pronósticos (U.estadoPartido)
    correrCaso(1, 'Cierre estricto de pronósticos (U.estadoPartido)', () => {
      const ahora = Date.now();
      const pFut = { id: '__t1', local: 'mfc', visitante: 'sfe', horaOk: true, utc: new Date(ahora + 2 * 3600000).toISOString() };
      const pPas = { id: '__t2', local: 'mfc', visitante: 'sfe', horaOk: true, utc: new Date(ahora - 15 * 60000).toISOString() };

      const eAntes = U.estadoPartido(pFut, null);
      const aAntes = U.abierto(pFut, null);
      const eDespues = U.estadoPartido(pPas, null);
      const aDespues = U.abierto(pPas, null);
      const eVivo = U.estadoPartido(pFut, { estado: 'en_juego', gl: 1, gv: 0 });
      const aVivo = U.abierto(pFut, { estado: 'en_juego', gl: 1, gv: 0 });
      const eFin = U.estadoPartido(pFut, { estado: 'finalizado', gl: 2, gv: 1 });
      const aFin = U.abierto(pFut, { estado: 'finalizado', gl: 2, gv: 1 });

      const ok =
        eAntes === 'programado' && aAntes === true &&
        eDespues === 'cerrado' && aDespues !== true &&
        eVivo === 'en_juego' && aVivo !== true &&
        eFin === 'finalizado' && aFin !== true;

      return {
        ok,
        detalle: `Pre-pitazo: ${eAntes} (abierto=${aAntes}) · Tras pitazo: ${eDespues} · Bloqueado en en_juego y finalizado`
      };
    });

    // 2. Motor de puntuación (Puntos.calificar)
    correrCaso(2, 'Motor de puntuación (Puntos.calificar)', () => {
      const r21 = { estado: 'finalizado', gl: 2, gv: 1 };
      const r31 = { estado: 'finalizado', gl: 3, gv: 1 };
      const r22 = { estado: 'finalizado', gl: 2, gv: 2 };

      const exLiga = Puntos.calificar({ gl: 2, gv: 1 }, r21, 'grupos');
      const resLiga = Puntos.calificar({ gl: 1, gv: 0 }, r31, 'grupos');
      const fallo = Puntos.calificar({ gl: 0, gv: 2 }, r21, 'grupos');
      const exKO = Puntos.calificar({ gl: 2, gv: 2 }, r22, 'eliminatorias');
      const resKO = Puntos.calificar({ gl: 3, gv: 0 }, r21, 'eliminatorias');

      const ok =
        exLiga.pts === 3 && exLiga.tipo === 'exacto' &&
        resLiga.pts === 1 && resLiga.tipo === 'resultado' &&
        fallo.pts === 0 && fallo.tipo === 'fallo' &&
        exKO.pts === 5 && exKO.tipo === 'exacto' &&
        resKO.pts === 2 && resKO.tipo === 'resultado';

      return {
        ok,
        detalle: `Liga/Grupos: exacto +${exLiga.pts}, 1X2 +${resLiga.pts}, fallo ${fallo.pts} · Eliminatoria: exacto +${exKO.pts}, 1X2 +${resKO.pts}`
      };
    });

    // 3. Desempates y bono campeón (Puntos.tabla)
    correrCaso(3, 'Desempates y bono campeón (Puntos.tabla)', () => {
      const base = (FIXTURE?.partidos || []).filter(p =>
        p.local && p.visitante &&
        p.fase !== 'eliminatorias' && p.fase !== 'eliminatoria' && p.fase !== 'playoff'
      ).slice(0, 3);

      if (base.length < 3) return { ok: false, detalle: 'Partidos base insuficientes en FIXTURE.' };
      const [p1, p2, p3] = base;
      const resMem = {
        [p1.id]: { estado: 'finalizado', gl: 2, gv: 0 },
        [p2.id]: { estado: 'finalizado', gl: 1, gv: 0 },
        [p3.id]: { estado: 'finalizado', gl: 3, gv: 1 }
      };
      const ajMem = { CAMPEONES: { betplay: { campeonOficial: 'mfc' } } };
      const usrs = [
        { uid: 'u4_tarde',  nombre: 'U4 Registro Tardío', estado: 'activo', moneda: 'COP', campeones: { betplay: 'sfe' }, creado: 5000 },
        { uid: 'u3_1x2',    nombre: 'U3 Tres 1X2',        estado: 'activo', moneda: 'COP', campeones: { betplay: 'sfe' }, creado: 1000 },
        { uid: 'u2_exacto', nombre: 'U2 Un Exacto',       estado: 'activo', moneda: 'COP', campeones: { betplay: 'sfe' }, creado: 9000 },
        { uid: 'u1_bono',   nombre: 'U1 Bono Campeón',    estado: 'activo', moneda: 'COP', campeones: { betplay: 'mfc' }, creado: 9500 }
      ];
      const preds = {
        u1_bono:   { [p1.id]: { uid: 'u1_bono',   pid: p1.id, gl: 2, gv: 0 } },
        u2_exacto: { [p1.id]: { uid: 'u2_exacto', pid: p1.id, gl: 2, gv: 0 } },
        u3_1x2:    { [p1.id]: { uid: 'u3_1x2', pid: p1.id, gl: 1, gv: 0 }, [p2.id]: { uid: 'u3_1x2', pid: p2.id, gl: 2, gv: 1 }, [p3.id]: { uid: 'u3_1x2', pid: p3.id, gl: 2, gv: 0 } },
        u4_tarde:  { [p1.id]: { uid: 'u4_tarde', pid: p1.id, gl: 1, gv: 0 }, [p2.id]: { uid: 'u4_tarde', pid: p2.id, gl: 2, gv: 1 }, [p3.id]: { uid: 'u4_tarde', pid: p3.id, gl: 2, gv: 0 } }
      };

      const tabla = Puntos.tabla(usrs, preds, resMem, ajMem, []);
      const ord = tabla.map(f => f.uid);
      const ok =
        ord[0] === 'u1_bono' && tabla[0].pts === 13 && tabla[0].bono === 10 &&
        ord[1] === 'u2_exacto' && tabla[1].pts === 3 && tabla[1].exactos === 1 &&
        ord[2] === 'u3_1x2' && tabla[2].pts === 3 && tabla[2].aciertos === 3 &&
        ord[3] === 'u4_tarde';

      return {
        ok,
        detalle: `1º ${ord[0]} (${tabla[0]?.pts} pts, bono +${tabla[0]?.bono}) > 2º ${ord[1]} (exactos) > 3º ${ord[2]} (1X2 + registro) > 4º ${ord[3]}`
      };
    });

    // 4. Sanitización XSS (U.esc)
    correrCaso(4, 'Sanitización XSS (U.esc)', () => {
      const vector = `<script>alert("xss")</script><img src=x onerror='hack()'>&`;
      const out = U.esc(vector);
      const esp = `&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;&lt;img src=x onerror=&#39;hack()&#39;&gt;&amp;`;
      const ok = !/[<>]/.test(out) && out === esp;
      return {
        ok,
        detalle: `Escapados <script>, etiquetas HTML, comillas (" / ') y ampersand sin residuos ejecutables`
      };
    });

    // 5. Integridad del Fixture
    correrCaso(5, 'Integridad del Fixture (IDs únicos y UTC ISO)', () => {
      const lista = FIXTURE?.partidos || [];
      const ids = new Set();
      let dup = 0, utcOk = 0, utcBad = 0;
      for (const p of lista) {
        if (!p?.id || ids.has(p.id)) dup++;
        else ids.add(p.id);
        if (p?.utc) {
          if (Number.isNaN(Date.parse(p.utc)) || !String(p.utc).includes('T')) utcBad++;
          else utcOk++;
        }
      }
      const ok = lista.length > 0 && dup === 0 && utcBad === 0;
      return {
        ok,
        detalle: `${lista.length} partidos verificados · ${dup} IDs duplicados · ${utcOk} fechas UTC ISO válidas (${utcBad} inválidas)`
      };
    });

    const totalMs = Number((performance.now() - tGlobal0).toFixed(2));
    const aprobados = casos.filter(c => c.ok).length;
    const suite = {
      ejecutadoEn: new Date().toISOString(),
      totalCasos: casos.length,
      aprobados,
      fallidos: casos.length - aprobados,
      tiempoTotalMs: totalMs,
      ok: aprobados === casos.length,
      casos
    };

    this._estado.suite = suite;
    return suite;
  },

  /* 3. EXPORTACIÓN PARA EVIDENCIA ACADÉMICA (PICS — ETITC) */
  generarReporteTexto(estado = this._estado) {
    const t = estado?.telemetria;
    const s = estado?.suite;
    const fecha = new Date().toLocaleString('es-CO');
    const lineas = [
      '============================================================',
      'SCORECAST — REPORTE TÉCNICO DE SALUD, TELEMETRÍA Y AUDITORÍA',
      'Proyecto Integrador (PICS) — Escuela Tecnológica Instituto Técnico Central (ETITC)',
      'Autores: Nicolás Nieto Daza, Alejandro Rodríguez Rubio,',
      '         Angie Marcela Pinzón Moncada y Catalina Alarcón Medina',
      `Generado: ${fecha}`,
      '============================================================',
      ''
    ];

    if (t) {
      lineas.push('[1] TELEMETRÍA EN VIVO');
      lineas.push(`- PWA / Service Worker : ${t.pwa.swEstado} | Caché: ${t.pwa.cacheVersion} (${t.pwa.cacheItems} recursos) | Modo: ${t.pwa.modo} | Red: ${t.pwa.online ? 'En línea' : 'Sin conexión'}`);
      lineas.push(`- Backend / Latencia   : ${t.backend.modo} | RTT: ${t.backend.latenciaMs} ms (${t.backend.semaforoTexto})`);
      lineas.push(`- Volumen de Datos     : ${t.volumen.usuariosTotal} usuarios (${t.volumen.usuariosActivos} activos / ${t.volumen.usuariosPendientes} pend.) | ${t.volumen.pronosticosTotal} pronósticos`);
      lineas.push(`- Partidos y Contenidos: ${t.volumen.partidosTotal} partidos (${t.volumen.partidosFinalizados} fin / ${t.volumen.partidosEnVivo} vivo / ${t.volumen.partidosProgramados} prog) | ${t.volumen.analisisIaPublicados} análisis IA | ${t.volumen.partidosConEventos} con eventos | ${t.volumen.partidosConAlineaciones} con XI`);
      lineas.push(`- Cuota API-Football   : Plan ${t.api.plan} | Usadas hoy: ${t.api.peticionesHoy}/${t.api.limiteDiario} | Disponibles: ${t.api.disponiblesHoy}`);
      lineas.push('');
    }

    if (s) {
      lineas.push(`[2] SUITE DE VALIDACIÓN FUNCIONAL Y SEGURIDAD (${s.aprobados}/${s.totalCasos} PASS — ${s.tiempoTotalMs} ms)`);
      s.casos.forEach(c => {
        lineas.push(`- [${c.estado}] #${c.id} ${c.nombre} (${c.tiempoMs} ms) -> ${c.detalle}`);
      });
    } else {
      lineas.push('[2] SUITE DE VALIDACIÓN: Pendiente de ejecución en esta sesión.');
    }

    lineas.push('============================================================');
    return lineas.join('\n');
  },

  descargarReporteJSON(estado = this._estado) {
    const payload = {
      proyecto: 'ScoreCast — Proyecto Integrador PICS (ETITC)',
      autores: [
        'Nicolás Nieto Daza',
        'Alejandro Rodríguez Rubio',
        'Angie Marcela Pinzón Moncada',
        'Catalina Alarcón Medina'
      ],
      generadoEn: new Date().toISOString(),
      telemetria: estado?.telemetria || null,
      suiteValidacion: estado?.suite || null
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const hoy = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `scorecast-auditoria-pics-${hoy}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  },

  /* 4. RENDERIZADO INTERACTIVO EN PANEL DE ADMINISTRACIÓN */
  async render(contenedor, customDeps = {}) {
    if (!contenedor) return;
    const deps = _deps(customDeps);
    const { U } = deps;

    contenedor.innerHTML = `
      <div class="audit-wrap">
        <div class="audit-hero">
          <div class="audit-hero__info">
            <div class="audit-hero__eyebrow">${ICO.pulse}<span>Sustentación Técnica · Proyecto Integrador PICS — ETITC</span></div>
            <h2 class="audit-hero__title">Salud del Sistema, Telemetría y Suite de Validación</h2>
            <p class="audit-hero__sub">Inspección en tiempo real de arquitectura PWA, latencia Cloud Firestore, volumen operativo, cuota API-Football (0 req) y pruebas deterministas en memoria.</p>
          </div>
          <div class="audit-hero__actions">
            <button type="button" class="boton boton--fantasma boton--mini" id="audit-btn-refresh">${ICO.refresh}<span>Actualizar métricas</span></button>
            <button type="button" class="boton boton--verde boton--mini" id="audit-btn-suite">${ICO.play}<span>Ejecutar suite de validación</span></button>
            <button type="button" class="boton boton--fantasma boton--mini" id="audit-btn-copy">${ICO.copy}<span>Copiar reporte técnico</span></button>
            <button type="button" class="boton boton--fantasma boton--mini" id="audit-btn-json">${ICO.download}<span>Descargar JSON</span></button>
          </div>
        </div>

        <div class="audit-kpis" id="audit-kpis-grid">
          <div class="aviso">Recolectando telemetría en vivo…</div>
        </div>

        <div class="audit-suite-panel">
          <div class="audit-suite-head">
            <div>
              <h3 class="audit-suite-title">${ICO.shield}<span>Suite de Pruebas Funcionales y Seguridad (100% en memoria)</span></h3>
              <p class="audit-suite-sub">Ejecución no destructiva sobre los módulos reales en producción (<code>U.estadoPartido</code>, <code>Puntos.calificar</code>, <code>Puntos.tabla</code>, <code>U.esc</code> y <code>FIXTURE</code>).</p>
            </div>
            <div id="audit-suite-summary" class="audit-suite-summary"></div>
          </div>
          <div id="audit-suite-body"></div>
        </div>
      </div>`;

    const pintarKPIs = (t) => {
      const grid = contenedor.querySelector('#audit-kpis-grid');
      if (!grid || !t) return;
      const pctApi = Math.min(100, Math.round((t.api.peticionesHoy / Math.max(1, t.api.limiteDiario)) * 100));
      const clsLat = t.backend.semaforo === 'optima'
        ? 'audit-pill--ok'
        : t.backend.semaforo === 'normal'
          ? 'audit-pill--warn'
          : 'audit-pill--fail';

      grid.innerHTML = `
        <article class="audit-kpi">
          <div class="audit-kpi__head">
            <span class="audit-kpi__icon">${ICO.pwa}</span>
            <span class="audit-kpi__label">PWA y Caché</span>
            <span class="audit-pill ${t.pwa.online ? 'audit-pill--ok' : 'audit-pill--fail'}">${t.pwa.online ? 'En línea' : 'Offline'}</span>
          </div>
          <div class="audit-kpi__value">${_esc(t.pwa.cacheVersion, U)}</div>
          <div class="audit-kpi__list">
            <div><span>Service Worker</span><b>${_esc(t.pwa.swEstado, U)}</b></div>
            <div><span>Modo ejecución</span><b>${_esc(t.pwa.modo, U)}</b></div>
            <div><span>Activos en caché</span><b>${t.pwa.cacheItems} archivos</b></div>
          </div>
        </article>

        <article class="audit-kpi">
          <div class="audit-kpi__head">
            <span class="audit-kpi__icon">${ICO.cloud}</span>
            <span class="audit-kpi__label">Latencia y Backend</span>
            <span class="audit-pill ${clsLat}">${_esc(t.backend.semaforoTexto, U)}</span>
          </div>
          <div class="audit-kpi__value">${t.backend.latenciaMs} <small>ms RTT</small></div>
          <div class="audit-kpi__list">
            <div><span>Motor activo</span><b>${_esc(t.backend.modo, U)}</b></div>
            <div><span>Operación medida</span><b>Lectura liviana (0 writes)</b></div>
            <div><span>Estado enlace</span><b>${t.backend.lecturaOk ? 'Verificado' : 'Con error'}</b></div>
          </div>
        </article>

        <article class="audit-kpi">
          <div class="audit-kpi__head">
            <span class="audit-kpi__icon">${ICO.db}</span>
            <span class="audit-kpi__label">Volumen Real de Datos</span>
            <span class="audit-pill audit-pill--neutral">${t.volumen.competicionesTotal} ligas</span>
          </div>
          <div class="audit-kpi__value">${t.volumen.pronosticosTotal.toLocaleString('es-CO')} <small>pronósticos</small></div>
          <div class="audit-kpi__list">
            <div><span>Usuarios (act / pend)</span><b>${t.volumen.usuariosTotal} (${t.volumen.usuariosActivos} / ${t.volumen.usuariosPendientes})</b></div>
            <div><span>Partidos (fin / vivo / prog)</span><b>${t.volumen.partidosFinalizados} / ${t.volumen.partidosEnVivo} / ${t.volumen.partidosProgramados}</b></div>
            <div><span>IA / Eventos / XI</span><b>${t.volumen.analisisIaPublicados} IA · ${t.volumen.partidosConEventos} ev · ${t.volumen.partidosConAlineaciones} XI</b></div>
          </div>
        </article>

        <article class="audit-kpi">
          <div class="audit-kpi__head">
            <span class="audit-kpi__icon">${ICO.radio}</span>
            <span class="audit-kpi__label">Cuota API-Football (0 req)</span>
            <span class="audit-pill ${t.api.disponiblesHoy > 15 ? 'audit-pill--ok' : 'audit-pill--warn'}">Plan ${_esc(t.api.plan, U)}</span>
          </div>
          <div class="audit-kpi__value">${t.api.disponiblesHoy} <small>disp. de ${t.api.limiteDiario}</small></div>
          <div class="audit-bar"><div class="audit-bar__fill ${pctApi > 80 ? 'audit-bar__fill--high' : pctApi > 50 ? 'audit-bar__fill--warn' : ''}" style="width:${pctApi}%"></div></div>
          <div class="audit-kpi__list">
            <div><span>Consumo hoy</span><b>${t.api.peticionesHoy} / ${t.api.limiteDiario} (${pctApi}%)</b></div>
            <div><span>Estado endpoint</span><b>${t.api.conectada ? 'Conectado (/status)' : _esc(t.api.mensaje || 'Sin conexión', U)}</b></div>
          </div>
        </article>`;
    };

    const pintarSuite = (s) => {
      const sumEl = contenedor.querySelector('#audit-suite-summary');
      const bodyEl = contenedor.querySelector('#audit-suite-body');
      if (!bodyEl || !s) return;
      if (sumEl) {
        sumEl.innerHTML = `
          <span class="audit-pill ${s.ok ? 'audit-pill--ok' : 'audit-pill--fail'}">${s.ok ? ICO.check : ICO.alert}<span>${s.aprobados}/${s.totalCasos} PASS</span></span>
          <span class="audit-suite-time">${s.tiempoTotalMs} ms totales</span>`;
      }
      bodyEl.innerHTML = `
        <div class="tabla-envoltura">
          <table class="tabla audit-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Prueba funcional / seguridad</th>
                <th>Estado</th>
                <th>Tiempo</th>
                <th>Detalle verificado</th>
              </tr>
            </thead>
            <tbody>
              ${s.casos.map(c => `
                <tr>
                  <td class="num">${c.id}</td>
                  <td><b>${_esc(c.nombre, U)}</b></td>
                  <td><span class="audit-pill ${c.ok ? 'audit-pill--ok' : 'audit-pill--fail'}">${c.estado}</span></td>
                  <td class="num">${c.tiempoMs} ms</td>
                  <td class="audit-table__detail">${_esc(c.detalle, U)}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>`;
    };

    const btnRefresh = contenedor.querySelector('#audit-btn-refresh');
    const btnSuite = contenedor.querySelector('#audit-btn-suite');
    const btnCopy = contenedor.querySelector('#audit-btn-copy');
    const btnJson = contenedor.querySelector('#audit-btn-json');

    const refrescar = async () => {
      if (btnRefresh) btnRefresh.disabled = true;
      try {
        const tel = await this.recolectarTelemetria(deps);
        pintarKPIs(tel);
      } finally {
        if (btnRefresh) btnRefresh.disabled = false;
      }
    };

    if (btnRefresh) {
      btnRefresh.onclick = async () => {
        await refrescar();
        U?.toast && U.toast('Métricas actualizadas en tiempo real.');
      };
    }

    if (btnSuite) {
      btnSuite.onclick = () => {
        const res = this.ejecutarSuiteValidacion(deps);
        pintarSuite(res);
        U?.toast && U.toast(
          res.ok
            ? `Suite completada: ${res.aprobados}/${res.totalCasos} pruebas PASS (${res.tiempoTotalMs} ms).`
            : `Atención: ${res.fallidos} prueba(s) fallaron.`,
          res.ok ? 'ok' : 'error'
        );
      };
    }

    if (btnCopy) {
      btnCopy.onclick = async () => {
        if (!this._estado.suite) pintarSuite(this.ejecutarSuiteValidacion(deps));
        const txt = this.generarReporteTexto(this._estado);
        try {
          await navigator.clipboard.writeText(txt);
          U?.toast && U.toast('Reporte técnico copiado al portapapeles.');
        } catch {
          const ta = document.createElement('textarea');
          ta.value = txt;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          ta.remove();
          U?.toast && U.toast('Reporte técnico copiado al portapapeles.');
        }
      };
    }

    if (btnJson) {
      btnJson.onclick = () => {
        if (!this._estado.suite) pintarSuite(this.ejecutarSuiteValidacion(deps));
        this.descargarReporteJSON(this._estado);
        U?.toast && U.toast('Evidencia JSON descargada.');
      };
    }

    await refrescar();
    pintarSuite(this.ejecutarSuiteValidacion(deps));
  }
};

if (typeof window !== 'undefined') window.AuditoriaPICS = AuditoriaPICS;
if (typeof globalThis !== 'undefined') globalThis.AuditoriaPICS = AuditoriaPICS;
export { AuditoriaPICS };
export default AuditoriaPICS;
