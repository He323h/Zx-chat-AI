export type TopicStatus = "completed" | "current" | "locked";

export interface RoadmapTopic {
  id: string;
  title: string;
  emoji: string;
  group: "Present Tense" | "Past Tense" | "Future Tense";
  description: string;
  formula: string;
  examples: string[];
  practice: string[];
  quiz: string;
  defaultStatus: TopicStatus;
}

export const ROADMAP_TOPICS: RoadmapTopic[] = [
  { id: "present-simple", title: "Present Simple", emoji: "☀️", group: "Present Tense", description: "Habits, facts, and routines", formula: "Subject + base verb (add s/es with he/she/it)", examples: ["I speak English every day.", "She goes to school."], practice: ["Make 3 sentences about your daily routine.", "Change: He play cricket → He plays cricket."], quiz: "Use the correct verb form to unlock Present Continuous.", defaultStatus: "current" },
  { id: "present-continuous", title: "Present Continuous", emoji: "▶️", group: "Present Tense", description: "Actions happening now", formula: "Subject + is/am/are + verb+ing", examples: ["I am learning English.", "They are watching a movie."], practice: ["Describe what you are doing now.", "Fill: She ___ reading."], quiz: "Choose the correct is/am/are + ing form.", defaultStatus: "locked" },
  { id: "present-perfect", title: "Present Perfect", emoji: "✅", group: "Present Tense", description: "Past action connected to now", formula: "Subject + has/have + past participle", examples: ["I have finished my homework.", "He has visited Delhi."], practice: ["Write 2 sentences with have/has.", "Correct: She have eaten."], quiz: "Pass the have/has quiz to unlock Past Tense.", defaultStatus: "locked" },
  { id: "past-simple", title: "Past Simple", emoji: "🕰️", group: "Past Tense", description: "Finished past actions", formula: "Subject + past verb (V2)", examples: ["I played football yesterday.", "She went to the market."], practice: ["Tell what you did yesterday.", "Change go → went in a sentence."], quiz: "Identify the correct past verb.", defaultStatus: "locked" },
  { id: "past-continuous", title: "Past Continuous", emoji: "📺", group: "Past Tense", description: "Actions in progress in the past", formula: "Subject + was/were + verb+ing", examples: ["I was studying at 8 pm.", "They were playing outside."], practice: ["Make one sentence with was and one with were.", "Fill: We ___ waiting."], quiz: "Pick was/were + ing forms.", defaultStatus: "locked" },
  { id: "past-perfect", title: "Past Perfect", emoji: "🔙", group: "Past Tense", description: "Earlier action before another past action", formula: "Subject + had + past participle", examples: ["I had eaten before he arrived.", "She had finished the lesson."], practice: ["Combine two past actions with had.", "Correct: He had went."], quiz: "Pass to unlock Future Tense.", defaultStatus: "locked" },
  { id: "future-simple", title: "Future Simple", emoji: "🚀", group: "Future Tense", description: "Plans, promises, predictions", formula: "Subject + will + base verb", examples: ["I will call you tomorrow.", "She will learn fast."], practice: ["Write 3 plans for tomorrow.", "Fill: They ___ come."], quiz: "Choose correct will sentences.", defaultStatus: "locked" },
  { id: "future-continuous", title: "Future Continuous", emoji: "🛣️", group: "Future Tense", description: "Action in progress at a future time", formula: "Subject + will be + verb+ing", examples: ["I will be studying at 7 pm.", "We will be traveling tomorrow."], practice: ["Say what you will be doing tonight.", "Correct the formula."], quiz: "Pick will be + ing forms.", defaultStatus: "locked" },
  { id: "future-perfect", title: "Future Perfect", emoji: "🏁", group: "Future Tense", description: "Action completed before a future time", formula: "Subject + will have + past participle", examples: ["I will have finished by Monday.", "She will have reached home."], practice: ["Make 2 deadline sentences.", "Fill: We will have ___."], quiz: "Final tense-path mastery quiz.", defaultStatus: "locked" },
];

const PROGRESS_KEY = "ef_tense_roadmap_v1";
export type RoadmapProgress = Record<string, TopicStatus>;

function buildDefaultProgress(): RoadmapProgress { const p: RoadmapProgress = {}; ROADMAP_TOPICS.forEach(t => { p[t.id] = t.defaultStatus; }); return p; }
export function getRoadmapProgress(): RoadmapProgress { try { const raw = localStorage.getItem(PROGRESS_KEY); return raw ? { ...buildDefaultProgress(), ...JSON.parse(raw) } : buildDefaultProgress(); } catch { return buildDefaultProgress(); } }
export function saveRoadmapProgress(p: RoadmapProgress): void { localStorage.setItem(PROGRESS_KEY, JSON.stringify(p)); window.dispatchEvent(new CustomEvent("ef:stats-updated")); }
export function completeTopic(topicId: string): RoadmapProgress { const p = getRoadmapProgress(); p[topicId] = "completed"; const idx = ROADMAP_TOPICS.findIndex(t => t.id === topicId); if (idx >= 0 && idx + 1 < ROADMAP_TOPICS.length && p[ROADMAP_TOPICS[idx + 1].id] === "locked") p[ROADMAP_TOPICS[idx + 1].id] = "current"; saveRoadmapProgress(p); return p; }
export function getTopicsWithStatus(): (RoadmapTopic & { status: TopicStatus })[] { const p = getRoadmapProgress(); return ROADMAP_TOPICS.map(t => ({ ...t, status: p[t.id] ?? t.defaultStatus })); }
