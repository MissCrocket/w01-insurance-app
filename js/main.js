// js/main.js
import * as progressService from './services/progressService.js';
import { STORAGE_KEY, FEATURE_FLAG_QUESTION_FLAGGING, FLAGGING_CONFIG } from './config.js';
import { qs, qsa, announce, focusFirst, showToast } from './utils/uiUtils.js';
import { renderTopics } from './views/topics.js';
import { renderQuiz } from './views/quiz.js';
import { renderResults } from './views/results.js';
import { renderLearning } from './views/learning.js';
import { renderProgress } from './views/progress.js';
import { renderManageCards } from './views/manage.js';
import { renderUserSelection } from './views/userSelection.js';
import { buildQuiz, startQuiz, handleQuizFinish } from './services/quizService.js';
import { startFlashcardSession, startDueFlashcardsSession } from './services/flashcardService.js';
import { getAiExplanation } from './services/aiService.js';

// ... (SCREEN, MODE, Q_STATE, and state object are the same)
export const SCREEN = {
    TOPICS: "topics",
    LEARNING: "learning",
    QUIZ: "quiz",
    RESULTS: "results",
    PROGRESS: "progress",
    MANAGE: "manage",
    USER_SELECTION: "user_selection", // <-- Add new screen state
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
    screen: SCREEN.USER_SELECTION, // <-- Default to user selection
    mode: MODE.MODULE,
    currentUser: null, // <-- Add currentUser to state
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
        isCrossChapter: false, // <-- Added flag for cross-chapter sessions
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
// --- NEW --- Add User Modal Logic
const avatars = ['👤', '🧑‍🎓', '👩‍🏫', '👨‍💼', '👩‍🔬', '👨‍🚀', '🦸‍♀️', '🕵️‍♂️', '🦉', '🦊'];
const themes = ['blue', 'green', 'orange', 'purple', 'red'];

function populateAddUserModal() {
  const avatarPicker = qs('#avatar-picker');
  const themePicker = qs('#theme-picker');
  if (!avatarPicker || !themePicker) return;

  avatarPicker.innerHTML = avatars.map(avatar => `
    <div class="avatar-option" data-avatar="${avatar}">${avatar}</div>
  `).join('');

  themePicker.innerHTML = themes.map(theme => `
    <div class="theme-option theme-${theme}" data-theme="${theme}"></div>
  `).join('');

  // Add click listeners
  qsa('.avatar-option').forEach(option => {
    option.addEventListener('click', () => {
      qsa('.avatar-option').forEach(opt => opt.classList.remove('selected'));
      option.classList.add('selected');
    });
  });

  qsa('.theme-option').forEach(option => {
    option.addEventListener('click', () => {
      qsa('.theme-option').forEach(opt => opt.classList.remove('selected'));
      option.classList.add('selected');
    });
  });

  // Select defaults
  qs('.avatar-option').classList.add('selected');
  qs('.theme-option').classList.add('selected');
}

function openAddUserModal() {
  const modal = qs('#add-user-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    populateAddUserModal();
  }
}

function closeAddUserModal() {
  const modal = qs('#add-user-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

function handleAddUser() {
  const newUserName = qs('#new-user-name').value.trim();
  const selectedAvatar = qs('.avatar-option.selected').dataset.avatar;
  const selectedTheme = qs('.theme-option.selected').dataset.theme;

  if (newUserName) {
    if (progressService.addUser(newUserName, selectedAvatar, selectedTheme)) {
      if (progressService.setCurrentUser(newUserName)) {
        state.currentUser = newUserName;
        render();
      } else {
        render(true);
      }
      closeAddUserModal();
    } else {
      alert(`User "${newUserName}" already exists or is invalid.`);
    }
  } else {
    alert('Please enter a name for the new user.');
  }
}
// --- END NEW ---

/**
 * Main render function. Also handles updating the "Switch User" button visibility.
 * @param {boolean} forceUserSelection - If true, renders the user selection screen regardless of currentUser state.
 */
function render(forceUserSelection = false) {
    const root = state.root || qs("#app");
    root.innerHTML = ""; // Clear previous content

    // --- Update Header ---
    const switchUserButton = qs('#switch-user-btn');
    const currentUserDisplay = qs('#current-user-display');
    if (state.currentUser && !forceUserSelection) {
        if (switchUserButton) switchUserButton.classList.remove('hidden');
        if (currentUserDisplay) {
            currentUserDisplay.textContent = `User: ${state.currentUser}`;
            currentUserDisplay.classList.remove('hidden');
        }
         state.screen = state.screen === SCREEN.USER_SELECTION ? SCREEN.TOPICS : state.screen; // Go to topics if user selected
    } else {
        if (switchUserButton) switchUserButton.classList.add('hidden');
        if (currentUserDisplay) currentUserDisplay.classList.add('hidden');
        state.screen = SCREEN.USER_SELECTION; // Force user selection if no user or forced
    }
    // --- End Update Header ---


    let screenEl;
    let pageTitle = "CII W01 Tutor";
    const chapters = getChaptersFromGlobal();
    const chapter = chapters.find(c => c.id === state.selectedChapterId);

    // --- Screen Rendering Logic ---
    switch (state.screen) {
        case SCREEN.USER_SELECTION:
            screenEl = renderUserSelection(render); // Pass render itself as the callback
            pageTitle = "Select User - CII W01 Tutor";
            break;
        case SCREEN.TOPICS:
            screenEl = renderTopics(); // Assumes renderTopics is correctly implemented
            break;
        case SCREEN.LEARNING:
            screenEl = renderLearning();
             pageTitle = `Learning - ${state.flashcardSession.isCrossChapter ? 'All Due Cards' : (chapter?.title || 'Chapter')} - ${state.currentUser}`;
            break;
        case SCREEN.QUIZ:
            screenEl = renderQuiz();
            pageTitle = `Quiz - ${state.quizType === 'mock' ? 'Mock Exam' : state.quizType === 'specimen' ? 'Specimen Exam' : state.quizType === 'quick_quiz' ? 'Quick Quiz' : (chapter?.title || 'Quiz')} - ${state.currentUser}`;
            break;
        case SCREEN.RESULTS:
            screenEl = renderResults();
            pageTitle = `Results - ${state.quizType === 'mock' ? 'Mock Exam' : state.quizType === 'specimen' ? 'Specimen Exam' : state.quizType === 'quick_quiz' ? 'Quick Quiz' : (chapter?.title || 'Quiz')} - ${state.currentUser}`;
            break;
        case SCREEN.PROGRESS:
            screenEl = renderProgress();
            pageTitle = `My Progress - ${state.currentUser}`;
            break;
        case SCREEN.MANAGE:
            screenEl = renderManageCards();
            pageTitle = `Manage Cards - ${chapter?.title} - ${state.currentUser}`;
            break;
        default:
            screenEl = document.createElement("div");
            screenEl.innerHTML = `<p>Unknown screen.</p>`;
    }

    if (screenEl) { // Ensure screenEl is defined before appending
        root.appendChild(screenEl);
        document.title = pageTitle;
        // Announce screen change only if not user selection (less disruptive)
        if (state.screen !== SCREEN.USER_SELECTION) {
            announce(`Screen changed to ${state.screen.replace('_', ' ')} for user ${state.currentUser}`);
            focusFirst(screenEl);
        } else {
             announce(`Please select or add a user profile.`);
            // Focus on the first button or the input field
             const firstButton = qs('.user-select-btn', screenEl);
             const nameInput = qs('#new-user-name', screenEl);
             if(firstButton) firstButton.focus();
             else if (nameInput) nameInput.focus();
             else focusFirst(screenEl); // Fallback
        }
    } else {
        console.error("Screen element was not created for state:", state.screen);
        root.innerHTML = `<p>Error loading screen.</p>`; // Provide fallback UI
    }
}


function handleAppClick(event) {
    const { target } = event;
    const chapters = getChaptersFromGlobal();
    const currentUser = state.currentUser;

    if (target.id === 'open-add-user-modal-btn') {
      openAddUserModal();
      return;
    }

    if (target.id === 'cancel-add-user-btn') {
      closeAddUserModal();
      return;
    }

    if (target.id === 'confirm-add-user-btn') {
      handleAddUser();
      return;
    }

    // --- Navigation and Mode Switching ---
    if (target.closest('.nav-link')) {
        if (!currentUser) return; // Don't allow navigation if no user selected
        const screen = target.closest('.nav-link').dataset.screen;
        if (screen === SCREEN.PROGRESS || screen === SCREEN.TOPICS) { // Allow only these for now
            state.screen = screen;
            render();
        }
        return;
    }

    if (target.closest('#switch-user-btn')) {
        progressService.setCurrentUser(null); // Clear the current user in storage
        state.currentUser = null; // Clear in-memory state
        state.screen = SCREEN.USER_SELECTION; // Set screen state
        render(); // Re-render to show user selection
        return;
    }


    if (target.closest('.mode-switch .btn')) {
         if (!currentUser) return; // Requires user
        const btn = target.closest('.mode-switch .btn');
        const newMode = btn.dataset.mode;
        if (state.mode !== newMode) {
            state.mode = newMode;
            render();
        }
        return;
    }

    // --- Welcome Modal ---
    if (target.closest('#close-welcome-modal')) {
        if (!currentUser) return;
        qs('#welcome-modal').classList.add('hidden');
        progressService.setHasSeenWelcome(currentUser);
        return;
    }
    if (target.closest('#quick-start-due')) {
        if (!currentUser) return;
        qs('#welcome-modal').classList.add('hidden');
        progressService.setHasSeenWelcome(currentUser);
        startDueFlashcardsSession(currentUser); // Pass user
        render();
        return;
    }
    if (target.closest('#quick-start-quiz') || target.closest('#quick-practice-quiz')) { // Combined handler
        if (!currentUser) return;
        if(qs('#welcome-modal') && !qs('#welcome-modal').classList.contains('hidden')) {
            qs('#welcome-modal').classList.add('hidden');
            progressService.setHasSeenWelcome(currentUser);
        }
        const questions = buildQuiz({ chapters, type: 'quick_quiz', totalQuestions: 10 });
        startQuiz(questions, { type: 'quick_quiz', config: { totalQuestions: 10 } }, render); // startQuiz now needs user internally via state
        render();
        return;
    }
    if (target.closest('#quick-start-mock')) {
        if (!currentUser) return;
        qs('#welcome-modal').classList.add('hidden');
        progressService.setHasSeenWelcome(currentUser);
        const questions = buildQuiz({ chapters, type: 'mock', totalQuestions: 100 });
        startQuiz(questions, { type: 'mock', config: { totalQuestions: 100 } }, render); // startQuiz now needs user internally via state
        render();
        return;
    }

    // --- Topic/Exam Selection ---
    if (target.closest('#study-due-cards')) {
        if (!currentUser) return;
        startDueFlashcardsSession(currentUser); // Pass user
        render();
        return;
    }

    const topicCard = target.closest('.topic-card');
    if (topicCard) {
        if (!currentUser) return;
        if (state.mode === MODE.MOCK) {
            const questions = buildQuiz({ chapters, type: 'mock', totalQuestions: 100 });
            startQuiz(questions, { type: 'mock', config: { totalQuestions: 100 } }, render);
        } else if (state.mode === MODE.SPECIMEN) {
             const questions = buildQuiz({ chapters, type: 'specimen', totalQuestions: 100 });
             startQuiz(questions, { type: 'specimen', config: { totalQuestions: 100 } }, render);
        } else {
            state.selectedChapterId = topicCard.dataset.chapterId;
            const chapter = chapters.find(c => c.id === state.selectedChapterId);
            if (chapter) {
                startFlashcardSession(chapter, currentUser); // Pass user
            } else {
                 console.error("Selected chapter not found:", state.selectedChapterId);
                 return; // Prevent rendering if chapter is invalid
            }
        }
        render();
        return; // Added return
    }

    // --- Quiz Screen Actions ---
    if (state.screen === SCREEN.QUIZ) {
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
            // Update storage - Needs user context
            progressService.updateFlagStatus(currentUser, state.quizAttemptId, questionId, !isCurrentlyFlagged);
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
                state.answerRevealedForCurrent = false;
                render();
            }
            return;
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
             // Ensure q and options exist before proceeding
             if (!q || !q.options) {
                 console.error("Current question or options are invalid.");
                 return;
             }
            const correctIndex = q.correctIndex ?? q.options.indexOf(q.correctAnswer);
            const isCorrect = chosenIndex === correctIndex;
            state.answers[state.currentIndex] = {
                qid: q.id,
                selectedIndex: chosenIndex,
                correct: isCorrect
            };
            state.questionState = Q_STATE.ANSWERED;
            render();
            return; // Added return
        }

        if (target.id === 'try-again-btn') {
            state.questionState = Q_STATE.UNANSWERED;
            state.answers[state.currentIndex] = null; // Clear previous answer
            render();
            return;
        }

        if (target.id === 'next-btn') {
             if (state.currentIndex < state.questions.length - 1) { // Prevent going beyond last question
                 state.currentIndex++;
                 state.questionState = state.answers[state.currentIndex] ? Q_STATE.ANSWERED : Q_STATE.UNANSWERED; // Check next question's state
                 state.answerRevealedForCurrent = false; // Reset reveal status for new question
                 render();
             } else {
                 // Maybe trigger finish if it's the last question? Or disable button?
                 // For now, just do nothing if already on the last question.
             }
            return;
        }

        if (target.id === 'finish-btn') {
            if (FEATURE_FLAG_QUESTION_FLAGGING && FLAGGING_CONFIG.enableWarningOnSubmit && state.flaggedQuestions.size > 0) {
                const modal = qs('#flag-submit-modal');
                const body = qs('#flag-submit-modal-body');
                body.textContent = `You have ${state.flaggedQuestions.size} flagged question(s). Are you sure you want to submit?`;
                modal.classList.remove('hidden');
                modal.classList.add('flex');
            } else {
                handleQuizFinish(currentUser); // Pass user
                render();
            }
            return;
        }
         if (target.id === 'quit-quiz') {
             if (state.quizTimer) {
                 clearInterval(state.quizTimer);
                 state.quizTimer = null;
             }
             state.screen = SCREEN.TOPICS;
             render();
             showToast('Quiz aborted.', 3000);
             return; // Added return
         }

        // --- Flagged Submit Modal (inside Quiz Screen check) ---
        if (target.id === 'submit-anyway-btn') {
            qs('#flag-submit-modal').classList.add('hidden');
            handleQuizFinish(currentUser); // Pass user
            render();
            return;
        }
        if (target.id === 'review-flagged-btn') {
            qs('#flag-submit-modal').classList.add('hidden');
            const firstFlaggedIndex = state.questions.findIndex(q => state.flaggedQuestions.has(q.id));
            if (firstFlaggedIndex !== -1) {
                state.currentIndex = firstFlaggedIndex;
                state.questionState = state.answers[firstFlaggedIndex] ? Q_STATE.ANSWERED : Q_STATE.UNANSWERED;
                state.answerRevealedForCurrent = false; // Reset reveal state
                render();
            }
            return;
        }
    } // End of QUIZ screen actions

    // --- Learning Screen Actions ---
    if (state.screen === SCREEN.LEARNING) {
        if (target.id === 'reveal-btn') {
            state.flashcardSession.isFlipped = true;
            render();
            return; // Added return
        }
        if (target.closest('[data-prompt]')) {
             const btn = target.closest('[data-prompt]');
             const promptType = btn.dataset.prompt;
             const card = state.flashcardSession.cards[state.flashcardSession.currentIndex];
              // Ensure card exists before accessing properties
             if (!card) {
                 console.error("No card found at current index for AI prompt.");
                 return;
             }
             const { term, definition } = card;
             const responseContainer = qs('#ai-response');
             getAiExplanation(term, definition, promptType, responseContainer); // Needs user context if caching requires it (progressService handles it)
             return; // Added return
        }
        if (target.closest('.confidence-btn')) {
            const btn = target.closest('.confidence-btn');
            const confidence = parseInt(btn.dataset.confidence, 10);
            const card = state.flashcardSession.cards[state.flashcardSession.currentIndex];
             // Ensure card exists before proceeding
            if (!card) {
                console.error("No card found at current index for confidence update.");
                render(); // Re-render to potentially show completion screen
                return;
            }
            const chapterId = card.chapterId || state.selectedChapterId; // Use chapterId from card if available (cross-chapter session)
            const chapter = chapters.find(c => c.id === chapterId);
             // Ensure chapter exists
            if (!chapter) {
                 console.error("Chapter not found for card:", chapterId);
                 return;
            }
            progressService.updateFlashcardConfidence(currentUser, chapter.id, chapter.title, card.id, confidence); // Pass user
            state.flashcardSession.currentIndex++;
            state.flashcardSession.isFlipped = false;
            const confidenceMap = { 1: 'Forgot', 2: 'Hard', 3: 'Good', 4: 'Easy', 5: 'Perfect' };
            showToast(`Card marked as '${confidenceMap[confidence]}'`);
            render();
            return; // Added return
        }

        if (target.id === 'quiz-btn') {
            if (state.flashcardSession.isCrossChapter) {
                 // Handle quiz for cross-chapter session - maybe a quick quiz?
                 showToast("Quiz from 'All Due Cards' session not implemented yet. Taking a Quick Quiz instead.");
                 const questions = buildQuiz({ chapters, type: 'quick_quiz', totalQuestions: 10 });
                 startQuiz(questions, { type: 'quick_quiz', config: { totalQuestions: 10 } }, render);
            } else {
                 const chapter = chapters.find(c => c.id === state.selectedChapterId);
                 if (chapter) {
                     const qsList = buildQuiz({ chapters, type: 'module', chapterId: chapter.id, totalQuestions: 15 });
                     startQuiz(qsList, { type: 'module', config: { chapterId: chapter.id, totalQuestions: 15 }, studyMode: true }, render);
                 } else {
                     console.error("Chapter not found for quiz:", state.selectedChapterId);
                     state.screen = SCREEN.TOPICS; // Go back to topics if chapter invalid
                 }
            }
            render();
            return; // Added return
        }

         if (target.id === 'add-to-notes-btn') {
             const aiResponse = qs('#ai-response')?.textContent.trim();
             const notesInput = qs('#flashcard-notes');
             if (aiResponse && notesInput) {
                 const separator = notesInput.value.trim() ? '\n\n---\n\n' : '';
                 notesInput.value += `${separator}${aiResponse}`;
                 // Manually trigger the input event to force save
                 notesInput.dispatchEvent(new Event('input', { bubbles: true }));
                 notesInput.scrollTop = notesInput.scrollHeight; // Scroll to bottom
                 showToast('Explanation added to notes!');
             }
             return;
         }
         if (target.id === 'clear-note-btn') {
            const notesInput = qs('#flashcard-notes');
            if (notesInput) {
                notesInput.value = '';
                notesInput.dispatchEvent(new Event('input', { bubbles: true })); // Trigger save
            }
            return;
        }
        if (target.id === 'export-note-btn') {
             const notesInput = qs('#flashcard-notes');
             const card = state.flashcardSession.cards[state.flashcardSession.currentIndex];
             if (notesInput && notesInput.value && card) {
                 const cardTerm = card.term;
                 const blob = new Blob([notesInput.value], { type: 'text/plain' });
                 const url = URL.createObjectURL(blob);
                 const a = document.createElement('a');
                 a.href = url;
                 a.download = `W01 Note - ${cardTerm}.txt`;
                 document.body.appendChild(a);
                 a.click();
                 document.body.removeChild(a);
                 URL.revokeObjectURL(url);
             } else {
                 showToast('Nothing to export.');
             }
             return;
        }


         if (target.id === 'manage-cards-btn') {
             state.screen = SCREEN.MANAGE;
             render();
             return;
         }
    } // End of LEARNING screen actions


    // --- General Back/Retry ---
    if (target.id === 'back-btn' || target.id === 'back-to-topics-secondary' || (target.id === 'back' && state.screen === SCREEN.RESULTS)) {
        // Reset quiz/learning state if necessary when going back to topics
        Object.assign(state, {
            screen: SCREEN.TOPICS,
            selectedChapterId: (state.screen === SCREEN.RESULTS || state.screen === SCREEN.LEARNING || state.screen === SCREEN.QUIZ) ? null : state.selectedChapterId, // Keep chapter if just browsing topics
            questions: [],
            answers: [],
            currentIndex: 0,
            score: 0,
            quizType: null,
            quizConfig: {},
            quizAttemptId: null,
            flaggedQuestions: new Set(),
            resultsFilter: 'all',
            flashcardSession: { cards: [], currentIndex: 0, isFlipped: false, dueCards: 0, isCrossChapter: false }, // Reset flashcard session
        });
        if (state.quizTimer) { // Clear timer if active
            clearInterval(state.quizTimer);
            state.quizTimer = null;
        }
        render();
        return; // Added return
    }

     if (target.id === 'retry' && state.screen === SCREEN.RESULTS) {
         let newQuestions;
         const retryConfig = {
             quizType: state.quizType, // Use quizType instead of type
             config: state.quizConfig,
             studyMode: state.quizType === 'module', // Assuming module quizzes are study mode
         };
         // Re-build questions based on the original config
         newQuestions = buildQuiz({ chapters, type: state.quizType, ...state.quizConfig }); // Simplified rebuilding

         startQuiz(newQuestions, retryConfig, render); // Pass retryConfig
         render();
         return; // Added return
     }


    // --- Progress Screen Actions ---
     if (state.screen === SCREEN.PROGRESS) {
         if (target.closest('.actionable-weakness')) {
             const chapterId = target.closest('.actionable-weakness').dataset.chapterId;
             const chapter = chapters.find(c => c.id === chapterId);
             if (chapter) {
                 // Start a targeted quiz for the weakness
                 const qsList = buildQuiz({ chapters, type: 'module', chapterId: chapter.id, totalQuestions: 10 });
                 startQuiz(qsList, { type: 'module', config: { chapterId: chapter.id, totalQuestions: 10 }, studyMode: true }, render);
                 render();
             }
             return;
         }
          if (target.id === 'open-reset-modal') {
             qs('#reset-modal').classList.remove('hidden');
             qs('#reset-modal').classList.add('flex');
             return;
         }
         if (target.id === 'cancel-reset') {
             qs('#reset-modal').classList.add('hidden');
             qs('#reset-modal').classList.remove('flex');
             return;
         }
         if (target.id === 'confirm-reset') {
             if (confirm(`This will reset ALL progress for user "${currentUser}". Are you absolutely sure?`)) {
                 progressService.resetProgress(currentUser); // Reset only current user
                 qs('#reset-modal').classList.add('hidden');
                 qs('#reset-modal').classList.remove('flex');
                 render(); // Re-render progress screen (should show empty state)
             }
             return;
         }
     } // End of PROGRESS screen actions

    // --- Manage Cards Screen Actions ---
     if (state.screen === SCREEN.MANAGE) {
         if (target.id === 'back-to-learning') {
             state.screen = SCREEN.LEARNING;
             render();
             return;
         }
     } // End of MANAGE screen actions

     // --- Results Screen Actions ---
      if (state.screen === SCREEN.RESULTS) {
          if (target.closest('[data-filter]')) {
              const filter = target.closest('[data-filter]').dataset.filter;
              state.resultsFilter = filter;
              render();
              return;
          }
      } // End of RESULTS screen actions

}

// --- Initialization ---
document.addEventListener('chaptersLoaded', () => {
    state.root = qs("#app");

    document.body.addEventListener('click', (event) => {
        // Delegate clicks within app, header, or modals
        if (event.target.closest('#app') || event.target.closest('header') || event.target.closest('.modal')) {
            handleAppClick(event);
        }
    });

    // --- Check for current user on load ---
    const user = progressService.getCurrentUser();
    if (user) {
        state.currentUser = user;
        // Check if welcome modal should be shown for this user
        const progress = progressService.getProgress(user);
        if (!progress.hasSeenWelcome) {
            qs('#welcome-modal').classList.remove('hidden');
            qs('#welcome-modal').classList.add('flex');
        }
         state.screen = SCREEN.TOPICS; // Go to topics if user exists
    } else {
        state.screen = SCREEN.USER_SELECTION; // Otherwise, force selection
    }
    // --- End Check ---

    render(); // Initial render based on user status
});

// --- Global Keydown Listeners ---
document.addEventListener('keydown', (e) => {
     if (!state.currentUser) return; // Ignore if no user selected

    // Flashcard confidence rating (1-5)
    if (state.screen === SCREEN.LEARNING && state.flashcardSession.isFlipped) {
        const confidence = parseInt(e.key, 10);
        if (confidence >= 1 && confidence <= 5) {
            const card = state.flashcardSession.cards[state.flashcardSession.currentIndex];
             if (!card) return; // Exit if no card
            const chapterId = card.chapterId || state.selectedChapterId;
            const chapter = getChaptersFromGlobal().find(c => c.id === chapterId);
             if (!chapter) return; // Exit if chapter not found

            progressService.updateFlashcardConfidence(state.currentUser, chapter.id, chapter.title, card.id, confidence);
            state.flashcardSession.currentIndex++;
            state.flashcardSession.isFlipped = false;
            render();
        }
    }

    // Quiz flagging (F key)
    if (FEATURE_FLAG_QUESTION_FLAGGING && state.screen === SCREEN.QUIZ && e.key.toLowerCase() === 'f') {
        // Prevent flagging if focus is on an input/textarea (like notes)
        if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
            return;
        }
        e.preventDefault(); // Prevent default browser find behavior
        const flagBtn = qs('#flag-btn');
        if (flagBtn) {
            flagBtn.click(); // Simulate a click on the flag button
        }
    }
});


// --- Drag and Drop for Manage Cards ---
let draggedCard = null;

document.addEventListener('dragstart', (e) => {
    if (state.screen === SCREEN.MANAGE && e.target.dataset.cardId) {
        // Allow dragging only if not in the 'new' column initially? (Optional)
        // const parentColumn = e.target.closest('[data-status]');
        // if (parentColumn && parentColumn.dataset.status === 'new') {
        //   e.preventDefault();
        //   return;
        // }
        draggedCard = e.target;
        setTimeout(() => {
            if (draggedCard) draggedCard.style.opacity = '0.5';
        }, 0);
    }
});

document.addEventListener('dragend', (e) => {
    if (draggedCard && e.target.dataset.cardId) {
        e.target.style.opacity = '1';
        draggedCard = null;
        // Remove any lingering drag-over styles
        qsa('.card-list.drag-over').forEach(el => el.classList.remove('drag-over'));
    }
});

document.addEventListener('dragover', (e) => {
    if (state.screen === SCREEN.MANAGE && draggedCard) {
        e.preventDefault(); // Necessary to allow dropping
        const column = e.target.closest('[data-status]');
        if (column) {
            // Remove from others first
             qsa('.card-list.drag-over').forEach(el => {
                 if (!el.parentElement.isSameNode(column)) {
                      el.classList.remove('drag-over');
                 }
             });
            const dropZone = column.querySelector('.card-list');
            if (dropZone) {
                dropZone.classList.add('drag-over');
            }
        }
    }
});

document.addEventListener('dragleave', (e) => {
     if (state.screen === SCREEN.MANAGE && draggedCard) {
         // Check if leaving a valid drop zone area
         const column = e.target.closest('[data-status]');
         if (column) {
              const dropZone = column.querySelector('.card-list');
              // More robust check: see if the related target is outside the drop zone
              if (dropZone && !dropZone.contains(e.relatedTarget)) {
                 dropZone.classList.remove('drag-over');
             }
         } else if (e.target.classList.contains('card-list')) {
              // Handle leaving the card-list directly
              if (!e.target.contains(e.relatedTarget)) {
                  e.target.classList.remove('drag-over');
              }
         }
     }
});


document.addEventListener('drop', (e) => {
    if (state.screen === SCREEN.MANAGE && draggedCard) {
        e.preventDefault();
        const column = e.target.closest('[data-status]');
        if (column) {
            const dropZone = column.querySelector('.card-list');
            if (dropZone) dropZone.classList.remove('drag-over'); // Ensure class is removed

            const newStatus = column.dataset.status;
            const cardId = draggedCard.dataset.cardId;
            const chapter = getChaptersFromGlobal().find(c => c.id === state.selectedChapterId);

            if (chapter && state.currentUser) {
                 // Prevent dropping back into 'new' - remove element and re-render? Or just ignore?
                 // For simplicity, let's just update status and move element.
                 progressService.updateCardStatus(state.currentUser, chapter.id, cardId, newStatus);
                 if (dropZone) dropZone.appendChild(draggedCard); // Move the element in the UI
                 showToast(`Card moved to '${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}'`);
            } else {
                 console.error("Cannot update card status: Missing chapter or user info.");
                 if (dropZone) dropZone.classList.remove('drag-over'); // Still remove class on error
            }
        } else {
             // Dropped outside a valid column
             qsa('.card-list.drag-over').forEach(el => el.classList.remove('drag-over'));
        }
        draggedCard.style.opacity = '1'; // Ensure opacity is reset even if drop fails
        draggedCard = null;
    }
});