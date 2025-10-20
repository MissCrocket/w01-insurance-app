// js/services/quizService.js
import * as progressService from './progressService.js';
import { showToast } from '../utils/uiUtils.js';
import { state } from '../main.js'; // Import state

// ... (getChaptersFromGlobal, isMCQ, mcqOnly, sampleFromPool, buildQuiz remain mostly the same)
function getChaptersFromGlobal() {
  const central = window.CII_W01_TUTOR_DATA?.chapters;
  if (Array.isArray(central) && central.length) return central;
  return [];
}

const isMCQ = (q) => q && q.type === "mcq" && Array.isArray(q.options) && q.options.length > 1;

function mcqOnly(arr) {
  return (arr || []).filter(isMCQ);
}

function sampleFromPool(pool, n) {
  const arr = pool.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, n);
}

export function buildQuiz(config) {
  const {
    chapters,
    type,
    chapterId,
    totalQuestions,
    customChapters
  } = config;
  let allQuestions = [];

  const tagQuestionsWithChapter = (questions, chapterId) => {
      return questions.map(q => ({...q, chapterId}));
  };

  if (type === 'custom' && Array.isArray(customChapters)) {
    const customPool = chapters
      .filter(c => customChapters.includes(c.id))
      .flatMap(c => tagQuestionsWithChapter(mcqOnly(c.questions), c.id));
    allQuestions.push(...sampleFromPool(customPool, Math.min(totalQuestions, customPool.length)));
  } else if (type === 'mock') {
    const mockPool = chapters
        .filter(c => c.id !== 'specimen_exam')
        .flatMap(c => tagQuestionsWithChapter(mcqOnly(c.questions), c.id));
    allQuestions.push(...sampleFromPool(mockPool, totalQuestions));
  } else if (type === 'quick_quiz') {
    const allMcqs = chapters.filter(c => c.id !== 'specimen_exam').flatMap(c => tagQuestionsWithChapter(mcqOnly(c.questions), c.id));
    allQuestions.push(...sampleFromPool(allMcqs, totalQuestions));
  } else if (type === 'specimen') {
      const specimenChapter = chapters.find(c => c.id === 'specimen_exam');
      if (specimenChapter) {
        allQuestions.push(...tagQuestionsWithChapter(mcqOnly(specimenChapter.questions), 'specimen_exam'));
      }
  } else { // module type
    const chapter = chapters.find(c => c.id === chapterId);
    if (chapter) {
      const poolAll = tagQuestionsWithChapter(mcqOnly(chapter?.questions), chapter.id);
      allQuestions.push(...sampleFromPool(poolAll, Math.min(totalQuestions, poolAll.length)));
    }
  }

  // Ensure unique questions based on ID or content
  const uniq = new Map();
  allQuestions.forEach((q) => {
    const key = q.id || `${q.question}::${JSON.stringify(q.options)}`;
    if (!uniq.has(key)) uniq.set(key, q);
  });

  // Final sample to ensure correct totalQuestions if uniqueness reduced the pool
  return sampleFromPool(Array.from(uniq.values()), totalQuestions);
}


// Modified to use state.currentUser when calling progressService
export function handleQuizFinish() { // Removed userId parameter, will get from state
    const currentUser = state.currentUser;
    if (!currentUser) {
        console.error("Cannot finish quiz: No current user.");
        // Optionally redirect to user selection
        state.screen = 'user_selection';
        // render() will be called externally
        return;
    }

    if (state.quizTimer) {
        clearInterval(state.quizTimer);
        state.quizTimer = null;
    }
    // Pass user to completeQuizAttempt
    progressService.completeQuizAttempt(currentUser, state.quizAttemptId, state.questions, state.answers);

    // Determine chapter title for logging
    const chapterTitle = state.quizType === 'mock' ? 'Mock Exam'
                       : state.quizType === 'specimen' ? 'Specimen Exam'
                       : state.quizType === 'quick_quiz' ? 'Quick Quiz'
                       : getChaptersFromGlobal().find(c => c.id === state.quizConfig.chapterId)?.title || 'Chapter Quiz';

    const scoreText = `${state.answers.filter(a => a?.correct).length}/${state.questions.length}`;

    // Pass user to logActivity
    const { streakExtended, currentStreak } = progressService.logActivity(currentUser, { type: 'quiz', chapter: chapterTitle, score: scoreText, chapterId: state.quizConfig.chapterId });

    if (streakExtended) {
        showToast(`🔥 Streak extended to ${currentStreak} days! Keep it up!`);
    }

    state.screen = 'results';
    // The external render() call in main.js will handle the UI update
}


// Modified to use state.currentUser for creating the attempt
export function startQuiz(questionList, quizDetails, renderFn) {
    const currentUser = state.currentUser;
    if (!currentUser) {
        console.error("Cannot start quiz: No current user selected.");
        showToast("Please select a user first.", 3000);
        state.screen = 'user_selection'; // Redirect to user selection
        // renderFn will be called from the main loop to update UI
        return;
    }

    // Generate a unique ID for this quiz attempt
    const attemptId = `quiz_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    state.quizAttemptId = attemptId; // Store attempt ID in global state


    // Shuffle options within each question
    const shuffledQuestionList = questionList.map(q => {
        if (q.type === 'mcq' && Array.isArray(q.options)) {
            const correctAnswerValue = q.options[q.correctIndex];
            const shuffledOptions = [...q.options];

            // Fisher-Yates shuffle
            for (let i = shuffledOptions.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffledOptions[i], shuffledOptions[j]] = [shuffledOptions[j], shuffledOptions[i]];
            }

            const newCorrectIndex = shuffledOptions.findIndex(opt => opt === correctAnswerValue);

            // Basic validation: Ensure correct answer is still present
            if (newCorrectIndex === -1) {
                console.warn("Correct answer lost during option shuffle for question:", q.question);
                // Fallback: Don't shuffle if something went wrong
                return { ...q, options: q.options, correctIndex: q.correctIndex, correct: q.correctIndex };
            }

            return {
                ...q,
                options: shuffledOptions,
                correctIndex: newCorrectIndex,
                correct: newCorrectIndex // Keep 'correct' for compatibility if needed elsewhere
            };
        }
        return q; // Return non-MCQ questions as is
    });

    // Map questions and assign unique IDs if they don't have one
    state.questions = shuffledQuestionList.map(q => ({
        ...q,
        // Use existing ID or generate one based on question text + options hash/random
        id: q.id || `${q.question?.slice(0, 20) || 'q'}-${Math.random().toString(16).slice(2)}`
    })) || [];

    // Initialize or load attempt data (passing user and attemptId)
    progressService.getOrCreateQuizAttempt(currentUser, attemptId, state.questions);

    // Initialize quiz state
    state.answers = new Array(state.questions.length).fill(null); // Always start fresh answers for a new attempt
    state.currentIndex = 0;
    state.score = 0; // Reset score
    state.screen = 'quiz';
    state.questionState = 'unanswered'; // Start with first question unanswered
    state.quizType = quizDetails.quizType || quizDetails.type;
    state.quizConfig = quizDetails.config || {}; // Store original config
    state.studyMode = quizDetails.studyMode || false;
    state.flaggedQuestions = new Set(); // Reset flags for new attempt
    state.resultsFilter = 'all';
    state.isQuizNavVisible = false; // Default nav state
    state.answerRevealedForCurrent = false; // Reset reveal state


    // Clear any previous timer and start new one if applicable
    if (state.quizTimer) {
        clearInterval(state.quizTimer);
        state.quizTimer = null;
    }
    if (state.quizType === 'mock' || state.quizType === 'specimen') {
        state.quizEndTime = Date.now() + 120 * 60 * 1000; // 2 hours
        state.quizTimer = setInterval(() => updateTimer(renderFn), 1000);
    }
    // No need to call renderFn here, main.js loop handles it after state update
}

// Timer function remains the same, but relies on handleQuizFinish which now uses state.currentUser
function updateTimer(renderFn) {
    const timerEl = document.getElementById('timer');
    if (!timerEl) {
        if (state.quizTimer) clearInterval(state.quizTimer);
        state.quizTimer = null;
        return;
    }

    const remaining = state.quizEndTime - Date.now();
    if (remaining <= 0) {
        if (state.quizTimer) clearInterval(state.quizTimer);
        state.quizTimer = null;
        // handleQuizFinish will be called, using state.currentUser implicitly
        handleQuizFinish();
        showToast("Time's up! Your exam has been submitted.", 5000);
        renderFn(); // Trigger re-render externally
        return;
    }

    const minutes = Math.floor((remaining / 1000) / 60);
    const seconds = Math.floor((remaining / 1000) % 60);
    timerEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}