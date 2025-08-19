// js/modules/insurable_interest_ch4.js
export const data = {
  title: "Chapter 4: Insurable Interest",
  questions: [
    // originals
    { type: "mcq", concept: "Definition", question: "Why can't you take out a fire insurance policy on your neighbor's house?", options: ["It's against public policy", "You have no insurable interest", "It's a speculative risk", "The risk is not fortuitous"], correctAnswer: "You have no insurable interest", explanation: "No financial loss would fall on you if the house burned." },
    { type: "mcq", concept: "Timing – general insurance", question: "You sell your insured car to a friend. The next day, before you cancel the policy, your friend has an accident. Why won't your insurer pay for the damage?", options: ["You no longer had insurable interest at the time of loss", "The premium was not high enough", "It was a breach of warranty", "The new driver was not named"], correctAnswer: "You no longer had insurable interest at the time of loss", explanation: "Once sold, you no longer suffer loss on that vehicle." },
    { type: "fill", concept: "Bailee interest", question: "A dry cleaner holding a customer's suit has an insurable interest in it because they are a ________.", correctAnswer: "bailee", explanation: "A bailee would suffer loss if the goods were damaged in their care." },
    { type: "mcq", concept: "Sources", question: "Insurable interest can arise from:", options: ["Custom, practice or habit", "Common law, contract or statute", "Warranty, endorsement or condition", "Average, subrogation or contribution"], correctAnswer: "Common law, contract or statute", explanation: "These are the recognised sources of insurable interest." },

    // paraphrased from specimen exam
    { type: "mcq", concept: "What is insurable interest?", question: "In insurance, ‘insurable interest’ most closely means:", options: ["Interest earned on investments", "The financial relationship a person has with the subject insured", "The interest paid on premium instalments", "The insurer’s investment income"], correctAnswer: "The financial relationship a person has with the subject insured", explanation: "It must be a legally recognised financial stake in the subject-matter." },

    { type: "mcq", concept: "Timing – motor (enforceability)", question: "For a private motor policy to be enforceable at law, insurable interest must exist at least:", options: ["When quoting", "When completing the proposal", "When the policy is issued", "At the time of any claim"], correctAnswer: "At the time of any claim", explanation: "The insured must have interest at loss time under general insurance." },

    { type: "mcq", concept: "Borrowed vehicle scenario", question: "Sam borrows a friend’s car and asks for a comprehensive policy in Sam’s own name on that car alone. The broker refuses because Sam lacks:", options: ["Good faith", "Proximate cause", "Insurable interest", "Consideration"], correctAnswer: "Insurable interest", explanation: "Sam has no legal/financial relationship to that car." }
  ],
  flashcards: [
    { id: 14, term: "Insurable Interest", definition: "Legally recognised financial relationship with the subject-matter of insurance." },
    { id: 15, term: "Subject-Matter of Insurance", definition: "The thing or interest insured (property, liability, life, etc.)." },
    { id: 16, term: "Bailee", definition: "Holder of another’s property who owes a duty of care; has insurable interest." },
    { id: 204, term: "Timing (General Insurance)", definition: "Insurable interest should exist at inception and at the time of loss (per class/policy terms)." }
  ]
};
