export type TopicStatus = "completed" | "current" | "locked";
export type TenseGroup = "present" | "past" | "future";

export interface RoadmapTopic {
  id: string;
  title: string;
  emoji: string;
  description: string;
  formula: string;
  group: TenseGroup;
  defaultStatus: TopicStatus;
}

export const ROADMAP_TOPICS: RoadmapTopic[] = [
  {
    id: "present-simple",
    title: "Present Simple",
    emoji: "🟢",
    description: "Daily habits & facts",
    formula: "Subject + V1 (she goes)",
    group: "present",
    defaultStatus: "current",
  },
  {
    id: "present-continuous",
    title: "Present Continuous",
    emoji: "🔄",
    description: "Actions happening right now",
    formula: "Subject + is/am/are + V-ing",
    group: "present",
    defaultStatus: "locked",
  },
  {
    id: "present-perfect",
    title: "Present Perfect",
    emoji: "✅",
    description: "Past actions with present effect",
    formula: "Subject + have/has + V3",
    group: "present",
    defaultStatus: "locked",
  },
  {
    id: "past-simple",
    title: "Past Simple",
    emoji: "⏮️",
    description: "Completed actions in the past",
    formula: "Subject + V2 (I went)",
    group: "past",
    defaultStatus: "locked",
  },
  {
    id: "past-continuous",
    title: "Past Continuous",
    emoji: "🔁",
    description: "Ongoing past actions",
    formula: "Subject + was/were + V-ing",
    group: "past",
    defaultStatus: "locked",
  },
  {
    id: "past-perfect",
    title: "Past Perfect",
    emoji: "🔙",
    description: "Action before another past action",
    formula: "Subject + had + V3",
    group: "past",
    defaultStatus: "locked",
  },
  {
    id: "future-simple",
    title: "Future Simple",
    emoji: "🔮",
    description: "Decisions & predictions",
    formula: "Subject + will + V1",
    group: "future",
    defaultStatus: "locked",
  },
  {
    id: "future-continuous",
    title: "Future Continuous",
    emoji: "🔜",
    description: "Ongoing future actions",
    formula: "Subject + will be + V-ing",
    group: "future",
    defaultStatus: "locked",
  },
  {
    id: "future-perfect",
    title: "Future Perfect",
    emoji: "🏆",
    description: "Completed before a future point",
    formula: "Subject + will have + V3",
    group: "future",
    defaultStatus: "locked",
  },
];

const PROGRESS_KEY = "ef_roadmap_v2";
const WELCOME_KEY = "ef_roadmap_welcomed";

export type RoadmapProgress = Record<string, TopicStatus>;

export function hasSeenWelcome(): boolean {
  return localStorage.getItem(WELCOME_KEY) === "1";
}

export function markWelcomeSeen(): void {
  localStorage.setItem(WELCOME_KEY, "1");
}

export function getRoadmapProgress(): RoadmapProgress {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return buildDefaultProgress();
    return JSON.parse(raw) as RoadmapProgress;
  } catch {
    return buildDefaultProgress();
  }
}

function buildDefaultProgress(): RoadmapProgress {
  const p: RoadmapProgress = {};
  ROADMAP_TOPICS.forEach(t => { p[t.id] = t.defaultStatus; });
  return p;
}

export function saveRoadmapProgress(p: RoadmapProgress): void {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
}

export function completeTopic(topicId: string): RoadmapProgress {
  const p = getRoadmapProgress();
  p[topicId] = "completed";
  const idx = ROADMAP_TOPICS.findIndex(t => t.id === topicId);
  if (idx >= 0 && idx + 1 < ROADMAP_TOPICS.length) {
    const nextId = ROADMAP_TOPICS[idx + 1].id;
    if (p[nextId] === "locked") {
      p[nextId] = "current";
    }
  }
  saveRoadmapProgress(p);
  return p;
}

export function getTopicsWithStatus(): (RoadmapTopic & { status: TopicStatus })[] {
  const p = getRoadmapProgress();
  return ROADMAP_TOPICS.map(t => ({ ...t, status: p[t.id] ?? t.defaultStatus }));
}
