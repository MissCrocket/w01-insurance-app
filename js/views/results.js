// js/views/results.js
import { qs, qsa } from '../utils/ui.js';
import { state } from '../main.js';
import { FEATURE_FLAG_QUESTION_FLAGGING } from '../config.js';

export function renderResults() {
  const wrap = document.createElement("section");
  wrap.className = "screen screen-results";
  const total = state.questions.length || 0;
  const correct = state.answers.filter((a) => a?.correct).length;
  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
  
  const incorrectCount = total - correct;
  const flaggedCount = state.flaggedQuestions.size;

  let performanceBreakdownHTML = '';
    if (state.quizType === 'mock') {
        const performanceByLO = {};
        state.questions.forEach((q, idx) => {
            const lo = q.loId.split('.')[0];
            if (!performanceByLO[lo]) {
                performanceByLO[lo] = { correct: 0, total: 0 };
            }
            performanceByLO[lo].total++;
            if (state.answers[idx]?.correct) {
                performanceByLO[lo].correct++;
            }
        });

        performanceBreakdownHTML = `
            <div class="mt-8">
                <h2 class="section-title text-neutral-800 dark:text-white">Performance by Learning Outcome</h2>
                <div class="mt-4 space-y-2">
        `;
        for (const lo in performanceByLO) {
            const { correct, total } = performanceByLO[lo];
            const loPercentage = total > 0 ? Math.round((correct / total) * 100) : 0;
            performanceBreakdownHTML += `
                <div class="flex justify-between">
                    <span>Learning Outcome ${lo}</span>
                    <span>${correct}/${total} (${loPercentage}%)</span>
                </div>
            `;
        }
        performanceBreakdownHTML += `</div></div>`;
    }

  wrap.innerHTML = `
    <div class="card text-center">
      <h1 class="screen-title text-3xl text-neutral-800 dark:text-white" tabindex="-1">Quiz Complete!</h1>
      <p class="score text-6xl font-bold mt-4 text-brand">${percentage}%</p>
      <p class="text-xl muted mt-2">You scored <strong>${correct} / ${total}</strong></p>
      ${performanceBreakdownHTML}
      <div class="results-actions mt-8 flex justify-center gap-4">
        <button class="btn btn-primary" id="retry">Retry Quiz</button>
        <button class="btn btn-ghost" id="back">Back to Topics</button>
      </div>
    </div>
    <div class="mt-8">
      <div class="results-filter-container">
        <h2 class="section-title text-white">Review Your Answers</h2>
        <div class="flex items-center gap-2 rounded-xl bg-black/20 p-1">
          <button class="btn !min-h-0 text-sm" data-filter="all" aria-pressed="${state.resultsFilter === 'all'}">All (${total})</button>
          <button class="btn !min-h-0 text-sm" data-filter="incorrect" aria-pressed="${state.resultsFilter === 'incorrect'}">Incorrect (${incorrectCount})</button>
          <button class="btn !min-h-0 text-sm" data-filter="flagged" aria-pressed="${state.resultsFilter === 'flagged'}">Flagged (${flaggedCount})</button>
        </div>
      </div>
      <div class="results-list mt-4 space-y-6"></div>
    </div>
  `;

  const filterButtons = qsa('[data-filter]', wrap);
  filterButtons.forEach(btn => {
    if(btn.dataset.filter !== state.resultsFilter) {
      btn.classList.remove('bg-brand');
      btn.classList.add('bg-transparent', 'text-neutral-400');
    }
  });

  const listEl = qs('.results-list', wrap);
  let questionsToRender = state.questions;

  if (state.resultsFilter === 'incorrect') {
    questionsToRender = state.questions.filter((q, idx) => !state.answers[idx]?.correct);
  } else if (state.resultsFilter === 'flagged') {
    questionsToRender = state.questions.filter(q => state.flaggedQuestions.has(q.id));
  }
  
  if (questionsToRender.length === 0) {
    listEl.innerHTML = `<p class="text-neutral-400 text-center py-8">No questions to show for this filter.</p>`;
  }

  questionsToRender.forEach((q) => {
    const originalIndex = state.questions.findIndex(origQ => origQ.id === q.id);
    const answer = state.answers[originalIndex];
    const item = document.createElement('div');
    item.className = 'result-item card';
    const userChoice = (answer && answer.selectedIndex !== undefined) ? q.options[answer.selectedIndex] : 'Not answered';
    const correctIndex = q.correctIndex ?? q.options.indexOf(q.correctAnswer);
    const correctChoice = q.options[correctIndex];
    const isCorrect = answer?.correct;

    const isFlagged = state.flaggedQuestions.has(q.id);
    const flagIndicator = FEATURE_FLAG_QUESTION_FLAGGING && isFlagged ?
      `<svg class="inline-block w-5 h-5 ml-2 text-amber-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm3 1a1 1 0 00-1 1v5h10l-3-4 3-4H7V4a1 1 0 00-1-1z"/></svg>` :
      '';
    const loIdText = q.loId ? `<span class="text-xs text-neutral-500 dark:text-neutral-400 block mt-2">Syllabus LO: ${q.loId}</span>` : '';

    item.innerHTML = `
      <p class="result-item__question text-neutral-800 dark:text-white">${originalIndex + 1}. ${q.question} ${flagIndicator}</p>
      <div class="result-item__answer mt-3 space-y-2">
        <p class="${isCorrect ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}">
          <strong>Your answer:</strong> ${userChoice} ${isCorrect ? '✔' : '❌'}
        </p>
        ${!isCorrect ? `<p class="text-green-600 dark:text-green-500"><strong>Correct answer:</strong> ${correctChoice}</p>` : ''}
        <div class="explanation-card !mt-3">
          <p><strong>Explanation:</strong> ${q.explanation}</p>
          ${loIdText}
        </div>
      </div>
    `;
    listEl.appendChild(item);
  });
  return wrap;
}