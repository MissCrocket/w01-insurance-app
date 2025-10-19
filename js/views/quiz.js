// js/views/quiz.js
import { qs, qsa } from '../utils/uiUtils.js';
import { state } from '../main.js';
import { FEATURE_FLAG_QUESTION_FLAGGING } from '../config.js';

function getChaptersFromGlobal() {
  const central = window.CII_W01_TUTOR_DATA?.chapters;
  if (Array.isArray(central) && central.length) return central;
  return [];
}

function renderFlagButton(questionId) {
  const isFlagged = state.flaggedQuestions.has(questionId);
  return `
        <button type="button" class="flag-btn" id="flag-btn" data-question-id="${questionId}" aria-pressed="${isFlagged}" title="${isFlagged ? 'Remove flag (F)' : 'Mark for review (F)'}">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path fill-rule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm3 1a1 1 0 00-1 1v5h10l-3-4 3-4H7V4a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>
        </button>
    `;
}

function renderQuizNavigation() {
  const navItems = state.questions.map((q, idx) => {
    const isCurrent = idx === state.currentIndex;
    const isFlagged = state.flaggedQuestions.has(q.id);
    const answerInfo = state.answers[idx];
    const isExamMode = state.quizType === 'mock' || state.quizType === 'specimen';

    let itemClass = 'quiz-nav-item';
    if (isCurrent) itemClass += ' is-current';

    if (answerInfo) {
      if (isExamMode) {
        itemClass += ' is-answered';
      } else {
        if (answerInfo.correct) {
          itemClass += ' is-answered-correct';
        } else {
          itemClass += ' is-answered-incorrect';
        }
      }
    }

    const flagMarker = isFlagged ?
      '<svg class="flag-marker" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm3 1a1 1 0 00-1 1v5h10l-3-4 3-4H7V4a1 1 0 00-1-1z"/></svg>' :
      '';

    return `
            <button class="${itemClass}" data-index="${idx}" aria-label="Question ${idx + 1}">
                ${idx + 1}
                ${flagMarker}
            </button>
        `;
  }).join('');

  return `
        <aside class="quiz-nav-panel">
            <h3 class="quiz-nav-header">Questions (${state.flaggedQuestions.size} Flagged)</h3>
            <div class="quiz-nav-grid" id="quiz-nav-grid">
                ${navItems}
            </div>
        </aside>
    `;
}

export function renderQuiz() {
    const wrap = document.createElement("section");
    wrap.className = "screen screen-quiz";
    const q = state.questions[state.currentIndex];
    const progressPercent = ((state.currentIndex + 1) / state.questions.length) * 100;

    const isExamMode = state.quizType === 'mock' || state.quizType === 'specimen';

    const quizNavHTML = FEATURE_FLAG_QUESTION_FLAGGING ? renderQuizNavigation() : '';
    const quizNavToggleHTML = FEATURE_FLAG_QUESTION_FLAGGING ? `
    <button class="btn btn-ghost !p-2 lg:hidden" id="toggle-quiz-nav">
      <svg class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
      <span class="sr-only">Toggle Question Grid</span>
    </button>
    ` : '<div></div>';
    
    let timerHTML = '';
    if (isExamMode) {
        timerHTML = `<div id="timer" class="text-xl font-bold text-amber-400"></div>`;
    }

    wrap.innerHTML = `
    <div class="toolbar flex justify-between items-center">
      <button class="btn btn-ghost" id="quit-quiz">&larr; Exit Quiz</button>
      <h1 class="screen-title text-xl font-bold text-white" tabindex="-1">Q ${state.currentIndex + 1}/${state.questions.length}</h1>
      ${timerHTML}
      ${quizNavToggleHTML}
    </div>
    <div id="pre-exam-notice" class="card text-center bg-amber-500/10 border-amber-500/50 text-amber-200 my-4"></div>
    <div class="w-full bg-neutral-700 rounded-full h-2.5 mt-4">
        <div class="bg-brand h-2.5 rounded-full" style="width: ${progressPercent}%"></div>
    </div>
    <div class="flex justify-between items-center text-sm text-neutral-400 mt-2">
        <span>Progress</span>
        <span>${Math.round(progressPercent)}%</span>
    </div>

    <div class="quiz-layout mt-6">
        <div class="question-container">
            <article class="question-card card" aria-live="polite">
              <div class="flex justify-between items-start">
                <h2 class="question-text text-lg md:text-xl font-semibold text-neutral-800 dark:text-white">${q?.text || q?.question || "Question text missing"}</h2>
                ${FEATURE_FLAG_QUESTION_FLAGGING ? renderFlagButton(q.id) : ''}
              </div>
              <div class="options mt-6 space-y-3" role="radiogroup" aria-label="Answer options"></div>
              <div id="explanation-container" class="explanation-card" hidden></div>
            </article>
            <div class="quiz-actions mt-6 flex justify-end items-center gap-3"></div>
        </div>
        
        ${quizNavHTML}
    </div>
  `;

    const noticeEl = qs("#pre-exam-notice", wrap);
    if (isExamMode) {
        noticeEl.innerHTML = `<p class="font-bold">This is a timed 2-hour exam simulation. The test will automatically submit when the timer runs out. Good luck!</p>`;
    } else {
        noticeEl.style.display = 'none';
    }

    const optionsEl = qs(".options", wrap);
    const explanationEl = qs("#explanation-container", wrap);
    const actionsContainer = qs(".quiz-actions", wrap);
    const isLastQuestion = state.currentIndex === state.questions.length - 1;
    const chapter = getChaptersFromGlobal().find(c => c.id === q.chapterId);
    const userAnswer = state.answers[state.currentIndex];
    const isCorrect = userAnswer?.correct;

    (q?.options || []).forEach((optText, idx) => {
        const label = document.createElement("label");
        label.className = "option-label";
        label.dataset.index = idx;
        const input = document.createElement("input");
        input.type = "radio";
        input.name = "answer";
        input.value = idx;
        input.className = "option-input sr-only";
        const span = document.createElement("span");
        span.className = "option-text";
        span.textContent = optText;
        label.appendChild(input);
        label.appendChild(span);

        if (state.questionState === 'answered') {
            label.classList.add('is-disabled');
            const isUserSelection = (idx === userAnswer?.selectedIndex);
            const correctIndex = q.correctIndex ?? q.options.indexOf(q.correctAnswer);
            const isCorrectOption = (idx === correctIndex);

            if (isExamMode) {
                if (state.answerRevealedForCurrent) {
                    // When answer is revealed in exam mode
                    if (isCorrectOption) {
                        label.classList.add('is-correct'); // Always show the correct answer in green
                    } else if (isUserSelection && !isCorrectOption) {
                        label.classList.add('is-incorrect'); // Show user's wrong answer in red
                    }
                } else {
                    // Before revealing, just show the user's selection
                    if (isUserSelection) {
                        label.classList.add('is-selected-exam');
                    }
                }
            } else {
                // Original logic for study mode
                if (isCorrectOption) {
                    label.classList.add('is-correct');
                } else if (isUserSelection) {
                    label.classList.add('is-incorrect');
                }
            }
        }
        optionsEl.appendChild(label);
    });

    let buttonsHTML = '';

    if (state.questionState === 'answered') {
      if (!isExamMode || state.answerRevealedForCurrent) {
        const loIdText = q.loId ? `<span class="text-xs text-neutral-500 dark:text-neutral-400 block mt-2">Syllabus LO: ${q.loId}</span>` : '';
        let explanationText = q.explanation || 'No explanation provided.';
        if (!q.explanation && chapter) {
          explanationText = 'No explanation provided. For more information, please see W01 ' + chapter.title + '.';
        }
        explanationEl.innerHTML = `<p class="text-neutral-800 dark:text-white"><strong>Explanation:</strong> ${explanationText}</p>${loIdText}`;
        explanationEl.hidden = false;
      }
      
      if (state.studyMode && !isCorrect && !isExamMode) {
        buttonsHTML += `<button class="btn" id="try-again-btn">Try Again</button>`;
      }
      
      if (isExamMode && !state.answerRevealedForCurrent) {
        buttonsHTML += `<button class="btn btn-ghost" id="reveal-answer-btn">Reveal Answer</button>`;
      }
    }
    
    if (isLastQuestion) {
      buttonsHTML += `<button class="btn btn-primary" id="finish-btn">Finish Quiz</button>`;
    } else {
      buttonsHTML += `<button class="btn" id="next-btn">Next Question &rarr;</button>`;
    }
    actionsContainer.innerHTML = buttonsHTML;

    if (state.isQuizNavVisible) {
        qs('.quiz-nav-panel', wrap)?.classList.add('is-visible');
    }

    return wrap;
}