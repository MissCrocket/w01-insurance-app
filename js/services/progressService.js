// js/services/progressService.js
import { calculateNextReview } from '../utils/spacedRepetition.js';
import { STORAGE_KEY } from '../config.js';

// --- Multi-User Data Structure ---
const getInitialUserData = () => ({
  chapters: {},
  recentActivity: [],
  quizAttempts: {},
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

// --- Data Migration Logic ---
function migrateOldData(oldData) {
  // Check if it looks like the old single-user format
  if (oldData && oldData.chapters && !oldData.users) {
    console.log('Migrating old single-user data...');
    const newData = getInitialMasterData();
    newData.users['Default User'] = {
      chapters: oldData.chapters || {},
      recentActivity: oldData.recentActivity || [],
      quizAttempts: oldData.quizAttempts || {},
      studyStreak: oldData.studyStreak || { current: 0, longest: 0, lastActivityDate: null },
      // Copy any other potential top-level properties from the old format
      hasSeenWelcome: oldData.hasSeenWelcome || false,
    };
    newData.currentUser = 'Default User'; // Automatically select the migrated user
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
    return newData;
  }
  // Check if it's already the new format but missing default fields
  if (oldData && oldData.users) {
    let needsUpdate = false;
    if (oldData.currentUser === undefined) {
      oldData.currentUser = null;
      needsUpdate = true;
    }
    Object.keys(oldData.users).forEach(userId => {
        if (!oldData.users[userId].studyStreak) {
            oldData.users[userId].studyStreak = { current: 0, longest: 0, lastActivityDate: null };
            needsUpdate = true;
        }
        if (!oldData.users[userId].quizAttempts) {
            oldData.users[userId].quizAttempts = {};
            needsUpdate = true;
        }
        if (!oldData.users[userId].recentActivity) {
            oldData.users[userId].recentActivity = [];
            needsUpdate = true;
        }
         if (!oldData.users[userId].hasSeenWelcome) { // Also check welcome flag per user
            oldData.users[userId].hasSeenWelcome = false;
            needsUpdate = true;
        }
    });
    if (needsUpdate) {
        console.log('Updating existing multi-user data with default fields...');
        localStorage.setItem(STORAGE_KEY, JSON.stringify(oldData));
    }
    return oldData;
  }
  return oldData; // Return as is if not old format or already new
}

// --- Core Data Access ---
function getMasterData() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    let parsed = data ? JSON.parse(data) : getInitialMasterData();

    // Perform migration check
    parsed = migrateOldData(parsed);

    // Ensure it has the base structure even after potential migration issues
    if (!parsed || !parsed.users) {
        parsed = getInitialMasterData();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed)); // Save the clean structure
    }

    // Ensure default properties exist
    if (parsed.currentUser === undefined) parsed.currentUser = null;
    if (!parsed.users) parsed.users = {};


    return parsed;
  } catch (error) {
    console.error('Failed to get master data from localStorage:', error);
    // Attempt to reset to a clean state if parsing fails badly
    const cleanData = getInitialMasterData();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanData));
    return cleanData;
  }
}

function saveMasterData(masterData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(masterData));
  } catch (error) {
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
  if (userId === null || masterData.users[userId]) {
    masterData.currentUser = userId;
    saveMasterData(masterData);
    return true;
  }
  console.error(`Attempted to set non-existent user "${userId}" as current.`);
  return false;
}

export function addUser(userId) {
  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      console.error('Invalid user ID provided.');
      return false;
  }
  const trimmedUserId = userId.trim();
  const masterData = getMasterData();
  if (masterData.users[trimmedUserId]) {
    console.warn(`User "${trimmedUserId}" already exists.`);
    return false; // Or maybe return true if selecting is desired?
  }
  masterData.users[trimmedUserId] = getInitialUserData();
  // Optionally set the new user as current immediately
  // masterData.currentUser = trimmedUserId;
  saveMasterData(masterData);
  console.log(`User "${trimmedUserId}" added.`);
  return true;
}

export function deleteUser(userId) {
    const masterData = getMasterData();
    if (!masterData.users[userId]) {
        console.warn(`User "${userId}" does not exist.`);
        return false;
    }
    delete masterData.users[userId];
    if (masterData.currentUser === userId) {
        masterData.currentUser = null; // Clear current user if they were deleted
    }
    saveMasterData(masterData);
    console.log(`User "${userId}" deleted.`);
    return true;
}


// --- User-Specific Progress Functions ---

/**
 * Gets the progress data for a specific user.
 * @param {string} userId - The ID of the user.
 * @returns {object} The user's progress data, or an initial empty object if the user doesn't exist.
 */
export function getProgress(userId) {
    if (!userId) {
        console.error("getProgress called without userId");
        return getInitialUserData(); // Return default empty structure
    }
    const masterData = getMasterData();
    // Return a copy to prevent accidental modification of the master data
    return JSON.parse(JSON.stringify(masterData.users[userId] || getInitialUserData()));
}


/**
 * Saves the progress data for a specific user.
 * @param {string} userId - The ID of the user.
 * @param {object} userData - The progress data to save for the user.
 */
function saveProgress(userId, userData) {
    if (!userId) {
        console.error("saveProgress called without userId");
        return;
    }
    const masterData = getMasterData();
    if (!masterData.users[userId]) {
        console.error(`Attempted to save progress for non-existent user: ${userId}`);
        // Optionally create the user here if desired, or just return
        // masterData.users[userId] = getInitialUserData(); // Example: Create user on first save
        return;
    }
    // Make sure we are not saving undefined or null
    masterData.users[userId] = userData || getInitialUserData();
    saveMasterData(masterData);
}


export function setHasSeenWelcome(userId) {
    if (!userId) return;
    const progress = getProgress(userId);
    progress.hasSeenWelcome = true;
    saveProgress(userId, progress);
}

export function getOrCreateQuizAttempt(userId, attemptId, questions = []) {
  if (!userId) return null;
  const progress = getProgress(userId);
  if (!progress.quizAttempts) {
    progress.quizAttempts = {};
  }
  if (!progress.quizAttempts[attemptId]) {
    progress.quizAttempts[attemptId] = {
      id: attemptId,
      questions: questions.map(q => ({
        id: q.id,
        chapterId: q.chapterId,
        flagged: false
      })),
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
            total: total,
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
    // Ensure streak object exists
    if (!progress.studyStreak) {
        progress.studyStreak = { current: 0, longest: 0, lastActivityDate: null };
    }

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
            // Reset streak if the last activity wasn't yesterday or today
            progress.studyStreak.current = 1;
        }

        if (progress.studyStreak.current > progress.studyStreak.longest) {
            progress.studyStreak.longest = progress.studyStreak.current;
        }
        progress.studyStreak.lastActivityDate = today.toISOString();
        streakExtended = true;
    }
    // Note: We don't save here, the calling function (logActivity) will save.
    return { progress, streakExtended };
}

export function logActivity(userId, activityItem) {
    if (!userId) return { streakExtended: false, currentStreak: 0 };
    let { progress, streakExtended } = updateStudyStreak(userId);

    // Ensure recentActivity array exists
    if (!progress.recentActivity) {
        progress.recentActivity = [];
    }

    progress.recentActivity.unshift({
        ...activityItem,
        date: new Date().toISOString(),
    });
    progress.recentActivity = progress.recentActivity.slice(0, 10); // Keep only the last 10

    saveProgress(userId, progress);
    return { streakExtended, currentStreak: progress.studyStreak.current };
}

export function analyzePerformance(userId) {
    if (!userId) return { strengths: [], weaknesses: [] };
    const progress = getProgress(userId);
    const completedAttempts = Object.values(progress.quizAttempts || {}).filter(a => a.completed && a.results);
    if (completedAttempts.length === 0) {
        return { strengths: [], weaknesses: [] };
    }

    const chapterStats = {};

    completedAttempts.forEach(attempt => {
        attempt.results.answers.forEach(answer => {
            const { chapterId, correct } = answer;
            if (!chapterId || chapterId === 'specimen_exam' || chapterId === 'mock' || chapterId === 'quick_quiz') return; // Ignore non-specific chapters

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
        .filter(stat => stat.total >= 5) // Only consider chapters with at least 5 attempts
        .map(stat => ({
            ...stat,
            percentage: (stat.correct / stat.total) * 100,
        }))
        .sort((a, b) => b.percentage - a.percentage); // Sort descending by percentage

    const strengths = performance.slice(0, 3).filter(p => p.percentage >= 70);
    // Sort ascending for weaknesses
    const weaknesses = performance.slice().sort((a, b) => a.percentage - b.percentage).slice(0, 3).filter(p => p.percentage < 70);

    return { strengths, weaknesses };
}


// Modified to be user-specific
export function getAllDueCards(userId) {
    if (!userId) return [];
    const progress = getProgress(userId);
    const allChaptersData = window.CII_W01_TUTOR_DATA?.chapters || [];
    const dueCards = [];
    const now = new Date().toISOString();

    allChaptersData.forEach(chapter => {
        // Ensure chapter.id is valid before proceeding
        if (!chapter || !chapter.id) return;

        const chapterProgress = progress.chapters?.[chapter.id]; // Use optional chaining
        if (chapter.flashcards && chapter.flashcards.length > 0) {
            chapter.flashcards.forEach(card => {
                 // Ensure card.id is valid
                if (!card || !card.id) return;

                const cardProgress = chapterProgress?.flashcards?.[card.id]; // Optional chaining
                // Check if cardProgress exists and has nextReviewDate, or if it doesn't exist at all (new card)
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
        progress.chapters[chapterId] = {
            mastery: 0,
            flashcards: {},
            title: chapterTitle // Store title for reference if needed
        };
    }

    let card = progress.chapters[chapterId].flashcards[cardId] || {
        confidence: 0,
        lastReviewed: null, // Set to null initially
        interval: 0,
        easeFactor: 2.5,
        consecutiveCorrect: 0,
        status: 'new' // Initialize status
    };

    card = calculateNextReview(card, rating);
    card.confidence = rating; // Update confidence rating

    // Update status based on rating
    if (rating >= 4) { // Easy or Perfect
        card.status = 'mastered';
    } else if (rating >= 2) { // Hard or Good
        card.status = 'learning';
    } else { // Forgot
        card.status = 'new'; // Treat as 'new' or 'needs review'
    }


    progress.chapters[chapterId].flashcards[cardId] = card;

    // Recalculate chapter mastery
    const chapterCards = progress.chapters[chapterId].flashcards;
    const cardScores = Object.values(chapterCards).map(c => c.confidence || 0); // Default to 0 if no confidence score
    // Mastery based on confidence (scale 1-5). Max score is 4 per card (5-1).
    const totalScore = cardScores.reduce((sum, score) => sum + Math.max(0, score - 1), 0);
    const maxPossibleScore = cardScores.length * 4;
    progress.chapters[chapterId].mastery = maxPossibleScore > 0 ? totalScore / maxPossibleScore : 0;


    saveProgress(userId, progress);
}

export function updateCardStatus(userId, chapterId, cardId, newStatus) {
    if (!userId) return;
    const progress = getProgress(userId);

    if (!progress.chapters[chapterId]) {
        progress.chapters[chapterId] = { mastery: 0, flashcards: {} };
    }
    if (!progress.chapters[chapterId].flashcards[cardId]) {
        progress.chapters[chapterId].flashcards[cardId] = {}; // Ensure card object exists
    }

    progress.chapters[chapterId].flashcards[cardId].status = newStatus;
    saveProgress(userId, progress);
}


export function resetProgress(userId) {
    if (!userId) {
        console.warn("Attempted to reset progress without specifying a user.");
        return; // Or maybe reset all users? Decided against it for safety.
    }
    const masterData = getMasterData();
    if (masterData.users[userId]) {
        masterData.users[userId] = getInitialUserData(); // Reset specific user data
        saveMasterData(masterData);
        console.log(`Progress reset for user: ${userId}`);
    } else {
        console.warn(`Attempted to reset progress for non-existent user: ${userId}`);
    }
}

// Function to reset ALL users - use with caution!
export function resetAllProgress() {
    try {
        const cleanData = getInitialMasterData();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanData));
        console.log("All user progress has been reset.");
    } catch (error) {
        console.error('Failed to reset all progress in localStorage:', error);
    }
}


export function cacheAiExplanation(userId, chapterId, cardId, promptType, explanation) {
    if (!userId) return;
    const progress = getProgress(userId);
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
    saveProgress(userId, progress);
}

export function saveFlashcardNote(userId, chapterId, cardId, noteText) {
    if (!userId) return;
    const progress = getProgress(userId);
    if (!progress.chapters[chapterId]) {
        progress.chapters[chapterId] = { mastery: 0, flashcards: {}, title: '' };
    }
    if (!progress.chapters[chapterId].flashcards[cardId]) {
        progress.chapters[chapterId].flashcards[cardId] = {};
    }
    progress.chapters[chapterId].flashcards[cardId].note = noteText;
    saveProgress(userId, progress);
}