// js/services/progressService.js

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

  const card = progress.chapters[chapterId].flashcards[cardId] || {
    confidence: 0,
    lastReviewed: new Date().toISOString(),
    interval: 0,
    easeFactor: 2.5,
    consecutiveCorrect: 0,
  };

  if (rating < 3) {
    card.interval = 1;
    card.consecutiveCorrect = 0;
  } else {
    card.consecutiveCorrect += 1;
    if (card.consecutiveCorrect === 1) {
      card.interval = 1;
    } else if (card.consecutiveCorrect === 2) {
      card.interval = 6;
    } else {
      card.interval = Math.ceil(card.interval * card.easeFactor);
    }
  }

  card.easeFactor = card.easeFactor + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02));
  if (card.easeFactor < 1.3) card.easeFactor = 1.3;

  const now = new Date();
  const nextReviewDate = new Date(now.getTime() + card.interval * 24 * 60 * 60 * 1000);
  card.nextReviewDate = nextReviewDate.toISOString();
  card.confidence = rating;
  card.lastReviewed = now.toISOString();

  progress.chapters[chapterId].flashcards[cardId] = card;

  const chapterCards = progress.chapters[chapterId].flashcards;
  const cardScores = Object.values(chapterCards).map(card => card.confidence);
  const totalScore = cardScores.reduce((sum, score) => sum + (score - 1), 0);
  const maxScore = cardScores.length * 4;
  progress.chapters[chapterId].mastery = maxScore > 0 ? totalScore / maxScore : 0;

  saveProgress(progress);
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