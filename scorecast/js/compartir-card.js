/* ============================================================
   SCORECAST — TARJETAS COMPARTIBLES BROADCAST (<canvas> 2D)
   ------------------------------------------------------------
   Generador nativo PNG ($0 COP) con estética editorial tipo
   FotMob / UEFA Broadcast / Spotify Wrapped.
   ============================================================ */

const FORMATOS = {
  '4:5': {
    id: '4:5', w: 1080, h: 1350,
    etiqueta: 'WhatsApp / Feed', ratioTxt: '4:5', sufijo: '4x5',
    padX: 68, padTop: 62, padBottom: 58, esStory: false
  },
  '9:16': {
    id: '9:16', w: 1080, h: 1920,
    etiqueta: 'Stories / Estado', ratioTxt: '9:16', sufijo: '9x16',
    padX: 72, padTop: 146, padBottom: 140, esStory: true
  }
};

const PALETA = {
  fondo: '#0B0E11',
  superficie: '#12171D',
  superficie2: '#181F27',
  superficie3: '#1F2833',
  borde: 'rgba(255, 255, 255, 0.08)',
  bordeFuerte: 'rgba(255, 255, 255, 0.15)',
  acento: '#16A34A',
  acentoVivo: '#22C55E',
  oro: '#D9A441',
  plata: '#CBD5E1',
  bronce: '#C87D4B',
  rojo: '#EF4444',
  tinta: '#F3F5F7',
  tinta2: '#9BA6B2',
  tinta3: '#8491A0',
  fuenteDisplay: '"Barlow Condensed", system-ui, sans-serif',
  fuenteTexto: '"Plus Jakarta Sans", system-ui, -apple-system, sans-serif'
};

const NOMBRES_COMP = {
  betplay: 'Liga BetPlay',
  premier: 'Premier League',
  laliga: 'LaLiga',
  bundesliga: 'Bundesliga',
  ucl: 'Champions League',
  libertadores: 'Libertadores',
  sudamericana: 'Sudamericana'
};

const _cacheImg = new Map();
let _fuentesListas = false;

async function asegurarFuentes() {
  if (_fuentesListas || typeof document === 'undefined' || !document.fonts) return;
  try {
    await Promise.allSettled([
      document.fonts.load('600 24px "Barlow Condensed"'),
      document.fonts.load('700 36px "Barlow Condensed"'),
      document.fonts.load('800 72px "Barlow Condensed"'),
      document.fonts.load('500 18px "Plus Jakarta Sans"'),
      document.fonts.load('600 18px "Plus Jakarta Sans"'),
      document.fonts.load('700 22px "Plus Jakarta Sans"'),
      document.fonts.load('800 32px "Plus Jakarta Sans"')
    ]);
    await document.fonts.ready;
    _fuentesListas = true;
  } catch (_) {}
}

function esImagenTaintSegura(img) {
  try {
    const c = document.createElement('canvas');
    c.width = 1;
    c.height = 1;
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0, 1, 1);
    x.getImageData(0, 0, 1, 1);
    return true;
  } catch (_) {
    return false;
  }
}

export function cargarImgSegura(src, timeoutMs = 2600) {
  if (!src || typeof src !== 'string') return Promise.resolve(null);
  const limpio = src.trim();
  if (!limpio || limpio.startsWith('<') || /\.(svg)(\?|#|$)/i.test(limpio) || limpio.startsWith('data:image/svg')) {
    return Promise.resolve(null);
  }
  if (_cacheImg.has(limpio)) return Promise.resolve(_cacheImg.get(limpio));

  return new Promise(resolve => {
    let finalizado = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';

    const cerrar = resultado => {
      if (finalizado) return;
      finalizado = true;
      clearTimeout(reloj);
      _cacheImg.set(limpio, resultado);
      resolve(resultado);
    };

    const reloj = setTimeout(() => cerrar(null), timeoutMs);
    img.onload = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0 && esImagenTaintSegura(img)) cerrar(img);
      else cerrar(null);
    };
    img.onerror = () => cerrar(null);
    img.src = limpio;
  });
}

function extraerSrcEscudo(eq) {
  if (!eq) return null;
  if (typeof eq.escudoSrc === 'string' && eq.escudoSrc.trim()) return eq.escudoSrc.trim();
  if (typeof eq.b === 'string' && eq.b.includes('src=')) {
    const m = eq.b.match(/src=["']([^"']+)["']/i);
    if (m && m[1]) return m[1].trim();
  }
  return null;
}

function inicialesClub(nombre) {
  const raw = String(nombre || 'SC').replace(/[^\p{L}\p{N}\s]/gu, ' ').trim();
  if (!raw) return 'SC';
  const ignorar = new Set(['FC', 'CF', 'CD', 'SC', 'CA', 'UD', 'AC', 'AS', 'RB', 'CLUB', 'DE', 'DEL', 'LA', 'EL']);
  const partes = raw.split(/\s+/).filter(Boolean);
  const utiles = partes.filter(p => !ignorar.has(p.toUpperCase()));
  const base = utiles.length ? utiles : partes;
  if (base.length === 1) return base[0].slice(0, 3).toUpperCase();
  return base.slice(0, 3).map(p => p[0]).join('').toUpperCase();
}

function inicialesPersona(nombre) {
  const u = globalThis.U;
  if (u && typeof u.iniciales === 'function') return u.iniciales(nombre);
  return String(nombre || '?').trim().split(/\s+/).slice(0, 2).map(p => p[0] || '').join('').toUpperCase() || '?';
}

function resolverEquipo(codigo) {
  if (!codigo) return null;
  const fx = globalThis.FIXTURE;
  if (fx && typeof fx.equipo === 'function') return fx.equipo(codigo);
  if (fx && fx.equipos && fx.equipos[codigo]) return fx.equipos[codigo];
  return { n: String(codigo), b: '' };
}

function toastMsg(msg, tipo = 'ok') {
  if (globalThis.U && typeof globalThis.U.toast === 'function') {
    globalThis.U.toast(msg, tipo);
  }
}

function rectRedondeado(ctx, x, y, w, h, r) {
  const rad = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function truncarTexto(ctx, texto, maxW) {
  const str = String(texto ?? '');
  if (!str || maxW <= 0) return '';
  if (ctx.measureText(str).width <= maxW) return str;
  let fin = str.length;
  while (fin > 1 && ctx.measureText(str.slice(0, fin).trimEnd() + '…').width > maxW) {
    fin--;
  }
  return str.slice(0, fin).trimEnd() + '…';
}

function fechaCortaHoy() {
  try {
    return new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
      .replace(/\./g, '')
      .toUpperCase();
  } catch (_) {
    return 'TEMPORADA 2026/27';
  }
}

/* --- Escena Broadcast: fondo, cabecera, escudos y sello ----- */

function pintarFondoEstadio(ctx, fmt) {
  const { w, h } = fmt;
  ctx.fillStyle = PALETA.fondo;
  ctx.fillRect(0, 0, w, h);

  // Luz radial tenue verde estadio (superior izquierda)
  const luzVerde = ctx.createRadialGradient(w * 0.16, h * 0.09, 20, w * 0.16, h * 0.09, w * 0.78);
  luzVerde.addColorStop(0, 'rgba(22, 163, 74, 0.15)');
  luzVerde.addColorStop(0.48, 'rgba(22, 163, 74, 0.04)');
  luzVerde.addColorStop(1, 'rgba(11, 14, 17, 0)');
  ctx.fillStyle = luzVerde;
  ctx.fillRect(0, 0, w, h);

  // Luz radial tenue oro campeonato (inferior derecha)
  const luzOro = ctx.createRadialGradient(w * 0.86, h * 0.86, 20, w * 0.86, h * 0.86, w * 0.72);
  luzOro.addColorStop(0, 'rgba(217, 164, 65, 0.11)');
  luzOro.addColorStop(0.5, 'rgba(217, 164, 65, 0.025)');
  luzOro.addColorStop(1, 'rgba(11, 14, 17, 0)');
  ctx.fillStyle = luzOro;
  ctx.fillRect(0, 0, w, h);

  // Grilla geométrica arquitectónica sutil
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.024)';
  ctx.lineWidth = 1;
  const paso = 72;
  for (let x = paso; x < w; x += paso) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, h);
    ctx.stroke();
  }
  for (let y = paso; y < h; y += paso) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(w, y + 0.5);
    ctx.stroke();
  }

  // Diagonales editoriales tipo transmisión UEFA
  ctx.strokeStyle = 'rgba(217, 164, 65, 0.055)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(w * 0.58, 0);
  ctx.lineTo(w, h * 0.26);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(34, 197, 94, 0.05)';
  ctx.beginPath();
  ctx.moveTo(0, h * 0.78);
  ctx.lineTo(w * 0.38, h);
  ctx.stroke();

  // Marco broadcast perimetral + miras de esquina
  const m = 28;
  rectRedondeado(ctx, m, m, w - m * 2, h - m * 2, 30);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.055)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const L = 18;
  ctx.strokeStyle = 'rgba(217, 164, 65, 0.34)';
  ctx.lineWidth = 2;
  const esquinas = [
    [m + 18, m + 18, 1, 1],
    [w - m - 18, m + 18, -1, 1],
    [m + 18, h - m - 18, 1, -1],
    [w - m - 18, h - m - 18, -1, -1]
  ];
  for (const [ex, ey, dx, dy] of esquinas) {
    ctx.beginPath();
    ctx.moveTo(ex, ey + dy * L);
    ctx.lineTo(ex, ey);
    ctx.lineTo(ex + dx * L, ey);
    ctx.stroke();
  }
  ctx.restore();
}

function dibujarEscudoClub(ctx, cx, cy, radio, img, nombreClub, colorAnillo = 'rgba(255, 255, 255, 0.13)') {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radio, 0, Math.PI * 2);
  ctx.fillStyle = PALETA.superficie2;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = colorAnillo;
  ctx.stroke();

  if (img) {
    const maxLado = radio * 1.46;
    const esc = Math.min(maxLado / img.naturalWidth, maxLado / img.naturalHeight);
    const dw = img.naturalWidth * esc;
    const dh = img.naturalHeight * esc;
    ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
  } else {
    ctx.beginPath();
    ctx.arc(cx, cy, radio * 0.78, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(217, 164, 65, 0.28)';
    ctx.lineWidth = 1;
    ctx.stroke();

    const sig = inicialesClub(nombreClub);
    ctx.fillStyle = PALETA.tinta;
    ctx.font = `800 ${Math.round(radio * 0.68)}px ${PALETA.fuenteDisplay}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(sig, cx, cy + 1);
  }
  ctx.restore();
}

function pintarCabecera(ctx, fmt, meta, logoImg) {
  const x0 = fmt.padX;
  const innerW = fmt.w - fmt.padX * 2;
  const y0 = fmt.padTop;

  // Caja del logo oficial icons/icon-192.png
  const logoBox = 64;
  rectRedondeado(ctx, x0, y0, logoBox, logoBox, 16);
  ctx.fillStyle = PALETA.superficie;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = PALETA.bordeFuerte;
  ctx.stroke();

  if (logoImg) {
    const pad = 7;
    const maxL = logoBox - pad * 2;
    const esc = Math.min(maxL / logoImg.naturalWidth, maxL / logoImg.naturalHeight);
    const dw = logoImg.naturalWidth * esc;
    const dh = logoImg.naturalHeight * esc;
    ctx.drawImage(logoImg, x0 + (logoBox - dw) / 2, y0 + (logoBox - dh) / 2, dw, dh);
  } else {
    ctx.fillStyle = PALETA.oro;
    ctx.font = `800 30px ${PALETA.fuenteDisplay}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SC', x0 + logoBox / 2, y0 + logoBox / 2 + 1);
  }

  // Marca SCORECAST + subtítulo editorial
  const brandX = x0 + logoBox + 18;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = PALETA.tinta;
  ctx.font = `800 44px ${PALETA.fuenteDisplay}`;
  ctx.fillText('SCORECAST', brandX, y0 + 38);

  ctx.fillStyle = PALETA.tinta3;
  ctx.font = `700 13.5px ${PALETA.fuenteTexto}`;
  ctx.fillText('TARJETA OFICIAL · BROADCAST EDITION', brandX, y0 + 58);

  // Píldora derecha (fecha o jornada)
  const pillTxt = String(meta.etiquetaDerecha || fechaCortaHoy()).toUpperCase();
  ctx.font = `700 18px ${PALETA.fuenteDisplay}`;
  const medTxt = Math.min(340, ctx.measureText(pillTxt).width);
  const pillW = medTxt + 44;
  const pillH = 40;
  const pillX = x0 + innerW - pillW;
  const pillY = y0 + 12;

  rectRedondeado(ctx, pillX, pillY, pillW, pillH, 20);
  ctx.fillStyle = PALETA.superficie2;
  ctx.fill();
  ctx.lineWidth = 1.25;
  ctx.strokeStyle = 'rgba(217, 164, 65, 0.42)';
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(pillX + 18, pillY + pillH / 2, 4.5, 0, Math.PI * 2);
  ctx.fillStyle = PALETA.oro;
  ctx.fill();

  ctx.fillStyle = PALETA.oro;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(truncarTexto(ctx, pillTxt, 336), pillX + 30, pillY + pillH / 2 + 1);

  // Barra de Sala Activa
  const salaY = y0 + 82;
  const salaH = 46;
  rectRedondeado(ctx, x0, salaY, innerW, salaH, 12);
  ctx.fillStyle = PALETA.superficie;
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = PALETA.borde;
  ctx.stroke();

  // Indicador esmeralda vertical
  rectRedondeado(ctx, x0 + 14, salaY + 12, 4, salaH - 24, 2);
  ctx.fillStyle = PALETA.acentoVivo;
  ctx.fill();

  ctx.font = `700 15px ${PALETA.fuenteDisplay}`;
  ctx.fillStyle = PALETA.tinta3;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('SALA', x0 + 28, salaY + salaH / 2 + 1);

  ctx.font = `700 18px ${PALETA.fuenteTexto}`;
  ctx.fillStyle = PALETA.tinta;
  const nomSala = truncarTexto(ctx, meta.nombreSala || 'ScoreCast Principal', innerW - 310);
  ctx.fillText(nomSala, x0 + 74, salaY + salaH / 2);

  if (meta.subDerecha) {
    ctx.font = `700 16px ${PALETA.fuenteDisplay}`;
    ctx.fillStyle = PALETA.tinta2;
    ctx.textAlign = 'right';
    ctx.fillText(String(meta.subDerecha).toUpperCase(), x0 + innerW - 18, salaY + salaH / 2 + 1);
  }

  return salaY + salaH + (fmt.esStory ? 36 : 24);
}

function pintarPie(ctx, fmt) {
  const x0 = fmt.padX;
  const innerW = fmt.w - fmt.padX * 2;
  const yPie = fmt.h - fmt.padBottom - 20;

  ctx.save();
  ctx.strokeStyle = PALETA.borde;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x0, yPie - 26);
  ctx.lineTo(x0 + innerW, yPie - 26);
  ctx.stroke();

  // Sello concéntrico de autenticidad
  const sx = x0 + 10;
  const sy = yPie;
  ctx.beginPath();
  ctx.arc(sx, sy, 7.5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(217, 164, 65, 0.22)';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(sx, sy, 3.5, 0, Math.PI * 2);
  ctx.fillStyle = PALETA.oro;
  ctx.fill();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = `600 16px ${PALETA.fuenteTexto}`;
  ctx.fillStyle = PALETA.tinta2;
  ctx.fillText('scorecast · temporada 2026/27', sx + 18, sy);

  ctx.textAlign = 'right';
  ctx.font = `700 15px ${PALETA.fuenteDisplay}`;
  ctx.fillStyle = PALETA.tinta3;
  ctx.fillText('AUTENTICIDAD VERIFICADA · SCORECAST', x0 + innerW, sy + 1);
  ctx.restore();

  return yPie - 48;
}

/* --- Tarjeta 1: Mi Posición + Top de la Sala (tabla.html) --- */

function codigoCampeonPrincipal(fila, yo) {
  if (fila && fila.campeon) return fila.campeon;
  if (fila && fila.campeones && typeof fila.campeones === 'object') {
    const orden = ['betplay', 'ucl', 'libertadores', 'premier', 'laliga', 'bundesliga', 'sudamericana'];
    for (const k of orden) {
      if (fila.campeones[k]) return fila.campeones[k];
    }
    const vals = Object.values(fila.campeones).filter(Boolean);
    if (vals.length) return vals[0];
  }
  if (yo && yo.campeon) return yo.campeon;
  if (yo && yo.campeones && typeof yo.campeones === 'object') {
    const vals = Object.values(yo.campeones).filter(Boolean);
    if (vals.length) return vals[0];
  }
  return null;
}

function pintarHeroPosicion(ctx, fmt, x0, innerW, y, miFila, totalPart, yo, imgs) {
  const heroH = fmt.esStory ? 416 : 334;
  const esPodio = miFila.pos && miFila.pos <= 3;
  const colorRango = miFila.pos === 1 ? PALETA.oro
    : miFila.pos === 2 ? PALETA.plata
    : miFila.pos === 3 ? PALETA.bronce
    : PALETA.acentoVivo;

  const gradHero = ctx.createLinearGradient(x0, y, x0, y + heroH);
  gradHero.addColorStop(0, '#161E27');
  gradHero.addColorStop(1, '#11161D');
  rectRedondeado(ctx, x0, y, innerW, heroH, 22);
  ctx.fillStyle = gradHero;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = esPodio ? 'rgba(217, 164, 65, 0.42)' : 'rgba(34, 197, 94, 0.36)';
  ctx.stroke();

  ctx.save();
  rectRedondeado(ctx, x0, y, innerW, heroH, 22);
  ctx.clip();
  ctx.fillStyle = esPodio ? PALETA.oro : PALETA.acentoVivo;
  ctx.fillRect(x0, y, innerW, 4);
  ctx.restore();

  const padH = 30;
  const topRowY = y + (fmt.esStory ? 34 : 24);

  const rankStr = miFila.pos ? `#${String(miFila.pos).padStart(2, '0')}` : '#--';
  ctx.font = `800 ${fmt.esStory ? 104 : 88}px ${PALETA.fuenteDisplay}`;
  ctx.fillStyle = colorRango;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(rankStr, x0 + padH, topRowY - 6);
  const rankW = ctx.measureText(rankStr).width;

  const infoX = x0 + padH + rankW + 24;
  const racha = Number(miFila.racha) || 0;
  const badgeDerTxt = racha >= 3
    ? `RACHA ACTIVA · x${racha}`
    : (miFila.pos === 1 ? 'LÍDER DE LA SALA' : esPodio ? 'ZONA DE PODIO' : 'EN COMPETENCIA');

  ctx.font = `700 16px ${PALETA.fuenteDisplay}`;
  const badgeW = ctx.measureText(badgeDerTxt).width + 32;
  const badgeX = x0 + innerW - padH - badgeW;
  const badgeY = topRowY + 8;

  rectRedondeado(ctx, badgeX, badgeY, badgeW, 34, 17);
  ctx.fillStyle = (racha >= 3 || esPodio) ? 'rgba(217, 164, 65, 0.14)' : 'rgba(34, 197, 94, 0.13)';
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = (racha >= 3 || esPodio) ? 'rgba(217, 164, 65, 0.42)' : 'rgba(34, 197, 94, 0.36)';
  ctx.stroke();

  ctx.fillStyle = (racha >= 3 || esPodio) ? PALETA.oro : PALETA.acentoVivo;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(badgeDerTxt, badgeX + badgeW / 2, badgeY + 18);

  const maxNombreW = Math.max(200, badgeX - infoX - 18);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = `800 ${fmt.esStory ? 36 : 31}px ${PALETA.fuenteTexto}`;
  ctx.fillStyle = PALETA.tinta;
  ctx.fillText(truncarTexto(ctx, miFila.nombre || 'Participante', maxNombreW), infoX, topRowY + 4);

  ctx.font = `600 17px ${PALETA.fuenteTexto}`;
  ctx.fillStyle = PALETA.tinta2;
  const subPos = miFila.pos
    ? `Puesto ${miFila.pos} de ${totalPart} · ${miFila.jugadas || 0} jugadas evaluadas`
    : 'Participante activo en sala';
  ctx.fillText(truncarTexto(ctx, subPos, maxNombreW + badgeW), infoX, topRowY + (fmt.esStory ? 52 : 45));

  const kpiY = topRowY + (fmt.esStory ? 116 : 94);
  const kpiH = fmt.esStory ? 118 : 96;
  const gapKpi = 16;
  const kpiW = (innerW - padH * 2 - gapKpi * 2) / 3;
  const metricas = [
    { valor: String(miFila.pts ?? 0), rotulo: 'PUNTOS TOTALES', color: PALETA.oro },
    { valor: String(miFila.exactos ?? 0), rotulo: 'MARCADORES EXACTOS', color: PALETA.acentoVivo },
    { valor: String(miFila.aciertos ?? 0), rotulo: 'RESULTADOS 1X2', color: PALETA.tinta }
  ];

  metricas.forEach((m, idx) => {
    const kx = x0 + padH + idx * (kpiW + gapKpi);
    rectRedondeado(ctx, kx, kpiY, kpiW, kpiH, 14);
    ctx.fillStyle = '#0D1217';
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = PALETA.borde;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.font = `800 ${fmt.esStory ? 50 : 42}px ${PALETA.fuenteDisplay}`;
    ctx.fillStyle = m.color;
    ctx.fillText(m.valor, kx + kpiW / 2, kpiY + (fmt.esStory ? 62 : 52));

    ctx.font = `700 14px ${PALETA.fuenteDisplay}`;
    ctx.fillStyle = PALETA.tinta3;
    ctx.fillText(m.rotulo, kx + kpiW / 2, kpiY + kpiH - (fmt.esStory ? 20 : 15));
  });

  const campY = kpiY + kpiH + (fmt.esStory ? 22 : 16);
  const campBarH = y + heroH - campY - (fmt.esStory ? 18 : 12);
  ctx.strokeStyle = PALETA.borde;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x0 + padH, campY);
  ctx.lineTo(x0 + innerW - padH, campY);
  ctx.stroke();

  const cyCamp = campY + campBarH / 2 + 4;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = `700 16px ${PALETA.fuenteDisplay}`;
  ctx.fillStyle = PALETA.tinta3;
  ctx.fillText('CAMPEÓN ELEGIDO', x0 + padH, cyCamp);

  const codCamp = codigoCampeonPrincipal(miFila, yo);
  if (codCamp) {
    const eqCamp = resolverEquipo(codCamp);
    const imgCamp = imgs.escudos.get(codCamp) || null;
    const radioEsc = fmt.esStory ? 23 : 20;
    const nomClub = eqCamp?.n || codCamp;
    ctx.font = `700 ${fmt.esStory ? 22 : 20}px ${PALETA.fuenteTexto}`;
    const txtClub = truncarTexto(ctx, nomClub, innerW - 340);
    const wClub = ctx.measureText(txtClub).width;
    const rightEnd = x0 + innerW - padH;
    ctx.textAlign = 'right';
    ctx.fillStyle = PALETA.tinta;
    ctx.fillText(txtClub, rightEnd, cyCamp);
    dibujarEscudoClub(ctx, rightEnd - wClub - radioEsc - 12, cyCamp, radioEsc, imgCamp, nomClub, 'rgba(217, 164, 65, 0.45)');
  } else {
    ctx.textAlign = 'right';
    ctx.font = `600 18px ${PALETA.fuenteTexto}`;
    ctx.fillStyle = PALETA.tinta3;
    ctx.fillText('Pendiente por elegir', x0 + innerW - padH, cyCamp);
  }

  return heroH;
}

function pintarCuerpoTabla(ctx, fmt, datos, imgs) {
  const { yo, filas = [], nombreSala } = datos;
  const x0 = fmt.padX;
  const innerW = fmt.w - fmt.padX * 2;
  const totalPart = filas.length;
  const miFila = filas.find(f => f.uid === yo?.uid) || {
    uid: yo?.uid || 'yo', pos: null, nombre: yo?.nombre || 'Participante',
    pts: 0, exactos: 0, aciertos: 0, jugadas: 0, racha: 0,
    campeon: yo?.campeon || null, campeones: yo?.campeones || {}
  };

  let y = pintarCabecera(ctx, fmt, {
    nombreSala,
    etiquetaDerecha: `${fechaCortaHoy()} · CLASIFICACIÓN`,
    subDerecha: `${totalPart} ${totalPart === 1 ? 'PARTICIPANTE' : 'PARTICIPANTES'}`
  }, imgs.logo);

  const yLimite = pintarPie(ctx, fmt);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `700 18px ${PALETA.fuenteDisplay}`;
  ctx.fillStyle = PALETA.acentoVivo;
  ctx.fillText('MI POSICIÓN ACTUAL', x0, y + 14);
  y += 26;

  const heroH = pintarHeroPosicion(ctx, fmt, x0, innerW, y, miFila, totalPart, yo, imgs);
  y += heroH + (fmt.esStory ? 40 : 24);

  let filasMostrar = filas.slice(0, Math.min(5, filas.length));
  if (miFila.pos && miFila.pos > 5) {
    filasMostrar = fmt.esStory ? [...filas.slice(0, 5), miFila] : [...filas.slice(0, 4), miFila];
  }

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `700 18px ${PALETA.fuenteDisplay}`;
  ctx.fillStyle = PALETA.oro;
  ctx.fillText(`PODIO Y LÍDERES · TOP ${Math.min(5, filas.length || 5)}`, x0, y + 14);

  ctx.textAlign = 'right';
  ctx.font = `700 15px ${PALETA.fuenteDisplay}`;
  ctx.fillStyle = PALETA.tinta3;
  ctx.fillText('EXACTOS      PTS', x0 + innerW - 22, y + 14);
  y += 26;

  const espacioRestante = Math.max(240, yLimite - y);
  const nFilas = Math.max(1, filasMostrar.length);
  const gapFila = fmt.esStory ? 16 : 11;
  const altoFila = Math.min(fmt.esStory ? 118 : 94, Math.floor((espacioRestante - gapFila * (nFilas - 1)) / nFilas));

  filasMostrar.forEach((f, idx) => {
    const fy = y + idx * (altoFila + gapFila);
    const esYo = f.uid === yo?.uid;
    const cy = fy + altoFila / 2;

    rectRedondeado(ctx, x0, fy, innerW, altoFila, 16);
    ctx.fillStyle = esYo ? 'rgba(22, 163, 74, 0.14)' : PALETA.superficie;
    ctx.fill();
    ctx.lineWidth = esYo ? 1.75 : 1;
    ctx.strokeStyle = esYo ? 'rgba(34, 197, 94, 0.55)' : PALETA.borde;
    ctx.stroke();

    const colorPos = f.pos === 1 ? PALETA.oro : f.pos === 2 ? PALETA.plata : f.pos === 3 ? PALETA.bronce : PALETA.tinta2;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `800 ${fmt.esStory ? 34 : 30}px ${PALETA.fuenteDisplay}`;
    ctx.fillStyle = colorPos;
    ctx.fillText(String(f.pos).padStart(2, '0'), x0 + 42, cy + 1);

    const avR = fmt.esStory ? 24 : 20;
    const avX = x0 + 98;
    ctx.beginPath();
    ctx.arc(avX, cy, avR, 0, Math.PI * 2);
    ctx.fillStyle = esYo ? 'rgba(22, 163, 74, 0.25)' : PALETA.superficie2;
    ctx.fill();
    ctx.lineWidth = 1.25;
    ctx.strokeStyle = f.pos === 1 ? 'rgba(217, 164, 65, 0.5)' : PALETA.bordeFuerte;
    ctx.stroke();

    ctx.font = `800 ${fmt.esStory ? 18 : 16}px ${PALETA.fuenteDisplay}`;
    ctx.fillStyle = PALETA.tinta;
    ctx.fillText(inicialesPersona(f.nombre), avX, cy + 1);

    const nomX = avX + avR + 18;
    ctx.textAlign = 'left';
    ctx.font = `700 ${fmt.esStory ? 24 : 21}px ${PALETA.fuenteTexto}`;
    ctx.fillStyle = PALETA.tinta;
    const nomRender = truncarTexto(ctx, f.nombre, innerW - 380);
    ctx.fillText(nomRender, nomX, cy);

    if (esYo) {
      const tagX = nomX + ctx.measureText(nomRender).width + 12;
      rectRedondeado(ctx, tagX, cy - 13, 44, 26, 8);
      ctx.fillStyle = 'rgba(217, 164, 65, 0.2)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(217, 164, 65, 0.55)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.font = `800 14px ${PALETA.fuenteDisplay}`;
      ctx.fillStyle = PALETA.oro;
      ctx.fillText('TÚ', tagX + 22, cy + 1);
    }

    ctx.textAlign = 'right';
    ctx.font = `600 ${fmt.esStory ? 20 : 18}px ${PALETA.fuenteTexto}`;
    ctx.fillStyle = PALETA.tinta2;
    ctx.fillText(`${f.exactos ?? 0} ex.`, x0 + innerW - 132, cy);

    ctx.font = `800 ${fmt.esStory ? 38 : 34}px ${PALETA.fuenteDisplay}`;
    ctx.fillStyle = f.pos === 1 ? PALETA.oro : (esYo ? PALETA.acentoVivo : PALETA.tinta);
    ctx.fillText(`${f.pts ?? 0}`, x0 + innerW - 26, cy + 1);
  });
}

/* --- Tarjeta 2: Mis Pronósticos Broadcast (app.html) ------- */

function metaEstadoPronostico(partido, pred, res) {
  const ptsEngine = globalThis.Puntos;
  const utils = globalThis.U;
  const estado = (utils && typeof utils.estadoPartido === 'function')
    ? utils.estadoPartido(partido, res)
    : (res?.estado || partido?.estado || 'programado');

  if (res && res.estado === 'finalizado' && ptsEngine && typeof ptsEngine.calificar === 'function') {
    const cal = ptsEngine.calificar(pred, res, partido.fase);
    if (cal.tipo === 'exacto') {
      return { txt: `EXACTO +${cal.pts} PTS · REAL ${res.gl}-${res.gv}`, color: PALETA.acentoVivo, borde: 'rgba(34, 197, 94, 0.48)' };
    }
    if (cal.tipo === 'resultado') {
      return { txt: `ACIERTO +${cal.pts} PT · REAL ${res.gl}-${res.gv}`, color: PALETA.oro, borde: 'rgba(217, 164, 65, 0.42)' };
    }
    return { txt: `FINALIZADO · REAL ${res.gl}-${res.gv}`, color: PALETA.tinta3, borde: PALETA.borde };
  }
  if (estado === 'en_juego') {
    return { txt: `EN VIVO · ${res?.gl ?? 0}-${res?.gv ?? 0}`, color: PALETA.rojo, borde: 'rgba(239, 68, 68, 0.42)' };
  }
  return { txt: 'PRONÓSTICO CONFIRMADO', color: PALETA.oro, borde: PALETA.borde };
}

function textoHorarioPartido(p) {
  const comp = NOMBRES_COMP[p.competicion] || (p.competicion ? String(p.competicion).toUpperCase() : 'TORNEO OFICIAL');
  const u = globalThis.U;
  if (p.utc && u && typeof u.diaLocal === 'function' && typeof u.horaLocal === 'function') {
    const dia = u.diaLocal(p.utc).replace(/\./g, '').toUpperCase();
    const hora = u.horaLocal(p.utc).toUpperCase();
    return `${comp.toUpperCase()} · ${dia} · ${hora}`;
  }
  if (p.jornada) return `${comp.toUpperCase()} · JORNADA ${p.jornada}`;
  return comp.toUpperCase();
}

function pintarCuerpoPronosticos(ctx, fmt, datos, imgs) {
  const { yo, items = [], restantes = 0, nombreSala, contextoFiltro = 'Mis pronósticos' } = datos;
  const x0 = fmt.padX;
  const innerW = fmt.w - fmt.padX * 2;

  let y = pintarCabecera(ctx, fmt, {
    nombreSala,
    etiquetaDerecha: contextoFiltro,
    subDerecha: `${items.length} ${items.length === 1 ? 'PARTIDO' : 'PARTIDOS'}`
  }, imgs.logo);

  const yLimite = pintarPie(ctx, fmt);

  const autorH = fmt.esStory ? 104 : 84;
  rectRedondeado(ctx, x0, y, innerW, autorH, 18);
  ctx.fillStyle = PALETA.superficie;
  ctx.fill();
  ctx.lineWidth = 1.25;
  ctx.strokeStyle = PALETA.bordeFuerte;
  ctx.stroke();

  ctx.save();
  rectRedondeado(ctx, x0, y, innerW, autorH, 18);
  ctx.clip();
  ctx.fillStyle = PALETA.acentoVivo;
  ctx.fillRect(x0, y, 5, autorH);
  ctx.restore();

  const cyAutor = y + autorH / 2;
  const avR = fmt.esStory ? 27 : 23;
  const avX = x0 + 44;
  ctx.beginPath();
  ctx.arc(avX, cyAutor, avR, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(22, 163, 74, 0.2)';
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(34, 197, 94, 0.55)';
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 ${fmt.esStory ? 20 : 18}px ${PALETA.fuenteDisplay}`;
  ctx.fillStyle = PALETA.tinta;
  ctx.fillText(inicialesPersona(yo?.nombre), avX, cyAutor + 1);

  const primerNombre = String(yo?.nombre || 'Jugador').trim().split(/\s+/).slice(0, 2).join(' ');
  const txAutor = avX + avR + 18;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `800 ${fmt.esStory ? 30 : 26}px ${PALETA.fuenteDisplay}`;
  ctx.fillStyle = PALETA.tinta;
  ctx.fillText(truncarTexto(ctx, `PRONÓSTICOS DE ${primerNombre.toUpperCase()}`, innerW - 290), txAutor, cyAutor - 2);

  ctx.font = `600 15px ${PALETA.fuenteTexto}`;
  ctx.fillStyle = PALETA.tinta2;
  const subTxt = restantes > 0
    ? `${contextoFiltro} · mostrando 6 (+${restantes} más en sala)`
    : `${contextoFiltro} · selección oficial guardada`;
  ctx.fillText(truncarTexto(ctx, subTxt, innerW - 280), txAutor, cyAutor + (fmt.esStory ? 24 : 20));

  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.font = `800 ${fmt.esStory ? 22 : 19}px ${PALETA.fuenteDisplay}`;
  ctx.fillStyle = PALETA.acentoVivo;
  ctx.fillText(`${items.length} MARCADORES`, x0 + innerW - 24, cyAutor + 1);

  y += autorH + (fmt.esStory ? 28 : 18);

  const n = Math.max(1, items.length);
  const dispH = Math.max(300, yLimite - y);
  const gap = fmt.esStory ? 18 : 13;
  const maxCardH = fmt.esStory ? 188 : 148;
  const cardH = Math.min(maxCardH, Math.floor((dispH - gap * (n - 1)) / n));
  const bloqueTotal = cardH * n + gap * (n - 1);
  const offsetY = items.length <= 3 ? Math.min(fmt.esStory ? 48 : 24, Math.floor((dispH - bloqueTotal) * 0.18)) : 0;
  let py = y + offsetY;

  items.forEach(({ partido, pred, res }) => {
    const eqL = resolverEquipo(partido.local);
    const eqV = resolverEquipo(partido.visitante);
    const imgL = imgs.escudos.get(partido.local) || null;
    const imgV = imgs.escudos.get(partido.visitante) || null;
    const estMeta = metaEstadoPronostico(partido, pred, res);

    const gradCard = ctx.createLinearGradient(x0, py, x0, py + cardH);
    gradCard.addColorStop(0, '#141B23');
    gradCard.addColorStop(1, '#10151C');
    rectRedondeado(ctx, x0, py, innerW, cardH, 18);
    ctx.fillStyle = gradCard;
    ctx.fill();
    ctx.lineWidth = 1.25;
    ctx.strokeStyle = estMeta.borde;
    ctx.stroke();

    const headH = fmt.esStory ? 38 : 32;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x0 + 20, py + headH);
    ctx.lineTo(x0 + innerW - 20, py + headH);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = `700 13.5px ${PALETA.fuenteDisplay}`;
    ctx.fillStyle = PALETA.tinta3;
    ctx.fillText(truncarTexto(ctx, textoHorarioPartido(partido), innerW * 0.6), x0 + 22, py + headH / 2 + 1);

    ctx.textAlign = 'right';
    ctx.font = `700 13.5px ${PALETA.fuenteDisplay}`;
    ctx.fillStyle = estMeta.color;
    ctx.fillText(estMeta.txt, x0 + innerW - 22, py + headH / 2 + 1);

    const bodyCy = py + headH + (cardH - headH) / 2;
    const midX = x0 + innerW / 2;
    const scoreW = fmt.esStory ? 142 : 128;
    const scoreH = Math.min(cardH - headH - 16, fmt.esStory ? 66 : 52);

    rectRedondeado(ctx, midX - scoreW / 2, bodyCy - scoreH / 2, scoreW, scoreH, 12);
    ctx.fillStyle = '#0A0D10';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.45)';
    ctx.stroke();

    ctx.font = `800 ${fmt.esStory ? 42 : 35}px ${PALETA.fuenteDisplay}`;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = PALETA.tinta;
    ctx.textAlign = 'right';
    ctx.fillText(String(pred.gl), midX - 14, bodyCy + 2);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETA.acentoVivo;
    ctx.fillText('-', midX, bodyCy + 1);
    ctx.textAlign = 'left';
    ctx.fillStyle = PALETA.tinta;
    ctx.fillText(String(pred.gv), midX + 14, bodyCy + 2);

    const escR = Math.min(Math.floor((cardH - headH) * 0.34), fmt.esStory ? 30 : 24);
    const escGap = 20;
    const cxEscL = midX - scoreW / 2 - escGap - escR;
    const cxEscV = midX + scoreW / 2 + escGap + escR;

    dibujarEscudoClub(ctx, cxEscL, bodyCy, escR, imgL, eqL?.n || partido.local);
    dibujarEscudoClub(ctx, cxEscV, bodyCy, escR, imgV, eqV?.n || partido.visitante);

    const maxClubW = cxEscL - escR - 16 - (x0 + 22);
    ctx.font = `700 ${fmt.esStory ? 23 : 20}px ${PALETA.fuenteTexto}`;
    ctx.fillStyle = PALETA.tinta;
    ctx.textAlign = 'right';
    ctx.fillText(truncarTexto(ctx, eqL?.n || partido.local, maxClubW), cxEscL - escR - 14, bodyCy);

    ctx.textAlign = 'left';
    ctx.fillText(truncarTexto(ctx, eqV?.n || partido.visitante, maxClubW), cxEscV + escR + 14, bodyCy);

    py += cardH + gap;
  });
}

async function precargarRecursos(tipo, datos) {
  const codigos = new Set();
  if (tipo === 'tabla') {
    const miFila = (datos.filas || []).find(f => f.uid === datos.yo?.uid);
    const codCamp = codigoCampeonPrincipal(miFila, datos.yo);
    if (codCamp) codigos.add(codCamp);
  } else if (tipo === 'pronosticos') {
    (datos.items || []).forEach(({ partido }) => {
      if (partido.local) codigos.add(partido.local);
      if (partido.visitante) codigos.add(partido.visitante);
    });
  }

  const promLogo = cargarImgSegura('icons/icon-192.png');
  const entradas = await Promise.all(
    Array.from(codigos).map(async cod => {
      const eq = resolverEquipo(cod);
      const src = extraerSrcEscudo(eq);
      const img = src ? await cargarImgSegura(src) : null;
      return [cod, img];
    })
  );
  const logo = await promLogo;
  return { logo, escudos: new Map(entradas) };
}

export async function renderizarTarjeta(canvas, { tipo, formato = '4:5', datos }) {
  const fmt = FORMATOS[formato] || FORMATOS['4:5'];
  canvas.width = fmt.w;
  canvas.height = fmt.h;

  await asegurarFuentes();
  const imgs = await precargarRecursos(tipo, datos);

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, fmt.w, fmt.h);
  pintarFondoEstadio(ctx, fmt);

  if (tipo === 'tabla') {
    pintarCuerpoTabla(ctx, fmt, datos, imgs);
  } else {
    pintarCuerpoPronosticos(ctx, fmt, datos, imgs);
  }
  return fmt;
}

/* --- Modal de Vista Previa, Descarga PNG y Web Share API --- */

let _estadoModal = {
  abierto: false,
  tipo: 'tabla',
  formato: '4:5',
  datos: null,
  tituloModal: '',
  nombreBase: 'scorecast',
  textoShare: '',
  renderToken: 0
};

function canvasABlob(canvas) {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error('No se pudo generar el archivo PNG.'));
      }, 'image/png', 1.0);
    } catch (err) {
      reject(err);
    }
  });
}

function descargarBlobPNG(blob, nombreArchivo) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2500);
}

function asegurarModalDOM() {
  let overlay = document.getElementById('sc-share-overlay');
  if (overlay) return overlay;

  overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'sc-share-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'sc-share-titulo');

  overlay.innerHTML = `
    <div class="modal-contenido share-modal">
      <div class="share-modal__head">
        <div class="share-modal__tit-wrap">
          <span class="share-modal__kicker">Tarjeta Broadcast · PNG HD</span>
          <h3 class="share-modal__titulo" id="sc-share-titulo">Compartir tarjeta</h3>
        </div>
        <button class="modal-cerrar" id="sc-share-cerrar" type="button" aria-label="Cerrar">
          <svg class="ico ico--sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>
      <div class="share-modal__body">
        <div class="share-modal__toolbar">
          <div class="share-modal__formatos" role="tablist" aria-label="Formato de tarjeta">
            <button class="share-modal__fmt-btn activo" data-fmt="4:5" type="button">
              <span class="share-modal__fmt-tag">4:5</span> WhatsApp / Feed
            </button>
            <button class="share-modal__fmt-btn" data-fmt="9:16" type="button">
              <span class="share-modal__fmt-tag">9:16</span> Stories / Estado
            </button>
          </div>
        </div>
        <div class="share-modal__stage" id="sc-share-stage">
          <canvas class="share-modal__canvas" id="sc-share-canvas" width="1080" height="1350"></canvas>
          <div class="share-modal__loader">Renderizando tarjeta…</div>
        </div>
        <div class="share-modal__meta">
          <span id="sc-share-dim">1080 × 1350 px · PNG sin compresión</span>
          <span>ScoreCast 2026/27</span>
        </div>
        <div class="share-modal__acciones">
          <button class="boton boton--fantasma" id="sc-share-descargar" type="button">
            <svg class="ico ico--sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Descargar PNG
          </button>
          <button class="boton" id="sc-share-nativo" type="button">
            <svg class="ico ico--sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            Compartir
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  vincularEventosModal(overlay);
  return overlay;
}

function nombreArchivoActual() {
  const fmt = FORMATOS[_estadoModal.formato] || FORMATOS['4:5'];
  return `${_estadoModal.nombreBase}-${fmt.sufijo}.png`;
}

async function refrescarVistaPrevia() {
  const stage = document.getElementById('sc-share-stage');
  const canvas = document.getElementById('sc-share-canvas');
  const dimEl = document.getElementById('sc-share-dim');
  if (!canvas || !_estadoModal.datos) return;

  const token = ++_estadoModal.renderToken;
  stage?.classList.add('cargando');
  try {
    const fmt = await renderizarTarjeta(canvas, {
      tipo: _estadoModal.tipo,
      formato: _estadoModal.formato,
      datos: _estadoModal.datos
    });
    if (token === _estadoModal.renderToken && dimEl) {
      dimEl.textContent = `${fmt.w} × ${fmt.h} px · ${fmt.etiqueta}`;
    }
  } catch (err) {
    console.error('Error al renderizar tarjeta ScoreCast:', err);
    toastMsg('No se pudo renderizar la vista previa.', 'error');
  } finally {
    if (token === _estadoModal.renderToken) {
      stage?.classList.remove('cargando');
    }
  }
}

function cerrarModalCompartir() {
  const overlay = document.getElementById('sc-share-overlay');
  if (overlay) overlay.classList.remove('activo');
  _estadoModal.abierto = false;
}

function vincularEventosModal(overlay) {
  overlay.querySelector('#sc-share-cerrar')?.addEventListener('click', cerrarModalCompartir);
  overlay.addEventListener('click', e => {
    if (e.target === overlay) cerrarModalCompartir();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && _estadoModal.abierto) cerrarModalCompartir();
  });

  overlay.querySelectorAll('.share-modal__fmt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const fmt = btn.dataset.fmt;
      if (!fmt || !FORMATOS[fmt] || _estadoModal.formato === fmt) return;
      _estadoModal.formato = fmt;
      overlay.querySelectorAll('.share-modal__fmt-btn').forEach(b => {
        b.classList.toggle('activo', b.dataset.fmt === fmt);
      });
      refrescarVistaPrevia();
    });
  });

  overlay.querySelector('#sc-share-descargar')?.addEventListener('click', async e => {
    const btn = e.currentTarget;
    const canvas = document.getElementById('sc-share-canvas');
    if (!canvas) return;
    btn.disabled = true;
    try {
      const blob = await canvasABlob(canvas);
      descargarBlobPNG(blob, nombreArchivoActual());
      toastMsg('Tarjeta PNG descargada en alta definición.', 'ok');
    } catch (err) {
      toastMsg(err.message || 'No se pudo descargar el PNG.', 'error');
    } finally {
      btn.disabled = false;
    }
  });

  overlay.querySelector('#sc-share-nativo')?.addEventListener('click', async e => {
    const btn = e.currentTarget;
    const canvas = document.getElementById('sc-share-canvas');
    if (!canvas) return;
    btn.disabled = true;
    try {
      const blob = await canvasABlob(canvas);
      const archivoNombre = nombreArchivoActual();
      const pngFile = new File([blob], archivoNombre, { type: 'image/png' });
      const puedeCompartirArchivo = typeof navigator !== 'undefined'
        && typeof navigator.share === 'function'
        && typeof navigator.canShare === 'function'
        && navigator.canShare({ files: [pngFile] });

      if (puedeCompartirArchivo) {
        await navigator.share({
          files: [pngFile],
          title: _estadoModal.tituloModal || 'ScoreCast',
          text: _estadoModal.textoShare || 'Mis resultados en ScoreCast'
        });
      } else {
        descargarBlobPNG(blob, archivoNombre);
        toastMsg('PNG descargado. Adjúntalo en WhatsApp Web o redes sociales.', 'info');
      }
    } catch (err) {
      if (err && err.name === 'AbortError') return;
      try {
        const blob = await canvasABlob(canvas);
        descargarBlobPNG(blob, nombreArchivoActual());
        toastMsg('PNG descargado listo para compartir.', 'info');
      } catch (_) {
        toastMsg('No se pudo compartir la tarjeta.', 'error');
      }
    } finally {
      btn.disabled = false;
    }
  });
}

function abrirModalConEstado(config) {
  const overlay = asegurarModalDOM();
  _estadoModal = {
    ..._estadoModal,
    ...config,
    formato: '4:5',
    abierto: true
  };

  const titEl = overlay.querySelector('#sc-share-titulo');
  if (titEl) titEl.textContent = config.tituloModal || 'Compartir tarjeta';

  overlay.querySelectorAll('.share-modal__fmt-btn').forEach(b => {
    b.classList.toggle('activo', b.dataset.fmt === '4:5');
  });

  overlay.classList.add('activo');
  refrescarVistaPrevia();
}

export function abrirTabla({ yo, filas = [], nombreSala = 'ScoreCast Principal' } = {}) {
  if (!filas || !filas.length) {
    toastMsg('Todavía no hay posiciones disponibles para compartir.', 'info');
    return;
  }
  const miFila = filas.find(f => f.uid === yo?.uid);
  const textoShare = miFila
    ? `Voy en el puesto #${miFila.pos} con ${miFila.pts} pts en ${nombreSala} · ScoreCast`
    : `Clasificación actual de ${nombreSala} en ScoreCast`;

  abrirModalConEstado({
    tipo: 'tabla',
    datos: { yo, filas, nombreSala },
    tituloModal: 'Compartir mi posición',
    nombreBase: 'scorecast-posicion',
    textoShare
  });
}

export function abrirPronosticos({
  yo,
  partidos = [],
  misPred = {},
  resultados = {},
  nombreSala = 'ScoreCast Principal',
  contextoFiltro = 'Mis pronósticos'
} = {}) {
  const u = globalThis.U;
  const guardadosLista = (partidos || []).filter(p => p && p.local && p.visitante && misPred && misPred[p.id] != null);

  if (!guardadosLista.length) {
    const tieneGlobal = misPred && Object.keys(misPred).length > 0;
    toastMsg(
      tieneGlobal
        ? 'No tienes pronósticos guardados en este filtro o jornada. Cambia el filtro o guarda un marcador.'
        : 'Aún no tienes pronósticos guardados para compartir. Guarda al menos un marcador primero.',
      'info'
    );
    return;
  }

  const pesoOrden = p => {
    const res = resultados[p.id] || p.resultado;
    const est = (u && typeof u.estadoPartido === 'function') ? u.estadoPartido(p, res) : (res?.estado || 'programado');
    if (est === 'en_juego') return 0;
    if (est === 'programado' || est === 'cerrado') return 1;
    return 2;
  };

  const ordenados = guardadosLista.slice().sort((a, b) => {
    const pa = pesoOrden(a);
    const pb = pesoOrden(b);
    if (pa !== pb) return pa - pb;
    return String(a.utc || a.fecha || '').localeCompare(String(b.utc || b.fecha || ''));
  });

  const seleccion = ordenados.slice(0, 6).map(partido => ({
    partido,
    pred: misPred[partido.id],
    res: resultados[partido.id] || partido.resultado || null
  }));

  abrirModalConEstado({
    tipo: 'pronosticos',
    datos: {
      yo,
      items: seleccion,
      restantes: Math.max(0, ordenados.length - seleccion.length),
      nombreSala,
      contextoFiltro
    },
    tituloModal: 'Compartir mis pronósticos',
    nombreBase: 'scorecast-pronosticos',
    textoShare: `Mis pronósticos (${contextoFiltro}) en ${nombreSala} · ScoreCast`
  });
}

export const CompartirCard = {
  cargarImgSegura,
  renderizarTarjeta,
  abrirTabla,
  abrirPronosticos
};

if (typeof window !== 'undefined') {
  window.CompartirCard = CompartirCard;
}

export default CompartirCard;









