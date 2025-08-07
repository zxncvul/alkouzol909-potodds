// config.js
// Módulo independiente para funcionalidades de configuración: cuenta atrás y modo memoria

// Estado de la cuenta atrás
const countdownState = {
  enabled: false,
  duration: 0,         // segundos por defecto
  timerId: null,
};

// Estado del modo memoria
const memoryState = {
  enabled: false,
  duration: 0,         // segundos por defecto
  zones: {
    flop: false,
    turn: false,
    river: false,
    hero: false,
    villain: false,
  },
  randomCount: null,   // si 1–4, usar aleatorio
  timers: [],          // IDs de setTimeout
};

/**
 * Inserta el panel de configuración si no existe y devuelve el elemento.
 */
function insertConfigPanelBeforeDuel() {
  let panel = document.createElement('div');
  panel.id = 'screen-config';
 
  const target = document.getElementById('duel-container') || document.body;
  target.parentNode.insertBefore(panel, target);
  return panel;
}

/**
 * Inicializa todo el módulo de configuración.
 * Debe llamarse una vez tras cargar la página.
 */
export function initConfig() {
  const container = document.getElementById('screen-config') || insertConfigPanelBeforeDuel();
  initTopControls(container);
  initZoneToggles(container);
  initGameModeButtons(container);


  // Hooks en eventos de duelo
  document.addEventListener('duel:start', () => {
    onDuelStartCountdown();
    onDuelStartMemory();
  });
  document.addEventListener('duel:end', () => {
    clearAllCountdownTimers();
    clearAllMemoryTimers();
  });
  bindTemporaryReveal()
}

/**
 * ============================
 * Funcionalidad 1: Cuenta atrás
 * ============================
 */

/**
 * Monta UI para la cuenta atrás y listeners asociados.
 */
function initTopControls(parentEl) {
  if (parentEl.querySelector('.selector')) return;
  const row = document.createElement('div');
  row.className = 'config-row';

  const validSeconds = [0, 1, 2, 5, 10, 15, 30];

  // === BLOQUE: CONTRARRELOJ ===
  const clockSelector = document.createElement('div');
  clockSelector.className = 'selector';

  const clockLeft = document.createElement('button');
  clockLeft.className = 'selector-btn'; clockLeft.textContent = '-';

  const clockValue = document.createElement('span');
  clockValue.className = 'selector-value';
  clockValue.textContent = `◔.${String(countdownState.duration).padStart(2, '0')}s`;

  const clockRight = document.createElement('button');
  clockRight.className = 'selector-btn'; clockRight.textContent = '+';

  clockSelector.append(clockLeft, clockValue, clockRight);

  function updateClockUI() {
    const en = countdownState.duration > 0;
    clockValue.textContent = `◔.${String(countdownState.duration).padStart(2, '0')}s`;
    clockValue.style.opacity ='1';
  }

  clockLeft.addEventListener('click', () => {
    const idx = validSeconds.indexOf(countdownState.duration);
    if (idx > 0) {
      countdownState.duration = validSeconds[idx - 1];
      updateClockUI();
    }
  });

  clockRight.addEventListener('click', () => {
    const idx = validSeconds.indexOf(countdownState.duration);
    if (idx < validSeconds.length - 1) {
      countdownState.duration = validSeconds[idx + 1];
      updateClockUI();
    }
  });

  // === BLOQUE: MEMORY ===
  const memorySelector = document.createElement('div');
  memorySelector.className = 'selector';

  const memLeft = document.createElement('button');
  memLeft.className = 'selector-btn'; memLeft.textContent = '-';

  const memValue = document.createElement('span');
  memValue.className = 'selector-value';
  memValue.textContent = `M.${String(memoryState.duration).padStart(2, '0')}s`;


  const memRight = document.createElement('button');
  memRight.className = 'selector-btn'; memRight.textContent = '+';

  memorySelector.append(memLeft, memValue, memRight);

  function updateMemoryUI() {
    const en = memoryState.duration > 0;
   memValue.textContent = `M.${String(memoryState.duration).padStart(2, '0')}s`;

    memValue.style.opacity = '1';

    updateRndUI();

    const toggleSection = document.querySelector('.zone-toggle-wrapper');
    if (toggleSection) {
      toggleSection.classList.toggle('disabled', !en);
    }

    memoryState.enabled = en;
  }

  memLeft.addEventListener('click', () => {
    const idx = validSeconds.indexOf(memoryState.duration);
    if (idx > 0) {
      memoryState.duration = validSeconds[idx - 1];
      updateMemoryUI();
    }
  });

  memRight.addEventListener('click', () => {
    const idx = validSeconds.indexOf(memoryState.duration);
    if (idx < validSeconds.length - 1) {
      memoryState.duration = validSeconds[idx + 1];
      updateMemoryUI();
    }
  });

  // === SELECTOR ALEATORIO ===
  const randomSelector = document.createElement('div');
  randomSelector.className = 'selector';

  const rndLeft = document.createElement('button');
  rndLeft.className = 'selector-btn'; rndLeft.textContent = '‹';

  const rndValue = document.createElement('span');
  rndValue.className = 'selector-value selector-value-random';

  const rndRight = document.createElement('button');
  rndRight.className = 'selector-btn'; rndRight.textContent = '›';

  const options = ['0.RND', '1.RND', '2.RND', '3.RND', '4.RND'];
  let rndIndex = 0;
  rndValue.textContent = options[rndIndex];

  rndLeft.addEventListener('click', () => {
    if (rndIndex > 0) {
      rndIndex--;
      memoryState.randomCount = rndIndex === 0 ? null : rndIndex;
      rndValue.textContent = options[rndIndex];
    }
  });

  rndRight.addEventListener('click', () => {
    if (rndIndex < options.length - 1) {
      rndIndex++;
      memoryState.randomCount = rndIndex === 0 ? null : rndIndex;
      rndValue.textContent = options[rndIndex];
    }
  });

  function updateRndUI() {
    const en = memoryState.duration > 0;
    rndLeft.disabled = rndRight.disabled = !en;
    rndValue.style.opacity = en ? '1' : '0.3';
  }

  randomSelector.append(rndLeft, rndValue, rndRight);

  // === ENSAMBLAR FILA ===
  row.append(clockSelector, memorySelector, randomSelector);
  parentEl.appendChild(row);

  updateClockUI();
  updateMemoryUI();
}


function initZoneToggles(parentEl) {
  if (parentEl.querySelector('.zone-toggle-wrapper')) return;
  const row = document.createElement('div');
  row.className = 'config-row config-row-toggle zone-toggle-wrapper';
  row.classList.add('disabled');

  const labels = {
    flop: 'FL',
    turn: 'TR',
    river: 'RV',
    hero: 'HR',
    villain: 'OPP'
  };

  const zones = ['flop', 'turn', 'river'];
  const hands = ['hero', 'villain'];

  zones.forEach(zone => {
    const btn = document.createElement('button');
    btn.className = 'toggle-btn';
    btn.dataset.zone = zone;

    const circle = document.createElement('span');
    circle.className = 'toggle-circle';

    const label = document.createElement('span');
    label.textContent = labels[zone] || zone;

    btn.append(circle, label);
    row.appendChild(btn);

    btn.addEventListener('click', () => {
      const isActive = memoryState.zones[zone];
      memoryState.zones[zone] = !isActive;
      btn.classList.toggle('active', memoryState.zones[zone]);
    });
  });

  // Separador visual
  const sep = document.createElement('span');
  sep.textContent = '|';
  
  row.appendChild(sep);

  hands.forEach(zone => {
    const btn = document.createElement('button');
    btn.className = 'toggle-btn';
    btn.dataset.zone = zone;

    const circle = document.createElement('span');
    circle.className = 'toggle-circle';

    const label = document.createElement('span');
    label.textContent = labels[zone] || zone;

    btn.append(circle, label);
    row.appendChild(btn);

    btn.addEventListener('click', () => {
      const isActive = memoryState.zones[zone];
      memoryState.zones[zone] = !isActive;
      btn.classList.toggle('active', memoryState.zones[zone]);
    });
  });

  parentEl.appendChild(row);

  if (parentEl.querySelector('[data-suitmode]')) return;

    // === NUEVA FILA: selector de estilo de color de palos ===
   // === NUEVA FILA: selector de estilo de palos (tipo toggle) ===
  const suitRow = document.createElement('div');
  suitRow.className = 'config-row config-row-toggle';
  

  const suitModes = ['RAINBOW', 'PAIRED', 'MONO', 'RAND'];
  const suitLabels = {
    RAINBOW: 'RAINBOW',
    PAIRED:  'PAIR',
    MONO:    'MONO',
    RAND:    'RND'
  };
  let currentSuit = 'MONO';

  suitModes.forEach(mode => {
    const btn = document.createElement('button');
    btn.className = 'toggle-btn';
    btn.dataset.suitmode = mode;

    const circle = document.createElement('span');
    circle.className = 'toggle-circle';

    const label = document.createElement('span');
    label.textContent = suitLabels[mode];

    btn.append(circle, label);
    suitRow.appendChild(btn);

    btn.addEventListener('click', () => {
      currentSuit = mode;
      document.querySelectorAll('[data-suitmode]')
              .forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updateSuitColors(); // aplica colores si ya hay cartas
    });

     if (mode === currentSuit) {
    btn.classList.add('active');
  }
  });

  parentEl.appendChild(suitRow);

  // Expón la función global
  window.getSuitMode = () => currentSuit;


}

function updateSuitColors() {
  const cards = document.querySelectorAll('.card');
  const mode = window.getSuitMode();

  cards.forEach(card => {
    const text = card.textContent || '';
    const suit = text.slice(-1); // última letra = palo

    card.style.color = getSuitColor(suit, mode);
  });
}

export function getSuitColor(suit, mode) {
  if (mode === 'RAINBOW') {
    return suit === '♥' ? '#cc2121'
         : suit === '♦' ? '#248da7'
         : suit === '♣' ? '#24a743'
         : '#929292';
  }
  if (mode === 'PAIRED') {
    return (suit === '♥' || suit === '♦') ? '#cc2121' : '#929292';
  }
  if (mode === 'MONO') {
    return '#29a847';
  }
  return '#29a847';
}






/**
 * Llamar al iniciar cada mano: reinicia timers y arranca uno nuevo si está activo.
 */
function onDuelStartCountdown() {
  clearAllCountdownTimers();
  if (countdownState.enabled) startTimer();
}

/**
 * Inicia el temporizador de cuenta atrás.
 */
function startTimer() {
  countdownState.timerId = setTimeout(handleTimeout, countdownState.duration * 1000);
}

/**
 * Maneja cuando expira el tiempo:
 * - Muestra mensaje de error
 * - Marca mano como fallo
 * - Tras delay, inicia siguiente mano
 */
function handleTimeout() {
  // Mostrar mensaje
  const msg = document.createElement('div');
  msg.classList.add('timeout-message');
  msg.textContent = '⏰ Se acabó el tiempo';
  document.body.appendChild(msg);

  // Marcar fallo
  if (typeof guessWinner === 'function') guessWinner('timeout');

  // Avisamos fin de mano para limpiar timers
  document.dispatchEvent(new Event('duel:end'));

  // Tras 2s, limpiar mensaje y cargar siguiente mano
  setTimeout(() => {
    msg.remove();
    if (typeof generateDuel === 'function') generateDuel();
  }, 2000);
}

/**
 * Cancela cualquier timer de cuenta atrás activo.
 */
function clearAllCountdownTimers() {
  if (countdownState.timerId) {
    clearTimeout(countdownState.timerId);
    countdownState.timerId = null;
  }
}

/**
 * ===============================
 * Funcionalidad 2: Modo memoria
 * ===============================
 */

/**
 * Monta UI para el modo memoria y listeners.
 */



/**
 * Al iniciar cada mano: programa ocultaciones según configuración.
 */
function onDuelStartMemory() {
  clearAllMemoryTimers();
  if (!memoryState.enabled) return;

  // Paso 1: Zonas marcadas por el usuario
  const selectedZones = Object.entries(memoryState.zones)
    .filter(([_, isChecked]) => isChecked)
    .map(([zone]) => zone);

  // Paso 2: Si randomCount > 0 → elegir al azar entre las seleccionadas
  let zonesToHide = [];

  if (memoryState.randomCount && memoryState.randomCount > 0) {
    const shuffled = selectedZones.slice().sort(() => Math.random() - 0.5);
    zonesToHide = shuffled.slice(0, memoryState.randomCount);
  } else {
    zonesToHide = selectedZones;
  }

  zonesToHide.forEach(zone => scheduleHideZone(zone));
}


/**
 * Programa ocultamiento tras `duration` segundos.
 */
function scheduleHideZone(zone) {
  const selectors = {
    flop: '#duel-board .card:nth-child(-n+3)',
    turn: '#duel-board .card:nth-child(4)',
    river: '#duel-board .card:nth-child(5)',
    hero: '#hero-hand .card',
    villain: '#villain-hand .card',
  };
  const elems = document.querySelectorAll(selectors[zone] || '');
  const tid = setTimeout(() => {
    elems.forEach(el => {
      const content = el.querySelector('.card-content');
      if (content) content.classList.add('hidden-by-memory');
    });
  }, memoryState.duration * 1000);
  memoryState.timers.push(tid);
}


/**
 * Revela temporalmente las zonas ocultas cuando el usuario hace click.
 */
function bindTemporaryReveal() {
  document.addEventListener('click', e => {
    const card = e.target.closest('.card'); // clic en cualquier parte de la carta
    if (!card) return;

    const content = card.querySelector('.card-content.hidden-by-memory');
    if (!content) return;

    e.stopImmediatePropagation(); // 🛑 evita burbujas y otros listeners
e.preventDefault();

    content.classList.remove('hidden-by-memory');

    setTimeout(() => {
      content.classList.add('hidden-by-memory');
    }, 500);
  });
}


/**
 * Cancela todos los timers de memoria activos.
 */
function clearAllMemoryTimers() {
  memoryState.timers.forEach(id => clearTimeout(id));
  memoryState.timers = [];
}

function initGameModeButtons(parentEl) {
  if (parentEl.querySelector('.game-mode-row')) return;
  const row = document.createElement('div');
  row.className = 'config-row config-row-toggle game-mode-row';

  const modes = [
    { label: 'GAME',    key: 'jugadas' },
    { label: 'RANKING', key: 'ranking' },
    { label: 'VS',      key: 'duel' },
    { label: '|',       key: null },
    { label: 'RNG',     key: 'disorder' }
  ];

  modes.forEach(entry => {
    if (entry.label === '|') {
      const sep = document.createElement('span');
      sep.className = 'separator';
      sep.textContent = '|';
      row.appendChild(sep);
      return;
    }

    const btn = document.createElement('button');
    btn.className = 'toggle-btn';
    btn.dataset.mode = entry.key;

    const circle = document.createElement('span');
    circle.className = 'toggle-circle';

    const label = document.createElement('span');
    label.textContent = entry.label;

    btn.append(circle, label);
    row.appendChild(btn);

    // ⏎ Listener del botón
    btn.addEventListener('click', () => {
  if (btn.classList.contains('disabled')) return;

  if (entry.key === 'disorder') {
    // Solo activar visualmente, no cargar modo
    btn.classList.toggle('active');
    return;
  }

  // Activar modo normal
  document.querySelectorAll('[data-mode]').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  loadMode(entry.key);
});

  });

  parentEl.appendChild(row);

  // ✅ Activar botón VS tras render
  setTimeout(() => {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get('mode') || 'duel';
  const defaultBtn = row.querySelector(`[data-mode="${mode}"]`);
  if (defaultBtn) defaultBtn.classList.add('active');
  updateDisorderButtonState(mode);
}, 0);

}

function loadMode(mode) {
  if (!mode) return;

  // ⬛️ Añadir clase de fade-out
  document.documentElement.classList.add('fade-out');

  // Esperar a que se vea el negro y recargar
  setTimeout(() => {
    window.location.search = `?mode=${mode}`;
  }, 50);
}






function updateDisorderButtonState(mode) {
  const disorderBtn = document.querySelector('[data-mode="disorder"]');
  if (!disorderBtn) return;

  const isGame = mode === 'jugadas';
  disorderBtn.classList.toggle('disabled', !isGame);
  disorderBtn.disabled = !isGame;
}



