// js/boot.js
// Dynamically import each chapter module and expose a single predictable global
// that main.js already knows how to read: window.CII_W01_TUTOR_DATA = { chapters: [...] }

import { moduleManifest } from "./modules/index.js";

/**
 * Normalize questions so the runtime can consume today's content shape.
 * - Keep only MCQs for now (UI doesn't yet support "fill")
 * - Accept { question, options, correctAnswer } and compute correctIndex
 */
function normalizeChapter(id, mod) {
  const raw = mod?.data || {};
  const questions = Array.isArray(raw.questions) ? raw.questions : [];

  const mcqs = questions
    .filter(q => q && q.type === "mcq" && Array.isArray(q.options) && q.options.length > 1)
    .map((q, i) => {
      let correctIndex = -1;
      if (typeof q.correctIndex === "number") {
          correctIndex = q.correctIndex;
      } else {
          const target = typeof q.correctAnswer === "string"
              ? q.correctAnswer
              : q.correctAnswer?.text ?? q.correctAnswer;
          correctIndex = q.options.findIndex(opt => String(opt).trim() === String(target).trim());
      }
      
      if (correctIndex === -1) {
        console.warn(`[Data Warning] No correct answer found for question in chapter "${id}": "${q.question || q.text}". Defaulting to index 0.`);
        correctIndex = 0; // Default to the first option to prevent crashes.
      }

      return {
        id: q.id || `${id}::q${i}`,
        type: "mcq",
        concept: q.concept,
        text: q.text || q.question || "Question",
        question: q.question || q.text || "Question",
        options: q.options,
        correctIndex: correctIndex,
        correct: correctIndex,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || "",
        loId: q.loId
      };
    });

  return {
    id,
    title: raw.title || moduleManifest[id]?.title || id,
    questions: mcqs,
    // **NEW LINE**: Pass the flashcards data through from the raw module.
    flashcards: Array.isArray(raw.flashcards) ? raw.flashcards : [],
    los: Array.isArray(raw.los) ? raw.los : undefined
  };
}

async function loadAll() {
  const entries = Object.entries(moduleManifest);
  const chapters = [];

  for (const [id, meta] of entries) {
    if (!meta?.loader) continue;
    const mod = await meta.loader();
    chapters.push(normalizeChapter(id, mod));
  }

  // Expose globally for main.js
  window.CII_W01_TUTOR_DATA = { chapters };
}

await loadAll();