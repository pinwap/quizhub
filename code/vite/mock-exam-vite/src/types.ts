export type RandomQuestion = {
  question: string;
  type: "multiple-choice" | "fill-in-blank";
  options?: { statement: string; istrue: boolean }[];
  correctAnswer?: string;
  explanation: string;
  image?: string;
};

export type QuizSet = {
  id: string;
  label: string;
  group: string;
  loader: () => Promise<RandomQuestion[]>;
};
