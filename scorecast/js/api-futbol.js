/* ============================================================
   SCORECAST — RESULTADOS EN VIVO (API-Football v3)
   ------------------------------------------------------------
   Arquitectura optimizada para Plan Gratuito (100 req/día) y Pro:
   • Filtrado estricto a las 7 competiciones oficiales de ScoreCast
     (BetPlay 239, Premier 39, LaLiga 140, Bundesliga 78,
      Champions 2, Libertadores 13, Sudamericana 11).
   • Sincronización EN VIVO con `/fixtures?live=all` (1 sola petición
     para las 7 ligas simultáneamente) + captura automática de pitazo
     final (FT) cuando un partido sale de `live=all`.
   • Sincronización por fecha con `timezone` local del usuario
     (ej. America/Bogota) para no partir jornadas nocturnas en UTC.
   • Emparejamiento en 4 niveles (apiId → par+competición ±96h →
     reprogramado ±30d → llave TBD).
   • Bloqueo distribuido en Cloud Firestore (`sincronizacion/live`):
     una sola petición actualiza a todos los participantes en vivo.
   ============================================================ */

const _cfg = () => (typeof window !== 'undefined' && window.CONFIG) || globalThis.CONFIG || {};
const _fix = () => (typeof window !== 'undefined' && window.FIXTURE) || globalThis.FIXTURE || { equipos: {}, partidos: [] };
const _store = () => (typeof window !== 'undefined' && window.Store) || globalThis.Store || null;
const _puntos = () => (typeof window !== 'undefined' && window.Puntos) || globalThis.Puntos || null;

const ApiFutbol = {

  /* IDs oficiales de liga en API-Football para las 7 competiciones */
  LEAGUE_IDS: {
    bundesliga:   78,
    premier:      39,
    laliga:       140,
    betplay:      239,
    ucl:          2,
    libertadores: 13,
    sudamericana: 11
  },

  LEAGUE_ID_TO_COMP: {
    78:  'bundesliga',
    39:  'premier',
    140: 'laliga',
    239: 'betplay',
    2:   'ucl',
    13:  'libertadores',
    11:  'sudamericana'
  },

  COMP_NOMBRES: {
    betplay:      'Liga BetPlay',
    premier:      'Premier League',
    laliga:       'LaLiga',
    bundesliga:   'Bundesliga',
    ucl:          'Champions League',
    libertadores: 'Copa Libertadores',
    sudamericana: 'Copa Sudamericana'
  },

  /* Temporada activa oficial 2026-2027 */
  SEASON_ACTIVA: 2026,

  _estadoCuenta: {
    usuario: '',
    correo: '',
    plan: 'Free',
    peticionesHoy: null,
    limiteDiario: 100,
    consultadoAt: 0
  },

  _equiposPorCompCache: null,
  _lineupsIntentadosAt: {},
  _detallesConsultadosAt: {},
  _inflightDetalles: {},
  _cacheFechaDia: {},
  _timestampsMinuto: [],
  _colaReq: Promise.resolve(),
  _ultimoError: null,
  _adminCicloActivo: false,

  disponible() {
    const cfg = _cfg();
    return !!((cfg.API_FUTBOL?.apiKey || '').trim() || (cfg.API_FUTBOL?.proxyUrl || '').trim());
  },

  ultimoError() {
    return this._ultimoError;
  },

  esPlanGratis() {
    return (this._estadoCuenta?.limiteDiario ?? 100) <= 100;
  },

  cuotaRestante() {
    const st = this._estadoCuenta;
    if (st.peticionesHoy === null || st.peticionesHoy === undefined) return null;
    return Math.max(0, (st.limiteDiario || 100) - st.peticionesHoy);
  },

  /* Ventana exacta de 3 días UTC permitida por API-Football en Plan Free */
  fechasPermitidasPlanFree() {
    const base = Date.now();
    return [-1, 0, 1].map(off => new Date(base + off * 86400000).toISOString().slice(0, 10));
  },

  fechaPermitidaEnPlan(fechaYmd) {
    if (!this.esPlanGratis()) return true;
    return this.fechasPermitidasPlanFree().includes(String(fechaYmd || '').slice(0, 10));
  },

  _tz() {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Bogota';
    } catch {
      return 'America/Bogota';
    }
  },

  fechaLocal(offsetDias = 0) {
    const d = new Date(Date.now() + offsetDias * 86400000);
    try {
      return d.toLocaleDateString('en-CA'); // YYYY-MM-DD en zona horaria local
    } catch {
      return d.toISOString().slice(0, 10);
    }
  },

  /* Respeta el límite de 10 peticiones/minuto del Plan Free sin perder llamadas */
  async _esperarTurnoRateLimit(endpoint) {
    if (endpoint === '/status') return;
    const ejecutarTurno = async () => {
      const ahora = Date.now();
      this._timestampsMinuto = this._timestampsMinuto.filter(t => ahora - t < 62000);
      const topeMin = this.esPlanGratis() ? 8 : 28;
      if (this._timestampsMinuto.length >= topeMin) {
        const masViejo = this._timestampsMinuto[0];
        const esperaMs = Math.max(1200, 62500 - (ahora - masViejo));
        await new Promise(res => setTimeout(res, esperaMs));
      } else if (this._timestampsMinuto.length > 0) {
        const ultimo = this._timestampsMinuto[this._timestampsMinuto.length - 1];
        const gap = Date.now() - ultimo;
        if (gap < 1100) {
          await new Promise(res => setTimeout(res, 1100 - gap));
        }
      }
      this._timestampsMinuto.push(Date.now());
    };
    this._colaReq = this._colaReq.then(ejecutarTurno, ejecutarTurno);
    return this._colaReq;
  },

  /* Despachador central de peticiones a API-Football (directo con API Key o vía proxy) */
  async _request(endpoint, params = {}) {
    let url;
    const headers = {};
    const cfg = _cfg();
    const apiKey = (cfg.API_FUTBOL?.apiKey || '').trim();
    const proxyUrl = (cfg.API_FUTBOL?.proxyUrl || '').trim();

    if (apiKey) {
      url = new URL('https://v3.football.api-sports.io' + endpoint);
      headers['x-apisports-key'] = apiKey;
    } else if (proxyUrl) {
      url = new URL(proxyUrl.replace(/\/$/, '') + endpoint);
    } else {
      const err = new Error('API_FUTBOL no está configurada (falta apiKey o proxyUrl en js/config.js).');
      this._ultimoError = { at: Date.now(), endpoint, mensaje: err.message };
      throw err;
    }

    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        url.searchParams.set(k, String(v));
      }
    });

    await this._esperarTurnoRateLimit(endpoint);

    let r;
    try {
      r = await fetch(url.toString(), { headers });
    } catch (netErr) {
      const msg = `Error de red o CORS al conectar con API-Football (${endpoint}): ${netErr.message || netErr}`;
      this._ultimoError = { at: Date.now(), endpoint, mensaje: msg };
      throw new Error(msg);
    }

    if (!r.ok) {
      const msg = `API-Football respondió con estado HTTP ${r.status} en ${endpoint}`;
      this._ultimoError = { at: Date.now(), endpoint, mensaje: msg };
      throw new Error(msg);
    }

    // Actualizar contador de cuota si la API expone headers de rate-limit
    try {
      const rem = r.headers.get('x-ratelimit-requests-remaining');
      const lim = r.headers.get('x-ratelimit-requests-limit');
      if (lim !== null && !isNaN(Number(lim))) {
        this._estadoCuenta.limiteDiario = Number(lim);
      }
      if (rem !== null && !isNaN(Number(rem))) {
        this._estadoCuenta.peticionesHoy = Math.max(0, (this._estadoCuenta.limiteDiario || 100) - Number(rem));
        this._estadoCuenta.consultadoAt = Date.now();
      } else if (endpoint !== '/status' && this._estadoCuenta.peticionesHoy !== null) {
        this._estadoCuenta.peticionesHoy += 1;
      }
    } catch { /* headers opcionales */ }

    const data = await r.json();
    if (data.errors && !Array.isArray(data.errors) && Object.keys(data.errors).length > 0) {
      const detalle = Object.entries(data.errors).map(([k, v]) => `[${k}] ${v}`).join(' · ');
      const msg = 'API-Football: ' + detalle;
      this._ultimoError = { at: Date.now(), endpoint, codigo: Object.keys(data.errors)[0], mensaje: msg };
      throw new Error(msg);
    }
    this._ultimoError = null;
    return data;
  },

  /* Verifica estado de la cuenta, plan y consumo diario (0 peticiones de cuota) */
  async verificarEstado() {
    if (!this.disponible()) return { ok: false, mensaje: 'API no configurada' };
    try {
      const data = await this._request('/status');
      const resp = data.response;
      if (resp && resp.account) {
        const info = {
          ok: true,
          usuario: `${resp.account.firstname || ''} ${resp.account.lastname || ''}`.trim(),
          correo: resp.account.email || '',
          plan: resp.subscription?.plan || 'Free',
          peticionesHoy: resp.requests?.current ?? 0,
          limiteDiario: resp.requests?.limit_day ?? 100
        };
        this._estadoCuenta = { ...info, consultadoAt: Date.now() };
        return info;
      }
      return { ok: true, data: resp };
    } catch (err) {
      return { ok: false, error: err.message || String(err) };
    }
  },

  async _refrescarCuotaSiVieja(maxEdadMs = 10 * 60000) {
    if (Date.now() - (this._estadoCuenta.consultadoAt || 0) > maxEdadMs) {
      await this.verificarEstado();
    }
  },

  /* Normalizador de nombres de equipo para comparación tolerante */
  _sinTildes(str) {
    return String(str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  },

  _norm(str) {
    return this._sinTildes(str)
      .replace(/\b(fc|cf|cd|afc|sc|sv|vfb|tsg|rc|rcd|ca|ac|as|sl|ss|fk|gnk|bsc|sk|ud|ec|ceif|de|la|el|club|f\.c\.|c\.f\.|deportivo|atletico|real|sporting|independiente)\b/g, ' ')
      .replace(/[^a-z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  },

  /* Alias específicos por competición para evitar colisiones entre países */
  _aliasPorComp: {
    betplay: {
      'internacional': 'int_bog',
      'internacional de bogota': 'int_bog',
      'inter bogota': 'int_bog',
      'la equidad': 'int_bog',
      'equidad': 'int_bog',
      'fortaleza': 'for',
      'fortaleza fc': 'for',
      'fortaleza ceif': 'for',
      'nacional': 'nal',
      'atletico nacional': 'nal',
      'alianza': 'ali',
      'alianza fc': 'ali',
      'alianza petrolera': 'ali'
    },
    premier: {
      'everton': 'eve',
      'everton fc': 'eve',
      'liverpool': 'liv',
      'liverpool fc': 'liv'
    },
    laliga: {
      'barcelona': 'bar',
      'fc barcelona': 'bar',
      'racing': 'rac_s',
      'racing santander': 'rac_s',
      'racing de santander': 'rac_s',
      'deportivo': 'dep',
      'deportivo la coruna': 'dep',
      'rc deportivo': 'dep'
    },
    ucl: {
      'barcelona': 'bar',
      'fc barcelona': 'bar',
      'liverpool': 'liv',
      'liverpool fc': 'liv',
      'arsenal': 'ars',
      'arsenal fc': 'ars',
      'aston villa': 'avl',
      'manchester city': 'mci',
      'manchester united': 'mun',
      'real madrid': 'rma',
      'atletico madrid': 'atm',
      'atletico de madrid': 'atm',
      'real betis': 'bet',
      'villarreal': 'vil',
      'villarreal cf': 'vil',
      'bayern munich': 'bay',
      'bayern munchen': 'bay',
      'fc bayern munich': 'bay',
      'borussia dortmund': 'bvb',
      'rb leipzig': 'rbl',
      'vfb stuttgart': 'vfb',
      'inter': 'int',
      'internazionale': 'int',
      'inter milan': 'int',
      'as roma': 'rom',
      'roma': 'rom',
      'napoli': 'nap',
      'ssc napoli': 'nap',
      'como': 'com',
      'como 1907': 'com',
      'fc porto': 'por',
      'porto': 'por',
      'sporting cp': 'spo',
      'sporting': 'spo',
      'feyenoord': 'fey',
      'feyenoord rotterdam': 'fey',
      'psv': 'psv',
      'psv eindhoven': 'psv',
      'paris saint germain': 'psg',
      'paris saint-germain': 'psg',
      'lille': 'lil',
      'losc lille': 'lil',
      'lens': 'len',
      'rc lens': 'len',
      'club brugge': 'bru',
      'club brugge kv': 'bru',
      'galatasaray': 'gal',
      'fenerbahce': 'fen',
      'shakhtar donetsk': 'sha',
      'shakhtar': 'sha',
      'slavia praha': 'sla',
      'slavia prague': 'sla',
      'slovan bratislava': 'svb',
      'bodo/glimt': 'bod',
      'bodo glimt': 'bod',
      'viking': 'vik',
      'viking fk': 'vik',
      'lask': 'lsk',
      'lask linz': 'lsk',
      'aek athens': 'aek',
      'aek athens fc': 'aek',
      'sabah': 'sab',
      'sabah fa': 'sab',
      'sabah fk': 'sab',
      'lyon': 'lyo',
      'olympique lyonnais': 'lyo',
      'levski sofia': 'lev_sof',
      'hapoel beer sheva': 'hbs',
      "hapoel be'er sheva": 'hbs',
      'nec nijmegen': 'nec',
      'nk celje': 'cel_svn',
      'celje': 'cel_svn'
    },
    libertadores: {
      'barcelona': 'bsc',
      'barcelona sc': 'bsc',
      'barcelona guayaquil': 'bsc',
      'nacional': 'nac_uru',
      'club nacional': 'nac_uru',
      'nacional de football': 'nac_uru',
      'nacional asuncion': 'nac_par',
      'alianza': 'ali_lim',
      'alianza lima': 'ali_lim',
      'liverpool': 'liv_uru',
      'liverpool montevideo': 'liv_uru',
      'liverpool fc montevideo': 'liv_uru',
      'universidad catolica': 'ucat_chi'
    },
    sudamericana: {
      'everton': 'eve_chi',
      'everton de vina': 'eve_chi',
      'fortaleza': 'cruz',
      'fortaleza ec': 'cruz',
      'internacional': 'inter_rs',
      'sc internacional': 'inter_rs',
      'racing': 'rac',
      'racing club': 'rac',
      'racing montevideo': 'rac_mvd',
      'barcelona': 'bsc',
      'barcelona sc': 'bsc',
      'nacional': 'nac_par',
      'nacional asuncion': 'nac_par',
      'nacional potosi': 'npo',
      'alianza': 'ali',
      'alianza fc': 'ali',
      'universidad catolica': 'ucat_chi',
      'u. catolica': 'ucat_chi',
      'universidad catolica (ecu)': 'ucat_ecu',
      'universidad catolica quito': 'ucat_ecu'
    }
  },

  /* Alias globales API-Football → código interno en FIXTURE.equipos (100% validados) */
  _alias: {
    // Premier League 2026/27
    'arsenal': 'ars', 'arsenal fc': 'ars',
    'chelsea': 'che', 'chelsea fc': 'che',
    'liverpool': 'liv', 'liverpool fc': 'liv',
    'manchester city': 'mci', 'man city': 'mci',
    'manchester united': 'mun', 'man united': 'mun',
    'tottenham': 'tot', 'tottenham hotspur': 'tot', 'spurs': 'tot',
    'newcastle': 'new', 'newcastle united': 'new',
    'aston villa': 'avl',
    'brighton': 'bha', 'brighton & hove': 'bha', 'brighton & hove albion': 'bha', 'brighton and hove albion': 'bha',
    'brentford': 'bre', 'brentford fc': 'bre',
    'crystal palace': 'cry',
    'fulham': 'ful', 'fulham fc': 'ful',
    'bournemouth': 'bou', 'afc bournemouth': 'bou',
    'everton': 'eve', 'everton fc': 'eve',
    'ipswich': 'ips', 'ipswich town': 'ips',
    'nottingham forest': 'nfo', "nott'm forest": 'nfo',
    'coventry': 'cov', 'coventry city': 'cov',
    'hull city': 'hul', 'hull': 'hul',
    'sunderland': 'sun', 'sunderland afc': 'sun',
    'leeds': 'lee', 'leeds united': 'lee',

    // LaLiga 2026/27
    'real madrid': 'rma',
    'barcelona': 'bar', 'fc barcelona': 'bar',
    'atletico madrid': 'atm', 'atletico de madrid': 'atm',
    'athletic club': 'ath', 'athletic bilbao': 'ath',
    'real sociedad': 'rso',
    'real betis': 'bet', 'betis': 'bet',
    'villarreal': 'vil', 'villarreal cf': 'vil',
    'sevilla': 'sev', 'sevilla fc': 'sev',
    'celta vigo': 'cel', 'celta de vigo': 'cel', 'rc celta': 'cel',
    'osasuna': 'osa', 'ca osasuna': 'osa',
    'alaves': 'ala', 'deportivo alaves': 'ala',
    'rayo vallecano': 'ray',
    'espanyol': 'esp', 'rcd espanyol': 'esp',
    'valencia': 'val', 'valencia cf': 'val',
    'getafe': 'get', 'getafe cf': 'get',
    'racing santander': 'rac_s', 'racing de santander': 'rac_s',
    'deportivo': 'dep', 'deportivo la coruna': 'dep', 'rc deportivo': 'dep', 'deportivo de la coruna': 'dep',
    'malaga': 'mal_cf', 'malaga cf': 'mal_cf',
    'elche': 'elc', 'elche cf': 'elc',
    'levante': 'lev_ud', 'levante ud': 'lev_ud',

    // Bundesliga 2026/27
    'bayern munich': 'bay', 'bayern munchen': 'bay', 'fc bayern munich': 'bay', 'fc bayern munchen': 'bay',
    'borussia dortmund': 'bvb', 'bvb dortmund': 'bvb',
    'bayer leverkusen': 'lev', 'leverkusen': 'lev',
    'rb leipzig': 'rbl', 'leipzig': 'rbl',
    'vfb stuttgart': 'vfb', 'stuttgart': 'vfb',
    'eintracht frankfurt': 'sge', 'frankfurt': 'sge',
    'hoffenheim': 'tsg', 'tsg hoffenheim': 'tsg', '1899 hoffenheim': 'tsg', 'tsg 1899 hoffenheim': 'tsg',
    'werder bremen': 'svw', 'bremen': 'svw', 'sv werder bremen': 'svw',
    'augsburg': 'fca', 'fc augsburg': 'fca',
    'borussia monchengladbach': 'bmg', 'monchengladbach': 'bmg', 'gladbach': 'bmg', "borussia m'gladbach": 'bmg',
    'union berlin': 'fcu', '1. fc union berlin': 'fcu',
    'mainz 05': 'm05', 'fsv mainz 05': 'm05', '1. fsv mainz 05': 'm05', 'mainz': 'm05',
    'schalke 04': 's04', 'fc schalke 04': 's04', 'schalke': 's04',
    'sv elversberg': 'sve', 'elversberg': 'sve', 'sv 07 elversberg': 'sve',
    'sc paderborn': 'pad', 'sc paderborn 07': 'pad', 'paderborn': 'pad',
    '1. fc koln': 'koe', 'fc koln': 'koe', 'koln': 'koe', '1.fc koln': 'koe',
    'hamburger sv': 'hsv', 'hamburg': 'hsv', 'hsv': 'hsv',
    'sc freiburg': 'scf', 'freiburg': 'scf',

    // UEFA Champions League 2026/27
    'paris saint germain': 'psg', 'paris saint-germain': 'psg', 'paris sg': 'psg', 'psg': 'psg',
    'inter': 'int', 'inter milan': 'int', 'inter de milan': 'int', 'internazionale': 'int',
    'juventus': 'juv', 'juve': 'juv',
    'ac milan': 'acm', 'milan': 'acm',
    'atalanta': 'ata', 'atalanta bc': 'ata',
    'bologna': 'bbo', 'bologna fc': 'bbo',
    'benfica': 'ben', 'sl benfica': 'ben',
    'sporting cp': 'spo', 'sporting lisbon': 'spo', 'sporting': 'spo',
    'psv': 'psv', 'psv eindhoven': 'psv',
    'feyenoord': 'fey', 'feyenoord rotterdam': 'fey',
    'celtic': 'clt', 'celtic fc': 'clt',
    'monaco': 'asm', 'as monaco': 'asm',
    'lille': 'lil', 'losc lille': 'lil', 'lille osc': 'lil',
    'brest': 'sbr', 'stade brestois': 'sbr', 'stade brestois 29': 'sbr',
    'salzburg': 'sal', 'red bull salzburg': 'sal', 'fc salzburg': 'sal',
    'club brugge': 'bru', 'club brugge kv': 'bru',
    'dinamo zagreb': 'dzg', 'gnk dinamo zagreb': 'dzg',
    'crvena zvezda': 'crv', 'fk crvena zvezda': 'crv', 'red star': 'crv', 'red star belgrade': 'crv',
    'sparta prague': 'spa', 'sparta praha': 'spa', 'ac sparta praha': 'spa',
    'slovan bratislava': 'svb', 'sk slovan bratislava': 'svb',
    'sturm graz': 'stg', 'sk sturm graz': 'stg',
    'young boys': 'ybo', 'bsc young boys': 'ybo',
    'galatasaray': 'gal', 'galatasaray sk': 'gal',
    'slavia praha': 'sla', 'slavia prague': 'sla', 'sk slavia praha': 'sla',
    'qarabag': 'qar', 'qarabag fk': 'qar',
    'bodo/glimt': 'bod', 'bodo glimt': 'bod', 'fk bodo/glimt': 'bod',
    'malmo ff': 'mal', 'malmo': 'mal',
    'midtjylland': 'fcm', 'fc midtjylland': 'fcm',
    'dynamo kyiv': 'dyn', 'dynamo kiev': 'dyn',
    'girona': 'gir', 'girona fc': 'gir',
    'as roma': 'rom', 'roma': 'rom',
    'napoli': 'nap', 'ssc napoli': 'nap',
    'como': 'com', 'como 1907': 'com',
    'fc porto': 'por', 'porto': 'por',
    'lens': 'len', 'rc lens': 'len',
    'fenerbahce': 'fen', 'fenerbahce sk': 'fen',
    'shakhtar donetsk': 'sha', 'shakhtar': 'sha', 'fc shakhtar donetsk': 'sha',
    'viking': 'vik', 'viking fk': 'vik',
    'lask': 'lsk', 'lask linz': 'lsk',
    'aek athens': 'aek', 'aek athens fc': 'aek',
    'sabah': 'sab', 'sabah fa': 'sab', 'sabah fk': 'sab',
    'lyon': 'lyo', 'olympique lyonnais': 'lyo',
    'levski sofia': 'lev_sof', 'pfc levski sofia': 'lev_sof',
    'hapoel beer sheva': 'hbs', "hapoel be'er sheva": 'hbs',
    'nec nijmegen': 'nec', 'nec': 'nec',
    'nk celje': 'cel_svn', 'celje': 'cel_svn',

    // Liga BetPlay Dimayor 2026 (Colombia)
    'millonarios': 'mfc', 'millonarios fc': 'mfc',
    'santa fe': 'sfe', 'independiente santa fe': 'sfe',
    'atletico nacional': 'nal', 'nacional medellin': 'nal',
    'america de cali': 'ame', 'america': 'ame',
    'junior': 'jun', 'junior fc': 'jun', 'junior de barranquilla': 'jun', 'atletico junior': 'jun',
    'deportivo cali': 'cal', 'cali': 'cal',
    'independiente medellin': 'dim', 'medellin': 'dim',
    'deportes tolima': 'tol', 'tolima': 'tol',
    'once caldas': 'onc',
    'deportivo pereira': 'per', 'pereira': 'per',
    'atletico bucaramanga': 'buc', 'bucaramanga': 'buc',
    'deportivo pasto': 'pas', 'pasto': 'pas',
    'aguilas doradas': 'agu', 'aguilas': 'agu', 'rionegro aguilas': 'agu',
    'internacional de bogota': 'int_bog', 'inter bogota': 'int_bog', 'la equidad': 'int_bog', 'equidad': 'int_bog',
    'fortaleza ceif': 'for', 'fortaleza fc': 'for',
    'boyaca chico': 'chi', 'chico': 'chi',
    'alianza': 'ali', 'alianza fc': 'ali', 'alianza petrolera': 'ali', 'alianza valledupar': 'ali',
    'jaguares de cordoba': 'jag', 'jaguares': 'jag',
    'llaneros': 'lla', 'llaneros fc': 'lla',
    'cucuta deportivo': 'cuc', 'cucuta': 'cuc',

    // CONMEBOL Libertadores & Sudamericana 2026
    'boca juniors': 'cabj', 'boca': 'cabj',
    'river plate': 'riv', 'river': 'riv',
    'racing club': 'rac',
    'estudiantes l.p.': 'elp', 'estudiantes lp': 'elp', 'estudiantes de la plata': 'elp', 'estudiantes': 'elp',
    'rosario central': 'cen',
    'san lorenzo': 'slo',
    'talleres cordoba': 'tal', 'talleres de cordoba': 'tal', 'talleres': 'tal',
    'lanus': 'lan', 'ca lanus': 'lan',
    'defensa y justicia': 'dyj',
    'belgrano': 'bel', 'belgrano cordoba': 'bel',
    'argentinos jrs': 'arg_jrs', 'argentinos juniors': 'arg_jrs',
    'godoy cruz': 'gcy',
    'platense': 'pla',
    'independiente rivadavia': 'irm',
    'tigre': 'tig',
    'flamengo': 'fla', 'cr flamengo': 'fla',
    'palmeiras': 'pal', 'se palmeiras': 'pal',
    'fluminense': 'flu',
    'sao paulo': 'sao', 'sao paulo fc': 'sao',
    'gremio': 'gre',
    'atletico-mg': 'cam', 'atletico mg': 'cam', 'atletico mineiro': 'cam', 'clube atletico mineiro': 'cam',
    'botafogo': 'bot', 'botafogo rj': 'bot',
    'corinthians': 'cor', 'sc corinthians': 'cor',
    'vasco da gama': 'vas', 'vasco': 'vas',
    'cruzeiro': 'cru',
    'internacional': 'inter_rs', 'sc internacional': 'inter_rs',
    'athletico-pr': 'cap', 'atletico-pr': 'cap', 'athletico paranaense': 'cap',
    'red bull bragantino': 'bra', 'rb bragantino': 'bra', 'bragantino': 'bra',
    'fortaleza ec': 'cruz',
    'cuiaba': 'cui', 'cuiaba ec': 'cui',
    'santos': 'san_br', 'santos fc': 'san_br',
    'mirassol': 'mir',
    'ldu quito': 'ldu', 'ldu de quito': 'ldu', 'ldu': 'ldu', 'liga de quito': 'ldu',
    'independiente del valle': 'idv',
    'barcelona sc': 'bsc', 'barcelona guayaquil': 'bsc',
    'el nacional': 'el_nac',
    'aucas': 'auc',
    'deportivo cuenca': 'cue',
    'delfin sc': 'delf', 'delfin': 'delf',
    'tecnico universitario': 'tec_uni',
    'macara': 'mcr',
    'penarol': 'pen', 'ca penarol': 'pen',
    'nacional uruguay': 'nac_uru', 'club nacional': 'nac_uru',
    'defensor sporting': 'def_spo',
    'liverpool montevideo': 'liv_uru',
    'montevideo wanderers': 'mvd_wan',
    'danubio': 'dan',
    'racing montevideo': 'rac_mvd',
    'cerro largo': 'cer_lar',
    'montevideo city torque': 'tor',
    'olimpia': 'oli', 'club olimpia': 'oli',
    'cerro porteno': 'ccp',
    'libertad': 'lib_par', 'libertad asuncion': 'lib_par',
    'guarani': 'gua',
    'sportivo luqueno': 'luq',
    'sportivo ameliano': 'ame_par',
    'sportivo trinidense': 'trin',
    'nacional asuncion': 'nac_par',
    'recoleta': 'rec', 'recoleta fc': 'rec',
    'colo colo': 'col_chi', 'colo-colo': 'col_chi',
    'palestino': 'pal_chi',
    'huachipato': 'huac',
    'cobresal': 'cob',
    'coquimbo unido': 'coq',
    'union la calera': 'calera',
    'bolivar': 'bol', 'club bolivar': 'bol',
    'the strongest': 'the_str',
    'always ready': 'car',
    'aurora': 'aur',
    'nacional potosi': 'npo',
    'jorge wilstermann': 'wils',
    'real tomayapo': 'tom',
    'universitario de vinto': 'uni_vin',
    'universitario': 'uni_per', 'universitario de deportes': 'uni_per',
    'alianza lima': 'ali_lim',
    'sporting cristal': 'cri',
    'melgar': 'mel', 'fbc melgar': 'mel',
    'deportivo garcilaso': 'dgar',
    'adt tarma': 'adt',
    'cesar vallejo': 'ucv_per', 'universidad cesar vallejo': 'ucv_per',
    'sport huancayo': 'shu',
    'cienciano': 'cie',
    'deportivo tachira': 'tac',
    'caracas fc': 'car_fc', 'caracas': 'car_fc',
    'carabobo': 'cbb', 'carabobo fc': 'cbb',
    'metropolitanos': 'met', 'metropolitanos fc': 'met',
    'rayo zuliano': 'ray_zul',
    'deportivo la guaira': 'dlg',
    'academia puerto cabello': 'apc',
    'portuguesa fc': 'por_ven'
  },

  _equiposDeComp(comp) {
    if (!comp) return null;
    if (!this._equiposPorCompCache) {
      const mapa = {};
      for (const p of (_fix().partidos || [])) {
        if (!p.competicion) continue;
        if (!mapa[p.competicion]) mapa[p.competicion] = new Set();
        if (p.local) mapa[p.competicion].add(p.local);
        if (p.visitante) mapa[p.competicion].add(p.visitante);
      }
      this._equiposPorCompCache = mapa;
    }
    return this._equiposPorCompCache[comp] || null;
  },

  _codigo(nombre, comp = null) {
    if (!nombre) return null;
    const equipos = _fix().equipos || {};
    const nom = String(nombre).toLowerCase().trim();
    const sinT = this._sinTildes(nom);
    const compSet = comp ? this._equiposDeComp(comp) : null;

    // 1. Alias específicos de la competición (resuelve Everton, Fortaleza, Barcelona, Nacional, Racing, Internacional)
    if (comp && this._aliasPorComp[comp]) {
      const cComp = this._aliasPorComp[comp][nom] || this._aliasPorComp[comp][sinT];
      if (cComp && equipos[cComp]) return cComp;
    }

    // 2. Alias global si pertenece a la competición actual (o sin competición)
    const cAlias = this._alias[nom] || this._alias[sinT];
    if (cAlias && equipos[cAlias] && (!compSet || compSet.has(cAlias))) {
      return cAlias;
    }

    const buscarEnPool = (poolKeys) => {
      // 3a. Coincidencia directa exacta
      for (const k of poolKeys) {
        const e = equipos[k];
        if (!e) continue;
        if (e.n.toLowerCase() === nom || this._sinTildes(e.n) === sinT || (e.n_en && this._sinTildes(e.n_en) === sinT)) {
          return k;
        }
      }
      // 3b. Coincidencia normalizada exacta
      const normNom = this._norm(nom);
      if (!normNom) return null;
      for (const k of poolKeys) {
        const e = equipos[k];
        if (!e) continue;
        if (this._norm(e.n) === normNom || (e.n_en && this._norm(e.n_en) === normNom)) return k;
      }
      // 3c. Inclusión segura (mínimo 4 caracteres para evitar falsos positivos)
      if (normNom.length >= 4) {
        for (const k of poolKeys) {
          const e = equipos[k];
          if (!e) continue;
          const normEq = this._norm(e.n);
          if (normEq.length >= 4 && (normEq.includes(normNom) || normNom.includes(normEq))) return k;
        }
      }
      return null;
    };

    // Buscar primero dentro de los equipos de la competición
    if (compSet && compSet.size) {
      const hitComp = buscarEnPool([...compSet]);
      if (hitComp) return hitComp;
    }

    // Fallback al alias global válido (ej. club nuevo en copa)
    if (cAlias && equipos[cAlias]) return cAlias;

    // Fallback global sobre todo el diccionario de equipos
    return buscarEnPool(Object.keys(equipos));
  },

  _estado(corto) {
    if (['1H', '2H', 'HT', 'ET', 'BT', 'P', 'LIVE'].includes(corto)) return 'en_juego';
    if (['FT', 'AET', 'PEN', 'AWD', 'WO'].includes(corto)) return 'finalizado';
    if (['PST', 'SUSP', 'INT', 'CANC', 'ABD'].includes(corto)) return 'aplazado';
    return null;
  },

  _motivoAplazamiento(corto) {
    if (corto === 'PST') return 'Partido pospuesto';
    if (corto === 'SUSP') return 'Partido suspendido';
    if (corto === 'INT') return 'Partido interrumpido';
    if (['CANC', 'ABD'].includes(corto)) return 'Partido cancelado/abandonado';
    return null;
  },

  /* Convierte un fixture crudo de API-Football y filtra a las 7 competiciones */
  _mapFixture(f, filtrarCompeticiones = true) {
    const leagueId = f?.league?.id || null;
    const comp = this.LEAGUE_ID_TO_COMP[leagueId] || null;
    if (filtrarCompeticiones && !comp) return null;

    const homeRaw = f?.teams?.home?.name || '';
    const awayRaw = f?.teams?.away?.name || '';
    const local = this._codigo(homeRaw, comp);
    const visitante = this._codigo(awayRaw, comp);

    return {
      apiId:              f?.fixture?.id || null,
      competicion:        comp,
      leagueId,
      season:             f?.league?.season || this.SEASON_ACTIVA,
      leagueName:         f?.league?.name || (comp ? this.COMP_NOMBRES[comp] : ''),
      round:              f?.league?.round || '',
      homeRaw,
      awayRaw,
      local,
      visitante,
      localApiTeamId:     f?.teams?.home?.id || null,
      visitanteApiTeamId: f?.teams?.away?.id || null,
      utc:                f?.fixture?.date ? new Date(f.fixture.date).toISOString() : null,
      estadio:            f?.fixture?.venue?.name || '',
      sede:               f?.fixture?.venue?.city || '',
      estado:             this._estado(f?.fixture?.status?.short),
      periodo:            f?.fixture?.status?.short || null,
      minuto:             f?.fixture?.status?.elapsed ?? null,
      extra:              f?.fixture?.status?.extra ?? null,
      gl:                 f?.goals?.home ?? null,
      gv:                 f?.goals?.away ?? null,
      penalesHome:        f?.score?.penalty?.home ?? null,
      penalesAway:        f?.score?.penalty?.away ?? null
    };
  },

  /* Trae TODOS los partidos EN VIVO de nuestras 7 ligas en 1 sola petición */
  async traerEnVivoDetallado() {
    if (!this.disponible()) return { totalGlobal: 0, totalNuestrasLigas: 0, partidos: [], sinCodigo: [] };
    const data = await this._request('/fixtures', { live: 'all' });
    const crudos = data.response || [];
    const mapeados = crudos.map(f => this._mapFixture(f, true)).filter(Boolean);
    const partidos = mapeados.filter(x => x.local && x.visitante);
    const sinCodigo = mapeados.filter(x => !x.local || !x.visitante);
    return {
      totalGlobal: crudos.length,
      totalNuestrasLigas: mapeados.length,
      partidos,
      sinCodigo
    };
  },

  async traerEnVivo() {
    try {
      const r = await this.traerEnVivoDetallado();
      return r.partidos;
    } catch (err) {
      console.warn('API traerEnVivo:', err);
      return [];
    }
  },

  /* Trae partidos de una fecha YYYY-MM-DD (zona horaria local del usuario) filtrados a las 7 ligas */
  async traerPartidosDelDiaDetallado(fecha, usarTimezone = true) {
    if (!this.disponible()) return { totalGlobal: 0, totalNuestrasLigas: 0, partidos: [], sinCodigo: [] };
    const params = { date: fecha };
    if (usarTimezone) params.timezone = this._tz();
    const data = await this._request('/fixtures', params);
    const crudos = data.response || [];
    const mapeados = crudos.map(f => this._mapFixture(f, true)).filter(Boolean);
    const partidos = mapeados.filter(x => x.local && x.visitante);
    const sinCodigo = mapeados.filter(x => !x.local || !x.visitante);
    return {
      totalGlobal: crudos.length,
      totalNuestrasLigas: mapeados.length,
      partidos,
      sinCodigo
    };
  },

  async traerPartidosDelDia(fecha) {
    try {
      const r = await this.traerPartidosDelDiaDetallado(fecha, true);
      return r.partidos;
    } catch (err) {
      console.warn('API traerPartidosDelDia:', err);
      return [];
    }
  },

  /* Descarga y normaliza los partidos desde la API para una liga y temporada (requiere plan Pro en 2026). */
  async traerPartidos(leagueId, season = '2026') {
    if (!this.disponible()) throw new Error('API no configurada en js/config.js');
    if (!leagueId) throw new Error('Se requiere un ID de liga (ej: 78 para Bundesliga)');
    try {
      const data = await this._request('/fixtures', { league: String(leagueId), season });
      return (data.response || []).map(f => this._mapFixture(f, false)).filter(x => x && x.local && x.visitante);
    } catch (err) {
      console.warn('API traerPartidos:', err);
      return [];
    }
  },

  _nombreJugadorCorto(raw) {
    const limpio = String(raw || '').trim();
    if (!limpio) return '';
    if (limpio.length <= 18) return limpio;
    const partes = limpio.split(/\s+/);
    if (partes.length === 1) return limpio;
    return `${partes[0][0]}. ${partes.slice(-1)[0]}`;
  },

  _ladoEquipoEvento(teamObj, comp, ctx = {}) {
    const tid = Number(teamObj?.id || 0);
    if (tid && ctx.localApiId && tid === Number(ctx.localApiId)) return 'local';
    if (tid && ctx.visitanteApiId && tid === Number(ctx.visitanteApiId)) return 'visitante';
    const cod = this._codigo(teamObj?.name, comp) || '';
    if (cod && ctx.localCod && cod === ctx.localCod) return 'local';
    if (cod && ctx.visitanteCod && cod === ctx.visitanteCod) return 'visitante';
    return null;
  },

  _parseEventosRaw(rawEvents, comp = null, ctxEquipos = {}) {
    const ape = n => (n || '').trim().split(/\s+/).slice(-1)[0] || '';
    const lista = [];

    for (const ev of (rawEvents || [])) {
      const rawType = String(ev.type || '');
      const typeLow = rawType.toLowerCase();
      const rawDetail = String(ev.detail || '');
      const detLower = rawDetail.toLowerCase();

      let tipo = null, tLegacy = null, subtipo = '';

      if (typeLow === 'goal') {
        if (detLower.includes('missed penalty')) continue;
        tLegacy = 'gol';
        if (detLower.includes('own goal')) { tipo = 'autogol'; subtipo = 'autogol'; }
        else if (detLower.includes('penalty')) { tipo = 'penal'; subtipo = 'penal'; }
        else { tipo = 'gol'; subtipo = detLower.includes('free kick') ? 'tiro_libre' : detLower.includes('header') ? 'cabeza' : 'normal'; }
      } else if (typeLow === 'card') {
        if (detLower.includes('second yellow')) { tipo = 'doble_amarilla'; tLegacy = 'roja'; }
        else if (detLower.includes('red card')) { tipo = 'roja'; tLegacy = 'roja'; }
        else if (detLower.includes('yellow card')) { tipo = 'amarilla'; tLegacy = 'amarilla'; }
      } else if (typeLow === 'subst') {
        tipo = 'cambio'; tLegacy = 'cambio'; subtipo = 'cambio';
      }

      if (!tipo) continue;

      const min = Number(ev.time?.elapsed) || 0;
      const extra = (ev.time?.extra !== undefined && ev.time?.extra !== null && Number(ev.time.extra) > 0)
        ? Number(ev.time.extra) : null;
      const codEq = this._codigo(ev.team?.name, comp) || '';
      const lado = this._ladoEquipoEvento(ev.team, comp, ctxEquipos)
        || (codEq && codEq === ctxEquipos.localCod ? 'local' : codEq && codEq === ctxEquipos.visitanteCod ? 'visitante' : 'local');

      const saleNom = this._nombreJugadorCorto(ev.player?.name) || ape(ev.player?.name) || '';
      const assistNom = ev.assist?.name ? (this._nombreJugadorCorto(ev.assist.name) || ape(ev.assist.name)) : null;
      const jugadorNom = tipo === 'cambio' ? (assistNom || saleNom || 'Cambio') : (saleNom || 'Jugador');
      const asistenciaNom = (tLegacy === 'gol' && assistNom) ? assistNom : null;

      lista.push({
        min, extra, equipo: lado, tipo, jugador: jugadorNom, asistencia: asistenciaNom,
        entra: tipo === 'cambio' ? (assistNom || null) : null,
        sale: tipo === 'cambio' ? (saleNom || null) : null,
        m: min, x: extra,
        eq: lado === 'local' ? (ctxEquipos.localCod || codEq) : (ctxEquipos.visitanteCod || codEq),
        j: ape(ev.player?.name) || jugadorNom, n: String(ev.player?.name || ''),
        a: asistenciaNom, t: tLegacy, subtipo, detail: rawDetail
      });
    }

    lista.sort((a, b) => (a.min - b.min) || ((a.extra || 0) - (b.extra || 0)));
    return lista;
  },

  _parseEstadisticasRaw(rawStats, teamIdMap = {}, comp = null) {
    const res = {};
    (rawStats || []).forEach(eq => {
      const cod = teamIdMap[eq.team?.id] || this._codigo(eq.team?.name, comp) || null;
      if (!cod) return;
      const st = eq.statistics || [];
      const g = t => st.find(s => s.type === t)?.value ?? null;
      res[cod] = {
        amarillas:      g('Yellow Cards') || 0,
        rojas:          g('Red Cards') || 0,
        posesion:       g('Ball Possession'),
        tirosArc:       g('Shots on Goal') ?? 0,
        tirosTot:       g('Total Shots') ?? 0,
        corners:        g('Corner Kicks') ?? 0,
        faltas:         g('Fouls') ?? 0,
        fueras:         g('Offsides') ?? 0,
        precisionPases: g('Passes %'),
        paradas:        g('Goalkeeper Saves') ?? 0
      };
    });
    return res;
  },

  /* Trae goles, tarjetas y cambios normalizados de un partido por su ID de API. */
  async traerEventos(apiFixtureId, comp = null, ctxEquipos = {}) {
    if (!apiFixtureId || !this.disponible()) return [];
    try {
      const data = await this._request('/fixtures/events', { fixture: apiFixtureId });
      return this._parseEventosRaw(data.response || [], comp, ctxEquipos);
    } catch (_) { return []; }
  },

  /* Trae estadísticas y conteo de tarjetas de un partido. */
  async traerTarjetas(apiFixtureId, teamIdMap = {}, comp = null) {
    if (!apiFixtureId || !this.disponible()) return {};
    try {
      const data = await this._request('/fixtures/statistics', { fixture: apiFixtureId });
      return this._parseEstadisticasRaw(data.response || [], teamIdMap, comp);
    } catch (_) { return {}; }
  },

  /* Predicción oficial (probabilidades de victoria, goles esperados). */
  async traerPrediccion(apiFixtureId) {
    if (!apiFixtureId || !this.disponible()) return null;
    try {
      const data = await this._request('/predictions', { fixture: apiFixtureId });
      const p = (data.response || [])[0]?.predictions;
      if (!p) return null;
      return {
        consejo: p.advice || '',
        pct: { l: p.percent?.home || '?%', e: p.percent?.draw || '?%', v: p.percent?.away || '?%' },
        goles: { l: p.goals?.home ?? '-', v: p.goals?.away ?? '-' },
        linea: p.under_over || null
      };
    } catch { return null; }
  },

  _parseAlineacionesRaw(rawLineups, comp = null, ctxEquipos = {}) {
    const resp = rawLineups || [];
    if (resp.length < 2) return null;
    const ord = { G: 0, D: 1, M: 2, F: 3 };
    const mapJug = (arr) => (arr || [])
      .map(item => {
        const pl = item?.player || item || {};
        return {
          num: pl.number ?? '',
          nombre: this._nombreJugadorCorto(pl.name) || String(pl.name || '').trim(),
          pos: String(pl.pos || '').toUpperCase()
        };
      })
      .filter(j => j.nombre)
      .sort((a, b) => (ord[a.pos] ?? 9) - (ord[b.pos] ?? 9));

    const mapEquipo = (eq) => ({
      formacion: String(eq?.formation || '').trim(),
      dt: String(eq?.coach?.name || '').trim(),
      titulares: mapJug(eq?.startXI),
      suplentes: mapJug(eq?.substitutes)
    });

    let idxLocal = resp.findIndex(eq => this._ladoEquipoEvento(eq?.team, comp, ctxEquipos) === 'local');
    let idxVis = resp.findIndex((eq, idx) => idx !== idxLocal && this._ladoEquipoEvento(eq?.team, comp, ctxEquipos) === 'visitante');
    if (idxLocal === -1 && idxVis === 0) idxLocal = 1;
    if (idxLocal === -1 && idxVis === 1) idxLocal = 0;
    if (idxLocal === -1) idxLocal = 0;
    if (idxVis === -1) idxVis = idxLocal === 0 ? 1 : 0;

    const localObj = mapEquipo(resp[idxLocal]);
    const visObj = mapEquipo(resp[idxVis]);
    if (!localObj.titulares.length && !visObj.titulares.length) return null;

    return { local: localObj, visitante: visObj };
  },

  /* Alineaciones públicas normalizadas ({ local, visitante }) */
  async traerAlineaciones(apiFixtureId, comp = null, ctxEquipos = {}) {
    if (!apiFixtureId || !this.disponible()) return null;
    try {
      const data = await this._request('/fixtures/lineups', { fixture: apiFixtureId });
      return this._parseAlineacionesRaw(data.response || [], comp, ctxEquipos);
    } catch { return null; }
  },

  /* Consulta integral 1-en-1 (`/fixtures?id=`) que trae marcador, minuto, alineaciones, eventos y stats en 1 sola petición */
  async traerPartidoCompleto(apiFixtureId, comp = null, ctxEquipos = {}) {
    if (!apiFixtureId || !this.disponible()) return null;
    const data = await this._request('/fixtures', { id: apiFixtureId });
    const f = (data.response || [])[0];
    if (!f) return null;
    const base = this._mapFixture(f, false);
    const compEf = comp || base?.competicion || null;
    const ctx = {
      localCod: ctxEquipos.localCod || base?.local || '',
      visitanteCod: ctxEquipos.visitanteCod || base?.visitante || '',
      localApiId: ctxEquipos.localApiId || base?.localApiTeamId || null,
      visitanteApiId: ctxEquipos.visitanteApiId || base?.visitanteApiTeamId || null
    };
    const teamIdMap = {};
    if (ctx.localApiId && ctx.localCod) teamIdMap[ctx.localApiId] = ctx.localCod;
    if (ctx.visitanteApiId && ctx.visitanteCod) teamIdMap[ctx.visitanteApiId] = ctx.visitanteCod;

    return {
      fixture: base,
      eventos: this._parseEventosRaw(f.events || [], compEf, ctx),
      alineaciones: this._parseAlineacionesRaw(f.lineups || [], compEf, ctx),
      tarjetas: this._parseEstadisticasRaw(f.statistics || [], teamIdMap, compEf)
    };
  },

  async _resolverApiIdPartido(pBase, m, resAnt, inicioMs, ahora) {
    let apiId = Number(m.apiId || resAnt.apiId || 0) || null;
    if (apiId || inicioMs <= 0) return apiId;
    const fLoc = new Date(inicioMs).toLocaleDateString('en-CA');
    const fUtc = new Date(inicioMs).toISOString().slice(0, 10);
    const fUsar = this.fechaPermitidaEnPlan(fLoc) ? fLoc : (this.fechaPermitidaEnPlan(fUtc) ? fUtc : null);
    if (!fUsar) return null;

    let cacheDia = this._cacheFechaDia[fUsar];
    if (!cacheDia || (ahora - cacheDia.at) > 180000) {
      const detDia = await this.traerPartidosDelDiaDetallado(fUsar, true);
      cacheDia = { at: ahora, partidos: detDia.partidos };
      this._cacheFechaDia[fUsar] = cacheDia;
    }
    const hit = (cacheDia.partidos || []).find(ap =>
      ap.competicion === pBase.competicion &&
      ((ap.local === m.local && ap.visitante === m.visitante) || (ap.local === m.visitante && ap.visitante === m.local))
    );
    return hit?.apiId || null;
  },

  /* Carga bajo demanda (y persiste en Firestore) alineaciones, eventos y stats en 1 sola petición */
  async asegurarDetallesPartido(partidoId, opciones = {}) {
    if (!partidoId || !this.disponible()) {
      return { ok: false, estadoDetalle: 'sin_api', mensaje: 'API deportiva no configurada.' };
    }
    if (this._inflightDetalles[partidoId]) return this._inflightDetalles[partidoId];

    const tarea = (async () => {
      const Store = _store();
      const Puntos = _puntos();
      const pBase = (_fix().partidos || []).find(x => x.id === partidoId);
      if (!pBase) return { ok: false, estadoDetalle: 'no_encontrado', mensaje: 'Partido no encontrado.' };

      const [ajustes, resActuales] = await Promise.all([Store.ajustes(), Store.resultados()]);
      const m = Puntos ? Puntos.conAjustes(pBase, ajustes) : { ...pBase, ...(ajustes[partidoId] || {}) };
      const resAnt = resActuales[partidoId] || pBase.resultado || {};
      const ahora = Date.now();
      const inicioMs = m.utc ? new Date(m.utc).getTime() : 0;
      const minParaInicio = inicioMs > 0 ? (inicioMs - ahora) / 60000 : 9999;

      const tieneXI = !!(resAnt.alineaciones && (resAnt.alineaciones.local?.titulares?.length || resAnt.alineaciones.visitante?.titulares?.length));
      const tieneEvs = !!resAnt.detallesCompletos || (Array.isArray(resAnt.eventos) && resAnt.eventos.some(e => e.tipo === 'cambio'));

      if (!opciones.forzar && resAnt.estado === 'finalizado' && tieneXI && tieneEvs) {
        return { ok: true, cache: true, estadoDetalle: 'completo', resultado: resAnt };
      }
      if (!opciones.forzar && resAnt.estado !== 'en_juego' && resAnt.estado !== 'finalizado' && minParaInicio > 75) {
        return { ok: true, cache: true, estadoDetalle: 'previo_lejano', mensaje: 'Alineaciones disponibles cerca del inicio del partido.', resultado: resAnt };
      }

      const ult = this._detallesConsultadosAt[partidoId] || 0;
      const cdMs = resAnt.estado === 'en_juego' ? 120000 : (resAnt.estado === 'finalizado' ? 600000 : 300000);
      if (!opciones.forzar && ult && (ahora - ult) < cdMs) {
        return { ok: true, cache: true, estadoDetalle: tieneXI ? 'completo' : 'enfriamiento', resultado: resAnt };
      }

      const apiId = await this._resolverApiIdPartido(pBase, m, resAnt, inicioMs, ahora);
      if (!apiId) {
        return {
          ok: false,
          estadoDetalle: 'sin_api_id',
          mensaje: minParaInicio > -5
            ? 'Alineaciones disponibles cerca del inicio del partido.'
            : 'La API aún no publica el detalle extendido para este encuentro.',
          resultado: resAnt
        };
      }

      this._detallesConsultadosAt[partidoId] = ahora;
      const full = await this.traerPartidoCompleto(apiId, pBase.competicion, { localCod: m.local, visitanteCod: m.visitante });
      if (!full?.fixture) {
        return { ok: false, estadoDetalle: 'vacio', mensaje: 'Alineaciones disponibles cerca del inicio del partido.', resultado: resAnt };
      }

      const ap = full.fixture;
      const inv = m.local && ap.visitante && m.local === ap.visitante;
      const glN = ap.gl !== null && ap.gl !== undefined ? (inv ? ap.gv : ap.gl) : (resAnt.gl ?? null);
      const gvN = ap.gv !== null && ap.gv !== undefined ? (inv ? ap.gl : ap.gv) : (resAnt.gv ?? null);

      const nuevoRes = {
        ...resAnt,
        apiId,
        ...(ap.estado ? { estado: ap.estado } : {}),
        ...(ap.minuto !== null && ap.minuto !== undefined ? { minuto: ap.minuto, minutoAt: ahora } : {}),
        extra: ap.extra !== null && ap.extra !== undefined ? ap.extra : null,
        ...(ap.periodo ? { periodo: ap.periodo } : {}),
        ...(glN !== null ? { gl: glN } : {}),
        ...(gvN !== null ? { gv: gvN } : {}),
        eventos: full.eventos.length ? full.eventos : (resAnt.eventos || []),
        eventosAt: ahora,
        ...(full.alineaciones ? { alineaciones: full.alineaciones } : {}),
        ...(Object.keys(full.tarjetas || {}).length ? { tarjetas: full.tarjetas, statsAt: ahora } : {}),
        detallesCompletos: ap.estado === 'finalizado' && (!!full.alineaciones || full.eventos.length > 0)
      };

      await Store.guardarResultado(partidoId, nuevoRes);
      return { ok: true, cache: false, estadoDetalle: full.alineaciones ? 'completo' : 'pendiente_xi', resultado: nuevoRes };
    })();

    this._inflightDetalles[partidoId] = tarea;
    try { return await tarea; }
    finally { delete this._inflightDetalles[partidoId]; }
  },

  /* Compatibilidad con vistas heredadas de alineación */
  async traerAlineacion(apiFixtureId, comp = null) {
    const al = await this.traerAlineaciones(apiFixtureId, comp);
    if (!al) return null;
    return [
      { cod: 'local', f: al.local.formacion, xi: al.local.titulares.map(j => ({ n: j.nombre, num: j.num, pos: j.pos })) },
      { cod: 'visitante', f: al.visitante.formacion, xi: al.visitante.titulares.map(j => ({ n: j.nombre, num: j.num, pos: j.pos })) }
    ];
  },

  /* Historial de enfrentamientos directos entre dos equipos (H2H). */
  async traerH2H(teamId1, teamId2) {
    if (!teamId1 || !teamId2 || !this.disponible()) return null;
    try {
      const data = await this._request('/fixtures/headtohead', { h2h: `${teamId1}-${teamId2}`, last: '10' });
      const matches = (data.response || []).slice(0, 5);
      if (!matches.length) return null;
      let w1 = 0, empate = 0, w2 = 0;
      const recientes = [];
      for (const m of matches) {
        const homeWinner = m.teams?.home?.winner;
        const t1IsHome = m.teams?.home?.id === teamId1;
        if (homeWinner === null || homeWinner === undefined) { empate++; }
        else if ((homeWinner && t1IsHome) || (!homeWinner && !t1IsHome)) { w1++; }
        else { w2++; }
        recientes.push({
          gl: t1IsHome ? (m.goals?.home ?? 0) : (m.goals?.away ?? 0),
          gv: t1IsHome ? (m.goals?.away ?? 0) : (m.goals?.home ?? 0)
        });
      }
      return { w1, empate, w2, recientes };
    } catch { return null; }
  },

  /* Jugadores lesionados/ausentes para un partido específico. */
  async traerLesiones(apiFixtureId, comp = null) {
    if (!apiFixtureId || !this.disponible()) return null;
    try {
      const data = await this._request('/injuries', { fixture: apiFixtureId });
      const mapa = {};
      for (const item of data.response || []) {
        const cod = this._codigo(item.team?.name, comp);
        if (!cod) continue;
        if (!mapa[cod]) mapa[cod] = [];
        const apellido = (item.player?.name || '').split(' ').slice(-1)[0];
        mapa[cod].push({ nombre: apellido, razon: item.injury?.reason || item.injury?.type || '' });
      }
      return Object.keys(mapa).length ? mapa : null;
    } catch { return null; }
  },

  /* Genera y guarda un análisis de IA (híbrido Poisson + LLM opcional) para un partido específico. */
  async generarAnalisisIA(partidoId) {
    const IA = (typeof window !== 'undefined' && window.IA) || globalThis.IA;
    if (!IA?.generarInformePartido) {
      throw new Error('El módulo de análisis IA no está disponible.');
    }
    const Store = _store();
    const FIXTURE = _fix();
    const Puntos = _puntos();

    const [ajustes, todosRes] = await Promise.all([Store.ajustes(), Store.resultados()]);
    const p = FIXTURE.partidos.find(x => x.id === partidoId);
    if (!p) throw new Error('Partido no encontrado.');

    const ap = Puntos ? Puntos.conAjustes(p, ajustes) : { ...p, ...(ajustes[p.id] || {}) };
    if (!ap.local || !ap.visitante) throw new Error('Los equipos para este partido aún no están definidos.');

    const resAnterior = todosRes[partidoId] || {};
    const informe = await IA.generarInformePartido(ap.local, ap.visitante, todosRes, {
      fechaUtc: ap.utc,
      competicion: p.competicion,
      usarLLM: true
    });
    if (!informe?.md) throw new Error('No se pudo generar el análisis.');

    await Store.guardarResultado(partidoId, { ...resAnterior, analisisIA: informe.md });
    return informe.md;
  },

  /* Empareja cada partido de la API con el fixture local en 4 niveles de precisión */
  _emparejar(apiPartido, ajustes = {}, resActuales = {}) {
    const partidos = _fix().partidos || [];
    const Puntos = _puntos();
    const conAj = (p) => Puntos ? Puntos.conAjustes(p, ajustes) : { ...p, ...(ajustes[p.id] || {}) };
    const apiTime = apiPartido.utc ? new Date(apiPartido.utc).getTime() : 0;

    // Nivel 1: Coincidencia exacta por apiId (inmune a cambios de fecha o estadio)
    if (apiPartido.apiId) {
      const porId = partidos.find(p => {
        const ajId = ajustes?.[p.id]?.apiId ?? p.apiId ?? resActuales?.[p.id]?.apiId;
        return ajId && Number(ajId) === Number(apiPartido.apiId);
      });
      if (porId) return porId;
    }

    // Nivel 2: Misma competición + mismo par de equipos dentro de ±96 horas (elige la fecha más cercana)
    if (apiPartido.local && apiPartido.visitante) {
      const candidatos96h = [];
      const candidatos30d = [];

      for (const p of partidos) {
        if (apiPartido.competicion && p.competicion && p.competicion !== apiPartido.competicion) continue;
        const m = conAj(p);
        if (!m.local || !m.visitante) continue;
        const mismoOrden = (m.local === apiPartido.local && m.visitante === apiPartido.visitante);
        const invertido = (m.local === apiPartido.visitante && m.visitante === apiPartido.local);
        if (!mismoOrden && !invertido) continue;

        const fechaLocalMs = m.utc ? new Date(m.utc).getTime() : (m.fecha ? new Date(m.fecha + 'T12:00:00Z').getTime() : 0);
        const diffHoras = (apiTime && fechaLocalMs) ? Math.abs(apiTime - fechaLocalMs) / 3600000 : 9999;

        if (diffHoras <= 96) {
          candidatos96h.push({ p, diffHoras, mismoOrden });
        } else if (mismoOrden && diffHoras <= 720) {
          // Nivel 3: Partido reprogramado hasta ±30 días con misma localía
          const yaFinal = resActuales?.[p.id]?.estado === 'finalizado';
          candidatos30d.push({ p, diffHoras, yaFinal });
        }
      }

      if (candidatos96h.length) {
        candidatos96h.sort((a, b) => {
          if (Math.abs(a.diffHoras - b.diffHoras) < 12 && a.mismoOrden !== b.mismoOrden) {
            return a.mismoOrden ? -1 : 1;
          }
          return a.diffHoras - b.diffHoras;
        });
        return candidatos96h[0].p;
      }

      if (candidatos30d.length) {
        candidatos30d.sort((a, b) => (Number(a.yaFinal) - Number(b.yaFinal)) || (a.diffHoras - b.diffHoras));
        return candidatos30d[0].p;
      }
    }

    // Nivel 4: Llave eliminatoria TBD con misma competición y fecha
    if (apiPartido.utc && apiPartido.competicion) {
      const apiDia = apiPartido.utc.slice(0, 10);
      const tbd = partidos.filter(p => {
        if (p.competicion !== apiPartido.competicion) return false;
        const m = conAj(p);
        const diaLocal = m.fecha || (m.utc ? m.utc.slice(0, 10) : '');
        return !m.local && ['eliminatorias', 'final'].includes(m.fase) && diaLocal === apiDia;
      });
      if (tbd.length === 1) return tbd[0];
    }

    return null;
  },

  /* Procesa partidos de API-Football, guarda ajustes y marcadores, y devuelve diagnóstico completo */
  async _procesarPartidosApi(partidosApi, esCicloEnVivo = false, opciones = {}) {
    const Store = _store();
    const Puntos = _puntos();
    const [ajustes, resActuales] = await Promise.all([Store.ajustes(), Store.resultados()]);

    const incluirDetalles = !!opciones.incluirDetalles || !this.esPlanGratis();
    const forzarDetalles = !!opciones.forzarDetalles;
    let calendario = 0, marcadores = 0, detallesSync = 0, emparejados = 0, sinEmparejar = 0;
    let detallesConsultadosEnLote = 0;
    const maxDetallesLote = forzarDetalles ? 8 : 5;
    const tieneCuotaDetalle = () => (this.cuotaRestante() === null) || this.cuotaRestante() > (forzarDetalles ? 5 : 18);
    const detalle = [];

    for (const ap of partidosApi) {
      const p = this._emparejar(ap, ajustes, resActuales);
      const itemDiag = {
        pid: p?.id || null,
        competicion: ap.competicion,
        leagueName: ap.leagueName,
        round: ap.round,
        homeRaw: ap.homeRaw,
        awayRaw: ap.awayRaw,
        local: ap.local,
        visitante: ap.visitante,
        apiId: ap.apiId,
        utc: ap.utc,
        estado: ap.estado,
        periodo: ap.periodo,
        minuto: ap.minuto,
        gl: ap.gl,
        gv: ap.gv,
        emparejado: !!p,
        actualizado: false,
        accion: p ? 'Sin cambios' : 'Sin emparejar en fixture local'
      };

      if (!p) {
        sinEmparejar++;
        detalle.push(itemDiag);
        continue;
      }
      emparejados++;

      const m = Puntos ? Puntos.conAjustes(p, ajustes) : { ...p, ...(ajustes[p.id] || {}) };
      const ahora = Date.now();
      const inicio = ap.utc ? new Date(ap.utc).getTime() : 0;
      const enLimbo = inicio > 0 && ahora > inicio && ahora < inicio + 15 * 60000;

      // 1. Ajustes de calendario y vinculación de apiId
      const aj = {};
      const invertido = m.local && (m.local === ap.visitante);

      if (ap.apiId && Number(m.apiId || 0) !== Number(ap.apiId)) {
        aj.apiId = ap.apiId;
      }
      if (ap.utc) {
        const localMs = m.utc ? new Date(m.utc).getTime() : 0;
        if (!localMs || Math.abs(new Date(ap.utc).getTime() - localMs) >= 60000) {
          aj.utc = ap.utc;
        }
      }
      if (ap.estadio && ap.estadio !== m.estadio) {
        aj.estadio = ap.estadio;
        if (ap.sede && ap.sede !== m.sede) aj.sede = ap.sede;
      }
      if (!m.local && ap.local && ap.visitante) {
        aj.local = ap.local;
        aj.visitante = ap.visitante;
      }

      Object.keys(aj).forEach(k => { if (aj[k] === undefined) delete aj[k]; });

      if (Object.keys(aj).length) {
        try {
          await Store.guardarAjuste(p.id, aj);
          calendario++;
          itemDiag.actualizado = true;
          itemDiag.accion = 'Horario/ID actualizado';
        } catch (e) {
          // Usuarios no-admin no tienen permiso de escritura en `ajustes` (regla Firestore esperada)
          console.warn(`Ajuste ${p.id}:`, e.message);
        }
      }

      // 2. Contexto y alineaciones públicas (<= 65 min, en_juego o finalizado, máx 1 vez por partido)
      const resAnterior = resActuales[p.id] || {};
      const ctxEquipos = {
        localCod: m.local || (invertido ? ap.visitante : ap.local),
        visitanteCod: m.visitante || (invertido ? ap.local : ap.visitante),
        localApiId: invertido ? ap.visitanteApiTeamId : ap.localApiTeamId,
        visitanteApiId: invertido ? ap.localApiTeamId : ap.visitanteApiTeamId
      };

      const inicioEfectivoMs = inicio || (m.utc ? new Date(m.utc).getTime() : 0);
      const minParaInicio = inicioEfectivoMs > 0 ? (inicioEfectivoMs - ahora) / 60000 : 9999;
      const yaTieneAlineaciones = !!(resAnterior.alineaciones && resAnterior.alineaciones.local?.titulares?.length);
      const recienFinGlobal = ap.estado === 'finalizado' && resAnterior.estado !== 'finalizado';
      const glCand = invertido ? ap.gv : ap.gl;
      const gvCand = invertido ? ap.gl : ap.gv;
      const cambioGolGlobal = ((glCand || 0) + (gvCand || 0)) > ((resAnterior.gl || 0) + (resAnterior.gv || 0));

      const necesitaFull = ap.apiId && (
        ((recienFinGlobal || cambioGolGlobal) && tieneCuotaDetalle()) ||
        (incluirDetalles && (
          (!yaTieneAlineaciones && ((minParaInicio <= 65 && minParaInicio >= -180) || ap.estado === 'en_juego' || (forzarDetalles && ap.estado === 'finalizado' && minParaInicio >= -1440))) ||
          (ap.estado === 'en_juego' && (ahora - (resAnterior.eventosAt || 0) > (forzarDetalles ? 90000 : 5 * 60000)))
        ))
      );
      const enfriamientoFull = this._lineupsIntentadosAt[p.id]
        && !recienFinGlobal && !cambioGolGlobal
        && (ahora - this._lineupsIntentadosAt[p.id] < (forzarDetalles ? 90000 : 4 * 60000));

      let nuevasAlineaciones = ap._alineacionesPre || null;
      let nuevosEventos = ap._eventosPre || null;
      let nuevasTarjetas = ap._tarjetasPre || null;

      if (!ap._prehidratado && necesitaFull && !enfriamientoFull && detallesConsultadosEnLote < maxDetallesLote && tieneCuotaDetalle()) {
        this._lineupsIntentadosAt[p.id] = ahora;
        detallesConsultadosEnLote++;
        try {
          const full = await this.traerPartidoCompleto(ap.apiId, p.competicion, ctxEquipos);
          if (full) {
            if (full.alineaciones) nuevasAlineaciones = full.alineaciones;
            if (full.eventos) nuevosEventos = full.eventos;
            if (full.tarjetas && Object.keys(full.tarjetas).length) nuevasTarjetas = full.tarjetas;
          }
        } catch (e) {
          console.warn(`Detalle integral ${p.id}:`, e.message);
        }
      }

      // 3. Marcadores en vivo / finalizados / aplazados
      if (ap.estado) {
        const glNuevo = invertido ? ap.gv : ap.gl;
        const gvNuevo = invertido ? ap.gl : ap.gv;

        let ganadorPenales = resAnterior.ganadorPenales || null;
        if (ap.periodo === 'PEN' && ap.penalesHome !== null && ap.penalesAway !== null && ap.penalesHome !== ap.penalesAway) {
          const penLocal = invertido ? ap.penalesAway : ap.penalesHome;
          const penVis = invertido ? ap.penalesHome : ap.penalesAway;
          ganadorPenales = penLocal > penVis ? (m.local || ap.local) : (m.visitante || ap.visitante);
        }

        const motivoAplaz = ap.estado === 'aplazado' ? (this._motivoAplazamiento(ap.periodo) || '') : (resAnterior.motivoAplazamiento || '');

        const cambioReal =
          resAnterior.estado !== ap.estado ||
          resAnterior.gl !== glNuevo ||
          resAnterior.gv !== gvNuevo ||
          resAnterior.minuto !== (ap.minuto ?? null) ||
          (resAnterior.extra ?? null) !== (ap.extra ?? null) ||
          resAnterior.periodo !== (ap.periodo || null) ||
          Number(resAnterior.apiId || 0) !== Number(ap.apiId || 0) ||
          (ganadorPenales && resAnterior.ganadorPenales !== ganadorPenales);

        const hayNuevosDetalles = !!(
          nuevasAlineaciones ||
          (nuevosEventos && nuevosEventos.length !== (resAnterior.eventos || []).length) ||
          nuevasTarjetas
        );

        if (cambioReal || hayNuevosDetalles) {
          const resultado = {
            apiId:    ap.apiId || resAnterior.apiId || null,
            estado:   ap.estado,
            minuto:   ap.minuto !== undefined && ap.minuto !== null ? ap.minuto : null,
            extra:    ap.extra !== undefined && ap.extra !== null ? ap.extra : null,
            minutoAt: ahora,
            periodo:  ap.periodo || null,
            gl:       glNuevo !== undefined && glNuevo !== null ? glNuevo : null,
            gv:       gvNuevo !== undefined && gvNuevo !== null ? gvNuevo : null
          };
          if (ap.estado === 'aplazado') resultado.motivoAplazamiento = motivoAplaz;
          if (ganadorPenales) resultado.ganadorPenales = ganadorPenales;

          if (nuevosEventos !== null) {
            resultado.eventos = nuevosEventos.length ? nuevosEventos : (resAnterior.eventos || []);
            resultado.eventosAt = ahora;
          } else {
            resultado.eventos = resAnterior.eventos || [];
            if (resAnterior.eventosAt) resultado.eventosAt = resAnterior.eventosAt;
          }

          if (nuevasTarjetas) {
            resultado.tarjetas = nuevasTarjetas;
            resultado.statsAt  = ahora;
          } else {
            if (resAnterior.tarjetas) resultado.tarjetas = resAnterior.tarjetas;
            if (resAnterior.statsAt)  resultado.statsAt  = resAnterior.statsAt;
          }

          if (nuevasAlineaciones) {
            resultado.alineaciones = nuevasAlineaciones;
            detallesSync++;
          } else if (resAnterior.alineaciones) {
            resultado.alineaciones = resAnterior.alineaciones;
          }
          if (nuevosEventos && nuevosEventos.length) detallesSync++;
          if (ap.estado === 'finalizado' && (resultado.alineaciones || (resultado.eventos && resultado.eventos.length))) {
            resultado.detallesCompletos = true;
          } else if (resAnterior.detallesCompletos) {
            resultado.detallesCompletos = true;
          }
          if (resAnterior.prediccion) resultado.prediccion = resAnterior.prediccion;
          if (resAnterior.alineacion) resultado.alineacion = resAnterior.alineacion;
          if (resAnterior.analisisIA) resultado.analisisIA = resAnterior.analisisIA;

          await Store.guardarResultado(p.id, resultado);
          if (cambioReal) marcadores++;
          itemDiag.actualizado = true;
          const sufijoDet = `${nuevasAlineaciones ? ' · XI confirmado' : ''}${nuevosEventos?.length ? ` · ${nuevosEventos.length} ev.` : ''}`;
          itemDiag.accion = (ap.estado === 'en_juego'
            ? `En vivo ${glNuevo ?? 0}-${gvNuevo ?? 0} (${ap.minuto ?? 0}')`
            : ap.estado === 'finalizado'
              ? `Finalizado ${glNuevo ?? 0}-${gvNuevo ?? 0}`
              : `Aplazado (${ap.periodo})`) + sufijoDet;
          console.log(`Partido ${p.id}: estado=${ap.estado}, ${glNuevo}-${gvNuevo}${sufijoDet}`);
        } else {
          itemDiag.accion = ap.estado === 'finalizado' ? 'Finalizado (al día)' : 'Marcador al día';
        }
      } else if (enLimbo) {
        const payloadLimbo = { ...resAnterior, apiId: ap.apiId || resAnterior.apiId || null, estado: 'iniciando' };
        if (nuevasAlineaciones) {
          payloadLimbo.alineaciones = nuevasAlineaciones;
          detallesSync++;
        }
        if (resAnterior.estado !== 'en_juego' && resAnterior.estado !== 'finalizado' && (resAnterior.estado !== 'iniciando' || nuevasAlineaciones)) {
          await Store.guardarResultado(p.id, payloadLimbo);
          marcadores++;
          itemDiag.actualizado = true;
          itemDiag.accion = `Iniciando (periodo de gracia)${nuevasAlineaciones ? ' · XI confirmado' : ''}`;
        }
      } else if (nuevasAlineaciones) {
        // Partido aún programado (<= 65 min antes del pitazo): publica alineaciones sin cerrar pronósticos
        await Store.guardarResultado(p.id, {
          ...resAnterior,
          apiId: ap.apiId || resAnterior.apiId || null,
          alineaciones: nuevasAlineaciones
        });
        detallesSync++;
        itemDiag.actualizado = true;
        itemDiag.accion = 'Alineaciones confirmadas publicadas';
      }

      detalle.push(itemDiag);
    }

    return {
      calendario,
      marcadores,
      detallesSync,
      total: partidosApi.length,
      totalGlobal: opciones.totalGlobal ?? partidosApi.length,
      emparejados,
      sinEmparejar,
      detalle,
      sinCodigo: opciones.sinCodigo || [],
      fuente: opciones.fuente || 'api',
      timestamp: Date.now()
    };
  },

  /* Sincroniza goles, tarjetas y alineaciones de partidos en vivo y próximos de hoy (<= 65 min) */
  async sincronizarDetallesActivos(opciones = {}) {
    if (!this.disponible()) throw new Error('API_FUTBOL no está configurada.');
    const hoy = this.fechaLocal(0);
    const [enVivo, delDia] = await Promise.all([
      this.traerEnVivoDetallado(),
      this.traerPartidosDelDiaDetallado(hoy, true)
    ]);
    const mapa = new Map();
    [...enVivo.partidos, ...delDia.partidos].forEach(p => { if (p?.apiId) mapa.set(p.apiId, p); });
    const sinCodigo = [...enVivo.sinCodigo, ...delDia.sinCodigo];
    return this._procesarPartidosApi([...mapa.values()], false, {
      ...opciones,
      incluirDetalles: true,
      forzarDetalles: true,
      sinCodigo,
      totalGlobal: Math.max(enVivo.totalGlobal, delDia.totalGlobal),
      fuente: `detalles+xi:${hoy}`
    });
  },

  /* Sincronización rápida EN VIVO (1 petición `/fixtures?live=all`, +1 fallback solo si un partido acaba de terminar) */
  async sincronizarSoloVivos(opciones = {}) {
    if (!this.disponible()) {
      return { calendario: 0, marcadores: 0, total: 0, emparejados: 0, sinEmparejar: 0, detalle: [], sinCodigo: [], fuente: 'live' };
    }
    const Store = _store();
    const FIXTURE = _fix();
    const Puntos = _puntos();

    const enVivo = await this.traerEnVivoDetallado();
    const lista = [...enVivo.partidos];
    const sinCodigo = [...enVivo.sinCodigo];
    let totalGlobal = enVivo.totalGlobal;

    // Detectar partidos que estaban en_juego/iniciando (o pasaron >105m del inicio) y ya salieron de live=all → pitazo final (FT)
    const [ajustes, resActuales] = await Promise.all([Store.ajustes(), Store.resultados()]);
    const idsEnVivo = new Set(lista.map(x => Number(x.apiId)));
    const paresEnVivo = new Set(lista.map(x => `${x.competicion}:${x.local}:${x.visitante}`));
    const ahora = Date.now();

    const fechasFinalizacion = new Set();
    const huerfanosConApiId = [];

    for (const p of (FIXTURE.partidos || [])) {
      const r = resActuales[p.id];
      const m = Puntos ? Puntos.conAjustes(p, ajustes) : { ...p, ...(ajustes[p.id] || {}) };
      if (r?.estado === 'finalizado' || r?.estado === 'aplazado' || p.estado === 'finalizado') continue;
      if (!m.local || !m.visitante) continue;

      const inicioMs = m.utc ? new Date(m.utc).getTime() : 0;
      const estabaEnJuego = r?.estado === 'en_juego' || r?.estado === 'iniciando';
      const pasoVentanaJuego = inicioMs > 0 && (ahora - inicioMs) > 105 * 60000 && (ahora - inicioMs) < 20 * 3600000;

      if (!estabaEnJuego && !pasoVentanaJuego) continue;

      const apiIdLocal = Number(m.apiId || r?.apiId || 0);
      const sigueVivo = (apiIdLocal && idsEnVivo.has(apiIdLocal)) ||
                        paresEnVivo.has(`${p.competicion}:${m.local}:${m.visitante}`) ||
                        paresEnVivo.has(`${p.competicion}:${m.visitante}:${m.local}`);
      if (!sigueVivo) {
        const fechaCandidata = inicioMs
          ? new Date(inicioMs).toLocaleDateString('en-CA')
          : this.fechaLocal(0);
        if (this.fechaPermitidaEnPlan(fechaCandidata)) {
          fechasFinalizacion.add(fechaCandidata);
        } else if (estabaEnJuego && apiIdLocal) {
          huerfanosConApiId.push({ p, m, apiId: apiIdLocal });
        }
      }
    }

    // Consultar todas las fechas permitidas con partidos recién terminados (máx 2 fechas por ciclo)
    const cuotaOk = () => (this.cuotaRestante() === null) || this.cuotaRestante() > 4;
    const mapa = new Map(lista.map(x => [x.apiId, x]));

    for (const fechaFt of [...fechasFinalizacion].slice(0, 2)) {
      if (!cuotaOk()) break;
      try {
        const delDia = await this.traerPartidosDelDiaDetallado(fechaFt, true);
        this._cacheFechaDia[fechaFt] = { at: ahora, partidos: delDia.partidos };
        for (const item of delDia.partidos) {
          if (!mapa.has(item.apiId)) mapa.set(item.apiId, item);
        }
        totalGlobal = Math.max(totalGlobal, delDia.totalGlobal);
      } catch (e) {
        console.warn(`Fallback FT (${fechaFt}) en sincronizarSoloVivos:`, e.message);
      }
    }

    // Resolver por ID directo (`/fixtures?id=`) cualquier partido atascado en `en_juego` fuera de ventana de fecha
    for (const h of huerfanosConApiId.slice(0, 3)) {
      if (!cuotaOk() || mapa.has(h.apiId)) continue;
      try {
        const full = await this.traerPartidoCompleto(h.apiId, h.p.competicion, {
          localCod: h.m.local,
          visitanteCod: h.m.visitante
        });
        if (full?.fixture) {
          mapa.set(h.apiId, {
            ...full.fixture,
            _prehidratado: true,
            _alineacionesPre: full.alineaciones,
            _eventosPre: full.eventos,
            _tarjetasPre: full.tarjetas
          });
        }
      } catch (e) {
        console.warn(`Rescate por apiId (${h.apiId}):`, e.message);
      }
    }

    lista.length = 0;
    lista.push(...mapa.values());

    return this._procesarPartidosApi(lista, true, {
      ...opciones,
      sinCodigo,
      totalGlobal,
      fuente: (fechasFinalizacion.size || huerfanosConApiId.length) ? 'live+ft' : 'live'
    });
  },

  /* Sincroniza partidos de una fecha puntual YYYY-MM-DD (1 sola petición) */
  async sincronizarFecha(fecha, opciones = {}) {
    if (!this.disponible()) throw new Error('API_FUTBOL no está configurada.');
    const f = fecha || this.fechaLocal(0);
    console.log(`🔄 Sincronizando partidos del ${f} (zona ${this._tz()})...`);
    const det = await this.traerPartidosDelDiaDetallado(f, true);
    return this._procesarPartidosApi(det.partidos, false, {
      ...opciones,
      sinCodigo: det.sinCodigo,
      totalGlobal: det.totalGlobal,
      fuente: `fecha:${f}`
    });
  },

  /* Sincronización completa inteligente: Hoy + Mañana en hora local (2 peticiones) */
  async sincronizar(opciones = {}) {
    if (!this.disponible()) throw new Error('Configura primero apiKey en js/config.js.');
    const hoy = this.fechaLocal(0);
    const manana = this.fechaLocal(1);
    console.log(`🔄 Sincronizando jornada (${hoy} y ${manana}) con API-Football...`);
    const [dHoy, dManana] = await Promise.all([
      this.traerPartidosDelDiaDetallado(hoy, true),
      this.traerPartidosDelDiaDetallado(manana, true)
    ]);
    const mapa = new Map();
    [...dHoy.partidos, ...dManana.partidos].forEach(p => mapa.set(p.apiId, p));
    const sinCodigo = [...dHoy.sinCodigo, ...dManana.sinCodigo];
    return this._procesarPartidosApi([...mapa.values()], false, {
      ...opciones,
      sinCodigo,
      totalGlobal: dHoy.totalGlobal + dManana.totalGlobal,
      fuente: `jornada:${hoy}..${manana}`
    });
  },

  /* Alias mantenido por compatibilidad: ahora consume 1 petición en lugar de 3 */
  async sincronizarEnVivo(opciones = {}) {
    try {
      return await this.sincronizarSoloVivos(opciones);
    } catch (e) {
      console.error('Error en ciclo de sincronización en vivo:', e);
      return { calendario: 0, marcadores: 0, total: 0, emparejados: 0, sinEmparejar: 0, detalle: [], error: true, mensaje: e.message };
    }
  },

  /* Evalúa si hay partidos en ventana activa de juego, en vivo o pendientes de cierre FT hoy */
  _hayPartidosEnVentana(ajFix = {}, resLive = {}, margenPrevioMin = 15, margenPostMin = 165) {
    const ahora = Date.now();
    const hayEnVivo = Object.entries(resLive || {}).some(([pid, r]) => {
      if (r?.estado !== 'en_juego' && r?.estado !== 'iniciando') return false;
      if (r?.apiId) return true;
      const p = (_fix().partidos || []).find(x => x.id === pid);
      const utc = ajFix?.[pid]?.utc || p?.utc;
      const ini = utc ? new Date(utc).getTime() : 0;
      return !ini || (ahora - ini) < 6 * 3600000;
    });
    if (hayEnVivo) return { activo: true, razon: 'en_juego', proximo: null };

    let proximo = null;
    for (const p of (_fix().partidos || [])) {
      const estRes = resLive?.[p.id]?.estado;
      if (estRes === 'finalizado' || estRes === 'aplazado' || p.estado === 'finalizado') continue;
      if (!p.local || !p.visitante) continue;
      const utc = ajFix?.[p.id]?.utc || p.utc;
      if (!utc) continue;
      const inicio = new Date(utc).getTime();
      if (isNaN(inicio)) continue;

      if (ahora >= inicio - margenPrevioMin * 60000 && ahora <= inicio + margenPostMin * 60000) {
        return { activo: true, razon: 'ventana', proximo: p };
      }
      // Si el partido ya superó su ventana hoy/ayer dentro del plan y aún figura sin cerrar -> activar cierre FT
      const fCand = new Date(inicio).toLocaleDateString('en-CA');
      if (ahora > inicio + 105 * 60000 && ahora < inicio + 20 * 3600000 && this.fechaPermitidaEnPlan(fCand)) {
        return { activo: true, razon: 'pendiente_ft', proximo: p };
      }
      if (inicio > ahora && (!proximo || inicio < proximo.inicioMs)) {
        proximo = { id: p.id, inicioMs: inicio, utc, local: p.local, visitante: p.visitante };
      }
    }
    return { activo: false, razon: 'espera', proximo };
  },

  /* Ciclo automático inteligente:
     - En modo 'auto' (usuarios normales): solo corre si hay partidos en ventana,
       con bloqueo Firestore de 4 min en Plan Free y pausa automática si quedan ≤15 peticiones.
     - En modo 'admin' (botón del panel admin): respeta el intervalo elegido (60s–300s),
       hace 1 consulta inicial inmediata y queda en espera (0 peticiones) cuando no hay partidos activos. */
  cicloEnVivo(alTerminarCadaCiclo, opciones = {}) {
    let activo = true;
    let tickTimeout = null;
    const modo = opciones.modo || 'auto';
    let primerTick = true;

    if (modo === 'admin') this._adminCicloActivo = true;

    const getIntervaloMs = () => {
      const cfgSeg = Number(_cfg().API_FUTBOL?.intervaloSegundos) || 60;
      if (modo === 'admin') {
        const seg = Number(opciones.intervaloSegundos) || Number(localStorage.getItem('sc_api_intervalo')) || (this.esPlanGratis() ? 120 : cfgSeg);
        return Math.max(30, seg) * 1000;
      }
      return this.esPlanGratis() ? 240000 : Math.max(60, cfgSeg) * 1000;
    };

    const tick = async () => {
      if (!activo) return;

      // En admin.html, el ciclo automático de fondo cede el control al ciclo manual del admin
      if (modo === 'auto' && this._adminCicloActivo) {
        tickTimeout = setTimeout(tick, 60000);
        return;
      }

      const ajFix = (typeof window !== 'undefined' && window._ajustesLive) || {};
      const resLive = (typeof window !== 'undefined' && window._resultadosLive) || {};
      const Store = _store();

      if (typeof document === 'undefined' || !document.hidden) {
        await this._refrescarCuotaSiVieja(10 * 60000);
        const rem = this.cuotaRestante();
        const pisoCuota = modo === 'admin' ? 3 : 15;

        if (this.esPlanGratis() && rem !== null && rem <= pisoCuota) {
          alTerminarCadaCiclo && alTerminarCadaCiclo({
            pausadoPorCuota: true,
            cuotaRestante: rem,
            mensaje: `Pausado para proteger cuota (${rem} peticiones restantes hoy).`
          });
          if (activo) tickTimeout = setTimeout(tick, 180000);
          return;
        }

        const estadoVentana = this._hayPartidosEnVentana(ajFix, resLive, modo === 'admin' ? 15 : 10, 165);
        const debeConsultar = estadoVentana.activo || (modo === 'admin' && primerTick);
        primerTick = false;

        if (debeConsultar) {
          const intMs = getIntervaloMs();
          const bloqueoMs = Math.max(25000, intMs - 5000);
          const puedeSync = (modo === 'admin')
            ? (Store?.reclamarSincronizacion ? await Store.reclamarSincronizacion(bloqueoMs) : true)
            : (Store?.reclamarSincronizacion ? await Store.reclamarSincronizacion(240000) : true);

          if (puedeSync) {
            try {
              const incDet = typeof opciones.incluirDetalles === 'function'
                ? !!opciones.incluirDetalles()
                : !!opciones.incluirDetalles;
              const r = await this.sincronizarSoloVivos({ incluirDetalles: incDet });
              alTerminarCadaCiclo && alTerminarCadaCiclo(r);
            } catch (e) {
              console.warn('Sincronización en vivo:', e.message);
              alTerminarCadaCiclo && alTerminarCadaCiclo({ error: true, mensaje: e.message });
            }
          }
        } else if (modo === 'admin') {
          alTerminarCadaCiclo && alTerminarCadaCiclo({
            enEspera: true,
            proximo: estadoVentana.proximo
          });
        }
      }

      if (activo) {
        const ajNow = (typeof window !== 'undefined' && window._ajustesLive) || {};
        const resNow = (typeof window !== 'undefined' && window._resultadosLive) || {};
        const hayActivos = this._hayPartidosEnVentana(ajNow, resNow, 20, 165).activo;
        const proxIntervalo = hayActivos ? getIntervaloMs() : Math.max(120000, getIntervaloMs());
        tickTimeout = setTimeout(tick, proxIntervalo);
      }
    };

    tick();
    return () => {
      activo = false;
      if (modo === 'admin') this._adminCicloActivo = false;
      if (tickTimeout) {
        clearTimeout(tickTimeout);
        tickTimeout = null;
      }
    };
  },

  /* Simulador minuto a minuto (solo modo demo / pruebas). */
  simular(pid, alAvanzar) {
    const Store = _store();
    const p = (_fix().partidos || []).find(x => x.id === pid) || {};
    const nombresDemoL = ['C. Bacca', 'L. Castro', 'D. Ruiz', 'A. Morelos', 'J. Quintero'];
    const nombresDemoV = ['D. Pabón', 'H. Rodallega', 'Y. Chará', 'F. Uribe', 'M. Borja'];
    let minuto = 0, gl = 0, gv = 0, parado = false;
    const eventos = [];
    const paso = async () => {
      if (parado) return;
      minuto = Math.min(90, minuto + 5 + Math.floor(Math.random() * 4));
      if (Math.random() < 0.16) {
        gl++;
        const jug = nombresDemoL[gl % nombresDemoL.length];
        const esPen = Math.random() < 0.18;
        eventos.push({ min: minuto, extra: null, equipo: 'local', tipo: esPen ? 'penal' : 'gol', jugador: jug, asistencia: null, m: minuto, x: null, eq: p.local || '', j: jug, t: 'gol', subtipo: esPen ? 'penal' : 'normal' });
      }
      if (Math.random() < 0.13) {
        gv++;
        const jug = nombresDemoV[gv % nombresDemoV.length];
        eventos.push({ min: minuto, extra: null, equipo: 'visitante', tipo: 'gol', jugador: jug, asistencia: null, m: minuto, x: null, eq: p.visitante || '', j: jug, t: 'gol', subtipo: 'normal' });
      }
      if (Math.random() < 0.12) {
        const lado = Math.random() < 0.5 ? 'local' : 'visitante';
        const jug = (lado === 'local' ? nombresDemoL : nombresDemoV)[Math.floor(Math.random() * 5)];
        const roja = Math.random() < 0.15;
        eventos.push({ min: minuto, extra: null, equipo: lado, tipo: roja ? 'roja' : 'amarilla', jugador: jug, asistencia: null, m: minuto, x: null, eq: lado === 'local' ? (p.local || '') : (p.visitante || ''), j: jug, t: roja ? 'roja' : 'amarilla', subtipo: '' });
      }
      const fin = minuto >= 90;
      await Store.guardarResultado(pid, { estado: fin ? 'finalizado' : 'en_juego', minuto: fin ? 90 : minuto, minutoAt: Date.now(), periodo: fin ? 'FT' : (minuto <= 45 ? '1H' : '2H'), gl, gv, eventos: [...eventos] });
      alAvanzar && alAvanzar({ minuto, gl, gv, fin });
      if (!fin) setTimeout(paso, 2500);
    };
    paso();
    return () => { parado = true; };
  }
};

if (typeof window !== 'undefined') window.ApiFutbol = ApiFutbol;
if (typeof globalThis !== 'undefined') globalThis.ApiFutbol = ApiFutbol;

// Auto-sincronización segura en segundo plano para usuarios autenticados en Firebase.
// Solo consulta cuando realmente hay partidos en ventana de juego (0 req en reposo)
// y respeta el bloqueo distribuido en Cloud Firestore + reserva de cuota para el admin.
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  setTimeout(() => {
    if (window.Store && _cfg().MODO === 'firebase' && ApiFutbol.disponible()) {
      window.Store.sesion().then(u => {
        if (u && !ApiFutbol._adminCicloActivo) {
          ApiFutbol.cicloEnVivo(() => {}, { modo: 'auto' });
        }
      }).catch(() => {});
    }
  }, 4000 + Math.floor(Math.random() * 5000));
}

export { ApiFutbol };
export default ApiFutbol;
