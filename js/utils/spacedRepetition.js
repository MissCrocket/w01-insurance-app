// js/utils/spacedRepetition.js
export function calculateNextReview(card, rating) {
  // Defensive defaults to prevent errors with old data
  card.interval = typeof card.interval === 'number' ? card.interval : 0;
  card.easeFactor = typeof card.easeFactor === 'number' ? card.easeFactor : 2.5;
  card.consecutiveCorrect = typeof card.consecutiveCorrect === 'number' ? card.consecutiveCorrect : 0;

  if (rating < 3) {
    card.interval = 1;
    card.consecutiveCorrect = 0;
  } else {
    card.consecutiveCorrect += 1;
    if (card.consecutiveCorrect === 1) {
      card.interval = 1;
    } else if (card.consecutiveCorrect === 2) {
      card.interval = 6;
    } else {
      card.interval = Math.ceil(card.interval * card.easeFactor);
    }
  }

  card.easeFactor = card.easeFactor + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02));
  if (card.easeFactor < 1.3) card.easeFactor = 1.3;

  const now = new Date();
  const nextReviewDate = new Date(now.getTime() + card.interval * 24 * 60 * 60 * 1000);
  card.nextReviewDate = nextReviewDate.toISOString();
  card.lastReviewed = now.toISOString();

  return card;
}