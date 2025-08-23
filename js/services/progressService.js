// js/services/progressService.js
import { calculateNextReview } from '../utils/spacedRepetition.js';
import { STORAGE_KEY } from '../config.js';

const getInitialData = () => ({
  chapters: {},
  recentActivity: [],
  // --- NEW ---
  quizAttempts: {}, // Store quiz attempt data, including flags
  // --- END NEW ---
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

// --- NEW ---
/**
 * Creates or retrieves a quiz attempt session.
 * @param {string} attemptId - A unique identifier for the quiz attempt.
 * @param {Array} questions - The list of questions for this attempt.
 * @returns {object} The quiz attempt object.
 */
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

/**
 * Updates the flagged status of a question within a quiz attempt.
 * @param {string} attemptId - The ID of the quiz attempt.
 * @param {string} questionId - The ID of the question to update.
 * @param {boolean} isFlagged - The new flagged status.
 */
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

/**
 * Marks a quiz attempt as complete.
 * @param {string} attemptId - The ID of the quiz attempt.
 */
export function completeQuizAttempt(attemptId) {
    const progress = getProgress();
    const attempt = progress.quizAttempts?.[attemptId];
    if (attempt) {
        attempt.completed = true;
        saveProgress(progress);
    }
}
// --- END NEW ---


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