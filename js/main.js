// js/main.js
import * as progressService from './services/progressService.js';
import { STORAGE_KEY } from './config.js';

/* =============================
 * Enums
 * ============================= */
export const SCREEN = {
  TOPICS: "topics",
  LEARNING: "learning",
  QUIZ: "quiz",
  RESULTS: "results",
  PROGRESS: "progress",
};

export const MODE = {
  MODULE: "module",
  MOCK: "mock",
};

const Q_STATE = {
  UNANSWERED: "unanswered",
  ANSWERED: "answered",
};

/* =============================
 * App State
 * ============================= */
const state = {
  screen: SCREEN.TOPICS,
  mode: MODE.MODULE,
  selectedChapterId: null,
  currentIndex: 0,
  questions: [],
  answers: [],
  quizType: null,
  quizConfig: {},
  questionState: Q_STATE.UNANSWERED,
  score: 0,
  root: null,
  flashcardSession: {
      cards: [],
      currentIndex: 0,
      isFlipped: false,
  }
};

/* =============================
 * Helper Functions
 * ============================= */

function getChaptersFromGlobal() {
  const central = window.CII_W01_TUTOR_DATA?.chapters;
  if (Array.isArray(central) && central.length) return central;
  return [];
}
function qs(sel, parent = document) { return parent.querySelector(sel); }
function qsa(sel, parent = document) { return Array.from(parent.querySelectorAll(sel)); }
function announce(text) {
  const el = document.getElementById("aria-live");
  if (!el) return;
  el.textContent = "";
  requestAnimationFrame(() => { el.textContent = text; });
}
function focusFirst(el) {
  const focusable = el.querySelector(
    'h1, h2, h3, button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  (focusable || el).focus();
}
export function allocateByWeights(los, desiredTotal) {
  if (!Array.isArray(los) || !los.length || desiredTotal <= 0) return new Map();
  const totalWeight = los.reduce((s, lo) => s + (lo.weight || 0), 0) || 1;
  const base = los.map((lo) => {
    const targetFloat = ((lo.weight || 0) / totalWeight) * desiredTotal;
    const target = Math.floor(targetFloat);
    const capped = Math.min(target, lo.poolSize || 0);
    return { ...lo, count: capped };
  });
  let allocated = base.reduce((s, lo) => s + lo.count, 0);
  let deficit = Math.max(0, desiredTotal - allocated);
  if (deficit > 0) {
    const room = base.filter((lo) => lo.count < (lo.poolSize || 0));
    if (room.length) {
      let i = 0, added = 0;
      while (added < deficit) {
        const lo = room[i % room.length];
        if (lo.count < (lo.poolSize || 0)) {
          lo.count += 1;
          added += 1;
        }
        i += 1;
        if (i > room.length * (deficit + 1)) break;
      }
    }
  }
  const out = new Map();
  base.forEach((lo) => out.set(lo.id, lo.count));
  return out;
}
const isMCQ = (q) => q && q.type === "mcq" && Array.isArray(q.options) && q.options.length > 1;
function mcqOnly(arr) { return (arr || []).filter(isMCQ); }
function sampleFromPool(pool, n) {
  const arr = pool.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, n);
}

function buildQuiz(config) {
  const { chapters, type, chapterId, totalQuestions } = config;
  const allQuestions = [];

  if (type === 'mock') {
    const withLOs = chapters.filter((c) => Array.isArray(c.los) && c.los.length);
    if (withLOs.length) {
        const flatLOs = [];
        withLOs.forEach((c) => {
            c.los.forEach((lo) => {
                const poolSize = mcqOnly(c.questions).filter((q) => q.loId === lo.id).length;
                flatLOs.push({ id: `${c.id}::${lo.id}`, weight: lo.weight || 0, poolSize, chapterId: c.id, loId: lo.id });
            });
        });
        const counts = allocateByWeights(flatLOs, totalQuestions);
        counts.forEach((count, compositeId) => {
            const [chapId, loId] = compositeId.split("::");
            const chapter = chapters.find((c) => c.id === chapId);
            if (!chapter) return;
            const pool = mcqOnly(chapter.questions).filter((q) => q.loId === loId);
            allQuestions.push(...sampleFromPool(pool, count));
        });
    } else {
        const sizes = chapters.map((c) => mcqOnly(c.questions).length);
        const totalPool = sizes.reduce((a, b) => a + b, 0) || 1;
        chapters.forEach((c) => {
            const pool = mcqOnly(c.questions);
            const want = Math.floor((pool.length / totalPool) * totalQuestions);
            allQuestions.push(...sampleFromPool(pool, want));
        });
    }
  } else { // module quiz
    const chapter = chapters.find(c => c.id === chapterId);
    const poolAll = mcqOnly(chapter?.questions);
    if (poolAll.length) {
      if (Array.isArray(chapter.los) && chapter.los.length) {
        const losMeta = chapter.los.map((lo) => ({ id: lo.id, weight: lo.weight || 0, poolSize: poolAll.filter((q) => q.loId === lo.id).length }));
        const counts = allocateByWeights(losMeta, Math.min(totalQuestions, poolAll.length));
        counts.forEach((n, loId) => {
          const loPool = poolAll.filter((q) => q.loId === loId);
          allQuestions.push(...sampleFromPool(loPool, n));
        });
      } else {
        allQuestions.push(...sampleFromPool(poolAll, Math.min(totalQuestions, poolAll.length)));
      }
    }
  }
  
  const uniq = new Map();
  allQuestions.forEach((q) => {
      const key = q.id || `${q.text}::${JSON.stringify(q.options)}`;
      if (!uniq.has(key)) uniq.set(key, q);
  });
  let uniqueList = Array.from(uniq.values());

  if (uniqueList.length < totalQuestions) {
      const flat = chapters.flatMap((c) => mcqOnly(c.questions));
      const spare = flat.filter((q) => !uniqueList.includes(q));
      uniqueList.push(...sampleFromPool(spare, totalQuestions - uniqueList.length));
  }

  return uniqueList.slice(0, totalQuestions);
}

/* =============================
 * Rendering Engine
 * ============================= */

function render() {
  const root = state.root || qs("#app");
  root.innerHTML = "";

  let screenEl;
  let pageTitle = "CII W01 Tutor";
  const chapters = getChaptersFromGlobal();
  const chapter = chapters.find(c => c.id === state.selectedChapterId);

  switch (state.screen) {
    case SCREEN.TOPICS:
      screenEl = renderTopics();
      break;
    case SCREEN.LEARNING:
      screenEl = renderLearning();
      pageTitle = `Learning - ${chapter.title}`;
      break;
    case SCREEN.QUIZ:
      screenEl = renderQuiz();
      pageTitle = `Quiz - ${state.quizType === 'mock' ? 'Mock Exam' : chapter.title}`;
      break;
    case SCREEN.RESULTS:
      screenEl = renderResults();
      pageTitle = `Results - ${state.quizType === 'mock' ? 'Mock Exam' : chapter.title}`;
      break;
    case SCREEN.PROGRESS:
      screenEl = renderProgress();
      pageTitle = "My Progress";
      break;
    default:
      screenEl = document.createElement("div");
      screenEl.innerHTML = `<p>Unknown screen.</p>`;
  }

  root.appendChild(screenEl);
  document.title = pageTitle;
  announce(`Screen changed to ${state.screen}`);
  focusFirst(screenEl);
  
  if (state.screen === SCREEN.PROGRESS) {
    activateChart();
  }
}

function renderTopics() {
  const wrap = document.createElement("section");
  wrap.className = "screen screen-topics";
  wrap.innerHTML = `
    <div class="text-center py-8 md:py-12">
        <h1 class="text-3xl md:text-4xl font-bold text-white" tabindex="-1">CII W01 Insurance Tutor</h1>
        <p class="mt-4 max-w-2xl mx-auto text-lg text-neutral-300">
            Select a chapter to review key concepts, or challenge yourself with a full mock exam to prepare for success.
        </p>
    </div>
    
    <div class="text-center mb-8">
        <button class="btn btn-primary text-lg px-8 py-3" id="my-progress-btn">My Progress</button>
    </div>

    <div class="mode-switch mx-auto">
      <button class="btn" data-mode="${MODE.MODULE}" aria-pressed="${state.mode === MODE.MODULE}">Study by Chapter</button>
      <button class="btn" data-mode="${MODE.MOCK}" aria-pressed="${state.mode === MODE.MOCK}">Mock Exam</button>
    </div>
    <div class="topics-grid" role="list"></div>
  `;

  const grid = qs(".topics-grid", wrap);
  const chapters = getChaptersFromGlobal();

  if (state.mode === MODE.MOCK) {
    grid.style.display = 'none';
    const card = document.createElement("button");
    card.className = "topic-card max-w-md mx-auto mt-8 block w-full";
    card.setAttribute("role", "listitem");
    card.innerHTML = `
      <div class="topic-card__title">Start Mock Exam</div>
      <div class="topic-card__meta">50 questions • MCQ • LO-weighted where available</div>
    `;
    qs(".mode-switch", wrap).after(card);
  } else {
    chapters.forEach((ch) => {
        const card = document.createElement("button");
        card.className = "topic-card";
        card.setAttribute("role", "listitem");
        card.dataset.chapterId = ch.id;
        card.innerHTML = `
          <div class="topic-card__title">${ch.title || ch.id}</div>
          <div class="topic-card__meta">Flashcards & Quizzes</div>
        `;
        grid.appendChild(card);
    });
  }
  return wrap;
}

function renderProgress() {
    const wrap = document.createElement('section');
    wrap.className = 'screen screen-progress';
    const progress = progressService.getProgress();

    const chapterMasteries = Object.values(progress.chapters).map(ch => ch.mastery);
    const overallMastery = chapterMasteries.length > 0
        ? (chapterMasteries.reduce((a, b) => a + b, 0) / chapterMasteries.length) * 100
        : 0;

    wrap.innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <h1 class="text-3xl font-bold text-white">My Progress</h1>
            <button id="back-btn" class="btn-ghost">Back</button>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="lg:col-span-1 card text-center bg-white/5 border border-white/10">
                <h2 class="text-lg font-semibold text-neutral-300">Overall Mastery</h2>
                <p class="text-6xl font-bold text-amber-400 my-4">${Math.round(overallMastery)}%</p>
                <p class="text-sm text-neutral-400">Based on flashcard confidence</p>
            </div>
            <div class="lg:col-span-2 card bg-white/5 border border-white/10">
                <h2 class="text-lg font-semibold text-neutral-300 mb-4">Mastery by Chapter</h2>
                <canvas id="mastery-chart"></canvas>
            </div>
            <div class="lg:col-span-3 card bg-white/5 border border-white/10">
                <h2 class="text-lg font-semibold text-neutral-300 mb-4">Recent Activity</h2>
                <div id="activity-log" class="space-y-3"></div>
            </div>
        </div>
    `;

    const activityLog = qs('#activity-log', wrap);
    if (progress.recentActivity.length > 0) {
        progress.recentActivity.forEach(act => {
            const actEl = document.createElement('div');
            actEl.className = 'text-neutral-300 text-sm flex justify-between';
            actEl.innerHTML = `
                <p>${act.type === 'quiz' ? `Completed Quiz: ${act.chapter}` : 'Studied Flashcards'}</p>
                <p>${act.score ? `Score: ${act.score}` : ''} <span class="text-neutral-500 ml-4">${new Date(act.date).toLocaleDateString()}</span></p>
            `;
            activityLog.appendChild(actEl);
        });
    } else {
        activityLog.innerHTML = `<p class="text-neutral-500">No activity yet. Take a quiz or study some flashcards to see your progress!</p>`;
    }

    return wrap;
}

function activateChart() {
    const ctx = document.getElementById('mastery-chart')?.getContext('2d');
    if (!ctx) return;
    const progress = progressService.getProgress();
    const allChapters = getChaptersFromGlobal();
    const labels = allChapters.map(ch => ch.title.replace(/Chapter \d+: /g, ''));
    const data = allChapters.map(ch => {
        const chapterProgress = progress.chapters[ch.id];
        return chapterProgress ? chapterProgress.mastery * 100 : 0;
    });

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Mastery %',
                data: data,
                backgroundColor: 'rgba(251, 191, 36, 0.6)',
                borderColor: 'rgba(251, 191, 36, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: { beginAtZero: true, max: 100, grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#9ca3af' } },
                x: { grid: { display: false }, ticks: { color: '#9ca3af', maxRotation: 60, minRotation: 60 } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

async function getAiExplanation(term, definition, promptType, container) {
    container.innerHTML = '<p class="text-neutral-400 animate-pulse">🤖 Gemini is thinking...</p>';
    qsa('[data-prompt]').forEach(b => b.disabled = true);
    try {
        const response = await fetch('/.netlify/functions/getAiExplanation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ term, definition, promptType }),
        });
        if (!response.ok) throw new Error(`Server error: ${response.statusText}`);
        const data = await response.json();
        const formattedText = data.explanation
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');
        container.innerHTML = `<p class="text-amber-300">${formattedText}</p>`;
    } catch (error) {
        console.error('Failed to fetch AI explanation:', error);
        container.innerHTML = '<p class="text-red-400">Sorry, there was an error connecting to the AI.</p>';
    } finally {
        qsa('[data-prompt]').forEach(b => b.disabled = false);
    }
}

function renderLearning() {
    const wrap = document.createElement("section");
    wrap.className = "screen screen-learning";
    const session = state.flashcardSession;
    const card = session.cards[session.currentIndex];

    if (!card) {
        wrap.innerHTML = `
        <div class="text-center">
            <h1 class="text-2xl font-bold text-white mb-4">Session Complete!</h1>
            <p class="text-neutral-300 mb-8">You've reviewed all the cards for this chapter.</p>
            <button id="back-btn" class="btn-ghost">Back to Topics</button>
            <button id="quiz-btn" class="btn btn-primary ml-4">Take Chapter Quiz</button>
        </div>
        `;
        return wrap;
    }

    const termSide = `
        <div class="text-center text-3xl font-bold text-white">${card.term}</div>
        <button class="btn mt-8 bg-amber-500 hover:bg-amber-600" id="reveal-btn">Reveal Answer</button>
    `;
    const definitionSide = `
        <div class="text-lg text-neutral-200 text-center">${card.definition}</div>
        <div class="my-6 border-t border-white/10"></div>
        <div class="flex justify-center gap-3">
            <button class="btn-ghost text-sm !px-3 !py-1" data-prompt="simplify">✨ Explain Simply</button>
            <button class="btn-ghost text-sm !px-3 !py-1" data-prompt="scenario">🏡 Real-World Scenario</button>
        </div>
        <div id="ai-response" class="mt-4 p-4 bg-black/20 rounded-lg min-h-[60px] text-sm"></div>
    `;

    wrap.innerHTML = `
        <div class="flex justify-between items-center text-sm text-neutral-400 mb-4">
            <button id="back-btn" class="btn-ghost !p-2">&larr; Topics</button>
            <p>Cards remaining in this session: ${session.cards.length - session.currentIndex}</p>
        </div>
        <div id="flashcard" class="card bg-white/5 min-h-[300px] flex flex-col items-center justify-center p-8">
            ${session.isFlipped ? definitionSide : termSide}
        </div>
        <div id="controls" class="mt-6"></div>
    `;

    const controls = qs('#controls', wrap);
    if (session.isFlipped) {
        controls.innerHTML = `
        <div class="grid grid-cols-5 gap-3">
            <button data-confidence="1" class="confidence-btn bg-red-600 hover:bg-red-700 text-white p-3 rounded-xl transition">1<br/><span class="text-xs">Forgot</span></button>
            <button data-confidence="2" class="confidence-btn bg-orange-500 hover:bg-orange-600 text-white p-3 rounded-xl transition">2<br/><span class="text-xs">Hard</span></button>
            <button data-confidence="3" class="confidence-btn bg-yellow-500 hover:bg-yellow-600 text-white p-3 rounded-xl transition">3<br/><span class="text-xs">Good</span></button>
            <button data-confidence="4" class="confidence-btn bg-green-500 hover:bg-green-600 text-white p-3 rounded-xl transition">4<br/><span class="text-xs">Easy</span></button>
            <button data-confidence="5" class="confidence-btn bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl transition">5<br/><span class="text-xs">Perfect</span></button>
        </div>
        `;
    } else {
        controls.innerHTML = `<button id="back-to-topics-secondary" class="btn-ghost mx-auto block">Back to Topics</button>`;
    }
    
    return wrap;
}

function renderQuiz() {
  const wrap = document.createElement("section");
  wrap.className = "screen screen-quiz";
  const q = state.questions[state.currentIndex];
  const progressPercent = ((state.currentIndex + 1) / state.questions.length) * 100;

  wrap.innerHTML = `
    <div class="toolbar">
      <button class="btn btn-ghost" id="quit-quiz">&larr; Exit</button>
      <h1 class="screen-title" tabindex="-1">Question ${state.currentIndex + 1} of ${state.questions.length}</h1>
    </div>
    <div class="w-full bg-neutral-700 rounded-full h-2.5 mt-4">
        <div class="bg-brand h-2.5 rounded-full" style="width: ${progressPercent}%"></div>
    </div>
    <article class="question-card card mt-6" aria-live="polite">
      <h2 class="question-text text-lg md:text-xl font-semibold text-neutral-800 dark:text-white">${q?.text || q?.question || "Question text missing"}</h2>
      <div class="options mt-6 space-y-3" role="radiogroup" aria-label="Answer options"></div>
      <div id="explanation-container" class="explanation-card" hidden></div>
    </article>
    <div class="quiz-actions mt-6 text-right">
      <button class="btn" id="next-btn" hidden>Next Question &rarr;</button>
      <button class="btn btn-primary" id="finish-btn" hidden>Finish Quiz</button>
    </div>
  `;
  const optionsEl = qs(".options", wrap);
  const explanationEl = qs("#explanation-container", wrap);
  const nextBtn = qs("#next-btn", wrap);
  const finishBtn = qs("#finish-btn", wrap);
  const isLastQuestion = state.currentIndex === state.questions.length - 1;
  (q?.options || []).forEach((optText, idx) => {
    const label = document.createElement("label");
    label.className = "option-label";
    label.dataset.index = idx;
    const input = document.createElement("input");
    input.type = "radio";
    input.name = "answer";
    input.value = idx;
    input.className = "option-input sr-only";
    const span = document.createElement("span");
    span.className = "option-text";
    span.textContent = optText;
    label.appendChild(input);
    label.appendChild(span);
    if (state.questionState === Q_STATE.ANSWERED) {
      const userAnswer = state.answers[state.currentIndex];
      label.classList.add('is-disabled');
      if (idx === q.correctIndex) {
        label.classList.add('is-correct');
      } else if (idx === userAnswer.selectedIndex) {
        label.classList.add('is-incorrect');
      }
    }
    optionsEl.appendChild(label);
  });
  if (state.questionState === Q_STATE.ANSWERED) {
    explanationEl.innerHTML = `<p class="text-neutral-800 dark:text-white"><strong>Explanation:</strong> ${q.explanation || 'No explanation provided.'}</p>`;
    explanationEl.hidden = false;
    if (isLastQuestion) {
      finishBtn.hidden = false;
    } else {
      nextBtn.hidden = false;
    }
  }

  if (state.questionState === Q_STATE.UNANSWERED) { announce("New question loaded."); } else { const resultText = state.answers[state.currentIndex].correct ? 'Correct.' : 'Incorrect.'; announce(resultText); }
  return wrap;
}

function renderResults() {
  const wrap = document.createElement("section");
  wrap.className = "screen screen-results";
  const total = state.questions.length || 0;
  const correct = state.answers.filter((a) => a?.correct).length;
  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
  
  const chapters = getChaptersFromGlobal();
  const chapter = chapters.find(c => c.id === state.quizConfig.chapterId);
  if (chapter) {
    progressService.logActivity({ type: 'quiz', chapter: chapter.title, score: `${correct}/${total}` });
  }

  wrap.innerHTML = `
    <div class="card text-center">
      <h1 class="screen-title text-3xl text-neutral-800 dark:text-white" tabindex="-1">Quiz Complete!</h1>
      <p class="score text-5xl font-bold mt-4 text-brand">${percentage}%</p>
      <p class="text-xl muted mt-2">You scored <strong>${correct} / ${total}</strong></p>
      <div class="results-actions mt-8 flex justify-center gap-4">
        <button class="btn btn-primary" id="retry">Retry Quiz</button>
        <button class="btn btn-ghost" id="back">Back to Topics</button>
      </div>
    </div>
    <div class="mt-8">
      <h2 class="section-title text-white">Review Your Answers</h2>
      <div class="results-list mt-4 space-y-6"></div>
    </div>
  `;
  const listEl = qs('.results-list', wrap);
  state.questions.forEach((q, idx) => {
    const answer = state.answers[idx];
    const item = document.createElement('div');
    item.className = 'result-item card';
    const userChoice = (answer && answer.selectedIndex !== undefined) ? q.options[answer.selectedIndex] : 'Not answered';
    const correctChoice = q.options[q.correctIndex];
    const isCorrect = answer?.correct;
    item.innerHTML = `
      <p class="result-item__question text-neutral-800 dark:text-white">${idx + 1}. ${q.question}</p>
      <div class="result-item__answer mt-3 space-y-2">
        <p class="${isCorrect ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}">
          <strong>Your answer:</strong> ${userChoice} ${isCorrect ? '✔' : '❌'}
        </p>
        ${!isCorrect ? `<p class="text-green-600 dark:text-green-500"><strong>Correct answer:</strong> ${correctChoice}</p>` : ''}
        <div class="explanation-card !mt-3 text-sm">
          <p class="text-neutral-700 dark:text-neutral-300"><strong>Explanation:</strong> ${q.explanation}</p>
        </div>
      </div>
    `;
    listEl.appendChild(item);
  });
  return wrap;
}

/* =============================
 * Event Handlers
 * ============================= */

function handleAppClick(event) {
  const { target } = event;
  const chapters = getChaptersFromGlobal();

  // Topics Screen
  const topicCard = target.closest('.topic-card');
  if (topicCard) {
    if (state.mode === MODE.MOCK) {
      const questions = buildQuiz({ chapters, type: 'mock', totalQuestions: 50 });
      startQuiz(questions, { type: 'mock', config: { totalQuestions: 50 } });
    } else {
      state.selectedChapterId = topicCard.dataset.chapterId;
      const chapter = chapters.find(c => c.id === state.selectedChapterId);
      startFlashcardSession(chapter);
    }
  }

  if (target.id === 'my-progress-btn' || target.id === 'back-btn') {
    state.screen = (target.id === 'my-progress-btn') ? SCREEN.PROGRESS : SCREEN.TOPICS;
    render();
  } else if (target.closest('.mode-switch .btn')) {
    state.mode = target.dataset.mode;
    render();
  }

  // Learning Screen
  if (target.id === 'reveal-btn') {
    state.flashcardSession.isFlipped = true;
    render();
  } else if (target.closest('[data-prompt]')) {
    const btn = target.closest('[data-prompt]');
    const promptType = btn.dataset.prompt;
    const { term, definition } = state.flashcardSession.cards[state.flashcardSession.currentIndex];
    const responseContainer = qs('#ai-response');
    getAiExplanation(term, definition, promptType, responseContainer);
  } else if (target.closest('.confidence-btn')) {
    const btn = target.closest('.confidence-btn');
    const confidence = parseInt(btn.dataset.confidence, 10);
    const { id: cardId } = state.flashcardSession.cards[state.flashcardSession.currentIndex];
    const chapter = chapters.find(c => c.id === state.selectedChapterId);
    progressService.updateFlashcardConfidence(chapter.id, chapter.title, cardId, confidence);
    state.flashcardSession.currentIndex++;
    state.flashcardSession.isFlipped = false;
    render();
  } else if (target.id === 'quiz-btn') {
      const chapter = chapters.find(c => c.id === state.selectedChapterId);
      const qsList = buildQuiz({ chapters, type: 'module', chapterId: chapter.id, totalQuestions: 15 });
      startQuiz(qsList, { type: 'module', config: { chapterId: chapter.id, totalQuestions: 15 } });
  }

  // Quiz Screen
  if (target.closest('.option-label') && state.questionState === Q_STATE.UNANSWERED) {
    const label = target.closest('.option-label');
    const chosenIndex = parseInt(label.dataset.index, 10);
    const q = state.questions[state.currentIndex];
    const isCorrect = chosenIndex === q.correctIndex;
    state.answers[state.currentIndex] = { qid: q.id, selectedIndex: chosenIndex, correct: isCorrect };
    state.questionState = Q_STATE.ANSWERED;
    render();
  } else if (target.id === 'next-btn') {
    state.currentIndex++;
    state.questionState = Q_STATE.UNANSWERED;
    render();
  } else if (target.id === 'finish-btn') {
    state.screen = SCREEN.RESULTS;
    render();
  } else if (target.id === 'quit-quiz') {
    Object.assign(state, { screen: SCREEN.TOPICS, questions: [], answers: [], currentIndex: 0, score: 0, quizType: null, quizConfig: {} });
    render();
  }

  // Results Screen
  if (target.id === 'retry') {
    const newQuestions = buildQuiz({ chapters, ...state.quizConfig });
    startQuiz(newQuestions, { type: state.quizType, config: state.quizConfig });
  } else if (target.id === 'back' && state.screen === SCREEN.RESULTS) {
    Object.assign(state, { screen: SCREEN.TOPICS, questions: [], answers: [], currentIndex: 0, score: 0, quizType: null, quizConfig: {} });
    render();
  }
}

/* =============================
 * Session & App Start
 * ============================= */

function startQuiz(questionList, quizDetails) {
  state.questions = questionList || [];
  state.answers = new Array(state.questions.length).fill(null);
  state.currentIndex = 0;
  state.score = 0;
  state.screen = SCREEN.QUIZ;
  state.questionState = Q_STATE.UNANSWERED;
  state.quizType = quizDetails.type;
  state.quizConfig = quizDetails.config;
  render();
}

function startFlashcardSession(chapter) {
    const shuffled = sampleFromPool(chapter.flashcards, chapter.flashcards.length);
    state.flashcardSession = {
        cards: shuffled,
        currentIndex: 0,
        isFlipped: false,
    };
    state.screen = SCREEN.LEARNING;
    render();
}

window.addEventListener("DOMContentLoaded", () => {
  state.root = qs("#app");
  state.root.addEventListener('click', handleAppClick);
  qs('#reset-progress').addEventListener('click', () => {
    if (confirm('Are you sure you want to reset all your progress? This cannot be undone.')) {
        progressService.resetProgress();
        if(state.screen === SCREEN.PROGRESS) {
            render();
        } else {
            alert('Progress has been reset.');
        }
    }
  });
  render();
});