import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import fixture
const { FIXTURE } = await import('../scorecast/js/fixture.js');

// Helper to convert JS object to Firestore REST API value
function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreValue) } };
  }
  if (typeof val === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(val)) {
      fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function toFirestoreFields(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) {
    fields[k] = toFirestoreValue(v);
  }
  return fields;
}

// Get access token
const configPath = path.join(process.env.USERPROFILE || '', '.config', 'configstore', 'firebase-tools.json');
if (!fs.existsSync(configPath)) {
  console.error('Error: firebase-tools credentials not found at', configPath);
  process.exit(1);
}

const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const token = configData.tokens?.access_token;
if (!token) {
  console.error('Error: access_token not found in configstore');
  process.exit(1);
}

const projectId = 'scorecast-c5e9e';
const commitUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:commit`;

async function commitBatch(writes) {
  const res = await fetch(commitUrl, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ writes })
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Commit failed (${res.status} ${res.statusText}): ${errText}`);
  }
  return await res.json();
}

async function uploadResultados() {
  const resultados = FIXTURE.resultadosIniciales || {};
  const entries = Object.entries(resultados);
  console.log(`\n⚽ Sincronizando ${entries.length} resultados iniciales a Firestore...`);
  
  const batchSize = 100;
  let sent = 0;
  for (let i = 0; i < entries.length; i += batchSize) {
    const chunk = entries.slice(i, i + batchSize);
    const writes = chunk.map(([pid, r]) => {
      const payload = { ...r, pid, t: Date.now() };
      return {
        update: {
          name: `projects/${projectId}/databases/(default)/documents/resultados/${pid}`,
          fields: toFirestoreFields(payload)
        }
      };
    });

    await commitBatch(writes);
    sent += chunk.length;
    process.stdout.write(`   ✓ Subidos ${sent} / ${entries.length} resultados\r`);
  }
  console.log(`\n✅ ${sent} resultados subidos exitosamente a 'resultados' en Firestore.`);
}

async function uploadEquipos() {
  const equipos = FIXTURE.equipos || {};
  const entries = Object.entries(equipos);
  console.log(`\n🛡️ Sincronizando ${entries.length} equipos a Firestore...`);
  
  const batchSize = 100;
  let sent = 0;
  for (let i = 0; i < entries.length; i += batchSize) {
    const chunk = entries.slice(i, i + batchSize);
    const writes = chunk.map(([code, eq]) => {
      const payload = {
        code,
        nombre: eq.n || '',
        escudo: eq.b || '',
        competicion: eq.comp || '',
        actualizado: Date.now()
      };
      return {
        update: {
          name: `projects/${projectId}/databases/(default)/documents/equipos/${code}`,
          fields: toFirestoreFields(payload)
        }
      };
    });

    await commitBatch(writes);
    sent += chunk.length;
    process.stdout.write(`   ✓ Subidos ${sent} / ${entries.length} equipos\r`);
  }
  console.log(`\n✅ ${sent} equipos subidos exitosamente a 'equipos' en Firestore.`);
}

async function main() {
  console.log('🚀 Iniciando sincronización a Firebase Firestore...');
  console.log(`📌 Proyecto: ${projectId}`);
  await uploadResultados();
  await uploadEquipos();
  console.log('\n🎉 ¡Todo sincronizado a Firebase correctamente!');
}

main().catch(err => {
  console.error('\n❌ Error en la sincronización:', err);
  process.exit(1);
});

