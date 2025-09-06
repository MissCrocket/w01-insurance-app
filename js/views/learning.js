// js/views/learning.js
import { qs, qsa } from '../utils/ui.js';
import * as progressService from '../services/progressService.js';
import { state } from '../main.js';

async function getAiExplanation(term, definition, promptType, container) {
  const progress = progressService.getProgress();
  const card = state.flashcardSession.cards[state.flashcardSession.currentIndex];
  const cardId = card.id;
  const chapterId = card.chapterId || state.selectedChapterId;

  const cached = progress.chapters[chapterId]?.flashcards[cardId]?.aiExplanations?.[promptType];

  if (cached) {
    container.innerHTML = `<p class="text-amber-300">${cached}</p>`;
    return;
  }

  container.innerHTML = '<p class="text-neutral-400 animate-pulse">🤖 Gemini is thinking...</p>';
  qsa('[data-prompt]').forEach(b => b.disabled = true);
  try {
    const response = await fetch('/.netlify/functions/getAiExplanation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        term,
        definition,
        promptType
      }),
    });
    if (!response.ok) throw new Error(`Server error: ${response.statusText}`);
    const data = await response.json();
    const formattedText = data.explanation
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
    container.innerHTML = `<p class="text-amber-300">${formattedText}</p>`;
    qs('#add-to-notes-btn')?.classList.remove('hidden');
    progressService.cacheAiExplanation(chapterId, cardId, promptType, formattedText);
  } catch (error) {
    console.error('Failed to fetch AI explanation:', error);
    container.innerHTML = '<p class="text-red-400">Sorry, there was an error connecting to the AI.</p>';
  } finally {
    qsa('[data-prompt]').forEach(b => b.disabled = false);
  }
}

export function renderLearning() {
  const wrap = document.createElement("section");
  wrap.className = "screen screen-learning";
  const session = state.flashcardSession;
  const card = session.cards[session.currentIndex];

  if (!card) {
    wrap.innerHTML = `
        <div class="text-center">
            <h1 class="text-2xl font-bold text-white mb-4">Session Complete!</h1>
            <p class="text-neutral-300 mb-8">You've reviewed all the cards for this session.</p>
            <button id="back-btn" class="btn-ghost">Back to Topics</button>
            <button id="quiz-btn" class="btn btn-primary ml-4">Take Chapter Quiz</button>
        </div>
        `;
    return wrap;
  }

  const progress = progressService.getProgress();
  const chapterId = card.chapterId || state.selectedChapterId;
  const chapterProgress = progress.chapters[chapterId] || {
    flashcards: {}
  };
  const cardProgress = chapterProgress.flashcards[card.id] || {};
  const noteText = cardProgress.note || '';

  const termSide = `
        <div class="text-center text-3xl font-bold text-white">${card.term}</div>
        <button class="btn mt-8 bg-amber-500 hover:bg-amber-600" id="reveal-btn">Reveal Answer</button>
    `;

  const definitionSide = `
    <div class="flex flex-col h-full">
      <div class="flex-grow text-xl font-medium text-neutral-200 text-center flex items-center justify-center">${card.definition}</div>
      <div class="flex-shrink-0 mt-6 w-full max-w-2xl mx-auto">
        <div class="deep-dive-container">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button class="btn-ghost bg-black/20 hover:bg-black/40 text-amber-300 border-amber-400/30 text-base font-semibold !py-3" data-prompt="simplify">✨ Explain Simply</button>
              <button class="btn-ghost bg-black/20 hover:bg-black/40 text-amber-300 border-amber-400/30 text-base font-semibold !py-3" data-prompt="scenario">🏡 Real-World Scenario</button>
          </div>
          <div id="ai-response" class="mt-3 p-4 bg-black/20 rounded-lg min-h-[60px] text-sm relative"></div>
<button id="add-to-notes-btn" class="absolute -bottom-2 right-2 btn-ghost !py-0 !px-2 !min-h-0 text-xs hidden" title="Add this explanation to your notes">➕ Add to Notes</button>
        </div>
        <div class="notes-container mt-4 pt-4 border-t border-white/10">
    <div class="flex justify-between items-center mb-2">
        <h3 class="flex items-center gap-2 text-base font-semibold text-neutral-300">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path d="m2.695 14.762-1.262 3.155a.5.5 0 0 0 .65.65l3.155-1.262a4 4 0 0 0 1.343-.885L17.5 5.5a2.121 2.121 0 0 0-3-3L3.58 13.42a4 4 0 0 0-.885 1.343Z" /></svg>
            My Notes
        </h3>
        <span id="save-status" class="text-xs text-neutral-500 transition-opacity duration-300 opacity-0"></span>
    </div>
    <textarea id="flashcard-notes" class="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white placeholder-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60" rows="4" placeholder="Add your personal notes here...">${noteText}</textarea>
    <div id="notes-meta" class="flex justify-end items-center text-right text-xs text-neutral-500 mt-1 h-4 gap-3"></div>
</div>
      </div>
    </div>`;

  let cardStatus = 'new';
  if (cardProgress) {
    if (cardProgress.confidence >= 4) cardStatus = 'mastered';
    else if (cardProgress.confidence >= 2) cardStatus = 'learning';
    else cardStatus = 'new';
  }

  const statusClasses = {
    new: 'border-blue-500',
    learning: 'border-orange-500',
    mastered: 'border-green-500'
  };

  const chapterTitle = card.chapterTitle ? `<div class="text-xs text-amber-400">${card.chapterTitle.replace('Chapter X: ','')}</div>` : '';
  
  const manageCardsBtnHTML = !session.isCrossChapter 
    ? `<button id="manage-cards-btn" class="btn-ghost !p-2">Manage Cards</button>`
    : '';

  wrap.innerHTML = `
        <div class="flex justify-between items-center text-sm text-neutral-400 mb-4">
            <button id="back-btn" class="btn-ghost !p-2">&larr; Topics</button>
            <div>
                ${manageCardsBtnHTML}
                <span class="ml-4">Cards remaining: ${session.cards.length - session.currentIndex}</span>
            </div>
        </div>
        <div id="flashcard" class="card max-w-3xl mx-auto bg-brand-dark border-white/10 min-h-[500px] flex flex-col p-8 border-2 ${statusClasses[cardStatus]}">
            <div class="flex-grow w-full flex flex-col items-center justify-center">
              ${session.isFlipped ? chapterTitle : ''}
              ${session.isFlipped ? definitionSide : termSide}
            </div>
            <div id="controls" class="flex-shrink-0 w-full mt-auto pt-6"></div>
        </div>
    `;

  const controls = qs('#controls', wrap);
  if (session.isFlipped) {
    controls.innerHTML = `
        <div class="text-center text-neutral-400 mb-4">How well did you know this? (1-5)</div>
        <div class="grid grid-cols-5 gap-3">
            <button data-confidence="1" class="confidence-btn bg-gradient-to-br from-red-500 to-red-700 text-white font-semibold py-3 px-2 rounded-xl transition transform hover:scale-105 active:scale-100" title="Forgot">Forgot</button>
            <button data-confidence="2" class="confidence-btn bg-gradient-to-br from-orange-400 to-orange-600 text-white font-semibold py-3 px-2 rounded-xl transition transform hover:scale-105 active:scale-100" title="Hard">Hard</button>
            <button data-confidence="3" class="confidence-btn bg-gradient-to-br from-yellow-400 to-yellow-600 text-white font-semibold py-3 px-2 rounded-xl transition transform hover:scale-105 active:scale-100" title="Good">Good</button>
            <button data-confidence="4" class="confidence-btn bg-gradient-to-br from-green-400 to-green-600 text-white font-semibold py-3 px-2 rounded-xl transition transform hover:scale-105 active:scale-100" title="Easy">Easy</button>
            <button data-confidence="5" class="confidence-btn bg-gradient-to-br from-blue-500 to-blue-700 text-white font-semibold py-3 px-2 rounded-xl transition transform hover:scale-105 active:scale-100" title="Perfect">Perfect</button>
        </div>
        `;

    const notesInput = qs('#flashcard-notes', wrap);
    const saveStatusEl = qs('#save-status', wrap);
    const notesMetaEl = qs('#notes-meta', wrap);
    let saveTimeout;

    const updateMeta = () => {
        const text = notesInput.value;
        const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
        notesMetaEl.innerHTML = `
            <span class="word-count">${wordCount} word${wordCount === 1 ? '' : 's'}</span>
            <button id="clear-note-btn" class="btn-ghost !py-0 !px-2 !min-h-0 text-xs" title="Clear notes">Clear</button>
            <button id="export-note-btn" class="btn-ghost !py-0 !px-2 !min-h-0 text-xs" title="Export as .txt">Export</button>
        `;
    };

    notesInput.addEventListener('input', () => {
        clearTimeout(saveTimeout);
        saveStatusEl.textContent = 'Saving...';
        saveStatusEl.classList.remove('opacity-0');

        updateMeta();

        saveTimeout = setTimeout(() => {
            progressService.saveFlashcardNote(chapterId, card.id, notesInput.value);
            const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            saveStatusEl.textContent = `Saved at ${time}`;
            setTimeout(() => saveStatusEl.classList.add('opacity-0'), 2000);
        }, 1000);
    });

    updateMeta();

  } else {
     controls.innerHTML = ``;
  }

  return wrap;
}