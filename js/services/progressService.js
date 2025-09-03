// js/services/progressService.js
import { calculateNextReview } from '../utils/spacedRepetition.js';
import { STORAGE_KEY } from '../config.js';

const getInitialData = () => ({
  chapters: {},
  recentActivity: [],
  quizAttempts: {}, // Store quiz attempt data, including flags
});

export function getProgress() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : getInitialData();
  } catch (error) {
    console.error('Failed to get progress from localStorage:', error);
    return getInitialData();
  }
}

function saveProgress(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save progress to localStorage:', error);
  }
}

export function getOrCreateQuizAttempt(attemptId, questions = []) {
  const progress = getProgress();
  if (!progress.quizAttempts) {
    progress.quizAttempts = {};
  }
  if (!progress.quizAttempts[attemptId]) {
    progress.quizAttempts[attemptId] = {
      id: attemptId,
      questions: questions.map(q => ({ id: q.id, flagged: false })),
      startTime: new Date().toISOString(),
      completed: false,
    };
    saveProgress(progress);
  }
  return progress.quizAttempts[attemptId];
}

export function updateFlagStatus(attemptId, questionId, isFlagged) {
  const progress = getProgress();
  const attempt = progress.quizAttempts?.[attemptId];
  if (attempt) {
    const question = attempt.questions.find(q => q.id === questionId);
    if (question) {
      question.flagged = isFlagged;
      saveProgress(progress);
    }
  }
}

export function completeQuizAttempt(attemptId) {
    const progress = getProgress();
    const attempt = progress.quizAttempts?.[attemptId];
    if (attempt) {
        attempt.completed = true;
        saveProgress(progress);
    }
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
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to reset progress in localStorage:', error);
  }
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

/**
 * Saves a user-generated note for a specific flashcard.
 * @param {string} chapterId - The ID of the chapter.
 * @param {string} cardId - The ID of the flashcard.
 * @param {string} noteText - The text of the note to save.
 */
export function saveFlashcardNote(chapterId, cardId, noteText) {
  const progress = getProgress();
  if (!progress.chapters[chapterId]) {
    progress.chapters[chapterId] = { mastery: 0, flashcards: {}, title: '' };
  }
  if (!progress.chapters[chapterId].flashcards[cardId]) {
    progress.chapters[chapterId].flashcards[cardId] = {};
  }
  progress.chapters[chapterId].flashcards[cardId].note = noteText;
  saveProgress(progress);
}
