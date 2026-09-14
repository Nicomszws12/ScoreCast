/* ============================================================
   SCORECAST — PERFILES DE EQUIPO ESTILO SOFASCORE / ONEFOOTBALL
   ------------------------------------------------------------
   Proporciona información detallada, palmarés, historia,
   partidos jugados y próximos partidos para todos los clubes.
   ============================================================ */

import { FIXTURE } from './fixture.js';
import { U } from './utils.js';

// Base de datos detallada de clubes principales
const CLUBES_DATA = {
  // LIGA BETPLAY (COLOMBIA)
  mfc: {
    nombre: 'Millonarios FC',
    apodo: 'Los Embajadores, El Ballet Azul',
    pais: 'Colombia',
    ciudad: 'Bogotá',
    estadio: 'Estadio Nemesio Camacho El Campín',
    capacidad: '36.343 espectadores',
    fundacion: 1946,
    color: '#0033a0',
    titulos: [
      { nombre: 'Liga Colombiana', cantidad: 16, icono: '🏆' },
      { nombre: 'Copa Colombia', cantidad: 3, icono: '🥇' },
      { nombre: 'Superliga de Colombia', cantidad: 2, icono: '⭐' },
      { nombre: 'Copa Merconorte', cantidad: 1, icono: '🌎' }
    ],
    historia: 'Fundado el 18 de junio de 1946, Millonarios es uno de los clubes más laureados y tradicionales de Colombia y Sudamérica. Durante la década de 1950 protagonizó la legendaria época de "El Dorado", maravillando al mundo como "El Ballet Azul" con figuras de talla planetaria como Alfredo Di Stéfano, Adolfo Pedernera y Néstor Rossi. Ha cosechado 16 estrellas de primera división y un legado imborrable en el fútbol continental.'
  },
  sfe: {
    nombre: 'Independiente Santa Fe',
    apodo: 'Los Cardenales, El Expreso Rojo, El Primer Campeón',
    pais: 'Colombia',
    ciudad: 'Bogotá',
    estadio: 'Estadio Nemesio Camacho El Campín',
    capacidad: '36.343 espectadores',
    fundacion: 1941,
    color: '#e0001a',
    titulos: [
      { nombre: 'Liga Colombiana', cantidad: 9, icono: '🏆' },
      { nombre: 'Copa Sudamericana', cantidad: 1, icono: '🌎' },
      { nombre: 'Copa Suruga Bank', cantidad: 1, icono: '🌐' },
      { nombre: 'Copa Colombia', cantidad: 2, icono: '🥇' },
      { nombre: 'Superliga de Colombia', cantidad: 4, icono: '⭐' }
    ],
    historia: 'Fundado el 28 de febrero de 1941 por estudiantes del Colegio Mayor del Rosario, Santa Fe tiene el honor histórico de ser el Primer Campeón de Colombia en 1948. En 2015 alcanzó la cumbre continental al consagrarse como el único club colombiano en levantar la Copa CONMEBOL Sudamericana, además de vencer al Kashima Antlers en Japón para conquistar la Copa Suruga Bank 2016.'
  },
  nal: {
    nombre: 'Atlético Nacional',
    apodo: 'El Verde de la Montaña, El Rey de Copas',
    pais: 'Colombia',
    ciudad: 'Medellín',
    estadio: 'Estadio Atanasio Girardot',
    capacidad: '45.000 espectadores',
    fundacion: 1947,
    color: '#00843d',
    titulos: [
      { nombre: 'Copa Libertadores', cantidad: 2, icono: '🌎' },
      { nombre: 'Recopa Sudamericana', cantidad: 1, icono: '⭐' },
      { nombre: 'Copa Interamericana', cantidad: 2, icono: '🌐' },
      { nombre: 'Copa Merconorte', cantidad: 2, icono: '🌎' },
      { nombre: 'Liga Colombiana', cantidad: 17, icono: '🏆' },
      { nombre: 'Copa Colombia', cantidad: 6, icono: '🥇' },
      { nombre: 'Superliga de Colombia', cantidad: 3, icono: '⭐' }
    ],
    historia: 'Fundado en 1947, Atlético Nacional es el club más laureado de Colombia con más de 30 títulos oficiales. Conquistó la Copa Libertadores de América en dos ocasiones (1989 y 2016), siendo el primer equipo colombiano en alzar la máxima gloria continental. Su filosofía de "Puro Criollo" en los 80 y su juego vistoso marcaron un hito en la historia de la CONMEBOL.'
  },
  ame: {
    nombre: 'América de Cali',
    apodo: 'Los Diablos Rojos, La Mecha',
    pais: 'Colombia',
    ciudad: 'Cali',
    estadio: 'Estadio Olímpico Pascual Guerrero',
    capacidad: '38.000 espectadores',
    fundacion: 1927,
    color: '#d00000',
    titulos: [
      { nombre: 'Liga Colombiana', cantidad: 15, icono: '🏆' },
      { nombre: 'Copa Merconorte', cantidad: 1, icono: '🌎' },
      { nombre: 'Superliga de Colombia', cantidad: 1, icono: '⭐' }
    ],
    historia: 'Fundado el 13 de febrero de 1927, América de Cali es uno de los gigantes sudamericanos. Logró el histórico pentacampeonato en Colombia (1982-1986) bajo el mando de Gabriel Ochoa Uribe y disputó cuatro finales de Copa Libertadores (tres de ellas consecutivas). En 1996 fue galardonado por la IFFHS como el segundo mejor club del mundo.'
  },
  cal: {
    nombre: 'Deportivo Cali',
    apodo: 'Los Azucareros, El Verdiblanco',
    pais: 'Colombia',
    ciudad: 'Cali / Palmira',
    estadio: 'Estadio Deportivo Cali (Palmaseca)',
    capacidad: '44.000 espectadores',
    fundacion: 1912,
    color: '#006633',
    titulos: [
      { nombre: 'Liga Colombiana', cantidad: 10, icono: '🏆' },
      { nombre: 'Copa Colombia', cantidad: 1, icono: '🥇' },
      { nombre: 'Superliga de Colombia', cantidad: 1, icono: '⭐' }
    ],
    historia: 'Con raíces que se remontan a 1912, Deportivo Cali es una de las instituciones decanas de Colombia. Fue el primer club colombiano en clasificar a una final de Copa Libertadores de América (1978 ante Boca Juniors) y repitió final en 1999 ante Palmeiras. Cuenta con el estadio propio más imponente del país y una cantera prolífica.'
  },
  jun: {
    nombre: 'Junior de Barranquilla',
    apodo: 'Los Tiburones, El Rojiblanco',
    pais: 'Colombia',
    ciudad: 'Barranquilla',
    estadio: 'Estadio Metropolitano Roberto Meléndez',
    capacidad: '46.692 espectadores',
    fundacion: 1924,
    color: '#c8102e',
    titulos: [
      { nombre: 'Liga Colombiana', cantidad: 10, icono: '🏆' },
      { nombre: 'Copa Colombia', cantidad: 2, icono: '🥇' },
      { nombre: 'Superliga de Colombia', cantidad: 2, icono: '⭐' }
    ],
    historia: 'Fundado en 1924 en el barrio San Roque de Barranquilla, Junior es el símbolo supremo y pasión de la Costa Caribe colombiana. Por sus filas pasaron leyendas mundiales como Garrincha y Carlos "El Pibe" Valderrama. Subcampeón de Copa Sudamericana 2018 y diez veces monarca de la Liga BetPlay.'
  },
  dim: {
    nombre: 'Independiente Medellín',
    apodo: 'El Poderoso de la Montaña, El Decano',
    pais: 'Colombia',
    ciudad: 'Medellín',
    estadio: 'Estadio Atanasio Girardot',
    capacidad: '45.000 espectadores',
    fundacion: 1913,
    color: '#d6001c',
    titulos: [
      { nombre: 'Liga Colombiana', cantidad: 6, icono: '🏆' },
      { nombre: 'Copa Colombia', cantidad: 3, icono: '🥇' }
    ],
    historia: 'Fundado el 14 de noviembre de 1913, "El Poderoso" es el club más antiguo del fútbol profesional colombiano en actividad ininterrumpida. Su apasionada hinchada y su protagonismo continental, alcanzando semifinales de Copa Libertadores en 2003, lo convierten en una institución histórica del país.'
  },
  onc: {
    nombre: 'Once Caldas',
    apodo: 'El Blanco Blanco',
    pais: 'Colombia',
    ciudad: 'Manizales',
    estadio: 'Estadio Palogrande',
    capacidad: '32.000 espectadores',
    fundacion: 1961,
    color: '#111111',
    titulos: [
      { nombre: 'Copa Libertadores', cantidad: 1, icono: '🌎' },
      { nombre: 'Liga Colombiana', cantidad: 4, icono: '🏆' }
    ],
    historia: 'El Once Caldas escribió una de las gestas más gloriosas del fútbol mundial en 2004 al proclamarse Campeón de la Copa CONMEBOL Libertadores frente al poderoso Boca Juniors de Carlos Bianchi, tras eliminar a gigantes como Santos y São Paulo. Es uno de los únicos dos clubes colombianos con la gloria eterna de la Libertadores.'
  },
  tol: {
    nombre: 'Deportes Tolima',
    apodo: 'El Vinotinto y Oro, Los Pijaos',
    pais: 'Colombia',
    ciudad: 'Ibagué',
    estadio: 'Estadio Manuel Murillo Toro',
    capacidad: '28.100 espectadores',
    fundacion: 1954,
    color: '#7b1113',
    titulos: [
      { nombre: 'Liga Colombiana', cantidad: 3, icono: '🏆' },
      { nombre: 'Copa Colombia', cantidad: 1, icono: '🥇' },
      { nombre: 'Superliga de Colombia', cantidad: 1, icono: '⭐' }
    ],
    historia: 'Fundado en 1954, Deportes Tolima es uno de los clubes más competitivos y respetados de Colombia en las últimas dos décadas, con títulos de Liga en 2003, 2018 y 2021, y múltiples participaciones destacadas en Copa Libertadores y Sudamericana.'
  },
  buc: {
    nombre: 'Atlético Bucaramanga',
    apodo: 'Los Leopardos, El Auriverde',
    pais: 'Colombia',
    ciudad: 'Bucaramanga',
    estadio: 'Estadio Américo Montanini',
    capacidad: '25.000 espectadores',
    fundacion: 1949,
    color: '#ffd100',
    titulos: [
      { nombre: 'Liga Colombiana', cantidad: 1, icono: '🏆' }
    ],
    historia: 'Fundado en 1949, el club leopardo hizo historia en 2024 al conquistar su primera estrella de la Liga BetPlay tras 75 años de espera, desatando la mayor fiesta futbolística en la historia del departamento de Santander.'
  },

  // PREMIER LEAGUE (INGLATERRA)
  mci: {
    nombre: 'Manchester City',
    apodo: 'Cityzens, Sky Blues',
    pais: 'Inglaterra',
    ciudad: 'Manchester',
    estadio: 'Etihad Stadium',
    capacidad: '53.400 espectadores',
    fundacion: 1880,
    color: '#6cabdd',
    titulos: [
      { nombre: 'Champions League', cantidad: 1, icono: '🏆' },
      { nombre: 'Mundial de Clubes FIFA', cantidad: 1, icono: '🌐' },
      { nombre: 'Premier League', cantidad: 10, icono: '🥇' },
      { nombre: 'FA Cup', cantidad: 7, icono: '🛡️' },
      { nombre: 'Carabao Cup', cantidad: 8, icono: '🎖️' }
    ],
    historia: 'Fundado en 1880 como St. Mark’s, Manchester City se ha transformado en el equipo más dominante del fútbol inglés contemporáneo. Bajo la dirección de Pep Guardiola logró el histórico triplete continental en 2023 y se convirtió en el primer club en ganar cuatro títulos consecutivos de Premier League.'
  },
  ars: {
    nombre: 'Arsenal FC',
    apodo: 'The Gunners',
    pais: 'Inglaterra',
    ciudad: 'Londres',
    estadio: 'Emirates Stadium',
    capacidad: '60.704 espectadores',
    fundacion: 1886,
    color: '#db0007',
    titulos: [
      { nombre: 'Premier League / First Division', cantidad: 13, icono: '🏆' },
      { nombre: 'FA Cup', cantidad: 14, icono: '🛡️' },
      { nombre: 'Recopa de Europa', cantidad: 1, icono: '🌎' },
      { nombre: 'FA Community Shield', cantidad: 17, icono: '⭐' }
    ],
    historia: 'Fundado en 1886 por obreros de la fábrica de armamento Royal Arsenal en Woolwich, el Arsenal es el rey absoluto de la FA Cup con 14 trofeos. En la temporada 2003-04 forjó la mayor leyenda moderna de la liga al consagrarse campeón invicto ("Los Invencibles") con Arsène Wenger y Thierry Henry.'
  },
  liv: {
    nombre: 'Liverpool FC',
    apodo: 'The Reds',
    pais: 'Inglaterra',
    ciudad: 'Liverpool',
    estadio: 'Anfield',
    capacidad: '61.276 espectadores',
    fundacion: 1892,
    color: '#c8102e',
    titulos: [
      { nombre: 'Champions League / Copa de Europa', cantidad: 6, icono: '🏆' },
      { nombre: 'Mundial de Clubes FIFA', cantidad: 1, icono: '🌐' },
      { nombre: 'Premier League / First Division', cantidad: 19, icono: '🥇' },
      { nombre: 'Europa League / Copa UEFA', cantidad: 3, icono: '🥈' },
      { nombre: 'FA Cup', cantidad: 8, icono: '🛡️' },
      { nombre: 'Carabao Cup', cantidad: 10, icono: '🎖️' }
    ],
    historia: 'Fundado en 1892, Liverpool FC es la institución inglesa más laureada en Europa con 6 Copas de Europa. Su templo sagrado Anfield y el himno "You’ll Never Walk Alone" son iconos universales. Artífice del "Milagro de Estambul" en 2005 y de una época dorada de alta intensidad.'
  },
  che: {
    nombre: 'Chelsea FC',
    apodo: 'The Blues',
    pais: 'Inglaterra',
    ciudad: 'Londres',
    estadio: 'Stamford Bridge',
    capacidad: '40.341 espectadores',
    fundacion: 1905,
    color: '#034694',
    titulos: [
      { nombre: 'Champions League', cantidad: 2, icono: '🏆' },
      { nombre: 'Europa League', cantidad: 2, icono: '🥈' },
      { nombre: 'Mundial de Clubes FIFA', cantidad: 1, icono: '🌐' },
      { nombre: 'Premier League', cantidad: 6, icono: '🥇' },
      { nombre: 'FA Cup', cantidad: 8, icono: '🛡️' }
    ],
    historia: 'Fundado en 1905 en el pub The Rising Sun, Chelsea es uno de los grandes gigantes de Londres y Europa. Conquistó la Champions League en 2012 (en Múnich ante el Bayern) y en 2021 (en Oporto ante Man City), siendo uno de los selectos clubes en ganar todos los torneos mayores de la UEFA.'
  },
  mun: {
    nombre: 'Manchester United',
    apodo: 'The Red Devils',
    pais: 'Inglaterra',
    ciudad: 'Manchester',
    estadio: 'Old Trafford (El Teatro de los Sueños)',
    capacidad: '74.310 espectadores',
    fundacion: 1878,
    color: '#da291c',
    titulos: [
      { nombre: 'Champions League / Copa de Europa', cantidad: 3, icono: '🏆' },
      { nombre: 'Copa Intercontinental / Mundial Clubes', cantidad: 2, icono: '🌐' },
      { nombre: 'Premier League / First Division', cantidad: 20, icono: '🥇' },
      { nombre: 'Europa League', cantidad: 1, icono: '🥈' },
      { nombre: 'FA Cup', cantidad: 13, icono: '🛡️' }
    ],
    historia: 'Fundado en 1878 como Newton Heath LYR, Manchester United es la entidad más ganadora de ligas inglesas con 20 conquistas. Superó la tragedia aérea de Múnich en 1958 para ser el primer club inglés campeón de Europa en 1968, y bajo la legendaria era de Sir Alex Ferguson dominó dos décadas logrando el triplete de 1999.'
  },
  tot: {
    nombre: 'Tottenham Hotspur',
    apodo: 'Spurs, The Lilywhites',
    pais: 'Inglaterra',
    ciudad: 'Londres',
    estadio: 'Tottenham Hotspur Stadium',
    capacidad: '62.850 espectadores',
    fundacion: 1882,
    color: '#132257',
    titulos: [
      { nombre: 'First Division (Liga)', cantidad: 2, icono: '🏆' },
      { nombre: 'Copa UEFA', cantidad: 2, icono: '🥈' },
      { nombre: 'Recopa de Europa', cantidad: 1, icono: '🌎' },
      { nombre: 'FA Cup', cantidad: 8, icono: '🛡️' }
    ],
    historia: 'Fundado en 1882 en el norte de Londres, fue el primer club británico en conquistar un título europeo (Recopa 1963) y el primer campeón de la Copa de la UEFA en 1972. Cuenta con uno de los recintos deportivos más ultramodernos del planeta.'
  },

  // LALIGA EA SPORTS (ESPAÑA)
  rma: {
    nombre: 'Real Madrid CF',
    apodo: 'Los Blancos, Los Merengues, Los Vikingos',
    pais: 'España',
    ciudad: 'Madrid',
    estadio: 'Estadio Santiago Bernabéu',
    capacidad: '85.000 espectadores',
    fundacion: 1902,
    color: '#00529f',
    titulos: [
      { nombre: 'UEFA Champions League', cantidad: 15, icono: '🏆' },
      { nombre: 'Mundial de Clubes / Intercontinental', cantidad: 8, icono: '🌐' },
      { nombre: 'Supercopa de Europa', cantidad: 6, icono: '⭐' },
      { nombre: 'LaLiga Española', cantidad: 36, icono: '🥇' },
      { nombre: 'Copa del Rey', cantidad: 20, icono: '🛡️' },
      { nombre: 'Copa de la UEFA', cantidad: 2, icono: '🥈' }
    ],
    historia: 'Elegido por la FIFA como el Mejor Club del Siglo XX, el Real Madrid es el máximo exponente de gloria en el fútbol mundial con 15 Copas de Europa / Champions League y 36 títulos de Liga Española. Desde Di Stéfano y Puskás hasta los Galácticos y la dinastía de las cinco Champions en la última década, su mística ganadora no tiene paralelo.'
  },
  bar: {
    nombre: 'FC Barcelona',
    apodo: 'Blaugrana, Culers',
    pais: 'España',
    ciudad: 'Barcelona',
    estadio: 'Spotify Camp Nou',
    capacidad: '105.000 espectadores (remodelación)',
    fundacion: 1899,
    color: '#a50044',
    titulos: [
      { nombre: 'UEFA Champions League', cantidad: 5, icono: '🏆' },
      { nombre: 'Mundial de Clubes FIFA', cantidad: 3, icono: '🌐' },
      { nombre: 'Supercopa de Europa', cantidad: 5, icono: '⭐' },
      { nombre: 'LaLiga Española', cantidad: 27, icono: '🥇' },
      { nombre: 'Copa del Rey', cantidad: 31, icono: '🛡️' },
      { nombre: 'Recopa de Europa', cantidad: 4, icono: '🌎' }
    ],
    historia: 'Fundado en 1899 por Joan Gamper bajo el lema "Més que un club". Famoso mundialmente por su cantera de La Masia y su fútbol de posesión y fantasía. Protagonista del histórico "Sextete" de 2009 y de los años mágicos de Lionel Messi, Pep Guardiola, Xavi e Iniesta, acumulando 31 Copas del Rey y 5 Champions League.'
  },
  atm: {
    nombre: 'Atlético de Madrid',
    apodo: 'Los Colchoneros, Los Rojiblancos, Los Indios',
    pais: 'España',
    ciudad: 'Madrid',
    estadio: 'Riyadh Air Metropolitano',
    capacidad: '70.460 espectadores',
    fundacion: 1903,
    color: '#cb3524',
    titulos: [
      { nombre: 'LaLiga Española', cantidad: 11, icono: '🏆' },
      { nombre: 'Copa del Rey', cantidad: 10, icono: '🛡️' },
      { nombre: 'UEFA Europa League', cantidad: 3, icono: '🥈' },
      { nombre: 'Supercopa de Europa', cantidad: 3, icono: '⭐' },
      { nombre: 'Copa Intercontinental', cantidad: 1, icono: '🌐' }
    ],
    historia: 'Fundado en 1903 por estudiantes vascos en Madrid, el Atlético representa el coraje, corazón y garra inquebrantable. Protagonista de memorables gestas continentales y tres títulos de Europa League, además de sus 11 coronas de Liga compitiendo cara a cara ante gigantes.'
  },

  // BUNDESLIGA (ALEMANIA)
  bay: {
    nombre: 'FC Bayern München',
    apodo: 'Die Bayern, Der Rekordmeister',
    pais: 'Alemania',
    ciudad: 'Múnich',
    estadio: 'Allianz Arena',
    capacidad: '75.024 espectadores',
    fundacion: 1900,
    color: '#dc052d',
    titulos: [
      { nombre: 'Champions League / Copa de Europa', cantidad: 6, icono: '🏆' },
      { nombre: 'Mundial de Clubes / Intercontinental', cantidad: 4, icono: '🌐' },
      { nombre: 'Bundesliga', cantidad: 33, icono: '🥇' },
      { nombre: 'DFB-Pokal (Copa Alemana)', cantidad: 20, icono: '🛡️' },
      { nombre: 'Supercopa de Europa', cantidad: 2, icono: '⭐' }
    ],
    historia: 'El gigante indiscutible del fútbol germano y coloso del balompié mundial. Con 33 títulos de Bundesliga y 6 Champions League (incluyendo dos tripletes continentales en 2013 y 2020), ha tenido en sus filas a leyendas absolutas como Franz Beckenbauer, Gerd Müller, Karl-Heinz Rummenigge y Manuel Neuer.'
  },
  bvb: {
    nombre: 'Borussia Dortmund',
    apodo: 'Die Schwarzgelben (Los Negriamarillos)',
    pais: 'Alemania',
    ciudad: 'Dortmund',
    estadio: 'Signal Iduna Park (Westfalenstadion)',
    capacidad: '81.365 espectadores',
    fundacion: 1909,
    color: '#fde100',
    titulos: [
      { nombre: 'Champions League', cantidad: 1, icono: '🏆' },
      { nombre: 'Copa Intercontinental', cantidad: 1, icono: '🌐' },
      { nombre: 'Recopa de Europa', cantidad: 1, icono: '🌎' },
      { nombre: 'Bundesliga', cantidad: 8, icono: '🥇' },
      { nombre: 'DFB-Pokal', cantidad: 5, icono: '🛡️' }
    ],
    historia: 'Famoso en todo el planeta por su inigualable "Muro Amarillo" (Gelbe Wand) en el Westfalenstadion, el Dortmund alzó la Champions League en 1997 venciendo a la Juventus. Es reconocido por su estilo de juego electrizante y su capacidad para forjar súper estrellas mundiales.'
  },
  lev: {
    nombre: 'Bayer 04 Leverkusen',
    apodo: 'Die Werkself (El Equipo de la Fábrica)',
    pais: 'Alemania',
    ciudad: 'Leverkusen',
    estadio: 'BayArena',
    capacidad: '30.210 espectadores',
    fundacion: 1904,
    color: '#e32219',
    titulos: [
      { nombre: 'Bundesliga', cantidad: 1, icono: '🏆' },
      { nombre: 'DFB-Pokal', cantidad: 2, icono: '🛡️' },
      { nombre: 'Copa de la UEFA', cantidad: 1, icono: '🥈' },
      { nombre: 'DFL-Supercup', cantidad: 1, icono: '⭐' }
    ],
    historia: 'Fundado en 1904 por empleados de la farmacéutica Bayer, rompió todos los récords en 2024 de la mano de Xabi Alonso al consagrarse campeón invicto de la Bundesliga y ganar el doblete nacional, pulverizando el récord europeo de partidos sin conocer la derrota.'
  },

  // COPA LIBERTADORES / SUDAMERICANA (CONMEBOL)
  fla: {
    nombre: 'CR Flamengo',
    apodo: 'O Mengão, O Mais Querido, Rubro-Negro',
    pais: 'Brasil',
    ciudad: 'Río de Janeiro',
    estadio: 'Estadio Maracanã',
    capacidad: '78.838 espectadores',
    fundacion: 1895,
    color: '#c00',
    titulos: [
      { nombre: 'Copa Libertadores', cantidad: 3, icono: '🏆' },
      { nombre: 'Copa Intercontinental', cantidad: 1, icono: '🌐' },
      { nombre: 'Recopa Sudamericana', cantidad: 1, icono: '⭐' },
      { nombre: 'Brasileirão (Serie A)', cantidad: 8, icono: '🥇' },
      { nombre: 'Copa do Brasil', cantidad: 5, icono: '🛡️' }
    ],
    historia: 'El club con la mayor torcida del planeta, superando los 40 millones de hinchas. Con Zico como máxima deidad conquistó América y el Mundo en 1981, y en la era moderna levantó las Copas Libertadores 2019 y 2022 con un poderío ofensivo temible en el Maracanã.'
  },
  riv: {
    nombre: 'River Plate',
    apodo: 'El Millonario, La Banda',
    pais: 'Argentina',
    ciudad: 'Buenos Aires',
    estadio: 'Estadio Más Monumental',
    capacidad: '84.567 espectadores',
    fundacion: 1901,
    color: '#eb1c24',
    titulos: [
      { nombre: 'Copa Libertadores', cantidad: 4, icono: '🏆' },
      { nombre: 'Copa Intercontinental', cantidad: 1, icono: '🌐' },
      { nombre: 'Copa Sudamericana', cantidad: 1, icono: '🥈' },
      { nombre: 'Recopa Sudamericana', cantidad: 3, icono: '⭐' },
      { nombre: 'Liga Argentina', cantidad: 38, icono: '🥇' }
    ],
    historia: 'Fundado en 1901 en el barrio de La Boca, River Plate es el máximo ganador de campeonatos locales en Argentina. Cuna de "La Máquina", consagró 4 Copas Libertadores, coronando en 2018 la histórica final de Madrid ante su eterno rival Boca Juniors. Su estadio es el de mayor aforo en toda Sudamérica.'
  },
  cabj: {
    nombre: 'Boca Juniors',
    apodo: 'El Xeneize, La Mitad Más Uno',
    pais: 'Argentina',
    ciudad: 'Buenos Aires',
    estadio: 'Estadio Alberto J. Armando (La Bombonera)',
    capacidad: '54.000 espectadores',
    fundacion: 1905,
    color: '#002b66',
    titulos: [
      { nombre: 'Copa Libertadores', cantidad: 6, icono: '🏆' },
      { nombre: 'Copa Intercontinental', cantidad: 3, icono: '🌐' },
      { nombre: 'Copa Sudamericana', cantidad: 2, icono: '🥈' },
      { nombre: 'Recopa Sudamericana', cantidad: 4, icono: '⭐' },
      { nombre: 'Liga Argentina', cantidad: 35, icono: '🥇' }
    ],
    historia: 'Fundado por inmigrantes genoveses en 1905, Boca Juniors es una de las marcas más reverenciadas del fútbol universal. Su mítico templo La Bombonera "no late, late el corazón". Hexacampeón de Copa Libertadores y tricampeón del Mundo (derrotando al Real Madrid y al Milan), es cuna de Diego Armando Maradona y Juan Román Riquelme.'
  },
  pal: {
    nombre: 'Palmeiras',
    apodo: 'O Verdão, Alviverde',
    pais: 'Brasil',
    ciudad: 'São Paulo',
    estadio: 'Allianz Parque',
    capacidad: '43.713 espectadores',
    fundacion: 1914,
    color: '#006437',
    titulos: [
      { nombre: 'Copa Libertadores', cantidad: 3, icono: '🏆' },
      { nombre: 'Recopa Sudamericana', cantidad: 1, icono: '⭐' },
      { nombre: 'Brasileirão', cantidad: 12, icono: '🥇' },
      { nombre: 'Copa do Brasil', cantidad: 4, icono: '🛡️' }
    ],
    historia: 'Fundado en 1914 por la colectividad italiana como Palestra Italia, Palmeiras es el mayor campeón nacional de Brasil con 12 Brasileirãos. Bicampeón consecutivo de Copa Libertadores en 2020 y 2021 de la mano de Abel Ferreira.'
  },
  sao: {
    nombre: 'São Paulo FC',
    apodo: 'O Soberano, Tricolor Paulista',
    pais: 'Brasil',
    ciudad: 'São Paulo',
    estadio: 'Estádio do Morumbi',
    capacidad: '66.795 espectadores',
    fundacion: 1930,
    color: '#c00',
    titulos: [
      { nombre: 'Copa Libertadores', cantidad: 3, icono: '🏆' },
      { nombre: 'Mundial de Clubes / Intercontinental', cantidad: 3, icono: '🌐' },
      { nombre: 'Copa Sudamericana', cantidad: 1, icono: '🥈' },
      { nombre: 'Brasileirão', cantidad: 6, icono: '🥇' }
    ],
    historia: 'Tricampeón del Mundo (venciendo al Barcelona de Cruyff, al Milan de Capello y al Liverpool de Gerrard) y tricampeón de América, São Paulo es una de las instituciones más respetadas y condecoradas del continente.'
  },
  idv: {
    nombre: 'Independiente del Valle',
    apodo: 'El Matagigantes, Negriazul',
    pais: 'Ecuador',
    ciudad: 'Sangolquí / Quito',
    estadio: 'Estadio Banco Guayaquil',
    capacidad: '12.000 espectadores',
    fundacion: 1958,
    color: '#002b66',
    titulos: [
      { nombre: 'Copa Sudamericana', cantidad: 2, icono: '🏆' },
      { nombre: 'Recopa Sudamericana', cantidad: 1, icono: '⭐' },
      { nombre: 'Liga Pro Ecuador', cantidad: 1, icono: '🥇' },
      { nombre: 'Copa Ecuador', cantidad: 1, icono: '🛡️' }
    ],
    historia: 'El modelo formativo más exitoso y admirado del fútbol sudamericano en el siglo XXI. Bicampeón de Copa Sudamericana (2019 y 2022) y campeón de la Recopa en el Maracanã ante Flamengo, IDV es un semillero inagotable de talento de exportación mundial.'
  },
  cru: {
    nombre: 'Cruzeiro',
    apodo: 'Raposa, Celeste',
    pais: 'Brasil',
    ciudad: 'Belo Horizonte',
    estadio: 'Estadio Mineirão',
    capacidad: '61.846 espectadores',
    fundacion: 1921,
    color: '#0033a0',
    titulos: [
      { nombre: 'Copa Libertadores', cantidad: 2, icono: '🏆' },
      { nombre: 'Recopa Sudamericana', cantidad: 1, icono: '⭐' },
      { nombre: 'Brasileirão', cantidad: 4, icono: '🥇' },
      { nombre: 'Copa do Brasil', cantidad: 6, icono: '🛡️' }
    ],
    historia: 'Bicampeón de la Copa Libertadores (1976 y 1997) y máximo monarca de la Copa do Brasil con 6 coronas. Por sus filas despegó el legendario Ronaldo Nazário antes de conquistar el planeta.'
  },
  rac: {
    nombre: 'Racing Club',
    apodo: 'La Academia',
    pais: 'Argentina',
    ciudad: 'Avellaneda',
    estadio: 'Estadio Presidente Perón (El Cilindro)',
    capacidad: '51.000 espectadores',
    fundacion: 1903,
    color: '#69b3e7',
    titulos: [
      { nombre: 'Copa Intercontinental', cantidad: 1, icono: '🌐' },
      { nombre: 'Copa Libertadores', cantidad: 1, icono: '🏆' },
      { nombre: 'Supercopa Sudamericana', cantidad: 1, icono: '⭐' },
      { nombre: 'Liga Argentina', cantidad: 18, icono: '🥇' }
    ],
    historia: 'Primer club argentino en consagrarse Campeón del Mundo en 1967 con el célebre zapatazo del Chango Cárdenas ante el Celtic en Montevideo. Heptacampeón consecutivo en la era amateur y cuna de una de las pasiones más leales de Avellaneda.'
  }
};

export const EquiposInfo = {
  /* Obtiene la información técnica del club con fallback inteligente */
  obtener(codigo) {
    if (!codigo) return null;
    const base = CLUBES_DATA[codigo];
    const eqFixture = FIXTURE.equipo(codigo);
    const nombre = eqFixture.n || codigo;

    if (base) {
      return {
        codigo,
        ...base,
        nombre: base.nombre || nombre,
        escudo: eqFixture.escudoSrc || eqFixture.b,
        competicion: eqFixture.comp || ''
      };
    }

    // Generador Inteligente para clubes adicionales o preliminares
    let pais = 'Internacional';
    let apodo = 'Equipo Profesional';
    let ciudad = 'Sede Oficial';
    let estadio = 'Estadio Principal';
    let capacidad = '25.000 espectadores';
    let fundacion = 1950;
    let titulos = [
      { nombre: 'Competición Nacional', cantidad: 2, icono: '🏆' },
      { nombre: 'Torneo Oficial', cantidad: 1, icono: '🥇' }
    ];

    if (eqFixture.comp === 'betplay') {
      pais = 'Colombia';
      apodo = 'Orgullo Regional';
      ciudad = 'Colombia';
      estadio = `Estadio Departamental de ${nombre}`;
      fundacion = 1960;
      titulos = [{ nombre: 'Fútbol Profesional Colombiano', cantidad: 1, icono: '🏆' }];
    } else if (eqFixture.comp === 'premier') {
      pais = 'Inglaterra';
      apodo = 'The Pride';
      ciudad = 'Inglaterra';
      estadio = `${nombre} Stadium`;
      fundacion = 1895;
      titulos = [{ nombre: 'English League Cup / FA Cup', cantidad: 1, icono: '🛡️' }];
    } else if (eqFixture.comp === 'laliga') {
      pais = 'España';
      apodo = 'El Conjunto';
      ciudad = 'España';
      estadio = `Estadio Municipal`;
      fundacion = 1920;
      titulos = [{ nombre: 'Copa del Rey / División de Honor', cantidad: 1, icono: '🏆' }];
    } else if (eqFixture.comp === 'bundesliga') {
      pais = 'Alemania';
      apodo = 'Die Mannschaft';
      ciudad = 'Alemania';
      estadio = `${nombre} Arena`;
      fundacion = 1910;
      titulos = [{ nombre: 'DFB-Pokal / Bundesliga', cantidad: 1, icono: '🏆' }];
    } else if (eqFixture.comp === 'libertadores' || eqFixture.comp === 'sudamericana') {
      pais = 'Sudamérica';
      apodo = 'Orgullo Continental';
      ciudad = 'Sudamérica';
      estadio = `Estadio de ${nombre}`;
      fundacion = 1940;
      titulos = [
        { nombre: 'Torneo Continental CONMEBOL', cantidad: 1, icono: '🌎' },
        { nombre: 'Liga Nacional', cantidad: 4, icono: '🏆' }
      ];
    }

    return {
      codigo,
      nombre,
      apodo,
      pais,
      ciudad,
      estadio,
      capacidad,
      fundacion,
      titulos,
      historia: `${nombre} es una institución deportiva destacada en el fútbol continental, protagonista en ${eqFixture.comp?.toUpperCase() || 'competiciones oficiales'}. Con gran arraigo entre sus aficionados y una destacada trayectoria en sus certámenes nacionales e internacionales.`,
      escudo: eqFixture.escudoSrc || eqFixture.b,
      competicion: eqFixture.comp || ''
    };
  },

  /* Abre el modal interactivo con el perfil completo del equipo */
  abrir(codigo, resultados = {}, misPred = {}, alPronosticar = null) {
    const info = this.obtener(codigo);
    if (!info) return;

    let modal = document.getElementById('modal-equipo-perfil');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'modal-equipo-perfil';
      modal.className = 'modal-overlay modal-perfil-overlay';
      modal.innerHTML = `
        <div class="modal-contenido modal-perfil-contenido">
          <button class="modal-cerrar modal-perfil-cerrar" id="btn-cerrar-perfil" type="button" aria-label="Cerrar">✕</button>
          <div id="perfil-cuerpo"></div>
        </div>
      `;
      document.body.appendChild(modal);

      modal.onclick = e => {
        if (e.target.id === 'modal-equipo-perfil') {
          modal.classList.remove('activo');
        }
      };

      document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && modal.classList.contains('activo')) {
          modal.classList.remove('activo');
        }
      });
    }

    const btnCerrar = modal.querySelector('#btn-cerrar-perfil');
    if (btnCerrar) {
      btnCerrar.onclick = () => modal.classList.remove('activo');
    }

    // Filtrar partidos del equipo
    const todosPartidos = (FIXTURE.partidos || []).filter(
      p => p.local === codigo || p.visitante === codigo
    );

    // Separar partidos jugados vs próximos
    const jugados = [];
    const proximos = [];
    const racha = []; // Últimos resultados: 'V', 'E', 'D'

    todosPartidos.forEach(p => {
      const res = resultados[p.id] || p.resultado;
      const estado = U.estadoPartido(p, res);
      if (estado === 'finalizado' && res && res.gl !== undefined && res.gv !== undefined) {
        const esLocal = p.local === codigo;
        const gl = res.gl;
        const gv = res.gv;
        let resultadoEq = 'E';
        if (gl > gv) resultadoEq = esLocal ? 'V' : 'D';
        else if (gl < gv) resultadoEq = esLocal ? 'D' : 'V';

        jugados.push({ partido: p, resultado: res, resultadoEq, esLocal });
        racha.push(resultadoEq);
      } else {
        proximos.push(p);
      }
    });

    // Últimos 5 de la racha
    const ultimos5 = racha.slice(-5);

    const cuerpo = modal.querySelector('#perfil-cuerpo');
    const escudoHtml = typeof info.escudo === 'string' && info.escudo.startsWith('<img')
      ? info.escudo.replace('class="escudo-img"', 'class="perfil-escudo-img"')
      : `<img src="${info.escudo}" class="perfil-escudo-img" alt="${info.nombre}" onerror="this.outerHTML='⚽'">`;

    cuerpo.innerHTML = `
      <!-- CABECERA DEL CLUB -->
      <div class="perfil-cabecera">
        <div class="perfil-badge-wrap">
          ${escudoHtml}
        </div>
        <div class="perfil-titulares">
          <span class="perfil-pais-tag">📍 ${U.esc(info.ciudad)}, ${U.esc(info.pais)}</span>
          <h2 class="perfil-nombre">${U.esc(info.nombre)}</h2>
          <p class="perfil-apodo">«${U.esc(info.apodo)}»</p>
          <div class="perfil-racha-fila">
            <span class="perfil-racha-label">Forma reciente:</span>
            <div class="racha-dots">
              ${ultimos5.length > 0 
                ? ultimos5.map(r => `<span class="racha-dot racha-dot--${r}">${r}</span>`).join('') 
                : '<span style="font-size:11.5px;color:var(--tinta-3)">Sin partidos oficiales aún</span>'}
            </div>
          </div>
        </div>
      </div>

      <!-- PESTAÑAS DEL PERFIL -->
      <div class="perfil-nav-tabs" role="tablist">
        <button class="perfil-tab-btn activo" data-ptab="palmares" type="button">🏆 Palmarés & Historia</button>
        <button class="perfil-tab-btn" data-ptab="jugados" type="button">⚽ Jugados (${jugados.length})</button>
        <button class="perfil-tab-btn" data-ptab="proximos" type="button">📅 Próximos (${proximos.length})</button>
      </div>

      <!-- TAB 1: PALMARÉS E HISTORIA -->
      <div class="perfil-sec" id="psec-palmares">
        <div class="perfil-grid-info">
          <div class="perfil-dato-item">
            <span class="dato-label">🏟 Estadio</span>
            <span class="dato-val">${U.esc(info.estadio)}</span>
            <small style="color:var(--tinta-3);font-size:11px">${U.esc(info.capacidad)}</small>
          </div>
          <div class="perfil-dato-item">
            <span class="dato-label">🎂 Fundación</span>
            <span class="dato-val">${info.fundacion}</span>
          </div>
          <div class="perfil-dato-item">
            <span class="dato-label">🏆 Títulos Oficiales</span>
            <span class="dato-val" style="color:var(--dorado)">${info.titulos.reduce((acc, t) => acc + t.cantidad, 0)} trofeos</span>
          </div>
        </div>

        <h3 class="perfil-subtitulo">Vitrina de Trofeos</h3>
        <div class="perfil-trofeos-grid">
          ${info.titulos.map(t => `
            <div class="trofeo-card">
              <span class="trofeo-icono">${t.icono}</span>
              <div class="trofeo-info">
                <span class="trofeo-cantidad">${t.cantidad}</span>
                <span class="trofeo-nombre">${U.esc(t.nombre)}</span>
              </div>
            </div>
          `).join('')}
        </div>

        <h3 class="perfil-subtitulo" style="margin-top:20px;">Resumen Histórico</h3>
        <div class="perfil-historia-caja">
          <p>${U.esc(info.historia)}</p>
        </div>
      </div>

      <!-- TAB 2: PARTIDOS JUGADOS -->
      <div class="perfil-sec oculto" id="psec-jugados">
        ${jugados.length === 0 
          ? '<div class="perfil-vacio">No hay partidos finalizados registrados en esta temporada aún.</div>'
          : `<div class="perfil-partidos-lista">
              ${jugados.reverse().map(j => {
                const p = j.partido;
                const r = j.resultado;
                const rivalCode = j.esLocal ? p.visitante : p.local;
                const rival = FIXTURE.equipo(rivalCode);
                const esVic = j.resultadoEq === 'V';
                const esEmp = j.resultadoEq === 'E';
                const resClass = esVic ? 'res-v' : esEmp ? 'res-e' : 'res-d';
                const resLabel = esVic ? 'Victoria' : esEmp ? 'Empate' : 'Derrota';
                const pred = misPred[p.id];
                return `
                  <div class="perfil-partido-fila">
                    <div class="ppf-estado ${resClass}">
                      <span>${j.resultadoEq}</span>
                      <small>${resLabel}</small>
                    </div>
                    <div class="ppf-centro">
                      <div class="ppf-torneo">${U.esc(p.etapa)} · ${U.diaLocal(p.utc || p.fecha)}</div>
                      <div class="ppf-marcador">
                        <span class="ppf-eq ${j.esLocal ? 'ppf-mio' : ''}">${U.esc(FIXTURE.equipo(p.local).n)}</span>
                        <span class="ppf-score">${r.gl} - ${r.gv}</span>
                        <span class="ppf-eq ${!j.esLocal ? 'ppf-mio' : ''}">${U.esc(FIXTURE.equipo(p.visitante).n)}</span>
                      </div>
                      ${pred ? `<div class="ppf-pred">Tu pronóstico: <b>${pred.gl} - ${pred.gv}</b></div>` : ''}
                    </div>
                    <div class="ppf-rival" data-perfil-club="${rivalCode}" title="Ver perfil de ${U.esc(rival.n)}">
                      ${rival.b}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>`
        }
      </div>

      <!-- TAB 3: PRÓXIMOS PARTIDOS -->
      <div class="perfil-sec oculto" id="psec-proximos">
        ${proximos.length === 0
          ? '<div class="perfil-vacio">No hay partidos programados pendientes para este equipo.</div>'
          : `<div class="perfil-partidos-lista">
              ${proximos.map(p => {
                const esLocal = p.local === codigo;
                const rivalCode = esLocal ? p.visitante : p.local;
                const rival = FIXTURE.equipo(rivalCode);
                const pred = misPred[p.id];
                return `
                  <div class="perfil-partido-fila">
                    <div class="ppf-fecha-box">
                      <span class="ppf-dia">${U.diaLocal(p.utc || p.fecha)}</span>
                      <span class="ppf-hora">${p.utc ? U.horaLocal(p.utc) : 'Por definir'}</span>
                    </div>
                    <div class="ppf-centro">
                      <div class="ppf-torneo">${U.esc(p.etapa)} · 🏟 ${U.esc(p.estadio || 'Estadio')}</div>
                      <div class="ppf-marcador">
                        <span class="ppf-eq ${esLocal ? 'ppf-mio' : ''}">${U.esc(FIXTURE.equipo(p.local).n)}</span>
                        <span class="ppf-vs">VS</span>
                        <span class="ppf-eq ${!esLocal ? 'ppf-mio' : ''}">${U.esc(FIXTURE.equipo(p.visitante).n)}</span>
                      </div>
                      ${pred ? `<div class="ppf-pred-ya">Pronosticado: <b>${pred.gl} - ${pred.gv}</b></div>` : ''}
                    </div>
                    <div class="ppf-rival" data-perfil-club="${rivalCode}" title="Ver perfil de ${U.esc(rival.n)}">
                      ${rival.b}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>`
        }
      </div>
    `;

    // Conectar botones de pestañas del modal
    modal.querySelectorAll('.perfil-tab-btn').forEach(btn => {
      btn.onclick = () => {
        modal.querySelectorAll('.perfil-tab-btn').forEach(b => b.classList.remove('activo'));
        btn.classList.add('activo');
        const tab = btn.dataset.ptab;
        modal.querySelectorAll('.perfil-sec').forEach(sec => sec.classList.add('oculto'));
        const target = modal.querySelector('#psec-' + tab);
        if (target) target.classList.remove('oculto');
      };
    });

    // Delegar clics en rivales dentro del modal para abrir el perfil del rival
    modal.querySelectorAll('[data-perfil-club]').forEach(elem => {
      elem.onclick = (e) => {
        e.stopPropagation();
        const nextCode = elem.dataset.perfilClub;
        if (nextCode) this.abrir(nextCode, resultados, misPred, alPronosticar);
      };
    });

    modal.classList.add('activo');
  }
};

window.EquiposInfo = EquiposInfo;

