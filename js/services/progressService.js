// js/services/progressService.js

import { STORAGE_KEY } from '../config.js';

// Initializes the data structure for a new user
const getInitialData = () => ({
  chapters: {},
  recentActivity: [],
});

// Reads progress from localStorage
export function getProgress() {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : getInitialData();
}

// Saves progress to localStorage
function saveProgress(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// Updates a flashcard's confidence and recalculates mastery
export function updateFlashcardConfidence(chapterId, chapterTitle, cardId, confidence) {
  const progress = getProgress();
  
  // Ensure chapter object exists
  if (!progress.chapters[chapterId]) {
    progress.chapters[chapterId] = { mastery: 0, flashcards: {}, title: chapterTitle };
  }

  // Update card confidence
  progress.chapters[chapterId].flashcards[cardId] = {
    confidence: confidence,
    lastReviewed: new Date().toISOString(),
  };

  // Recalculate chapter mastery
  const chapterCards = progress.chapters[chapterId].flashcards;
  const cardScores = Object.values(chapterCards).map(card => card.confidence);
  const totalScore = cardScores.reduce((sum, score) => sum + (score - 1), 0); // Score from 0-4
  const maxScore = cardScores.length * 4;
  progress.chapters[chapterId].mastery = maxScore > 0 ? totalScore / maxScore : 0;

  saveProgress(progress);
}

// Logs a new activity (e.g., a completed quiz)
export function logActivity(activityItem) {
  const progress = getProgress();
  progress.recentActivity.unshift({
    ...activityItem,
    date: new Date().toISOString(),
  });
  // Keep only the last 10 activities
  progress.recentActivity = progress.recentActivity.slice(0, 10);
  saveProgress(progress);
}

// Resets all user progress
export function resetProgress() {
  localStorage.removeItem(STORAGE_KEY);
}