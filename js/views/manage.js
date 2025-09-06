// js/views/manage.js
import { qs } from '../utils/ui.js';
import * as progressService from '../services/progressService.js';
import { state } from '../main.js';

function getChaptersFromGlobal() {
  const central = window.CII_W01_TUTOR_DATA?.chapters;
  if (Array.isArray(central) && central.length) return central;
  return [];
}

export function renderManageCards() {
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