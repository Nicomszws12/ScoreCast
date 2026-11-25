import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const { FIXTURE: OLD_FIXTURE, COMPETICIONES } = await import('../scorecast/js/fixture.js');
const { CONFIG } = await import('../scorecast/js/config.js');

const EQUIPOS = { ...OLD_FIXTURE.equipos };

for (const c of ['gir','acm','ata','juv','ben','dzg','sal','crv','ybo','clt','asm','spa','bbo','stg','sbr','qar','mal','fcm','dyn']) {
  if (EQUIPOS[c] && EQUIPOS[c].comp === 'ucl') EQUIPOS[c] = { ...EQUIPOS[c], comp: 'europa_hist' };
}

Object.assign(EQUIPOS, {
  psg: { n: 'Paris Saint-Germain', b: 'img/escudos/champions/psg.png', comp: 'ucl' },
  int: { n: 'Inter de Milán', b: 'img/escudos/champions/inter.png', comp: 'ucl' },
  rom: { n: 'AS Roma', b: 'img/escudos/champions/roma.png', comp: 'ucl' },
  nap: { n: 'SSC Napoli', b: 'img/escudos/champions/napoli.png', comp: 'ucl' },
  com: { n: 'Como 1907', b: 'img/escudos/champions/como.png', comp: 'ucl' },
  por: { n: 'FC Porto', b: 'img/escudos/champions/porto.png', comp: 'ucl' },
  spo: { n: 'Sporting CP', b: 'img/escudos/champions/sporting.png', comp: 'ucl' },
  fey: { n: 'Feyenoord', b: 'img/escudos/champions/feyenoord.png', comp: 'ucl' },
  psv: { n: 'PSV Eindhoven', b: 'img/escudos/champions/psv.png', comp: 'ucl' },
  lil: { n: 'LOSC Lille', b: 'img/escudos/champions/lille.png', comp: 'ucl' },
  len: { n: 'RC Lens', b: 'img/escudos/champions/lens.png', comp: 'ucl' },
  bru: { n: 'Club Brugge', b: 'img/escudos/champions/club_brugge.png', comp: 'ucl' },
  gal: { n: 'Galatasaray', b: 'img/escudos/champions/galatasaray.png', comp: 'ucl' },
  fen: { n: 'Fenerbahçe', b: 'img/escudos/champions/fenerbahce.png', comp: 'ucl' },
  sha: { n: 'Shakhtar Donetsk', b: 'img/escudos/champions/shakhtar.png', comp: 'ucl' },
  sla: { n: 'Slavia Praha', b: 'img/escudos/champions/slavia_praha.png', comp: 'ucl' },
  svb: { n: 'Slovan Bratislava', b: 'img/escudos/champions/slovan_bratislava.png', comp: 'ucl' },
  bod: { n: 'Bodø/Glimt', b: 'img/escudos/champions/bodo_glimt.png', comp: 'ucl' },
  vik: { n: 'Viking FK', b: 'img/escudos/champions/viking.png', comp: 'ucl' },
  lsk: { n: 'LASK Linz', b: 'img/escudos/champions/lask.png', comp: 'ucl' },
  aek: { n: 'AEK Athens', b: 'img/escudos/champions/aek_athens.png', comp: 'ucl' },
  sab: { n: 'Sabah FK', b: 'img/escudos/champions/sabah.png', comp: 'ucl' },
  dzg: { n: 'Dinamo Zagreb', b: 'img/escudos/champions/dinamo_zagreb.png', comp: 'ucl_po' },
  clt: { n: 'Celtic FC', b: 'img/escudos/champions/celtic.png', comp: 'ucl_po' },
  lyo: { n: 'Olympique Lyonnais', b: 'https://a.espncdn.com/i/teamlogos/soccer/500/167.png', comp: 'ucl_po' },
  lev_sof: { n: 'Levski Sofia', b: 'https://a.espncdn.com/i/teamlogos/soccer/500/2550.png', comp: 'ucl_po' },
  hbs: { n: "Hapoel Be'er Sheva", b: 'https://a.espncdn.com/i/teamlogos/soccer/500/17513.png', comp: 'ucl_po' },
  nec: { n: 'NEC Nijmegen', b: 'https://a.espncdn.com/i/teamlogos/soccer/500/152.png', comp: 'ucl_po' },
  cel_svn: { n: 'NK Celje', b: 'https://a.espncdn.com/i/teamlogos/soccer/500/20660.png', comp: 'ucl_po' }
});

const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const TEAM_MAP = {
  'manchester city':'mci','arsenal':'ars','arsenal fc':'ars','liverpool':'liv','liverpool fc':'liv',
  'chelsea':'che','chelsea fc':'che','manchester united':'mun','tottenham hotspur':'tot','tottenham':'tot',
  'newcastle united':'new','newcastle':'new','aston villa':'avl','brighton hove albion':'bha','brighton hove':'bha','brighton':'bha',
  'brentford':'bre','brentford fc':'bre','crystal palace':'cry','fulham':'ful','fulham fc':'ful',
  'afc bournemouth':'bou','bournemouth':'bou','everton':'eve','everton fc':'eve','nottingham forest':'nfo',
  'ipswich town':'ips','ipswich':'ips','coventry city':'cov','coventry':'cov','hull city':'hul','hull':'hul',
  'sunderland':'sun','sunderland afc':'sun','leeds united':'lee','leeds':'lee',
  'real madrid':'rma','barcelona':'bar','fc barcelona':'bar','atletico madrid':'atm','atletico de madrid':'atm',
  'athletic club':'ath','athletic bilbao':'ath','real sociedad':'rso','real betis':'bet','betis':'bet',
  'sevilla':'sev','sevilla fc':'sev','villarreal':'vil','villarreal cf':'vil','valencia':'val','valencia cf':'val',
  'celta vigo':'cel','rc celta':'cel','celta de vigo':'cel','osasuna':'osa','ca osasuna':'osa',
  'alaves':'ala','deportivo alaves':'ala','getafe':'get','getafe cf':'get','rayo vallecano':'ray',
  'espanyol':'esp','rcd espanyol':'esp','racing santander':'rac_s','real racing club':'rac_s',
  'deportivo':'dep','deportivo la coruna':'dep','rc deportivo':'dep','deportivo de la coruna':'dep',
  'malaga':'mal_cf','malaga cf':'mal_cf','elche':'elc','elche cf':'elc','levante':'lev_ud','levante ud':'lev_ud',
  'bayern munich':'bay','bayern munchen':'bay','fc bayern munich':'bay','borussia dortmund':'bvb','dortmund':'bvb',
  'bayer leverkusen':'lev','bayer 04 leverkusen':'lev','rb leipzig':'rbl','leipzig':'rbl',
  'eintracht frankfurt':'sge','frankfurt':'sge','vfb stuttgart':'vfb','stuttgart':'vfb','sc freiburg':'scf','freiburg':'scf',
  'tsg hoffenheim':'tsg','hoffenheim':'tsg','1899 hoffenheim':'tsg','werder bremen':'svw','sv werder bremen':'svw',
  'fc augsburg':'fca','augsburg':'fca','borussia monchengladbach':'bmg','borussia m gladbach':'bmg','monchengladbach':'bmg',
  '1 fc union berlin':'fcu','union berlin':'fcu','mainz':'m05','mainz 05':'m05','1 fsv mainz 05':'m05','fsv mainz 05':'m05',
  'schalke 04':'s04','fc schalke 04':'s04','sv elversberg':'sve','elversberg':'sve','sv 07 elversberg':'sve',
  'sc paderborn 07':'pad','paderborn':'pad','sc paderborn':'pad','fc cologne':'koe','1 fc koln':'koe','fc koln':'koe','koln':'koe',
  'hamburg sv':'hsv','hamburger sv':'hsv','hamburg':'hsv',
  'paris saint germain':'psg','internazionale':'int','inter':'int','inter milan':'int',
  'as roma':'rom','roma':'rom','napoli':'nap','ssc napoli':'nap','como':'com','como 1907':'com',
  'fc porto':'por','porto':'por','sporting cp':'spo','sporting':'spo','feyenoord rotterdam':'fey','feyenoord':'fey',
  'psv eindhoven':'psv','psv':'psv','lille':'lil','losc lille':'lil','lens':'len','rc lens':'len',
  'club brugge':'bru','club brugge kv':'bru','galatasaray':'gal','fenerbahce':'fen','shakhtar donetsk':'sha',
  'slavia prague':'sla','slavia praha':'sla','slovan bratislava':'svb','bodo glimt':'bod',
  'viking fk':'vik','viking':'vik','lask linz':'lsk','lask':'lsk','aek athens':'aek','aek athens fc':'aek',
  'sabah fk':'sab','sabah fa':'sab','sabah':'sab','dinamo zagreb':'dzg','celtic':'clt','celtic fc':'clt',
  'lyon':'lyo','olympique lyonnais':'lyo','levski sofia':'lev_sof','hapoel be er sheva':'hbs','hapoel be er':'hbs',
  'nec nijmegen':'nec','nk celje':'cel_svn','celje':'cel_svn'
};

function resolveTeam(name) {
  const k = norm(name);
  if (TEAM_MAP[k]) return TEAM_MAP[k];
  throw new Error(`Equipo sin mapear: "${name}" ("${k}")`);
}

function formatBogota(utcIso) {
  const d = new Date(utcIso);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).formatToParts(d);
  const get = t => parts.find(p => p.type === t)?.value || '';
  const hh = get('hour') === '24' ? '00' : get('hour');
  return {
    fecha: `${get('year')}-${get('month')}-${get('day')}`,
    fechaStr: `${get('day')}/${get('month')}/${get('year')}`,
    horaStr: `${hh}:${get('minute')}`,
    utc: d.toISOString()
  };
}
async function fetchJson(url, headers = {}) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const r = await fetch(url, { headers });
      if (!r.ok) throw new Error(`HTTP ${r.status} en ${url}`);
      return await r.json();
    } catch (e) {
      if (attempt === 3) throw e;
      await new Promise(res => setTimeout(res, 600 * attempt));
    }
  }
}

async function fetchLeagueEvents(slug, explicitDates = null) {
  let dates = explicitDates;
  if (!dates) {
    const root = await fetchJson(`https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/scoreboard`);
    dates = (root.leagues?.[0]?.calendar || []).map(iso => String(iso).slice(0, 10).replace(/-/g, ''));
  }
  const seen = new Map();
  for (let i = 0; i < dates.length; i += 10) {
    const chunk = dates.slice(i, i + 10);
    const resArr = await Promise.all(
      chunk.map(dt => fetchJson(`https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/scoreboard?dates=${dt}`))
    );
    for (const j of resArr) {
      for (const ev of (j.events || [])) seen.set(ev.id, ev);
    }
  }
  return [...seen.values()].sort((a, b) => new Date(a.date) - new Date(b.date));
}

function parseEvent(ev) {
  const comp = ev.competitions?.[0] || {};
  const comps = comp.competitors || [];
  const home = comps.find(c => c.homeAway === 'home');
  const away = comps.find(c => c.homeAway === 'away');
  const local = resolveTeam(home.team.displayName);
  const visitante = resolveTeam(away.team.displayName);
  const f = formatBogota(ev.date);
  const vName = comp.venue?.fullName || '';
  const vCity = comp.venue?.address?.city || '';
  const estadio = vName && vCity && !vName.toLowerCase().includes(vCity.toLowerCase())
    ? `${vName}, ${vCity}`
    : (vName || vCity || 'Estadio oficial');

  const stName = ev.status?.type?.name || '';
  const stState = ev.status?.type?.state || '';
  let estado = 'programado';
  let resultado = null;

  if (stState === 'post' || ['STATUS_FULL_TIME', 'STATUS_FINAL_AET', 'STATUS_FINAL_PEN'].includes(stName)) {
    estado = 'finalizado';
    resultado = { gl: Number(home.score ?? 0), gv: Number(away.score ?? 0), estado: 'finalizado' };
  } else if (stName.includes('POSTPONED') || stName.includes('CANCELED') || stName.includes('SUSPENDED')) {
    estado = 'aplazado';
  }

  return { ...f, local, visitante, estadio, estado, horaOk: true, resultado };
}

function assignDomesticJornadas(parsedMatches, totalJornadas, perJornada) {
  // 1. Partir el flujo cronológico cuando hay pausa > 40h, ronda completa, o equipo repetido
  const rawBlocks = [];
  for (const m of parsedMatches) {
    const ms = new Date(m.utc).getTime();
    const last = rawBlocks[rawBlocks.length - 1];
    const gapHours = last ? (ms - last.lastMs) / 3600000 : 999;
    const conflict = last ? (last.teams.has(m.local) || last.teams.has(m.visitante)) : false;

    if (!last || gapHours > 40 || last.matches.length >= perJornada || conflict) {
      rawBlocks.push({ teams: new Set([m.local, m.visitante]), matches: [m], lastMs: ms });
    } else {
      last.teams.add(m.local);
      last.teams.add(m.visitante);
      last.matches.push(m);
      last.lastMs = ms;
    }
  }

  // 2. Los bloques principales (>= 6 partidos) son las jornadas oficiales; los menores son aplazados/adelantados
  const mainBlocks = rawBlocks.filter(b => b.matches.length >= 6);
  const smallMatches = rawBlocks.filter(b => b.matches.length < 6).flatMap(b => b.matches);

  // Ajustar si hubiera más o menos de totalJornadas bloques principales
  while (mainBlocks.length > totalJornadas) {
    // Fusionar o mover el bloque más pequeño a sueltos
    let minIdx = 0;
    for (let i = 1; i < mainBlocks.length; i++) {
      if (mainBlocks[i].matches.length < mainBlocks[minIdx].matches.length) minIdx = i;
    }
    smallMatches.push(...mainBlocks.splice(minIdx, 1)[0].matches);
  }
  while (mainBlocks.length < totalJornadas) {
    mainBlocks.push({ teams: new Set(), matches: [], lastMs: 0 });
  }

  const rounds = mainBlocks.map(b => ({ teams: new Set(b.teams), matches: [...b.matches] }));

  // 3. Insertar partidos adelantados/aplazados en la jornada donde ambos clubes faltan
  for (const m of smallMatches) {
    const ms = new Date(m.utc).getTime();
    let bestRound = -1, bestDist = Infinity;
    for (let i = 0; i < totalJornadas; i++) {
      const rd = rounds[i];
      if (rd.matches.length < perJornada && !rd.teams.has(m.local) && !rd.teams.has(m.visitante)) {
        const sortedMs = rd.matches.map(x => new Date(x.utc).getTime()).sort((a, b) => a - b);
        const medMs = sortedMs.length ? sortedMs[Math.floor(sortedMs.length / 2)] : ms;
        const dist = Math.abs(ms - medMs);
        if (dist < bestDist) { bestDist = dist; bestRound = i; }
      }
    }
    if (bestRound === -1) bestRound = rounds.findIndex(rd => rd.matches.length < perJornada);
    rounds[bestRound].teams.add(m.local);
    rounds[bestRound].teams.add(m.visitante);
    rounds[bestRound].matches.push(m);
  }

  const withMedian = rounds.map(rd => {
    const sorted = rd.matches.sort((a, b) => new Date(a.utc) - new Date(b.utc));
    const med = sorted.length ? new Date(sorted[Math.floor(sorted.length / 2)].utc).getTime() : 0;
    return { matches: sorted, med };
  }).sort((a, b) => a.med - b.med);

  return withMedian.map((rd, idx) => ({
    jornada: idx + 1,
    matches: rd.matches
  }));
}
async function fetchApiFootballActiveMap() {
  const byKey = new Map();
  // Preservar apiIds ya vinculados en el fixture previo para no regastar cuota si se re-ejecuta con --reuse-api-ids
  for (const p of (OLD_FIXTURE.partidos || [])) {
    if (p.apiId && p.local && p.visitante) {
      byKey.set(`${p.competicion}:${p.local}:${p.visitante}`, {
        apiId: p.apiId,
        utc: p.utc || null,
        estadio: p.estadio || null,
        short: p.estado === 'finalizado' ? 'FT' : 'NS',
        gl: p.resultado?.gl ?? null,
        gv: p.resultado?.gv ?? null
      });
    }
  }
  if (process.argv.includes('--reuse-api-ids')) {
    console.log(`♻️ Reutilizados ${byKey.size} apiIds previos (0 req a API-Football).`);
    return byKey;
  }
  const apiKey = CONFIG.API_FUTBOL?.apiKey;
  if (!apiKey) return byKey;

  const COMP_BY_LEAGUE = { 2: 'ucl', 39: 'premier', 140: 'laliga', 78: 'bundesliga' };
  for (const dt of ['2026-11-24', '2026-11-25', '2026-11-26']) {
    const j = await fetchJson(
      `https://v3.football.api-sports.io/fixtures?date=${dt}&timezone=America/Bogota`,
      { 'x-apisports-key': apiKey }
    );
    if (j.errors && Object.keys(j.errors).length) {
      console.warn(`⚠️ API-Football ${dt}:`, j.errors);
      continue;
    }
    for (const f of (j.response || [])) {
      const comp = COMP_BY_LEAGUE[f.league?.id];
      if (!comp) continue;
      try {
        const l = resolveTeam(f.teams?.home?.name);
        const v = resolveTeam(f.teams?.away?.name);
        byKey.set(`${comp}:${l}:${v}`, {
          apiId: f.fixture?.id,
          utc: f.fixture?.date ? new Date(f.fixture.date).toISOString() : null,
          estadio: f.fixture?.venue?.name
            ? (f.fixture.venue.city && !f.fixture.venue.name.toLowerCase().includes(f.fixture.venue.city.toLowerCase())
                ? `${f.fixture.venue.name}, ${f.fixture.venue.city}`
                : f.fixture.venue.name)
            : null,
          short: f.fixture?.status?.short,
          gl: f.goals?.home,
          gv: f.goals?.away
        });
      } catch (e) {
        console.warn('⚠️ Sin mapeo en API-Football:', f.teams?.home?.name, 'vs', f.teams?.away?.name);
      }
    }
  }
  console.log(`✅ Vinculados ${byKey.size} partidos activos desde API-Football v3 (2026-11-24..26).`);
  return byKey;
}

console.log('🌍 Descargando calendarios oficiales 2026-2027 (UCL, LaLiga, Premier League, Bundesliga)...');

const [apiFootballMap, uclQualRaw, uclLeagueRaw, laligaRaw, premierRaw, bundesligaRaw] = await Promise.all([
  fetchApiFootballActiveMap(),
  fetchLeagueEvents('uefa.champions_qual', ['20260818', '20260819', '20260825', '20260826']),
  fetchLeagueEvents('uefa.champions', [
    '20260908','20260909','20260910','20261013','20261014','20261020','20261021',
    '20261103','20261104','20261124','20261125','20261208','20261209','20270119','20270120','20270127'
  ]),
  fetchLeagueEvents('esp.1'),
  fetchLeagueEvents('eng.1'),
  fetchLeagueEvents('ger.1')
]);

console.log(`📊 Conteos: UCL PO=${uclQualRaw.length}, UCL Liga=${uclLeagueRaw.length}, LaLiga=${laligaRaw.length}, Premier=${premierRaw.length}, Bundesliga=${bundesligaRaw.length}`);

if (uclLeagueRaw.length !== 144) throw new Error(`UCL Fase Liga esperado 144, llegaron ${uclLeagueRaw.length}`);
if (laligaRaw.length !== 380) throw new Error(`LaLiga esperado 380, llegaron ${laligaRaw.length}`);
if (premierRaw.length !== 380) throw new Error(`Premier esperado 380, llegaron ${premierRaw.length}`);
if (bundesligaRaw.length !== 306) throw new Error(`Bundesliga esperado 306, llegaron ${bundesligaRaw.length}`);

const resultadosIniciales = {};
for (const [pid, res] of Object.entries(OLD_FIXTURE.resultadosIniciales || {})) {
  if (pid.startsWith('bp-') || pid.startsWith('lib-') || pid.startsWith('sud-')) {
    resultadosIniciales[pid] = res;
  }
}

function enrichWithApiFootball(obj) {
  const hit = apiFootballMap.get(`${obj.competicion}:${obj.local}:${obj.visitante}`);
  if (!hit) return obj;
  if (hit.apiId) obj.apiId = hit.apiId;
  if (hit.utc) Object.assign(obj, formatBogota(hit.utc));
  if (hit.estadio) obj.estadio = hit.estadio;
  if (['FT', 'AET', 'PEN'].includes(hit.short) && hit.gl !== null && hit.gv !== null) {
    obj.estado = 'finalizado';
    obj.resultado = { gl: Number(hit.gl), gv: Number(hit.gv), estado: 'finalizado' };
  }
  return obj;
}
const uclMatches = [];

uclQualRaw.map(parseEvent).forEach((m, i) => {
  const id = `ucl-po-${String(i + 1).padStart(2, '0')}`;
  const obj = enrichWithApiFootball({
    id, competicion: 'ucl', etapa: 'Champions League · Play-off Previo', fase: 'playoff',
    local: m.local, visitante: m.visitante, fecha: m.fecha, fechaStr: m.fechaStr, horaStr: m.horaStr,
    utc: m.utc, estadio: m.estadio, estado: m.estado, horaOk: true,
    ...(m.resultado ? { resultado: m.resultado } : {})
  });
  if (obj.resultado) resultadosIniciales[id] = obj.resultado;
  uclMatches.push(obj);
});

const uclParsedLiga = uclLeagueRaw.map(parseEvent);
for (let j = 1; j <= 8; j++) {
  uclParsedLiga.slice((j - 1) * 18, j * 18).forEach((m, idx) => {
    const id = `ucl-j${String(j).padStart(2, '0')}-${String(idx + 1).padStart(2, '0')}`;
    const obj = enrichWithApiFootball({
      id, competicion: 'ucl', jornada: j, etapa: `Champions League · Jornada ${j}`, fase: 'liga',
      local: m.local, visitante: m.visitante, fecha: m.fecha, fechaStr: m.fechaStr, horaStr: m.horaStr,
      utc: m.utc, estadio: m.estadio, estado: m.estado, horaOk: true,
      ...(m.resultado ? { resultado: m.resultado } : {})
    });
    if (obj.resultado) resultadosIniciales[id] = obj.resultado;
    uclMatches.push(obj);
  });
}

const oldUclKo = OLD_FIXTURE.partidos
  .filter(p => p.competicion === 'ucl' && p.fase === 'eliminatoria')
  .map(p => {
    const clean = { ...p };
    delete clean.jornada;
    delete clean.resultado;
    return clean;
  });
uclMatches.push(...oldUclKo);

const KNOWN_API_IDS = {
  'laliga:ath:esp': 1570454, 'laliga:ala:dep': 1570453, 'laliga:ray:val': 1570460,
  'laliga:sev:bet': 1570462, 'laliga:rma:cel': 1570461,
  'premier:mci:ful': 1557474, 'premier:avl:sun': 1557467, 'premier:bou:nfo': 1557468,
  'premier:che:lee': 1557470, 'premier:cov:cry': 1557471, 'premier:tot:ips': 1557476, 'premier:new:ars': 1557475,
  'bundesliga:bay:koe': 1575221, 'bundesliga:lev:pad': 1575222, 'bundesliga:sge:tsg': 1575223,
  'bundesliga:fcu:rbl': 1575225, 'bundesliga:bmg:bvb': 1575226, 'bundesliga:s04:vfb': 1575228, 'bundesliga:sve:scf': 1575229
};

function buildDomestic(comp, labelPrefix, rawList, totalJ, perJ, idBuilder) {
  const rounds = assignDomesticJornadas(rawList.map(parseEvent), totalJ, perJ);
  const out = [];
  let seq = 1;
  for (const rd of rounds) {
    rd.matches.forEach((m, idx) => {
      const id = idBuilder(rd.jornada, idx + 1, seq++);
      const preId = KNOWN_API_IDS[`${comp}:${m.local}:${m.visitante}`];
      const obj = enrichWithApiFootball({
        id, competicion: comp, jornada: rd.jornada, etapa: `${labelPrefix} · Jornada ${rd.jornada}`, fase: 'liga',
        local: m.local, visitante: m.visitante, fecha: m.fecha, fechaStr: m.fechaStr, horaStr: m.horaStr,
        utc: m.utc, estadio: m.estadio, estado: m.estado, horaOk: true,
        ...(preId ? { apiId: preId } : {}),
        ...(m.resultado ? { resultado: m.resultado } : {})
      });
      if (obj.resultado) resultadosIniciales[id] = obj.resultado;
      out.push(obj);
    });
  }
  return out;
}
const laligaMatches = buildDomestic('laliga', 'LaLiga', laligaRaw, 38, 10, (j, i) => `ll-j${String(j).padStart(2, '0')}-${String(i).padStart(2, '0')}`);
const premierMatches = buildDomestic('premier', 'Premier League', premierRaw, 38, 10, (_j, _i, s) => `pl-${String(s).padStart(3, '0')}`);
const bundesligaMatches = buildDomestic('bundesliga', 'Bundesliga', bundesligaRaw, 34, 9, (j, i) => `bun-j${String(j).padStart(2, '0')}-${String(i).padStart(2, '0')}`);

const betplayMatches = OLD_FIXTURE.partidos.filter(p => p.competicion === 'betplay');
const libertadoresMatches = OLD_FIXTURE.partidos.filter(p => p.competicion === 'libertadores');
const sudamericanaMatches = OLD_FIXTURE.partidos.filter(p => p.competicion === 'sudamericana');

for (const [name, list] of [
  ['UCL Liga', uclMatches.filter(p => p.fase === 'liga')],
  ['LaLiga', laligaMatches],
  ['Premier', premierMatches],
  ['Bundesliga', bundesligaMatches]
]) {
  const seenPairs = new Set();
  for (const p of list) {
    if (p.local === p.visitante) throw new Error(`Equipo contra sí mismo en ${name}: ${p.id}`);
    const pair = `${p.local}__${p.visitante}`;
    if (seenPairs.has(pair)) throw new Error(`Cruce duplicado en ${name}: ${pair} (${p.id})`);
    seenPairs.add(pair);
  }
}

const ALL_PARTIDOS = [
  ...uclMatches, ...betplayMatches, ...laligaMatches,
  ...premierMatches, ...bundesligaMatches, ...libertadoresMatches, ...sudamericanaMatches
];

const output = `/* ============================================================
   SCORECAST — FIXTURE Y CATÁLOGO MULTICOMPETICIÓN (TEMPORADA 2026/27)
   ============================================================ */

export const COMPETICIONES = ${JSON.stringify(COMPETICIONES, null, 2)};

const EQUIPOS = {
${Object.entries(EQUIPOS).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`).join('\n')}
};

/* ================= PARTIDOS OFICIALES 2026/27 ================= */
const PARTIDOS = [
${ALL_PARTIDOS.map(p => `  ${JSON.stringify(p)},`).join('\n')}
];

export const RESULTADOS_INICIALES = {
${Object.entries(resultadosIniciales).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`).join('\n')}
};

const FIXTURE = {
  competiciones: COMPETICIONES,
  equipos: EQUIPOS,
  grupos: ${JSON.stringify(OLD_FIXTURE.grupos, null, 2)},
  gruposLibertadores: ${JSON.stringify(OLD_FIXTURE.gruposLibertadores, null, 2)},
  gruposSudamericana: ${JSON.stringify(OLD_FIXTURE.gruposSudamericana, null, 2)},
  partidos: PARTIDOS,
  resultadosIniciales: RESULTADOS_INICIALES,

  equipo(c) {
    const e = EQUIPOS[c];
    if (!e) return { n: c || 'Por definir', b: '⚽', g: '', comp: '' };
    const src = e.escudo || (typeof e.b === 'string' && (e.b.includes('/') || e.b.endsWith('.png') || e.b.endsWith('.svg')) ? e.b : null);
    const b = src
      ? \`<img src="\${src}" class="escudo-img" alt="\${e.n}" data-equipo="\${c}" title="Ver perfil de \${e.n}" loading="lazy" onerror="this.onerror=null;this.outerHTML='⚽'">\`
      : (e.b || '⚽');
    return { ...e, b, escudoSrc: src, code: c };
  },

  porId(id) { return this.partidos.find(p => p.id === id); },
  porCompeticion(compId) { return this.partidos.filter(p => p.competicion === compId); },
  porFecha(jornada) { return this.partidos.filter(p => p.jornada === Number(jornada)); }
};

if (typeof window !== 'undefined') window.FIXTURE = FIXTURE;
if (typeof globalThis !== 'undefined') globalThis.FIXTURE = FIXTURE;
export { FIXTURE };
`;

fs.writeFileSync(path.join(ROOT, 'scorecast', 'js', 'fixture.js'), output, 'utf8');
console.log(`✅ Regenerado scorecast/js/fixture.js -> Total=${ALL_PARTIDOS.length} (UCL=${uclMatches.length}, LaLiga=${laligaMatches.length}, Premier=${premierMatches.length}, Bundesliga=${bundesligaMatches.length}, BetPlay=${betplayMatches.length}, Lib=${libertadoresMatches.length}, Sud=${sudamericanaMatches.length}) | ResultadosIniciales=${Object.keys(resultadosIniciales).length}`);

