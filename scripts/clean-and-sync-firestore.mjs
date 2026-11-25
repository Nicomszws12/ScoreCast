import fs from 'fs';
import path from 'path';

// Exponer globales para reutilizar ApiFutbol directamente en Node
const { CONFIG } = await import('../scorecast/js/config.js');
const { FIXTURE } = await import('../scorecast/js/fixture.js');
globalThis.CONFIG = CONFIG;
globalThis.FIXTURE = FIXTURE;
const { ApiFutbol } = await import('../scorecast/js/api-futbol.js');

const cfgPath = path.join(process.env.USERPROFILE || '', '.config', 'configstore', 'firebase-tools.json');
if (!fs.existsSync(cfgPath)) throw new Error('No se encontró firebase-tools.json');
const token = JSON.parse(fs.readFileSync(cfgPath, 'utf8')).tokens?.access_token;
if (!token) throw new Error('No hay access_token activo en firebase-tools.json');

const projectId = 'scorecast-c5e9e';
const baseDocsUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
const commitUrl = `${baseDocsUrl}:commit`;
const authHeaders = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    if (!Number.isFinite(val)) return { nullValue: null };
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) return { arrayValue: { values: val.map(toFirestoreValue) } };
  if (typeof val === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function toFirestoreFields(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) fields[k] = toFirestoreValue(v);
  }
  return fields;
}

async function listAllDocs(col) {
  const out = [];
  let tok = '';
  do {
    const r = await fetch(`${baseDocsUrl}/${col}?pageSize=300${tok ? '&pageToken=' + tok : ''}`, { headers: authHeaders });
    if (!r.ok) throw new Error(`Error listando ${col}: HTTP ${r.status} ${await r.text()}`);
    const j = await r.json();
    out.push(...(j.documents || []));
    tok = j.nextPageToken || '';
  } while (tok);
  return out;
}

async function commitBatch(writes) {
  if (!writes.length) return;
  for (let i = 0; i < writes.length; i += 200) {
    const chunk = writes.slice(i, i + 200);
    const r = await fetch(commitUrl, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ writes: chunk })
    });
    if (!r.ok) throw new Error(`Commit falló (${r.status}): ${await r.text()}`);
  }
}

const isEuroDocId = id => /^(ucl-|ll-|pl-|bun-)/.test(id);
console.log('🧹 1/4 Inspeccionando y limpiando documentos europeos corruptos/congelados en Firestore...');
const [ajDocs, resDocs] = await Promise.all([listAllDocs('ajustes'), listAllDocs('resultados')]);

const ajDeletes = ajDocs
  .filter(d => isEuroDocId(d.name.split('/').pop()))
  .map(d => ({ delete: d.name }));

const resDeletes = resDocs
  .filter(d => isEuroDocId(d.name.split('/').pop()))
  .map(d => ({ delete: d.name }));

// Preservar analisisIA existente en BetPlay si lo tenía
const prevIaByPid = {};
for (const d of resDocs) {
  const pid = d.name.split('/').pop();
  const ia = d.fields?.analisisIA?.stringValue;
  if (ia && !isEuroDocId(pid)) prevIaByPid[pid] = ia;
}

console.log(`   • Eliminando ${ajDeletes.length} ajustes europeos antiguos y ${resDeletes.length} resultados europeos corruptos/en_juego...`);
await commitBatch([...ajDeletes, ...resDeletes, { delete: `projects/${projectId}/databases/(default)/documents/sincronizacion/live` }]);
console.log('   ✓ Limpieza selectiva completada (BetPlay, Libertadores, Sudamericana, usuarios y predicciones intactos).');

console.log('\n⚽ 2/4 Subiendo resultados reales 2026-2027 y catálogo de equipos a Firestore...');
const resEntries = Object.entries(FIXTURE.resultadosIniciales || {});
const resWrites = resEntries.map(([pid, r]) => ({
  update: {
    name: `projects/${projectId}/databases/(default)/documents/resultados/${pid}`,
    fields: toFirestoreFields({
      ...r,
      pid,
      ...(prevIaByPid[pid] ? { analisisIA: prevIaByPid[pid] } : {}),
      t: Date.now()
    })
  }
}));
await commitBatch(resWrites);

const eqWrites = Object.entries(FIXTURE.equipos || {}).map(([code, eq]) => ({
  update: {
    name: `projects/${projectId}/databases/(default)/documents/equipos/${code}`,
    fields: toFirestoreFields({
      code,
      nombre: eq.n || '',
      escudo: eq.b || '',
      competicion: eq.comp || '',
      actualizado: Date.now()
    })
  }
}));
await commitBatch(eqWrites);
console.log(`   ✓ Subidos ${resWrites.length} resultados oficiales y ${eqWrites.length} equipos.`);

console.log('\n📡 3/4 Hidratando desde API-Football v3 (alineaciones + eventos + goles + cambios + stats reales)...');
const targetsHidratar = [
  ...FIXTURE.partidos.filter(p => p.competicion === 'ucl' && p.jornada === 5 && p.fecha === '2026-11-24' && p.apiId),
  { ...FIXTURE.porId('bp-cua-f2-04'), apiId: 1650513 },
  { ...FIXTURE.porId('bp-cua-f2-03'), apiId: 1650514 },
  FIXTURE.porId('bun-j10-06'),
  FIXTURE.porId('bun-j10-02')
].filter(p => p && p.id && p.apiId);

const hydratedWrites = [];
for (const p of targetsHidratar) {
  const full = await ApiFutbol.traerPartidoCompleto(p.apiId, p.competicion, {
    localCod: p.local,
    visitanteCod: p.visitante
  });
  if (!full?.fixture) continue;
  const ap = full.fixture;
  const inv = p.local && ap.visitante && p.local === ap.visitante;
  const gl = inv ? ap.gv : ap.gl;
  const gv = inv ? ap.gl : ap.gv;
  const payload = {
    pid: p.id,
    apiId: p.apiId,
    estado: ap.estado || 'finalizado',
    periodo: ap.periodo || 'FT',
    minuto: ap.minuto ?? 90,
    extra: ap.extra ?? null,
    minutoAt: Date.now(),
    gl: gl ?? 0,
    gv: gv ?? 0,
    eventos: full.eventos || [],
    eventosAt: Date.now(),
    ...(full.alineaciones ? { alineaciones: full.alineaciones } : {}),
    ...(Object.keys(full.tarjetas || {}).length ? { tarjetas: full.tarjetas, statsAt: Date.now() } : {}),
    ...(prevIaByPid[p.id] ? { analisisIA: prevIaByPid[p.id] } : {}),
    detallesCompletos: true,
    t: Date.now()
  };
  hydratedWrites.push({
    update: {
      name: `projects/${projectId}/databases/(default)/documents/resultados/${p.id}`,
      fields: toFirestoreFields(payload)
    }
  });
  console.log(`   ✓ ${p.id} (apiId:${p.apiId}) -> ${FIXTURE.equipos[p.local]?.n} ${payload.gl}-${payload.gv} ${FIXTURE.equipos[p.visitante]?.n} | XI:${full.alineaciones ? 'SÍ' : 'NO'} | Eventos:${(full.eventos || []).length}`);
}

await commitBatch(hydratedWrites);

const st = await ApiFutbol.verificarEstado();
console.log(`\n✅ 4/4 Firestore limpio y sincronizado. Cuota API-Football hoy: ${st.peticionesHoy}/${st.limiteDiario} (Plan ${st.plan}).`);

