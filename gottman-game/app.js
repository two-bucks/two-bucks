// ============================================================
// THE RELATIONSHIP LAB — Core Application
// ============================================================

// ── STATE ────────────────────────────────────────────────────
const STATE_KEY = 'rl_v1';

let state = {
  personA: null,
  personB: null,
  currentScreen: 'welcome',
  currentView: 'couple', // 'a' | 'b' | 'couple'
  progress: {
    bidsScore: 0,
    horsemenScore: 0,
    lovemapScore: 0,
    orbitRatio: 5,
  },
  insightsUnlocked: [],
  weatherLog: [],
};

function loadState() {
  try {
    const saved = localStorage.getItem(STATE_KEY);
    if (saved) { Object.assign(state, JSON.parse(saved)); }
  } catch (e) {}
}
function saveState() {
  try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch (e) {}
}
function resetState() {
  localStorage.removeItem(STATE_KEY);
  location.reload();
}

// ── SCREEN NAVIGATION ────────────────────────────────────────
const screens = {};
function initScreens() {
  document.querySelectorAll('.screen').forEach(s => { screens[s.id] = s; });
}

function goTo(id, options = {}) {
  const prev = document.querySelector('.screen.active');
  const next = document.getElementById(id);
  if (!next || prev === next) return;

  if (prev) {
    prev.classList.remove('active');
    if (options.dir === 'back') prev.classList.add('slide-in-right');
    setTimeout(() => prev.classList.remove('slide-in-right', 'slide-out-left'), 400);
  }
  if (options.dir === 'forward') next.classList.add('slide-out-left');

  requestAnimationFrame(() => {
    next.classList.add('active');
    next.classList.remove('slide-out-left');
    next.scrollTop = 0;
  });

  state.currentScreen = id;
  updateNav(id);

  if (options.onEnter) setTimeout(options.onEnter, 50);
}

function updateNav(screenId) {
  const nav = document.getElementById('bottom-nav');
  const gameScreens = ['screen-hub', 'screen-bids', 'screen-horsemen', 'screen-lovemap', 'screen-orbit', 'screen-reference', 'screen-insights'];
  if (gameScreens.includes(screenId)) {
    nav.style.display = 'flex';
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.target === screenId);
    });
  } else {
    nav.style.display = 'none';
  }
}

// ── INSIGHT TOAST ─────────────────────────────────────────────
const insightGems = GOTTMAN_DATA.insightGems;
let insightTimeout;
function showInsight(text, source) {
  const toast = document.getElementById('insight-toast');
  const textEl = document.getElementById('insight-text');
  const srcEl  = document.getElementById('insight-source');
  textEl.textContent = text || insightGems[Math.floor(Math.random() * insightGems.length)];
  srcEl.textContent  = source || 'Gottman Research';
  toast.classList.add('show');
  clearTimeout(insightTimeout);
  insightTimeout = setTimeout(() => toast.classList.remove('show'), 4500);
}

// ── PROFILE SYSTEM ────────────────────────────────────────────
const AVATARS = ['🦁','🐯','🦊','🐺','🐻','🐼','🦋','🦅','🌙','⭐','🌸','🌿','🔥','🌊','✨','⚡','🎸','🎨','🏔️','🌈'];

let setupTarget = 'A'; // which partner we're setting up
let selectedAvatar = null;
let quizAnswers = {};

function startSetup(partner) {
  setupTarget = partner;
  selectedAvatar = null;
  quizAnswers = {};
  document.getElementById('setup-partner-label').textContent = `Partner ${partner}`;
  document.getElementById('setup-partner-desc').textContent =
    partner === 'A' ? 'Let\'s start with the first partner.' : 'Now for the second partner.';

  const cls = partner === 'A' ? 'selected-a' : 'selected-b';
  document.querySelectorAll('.avatar-opt').forEach(el => el.classList.remove('selected-a','selected-b'));

  renderSetupQuiz();
  goTo('screen-setup', { dir: 'forward' });
}

function renderSetupQuiz() {
  const container = document.getElementById('setup-quiz-container');
  container.innerHTML = '';
  const q = GOTTMAN_DATA.profileQuiz[0];
  container.innerHTML = `
    <p class="subtitle" style="text-align:left; font-size:0.95rem; margin-bottom:4px;">${q.question}</p>
    <div class="choices" id="quiz-choices"></div>
  `;
  const choicesEl = document.getElementById('quiz-choices');
  q.options.forEach((opt, i) => {
    const div = document.createElement('div');
    div.className = 'choice';
    div.textContent = opt.text;
    div.dataset.idx = i;
    div.addEventListener('click', () => {
      document.querySelectorAll('#quiz-choices .choice').forEach(c => c.classList.remove('selected'));
      div.classList.add('selected');
      quizAnswers[q.id] = { idx: i, style: opt.style, horseman: opt.horseman };
      document.getElementById('setup-next-btn').disabled = !selectedAvatar;
    });
    choicesEl.appendChild(div);
  });
  document.getElementById('setup-next-btn').disabled = true;
}

function selectAvatar(emoji) {
  selectedAvatar = emoji;
  const cls = setupTarget === 'A' ? 'selected-a' : 'selected-b';
  document.querySelectorAll('.avatar-opt').forEach(el => {
    el.classList.remove('selected-a','selected-b');
    if (el.dataset.emoji === emoji) el.classList.add(cls);
  });
  document.getElementById('setup-next-btn').disabled = !quizAnswers['q1'];
}

function submitSetup() {
  const nameInput = document.getElementById('setup-name-input').value.trim();
  const name = nameInput || `Partner ${setupTarget}`;
  const answer = quizAnswers['q1'] || {};
  const style = answer.style || 'validator';
  const horseman = answer.horseman || null;

  const profile = {
    name,
    avatar: selectedAvatar || AVATARS[Math.floor(Math.random() * AVATARS.length)],
    conflictStyle: style,
    primaryHorseman: horseman,
    admirationLevel: 2,
  };

  if (setupTarget === 'A') {
    state.personA = profile;
    saveState();
    startSetup('B');
  } else {
    state.personB = profile;
    saveState();
    showCoupleReveal();
  }
}

function deriveCouple() {
  const a = state.personA;
  const b = state.personB;
  if (!a || !b) return null;

  const dynamics = GOTTMAN_DATA.couplingDynamics;
  let pattern = null;
  if (a.primaryHorseman && b.primaryHorseman) {
    pattern = dynamics.find(d => d.patternA === a.primaryHorseman && d.patternB === b.primaryHorseman)
           || dynamics.find(d => d.patternA === b.primaryHorseman && d.patternB === a.primaryHorseman);
  }
  if (!pattern) {
    const styleMap = { volatile: 0, validator: 1, avoider: 2 };
    const combo = [a.conflictStyle, b.conflictStyle].sort().join('-');
    if (combo === 'avoider-volatile') pattern = dynamics[2];
    else if (combo === 'validator-volatile') pattern = dynamics[3];
  }

  const strengths = [];
  if (a.conflictStyle === b.conflictStyle) strengths.push('Compatible conflict styles');
  if (a.admirationLevel + b.admirationLevel > 3) strengths.push('High admiration culture');
  strengths.push('Awareness is the first step');

  return { personA: a, personB: b, pattern, strengths };
}

function showCoupleReveal() {
  const couple = deriveCouple();
  const a = state.personA;
  const b = state.personB;

  document.getElementById('reveal-a-avatar').textContent = a.avatar;
  document.getElementById('reveal-a-name').textContent = a.name;
  document.getElementById('reveal-a-style').textContent = capitalize(a.conflictStyle) + ' style';

  document.getElementById('reveal-b-avatar').textContent = b.avatar;
  document.getElementById('reveal-b-name').textContent = b.name;
  document.getElementById('reveal-b-style').textContent = capitalize(b.conflictStyle) + ' style';

  const patternEl = document.getElementById('reveal-pattern');
  if (couple?.pattern) {
    patternEl.innerHTML = `
      <div style="font-size:2rem">${couple.pattern.emoji}</div>
      <div class="title-md" style="margin:4px 0">${couple.pattern.name}</div>
      <p class="subtitle" style="font-size:0.85rem">${couple.pattern.description}</p>
    `;
  } else {
    patternEl.innerHTML = `
      <div style="font-size:2rem">🌟</div>
      <div class="title-md" style="margin:4px 0">Unique System</div>
      <p class="subtitle" style="font-size:0.85rem">Your combination creates a one-of-a-kind dynamic. The Lab will help you discover it.</p>
    `;
  }

  goTo('screen-reveal', { dir: 'forward' });
}

// ── HUB SCREEN ────────────────────────────────────────────────
function initHub() {
  const a = state.personA;
  const b = state.personB;
  if (!a || !b) return;

  document.getElementById('hub-a-name').textContent = a.name;
  document.getElementById('hub-b-name').textContent = b.name;
  document.getElementById('hub-a-avatar').textContent = a.avatar;
  document.getElementById('hub-b-avatar').textContent = b.avatar;

  startOrbitalAnimation();
  updateProgressDisplay();
}

// ── ORBITAL CANVAS ────────────────────────────────────────────
let orbitAnimFrame;
function startOrbitalAnimation() {
  const canvas = document.getElementById('orbitCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const size = Math.min(260, window.innerWidth - 80);
  canvas.width = size; canvas.height = size;
  const cx = size / 2, cy = size / 2;
  const r = size * 0.28;

  let t = 0;
  const a = state.personA;
  const b = state.personB;

  const ratio = state.progress.orbitRatio || 5;
  const closeness = Math.min(ratio / 10, 1);

  function draw() {
    ctx.clearRect(0, 0, size, size);

    // Central glow (shared meaning)
    const cGrad = ctx.createRadialGradient(cx,cy, 0, cx,cy, size*0.18);
    cGrad.addColorStop(0, 'rgba(139,92,246,0.5)');
    cGrad.addColorStop(0.5, 'rgba(8,145,178,0.2)');
    cGrad.addColorStop(1, 'transparent');
    ctx.beginPath(); ctx.arc(cx,cy, size*0.18, 0, Math.PI*2);
    ctx.fillStyle = cGrad; ctx.fill();

    // Orbit ring
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2);
    ctx.strokeStyle = `rgba(255,255,255,0.08)`; ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]); ctx.stroke(); ctx.setLineDash([]);

    // Star A position
    const ax = cx + r * Math.cos(t);
    const ay = cy + r * Math.sin(t);
    // Star B position (opposite orbit)
    const bx = cx + r * Math.cos(t + Math.PI);
    const by = cy + r * Math.sin(t + Math.PI);

    // Connection line
    const connOpacity = 0.1 + closeness * 0.35;
    ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(bx,by);
    ctx.strokeStyle = `rgba(139,92,246,${connOpacity})`; ctx.lineWidth = 1.5;
    ctx.stroke();

    // Draw stars
    drawStar(ctx, ax, ay, size*0.065, '#f97316', '#fbbf24', a.avatar);
    drawStar(ctx, bx, by, size*0.065, '#8b5cf6', '#06b6d4', b.avatar);

    t += 0.006;
    orbitAnimFrame = requestAnimationFrame(draw);
  }
  cancelAnimationFrame(orbitAnimFrame);
  draw();
}

function drawStar(ctx, x, y, radius, c1, c2, emoji) {
  const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
  grad.addColorStop(0, 'white');
  grad.addColorStop(0.3, c1);
  grad.addColorStop(1, c2);
  ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI*2);
  ctx.fillStyle = grad; ctx.fill();
  // Glow
  const glow = ctx.createRadialGradient(x, y, 0, x, y, radius * 2.5);
  glow.addColorStop(0, c1.replace(')', ',0.35)').replace('rgb', 'rgba'));
  glow.addColorStop(1, 'transparent');
  ctx.beginPath(); ctx.arc(x, y, radius * 2.5, 0, Math.PI*2);
  ctx.fillStyle = glow; ctx.fill();
  // Emoji
  ctx.font = `${radius * 1.1}px serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = 'white';
  ctx.fillText(emoji, x, y);
}

function updateProgressDisplay() {
  const p = state.progress;
  document.getElementById('stat-bids').textContent    = p.bidsScore || '—';
  document.getElementById('stat-horsemen').textContent= p.horsemenScore || '—';
  document.getElementById('stat-lovemap').textContent = p.lovemapScore || '—';
}

// ── GAME 1: BID MARKET ────────────────────────────────────────
let bidGameState = {
  active: false, trustAccount: 50, score: 0,
  bubbles: [], interval: null, gameTimer: null,
  timeLeft: 45, caught: 0, missed: 0, deflected: 0,
};

function initBidsGame() {
  bidGameState = { active: false, trustAccount: 50, score: 0, bubbles: [], interval: null, gameTimer: null, timeLeft: 45, caught: 0, missed: 0, deflected: 0 };
  document.getElementById('bid-trust').style.width = '50%';
  document.getElementById('bid-trust-val').textContent = '50';
  document.getElementById('bid-score-val').textContent = '0';
  document.getElementById('bid-timer').textContent = '45';
  document.getElementById('bid-arena').innerHTML = '';
  document.getElementById('bid-result').classList.add('hidden');
  document.getElementById('bid-start-btn').classList.remove('hidden');
  document.getElementById('bid-instructions').classList.remove('hidden');
}

function startBidsGame() {
  bidGameState.active = true;
  document.getElementById('bid-start-btn').classList.add('hidden');
  document.getElementById('bid-instructions').classList.add('hidden');

  // Spawn bubbles
  bidGameState.interval = setInterval(spawnBidBubble, 1400);

  // Countdown
  bidGameState.gameTimer = setInterval(() => {
    bidGameState.timeLeft--;
    document.getElementById('bid-timer').textContent = bidGameState.timeLeft;
    if (bidGameState.timeLeft <= 0) endBidsGame();
  }, 1000);
}

const BID_CONFIGS = [
  { type: 'humor',       emoji: '😄', color: '#fbbf24', label: 'Play',   bg: 'rgba(251,191,36,0.2)' },
  { type: 'affection',   emoji: '🫶', color: '#f43f5e', label: 'Touch',  bg: 'rgba(244,63,94,0.2)' },
  { type: 'interest',    emoji: '🧐', color: '#06b6d4', label: 'Share',  bg: 'rgba(6,182,212,0.2)' },
  { type: 'support',     emoji: '💙', color: '#3b82f6', label: 'Support',bg: 'rgba(59,130,246,0.2)' },
  { type: 'shared',      emoji: '🎯', color: '#8b5cf6', label: 'Join',   bg: 'rgba(139,92,246,0.2)' },
  { type: 'intellectual',emoji: '💡', color: '#f97316', label: 'Think',  bg: 'rgba(249,115,22,0.2)' },
];

function spawnBidBubble() {
  if (!bidGameState.active) return;
  const arena = document.getElementById('bid-arena');
  const arenaRect = arena.getBoundingClientRect();
  const config = BID_CONFIGS[Math.floor(Math.random() * BID_CONFIGS.length)];

  const size = 72 + Math.random() * 24;
  const x = Math.random() * (arenaRect.width - size - 20) + 10;
  const y = Math.random() * (arenaRect.height - size - 20) + 10;

  const bubble = document.createElement('div');
  bubble.className = 'bid-bubble';
  bubble.style.cssText = `
    width:${size}px; height:${size}px;
    left:${x}px; top:${y}px;
    background:${config.bg};
    border:2px solid ${config.color};
    color:${config.color};
  `;
  bubble.innerHTML = `<span>${config.emoji}</span><span class="bid-label">${config.label}</span>`;

  // Tap → turn towards
  bubble.addEventListener('click', () => {
    if (!bidGameState.active || bubble.dataset.hit) return;
    bubble.dataset.hit = '1';
    bubble.classList.add('popped');
    bidGameState.caught++;
    changeTrust(+6);
    changeScore(+10);
    showFloatingPoint(bubble, '+10 💚', config.color);
    setTimeout(() => bubble.remove(), 400);
  });

  arena.appendChild(bubble);
  bidGameState.bubbles.push(bubble);

  // Auto-miss after 3.5s
  setTimeout(() => {
    if (!bubble.dataset.hit && bubble.parentNode) {
      bubble.dataset.hit = 'miss';
      bidGameState.missed++;
      changeTrust(-3);
      bubble.style.opacity = '0.2';
      setTimeout(() => bubble.remove(), 600);
    }
  }, 3500);
}

function changeTrust(delta) {
  bidGameState.trustAccount = Math.max(0, Math.min(100, bidGameState.trustAccount + delta));
  const fill = document.getElementById('bid-trust');
  const val = document.getElementById('bid-trust-val');
  fill.style.width = bidGameState.trustAccount + '%';
  fill.style.background = bidGameState.trustAccount > 60 ? 'linear-gradient(90deg,#22c55e,#86efac)'
                         : bidGameState.trustAccount > 30 ? 'linear-gradient(90deg,#f59e0b,#fbbf24)'
                         : 'linear-gradient(90deg,#ef4444,#f87171)';
  val.textContent = Math.round(bidGameState.trustAccount);
}
function changeScore(delta) {
  bidGameState.score += delta;
  document.getElementById('bid-score-val').textContent = bidGameState.score;
}

function showFloatingPoint(el, text, color) {
  const fp = document.createElement('div');
  fp.textContent = text;
  fp.style.cssText = `position:absolute;left:${el.style.left};top:${el.style.top};color:${color};font-weight:800;font-size:1rem;pointer-events:none;animation:fadeIn 0.4s ease forwards;z-index:50;`;
  el.parentNode?.appendChild(fp);
  setTimeout(() => fp.remove(), 800);
}

function endBidsGame() {
  clearInterval(bidGameState.interval);
  clearInterval(bidGameState.gameTimer);
  bidGameState.active = false;
  document.getElementById('bid-arena').innerHTML = '';

  state.progress.bidsScore = Math.max(state.progress.bidsScore || 0, bidGameState.score);
  saveState();

  const totalBids = bidGameState.caught + bidGameState.missed;
  const rate = totalBids > 0 ? Math.round((bidGameState.caught / totalBids) * 100) : 0;
  const masterRate = 86; // Gottman research: masters turn toward 86% of bids
  const diff = masterRate - rate;

  document.getElementById('bid-result-score').textContent = bidGameState.score;
  document.getElementById('bid-result-rate').textContent = rate + '%';
  document.getElementById('bid-result-insight').innerHTML = diff <= 0
    ? `<strong>Gottman Master-level!</strong> The research shows Masters turn towards each other's bids 86% of the time. Your ${rate}% rate matches that. Keep this up — it's the daily fabric of trust.`
    : `<strong>The research benchmark is 86%.</strong> You're at ${rate}%. The gap (${diff}%) is your opportunity. <em>Small improvements in bid-catching create large changes in trust over time.</em>`;

  document.getElementById('bid-result').classList.remove('hidden');
  showInsight(GOTTMAN_DATA.insightGems[Math.floor(Math.random() * 10)]);
  updateProgressDisplay();
}

// ── GAME 2: FOUR HORSEMEN FIELD GUIDE ─────────────────────────
let horsemenState = { currentIdx: 0, score: 0, correct: 0 };

function initHorsemenGame() {
  horsemenState = { currentIdx: 0, score: 0, correct: 0 };
  loadHorsemenScenario(0);
  document.getElementById('horsemen-result').classList.add('hidden');
  document.getElementById('horsemen-game-area').classList.remove('hidden');
}

function loadHorsemenScenario(idx) {
  const scenarios = GOTTMAN_DATA.horsemenScenarios;
  if (idx >= scenarios.length) { endHorsemenGame(); return; }

  const s = scenarios[idx];
  document.getElementById('horsemen-progress').textContent = `${idx + 1} / ${scenarios.length}`;
  document.getElementById('horsemen-scene').textContent = s.scene;
  document.getElementById('horsemen-feedback').innerHTML = '';
  document.getElementById('horsemen-next').classList.add('hidden');

  const choicesEl = document.getElementById('horsemen-choices');
  choicesEl.innerHTML = '';
  const horsemenOptions = [...GOTTMAN_DATA.horsemen].sort(() => Math.random() - 0.5);
  horsemenOptions.forEach(h => {
    const btn = document.createElement('div');
    btn.className = 'choice';
    btn.innerHTML = `<span style="font-size:1.4rem">${h.emoji}</span> ${h.name}`;
    btn.addEventListener('click', () => {
      if (btn.dataset.answered) return;
      document.querySelectorAll('#horsemen-choices .choice').forEach(c => c.dataset.answered = '1');
      if (h.id === s.horseman) {
        btn.classList.add('correct');
        horsemenState.correct++;
        horsemenState.score += 15;
        document.getElementById('horsemen-feedback').innerHTML = `
          <div style="color:#22c55e; font-weight:700; margin-bottom:8px">✓ Correct! ${h.emoji} ${h.name}</div>
          <div style="font-size:0.85rem; color:var(--text-secondary)">${s.why}</div>
          <div style="margin-top:10px; font-size:0.85rem; padding:12px; background:rgba(34,197,94,0.1); border-radius:12px; border:1px solid rgba(34,197,94,0.3)">
            <strong style="color:#86efac">Better approach:</strong> "${s.betterApproach}"
          </div>
        `;
        showInsight();
      } else {
        btn.classList.add('wrong');
        const correctBtn = [...document.querySelectorAll('#horsemen-choices .choice')].find(c => c.textContent.includes(GOTTMAN_DATA.horsemen.find(h2 => h2.id === s.horseman)?.name || ''));
        if (correctBtn) correctBtn.classList.add('correct');
        document.getElementById('horsemen-feedback').innerHTML = `
          <div style="color:#ef4444; font-weight:700; margin-bottom:8px">✗ It's ${GOTTMAN_DATA.horsemen.find(h2=>h2.id===s.horseman)?.emoji} ${GOTTMAN_DATA.horsemen.find(h2=>h2.id===s.horseman)?.name}</div>
          <div style="font-size:0.85rem; color:var(--text-secondary)">${s.why}</div>
        `;
      }
      document.getElementById('horsemen-next').classList.remove('hidden');
    });
    choicesEl.appendChild(btn);
  });
}

function horsemenNext() {
  horsemenState.currentIdx++;
  loadHorsemenScenario(horsemenState.currentIdx);
}

function endHorsemenGame() {
  document.getElementById('horsemen-game-area').classList.add('hidden');
  state.progress.horsemenScore = Math.max(state.progress.horsemenScore || 0, horsemenState.score);
  saveState();

  const pct = Math.round((horsemenState.correct / GOTTMAN_DATA.horsemenScenarios.length) * 100);
  document.getElementById('horsemen-final-score').textContent = pct + '%';
  document.getElementById('horsemen-final-label').textContent = pct >= 80 ? 'Horsemen Expert' : pct >= 60 ? 'Getting Sharp' : 'Keep Practicing';
  document.getElementById('horsemen-final-insight').innerHTML = `
    <strong>Your identification accuracy: ${pct}%</strong><br><br>
    The Four Horsemen matter because they predict relationship outcomes with remarkable accuracy.
    Contempt alone is so powerful it predicts <em>illness rates</em> in couples.
    Recognizing them in real-time — in yourself, not just in scenarios — is the real skill.
    ${pct >= 80 ? '<br><br>🌟 You\'re already well above average in Horsemen awareness.' : ''}
  `;
  document.getElementById('horsemen-result').classList.remove('hidden');
  updateProgressDisplay();
}

// ── GAME 3: LOVE MAP QUIZ ─────────────────────────────────────
let lovemapState = { currentIdx: 0, score: 0, answers: [], viewingPartner: 'B' };

function initLovemapGame() {
  lovemapState = { currentIdx: 0, score: 0, answers: [], viewingPartner: 'B' };
  const a = state.personA;
  const b = state.personB;
  document.getElementById('lovemap-about-name').textContent = b.name;
  document.getElementById('lovemap-about-avatar').textContent = b.avatar;
  loadLovemapQuestion(0);
  document.getElementById('lovemap-result').classList.add('hidden');
  document.getElementById('lovemap-game-area').classList.remove('hidden');
}

function loadLovemapQuestion(idx) {
  const questions = GOTTMAN_DATA.lovemapQuestions;
  if (idx >= Math.min(questions.length, 8)) { endLovemapGame(); return; }

  const q = questions[idx];
  document.getElementById('lovemap-progress-fill').style.width = `${(idx / 8) * 100}%`;
  document.getElementById('lovemap-q-icon').textContent = q.icon;
  document.getElementById('lovemap-q-text').textContent = q.q;
  document.getElementById('lovemap-input-field').value = '';
  document.getElementById('lovemap-feedback').innerHTML = '';
  document.getElementById('lovemap-skip').classList.remove('hidden');
  document.getElementById('lovemap-next').classList.add('hidden');
  document.getElementById('lovemap-submit').classList.remove('hidden');
}

function submitLovemapAnswer() {
  const val = document.getElementById('lovemap-input-field').value.trim();
  if (!val) return;

  const questions = GOTTMAN_DATA.lovemapQuestions;
  const q = questions[lovemapState.currentIdx];

  // All answers get points for engagement — the insight is the self-reflection
  lovemapState.score += 10;
  lovemapState.answers.push({ q: q.q, a: val });

  document.getElementById('lovemap-feedback').innerHTML = `
    <div style="font-size:0.85rem; color:var(--text-secondary); padding:12px; background:rgba(255,255,255,0.04); border-radius:12px; border:1px solid rgba(255,255,255,0.1)">
      <strong style="color:var(--text-primary)">Your answer noted.</strong>
      Have you asked them this question directly? Their answer might surprise you — or confirm your closeness.
      ${lovemapState.currentIdx % 3 === 0 ? `<br><br><em>💡 ${GOTTMAN_DATA.insightGems[lovemapState.currentIdx % GOTTMAN_DATA.insightGems.length]}</em>` : ''}
    </div>
  `;
  document.getElementById('lovemap-submit').classList.add('hidden');
  document.getElementById('lovemap-skip').classList.add('hidden');
  document.getElementById('lovemap-next').classList.remove('hidden');
}

function lovemapNext() {
  lovemapState.currentIdx++;
  loadLovemapQuestion(lovemapState.currentIdx);
}

function lovemapSkip() {
  lovemapState.currentIdx++;
  loadLovemapQuestion(lovemapState.currentIdx);
}

function endLovemapGame() {
  document.getElementById('lovemap-game-area').classList.add('hidden');
  state.progress.lovemapScore = Math.max(state.progress.lovemapScore || 0, lovemapState.score);
  saveState();

  const a = state.personA, b = state.personB;
  const answered = lovemapState.answers.length;
  const total = Math.min(GOTTMAN_DATA.lovemapQuestions.length, 8);
  const pct = Math.round((answered / total) * 100);

  document.getElementById('lovemap-final-score').textContent = pct + '%';
  document.getElementById('lovemap-final-label').textContent =
    pct >= 80 ? 'Deep Map' : pct >= 60 ? 'Growing Map' : 'Uncharted Territory';
  document.getElementById('lovemap-final-insight').innerHTML = `
    <strong>You answered ${answered} of ${total} questions about ${b.name}.</strong><br><br>
    Love Maps need constant updating — ${b.name} is always changing. The questions you found hard
    are your exploration frontier. <em>Gottman suggests asking one Love Map question per day during
    a meal or commute.</em>
    <br><br>💡 <strong>Try this:</strong> Share your answers with ${b.name} and let them rate accuracy.
    Surprise and delight both create connection.
  `;
  document.getElementById('lovemap-result').classList.remove('hidden');
  updateProgressDisplay();
}

// ── GAME 4: POSITIVE ORBIT ────────────────────────────────────
let orbitState = { positives: 0, negatives: 0, log: [], ratio: 5 };

function initOrbitGame() {
  orbitState = { positives: 0, negatives: 0, log: [], ratio: 5 };
  renderOrbitStats();
  renderOrbitLog();
  startOrbitCanvas();
}

function logInteraction(type) {
  const labels = {
    compliment: { label: 'Gave compliment', emoji: '💛', val: 1, pos: true },
    joke:       { label: 'Shared laugh',    emoji: '😄', val: 1, pos: true },
    touch:      { label: 'Physical touch',  emoji: '🤝', val: 1, pos: true },
    connect:    { label: 'Quality time',    emoji: '🫂', val: 1, pos: true },
    criticism:  { label: 'Made criticism',  emoji: '🗡️', val: 1, pos: false },
    eyeroll:    { label: 'Eye roll / sneer',emoji: '👁️', val: 1, pos: false },
    snap:       { label: 'Snapped / irritated', emoji: '⚡', val: 1, pos: false },
  };
  const item = labels[type];
  if (!item) return;

  if (item.pos) orbitState.positives += item.val;
  else orbitState.negatives += item.val;

  orbitState.log.unshift({ ...item, ts: Date.now() });
  if (orbitState.log.length > 20) orbitState.log.pop();

  const ratio = orbitState.negatives === 0 ? (orbitState.positives || 5) : orbitState.positives / orbitState.negatives;
  orbitState.ratio = Math.round(ratio * 10) / 10;
  state.progress.orbitRatio = orbitState.ratio;
  saveState();

  renderOrbitStats();
  renderOrbitLog();
  updateOrbitCanvas();

  if (!item.pos && orbitState.ratio < 3) {
    showInsight('The magic ratio is 5:1. You\'re below 3:1. Every positive interaction you add now helps rebuild the buffer.', 'Gottman: Magic Ratio');
  }
}

function renderOrbitStats() {
  const ratio = orbitState.ratio;
  document.getElementById('orbit-ratio').textContent = isFinite(ratio) ? ratio.toFixed(1) + ':1' : '—';
  document.getElementById('orbit-pos').textContent   = orbitState.positives;
  document.getElementById('orbit-neg').textContent   = orbitState.negatives;
  const msg = ratio >= 5 ? '🌟 Thriving Range' : ratio >= 3 ? '⚠️ Watch Zone' : ratio >= 1 ? '🔴 Danger Zone' : 'Log some positives!';
  document.getElementById('orbit-status').textContent = msg;
  const fill = document.getElementById('orbit-ratio-fill');
  const pct = Math.min(100, (ratio / 8) * 100);
  fill.style.width = pct + '%';
  fill.className = 'progress-fill ' + (ratio >= 5 ? 'progress-fill-c' : ratio >= 3 ? 'progress-fill-a' : '');
  if (ratio < 3) fill.style.background = 'linear-gradient(90deg, #ef4444, #f87171)';
}

function renderOrbitLog() {
  const logEl = document.getElementById('orbit-log');
  logEl.innerHTML = orbitState.log.slice(0, 5).map(item =>
    `<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:rgba(255,255,255,${item.pos?'0.05':'0.03'});border-radius:10px;border:1px solid rgba(${item.pos?'34,197,94':'239,68,68'},0.2)">
      <span>${item.emoji}</span>
      <span style="font-size:0.85rem;color:var(--text-secondary)">${item.label}</span>
      <span style="margin-left:auto;font-size:0.75rem;color:${item.pos?'#22c55e':'#ef4444'}">${item.pos?'+1':'-1'}</span>
    </div>`
  ).join('') || '<div style="color:var(--text-muted);font-size:0.85rem;text-align:center;padding:20px">Log some interactions to see your ratio</div>';
}

let orbitCanvasAnim;
function startOrbitCanvas() { updateOrbitCanvas(); }

function updateOrbitCanvas() {
  const canvas = document.getElementById('orbitGameCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const size = Math.min(220, window.innerWidth - 80);
  canvas.width = size; canvas.height = size;
  const cx = size/2, cy = size/2;

  const ratio = orbitState.ratio || 5;
  const dist  = size * (0.2 + (1 - Math.min(ratio/10,1)) * 0.2);

  ctx.clearRect(0,0,size,size);

  // Sun (shared positive space)
  const sun = ctx.createRadialGradient(cx,cy,0,cx,cy,size*0.15);
  sun.addColorStop(0,'rgba(251,191,36,0.9)');
  sun.addColorStop(0.6,'rgba(249,115,22,0.4)');
  sun.addColorStop(1,'transparent');
  ctx.beginPath(); ctx.arc(cx,cy,size*0.15,0,Math.PI*2);
  ctx.fillStyle=sun; ctx.fill();
  ctx.font=`${size*0.12}px serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('☀️',cx,cy);

  // Planet orbit (ratio determines distance)
  const px = cx + dist * Math.cos(Date.now()/3000);
  const py = cy + dist * Math.sin(Date.now()/3000) * 0.5;

  ctx.beginPath(); ctx.arc(cx,cy,dist,0,Math.PI*2);
  ctx.strokeStyle=`rgba(255,255,255,0.08)`; ctx.lineWidth=1; ctx.stroke();

  const pGrad = ctx.createRadialGradient(px,py,0,px,py,size*0.06);
  pGrad.addColorStop(0,'white');
  pGrad.addColorStop(0.4,'#8b5cf6');
  pGrad.addColorStop(1,'#06b6d4');
  ctx.beginPath(); ctx.arc(px,py,size*0.06,0,Math.PI*2);
  ctx.fillStyle=pGrad; ctx.fill();
  ctx.font=`${size*0.08}px serif`; ctx.fillText(state.personA?.avatar||'💜',px,py);

  cancelAnimationFrame(orbitCanvasAnim);
  orbitCanvasAnim = requestAnimationFrame(updateOrbitCanvas);
}

// ── REFERENCE MANUAL ─────────────────────────────────────────
function showSituationCard(id) {
  const card = GOTTMAN_DATA.situationCards.find(c => c.id === id);
  if (!card) return;

  const toolMap = {};
  GOTTMAN_DATA.repairTools.forEach(t => toolMap[t.id] = t);

  document.getElementById('ref-title').textContent = card.label;
  document.getElementById('ref-emoji').textContent = card.emoji;
  document.getElementById('ref-insight').textContent = card.insight;
  document.getElementById('ref-quote').textContent = `"${card.gottmanQuote}"`;

  const toolsEl = document.getElementById('ref-tools');
  toolsEl.innerHTML = card.tools.map(tid => {
    const tool = toolMap[tid];
    if (!tool) return '';
    return `
      <div class="card" style="margin:0; padding:16px 18px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
          <span style="font-size:1.5rem">${tool.emoji}</span>
          <strong>${tool.name}</strong>
        </div>
        <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:6px">WHEN: ${tool.when}</div>
        <div style="font-size:0.85rem;color:var(--text-secondary)">${tool.how}</div>
      </div>
    `;
  }).join('');

  goTo('screen-ref-detail', { dir: 'forward' });
}

// ── INSIGHTS SCREEN ──────────────────────────────────────────
function initInsights() {
  const a = state.personA, b = state.personB;
  if (!a || !b) return;

  document.getElementById('insights-a-avatar').textContent = a.avatar;
  document.getElementById('insights-a-name').textContent = a.name;
  document.getElementById('insights-a-style').textContent = capitalize(a.conflictStyle) + ' style';
  document.getElementById('insights-a-horseman').textContent =
    a.primaryHorseman ? GOTTMAN_DATA.horsemen.find(h=>h.id===a.primaryHorseman)?.emoji + ' ' + capitalize(a.primaryHorseman) : 'Unknown';

  document.getElementById('insights-b-avatar').textContent = b.avatar;
  document.getElementById('insights-b-name').textContent = b.name;
  document.getElementById('insights-b-style').textContent = capitalize(b.conflictStyle) + ' style';
  document.getElementById('insights-b-horseman').textContent =
    b.primaryHorseman ? GOTTMAN_DATA.horsemen.find(h=>h.id===b.primaryHorseman)?.emoji + ' ' + capitalize(b.primaryHorseman) : 'Unknown';

  const couple = deriveCouple();
  if (couple?.pattern) {
    document.getElementById('insights-couple-pattern').innerHTML = `
      <span style="font-size:1.8rem">${couple.pattern.emoji}</span>
      <strong>${couple.pattern.name}</strong>
      <p style="font-size:0.8rem;color:var(--text-secondary);margin:4px 0 0">${couple.pattern.description}</p>
      <p style="font-size:0.8rem;color:var(--a-text);margin-top:8px">Intervention: ${couple.pattern.intervention}</p>
    `;
  }

  const p = state.progress;
  document.getElementById('insights-score-bids').textContent     = p.bidsScore || '—';
  document.getElementById('insights-score-horsemen').textContent = p.horsemenScore || '—';
  document.getElementById('insights-score-lovemap').textContent  = p.lovemapScore || '—';
  document.getElementById('insights-ratio').textContent          = p.orbitRatio ? p.orbitRatio.toFixed(1) + ':1' : '—';
}

// ── HOUSE SCREEN ─────────────────────────────────────────────
function initHouseScreen() {
  const floorsEl = document.getElementById('house-floors-list');
  floorsEl.innerHTML = GOTTMAN_DATA.houseFloors.slice().reverse().map(f => `
    <div class="house-floor" onclick="showFloorDetail(${f.floor})">
      <span class="floor-num">F${f.floor}</span>
      <span class="floor-emoji">${f.emoji}</span>
      <div>
        <div class="floor-name">${f.name}</div>
        <div style="font-size:0.75rem;color:var(--text-muted)">${f.description.substring(0,60)}...</div>
      </div>
    </div>
  `).join('');
}

function showFloorDetail(num) {
  const floor = GOTTMAN_DATA.houseFloors.find(f => f.floor === num);
  if (!floor) return;
  document.getElementById('floor-detail-emoji').textContent = floor.emoji;
  document.getElementById('floor-detail-name').textContent  = floor.name;
  document.getElementById('floor-detail-desc').textContent  = floor.description;
  document.getElementById('floor-detail-practices').innerHTML = floor.practices.map(p => `<li style="margin-bottom:6px">${p}</li>`).join('');
  document.getElementById('floor-detail-flags').innerHTML    = floor.redFlags.map(f => `<li style="margin-bottom:6px;color:var(--criticism)">${f}</li>`).join('');
  document.getElementById('floor-detail-quiz').textContent   = floor.quiz;
  goTo('screen-floor-detail', { dir: 'forward' });
}

// ── HORSEMEN DETAIL ───────────────────────────────────────────
function initHorsemenDetail() {
  const grid = document.getElementById('horsemen-detail-grid');
  grid.innerHTML = GOTTMAN_DATA.horsemen.map(h => `
    <div class="card" style="cursor:pointer;border-color:${h.color}20" onclick="showHorsemanDetail('${h.id}')">
      <div style="font-size:2.5rem;text-align:center;margin-bottom:8px">${h.emoji}</div>
      <div class="title-md" style="text-align:center;color:${h.color}">${h.name}</div>
      <p style="font-size:0.8rem;color:var(--text-secondary);text-align:center;margin-top:6px">${h.definition.substring(0,80)}...</p>
      <div style="margin-top:12px;padding:10px;background:rgba(34,197,94,0.08);border-radius:10px;border:1px solid rgba(34,197,94,0.2)">
        <div style="font-size:0.7rem;font-weight:700;color:#22c55e;letter-spacing:0.1em">ANTIDOTE</div>
        <div style="font-size:0.85rem;margin-top:4px">${h.antidoteEmoji} ${h.antidote}</div>
      </div>
    </div>
  `).join('');
}

function showHorsemanDetail(id) {
  const h = GOTTMAN_DATA.horsemen.find(h2 => h2.id === id);
  if (!h) return;
  document.getElementById('horseman-d-emoji').textContent = h.emoji;
  document.getElementById('horseman-d-name').textContent  = h.name;
  document.getElementById('horseman-d-def').textContent   = h.definition;
  document.getElementById('horseman-d-example').textContent = h.example;
  document.getElementById('horseman-d-vs').textContent    = h.vs;
  document.getElementById('horseman-d-antidote-name').textContent = h.antidoteEmoji + ' ' + h.antidote;
  document.getElementById('horseman-d-antidote-how').textContent  = h.antidoteHow;
  document.getElementById('horseman-d-script').textContent = h.antidoteScript;
  document.getElementById('horseman-d-note').textContent  = h.researchNote;
  document.getElementById('horseman-d-individual').textContent = h.individual;
  document.getElementById('horseman-d-couple').textContent = h.couple;
  goTo('screen-horseman-detail', { dir: 'forward' });
}

// ── HELPERS ──────────────────────────────────────────────────
function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

// ── MAIN INIT ────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  loadState();
  initScreens();

  // Render avatars
  const avatarGrids = document.querySelectorAll('.avatar-grid');
  avatarGrids.forEach(grid => {
    grid.innerHTML = AVATARS.map(e =>
      `<div class="avatar-opt" data-emoji="${e}" onclick="selectAvatar('${e}')">${e}</div>`
    ).join('');
  });

  // Check if profiles exist
  if (state.personA && state.personB) {
    goTo('screen-hub', {
      onEnter: () => {
        initHub();
        updateNav('screen-hub');
        document.getElementById('bottom-nav').style.display = 'flex';
      }
    });
  } else {
    goTo('welcome', {});
  }

  // Nav items
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const t = item.dataset.target;
      if (!t) return;
      goTo(t, { onEnter: () => {
        if (t === 'screen-hub')        { initHub(); }
        if (t === 'screen-bids')       { initBidsGame(); }
        if (t === 'screen-horsemen')   { initHorsemenGame(); }
        if (t === 'screen-lovemap')    { initLovemapGame(); }
        if (t === 'screen-orbit')      { initOrbitGame(); }
        if (t === 'screen-reference')  { /* static */ }
        if (t === 'screen-insights')   { initInsights(); }
      }});
    });
  });

  // Insight toast click to dismiss
  document.getElementById('insight-toast')?.addEventListener('click', () => {
    document.getElementById('insight-toast').classList.remove('show');
  });
});
