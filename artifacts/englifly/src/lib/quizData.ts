export interface QuizOption {
  text: string;
  isCorrect: boolean;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: QuizOption[];
}

export const QUESTION_BANK: QuizQuestion[] = [
  {
    id: 1,
    question: "Which sentence is grammatically correct?",
    options: [
      { text: "She don't like apples.", isCorrect: false },
      { text: "She doesn't like apples.", isCorrect: true },
      { text: "She not like apples.", isCorrect: false },
      { text: "She doesn't likes apples.", isCorrect: false },
    ],
  },
  {
    id: 2,
    question: "Choose the correct word: 'He is ___ honest man.'",
    options: [
      { text: "a", isCorrect: false },
      { text: "an", isCorrect: true },
      { text: "the", isCorrect: false },
      { text: "some", isCorrect: false },
    ],
  },
  {
    id: 3,
    question: "What is the past tense of 'go'?",
    options: [
      { text: "goed", isCorrect: false },
      { text: "goes", isCorrect: false },
      { text: "went", isCorrect: true },
      { text: "gone", isCorrect: false },
    ],
  },
  {
    id: 4,
    question: "Which is the correct plural of 'child'?",
    options: [
      { text: "childs", isCorrect: false },
      { text: "childes", isCorrect: false },
      { text: "children", isCorrect: true },
      { text: "childrens", isCorrect: false },
    ],
  },
  {
    id: 5,
    question: "'She ___ to school every day.' Choose the correct verb.",
    options: [
      { text: "go", isCorrect: false },
      { text: "goes", isCorrect: true },
      { text: "going", isCorrect: false },
      { text: "gone", isCorrect: false },
    ],
  },
  {
    id: 6,
    question: "What does 'benevolent' mean?",
    options: [
      { text: "Cruel and harsh", isCorrect: false },
      { text: "Kind and generous", isCorrect: true },
      { text: "Lazy and slow", isCorrect: false },
      { text: "Angry and violent", isCorrect: false },
    ],
  },
  {
    id: 7,
    question: "Which sentence uses 'their' correctly?",
    options: [
      { text: "There going to the park.", isCorrect: false },
      { text: "They're bags are new.", isCorrect: false },
      { text: "Their house is big.", isCorrect: true },
      { text: "There house is big.", isCorrect: false },
    ],
  },
  {
    id: 8,
    question: "Choose the correct comparative form of 'good'.",
    options: [
      { text: "gooder", isCorrect: false },
      { text: "more good", isCorrect: false },
      { text: "better", isCorrect: true },
      { text: "best", isCorrect: false },
    ],
  },
  {
    id: 9,
    question: "What is the meaning of 'eloquent'?",
    options: [
      { text: "Speaking in a fluent, persuasive way", isCorrect: true },
      { text: "Being very angry", isCorrect: false },
      { text: "Moving very quickly", isCorrect: false },
      { text: "Feeling very sad", isCorrect: false },
    ],
  },
  {
    id: 10,
    question: "'I ___ watching TV when she called.' Fill in the blank.",
    options: [
      { text: "was", isCorrect: true },
      { text: "am", isCorrect: false },
      { text: "were", isCorrect: false },
      { text: "is", isCorrect: false },
    ],
  },
  {
    id: 11,
    question: "Which word means 'to start something'?",
    options: [
      { text: "Conclude", isCorrect: false },
      { text: "Terminate", isCorrect: false },
      { text: "Initiate", isCorrect: true },
      { text: "Delay", isCorrect: false },
    ],
  },
  {
    id: 12,
    question: "Which sentence is in passive voice?",
    options: [
      { text: "The dog bit the man.", isCorrect: false },
      { text: "The man was bitten by the dog.", isCorrect: true },
      { text: "The man ran fast.", isCorrect: false },
      { text: "The dog barked loudly.", isCorrect: false },
    ],
  },
  {
    id: 13,
    question: "What does 'resilient' mean?",
    options: [
      { text: "Easily broken", isCorrect: false },
      { text: "Able to recover quickly from difficulties", isCorrect: true },
      { text: "Very stubborn", isCorrect: false },
      { text: "Extremely generous", isCorrect: false },
    ],
  },
  {
    id: 14,
    question: "Choose the correct sentence.",
    options: [
      { text: "Neither of the boys are ready.", isCorrect: false },
      { text: "Neither of the boys is ready.", isCorrect: true },
      { text: "Neither of the boys were ready.", isCorrect: false },
      { text: "Neither of the boy is ready.", isCorrect: false },
    ],
  },
  {
    id: 15,
    question: "What is the synonym of 'happy'?",
    options: [
      { text: "Melancholy", isCorrect: false },
      { text: "Jovial", isCorrect: true },
      { text: "Anxious", isCorrect: false },
      { text: "Furious", isCorrect: false },
    ],
  },
  {
    id: 16,
    question: "'They ___ friends for ten years.' Which tense is correct?",
    options: [
      { text: "are", isCorrect: false },
      { text: "were", isCorrect: false },
      { text: "have been", isCorrect: true },
      { text: "had", isCorrect: false },
    ],
  },
  {
    id: 17,
    question: "What does 'ambiguous' mean?",
    options: [
      { text: "Clear and obvious", isCorrect: false },
      { text: "Open to more than one interpretation", isCorrect: true },
      { text: "Extremely confident", isCorrect: false },
      { text: "Very simple", isCorrect: false },
    ],
  },
  {
    id: 18,
    question: "Which is the correct spelling?",
    options: [
      { text: "Acommodate", isCorrect: false },
      { text: "Accommodate", isCorrect: true },
      { text: "Accomodate", isCorrect: false },
      { text: "Accommmodate", isCorrect: false },
    ],
  },
  {
    id: 19,
    question: "Choose the antonym of 'generous'.",
    options: [
      { text: "Kind", isCorrect: false },
      { text: "Charitable", isCorrect: false },
      { text: "Stingy", isCorrect: true },
      { text: "Humble", isCorrect: false },
    ],
  },
  {
    id: 20,
    question: "Which article fits: '___ European country'?",
    options: [
      { text: "an", isCorrect: false },
      { text: "a", isCorrect: true },
      { text: "the", isCorrect: false },
      { text: "some", isCorrect: false },
    ],
  },
];

export interface QuizDayState {
  date: string;
  correctCount: number;
  wrongCount: number;
  answers: Record<number, "correct" | "wrong">;
}

const QUIZ_STATE_KEY = "ef_quiz_state_v1";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getQuizState(): QuizDayState {
  try {
    const raw = localStorage.getItem(QUIZ_STATE_KEY);
    if (!raw) return { date: todayStr(), correctCount: 0, wrongCount: 0, answers: {} };
    const parsed: QuizDayState = JSON.parse(raw);
    if (parsed.date !== todayStr()) {
      return { date: todayStr(), correctCount: 0, wrongCount: 0, answers: {} };
    }
    return parsed;
  } catch {
    return { date: todayStr(), correctCount: 0, wrongCount: 0, answers: {} };
  }
}

export function saveQuizState(state: QuizDayState): void {
  localStorage.setItem(QUIZ_STATE_KEY, JSON.stringify(state));
}

export function getDailyQuestions(): QuizQuestion[] {
  const today = todayStr();
  let seed = 0;
  for (let i = 0; i < today.length; i++) {
    seed = (seed * 31 + today.charCodeAt(i)) >>> 0;
  }

  const shuffled = [...QUESTION_BANK];
  for (let i = shuffled.length - 1; i > 0; i--) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, 7);
}
