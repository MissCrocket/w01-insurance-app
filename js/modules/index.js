// js/modules/index.js

// IMPORTANT: each chapter file below must export:
//   export const data = { title: "...", questions: [...], flashcards: [...] };

export const moduleManifest = {
  risk_and_insurance_ch1: {
    title: "Chapter 1: Risk and Insurance",
    loader: () => import("./risk_and_insurance_ch1.js"),
  },
  insurance_market_ch2: {
    title: "Chapter 2: The Insurance Market",
    loader: () => import("./insurance_market_ch2.js"),
  },
  contract_and_agency_ch3: {
    title: "Chapter 3: Contract and Agency",
    loader: () => import("./contract_and_agency_ch3.js"),
  },
  insurable_interest_ch4: {
    title: "Chapter 4: Insurable Interest",
    loader: () => import("./insurable_interest_ch4.js"),
  },
  disclosure_and_representation_ch5: {
    title: "Chapter 5: Disclosure and Representation",
    loader: () => import("./disclosure_and_representation_ch5.js"),
  },
  proximate_cause_ch6: {
    title: "Chapter 6: Proximate Cause",
    loader: () => import("./proximate_cause_ch6.js"),
  },
  indemnity_ch7: {
    title: "Chapter 7: Indemnity",
    loader: () => import("./indemnity_ch7.js"),
  },
  contribution_and_subrogation_ch8: {
    title: "Chapter 8: Contribution and Subrogation",
    loader: () => import("./contribution_and_subrogation_ch8.js"),
  },
  insurance_regulation_ch9: {
    title: "Chapter 9: Insurance Regulation",
    loader: () => import("./insurance_regulation_ch9.js"),
  },
  ethics_and_governance_ch10: {
    title: "Chapter 10: Ethics and Corporate Governance",
    loader: () => import("./ethics_and_governance_ch10.js"),
  },
  specimen_exam: {
    title: "Official Specimen Exam (100 Questions)",
    loader: () => import("./specimen_exam.js"),
  },
};
