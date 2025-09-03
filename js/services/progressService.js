// js/services/progressService.js
import {
  calculateNextReview
} from '../utils/spacedRepetition.js';
import {
  STORAGE_KEY
} from '../config.js';

const getInitialData = () => ({
  chapters: {},
  recentActivity: [],
  quizAttempts: {}, // Store quiz attempt data, including flags and results
  hasSeenWelcome: false, // For onboarding
  studyStreak: { // For gamification
    current: 0,
    longest: 0,
    lastActivityDate: null,
  },
});

export function getProgress() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    const parsed = data ? JSON.parse(data) : getInitialData();
    // Ensure new properties exist for users with old data
    if (!parsed.hasOwnProperty('hasSeenWelcome')) {
      parsed.hasSeenWelcome = false;
    }
    if (!parsed.hasOwnProperty('studyStreak')) {
      parsed.studyStreak = { current: 0, longest: 0, lastActivityDate: null };
    }
    return parsed;
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

export function setHasSeenWelcome() {
    const progress = getProgress();
    progress.hasSeenWelcome = true;
    saveProgress(progress);
}

export function getOrCreateQuizAttempt(attemptId, questions = []) {
  const progress = getProgress();
  if (!progress.quizAttempts) {
    progress.quizAttempts = {};
  }
  if (!progress.quizAttempts[attemptId]) {
    progress.quizAttempts[attemptId] = {
      id: attemptId,
      questions: questions.map(q => ({
        id: q.id,
        chapterId: q.chapterId, // Store chapterId for analysis
        flagged: false
      })),
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

export function completeQuizAttempt(attemptId, questions, answers) {
  const progress = getProgress();
  const attempt = progress.quizAttempts?.[attemptId];
  if (attempt && !attempt.completed) {
    attempt.completed = true;
    attempt.endTime = new Date().toISOString();
    
    const correct = answers.filter(a => a?.correct).length;
    const total = questions.length;
    attempt.results = {
      score: correct,
      total: total,
      percentage: total > 0 ? Math.round((correct / total) * 100) : 0,
      answers: answers.map((ans, idx) => ({
        questionId: questions[idx].id,
        chapterId: questions[idx].chapterId,
        correct: ans?.correct || false,
      })),
    };
    saveProgress(progress);
  }
}

function updateStudyStreak() {
    const progress = getProgress();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastDate = progress.studyStreak.lastActivityDate ? new Date(progress.studyStreak.lastActivityDate) : null;
    if (lastDate) {
        lastDate.setHours(0, 0, 0, 0);
    }
    
    if (!lastDate || today.getTime() > lastDate.getTime()) {
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);

        if (lastDate && lastDate.getTime() === yesterday.getTime()) {
            progress.studyStreak.current += 1;
        } else {
            progress.studyStreak.current = 1;
        }

        if (progress.studyStreak.current > progress.studyStreak.longest) {
            progress.studyStreak.longest = progress.studyStreak.current;
        }
        progress.studyStreak.lastActivityDate = today.toISOString();
    }
    // No change if activity is on the same day
    return progress;
}

export function logActivity(activityItem) {
  let progress = getProgress();
  progress = updateStudyStreak(); // Update streak before saving

  progress.recentActivity.unshift({
    ...activityItem,
    date: new Date().toISOString(),
  });
  progress.recentActivity = progress.recentActivity.slice(0, 10);
  saveProgress(progress);
}

export function analyzePerformance() {
    const progress = getProgress();
    const completedAttempts = Object.values(progress.quizAttempts).filter(a => a.completed && a.results);
    if (completedAttempts.length === 0) {
        return { strengths: [], weaknesses: [] };
    }

    const chapterStats = {};

    completedAttempts.forEach(attempt => {
        attempt.results.answers.forEach(answer => {
            const { chapterId, correct } = answer;
            if (!chapterId) return;

            if (!chapterStats[chapterId]) {
                chapterStats[chapterId] = { correct: 0, total: 0, chapterId };
            }
            chapterStats[chapterId].total++;
            if (correct) {
                chapterStats[chapterId].correct++;
            }
        });
    });

    const performance = Object.values(chapterStats)
        .filter(stat => stat.total > 5) // Only consider chapters with enough data
        .map(stat => ({
            ...stat,
            percentage: (stat.correct / stat.total) * 100,
        }))
        .sort((a, b) => b.percentage - a.percentage);

    const strengths = performance.slice(0, 3).filter(p => p.percentage >= 70);
    const weaknesses = performance.slice().reverse().slice(0, 3).filter(p => p.percentage < 70);
    
    return { strengths, weaknesses };
}

export function updateFlashcardConfidence(chapterId, chapterTitle, cardId, rating) {
  const progress = getProgress();

  if (!progress.chapters[chapterId]) {
    progress.chapters[chapterId] = {
      mastery: 0,
      flashcards: {},
      title: chapterTitle
    };
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
    progress.chapters[chapterId] = {
      mastery: 0,
      flashcards: {},
      title: ''
    };
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
    progress.chapters[chapterId] = {
      mastery: 0,
      flashcards: {},
      title: ''
    };
  }
  if (!progress.chapters[chapterId].flashcards[cardId]) {
    progress.chapters[chapterId].flashcards[cardId] = {};
  }
  progress.chapters[chapterId].flashcards[cardId].note = noteText;
  saveProgress(progress);
}

