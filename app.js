// ──────────────────────────────────────────────
//  State
// ──────────────────────────────────────────────
const state = {
  bodyPart: null,
  selectedExIds: [],
  workoutPlan: [],
  currentExIdx: 0,
  currentSet: 1,
  restSeconds: 0,
  restTotal: 0,
  restTimer: null,
  setTimer: null,       // countdown timer during active set
  setSeconds: 0,        // remaining seconds in current set
  setTotal: 0,
  wakeLock: null,
  startTime: null,
  audioCtx: null,
  voiceEnabled: true,
};

// ──────────────────────────────────────────────
//  Exercise DB (user-customizable, persisted)
// ──────────────────────────────────────────────
let exerciseDB;
(function loadExerciseDB() {
  const saved = localStorage.getItem('fitness-exercise-db');
  if (saved) { try { exerciseDB = JSON.parse(saved); return; } catch(e) {} }
  exerciseDB = JSON.parse(JSON.stringify(EXERCISES));
})();

function saveExerciseDB() {
  localStorage.setItem('fitness-exercise-db', JSON.stringify(exerciseDB));
}

function deleteExercise(exId) {
  const bp = state.bodyPart;
  exerciseDB[bp] = exerciseDB[bp].filter(e => e.id !== exId);
  state.selectedExIds = state.selectedExIds.filter(id => id !== exId);
  state.workoutPlan   = state.workoutPlan.filter(w => w.id !== exId);
  saveExerciseDB();
  renderSetup();
  showToast('动作已删除');
}

let exerciseEditMode = false;

// ──────────────────────────────────────────────
//  Audio
// ──────────────────────────────────────────────
function getAudioCtx() {
  if (!state.audioCtx) {
    state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return state.audioCtx;
}

function beep(freq = 880, dur = 0.15, vol = 0.6, delay = 0) {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = freq;
    const t = ctx.currentTime + delay;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  } catch (e) {}
}

function beepWarning() {
  // 3 quick beeps at 5 seconds
  beep(660, 0.1, 0.5, 0);
  beep(660, 0.1, 0.5, 0.2);
  beep(660, 0.1, 0.5, 0.4);
}

function beepDone() {
  // ascending tones — time's up
  beep(523, 0.12, 0.6, 0);
  beep(659, 0.12, 0.6, 0.15);
  beep(784, 0.2,  0.6, 0.3);
}

function beepComplete() {
  // workout done fanfare
  beep(523, 0.15, 0.5, 0);
  beep(659, 0.15, 0.5, 0.18);
  beep(784, 0.15, 0.5, 0.36);
  beep(1047, 0.3, 0.5, 0.54);
}

// ──────────────────────────────────────────────
//  Voice (Web Speech API)
// ──────────────────────────────────────────────
let voiceReady = false;
let zhVoice = null;

function initVoice() {
  if (!window.speechSynthesis) return;
  const load = () => {
    const voices = window.speechSynthesis.getVoices();
    // Prefer: zh-CN > zh-TW > any zh
    zhVoice = voices.find(v => v.lang === 'zh-CN')
           || voices.find(v => v.lang === 'zh-TW')
           || voices.find(v => v.lang.startsWith('zh'))
           || null;
    voiceReady = true;
  };
  if (window.speechSynthesis.getVoices().length > 0) {
    load();
  } else {
    window.speechSynthesis.addEventListener('voiceschanged', load, { once: true });
  }
}

function speak(text, interrupt = true) {
  if (!state.voiceEnabled || !window.speechSynthesis) return;
  if (interrupt) window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'zh-CN';
  utter.rate = 1.05;
  utter.pitch = 1.0;
  utter.volume = 1.0;
  if (zhVoice) utter.voice = zhVoice;
  window.speechSynthesis.speak(utter);
}

function toggleVoice() {
  state.voiceEnabled = !state.voiceEnabled;
  const btn = document.getElementById('btn-voice-toggle');
  btn.textContent = state.voiceEnabled ? '🔊' : '🔇';
  btn.title = state.voiceEnabled ? '语音开启' : '语音关闭';
  showToast(state.voiceEnabled ? '语音已开启' : '语音已关闭');
  if (state.voiceEnabled) speak('语音已开启');
}

initVoice();

// ──────────────────────────────────────────────
//  Wake Lock
// ──────────────────────────────────────────────
async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      state.wakeLock = await navigator.wakeLock.request('screen');
    }
  } catch (e) {}
}

function releaseWakeLock() {
  if (state.wakeLock) {
    state.wakeLock.release().catch(() => {});
    state.wakeLock = null;
  }
}

// Re-acquire after visibility change
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && state.restTimer) {
    requestWakeLock();
  }
});

// ──────────────────────────────────────────────
//  localStorage
// ──────────────────────────────────────────────
function saveSession(session) {
  const history = JSON.parse(localStorage.getItem('fitness-history') || '[]');
  history.unshift(session);
  localStorage.setItem('fitness-history', JSON.stringify(history.slice(0, 60)));
}

function getHistory() {
  return JSON.parse(localStorage.getItem('fitness-history') || '[]');
}

function getWeekCount() {
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  return getHistory().filter(s => s.date > weekAgo).length;
}

function getTotalSessions() {
  return getHistory().length;
}

// ──────────────────────────────────────────────
//  View Management
// ──────────────────────────────────────────────
function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ──────────────────────────────────────────────
//  Toast
// ──────────────────────────────────────────────
let toastTimer;
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

// ──────────────────────────────────────────────
//  HOME VIEW
// ──────────────────────────────────────────────
function renderHome() {
  document.getElementById('home-week-count').textContent = getWeekCount();
  document.getElementById('home-total-count').textContent = getTotalSessions();

  // Body part cards
  const grid = document.getElementById('bodypart-grid');
  grid.innerHTML = '';
  BODY_PARTS.forEach(bp => {
    const card = document.createElement('div');
    card.className = 'bodypart-card' + (state.bodyPart === bp.id ? ' selected' : '');
    card.innerHTML = `<div class="emoji">${bp.emoji}</div><div class="name">${bp.label}</div>`;
    card.addEventListener('click', () => {
      state.bodyPart = bp.id;
      state.selectedExIds = [];
      renderHome();
    });
    grid.appendChild(card);
  });

  // History
  renderHomeHistory();

  document.getElementById('btn-start-setup').disabled = !state.bodyPart;
}

function renderHomeHistory() {
  const container = document.getElementById('home-history');
  const history = getHistory().slice(0, 5);
  if (history.length === 0) {
    container.innerHTML = '<div style="color:var(--text-dim);font-size:13px;text-align:center;padding:12px">暂无记录，开始第一次训练吧！</div>';
    return;
  }
  container.innerHTML = history.map(s => {
    const d = new Date(s.date);
    const dateStr = `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    const partLabel = BODY_PARTS.find(b => b.id === s.bodyPart)?.label || s.bodyPart;
    const mins = Math.floor(s.duration / 60);
    return `<div class="history-item">
      <div>
        <div class="h-part">${partLabel}</div>
        <div class="h-date">${dateStr}</div>
      </div>
      <div class="h-info">
        <div class="h-sets">${s.totalSets} 组完成</div>
        <div>${mins} 分钟</div>
      </div>
    </div>`;
  }).join('');
}

// ──────────────────────────────────────────────
//  SETUP VIEW
// ──────────────────────────────────────────────
function renderSetup() {
  const exercises = exerciseDB[state.bodyPart] || [];
  const bp = BODY_PARTS.find(b => b.id === state.bodyPart);

  document.getElementById('setup-title').textContent = `${bp.emoji} ${bp.label}训练`;

  // Templates
  const tplRow = document.getElementById('templates-row');
  tplRow.innerHTML = TEMPLATES.map(t =>
    `<div class="template-chip" data-tpl='${JSON.stringify(t)}'>
      <div class="tpl-name">${t.name}</div>
      <div class="tpl-desc">${t.desc}</div>
    </div>`
  ).join('');
  tplRow.querySelectorAll('.template-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const tpl = JSON.parse(chip.dataset.tpl);
      applyTemplate(tpl);
      showToast(`已应用「${tpl.name}」模板`);
    });
  });

  // Exercise list
  const list = document.getElementById('exercise-list');
  list.innerHTML = '';
  exercises.forEach(ex => {
    const isSelected = state.selectedExIds.includes(ex.id);
    const item = document.createElement('div');
    item.className = 'exercise-item' + (isSelected ? ' selected' : '');
    item.dataset.exId = ex.id;

    // Find stored config or use defaults
    const stored = state.workoutPlan.find(w => w.id === ex.id);
    const sets     = stored?.sets     ?? ex.defaultSets;
    const rest     = stored?.rest     ?? ex.defaultRest;
    const duration = stored?.duration ?? ex.defaultDuration;
    const durLabel = duration > 0 ? `${duration}s` : '手动';

    item.innerHTML = `
      <div class="exercise-item-header">
        <div class="ex-check"><span class="ex-check-icon">✓</span></div>
        <div class="ex-name">${ex.name}</div>
      </div>
      <div class="exercise-config">
        <div class="config-row">
          <span class="config-label">组数</span>
          <div class="config-stepper">
            <button class="step-btn" data-field="sets" data-dir="-1">−</button>
            <span class="step-val" data-field-val="sets">${sets}</span>
            <button class="step-btn" data-field="sets" data-dir="1">+</button>
          </div>
        </div>
        <div class="config-row">
          <span class="config-label">休息时间</span>
          <div class="config-stepper">
            <button class="step-btn" data-field="rest" data-dir="-15">−</button>
            <span class="step-val" data-field-val="rest">${rest}s</span>
            <button class="step-btn" data-field="rest" data-dir="15">+</button>
          </div>
        </div>
        <div class="config-row">
          <span class="config-label">每组时长</span>
          <div class="config-stepper">
            <button class="step-btn" data-field="duration" data-dir="-5">−</button>
            <span class="step-val" data-field-val="duration">${durLabel}</span>
            <button class="step-btn" data-field="duration" data-dir="5">+</button>
          </div>
        </div>
      </div>`;

    // Delete button (edit mode)
    if (exerciseEditMode) {
      const delBtn = document.createElement('button');
      delBtn.className = 'del-ex-btn';
      delBtn.textContent = '×';
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteExercise(ex.id);
      });
      item.querySelector('.exercise-item-header').appendChild(delBtn);
    }

    // Toggle selection
    item.querySelector('.exercise-item-header').addEventListener('click', () => {
      toggleExercise(ex.id, ex);
    });

    // Steppers
    item.querySelectorAll('.step-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        stepConfig(ex.id, btn.dataset.field, parseInt(btn.dataset.dir));
        updateStepDisplay(item, ex.id, ex);
      });
    });

    list.appendChild(item);
  });

  updateStartBtn();

  // Sync edit mode UI
  const editBtn = document.getElementById('btn-edit-exercises');
  if (editBtn) editBtn.textContent = exerciseEditMode ? '完成' : '管理';
  const addRow = document.getElementById('add-exercise-row');
  if (addRow) addRow.style.display = exerciseEditMode ? 'flex' : 'none';
}

function toggleExercise(exId, exDef) {
  const idx = state.selectedExIds.indexOf(exId);
  if (idx === -1) {
    state.selectedExIds.push(exId);
    // Add to plan if not there
    if (!state.workoutPlan.find(w => w.id === exId)) {
      state.workoutPlan.push({
        ...exDef,
        sets: exDef.defaultSets,
        rest: exDef.defaultRest,
        completedSets: 0,
      });
    }
  } else {
    state.selectedExIds.splice(idx, 1);
  }
  // Re-render just this item
  renderSetup();
  updateStartBtn();
}

function stepConfig(exId, field, delta) {
  let entry = state.workoutPlan.find(w => w.id === exId);
  const exDef = Object.values(exerciseDB).flat().find(e => e.id === exId);
  if (!entry) {
    entry = { ...exDef, sets: exDef.defaultSets, rest: exDef.defaultRest,
              duration: exDef.defaultDuration, completedSets: 0 };
    state.workoutPlan.push(entry);
  }
  if (field === 'sets') {
    entry.sets = Math.max(1, Math.min(10, (entry.sets ?? exDef.defaultSets) + delta));
  } else if (field === 'rest') {
    entry.rest = Math.max(15, Math.min(600, (entry.rest ?? exDef.defaultRest) + delta));
  } else if (field === 'duration') {
    // 0 = manual; cycle: 0→5→10→...→300→0
    const cur = entry.duration ?? exDef.defaultDuration;
    const next = cur + delta;
    entry.duration = next <= 0 ? 0 : Math.min(300, next);
  }
}

function updateStepDisplay(item, exId, exDef) {
  const entry = state.workoutPlan.find(w => w.id === exId) || exDef;
  const sets     = entry.sets     ?? exDef.defaultSets;
  const rest     = entry.rest     ?? exDef.defaultRest;
  const duration = entry.duration ?? exDef.defaultDuration;
  item.querySelector('[data-field-val="sets"]').textContent = sets;
  item.querySelector('[data-field-val="rest"]').textContent = rest + 's';
  item.querySelector('[data-field-val="duration"]').textContent = duration > 0 ? duration + 's' : '手动';
}

function applyTemplate(tpl) {
  // Apply to all selected, or all if none selected
  const targets = state.selectedExIds.length > 0 ? state.selectedExIds : [];
  if (targets.length === 0) {
    showToast('请先选择动作再应用模板');
    return;
  }
  targets.forEach(exId => {
    let entry = state.workoutPlan.find(w => w.id === exId);
    const exDef = Object.values(exerciseDB).flat().find(e => e.id === exId);
    if (!entry) {
      entry = { ...exDef, sets: tpl.sets, rest: tpl.rest, completedSets: 0 };
      state.workoutPlan.push(entry);
    } else {
      entry.sets = tpl.sets;
      entry.rest = tpl.rest;
    }
  });
  renderSetup();
}

function updateStartBtn() {
  document.getElementById('btn-begin-workout').disabled = state.selectedExIds.length === 0;
}

// ──────────────────────────────────────────────
//  Build ordered workout plan
// ──────────────────────────────────────────────
function buildOrderedPlan() {
  // Keep order as selected
  return state.selectedExIds.map(id => {
    const entry = state.workoutPlan.find(w => w.id === id);
    const def = Object.values(exerciseDB).flat().find(e => e.id === id);
    return {
      ...(entry || def),
      id,
      name: def.name,
      completedSets: 0,
    };
  });
}

// ──────────────────────────────────────────────
//  ACTIVE VIEW
// ──────────────────────────────────────────────
function renderActive() {
  const plan = state.orderedPlan;
  const exIdx = state.currentExIdx;
  const ex = plan[exIdx];
  const bp = BODY_PARTS.find(b => b.id === state.bodyPart);

  document.getElementById('active-part-badge').textContent = bp.label;
  document.getElementById('active-timer-elapsed').textContent = getElapsedStr();

  // Progress dots (per exercise)
  const dots = document.getElementById('active-progress-dots');
  dots.innerHTML = plan.map((p, i) => {
    let cls = 'progress-dot';
    if (i < exIdx) cls += ' done';
    else if (i === exIdx) cls += ' current';
    return `<div class="${cls}"></div>`;
  }).join('');

  // Current exercise card
  document.getElementById('active-ex-label').textContent = `第 ${exIdx + 1} 个动作 / 共 ${plan.length} 个`;
  document.getElementById('active-ex-title').textContent = ex.name;
  document.getElementById('active-set-info').innerHTML =
    `第 <span>${ex.completedSets + 1}</span> 组 / 共 ${ex.sets} 组`;

  // Set timer indicator
  const hasDuration = (ex.duration ?? ex.defaultDuration ?? 0) > 0;
  document.getElementById('set-timer-display').style.display = hasDuration ? 'block' : 'none';
  document.getElementById('btn-complete-set').textContent = hasDuration ? '⏭ 提前完成' : '✓ 完成这组';

  // Upcoming
  const upcoming = plan.slice(exIdx + 1, exIdx + 4);
  const upList = document.getElementById('active-upcoming-list');
  if (upcoming.length === 0) {
    upList.innerHTML = '<div style="font-size:13px;color:var(--text-dim);text-align:center;padding:8px">这是最后一个动作了！</div>';
  } else {
    upList.innerHTML = upcoming.map(p =>
      `<div class="upcoming-item">
        <span class="up-name">${p.name}</span>
        <span class="up-sets">${p.sets} 组 · ${p.rest}s休息</span>
      </div>`
    ).join('');
  }
}

function getElapsedStr() {
  if (!state.startTime) return '00:00';
  const sec = Math.floor((Date.now() - state.startTime) / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

// Tick elapsed display
let elapsedTick;
function startElapsedTick() {
  clearInterval(elapsedTick);
  elapsedTick = setInterval(() => {
    const el = document.getElementById('active-timer-elapsed');
    if (el) el.textContent = getElapsedStr();
  }, 1000);
}

// ──────────────────────────────────────────────
//  SET TIMER (auto-advance after set duration)
// ──────────────────────────────────────────────
function startSetTimer(ex) {
  clearInterval(state.setTimer);
  const dur = ex.duration ?? ex.defaultDuration ?? 0;
  if (dur <= 0) return; // manual mode

  state.setSeconds = dur;
  state.setTotal = dur;
  updateSetTimerDisplay();

  speak(`${ex.name}，${dur}秒，开始！`);

  state.setTimer = setInterval(() => {
    state.setSeconds--;
    updateSetTimerDisplay();

    if (state.setSeconds === 10) speak('还有十秒', false);
    else if (state.setSeconds === 3) {
      beep(660, 0.08, 0.4);
      speak('三，二，一', false);
    }

    if (state.setSeconds <= 0) {
      clearInterval(state.setTimer);
      state.setTimer = null;
      beep(880, 0.15, 0.5);
      completeSet();
    }
  }, 1000);
}

function updateSetTimerDisplay() {
  const el = document.getElementById('set-timer-seconds');
  if (el) el.textContent = state.setSeconds;
  // Progress ring for set timer
  const ring = document.getElementById('set-ring-progress');
  if (ring && state.setTotal > 0) {
    const r = 36;
    const circ = 2 * Math.PI * r;
    const pct = state.setSeconds / state.setTotal;
    ring.style.strokeDasharray = circ;
    ring.style.strokeDashoffset = circ * (1 - pct);
  }
}

function stopSetTimer() {
  clearInterval(state.setTimer);
  state.setTimer = null;
}

// ──────────────────────────────────────────────
//  REST VIEW
// ──────────────────────────────────────────────
function startRest(seconds) {
  state.restSeconds = seconds;
  state.restTotal = seconds;
  renderRest();
  showView('view-rest');

  // Voice: announce rest start
  const plan = state.orderedPlan;
  const nextEx = plan[state.currentExIdx];
  if (nextEx) {
    const isNewExercise = nextEx.completedSets === 0;
    if (isNewExercise) {
      speak(`下一个动作：${nextEx.name}，共${nextEx.sets}组。休息${seconds}秒。`);
    } else {
      speak(`休息${seconds}秒，准备第${nextEx.completedSets + 1}组。`);
    }
  }

  clearInterval(state.restTimer);
  state.restTimer = setInterval(() => {
    state.restSeconds--;
    renderRest();

    // Voice countdown cues
    if (state.restSeconds === 30) speak('还有三十秒', false);
    else if (state.restSeconds === 10) speak('还有十秒，准备！', false);
    else if (state.restSeconds === 5) {
      beepWarning();
      speak('五，四，三，二，一', false);
    }

    if (state.restSeconds <= 0) {
      clearInterval(state.restTimer);
      state.restTimer = null;
      beepDone();
      advanceAfterRest();
    }
  }, 1000);
}

function renderRest() {
  const s = state.restSeconds;
  const total = state.restTotal;
  const pct = total > 0 ? (s / total) : 0;

  document.getElementById('rest-seconds').textContent = s;

  // Ring
  const r = 96;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);
  document.getElementById('ring-progress').style.strokeDashoffset = offset;
  document.getElementById('ring-progress').style.strokeDasharray = circ;
  document.getElementById('ring-bg').style.strokeDasharray = circ;

  // Next exercise label
  const plan = state.orderedPlan;
  const nextEx = plan[state.currentExIdx];
  if (nextEx) {
    document.getElementById('rest-next-label').innerHTML =
      `下一组：<strong>${nextEx.name}</strong> 第 ${nextEx.completedSets + 1} 组 / ${nextEx.sets} 组`;
  }

  // Color states
  const view = document.getElementById('view-rest');
  view.classList.remove('warning', 'danger');
  if (s <= 3) view.classList.add('danger');
  else if (s <= 8) view.classList.add('warning');
}

function advanceAfterRest() {
  const plan = state.orderedPlan;
  const ex = plan[state.currentExIdx];
  showView('view-active');
  renderActive();
  beep(440, 0.1, 0.3);
  if (ex) {
    const hasDuration = (ex.duration ?? ex.defaultDuration ?? 0) > 0;
    if (!hasDuration) {
      speak(`休息结束！${ex.name}，第${ex.completedSets + 1}组，开始！`);
    }
    startSetTimer(ex); // starts timer (and announces if timed); no-op if manual
  }
}

// ──────────────────────────────────────────────
//  Set completion logic
// ──────────────────────────────────────────────
function completeSet() {
  stopSetTimer();
  beep(660, 0.1, 0.5);
  const plan = state.orderedPlan;
  const ex = plan[state.currentExIdx];

  ex.completedSets++;

  // Last set of this exercise?
  if (ex.completedSets >= ex.sets) {
    // Move to next exercise
    state.currentExIdx++;
    if (state.currentExIdx >= plan.length) {
      finishWorkout();
      return;
    }
    speak(`${ex.name}完成！`);
    startRest(ex.rest);
  } else {
    speak(`第${ex.completedSets}组完成，加油！`);
    startRest(ex.rest);
  }
}

// ──────────────────────────────────────────────
//  DONE VIEW
// ──────────────────────────────────────────────
function finishWorkout() {
  clearInterval(state.restTimer);
  clearInterval(elapsedTick);
  releaseWakeLock();
  beepComplete();

  const duration = state.startTime ? Math.floor((Date.now() - state.startTime) / 1000) : 0;
  const totalSets = state.orderedPlan.reduce((acc, ex) => acc + ex.completedSets, 0);
  const mins = Math.floor(duration / 60);

  document.getElementById('done-sets').textContent = totalSets;
  document.getElementById('done-mins').textContent = mins;
  document.getElementById('done-exercises').textContent = state.orderedPlan.length;

  saveSession({
    date: Date.now(),
    bodyPart: state.bodyPart,
    duration,
    totalSets,
    exercises: state.orderedPlan.map(e => e.name),
  });

  speak(`训练完成！共完成${totalSets}组，用时${mins}分钟。你太棒了，好好休息！`);
  showView('view-done');
}

// ──────────────────────────────────────────────
//  Navigation / Button Handlers
// ──────────────────────────────────────────────
document.getElementById('btn-edit-exercises').addEventListener('click', () => {
  exerciseEditMode = !exerciseEditMode;
  renderSetup();
});

document.getElementById('btn-confirm-add-ex').addEventListener('click', () => {
  const input = document.getElementById('add-ex-input');
  const name = input.value.trim();
  if (!name) { showToast('请输入动作名称'); return; }
  const id = 'custom_' + Date.now();
  exerciseDB[state.bodyPart].push({ id, name, defaultSets: 3, defaultRest: 60, defaultDuration: 0 });
  saveExerciseDB();
  input.value = '';
  renderSetup();
  showToast(`已添加「${name}」`);
});

document.getElementById('add-ex-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('btn-confirm-add-ex').click();
});

document.getElementById('btn-start-setup').addEventListener('click', () => {
  state.workoutPlan = [];
  state.selectedExIds = [];
  renderSetup();
  showView('view-setup');
});

document.getElementById('btn-setup-back').addEventListener('click', () => {
  exerciseEditMode = false;
  showView('view-home');
  renderHome();
});

document.getElementById('btn-begin-workout').addEventListener('click', () => {
  // Unlock audio on iOS (must happen in user gesture)
  getAudioCtx();

  state.orderedPlan = buildOrderedPlan();
  state.currentExIdx = 0;
  state.startTime = Date.now();

  requestWakeLock();
  startElapsedTick();

  renderActive();
  showView('view-active');
  beep(440, 0.15, 0.4);

  const firstEx = state.orderedPlan[0];
  if (firstEx) {
    const hasDuration = (firstEx.duration ?? firstEx.defaultDuration ?? 0) > 0;
    if (hasDuration) {
      setTimeout(() => startSetTimer(firstEx), 1500);
    } else {
      speak(`训练开始！第一个动作：${firstEx.name}，共${firstEx.sets}组。准备好后点完成这组。`);
    }
  }
});

document.getElementById('btn-voice-toggle').addEventListener('click', toggleVoice);

document.getElementById('btn-active-back').addEventListener('click', () => {
  if (!confirm('放弃当前训练？')) return;
  clearInterval(state.restTimer);
  clearInterval(elapsedTick);
  releaseWakeLock();
  showView('view-home');
  renderHome();
});

document.getElementById('btn-complete-set').addEventListener('click', () => {
  completeSet();
});

document.getElementById('btn-skip-rest').addEventListener('click', () => {
  clearInterval(state.restTimer);
  state.restTimer = null;
  const view = document.getElementById('view-rest');
  view.classList.remove('warning', 'danger');
  advanceAfterRest();
});

document.getElementById('btn-add-30').addEventListener('click', () => {
  state.restSeconds += 30;
  state.restTotal += 30;
  showToast('多休息 30 秒');
});

document.getElementById('btn-done-home').addEventListener('click', () => {
  showView('view-home');
  renderHome();
});

document.getElementById('btn-done-again').addEventListener('click', () => {
  state.workoutPlan = [];
  state.selectedExIds = [];
  renderSetup();
  showView('view-setup');
});

// ──────────────────────────────────────────────
//  Swipe-back gesture (iOS edge swipe)
// ──────────────────────────────────────────────
(function () {
  let startX = 0, startY = 0;

  document.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    // Must start within 40px of left edge, swipe right ≥ 60px, mostly horizontal
    if (startX > 40 || dx < 60 || Math.abs(dy) > Math.abs(dx)) return;

    const activeView = document.querySelector('.view.active')?.id;
    if (activeView === 'view-setup') {
      showView('view-home');
      renderHome();
    } else if (activeView === 'view-active') {
      if (confirm('放弃当前训练？')) {
        clearInterval(state.restTimer);
        clearInterval(elapsedTick);
        releaseWakeLock();
        showView('view-home');
        renderHome();
      }
    }
  }, { passive: true });
})();

// ──────────────────────────────────────────────
//  Init
// ──────────────────────────────────────────────
renderHome();
showView('view-home');
