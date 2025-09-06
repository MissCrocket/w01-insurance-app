// js/services/flashcardService.js
import * as progressService from './progressService.js';
import { showToast } from '../utils/ui.js';
import { state } from '../main.js';

function sampleFromPool(pool, n) {
  const arr = pool.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, n);
}

export function startFlashcardSession(chapter) {
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
  state.screen = 'learning';

  const { streakExtended, currentStreak } = progressService.logActivity({ type: 'flashcards', chapter: chapter.title, chapterId: chapter.id });
  if (streakExtended) {
    showToast(`🔥 Streak extended to ${currentStreak} days! Keep it up!`);
  }
}

export function startDueFlashcardsSession() {
    const dueCards = progressService.getAllDueCards();
    if (dueCards.length === 0) {
        showToast("You have no flashcards due for review today!");
        return;
    }
    state.flashcardSession = {
        cards: sampleFromPool(dueCards, 50),
        currentIndex: 0,
        isFlipped: false,
        isCrossChapter: true,
    };
    state.screen = 'learning';
    const { streakExtended, currentStreak } = progressService.logActivity({ type: 'due-flashcards', chapter: 'All Due Cards' });
    if (streakExtended) {
        showToast(`🔥 Streak extended to ${currentStreak} days! Keep it up!`);
    }
}