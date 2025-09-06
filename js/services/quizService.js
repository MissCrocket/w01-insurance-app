// js/services/quizService.js
import * as progressService from './progressService.js';
import { showToast } from '../utils/uiUtils.js';
import { state } from '../main.js';

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
    // FIX: Simplified mock exam creation.
    // Instead of relying on complex weighting, we now create a pool of all questions
    // from all chapters (excluding the specimen exam) and randomly sample from it.
    // This is more robust and ensures a full exam is always generated.
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
  } else {
    const chapter = chapters.find(c => c.id === chapterId);
    if (chapter) {
      const poolAll = tagQuestionsWithChapter(mcqOnly(chapter?.questions), chapter.id);
      allQuestions.push(...sampleFromPool(poolAll, Math.min(totalQuestions, poolAll.length)));
    }
  }

  const uniq = new Map();
  allQuestions.forEach((q) => {
    const key = q.id || `${q.question}::${JSON.stringify(q.options)}`;
    if (!uniq.has(key)) uniq.set(key, q);
  });
  
  return sampleFromPool(Array.from(uniq.values()), totalQuestions);
}

export function handleQuizFinish() {
  if (state.quizTimer) {
    clearInterval(state.quizTimer);
    state.quizTimer = null;
  }
  progressService.completeQuizAttempt(state.quizAttemptId, state.questions, state.answers);
  const chapterTitle = state.quizType === 'mock' ? 'Mock Exam' : state.quizType === 'specimen' ? 'Specimen Exam' : state.quizType === 'quick_quiz' ? 'Quick Quiz' : getChaptersFromGlobal().find(c => c.id === state.quizConfig.chapterId)?.title;
  const { streakExtended, currentStreak } = progressService.logActivity({ type: 'quiz', chapter: chapterTitle, score: `${state.answers.filter(a => a?.correct).length}/${state.questions.length}` });
  
  progressService.clearLastActivity(); // <-- ADD THIS LINE

  if (streakExtended) {
    showToast(`🔥 Streak extended to ${currentStreak} days! Keep it up!`);
  }
  state.screen = 'results';
  // We need to call render from main.js, so we'll just update the state here
}

export function startQuiz(questionList, quizDetails, renderFn) {
    const shuffledQuestionList = questionList.map(q => {
        if (q.type === 'mcq' && Array.isArray(q.options)) {
            const correctAnswerValue = q.options[q.correctIndex];
            const shuffledOptions = [...q.options];

            for (let i = shuffledOptions.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffledOptions[i], shuffledOptions[j]] = [shuffledOptions[j], shuffledOptions[i]];
            }

            const newCorrectIndex = shuffledOptions.findIndex(opt => opt === correctAnswerValue);

            return {
                ...q,
                options: shuffledOptions,
                correctIndex: newCorrectIndex,
                correct: newCorrectIndex
            };
        }
        return q;
    });

    state.questions = shuffledQuestionList.map(q => ({
        ...q,
        id: q.id || `${q.question.slice(0, 20)}-${Math.random()}`
    })) || [];
    state.answers = new Array(state.questions.length).fill(null);
    state.currentIndex = 0;
    state.score = 0;
    state.screen = 'quiz';
    state.questionState = 'unanswered';
    state.quizType = quizDetails.type;
    state.quizConfig = quizDetails.config;
    state.studyMode = quizDetails.studyMode || false;
    state.resultsFilter = 'all';
    state.isQuizNavVisible = false;
    state.answerRevealedForCurrent = false;

    if (state.quizType === 'mock' || state.quizType === 'specimen') {
        state.quizEndTime = Date.now() + 120 * 60 * 1000;
        state.quizTimer = setInterval(() => updateTimer(renderFn), 1000);
    }

    progressService.saveLastActivity({
        type: 'quiz',
        chapter: state.quizType === 'mock' ? 'Mock Exam' : state.quizType === 'specimen' ? 'Specimen Exam' : getChaptersFromGlobal().find(c => c.id === state.quizConfig.chapterId)?.title,
        config: quizDetails.config,
        studyMode: state.studyMode
    });
}

function updateTimer(renderFn) {
    const timerEl = document.getElementById('timer');
    if (!timerEl) {
        clearInterval(state.quizTimer);
        state.quizTimer = null;
        return;
    }

    const remaining = state.quizEndTime - Date.now();
    if (remaining <= 0) {
        clearInterval(state.quizTimer);
        state.quizTimer = null;
        handleQuizFinish();
        showToast("Time's up! Your exam has been submitted.", 5000);
        renderFn(); 
        return;
    }

    const minutes = Math.floor((remaining / 1000) / 60);
    const seconds = Math.floor((remaining / 1000) % 60);
    timerEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}