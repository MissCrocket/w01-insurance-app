// js/services/aiService.js
import { qs, qsa } from '../utils/uiUtils.js';
import * as progressService from './progressService.js';
import { state } from '../main.js';

export async function getAiExplanation(term, definition, promptType, container) {
  const progress = progressService.getProgress();
  const card = state.flashcardSession.cards[state.flashcardSession.currentIndex];
  const cardId = card.id;
  const chapterId = card.chapterId || state.selectedChapterId;

  const cached = progress.chapters[chapterId]?.flashcards[cardId]?.aiExplanations?.[promptType];

  if (cached) {
    container.innerHTML = `<p class="text-amber-300">${cached}</p>`;
    qs('#add-to-notes-btn')?.classList.remove('hidden');
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