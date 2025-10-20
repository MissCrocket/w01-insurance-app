// js/services/flashcardService.js
import * as progressService from './progressService.js';
import { showToast } from '../utils/uiUtils.js';
import { state } from '../main.js'; // Assuming state is exported from main.js

// Function to sample items from a pool
function sampleFromPool(pool, n) {
  // ... (sampling logic remains the same)
   const arr = pool.slice();
   for (let i = arr.length - 1; i > 0; i--) {
       const j = (Math.random() * (i + 1)) | 0;
       [arr[i], arr[j]] = [arr[j], arr[i]];
   }
   return arr.slice(0, n);
}

// Modified to accept userId
export function startFlashcardSession(chapter, userId) {
  if (!userId) {
      console.error("startFlashcardSession called without userId");
      return;
  }
  const progress = progressService.getProgress(userId); // <-- Use userId
  const chapterProgress = progress.chapters[chapter.id] || { flashcards: {} };
  const now = new Date().toISOString();

  const dueCards = chapter.flashcards.filter(card => {
    const cardProgress = chapterProgress.flashcards[card.id];
    return !cardProgress || !cardProgress.nextReviewDate || cardProgress.nextReviewDate <= now;
  });

  state.flashcardSession = {
    cards: sampleFromPool(dueCards.length > 0 ? dueCards : chapter.flashcards, 20),
    currentIndex: 0,
    isFlipped: false,
    isCrossChapter: false, // This is a single chapter session
  };
  state.screen = 'learning'; // Update global state screen

  // Log activity for the specific user
  const { streakExtended, currentStreak } = progressService.logActivity(userId, { type: 'flashcards', chapter: chapter.title, chapterId: chapter.id }); // <-- Use userId
  if (streakExtended) {
    showToast(`🔥 Streak extended to ${currentStreak} days! Keep it up!`);
  }
}

// Modified to accept userId
export function startDueFlashcardsSession(userId) {
    if (!userId) {
        console.error("startDueFlashcardsSession called without userId");
        showToast("Error starting session: No user selected.");
        return;
    }
    const dueCards = progressService.getAllDueCards(userId); // <-- Use userId
    if (dueCards.length === 0) {
        showToast("You have no flashcards due for review today!");
        return;
    }
    state.flashcardSession = {
        cards: sampleFromPool(dueCards, 50), // Sample up to 50 due cards
        currentIndex: 0,
        isFlipped: false,
        isCrossChapter: true, // Mark this as a cross-chapter session
    };
    state.screen = 'learning'; // Update global state screen

    // Log activity for the specific user
    const { streakExtended, currentStreak } = progressService.logActivity(userId, { type: 'due-flashcards', chapter: 'All Due Cards' }); // <-- Use userId
    if (streakExtended) {
        showToast(`🔥 Streak extended to ${currentStreak} days! Keep it up!`);
    }
}