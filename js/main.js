// js/main.js
import * as progressService from './services/progressService.js';
import {
  STORAGE_KEY,
  FEATURE_FLAG_QUESTION_FLAGGING,
  FLAGGING_CONFIG
} from './config.js';

export const SCREEN = {
  TOPICS: "topics",
  LEARNING: "learning",
  QUIZ: "quiz",
  RESULTS: "results",
  PROGRESS: "progress",
  MANAGE: "manage",
};

export const MODE = {
  MODULE: "module",
  MOCK: "mock",
  SPECIMEN: "specimen",
};

const Q_STATE = {
  UNANSWERED: "unanswered",
  ANSWERED: "answered",
};

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
    dueCards: 0,
  },
  // --- NEW for Flagging Feature ---
  quizAttemptId: null, // Unique ID for the current quiz attempt
  flaggedQuestions: new Set(), // Holds IDs of flagged questions for the current attempt
  // --- NEW for Results Filtering ---
  resultsFilter: 'all', // 'all', 'incorrect', 'flagged'
  isQuizNavVisible: false, // For mobile quiz nav
  studyMode: false, // For "Try Again" feature
  quizTimer: null, // Holds the interval ID for the quiz timer
  quizEndTime: null, // Timestamp for when the quiz should end
};

function getChaptersFromGlobal() {
  const central = window.CII_W01_TUTOR_DATA?.chapters;
  if (Array.isArray(central) && central.length) return central;
  return [];
}

function qs(sel, parent = document) {
  return parent.querySelector(sel);
}

function qsa(sel, parent = document) {
  return Array.from(parent.querySelectorAll(sel));
}

function announce(text) {
  const el = document.getElementById("aria-live");
  if (!el) return;
  el.textContent = "";
  requestAnimationFrame(() => {
    el.textContent = text;
  });
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
    return { ...lo,
      count: capped
    };
  });
  let allocated = base.reduce((s, lo) => s + lo.count, 0);
  let deficit = Math.max(0, desiredTotal - allocated);
  if (deficit > 0) {
    const room = base.filter((lo) => lo.count < (lo.poolSize || 0));
    if (room.length) {
      let i = 0,
        added = 0;
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

function mcqOnly(arr) {
  return (arr || []).filter(isMCQ);
}

function sampleFromPool(pool, n) {
  const arr = pool.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, n);
}

function buildQuiz(config) {
  const {
    chapters,
    type,
    chapterId,
    totalQuestions,
    customChapters
  } = config;
  let allQuestions = [];

  // Helper to add chapterId to questions
  const tagQuestionsWithChapter = (questions, chapterId) => {
      return questions.map(q => ({...q, chapterId}));
  };

  if (type === 'custom' && Array.isArray(customChapters)) {
    const customPool = chapters
      .filter(c => customChapters.includes(c.id))
      .flatMap(c => tagQuestionsWithChapter(mcqOnly(c.questions), c.id));
    allQuestions.push(...sampleFromPool(customPool, Math.min(totalQuestions, customPool.length)));
  } else if (type === 'mock') {
    const syllabusWeights = {
      '1': 20,
      '2': 22,
      '3': 42,
      '4': 14,
      '5': 2
    };
    const questionPools = {
      '1': [],
      '2': [],
      '3': [],
      '4': [],
      '5': []
    };

    // Populate question pools from all chapters except specimen_exam
    chapters.forEach(chapter => {
      if (chapter.id === 'specimen_exam') return;
      mcqOnly(chapter.questions).forEach(q => {
        if (q.loId) {
          const lo = q.loId.split('.')[0];
          if (questionPools[lo]) {
            questionPools[lo].push(tagQuestionsWithChapter([q], chapter.id)[0]);
          }
        }
      });
    });

    // Select questions based on syllabus weights
    Object.keys(syllabusWeights).forEach(lo => {
      if (questionPools[lo]) {
        const numQuestions = syllabusWeights[lo];
        allQuestions.push(...sampleFromPool(questionPools[lo], numQuestions));
      }
    });
    
    // Shuffle the final 100-question exam
    allQuestions = sampleFromPool(allQuestions, allQuestions.length);

  } else if (type === 'quick_quiz') {
    const allMcqs = chapters.filter(c => c.id !== 'specimen_exam').flatMap(c => tagQuestionsWithChapter(mcqOnly(c.questions), c.id));
    allQuestions.push(...sampleFromPool(allMcqs, totalQuestions));
  } else if (type === 'specimen') {
      const specimenChapter = chapters.find(c => c.id === 'specimen_exam');
      if (specimenChapter) {
        allQuestions.push(...tagQuestionsWithChapter(mcqOnly(specimenChapter.questions), 'specimen_exam'));
      }
  } else { // module quiz
    const chapter = chapters.find(c => c.id === chapterId);
    if (chapter) {
      const poolAll = tagQuestionsWithChapter(mcqOnly(chapter?.questions), chapter.id);
      allQuestions.push(...sampleFromPool(poolAll, Math.min(totalQuestions, poolAll.length)));
    }
  }

  const uniq = new Map();
  allQuestions.forEach((q) => {
    const key = q.id || `${q.question}::${JSON.stringify(q.options)}`;
    if (!uniq.has(key)) uniq.set(key, q);
  });
  
  return sampleFromPool(Array.from(uniq.values()), totalQuestions);
}

function showToast(message, duration = 3000) {
  const toast = document.createElement('div');
  toast.className = 'fixed bottom-5 right-5 bg-neutral-800 text-white py-2 px-4 rounded-lg shadow-lg z-50 animate-pulse';
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
      toast.classList.remove('animate-pulse');
  }, 100);

  setTimeout(() => {
    toast.remove();
  }, duration);
}

function render() {
  const root = state.root || qs("#app");
  root.innerHTML = "";

  // Render resume button outside the main app container so it persists
  renderResumeButton();

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
      pageTitle = `Learning - ${state.flashcardSession.isCrossChapter ? 'All Due Cards' : chapter.title}`;
      break;
    case SCREEN.QUIZ:
      screenEl = renderQuiz();
      pageTitle = `Quiz - ${state.quizType === 'mock' ? 'Mock Exam' : state.quizType === 'specimen' ? 'Specimen Exam' : state.quizType === 'quick_quiz' ? 'Quick Quiz' : (chapter?.title || 'Quiz')}`;
      break;
    case SCREEN.RESULTS:
      screenEl = renderResults();
      pageTitle = `Results - ${state.quizType === 'mock' ? 'Mock Exam' : state.quizType === 'specimen' ? 'Specimen Exam' : state.quizType === 'quick_quiz' ? 'Quick Quiz' : (chapter?.title || 'Quiz')}`;
      break;
    case SCREEN.PROGRESS:
      screenEl = renderProgress();
      pageTitle = "My Progress";
      break;
    case SCREEN.MANAGE:
      screenEl = renderManageCards();
      pageTitle = `Manage Cards - ${chapter.title}`;
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

function renderResumeButton() {
    const container = qs('#resume-container');
    const progress = progressService.getProgress();
    const lastActivity = progress.lastActivity;

    if (!lastActivity || !container) {
        if (container) container.innerHTML = '';
        return;
    }

    let text = 'Resume Last Activity';
    if (lastActivity.type === 'quiz') {
        text = `Resume Quiz: ${lastActivity.chapter}`;
    } else if (lastActivity.type === 'flashcards') {
        text = `Resume Flashcards: ${lastActivity.chapter}`;
    }

    container.innerHTML = `
        <button id="resume-activity-btn" class="btn bg-amber-500 hover:bg-amber-600 w-full md:w-auto my-4">
            ↩️ ${text}
        </button>
    `;
}

function renderTopics() {
  const wrap = document.createElement("section");
  wrap.className = "screen screen-topics";

  // --- Data Fetching ---
  const chapters = getChaptersFromGlobal();
  const progress = progressService.getProgress();
  const dueCardsCount = progressService.getAllDueCards().length;
  const { weaknesses } = progressService.analyzePerformance();

  const chapterTitleMap = chapters.reduce((acc, ch) => {
    acc[ch.id] = ch.title;
    return acc;
  }, {});

  // --- HTML Generation ---

  let personalizedGreeting = `<p class="mt-4 max-w-2xl mx-auto text-lg md:text-xl text-neutral-300">
      What would you like to do next?
    </p>`;

  if (dueCardsCount > 0) {
    let weaknessText = '';
    if (weaknesses.length > 0) {
      const topWeakness = weaknesses[0];
      const chapterTitle = chapterTitleMap[topWeakness.chapterId] || topWeakness.chapterId;
      weaknessText = ` Your weakest area is '${chapterTitle.replace(/Chapter \d+: /,'')}'`;
    }
    personalizedGreeting = `<p class="mt-4 max-w-2xl mx-auto text-lg md:text-xl text-neutral-300">
      Welcome back. You have <strong>${dueCardsCount} card${dueCardsCount === 1 ? '' : 's'}</strong> due for review.${weaknessText}
    </p>`;
  }

  let recommendedActionHTML = '';
  if (dueCardsCount > 0) {
     recommendedActionHTML = `
      <div class="mb-2 text-center">
          <button id="study-due-cards" class="btn btn-primary !bg-green-600 hover:!bg-green-700 text-lg !px-8 !py-4 w-full max-w-md">
              📚 Study All Due Flashcards (${dueCardsCount})
          </button>
      </div>`;
  } else if (weaknesses.length > 0) {
    const topWeakness = weaknesses[0];
    const chapterTitle = chapterTitleMap[topWeakness.chapterId] || topWeakness.chapterId;
    recommendedActionHTML = `
      <div class="mt-6 text-center">
        <h3 class="text-lg font-semibold text-neutral-300 mb-2">No cards due! Let's tackle your weakest area:</h3>
        <button class="topic-card !bg-white/10 w-full max-w-md mx-auto actionable-weakness" data-chapter-id="${topWeakness.chapterId}">
          <div class="topic-card__title">Review: ${chapterTitle}</div>
          <div class="topic-card__meta">Your score in this chapter is ${Math.round(topWeakness.percentage)}%. Let's improve it!</div>
        </button>
         <p class="text-neutral-400 mt-4">Or,</p>
         <button class="btn btn-secondary mt-2" id="quick-practice-quiz">Take a 10-Question Practice Quiz</button>
      </div>
    `;
    
  } else {
     recommendedActionHTML = `
      <div class="mt-6 text-center">
        <h3 class="text-lg font-semibold text-neutral-300 mb-2">You have no cards due for review!</h3>
        <p class="text-neutral-400">Why not start a new topic or take a practice quiz?</p>
        <button class="btn btn-secondary mt-4" id="quick-practice-quiz">Take a 10-Question Practice Quiz</button>
      </div>
    `;
  }
    
  // Main structure
  // inside the renderTopics function in js/main.js
  // ... (logic for personalizedGreeting and recommendedActionHTML) ...
  wrap.innerHTML = `
    <div class="text-center py-8 md:py-12">
      <h1 class="text-3xl md:text-4xl font-bold text-white focus:outline-none" tabindex="-1">Your All-in-One CII W01 Exam Prep</h1>
        ${personalizedGreeting}
    </div>
    
    <div class="max-w-xl mx-auto mt-8">
      ${recommendedActionHTML}
    </div>
    
    <div class="mt-12 text-center">
        <p class="text-neutral-400 mb-4">Or, choose another option:</p>
        <div class="mode-switch mx-auto">
          <button class="btn" data-mode="${MODE.MODULE}" aria-pressed="${state.mode === MODE.MODULE}">Study by Chapter</button>
          <button class="btn" data-mode="${MODE.MOCK}" aria-pressed="${state.mode === MODE.MOCK}">Mock Exam</button>
          <button class="btn" data-mode="${MODE.SPECIMEN}" aria-pressed="${state.mode === MODE.SPECIMEN}">Specimen Exam</button>
        </div>
    </div>
    <div class="topics-grid mt-8" role="list"></div>
  `;

  const grid = qs(".topics-grid", wrap);
  const chaptersToDisplay = chapters.filter(ch => ch.id !== 'specimen_exam');

  if (state.mode === MODE.MOCK) {
    grid.style.display = 'none';
    const card = document.createElement("button");
    card.className = "topic-card max-w-md mx-auto mt-8 block w-full";
    card.setAttribute("role", "listitem");
    card.innerHTML = `
      <div class="topic-card__title">Start Mock Exam</div>
      <div class="topic-card__meta">100 questions • 2 hours • Weighted</div>
    `;
    qs(".mode-switch", wrap).after(card);
  } else if (state.mode === MODE.SPECIMEN) {
    grid.style.display = 'none';
    const card = document.createElement("button");
    card.className = "topic-card max-w-md mx-auto mt-8 block w-full";
    card.setAttribute("role", "listitem");
    card.innerHTML = `
      <div class="topic-card__title">Start Official Specimen Exam</div>
      <div class="topic-card__meta">100 questions • Official Specimen</div>
    `;
    qs(".mode-switch", wrap).after(card);
  } else {
    chaptersToDisplay.forEach((ch) => {
      const chapterProgress = progress.chapters[ch.id];
      const mastery = chapterProgress ? Math.round(chapterProgress.mastery * 100) : 0;
      const card = document.createElement("button");
      card.className = "topic-card";
      card.setAttribute("role", "listitem");
      card.dataset.chapterId = ch.id;
      card.innerHTML = `
          <div class="flex justify-between items-start">
            <div class="topic-card__title">${ch.title || ch.id}</div>
            <div class="text-sm font-bold text-amber-400">${mastery}%</div>
          </div>
          <div class="w-full bg-neutral-700 rounded-full h-2.5 mt-2">
            <div class="bg-amber-400 h-2.5 rounded-full" style="width: ${mastery}%"></div>
          </div>
          <div class="topic-card__meta mt-2">Flashcards & Quizzes</div>
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
  const { strengths, weaknesses } = progressService.analyzePerformance();
  const allChaptersData = getChaptersFromGlobal();

  const chapterTitleMap = allChaptersData.reduce((acc, ch) => {
    acc[ch.id] = ch.title.replace(/Chapter \d+: /g, '');
    return acc;
  }, {});

  const chapterMasteries = Object.values(progress.chapters).map(ch => ch.mastery);
  const overallMastery = chapterMasteries.length > 0 ?
    (chapterMasteries.reduce((a, b) => a + b, 0) / chapterMasteries.length) * 100 :
    0;

  const streak = progress.studyStreak || { current: 0, longest: 0 };

  const renderPerfList = (items, type) => {
    if (items.length === 0) {
        return `<p class="text-neutral-500 text-sm">Not enough quiz data to determine your ${type}. Complete some more quizzes!</p>`;
    }
    const isWeakness = type === 'weaknesses';
    return `<ul class="space-y-2">` + items.map(item => `
        <li class="${isWeakness ? 'actionable-weakness' : ''} flex justify-between items-center text-sm p-2 rounded-lg ${isWeakness ? 'cursor-pointer hover:bg-white/10' : ''}" ${isWeakness ? `data-chapter-id="${item.chapterId}"` : ''}>
            <span class="text-neutral-300">${chapterTitleMap[item.chapterId] || item.chapterId}</span>
            <span class="font-semibold ${type === 'strengths' ? 'text-green-400' : 'text-red-400'}">${Math.round(item.percentage)}% ${isWeakness ? '➔' : ''}</span>
        </li>
    `).join('') + `</ul>`;
  };

  wrap.innerHTML = `
    <div class="flex justify-between items-center mb-6">
        <h1 class="text-3xl font-bold text-white">My Progress</h1>
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-1 grid grid-cols-2 lg:grid-cols-1 gap-6">
            <div class="card text-center bg-white/5 border border-white/10">
                <h2 class="text-lg font-semibold text-neutral-300">Mastery</h2>
                <p class="text-6xl font-bold text-amber-400 my-2">${Math.round(overallMastery)}%</p>
                <p class="text-xs text-neutral-400">Based on Flashcards</p>
            </div>
            <div class="card text-center bg-white/5 border border-white/10">
                <h2 class="text-lg font-semibold text-neutral-300">Study Streak</h2>
                <p class="text-6xl font-bold text-amber-400 my-2">${streak.current} ${streak.current === 1 ? 'day' : 'days'}</p>
                <p class="text-xs text-neutral-400">Longest: ${streak.longest}</p>
            </div>
            <div class="col-span-2 lg:col-span-1 card bg-white/5 border border-white/10">
                <h3 class="text-lg font-semibold text-neutral-300 mb-3">Strengths</h3>
                ${renderPerfList(strengths, 'strengths')}
            </div>
             <div class="col-span-2 lg:col-span-1 card bg-white/5 border border-white/10">
                <h3 class="text-lg font-semibold text-neutral-300 mb-3">Chapters to Review</h3>
                ${renderPerfList(weaknesses, 'weaknesses')}
            </div>
        </div>
        <div class="lg:col-span-2 card bg-white/5 border border-white/10">
            <h2 class="text-lg font-semibold text-neutral-300 mb-4">Mastery by Chapter</h2>
            <div class="min-h-[300px]"><canvas id="mastery-chart"></canvas></div>
        </div>
        <div class="lg:col-span-3 card bg-white/5 border border-white/10">
            <h2 class="text-lg font-semibold text-neutral-300 mb-4">Recent Activity</h2>
            <div id="activity-log" class="space-y-3"></div>
             <button id="open-reset-modal" class="btn bg-red-600 hover:bg-red-700 mt-6">Reset All Progress</button>
        </div>
    </div>
  `;

  const activityLog = qs('#activity-log', wrap);
  if (progress.recentActivity.length > 0) {
    progress.recentActivity.forEach(act => {
      const actEl = document.createElement('div');
      actEl.className = 'text-neutral-300 text-sm flex justify-between items-center';
      const activityText = act.type === 'quiz' ? `Completed Quiz: ${act.chapter}` : `Studied Flashcards: ${act.chapter}`;
      const scoreText = act.score ? `Score: ${act.score}` : '';
      actEl.innerHTML = `
          <p>${activityText}</p>
          <div class="text-right">
              <p>${scoreText}</p>
              <p class="text-neutral-500 text-xs">${new Date(act.date).toLocaleDateString()}</p>
          </div>
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
  const allChapters = getChaptersFromGlobal().filter(c => c.id !== 'specimen_exam');
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
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
       scales: {
          y: {
              beginAtZero: true,
              grid: { display: false },
              ticks: { color: '#e9ecef', font: { size: 12 } }
          },
          x: {
              max: 100,
              grid: { color: 'rgba(255,255,255,0.1)' },
              ticks: { color: '#9ca3af', font: { size: 12 } }
          }
      },
      plugins: {
          legend: { display: false }
      }
    }
  });
}

async function getAiExplanation(term, definition, promptType, container) {
  const progress = progressService.getProgress();
  const card = state.flashcardSession.cards[state.flashcardSession.currentIndex];
  const cardId = card.id;
  const chapterId = card.chapterId || state.selectedChapterId;

  const cached = progress.chapters[chapterId]?.flashcards[cardId]?.aiExplanations?.[promptType];

  if (cached) {
    container.innerHTML = `<p class="text-amber-300">${cached}</p>`;
    return;
  }

  container.innerHTML = '<p class="text-neutral-400 animate-pulse">🤖 Gemini is thinking...</p>';
  qsa('[data-prompt]').forEach(b => b.disabled = true);
  try {
    const response = await fetch('/.netlify/functions/getAiExplanation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        term,
        definition,
        promptType
      }),
    });
    if (!response.ok) throw new Error(`Server error: ${response.statusText}`);
    const data = await response.json();
    const formattedText = data.explanation
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
    container.innerHTML = `<p class="text-amber-300">${formattedText}</p>`;
    progressService.cacheAiExplanation(chapterId, cardId, promptType, formattedText);
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
            <p class="text-neutral-300 mb-8">You've reviewed all the cards for this session.</p>
            <button id="back-btn" class="btn-ghost">Back to Topics</button>
            <button id="quiz-btn" class="btn btn-primary ml-4">Take Chapter Quiz</button>
        </div>
        `;
    return wrap;
  }

  const progress = progressService.getProgress();
  const chapterId = card.chapterId || state.selectedChapterId;
  const chapterProgress = progress.chapters[chapterId] || {
    flashcards: {}
  };
  const cardProgress = chapterProgress.flashcards[card.id] || {};
  const noteText = cardProgress.note || '';

  const termSide = `
        <div class="text-center text-3xl font-bold text-white">${card.term}</div>
        <button class="btn mt-8 bg-amber-500 hover:bg-amber-600" id="reveal-btn">Reveal Answer</button>
    `;

  const definitionSide = `
    <div class="flex flex-col h-full">
      <div class="flex-grow text-xl font-medium text-neutral-200 text-center flex items-center justify-center">${card.definition}</div>
      <div class="flex-shrink-0 mt-6 w-full max-w-2xl mx-auto">
        <div class="deep-dive-container">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button class="btn-ghost bg-black/20 hover:bg-black/40 text-amber-300 border-amber-400/30 text-base font-semibold !py-3" data-prompt="simplify">✨ Explain Simply</button>
              <button class="btn-ghost bg-black/20 hover:bg-black/40 text-amber-300 border-amber-400/30 text-base font-semibold !py-3" data-prompt="scenario">🏡 Real-World Scenario</button>
          </div>
          <div id="ai-response" class="mt-3 p-4 bg-black/20 rounded-lg min-h-[60px] text-sm"></div>
        </div>
        <div class="mt-4">
            <label for="flashcard-notes" class="text-sm text-neutral-400">My Notes:</label>
            <textarea id="flashcard-notes" class="w-full mt-1 p-2 rounded bg-neutral-800 border border-neutral-700 text-white focus:ring-amber-500 focus:border-amber-500" rows="3" placeholder="Add your personal notes here...">${noteText}</textarea>
        </div>
      </div>
    </div>
    `;

  let cardStatus = 'new';
  if (cardProgress) {
    if (cardProgress.confidence >= 4) cardStatus = 'mastered';
    else if (cardProgress.confidence >= 2) cardStatus = 'learning';
    else cardStatus = 'new';
  }

  const statusClasses = {
    new: 'border-blue-500',
    learning: 'border-orange-500',
    mastered: 'border-green-500'
  };

  const chapterTitle = card.chapterTitle ? `<div class="text-xs text-amber-400">${card.chapterTitle.replace('Chapter X: ','')}</div>` : '';

  wrap.innerHTML = `
        <div class="flex justify-between items-center text-sm text-neutral-400 mb-4">
            <button id="back-btn" class="btn-ghost !p-2">&larr; Topics</button>
            <div>
                <button id="manage-cards-btn" class="btn-ghost !p-2">Manage Cards</button>
                <span class="ml-4">Cards remaining: ${session.cards.length - session.currentIndex}</span>
            </div>
        </div>
        <div id="flashcard" class="card max-w-3xl mx-auto bg-brand-dark border-white/10 min-h-[500px] flex flex-col p-8 border-2 ${statusClasses[cardStatus]}">
            <div class="flex-grow w-full flex flex-col items-center justify-center">
              ${session.isFlipped ? chapterTitle : ''}
              ${session.isFlipped ? definitionSide : termSide}
            </div>
            <div id="controls" class="flex-shrink-0 w-full mt-auto pt-6"></div>
        </div>
    `;

  const controls = qs('#controls', wrap);
  if (session.isFlipped) {
    controls.innerHTML = `
        <div class="text-center text-neutral-400 mb-4">How well did you know this? (1-5)</div>
        <div class="grid grid-cols-5 gap-3">
            <button data-confidence="1" class="confidence-btn bg-gradient-to-br from-red-500 to-red-700 text-white font-semibold py-3 px-2 rounded-xl transition transform hover:scale-105 active:scale-100" title="Forgot">Forgot</button>
            <button data-confidence="2" class="confidence-btn bg-gradient-to-br from-orange-400 to-orange-600 text-white font-semibold py-3 px-2 rounded-xl transition transform hover:scale-105 active:scale-100" title="Hard">Hard</button>
            <button data-confidence="3" class="confidence-btn bg-gradient-to-br from-yellow-400 to-yellow-600 text-white font-semibold py-3 px-2 rounded-xl transition transform hover:scale-105 active:scale-100" title="Good">Good</button>
            <button data-confidence="4" class="confidence-btn bg-gradient-to-br from-green-400 to-green-600 text-white font-semibold py-3 px-2 rounded-xl transition transform hover:scale-105 active:scale-100" title="Easy">Easy</button>
            <button data-confidence="5" class="confidence-btn bg-gradient-to-br from-blue-500 to-blue-700 text-white font-semibold py-3 px-2 rounded-xl transition transform hover:scale-105 active:scale-100" title="Perfect">Perfect</button>
        </div>
        `;

    const notesInput = qs('#flashcard-notes', wrap);
    notesInput.addEventListener('blur', () => {
      progressService.saveFlashcardNote(chapterId, card.id, notesInput.value);
      showToast('Note saved!');
    });

  } else {
     controls.innerHTML = ``;
  }

  return wrap;
}

function renderQuiz() {
  const wrap = document.createElement("section");
  wrap.className = "screen screen-quiz";
  const q = state.questions[state.currentIndex];
  const progressPercent = ((state.currentIndex + 1) / state.questions.length) * 100;

  const quizNavHTML = FEATURE_FLAG_QUESTION_FLAGGING ? renderQuizNavigation() : '';
  const quizNavToggleHTML = FEATURE_FLAG_QUESTION_FLAGGING ? `
    <button class="btn btn-ghost !p-2 lg:hidden" id="toggle-quiz-nav">
      <svg class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
      <span class="sr-only">Toggle Question Grid</span>
    </button>
    ` : '<div></div>';
    
  let timerHTML = '';
  if (state.quizType === 'mock' || state.quizType === 'specimen') {
      timerHTML = `<div id="timer" class="text-xl font-bold text-amber-400"></div>`;
  }

  wrap.innerHTML = `
    <div class="toolbar flex justify-between items-center">
      <button class="btn btn-ghost" id="quit-quiz">&larr; Exit</button>
      <h1 class="screen-title text-xl font-bold text-white" tabindex="-1">Q ${state.currentIndex + 1}/${state.questions.length}</h1>
      ${timerHTML}
      ${quizNavToggleHTML}
    </div>
    <div id="pre-exam-notice" class="card text-center bg-amber-500/10 border-amber-500/50 text-amber-200 my-4"></div>
    <div class="w-full bg-neutral-700 rounded-full h-2.5 mt-4">
        <div class="bg-brand h-2.5 rounded-full" style="width: ${progressPercent}%"></div>
    </div>
    <div class="flex justify-between items-center text-sm text-neutral-400 mt-2">
        <span>Progress</span>
        <span>${Math.round(progressPercent)}%</span>
    </div>

    <div class="quiz-layout mt-6">
        <div class="question-container">
            <article class="question-card card" aria-live="polite">
              <div class="flex justify-between items-start">
                <h2 class="question-text text-lg md:text-xl font-semibold text-neutral-800 dark:text-white">${q?.text || q?.question || "Question text missing"}</h2>
                ${FEATURE_FLAG_QUESTION_FLAGGING ? renderFlagButton(q.id) : ''}
              </div>
              <div class="options mt-6 space-y-3" role="radiogroup" aria-label="Answer options"></div>
              <div id="explanation-container" class="explanation-card" hidden></div>
            </article>
            <div class="quiz-actions mt-6 text-right">
              <button class="btn" id="try-again-btn" hidden>Try Again</button>
              <button class="btn" id="next-btn" hidden>Next Question &rarr;</button>
              <button class="btn btn-primary" id="finish-btn" hidden>Finish Quiz</button>
            </div>
        </div>
        
        ${quizNavHTML}
    </div>
  `;

  const noticeEl = qs("#pre-exam-notice", wrap);
  if (state.quizType === 'mock' || state.quizType === 'specimen') {
      noticeEl.innerHTML = `<p class="font-bold">This is a timed 2-hour exam simulation. The test will automatically submit when the timer runs out. Good luck!</p>`;
  } else {
      noticeEl.style.display = 'none';
  }

  const optionsEl = qs(".options", wrap);
  const explanationEl = qs("#explanation-container", wrap);
  const nextBtn = qs("#next-btn", wrap);
  const finishBtn = qs("#finish-btn", wrap);
  const tryAgainBtn = qs("#try-again-btn", wrap);
  const isLastQuestion = state.currentIndex === state.questions.length - 1;
  const chapter = getChaptersFromGlobal().find(c => c.id === q.chapterId);
  const userAnswer = state.answers[state.currentIndex];
  const isCorrect = userAnswer?.correct;

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
      label.classList.add('is-disabled');
      const correctIndex = q.correctIndex ?? q.options.indexOf(q.correctAnswer);
      if (idx === correctIndex) {
        label.classList.add('is-correct');
      } else if (idx === userAnswer?.selectedIndex) {
        label.classList.add('is-incorrect');
      }
    }
    optionsEl.appendChild(label);
  });

  if (state.questionState === Q_STATE.ANSWERED) {
    const loIdText = q.loId ? `<span class="text-xs text-neutral-500 dark:text-neutral-400 block mt-2">Syllabus LO: ${q.loId}</span>` : '';
    let explanationText = q.explanation || 'No explanation provided.';
    if (!q.explanation && chapter) {
        explanationText = 'No explanation provided. For more information, please see W01 ' + chapter.title + '.';
    }
    explanationEl.innerHTML = `<p class="text-neutral-800 dark:text-white"><strong>Explanation:</strong> ${explanationText}</p>${loIdText}`;
    explanationEl.hidden = false;
    
    if (state.studyMode && !isCorrect) {
        tryAgainBtn.hidden = false;
    } else if (isLastQuestion) {
      finishBtn.hidden = false;
    } else {
      nextBtn.hidden = false;
    }
  }

  if (state.questionState === Q_STATE.UNANSWERED) {
    announce("New question loaded.");
  } else {
    const resultText = isCorrect ? 'Correct.' : 'Incorrect.';
    announce(resultText);
  }
  
  if (state.isQuizNavVisible) {
    qs('.quiz-nav-panel', wrap)?.classList.add('is-visible');
  }

  return wrap;
}


function renderFlagButton(questionId) {
  const isFlagged = state.flaggedQuestions.has(questionId);
  // [ACCESSIBILITY] aria-pressed is correctly toggled here via re-render
  return `
        <button type="button" class="flag-btn" id="flag-btn" data-question-id="${questionId}" aria-pressed="${isFlagged}" title="${isFlagged ? 'Remove flag (F)' : 'Mark for review (F)'}">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path fill-rule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm3 1a1 1 0 00-1 1v5h10l-3-4 3-4H7V4a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>
        </button>
    `;
}

function renderQuizNavigation() {
  const navItems = state.questions.map((q, idx) => {
    const isCurrent = idx === state.currentIndex;
    const isFlagged = state.flaggedQuestions.has(q.id);
    const answerInfo = state.answers[idx]; // Get answer details

    let itemClass = 'quiz-nav-item';
    if (isCurrent) itemClass += ' is-current';

    if (answerInfo) {
      if (answerInfo.correct) {
        itemClass += ' is-answered-correct';
      } else {
        itemClass += ' is-answered-incorrect';
      }
    }

    const flagMarker = isFlagged ?
      '<svg class="flag-marker" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm3 1a1 1 0 00-1 1v5h10l-3-4 3-4H7V4a1 1 0 00-1-1z"/></svg>' :
      '';

    return `
            <button class="${itemClass}" data-index="${idx}" aria-label="Question ${idx + 1}">
                ${idx + 1}
                ${flagMarker}
            </button>
        `;
  }).join('');

  return `
        <aside class="quiz-nav-panel">
            <h3 class="quiz-nav-header">Questions (${state.flaggedQuestions.size} Flagged)</h3>
            <div class="quiz-nav-grid" id="quiz-nav-grid">
                ${navItems}
            </div>
        </aside>
    `;
}

function renderResults() {
  const wrap = document.createElement("section");
  wrap.className = "screen screen-results";
  const total = state.questions.length || 0;
  const correct = state.answers.filter((a) => a?.correct).length;
  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
  
  const incorrectCount = total - correct;
  const flaggedCount = state.flaggedQuestions.size;

  let performanceBreakdownHTML = '';
    if (state.quizType === 'mock') {
        const performanceByLO = {};
        state.questions.forEach((q, idx) => {
            const lo = q.loId.split('.')[0];
            if (!performanceByLO[lo]) {
                performanceByLO[lo] = { correct: 0, total: 0 };
            }
            performanceByLO[lo].total++;
            if (state.answers[idx]?.correct) {
                performanceByLO[lo].correct++;
            }
        });

        performanceBreakdownHTML = `
            <div class="mt-8">
                <h2 class="section-title text-neutral-800 dark:text-white">Performance by Learning Outcome</h2>
                <div class="mt-4 space-y-2">
        `;
        for (const lo in performanceByLO) {
            const { correct, total } = performanceByLO[lo];
            const loPercentage = total > 0 ? Math.round((correct / total) * 100) : 0;
            performanceBreakdownHTML += `
                <div class="flex justify-between">
                    <span>Learning Outcome ${lo}</span>
                    <span>${correct}/${total} (${loPercentage}%)</span>
                </div>
            `;
        }
        performanceBreakdownHTML += `</div></div>`;
    }

  wrap.innerHTML = `
    <div class="card text-center">
      <h1 class="screen-title text-3xl text-neutral-800 dark:text-white" tabindex="-1">Quiz Complete!</h1>
      <p class="score text-6xl font-bold mt-4 text-brand">${percentage}%</p>
      <p class="text-xl muted mt-2">You scored <strong>${correct} / ${total}</strong></p>
      ${performanceBreakdownHTML}
      <div class="results-actions mt-8 flex justify-center gap-4">
        <button class="btn btn-primary" id="retry">Retry Quiz</button>
        <button class="btn btn-ghost" id="back">Back to Topics</button>
      </div>
    </div>
    <div class="mt-8">
      <div class="results-filter-container">
        <h2 class="section-title text-white">Review Your Answers</h2>
        <div class="flex items-center gap-2 rounded-xl bg-black/20 p-1">
          <button class="btn !min-h-0 text-sm" data-filter="all" aria-pressed="${state.resultsFilter === 'all'}">All (${total})</button>
          <button class="btn !min-h-0 text-sm" data-filter="incorrect" aria-pressed="${state.resultsFilter === 'incorrect'}">Incorrect (${incorrectCount})</button>
          <button class="btn !min-h-0 text-sm" data-filter="flagged" aria-pressed="${state.resultsFilter === 'flagged'}">Flagged (${flaggedCount})</button>
        </div>
      </div>
      <div class="results-list mt-4 space-y-6"></div>
    </div>
  `;

  // Apply active style to the current filter button
  const filterButtons = qsa('[data-filter]', wrap);
  filterButtons.forEach(btn => {
    if(btn.dataset.filter !== state.resultsFilter) {
      btn.classList.remove('bg-brand');
      btn.classList.add('bg-transparent', 'text-neutral-400');
    }
  });

  const listEl = qs('.results-list', wrap);
  let questionsToRender = state.questions;

  if (state.resultsFilter === 'incorrect') {
    questionsToRender = state.questions.filter((q, idx) => !state.answers[idx]?.correct);
  } else if (state.resultsFilter === 'flagged') {
    questionsToRender = state.questions.filter(q => state.flaggedQuestions.has(q.id));
  }
  
  if (questionsToRender.length === 0) {
    listEl.innerHTML = `<p class="text-neutral-400 text-center py-8">No questions to show for this filter.</p>`;
  }

  questionsToRender.forEach((q) => {
    const originalIndex = state.questions.findIndex(origQ => origQ.id === q.id);
    const answer = state.answers[originalIndex];
    const item = document.createElement('div');
    item.className = 'result-item card';
    const userChoice = (answer && answer.selectedIndex !== undefined) ? q.options[answer.selectedIndex] : 'Not answered';
    const correctIndex = q.correctIndex ?? q.options.indexOf(q.correctAnswer);
    const correctChoice = q.options[correctIndex];
    const isCorrect = answer?.correct;

    const isFlagged = state.flaggedQuestions.has(q.id);
    const flagIndicator = FEATURE_FLAG_QUESTION_FLAGGING && isFlagged ?
      `<svg class="inline-block w-5 h-5 ml-2 text-amber-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm3 1a1 1 0 00-1 1v5h10l-3-4 3-4H7V4a1 1 0 00-1-1z"/></svg>` :
      '';
    const loIdText = q.loId ? `<span class="text-xs text-neutral-500 dark:text-neutral-400 block mt-2">Syllabus LO: ${q.loId}</span>` : '';

    item.innerHTML = `
      <p class="result-item__question text-neutral-800 dark:text-white">${originalIndex + 1}. ${q.question} ${flagIndicator}</p>
      <div class="result-item__answer mt-3 space-y-2">
        <p class="${isCorrect ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}">
          <strong>Your answer:</strong> ${userChoice} ${isCorrect ? '✔' : '❌'}
        </p>
        ${!isCorrect ? `<p class="text-green-600 dark:text-green-500"><strong>Correct answer:</strong> ${correctChoice}</p>` : ''}
        <div class="explanation-card !mt-3">
          <p><strong>Explanation:</strong> ${q.explanation}</p>
          ${loIdText}
        </div>
      </div>
    `;
    listEl.appendChild(item);
  });
  return wrap;
}

function renderManageCards() {
  const wrap = document.createElement('section');
  wrap.className = 'screen screen-manage';
  const progress = progressService.getProgress();
  const chapters = getChaptersFromGlobal();
  const chapter = chapters.find(c => c.id === state.selectedChapterId);

  wrap.innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <h1 class="text-3xl font-bold text-white">Manage Cards: ${chapter.title}</h1>
            <button id="back-to-learning" class="btn-ghost">Back to Learning</button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6" id="manage-board">
            <div class="p-4 bg-white/5 rounded-lg" data-status="new">
                <h2 class="font-bold text-lg text-blue-400 mb-4">New</h2>
                <div class="space-y-2 card-list"></div>
            </div>
            <div class="p-4 bg-white/5 rounded-lg" data-status="learning">
                <h2 class="font-bold text-lg text-orange-400 mb-4">Learning</h2>
                <div class="space-y-2 card-list"></div>
            </div>
            <div class="p-4 bg-white/5 rounded-lg" data-status="mastered">
                <h2 class="font-bold text-lg text-green-400 mb-4">Mastered</h2>
                <div class="space-y-2 card-list"></div>
            </div>
        </div>
    `;

  const board = qs('#manage-board', wrap);
  const chapterProgress = progress.chapters[chapter.id] || {
    flashcards: {}
  };

  chapter.flashcards.forEach(card => {
    const cardProgress = chapterProgress.flashcards[card.id];
    const status = cardProgress?.status || 'new';

    const cardEl = document.createElement('div');
    cardEl.className = 'p-3 bg-neutral-800 rounded cursor-pointer';
    cardEl.textContent = card.term;
    cardEl.dataset.cardId = card.id;
    cardEl.draggable = true;

    board.querySelector(`[data-status="${status}"] .card-list`).appendChild(cardEl);
  });

  return wrap;
}


function handleAppClick(event) {
  const {
    target
  } = event;
  const chapters = getChaptersFromGlobal();

  if (target.closest('.nav-link')) {
    const screen = target.closest('.nav-link').dataset.screen;
    state.screen = screen;
    render();
    return;
  }
  
  if (target.closest('#quick-practice-quiz')) {
        const questions = buildQuiz({ chapters, type: 'quick_quiz', totalQuestions: 10 });
        startQuiz(questions, { type: 'quick_quiz', config: { totalQuestions: 10 } });
        return;
    }
    
  // --- [FEATURE] Quick Start Modal Logic ---
  if (target.closest('#close-welcome-modal')) {
    qs('#welcome-modal').classList.add('hidden');
    progressService.setHasSeenWelcome();
    return;
  }
  if (target.closest('#quick-start-due')) {
    qs('#welcome-modal').classList.add('hidden');
    progressService.setHasSeenWelcome();
    startDueFlashcardsSession();
    return;
  }
  if (target.closest('#quick-start-quiz')) {
    qs('#welcome-modal').classList.add('hidden');
    progressService.setHasSeenWelcome();
    const questions = buildQuiz({ chapters, type: 'quick_quiz', totalQuestions: 10 });
    startQuiz(questions, { type: 'quick_quiz', config: { totalQuestions: 10 } });
    return;
  }
  if (target.closest('#quick-start-mock')) {
    qs('#welcome-modal').classList.add('hidden');
    progressService.setHasSeenWelcome();
    const questions = buildQuiz({ chapters, type: 'mock', totalQuestions: 100 });
    startQuiz(questions, { type: 'mock', config: { totalQuestions: 100 } });
    return;
  }
  // --- End Quick Start Logic ---

  // --- [FEATURE] Resume Activity ---
  if (target.closest('#resume-activity-btn')) {
    const lastActivity = progressService.getProgress().lastActivity;
    if (lastActivity) {
      if (lastActivity.type === 'quiz') {
        const questions = buildQuiz({ chapters, ...lastActivity.config });
        startQuiz(questions, lastActivity);
      } else if (lastActivity.type === 'flashcards') {
        const chapter = chapters.find(c => c.id === lastActivity.chapterId);
        if (chapter) startFlashcardSession(chapter);
      } else if (lastActivity.type === 'due-flashcards') {
        startDueFlashcardsSession();
      }
    }
  }

  // --- [FEATURE] Study All Due Cards Button ---
  if (target.closest('#study-due-cards')) {
      startDueFlashcardsSession();
      return;
  }

  const topicCard = target.closest('.topic-card');
  if (topicCard) {
    if (state.mode === MODE.MOCK) {
      const questions = buildQuiz({
        chapters,
        type: 'mock',
        totalQuestions: 100
      });
      startQuiz(questions, {
        type: 'mock',
        config: {
          totalQuestions: 100
        }
      });
    } else if (state.mode === MODE.SPECIMEN) {
      const questions = buildQuiz({
        chapters,
        type: 'specimen',
        totalQuestions: 100
      });
      startQuiz(questions, {
        type: 'specimen',
        config: {
          totalQuestions: 100
        }
      });
    } else {
      state.selectedChapterId = topicCard.dataset.chapterId;
      const chapter = chapters.find(c => c.id === state.selectedChapterId);
      startFlashcardSession(chapter);
    }
  }

  if (FEATURE_FLAG_QUESTION_FLAGGING && target.closest('#flag-btn')) {
    const btn = target.closest('#flag-btn');
    const questionId = btn.dataset.questionId;
    const isCurrentlyFlagged = state.flaggedQuestions.has(questionId);

    if (isCurrentlyFlagged) {
      state.flaggedQuestions.delete(questionId);
      announce("Flag removed.");
    } else {
      state.flaggedQuestions.add(questionId);
      announce("Flag added.");
    }

    progressService.updateFlagStatus(state.quizAttemptId, questionId, !isCurrentlyFlagged);
    render();
    return;
  }
  
  if (target.id === 'toggle-quiz-nav') {
    state.isQuizNavVisible = !state.isQuizNavVisible;
    render();
    return;
  }


  if (FEATURE_FLAG_QUESTION_FLAGGING && target.closest('.quiz-nav-item')) {
    const navItem = target.closest('.quiz-nav-item');
    const index = parseInt(navItem.dataset.index, 10);
    if (index >= 0 && index < state.questions.length && index !== state.currentIndex) {
      state.currentIndex = index;
      state.questionState = state.answers[index] ? Q_STATE.ANSWERED : Q_STATE.UNANSWERED;
      render();
    }
    return;
  }

  // --- [FEATURE] Actionable Progress Screen ---
  if (target.closest('.actionable-weakness')) {
    const chapterId = target.closest('.actionable-weakness').dataset.chapterId;
    const chapter = chapters.find(c => c.id === chapterId);
    if (chapter) {
      const qsList = buildQuiz({ chapters, type: 'module', chapterId: chapter.id, totalQuestions: 10 });
      startQuiz(qsList, { type: 'module', config: { chapterId: chapter.id, totalQuestions: 10 }, studyMode: true });
    }
    return;
  }

  if (target.id === 'back-btn' || target.id === 'back-to-topics-secondary') {
    state.screen = SCREEN.TOPICS;
    render();
  } else if (target.closest('.mode-switch .btn')) {
    state.mode = target.dataset.mode;
    render();
  }

  if (target.id === 'reveal-btn') {
    state.flashcardSession.isFlipped = true;
    render();
  } else if (target.closest('[data-prompt]')) {
    const btn = target.closest('[data-prompt]');
    const promptType = btn.dataset.prompt;
    const {
      term,
      definition
    } = state.flashcardSession.cards[state.flashcardSession.currentIndex];
    const responseContainer = qs('#ai-response');
    getAiExplanation(term, definition, promptType, responseContainer);
  } else if (target.closest('.confidence-btn')) {
    const btn = target.closest('.confidence-btn');
    const confidence = parseInt(btn.dataset.confidence, 10);
    const card = state.flashcardSession.cards[state.flashcardSession.currentIndex];
    const chapterId = card.chapterId || state.selectedChapterId;
    const chapter = chapters.find(c => c.id === chapterId);
    progressService.updateFlashcardConfidence(chapter.id, chapter.title, card.id, confidence);
    state.flashcardSession.currentIndex++;
    state.flashcardSession.isFlipped = false;
    const confidenceMap = {
      1: 'Forgot',
      2: 'Hard',
      3: 'Good',
      4: 'Easy',
      5: 'Perfect'
    };
    showToast(`Card marked as '${confidenceMap[confidence]}'`);
    render();
  } else if (target.id === 'quiz-btn') {
    const chapter = chapters.find(c => c.id === state.selectedChapterId);
    const qsList = buildQuiz({
      chapters,
      type: 'module',
      chapterId: chapter.id,
      totalQuestions: 15
    });
    startQuiz(qsList, {
      type: 'module',
      config: {
        chapterId: chapter.id,
        totalQuestions: 15
      },
      studyMode: true,
    });
  }

  if (target.closest('.option-label') && state.questionState === Q_STATE.UNANSWERED) {
    const label = target.closest('.option-label');
    const chosenIndex = parseInt(label.dataset.index, 10);
    const q = state.questions[state.currentIndex];
    const correctIndex = q.correctIndex ?? q.options.indexOf(q.correctAnswer);
    const isCorrect = chosenIndex === correctIndex;
    state.answers[state.currentIndex] = {
      qid: q.id,
      selectedIndex: chosenIndex,
      correct: isCorrect
    };
    state.questionState = Q_STATE.ANSWERED;
    render();
  } else if (target.id === 'try-again-btn') {
    state.questionState = Q_STATE.UNANSWERED;
    state.answers[state.currentIndex] = null; // Clear the previous incorrect answer
    render();
  } else if (target.id === 'next-btn') {
    state.currentIndex++;
    state.questionState = Q_STATE.UNANSWERED;
    render();
  } else if (target.id === 'finish-btn') {
    if (FEATURE_FLAG_QUESTION_FLAGGING && FLAGGING_CONFIG.enableWarningOnSubmit && state.flaggedQuestions.size > 0) {
      const modal = qs('#flag-submit-modal');
      const body = qs('#flag-submit-modal-body');
      body.textContent = `You have ${state.flaggedQuestions.size} flagged question(s). Are you sure you want to submit?`;
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    } else {
      handleQuizFinish();
    }
    return;
  } else if (target.id === 'quit-quiz') {
    if (state.quizTimer) {
        clearInterval(state.quizTimer);
        state.quizTimer = null;
    }
    // progressService.completeQuizAttempt(state.quizAttemptId); // Mark as abandoned - decided against saving incomplete
    Object.assign(state, {
      screen: SCREEN.TOPICS,
      questions: [],
      answers: [],
      currentIndex: 0,
      score: 0,
      quizType: null,
      quizConfig: {},
      quizAttemptId: null,
      flaggedQuestions: new Set()
    });
    render();
  }

  if (target.id === 'submit-anyway-btn') {
    qs('#flag-submit-modal').classList.add('hidden');
    handleQuizFinish();
    return;
  }
  if (target.id === 'review-flagged-btn') {
    qs('#flag-submit-modal').classList.add('hidden');
    const firstFlaggedIndex = state.questions.findIndex(q => state.flaggedQuestions.has(q.id));
    if (firstFlaggedIndex !== -1) {
      state.currentIndex = firstFlaggedIndex;
      state.questionState = state.answers[firstFlaggedIndex] ? Q_STATE.ANSWERED : Q_STATE.UNANSWERED;
      render();
    }
    return;
  }

  // --- [FEATURE] Results Screen Filter Logic ---
  if(target.closest('[data-filter]')) {
    const filter = target.closest('[data-filter]').dataset.filter;
    state.resultsFilter = filter;
    render(); // Re-render the results screen with the new filter
    return;
  }


  if (target.id === 'retry') {
    let newQuestions;
    const retryConfig = {
      type: state.quizType,
      config: state.quizConfig,
      studyMode: state.quizType === 'module',
    };
    if (state.quizType === 'specimen') {
       const chapters = getChaptersFromGlobal();
       newQuestions = buildQuiz({ chapters, type: 'specimen', totalQuestions: 100 });
    } else {
      newQuestions = buildQuiz({
        chapters,
        ...state.quizConfig
      });
    }
    startQuiz(newQuestions, retryConfig);
  } else if (target.id === 'back' && state.screen === SCREEN.RESULTS) {
    Object.assign(state, {
      screen: SCREEN.TOPICS,
      questions: [],
      answers: [],
      currentIndex: 0,
      score: 0,
      quizType: null,
      quizConfig: {},
      quizAttemptId: null,
      flaggedQuestions: new Set(),
      resultsFilter: 'all', // Reset filter
    });
    render();
  }

  if (target.id === 'manage-cards-btn') {
    state.screen = SCREEN.MANAGE;
    render();
  } else if (target.id === 'back-to-learning') {
    state.screen = SCREEN.LEARNING;
    render();
  }


  if (target.id === 'open-reset-modal') {
    qs('#reset-modal').classList.remove('hidden');
    qs('#reset-modal').classList.add('flex');
  } else if (target.id === 'cancel-reset') {
    qs('#reset-modal').classList.add('hidden');
    qs('#reset-modal').classList.remove('flex');
  } else if (target.id === 'confirm-reset') {
    progressService.resetProgress();
    qs('#reset-modal').classList.add('hidden');
    qs('#reset-modal').classList.remove('flex');
    render();
  }
}

function handleQuizFinish() {
  if (state.quizTimer) {
    clearInterval(state.quizTimer);
    state.quizTimer = null;
  }
  progressService.completeQuizAttempt(state.quizAttemptId, state.questions, state.answers);
  const chapterTitle = state.quizType === 'mock' ? 'Mock Exam' : state.quizType === 'specimen' ? 'Specimen Exam' : state.quizType === 'quick_quiz' ? 'Quick Quiz' : getChaptersFromGlobal().find(c => c.id === state.quizConfig.chapterId)?.title;
  const { streakExtended, currentStreak } = progressService.logActivity({ type: 'quiz', chapter: chapterTitle, score: `${state.answers.filter(a => a?.correct).length}/${state.questions.length}` });
  if (streakExtended) {
    showToast(`🔥 Streak extended to ${currentStreak} days! Keep it up!`);
  }
  state.screen = SCREEN.RESULTS;
  render();
}

function startQuiz(questionList, quizDetails) {
  state.questions = questionList.map(q => ({ ...q,
    id: q.id || `${q.question.slice(0, 20)}-${Math.random()}`
  })) || [];
  state.answers = new Array(state.questions.length).fill(null);
  state.currentIndex = 0;
  state.score = 0;
  state.screen = SCREEN.QUIZ;
  state.questionState = Q_STATE.UNANSWERED;
  state.quizType = quizDetails.type;
  state.quizConfig = quizDetails.config;
  state.studyMode = quizDetails.studyMode || false;
  state.resultsFilter = 'all'; // Reset filter on new quiz start
  state.isQuizNavVisible = false; // Ensure nav is hidden by default on mobile

  if (FEATURE_FLAG_QUESTION_FLAGGING) {
    state.quizAttemptId = `${quizDetails.type}-${quizDetails.config.chapterId || 'mock'}-${new Date().getTime()}`;
    const attempt = progressService.getOrCreateQuizAttempt(state.quizAttemptId, state.questions);
    const flaggedIds = attempt.questions.filter(q => q.flagged).map(q => q.id);
    state.flaggedQuestions = new Set(flaggedIds);
  }
  
  if (state.quizType === 'mock' || state.quizType === 'specimen') {
        state.quizEndTime = Date.now() + 120 * 60 * 1000;
        state.quizTimer = setInterval(updateTimer, 1000);
    }
    
  progressService.saveLastActivity({ type: 'quiz', chapter: state.quizType === 'mock' ? 'Mock Exam' : state.quizType === 'specimen' ? 'Specimen Exam' : getChaptersFromGlobal().find(c => c.id === state.quizConfig.chapterId)?.title, config: quizDetails.config, studyMode: state.studyMode });
  render();
}

function updateTimer() {
    const timerEl = qs('#timer');
    if (!timerEl) {
        clearInterval(state.quizTimer);
        state.quizTimer = null;
        return;
    }

    const remaining = state.quizEndTime - Date.now();
    if (remaining <= 0) {
        clearInterval(state.quizTimer);
        state.quizTimer = null;
        handleQuizFinish();
        showToast("Time's up! Your exam has been submitted.", 5000);
        return;
    }

    const minutes = Math.floor((remaining / 1000) / 60);
    const seconds = Math.floor((remaining / 1000) % 60);
    timerEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function startDueFlashcardsSession() {
    const dueCards = progressService.getAllDueCards();
    if (dueCards.length === 0) {
        showToast("You have no flashcards due for review today!");
        return;
    }
    state.flashcardSession = {
        cards: sampleFromPool(dueCards, 50), // Study up to 50 due cards at a time
        currentIndex: 0,
        isFlipped: false,
        isCrossChapter: true,
    };
    state.screen = SCREEN.LEARNING;
    const { streakExtended, currentStreak } = progressService.logActivity({ type: 'due-flashcards', chapter: 'All Due Cards' });
    if (streakExtended) {
        showToast(`🔥 Streak extended to ${currentStreak} days! Keep it up!`);
    }
    render();
}

function startFlashcardSession(chapter) {
  const progress = progressService.getProgress();
  const chapterProgress = progress.chapters[chapter.id] || {
    flashcards: {}
  };
  const now = new Date().toISOString();

  const dueCards = chapter.flashcards.filter(card => {
    const cardProgress = chapterProgress.flashcards[card.id];
    return !cardProgress || !cardProgress.nextReviewDate || cardProgress.nextReviewDate <= now;
  });

  state.flashcardSession = {
    cards: sampleFromPool(dueCards.length > 0 ? dueCards : chapter.flashcards, 20),
    currentIndex: 0,
    isFlipped: false,
    isCrossChapter: false,
  };
  state.screen = SCREEN.LEARNING;
  
  const { streakExtended, currentStreak } = progressService.logActivity({ type: 'flashcards', chapter: chapter.title, chapterId: chapter.id });
  if (streakExtended) {
    showToast(`🔥 Streak extended to ${currentStreak} days! Keep it up!`);
  }
  
  render();
}

document.addEventListener('DOMContentLoaded', () => {
  state.root = qs("#app");

  document.body.addEventListener('click', (event) => {
    if (event.target.closest('#app') || event.target.closest('header') || event.target.closest('.modal') || event.target.closest('#resume-container')) {
      handleAppClick(event);
    }
  });
  
  const progress = progressService.getProgress();
  if (!progress.hasSeenWelcome) {
      qs('#welcome-modal').classList.remove('hidden');
      qs('#welcome-modal').classList.add('flex');
  }

  render();
});


document.addEventListener('keydown', (e) => {
  if (state.screen === SCREEN.LEARNING && state.flashcardSession.isFlipped) {
    const confidence = parseInt(e.key, 10);
    if (confidence >= 1 && confidence <= 5) {
      const card = state.flashcardSession.cards[state.flashcardSession.currentIndex];
      const chapterId = card.chapterId || state.selectedChapterId;
      const chapter = getChaptersFromGlobal().find(c => c.id === chapterId);
      progressService.updateFlashcardConfidence(chapter.id, chapter.title, card.id, confidence);
      state.flashcardSession.currentIndex++;
      state.flashcardSession.isFlipped = false;
      render();
    }
  }

  if (FEATURE_FLAG_QUESTION_FLAGGING && state.screen === SCREEN.QUIZ && e.key.toLowerCase() === 'f') {
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
      return;
    }
    e.preventDefault();
    const flagBtn = qs('#flag-btn');
    if (flagBtn) {
      flagBtn.click();
    }
  }
});

let draggedCard = null;

document.addEventListener('dragstart', (e) => {
  if (e.target.dataset.cardId) {
    draggedCard = e.target;
    e.target.style.opacity = '0.5';
  }
});

document.addEventListener('dragend', (e) => {
  if (e.target.dataset.cardId) {
    e.target.style.opacity = '1';
  }
});

document.addEventListener('dragover', (e) => {
  e.preventDefault();
  const dropZone = e.target.closest('[data-status]');
  if (dropZone) {
    // can add visual feedback here
  }
});

document.addEventListener('drop', (e) => {
  e.preventDefault();
  if (draggedCard) {
    const dropZone = e.target.closest('[data-status] .card-list');
    if (dropZone) {
      const newStatus = dropZone.parentElement.dataset.status;
      const cardId = draggedCard.dataset.cardId;
      const chapter = getChaptersFromGlobal().find(c => c.id === state.selectedChapterId);

      progressService.updateCardStatus(chapter.id, cardId, newStatus);
      dropZone.appendChild(draggedCard);
      draggedCard = null;
    }
  }
});