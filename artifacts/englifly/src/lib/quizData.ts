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
    question: "Fill in the blank: 'She ___ to school every day.'",
    options: [
      { text: "go", isCorrect: false },
      { text: "goes", isCorrect: true },
      { text: "going", isCorrect: false },
      { text: "gone", isCorrect: false },
    ],
  },
  {
    id: 2,
    question: "Which sentence is correct?",
    options: [
      { text: "She don't like apples.", isCorrect: false },
      { text: "She doesn't like apples.", isCorrect: true },
      { text: "She not like apples.", isCorrect: false },
      { text: "She doesn't likes apples.", isCorrect: false },
    ],
  },
  {
    id: 3,
    question: "Fill in the blank: 'He ___ (go) to the market yesterday.'",
    options: [
      { text: "goes", isCorrect: false },
      { text: "going", isCorrect: false },
      { text: "went", isCorrect: true },
      { text: "gone", isCorrect: false },
    ],
  },
  {
    id: 4,
    question: "Choose the right word: 'I am looking ___ to the trip.'",
    options: [
      { text: "at", isCorrect: false },
      { text: "for", isCorrect: false },
      { text: "forward", isCorrect: true },
      { text: "on", isCorrect: false },
    ],
  },
  {
    id: 5,
    question: "Fill in the blank: 'He is ___ honest man.'",
    options: [
      { text: "a", isCorrect: false },
      { text: "an", isCorrect: true },
      { text: "the", isCorrect: false },
      { text: "some", isCorrect: false },
    ],
  },
  {
    id: 6,
    question: "Which sentence is correct?",
    options: [
      { text: "There going to the park.", isCorrect: false },
      { text: "They're going to the park.", isCorrect: true },
      { text: "Their going to the park.", isCorrect: false },
      { text: "Theyre going to the park.", isCorrect: false },
    ],
  },
  {
    id: 7,
    question: "Fill in the blank: 'I ___ watching TV when she called.'",
    options: [
      { text: "am", isCorrect: false },
      { text: "were", isCorrect: false },
      { text: "was", isCorrect: true },
      { text: "is", isCorrect: false },
    ],
  },
  {
    id: 8,
    question: "Which sentence uses the correct tense?",
    options: [
      { text: "I have seen that movie yesterday.", isCorrect: false },
      { text: "I saw that movie yesterday.", isCorrect: true },
      { text: "I see that movie yesterday.", isCorrect: false },
      { text: "I had see that movie yesterday.", isCorrect: false },
    ],
  },
  {
    id: 9,
    question: "Choose the right word: 'Can you please ___ me the salt?'",
    options: [
      { text: "bring", isCorrect: false },
      { text: "take", isCorrect: false },
      { text: "pass", isCorrect: true },
      { text: "give", isCorrect: false },
    ],
  },
  {
    id: 10,
    question: "Fill in the blank: 'They ___ friends for ten years.'",
    options: [
      { text: "are", isCorrect: false },
      { text: "were", isCorrect: false },
      { text: "have been", isCorrect: true },
      { text: "had", isCorrect: false },
    ],
  },
  {
    id: 11,
    question: "Which sentence is grammatically correct?",
    options: [
      { text: "Neither of the boys are ready.", isCorrect: false },
      { text: "Neither of the boys is ready.", isCorrect: true },
      { text: "Neither of the boys were ready.", isCorrect: false },
      { text: "Neither of the boy is ready.", isCorrect: false },
    ],
  },
  {
    id: 12,
    question: "Fill in the blank: 'She has been learning English ___ two years.'",
    options: [
      { text: "since", isCorrect: false },
      { text: "from", isCorrect: false },
      { text: "for", isCorrect: true },
      { text: "during", isCorrect: false },
    ],
  },
  {
    id: 13,
    question: "Which sentence is correct?",
    options: [
      { text: "The dog bit the man.", isCorrect: true },
      { text: "The dog bited the man.", isCorrect: false },
      { text: "The dog bitten the man.", isCorrect: false },
      { text: "The dog bites the man yesterday.", isCorrect: false },
    ],
  },
  {
    id: 14,
    question: "Choose the right preposition: 'She is afraid ___ spiders.'",
    options: [
      { text: "from", isCorrect: false },
      { text: "with", isCorrect: false },
      { text: "of", isCorrect: true },
      { text: "about", isCorrect: false },
    ],
  },
  {
    id: 15,
    question: "Fill in the blank: '___ you like some tea?'",
    options: [
      { text: "Do", isCorrect: false },
      { text: "Would", isCorrect: true },
      { text: "Are", isCorrect: false },
      { text: "Will", isCorrect: false },
    ],
  },
  {
    id: 16,
    question: "Which sentence is correct?",
    options: [
      { text: "He speak English very good.", isCorrect: false },
      { text: "He speaks English very well.", isCorrect: true },
      { text: "He speaks English very good.", isCorrect: false },
      { text: "He speak English very well.", isCorrect: false },
    ],
  },
  {
    id: 17,
    question: "Fill in the blank: 'We ___ dinner when the lights went out.'",
    options: [
      { text: "are having", isCorrect: false },
      { text: "had", isCorrect: false },
      { text: "were having", isCorrect: true },
      { text: "have", isCorrect: false },
    ],
  },
  {
    id: 18,
    question: "Choose the correct word: 'It is ___ cold outside to play.'",
    options: [
      { text: "so", isCorrect: false },
      { text: "very", isCorrect: false },
      { text: "too", isCorrect: true },
      { text: "much", isCorrect: false },
    ],
  },
  {
    id: 19,
    question: "Which article fits: '___ European country'?",
    options: [
      { text: "an", isCorrect: false },
      { text: "a", isCorrect: true },
      { text: "the", isCorrect: false },
      { text: "some", isCorrect: false },
    ],
  },
  {
    id: 20,
    question: "Fill in the blank: 'If it rains, we ___ stay home.'",
    options: [
      { text: "will", isCorrect: true },
      { text: "would", isCorrect: false },
      { text: "shall", isCorrect: false },
      { text: "are", isCorrect: false },
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
