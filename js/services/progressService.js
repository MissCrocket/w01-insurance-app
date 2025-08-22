// js/services/progressService.js
import { calculateNextReview } from '../utils/spacedRepetition.js';
import { STORAGE_KEY } from '../config.js';

const getInitialData = () => ({
  chapters: {},
  recentActivity: [],
});

export function getProgress() {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : getInitialData();
}

function saveProgress(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function updateFlashcardConfidence(chapterId, chapterTitle, cardId, rating) {
  const progress = getProgress();

  if (!progress.chapters[chapterId]) {
    progress.chapters[chapterId] = { mastery: 0, flashcards: {}, title: chapterTitle };
  }

  let card = progress.chapters[chapterId].flashcards[cardId] || {
    confidence: 0,
    lastReviewed: new Date().toISOString(),
    interval: 0,
    easeFactor: 2.5,
    consecutiveCorrect: 0,
    status: 'new'
  };

  card = calculateNextReview(card, rating);
  card.confidence = rating;
  
  if (rating >= 4) {
    card.status = 'mastered';
  } else if (rating >= 2) {
    card.status = 'learning';
  } else {
    card.status = 'new';
  }

  progress.chapters[chapterId].flashcards[cardId] = card;

  const chapterCards = progress.chapters[chapterId].flashcards;
  const cardScores = Object.values(chapterCards).map(card => card.confidence);
  const totalScore = cardScores.reduce((sum, score) => sum + (score - 1), 0);
  const maxScore = cardScores.length * 4;
  progress.chapters[chapterId].mastery = maxScore > 0 ? totalScore / maxScore : 0;

  saveProgress(progress);
}

export function updateCardStatus(chapterId, cardId, newStatus) {
    const progress = getProgress();
    if (progress.chapters[chapterId] && progress.chapters[chapterId].flashcards[cardId]) {
        progress.chapters[chapterId].flashcards[cardId].status = newStatus;
        saveProgress(progress);
    }
}

export function logActivity(activityItem) {
  const progress = getProgress();
  progress.recentActivity.unshift({
    ...activityItem,
    date: new Date().toISOString(),
  });
  progress.recentActivity = progress.recentActivity.slice(0, 10);
  saveProgress(progress);
}

export function resetProgress() {
  localStorage.removeItem(STORAGE_KEY);
}

export function cacheAiExplanation(chapterId, cardId, promptType, explanation) {
    const progress = getProgress();
    if (!progress.chapters[chapterId]) {
        progress.chapters[chapterId] = { mastery: 0, flashcards: {}, title: '' };
    }
    if (!progress.chapters[chapterId].flashcards[cardId]) {
        progress.chapters[chapterId].flashcards[cardId] = {};
    }
    if (!progress.chapters[chapterId].flashcards[cardId].aiExplanations) {
        progress.chapters[chapterId].flashcards[cardId].aiExplanations = {};
    }
    progress.chapters[chapterId].flashcards[cardId].aiExplanations[promptType] = explanation;
    saveProgress(progress);
}