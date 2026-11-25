/* ============================================================
   SCORECAST — TRIBUNA SOCIAL (CHAT, ENCUESTAS Y LOGROS)
   ------------------------------------------------------------
   Zona de interacción comunitaria para salas cerradas:
     • Muro / Chat en tiempo real de la sala
     • Encuestas y duelos en vivo de los torneos 2026/27
     • Insignias y logros dinámicos de gamificación
   ============================================================ */

import { FIXTURE } from './fixture.js?v=34';
import { U } from './utils.js?v=34';

const ENCUESTAS_ACTIVAS = [
  {
    id: 'poll_lib_final_2026',
    titulo: '🏆 ¿Quién gana la Final de la Copa Libertadores 2026?',
    subtitulo: '28 de noviembre · Estadio Centenario, Montevideo',
    opciones: [
      { id: 'elp', label: 'Estudiantes de La Plata', code: 'elp' },
      { id: 'pal', label: 'Palmeiras', code: 'pal' }
    ]
  },
  {
    id: 'poll_sud_final_2026',
    titulo: '🥈 ¿Quién levanta la Copa Sudamericana en Barranquilla?',
    subtitulo: '21 de noviembre · Estadio Metropolitano Roberto Meléndez',
    opciones: [
      { id: 'cabj', label: 'Boca Juniors', code: 'cabj' },
      { id: 'cam', label: 'Atlético Mineiro', code: 'cam' }
    ]
  },
  {
    id: 'poll_bp_cua_a_2026',
    titulo: '🇨🇴 ¿Quién clasifica a la Final desde el Cuadrangular A?',
    subtitulo: 'Liga BetPlay 2026-II · Semifinales',
    opciones: [
      { id: 'nal', label: 'Atlético Nacional', code: 'nal' },
      { id: 'dim', label: 'Independiente Medellín', code: 'dim' },
      { id: 'sfe', label: 'Independiente Santa Fe', code: 'sfe' },
      { id: 'onc', label: 'Once Caldas', code: 'onc' }
    ]
  },
  {
    id: 'poll_bp_cua_b_2026',
    titulo: '🇨🇴 ¿Quién clasifica a la Final desde el Cuadrangular B?',
    subtitulo: 'Liga BetPlay 2026-II · Semifinales',
    opciones: [
      { id: 'ame', label: 'América de Cali', code: 'ame' },
      { id: 'cal', label: 'Deportivo Cali', code: 'cal' },
      { id: 'mfc', label: 'Millonarios FC', code: 'mfc' },
      { id: 'buc', label: 'Atlético Bucaramanga', code: 'buc' }
    ]
  }
];

function tiempoRelativo(ms) {
  if (!ms) return '';
  const diff = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (diff < 60) return 'ahora';
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  return new Date(ms).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
}

export const TribunaSocial = {
  _unsubChat: null,
  _unsubPolls: null,

  _calcularLogros(yo, misPred = {}, resultados = {}, numMensajesMios = 0) {
    const totalPreds = Object.keys(misPred).length;
    let exactos = 0, aciertos = 0;
    for (const [pid, pr] of Object.entries(misPred)) {
      const p = FIXTURE.porId(pid);
      const r = resultados[pid] || p?.resultado;
      if (!p || !r || r.estado !== 'finalizado') continue;
      const cal = window.Puntos?.calificar(pr, r, p.fase);
      if (cal?.tipo === 'exacto') exactos++;
      else if (cal?.tipo === 'resultado') aciertos++;
    }
    const campeonesElegidos = Object.keys(yo.campeones || {}).filter(k => yo.campeones[k]).length;

    return [
      { icono: '⚽', nombre: 'Primer Pitazo', desc: 'Registra tu primer pronóstico', ok: totalPreds >= 1 },
      { icono: '🔥', nombre: 'Analista Constante', desc: '10+ pronósticos registrados', ok: totalPreds >= 10 },
      { icono: '🎯', nombre: 'Francotirador', desc: 'Acierta un marcador exacto', ok: exactos >= 1 },
      { icono: '🏆', nombre: 'Visionario 7/7', desc: 'Elige campeón en los 7 torneos', ok: campeonesElegidos >= 7 },
      { icono: '💬', nombre: 'Voz de la Tribuna', desc: 'Participa en el chat de la sala', ok: numMensajesMios >= 1 },
      { icono: '🌟', nombre: 'Estratega', desc: '3+ resultados o exactos acertados', ok: (exactos + aciertos) >= 3 }
    ];
  },

  render(contenedor, ctx) {
    if (!contenedor) return;
    const { yo, salaId, nombreSala = 'ScoreCast Principal', misPred = {}, resultados = {} } = ctx;

    const urlInvitar = `${location.origin}${location.pathname}?sala=${encodeURIComponent(salaId)}`;

    contenedor.innerHTML = `
      <div class="tribuna-hero panel panel--relleno">
        <div>
          <span class="comp-hero-tag">🤝 Comunidad & Interacción</span>
          <h2 style="margin:4px 0 4px;font-size:22px;">💬 Tribuna Social · ${U.esc(nombreSala)}</h2>
          <p class="sub" style="margin:0;font-size:13px;">
            Conversa con tu grupo en tiempo real, vota en los duelos de la fecha y desbloquea logros comunitarios.
          </p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button type="button" class="boton boton--verde boton--mini" id="tri-btn-copiar-link">🔗 Copiar enlace de sala</button>
          <a class="boton boton--fantasma boton--mini" target="_blank" rel="noopener"
             href="https://wa.me/?text=${encodeURIComponent(`⚽ ¡Únete a nuestra sala "${nombreSala}" en ScoreCast y hagamos pronósticos juntos! ${urlInvitar}`)}">
             📲 Invitar por WhatsApp
          </a>
        </div>
      </div>

      <div class="tribuna-grid">
        <!-- COLUMNA IZQUIERDA: CHAT EN VIVO DE LA SALA -->
        <section class="panel tribuna-chat-card">
          <div class="tribuna-card-head">
            <div>
              <h3 style="margin:0;font-size:16px;">📣 Muro y Chat de la Sala</h3>
              <small style="color:var(--tinta-3);font-size:11.5px;">Mensajes en tiempo real visibles solo para tu sala</small>
            </div>
            <span class="etiqueta etiqueta--fin" id="tri-chat-count">0 mensajes</span>
          </div>

          <div class="tribuna-msgs" id="tri-msgs">
            <div class="sub centro" style="padding:30px;">Conectando a la tribuna...</div>
          </div>

          <div class="ev-quick-chips" style="padding:8px 14px 4px;">
            <button type="button" class="ev-qchip" data-tmsg="⚽ ¡Vamos que hoy sumamos exacto!">⚽ ¡Vamos por el exacto!</button>
            <button type="button" class="ev-qchip" data-tmsg="🔥 ¿Quién creen que se lleva la Libertadores?">🔥 Debate Libertadores</button>
            <button type="button" class="ev-qchip" data-tmsg="🇨🇴 ¡Arrancan los cuadrangulares BetPlay!">🇨🇴 Cuadrangulares</button>
            <button type="button" class="ev-qchip" data-tmsg="🏆 ¡Ya elegí mis 7 campeones!">🏆 7/7 Campeones</button>
          </div>

          <form class="tribuna-form" id="tri-form" autocomplete="off">
            <input type="text" id="tri-input" maxlength="400" placeholder="Comparte tu opinión, pronóstico o debate con la sala..." required>
            <button type="submit" class="boton boton--verde">Enviar ➤</button>
          </form>
        </section>

        <!-- COLUMNA DERECHA: ENCUESTAS EN VIVO + LOGROS -->
        <div class="tribuna-side-col">
          <section class="panel tribuna-polls-card">
            <div class="tribuna-card-head">
              <div>
                <h3 style="margin:0;font-size:16px;">🗳 Encuestas & Duelos de la Fecha</h3>
                <small style="color:var(--tinta-3);font-size:11.5px;">Vota y mira en vivo qué opina la comunidad</small>
              </div>
            </div>
            <div id="tri-polls-list" class="tri-polls-list"></div>
          </section>

          <section class="panel tribuna-logros-card">
            <div class="tribuna-card-head">
              <div>
                <h3 style="margin:0;font-size:16px;">🏅 Tus Insignias Comunitarias</h3>
                <small style="color:var(--tinta-3);font-size:11.5px;">Progreso de gamificación en ScoreCast</small>
              </div>
            </div>
            <div id="tri-logros-grid" class="tri-logros-grid"></div>
          </section>
        </div>
      </div>
    `;

    // Copiar enlace de invitación
    contenedor.querySelector('#tri-btn-copiar-link').onclick = () => {
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(urlInvitar).catch(() => {});
      U.toast('¡Enlace de la sala copiado! Compártelo con tus amigos 🤝', 'ok');
    };

    const pintarLogros = (numMios) => {
      const box = contenedor.querySelector('#tri-logros-grid');
      if (!box) return;
      const logros = this._calcularLogros(yo, misPred, resultados, numMios);
      box.innerHTML = logros.map(l => `
        <div class="tri-logro ${l.ok ? 'tri-logro--ok' : ''}">
          <span class="tri-logro-ico">${l.icono}</span>
          <div>
            <b>${U.esc(l.nombre)}</b>
            <small>${U.esc(l.desc)}</small>
          </div>
          <span class="tri-logro-st">${l.ok ? '✓' : '🔒'}</span>
        </div>`).join('');
    };
    pintarLogros(0);

    // Chat en tiempo real
    const msgsEl = contenedor.querySelector('#tri-msgs');
    const countEl = contenedor.querySelector('#tri-chat-count');
    if (this._unsubChat) { try { this._unsubChat(); } catch (_) {} }
    this._unsubChat = Store.escucharChat(salaId, (lista) => {
      if (!msgsEl) return;
      if (countEl) countEl.textContent = `${lista.length} mensaje${lista.length === 1 ? '' : 's'}`;
      const misMsgs = lista.filter(m => m.uid === yo.uid).length;
      pintarLogros(misMsgs);

      if (!lista.length) {
        msgsEl.innerHTML = '<div class="sub centro" style="padding:36px 14px;">Aún no hay mensajes en esta sala. ¡Rompe el hielo con el primer comentario! ⚽</div>';
        return;
      }
      msgsEl.innerHTML = lista.map(m => {
        const esYo = m.uid === yo.uid;
        const puedeBorrar = esYo || yo.rol === 'admin';
        const rolTag = m.rol === 'admin' ? '<span class="tri-rol-tag">Admin</span>' : '';
        return `
          <div class="tri-msg ${esYo ? 'tri-msg--yo' : ''}">
            <div class="tri-avatar">${U.iniciales(m.nombre || 'U')}</div>
            <div class="tri-msg-body">
              <div class="tri-msg-head">
                <b>${U.esc(m.nombre || 'Participante')}${esYo ? ' (Tú)' : ''}</b>
                ${rolTag}
                <span class="tri-msg-time">${tiempoRelativo(m.t)}</span>
                ${puedeBorrar ? `<button type="button" class="tri-del-btn" data-del-msg="${U.esc(m.id)}" title="Eliminar mensaje">✕</button>` : ''}
              </div>
              <div class="tri-msg-text">${U.esc(m.texto)}</div>
            </div>
          </div>`;
      }).join('');
      msgsEl.scrollTop = msgsEl.scrollHeight;
    });

    msgsEl.addEventListener('click', async e => {
      const btn = e.target.closest('[data-del-msg]');
      if (!btn) return;
      try {
        await Store.eliminarMensajeChat(btn.dataset.delMsg);
        U.toast('Mensaje eliminado.', 'info');
      } catch (err) {
        U.toast('No se pudo eliminar: ' + err.message, 'error');
      }
    });

    const enviarMsg = async (txt) => {
      if (!txt.trim()) return;
      try {
        await Store.enviarMensajeChat(salaId, yo, txt);
      } catch (err) {
        U.toast('No se pudo enviar el mensaje: ' + err.message, 'error');
      }
    };

    contenedor.querySelector('#tri-form').onsubmit = async e => {
      e.preventDefault();
      const inp = contenedor.querySelector('#tri-input');
      const txt = inp.value.trim();
      if (!txt) return;
      inp.value = '';
      await enviarMsg(txt);
    };

    contenedor.querySelectorAll('[data-tmsg]').forEach(btn => {
      btn.onclick = () => enviarMsg(btn.dataset.tmsg);
    });

    // Encuestas en tiempo real
    const pollsEl = contenedor.querySelector('#tri-polls-list');
    const pintarPolls = (votosMap) => {
      if (!pollsEl) return;
      const todosVotos = Object.values(votosMap || {});
      pollsEl.innerHTML = ENCUESTAS_ACTIVAS.map(poll => {
        const votosPoll = todosVotos.filter(v => v.pollId === poll.id);
        const total = votosPoll.length;
        const miVoto = votosMap?.[`${poll.id}__${yo.uid}`]?.opcionId || null;

        return `
          <div class="tri-poll">
            <div class="tri-poll-tit">${U.esc(poll.titulo)}</div>
            <div class="tri-poll-sub">${U.esc(poll.subtitulo)} · <b>${total} voto${total === 1 ? '' : 's'}</b></div>
            <div class="tri-poll-ops">
              ${poll.opciones.map(op => {
                const cnt = votosPoll.filter(v => v.opcionId === op.id).length;
                const pct = total ? Math.round((cnt / total) * 100) : 0;
                const elegido = miVoto === op.id;
                const eq = op.code ? FIXTURE.equipo(op.code) : null;
                return `
                  <button type="button" class="tri-poll-op ${elegido ? 'elegido' : ''}" data-poll="${poll.id}" data-op="${op.id}">
                    <span class="tri-poll-fill" style="width:${pct}%"></span>
                    <span class="tri-poll-op-inner">
                      <span class="tri-poll-op-left">
                        ${eq ? eq.b : ''}
                        <span>${U.esc(op.label)}</span>
                        ${elegido ? '<span class="tri-poll-check">✓ Tu voto</span>' : ''}
                      </span>
                      <b class="tri-poll-pct">${pct}%</b>
                    </span>
                  </button>`;
              }).join('')}
            </div>
          </div>`;
      }).join('');
    };

    if (this._unsubPolls) { try { this._unsubPolls(); } catch (_) {} }
    this._unsubPolls = Store.escucharEncuestas(pintarPolls);

    pollsEl.addEventListener('click', async e => {
      const btn = e.target.closest('[data-poll][data-op]');
      if (!btn) return;
      try {
        await Store.votarEncuesta(btn.dataset.poll, yo.uid, btn.dataset.op);
        U.toast('¡Voto registrado en la encuesta! 🗳', 'ok');
      } catch (err) {
        U.toast('No se pudo registrar tu voto: ' + err.message, 'error');
      }
    });
  },

  destruir() {
    if (this._unsubChat) { try { this._unsubChat(); } catch (_) {} this._unsubChat = null; }
    if (this._unsubPolls) { try { this._unsubPolls(); } catch (_) {} this._unsubPolls = null; }
  }
};

window.TribunaSocial = TribunaSocial;
