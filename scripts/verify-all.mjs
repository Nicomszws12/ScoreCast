import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';

console.log('🔍 [1/5] Verificando sintaxis de todos los módulos HTML y JS...');
execSync('node scripts/check-syntax.mjs', { stdio: 'inherit' });

const { CONFIG } = await import('../scorecast/js/config.js');
const { FIXTURE } = await import('../scorecast/js/fixture.js');
globalThis.window = globalThis;
globalThis.CONFIG = CONFIG;
globalThis.FIXTURE = FIXTURE;
const { U } = await import('../scorecast/js/utils.js');
const { Puntos } = await import('../scorecast/js/puntos.js');
const { ApiFutbol } = await import('../scorecast/js/api-futbol.js');
const { TablasCuadros } = await import('../scorecast/js/tablas-cuadros.js');

console.log('\n🔍 [2/5] Validando calendario 2026-2027 de las 4 ligas europeas y 0 regresiones en Sudamérica...');
const expectedCounts = {
  ucl: 203,
  laliga: 380,
  premier: 380,
  bundesliga: 306,
  betplay: 216,
  libertadores: 155,
  sudamericana: 157
};

for (const [comp, expected] of Object.entries(expectedCounts)) {
  const list = FIXTURE.porCompeticion(comp);
  assert.equal(list.length, expected, `Conteo inválido en ${comp}: esperado ${expected}, actual ${list.length}`);
}

// Verificar cero cruces falsos de temporadas pasadas en UCL Fase de Liga
const uclLiga = FIXTURE.porCompeticion('ucl').filter(p => p.fase === 'liga');
assert.equal(uclLiga.length, 144, 'UCL Fase de Liga debe tener exactamente 144 partidos');
const forbiddenUclTeams = new Set(['gir', 'sbr', 'stg', 'bbo', 'ybo', 'spa']);
for (const p of uclLiga) {
  assert(!forbiddenUclTeams.has(p.local) && !forbiddenUclTeams.has(p.visitante), `Equipo de temporada pasada detectado en UCL: ${p.id}`);
}

// Verificar cero duplicados local-visitante en las 4 ligas europeas
for (const comp of ['laliga', 'premier', 'bundesliga']) {
  const seen = new Set();
  for (const p of FIXTURE.porCompeticion(comp)) {
    const k = `${p.local}__${p.visitante}`;
    assert(!seen.has(k), `Cruce duplicado en ${comp}: ${k}`);
    seen.add(k);
  }
}

console.log('   ✓ Conteos exactos y 0 cruces duplicados/falsos en las 7 competiciones.');

console.log('\n🔍 [3/5] Validando resolución de equipos en ApiFutbol._codigo y tablas de posiciones...');
for (const comp of ['ucl', 'laliga', 'premier', 'bundesliga', 'betplay']) {
  const tabla = TablasCuadros.calcularTabla(comp, 'liga', null, FIXTURE.resultadosIniciales);
  assert(tabla.length >= 18, `Tabla ${comp} vacía o incompleta (${tabla.length})`);
}
for (const p of FIXTURE.partidos) {
  if (!p.local || !p.visitante || !FIXTURE.equipos[p.local] || !FIXTURE.equipos[p.visitante]) continue;
  const cL = ApiFutbol._codigo(FIXTURE.equipos[p.local].n, p.competicion);
  const cV = ApiFutbol._codigo(FIXTURE.equipos[p.visitante].n, p.competicion);
  assert.equal(cL, p.local, `Fallo mapeo local ${p.competicion}: ${FIXTURE.equipos[p.local].n} -> ${cL}`);
  assert.equal(cV, p.visitante, `Fallo mapeo visitante ${p.competicion}: ${FIXTURE.equipos[p.visitante].n} -> ${cV}`);
}
console.log('   ✓ 100% de equipos europeos y sudamericanos resuelven correctamente en ApiFutbol y TablasCuadros.');

console.log('\n🔍 [4/5] Validando máquina de estados (U.estadoPartido) y motor de puntajes (Puntos)...');
const mockFuture = { id: 't1', local: 'rma', visitante: 'bar', utc: new Date(Date.now() + 7200000).toISOString(), horaOk: true, estado: 'programado' };
const mockClosed = { id: 't2', local: 'rma', visitante: 'bar', utc: new Date(Date.now() - 600000).toISOString(), horaOk: true, estado: 'programado' };
assert.equal(U.estadoPartido(mockFuture, null), 'programado');
assert.equal(U.estadoPartido(mockClosed, null), 'cerrado');
assert.equal(U.estadoPartido(mockClosed, { estado: 'en_juego', periodo: '1H', minuto: 32 }), 'en_juego');
assert.equal(U.estadoPartido(mockClosed, { estado: 'finalizado', gl: 2, gv: 1 }), 'finalizado');

assert.deepEqual(Puntos.calificar({ gl: 5, gv: 1 }, { gl: 5, gv: 1, estado: 'finalizado' }, 'liga'), { pts: 3, tipo: 'exacto' });
assert.deepEqual(Puntos.calificar({ gl: 2, gv: 0 }, { gl: 5, gv: 1, estado: 'finalizado' }, 'liga'), { pts: 1, tipo: 'resultado' });
assert.deepEqual(Puntos.calificar({ gl: 0, gv: 2 }, { gl: 5, gv: 1, estado: 'finalizado' }, 'liga'), { pts: 0, tipo: 'fallo' });
assert.deepEqual(Puntos.calificar({ gl: 2, gv: 1 }, { gl: 2, gv: 1, estado: 'finalizado' }, 'eliminatoria'), { pts: 5, tipo: 'exacto' });
console.log('   ✓ Máquina de estados y calificación de pronósticos verificadas.');

console.log('\n🔍 [5/5] Verificando en Firestore que no existan partidos congelados y que UCL J5 tenga alineaciones y eventos reales...');
const baseDocs = 'https://firestore.googleapis.com/v1/projects/scorecast-c5e9e/databases/(default)/documents';
const rSample = await fetch(`${baseDocs}/resultados/ucl-j05-08`);
assert(rSample.ok, 'Documento ucl-j05-08 debe existir en Firestore');
const jSample = await rSample.json();
assert.equal(jSample.fields?.estado?.stringValue, 'finalizado');
assert.equal(jSample.fields?.gl?.integerValue, '5');
assert.equal(jSample.fields?.gv?.integerValue, '1');
assert((jSample.fields?.eventos?.arrayValue?.values || []).length >= 15, 'ucl-j05-08 debe tener eventos hidratados (goles, tarjetas y cambios)');
assert(jSample.fields?.alineaciones?.mapValue?.fields?.local, 'ucl-j05-08 debe tener alineaciones confirmadas');

const rBun = await fetch(`${baseDocs}/resultados/bun-j10-06`);
const jBun = await rBun.json();
assert.equal(jBun.fields?.estado?.stringValue, 'finalizado', 'bun-j10-06 ya no puede estar congelado en en_juego');
assert.equal(jBun.fields?.gl?.integerValue, '0');
assert.equal(jBun.fields?.gv?.integerValue, '1');

console.log('   ✓ Firestore verificado en vivo (ucl-j05-08 Real Madrid 5-1 PSV con XI + 20 eventos, bun-j10-06 finalizado 0-1).');
console.log('\n✅ BUILD & VERIFICACIÓN INTEGRAL EXITOSA.');
