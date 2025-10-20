// js/views/topics.js
import { qs } from '../utils/uiUtils.js';
import * as progressService from '../services/progressService.js';
import { state, MODE } from '../main.js';

function getChaptersFromGlobal() {
  const central = window.CII_W01_TUTOR_DATA?.chapters;
  if (Array.isArray(central) && central.length) return central;
  return [];
}

export function renderTopics() {
  const wrap = document.createElement("section");
  wrap.className = "screen screen-topics";

  const chapters = getChaptersFromGlobal();
  // Ensure we have a user before proceeding
  if (!state.currentUser) {
    wrap.innerHTML = `<p>Error: No user selected.</p>`;
    return wrap;
  }
  
  // Update all calls to be user-aware
  const progress = progressService.getProgress(state.currentUser);
  const dueCardsCount = progressService.getAllDueCards(state.currentUser).length;
  const { weaknesses } = progressService.analyzePerformance(state.currentUser);

  const chapterTitleMap = chapters.reduce((acc, ch) => {
    acc[ch.id] = ch.title;
    return acc;
  }, {});

  let personalizedGreeting = `<p class="mt-4 max-w-2xl mx-auto text-lg md:text-xl text-neutral-300">
      What would you like to do next, ${state.currentUser}?
    </p>`;

  if (dueCardsCount > 0) {
    let weaknessText = '';
    if (weaknesses.length > 0) {
      const topWeakness = weaknesses[0];
      const chapterTitle = chapterTitleMap[topWeakness.chapterId] || topWeakness.chapterId;
      weaknessText = ` Your weakest area is '${chapterTitle.replace(/Chapter \d+: /,'')}'`;
    }
    personalizedGreeting = `<p class="mt-4 max-w-2xl mx-auto text-lg md:text-xl text-neutral-300">
      Welcome back, ${state.currentUser}. You have <strong>${dueCardsCount} card${dueCardsCount === 1 ? '' : 's'}</strong> due for review.${weaknessText}
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