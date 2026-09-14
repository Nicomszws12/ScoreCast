# -*- coding: utf-8 -*-
import re
import json
import unicodedata
from datetime import datetime, timedelta

def clean_str(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn').lower().strip()

# ==========================================
# 1. PARSE LIGA BETPLAY (190 partidos)
# ==========================================
BP_TEAM_MAP = {
    clean_str('Alianza FC'): 'ali',
    clean_str('América de Cali'): 'ame',
    clean_str('Atlético Bucaramanga'): 'buc',
    clean_str('Atlético Nacional'): 'nal',
    clean_str('Boyacá Chicó'): 'chi',
    clean_str('Cúcuta Deportivo'): 'cuc',
    clean_str('Deportes Tolima'): 'tol',
    clean_str('Deportivo Cali'): 'cal',
    clean_str('Deportivo Pasto'): 'pas',
    clean_str('Deportivo Pereira'): 'per',
    clean_str('Fortaleza'): 'for',
    clean_str('Independiente Medellín'): 'dim',
    clean_str('Independiente Santa Fe'): 'sfe',
    clean_str('Internacional de Bogotá'): 'int_bog',
    clean_str('Jaguares FC'): 'jag',
    clean_str('Junior'): 'jun',
    clean_str('Llaneros FC'): 'lla',
    clean_str('Millonarios'): 'mfc',
    clean_str('Once Caldas'): 'onc',
    clean_str('Águilas Doradas'): 'agu'
}

BP_STADIUM_MAP = {
    'Américo Montanini': 'Américo Montanini, Bucaramanga',
    'Armando Maestre Pavajeau': 'Armando Maestre Pavajeau, Valledupar',
    'Atanasio Girardot': 'Atanasio Girardot, Medellín',
    'Bello Horizonte': 'Bello Horizonte - Rey Pelé, Villavicencio',
    'Cincuentenario': 'Cincuentenario, Medellín',
    'Departamental Libertad': 'Departamental Libertad, Pasto',
    'Deportivo Cali': 'Estadio Deportivo Cali, Palmira',
    'El Campín': 'Nemesio Camacho El Campín, Bogotá',
    'General Santander': 'General Santander, Cúcuta',
    'Hernán Ramírez Villegas': 'Hernán Ramírez Villegas, Pereira',
    'Jaraguay': 'Jaraguay, Montería',
    'La Independencia': 'La Independencia, Tunja',
    'Manuel Murillo Toro': 'Manuel Murillo Toro, Ibagué',
    'Metropolitano de Itagüí': 'Metropolitano Ciudad de Itagüí',
    'Metropolitano de Techo': 'Metropolitano de Techo, Bogotá',
    'Palogrande': 'Palogrande, Manizales',
    'Pascual Guerrero': 'Olímpico Pascual Guerrero, Cali',
    'Romelio Martínez': 'Romelio Martínez, Barranquilla',
    'Por definir': 'Estadio por definir'
}

meses_bp = {
    'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4, 'mayo': 5, 'junio': 6,
    'julio': 7, 'agosto': 8, 'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12
}

date_pattern_bp = re.compile(r'([a-zA-ZáéíóúÁÉÍÓÚñÑ]+)\s+(\d{1,2})\s+de\s+([a-zA-ZáéíóúÁÉÍÓÚñÑ]+)\s+de\s+(\d{4})')

with open(r'e:\fixture_liga_betplay_dimayor_2026_II_resultados_9_sep.txt', 'r', encoding='utf-8') as f:
    text_bp = f.read().replace('\xa0', ' ')

fechas_raw_bp = re.split(r'={3,}\s*FECHA\s*(\d+)\s*={3,}', text_bp)

pattern_bp = re.compile(
    r'([a-zA-ZáéíóúÁÉÍÓÚñÑ]+ \d{1,2} de [a-zA-ZáéíóúÁÉÍÓÚñÑ]+ de \d{4})\s*\|\s*'
    r'(\d{1,2}:\d{2})\s*\|\s*'
    r'(.*?)\s+vs\.?\s+(.*?)\s*\|\s*'
    r'Estadio:\s*([^|]+?)\s*\|\s*'
    r'(?:RESULTADO:\s*(\d+\s*-\s*\d+)\s*\|\s*)?'
    r'(FINALIZADO|APLAZADO|POR JUGAR)',
    re.IGNORECASE | re.DOTALL
)

betplay_matches = []
resultados_iniciales = {}

for i in range(1, len(fechas_raw_bp), 2):
    f_num = int(fechas_raw_bp[i])
    f_text = ' '.join(fechas_raw_bp[i+1].strip().split())
    matches = pattern_bp.findall(f_text)
    for m_idx, m in enumerate(matches, start=1):
        pid = f'bp-f{f_num:02d}-{m_idx:02d}'
        raw_date = m[0].strip()
        raw_time = m[1].strip()
        loc_name = m[2].strip()
        vis_name = m[3].strip()
        raw_stad = m[4].strip()
        raw_res = m[5].strip() if m[5] else None
        status_raw = m[6].upper()
        
        loc_code = BP_TEAM_MAP[clean_str(loc_name)]
        vis_code = BP_TEAM_MAP[clean_str(vis_name)]
        estadio = BP_STADIUM_MAP.get(raw_stad, raw_stad)
        
        dm = date_pattern_bp.search(raw_date)
        dia_semana = dm.group(1).capitalize()
        dia_num = int(dm.group(2))
        mes_nombre = dm.group(3).lower()
        anio = int(dm.group(4))
        
        hh, mm = map(int, raw_time.split(':'))
        dt_cot = datetime(anio, meses_bp[mes_nombre], dia_num, hh, mm)
        dt_utc = dt_cot + timedelta(hours=5)
        utc_iso = dt_utc.strftime('%Y-%m-%dT%H:%M:%SZ')
        
        fecha_display = f'{dia_semana}, {dia_num} de {mes_nombre}'
        hora_display = f'{raw_time} COT'
        
        match_obj = {
            'id': pid,
            'competicion': 'betplay',
            'jornada': f_num,
            'etapa': f'Liga BetPlay · Fecha {f_num}',
            'fase': 'liga',
            'local': loc_code,
            'visitante': vis_code,
            'fechaStr': fecha_display,
            'horaStr': hora_display,
            'utc': utc_iso,
            'estadio': estadio,
            'horaOk': True
        }
        
        if status_raw == 'FINALIZADO':
            match_obj['estado'] = 'finalizado'
            gl, gv = map(int, raw_res.split('-'))
            res_obj = {'gl': gl, 'gv': gv, 'estado': 'finalizado'}
            match_obj['resultado'] = res_obj
            resultados_iniciales[pid] = res_obj
        elif status_raw == 'APLAZADO':
            match_obj['estado'] = 'aplazado'
            match_obj['motivoAplazamiento'] = 'Reprogramado por DIMAYOR'
            res_obj = {'estado': 'aplazado', 'motivoAplazamiento': 'Reprogramado por DIMAYOR'}
            match_obj['resultado'] = res_obj
            resultados_iniciales[pid] = res_obj
        else:
            match_obj['estado'] = 'programado'
            
        betplay_matches.append(match_obj)

print(f'Parsed BetPlay matches: {len(betplay_matches)} (Resultados iniciales: {len(resultados_iniciales)})')

# ==========================================
# 2. PARSE LALIGA EA SPORTS (380 partidos)
# ==========================================
LALIGA_TEAM_MAP = {
    clean_str('Real Madrid'): 'rma',
    clean_str('FC Barcelona'): 'bar',
    clean_str('Barcelona'): 'bar',
    clean_str('Atlético de Madrid'): 'atm',
    clean_str('Atletico de Madrid'): 'atm',
    clean_str('Athletic Club'): 'ath',
    clean_str('Athletic'): 'ath',
    clean_str('Real Sociedad'): 'rso',
    clean_str('Real Betis'): 'bet',
    clean_str('Betis'): 'bet',
    clean_str('Sevilla FC'): 'sev',
    clean_str('Sevilla'): 'sev',
    clean_str('Villarreal CF'): 'vil',
    clean_str('Villarreal'): 'vil',
    clean_str('Valencia CF'): 'val',
    clean_str('Valencia'): 'val',
    clean_str('Girona FC'): 'gir',
    clean_str('Girona'): 'gir',
    clean_str('RC Celta de Vigo'): 'cel',
    clean_str('Celta de Vigo'): 'cel',
    clean_str('Celta'): 'cel',
    clean_str('CA Osasuna'): 'osa',
    clean_str('Osasuna'): 'osa',
    clean_str('RCD Mallorca'): 'mll',
    clean_str('Mallorca'): 'mll',
    clean_str('Deportivo Alavés'): 'ala',
    clean_str('Deportivo Alaves'): 'ala',
    clean_str('Alavés'): 'ala',
    clean_str('Getafe CF'): 'get',
    clean_str('Getafe'): 'get',
    clean_str('Rayo Vallecano'): 'ray',
    clean_str('UD Las Palmas'): 'lpa',
    clean_str('Las Palmas'): 'lpa',
    clean_str('RCD Espanyol'): 'esp',
    clean_str('Espanyol'): 'esp',
    clean_str('Real Valladolid'): 'vld',
    clean_str('Valladolid'): 'vld',
    clean_str('CD Leganés'): 'leg',
    clean_str('CD Leganes'): 'leg',
    clean_str('Leganés'): 'leg'
}

meses_ll = ['', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

with open(r'e:\laliga_ea_sports_2026_2027_calendario_completo.txt', 'r', encoding='utf-8') as f:
    text_ll = f.read()

line_pattern_ll = re.compile(
    r'^\s*(\d{3})\s*\|\s*'
    r'([a-zA-ZáéíóúÁÉÍÓÚñÑ]+),\s*(\d{2}/\d{2}/\d{4})\s*\|\s*'
    r'(\d{2}:\d{2})\s*COT\s*\|\s*'
    r'([^|]+?)\s*\|\s*'
    r'([^|]+?)\s*\|\s*'
    r'([^|]+?)\s*\|\s*'
    r'([^|]+?)\s*\|\s*'
    r'(FINALIZADO|POR JUGAR)\s*$',
    re.M
)

matches_ll = line_pattern_ll.findall(text_ll)
laliga_matches = []
laliga_finalizados_count = 0

for m in matches_ll:
    num_str, dia_sem, d_str, t_str, loc, res_str, vis, stad, status = m
    m_num = int(num_str)
    jornada = (m_num - 1) // 10 + 1
    p_num = (m_num - 1) % 10 + 1
    pid = f'll-j{jornada:02d}-{p_num:02d}'
    
    loc_code = LALIGA_TEAM_MAP[clean_str(loc)]
    vis_code = LALIGA_TEAM_MAP[clean_str(vis)]
    estadio = stad.strip()
    
    day, month, year = map(int, d_str.split('/'))
    hh, mm = map(int, t_str.split(':'))
    dt_cot = datetime(year, month, day, hh, mm)
    dt_utc = dt_cot + timedelta(hours=5)
    utc_iso = dt_utc.strftime('%Y-%m-%dT%H:%M:%SZ')
    
    f_display = f'{dia_sem.capitalize()}, {day} de {meses_ll[month]}'
    h_display = f'{t_str.strip()} COT'
    
    match_obj = {
        'id': pid,
        'competicion': 'laliga',
        'jornada': jornada,
        'etapa': f'LaLiga · Jornada {jornada}',
        'fase': 'liga',
        'local': loc_code,
        'visitante': vis_code,
        'fechaStr': f_display,
        'horaStr': h_display,
        'utc': utc_iso,
        'estadio': estadio,
        'horaOk': True
    }
    
    if status == 'FINALIZADO':
        match_obj['estado'] = 'finalizado'
        # Parse score "2 - 1"
        gl, gv = map(int, res_str.strip().split('-'))
        res_obj = {'gl': gl, 'gv': gv, 'estado': 'finalizado'}
        match_obj['resultado'] = res_obj
        resultados_iniciales[pid] = res_obj
        laliga_finalizados_count += 1
    else:
        match_obj['estado'] = 'programado'
        
    laliga_matches.append(match_obj)

print(f'Parsed LaLiga matches: {len(laliga_matches)} (Finalizados: {laliga_finalizados_count})')
print(f'Total resultados iniciales acumulados: {len(resultados_iniciales)}')

# ==========================================
# 3. BUILD FULL fixture.js
# ==========================================

HEADER = """/* ============================================================
   SCORECAST — FIXTURE Y CATÁLOGO MULTICOMPETICIÓN
   Soporte para:
     1. UEFA Champions League (ucl)
     2. Liga BetPlay Dimayor (betplay) — 19 Fechas / 190 Partidos
     3. Premier League (premier)
     4. LaLiga EA Sports (laliga) — 38 Jornadas / 380 Partidos
     5. Bundesliga (bundesliga)
     6. Copa CONMEBOL Libertadores (libertadores)
     7. Copa CONMEBOL Sudamericana (sudamericana)
   ============================================================ */

export const COMPETICIONES = {
  ucl: { id: 'ucl', nombre: 'Champions League', nombreCompleto: 'UEFA Champions League', icono: '🏆', badge: 'img/escudos/champions/ucl.png' },
  betplay: { id: 'betplay', nombre: 'Liga BetPlay', nombreCompleto: 'Liga BetPlay Dimayor', icono: '🇨🇴', badge: 'img/escudos/betplay/dimayor.png' },
  premier: { id: 'premier', nombre: 'Premier League', nombreCompleto: 'Premier League (Inglaterra)', icono: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', badge: 'img/escudos/premier/epl.png' },
  laliga: { id: 'laliga', nombre: 'LaLiga', nombreCompleto: 'LaLiga EA Sports (España)', icono: '🇪🇸', badge: 'img/escudos/laliga/laliga.png' },
  bundesliga: { id: 'bundesliga', nombre: 'Bundesliga', nombreCompleto: 'Bundesliga (Alemania)', icono: '🇩🇪', badge: 'img/escudos/bundesliga/bundesliga.png' },
  libertadores: { id: 'libertadores', nombre: 'Libertadores', nombreCompleto: 'Copa CONMEBOL Libertadores', icono: '🌎', badge: 'img/escudos/libertadores/libertadores.png' },
  sudamericana: { id: 'sudamericana', nombre: 'Sudamericana', nombreCompleto: 'Copa CONMEBOL Sudamericana', icono: '🥈', badge: 'img/escudos/sudamericana/sudamericana.png' }
};

const EQUIPOS = {
  /* ================= Liga BetPlay Dimayor (Colombia) ================= */
  'ame': { n: 'América de Cali', b: 'img/escudos/betplay/america.png', comp: 'betplay' },
  'tol': { n: 'Deportes Tolima', b: 'img/escudos/betplay/tolima.png', comp: 'betplay' },
  'dim': { n: 'Independiente Medellín', b: 'img/escudos/betplay/medellin.png', comp: 'betplay' },
  'nal': { n: 'Atlético Nacional', b: 'img/escudos/betplay/nacional.png', comp: 'betplay' },
  'mfc': { n: 'Millonarios FC', b: 'img/escudos/betplay/millonarios.png', comp: 'betplay' },
  'lla': { n: 'Llaneros FC', b: 'img/escudos/betplay/llaneros.png', comp: 'betplay' },
  'sfe': { n: 'Santa Fe', b: 'img/escudos/betplay/santa_fe.png', comp: 'betplay' },
  'agu': { n: 'Rionegro Águilas', b: 'img/escudos/betplay/aguilas.png', comp: 'betplay' },
  'buc': { n: 'Atlético Bucaramanga', b: 'img/escudos/betplay/bucaramanga.png', comp: 'betplay' },
  'onc': { n: 'Once Caldas', b: 'img/escudos/betplay/once_caldas.png', comp: 'betplay' },
  'cuc': { n: 'Cúcuta Deportivo', b: 'img/escudos/betplay/cucuta.png', comp: 'betplay' },
  'cal': { n: 'Deportivo Cali', b: 'img/escudos/betplay/cali.png', comp: 'betplay' },
  'int_bog': { n: 'Internacional de Bogotá', b: 'img/escudos/betplay/internacional_bogota.png', comp: 'betplay' },
  'for': { n: 'Fortaleza CEIF', b: 'img/escudos/betplay/fortaleza.png', comp: 'betplay' },
  'per': { n: 'Deportivo Pereira', b: 'img/escudos/betplay/pereira.png', comp: 'betplay' },
  'jag': { n: 'Jaguares de Córdoba', b: 'img/escudos/betplay/jaguares.png', comp: 'betplay' },
  'chi': { n: 'Boyacá Chicó', b: 'img/escudos/betplay/chico.png', comp: 'betplay' },
  'jun': { n: 'Junior de Barranquilla', b: 'img/escudos/betplay/junior.png', comp: 'betplay' },
  'pas': { n: 'Deportivo Pasto', b: 'img/escudos/betplay/pasto.png', comp: 'betplay' },
  'ali': { n: 'Alianza FC', b: 'img/escudos/betplay/alianza.png', comp: 'betplay' },

  /* ================= Premier League (Inglaterra) ================= */
  'mci': { n: 'Manchester City', b: 'img/escudos/premier/man_city.png', comp: 'premier' },
  'ars': { n: 'Arsenal FC', b: 'img/escudos/premier/arsenal.png', comp: 'premier' },
  'liv': { n: 'Liverpool FC', b: 'img/escudos/premier/liverpool.png', comp: 'premier' },
  'che': { n: 'Chelsea FC', b: 'img/escudos/premier/chelsea.png', comp: 'premier' },
  'mun': { n: 'Manchester United', b: 'img/escudos/premier/man_united.png', comp: 'premier' },
  'tot': { n: 'Tottenham Hotspur', b: 'img/escudos/premier/tottenham.png', comp: 'premier' },
  'new': { n: 'Newcastle United', b: 'img/escudos/premier/newcastle.png', comp: 'premier' },
  'avl': { n: 'Aston Villa', b: 'img/escudos/premier/aston_villa.png', comp: 'premier' },
  'bha': { n: 'Brighton & Hove', b: 'img/escudos/premier/brighton.png', comp: 'premier' },
  'whu': { n: 'West Ham United', b: 'img/escudos/premier/west_ham.png', comp: 'premier' },
  'bre': { n: 'Brentford FC', b: 'img/escudos/premier/brentford.png', comp: 'premier' },
  'cry': { n: 'Crystal Palace', b: 'img/escudos/premier/crystal_palace.png', comp: 'premier' },
  'ful': { n: 'Fulham FC', b: 'img/escudos/premier/fulham.png', comp: 'premier' },
  'bou': { n: 'AFC Bournemouth', b: 'img/escudos/premier/bournemouth.png', comp: 'premier' },
  'eve': { n: 'Everton FC', b: 'img/escudos/premier/everton.png', comp: 'premier' },
  'wol': { n: 'Wolverhampton', b: 'img/escudos/premier/wolves.png', comp: 'premier' },
  'nfo': { n: 'Nottingham Forest', b: 'img/escudos/premier/nottingham.png', comp: 'premier' },
  'lei': { n: 'Leicester City', b: 'img/escudos/premier/leicester.png', comp: 'premier' },
  'sou': { n: 'Southampton FC', b: 'img/escudos/premier/southampton.png', comp: 'premier' },
  'ips': { n: 'Ipswich Town', b: 'img/escudos/premier/ipswich.png', comp: 'premier' },

  /* ================= LaLiga EA Sports (España) ================= */
  'rma': { n: 'Real Madrid', b: 'img/escudos/laliga/real_madrid.png', comp: 'laliga' },
  'bar': { n: 'FC Barcelona', b: 'img/escudos/laliga/barcelona.png', comp: 'laliga' },
  'atm': { n: 'Atlético de Madrid', b: 'img/escudos/laliga/atletico_madrid.png', comp: 'laliga' },
  'ath': { n: 'Athletic Club', b: 'img/escudos/laliga/athletic_club.png', comp: 'laliga' },
  'rso': { n: 'Real Sociedad', b: 'img/escudos/laliga/real_sociedad.png', comp: 'laliga' },
  'bet': { n: 'Real Betis', b: 'img/escudos/laliga/betis.png', comp: 'laliga' },
  'sev': { n: 'Sevilla FC', b: 'img/escudos/laliga/sevilla.png', comp: 'laliga' },
  'vil': { n: 'Villarreal CF', b: 'img/escudos/laliga/villarreal.png', comp: 'laliga' },
  'val': { n: 'Valencia CF', b: 'img/escudos/laliga/valencia.png', comp: 'laliga' },
  'gir': { n: 'Girona FC', b: 'img/escudos/laliga/girona.png', comp: 'laliga' },
  'cel': { n: 'Celta de Vigo', b: 'img/escudos/laliga/celta.png', comp: 'laliga' },
  'osa': { n: 'CA Osasuna', b: 'img/escudos/laliga/osasuna.png', comp: 'laliga' },
  'mll': { n: 'RCD Mallorca', b: 'img/escudos/laliga/mallorca.png', comp: 'laliga' },
  'ala': { n: 'Deportivo Alavés', b: 'img/escudos/laliga/alaves.png', comp: 'laliga' },
  'get': { n: 'Getafe CF', b: 'img/escudos/laliga/getafe.png', comp: 'laliga' },
  'ray': { n: 'Rayo Vallecano', b: 'img/escudos/laliga/rayo_vallecano.png', comp: 'laliga' },
  'lpa': { n: 'UD Las Palmas', b: 'img/escudos/laliga/las_palmas.png', comp: 'laliga' },
  'esp': { n: 'RCD Espanyol', b: 'img/escudos/laliga/espanyol.png', comp: 'laliga' },
  'vld': { n: 'Real Valladolid', b: 'img/escudos/laliga/valladolid.png', comp: 'laliga' },
  'leg': { n: 'CD Leganés', b: 'img/escudos/laliga/leganes.png', comp: 'laliga' },
  /* Equipos adicionales España */
  'dep': { n: 'Deportivo de La Coruña', b: 'img/escudos/laliga/deportivo.png', comp: 'laliga' },
  'lvt': { n: 'Levante UD', b: 'img/escudos/laliga/levante.png', comp: 'laliga' },
  'rcs': { n: 'Racing de Santander', b: 'img/escudos/laliga/racing_santander.png', comp: 'laliga' },
  'mal': { n: 'Málaga CF', b: 'img/escudos/laliga/malaga.png', comp: 'laliga' },
  'elc': { n: 'Elche CF', b: 'img/escudos/laliga/elche.png', comp: 'laliga' },

  /* ================= Bundesliga (Alemania) ================= */
  'bay': { n: 'Bayern München', b: 'img/escudos/bundesliga/bayern_munich.png', comp: 'bundesliga' },
  'lev': { n: 'Bayer Leverkusen', b: 'img/escudos/bundesliga/leverkusen.png', comp: 'bundesliga' },
  'bvb': { n: 'Borussia Dortmund', b: 'img/escudos/bundesliga/dortmund.png', comp: 'bundesliga' },
  'rbl': { n: 'RB Leipzig', b: 'img/escudos/bundesliga/leipzig.png', comp: 'bundesliga' },
  'sge': { n: 'Eintracht Frankfurt', b: 'img/escudos/bundesliga/frankfurt.png', comp: 'bundesliga' },
  'vfb': { n: 'VfB Stuttgart', b: 'img/escudos/bundesliga/stuttgart.png', comp: 'bundesliga' },
  'wob': { n: 'VfL Wolfsburg', b: 'img/escudos/bundesliga/wolfsburg.png', comp: 'bundesliga' },
  'bmg': { n: 'Borussia M’gladbach', b: 'img/escudos/bundesliga/monchengladbach.png', comp: 'bundesliga' },
  'svw': { n: 'Werder Bremen', b: 'img/escudos/bundesliga/werder_bremen.png', comp: 'bundesliga' },
  'scf': { n: 'SC Freiburg', b: 'img/escudos/bundesliga/freiburg.png', comp: 'bundesliga' },
  'tsg': { n: 'TSG Hoffenheim', b: 'img/escudos/bundesliga/hoffenheim.png', comp: 'bundesliga' },
  'fca': { n: 'FC Augsburg', b: 'img/escudos/bundesliga/augsburg.png', comp: 'bundesliga' },
  'fcu': { n: 'Union Berlin', b: 'img/escudos/bundesliga/union_berlin.png', comp: 'bundesliga' },
  'fch': { n: '1. FC Heidenheim', b: 'img/escudos/bundesliga/heidenheim.png', comp: 'bundesliga' },
  'm05': { n: 'FSV Mainz 05', b: 'img/escudos/bundesliga/mainz.png', comp: 'bundesliga' },
  'stp': { n: 'FC St. Pauli', b: 'img/escudos/bundesliga/st_pauli.png', comp: 'bundesliga' },
  'ksv': { n: 'Holstein Kiel', b: 'img/escudos/bundesliga/holstein_kiel.png', comp: 'bundesliga' },
  'boc': { n: 'VfL Bochum', b: 'img/escudos/bundesliga/bochum.png', comp: 'bundesliga' },

  /* ================= Champions League (adicionales Europa) ================= */
  'psg': { n: 'Paris Saint-Germain', b: 'img/escudos/champions/psg.png', comp: 'ucl' },
  'int': { n: 'Inter de Milán', b: 'img/escudos/champions/inter.png', comp: 'ucl' },
  'juv': { n: 'Juventus', b: 'img/escudos/champions/juventus.png', comp: 'ucl' },
  'acm': { n: 'AC Milan', b: 'img/escudos/champions/milan.png', comp: 'ucl' },
  'ata': { n: 'Atalanta BC', b: 'img/escudos/champions/atalanta.png', comp: 'ucl' },
  'spo': { n: 'Sporting CP', b: 'img/escudos/champions/sporting.png', comp: 'ucl' },
  'ben': { n: 'SL Benfica', b: 'img/escudos/champions/benfica.png', comp: 'ucl' },
  'fcp': { n: 'FC Porto', b: 'img/escudos/champions/porto.png', comp: 'ucl' },
  'psv': { n: 'PSV Eindhoven', b: 'img/escudos/champions/psv.png', comp: 'ucl' },
  'fey': { n: 'Feyenoord', b: 'img/escudos/champions/feyenoord.png', comp: 'ucl' },
  'asm': { n: 'AS Mónaco', b: 'img/escudos/champions/monaco.png', comp: 'ucl' },
  'bbo': { n: 'Bologna FC', b: 'img/escudos/champions/bologna.png', comp: 'ucl' },

  /* ================= Copa CONMEBOL Libertadores ================= */
  'flu': { n: 'Fluminense', b: 'img/escudos/libertadores/fluminense.png', comp: 'libertadores' },
  'fla': { n: 'Flamengo', b: 'img/escudos/libertadores/flamengo.png', comp: 'libertadores' },
  'pal': { n: 'Palmeiras', b: 'img/escudos/libertadores/palmeiras.png', comp: 'libertadores' },
  'bot': { n: 'Botafogo', b: 'img/escudos/libertadores/botafogo.png', comp: 'libertadores' },
  'cam': { n: 'Atlético Mineiro', b: 'img/escudos/libertadores/atletico_mineiro.png', comp: 'libertadores' },
  'sao': { n: 'São Paulo', b: 'img/escudos/libertadores/sao_paulo.png', comp: 'libertadores' },
  'gre': { n: 'Grêmio', b: 'img/escudos/libertadores/gremio.png', comp: 'libertadores' },
  'riv': { n: 'River Plate', b: 'img/escudos/libertadores/river_plate.png', comp: 'libertadores' },
  'pen': { n: 'Peñarol', b: 'img/escudos/libertadores/penarol.png', comp: 'libertadores' },
  'nac_uru': { n: 'Nacional (Uruguay)', b: 'img/escudos/libertadores/nacional_uru.png', comp: 'libertadores' },
  'col_chi': { n: 'Colo-Colo', b: 'img/escudos/libertadores/colo_colo.png', comp: 'libertadores' },
  'oli': { n: 'Olimpia', b: 'img/escudos/libertadores/olimpia.png', comp: 'libertadores' },
  'bol': { n: 'Bolívar', b: 'img/escudos/libertadores/bolivar.png', comp: 'libertadores' },
  'str': { n: 'The Strongest', b: 'img/escudos/libertadores/the_strongest.png', comp: 'libertadores' },

  /* ================= Copa CONMEBOL Sudamericana ================= */
  'cru': { n: 'Cruzeiro', b: 'img/escudos/sudamericana/cruzeiro.png', comp: 'sudamericana' },
  'cor': { n: 'Corinthians', b: 'img/escudos/sudamericana/corinthians.png', comp: 'sudamericana' },
  'cruz': { n: 'Fortaleza EC', b: 'img/escudos/sudamericana/fortaleza_br.png', comp: 'sudamericana' },
  'lan': { n: 'Lanús', b: 'img/escudos/sudamericana/lanus.png', comp: 'sudamericana' },
  'rac': { n: 'Racing Club', b: 'img/escudos/sudamericana/racing.png', comp: 'sudamericana' },
  'ind': { n: 'Independiente', b: 'img/escudos/sudamericana/independiente.png', comp: 'sudamericana' },
  'cap': { n: 'Athletico Paranaense', b: 'img/escudos/sudamericana/athletico_paranaense.png', comp: 'sudamericana' },
  'inter_rs': { n: 'Internacional', b: 'img/escudos/sudamericana/internacional.png', comp: 'sudamericana' },
  'bel': { n: 'Belgrano', b: 'img/escudos/sudamericana/belgrano.png', comp: 'sudamericana' },
  'dyj': { n: 'Defensa y Justicia', b: 'img/escudos/sudamericana/defensa_justicia.png', comp: 'sudamericana' },
  'ucat': { n: 'Universidad Católica', b: 'img/escudos/sudamericana/universidad_catolica.png', comp: 'sudamericana' },
  'cui': { n: 'Cuiabá EC', b: 'img/escudos/sudamericana/cuiaba.png', comp: 'sudamericana' }
};"""

UCL_MATCHES = """  /* --- UEFA Champions League --- */
  {
    id: 'ucl-1',
    competicion: 'ucl',
    etapa: 'Champions League · Jornada 1',
    fase: 'liga',
    local: 'rma',
    visitante: 'vfb',
    utc: '2026-09-15T19:00:00Z',
    estadio: 'Santiago Bernabéu, Madrid',
    horaOk: true
  },
  {
    id: 'ucl-2',
    competicion: 'ucl',
    etapa: 'Champions League · Jornada 1',
    fase: 'liga',
    local: 'acm',
    visitante: 'liv',
    utc: '2026-09-15T19:00:00Z',
    estadio: 'San Siro, Milán',
    horaOk: true
  },
  {
    id: 'ucl-3',
    competicion: 'ucl',
    etapa: 'Champions League · Jornada 1',
    fase: 'liga',
    local: 'mci',
    visitante: 'int',
    utc: '2026-09-16T19:00:00Z',
    estadio: 'Etihad Stadium, Manchester',
    horaOk: true
  },
  {
    id: 'ucl-4',
    competicion: 'ucl',
    etapa: 'Champions League · Jornada 1',
    fase: 'liga',
    local: 'asm',
    visitante: 'bar',
    utc: '2026-09-17T19:00:00Z',
    estadio: 'Stade Louis II, Mónaco',
    horaOk: true
  },
  {
    id: 'ucl-5',
    competicion: 'ucl',
    etapa: 'Champions League · Jornada 1',
    fase: 'liga',
    local: 'atm',
    visitante: 'rbl',
    utc: '2026-09-17T19:00:00Z',
    estadio: 'Cívitas Metropolitano, Madrid',
    horaOk: true
  },"""

OTHER_MATCHES = """  /* --- Premier League (Inglaterra) --- */
  {
    id: 'pl-1',
    competicion: 'premier',
    etapa: 'Premier League · Clásico de la Premier',
    fase: 'liga',
    local: 'mci',
    visitante: 'ars',
    utc: '2026-09-20T15:30:00Z',
    estadio: 'Etihad Stadium, Manchester',
    horaOk: true
  },
  {
    id: 'pl-2',
    competicion: 'premier',
    etapa: 'Premier League · Partidazo',
    fase: 'liga',
    local: 'liv',
    visitante: 'che',
    utc: '2026-09-20T17:30:00Z',
    estadio: 'Anfield, Liverpool',
    horaOk: true
  },
  {
    id: 'pl-3',
    competicion: 'premier',
    etapa: 'Premier League · Duelo Histórico',
    fase: 'liga',
    local: 'tot',
    visitante: 'mun',
    utc: '2026-09-21T15:00:00Z',
    estadio: 'Tottenham Hotspur Stadium, Londres',
    horaOk: true
  },

  /* --- Bundesliga (Alemania) --- */
  {
    id: 'bun-1',
    competicion: 'bundesliga',
    etapa: 'Bundesliga · Duelo de Campeones',
    fase: 'liga',
    local: 'bay',
    visitante: 'lev',
    utc: '2026-09-27T16:30:00Z',
    estadio: 'Allianz Arena, Múnich',
    horaOk: true
  },
  {
    id: 'bun-2',
    competicion: 'bundesliga',
    etapa: 'Bundesliga · Fecha Destacada',
    fase: 'liga',
    local: 'bvb',
    visitante: 'rbl',
    utc: '2026-10-02T18:30:00Z',
    estadio: 'Signal Iduna Park, Dortmund',
    horaOk: true
  },

  /* --- Copa CONMEBOL Libertadores --- */
  {
    id: 'lib-1',
    competicion: 'libertadores',
    etapa: 'Libertadores · Cuartos de Final',
    fase: 'eliminatorias',
    local: 'col_chi',
    visitante: 'riv',
    utc: '2026-09-17T21:30:00Z',
    estadio: 'Monumental David Arellano, Santiago',
    horaOk: true
  },
  {
    id: 'lib-2',
    competicion: 'libertadores',
    etapa: 'Libertadores · Cuartos de Final',
    fase: 'eliminatorias',
    local: 'bot',
    visitante: 'sao',
    utc: '2026-09-18T21:30:00Z',
    estadio: 'Nilton Santos, Río de Janeiro',
    horaOk: true
  },
  {
    id: 'lib-3',
    competicion: 'libertadores',
    etapa: 'Libertadores · Cuartos de Final',
    fase: 'eliminatorias',
    local: 'fla',
    visitante: 'pen',
    utc: '2026-09-19T21:00:00Z',
    estadio: 'Maracaná, Río de Janeiro',
    horaOk: true
  },

  /* --- Copa CONMEBOL Sudamericana --- */
  {
    id: 'sud-1',
    competicion: 'sudamericana',
    etapa: 'Sudamericana · Cuartos de Final',
    fase: 'eliminatorias',
    local: 'cor',
    visitante: 'cruz',
    utc: '2026-09-17T23:30:00Z',
    estadio: 'Neo Química Arena, São Paulo',
    horaOk: true
  },
  {
    id: 'sud-2',
    competicion: 'sudamericana',
    etapa: 'Sudamericana · Cuartos de Final',
    fase: 'eliminatorias',
    local: 'cap',
    visitante: 'rac',
    utc: '2026-09-19T23:30:00Z',
    estadio: 'Ligga Arena, Curitiba',
    horaOk: true
  },
  {
    id: 'sud-3',
    competicion: 'sudamericana',
    etapa: 'Sudamericana · Cuartos de Final',
    fase: 'eliminatorias',
    local: 'lan',
    visitante: 'dim',
    utc: '2026-09-18T23:30:00Z',
    estadio: 'Ciudad de Lanús, Buenos Aires',
    horaOk: true
  }"""

# Format BetPlay matches as JS objects
bp_lines = ['  /* --- Liga BetPlay Dimayor (Colombia) — 19 Fechas / 190 Partidos --- */']
for m in betplay_matches:
    bp_lines.append('  {')
    bp_lines.append(f"    id: '{m['id']}',")
    bp_lines.append("    competicion: 'betplay',")
    bp_lines.append(f"    jornada: {m['jornada']},")
    bp_lines.append(f"    etapa: '{m['etapa']}',")
    bp_lines.append("    fase: 'liga',")
    bp_lines.append(f"    local: '{m['local']}',")
    bp_lines.append(f"    visitante: '{m['visitante']}',")
    bp_lines.append(f"    fechaStr: '{m['fechaStr']}',")
    bp_lines.append(f"    horaStr: '{m['horaStr']}',")
    bp_lines.append(f"    utc: '{m['utc']}',")
    bp_lines.append(f"    estadio: '{m['estadio']}',")
    bp_lines.append(f"    estado: '{m['estado']}',")
    bp_lines.append('    horaOk: true' + (',' if 'resultado' in m or 'motivoAplazamiento' in m else ''))
    if 'motivoAplazamiento' in m:
        bp_lines.append(f"    motivoAplazamiento: '{m['motivoAplazamiento']}'" + (',' if 'resultado' in m else ''))
    if 'resultado' in m:
        res_str = json.dumps(m['resultado'], ensure_ascii=False)
        bp_lines.append(f"    resultado: {res_str}")
    bp_lines.append('  },')

bp_code = '\n'.join(bp_lines)

# Format LaLiga matches as JS objects
ll_lines = ['  /* --- LaLiga EA Sports (España) — 38 Jornadas / 380 Partidos --- */']
for m in laliga_matches:
    ll_lines.append('  {')
    ll_lines.append(f"    id: '{m['id']}',")
    ll_lines.append("    competicion: 'laliga',")
    ll_lines.append(f"    jornada: {m['jornada']},")
    ll_lines.append(f"    etapa: '{m['etapa']}',")
    ll_lines.append("    fase: 'liga',")
    ll_lines.append(f"    local: '{m['local']}',")
    ll_lines.append(f"    visitante: '{m['visitante']}',")
    ll_lines.append(f"    fechaStr: '{m['fechaStr']}',")
    ll_lines.append(f"    horaStr: '{m['horaStr']}',")
    ll_lines.append(f"    utc: '{m['utc']}',")
    bp_lines_stad = m['estadio'].replace("'", "\\'")
    ll_lines.append(f"    estadio: '{bp_lines_stad}',")
    ll_lines.append(f"    estado: '{m['estado']}',")
    ll_lines.append('    horaOk: true' + (',' if 'resultado' in m else ''))
    if 'resultado' in m:
        res_str = json.dumps(m['resultado'], ensure_ascii=False)
        ll_lines.append(f"    resultado: {res_str}")
    ll_lines.append('  },')

ll_code = '\n'.join(ll_lines)

# Format RESULTADOS_INICIALES
res_lines = ['export const RESULTADOS_INICIALES = {']
for pid, r in resultados_iniciales.items():
    res_str = json.dumps(r, ensure_ascii=False)
    res_lines.append(f"  '{pid}': {res_str},")
res_lines.append('};')
res_code = '\n'.join(res_lines)

FOOTER = """const FIXTURE = {
  competiciones: COMPETICIONES,
  equipos: EQUIPOS,
  grupos: {},
  partidos: PARTIDOS,
  resultadosIniciales: RESULTADOS_INICIALES,

  /* Retorna datos del equipo con escudo adaptable (imagen con fallback) */
  equipo(c) {
    const e = EQUIPOS[c];
    if (!e) return { n: c || 'Por definir', b: '⚽', g: '', comp: '' };
    
    const src = e.escudo || (typeof e.b === 'string' && (e.b.includes('/') || e.b.endsWith('.png') || e.b.endsWith('.svg')) ? e.b : null);
    const b = src 
      ? `<img src="${src}" class="escudo-img" alt="${e.n}" loading="lazy" onerror="this.onerror=null;this.outerHTML='⚽'">`
      : (e.b || '⚽');

    return { ...e, b, escudoSrc: src };
  },

  porId(id) {
    return this.partidos.find(p => p.id === id);
  },

  porCompeticion(compId) {
    return this.partidos.filter(p => p.competicion === compId);
  },

  porFecha(jornada) {
    return this.partidos.filter(p => p.jornada === Number(jornada));
  }
};

window.FIXTURE = FIXTURE;
export { FIXTURE };
"""

new_fixture_content = f"""{HEADER}

/* ================= PARTIDOS INICIALES ================= */
const PARTIDOS = [
{UCL_MATCHES}

{bp_code}

{ll_code}

{OTHER_MATCHES}
];

{res_code}

{FOOTER}"""

with open('scorecast/js/fixture.js', 'w', encoding='utf-8') as f:
    f.write(new_fixture_content)

print(f'SUCCESS: scorecast/js/fixture.js written successfully!')
print(f'Total matches: {len(betplay_matches) + len(laliga_matches) + 5 + 3 + 2 + 3 + 3}')
print(f'Total resultados iniciales: {len(resultados_iniciales)}')
print(f'File size: {len(new_fixture_content)} bytes')

