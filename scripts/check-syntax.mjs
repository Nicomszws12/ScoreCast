import fs from 'fs';
import { execSync } from 'child_process';

const files = [
  'scorecast/index.html',
  'scorecast/lobby.html',
  'scorecast/admin.html',
  'scorecast/app.html',
  'scorecast/tabla.html',
  'scorecast/reglas.html',
  'scorecast/js/tablas-cuadros.js',
  'scorecast/js/fixture.js',
  'scorecast/js/store.js',
  'scorecast/js/puntos.js'
];

for (const f of files) {
  if (f.endsWith('.html')) {
    const html = fs.readFileSync(f, 'utf8');
    const matches = [...html.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)];
    matches.forEach((m, idx) => {
      const scriptCode = m[1];
      fs.writeFileSync(`temp_${idx}.mjs`, scriptCode);
      try {
        execSync(`node --check temp_${idx}.mjs`, { stdio: 'pipe' });
        console.log(`✓ ${f} (script block ${idx}) syntax OK`);
      } catch (err) {
        console.error(`❌ Syntax error in ${f} (script block ${idx}):`, err.stderr?.toString());
      } finally {
        if (fs.existsSync(`temp_${idx}.mjs`)) fs.unlinkSync(`temp_${idx}.mjs`);
      }
    });
  } else {
    try {
      execSync(`node --check ${f}`, { stdio: 'pipe' });
      console.log(`✓ ${f} syntax OK`);
    } catch (err) {
      console.error(`❌ Syntax error in ${f}:`, err.stderr?.toString());
    }
  }
}

