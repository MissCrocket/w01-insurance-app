// js/main.js
import * as progressService from './services/progressService.js';
import {
  STORAGE_KEY,
  FEATURE_FLAG_QUESTION_FLAGGING,
  FLAGGING_CONFIG
} from './config.js';
import { qs, qsa, announce, focusFirst, showToast } from './utils/ui.js';
import { renderTopics } from './views/topics.js';
import { renderQuiz } from './views/quiz.js';
import { renderResults } from './views/results.js';
import { renderLearning } from './views/learning.js';
import { renderProgress } from './views/progress.js';
import { renderManageCards } from './views/manage.js';
import { buildQuiz, startQuiz, handleQuizFinish } from './services/quizService.js';
import { startFlashcardSession, startDueFlashcardsSession } from './services/flashcardService.js';


export const SCREEN = {
  TOPICS: "topics",
  LEARNING: "learning",
  QUIZ: "quiz",
  RESULTS: "results",
  PROGRESS: "progress",
  MANAGE: "manage",
};

export const MODE = {
  MODULE: "module",
  MOCK: "mock",
  SPECIMEN: "specimen",
};

const Q_STATE = {
  UNANSWERED: "unanswered",
  ANSWERED: "answered",
};

export const state = {
  screen: SCREEN.TOPICS,
  mode: MODE.MODULE,
  selectedChapterId: null,
  currentIndex: 0,
  questions: [],
  answers: [],
  quizType: null,
  quizConfig: {},
  questionState: Q_STATE.UNANSWERED,
  score: 0,
  root: null,
  flashcardSession: {
    cards: [],
    currentIndex: 0,
    isFlipped: false,
    dueCards: 0,
  },
  quizAttemptId: null,
  flaggedQuestions: new Set(),
  resultsFilter: 'all',
  isQuizNavVisible: false,
  studyMode: false,
  quizTimer: null,
  quizEndTime: null,
  answerRevealedForCurrent: false,
};

function getChaptersFromGlobal() {
  const central = window.CII_W01_TUTOR_DATA?.chapters;
  if (Array.isArray(central) && central.length) return central;
  return [];
}

function render() {
  const root = state.root || qs("#app");
  root.innerHTML = "";

  renderResumeButton();

  let screenEl;
  let pageTitle = "CII W01 Tutor";
  const chapters = getChaptersFromGlobal();
  const chapter = chapters.find(c => c.id === state.selectedChapterId);

  switch (state.screen) {
    case SCREEN.TOPICS:
      screenEl = renderTopics();
      break;
    case SCREEN.LEARNING:
      screenEl = renderLearning();
      pageTitle = `Learning - ${state.flashcardSession.isCrossChapter ? 'All Due Cards' : chapter.title}`;
      break;
    case SCREEN.QUIZ:
      screenEl = renderQuiz();
      pageTitle = `Quiz - ${state.quizType === 'mock' ? 'Mock Exam' : state.quizType === 'specimen' ? 'Specimen Exam' : state.quizType === 'quick_quiz' ? 'Quick Quiz' : (chapter?.title || 'Quiz')}`;
      break;
    case SCREEN.RESULTS:
      screenEl = renderResults();
      pageTitle = `Results - ${state.quizType === 'mock' ? 'Mock Exam' : state.quizType === 'specimen' ? 'Specimen Exam' : state.quizType === 'quick_quiz' ? 'Quick Quiz' : (chapter?.title || 'Quiz')}`;
      break;
    case SCREEN.PROGRESS:
      screenEl = renderProgress();
      pageTitle = "My Progress";
      break;
    case SCREEN.MANAGE:
        screenEl = renderManageCards();
        pageTitle = `Manage Cards - ${chapter?.title}`;
        break;
    default:
      screenEl = document.createElement("div");
      screenEl.innerHTML = `<p>Unknown screen.</p>`;
  }

  root.appendChild(screenEl);
  document.title = pageTitle;
  announce(`Screen changed to ${state.screen}`);
  focusFirst(screenEl);
}

function renderResumeButton() {
    const container = qs('#resume-container');
    const progress = progressService.getProgress();
    const lastActivity = progress.lastActivity;

    if (!lastActivity || !container) {
        if (container) container.innerHTML = '';
        return;
    }

    let text = 'Resume Last Activity';
    if (lastActivity.type === 'quiz') {
        text = `Resume Quiz: ${lastActivity.chapter}`;
    } else if (lastActivity.type === 'flashcards') {
        text = `Resume Flashcards: ${lastActivity.chapter}`;
    }

    container.innerHTML = `
        <button id="resume-activity-btn" class="btn bg-amber-500 hover:bg-amber-600 w-full md:w-auto my-4">
            ↩️ ${text}
        </button>
    `;
}


function handleAppClick(event) {
  const {
    target
  } = event;
  const chapters = getChaptersFromGlobal();

  if (target.closest('.nav-link')) {
    const screen = target.closest('.nav-link').dataset.screen;
    state.screen = screen;
    render();
    return;
  }
  
  if (target.closest('#quick-practice-quiz')) {
        const questions = buildQuiz({ chapters, type: 'quick_quiz', totalQuestions: 10 });
        startQuiz(questions, { type: 'quick_quiz', config: { totalQuestions: 10 } }, render);
        render();
        return;
    }

if (target.id === 'add-to-notes-btn') {
    const aiResponse = qs('#ai-response')?.textContent.trim();
    const notesInput = qs('#flashcard-notes');
    if (aiResponse && notesInput) {
        const separator = notesInput.value.trim() ? '\n\n---\n\n' : '';
        notesInput.value += `${separator}${aiResponse}`;
        notesInput.dispatchEvent(new Event('input', { bubbles: true }));
        notesInput.scrollTop = notesInput.scrollHeight;
        showToast('Explanation added to notes!');
    }
    return;
}
    
if (target.id === 'clear-note-btn') {
    const notesInput = qs('#flashcard-notes');
    if (notesInput) {
        notesInput.value = '';
        notesInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
    return;
}

if (target.id === 'export-note-btn') {
    const notesInput = qs('#flashcard-notes');
    const cardTerm = state.flashcardSession.cards[state.flashcardSession.currentIndex].term;
    if (notesInput && notesInput.value) {
        const blob = new Blob([notesInput.value], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `W01 Note - ${cardTerm}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    return;
}

  if (target.closest('#close-welcome-modal')) {
    qs('#welcome-modal').classList.add('hidden');
    progressService.setHasSeenWelcome();
    return;
  }
  if (target.closest('#quick-start-due')) {
    qs('#welcome-modal').classList.add('hidden');
    progressService.setHasSeenWelcome();
    startDueFlashcardsSession();
    render();
    return;
  }
  if (target.closest('#quick-start-quiz')) {
    qs('#welcome-modal').classList.add('hidden');
    progressService.setHasSeenWelcome();
    const questions = buildQuiz({ chapters, type: 'quick_quiz', totalQuestions: 10 });
    startQuiz(questions, { type: 'quick_quiz', config: { totalQuestions: 10 } }, render);
    render();
    return;
  }
  if (target.closest('#quick-start-mock')) {
    qs('#welcome-modal').classList.add('hidden');
    progressService.setHasSeenWelcome();
    const questions = buildQuiz({ chapters, type: 'mock', totalQuestions: 100 });
    startQuiz(questions, { type: 'mock', config: { totalQuestions: 100 } }, render);
    render();
    return;
  }

  if (target.closest('#resume-activity-btn')) {
    const lastActivity = progressService.getProgress().lastActivity;
    if (lastActivity) {
      if (lastActivity.type === 'quiz') {
        const questions = buildQuiz({ chapters, ...lastActivity.config });
        startQuiz(questions, lastActivity, render);
      } else if (lastActivity.type === 'flashcards') {
        const chapter = chapters.find(c => c.id === lastActivity.chapterId);
        if (chapter) startFlashcardSession(chapter);
      } else if (lastActivity.type === 'due-flashcards') {
        startDueFlashcardsSession();
      }
      render();
    }
  }

  if (target.closest('#study-due-cards')) {
      startDueFlashcardsSession();
      render();
      return;
  }

  const topicCard = target.closest('.topic-card');
  if (topicCard) {
    if (state.mode === MODE.MOCK) {
      const questions = buildQuiz({
        chapters,
        type: 'mock',
        totalQuestions: 100
      });
      startQuiz(questions, {
        type: 'mock',
        config: {
          totalQuestions: 100
        }
      }, render);
    } else if (state.mode === MODE.SPECIMEN) {
      const questions = buildQuiz({
        chapters,
        type: 'specimen',
        totalQuestions: 100
      });
      startQuiz(questions, {
        type: 'specimen',
        config: {
          totalQuestions: 100
        }
      }, render);
    } else {
      state.selectedChapterId = topicCard.dataset.chapterId;
      const chapter = chapters.find(c => c.id === state.selectedChapterId);
      startFlashcardSession(chapter);
    }
    render();
  }

  if (FEATURE_FLAG_QUESTION_FLAGGING && target.closest('#flag-btn')) {
    const btn = target.closest('#flag-btn');
    const questionId = btn.dataset.questionId;
    const isCurrentlyFlagged = state.flaggedQuestions.has(questionId);

    if (isCurrentlyFlagged) {
      state.flaggedQuestions.delete(questionId);
      announce("Flag removed.");
    } else {
      state.flaggedQuestions.add(questionId);
      announce("Flag added.");
    }

    progressService.updateFlagStatus(state.quizAttemptId, questionId, !isCurrentlyFlagged);
    render();
    return;
  }
  
  if (target.id === 'toggle-quiz-nav') {
    state.isQuizNavVisible = !state.isQuizNavVisible;
    render();
    return;
  }


  if (FEATURE_FLAG_QUESTION_FLAGGING && target.closest('.quiz-nav-item')) {
    const navItem = target.closest('.quiz-nav-item');
    const index = parseInt(navItem.dataset.index, 10);
    if (index >= 0 && index < state.questions.length && index !== state.currentIndex) {
      state.currentIndex = index;
      state.questionState = state.answers[index] ? Q_STATE.ANSWERED : Q_STATE.UNANSWERED;
      state.answerRevealedForCurrent = false; // Reset reveal state when jumping
      render();
    }
    return;
  }

  if (target.closest('.actionable-weakness')) {
    const chapterId = target.closest('.actionable-weakness').dataset.chapterId;
    const chapter = chapters.find(c => c.id === chapterId);
    if (chapter) {
      const qsList = buildQuiz({ chapters, type: 'module', chapterId: chapter.id, totalQuestions: 10 });
      startQuiz(qsList, { type: 'module', config: { chapterId: chapter.id, totalQuestions: 10 }, studyMode: true }, render);
      render();
    }
    return;
  }

  if (target.id === 'back-btn' || target.id === 'back-to-topics-secondary') {
    state.screen = SCREEN.TOPICS;
    render();
  } else if (target.closest('.mode-switch .btn')) {
    state.mode = target.dataset.mode;
    render();
  }

  if (target.id === 'reveal-btn') {
    state.flashcardSession.isFlipped = true;
    render();
  } else if (target.closest('[data-prompt]')) {
    const btn = target.closest('[data-prompt]');
    const promptType = btn.dataset.prompt;
    const {
      term,
      definition
    } = state.flashcardSession.cards[state.flashcardSession.currentIndex];
    const responseContainer = qs('#ai-response');
    getAiExplanation(term, definition, promptType, responseContainer);
  } else if (target.closest('.confidence-btn')) {
    const btn = target.closest('.confidence-btn');
    const confidence = parseInt(btn.dataset.confidence, 10);
    const card = state.flashcardSession.cards[state.flashcardSession.currentIndex];
    const chapterId = card.chapterId || state.selectedChapterId;
    const chapter = chapters.find(c => c.id === chapterId);
    progressService.updateFlashcardConfidence(chapter.id, chapter.title, card.id, confidence);
    state.flashcardSession.currentIndex++;
    state.flashcardSession.isFlipped = false;
    const confidenceMap = {
      1: 'Forgot',
      2: 'Hard',
      3: 'Good',
      4: 'Easy',
      5: 'Perfect'
    };
    showToast(`Card marked as '${confidenceMap[confidence]}'`);
    render();
  } else if (target.id === 'quiz-btn') {
    const chapter = chapters.find(c => c.id === state.selectedChapterId);
    const qsList = buildQuiz({
      chapters,
      type: 'module',
      chapterId: chapter.id,
      totalQuestions: 15
    });
    startQuiz(qsList, {
      type: 'module',
      config: {
        chapterId: chapter.id,
        totalQuestions: 15
      },
      studyMode: true,
    }, render);
    render();
  }

  if (target.id === 'reveal-answer-btn') {
    state.answerRevealedForCurrent = true;
    render();
    return;
  }

  if (target.closest('.option-label') && state.questionState === Q_STATE.UNANSWERED) {
    const label = target.closest('.option-label');
    const chosenIndex = parseInt(label.dataset.index, 10);
    const q = state.questions[state.currentIndex];
    const correctIndex = q.correctIndex ?? q.options.indexOf(q.correctAnswer);
    const isCorrect = chosenIndex === correctIndex;
    state.answers[state.currentIndex] = {
      qid: q.id,
      selectedIndex: chosenIndex,
      correct: isCorrect
    };
    state.questionState = Q_STATE.ANSWERED;
    render();
  } else if (target.id === 'try-again-btn') {
    state.questionState = Q_STATE.UNANSWERED;
    state.answers[state.currentIndex] = null;
    render();
  } else if (target.id === 'next-btn') {
    state.currentIndex++;
    state.questionState = Q_STATE.UNANSWERED;
    state.answerRevealedForCurrent = false;
    render();
  } else if (target.id === 'finish-btn') {
    if (FEATURE_FLAG_QUESTION_FLAGGING && FLAGGING_CONFIG.enableWarningOnSubmit && state.flaggedQuestions.size > 0) {
      const modal = qs('#flag-submit-modal');
      const body = qs('#flag-submit-modal-body');
      body.textContent = `You have ${state.flaggedQuestions.size} flagged question(s). Are you sure you want to submit?`;
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    } else {
      handleQuizFinish();
      render();
    }
    return;
  } else if (target.id === 'quit-quiz') {
    if (state.quizTimer) {
        clearInterval(state.quizTimer);
        state.quizTimer = null;
    }
    Object.assign(state, {
      screen: SCREEN.TOPICS,
      questions: [],
      answers: [],
      currentIndex: 0,
      score: 0,
      quizType: null,
      quizConfig: {},
      quizAttemptId: null,
      flaggedQuestions: new Set()
    });
    render();
  }

  if (target.id === 'submit-anyway-btn') {
    qs('#flag-submit-modal').classList.add('hidden');
    handleQuizFinish();
    render();
    return;
  }
  if (target.id === 'review-flagged-btn') {
    qs('#flag-submit-modal').classList.add('hidden');
    const firstFlaggedIndex = state.questions.findIndex(q => state.flaggedQuestions.has(q.id));
    if (firstFlaggedIndex !== -1) {
      state.currentIndex = firstFlaggedIndex;
      state.questionState = state.answers[firstFlaggedIndex] ? Q_STATE.ANSWERED : Q_STATE.UNANSWERED;
      render();
    }
    return;
  }

  if(target.closest('[data-filter]')) {
    const filter = target.closest('[data-filter]').dataset.filter;
    state.resultsFilter = filter;
    render();
    return;
  }


  if (target.id === 'retry') {
    let newQuestions;
    const retryConfig = {
      type: state.quizType,
      config: state.quizConfig,
      studyMode: state.quizType === 'module',
    };
    if (state.quizType === 'specimen') {
       const chapters = getChaptersFromGlobal();
       newQuestions = buildQuiz({ chapters, type: 'specimen', totalQuestions: 100 });
    } else {
      newQuestions = buildQuiz({
        chapters,
        ...state.quizConfig
      });
    }
    startQuiz(newQuestions, retryConfig, render);
    render();
  } else if (target.id === 'back' && state.screen === SCREEN.RESULTS) {
    Object.assign(state, {
      screen: SCREEN.TOPICS,
      questions: [],
      answers: [],
      currentIndex: 0,
      score: 0,
      quizType: null,
      quizConfig: {},
      quizAttemptId: null,
      flaggedQuestions: new Set(),
      resultsFilter: 'all',
    });
    render();
  }

  if (target.id === 'manage-cards-btn') {
    state.screen = SCREEN.MANAGE;
    render();
  } else if (target.id === 'back-to-learning') {
    state.screen = SCREEN.LEARNING;
    render();
  }


  if (target.id === 'open-reset-modal') {
    qs('#reset-modal').classList.remove('hidden');
    qs('#reset-modal').classList.add('flex');
  } else if (target.id === 'cancel-reset') {
    qs('#reset-modal').classList.add('hidden');
    qs('#reset-modal').classList.remove('flex');
  } else if (target.id === 'confirm-reset') {
    progressService.resetProgress();
    qs('#reset-modal').classList.add('hidden');
    qs('#reset-modal').classList.remove('flex');
    render();
  }
}

document.addEventListener('chaptersLoaded', () => {
  state.root = qs("#app");

  document.body.addEventListener('click', (event) => {
    if (event.target.closest('#app') || event.target.closest('header') || event.target.closest('.modal') || event.target.closest('#resume-container')) {
      handleAppClick(event);
    }
  });

  const progress = progressService.getProgress();
  if (!progress.hasSeenWelcome) {
      qs('#welcome-modal').classList.remove('hidden');
      qs('#welcome-modal').classList.add('flex');
  }

  render();
});


document.addEventListener('keydown', (e) => {
  if (state.screen === SCREEN.LEARNING && state.flashcardSession.isFlipped) {
    const confidence = parseInt(e.key, 10);
    if (confidence >= 1 && confidence <= 5) {
      const card = state.flashcardSession.cards[state.flashcardSession.currentIndex];
      const chapterId = card.chapterId || state.selectedChapterId;
      const chapter = getChaptersFromGlobal().find(c => c.id === chapterId);
      progressService.updateFlashcardConfidence(chapter.id, chapter.title, card.id, confidence);
      state.flashcardSession.currentIndex++;
      state.flashcardSession.isFlipped = false;
      render();
    }
  }

  if (FEATURE_FLAG_QUESTION_FLAGGING && state.screen === SCREEN.QUIZ && e.key.toLowerCase() === 'f') {
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
      return;
    }
    e.preventDefault();
    const flagBtn = qs('#flag-btn');
    if (flagBtn) {
      flagBtn.click();
    }
  }
});

let draggedCard = null;

document.addEventListener('dragstart', (e) => {
  if (e.target.dataset.cardId) {
    const parentColumn = e.target.closest('[data-status]');
    if (parentColumn && parentColumn.dataset.status === 'new') {
      e.preventDefault();
      return;
    }
    
    draggedCard = e.target;
    setTimeout(() => {
      e.target.style.opacity = '0.5';
    }, 0);
  }
});

document.addEventListener('dragend', (e) => {
  if (e.target.dataset.cardId) {
    e.target.style.opacity = '1';
    draggedCard = null;
  }
});

document.addEventListener('dragover', (e) => {
  e.preventDefault();
  const column = e.target.closest('[data-status]');
  if (column) {
    const dropZone = column.querySelector('.card-list');
    if (dropZone) {
      dropZone.classList.add('drag-over');
    }
  }
});

document.addEventListener('dragleave', (e) => {
    const column = e.target.closest('[data-status]');
    if(column) {
        const dropZone = column.querySelector('.card-list');
        if (dropZone) {
          dropZone.classList.remove('drag-over');
        }
    }
});

document.addEventListener('drop', (e) => {
  e.preventDefault();
  if (draggedCard) {
    const column = e.target.closest('[data-status]');
    if (column) {
      const dropZone = column.querySelector('.card-list');
      dropZone.classList.remove('drag-over');
      const newStatus = column.dataset.status;
      const cardId = draggedCard.dataset.cardId;
      const chapter = getChaptersFromGlobal().find(c => c.id === state.selectedChapterId);

      progressService.updateCardStatus(chapter.id, cardId, newStatus);
      
      dropZone.appendChild(draggedCard);
      showToast(`Card moved to '${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}'`);
    }
  }
});