// js/modules/contract_and_agency_ch3.js
export const data = {
  title: "Chapter 3: Contract and Agency",
  questions: [
    // originals you had
    { type: "mcq", concept: "A valid contract requires offer, acceptance, and consideration.", question: "What is the policyholder's 'consideration' in an insurance contract?", options: ["The promise to pay a claim", "The premium", "The policy document", "The disclosure of facts"], correctAnswer: "The premium", explanation: "The premium is the consideration given by the insured." },
    { type: "fill", concept: "An agent acts on behalf of a principal.", question: "The legal relationship where one party (the agent) is authorized to act on behalf of another (the principal) is known as ________.", correctAnswer: "agency", explanation: "The law of agency governs this relationship." },
    { type: "mcq", concept: "A counter-offer acts as a rejection of the original offer.", question: "An insurer offers a policy for a $500 premium. The customer replies, 'I'll take it if you make the premium $450.' Has a contract been formed?", options: ["Yes, because the customer accepted", "No, because the customer made a counter-offer", "Yes, because the price is negotiable", "No, because the offer was not in writing"], correctAnswer: "No, because the customer made a counter-offer", explanation: "A counter-offer terminates the original offer." },
    { type: "fill", concept: "A contract that is invalid from the very beginning is said to be void...", question: "A contract that is treated as if it never existed is described as being void ________ ________.", correctAnswer: "ab initio", explanation: "Means 'from the beginning'." },
    { type: "mcq", concept: "An agent must perform their duties with skill and reasonable care.", question: "Which duty requires an agent to perform their agreed tasks to a certain professional standard?", options: ["Obedience", "Good faith", "Accountability", "Skill and reasonable care"], correctAnswer: "Skill and reasonable care", explanation: "Agents owe professional care in carrying out instructions." },

    // paraphrased from specimen exam
    { type: "mcq", concept: "Essentials of contract", question: "Which set lists the essentials for forming a valid insurance contract?", options: ["Invitation to treat, offer, consideration", "Offer, acceptance, consideration", "Offer, consideration, warranty", "Acceptance, warranty, indemnity"], correctAnswer: "Offer, acceptance, consideration", explanation: "These three are foundational elements of contract formation." },

    { type: "mcq", concept: "Termination", question: "Who typically has the right to cancel a household policy mid-term, subject to wording and law?", options: ["Only the policyholder", "Only the insurer", "Both the policyholder and the insurer", "Neither party"], correctAnswer: "Both the policyholder and the insurer", explanation: "Cancellation terms usually allow both parties to terminate with notice." },

    { type: "mcq", concept: "Agency at proposal", question: "When an intermediary submits a client’s completed proposal to an insurer, they are generally acting as agent of the:", options: ["Insurer", "Proposer (client)", "Broker", "Third party"], correctAnswer: "Proposer (client)", explanation: "At placement, intermediaries usually act for the proposer." },

    { type: "mcq", concept: "Agency by ratification", question: "A principal later approves an agent’s act that was originally outside their authority. This creates:", options: ["Agency by necessity", "Agency by ratification", "Ostensible authority", "Express authority"], correctAnswer: "Agency by ratification", explanation: "Ratification validates the act retrospectively." },

    { type: "mcq", concept: "Express authority", question: "If an agency agreement explicitly lists tasks the agent may perform, this is known as:", options: ["Implied authority", "Express authority", "Apparent authority", "No authority"], correctAnswer: "Express authority", explanation: "Express = clearly granted rights in the agreement." },

    { type: "mcq", concept: "Unearned commission", question: "On policy cancellation, agency terms commonly require the intermediary to refund:", options: ["Acquisition tax", "Any unearned commission", "Marketing allowance", "All brokerage on prior years"], correctAnswer: "Any unearned commission", explanation: "Commission relating to the unexpired period is refundable." }
  ],
  flashcards: [
    { id: 11, term: "Consideration", definition: "The value exchanged (premium for cover) that creates a binding contract." },
    { id: 12, term: "Agency", definition: "Legal relationship: principal authorises agent to act on their behalf." },
    { id: 42, term: "Offer and Acceptance", definition: "Clear offer matched by unconditional acceptance to form a contract." },
    { id: 140, term: "Agency by Ratification", definition: "Principal later approves unauthorised act; effective from the start." },
    { id: 141, term: "Express Authority", definition: "Authority explicitly set out in an agency agreement." },
    { id: 142, term: "Unearned Commission", definition: "Commission related to unexpired cover period; often repayable on cancellation." },
    { id: 146, term: "Ostensible (Apparent) Authority", definition: "Third parties reasonably believe the agent has authority due to principal’s conduct." }
  ]
};
