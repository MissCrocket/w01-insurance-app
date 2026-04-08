// js/boot.js

// This manifest object replaces the need for js/modules/index.js
const moduleManifest = {
  risk_and_insurance_ch1: {
    title: "Chapter 1: Risk and Insurance",
  },
  insurance_market_ch2: {
    title: "Chapter 2: The Insurance Market",
  },
  contract_and_agency_ch3: {
    title: "Chapter 3: Contract and Agency",
  },
  insurable_interest_ch4: {
    title: "Chapter 4: Insurable Interest",
  },
  disclosure_and_representation_ch5: {
    title: "Chapter 5: Disclosure and Representation",
  },
  proximate_cause_ch6: {
    title: "Chapter 6: Proximate Cause",
  },
  indemnity_ch7: {
    title: "Chapter 7: Indemnity",
  },
  contribution_and_subrogation_ch8: {
    title: "Chapter 8: Contribution and Subrogation",
  },
  insurance_regulation_ch9: {
    title: "Chapter 9: Insurance Regulation",
  },
  ethics_and_governance_ch10: {
    title: "Chapter 10: Ethics and Corporate Governance",
  },
  specimen_exam: {
    title: "Official Specimen Exam (100 Questions)",
  },
};

/**
 * Normalize questions so the runtime can consume today's content shape.
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
        correctIndex = 0;
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
    flashcards: Array.isArray(raw.flashcards) ? raw.flashcards : [],
    los: Array.isArray(raw.los) ? raw.los : undefined
  };
}

async function loadAll() {
  const entries = Object.entries(moduleManifest);
  const chapters = [];

  for (const [id, meta] of entries) {
    try {
      const response = await fetch(`data/${id}.json`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const mod = await response.json();
      chapters.push(normalizeChapter(id, { data: mod }));
    } catch (error) {
      console.error(`Failed to load chapter data for ${id}:`, error);
    }
  }

  // Expose globally for main.js
  window.CII_W01_TUTOR_DATA = { chapters };

  // Manually trigger an event to let main.js know that data is ready
  document.dispatchEvent(new Event('chaptersLoaded'));
}

await loadAll();