// js/services/progressService.js
import {
  calculateNextReview
} from '../utils/spacedRepetition.js';
import {
  STORAGE_KEY
} from '../config.js';

// --- Multi-User Data Structure Definitions ---
const getInitialUserData = () => ({
  chapters: {},
  recentActivity: [],
  quizAttempts: {},
  hasSeenWelcome: false, // For onboarding per user
  studyStreak: {
    current: 0,
    longest: 0,
    lastActivityDate: null,
  },
});

const getInitialMasterData = () => ({
  currentUser: null,
  users: {},
});

// --- Data Migration & Initialization ---
function migrateOldData(data) {
  // Check if it's the old single-user format (has chapters but not users property)
  if (data && data.chapters && !data.hasOwnProperty('users')) {
    console.log('Migrating old single-user data to new multi-user format...');
    const migratedData = getInitialMasterData();
    migratedData.users['Default User'] = {
      chapters: data.chapters || {},
      recentActivity: data.recentActivity || [],
      quizAttempts: data.quizAttempts || {},
      studyStreak: data.studyStreak || { current: 0, longest: 0, lastActivityDate: null },
      hasSeenWelcome: data.hasSeenWelcome || false,
    };
    migratedData.currentUser = 'Default User'; // Set the migrated user as active
    return migratedData;
  }
  return data; // Return original data if no migration is needed
}

// --- Core Data Access (More Robust) ---
function getMasterData() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);

    // Case 1: localStorage is completely empty. Initialize fresh data.
    if (data === null) {
      const initialData = getInitialMasterData();
      saveMasterData(initialData);
      return initialData;
    }

    let parsed = JSON.parse(data);

    // Case 2: localStorage contains a "null" string or is otherwise empty after parsing.
    if (parsed === null) {
        const initialData = getInitialMasterData();
        saveMasterData(initialData);
        return initialData;
    }

    // Attempt to migrate data if it's in the old format.
    const migratedData = migrateOldData(parsed);

    // If the data was migrated, the object will be different. Save the new structure.
    if (parsed !== migratedData) {
      saveMasterData(migratedData);
      return migratedData;
    }
    
    // If no migration, return the parsed data as is.
    return parsed;

  } catch (error) {
    console.error('Failed to get or parse master data from localStorage. Resetting to a clean state.', error);
    // Fallback: If parsing or any other operation fails, reset to a known good state.
    const cleanData = getInitialMasterData();
    saveMasterData(cleanData);
    return cleanData;
  }
}

function saveMasterData(masterData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(masterData));
  } catch (error)
  {
    console.error('Failed to save master data to localStorage:', error);
  }
}

// --- User Management Functions ---
export function getUsers() {
  const masterData = getMasterData();
  return Object.keys(masterData.users);
}

export function getCurrentUser() {
  const masterData = getMasterData();
  return masterData.currentUser;
}

export function setCurrentUser(userId) {
  const masterData = getMasterData();
  masterData.currentUser = userId; // Can be null to "log out"
  saveMasterData(masterData);
  return true;
}

export function addUser(userId) {
  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    return false;
  }
  const trimmedUserId = userId.trim();
  const masterData = getMasterData();
  if (masterData.users[trimmedUserId]) {
    return false; // User already exists
  }
  masterData.users[trimmedUserId] = getInitialUserData();
  saveMasterData(masterData);
  return true;
}

export function deleteUser(userId) {
    const masterData = getMasterData();
    if (!masterData.users[userId]) {
        return false;
    }
    delete masterData.users[userId];
    // If the deleted user was the current user, log them out.
    if (masterData.currentUser === userId) {
        masterData.currentUser = null;
    }
    saveMasterData(masterData);
    return true;
}

// --- User-Specific Progress Functions ---

export function getProgress(userId) {
  if (!userId) {
    // Return a default structure if no userId is provided, preventing errors.
    return getInitialUserData();
  }
  const masterData = getMasterData();
  // Return the specific user's data, or a default structure if that user doesn't exist.
  return masterData.users[userId] || getInitialUserData();
}

function saveProgress(userId, userData) {
  if (!userId) {
    console.error("Attempted to save progress without a userId.");
    return;
  }
  const masterData = getMasterData();
  masterData.users[userId] = userData;
  saveMasterData(masterData);
}

// --- All other service functions now use the new get/saveProgress pattern ---

export function setHasSeenWelcome(userId) {
  if (!userId) return;
  const progress = getProgress(userId);
  progress.hasSeenWelcome = true;
  saveProgress(userId, progress);
}

export function getOrCreateQuizAttempt(userId, attemptId, questions = []) {
  if (!userId) return null;
  const progress = getProgress(userId);
  if (!progress.quizAttempts) progress.quizAttempts = {};
  if (!progress.quizAttempts[attemptId]) {
    progress.quizAttempts[attemptId] = {
      id: attemptId,
      questions: questions.map(q => ({ id: q.id, chapterId: q.chapterId, flagged: false })),
      startTime: new Date().toISOString(),
      completed: false,
    };
    saveProgress(userId, progress);
  }
  return progress.quizAttempts[attemptId];
}

export function updateFlagStatus(userId, attemptId, questionId, isFlagged) {
  if (!userId) return;
  const progress = getProgress(userId);
  const attempt = progress.quizAttempts?.[attemptId];
  if (attempt) {
    const question = attempt.questions.find(q => q.id === questionId);
    if (question) {
      question.flagged = isFlagged;
      saveProgress(userId, progress);
    }
  }
}

export function completeQuizAttempt(userId, attemptId, questions, answers) {
  if (!userId) return;
  const progress = getProgress(userId);
  const attempt = progress.quizAttempts?.[attemptId];
  if (attempt && !attempt.completed) {
    attempt.completed = true;
    attempt.endTime = new Date().toISOString();
    const correct = answers.filter(a => a?.correct).length;
    const total = questions.length;
    attempt.results = {
      score: correct,
      total,
      percentage: total > 0 ? Math.round((correct / total) * 100) : 0,
      answers: answers.map((ans, idx) => ({
        questionId: questions[idx].id,
        chapterId: questions[idx].chapterId,
        correct: ans?.correct || false,
        loId: questions[idx].loId,
      })),
    };
    saveProgress(userId, progress);
  }
}

function updateStudyStreak(userId) {
    if (!userId) return { progress: getInitialUserData(), streakExtended: false };
    const progress = getProgress(userId);
    let streakExtended = false;
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
        streakExtended = true;
    }
    
    return { progress, streakExtended };
}

export function logActivity(userId, activityItem) {
  if (!userId) return { streakExtended: false, currentStreak: 0 };
  let { progress, streakExtended } = updateStudyStreak(userId);
  if (!progress.recentActivity) progress.recentActivity = [];
  progress.recentActivity.unshift({ ...activityItem, date: new Date().toISOString() });
  progress.recentActivity = progress.recentActivity.slice(0, 10);
  saveProgress(userId, progress);
  return { streakExtended, currentStreak: progress.studyStreak.current };
}

export function analyzePerformance(userId) {
    if (!userId) return { strengths: [], weaknesses: [] };
    const progress = getProgress(userId);
    const completedAttempts = Object.values(progress.quizAttempts || {}).filter(a => a.completed && a.results);
    if (completedAttempts.length === 0) return { strengths: [], weaknesses: [] };

    const chapterStats = {};
    completedAttempts.forEach(attempt => {
        (attempt.results.answers || []).forEach(answer => {
            const { chapterId, correct } = answer;
            if (!chapterId || ['specimen_exam', 'mock', 'quick_quiz'].includes(chapterId)) return;
            if (!chapterStats[chapterId]) {
                chapterStats[chapterId] = { correct: 0, total: 0, chapterId };
            }
            chapterStats[chapterId].total++;
            if (correct) chapterStats[chapterId].correct++;
        });
    });

    const performance = Object.values(chapterStats)
        .filter(stat => stat.total >= 5)
        .map(stat => ({ ...stat, percentage: (stat.correct / stat.total) * 100 }))
        .sort((a, b) => b.percentage - a.percentage);

    const strengths = performance.slice(0, 3).filter(p => p.percentage >= 70);
    const weaknesses = performance.slice().reverse().slice(0, 3).filter(p => p.percentage < 70);
    return { strengths, weaknesses };
}

export function getAllDueCards(userId) {
    if (!userId) return [];
    const progress = getProgress(userId);
    const allChaptersData = window.CII_W01_TUTOR_DATA?.chapters || [];
    const dueCards = [];
    const now = new Date().toISOString();

    allChaptersData.forEach(chapter => {
        if (chapter.flashcards?.length > 0) {
            chapter.flashcards.forEach(card => {
                const cardProgress = progress.chapters[chapter.id]?.flashcards?.[card.id];
                if (!cardProgress || !cardProgress.nextReviewDate || cardProgress.nextReviewDate <= now) {
                    dueCards.push({ ...card, chapterId: chapter.id, chapterTitle: chapter.title });
                }
            });
        }
    });
    return dueCards;
}

export function updateFlashcardConfidence(userId, chapterId, chapterTitle, cardId, rating) {
  if (!userId) return;
  const progress = getProgress(userId);
  if (!progress.chapters[chapterId]) {
    progress.chapters[chapterId] = { mastery: 0, flashcards: {}, title: chapterTitle };
  }
  let card = progress.chapters[chapterId].flashcards[cardId] || {
    confidence: 0, lastReviewed: new Date().toISOString(), interval: 0,
    easeFactor: 2.5, consecutiveCorrect: 0, status: 'new'
  };

  card = calculateNextReview(card, rating);
  card.confidence = rating;
  if (rating >= 4) card.status = 'mastered';
  else if (rating >= 2) card.status = 'learning';
  else card.status = 'new';
  progress.chapters[chapterId].flashcards[cardId] = card;

  const chapterCards = progress.chapters[chapterId].flashcards;
  const cardScores = Object.values(chapterCards).map(c => c.confidence);
  const totalScore = cardScores.reduce((sum, score) => sum + (score - 1), 0);
  const maxScore = cardScores.length * 4;
  progress.chapters[chapterId].mastery = maxScore > 0 ? totalScore / maxScore : 0;
  saveProgress(userId, progress);
}

export function updateCardStatus(userId, chapterId, cardId, newStatus) {
  if (!userId) return;
  const progress = getProgress(userId);
  if (!progress.chapters[chapterId]) progress.chapters[chapterId] = { mastery: 0, flashcards: {} };
  if (!progress.chapters[chapterId].flashcards[cardId]) progress.chapters[chapterId].flashcards[cardId] = {};
  progress.chapters[chapterId].flashcards[cardId].status = newStatus;
  saveProgress(userId, progress);
}

export function resetProgress(userId) {
  if (!userId) return;
  const masterData = getMasterData();
  if (masterData.users[userId]) {
    masterData.users[userId] = getInitialUserData();
    saveMasterData(masterData);
  }
}

export function cacheAiExplanation(userId, chapterId, cardId, promptType, explanation) {
  if (!userId) return;
  const progress = getProgress(userId);
  if (!progress.chapters[chapterId]) progress.chapters[chapterId] = { mastery: 0, flashcards: {}, title: '' };
  if (!progress.chapters[chapterId].flashcards[cardId]) progress.chapters[chapterId].flashcards[cardId] = {};
  if (!progress.chapters[chapterId].flashcards[cardId].aiExplanations) progress.chapters[chapterId].flashcards[cardId].aiExplanations = {};
  progress.chapters[chapterId].flashcards[cardId].aiExplanations[promptType] = explanation;
  saveProgress(userId, progress);
}

export function saveFlashcardNote(userId, chapterId, cardId, noteText) {
  if (!userId) return;
  const progress = getProgress(userId);
  if (!progress.chapters[chapterId]) progress.chapters[chapterId] = { mastery: 0, flashcards: {}, title: '' };
  if (!progress.chapters[chapterId].flashcards[cardId]) progress.chapters[chapterId].flashcards[cardId] = {};
  progress.chapters[chapterId].flashcards[cardId].note = noteText;
  saveProgress(userId, progress);
}