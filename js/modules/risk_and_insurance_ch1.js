// js/modules/risk_and_insurance_ch1.js
// Data for Chapter 1, to be loaded dynamically.
export const data = {
    title: "Chapter 1: Risk and Insurance",
    questions: [
        // --- Existing questions (kept) ---
        { type: "mcq", concept: "The term 'risk' in insurance can refer to the event being insured against, the object being insured, or the subject of the insurance as a whole.", question: "An underwriter says 'we have received a large risk of three offices to insure.' In this context, what does 'risk' primarily refer to?", options: ["The possibility of financial loss", "The thing being insured (the offices)", "The premium amount for the policy", "The general uncertainty of the future"], correctAnswer: "The thing being insured (the offices)", explanation: "Correct! In insurance jargon, 'a risk' often refers to the subject-matter of the insurance." },
        { type: "mcq", concept: "Risks are categorized to determine if they are insurable. A key distinction is between 'Pure Risk' and 'Speculative Risk'.", question: "Which of the following is an example of a speculative risk and therefore generally uninsurable?", options: ["A car being stolen from a driveway.", "A factory being damaged by a flood.", "Investing in the stock market.", "A visitor slipping and getting injured on your property."], correctAnswer: "Investing in the stock market.", explanation: "Exactly! Investing in the stock market is a speculative risk because you could gain money, lose money, or break even." },
        { type: "fill", concept: "For a risk to be insurable, the event must be accidental or unexpected.", question: "For a risk to be insurable, the event must be a ________ event.", correctAnswer: "fortuitous", explanation: "That's right. The term is 'fortuitous', which means the loss must be accidental and not deliberately caused by the policyholder." },
        { type: "mcq", concept: "Risk is assessed by insurers in terms of 'frequency' and 'severity'.", question: "An earthquake in a major city is an example of what kind of risk in terms of frequency and severity?", options: ["High frequency, high severity", "High frequency, low severity", "Low frequency, high severity", "Low frequency, low severity"], correctAnswer: "Low frequency, high severity", explanation: "Perfect! Major earthquakes are rare (low frequency), but when they do occur, the financial damage is enormous (high severity)." },
        { type: "fill", concept: "The basic principle of insurance is the pooling of risks.", question: "The fund created from all policyholders' premiums, used to pay the claims of the few who suffer a loss, is known as the ________ pool.", correctAnswer: "common", explanation: "Correct. The common pool is the fundamental concept behind insurance, allowing the sharing of risk." },
        { type: "mcq", concept: "A hazard influences the operation of a peril.", question: "Faulty wiring in a building is an example of what?", options: ["A peril", "A physical hazard", "A moral hazard", "A pure risk"], correctAnswer: "A physical hazard", explanation: "Correct. The faulty wiring is a physical condition that increases the likelihood of the peril (fire) occurring." },
        { type: "fill", concept: "The law of large numbers helps insurers predict losses.", question: "The theory that states predictions become more accurate as the base of data increases in size is known as the law of ________ numbers.", correctAnswer: "large", explanation: "Correct. The law of large numbers is fundamental to how insurers calculate premiums." },
        { type: "mcq", concept: "Fundamental risks affect a large number of people or the whole community.", question: "Which of these is a fundamental risk?", options: ["A car crash", "A house fire", "A nationwide economic recession", "Theft of a bicycle"], correctAnswer: "A nationwide economic recession", explanation: "Correct. A recession is a widespread event outside the control of any one individual, making it a fundamental risk." },
        { type: "fill", concept: "Self-insurance involves setting aside funds to cover potential losses.", question: "When a company decides to carry a risk themselves by setting up a fund from which any losses can be paid, it is practicing ________.", correctAnswer: ["self-insurance", "self insurance"], explanation: "That's right. Self-insurance is a form of risk retention, as opposed to risk transfer." },
        { type: "mcq", concept: "Insurance provides social and economic benefits.", question: "Which of the following is a key social benefit of insurance?", options: ["It guarantees a profit for all businesses", "It eliminates all risks for individuals", "It encourages enterprise and helps keep people in employment", "It makes all goods and services cheaper"], correctAnswer: "It encourages enterprise and helps keep people in employment", explanation: "Correct. By providing a safety net, insurance encourages business activity and provides stability." },

        // --- Paraphrased additions mapped from the Specimen Exam (LO1) ---

        // Types of risk: fundamental vs particular (Specimen Q1)
        { type: "mcq", concept: "Types of Risk", question: "A flood that affects an entire region is best described as:", options: ["A particular risk", "A fundamental risk", "A speculative risk", "A moral hazard"], correctAnswer: "A fundamental risk", explanation: "Fundamental risks arise from causes outside individual control and impact large groups or communities." },

        // Law of large numbers / pooling (Specimen Q2)
        { type: "mcq", concept: "Pooling of Risk & Law of Large Numbers", question: "Why does a larger portfolio of similar policies help an insurer set fair premiums?", options: ["It guarantees investment profits", "It ensures fewer claims occur", "It makes claim-cost predictions more reliable", "It removes the need for underwriting"], correctAnswer: "It makes claim-cost predictions more reliable", explanation: "With more homogeneous exposures, actual losses tend to align with expected losses (law of large numbers)." },

        // Definition of risk (Specimen Q4)
        { type: "mcq", concept: "Definition of Risk", question: "From an insurer’s perspective, ‘risk’ primarily refers to the:", options: ["Certainty of loss", "Possibility of loss", "Measure of loss after settlement", "Premium collected"], correctAnswer: "Possibility of loss", explanation: "In insurance, risk is the chance that a loss may occur—not a certainty." },

        // Speculative risk (Specimen Q5)
        { type: "mcq", concept: "Speculative vs Pure Risk", question: "Which scenario involves the chance of loss, no change, or gain, and is therefore typically uninsurable?", options: ["A storm damaging a roof", "A burglary at a shop", "Buying cryptocurrency", "A customer slipping in a store"], correctAnswer: "Buying cryptocurrency", explanation: "Speculative risks include the potential for gain and are generally not insurable." },

        // Risk management importance (Specimen Q6)
        { type: "mcq", concept: "Risk Management", question: "Underwriters value sound risk management because it:", options: ["Eliminates the need for surveys", "Cuts all claims to zero", "Reduces loss potential and clarifies the exposure", "Guarantees lower premiums"], correctAnswer: "Reduces loss potential and clarifies the exposure", explanation: "Good controls reduce frequency/severity and help quantify the risk." },

        // Frequency & severity (Specimen Q7)
        { type: "mcq", concept: "Frequency and Severity", question: "A refinery explosion is typically treated by insurers as:", options: ["High frequency, low severity", "Low frequency, high severity", "High frequency, high severity", "Low frequency, low severity"], correctAnswer: "Low frequency, high severity", explanation: "Such events are rare but can have catastrophic losses." },

        // Fortuity (Specimen Q8)
        { type: "mcq", concept: "Insurable Risks", question: "For a loss to be insurable, it should be:", options: ["Inevitable", "Deliberate", "Fortuitous", "Guaranteed by the state"], correctAnswer: "Fortuitous", explanation: "Insurance covers accidental, unintended events—not certainty or deliberate acts." },

        // Pure vs speculative (Specimen Q9)
        { type: "mcq", concept: "Pure vs Speculative Risk", question: "What distinguishes a pure risk from a speculative risk?", options: ["Pure risk can produce a gain", "Speculative risk involves only loss or no loss", "Pure risk involves only loss or no loss", "Speculative risk is always illegal"], correctAnswer: "Pure risk involves only loss or no loss", explanation: "Pure risks have no upside; they are the core insurable category." },

        // Hazard definition (Specimen Q10)
        { type: "mcq", concept: "Hazard", question: "In insurance, a hazard is best defined as something that:", options: ["Creates a legal duty to insure", "Directly causes a loss event", "Increases the chance or impact of a loss", "Removes cover under a policy"], correctAnswer: "Increases the chance or impact of a loss", explanation: "Hazards influence the operation or likelihood of perils." },

        // Peril definition (Specimen Q11)
        { type: "mcq", concept: "Peril", question: "Which option best describes a peril?", options: ["A factor that intensifies a loss", "An event that can give rise to a loss", "A contractual promise to pay", "A pricing variable"], correctAnswer: "An event that can give rise to a loss", explanation: "E.g., fire, theft, flood are perils that can trigger claims." },

        // Hazard vs peril (Specimen Q12)
        { type: "mcq", concept: "Hazard vs Peril", question: "Combustible wall panels in a warehouse are an example of:", options: ["A peril", "A physical hazard", "A pure risk", "A moral hazard"], correctAnswer: "A physical hazard", explanation: "They increase the likelihood and potential impact of the peril (fire)." },

        // Benefits of insurance—trade-off unknown loss for known premium (Specimen Q13)
        { type: "mcq", concept: "Benefits of Insurance", question: "Why is transferring risk to an insurer financially attractive for a policyholder?", options: ["Premiums are never taxed", "It swaps an uncertain future loss for a known cost today", "It guarantees claims will never occur", "It always lowers maintenance costs"], correctAnswer: "It swaps an uncertain future loss for a known cost today", explanation: "The premium converts uncertainty into a predictable expense." },

        // Benefits—cash flow (Specimen Q14)
        { type: "mcq", concept: "Benefits of Insurance", question: "How can insurance help a business’s cash flow?", options: ["By guaranteeing investment returns", "By removing the need for budgeting", "By reducing the need to hold large contingency reserves", "By preventing all losses"], correctAnswer: "By reducing the need to hold large contingency reserves", explanation: "Cover allows capital to be deployed rather than tied up for potential losses." },

        // Benefits—risk transfer (Specimen Q15)
        { type: "mcq", concept: "Benefits of Insurance", question: "For a homeowner, the key benefit of buildings insurance is that:", options: ["It reduces the likelihood of storms", "It transfers some of the financial risk of damage", "It covers routine maintenance", "It lowers mortgage interest rates by law"], correctAnswer: "It transfers some of the financial risk of damage", explanation: "Insurance transfers financial consequences of insured perils to the insurer." },

        // Self-insurance (Specimen Q16)
        { type: "mcq", concept: "Self-Insurance", question: "A company sets aside a fund to pay for frequent minor losses instead of buying cover. This approach is:", options: ["Co-insurance", "Self-insurance", "Reinsurance", "Dual insurance"], correctAnswer: "Self-insurance", explanation: "It’s a form of risk retention by the insured." },

        // Classes of insurance: comprehensive = motor (Specimen Q17)
        { type: "mcq", concept: "Classes of Insurance", question: "A policy described as ‘comprehensive’ is most commonly associated with:", options: ["Motor insurance", "Property insurance", "Travel insurance", "Pecuniary insurance"], correctAnswer: "Motor insurance", explanation: "Comprehensive motor cover typically includes third-party, fire, theft and own-damage." },

        // Classes: fidelity guarantee (Specimen Q18)
        { type: "mcq", concept: "Classes of Insurance", question: "Cover for employee dishonesty resulting in theft of company goods is provided by:", options: ["Employers’ liability insurance", "Money insurance", "Business interruption insurance", "Fidelity guarantee insurance"], correctAnswer: "Fidelity guarantee insurance", explanation: "Fidelity guarantee protects against fraud/dishonesty by employees." },

        // Double insurance (Specimen Q19)
        { type: "mcq", concept: "Double Insurance", question: "Double (dual) insurance exists when:", options: ["Only one policy is in force", "The insured splits one policy into parts", "More than one policy covers the same risk for the same insured", "A reinsurer shares part of the original policy"], correctAnswer: "More than one policy covers the same risk for the same insured", explanation: "Multiple policies on the same interest/peril can trigger contribution rules." },

        // Pooling fairness (Specimen Q20)
        { type: "mcq", concept: "Pooling of Risk", question: "Which concept supports equitable premiums that reflect the level of risk brought to the insurer?", options: ["Indemnity", "Subrogation", "Pooling of similar risks", "Average condition"], correctAnswer: "Pooling of similar risks", explanation: "Pooling allows spreading the losses of the few across the many with similar exposures." }
    ],

    flashcards: [
        // --- Existing flashcards (kept) ---
        { id: 1, term: "Risk", definition: "Can refer to uncertainty, unpredictability, the possibility of loss, the chance of gain, the peril insured against, or the thing being insured." },
        { id: 2, term: "Pure Risks", definition: "Risks where there is no possibility of making a profit, only the possibility of a loss or breaking even (e.g., fire, accident)." },
        { id: 3, term: "Speculative Risks", definition: "Risks that involve three possible outcomes: loss, break-even, or gain; generally not insurable as they are undertaken voluntarily with the hope of profit." },
        { id: 4, term: "Fortuitous Event", definition: "An occurrence that is accidental, unexpected, not deliberate, and not inevitable; a necessary feature for a risk to be insurable." },
        { id: 5, term: "Hazard", definition: "Something that influences the operation or likelihood of a peril occurring (e.g., a physical characteristic or human attitude/behavior)." },
        { id: 6, term: "Peril", definition: "That which gives rise to a loss (e.g., fire, theft, flood)." },
        { id: 35, term: "Risk Management", definition: "The systematic process of identifying, analyzing, controlling, and treating defined risks to protect a business or individual." },
        { id: 36, term: "Co-insurance", definition: "An arrangement where several insurers share a stated proportion of a single risk, each receiving a proportion of the premium and responsible for that proportion of any claim." },
        { id: 37, term: "Self-Insurance", definition: "An individual or company's decision to bear a risk themselves by setting aside a fund to cover potential losses, rather than transferring it to an insurer." },
        { id: 49, term: "Fundamental Risk", definition: "A risk arising from a cause outside the control of any one group, affecting many people (e.g., war, earthquake)." },
        { id: 50, term: "Particular Risks", definition: "Risks with consequences that affect individuals or local communities, as opposed to widespread effects." },
        { id: 51, term: "Physical Hazard", definition: "Relates to the physical characteristics of a risk that may influence the likelihood or severity of a loss (e.g., building construction, security features)." },
        { id: 52, term: "Moral Hazard", definition: "Aspects of human attitudes and behaviors that may influence the outcome of a risk, such as carelessness, dishonesty, or a willingness to commit fraud." },
        { id: 53, term: "Law of Large Numbers", definition: "A statistical theory stating that as the number of homogeneous exposures (similar risks) increases, the actual number of losses will tend to be very close to the expected number, making predictions more accurate." },
        { id: 54, term: "Pooling of Risks", definition: "The fundamental principle of insurance where the losses of the few are met by the contributions (premiums) of the many who face similar risks." },
        { id: 55, term: "Double Insurance", definition: "The existence of two or more separate insurance policies that cover the same risk for the same policyholder." },
        { id: 138, term: "Fidelity Guarantee Insurance", definition: "An insurance policy designed to protect a business from financial loss resulting from theft or fraud committed by its employees." },
        { id: 145, term: "Pecuniary Insurance", definition: "A class of insurance that covers financial losses that do not result from damage to property or injury to people, such as business interruption or fidelity guarantee." },

        // --- New complementary flashcards (added) ---
        { id: 201, term: "Frequency vs Severity", definition: "Frequency is how often losses occur; severity is how large the losses are when they happen. Many insurance decisions balance both." },
        { id: 202, term: "Risk Transfer Benefit", definition: "Insurance converts an uncertain future loss into a known present cost (the premium), aiding planning and financial stability." },
        { id: 203, term: "Fundamental vs Particular", definition: "Fundamental risks affect large groups and arise from external causes; particular risks affect individuals or specific locations." }
    ]
};
